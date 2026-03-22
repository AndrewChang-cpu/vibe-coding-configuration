# Vibe Coding Configuration

Bootstraps a consistent AI agent environment in any project. Run once per project to generate config files for Claude Code, Cursor, GitHub Copilot, and the OpenAI Agents spec (`AGENTS.md`).

## What it does

- Creates `.vibe/project-context.md` — project-specific context (fill in before running the script)
- Creates `.vibe/mcp-triggers.md` — tells agents when to use which MCP tools
- Creates `.vibe/todo.md` and `.vibe/lessons.md` — task tracking and self-correction log
- Generates `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` — agent instruction files built around your project context
- Generates `.cursor/mcp.json` and `.cursor/rules/` — Cursor IDE config
- Registers MCP servers with the Claude CLI

Re-running the script is safe — `.vibe/project-context.md` is never overwritten. All other files are regenerated around it.

## Prerequisites

- Node.js (for `npx` MCP servers)
- Claude CLI installed and authenticated
- A `.env` file in the project root with:
  ```
  GITHUB_PERSONAL_ACCESS_TOKEN=your_token
  CONTEXT7_API_KEY=your_key
  TAVILY_API_KEY=your_key
  ```

## Usage

### New project

1. Run the setup script to create the folder structure and placeholder files:

   **Linux / macOS**
   ```bash
   bash vibe-setup.sh
   ```

   **Windows** (PowerShell, run from the project root)
   ```powershell
   .\vibe-setup-windows.ps1
   ```

   > If PowerShell blocks execution, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

2. Paste the **New Project** prompt below into your AI agent as your first message. It will fill in `.vibe/project-context.md`.

3. Re-run the setup script to regenerate all agent config files with your project context baked in.

### Existing project

1. Paste the **Existing Project** prompt below into your AI agent as your first message. It will analyze the codebase and write `.vibe/project-context.md`.

2. Run the setup script. It reads `project-context.md` and generates all agent config files around it.

---

## Prompts

Copy the relevant prompt and paste it as your **first message** in the project.

### Existing Project

Use this when running the bootstrapper on a codebase that already exists.

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

Use this when setting up a project that doesn't exist yet or is just getting started.

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
