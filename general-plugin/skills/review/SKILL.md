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

## Stage 1.5 — LOAD DOCUMENTED DECISIONS

If `.plan/PLAN.md` exists, read it (and any docs it links) and collect its Out of Scope, Assumptions, and any documented placeholder / deferral / manual step (e.g. "replace `FIXME_ACM_CERT_ARN` before sync") into a **Documented Decisions** block to pass to the agents. If there's no plan, the block is empty.

The whole repo is still reviewed. The block only lets a reviewer reclassify a finding to `ACKNOWLEDGED` when the plan *explicitly* names it as intentional — findings the plan is silent about keep full severity.

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
- The Documented Decisions block from Stage 1.5 (may be empty)

The agent runs its review at the specified depth and applies the checklist as a second pass. All output goes to terminal.

## Stage 3b — PYTHON REVIEW (if Python files present)

Check whether any `.py` files are in the reviewed file list:
```bash
echo "<file_list>" | grep -q '\.py$'
```

If yes, spawn the `python-reviewer` agent in parallel with Stage 3c. Pass:
- The list of Python files being reviewed
- The Documented Decisions block from Stage 1.5 (may be empty)

Include its CRITICAL/HIGH/MEDIUM findings in the final status.

## Stage 3c — SECURITY REVIEW

Spawn the `security-reviewer` agent unconditionally (run in parallel with Stage 3b). Pass:
- The full filtered file list
- The Documented Decisions block from Stage 1.5 (may be empty)

Include its findings in the final status. Block on any unreconciled CRITICAL or HIGH finding.

## Stage 4 — FINAL STATUS

After all agents complete, consolidate findings. Move any finding the Documented Decisions block explicitly names to an `ACKNOWLEDGED` section (cite the plan line); it doesn't count toward the verdict. If no unreconciled blockers remain: propose a concise commit message based on the changes.

</execution_flow>
