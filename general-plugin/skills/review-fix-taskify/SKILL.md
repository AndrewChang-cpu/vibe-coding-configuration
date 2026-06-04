---
name: vibe:review-fix-taskify
description: Converts confirmed review-fix loop ledger tasks into executable .plan/TASKS.md entries for vibe:work. Codex headless wrapper; does not run implementation.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

<role>
You convert confirmed review-fix tasks into low-level implementation tasks. This is not ideation and must not use `vibe:plan`.

Do not implement code. Do not run tests except for lightweight repository inspection commands needed to identify existing conventions. Do not ask interactive questions. If user input is required, update the ledger and return `NEEDS_USER_INPUT`.
</role>

<input_validation>
Check:
```bash
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
test -f .plan/review-fix-loop-output/tasks.json && echo "ledger: found" || echo "ledger: MISSING"
```

If `.plan/PLAN.md` is missing, return `BLOCKED`.
If the ledger is missing, return `BLOCKED`.
</input_validation>

<execution_flow>
## Stage 1 — Read Ledger And Existing Tasks
Read `.plan/review-fix-loop-output/tasks.json`.
Read `.plan/TASKS.md` if it exists.
Read `.plan/PLAN.md` only for project context, scope, and Definition of Done. Do not invoke `vibe:plan`.

Identify ledger tasks with status `pending`.
If none exist, return `CLEAN`.

If `.plan/TASKS.md` contains non-review-fix tasks with status `pending` or `in-progress`, return `BLOCKED` with a summary that the review-fix loop requires the existing implementation wave to be complete before adding remediation tasks.

## Stage 2 — Technical Decision Gate
For each pending ledger task, inspect only enough code and configuration to determine concrete file-level implementation tasks.

Return `NEEDS_USER_INPUT` only when the task cannot be completed correctly without choosing between multiple technically valid implementation approaches, and the intended choice is not clear from existing code, plan, tests, or best practice.

If a task needs user input:
- Set that ledger task status to `needs_user_input`.
- Add or update `needs_user_input` with the smallest concrete question.
- Set `updated_at`.
- Return `NEEDS_USER_INPUT`.

Do not treat broad categories like auth, retry behavior, or concurrency as automatically ambiguous. Stop only when the specific task is genuinely unresolved after checking existing patterns and best practice.

## Stage 3 — Write TASKS.md
Write `.plan/TASKS.md` in the existing `vibe:work` task format. Include only actionable review-fix tasks plus already completed review-fix tasks needed for dependency context.

Task IDs must match ledger IDs, e.g. `RF-001`.

Each task must include:
- `**Status:**` as `pending` for actionable tasks.
- `**Depends on:**` as another review-fix task ID or `none`.
- `**Files:**` with repo-relative paths.
- `**What:**` with the exact function, endpoint, module, config, validator, test, or behavior to change.
- `**Done when:**` with verifiable commands or observable checks.
- `**Tests:**` with specific regression tests to write, or `N/A` only when tests are not appropriate.

Keep tasks surgical. Each task must trace directly to a confirmed review finding.

## Stage 4 — Update Ledger
For every task written to `.plan/TASKS.md`, update the ledger with:
- `taskified_at`
- `files`
- `updated_at`

Do not mark tasks done here.

Update `.plan/review-fix-loop-output/state.json` with:
- `status: "WORK_REMAINING"`
- `last_phase: "taskify"`
- a brief summary

Return JSON only:
```json
{
  "status": "WORK_REMAINING",
  "summary": "Wrote N review-fix tasks to .plan/TASKS.md"
}
```
</execution_flow>

<status_protocol>
Return JSON only. Valid statuses:
- `CLEAN`
- `WORK_REMAINING`
- `NEEDS_USER_INPUT`
- `BLOCKED`
</status_protocol>
