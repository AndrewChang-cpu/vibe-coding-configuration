#!/bin/bash
# request-recap — ask for a brief recap, but only when the response actually changed files

set -euo pipefail

HOOK_INPUT=$(cat)

# Do not recurse when the model is already responding to this Stop hook.
if echo "$HOOK_INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

TRANSCRIPT=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // empty')

# Scan the transcript backwards from the end, stopping at the last real user
# message (content is a plain string — tool_results have array content), and
# check whether any Edit/Write/NotebookEdit tool calls happened since then.
FILES_CHANGED="true"
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  FILES_CHANGED=$(jq -s -r '
    reverse
    | reduce .[] as $line ({done: false, changed: false};
        if .done then .
        elif ($line.type == "user" and (($line.message.content // null) | type) == "string") then
          .done = true
        else
          .changed = (.changed or
            ([$line.message.content[]? | select(.type? == "tool_use" and (.name? == "Edit" or .name? == "Write" or .name? == "NotebookEdit"))] | length > 0))
        end)
    | .changed
  ' "$TRANSCRIPT" 2>/dev/null) || FILES_CHANGED="true"
fi

if [[ "$FILES_CHANGED" != "true" ]]; then
  exit 0
fi

PROMPT='In 1-3 sentences: which file(s) did you change, what did you change in them, and justify your changes in the context of the conversayion. No conversation summary, no lessons.'

jq -n --arg reason "$PROMPT" '{"decision": "block", "reason": $reason}'
exit 0
