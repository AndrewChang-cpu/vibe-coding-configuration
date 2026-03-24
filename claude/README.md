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

- `CLAUDE.md` — global agent instructions built around your project context
- `.vibe/project-context.md` — project-specific context (fill this in first)
- `.vibe/mcp-triggers.md` — when to use which MCP tools
- `.vibe/lessons.md` — self-correction log

Also registers the MCP servers above with the Claude CLI and installs the general-plugin.

## MCP API Keys

Set these in a `.env` file in your project root before running:
```
GITHUB_PERSONAL_ACCESS_TOKEN=your_token
CONTEXT7_API_KEY=your_key
TAVILY_API_KEY=your_key
```

## Example output

See `vibe-setup output/` for an example of what gets generated.
