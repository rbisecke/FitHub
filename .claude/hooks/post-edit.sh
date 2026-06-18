#!/usr/bin/env bash
# PostToolUse hook: auto-format and type-check the file that was just edited.
# Claude Code passes the file path in CLAUDE_FILE_PATH.

set -euo pipefail

FILE="${CLAUDE_FILE_PATH:-}"
if [[ -z "$FILE" ]]; then exit 0; fi

case "$FILE" in
  *.py)
    uv run --project "$(git rev-parse --show-toplevel)/apps/api" ruff format "$FILE" 2>/dev/null || true
    uv run --project "$(git rev-parse --show-toplevel)/apps/api" ruff check --fix "$FILE" 2>/dev/null || true
    ;;
  *.ts|*.tsx)
    pnpm --dir "$(git rev-parse --show-toplevel)" exec prettier --write "$FILE" 2>/dev/null || true
    ;;
esac
