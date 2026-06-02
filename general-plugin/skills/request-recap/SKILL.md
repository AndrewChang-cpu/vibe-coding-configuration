---
name: request-recap
description: Background hook — not a slash command. Fires automatically at session end to ask for a concise recap of the most recent response.
---

# Request Recap

Background skill. No slash command — runs via hooks only.

## Hooks

**Stop hook (`request-recap.sh`):** Fires at the end of each request. Asks the model to summarize only its most recent response, including user-facing decisions or guidance, file-by-file technical changes made or proposed, and verification performed or explicitly not performed.

**PostToolUse Write hook (`tdd-reminder.sh`):** Fires when a new `.py` file is written (excluding test files). Outputs a one-line reminder to write tests first before implementing logic.
