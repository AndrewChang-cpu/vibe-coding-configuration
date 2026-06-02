# Codex Setup

Sets up OpenAI Codex configuration for a project while preserving the existing Claude Code setup.

## What It Generates

- `AGENTS.md` — behavioral instructions shared with the project.
- `.codex/config.toml` — MCP servers plus Codex subagent concurrency settings.
- `.codex/agents/*.toml` — Codex custom subagents generated from `general-plugin/agents/*.md`.
- `.agents/plugins/marketplace.json` — repo-local Codex marketplace metadata when this repo's plugin folders are present.

## Codex Plugins

The repo now includes Codex plugin manifests alongside the Claude plugin manifests:

- `general-plugin/.codex-plugin/plugin.json`
- `obsidian-plugin/.codex-plugin/plugin.json`

The Claude manifests remain unchanged.

Install/update flow:

```bash
codex plugin marketplace add AndrewChang-cpu/vibe-coding-configuration
codex plugin marketplace upgrade vibe-coding
codex plugin add general-plugin@vibe-coding
codex plugin add obsidian-plugin@vibe-coding
```

After bootstrap, plugin update hooks are owned per plugin:

- `general-plugin/codex-hooks/hooks.json` updates `general-plugin`.
- `obsidian-plugin/codex-hooks/hooks.json` updates `obsidian-plugin`.

## Subagents

Codex agents are generated as TOML files from the Claude Code agent markdown files. The generated agents keep the same names:

- `build-error-resolver`
- `code-reviewer`
- `debugger`
- `doc-updater`
- `python-reviewer`
- `researcher`
- `security-reviewer`

The generated config includes:

```toml
[agents]
max_threads = 6
max_depth = 1
```

## MCP Servers

Codex config includes:

- `github`
- `postgres`
- `puppeteer`
- `sequential-thinking`
- `context7`
- `tavily`
- `qmd`

API keys are resolved from environment variables, `~/.vibe-setup`, or prompts:

- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `CONTEXT7_API_KEY`
- `TAVILY_API_KEY`

## Autonomous Work

Use `vibe:work-goal` with `/goal` as the outer loop:

```text
/goal Use vibe:work-goal to repeatedly execute vibe:work until every task in .plan/TASKS.md is done, the integration review passes, doc-updater has run, and every Definition of Done criterion in .plan/PLAN.md passes. If blocked, report the exact blocked task, missing dependency, and failed command. Do not change scope outside the plan.
```

`vibe:work-ralph` remains Claude Code-only for the Ralph Wiggum stop-hook loop.

## Known Differences

- Claude statusline support remains Claude-only.
- `vibe:work-loop` is not ported as a Codex scheduler; use `/goal` for long-running continuation.
- Codex plugin hooks are provided through `general-plugin/codex-hooks/hooks.json`.

## Example Output

See `vibe-setup output/` for generated examples.
