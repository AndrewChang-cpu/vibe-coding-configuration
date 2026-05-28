---
name: vibe:review
description: Adversarial code review of current changes. Defaults to deep review. Spawns code-reviewer agent then applies pre-commit checklist as a second pass. Replaces vibe:audit.
arguments: [depth]
argument-hint: "[--quick | --standard] (default: deep)"
allowed-tools:
  - Bash
  - Read
  - Agent
---

<execution_flow>

## Stage 1 — GET FILE LIST

Get the list of files to review:
```bash
git diff --cached --name-only
```
If that returns nothing, fall back to:
```bash
git diff HEAD --name-only
```

Filter out files that should not be reviewed:
- Lock files: `package-lock.json`, `yarn.lock`, `*.lock`, `pnpm-lock.yaml`
- Generated: `dist/`, `build/`, `*.min.js`, `*.min.css`
- Planning artifacts: `.plan/` directory

If no reviewable files remain after filtering, print `Nothing to review.` and stop.

## Stage 2 — DETERMINE DEPTH

Parse the depth from `$ARGUMENTS`:
- `--quick` → depth = quick
- `--standard` → depth = standard
- No flag or any other value → depth = deep (default)

## Stage 3 — DISPATCH CODE REVIEWER

Read `checklist.md` in this skill directory.

Spawn the `code-reviewer` agent. Pass:
- The depth
- The filtered file list
- The full content of `checklist.md`

The agent runs its review at the specified depth and applies the checklist as a second pass. All output goes to terminal.

## Stage 4 — FINAL STATUS

After the agent completes, if the review is clean: propose a concise commit message based on the changes.

</execution_flow>
