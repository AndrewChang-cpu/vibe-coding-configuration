#!/bin/bash
# request-recap — ask for a concise recap of the most recent response

set -euo pipefail

HOOK_INPUT=$(cat)

# Do not recurse when the model is already responding to this Stop hook.
if echo "$HOOK_INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

PROMPT='Give a concise technical recap of your most recent response only.

Include:
- A brief summary of the user-facing decisions or guidance you gave.
- A file-by-file technical description of changes you made or proposed.
- Verification performed or explicitly not performed.
- Steps taken: briefly describe the sequence of actions you performed to reach the result (e.g. "read X → found Y → edited Z"). If any step failed or was abandoned, note what went wrong and what you did instead.

Do not summarize the whole conversation.
Do not write or suggest persistent lessons.
If no files changed, say "No file changes."
Keep it under 200 words unless the last response changed many files.'

jq -n --arg reason "$PROMPT" '{"decision": "block", "reason": $reason}'
exit 0
