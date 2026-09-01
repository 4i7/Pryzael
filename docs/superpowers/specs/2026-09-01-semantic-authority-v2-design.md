# Semantic Authority v2 and qualification-harness design

Status: APPROVED DESIGN — reconciled after post-R5 architecture review; implementation not started

Date: 2026-09-01

Repository: `4i7/Pryzael`

Design base: `a954c79cc5f3b617d0427c3e599a4aaab37db4f8`

Design-base repository tree: `51bd093e73068368f3bae3a98d5d20fab3f803c6`

Adopted R5 canonical `skills/` tree: `c7bbb5757fe220da115617940bd007bab9397641`

Adopted R5 `architect` package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`

## 1. Purpose

Repair Pryzael's post-R5 qualification architecture without weakening its existing authority model.

The immediate trigger is the blocked checkout-v7 maintenance PR. The R4 workflow uses a shallow exact checkout while `qualify:head-authority` dereferences a historical baseline Git tree that is no longer reachable from post-R5 HEAD. A separate R1 workflow also automatically applies the historical frozen-R1 oracle to qualification-architecture-only PRs even though R5 intentionally changed canonical Skill identity.

Those failures expose a broader lifecycle problem: the v1 HEAD semantic authority still uses the frozen R4 Skill tree as its baseline and keeps `architect` admitted by package name after R5 has already been adopted. The repair must therefore close the defect class rather than add `fetch-depth: 0` to one workflow.

Independent post-R5 architecture review also identified three security gaps in the first v2 design: an authority-only PR could recenter its baseline around an already-invalid predecessor unless BASE validity was independently enforced; ordinary `JSON.parse()` could erase duplicate-member evidence before validation; and a later qualification-architecture repair could accidentally change semantic permission unless repair classification is explicitly separated from semantic authorization. This reconciled design closes those gaps without replacing the selected Semantic Authority v2 architecture.

## 2. Governing invariants

1. **Canonical Skill authority.** Skill meaning remains authored only under `skills/<name>/**`.
2. **Consequential artifact binding.** Qualification and admission apply to exact commits/trees, not moving refs.
3. **No silent qualification-gate weakening.** A broken gate is repaired or explicitly superseded; it is not bypassed because it blocks a candidate.
4. **Historical/current authority separation.** Historical exact R1 identity, current structural/projection conformance, and current semantic-transition authority are distinct claims.
5. **Fail closed.** Missing, malformed, ambiguous, unavailable, or inconsistent authority evidence never becomes a pass.
6. **No self-authorization.** A semantic candidate must not authorize its own Skill mutation in the same PR.
7. **Predecessor validity.** A new authority may authorize only from an exact BASE state already valid under the exact BASE authority. Authority rotation cannot launder an unauthorized predecessor.
8. **Raw authority syntax is security evidence.** Duplicate JSON object members must be rejected from raw authority bytes before ordinary object normalization can erase them.
9. **Architecture repair is not semantic authorization.** After v2 adoption, qualification implementation changes must not arm, replace, retarget, or otherwise alter semantic permission.
10. **Minimal Git-history dependency.** Current HEAD qualification must not require a full clone solely to validate a frozen baseline manifest.
11. **Exact PR-base pairing.** PR transition qualification is bound to the event's exact BASE SHA and exact expected HEAD SHA; moving `main`, alternate merge bases, and invented transition direction are not substitutes.
12. **Single command authority.** GitHub Actions prepares an exact execution environment and invokes repository package scripts; workflow YAML does not reimplement qualification semantics.
13. **Required status always materializes.** The unified current-HEAD workflow runs for every pull request and therefore has no workflow-level path filter.
14. **No R6 semantic work.** This repair changes qualification architecture only. `skills/**` remains untouched.

## 3. Root causes

### 3.1 Historical object availability leaked into current HEAD authority

An earlier implementation made HEAD authority independent of checkout depth by comparing package-tree identities from authority data. A later fail-closed hardening correctly required the declared baseline package map to be reconstructed from the declared baseline Git tree on every run. That restored authenticity checking but also restored a hidden dependency on the historical tree object being locally available.

This worked while `HEAD:skills` still equaled the historical baseline. After R5 changed `architect`, a shallow clone no longer contained the R4 baseline Skill tree, so the R4 lane could no longer execute the authority check.

The violated ownership invariant is: **the authority verifier owns proving the internal consistency of authority metadata; a workflow should not need arbitrary repository history merely because the verifier cannot reconstruct that consistency from the authority record itself.**

### 3.2 Historical R1 oracle is still composed as a normal current-HEAD PR gate

`npm run qualify:r1:frozen` proves historical R1 exact artifact identity. The protocol already states that it is expected to fail after an explicitly authorized later semantic phase changes canonical Skill bytes.

The R1 workflow nevertheless runs that historical oracle automatically when qualification architecture changes without a `skills/**` change. After R5 adoption this is no longer a valid applicability rule. Current HEAD is intentionally not historical R1.

### 3.3 v1 semantic admission is open-ended by package name

The current authority records the frozen R4 package map and `admittedCanonicalPackages: ["architect"]`. That was sufficient to authorize development of a later `architect` candidate, but after R5 adoption it leaves a persistent rule equivalent to "any future architect tree differs only in an admitted package."

The violated lifecycle invariant is: **candidate-development permission must not silently become permanent semantic mutation permission after adoption.**

### 3.4 Duplicate GitHub Actions harnesses drifted

Both R1 and R4 workflows ultimately run `npm run check`, but they prepare different environments. R1 uses full history and explicit Python 3.12; R4 uses the default shallow checkout and ambient Python. This duplicated harness allowed one history assumption to fail in only one lane.

### 3.5 Authority rotation could launder an invalid predecessor

The initial v2 design required an authority-only PR to keep `BASE:skills == HEAD:skills` and to make the new baseline equal the current Skill tree, but it did not first require that the exact BASE state itself be valid under the exact BASE authority.

Without that predecessor check, an unauthorized or malformed Skill state could become the apparent new baseline merely because a later authority-only PR described it consistently. The violated invariant is: **authority may advance only from already-authorized exact state. Internal consistency of the candidate authority is not proof that its predecessor was legitimate.**

### 3.6 Ordinary JSON parsing can erase duplicate-member evidence

JavaScript `JSON.parse()` accepts duplicate object member names and retains only one value. Object-level schema checks therefore cannot prove that the raw authority bytes were unambiguous.

The violated invariant is: **security-significant authority syntax must be unambiguous before normalization.** Duplicate raw members must be rejected before the authority becomes an ordinary JavaScript object.

### 3.7 Qualification repair and semantic permission were not explicitly disjoint

The initial v2 design correctly separated ordinary authority-only and Skill-only PRs, but a future qualification-architecture repair still needed a machine-enforced rule forbidding that repair from simultaneously arming or retargeting semantic permission.

The violated invariant is: **repairing the machinery that judges authority must not itself alter what semantic state is authorized, except through a separately designed and approved schema migration.**

### 3.8 Workflow path filtering conflicts with a required status

A workflow intended to become a required merge status cannot rely on workflow-level path filtering: a pull request outside the filter can leave the required check absent or pending rather than conclusively successful.

The qualification workflow must therefore run for every pull request. It may cheaply classify a PR as containing no semantic/authority transition work, but the required status itself must always materialize.

## 4. Selected architecture

Adopt **Semantic Authority v2** with four cooperating pieces:

1. an exact semantic-epoch manifest;
2. at most one exact, atomic, pre-authorized transition from that epoch;
3. Git-native Merkle reconstruction of baseline and target Skill-tree identities without requiring historical child objects locally;
4. a PR-context transition-discipline gate that enforces predecessor validity, one-way application, artifact identity, repair/semantic separation, and no self-authorization.

Normal current-HEAD qualification becomes:

```text
exact PR HEAD
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

Historical R1 exact identity remains a separate explicit oracle and is not a normal current-HEAD admission gate.

The selected architecture remains deliberately narrow: exact semantic epochs; exact pre-authorized `fromTree -> toTree` transitions; complete target `skills/` tree binding; separate authority-only and Skill-only PRs; STABLE / ARMED / APPLIED states; one-way PR transition discipline; Git-native `git mktree --missing`; shallow current-HEAD qualification; one unified current-HEAD harness; and a one-time v1 -> v2 R5 bootstrap. No `skills/**` semantics change in this repair.

## 5. Semantic epoch model

A **semantic epoch** is the exact stable canonical `skills/` state currently adopted on `main`.

Immediately after this repair, the baseline epoch is R5:

- canonical Skill tree: `c7bbb5757fe220da115617940bd007bab9397641`;
- architect package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`;
- all other package trees exactly as listed in the v2 manifest below.

A stable epoch has no open-ended package-name permission.

An epoch may be represented by an authority whose local HEAD state is STABLE, ARMED, or APPLIED. Those are all legal local states when their exact manifest and tree relationships validate. PR directionality determines which state-to-state transitions are legal between exact BASE and HEAD.

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

A future semantic phase is armed by a **separate authority-only PR**:

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

The angle-bracket values above are illustrative schema slots, not unresolved design placeholders.

### 6.1 Raw JSON contract

Authority validation begins from the raw bytes of the canonical authority artifact, not from an already-normalized JavaScript object.

Before ordinary object/schema validation, normalization, canonical ordering, or semantic evaluation, the implementation must detect and reject duplicate JSON object member names recursively.

Duplicate rejection applies to every authority JSON object. Mandatory coverage includes, at minimum:

- the root authority object;
- `baseline`;
- `baseline.canonicalPackageTrees`;
- `transition` when present;
- `transition.packageTransitions`;
- every per-package transition object;
- any future nested authority object introduced by schema v2 implementation.

No duplicate-member input may be accepted merely because its post-parse object would otherwise satisfy the schema.

Observable contract:

```text
RAW AUTHORITY JSON WITH DUPLICATE OBJECT MEMBER
    -> REJECT BEFORE AUTHORITY NORMALIZATION
```

The design does not mandate a particular third-party parser. Implementation may use a small strict parser/tokenizer or equivalent mechanism, but it must preserve enough raw syntax evidence to reject duplicates before ordinary normalization.

### 6.2 Object/schema rules after raw duplicate rejection

- `schemaVersion` must equal `2`.
- Every SHA is exactly lowercase 40-hex SHA-1.
- `baseline.canonicalPackageTrees` is non-empty.
- Package names are unique, satisfy the implementation's explicit package-name grammar, and are represented in a deterministic canonical map structure.
- Package-map iteration/order used for derived operations is deterministic and independent of attacker-controlled incidental object ordering.
- v2 does not authorize top-level Skill-package addition, deletion, or rename. The exact package set is invariant within schema v2. Such a package-set change requires a later explicit architecture/schema decision.
- `transition` is either `null` or one object. There is no list of simultaneously active candidate alternatives.
- `transition.id` is a non-empty durable identifier.
- `packageTransitions` is non-empty when `transition` exists.
- Every transitioned package exists in the exact baseline package set.
- `fromTree` exactly equals that package's baseline tree.
- `toTree` differs from `fromTree`.
- The target package map is derived mechanically by replacing only declared transitions in the baseline map.
- `targetCanonicalSkillTree` equals the Git tree identity reconstructed from that exact target package map.
- A `toTree` need not already be present in the authority PR's local object database. The hash is a pre-commitment; the later Skill candidate must materialize exactly that tree before it can pass.
- Unknown, ambiguous, malformed, or structurally conflicting authority forms fail closed.

The manifest contains process identity only. It does not contain Skill prose or become a second semantic source.

## 7. Git-native Merkle reconstruction

Do not require the historical baseline tree object or its child package objects to be present in the checkout merely to prove manifest self-consistency.

Before generating any `git mktree` input, strictly validate:

- every referenced SHA as lowercase 40-hex SHA-1;
- unique package names;
- the package-name grammar;
- deterministic canonical package-map structure;
- exact schema-v2 package-set identity, with no package addition, deletion, or rename.

The implementation constructs each `mktree` entry itself from validated fields using the literal form:

```text
040000 tree <sha>\t<package-name>
```

The authority file does not supply arbitrary Git mode text, object type text, or a preformatted `mktree` record.

Feed the deterministic entries to:

```text
git mktree --missing
```

`--missing` allows the Merkle tree identity to be reconstructed even when referenced child objects are unavailable in the shallow checkout. Git owns canonical tree encoding, ordering, and hash construction. Pryzael must not reimplement Git tree hashing in JavaScript.

The resulting SHA must equal `baseline.canonicalSkillTree`.

When a transition exists, derive the exact target package map, reconstruct it the same way, and require equality with `transition.targetCanonicalSkillTree`.

This simultaneously preserves checkout-depth independence and fail-closed manifest self-consistency.

## 8. HEAD semantic-authority states

`qualify:head-authority` evaluates only the current checkout and v2 manifest after raw duplicate rejection and schema/Merkle validation.

### STABLE

- `transition == null`;
- current package map equals the baseline package map;
- current `HEAD:skills` equals the baseline Skill tree.

### ARMED

- a transition exists;
- current package map/tree still exactly equals the baseline.

This is the expected state immediately after an authority-only pre-admission PR is merged and before its semantic candidate is applied.

### APPLIED

- a transition exists;
- current package map equals the mechanically derived target map;
- current `HEAD:skills` equals the declared target Skill tree.

No partial multi-package transition, undeclared mutation, third tree, package-set change, or malformed authority record is accepted.

The local HEAD validator may recognize STABLE, ARMED, and APPLIED because it lacks authoritative PR direction. Directionality and predecessor validity are owned by the PR-context gate.

## 9. PR transition discipline

An exact target hash is not an admission boundary if the same semantic PR can edit the Skill and the file that authorizes it. Semantic transitions therefore use a two-PR sequence, with separate machine-enforced handling for authority mutation, Skill mutation, maintenance, qualification-architecture repair, and the one-time bootstrap.

### 9.1 Ordinary authority-only PR — arm or rotate from a valid predecessor

For every ordinary post-v2 authority-only PR or epoch rotation, the PR-context gate must perform the following exact sequence:

1. load the BASE authority bytes from exact BASE;
2. reject raw duplicate members and parse/validate the BASE authority;
3. evaluate exact `BASE:skills`, package-tree map, and root Skill tree under that exact BASE authority;
4. require BASE to be one of the legal local states under that authority: STABLE, ARMED, or APPLIED;
5. require `BASE:skills == HEAD:skills` for the authority-only PR;
6. require the candidate authority baseline — complete package map and canonical Skill-tree root — to equal that exact already-validated BASE Skill/package/root state;
7. validate any candidate transition as an exact internally consistent pre-commitment from that validated baseline;
8. require candidate HEAD to evaluate to a legal state under the candidate authority.

The key security rule is:

```text
INVALID OR UNAUTHORIZED BASE UNDER OLD AUTHORITY
    + INTERNALLY CONSISTENT NEW BASELINE
    -> REJECT
```

A new authority may not launder an unauthorized Skill state by recentering its baseline around that state.

For an ordinary semantic admission PR, the changed semantic-authority artifact is the canonical `qualification/head-semantic-authority.json`; `skills/**` and qualification implementation code remain unchanged. Directly explanatory metadata may change only if its classification cannot obscure the authority transition.

### 9.2 Skill-only PR — apply the already armed transition

The semantic candidate PR must not modify the semantic-authority artifact.

For a Skill-changing PR:

- the authority artifact is byte-identical between exact BASE and HEAD;
- exact BASE evaluates as ARMED under that unchanged authority;
- candidate HEAD evaluates exactly as APPLIED;
- changed packages equal the transition's declared package set;
- each changed package moves exactly `fromTree -> toTree`;
- complete candidate `HEAD:skills` equals `targetCanonicalSkillTree`.

This rejects mixed authority + Skill self-authorization, unarmed mutation, partial application, alternate targets, reverse `target -> baseline` replay, and applying one transition twice from an already APPLIED base.

### 9.3 Maintenance PRs while STABLE, ARMED, or APPLIED

A non-semantic maintenance PR may preserve both authority and Skills unchanged.

In particular, maintenance while ARMED is valid and must not be forced to consume or clear the armed transition:

```text
valid ARMED BASE
    + unchanged authority
    + unchanged skills
    + non-semantic maintenance changes
    -> ACCEPT
```

The same principle applies to STABLE or APPLIED maintenance when the exact BASE and HEAD states remain valid and semantic authority/Skills are unchanged.

### 9.4 Epoch rotation

After an exact transition is adopted, maintenance PRs may continue while the manifest reports APPLIED.

Before another semantic phase, an authority-only PR may rotate the baseline to the currently adopted target and either set `transition: null` or arm the next exact transition. The rotation is subject to all predecessor-validity rules in section 9.1; it is not a special bypass.

No post-merge closure PR is required for every semantic change.

### 9.5 Qualification-architecture repair is not semantic authorization

After schema v2 is adopted, an ordinary qualification-architecture repair must satisfy all of the following:

- `skills/**` is unchanged between exact BASE and HEAD;
- semantic authority state and semantic permission are unchanged;
- it does not newly arm a transition;
- it does not replace an armed target;
- it does not retarget an existing transition;
- it does not clear or otherwise alter permission as a side effect of changing qualification implementation;
- it does not use changes to parser, state-machine, workflow, tests, package scripts, or related qualification code as a vehicle for semantic authorization.

Absent a separately approved authority-schema migration, the canonical authority artifact itself should remain unchanged for a qualification-architecture repair. If a future schema migration mechanically requires authority representation changes, that migration requires its own explicit design defining how semantic permission is proven invariant across representations.

The current v1 -> v2 migration described in this document is the one named bootstrap exception. It is not a reusable repair pattern.

### 9.6 Authority artifact identity and classification

The canonical semantic authority artifact has one authoritative repository path: `qualification/head-semantic-authority.json`.

PR classification must fail closed if the authority artifact is:

- deleted;
- renamed;
- replaced through an alternate path;
- duplicated by a second candidate authority artifact;
- obscured through mixed file changes intended to cause an authority mutation to be classified as ordinary maintenance or qualification implementation work.

Artifact identity checks are part of PR transition qualification, not prose-only repository convention.

### 9.7 Emergency semantic revert

A direct Skill PR from an APPLIED target back to the previous baseline is a reverse replay and must be rejected.

An intentional semantic revert requires a **new, separately pre-authorized exact reverse transition** whose baseline is the currently valid adopted state and whose exact target is the intended previous semantic tree. Operational urgency does not turn `target -> old baseline` into an implicitly authorized path.

## 10. PR-context qualification command

Add a narrow command, conceptually:

```text
npm run qualify:pr-transition -- <base-sha> <head-sha>
```

It owns base/candidate-pair facts that cannot be established from a local HEAD alone:

- exact BASE and HEAD artifact loading;
- exact diff classification;
- canonical authority-artifact identity;
- raw duplicate rejection for BASE and candidate authority bytes when relevant;
- BASE authority validation and predecessor-state validity;
- prohibition on mixed `skills/**` + authority mutation;
- authority-only baseline recentering only from exact validated BASE state;
- authority equality for Skill-only application;
- ARMED -> APPLIED proof;
- maintenance acceptance without consuming semantic permission;
- architecture-repair/semantic-permission separation;
- one-time bootstrap classification;
- one-way directionality and replay rejection.

It reuses v2 authority parser/state/Merkle functions rather than duplicating schema logic.

### 10.1 One-time v1 -> v2 R5 bootstrap rule

The implementation PR for this design is a one-time qualification-architecture migration exception because its exact BASE contains schema v1.

It may change the authority file, authority implementation, tests, workflow harness, package scripts, and qualification documentation together **only because `skills/**` remains unchanged throughout the migration and exact R5 identity is independently fixed by this design**.

The bootstrap gate must prove:

- exact BASE is the expected schema-v1 predecessor for this migration, not an arbitrary later v2 state;
- `BASE:skills` and `HEAD:skills` are identical to adopted R5 `c7bbb5757fe220da115617940bd007bab9397641`;
- candidate package map exactly equals the adopted R5 package map;
- candidate architect tree exactly equals `c58d60466b0b88594be0776390c9fe0efbe2b067`;
- candidate v2 baseline exactly equals that adopted R5 Skill tree/package map;
- candidate state is STABLE;
- candidate `transition` is exactly `null`;
- no reusable schema-v1 compatibility path remains after migration.

The lifecycle is one-way:

- exact one-time v1 -> v2 R5 bootstrap may pass;
- once the exact BASE authority is schema v2, the bootstrap exception is unavailable;
- v2 -> v1 downgrade fails;
- a bootstrap candidate with any non-R5 Skill/package/root identity fails;
- a bootstrap candidate ending with `transition != null` fails.

Any future authority-schema migration requires its own explicit design and cannot invoke this bootstrap rule.

## 11. Exact BASE fetch and execution model

### 11.1 `pull_request` qualification

The unified workflow uses the pull-request event's exact candidate and exact base pair.

Required algorithm:

1. exact-checkout `EXPECTED_SHA` shallowly;
2. prove `git rev-parse HEAD == EXPECTED_SHA`;
3. resolve event `BASE_SHA` from the pull-request event payload;
4. fetch/materialize that exact `BASE_SHA` only, using shallow/minimal history sufficient to make that exact commit available;
5. prove `BASE_SHA^{commit}` resolves exactly to the expected base commit;
6. run PR transition qualification against exactly `BASE_SHA -> EXPECTED_SHA`;
7. run current-HEAD qualification on exact `EXPECTED_SHA`.

If the exact event BASE SHA cannot be materialized, qualification fails closed.

The normal algorithm must not silently:

- fetch current moving `main` and substitute it for the event BASE;
- select a different merge-base;
- infer a convenient predecessor from repository history;
- fetch full history as the normal solution to exact-base materialization.

A deliberate diagnostic operation may fetch additional history outside the admission path, but normal PR admission authority remains the exact event pair.

### 11.2 `workflow_dispatch` qualification

`workflow_dispatch` has no authoritative PR base pair.

It therefore:

- resolves and exact-checks out the requested current HEAD;
- proves the exact HEAD SHA;
- runs current-HEAD qualification only;
- does not invent transition direction;
- does not synthesize a PR transition from a moving branch or guessed base.

## 12. Historical R1 applicability

Preserve historical R1 fixture/oracle code and regression tests.

`npm run qualify:r1:frozen` remains the explicit command for the claim:

> this artifact is identical to the historically qualified R1 artifact contract.

It is not a normal future HEAD acceptance gate.

Remove the current R1 workflow heuristic that automatically runs the frozen oracle for qualification-architecture-only changes. That applicability rule became invalid when R5 intentionally changed canonical Skill identity.

Normal tests continue proving that the historical oracle accepts the frozen identity and rejects provenance, plugin, Skill-tree, package, and generated-catalog drift.

When fresh public evidence for historical R1 identity is genuinely required, use an explicit evidence operation/harness bound to the exact historical artifact rather than silently applying the oracle to current R5+ HEAD.

## 13. Unified current-HEAD GitHub Actions harness

Replace the two drifting current-HEAD execution harnesses with one repository qualification workflow.

Because this workflow is intended to become a required merge status, it **must run for every pull request and must not use workflow-level path filtering**. The job may cheaply classify a PR as containing no semantic/authority transition work, but the required qualification status itself must materialize for every PR.

The workflow owns execution mechanics only:

1. trigger on `pull_request` and `workflow_dispatch`;
2. resolve exact `EXPECTED_SHA`;
3. exact shallow checkout of that SHA;
4. prove `git rev-parse HEAD == EXPECTED_SHA`;
5. set up pinned Node 22;
6. set up pinned Python 3.12;
7. for `pull_request`, materialize and prove the exact event `BASE_SHA` according to section 11;
8. for `pull_request`, run the PR transition-discipline command against exact `BASE_SHA -> EXPECTED_SHA`;
9. seed the stale dependency sentinel currently used by R1 qualification;
10. run canonical `npm run check`;
11. prove the deterministic lockfile install removed the stale sentinel.

Security properties remain:

- immutable full-SHA action pins;
- `pull_request` and `workflow_dispatch`, not `pull_request_target`;
- `contents: read`;
- no `allow-unsafe-pr-checkout` override;
- exact candidate checkout/proof remains mandatory;
- exact event-base proof is mandatory when PR context exists;
- Node and Python are explicit;
- the stale dependency sentinel remains;
- canonical `npm run check` remains the repository qualification command.

The workflow must not embed historical Skill identity rules or duplicate semantic-authority logic.

## 14. Repository command ownership

Keep contributor-facing command authority in `package.json`.

Normal repository qualification remains:

```text
npm run check
  -> qualify:head-authority
  -> qualify:r1
  -> qualify:r4-lab
```

The PR-only transition command is an additional artifact-pair gate used when an authoritative base SHA exists; it is not inserted into local `npm run check` because a local checkout does not necessarily have an authoritative PR base artifact.

The unified Actions harness composes exact PR-pair qualification and canonical current-HEAD qualification without moving semantic rules into YAML.

## 15. Required RED coverage

Implementation starts with failing tests for the new invariants. The following matrix is mandatory, not optional review guidance.

### 15.1 Merkle reconstruction and schema structure

- v2 baseline map reconstructs exact adopted R5 `skills/` tree;
- reconstruction succeeds in a synthetic shallow repository where baseline child objects are intentionally unavailable;
- changed package-map SHA or declared root fails;
- uppercase, non-hex, short, or long SHA fails;
- invalid package name fails;
- duplicate package name fails;
- non-deterministic/malformed package map fails;
- schema-v2 package addition fails;
- schema-v2 package deletion fails;
- schema-v2 package rename fails;
- authority-controlled arbitrary Git mode/type text is not accepted as `mktree` input.

### 15.2 Raw duplicate JSON members

Raw authority bytes must reject, before normalization:

- duplicate root field;
- duplicate `baseline` field/member;
- duplicate member/package name in `canonicalPackageTrees`;
- duplicate `transition` field/member;
- duplicate member in `packageTransitions`;
- duplicate `fromTree` field in a per-package transition object;
- duplicate `toTree` field in a per-package transition object;
- equivalent nested duplicate-member cases where parsed-object equality would otherwise hide the ambiguity.

### 15.3 HEAD states

- STABLE accepts exact baseline with `transition: null`;
- ARMED accepts baseline with a valid transition;
- APPLIED accepts only the complete exact target;
- undeclared mutation fails;
- alternate target fails;
- partial multi-package application fails;
- top-level package add/delete/rename fails.

### 15.4 Predecessor validity and PR directionality

Synthetic Git histories prove:

- authority-only arm with exact valid BASE and unchanged Skills passes;
- authority rotation from exact valid STABLE BASE passes when candidate baseline equals validated BASE state;
- authority rotation from exact valid ARMED BASE may pass only when semantic permission change is itself the intended authority-only operation and candidate baseline still equals validated BASE Skill/package/root state;
- authority rotation from exact valid APPLIED BASE passes when candidate baseline equals validated applied state;
- invalid/unauthorized BASE Skill state under BASE authority + authority-only PR proposing an internally consistent new baseline fails;
- mixed authority + Skill mutation fails;
- Skill mutation with no armed transition fails;
- unchanged authority + exact ARMED baseline -> target passes;
- baseline -> alternate target fails;
- target -> baseline reverse replay fails;
- APPLIED base -> second application fails;
- candidate baseline differing from the exact validated BASE Skill/package/root state fails.

### 15.5 Maintenance while ARMED

- unchanged authority + unchanged Skills + valid ARMED BASE/HEAD maintenance PR accepts;
- maintenance must not consume, clear, replace, or retarget the armed transition;
- equivalent unchanged semantic maintenance from valid STABLE or APPLIED states accepts.

### 15.6 Architecture repair versus semantic authorization

- post-v2 qualification implementation change + newly armed transition fails;
- post-v2 qualification implementation change + replaced armed target fails;
- post-v2 qualification implementation change + retargeted transition fails;
- post-v2 qualification implementation change + otherwise changed semantic permission fails;
- qualification implementation change with unchanged `skills/**` and unchanged semantic authority/permission passes;
- any future schema migration path is unavailable unless explicitly implemented under a separately approved design.

### 15.7 Bootstrap lifecycle

- exact one-time v1 -> v2 R5 bootstrap accepts;
- v2 BASE attempting to invoke bootstrap exception again fails;
- v2 -> v1 downgrade fails;
- bootstrap with non-R5 Skill tree fails;
- bootstrap with non-R5 package map or architect tree fails;
- bootstrap ending with `transition != null` fails;
- no reusable v1 compatibility route remains after v2 adoption.

### 15.8 Authority artifact identity

- canonical authority file deleted fails;
- canonical authority file renamed fails;
- replacement through alternate path fails;
- second/duplicate authority artifact fails;
- mixed authority-artifact classification trick fails;
- Skill-only PR changing authority bytes by any route fails.

### 15.9 Emergency revert

- direct APPLIED target -> previous baseline Skill PR fails;
- exact newly armed reverse transition from the current adopted baseline to the intended previous semantic tree can pass only through the normal separate authority-only then Skill-only sequence.

### 15.10 Historical/current separation

- existing frozen-R1 oracle tests remain intact;
- current R5 HEAD qualification does not invoke historical frozen identity as a normal applicability gate;
- current `npm run check` is green under R5 baseline.

### 15.11 Workflow contract and exact BASE fetch

Focused assertions prove:

- one current-HEAD qualification harness owns the full chain;
- workflow triggers on every pull request without workflow-level path filtering;
- `workflow_dispatch` remains available;
- exact candidate checkout proof remains;
- exact PR event BASE SHA is materialized and proved before PR-transition qualification;
- inability to materialize exact BASE fails closed;
- moving `main` is not substituted for event BASE;
- alternate merge-base is not substituted for event BASE;
- full-history fetch is not the normal admission solution;
- dispatch does not invent transition direction;
- Node and Python are explicit;
- stale dependency sentinel remains;
- token permission is read-only;
- privileged checkout triggers/unsafe override are absent;
- obsolete automatic frozen-R1 heuristic is absent.

## 16. Expected implementation surface

The implementation repair is expected to touch only the qualification architecture and documentation needed to realize this design, including:

- `qualification/head-semantic-authority.json` — one-time v1 -> v2 R5 epoch migration;
- `scripts/qualify_head_semantic_authority.mjs` — raw duplicate rejection, v2 schema/state/Merkle verification;
- one small PR transition-discipline script reusing authority logic;
- `tests/qualification-gates.test.mjs` and focused workflow-contract tests as needed;
- `package.json` for the PR-context command;
- current-HEAD GitHub Actions workflow consolidation;
- `docs/PROTOCOL.md`, `docs/DEVELOPMENT.md`, and `ARCHITECTURE.md` for lifecycle/ownership documentation.

Workflow consolidation belongs in the **same implementation repair PR** as Semantic Authority v2. Splitting authority v2 from the harness repair would create an intermediate repository state in which the adopted authority and CI execution model are not the jointly qualified system.

The repair must not touch:

- `skills/**`;
- R5 semantic content;
- R4 evaluation contract/corpus/admission semantics;
- hidden R4C material;
- frozen R1 contract semantics;
- Dependabot major-version updates themselves.

## 17. Migration sequence

1. Bind the implementation repair to the exact current `main` and adopted R5 content identity.
2. Add mandatory RED tests for raw duplicate rejection, v2 self-consistency, Merkle reconstruction, shallow-history independence, exact states, predecessor validity, artifact identity, repair/semantic separation, replay rejection, bootstrap lifecycle, maintenance while ARMED, and exact-base workflow behavior.
3. Implement raw duplicate-member detection before ordinary authority normalization.
4. Implement v2 authority parsing/state validation and `git mktree --missing` reconstruction using strictly validated SHA/package data and implementation-constructed literal tree entries.
5. Implement exact BASE/HEAD PR transition discipline, including predecessor validation and canonical authority-artifact identity.
6. Migrate authority baseline from frozen R4 to exact adopted R5 with candidate state STABLE and `transition: null` under the one-time bootstrap.
7. Consolidate duplicate R1/R4 current-HEAD harnesses into one every-PR workflow; remove workflow-level path filtering and the obsolete automatic frozen-R1 applicability logic.
8. Implement exact event BASE SHA materialization/proof for PR events and current-HEAD-only behavior for dispatch.
9. Update protocol/development/architecture documentation.
10. Run focused v2 tests and full repository qualification.
11. Obtain exact-head public CI and independent adversarial review of authority/security boundaries.
12. Merge only the exact qualified implementation repair head.
13. After the unified qualification status is stable, configure separate main-branch ruleset/protection requiring that exact status.
14. Rebase/recreate checkout-v7 maintenance PR #16 on repaired main and qualify fresh; then process setup-node #14 and setup-python #15 sequentially against each newly adopted main.

## 18. Track D boundary and follow-up work

Do not mix production/MCP hardening or repository-policy implementation into this Semantic Authority v2 design/implementation repair.

Specifically excluded from PR #20 and from the Semantic Authority v2 implementation repair are:

- main ruleset implementation;
- Origin/Host MCP edge validation;
- request-size limit;
- rate limiter;
- MCP 2026-07-28 runtime conformance;
- deployment identity;
- `.node-version`;
- `.env*` / `.dev.vars*` handling.

These are separate follow-up maintenance tracks.

The only relationship to this design is that, after the unified qualification status name and behavior are stable, that exact status may become a required `main` ruleset check.

Repository rulesets are currently absent. Direct main writes observed during orchestration demonstrated a real control-plane gap, but repository-policy mutation must not be folded into the authority implementation repair. A later ruleset/branch-protection change should require the normal PR path and unified qualification check for `main`, with bypass policy explicitly reviewed.

## 19. Alternatives rejected

### A. Add `fetch-depth: 0` only to R4 and conditionally skip frozen R1

Rejected: fixes the immediate symptom while retaining open-ended `architect` admission, duplicated CI harnesses, and full-history coupling.

### B. Rotate baseline to R5 but keep package-name admission

Rejected: still grants future permission to a package rather than one exact candidate target.

### C. Trust package-tree map without reconstructing declared root

Rejected: weakens the later fail-closed baseline-authenticity hardening and allows inconsistent authority metadata to become self-authenticating.

### D. Always fetch full history

Rejected as the governing repair: simple operationally but makes current qualification depend on unrelated history availability rather than exact Merkle material needed by the claim.

### E. Validate only the candidate authority during rotation

Rejected: an internally consistent new authority could recenter around an unauthorized predecessor and launder invalid Skill state.

### F. Use ordinary `JSON.parse()` then check the parsed object

Rejected: duplicate raw members can be collapsed before validation, erasing ambiguity evidence.

### G. Permit qualification-architecture repair to alter semantic permission when convenient

Rejected: this couples authority meaning to its verifier implementation and recreates a self-authorization channel.

### H. Path-filter the unified required workflow

Rejected: a required merge status must materialize for every PR; workflow-level filtering can leave the required status unresolved.

### I. Semantic Authority v2 + exact pre-armed transition + predecessor validity + strict raw JSON + Git Merkle reconstruction

Selected: preserves fail-closed Git identity, removes arbitrary history coupling, prevents self-authorization and predecessor laundering, rejects ambiguous raw authority syntax, separates semantic permission from qualification repair, closes reverse/replay cases, and makes semantic-phase lifecycle explicit without a new external authority service or supply-chain framework.

## 20. Implementation acceptance criteria

The implementation repair is complete only when all of the following are evidenced together:

- exact implementation HEAD SHA is recorded;
- exact repository tree SHA is recorded;
- focused v2 parser/raw-duplicate/Merkle/state/transition/predecessor tests pass;
- full canonical `npm run check` passes;
- unified exact-head GitHub Actions qualification succeeds;
- exact implementation `HEAD:skills` equals `c7bbb5757fe220da115617940bd007bab9397641`;
- exact implementation architect tree equals `c58d60466b0b88594be0776390c9fe0efbe2b067`;
- there is no `skills/**` diff;
- candidate v2 bootstrap ends at exact adopted R5 baseline, STABLE, `transition: null`;
- corrupt or duplicate-member authority input fails closed before normalization where applicable;
- authority rotation cannot recenter around an invalid predecessor;
- semantic admission is exact-target-bound rather than package-name-open-ended;
- same-PR authority + Skill self-authorization is rejected;
- transition application is one-way ARMED -> exact APPLIED;
- reverse/replay/partial/alternate targets fail;
- post-v2 qualification implementation changes cannot arm, replace, or retarget semantic permission;
- maintenance while ARMED with unchanged authority/Skills is accepted;
- exact PR event BASE SHA is used and inability to materialize it fails closed;
- the unified workflow runs for every pull request without workflow-level path filtering;
- historical frozen-R1 oracle/tests remain intact and separately executable;
- historical frozen-R1 identity is no longer automatically misapplied to current R5+ HEAD;
- one current-HEAD workflow supplies consistent Node/Python/exact-head/security setup for canonical qualification;
- PR #16 remains OPEN / UNMERGED throughout repair adoption;
- independent post-implementation adversarial review finds no silent gate weakening, predecessor laundering, parser ambiguity, repair/semantic coupling, or second semantic authority;
- after merge, checkout-v7 maintenance can be requalified without the historical-history-availability blocker.

## 21. Architectural result

Semantic Authority v2 changes the governing question from:

> Is this package name generally admitted to differ from an old baseline?

into:

> Is the exact predecessor already valid under its exact authority, and does this exact base semantic epoch, under a separately pre-authorized and reviewable transition, move exactly and one-way to this one target canonical Skill tree without ambiguous authority syntax or qualification-repair self-authorization?

That claim matches Pryzael's exact-artifact model and provides the intended foundation for post-R5 maintenance and any later evidence-justified semantic phase.
