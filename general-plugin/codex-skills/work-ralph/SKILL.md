---
name: vibe:work-ralph
description: Codex version of vibe:work-ralph. Use under /goal to repeatedly run vibe:work until TASKS.md and PLAN.md are complete.
argument-hint: "[max-iterations]"
---

<purpose>
Keep the skill name `vibe:work-ralph` for parity with the Claude Code plugin.

In Codex, `/goal` is the outer continuation loop. This skill stores the reusable workflow contract and stopping rules. It does not invoke `/goal` internally.
</purpose>

<usage>
Start the workflow with:

```text
/goal Use vibe:work-ralph to repeatedly execute vibe:work until every task in .plan/TASKS.md is done, the integration review passes, doc-updater has run, and every Definition of Done criterion in .plan/PLAN.md passes. If blocked, report the exact blocked task, missing dependency, and failed command. Do not change scope outside the plan.
```

If this skill is invoked outside an active Codex `/goal`, explain the command above and stop.
</usage>

<input_validation>
Check prerequisites:

```bash
test -f .plan/TASKS.md && echo "tasks: found" || echo "tasks: MISSING"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```

If either is missing, print the appropriate error and stop:
- No TASKS.md: `No TASKS.md found. Run /vibe:tasks first.`
- No PLAN.md: `No PLAN.md found. Run /vibe:plan first.`

Check whether work remains:

```bash
grep -E -c '`pending`|`reviewed`' .plan/TASKS.md || true
```

If 0, run the final DoD verification path from `vibe:work` instead of starting a new loop.
</input_validation>

<goal_contract>
When running under Codex `/goal`, repeat this cycle until complete:

1. Execute the `vibe:work` workflow for exactly one complete wave or completion pass.
2. Use Codex custom subagents for implementers, per-task reviewers, integration review, and doc-updater as directed by `vibe:work`.
3. Let `vibe:work` update `.plan/TASKS.md` status transitions.
4. After each wave, re-read `.plan/TASKS.md` and `.plan/PLAN.md`.
5. Continue if any tasks are still `pending` or `reviewed`.
6. Stop only when every task is `done`, integration review has passed, doc-updater has run, and every DoD criterion passes.

Blocked condition:
- Stop the goal and report `STATUS: BLOCKED` if a required command cannot run, infrastructure is unavailable, a task has unsatisfied dependencies that cannot be resolved, or required user context is missing.
- Include the exact task ID, dependency or command, and the smallest next action needed from the user.

Scope rule:
- Do not broaden the plan.
- Do not edit files outside task scope except where `vibe:work` explicitly authorizes shared status/doc updates.
</goal_contract>
