# ADR 0002 — every subprocess is an argv list, never a shell string

- **Status:** accepted
- **Date:** 2026-08-18
- **Affects:** `app/infra/cli/bdata.py`, `app/domain/validator.py`, `app/api/security.py`,
  `collectors/registry.yaml`, `tests/security/test_no_shell_and_no_auto_approve.py`

## Context

The Bright Data CLI is the only place this application leaves its own process, and two of the
values that travel there originate outside it:

- the **heal prompt** — operator-supplied free text, by design (`"titles moved from
  article.news-card h2 to div.press-wrapper h3"`);
- a **target URL** on `POST /run`.

A draft implementation built the command as an f-string and passed it to a shell. With that
shape, a prompt reading

```
Titles moved to div.press-wrapper h3; rm -rf / `whoami` $(id)
```

is not text. It is four commands. And a caller-supplied URL becomes an SSRF primitive against
anything the host can reach.

## Decision

Four rules, each enforced by a test rather than by convention.

**1. `asyncio.create_subprocess_exec` with an argv list. Never `create_subprocess_shell`,
never `os.system`, never `shell=True`.**

```python
proc = await asyncio.create_subprocess_exec(
    self._binary, *args,
    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
)
```

The OS receives a vector of strings. There is no interpreter between us and the process, so
there is nothing for `;`, a backtick or `$(…)` to mean. Note what this makes unnecessary:
**no escaping, no quoting, no sanitising of the prompt.** Escaping is a blocklist and
blocklists leak; removing the interpreter removes the class.

**2. Every process has a timeout and is killed when it expires.**

```python
try:
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
except TimeoutError:
    proc.kill()
    await proc.wait()
    raise CliTimeout(argv[:3], timeout)
```

660 s per command — the CLI's own 600 s default plus headroom (see
[`0001-async-cli-jobs.md`](0001-async-cli-jobs.md)). A hung heal must not pin a worker for the
rest of the demo, and it must not leave a zombie behind.

**3. Client input never becomes a URL or an identifier.** Callers pass a registry `key`.
`collector_id` and the permitted URLs are resolved from `collectors/registry.yaml`,
server-side, from committed configuration. `POST /run`'s optional `url` is checked for
membership in that collector's own registered list. There is no code path from a request body
to an arbitrary fetch target, so **SSRF is removed by construction rather than by allowlist** —
there is no allowlist to maintain or bypass.

On top of that, pure validation in `app/domain/validator.py`, before any argv is built:
`collector_id` must match `^c_[a-z0-9]{6,40}$`, and the heal prompt must be 1–1000 characters
after stripping (the CLI's own cap, so an over-long prompt fails in 2 ms instead of after a
ten-minute round trip).

**4. `--auto-approve` is never passed, and argv is logged as a list.** A joined string in a log
is a line someone will eventually copy into a terminal; a list is data. The approval gate is
covered by [`0004-manual-healing-only.md`](0004-manual-healing-only.md).

## Enforcement

`tests/security/test_no_shell_and_no_auto_approve.py` asserts each property **twice** — once
by static analysis and once behaviourally:

- **AST scan over every module in `app/`**: no call to `create_subprocess_shell`, `os.system`,
  `os.popen`, `subprocess.run/call/check_output/Popen`; no `shell=` keyword anywhere; no
  `--auto-approve` string literal outside a docstring; and exactly one module —
  `app/infra/cli/bdata.py` — spawns a process at all.
- **The real adapter with process creation intercepted**: a prompt containing
  `; rm -rf / \`whoami\` $(id)` arrives as *one* argv element; a malicious `collector_id`
  raises before anything spawns; a hung process is killed and reported; a missing binary
  produces install instructions rather than a `FileNotFoundError` traceback.

The scan reads the syntax tree, not the raw text, precisely so `bdata.py` can *explain in
prose* why it never uses a shell without tripping its own test.

The AST scan looks redundant next to the behavioural tests. It is not: it fails on the commit
that adds a fifth CLI call in a hurry on day six, rather than in front of judges.

## Consequences

Good: command injection and SSRF are structurally absent, not defended against. No escaping
code to review. Timeouts are uniform. The whole boundary is one file, and a reviewer can
verify that claim by running one test.

Costs, accepted:

- **No shell conveniences.** No pipes, no globbing, no `&&`. We need none of them.
- **The registry must be maintained.** Adding a source means editing committed YAML rather
  than passing a URL. That is the point — and the `c_*` ids in that file double as evidence of
  Scraper Studio use.
- **A judge cannot heal an arbitrary site through our API.** They can reproduce the whole
  cycle against the committed fixtures instead; see [`../DEMO_SCRIPT.md`](../DEMO_SCRIPT.md).

## Alternatives rejected

**Shell with `shlex.quote`.** Rejected: correct only if applied everywhere, forever, by
everyone. `create_subprocess_exec` is correct by default and needs no discipline.

**URL allowlist instead of a registry.** Rejected: an allowlist is a filter on attacker-chosen
input, and filters get bypassed. A registry means the input was never a URL.

**Sanitising the heal prompt.** Rejected, and it is worth being explicit: the prompt *should*
be able to contain `>`, `;` and quotes — CSS selectors do. Stripping them would break the
feature to solve a problem argv already solved.
