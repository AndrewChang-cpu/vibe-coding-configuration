---
name: vibe:work
description: Executes .plan/TASKS.md — dispatches implementer subagents for pending tasks, runs a single reviewer per task, updates statuses, and verifies DoD when complete. Run after /vibe:tasks.
allowed-tools:
  - Read
  - Edit
  - Bash
  - Agent
---

<input_validation>
Before doing anything, verify both plan files exist:
```bash
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```
If either is missing:
- No `.plan/TASKS.md`: print `No TASKS.md found. Run /vibe:tasks first.` and stop.
- No `.plan/PLAN.md`: print `No PLAN.md found. Run /vibe:plan first.` and stop.
</input_validation>

<execution_flow>
## Stage 1 — READ
Read all `.plan/*.md` files that exist. Extract the Definition of Done criteria (checkbox list) from PLAN.md. If the plan is split, also read PRD.md, SYSTEM-DESIGN.md, and UI-SPEC.md — their content will be needed when constructing implementer prompts.
Read `.plan/TASKS.md` in full. Build a mental model of:
- All tasks (ID, status, depends_on, files, what, done-when)
- Which tasks are `done`
- Which tasks are `pending` with all dependencies satisfied (ready)
- Which tasks are `pending` but blocked by incomplete dependencies

## Stage 2 — CHECK COMPLETION
If all tasks are `done`:
- Proceed directly to Stage 6 (DoD verification).

If no tasks are ready (pending tasks exist but all are blocked):
- Print which tasks are blocked and what they're waiting on.
- Stop. (A prior task likely failed review — inspect manually.)

## Stage 3 — SELECT WAVE
From the ready tasks, select the set to execute in this wave. Use judgment:
- Tasks are safe to parallelize if their `Files` fields do not overlap.
- If two ready tasks share a file, serialize them (run the first, then the other next wave).
- Default to running as many non-conflicting ready tasks in parallel as possible.
- If uncertain about conflicts, run one task.

## Stage 4 — DISPATCH IMPLEMENTERS
For each task in the wave, dispatch one implementer subagent in parallel. Each subagent receives a self-contained prompt with:

**Scene setting:**
- Project name and type (from PLAN.md overview)
- This task's position in the overall plan (e.g. "Task 3 of 8")
- Which tasks this depends on and what they produced (from TASKS.md context)

**Task block (verbatim):**
- Task ID and name
- Files (new vs. existing)
- What (full description)
- Done when (full criteria)

**TDD guidance (inlined):**
- Write the test(s) first, before any implementation code
- Run the tests to confirm they fail for the right reason
- Write the minimum implementation to make them pass
- Refactor only after tests are green
- Include the test run output in your status report

**Frontend-design directive (inject only if task Files contain `.tsx`, `.jsx`, `.vue`, `.css`, or names containing `component`, `page`, `layout`, `ui`, `view`):**
- Before writing any code, commit to a bold, specific aesthetic direction (not "clean and modern" — pick something with personality)
- Avoid generic AI aesthetics: no default shadcn gray, no safe neutral layouts, no Lorem Ipsum placeholders
- The aesthetic direction must be visible in the final output

**Status protocol — end your response with exactly one of:**
- `STATUS: DONE` — work complete, tests pass, self-review clean
- `STATUS: DONE_WITH_CONCERNS — [brief description]` — complete but flagging something
- `STATUS: NEEDS_CONTEXT — [what is missing]` — cannot proceed without more information
- `STATUS: BLOCKED — [reason]` — cannot complete, needs human intervention

## Stage 5 — REVIEW AND FIX LOOP
After all implementers in the wave report back, handle each status:

**NEEDS_CONTEXT:** Provide the missing context and re-dispatch the implementer.

**BLOCKED:** Skip this task for now. Note it as blocked. Continue with the rest of the wave.

**DONE or DONE_WITH_CONCERNS:** Dispatch a reviewer subagent. The reviewer receives:
- The task block (verbatim)
- The implementer's self-report
- Instructions: review for both spec compliance (built exactly what was asked — no more, no less) and code quality (naming, structure, test coverage) in a single pass. List any issues found with severity (blocking vs. advisory).

If reviewer finds **blocking issues**: have the implementer fix them (re-dispatch with the reviewer's findings), then re-review. Repeat until clean.

If reviewer finds **only advisory issues** or approves: mark the task `done` in `.plan/TASKS.md` by editing the `**Status:**` line from `` `pending` `` to `` `done` ``.

## Stage 6 — REPEAT OR VERIFY
After the wave completes, go back to Stage 2. Continue until all tasks are `done` or only blocked tasks remain.

When all tasks are `done`:
- Read each DoD criterion from PLAN.md's Definition of Done section
- Verify each criterion is met (check files exist, run commands from "Done when" fields if applicable)
- Report: ✅ or ❌ per criterion with one-line explanation

If all DoD criteria pass:
```
<promise>ALL TASKS COMPLETE</promise>
```

If any DoD criteria fail:
- List the failing criteria
- Do NOT output the completion promise
- Stop and let the user decide how to proceed
</execution_flow>

<subagent_rules>
- Never make implementer subagents read PLAN.md or TASKS.md directly — provide all context in the prompt
- Never dispatch multiple implementers for the same task simultaneously
- Never skip the reviewer pass — even for simple tasks
- Never advance to the next wave while a reviewer has open blocking issues
- Never output `<promise>ALL TASKS COMPLETE</promise>` unless every DoD criterion is verified
</subagent_rules>
