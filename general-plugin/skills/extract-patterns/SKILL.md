---
name: extract-patterns
description: Background hooks — not a slash command. Fires automatically at session end to suggest .vibe/lessons.md patterns, and on new Python file creation to remind about TDD.
---

# Extract Patterns

Background skill. No slash command — runs via hooks only.

## Hooks

**Stop hook (`extract-patterns.sh`):** Fires once at the end of every session. Asks Claude to review the conversation and suggest project-specific, non-obvious, repeatedly applicable patterns for `.vibe/lessons.md`. If nothing useful emerged, Claude responds "No new patterns to extract" and the session ends normally.

**PostToolUse Write hook (`tdd-reminder.sh`):** Fires when a new `.py` file is written (excluding test files). Outputs a one-line reminder to write tests first before implementing logic.

## Install

Installed via `claude plugin install extract-patterns@vibe-coding` (handled by `vibe-setup --claude`).
