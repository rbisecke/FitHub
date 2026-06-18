#!/usr/bin/env bash
# PostToolUse hook: auto-format and type-check the file that was just edited.
# Claude Code delivers tool data via stdin as JSON:
# {"session_id":"…","tool_name":"Edit","tool_input":{"file_path":"…",…},"tool_response":{…}}

set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null || echo "")

if [[ -z "$FILE" ]]; then exit 0; fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [[ -z "$ROOT" ]]; then exit 0; fi

case "$FILE" in
  *.py)
    uv run --project "$ROOT/apps/api" ruff format "$FILE" 2>/dev/null || true
    uv run --project "$ROOT/apps/api" ruff check --fix "$FILE" 2>/dev/null || true
    ;;
  *.ts|*.tsx)
    pnpm --dir "$ROOT" exec prettier --write "$FILE" 2>/dev/null || true
    ;;
esac
