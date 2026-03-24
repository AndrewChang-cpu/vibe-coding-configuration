# Codex Setup

## MCPs
Codex does not have native MCP CLI integration. MCP tool context is documented in `.vibe/mcp-triggers.md` and referenced in `AGENTS.md` so the agent knows when to use each tool if configured separately.

---

Sets up OpenAI Codex / Agents spec configuration in your project.

## What it generates

- `AGENTS.md` — agent instructions built around your project context
- `.codex/config.json` — Codex model and context configuration
- `.vibe/project-context.md` — project-specific context (fill this in first)
- `.vibe/mcp-triggers.md` — when to use which MCP tools
- `.vibe/lessons.md` — self-correction log

## Example output

See `vibe-setup output/` for an example of what gets generated.
