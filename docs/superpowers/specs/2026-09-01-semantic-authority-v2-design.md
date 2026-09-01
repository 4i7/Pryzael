# Semantic Authority v2 and qualification-harness design

Status: APPROVED DESIGN — implementation not started

Date: 2026-09-01

Repository: `4i7/Pryzael`

Design base: `a954c79cc5f3b617d0427c3e599a4aaab37db4f8`

Design-base repository tree: `51bd093e73068368f3bae3a98d5d20fab3f803c6`

Adopted R5 canonical `skills/` tree: `c7bbb5757fe220da115617940bd007bab9397641`

Adopted R5 `architect` package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`

## 1. Purpose

Repair Pryzael's post-R5 qualification architecture without weakening its existing authority model.

The immediate trigger is the blocked checkout-v7 maintenance PR. The R4 workflow uses a shallow exact checkout while `qualify:head-authority` now dereferences a historical baseline Git tree that is no longer reachable from post-R5 HEAD. A separate R1 workflow also automatically applies the historical frozen-R1 oracle to qualification-architecture-only PRs even though R5 intentionally changed canonical Skill identity.

Those failures expose a broader lifecycle problem: the v1 HEAD semantic authority still uses the frozen R4 Skill tree as its baseline and keeps `architect` admitted by package name after R5 has already been adopted. The repair therefore must close the entire defect class rather than adding `fetch-depth: 0` to one workflow.

## 2. Governing invariants

The design preserves these existing Pryzael invariants:

1. **Canonical Skill authority.** Skill meaning remains authored only under `skills/<name>/**`.
2. **Consequential artifact binding.** Qualification and admission apply to exact commits/trees, not moving refs.
3. **No silent qualification-gate weakening.** A broken gate is repaired or explicitly superseded; it is not bypassed because it blocks a candidate.
4. **Historical/current authority separation.** Historical exact R1 identity, current structural/projection conformance, and current semantic-transition authority are distinct claims.
5. **Fail closed.** Missing or inconsistent authority evidence never becomes a pass.
6. **No self-authorization.** A semantic candidate must not be able to authorize its own Skill mutation in the same PR.
7. **Minimal Git-history dependency.** Current HEAD qualification must not require a full clone solely to validate a frozen baseline manifest.
8. **Single qualification command authority.** GitHub Actions prepares a deterministic execution environment and invokes repository package scripts; workflows do not reimplement qualification semantics.
9. **No R6 semantic work.** This repair changes qualification architecture only. `skills/**` remains untouched.

## 3. Root causes

### 3.1 Historical object availability leaked into current HEAD authority

An earlier implementation made HEAD authority independent of checkout depth by comparing package-tree identities from authority data. A subsequent fail-closed hardening correctly required the declared baseline package map to be reconstructed from the declared baseline Git tree on every run. That restored authenticity checking, but also restored a hidden dependency on the historical tree object being present locally.

This worked while `HEAD:skills` still equaled the historical baseline. After R5 changed `architect`, a shallow clone no longer contained the R4 baseline Skill tree, so the R4 lane could no longer execute the authority check.

The violated ownership invariant is: **the authority verifier owns proving the internal consistency of authority metadata; the workflow should not have to provide arbitrary repository history merely because the verifier cannot reconstruct that consistency from the authority record itself.**

### 3.2 Historical R1 oracle is still composed as a normal current-HEAD PR gate

`npm run qualify:r1:frozen` proves historical R1 exact artifact identity. The protocol already states that it is expected to fail after an explicitly authorized later semantic phase changes canonical Skill bytes.

The R1 workflow nevertheless runs that historical oracle automatically when qualification architecture changes without a `skills/**` change. After R5 adoption this condition is no longer a valid applicability rule. Current HEAD is intentionally not historical R1.

### 3.3 v1 semantic admission is open-ended by package name

The current authority records the frozen R4 package map and `admittedCanonicalPackages: ["architect"]`.

That was sufficient to authorize development of a specific later `architect` candidate, but after R5 adoption it leaves a persistent rule equivalent to "any future architect tree differs from R4 in an admitted package." It does not bind admission to the exact adopted R5 architect tree or to a future exact candidate tree.

The violated lifecycle invariant is: **candidate-development permission must not silently become permanent semantic mutation permission after adoption.**

### 3.4 Duplicate GitHub Actions harnesses drifted

Both R1 and R4 workflows ultimately run `npm run check`, but they prepare different environments. R1 uses full history and explicit Python 3.12; R4 uses the default shallow checkout and ambient Python. This duplicated execution harness allowed a history assumption to fail in only one lane.

## 4. Selected architecture

Adopt **Semantic Authority v2** with four cooperating pieces:

1. an exact semantic-epoch manifest;
2. at most one exact, atomic, pre-authorized transition from that epoch;
3. Git-native Merkle reconstruction of baseline and target Skill-tree identities without requiring historical child objects locally;
4. a PR-context transition-discipline gate that enforces one-way application and prevents self-authorization.

Normal current-HEAD qualification remains:

```text
PR artifact / exact HEAD
        |
        v
PR transition discipline (PR context only)
        |
        v
Semantic Authority v2
        |
        v
R1 current structural/projection conformance
        |
        v
R4 executable Lab integrity
        |
        v
CURRENT HEAD QUALIFIED
```

Historical R1 exact identity remains a separate explicit oracle and is not part of normal current-HEAD admission.

## 5. Semantic epoch model

A **semantic epoch** is the exact stable canonical `skills/` state currently adopted on `main`.

Immediately after this repair, the epoch is R5:

- canonical Skill tree: `c7bbb5757fe220da115617940bd007bab9397641`;
- architect package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`;
- every other package tree remains exactly the adopted R5 value listed below.

Stable epochs do not carry open-ended package-name permission.

## 6. Authority schema v2

The stable post-R5 authority begins with no pending semantic transition:

```json
{
  "schemaVersion": 2,
  "baseline": {
    "canonicalSkillTree": "c7bbb5757fe220da115617940bd007bab9397641",
    "canonicalPackageTrees": {
      "architect": "c58d60466b0b88594be0776390c9fe0efbe2b067",
      "blast-radius": "b6d7a3083ff661ed9998fa91a52341684b885d81",
      "figure-it-out": "649ba6f35faa1b438d3ab6caf1f9b30aaf62359a",
      "fix-root-causes": "3fb27c7f5e4285e32e7b522e72480e5768c18028",
      "how": "3252b4638627a8012260176d8996798f729399fb",
      "interrogate": "a3180549d3eb8aa20f12a6a304abb27f85c9f6f7",
      "prove-it-works": "e3777d3f2cc5224c9c683e6947401d3501c1167a",
      "sequence-verifiable-units": "e77ea3c9ac06fd02403586c75eae26f89eb2a4e9",
      "show-me-your-work": "2da9a8d0097080ef1e907f13390596e51e01a078",
      "why": "29055f8e7084a4337f47e286d7af0141d58a764a"
    }
  },
  "transition": null
}
```

A future semantic phase is armed by a separate authority-only PR:

```json
{
  "schemaVersion": 2,
  "baseline": {
    "canonicalSkillTree": "<current adopted skills tree>",
    "canonicalPackageTrees": {
      "<package>": "<current exact package tree>"
    }
  },
  "transition": {
    "id": "<durable phase/candidate identifier>",
    "targetCanonicalSkillTree": "<exact complete target skills tree>",
    "packageTransitions": {
      "architect": {
        "fromTree": "<exact baseline architect tree>",
        "toTree": "<exact pre-authorized candidate architect tree>"
      }
    }
  }
}
```

### 6.1 Schema rules

- `schemaVersion` must equal `2`.
- Package names and map keys use deterministic ordinal order.
- Every SHA is a lowercase 40-character Git SHA-1.
- `baseline.canonicalPackageTrees` is non-empty.
- v2 does not authorize top-level Skill-package addition, deletion, or rename. Such a package-set change requires an explicit later architecture/schema decision.
- `transition` is either `null` or one object. There is no list of simultaneously active candidate alternatives.
- `packageTransitions` is non-empty when `transition` exists.
- Every transitioned package must exist in the baseline package set.
- `fromTree` must exactly equal that package's baseline tree.
- `toTree` must differ from `fromTree`.
- The target package map is derived mechanically by replacing only declared package transitions in the baseline map.
- `targetCanonicalSkillTree` must equal the Git tree identity reconstructed from that exact target package map.

The manifest contains process identity only. It does not contain Skill prose or become a second semantic source.

## 7. Git-native Merkle reconstruction

Do not require the historical baseline tree object or its child package objects to be present in the checkout merely to prove manifest self-consistency.

Construct canonical Git tree input from the manifest package map:

```text
040000 tree <sha>\tarchitect
040000 tree <sha>\tblast-radius
...
```

Feed the deterministic entries to:

```text
git mktree --missing
```

`--missing` allows the Merkle tree identity to be reconstructed even when the referenced child objects are not available in the shallow checkout. Git remains the authority for canonical tree encoding and ordering; Pryzael does not reimplement Git's tree-hash algorithm in JavaScript.

The resulting tree SHA must equal the declared `baseline.canonicalSkillTree`.

When a transition exists, derive the target package map, reconstruct it the same way, and require exact equality with `transition.targetCanonicalSkillTree`.

This simultaneously preserves:

- checkout-depth independence from the earlier package-map design;
- fail-closed manifest self-consistency from the later Git-baseline hardening;
- Git-native Merkle identity rather than a Pryzael-specific digest format.

## 8. HEAD semantic-authority states

`qualify:head-authority` evaluates only the current checkout and v2 manifest.

It reads actual `HEAD:skills` and its package trees from Git and permits exactly these states:

### STABLE

- `transition == null`;
- current package map exactly equals baseline package map;
- current `HEAD:skills` exactly equals baseline canonical Skill tree.

### ARMED

- a transition exists;
- current package map/tree still exactly equals the baseline.

This is the expected repository state immediately after an authority-only pre-admission PR is merged and before the semantic candidate is applied.

### APPLIED

- a transition exists;
- current package map exactly equals the mechanically derived target map;
- current `HEAD:skills` exactly equals the declared target canonical Skill tree.

No partial multi-package transition, undeclared package mutation, third tree, package-set change, or malformed authority record is accepted.

The local HEAD validator may recognize both ARMED and APPLIED because it does not know PR direction. Directionality is enforced by the PR-context gate below.

## 9. Self-authorization prevention and one-way transition discipline

An exact target hash is not a meaningful admission boundary if the same semantic PR can edit both the Skill and the file that authorizes the target. Therefore semantic transitions use a two-PR sequence.

### 9.1 Authority-only PR — arm the transition

The first PR may change `qualification/head-semantic-authority.json` and the qualification implementation/tests/docs necessary for an architecture migration, but it must not modify `skills/**`.

For an ordinary future semantic phase, an authority-only PR must satisfy:

- `BASE:skills == HEAD:skills`;
- the new baseline equals the currently adopted Skill tree;
- any new transition is internally self-consistent and exact;
- current HEAD evaluates as STABLE or ARMED under the new authority.

This is the human-review/admission step. The exact future candidate tree is visible before semantic application.

### 9.2 Skill-only PR — apply the already armed transition

The semantic candidate PR must not modify `qualification/head-semantic-authority.json`.

For a Skill-changing PR:

- the authority blob must be unchanged between base and candidate;
- the base Skill state must be ARMED, not APPLIED;
- the candidate Skill state must be exactly APPLIED;
- changed packages must equal the transition's declared package set;
- each changed package must move exactly `fromTree -> toTree`;
- the complete candidate `HEAD:skills` must equal `targetCanonicalSkillTree`.

This rejects:

- mixed authority + Skill self-authorization;
- an unarmed Skill mutation;
- partial application;
- an alternate candidate tree in the same package;
- reverse `target -> baseline` replay after adoption;
- applying the same transition a second time from an already APPLIED base.

### 9.3 Epoch rotation

After an exact transition has been adopted, later maintenance PRs can continue while the manifest reports APPLIED.

Before another semantic phase, an authority-only PR rotates the baseline to the currently adopted target and either:

- sets `transition: null`, returning to STABLE; or
- arms the next exact transition in the same authority-only PR.

No separate post-merge closure PR is required for every semantic change.

## 10. PR-context qualification command

Add a narrow PR-context command, conceptually:

```text
npm run qualify:pr-transition -- <base-sha> <head-sha>
```

It owns only facts that require a base/candidate pair:

- exact diff classification;
- prohibition on mixed `skills/**` + authority mutation;
- base-to-head directionality;
- authority blob equality for Skill-only application;
- ARMED -> APPLIED transition proof.

It must not duplicate HEAD authority schema validation. It should call/reuse the same v2 authority library functions used by `qualify:head-authority`.

For PR qualification the workflow fetches only the exact base commit needed for this comparison. It does not fetch the complete repository history.

## 11. Historical R1 applicability

Preserve all historical R1 fixture/oracle code and regression tests.

`npm run qualify:r1:frozen` remains the explicit command for the claim:

> this artifact is identical to the historically qualified R1 artifact contract.

It is **not** a normal future HEAD acceptance gate.

Remove the current R1 workflow heuristic that automatically executes the frozen oracle for qualification-architecture-only changes. That condition became invalid when R5 intentionally changed canonical Skill identity.

Normal tests must continue proving that the historical oracle itself:

- accepts the frozen historical identity;
- rejects provenance drift;
- rejects plugin/Skill-tree/package/catalog identity drift.

When a future operation genuinely needs fresh public evidence for historical R1 identity, use an explicit evidence operation/harness bound to the exact historical artifact rather than silently applying the oracle to current R5+ HEAD.

## 12. Unified current-HEAD GitHub Actions harness

Replace the two drifting current-HEAD execution harnesses with one repository qualification workflow whose path filters are the union of the current R1 and R4 authority surfaces.

The workflow owns execution mechanics only:

1. resolve exact `EXPECTED_SHA`;
2. exact checkout of that SHA with shallow history;
3. prove `git rev-parse HEAD == EXPECTED_SHA`;
4. set up pinned Node 22;
5. set up pinned Python 3.12;
6. on PR events, fetch the exact base SHA with the minimum history required for base/head comparison;
7. run the PR transition-discipline command;
8. seed the stale dependency sentinel currently used by R1 qualification;
9. run canonical `npm run check`;
10. prove the deterministic lockfile install removed the stale sentinel.

Security properties remain:

- immutable full-SHA action pins;
- `pull_request` and `workflow_dispatch`, not `pull_request_target`;
- `contents: read`;
- no `allow-unsafe-pr-checkout` override;
- exact candidate checkout/proof remains mandatory.

The workflow must not embed historical Skill identity rules or duplicate semantic-authority logic.

## 13. Repository command ownership

Keep the contributor-facing command authority in `package.json`.

Normal repository qualification remains:

```text
npm run check
  -> qualify:head-authority
  -> qualify:r1
  -> qualify:r4-lab
```

The PR-only transition command is an additional artifact-pair gate used by CI/review when a base SHA exists; it is not inserted into local `npm run check`, because a local checkout does not necessarily have an authoritative PR base artifact.

## 14. Tests and required RED coverage

Implementation begins with failing tests for the newly required invariants.

### 14.1 Merkle reconstruction

- v2 baseline map reconstructs the exact declared R5 `skills/` tree;
- reconstruction succeeds in a synthetic shallow repository where baseline child objects are intentionally unavailable;
- a changed package-map SHA produces a different reconstructed root and fails;
- a changed declared root fails;
- invalid package names/order/SHA format fail.

### 14.2 HEAD states

- STABLE accepts exact baseline with `transition: null`;
- ARMED accepts baseline with a valid transition;
- APPLIED accepts only the complete exact target;
- an undeclared package mutation fails;
- a target package tree different by one commit/tree fails;
- partial multi-package application fails;
- top-level package add/delete/rename fails.

### 14.3 PR directionality

Use synthetic Git histories to prove:

- authority-only arm with unchanged Skills passes;
- mixed authority + Skill mutation fails;
- Skill mutation with no armed transition fails;
- unchanged authority + exact baseline -> target passes;
- baseline -> alternate target fails;
- target -> baseline reverse replay fails;
- APPLIED base -> second application fails;
- authority rotation with unchanged current Skills passes.

### 14.4 Historical/current separation

- existing frozen-R1 oracle tests remain unchanged and green;
- current R5 HEAD qualification does not invoke historical frozen identity as an applicability gate;
- normal current `npm run check` remains green under R5 baseline.

### 14.5 Workflow contract

Add focused static workflow tests or equivalent assertions proving:

- one current-HEAD qualification harness owns the full chain;
- exact checkout proof remains;
- Node and Python are explicit;
- token permission remains read-only;
- dangerous privileged checkout triggers/overrides are absent;
- the obsolete automatic frozen-R1 heuristic is absent.

## 15. Implementation scope

Expected implementation surface:

- `qualification/head-semantic-authority.json` — migrate v1 -> v2 R5 epoch;
- `scripts/qualify_head_semantic_authority.mjs` — v2 schema/state/Merkle verification;
- one small PR transition-discipline script reusing authority logic;
- `tests/qualification-gates.test.mjs` and focused workflow-contract tests as needed;
- `package.json` for the PR-context command;
- GitHub Actions current-HEAD qualification workflow consolidation;
- `docs/PROTOCOL.md`, `docs/DEVELOPMENT.md`, and `ARCHITECTURE.md` to record the lifecycle/ownership model.

The repair must not touch:

- `skills/**`;
- R5 semantic content;
- R4 evaluation contract/corpus/admission semantics;
- hidden R4C material;
- the frozen R1 contract fixture semantics;
- Dependabot major-version changes themselves.

## 16. Migration sequence

1. Freeze the implementation PR on current `main` content identity. The current content tree is `51bd093e73068368f3bae3a98d5d20fab3f803c6` and R5 Skill tree is `c7bbb5757fe220da115617940bd007bab9397641`.
2. Add RED tests for v2 manifest self-consistency, shallow-history independence, exact transition states, self-authorization rejection, and reverse-replay rejection.
3. Implement v2 authority parsing and Git `mktree --missing` reconstruction.
4. Migrate the committed authority baseline from frozen R4 to adopted R5, with `transition: null`.
5. Implement PR base/head transition discipline.
6. Consolidate the duplicate R1/R4 current-HEAD harnesses and remove automatic frozen-R1 applicability logic.
7. Update architecture/development/protocol documentation.
8. Run the full local/repository qualification suite.
9. Obtain exact-head public CI on the repair PR and independently review the authority/security boundaries.
10. Merge only the exact qualified repair head.
11. Add a separate repository ruleset/branch-protection hardening step before resuming maintenance admission, because authority-only pre-admission has meaningful governance only when normal main changes are forced through review/qualification.
12. Rebase/recreate checkout v7 maintenance PR #16 on the repaired main and qualify it fresh; then process setup-node #14 and setup-python #15 sequentially against each newly adopted main.

## 17. Branch/ruleset follow-up

Repository rulesets are currently absent. Direct main writes observed during orchestration demonstrated that this is a real control-plane gap rather than a hypothetical one.

Do not mix GitHub repository-policy mutation into the Semantic Authority v2 code PR. After the repair is merged and its final status-check name is stable, configure a separate ruleset/branch-protection change that requires the normal PR path and the unified qualification check for `main`, with bypass policy explicitly reviewed.

This follow-up is required before treating the two-PR semantic-transition discipline as technically enforced governance rather than repository convention.

## 18. Alternatives rejected

### A. Add `fetch-depth: 0` only to R4 and skip frozen R1 conditionally

Rejected because it fixes the immediate symptom while retaining open-ended `architect` admission, duplicated CI harnesses, and full-history coupling.

### B. Rotate the baseline to R5 but keep package-name admission

Better than A, but still grants future semantic permission to a package rather than one exact candidate artifact.

### C. Trust the package-tree map without reconstructing the declared root

Rejected because it weakens the later fail-closed baseline-authenticity hardening and lets inconsistent authority metadata become self-authenticating.

### D. Always fetch full history

Operationally simple but architecturally unnecessary. It makes current qualification depend on repository-history availability instead of on the exact Merkle material actually needed by the claim.

### E. Semantic Authority v2 with exact pre-armed transition and Git Merkle reconstruction

Selected because it preserves fail-closed Git identity, removes arbitrary history coupling, prevents self-authorization, closes reverse/replay cases, and makes semantic-phase lifecycle explicit without introducing a new external authority service or supply-chain framework.

## 19. Acceptance criteria

The repair is complete only when all of the following are true:

- `skills/**` is byte/tree-identical to adopted R5 throughout the repair;
- v2 baseline exactly identifies current adopted R5;
- current R5 HEAD passes normal qualification from a shallow checkout;
- corrupt baseline package metadata or root identity fails closed without relying on historical-object availability;
- future semantic admission is exact-target-bound, not package-name-open-ended;
- same-PR authority + Skill self-authorization is rejected;
- transition application is one-way from an ARMED base to the exact APPLIED target;
- reverse/replay/partial/alternate target mutations fail;
- historical frozen-R1 oracle remains intact but is no longer automatically misapplied to current R5+ HEAD;
- one current-HEAD workflow harness supplies consistent Node/Python/exact-head/security setup for the canonical repository qualification chain;
- exact-head CI for the repair is green;
- an independent review finds no silent gate weakening or new second semantic authority;
- after merge, PR #16 can be requalified without the historical-history-availability blocker.

## 20. Architectural result

Semantic Authority v2 changes the governing question from:

> Is this package name generally admitted to differ from an old baseline?

into:

> Does this exact base semantic epoch, under a separately pre-authorized and reviewable transition, move exactly to this one target canonical Skill tree?

That claim matches Pryzael's exact-artifact model and provides a stable foundation for post-R5 maintenance and any later evidence-justified semantic phase.
