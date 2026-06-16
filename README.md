# vibe-setup

Bootstrap a consistent Claude Code agent environment.

Setup is intended to be **global, once-per-machine setup**. It writes user-level instructions and agents so the same workflows are available from any repository.

## Usage

```bash
npx vibe-setup
```

Or use flags:

```bash
npx vibe-setup --yes            # skip confirmation prompts
npx vibe-setup --reconfigure    # re-prompt for the general-plugin directory (claude alias)
```

Always pull the latest version:

```bash
npx vibe-setup@latest
```

## Prerequisites

- Node.js 18+
- Claude CLI

## What gets generated

| Tool | Files |
|------|-------|
| Claude | `~/.claude/CLAUDE.md` (global), `~/.claude/agents/` (global) |

Re-running is safe — you'll be prompted before global instruction/config files are updated. Use `--yes` to skip.

## Workflow

### First-time global setup (once per machine)
```bash
npx vibe-setup@latest
```
- Writes `~/.claude/CLAUDE.md` with behavioral and security instructions
- Deploys agents to `~/.claude/agents/`
- Deploys workflows to `~/.claude/workflows/`

### Per-project setup

For Claude Code, run `/init` in a repository when you want a project-specific `CLAUDE.md` layered on top of the global setup.

---

## Workflows

### Primary pipeline

Run these commands in sequence for any non-trivial feature or bugfix:

| Step | Command | What it does | Auto-fires |
|------|---------|--------------|------------|
| 1. Plan | `/vibe:plan` | Interviews you, writes `.plan/PLAN.md` with tasks, Definition of Done, and optional UI mockups | — |
| 2. Tasks | `/vibe:tasks` | Decomposes `PLAN.md` into `.plan/TASKS.md` — TDD-ready task blocks with files, Done-when criteria, and test names | — |
| 3. Work | `/vibe:work` | Dispatches implementer + reviewer subagents per task. TDD-mandated (RED → GREEN). Repeats waves until all tasks done | **python-patterns** (if `.py` in task files), **doc-updater** (after all tasks complete) |
| 4. Review | `/vibe:review` | Adversarial code review: runs code-reviewer, then pre-commit checklist | **python-reviewer** (if `.py` in diff), **security-reviewer** (always) |
| 5. Verify | `/vibe:verify` | Conversational UAT — walks through each DoD criterion with you, records pass/fail | — |
| 6. Ship | `/vibe:ship` | Commit and push | — |

**The pipeline is designed to be repeated.** When you run `/vibe:plan` again on a project that already has a `PLAN.md`, it asks whether you're starting a new phase or extending the existing plan. Choosing "New phase" archives `PLAN.md` and `TASKS.md` to `.plan/archive/` (versioned as `PLANv1.md`, `PLANv2.md`, etc.) before writing a fresh plan. Run the full cycle as many times as needed — once per feature, once per iteration, or whenever scope changes significantly.

**Autonomous variants of step 3:**
- `/vibe:work-loop` — loops until all tasks complete without manual re-invocation
- `/vibe:work-goal` — uses `/goal` as the outer loop:
  ```
  /goal Use vibe:work-goal to repeatedly execute vibe:work until every task in .plan/TASKS.md is done, the integration review passes, doc-updater has run, and every Definition of Done criterion in .plan/PLAN.md passes.
  ```
- `/vibe:work-ralph` — Ralph Wiggum stop-hook loop
- **review-fix-loop workflow** — `.claude/workflows/review-fix-loop.js` runs review → taskify → work → review until `CLEAN`, `NEEDS_USER_INPUT`, or `BLOCKED`. Invoke it via the Workflow tool (e.g. ask Claude to run the `review-fix-loop` workflow). Stops before ambiguous technical decisions; artifacts are written to `.plan/review-fix-loop-output/`.

---

### Automatic behaviors

These fire as part of the workflow above. **No commands to remember — they are wired in.**

| Behavior | Fires when | What it does |
|----------|------------|--------------|
| **python-patterns** | `/vibe:work` with `.py` files in task | Injects Python idioms, type hint conventions, and project standards into the implementer subagent before it writes code. Update `python-patterns/SKILL.md` to encode your codebase's standards. |
| **python-testing** | `/vibe:tdd` or `/vibe:add-tests` on a Python project | Injects pytest fixture conventions, marker setup, coverage config, and codebase testing patterns into the test-writing phase. |
| **python-reviewer** | `/vibe:review` with any `.py` file in the diff | Runs `ruff`, `mypy`, `black --check`, `bandit` automatically. Outputs CRITICAL/HIGH/MEDIUM findings. Blocks on CRITICAL or HIGH. |
| **security-reviewer** | Every `/vibe:review` | OWASP Top 10 scan, secrets detection, injection/auth/XSS/deserialization analysis. Blocks on CRITICAL or HIGH. |
| **doc-updater** | `/vibe:work` after all tasks complete | Checks whether READMEs, docstrings, or docs need updating to match completed changes. Writes updates if needed. |
| **plugin self-update** | Prompt submit | `general-plugin` updates itself after bootstrap. |
| **request-recap** | Request end (Stop hook) | Asks the agent for a concise recap of its most recent response, including decisions, file-by-file technical changes, and verification status. |
| **tdd-reminder** | Write to a new `.py` file (PostToolUse hook) | Outputs a one-line reminder to write the test first (RED phase) when a new non-test Python module is created. |

---

### Utility skills (user invoked)

These are invoked directly by the user when needed, **outside the primary pipeline**.

| Command | When to use |
|---------|-------------|
| `/vibe:debug` | Bug found — investigates cause using the scientific method, proposes a targeted fix |
| `/vibe:add-tests` | Retrofit tests onto work done outside the pipeline (manual edits, legacy code, external contributor) |
| `/test-driven-development` | Standalone TDD guidance when not running the full pipeline |
| `/context-optimization` | Long sessions — KV-cache, observation masking, compaction, partitioning techniques |
| `/filesystem-context` | Inject relevant filesystem context into the session |
| `/doc-coauthoring` | Collaborative documentation writing |
| `/frontend-design` | UI and component design guidance |
| `/python-patterns` | Consult Python project standards directly **(also auto-used by vibe:work)** |
| `/python-testing` | Consult Python testing conventions directly **(also auto-used by vibe:tdd and add-tests)** |

---

### Agents

Agents are spawned as subagents by skills (automatic) or invoked directly using `subagent_type: <name>` in a prompt. Claude Code uses `~/.claude/agents/*.md`.

| Agent | Spawned automatically by | Invoke directly when |
|-------|--------------------------|----------------------|
| `code-reviewer` | `/vibe:review` (always) | You want a standalone adversarial code review |
| `python-reviewer` | `/vibe:review` when `.py` in diff | You want Python-only static analysis outside a review pass |
| `security-reviewer` | `/vibe:review` (always) | You want a focused security scan outside a review pass |
| `doc-updater` | `/vibe:work` after all tasks complete | After ad-hoc code changes outside the pipeline that may affect docs |
| `build-error-resolver` | Manual only | Build or type-check fails; you want minimal-diff fixes with no architectural edits |
| `debugger` | `/vibe:debug` | Bug investigation via scientific method |
| `researcher` | `/vibe:plan` (research phase) | Deep technical research before planning a complex feature |

---

### Living Python specs

Two skill files are designed to be **updated over time** as you learn your codebases:

| File | What to put in it |
|------|------------------|
| `general-plugin/skills/python-patterns/SKILL.md` | Project-specific Python idioms, architectural conventions, type hint patterns, error handling standards. python-reviewer uses this as its enforcement source of truth. |
| `general-plugin/skills/python-testing/SKILL.md` | Codebase-specific pytest conventions: which fixtures are shared, how to set up the DB in tests, naming patterns, coverage targets, which markers are in use. |

---

## Subdirectories

- [`claude/`](./claude/) — Claude Code setup details
- [`general-plugin/`](./general-plugin/) — Claude Code skill plugin
