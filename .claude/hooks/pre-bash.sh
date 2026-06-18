#!/usr/bin/env bash
# PreToolUse hook: block dangerous bash commands.
# Claude Code delivers tool data via stdin as JSON:
# {"session_id":"…","tool_name":"Bash","tool_input":{"command":"…"}}
# Exit 0 = allow, non-zero = block.

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('command', ''))
" 2>/dev/null || echo "")

# Block hard-delete and force-push patterns
if echo "$CMD" | grep -qE 'rm\s+-rf|git\s+push\s+--force|git\s+push\s+-f\b'; then
  echo "BLOCKED: Dangerous command pattern detected: $CMD" >&2
  exit 1
fi

# Block piped install patterns
if echo "$CMD" | grep -qE 'curl\s+.*\|\s*(bash|sh)|wget\s+.*\|\s*(bash|sh)'; then
  echo "BLOCKED: Piped install pattern: $CMD" >&2
  exit 1
fi

# Block Supabase destructive ops
if echo "$CMD" | grep -qE 'supabase\s+db\s+push'; then
  echo "BLOCKED: supabase db push is denied (use migration files only)" >&2
  exit 1
fi

exit 0
