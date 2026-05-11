# Claude Code Setup

## MCPs
- **postgres** — inspect live database schema
- **github** — read issues, draft PRs
- **sequential-thinking** — structured planning before coding
- **puppeteer** — browser automation and localhost rendering
- **context7** — framework and library documentation lookup
- **tavily** — web search and real-time information

## Plugin
- **general-plugin** (from this repo) — installs skills: `context-optimization`, `doc-coauthoring`, `test-driven-development`, `systematic-debugging`, `subagent-driven-development`, `filesystem-context`, `executing-plans`, `frontend-design`

---

Sets up Claude Code configuration in your project.

## What it generates

- `~/.claude/CLAUDE.md` — global behavioral instructions (written once, never overwritten on re-runs)
- `.vibe/lessons.md` — self-correction log (project-specific)

Also registers the MCP servers above with the Claude CLI and installs the general-plugin.

Run `/init` in each project after setup to generate the project-specific `CLAUDE.md`.

## MCP API Keys

Set these in a `.env` file in your project root before running:
```
GITHUB_PERSONAL_ACCESS_TOKEN=your_token
CONTEXT7_API_KEY=your_key
TAVILY_API_KEY=your_key
```

## Example output

See `vibe-setup output/` for an example of what gets generated.
