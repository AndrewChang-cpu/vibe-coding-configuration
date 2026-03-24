# vibe-setup

Bootstrap a consistent AI agent environment in any project. Run once to generate config files for Claude Code, Cursor, and Codex — built around your project context.

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
```

## Prerequisites

- Node.js 18+
- Claude CLI (for `--claude` setup)
- A `.env` file in your project root with API keys (see below)

## API Keys

Create a `.env` file in your project root:

```
GITHUB_PERSONAL_ACCESS_TOKEN=your_token
CONTEXT7_API_KEY=your_key
TAVILY_API_KEY=your_key
```

## What gets generated

| Tool | Files |
|------|-------|
| Claude | `CLAUDE.md`, `.vibe/` |
| Cursor | `.cursor/mcp.json`, `.cursor/rules/`, `.vibe/` |
| Codex | `AGENTS.md`, `.codex/config.json`, `.vibe/` |

Re-running is safe — `.vibe/project-context.md` is never overwritten. All other files are regenerated.

## Workflow

### New project
1. Run `npx vibe-setup`
2. Paste the **New Project** prompt (below) into your AI agent — it will fill in `.vibe/project-context.md`
3. Re-run `npx vibe-setup` to regenerate all config files with your project context baked in

### Existing project
1. Paste the **Existing Project** prompt (below) into your AI agent — it will analyze the codebase and write `.vibe/project-context.md`
2. Run `npx vibe-setup`

## Prompts

### Existing Project

```
I need you to analyze this codebase and populate `.vibe/project-context.md`.
This file drives all AI agent config — be specific and accurate, as it will be
read on every future session.

Work through the following steps in order:

1. **Explore the codebase**
   - Read the directory structure (top-level and key subdirectories)
   - Read package.json, any lockfiles, config files (tsconfig, eslint, etc.)
   - Identify the stack: languages, frameworks, major libraries
   - Understand the architecture: how is the code organized? What are the main layers/modules?
   - Identify any existing conventions: naming patterns, file structure, import style

2. **Write `.vibe/project-context.md`** with the following sections:

   **Project Context**
   - Name: the project name
   - Stack: the actual languages, frameworks, and key libraries in use
   - Architecture: a concise description of the structure — what the major parts are and how they relate

   **Project Architecture & Directory Map**
   List the real folder structure with a one-line description of each key directory's purpose.

   **Anti-Patterns & "Never Do This"**
   Identify 3–7 patterns that would be easy to introduce but would break conventions, cause bugs,
   or violate the architecture (e.g., bypassing an abstraction layer, mixing concerns, hardcoding values).

   **Git & Workflow Standards**
   Check for a CONTRIBUTING.md, existing commit history, or branch naming patterns. Document what
   you find. If nothing exists, propose a sensible default.

   **Definition of Done**
   A checklist an agent must complete before marking any task done — make it specific to this project
   (e.g., "passes existing test suite", "no new TypeScript errors", "changelog updated if applicable").

   **Useful Project Commands**
   The actual commands to run the dev server, build, and test suite.

Start with step 1 before writing anything. Show me the proposed content before writing to disk
so I can approve or adjust.
```

### New Project

```
I need you to help me define a new project and write `.vibe/project-context.md`.
This file drives all AI agent config — it will be read on every future session.

Here's what I want to build:
[DESCRIBE YOUR PROJECT HERE — what it does, who it's for, any tech preferences or constraints]

Work through the following steps in order:

1. **Clarify and confirm the spec**
   Based on my description, state back:
   - What the project does in one sentence
   - The proposed stack (languages, frameworks, key libraries) with a brief reason for each choice
   - The proposed architecture (how the code will be structured at a high level)
   If anything is ambiguous or you'd recommend a different approach, say so before we write any files.

2. **Write `.vibe/project-context.md`** with the following sections:

   **Project Context**
   - Name: the project name
   - Stack: the agreed stack
   - Architecture: the agreed architectural approach

   **Project Architecture & Directory Map**
   Define the folder structure we will use, with a one-line description of each directory's purpose.

   **Anti-Patterns & "Never Do This"**
   Based on the stack and architecture, list 3–7 patterns to avoid — things that commonly go wrong
   in this type of project or would violate our intended structure.

   **Git & Workflow Standards**
   Define commit message format, branch naming, and PR rules we will follow.

   **Definition of Done**
   A checklist an agent must complete before marking any task done — specific to this project's tech
   (e.g., "TypeScript compiles with no errors", "unit tests pass", "API contract unchanged unless explicitly updated").

   **Useful Project Commands**
   The commands to run the dev server, build, and test suite (use placeholders if not decided yet).

Show me the proposed content before writing to disk so I can approve or adjust.
```

## Claude Code Plugin

Install the skill library directly in any project via Claude Code:

```
/plugin marketplace add AndrewChang-cpu/vibe-coding-configuration
/plugin install general-plugin@vibe-coding
```

## Subdirectories

- [`claude/`](./claude/) — Claude Code setup details
- [`cursor/`](./cursor/) — Cursor setup details
- [`codex/`](./codex/) — Codex setup details
- [`general-plugin/`](./general-plugin/) — Claude Code skill plugin
