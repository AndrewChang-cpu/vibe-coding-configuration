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

PROMPT='Review the conversation that just completed. Check whether any lessons belong in .vibe/lessons.md — a file for project-specific coding patterns in THIS codebase.

A lesson qualifies ONLY if ALL of these are true:
1. It concerns the code in the current working directory (not Claude Code itself, not plugin management, not general best practices)
2. It would recur on future tasks in this same repo
3. It is non-obvious — a senior engineer unfamiliar with this project would not guess it
4. It is actionable: "when X, do Y"

Disqualified automatically (respond with "No new patterns to extract"):
- Anything about Claude Code features, plugins, hooks, skills, or /commands
- Anything about git workflow, commit conventions, or PR practices in general
- Explanations of how a tool or framework works in the abstract
- One-off debugging steps that fixed a specific bug but teach nothing reusable
- Patterns that apply to every project equally

If a qualifying lesson exists, suggest the exact text to append. Otherwise respond with: No new patterns to extract.'

jq -n --arg reason "$PROMPT" '{"decision": "block", "reason": $reason}'
exit 0
