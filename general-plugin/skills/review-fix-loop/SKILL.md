---
name: vibe:review-fix-loop
description: Codex-backed headless review-fix loop. Launches fresh codex exec phases for review, taskify, and work until clean, blocked, or user input is needed.
argument-hint: "[--max-iterations N]"
allowed-tools:
  - Bash
  - Read
---

<role>
You are a launcher for the Codex-backed review-fix loop. Do not run the loop manually inside the interactive session. Your job is to validate the environment, invoke the bundled runner script, and report the final status from `.plan/review-fix-loop-output/state.json`.

This skill is Codex-only for now. If invoked in Claude Code, fail immediately with:
`vibe:review-fix-loop is Codex-backed only right now. Run it from Codex, or use the manual Claude Code workflow.`
</role>

<input_validation>
Run:
```bash
test -n "${CLAUDE_PLUGIN_ROOT:-}" && echo "claude: yes" || echo "claude: no"
test -n "${PLUGIN_ROOT:-}" && echo "plugin_root: found" || echo "plugin_root: missing"
command -v codex >/dev/null 2>&1 && echo "codex: found" || echo "codex: missing"
test -d .git && echo "git: found" || echo "git: missing"
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
```

Stop if:
- Claude is detected without a Codex `PLUGIN_ROOT`.
- `PLUGIN_ROOT` is missing.
- `codex` is missing.
- `.git` is missing.
- `.plan/PLAN.md` is missing.

If `.plan/PLAN.md` is missing, print:
`No PLAN.md found. The review-fix loop remediates defects within an existing wave; run /vibe:plan first.`
</input_validation>

<execution_flow>
Parse `$ARGUMENTS`:
- Default `max_iterations = 10`.
- If `$ARGUMENTS` contains `--max-iterations N`, use that positive integer.

Run:
```bash
node "${PLUGIN_ROOT}/skills/review-fix-loop/scripts/review-fix-loop.js" \
  --repo "$PWD" \
  --max-iterations "<max_iterations>"
```

After the script exits, read `.plan/review-fix-loop-output/state.json` if it exists and summarize:
- final status
- iteration count
- last phase
- user question if `NEEDS_USER_INPUT`
- blocked reason if `BLOCKED`

Also read `.plan/review-fix-loop-output/tasks.json` if it exists and summarize counts by task status. Keep this concise.
</execution_flow>

<status_meanings>
- `CLEAN` — no unresolved review-fix tasks remain.
- `WORK_REMAINING` — internal continuation status only; the script should keep running.
- `NEEDS_USER_INPUT` — a task cannot be completed correctly without a user decision between multiple technically valid approaches, and the intended choice is not clear from existing code, plan, tests, or best practice.
- `BLOCKED` — tooling, repository state, infrastructure, or missing required context prevents progress.
</status_meanings>
