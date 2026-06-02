# Pre-commit audit checklist

Use for `/vibe:review` and work-skill task reviewers. REJECT on any blocking item.

**Documented-decision exception:** if `.plan/PLAN.md` *explicitly* names a finding as intentional, deferred, or a required manual step (e.g. a `FIXME_X` placeholder slated for replacement), reclassify it as `ACKNOWLEDGED (documented decision)` and cite the plan line instead of rejecting. Exact matches only — gaps the plan is silent about stay blocking.

## Blocking

1. **Modularity** — Any new file exceeds 500 lines; split into focused modules.
2. **Debug artifacts** — Left-over `console.log`, `print`, `debugger`, or similar statements not justified for production.
3. **Secrets** — Hardcoded API keys, tokens, passwords, or credentials in source.
4. **Security gaps** — Missing auth checks, injection risks, or obvious logical vulnerabilities on sensitive paths.
5. **Contract deviation** — Code diverges from `.plan/openapi.yaml` when it exists.
6. **Test coverage and quality** — Implementation lacks corresponding tests, or tests exhibit any of the following smells (all blocking):
   - *Smoke-only*: test makes a call but has no assertions
   - *Mock-only assertions*: test only asserts that a mock was called, never checks real observable behavior (return value, state change, or side effect on a fake)
   - *Hyperassertions*: test asserts on internal fields, private methods (via reflection/`as any`), or formatting details that break on harmless refactors
   - *Multiple behaviors in one test*: test name contains "and" or covers unrelated scenarios — each behavior must be its own test
   - *Infrastructure mocked away*: task required real DB/network but test substituted a mock instead of a fake or testcontainer

7. **Verification execution** — The implementer's STATUS: DONE report does not include: (a) actual failing test output from the RED phase, (b) actual passing test output from the GREEN phase, (c) verbatim output of every "Done when" command. Absence of any of these is a blocking rejection — do not evaluate code quality until the report is complete. The reviewer must re-execute every "Done when" command themselves; approving based solely on the implementer's claimed output violates this checklist.
8. **Behavioral spec deviation** — The implementation's observable behavior (stored values, algorithm outcome, error response, startup/cleanup sequence) diverges from a criterion explicitly named in `.plan/PLAN.md`'s Definition of Done. Examples: wrong TTL value written to the DB, presence-check used where the plan specifies gap-detection, startup cleanup query missing. Style or structural drift is advisory; value and algorithm deviations from named DoD criteria are blocking.

## Advisory

9. **Engineering quality** — Naming unclear, non-idiomatic patterns, unnecessary complexity or over-engineering.
10. **Spec drift** — Behavior diverges from `.plan/PLAN.md`, `PRD.md`, or the task block in ways not covered by item 8 (structural choices, flow ordering, non-DoD implementation details).

Severity: blocking items must be fixed before approval; advisory items may ship with notes.
