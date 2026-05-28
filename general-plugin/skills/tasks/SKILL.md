---
name: vibe:tasks
description: Decomposes .plan/ documents into a file-level task breakdown with dependency tags and an ASCII WBS graph. Run after /vibe:plan.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<role>
This skill has exactly one job: read the plan and write TASKS.md. That is the complete scope.

Your output is a file. Not code. Not implementation. Not a first step toward execution.

After writing TASKS.md, you are done. Do not write any source files. Do not edit any existing code. Do not run any implementation commands. Do not offer to begin, suggest starting, or describe what the next step would look like. A separate skill handles execution — it is not your concern.
</role>

<input_validation>
Before doing anything else, check that `.plan/PLAN.md` exists:
```bash
test -f .plan/PLAN.md && echo "found" || echo "missing"
```
If missing: print `No PLAN.md found. Run /vibe:plan first.` and stop.
</input_validation>

<execution_flow>
## Stage 1 — READ
Read `.plan/PLAN.md` first. Check whether the plan was split into typed documents by looking for a `Documents:` line in the header or links to sibling files:
```bash
ls .plan/*.md 2>/dev/null
```
Read every `.md` file present in `.plan/` (PLAN.md, PRD.md, SYSTEM-DESIGN.md, UI-SPEC.md, etc.). Extract and hold in working memory:
- Project name
- Functional requirements (FR-xx list) — from PRD.md or PLAN.md
- Critical user journeys — from PRD.md or PLAN.md
- Non-functional requirements — from PRD.md or PLAN.md
- Tech stack and deployment target — from SYSTEM-DESIGN.md or PLAN.md
- Repository structure — from SYSTEM-DESIGN.md or PLAN.md
- Data model — from SYSTEM-DESIGN.md or PLAN.md
- API contracts — from SYSTEM-DESIGN.md or PLAN.md
- Auth/authorization requirements — from SYSTEM-DESIGN.md or PLAN.md
- UI states and component structure — from UI-SPEC.md or PLAN.md
- Brownfield context (patterns to preserve, files that must not change) — from SYSTEM-DESIGN.md or PLAN.md
- Definition of done (checkbox list) — always in PLAN.md
- Out of scope — always in PLAN.md
- Open questions — always in PLAN.md

## Stage 2 — PROBE (silent, no output)
Run before decomposing to understand the actual directory structure:
```bash
ls
find . -type f -maxdepth 3 ! -path './.git/*' ! -path './node_modules/*' 2>/dev/null
```
Use results to:
- Confirm or correct file paths inferred from the tech stack
- Detect existing conventions (e.g. `src/`, `app/`, `routers/`, `lib/`)
- Identify files that already exist vs. need to be created

## Stage 3 — IDENTIFY AMBIGUITIES
Scan the plan for implementation decisions that are genuinely unresolved AND would materially affect task structure. Apply the rules in `<ambiguity_rules>` to decide whether to ask, infer, or flag.

If there are questions to ask, use AskUserQuestion now — before decomposing. Do not ask mid-decomposition.

## Stage 4 — DECOMPOSE
Break the plan into file-level tasks. Every task must pass the subagent test: could a fresh Claude instance execute this task from the task block alone, without asking clarifying questions?

- Assign IDs: T-01, T-02, T-03, ... in rough execution order
- Assign `depends_on` to express which tasks must complete before this one starts
- Tasks with no unfulfilled dependencies are starting points and can run in parallel with each other

Cover every functional requirement from PLAN.md. Every definition-of-done criterion must map to at least one task's `Done when`.

## Stage 5 — GENERATE ASCII GRAPH
Render the dependency graph following the rules in `<graph_rules>`.

## Stage 6 — SELF-REVIEW (silent, no output)
Before writing anything, verify:
- [ ] Every task names specific files — no task says only "implement X"
- [ ] Every `Done when` is verifiable (command output, file existence, observable URL/behavior)
- [ ] No dependency cycles exist
- [ ] Every definition-of-done criterion from PLAN.md is covered by at least one `Done when`
- [ ] No tasks are unnecessarily serialized — if T-02 doesn't actually need T-01's output, they should be independent
- [ ] The ASCII graph matches the `depends_on` fields in the task blocks

If any check fails, fix the decomposition before proceeding.

## Stage 7 — WRITE
```bash
mkdir -p .plan
```
Write `.plan/TASKS.md` using the format in `<tasks_output_format>`.

Print: `Tasks written to .plan/TASKS.md — N tasks, X starting points.`

STOP. Your work is complete. Do not write any source files. Do not implement any task. Do not offer to begin execution or describe what implementation would look like. The session ends here.
</execution_flow>

<ambiguity_rules>
**Ask the user (via AskUserQuestion) if:**
- The plan mentions a capability but leaves the implementation approach open in a way that determines file structure — e.g. "auth" without specifying JWT vs sessions changes whether you create `lib/jwt.ts` or `lib/session.ts`
- Both conditions must be true: (1) it changes which files get created or how tasks are ordered, AND (2) it cannot be reasonably inferred from the plan + codebase probe

**Infer silently if:**
- Standard framework conventions apply (Next.js → `app/`, FastAPI → `routers/`, Rails → `app/models/`)
- The codebase probe reveals the existing pattern clearly
- The tech stack section of the plan makes it unambiguous

**Flag in `## Open Questions` and continue if:**
- It's a planning-level gap (missing requirement), not an implementation decision — e.g. "PLAN.md doesn't specify the database; assuming Postgres based on tech stack section"
- The ambiguity doesn't change task structure, only implementation detail
- Re-asking would duplicate a question already answered in PLAN.md

Never ask planning questions. Never re-ask what the system is, who it's for, or what the requirements are — those belong to the /vibe:plan skill.
</ambiguity_rules>

<task_format_rules>
**Status** — one of: `pending` | `in-progress` | `done`

**Depends on** — comma-separated task IDs (e.g. `T-01, T-03`), or `none`

**Files** — comma-separated repo-relative paths
- New files: prefix with `[new]` — e.g. `[new] src/lib/auth.ts`
- Existing files being modified: no prefix — e.g. `src/app/layout.tsx`

**What** — imperative and specific:
- Name the exact function, schema field, endpoint path, or component being created
- Describe what it does, what it accepts, what it returns or renders
- Bad: "Implement the auth module"
- Good: "Create `verifyToken(token: string): User | null` in `[new] src/lib/auth.ts`. Validates a JWT using the `jose` library, returns the decoded user payload or null on failure."

**Done when** — must be checkable without judgment:
- ✓ "`npm test -- --testPathPattern=auth` passes"
- ✓ "`curl localhost:3000/api/users` returns 200 with a JSON array"
- ✓ "`src/lib/auth.ts` exports `verifyToken`"
- ✗ "auth works correctly"
- ✗ "the component looks good"
- ✗ "tests pass" (too vague — specify which)
</task_format_rules>

<graph_rules>
Render the dependency graph as a left-to-right directory tree.

**Basic rules:**
- Tasks with no dependencies are top-level entries (roots)
- Each task that depends on exactly one parent is indented under that parent
- Use `├──` for non-final children, `└──` for the last child at each level
- Include the task ID and name: `T-01 · Task name`

**Diamond dependencies (multiple parents):**
- Render the task once, under its earliest/most natural parent
- Append `*` to its entry: `└── T-04* · Task name`
- Add a footer line below the tree: `* T-04 also depends on T-03`
- If a task has 3+ parents: `* T-06 also depends on T-02, T-04`

**Trivially linear graph:**
- If every task depends only on the previous one, render as a flat chain:
  `T-01 → T-02 → T-03 → T-04`

**Example (branching with diamond):**
```
T-01 · Set up database schema
├── T-02 · Create user model
│   └── T-04* · Add auth middleware
└── T-03 · Create session model

* T-04 also depends on T-03
```
</graph_rules>

<tasks_output_format>
```markdown
# Tasks: [Project Name]
> Generated: [YYYY-MM-DD]
> Source: .plan/
> Total: N tasks | Starting points: X

## Dependency Graph

[ASCII graph here]

## Tasks

### T-01 · [Task Name]
**Status:** `pending`
**Depends on:** none
**Files:** `[new] path/to/file.ts`
**What:** [specific — name the exact function, field, endpoint, component and what it does]
**Done when:** [verifiable criterion — command, observable behavior, or file/export existence]

### T-02 · [Task Name]
**Status:** `pending`
**Depends on:** T-01
**Files:** `path/to/existing.ts`, `[new] path/to/new.ts`
**What:** ...
**Done when:** ...

## Open Questions
[Planning-level gaps that could not be resolved and may need clarification before running /work.
If none, write: "None — all ambiguities resolved or inferred."]
```
</tasks_output_format>

<anti_patterns>
- Asking planning questions (requirements, who it's for, why it exists) — those belong to /vibe:plan
- Feature-level tasks: "Implement authentication" is not a task — it's a phase
- Vague `Done when`: "works correctly", "is complete", "tests pass" are plan failures
- Reflexive serialization: do not make T-02 depend on T-01 unless T-02 genuinely needs T-01's output to proceed
- Decomposing before resolving ambiguities that affect file structure
- Implementing any task — writing source files, editing existing code, or running build/test commands — at any point during this skill
- Writing TASKS.md and then suggesting, offering, or beginning implementation
- Producing a graph that doesn't match the `depends_on` fields in the task blocks
</anti_patterns>
