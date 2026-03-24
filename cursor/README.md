# Cursor Setup

## MCPs
- **postgres** — inspect live database schema
- **github** — read issues, draft PRs
- **sequential-thinking** — structured planning before coding
- **puppeteer** — browser automation and localhost rendering
- **context7** — framework and library documentation lookup
- **tavily** — web search and real-time information

---

Sets up Cursor IDE configuration in your project.

## What it generates

- `.cursor/mcp.json` — MCP server definitions for Cursor
- `.cursor/rules/000-main-rules.mdc` — project context rules
- `.cursor/rules/001-mcp-triggers.mdc` — MCP trigger rules
- `.cursor/rules/002-operational.mdc` — operational rules
- `.vibe/project-context.md` — project-specific context (fill this in first)
- `.vibe/mcp-triggers.md` — when to use which MCP tools
- `.vibe/lessons.md` — self-correction log

## Example output

See `vibe-setup output/` for an example of what gets generated.
