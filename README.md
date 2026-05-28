# vibe-setup

Bootstrap a consistent AI agent environment in any project. Run once to generate config files for Claude Code, Cursor, and Codex built around your project context. NOTE: I pivoted this to focus primarily on Claude Code setup, so Cursor and Codex support is more basic.

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
| Claude | `~/.claude/CLAUDE.md` (global), `.vibe/lessons.md` |
| Cursor | `.cursor/mcp.json`, `.cursor/rules/`, `.vibe/` |
| Codex | `AGENTS.md`, `.codex/config.json`, `.vibe/` |

Re-running is safe — you'll be prompted before `~/.claude/CLAUDE.md` is overwritten. Use `--yes` to skip.

## Workflow

### First-time setup (once per machine)
```bash
npx vibe-setup --claude
```
- Writes `~/.claude/CLAUDE.md` with personal behavioral instructions
- Configures MCP servers and installs the skill plugin
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

## Skills Reference

### `/vibe:plan` → `/vibe:tasks` → `/vibe:work` — Primary workflow (TDD)

This is the main development pipeline. `/vibe:plan` produces `.plan/PLAN.md`, `/vibe:tasks` decomposes it into `.plan/TASKS.md`, and `/vibe:work` executes each task with a built-in TDD mandate (RED → GREEN for every task). All test generation happens inline during execution.

### `/vibe:add-tests` — Retrofit tests (separate from the TDD pipeline)

**`/vibe:add-tests` is NOT a substitute for the plan → tasks → work workflow.**

Use it when:
- Work was done outside the vibe pipeline (manual edits, external contributor, legacy code)
- You need E2E browser tests written after a feature is already working
- TDD was explicitly skipped and you want to add coverage after the fact

It will classify changed files, ask for your approval, then generate and run tests. If tests reveal bugs in existing code, it flags them — it does not fix them.

For new features, use `/vibe:work` which handles TDD inline.

## Subdirectories

- [`claude/`](./claude/) — Claude Code setup details
- [`cursor/`](./cursor/) — Cursor setup details
- [`codex/`](./codex/) — Codex setup details
- [`general-plugin/`](./general-plugin/) — Claude Code skill plugin
