# GitHub exact-head review contract

Use this contract when a GitHub review names or depends on an exact base/candidate commit, or when a moving PR/branch must not change the reviewed artifact underneath the session.

## Invariant

A verdict applies to one bound artifact pair:

```text
repository + exact base SHA + exact candidate SHA
```

Branch names, PR numbers, labels, and default branches are moving context. They are not substitutes for the bound SHAs.

## 1. Bind identity before reading the diff

Resolve and record:

- exact repository full name;
- exact base commit SHA;
- exact candidate commit SHA;
- PR number and source/base branch only when relevant context exists.

Verify both commit objects exist in the intended repository.

If the user supplied mandatory SHAs, never silently replace them with branch tips or current PR heads. If a mandatory object cannot be resolved, stop the exact review as `INCONCLUSIVE` rather than reviewing a nearby version.

## 2. Reconcile moving context

When a PR or source branch is part of the request, read its current metadata and compare it with the bound candidate.

Possible states:

- **matches:** current moving head equals the bound candidate;
- **drifted:** the branch/PR moved, but the bound candidate still exists and can be reviewed historically;
- **inconsistent:** supplied repository/PR/base/head claims cannot all be true.

A drifted PR does not erase the usefulness of a historical exact-SHA review, but the final report must not claim that verdict describes the new PR head.

## 3. Build the review diff from exact commits

Compare the bound base and candidate directly. Confirm the relationship expected by the task, especially when the candidate is supposed to descend from the base.

Do not use an unqualified current PR patch as authority when the task mandates different exact SHAs.

For every changed file, read the candidate version at the candidate SHA. For deleted files or before/after reasoning, read the base version at the base SHA. Read surrounding/context files at an explicit SHA as well.

Search may discover paths, but once a path/ref is known, direct exact-ref fetch is authoritative.

## 4. Keep intent/history separate from artifact identity

PR descriptions, issues, commit messages, prior review discussion, and documentation can explain intent or historical rationale. They do not change which bytes are under review.

Distinguish:

- explicit user constraints;
- repository/PR documented intent;
- reviewer inference.

## 5. Bind verification evidence to the candidate SHA

CI statuses, workflow runs, validator results, generated evidence, and external test claims count only when their artifact identity can be tied to the bound candidate (or another explicitly stated artifact relevant to the claim).

Do not use a green check from a different commit as proof for the candidate.

When runtime execution is outside the active ChatGPT environment, static review can still identify defects, but required runtime predicates remain `INCONCLUSIVE` unless commit-bound external evidence resolves them.

## 6. Recheck identity before the final verdict

If current PR/branch status matters, resolve it again before reporting.

If it moved during the review:

- keep the verdict explicitly bound to the exact candidate SHA reviewed;
- state that the current moving head is unreviewed;
- do not blend evidence from the old and new heads.

## 7. Read-only default

Exact-head review does not require repository mutation. Even if the connector exposes write actions, do not push, edit, comment, label, merge, or otherwise mutate GitHub unless the user separately requested that action.

## Minimum identity block

A strong exact review should be able to state:

```text
REPOSITORY: owner/name
BASE: <exact sha>
CANDIDATE: <exact sha>
MOVING CONTEXT: <PR/branch and whether it still matches>
DIFF SOURCE: exact base..candidate comparison
CI/EVIDENCE IDENTITY: <candidate-bound / unavailable / mixed and rejected>
```

If one of the required exact identities cannot be established, say so before giving a pass/fail style verdict.
