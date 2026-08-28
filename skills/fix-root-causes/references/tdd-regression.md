# Cheap regression-first path

Use this only when the bug has an obvious, inexpensive executable test target or when the user explicitly asks for TDD/regression coverage.

## Workflow

1. Identify intended behavior, observed failure, affected path, and the smallest observable reproduction.
2. Choose the narrowest executable check already natural for that code path: unit, component, integration, regression test, focused script, or equivalent.
3. Add the smallest check that would have caught the bug and run it before the fix.
4. Confirm it fails for the intended reason. A passing test or unrelated harness failure does not establish the regression.
5. Apply the root-cause repair.
6. Rerun the same check and show passing-after evidence.
7. Run nearby validation proportional to the blast radius.

## Do not force TDD when the signal is weak

Skip creating a new test when doing so would require broad harness setup, brittle mocks, slow infrastructure, production-only state, unrelated fixture churn, or a test that merely mirrors implementation details. State why and use the closest falsifying executable check instead.

Do not weaken existing assertions to make the implementation pass. Prefer no new test over a misleading test.
