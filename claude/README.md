# Claude Code Setup

Sets up Claude Code configuration in your project.

## What it generates

- `CLAUDE.md` — global agent instructions built around your project context
- `AGENTS.md` — copy of CLAUDE.md for OpenAI Agents spec compatibility
- `.vibe/project-context.md` — project-specific context (fill this in first)
- `.vibe/mcp-triggers.md` — when to use which MCP tools
- `.vibe/lessons.md` — self-correction log
- `.vibe/todo.md` — task tracker

Also registers these MCP servers with the Claude CLI:
- postgres, github, sequential-thinking, puppeteer, context7, tavily

## MCP API Keys

Set these in a `.env` file in your project root before running:
```
GITHUB_PERSONAL_ACCESS_TOKEN=your_token
CONTEXT7_API_KEY=your_key
TAVILY_API_KEY=your_key
```

## Example output

See `vibe-setup output/` for an example of what gets generated.
