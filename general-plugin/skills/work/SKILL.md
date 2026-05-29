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

**TDD mandate (non-negotiable):**

STEP 0 — TESTABILITY CHECK: Before writing any tests, check whether the code you are about to write is actually testable. Red flags to fix before proceeding:
- Hidden time/randomness: `Date.now()`, `Math.random()` inside business logic → inject a Clock/Rng seam
- Hardcoded external I/O: `new Db()`, `fetch(...)`, filesystem calls embedded in logic → inject an interface via constructor/parameter
- Busy constructors: side effects or logic in constructors → move to factory methods
- Shared mutable state: globals or singletons that tests would share → pass state explicitly
If these appear in code you control, fix the design first. If they are in existing code you cannot change, raise STATUS: BLOCKED explaining the testability constraint. Do not work around untestable design with deep mocking.

STEP 1 — RED: Write the tests listed in the task's "Tests:" field first — one test at a time. If "Tests:" is absent or "N/A", derive tests from the "Done when" criteria. Structure each test as Arrange / Act / Assert. Run them immediately. They MUST fail. Record the exact failure output. If a test passes immediately, it is testing the wrong thing — fix it. Do not write any implementation code until you have seen a failing test.

Test quality rules (violations are grounds for reviewer rejection):
- One behavior per test — if the name contains "and", split the test
- Assert outcomes at public seams (return values, observable state, side effects on injected fakes) — not private methods or internal fields
- Use the weakest double that will do the job: Stub (canned responses) < Fake (in-memory impl) < Spy (observe calls) < Mock (verify interactions). A Fake in-memory DB is always preferred over a Mock for persistence
- For tests marked [needs-db] or [needs-network], provision real infrastructure (testcontainers, in-memory fake, or sandbox) — do not substitute a mock and claim the test passes
- Tests must be deterministic: inject Clock/Rng seams rather than sleeping or calling Date.now() directly

STEP 2 — GREEN: Write the minimum implementation to make the tests pass. Run the tests again. Record the exact passing output. Fix the implementation (never the test) until all tests pass.

STEP 3 — VERIFY DONE-WHEN: Execute every command stated in the "Done when" criteria verbatim. Do not read files or reason about whether they would pass. Run the commands. Record the exact output of each.

If any "Done when" command cannot be run (missing DB, missing network service, missing external dependency): do NOT report STATUS: DONE. Report STATUS: BLOCKED with a description of exactly what infrastructure is missing and which "Done when" criterion requires it.

**Scope discipline — apply at decision points during implementation:**

*Circle of Concern vs Circle of Control:* Before modifying any file NOT explicitly listed in this task's `Files` field, ask: is this in my Circle of Control (plan scope) or Circle of Concern (things I notice but shouldn't fix right now)? If Circle of Concern: document it as a deviation note, do NOT fix it. "While I'm here" fixes are the #1 cause of scope creep and reviewer rejection.

*Forcing Function:* When you encounter an ambiguous requirement or unclear integration point, resolve the decision NOW rather than deferring to a TODO or runtime check. Use a TypeScript `never` type to force exhaustive switches, a build-time assertion for required config values, or an interface that forces callers to handle error cases. If the decision truly cannot be made at build time, document it as a `checkpoint:decision` deviation — do not silently defer.

**Python directive (inject only if task Files contain `.py`):**
- Before implementing, read the `python-patterns` skill for this project's Python idioms, type hint conventions, and architectural patterns. Apply these standards throughout your implementation.
- For test files, read the `python-testing` skill for pytest fixture conventions, marker usage, and coverage expectations.

**Frontend-design directive (inject only if task Files contain `.tsx`, `.jsx`, `.vue`, `.css`, or names containing `component`, `page`, `layout`, `ui`, `view`):**
- The aesthetic direction was established in the plan mockups at `.plan/mockup-*.html`. Read the relevant mockup(s) before writing any code and implement them faithfully — do not invent a new aesthetic direction
- Match the mockup's typography, color palette, spacing, and composition exactly
- If no mockup exists for this UI state, flag it as `STATUS: NEEDS_CONTEXT` rather than improvising

**Status protocol — end your response with exactly one of:**
- `STATUS: DONE` — all three steps completed; RED failure output, GREEN pass output, and all "Done when" command outputs are included in this response
- `STATUS: DONE_WITH_CONCERNS — [brief description]` — steps completed but flagging something; all required outputs still present
- `STATUS: NEEDS_CONTEXT — [what is missing]` — cannot proceed without more information
- `STATUS: BLOCKED — [reason]` — one or more "Done when" commands cannot be executed due to missing infrastructure; specify which command and what is needed

**STATUS: DONE is invalid if this response does not contain:**
- Actual failing test output from the RED phase (not a description that tests were written)
- Actual passing test output from the GREEN phase (not a claim that tests pass)
- Actual output of every "Done when" command (not a claim that criteria are met)

## Stage 5 — REVIEW AND FIX LOOP
After all implementers in the wave report back, handle each status:

**NEEDS_CONTEXT:** Provide the missing context and re-dispatch the implementer.

**BLOCKED:** Skip this task for now. Note it as blocked. Continue with the rest of the wave.

**DONE or DONE_WITH_CONCERNS:** Dispatch a reviewer subagent. The reviewer receives:
- The task block (verbatim), including its full "Done when" criteria and "Tests:" field
- The implementer's self-report
- **Auditor Instructions:** Read `checklist.md` from the `vibe:review` skill directory. Act as a Pre-Commit Auditor: apply every checklist item, REJECT on blocking findings, list advisory items separately.

**Reviewer mandatory actions — in this order, before issuing any verdict:**

1. **Auto-reject check:** If the implementer's report does not contain actual test failure output (RED phase), actual test pass output (GREEN phase), and actual output for every "Done when" command — REJECT immediately without reading the code. Issue: "BLOCKING: STATUS: DONE submitted without required verification outputs. Re-run RED phase, GREEN phase, and all Done-when commands and include their exact outputs." Exception: if the task's "Tests:" field is "N/A", RED/GREEN outputs are not required — but Done-when command output still is.

2. **Tests: field check:** If the task has a "Tests:" field (not N/A), verify each named test function exists in the codebase and appears in the GREEN-phase passing output. A missing or renamed test is a blocking rejection.

3. **Re-execute Done-when commands:** Run every command listed in the task's "Done when" criteria yourself. Do not trust the implementer's reported output. Record the actual output of each command you ran.

4. **Report your executions:** State explicitly which commands you ran, the exact output each produced, and whether each "Done when" criterion passed or failed based on your own execution.

5. **Apply checklist:** Apply all items from `checklist.md`. REJECT on any blocking finding. List advisory items separately.

6. **4-level implementation verification:** For each file listed in the task's `Files` field, verify:
   - **(1) Exists** — file is present at the expected path
   - **(2) Substantive** — content is real implementation, not a placeholder, stub, or TODO-only file (grep for `TODO|FIXME|placeholder|not implemented|return null|pass$`)
   - **(3) Wired** — connected to the rest of the system: imported where expected, registered in routing/config, called by its consumers
   - **(4) Functional** — actually works when invoked (re-run the "Done when" commands)
   
   Levels 1–3 check programmatically. Level 4 is already covered by re-executing "Done when" commands in step 3. Report any failures as BLOCKING.

If reviewer finds **blocking issues**: have the implementer fix them (re-dispatch with the reviewer's findings), then re-review. Repeat until clean.

If reviewer finds **only advisory issues** or approves: mark the task `done` in `.plan/TASKS.md` by editing the `**Status:**` line from `` `pending` `` to `` `done` ``.

## Stage 6 — REPEAT OR VERIFY
After the wave completes, go back to Stage 2. Continue until all tasks are `done` or only blocked tasks remain.

When all tasks are `done`:
- Spawn a `doc-updater` subagent. Pass it: the list of all files modified across completed tasks, and a one-line description of what each task changed. It will update any READMEs, docstrings, or documentation that needs to reflect the changes.

- Read each DoD criterion from PLAN.md's Definition of Done section
- Verify each criterion is met (check files exist, run commands from "Done when" fields if applicable)
- Report: ✅ or ❌ per criterion with one-line explanation

If all DoD criteria pass:
```
<promise>ALL TASKS COMPLETE</promise>
```

After outputting the completion promise, ask once:
> "Extract learnings from this session? (y/n)"

If yes: read `.plan/PLAN.md` and `.plan/TASKS.md`. Extract into `.plan/LEARNINGS.md` with 4 sections:
- **Decisions** — choices made and why (with source task reference)
- **Lessons** — what would be done differently next time
- **Patterns** — reusable approaches discovered
- **Surprises** — unexpected findings, each with source task reference

Only extract what is explicitly documented in the artifacts. Do not fabricate learnings.

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
- Never let a reviewer approve a task whose STATUS: DONE report omits RED-phase failure output, GREEN-phase pass output, or Done-when command outputs
- Never let a reviewer approve a task's Done-when criteria without re-executing those commands itself
</subagent_rules>
