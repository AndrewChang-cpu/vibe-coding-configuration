---
name: vibe:work-loop
description: Schedules /vibe:work to run at a recurring cadence across sessions — survives usage limit resets. Run after /vibe:tasks when you want cross-session task execution.
argument-hint: "<cadence>"
allowed-tools:
  - Read
  - Bash
---

<input_validation>
Check prerequisites:
```bash
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```
If either is missing, print the appropriate error and stop.

Check that `$ARGUMENTS` contains a cadence value (e.g. `1h`, `30m`, `2h`, `1d`). If empty, print:
`Usage: /vibe:work-loop <cadence>  (e.g. /vibe:work-loop 2h)`
and stop.

Check for pending tasks:
```bash
grep -c '`pending`' .plan/TASKS.md || true
```
If 0 pending tasks, print `No pending tasks in TASKS.md.` and stop.
</input_validation>

<execution_flow>
## Stage 1 — CREATE SCHEDULE
Use the `/schedule` skill to create a recurring scheduled agent at the specified cadence.

The scheduled agent's instructions (provide these verbatim to the schedule):

```
Working directory: <absolute path of current directory>

Read .plan/TASKS.md and .plan/PLAN.md.

If all tasks are `done` and every Definition of Done criterion from PLAN.md is verified:
  - Cancel this scheduled job (use CronDelete with the job ID stored in .plan/.work-loop-job-id if present)
  - Print: ALL TASKS COMPLETE — schedule cancelled.
  - Stop.

Otherwise:
  - Find all pending tasks whose dependencies are satisfied
  - Select the set safe to run in parallel (no overlapping Files fields)
  - Dispatch one implementer subagent per task (in parallel)
  - Each implementer: write tests first, then implementation, run tests before reporting done
  - Dispatch one reviewer subagent per completed task (checks spec compliance + code quality)
  - Fix any blocking review issues (re-dispatch implementer, re-review)
  - Mark approved tasks `done` in .plan/TASKS.md
  - Print a summary: tasks completed this run, tasks remaining
  - Stop. (Next scheduled run will continue.)
```

## Stage 2 — STORE JOB ID
After the schedule is created, write the job ID to `.plan/.work-loop-job-id` so the scheduled agent can self-cancel when done.

## Stage 3 — RUN FIRST WAVE IMMEDIATELY
Do not wait for the first scheduled run. Execute one full wave of `/vibe:work` now in the current session: select ready tasks, dispatch implementers in parallel, review, fix, update TASKS.md.

Print a summary of what was completed and what remains, then hand off to the schedule.
</execution_flow>

<notes>
- Each scheduled run is an independent session. TASKS.md is the shared state between runs.
- To inspect the schedule: `/schedule list`
- To cancel early: `/schedule list` to find the job, then delete it, or check `.plan/.work-loop-job-id`
- If a scheduled run hits a usage limit mid-wave, the next scheduled run picks up from the last fully-completed task (status `done` in TASKS.md).
- Cadence examples: `30m`, `1h`, `2h`, `6h`, `1d`
</notes>
