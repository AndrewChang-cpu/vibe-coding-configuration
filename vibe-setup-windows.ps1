# Vibe Coding Environment Bootstrapper (Windows)

# ==============================================================================
# 0. OS CHECK
# ==============================================================================
if (-not ($IsWindows -or $env:OS -eq "Windows_NT")) {
    Write-Host "[ERROR] This script is for Windows only. Use vibe-setup.sh on Linux/macOS."
    exit 1
}

Write-Host "[INFO] Initializing AI Agent Environment in $($PWD.Path)..."

# ==============================================================================
# 1. UNIVERSAL BASE
# ==============================================================================
Write-Host "[INFO] Configuring Universal Base directories..."

# Source .env
if (Test-Path ".env") {
    Get-Content ".env" | Where-Object { $_ -match '^\s*[^#]' } | ForEach-Object {
        $k, $v = $_ -split '=', 2
        Set-Item -Path "env:\$($k.Trim())" -Value $v.Trim()
    }
}

New-Item -ItemType Directory -Force -Path ".vibe/skills" | Out-Null

if (-not (Test-Path ".vibe/rules.md")) {
@'
# Project Context
- Name: [TODO: Project name]
- Stack: [TODO: Languages, frameworks, and key libraries]
- Architecture: [TODO: High-level structure and any notable patterns or constraints]
'@ | Out-File -FilePath ".vibe/rules.md" -Encoding utf8
Write-Host "[CREATED] .vibe/rules.md"
}

if (-not (Test-Path ".vibe/mcp-triggers.md")) {
@'
# MCP Tool Triggers
- Database/SQL: Use postgres MCP to inspect live schema.
- GitHub/VC: Use github MCP to read issues and draft PRs.
- UI/Browser: Use puppeteer MCP to inspect localhost rendering.
- API/Docs: Use context7 MCP for framework documentation; use fetch MCP for arbitrary URLs.
- Planning: Use sequential-thinking MCP before writing code.
'@ | Out-File -FilePath ".vibe/mcp-triggers.md" -Encoding utf8
Write-Host "[CREATED] .vibe/mcp-triggers.md"
}

# ------------------------------------------------------------------------------
# 1b. TASK TRACKING & LESSONS
# ------------------------------------------------------------------------------
Write-Host "[INFO] Initializing task tracking..."

if (-not (Test-Path ".vibe/lessons.md")) {
@'
# Lessons Learned

Review this file at the start of every session. Update it after ANY correction from the user.
Write rules for yourself that prevent the same mistake. Ruthlessly iterate until mistake rate drops.

## Format

**Pattern**: [what happened]
**Rule**: [what to do / not do going forward]
**Why**: [root cause or user reasoning]

---

## Active Lessons

<!-- Add new lessons above this line. Remove lessons that have been internalized into config files. -->
'@ | Out-File -FilePath ".vibe/lessons.md" -Encoding utf8
Write-Host "[CREATED] .vibe/lessons.md"
}

if (-not (Test-Path ".vibe/todo.md")) {
@'
# Task Tracker

## Current Tasks

<!-- Plan first: write checkable items here before starting implementation. -->
<!-- Mark items complete as you go. Add a review section when done. -->

## Completed

<!-- Move completed task blocks here for reference. -->
'@ | Out-File -FilePath ".vibe/todo.md" -Encoding utf8
Write-Host "[CREATED] .vibe/todo.md"
}

$RULES_CONTENT = Get-Content -Raw -Path ".vibe/rules.md"
$MCP_CONTENT = Get-Content -Raw -Path ".vibe/mcp-triggers.md"

# Shared operational rules block used across all agent configs
$OPS_RULES = @'
# Operational Rules

## 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, STOP and re-plan immediately — don't keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

## 3. Self-Improvement Loop
- After ANY correction from the user: update `.vibe/lessons.md` with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.
- Review `.vibe/lessons.md` at session start for relevant patterns.

## 4. Verification Before Done
- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness.

## 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes — don't over-engineer.
- Challenge your own work before presenting it.

## 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.
- Zero context switching required from the user.
- Go fix failing CI tests without being told how.

## 7. Task Management
1. **Plan First**: Write plan to `.vibe/todo.md` with checkable items.
2. **Verify Plan**: Check in before starting implementation.
3. **Track Progress**: Mark items complete as you go.
4. **Explain Changes**: High-level summary at each step.
5. **Document Results**: Add review section to `.vibe/todo.md`.
6. **Capture Lessons**: Update `.vibe/lessons.md` after corrections.

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
'@

# ==============================================================================
# 2. CURSOR CONFIGURATION
# ==============================================================================
Write-Host "[INFO] Configuring Cursor..."

New-Item -ItemType Directory -Force -Path ".cursor/rules" | Out-Null

if (-not (Test-Path ".cursor/mcp.json")) {
@'
{
  "mcpServers": {
    "postgres": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/postgres"]
    },
    "github": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"]
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "puppeteer": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "fetch": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-fetch"]
    },
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp"]
    }
  }
}
'@ | Out-File -FilePath ".cursor/mcp.json" -Encoding utf8
Write-Host "[CREATED] .cursor/mcp.json"
}

Copy-Item -Path ".vibe/rules.md" -Destination ".cursor/rules/000-main-rules.mdc" -Force
Copy-Item -Path ".vibe/mcp-triggers.md" -Destination ".cursor/rules/001-mcp-triggers.mdc" -Force

@"
$OPS_RULES

---

## Lessons & Self-Correction
Read ``.vibe/lessons.md`` at the start of each session. After ANY user correction, immediately add the pattern to ``.vibe/lessons.md``.
"@ | Out-File -FilePath ".cursor/rules/002-operational.mdc" -Encoding utf8

# ==============================================================================
# 3. CLAUDE CODE CONFIGURATION
# ==============================================================================
Write-Host "[INFO] Configuring Claude Code..."

claude mcp remove postgres 2>$null
claude mcp remove github 2>$null
claude mcp remove sequential-thinking 2>$null
claude mcp remove puppeteer 2>$null
claude mcp remove fetch 2>$null
claude mcp remove context7 2>$null

claude mcp add --transport stdio postgres -- npx.cmd -y @modelcontextprotocol/server-postgres postgresql://localhost:5432/postgres
claude mcp add --transport stdio github -- npx.cmd -y @modelcontextprotocol/server-github
claude mcp add --transport stdio sequential-thinking -- npx.cmd -y @modelcontextprotocol/server-sequential-thinking
claude mcp add --transport stdio puppeteer -- npx.cmd -y @modelcontextprotocol/server-puppeteer
claude mcp add --transport stdio fetch -- npx.cmd -y @modelcontextprotocol/server-fetch
claude mcp add --scope user --transport stdio context7 -- npx.cmd -y @upstash/context7-mcp --api-key $env:CONTEXT7_API_KEY
# Note: Ensure GITHUB_PERSONAL_ACCESS_TOKEN and CONTEXT7_API_KEY are set in your .env

@"
# Global Agent Instructions
You are an expert software architect. Write clean, secure, and optimized code while strictly adhering to the project context and constraints.

## Primary Directives
1. **Plan Before Coding**: For any task touching >2 files, output an architectural plan first.
2. **Minimal Diff**: Only modify files explicitly required.
3. **Run Checks**: Always run linting and testing commands after making logic changes.
4. **Follow Conventions**: Match the existing code style. Prefer clarity over cleverness.

---

$RULES_CONTENT
## Extended Capabilities
ALWAYS read ``.vibe/mcp-triggers.md`` before executing complex tasks or using external tools.

---

$OPS_RULES
---

## Project Architecture & Directory Map
[TODO: Define the explicit folder structure.]

## Anti-Patterns & "Never Do This"
[TODO: List specific practices the agent must strictly avoid.]

## Git & Workflow Standards
[TODO: Define commit message format and PR rules.]

## Definition of Done (DoD)
[TODO: Define the checklist the agent must complete before finishing a task.]

---

$MCP_CONTENT
---

## Lessons & Self-Correction
Read ``.vibe/lessons.md`` at the start of each session. After ANY user correction, immediately add the pattern to ``.vibe/lessons.md``.

## Useful Project Commands
- Run Development Server: npm run dev
- Build for Production: npm run build
- Run Test Suite: npm run test
"@ | Out-File -FilePath "CLAUDE.md" -Encoding utf8

# ==============================================================================
# 4. GITHUB COPILOT CLI & GENERIC STANDARDS
# ==============================================================================
Write-Host "[INFO] Configuring GitHub Copilot & Generic Standards..."

New-Item -ItemType Directory -Force -Path ".github" | Out-Null

@"
$RULES_CONTENT
## Extended Capabilities
ALWAYS read ``.vibe/mcp-triggers.md`` before executing complex tasks or using external tools.

---

$OPS_RULES
---

$MCP_CONTENT
---

## Lessons & Self-Correction
Read ``.vibe/lessons.md`` at the start of each session. After ANY user correction, immediately add the pattern to ``.vibe/lessons.md``.
"@ | Out-File -FilePath ".github/copilot-instructions.md" -Encoding utf8

Copy-Item -Path "CLAUDE.md" -Destination "AGENTS.md" -Force

Write-Host "[SUCCESS] Bootstrapping complete. Core files generated and synchronized."
