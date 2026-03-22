# Vibe Coding Configuration

Bootstraps a consistent AI agent environment in any project. Run once per project to generate config files for Claude Code, Cursor, GitHub Copilot, and the OpenAI Agents spec (`AGENTS.md`).

## What it does

- Creates `.vibe/rules.md` — project context (fill in after setup)
- Creates `.vibe/mcp-triggers.md` — tells agents when to use which MCP tools
- Creates `.vibe/todo.md` and `.vibe/lessons.md` — task tracking and self-correction log
- Generates `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` — agent instruction files
- Generates `.cursor/mcp.json` and `.cursor/rules/` — Cursor IDE config
- Registers MCP servers with the Claude CLI

## Prerequisites

- Node.js (for `npx` MCP servers)
- Claude CLI installed and authenticated
- A `.env` file in the project root with:
  ```
  GITHUB_PERSONAL_ACCESS_TOKEN=your_token
  CONTEXT7_API_KEY=your_key
  ```

## Usage

**Linux / macOS**
```bash
bash vibe-setup.sh
```

**Windows** (PowerShell, run from the project root)
```powershell
.\vibe-setup-windows.ps1
```

> If PowerShell blocks execution, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

## After setup

The generated files contain TODO placeholders. Use one of the prompts below to fill them in.
Copy the relevant prompt and paste it into your AI agent as your **first message** in the project.

### Existing Project

Use this when running the bootstrapper on a codebase that already exists.

```
I've just run the vibe-setup script in this project. Several config files were generated with
TODO placeholders that need to be filled in based on the actual codebase. Your job is to analyze
the project and populate them. Do not guess — read the actual files.

Work through the following steps in order:

1. **Explore the codebase**
   - Read the directory structure (top-level and key subdirectories)
   - Read package.json, any lockfiles, config files (tsconfig, eslint, etc.)
   - Identify the stack: languages, frameworks, major libraries
   - Understand the architecture: how is the code organized? What are the main layers/modules?
   - Identify any existing conventions: naming patterns, file structure, import style

2. **Populate `.vibe/rules.md`**
   Fill in the Project Context section with:
   - Name: the project name
   - Stack: the actual languages, frameworks, and key libraries in use
   - Architecture: a concise description of the structure — what the major parts are and how they relate

3. **Populate `CLAUDE.md` (and sync to `AGENTS.md`)**
   Fill in each TODO section with specific, accurate content:
   - **Project Architecture & Directory Map**: list the real folder structure with a one-line description of each key directory's purpose
   - **Anti-Patterns & "Never Do This"**: identify 3–7 patterns that would be easy to introduce but would break conventions, cause bugs, or violate the architecture (e.g., bypassing an abstraction layer, mixing concerns, hardcoding values)
   - **Git & Workflow Standards**: check for a CONTRIBUTING.md, existing commit history, or branch naming patterns; document what you find; if nothing exists, propose a sensible default
   - **Definition of Done**: write a checklist an agent must complete before marking any task done — make it specific to this project (e.g., "passes existing test suite", "no new TypeScript errors", "changelog updated if applicable")

4. **Populate `.vibe/todo.md`**
   Based on your exploration, write a "Current State" section that captures:
   - What is working / stable
   - Any obvious technical debt or rough edges you noticed
   - Suggested first tasks if you were starting work today

5. **Update `.vibe/lessons.md`**
   Add any architectural gotchas or non-obvious constraints you discovered — things an agent starting fresh in this repo should know to avoid mistakes.

6. **Sync changes**
   Copy the final CLAUDE.md content to AGENTS.md so they stay in sync.

Start with step 1 before writing anything. Be specific and accurate — these files will be read by AI agents on every future session.
```

### New Project

Use this when setting up a project that doesn't exist yet or is just getting started.

```
I've just run the vibe-setup script to bootstrap a new project. The config files have been
generated with TODO placeholders. I need you to help me define the project and fill them in
before we write any code.

Here's what I want to build:
[DESCRIBE YOUR PROJECT HERE — what it does, who it's for, any tech preferences or constraints]

Work through the following steps in order:

1. **Clarify and confirm the spec**
   Based on my description, state back:
   - What the project does in one sentence
   - The proposed stack (languages, frameworks, key libraries) with a brief reason for each choice
   - The proposed architecture (how the code will be structured at a high level)
   If anything is ambiguous or you'd recommend a different approach, say so now before we write any files.

2. **Populate `.vibe/rules.md`**
   Fill in the Project Context section with:
   - Name: the project name
   - Stack: the agreed stack
   - Architecture: the agreed architectural approach

3. **Populate `CLAUDE.md` (and sync to `AGENTS.md`)**
   Fill in each TODO section with forward-looking, specific content:
   - **Project Architecture & Directory Map**: define the folder structure we will use, with a one-line description of each directory's purpose
   - **Anti-Patterns & "Never Do This"**: based on the stack and architecture, list 3–7 patterns to avoid — things that commonly go wrong in this type of project or would violate our intended structure
   - **Git & Workflow Standards**: define commit message format, branch naming, and PR rules we will follow
   - **Definition of Done**: write a checklist an agent must complete before marking any task done — make it specific to this project's tech (e.g., "TypeScript compiles with no errors", "unit tests pass", "API contract unchanged unless explicitly updated")

4. **Populate `.vibe/todo.md`**
   Write the initial task plan to get the project off the ground:
   - A setup checklist (scaffolding, dependencies, CI, etc.)
   - The first 2–3 feature milestones broken into checkable tasks

5. **Populate `.vibe/lessons.md`**
   Seed it with known gotchas for this stack — common mistakes or non-obvious constraints an agent should know from day one.

6. **Sync changes**
   Copy the final CLAUDE.md content to AGENTS.md so they stay in sync.

Work through each step and show me the proposed content before writing to disk, so I can approve or adjust.
```
