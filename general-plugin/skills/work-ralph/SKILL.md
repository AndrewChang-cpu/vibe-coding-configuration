---
name: vibe:work-ralph
description: Runs /vibe:work in a ralph-wiggum loop — one wave per iteration, sequential and inspectable. Requires the ralph-wiggum plugin. Run after /vibe:tasks.
argument-hint: "[max-iterations]"
allowed-tools:
  - Read
  - Write
  - Bash
---

<tool_gate>
Use this skill only in Claude Code with the ralph-wiggum plugin installed.

If the current tool is not Claude Code, stop and say:
`vibe:work-ralph is Claude Code-only. Use /goal with vibe:work-goal instead.`
</tool_gate>

<input_validation>
Check prerequisites:
```bash
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```
If either is missing, print the appropriate error and stop:
- No TASKS.md: `No TASKS.md found. Run /vibe:tasks first.`
- No PLAN.md: `No PLAN.md found. Run /vibe:plan first.`

Check that there are actually pending tasks:
```bash
grep -c '`pending`' .plan/TASKS.md || true
```
If 0 pending tasks, print `No pending tasks found in TASKS.md.` and stop.
</input_validation>

<execution_flow>
## Stage 1 — PARSE ARGUMENTS
Parse `$ARGUMENTS`:
- If a positive integer is provided (e.g. `/vibe:work-ralph 20`): use it as `max_iterations`
- If empty or `0`: use `0` (unlimited)

## Stage 2 — WRITE RALPH LOOP STATE FILE
```bash
mkdir -p .claude
```

Write `.claude/ralph-loop.local.md` with this exact format:

```
---
active: true
iteration: 1
max_iterations: <MAX_ITERATIONS>
completion_promise: "ALL TASKS COMPLETE"
started_at: "<current ISO timestamp from: date -u +%Y-%m-%dT%H:%M:%SZ>"
---

Read .plan/TASKS.md and .plan/PLAN.md. Find all pending tasks whose dependencies are satisfied. Select the set you are confident can run in parallel without file conflicts. Dispatch one implementer subagent per task (in parallel), then one reviewer subagent per task. Fix any blocking review issues. Update each approved task status to `done` in .plan/TASKS.md. When ALL tasks are `done` and every Definition of Done criterion from .plan/PLAN.md is verified, output: <promise>ALL TASKS COMPLETE</promise>
```

## Stage 3 — RUN FIRST ITERATION
Execute the `/vibe:work` skill now (do not wait for the ralph loop to re-invoke). Run the full work flow: select wave, dispatch implementers, review, fix, update TASKS.md.

When the first wave is complete:
- If all tasks are done and DoD passes: output `<promise>ALL TASKS COMPLETE</promise>` and the ralph loop will exit.
- If work remains: end your response normally. The stop hook will re-invoke the prompt for the next iteration, picking up from the updated TASKS.md.

## Stage 4 — SUBSEQUENT ITERATIONS (automatic)
The ralph-wiggum stop hook handles all re-invocations. Each iteration receives the same prompt and reads the current TASKS.md state. No action needed — just run the work.
</execution_flow>

<notes>
- The ralph loop is in-session only. If the session ends (usage limit, manual exit), the loop stops. TASKS.md retains all progress; re-run `/vibe:work-ralph` to resume.
- To cancel mid-loop: run `/cancel-ralph` (removes `.claude/ralph-loop.local.md`).
- To monitor progress: `grep -E "Status|^###" .plan/TASKS.md`
- Max iterations limits ralph re-invocations, not tasks. One iteration may complete multiple tasks in a parallel wave.
</notes>
