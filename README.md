# vibe-setup

Bootstrap a consistent AI agent environment in any project. Run once to generate config files for Claude Code, Cursor, and Codex built around your project context.

## Usage

```bash
npx vibe-setup
```

Prompts you to select which tools to configure. Or use flags:

```bash
npx vibe-setup --all              # set up everything
npx vibe-setup --claude           # Claude Code only
npx vibe-setup --cursor           # Cursor only
npx vibe-setup --codex            # Codex only
npx vibe-setup --claude --cursor  # mix and match
npx vibe-setup --claude --yes     # skip confirmation prompts
npx vibe-setup --claude --reconfigure  # re-prompt for API keys and Obsidian vault path
```

Always pull the latest version:

```bash
npx vibe-setup@latest --claude
```

## Prerequisites

- Node.js 18+
- Claude CLI (for `--claude` setup)
- QMD CLI available on PATH (for the Obsidian RAG MCP)
- API keys set as environment variables (see below)

## API Keys

`vibe-setup` will prompt for any missing keys during setup and offer to save them to `~/.vibe-setup` for future runs.

| Variable | Where to get it |
|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) |
| `CONTEXT7_API_KEY` | [context7.com](https://context7.com) |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) |

Keys are resolved in this order: environment variable → `~/.vibe-setup` → interactive prompt.

## What gets generated

| Tool | Files |
|------|-------|
| Claude | `~/.claude/CLAUDE.md` (global), `~/.claude/agents/` (global) |
| Cursor | `.cursor/mcp.json`, `.cursor/rules/`, `.vibe/` |
| Codex | `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, `.agents/plugins/marketplace.json`, `.vibe/` |

Re-running is safe — you'll be prompted before `~/.claude/CLAUDE.md` is overwritten. Use `--yes` to skip.

## Workflow

### First-time setup (once per machine)
```bash
npx vibe-setup --claude
```
- Writes `~/.claude/CLAUDE.md` with behavioral and security instructions
- Configures MCP servers and installs the skill plugin
- Deploys agents to `~/.claude/agents/`
- Registers the QMD MCP server; QMD reads its collections from your user-global `~/.config/qmd/index.yml`

### Per project
```bash
npx vibe-setup@latest --claude --yes  # update global config + project .vibe/
```
Then run `/init` in Claude Code to generate the project-specific `CLAUDE.md`.

## Claude Code Plugin

Install the skill library directly in any project via Claude Code:

```
/plugin marketplace add AndrewChang-cpu/vibe-coding-configuration
/plugin install general-plugin@vibe-coding
```

## Codex Plugin

Install the skill library directly in Codex:

```
codex plugin marketplace add AndrewChang-cpu/vibe-coding-configuration
codex plugin marketplace upgrade vibe-coding
codex plugin add general-plugin@vibe-coding
codex plugin add obsidian-plugin@vibe-coding
```

The Codex plugin manifests live alongside the Claude Code manifests:

- `general-plugin/.codex-plugin/plugin.json`
- `obsidian-plugin/.codex-plugin/plugin.json`

Claude Code configuration remains intact.

After the initial install, each plugin owns its own prompt-submit update hook:

- `general-plugin` updates `general-plugin`
- `obsidian-plugin` updates `obsidian-plugin`

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
- `/vibe:work-goal` — uses `/goal` as the outer loop in Claude Code or Codex:
  ```
  /goal Use vibe:work-goal to repeatedly execute vibe:work until every task in .plan/TASKS.md is done, the integration review passes, doc-updater has run, and every Definition of Done criterion in .plan/PLAN.md passes.
  ```
- `/vibe:work-ralph` — Claude Code-only Ralph Wiggum stop-hook loop

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
| **plugin self-update** | Prompt submit | Each installed plugin updates itself after bootstrap: `general-plugin` updates `general-plugin`, and `obsidian-plugin` updates `obsidian-plugin`. |
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

**Obsidian integration** (obsidian-plugin, install separately):

| Command | When to use |
|---------|-------------|
| `/vibe:ingest` | Import and index content from your Obsidian vault |
| `/vibe:learn` | Surface relevant notes from your Obsidian vault for the current task |

---

### Agents

Agents are spawned as subagents by skills (automatic) or invoked directly using `subagent_type: <name>` in a prompt. Claude Code uses `general-plugin/agents/*.md`; Codex uses generated `.codex/agents/*.toml` files and plugin-bundled `general-plugin/codex-agents/*.toml`.

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
- [`cursor/`](./cursor/) — Cursor setup details
- [`codex/`](./codex/) — Codex setup details
- [`general-plugin/`](./general-plugin/) — Claude Code and Codex skill plugin
