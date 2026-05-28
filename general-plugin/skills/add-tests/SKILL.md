---
name: vibe:add-tests
description: Retrofits tests onto completed work. Classifies changed files as TDD (unit), E2E, or Skip, gets user approval, then generates tests following RED-GREEN conventions. See README for the distinction from vibe:work's built-in TDD.
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
---

<execution_flow>

## Stage 1 — GET CHANGED FILES

```bash
git diff HEAD --name-only
```

If that returns nothing, use:
```bash
git diff main...HEAD --name-only 2>/dev/null || git diff origin/main...HEAD --name-only 2>/dev/null || git status --short
```

Filter out: lock files, `dist/`, `build/`, generated files, `.plan/`.

If no files remain, print `No changed files found.` and stop.

## Stage 2 — CLASSIFY FILES

For each changed file, read it and classify:

| Category | Criteria |
|----------|----------|
| **TDD** | Business logic, calculations, data transformations, validators, parsers, state machines, pure utility functions |
| **E2E** | UI behavior, form interactions, navigation, keyboard shortcuts, modals, drag-and-drop |
| **Skip** | Config files, migrations, CSS/styling only, trivial CRUD with no business logic, type definitions, glue code |

Do not classify based on filename alone — read the file content.

## Stage 3 — PRESENT CLASSIFICATION

Present the classification to the user for approval before generating any tests:

```
Test Classification

TDD (Unit Tests) — N files:
  - file.ts: [one-line reason]

E2E (Browser Tests) — N files:
  - component.tsx: [one-line reason]

Skip — N files:
  - config.json: [one-line reason]

Proceed, adjust, or cancel?
```

Wait for user confirmation. If they want adjustments, apply them and re-present.

## Stage 4 — DISCOVER TEST STRUCTURE

```bash
find . -type d \( -name "*test*" -o -name "*spec*" -o -name "__tests__" \) 2>/dev/null | head -10
find . -type f \( -name "*.test.*" -o -name "*.spec.*" \) 2>/dev/null | head -10
```

Identify: test directory, naming convention, test runner command.

If ambiguous, ask the user which location to use.

## Stage 5 — GENERATE TESTS

**For TDD files:**
1. Write test file following RED-GREEN conventions:
   - RED: Write the test first. Structure: Arrange / Act / Assert. Run it — it MUST fail. If it passes immediately, it's testing the wrong thing.
   - GREEN: Confirm the existing implementation makes it pass (do not modify implementation — this is test generation, not fixing)
   - If a test reveals a real bug (assertion failure from existing code): flag it as `⚠️ Bug found: [description]` — do NOT fix the implementation

**For E2E files:**
1. Write test targeting the user scenario
2. Run it
3. Flag failures as bugs or blockers — do not mark as passing without running

## Stage 6 — REPORT

```
Tests Generated
─────────────────────────────
  Unit:  N generated, N passing, N failing
  E2E:   N generated, N passing, N failing
─────────────────────────────
Bugs discovered: [list or "none"]
Blockers: [list or "none"]
```

If bugs were found: "These tests revealed defects in the existing implementation. Use /vibe:debug to investigate or /vibe:work to fix."

</execution_flow>
