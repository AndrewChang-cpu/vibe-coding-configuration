---
name: vibe:verify
description: Conversational UAT. Walks through each DoD criterion from the plan, asks the user if reality matches, records pass/fail in .plan/UAT.md, and summarizes results. Run after vibe:work.
allowed-tools:
  - Read
  - Write
  - Bash
---

<execution_flow>

## Stage 1 — LOAD PLAN

```bash
test -f .plan/PLAN.md && echo "plan: found" || echo "plan: MISSING"
test -f .plan/UAT.md && echo "uat: found" || echo "uat: absent"
```

If no PLAN.md: print `No PLAN.md found. Run /vibe:plan first.` and stop.

Read `.plan/PLAN.md`. Extract the Definition of Done criteria (the checkbox list).

If `.plan/UAT.md` already exists, read it. Resume from the first criterion not yet tested — do not re-test passing items.

## Stage 2 — UAT LOOP

For each DoD criterion:

1. State the expected behavior clearly:
   > "Criterion N: [criterion text]. Expected: [what should happen or exist]."

2. Ask the user:
   > "Does this match what you're seeing? (y / n / skip)"

3. Record the response in `.plan/UAT.md`:

```markdown
# UAT Results
> Last updated: [ISO timestamp]

## [Criterion text]
**Status:** PASS | FAIL | SKIPPED
**Note:** [any user comment]

---
```

If the user says `skip`, mark SKIPPED and continue.

## Stage 3 — SUMMARY

After all criteria are tested, print:

```
UAT Complete
─────────────────────────
  PASS:    N
  FAIL:    N
  SKIPPED: N
─────────────────────────
```

If any criteria FAILED, suggest:
- Re-run `/vibe:work` for the failing items
- Or investigate with `/vibe:debug` if the behavior is unexpected

If all criteria PASSED: print `All criteria verified. Ready to ship.`

</execution_flow>
