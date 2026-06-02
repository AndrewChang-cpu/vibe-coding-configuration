---
name: vibe:work-loop
description: Schedules /vibe:work to run at a recurring cadence across sessions — survives usage limit resets. Run after /vibe:tasks when you want cross-session task execution.
argument-hint: "<cadence>"
allowed-tools:
  - Read
  - Bash
  - ScheduleWakeup
---

<input_validation>
Check prerequisites:
```bash
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```
If either is missing, print the appropriate error and stop.

Check that `$ARGUMENTS` contains a cadence value (e.g. `1h`, `30m`, `2h`). If empty, print:
`Usage: /vibe:work-loop <cadence>  (e.g. /vibe:work-loop 2h)`
and stop.

Check for pending tasks:
```bash
grep -c '`pending`' .plan/TASKS.md || true
```
If 0 pending tasks, print `All tasks already done.` and stop.
</input_validation>

<execution_flow>
## Stage 1 — RUN ONE WORK WAVE NOW

Execute one full wave of work inline in the current session:

- Read `.plan/TASKS.md` and `.plan/PLAN.md`
- Find all `pending` tasks whose dependencies (listed under `Depends:`) are all `done`
- Select the subset safe to run in parallel (no overlapping `Files:` fields)
- Dispatch one implementer subagent per task (in parallel via Agent tool)
- Each implementer: write tests first, implement, run the `Done when:` command to verify, report done or failed
- Dispatch one reviewer subagent per completed task (spec compliance + code quality)
- Fix any blocking review issues (re-dispatch implementer, re-review)
- Mark approved tasks `done` in `.plan/TASKS.md`
- Print a summary: tasks completed this wave, tasks remaining

## Stage 2 — DECIDE WHETHER TO RESCHEDULE

After the wave completes, check remaining pending tasks:
```bash
grep -c '`pending`' .plan/TASKS.md || true
```

**If 0 pending tasks remain:** print `ALL TASKS COMPLETE — loop exiting.` and stop. Do NOT call ScheduleWakeup.

**If tasks remain:** parse `$ARGUMENTS` cadence into seconds (e.g. `30m` → 1800, `1h` → 3600) capped at 3600. Call:

```
ScheduleWakeup(
  delaySeconds = <cadence_in_seconds>,
  prompt = "/vibe:work-loop $ARGUMENTS",
  reason = "continuing work loop — N tasks remaining"
)
```

The harness will re-invoke this skill after the delay. If a rate limit hit during the wave, the next wakeup fires once the limit clears — TASKS.md already holds progress.
</execution_flow>

<notes>
- ScheduleWakeup reschedules within the current local conversation — no CCR quota consumed.
- Rate limits are handled transparently: the wakeup fires after the limit clears, and TASKS.md preserves all completed-task state.
- Maximum supported cadence is 1h (ScheduleWakeup is clamped to 3600s by the harness). For longer intervals use `/schedule` instead.
- To cancel early: just don't respond to the next wakeup, or close the session.
- Cadence examples: `30m`, `1h` (max)
</notes>
