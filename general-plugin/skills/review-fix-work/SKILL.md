---
name: vibe:review-fix-work
description: Runs vibe:work for review-fix tasks until the current batch is complete, then syncs .plan/TASKS.md status back to the review-fix ledger.
allowed-tools:
  - Read
  - Edit
  - Bash
  - Agent
---

<role>
You are a thin wrapper around `vibe:work` for review-fix loop tasks.

Use the existing `vibe:work` skill for implementation and review behavior. Do not duplicate its implementer/reviewer protocol. Do not use `vibe:plan`.
</role>

<input_validation>
Check:
```bash
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/review-fix-loop-output/tasks.json && echo "ledger: found" || echo "ledger: MISSING"
```

If any are missing, return `BLOCKED`.
</input_validation>

<execution_flow>
## Stage 1 — Run Work
Use `vibe:work` to execute review-fix tasks in `.plan/TASKS.md`.

If `vibe:work` asks whether to extract learnings, answer no for this automation path.

If implementation discovers that a task cannot be completed correctly without choosing between multiple technically valid approaches, and the intended choice is not clear from existing code, plan, tests, or best practice:
- Stop the affected task.
- Mark the corresponding ledger task `needs_user_input`.
- Return `NEEDS_USER_INPUT`.

Do not stop for decisions that have a clear best-practice answer or a clear local codebase precedent.

## Stage 2 — Sync Ledger
After each `vibe:work` pass, read `.plan/TASKS.md` and `.plan/review-fix-loop-output/tasks.json`.

For each ledger task whose ID appears in `.plan/TASKS.md`:
- If TASKS marks it `done`, set ledger status to `done`.
- If TASKS marks it blocked or describes a block, set ledger status to `blocked`.
- Otherwise keep it `pending`.
- Update `files` from the task block when available.
- Add or update `done_summary` with a concise description of what changed for completed tasks.
- Set `updated_at`.

Update `.plan/review-fix-loop-output/state.json` with the current status and summary.

## Stage 3 — Continue Or Stop
If any ledger task is `needs_user_input`, return `NEEDS_USER_INPUT`.
If any ledger task is `blocked`, return `BLOCKED`.
If any actionable review-fix task in `.plan/TASKS.md` is still `pending`, `in-progress`, or `reviewed`, return `WORK_REMAINING`.
If all current review-fix tasks are complete, return `CLEAN`.

`CLEAN` here means the current task batch is complete. The external runner will run another review pass to decide whether the whole review-fix loop is clean.
</execution_flow>

<status_protocol>
Return JSON only. Valid statuses:
- `CLEAN`
- `WORK_REMAINING`
- `NEEDS_USER_INPUT`
- `BLOCKED`
</status_protocol>
