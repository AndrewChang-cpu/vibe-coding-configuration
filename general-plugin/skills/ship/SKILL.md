---
name: vibe:ship
description: Prepares the current branch for a PR and pushes a draft PR. Generates PR title and body from .plan/PLAN.md. Warns if .plan/ transient files are tracked.
allowed-tools:
  - Bash
  - Read
---

<execution_flow>

## Stage 1 — PREFLIGHT

```bash
git status --short
git branch --show-current
git remote -v | head -4
which gh && gh auth status 2>&1 | head -3
```

Checks:
- If no remote `origin`: print `No remote configured. Push a remote first.` and stop.
- If `gh` is not found or not authenticated: print instructions and stop.
- Note the current branch name.

## Stage 2 — CHECK .plan/ TRANSIENTS

```bash
git ls-files .plan/PLAN.md .plan/TASKS.md .plan/SUMMARY.md .plan/CONTEXT.md .plan/RESEARCH.md .plan/UAT.md 2>/dev/null
```

If any of these are tracked (committed), warn:

```
⚠ The following .plan/ transient files are committed and will appear in the PR diff:
  [list files]

These are planning artifacts that reviewers typically don't need to see.
Options:
  a) Add them to .gitignore and commit the removal (recommended)
  b) Proceed anyway — they'll be visible in the PR

How do you want to proceed? (a/b)
```

If user chooses `a`:
```bash
echo ".plan/PLAN.md" >> .gitignore
echo ".plan/TASKS.md" >> .gitignore
echo ".plan/SUMMARY.md" >> .gitignore
echo ".plan/CONTEXT.md" >> .gitignore
echo ".plan/RESEARCH.md" >> .gitignore
echo ".plan/UAT.md" >> .gitignore
git rm --cached .plan/PLAN.md .plan/TASKS.md .plan/SUMMARY.md .plan/CONTEXT.md .plan/RESEARCH.md .plan/UAT.md 2>/dev/null || true
git add .gitignore
git commit -m "chore: exclude .plan/ transient files from version control"
```

Note: `.plan/LEARNINGS.md`, `.plan/ROADMAP.md`, and `.plan/STATE.md` are preserved — they contain persistent project state worth keeping in the repo.

## Stage 3 — GENERATE PR BODY

Read `.plan/PLAN.md`. Extract:
- Project name and overview
- Definition of Done criteria

Generate PR content:
- **Title**: `[Project Name]: [one-line description of what was built]` (under 70 characters)
- **Body**: summary bullets from the plan + test plan checklist derived from DoD criteria

If `.plan/PLAN.md` does not exist, ask the user to describe the change and generate the PR body from their description.

## Stage 4 — PUSH AND CREATE PR

```bash
git push origin $(git branch --show-current) 2>&1 || git push --set-upstream origin $(git branch --show-current) 2>&1
```

```bash
gh pr create --draft --title "<generated title>" --body "<generated body>"
```

Report: `Draft PR created: <url>`

</execution_flow>
