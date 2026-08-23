#!/usr/bin/env bash
# Provision every unprovisioned, enabled collector in collectors/registry.yaml.
#
# Why a script and not nine hand-typed commands: `create` takes 5-25 minutes and
# AI-Flow allows 3 concurrent jobs per account, so the calls have to be batched,
# and each `c_*` id has to be captured rather than read off a scrolled-away
# terminal. Envelopes land in .tmp/create_<key>.json (gitignored) and the ids are
# printed at the end, ready to paste into registry.yaml.
#
# Usage:
#   brightdata login --api-key <key>      # once, stores ~/.brightdata
#   bash scripts/provision_collectors.sh              # all pending collectors
#   bash scripts/provision_collectors.sh demo_newsroom univ_research_sf
#
# Re-running is safe: a collector whose registry entry already holds a c_* id is
# skipped, so an interrupted run resumes by re-running it.
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON=".venv/Scripts/python.exe"
[[ -x "$PYTHON" ]] || PYTHON="python3"
BATCH_SIZE=3          # AI-Flow concurrency cap per account
OUT_DIR=".tmp"

command -v brightdata >/dev/null 2>&1 || {
  echo "brightdata not on PATH. On this machine:" >&2
  echo '  export PATH="$PATH:/c/Users/arjit/AppData/Roaming/npm"' >&2
  exit 1
}
[[ -d "$HOME/.brightdata" ]] || {
  echo "Not logged in. Run:  brightdata login --api-key <key>" >&2
  exit 1
}

mkdir -p "$OUT_DIR"

# The demo collector's URL is `${FIXTURE_BASE_URL}/newsroom_v1.html`. Read just
# that one variable out of .env rather than sourcing the file, so a secret in
# there is never executed or exported by this script.
if [[ -z "${FIXTURE_BASE_URL:-}" && -f .env ]]; then
  FIXTURE_BASE_URL=$(sed -n 's/^FIXTURE_BASE_URL=//p' .env | tail -1)
  export FIXTURE_BASE_URL
fi

# One place that knows the registry's shape: the application's own loader, so a
# `${FIXTURE_BASE_URL}` here expands exactly as it will at run time, and an unset
# placeholder fails loudly instead of being sent to Bright Data verbatim.
# Emits: key<TAB>url<TAB>prompt_file for collectors that are enabled and PENDING.
# The first URL is used — demo_newsroom also lists the mutated fixture, and that
# one is for `run`, not `create`.
PENDING=$("$PYTHON" - "$@" <<'PY'
import os
import sys
from pathlib import Path

sys.path.insert(0, ".")
from app.infra.registry import load_registry  # noqa: E402

wanted = set(sys.argv[1:])
registry = load_registry(Path("collectors/registry.yaml"), os.environ)
for spec in registry.all():
    if wanted and spec.key not in wanted:
        continue
    if spec.is_provisioned:
        print(f"skip {spec.key}: already {spec.collector_id}", file=sys.stderr)
        continue
    if not spec.enabled:
        print(f"skip {spec.key}: enabled: false", file=sys.stderr)
        continue
    print(spec.key, spec.urls[0], spec.prompt_file, sep="\t")
PY
)

[[ -n "$PENDING" ]] || { echo "Nothing to provision."; exit 0; }

count=0
while IFS=$'\t' read -r key url prompt_file; do
  [[ -n "$key" ]] || continue
  description=$(cat "collectors/$prompt_file")
  chars=${#description}
  if (( chars > 500 )); then
    echo "refusing $key: description is $chars chars, cap is 500" >&2
    exit 1
  fi

  echo "create $key  ($chars chars)  $url"
  brightdata scraper create "$url" "$description" \
    --name "${key//_/-}" --json -o "$OUT_DIR/create_$key.json" &

  (( ++count % BATCH_SIZE == 0 )) && { echo "-- waiting for batch of $BATCH_SIZE"; wait; }
done <<< "$PENDING"

wait
echo
echo "Collector ids — paste each into collectors/registry.yaml:"
"$PYTHON" - <<'PY'
import json
from pathlib import Path

for envelope in sorted(Path(".tmp").glob("create_*.json")):
    key = envelope.stem.removeprefix("create_")
    try:
        payload = json.loads(envelope.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"  {key:22} unreadable envelope: {envelope}")
        continue
    status = payload.get("status", "?")
    print(f"  {key:22} {payload.get('collector_id') or payload.get('error', '?')}  [{status}]")
PY
