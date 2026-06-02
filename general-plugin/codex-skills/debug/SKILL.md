---
name: vibe:debug
description: Systematic bug investigation. Collects symptoms from the user, delegates investigation to the debugger agent, presents root cause and proposed fix.
allowed-tools:
  - Bash
  - Read
  - Agent
---

<execution_flow>

## Stage 1 — GATHER SYMPTOMS

Ask the user to describe the bug. Collect:
- What they expected to happen
- What actually happened (exact error message if any)
- Steps to reproduce
- When it started (recent change? always? intermittent?)

Do not ask the user what is causing the bug or which file has the problem. That is the investigator's job.

```bash
git log --oneline -5
```
Note recent commits as context for the investigation.

## Stage 2 — DISPATCH DEBUGGER

Spawn the `debugger` agent. Provide a self-contained prompt with:
- The symptom description collected in Stage 1
- Recent git log
- Any relevant error messages or stack traces the user provided

The agent runs its investigation independently and returns findings.

## Stage 3 — PRESENT FINDINGS

Present the agent's findings to the user:
- Root cause (confirmed or most-likely hypothesis)
- Which file(s) and line(s) are involved
- Proposed fix
- Any caveats or remaining uncertainty

If the agent applied a fix directly, verify it resolves the symptom:
```bash
# Run the project's test command if available
```

If the agent was not able to confirm a root cause, report what was ruled out and suggest the next investigation step.

</execution_flow>
