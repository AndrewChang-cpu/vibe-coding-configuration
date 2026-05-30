#!/bin/bash
# extract-patterns — suggest lessons.md patterns at session end (fires once per session)

set -euo pipefail

HOOK_INPUT=$(cat)

# Derive a session-specific flag from the transcript path so we only fire once
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // ""')
if [[ -z "$TRANSCRIPT_PATH" ]]; then
  exit 0
fi

SESSION_HASH=$(echo "$TRANSCRIPT_PATH" | cksum | cut -d' ' -f1)
SESSION_FLAG="/tmp/extract-patterns-${SESSION_HASH}.done"

# Already ran this session — allow stop
if [[ -f "$SESSION_FLAG" ]]; then
  exit 0
fi

touch "$SESSION_FLAG"

PROMPT='Review the conversation that just completed. If you identified any genuinely useful patterns, code style preferences, common pitfalls, or architecture decisions that would benefit future work on this project, suggest adding them to .vibe/lessons.md.

Only suggest patterns that are:
1. Project-specific (not general best practices already covered elsewhere)
2. Repeatedly applicable (not one-off solutions)
3. Non-obvious (insights that are not immediately apparent)
4. Actionable (clear guidance for future development)

If no such patterns emerged from this conversation, respond with: No new patterns to extract.'

jq -n --arg reason "$PROMPT" '{"decision": "block", "reason": $reason}'
exit 0
