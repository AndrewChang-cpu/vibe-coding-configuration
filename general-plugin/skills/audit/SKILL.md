---
name: vibe:audit
description: On-demand pre-commit audit of current changes. Checks for modularity, secrets, debug artifacts, and logical soundness.
allowed-tools:
  - Bash
  - Read
  - Agent
---

<execution_flow>
## Stage 1 — GATHER CHANGES
Read the current staged and unstaged changes:
```bash
git diff HEAD
```
If no changes are found, print `No changes detected to audit.` and stop.

## Stage 2 — DISPATCH AUDITOR
Read [`checklist.md`](checklist.md) in this skill directory. Invoke a specialized auditor subagent. Provide the full `git diff` and the following instructions:

**Auditor Persona:**
You are a Pedantic Senior Security Engineer and Architect. Your job is to find reasons to REJECT this code. Be thorough, skeptical, and uncompromising.

**Checklist:**
Apply every item in `checklist.md` (Blocking items 1–6, Advisory items 7–8). For Contract Check, read `.plan/openapi.yaml` and `.plan/PLAN.md` when they exist.

## Stage 3 — REPORT
Present the auditor's findings to the user.
- If issues are found: Categorize them by severity (BLOCKING vs. ADVISORY).
- If clean: Output `PASSED AUDIT` and propose a concise, high-quality commit message based on the changes.
</execution_flow>
