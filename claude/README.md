# Claude Code Setup

## Plugin
- **general-plugin** (from this repo) — installs skills: `context-optimization`, `doc-coauthoring`, `test-driven-development`, `systematic-debugging`, `subagent-driven-development`, `filesystem-context`, `executing-plans`, `frontend-design`

---

Sets up Claude Code configuration in your project.

## What it generates

- `~/.claude/CLAUDE.md` — global behavioral instructions (prompts before overwriting on re-runs)
- `~/.claude/agents/` — agent definitions
- `~/.claude/workflows/` — workflow scripts

It also offers to add a `claude` shell alias that launches Claude Code with `--plugin-dir` pointing at `general-plugin`.

The general-plugin itself (skills, agents, hooks) is installed separately as a Claude Code plugin.

After bootstrap, plugin updates are handled by a plugin-bundled hook:

- `general-plugin/hooks/hooks.json` updates `general-plugin`

Run `/init` in each project after setup to generate the project-specific `CLAUDE.md`.
