# ruff: noqa: T201, D103, BLE001, S110
"""Provision collectors in collectors/registry.yaml using Bright Data CLI.

Runs up to 3 concurrent create jobs (Bright Data AI-Flow account limit).
Writes results to .tmp/create_<key>.json.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.infra.registry import load_registry  # noqa: E402

OUT_DIR = PROJECT_ROOT / ".tmp"
CONCURRENCY_LIMIT = 3


def get_fixture_base_url() -> str:
    if "FIXTURE_BASE_URL" in os.environ:
        return os.environ["FIXTURE_BASE_URL"]
    env_file = PROJECT_ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("FIXTURE_BASE_URL="):
                return line.split("=", 1)[1].strip()
    return ""


async def provision_one(
    sem: asyncio.Semaphore,
    key: str,
    url: str,
    prompt_file: str,
    name: str,
) -> tuple[str, str | None, str]:
    envelope_file = OUT_DIR / f"create_{key}.json"
    if envelope_file.is_file():
        try:
            data = json.loads(envelope_file.read_text(encoding="utf-8"))
            cid = data.get("collector_id")
            status = data.get("status")
            if cid and status in ("done", "awaiting_approval", "ready"):
                print(f"[{key}] Already provisioned: {cid} ({status})")
                return key, cid, status
        except Exception:
            pass

    prompt_path = PROJECT_ROOT / "collectors" / prompt_file
    description = prompt_path.read_text(encoding="utf-8").strip()
    if len(description) > 500:
        raise ValueError(f"[{key}] Description is {len(description)} chars, max is 500")

    binary = "brightdata.cmd" if sys.platform == "win32" else "brightdata"

    async with sem:
        print(f"[{key}] Starting creation for URL: {url} ({len(description)} chars)")
        cmd = [
            binary,
            "scraper",
            "create",
            url,
            description,
            "--name",
            name,
            "--json",
            "-o",
            str(envelope_file),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        out_text = stdout.decode("utf-8", errors="replace")
        err_text = stderr.decode("utf-8", errors="replace")

        # Parse outcome
        cid = None
        status = "unknown"
        if envelope_file.is_file():
            try:
                data = json.loads(envelope_file.read_text(encoding="utf-8"))
                cid = data.get("collector_id")
                status = data.get("status", "unknown")
            except Exception as e:
                status = f"parse_error: {e}"
        else:
            try:
                data = json.loads(out_text)
                cid = data.get("collector_id")
                status = data.get("status", "unknown")
                envelope_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
            except Exception:
                status = f"failed: {err_text[:200]}"

        print(f"[{key}] Finished: id={cid}, status={status}")
        return key, cid, status


async def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    fixture_base = get_fixture_base_url()
    env = dict(os.environ)
    if fixture_base:
        env["FIXTURE_BASE_URL"] = fixture_base

    registry = load_registry(PROJECT_ROOT / "collectors" / "registry.yaml", env)
    wanted_keys = sys.argv[1:] if len(sys.argv) > 1 else None

    specs_to_run = []
    for s in registry.all():
        if wanted_keys and s.key not in wanted_keys:
            continue
        if not s.enabled:
            print(f"[{s.key}] Skipping: enabled=False")
            continue
        if s.is_provisioned:
            print(f"[{s.key}] Skipping: already provisioned as {s.collector_id}")
            continue
        specs_to_run.append(s)

    if not specs_to_run:
        print("No collectors to provision.")
        return

    print(f"Provisioning {len(specs_to_run)} collectors with concurrency {CONCURRENCY_LIMIT}...")
    sem = asyncio.Semaphore(CONCURRENCY_LIMIT)
    tasks = [
        provision_one(
            sem,
            s.key,
            s.urls[0],
            s.prompt_file,
            s.key.replace("_", "-"),
        )
        for s in specs_to_run
    ]

    results = await asyncio.gather(*tasks)

    print("\n--- Summary of Provisioned Collectors ---")
    for key, cid, status in results:
        print(f"{key:24}: {cid or 'FAILED'} ({status})")


if __name__ == "__main__":
    asyncio.run(main())
