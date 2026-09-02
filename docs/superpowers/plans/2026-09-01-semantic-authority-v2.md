# Semantic Authority v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Pryzael's schema-v1 open-ended package admission with exact Semantic Authority v2, exact BASE→HEAD transition qualification, Git-native Merkle reconstruction, and one stable current-HEAD GitHub Actions qualification status without modifying `skills/**`.

**Architecture:** Split security-critical authority handling into three focused reusable layers: strict raw JSON parsing, pure Semantic Authority v2 validation/state classification, and Git-backed exact-commit artifact/state/Merkle operations. The Git layer keeps text-oriented Git metadata handling separate from raw-buffer blob handling so canonical authority bytes remain byte-exact from `git cat-file blob` through the strict parser boundary. Keep `scripts/qualify_head_semantic_authority.mjs` as the current-HEAD command adapter and add `scripts/qualify_pr_transition.mjs` as the pairwise PR adapter; both reuse the same authority model and Git functions. Replace the two current R1/R4 Actions harnesses with one every-PR workflow whose stable future required-check name is **`Pryzael current HEAD qualification`**.

**Tech Stack:** Node.js 22 ESM, `node:test`, native `fs`/`child_process`, Git CLI including `git mktree --missing`, GitHub Actions, Python 3.12 for existing R1 qualification. No new npm dependency.

**Spec:** `docs/superpowers/specs/2026-09-01-semantic-authority-v2-design.md`

## Global Constraints

* Planning authority and exact implementation base: `bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c`.
* Planning tree and exact implementation-base tree: `3965570ef7f45ec39869dc9bd46e1c814a9088cb`.
* Implementation execution is authorized only from that exact commit/tree pair. Before Task 1 begins, the executor must prove:

  ```bash
  test "$(git rev-parse HEAD)" = "bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c"
  test "$(git rev-parse HEAD^{tree})" = "3965570ef7f45ec39869dc9bd46e1c814a9088cb"
  ```

  If either command fails, STOP. The project Orchestrator must explicitly inspect the new repository state and rebind or re-review implementation authority before execution. No docs-only exception, content-tree equivalence, semantic-equivalence rule, ancestor/descendant allowance, or planner-created “safe later commit” rule may substitute for the exact base.
* Adopted canonical `skills/` tree must remain `c7bbb5757fe220da115617940bd007bab9397641`.
* Adopted `skills/architect` tree must remain `c58d60466b0b88594be0776390c9fe0efbe2b067`.
* Current schema-v1 predecessor authority blob is `b48fc1afc23ea8050638140dba1804d4075ea7cb`.
* Do not modify any path below `skills/**`.
* Do not modify R4 evaluation contract/corpus/admission semantics.
* Do not modify frozen-R1 fixture semantics.
* Do not add MCP/runtime production hardening.
* Do not process maintenance/Dependabot PRs.
* Do not configure Stage-2 repository rulesets.
* Do not add a third-party JSON parser.
* `npm run check` remains ordered as `qualify:head-authority` → `qualify:r1` → `qualify:r4-lab`.
* `qualify:pr-transition` remains a PR-pair command and is not inserted into local `npm run check`.
* Post-v2 qualification-architecture classification is conservative and surface-based. Except for the canonical semantic authority artifact identified separately below, changes under any of these repository surfaces are qualification-architecture changes:

  ```text
  scripts/**
  tests/**
  .github/workflows/**
  qualification/**
  package.json
  package-lock.json
  ```

  The canonical path:

  ```text
  qualification/head-semantic-authority.json
  ```

  is classified first and separately as the semantic authority artifact and is not double-counted as generic qualification implementation merely because it lives under `qualification/**`.

  Documentation files alone are not qualification implementation.

  For an ordinary post-v2 authority admission/rotation, canonical authority change plus any generic qualification-architecture change is rejected unless a separately designed schema migration explicitly permits that combination. The exact one-time R5 v1 → v2 bootstrap in Task 8 is the sole named exception in this implementation.

---

## Current Repository Mapping

Existing ownership relevant to this implementation:

* `qualification/head-semantic-authority.json`

  * schema v1;
  * historical R4 baseline;
  * persistent `architect` package-name admission;
  * exact current Git blob at the planning base: `b48fc1afc23ea8050638140dba1804d4075ea7cb`.
* `scripts/qualify_head_semantic_authority.mjs`

  * currently combines schema parsing, package validation, Git baseline dereference, current-tree inspection, and admission logic.
* `scripts/deterministic_order.mjs`

  * already owns `ordinalCompare()`;
  * Semantic Authority v2 should import this directly rather than depending on R1 for ordering;
  * any future change to this file is automatically a qualification-architecture change because all `scripts/**` are governed.
* `scripts/r1_qualification_invariants.mjs`

  * imports/re-exports `ordinalCompare()`;
  * owns frozen R1 identity and remains intact.
* `scripts/qualify_r1.mjs`

  * current/frozen R1 modes remain intact.
* `scripts/validate_r4_lab.mjs`

  * remains the R4 command adapter and requires no semantic-authority changes.
* `tests/qualification-gates.test.mjs`

  * currently owns frozen-R1 regressions plus schema-v1 HEAD-authority synthetic-Git tests.
* `.github/workflows/r1-qualification.yml`

  * full-history checkout;
  * explicit Node/Python;
  * stale sentinel;
  * automatic frozen-R1 qualification heuristic.
* `.github/workflows/r4-lab-qualification.yml`

  * shallow checkout;
  * Node only;
  * duplicates `npm run check`.
* `docs/PROTOCOL.md`, `docs/DEVELOPMENT.md`, `ARCHITECTURE.md`

  * still describe the schema-v1 package-admission lifecycle and must be migrated after code behavior is green.

## File / Interface Structure

### Create

`script/strict_json.mjs` is **not** used; the exact created path is:

* `scripts/strict_json.mjs`

  * strict UTF-8 decoding;
  * recursive JSON structural scan;
  * duplicate object-member rejection before whole-document `JSON.parse()`.
  * Export:

    ```js
    parseJsonRejectingDuplicateMembers(rawBytes, { label = "JSON" } = {})
    ```

* `scripts/semantic_authority.mjs`

  * pure schema-v2 rules;
  * exact object-key validation;
  * SHA/package grammar;
  * deterministic maps;
  * derived target package map;
  * STABLE/ARMED/APPLIED classification.
  * Exports:

    ```js
    parseAndValidateSemanticAuthorityV2(rawBytes)
    validateSemanticAuthorityV2(value)
    validateCanonicalPackageTreeMap(value, { context })
    deriveTargetCanonicalPackageTrees(authority)
    classifySemanticAuthorityState({ model, observed })
    ```

  Model shape:

  ```js
  {
    authority: {
      schemaVersion: 2,
      baseline: {
        canonicalSkillTree: string,
        canonicalPackageTrees: Record<string, string>
      },
      transition: null | {
        id: string,
        targetCanonicalSkillTree: string,
        packageTransitions: Record<string, {
          fromTree: string,
          toTree: string
        }>
      }
    },
    targetCanonicalPackageTrees: Record<string, string> | null
  }
  ```

  Observed state shape:

  ```js
  {
    canonicalSkillTree: string,
    canonicalPackageTrees: Record<string, string>
  }
  ```

* `scripts/semantic_authority_git.mjs`

  * reusable exact-Git boundary;
  * separates text Git metadata output from raw blob payload output;
  * never converts canonical authority blob bytes to a JavaScript string before `scripts/strict_json.mjs`.
  * Exports:

    ```js
    reconstructCanonicalSkillTree({ cwd, canonicalPackageTrees })
    assertAuthorityMerkleConsistency({ cwd, model })
    readCanonicalSkillStateAtCommit({ cwd, commit })
    readAuthorityArtifactAtCommit({ cwd, commit })
    assertExactCommitAvailable({ cwd, commit })
    ```

  Exact contracts:

  ```js
  assertExactCommitAvailable({ cwd, commit }) -> string
  ```

  returns the proven exact lowercase 40-hex commit SHA and accepts only an exact requested SHA, never a moving ref.

  ```js
  readAuthorityArtifactAtCommit({ cwd, commit }) -> {
    bytes: Buffer,
    blobSha: string
  }
  ```

  `bytes` is the exact output of `git cat-file blob <blob-sha>` with no text normalization or decoding.

* `scripts/qualify_pr_transition.mjs`

  * exact BASE/HEAD diff, canonical artifact identity, qualification-surface classification and directionality.
  * Exports:

    ```js
    classifyPrDiff({ cwd, baseSha, headSha })
    assertCanonicalAuthorityArtifactIdentity({ cwd, baseSha, headSha })
    qualifyPrTransition({ cwd, baseSha, headSha })
    ```

  * CLI:

    ```text
    node scripts/qualify_pr_transition.mjs <base-sha> <head-sha>
    ```

* `tests/semantic-authority-v2.test.mjs`

  * raw parser, manifest, exact Git artifact observation, Merkle and HEAD-state ownership.

* `tests/pr-transition-qualification.test.mjs`

  * BASE/HEAD transition, qualification-surface classification, predecessor, artifact identity, architecture-repair and bootstrap ownership.

* `tests/qualification-workflow-contract.test.mjs`

  * GitHub Actions execution-contract ownership.

* `tests/fixtures/semantic-authority-v1-r5-bootstrap.json`

  * exact historical bytes copied from the current canonical schema-v1 bootstrap predecessor before Task 9 changes that artifact;
  * its Git blob must equal `b48fc1afc23ea8050638140dba1804d4075ea7cb`;
  * never consumed by normal v2 current-HEAD qualification;
  * not part of a reusable schema-v1 fixture family.

* `.github/workflows/current-head-qualification.yml`

  * single every-PR/dispatch harness.

### Modify

* `scripts/qualify_head_semantic_authority.mjs`
* `qualification/head-semantic-authority.json`
* `package.json`
* `tests/qualification-gates.test.mjs`
* `docs/PROTOCOL.md`
* `docs/DEVELOPMENT.md`
* `ARCHITECTURE.md`

### Delete

* `.github/workflows/r1-qualification.yml`
* `.github/workflows/r4-lab-qualification.yml`

### Explicitly leave unchanged

* `skills/**`
* `scripts/qualify_r1.mjs`
* `scripts/r1_qualification_invariants.mjs`
* `scripts/validate_r4_lab.mjs`
* `scripts/deterministic_order.mjs`
* `tests/structural-conformance.test.mjs`
* `tests/r4-lab.test.mjs`
* `tests/r4-lab-comparison-completeness.test.mjs`
* `package-lock.json`

The files above are unchanged by this implementation even when they lie under a governed qualification surface. The surface rule describes how future PR changes are classified; it does not require this implementation to modify every governed file.

---

## Mandatory Test Matrix Ownership

| Requirement | Owning test file | Task |
| --- | --- | ---: |
| duplicate root/baseline/package/transition/packageTransitions/fromTree/toTree | `tests/semantic-authority-v2.test.mjs` | 1 |
| valid stable v2 and all manifest structural failures | `tests/semantic-authority-v2.test.mjs` | 2 |
| exact commit identity and raw authority blob byte preservation | `tests/semantic-authority-v2.test.mjs` | 3 |
| final-newline/no-final-newline/invalid-UTF-8 Git artifact observation | `tests/semantic-authority-v2.test.mjs` | 3 |
| exact returned authority blob SHA | `tests/semantic-authority-v2.test.mjs` | 3 |
| baseline/target root mismatch | `tests/semantic-authority-v2.test.mjs` | 3 |
| `git mktree --missing` without child objects | `tests/semantic-authority-v2.test.mjs` | 3 |
| STABLE / ARMED / APPLIED and invalid HEAD states | `tests/semantic-authority-v2.test.mjs` | 4 |
| canonical authority deletion/rename/non-blob/duplicate-byte-copy/mixed bypass | `tests/pr-transition-qualification.test.mjs` | 5 |
| same-path authority replacement classified as authority change | `tests/pr-transition-qualification.test.mjs` | 5 |
| unrelated same-basename different-content documentation is not globally forbidden | `tests/pr-transition-qualification.test.mjs` | 5 |
| broad `scripts/**` / `tests/**` / workflow / qualification / package classification | `tests/pr-transition-qualification.test.mjs` | 5 |
| future arbitrary helper under `scripts/**` automatically classifies as qualification implementation | `tests/pr-transition-qualification.test.mjs` | 5 |
| authority-only arm/rotation and predecessor laundering | `tests/pr-transition-qualification.test.mjs` | 6 |
| architecture repair + arm/retarget | `tests/pr-transition-qualification.test.mjs` | 6 |
| authority change + `scripts/deterministic_order.mjs` change rejection | `tests/pr-transition-qualification.test.mjs` | 6 |
| authority change + newly introduced arbitrary `scripts/**` helper rejection | `tests/pr-transition-qualification.test.mjs` | 6 |
| unchanged authority/Skills + legal qualification repair acceptance | `tests/pr-transition-qualification.test.mjs` | 6 |
| no self-authorization and ARMED → APPLIED | `tests/pr-transition-qualification.test.mjs` | 7 |
| alternate/partial/extra/replay/reverse | `tests/pr-transition-qualification.test.mjs` | 7 |
| maintenance while ARMED | `tests/pr-transition-qualification.test.mjs` | 7 |
| exact-blob-first one-time v1 → v2 bootstrap matrix | `tests/pr-transition-qualification.test.mjs` | 8 |
| actual R5 v2 manifest/current HEAD command | `tests/qualification-gates.test.mjs` + focused tests | 9 |
| frozen-R1 separation and unified workflow | `tests/qualification-workflow-contract.test.mjs` | 10 |
| exact BASE workflow contract | `tests/qualification-workflow-contract.test.mjs` | 10 |

---

### Task 1: Strict Raw Authority JSON Parser

**Files:**

* Create: `scripts/strict_json.mjs`
* Create: `tests/semantic-authority-v2.test.mjs`

**Interfaces:**

* Produces:

  ```js
  parseJsonRejectingDuplicateMembers(rawBytes, { label = "JSON" } = {}) -> unknown
  ```

* `rawBytes` must be `Buffer`/`Uint8Array`, not a previously parsed object.

* [ ] **Step 1: Write raw duplicate RED tests**

Add named tests for:

```text
strict authority JSON rejects duplicate root member
strict authority JSON rejects duplicate baseline member
strict authority JSON rejects duplicate canonical package member
strict authority JSON rejects duplicate transition member
strict authority JSON rejects duplicate packageTransitions member
strict authority JSON rejects duplicate fromTree member
strict authority JSON rejects duplicate toTree member
strict authority JSON treats escaped-equivalent member names as duplicates
```

The escaped-equivalent case must include two keys equivalent after JSON string decoding, such as `"architect"` and `"\u0061rchitect"`.

* [ ] **Step 2: Run RED**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: FAIL because `scripts/strict_json.mjs` / `parseJsonRejectingDuplicateMembers` does not exist.

* [ ] **Step 3: Implement the focused parser**

Use `TextDecoder("utf-8", { fatal: true })` so invalid UTF-8 cannot be silently replaced.

Implement a recursive structural scanner with these internal responsibilities:

```js
parseValue()
parseObject()
parseArray()
parseStringToken()
parseNumberToken()
skipWhitespace()
expectKeyword()
```

`parseObject()` must keep a fresh `Set` of decoded member names per object. Decode each complete JSON string token before inserting it into the set. Throw immediately on a duplicate.

Only after the recursive scan reaches the end of the document without duplicate members call whole-document `JSON.parse(text)` and return the resulting value.

Do not normalize the complete object before the duplicate check.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: all Task-1 tests PASS.

* [ ] **Step 5: Commit**

```bash
git add scripts/strict_json.mjs tests/semantic-authority-v2.test.mjs
git commit -m "feat: add strict authority JSON parsing"
```

---

### Task 2: Semantic Authority v2 Manifest Model

**Files:**

* Create: `scripts/semantic_authority.mjs`
* Modify: `tests/semantic-authority-v2.test.mjs`

**Interfaces:**

* Consumes `parseJsonRejectingDuplicateMembers()`.

* Produces:

  ```js
  parseAndValidateSemanticAuthorityV2(rawBytes)
  validateSemanticAuthorityV2(value)
  validateCanonicalPackageTreeMap(value, { context })
  deriveTargetCanonicalPackageTrees(authority)
  classifySemanticAuthorityState(...) // exported now, implemented in Task 4
  ```

* [ ] **Step 1: Add manifest RED tests**

Add tests named:

```text
v2 stable R5 manifest validates
v2 manifest rejects unsupported schema
v2 manifest rejects malformed SHA-1
v2 manifest rejects invalid package name
v2 manifest rejects unsorted baseline package map
v2 manifest rejects empty baseline package map
v2 manifest rejects non-object transition
v2 manifest rejects empty transition id
v2 manifest rejects empty packageTransitions
v2 manifest rejects unknown transition package
v2 manifest rejects fromTree mismatch
v2 manifest rejects unchanged fromTree and toTree
v2 manifest rejects unsorted packageTransitions
v2 manifest rejects unknown structural fields
v2 manifest derives exact target package map
```

Malformed SHA coverage must include uppercase, non-hex, 39-character and 41-character forms.

Use the existing package grammar exactly:

```js
/^[a-z0-9]+(?:-[a-z0-9]+)*$/
```

* [ ] **Step 2: Run RED**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: FAIL because the v2 model functions are missing.

* [ ] **Step 3: Implement exact schema validation**

Require exact object-member sets:

```text
root:
  schemaVersion
  baseline
  transition

baseline:
  canonicalSkillTree
  canonicalPackageTrees

transition:
  id
  targetCanonicalSkillTree
  packageTransitions

each package transition:
  fromTree
  toTree
```

Reject extra fields rather than ignoring them.

Require:

* `schemaVersion === 2`;
* lowercase 40-hex SHA-1 everywhere;
* non-empty baseline package map;
* insertion order exactly equal to `ordinalCompare` order;
* valid package grammar;
* transition `null` or one object;
* `id` is a string with `id.trim().length > 0`;
* non-empty `packageTransitions`;
* transitioned package exists in baseline;
* `fromTree === baseline.canonicalPackageTrees[name]`;
* `toTree !== fromTree`;
* deterministic transition-key ordering.

Derive target map by replacing only declared package entries. Never accept an authority-supplied complete target map.

Import `ordinalCompare` directly from:

```text
scripts/deterministic_order.mjs
```

Do not import ordering through the R1 module.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: Task-1 and Task-2 cases PASS.

* [ ] **Step 5: Commit**

```bash
git add scripts/semantic_authority.mjs tests/semantic-authority-v2.test.mjs
git commit -m "feat: model semantic authority v2"
```

---

### Task 3: Exact Git Artifact Observation and Git-Native Merkle Reconstruction

**Files:**

* Create: `scripts/semantic_authority_git.mjs`
* Modify: `tests/semantic-authority-v2.test.mjs`

**Interfaces:**

* Consumes validated package maps from Task 2.

* Produces:

  ```js
  reconstructCanonicalSkillTree({ cwd, canonicalPackageTrees }) -> string
  assertAuthorityMerkleConsistency({ cwd, model }) -> model
  readCanonicalSkillStateAtCommit({ cwd, commit }) -> {
    canonicalSkillTree,
    canonicalPackageTrees
  }
  readAuthorityArtifactAtCommit({ cwd, commit }) -> {
    bytes: Buffer,
    blobSha: string
  }
  assertExactCommitAvailable({ cwd, commit }) -> string
  ```

`assertExactCommitAvailable()` accepts an exact requested lowercase 40-hex commit SHA and returns that same SHA only after proving it exactly.

`readAuthorityArtifactAtCommit()` accepts only an exact commit SHA and preserves canonical authority payload bytes byte-for-byte.

* [ ] **Step 1: Write exact-Git and Merkle RED tests**

Add tests:

```text
exact commit availability returns only the requested exact SHA
exact commit availability rejects malformed or unavailable commit identity
authority artifact reader returns exact blob bytes unchanged
authority artifact reader preserves final newline
authority artifact reader does not add a missing final newline
authority artifact reader preserves invalid UTF-8 bytes before strict parsing
authority artifact reader returns exact Git blob identity
R5 package map reconstructs exact adopted Skill root
Merkle reconstruction works with historical child objects absent
corrupted baseline map fails declared baseline root
corrupted transition target fails declared target root
Merkle input rejects package-name record injection
```

For exact-commit failure coverage, include:

* a moving ref such as `HEAD` passed directly to `assertExactCommitAvailable()`;
* a malformed SHA;
* a well-formed lowercase 40-hex SHA not available in the repository;
* any resolved output mismatch.

For raw artifact coverage, create synthetic commits whose exact canonical authority blobs contain:

1. known valid bytes ending with `\n`;
2. known valid bytes with no final newline;
3. a `Buffer` containing invalid UTF-8 such as `0xff`.

Require `readAuthorityArtifactAtCommit()` to return bytes exactly equal to the bytes committed in each case.

For the invalid UTF-8 case:

1. prove the Git reader returns the raw bytes unchanged;
2. pass those returned bytes to `parseJsonRejectingDuplicateMembers()`;
3. require fatal UTF-8 decoding to reject them.

Do not move raw duplicate detection out of Task 1.

For the absence test:

1. `git init --object-format=sha1` a fresh temporary repository.
2. Prove `git cat-file -e c58d60466b0b88594be0776390c9fe0efbe2b067` fails.
3. Reconstruct from the complete adopted R5 package map.
4. Expect exactly:

   ```text
   c7bbb5757fe220da115617940bd007bab9397641
   ```

* [ ] **Step 2: Run RED**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: FAIL because exact Git artifact observation and Git reconstruction functions are absent.

* [ ] **Step 3: Implement exact commit and raw artifact boundaries**

Implement separate internal subprocess helpers for Git metadata text and raw Git payloads.

Text-oriented Git metadata commands may decode stdout as UTF-8 only after Git has produced the command result, and their outputs must be validated against exact ASCII-format expectations.

The raw blob helper must invoke Git without a shell interpolation boundary and without a text encoding option, for example with `execFileSync()`/`spawnSync()` arguments passed as an argv array and raw stdout returned as `Buffer`.

Do not route `git cat-file blob` through the text helper.

Implement:

```js
assertExactCommitAvailable({ cwd, commit }) -> string
```

with:

```bash
git rev-parse --verify <commit>^{commit}
```

Requirements:

1. reject `commit` unless the requested value itself is exactly lowercase 40-hex SHA-1;
2. execute Git with argv arguments, not shell interpolation;
3. obtain the resolved output;
4. require exactly one lowercase 40-hex SHA-1 after removal of Git's single line terminator from this metadata output;
5. require the resolved SHA to equal the requested exact commit SHA;
6. fail closed on command failure, ambiguity, malformed output or mismatch;
7. return the proven exact SHA.

Do not accept or silently resolve a branch, tag, `HEAD`, or other moving ref as equivalent to an externally requested exact commit.

Implement:

```js
readAuthorityArtifactAtCommit({ cwd, commit }) -> {
  bytes: Buffer,
  blobSha: string
}
```

with this exact sequence:

1. call `assertExactCommitAvailable({ cwd, commit })`;
2. resolve the canonical authority artifact with:

   ```bash
   git rev-parse <exact-commit>:qualification/head-semantic-authority.json
   ```

3. validate metadata output as exactly one lowercase 40-hex object SHA;
4. read the exact object with:

   ```bash
   git cat-file blob <blob-sha>
   ```

5. return exactly:

   ```js
   {
     bytes: Buffer,
     blobSha: string
   }
   ```

`git cat-file blob` command failure must fail closed, including when the canonical path resolves to a non-blob object.

Before `bytes` reaches the strict raw JSON parser, do not:

* trim;
* normalize CRLF/LF;
* strip a final newline;
* append a final newline;
* decode with replacement semantics;
* reserialize;
* parse JSON;
* stringify;
* otherwise mutate the authority bytes.

The strict parser owns the first UTF-8 decoding of canonical authority payload bytes.

`readCanonicalSkillStateAtCommit()` must first prove the exact commit with `assertExactCommitAvailable()`, then obtain the exact tree through Git:

```bash
git rev-parse <exact-commit>:skills
git ls-tree <exact-commit>:skills
```

and reject any top-level entry not matching:

```text
040000 tree <40-lowercase-hex>\t<valid-package-name>
```

For each already validated package entry, `reconstructCanonicalSkillTree()` constructs only:

```text
040000 tree <sha>\t<package-name>
```

Join entries with `\n`, terminate input with `\n`, and invoke:

```bash
git mktree --missing
```

Do not accept authority-provided mode, object type, tabs, newline records, or preformatted tree lines.

`assertAuthorityMerkleConsistency()` must:

1. reconstruct baseline map;
2. require result equals `baseline.canonicalSkillTree`;
3. if transition exists, reconstruct `targetCanonicalPackageTrees`;
4. require result equals `transition.targetCanonicalSkillTree`.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected:

* exact commit identity cases PASS;
* exact authority raw-byte/final-newline/no-final-newline/blob-SHA cases PASS;
* invalid UTF-8 survives Git reading unchanged and then fails in Task-1 fatal decoding;
* Merkle tests PASS even though referenced historical package objects are absent.

* [ ] **Step 5: Commit**

```bash
git add scripts/semantic_authority_git.mjs tests/semantic-authority-v2.test.mjs
git commit -m "feat: reconstruct semantic authority trees with git"
```

---

### Task 4: Reusable STABLE / ARMED / APPLIED Classifier

**Files:**

* Modify: `scripts/semantic_authority.mjs`
* Modify: `tests/semantic-authority-v2.test.mjs`

**Interfaces:**

* Implement:

  ```js
  classifySemanticAuthorityState({ model, observed })
    -> "STABLE" | "ARMED" | "APPLIED"
  ```

* Invalid observed states throw; they are never returned as a fourth state.

* [ ] **Step 1: Add classifier RED matrix**

Add:

```text
HEAD classifier accepts STABLE
HEAD classifier accepts ARMED
HEAD classifier accepts APPLIED
HEAD classifier rejects undeclared third state
HEAD classifier rejects partial multi-package application
HEAD classifier rejects alternate target
HEAD classifier rejects package addition
HEAD classifier rejects package deletion
HEAD classifier rejects package rename
```

Use a two-package transition for the partial-application test.

* [ ] **Step 2: Run RED**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: classifier cases FAIL.

* [ ] **Step 3: Implement exact state classification**

Rules:

```text
transition == null
  observed == baseline -> STABLE
  anything else        -> REJECT

transition exists
  observed == baseline -> ARMED
  observed == target   -> APPLIED
  anything else        -> REJECT
```

Equality means both exact canonical root and exact deterministically ordered package map.

Check package-name set equality before map equality so add/delete/rename failures are explicit.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/semantic-authority-v2.test.mjs
```

Expected: complete HEAD matrix PASS.

* [ ] **Step 5: Commit**

```bash
git add scripts/semantic_authority.mjs tests/semantic-authority-v2.test.mjs
git commit -m "feat: classify semantic authority head states"
```

---

### Task 5: PR Diff Classification and Canonical Authority Artifact Identity

**Files:**

* Create: `scripts/qualify_pr_transition.mjs`
* Create: `tests/pr-transition-qualification.test.mjs`

**Interfaces:**

* Produce:

  ```js
  classifyPrDiff({ cwd, baseSha, headSha })
  assertCanonicalAuthorityArtifactIdentity({ cwd, baseSha, headSha })
  ```

Diff result:

```js
{
  entries,
  authorityChanged,
  skillsChanged,
  qualificationImplementationChanged,
  otherChangedPaths
}
```

Canonical authority path:

```text
qualification/head-semantic-authority.json
```

Qualification-architecture surfaces:

```text
scripts/**
tests/**
.github/workflows/**
qualification/**
package.json
package-lock.json
```

with the canonical authority path removed from generic `qualification/**` classification after being classified separately.

* [ ] **Step 1: Write artifact/diff RED tests**

Add:

```text
PR canonical authority deletion rejects
PR canonical authority rename rejects
PR canonical authority non-blob replacement rejects
PR same-path canonical authority blob replacement classifies as authority change
PR byte-identical canonical authority copy at another tracked path rejects
PR unrelated same-basename different-content documentation does not reject merely by basename
PR mixed authority artifact classification bypass rejects
PR diff classifier recognizes deterministic_order change as qualification implementation
PR diff classifier recognizes newly introduced arbitrary scripts helper as qualification implementation
PR diff classifier recognizes complete governed qualification surfaces
PR qualification implementation redirect plus semantic permission change rejects as mixed qualification and authority change
```

For the byte-identical duplicate test, add another tracked **regular blob** outside the canonical path whose Git blob SHA is exactly the same as the canonical authority blob.

For the unrelated same-basename test, add a documentation/example regular file named:

```text
head-semantic-authority.json
```

outside the canonical path with different bytes and no qualification-authority role. It must not be rejected merely because of its basename.

For the redirect/mixed test, mutate qualification implementation so code would attempt to use an alternate authority source while also replacing semantic permission at the canonical authority path. The PR must be classified as both qualification implementation change and authority change and rejected as a mixed post-v2 semantic/qualification change.

* [ ] **Step 2: Run RED**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected: FAIL because PR classification and canonical artifact-identity interfaces do not exist.

* [ ] **Step 3: Implement exact diff and artifact classification**

Before diffing, prove `baseSha` and `headSha` through:

```js
assertExactCommitAvailable({ cwd, commit: baseSha })
assertExactCommitAvailable({ cwd, commit: headSha })
```

Use exact commit-to-commit Git diff with rename and copy detection. Use an argv form equivalent to:

```bash
git diff --name-status -z -M -C <baseSha> <headSha>
```

The implementation must parse rename/copy source and destination paths explicitly. Do not infer rename/copy only from filenames.

For rename/copy entries, classify both old and new paths so moving a file into or out of a governed surface cannot erase its classification.

Classification rules:

1. classify the exact canonical authority path separately first;
2. classify `skills/**` separately;
3. classify generic qualification implementation conservatively from the complete surfaces:

   ```text
   scripts/**
   tests/**
   .github/workflows/**
   qualification/**
   package.json
   package-lock.json
   ```

4. while applying `qualification/**`, exclude exactly:

   ```text
   qualification/head-semantic-authority.json
   ```

   because it has already been classified as semantic authority;
5. documentation outside those surfaces is not qualification implementation by itself;
6. newly added future files under any governed surface are automatically qualification implementation without adding their filenames to an allowlist.

Do not maintain a helper-by-helper qualification filename list.

`assertCanonicalAuthorityArtifactIdentity()` must inspect both exact BASE and exact HEAD.

At each commit:

1. require:

   ```text
   qualification/head-semantic-authority.json
   ```

   to exist at exactly that path;
2. use exact Git tree evidence such as:

   ```bash
   git ls-tree <commit> -- qualification/head-semantic-authority.json
   ```

   and require it to be a tracked regular Git blob, not a tree, symlink or other non-regular Git entry;
3. require the exact blob SHA reported by the tree entry to agree with `readAuthorityArtifactAtCommit({ cwd, commit }).blobSha`;
4. enumerate tracked regular blobs for the exact commit using exact Git tree data;
5. reject another tracked regular blob at a different path when its Git blob SHA is byte-identical to the canonical authority blob SHA.

Do **not** reserve the basename `head-semantic-authority.json` repository-wide.

A same-path canonical blob-content replacement is not an identity violation. It sets `authorityChanged = true` and is handled by semantic transition rules.

A second file with the same basename but different bytes is not rejected merely because of its name.

Canonical deletion, rename-away, non-blob substitution and byte-identical duplicate candidate artifact fail closed.

For the Task-5 mixed redirect test, implement the early post-v2 mixed-classification guard needed to reject:

```text
authorityChanged === true
&& qualificationImplementationChanged === true
```

for ordinary post-v2 operation. Task 8 will add the single exact predecessor-blob bootstrap exception before final use.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected:

* artifact identity tests PASS;
* same-path authority replacement is classified as authority change;
* unrelated same-basename different-content documentation is accepted by the identity rule;
* broad qualification surfaces classify correctly;
* `scripts/deterministic_order.mjs` and an otherwise unknown new `scripts/**` helper are both qualification implementation;
* mixed qualification-redirect plus semantic-authority mutation rejects.

* [ ] **Step 5: Commit**

```bash
git add scripts/qualify_pr_transition.mjs tests/pr-transition-qualification.test.mjs
git commit -m "feat: classify semantic authority PR diffs"
```

---

### Task 6: Authority-Only Directionality and Predecessor Validity

**Files:**

* Modify: `scripts/qualify_pr_transition.mjs`
* Modify: `tests/pr-transition-qualification.test.mjs`

**Interfaces:**

* Implement the ordinary post-v2 authority-change branch of:

  ```js
  qualifyPrTransition({ cwd, baseSha, headSha })
  ```

Task 6 handles v2 BASE authority transitions only. Task 8 later inserts the exact predecessor-blob bootstrap selector ahead of this ordinary v2 path. Task 6 must not introduce any schema-v1 parser or schemaVersion-based bootstrap dispatch.

* [ ] **Step 1: Add RED authority/predecessor cases**

Add:

```text
valid authority-only arm accepts
authority rotation from STABLE accepts
authority rotation from ARMED accepts
authority rotation from APPLIED accepts
authority rotation rejects baseline differing from validated BASE state
predecessor-invalid authority rotation rejects laundering
qualification implementation plus new arm rejects
qualification implementation plus retarget rejects
authority transition plus deterministic_order change rejects
authority transition plus newly introduced arbitrary scripts helper rejects
qualification implementation with unchanged authority and Skills accepts
```

For the laundering regression construct:

```text
BASE authority = valid v2 stable authority
BASE Skills     = unauthorized third state under that authority
HEAD Skills     = identical to BASE Skills
HEAD authority  = internally consistent authority recentered on invalid BASE
```

Expected: REJECT while validating BASE under BASE authority, before candidate recentering can authorize it.

For qualification-surface rejection, include both:

```text
authority transition
+
scripts/deterministic_order.mjs change
->
REJECT
```

and:

```text
authority transition
+
new arbitrary helper under scripts/**
->
REJECT
```

Also preserve:

```text
qualification implementation change
+
unchanged canonical authority
+
unchanged Skills
+
legal BASE/HEAD semantic state
->
ACCEPT
```

for an ordinary post-v2 qualification repair that does not alter semantic permission.

* [ ] **Step 2: Run RED**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected: authority-transition, broad-surface rejection and predecessor cases FAIL because complete ordinary v2 transition logic is not implemented.

* [ ] **Step 3: Implement predecessor-first authority rotation**

For an ordinary BASE that is not selected for the exact bootstrap exception:

1. load BASE authority through:

   ```js
   readAuthorityArtifactAtCommit({ cwd, commit: baseSha })
   ```

2. feed the exact returned `bytes` directly to:

   ```js
   parseAndValidateSemanticAuthorityV2(bytes)
   ```

   with no schema-v1 fallback;
3. Merkle-validate BASE authority;
4. read exact BASE Skill state;
5. classify BASE as STABLE/ARMED/APPLIED or reject;
6. require authority-only operation has `BASE:skills == HEAD:skills`;
7. load candidate authority through `readAuthorityArtifactAtCommit()` and strict-v2-validate its exact raw bytes;
8. Merkle-validate candidate authority;
9. require candidate baseline root and complete package map equal exact validated BASE observed state;
10. classify HEAD under candidate authority;
11. accept legal candidate state.

For ordinary post-v2 PRs, if:

```js
qualificationImplementationChanged === true
&& authorityChanged === true
```

reject regardless of whether the authority change arms, clears, replaces or retargets permission.

This generic rejection automatically covers every current and future helper under:

```text
scripts/**
tests/**
.github/workflows/**
qualification/**
package.json
package-lock.json
```

except that the canonical authority path itself remains separately classified.

A pure qualification repair passes only when:

* canonical authority is unchanged;
* Skills are unchanged;
* BASE authority/state is legal;
* HEAD authority/state is legal;
* no semantic permission is armed, cleared, replaced or retargeted by the repair.

Documentation-only changes do not set `qualificationImplementationChanged`.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected:

* authority rotations and laundering regression PASS;
* deterministic-order mixed change rejects;
* an unknown newly introduced `scripts/**` helper mixed with authority change rejects;
* ordinary qualification repair with unchanged semantic authority/permission and unchanged Skills accepts.

* [ ] **Step 5: Commit**

```bash
git add scripts/qualify_pr_transition.mjs tests/pr-transition-qualification.test.mjs
git commit -m "feat: enforce semantic authority predecessor validity"
```

---

### Task 7: Skill Application, No Self-Authorization, Maintenance, and Reverse Rejection

**Files:**

* Modify: `scripts/qualify_pr_transition.mjs`
* Modify: `tests/pr-transition-qualification.test.mjs`

* [ ] **Step 1: Add Skill-direction RED matrix**

Add:

```text
mixed authority and Skill mutation rejects
unarmed Skill mutation rejects
exact ARMED to APPLIED accepts
partial Skill application rejects
alternate target rejects
extra undeclared package mutation rejects
APPLIED base cannot perform another Skill application
direct APPLIED target to old baseline rejects
authority change during Skill application rejects
maintenance while ARMED accepts
maintenance while STABLE accepts
maintenance while APPLIED accepts
```

Also assert that the exact changed package set equals the declared `packageTransitions` set.

* [ ] **Step 2: Run RED**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected: Skill directionality cases FAIL.

* [ ] **Step 3: Implement Skill-only branch**

If `skillsChanged`:

* authority blob SHA must be identical between BASE and HEAD;
* qualification implementation must be unchanged;
* BASE must classify exactly `ARMED`;
* HEAD must classify exactly `APPLIED`;
* changed package names must equal `Object.keys(transition.packageTransitions)`;
* each changed package must equal exact `fromTree -> toTree`;
* complete HEAD root must equal `targetCanonicalSkillTree`.

Never infer a reverse permission.

For unchanged authority + unchanged Skills:

* require BASE and HEAD authority/state valid;
* accept ordinary maintenance in STABLE, ARMED or APPLIED;
* do not consume or clear an ARMED transition.

The broad qualification-surface rule from Tasks 5–6 remains active. Qualification implementation plus Skill semantic application is not a Skill-only transition and rejects.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected: complete PR-direction matrix PASS.

* [ ] **Step 5: Commit**

```bash
git add scripts/qualify_pr_transition.mjs tests/pr-transition-qualification.test.mjs
git commit -m "feat: enforce one-way semantic transition application"
```

---

### Task 8: One-Time Exact R5 v1 → v2 Bootstrap Selected by Blob Identity

**Files:**

* Create: `tests/fixtures/semantic-authority-v1-r5-bootstrap.json`
* Modify: `scripts/qualify_pr_transition.mjs`
* Modify: `tests/pr-transition-qualification.test.mjs`

**Bootstrap constants inside `scripts/qualify_pr_transition.mjs`:**

```text
expected predecessor authority blob:
b48fc1afc23ea8050638140dba1804d4075ea7cb

R5 skills:
c7bbb5757fe220da115617940bd007bab9397641

R5 architect:
c58d60466b0b88594be0776390c9fe0efbe2b067
```

The complete R5 package map is the exact ten-entry map in the adopted design.

Bootstrap dispatch is selected only by exact BASE canonical authority blob identity. No parsed `schemaVersion` value can select the bootstrap path.

* [ ] **Step 1: Create and prove bootstrap fixture identity**

Task 8 occurs while the canonical repository authority is still the exact schema-v1 predecessor. Do not manually reconstruct or retype the historical fixture bytes.

Create the fixture as an exact byte copy:

```bash
cp qualification/head-semantic-authority.json \
  tests/fixtures/semantic-authority-v1-r5-bootstrap.json
```

Immediately require:

```bash
test "$(git hash-object tests/fixtures/semantic-authority-v1-r5-bootstrap.json)" = \
  "b48fc1afc23ea8050638140dba1804d4075ea7cb"
```

If the identity differs, FAIL and stop Task 8.

Add an automated fixture identity test that requires:

```bash
git hash-object tests/fixtures/semantic-authority-v1-r5-bootstrap.json
```

to equal:

```text
b48fc1afc23ea8050638140dba1804d4075ea7cb
```

The fixture is durable historical evidence for this one exact predecessor only.

* [ ] **Step 2: Add bootstrap RED matrix**

Add:

```text
exact predecessor blob and exact R5 to v2 STABLE bootstrap accepts
different schema-v1 blob claiming schemaVersion 1 rejects
exact predecessor blob with non-R5 Skills rejects
exact predecessor blob with non-R5 package state rejects
exact predecessor blob with candidate transition rejects
bootstrap replay from v2 BASE rejects
v2 to v1 downgrade rejects
```

Required matrix:

```text
exact predecessor blob
+
exact adopted R5 Skills/package state
+
candidate v2 exact R5 STABLE
+
transition null
->
ACCEPT
```

```text
different schema-v1 blob claiming schemaVersion 1
->
REJECT
```

```text
exact predecessor blob
+
non-R5 Skills/package state
->
REJECT
```

```text
exact predecessor blob
+
candidate transition != null
->
REJECT
```

```text
v2 BASE
+
attempted bootstrap reuse
->
REJECT
```

```text
v2 BASE
+
v1 HEAD
->
REJECT
```

For the “different schema-v1 blob” case, create bytes that genuinely claim `"schemaVersion": 1` but have a different Git blob identity—for example by changing non-semantic whitespace or other bytes. It must not enter bootstrap merely because its parsed version number is 1.

* [ ] **Step 3: Run RED**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected: bootstrap cases FAIL because exact-blob-first bootstrap dispatch is not implemented.

* [ ] **Step 4: Implement the single bootstrap branch with blob-first dispatch**

At the start of BASE authority dispatch inside `qualifyPrTransition()`:

1. read the exact BASE canonical authority artifact using:

   ```js
   const baseArtifact = readAuthorityArtifactAtCommit({
     cwd,
     commit: baseSha
   })
   ```

2. inspect `baseArtifact.blobSha` before attempting to interpret schema-v1 semantics;
3. if and only if:

   ```text
   baseArtifact.blobSha
   ==
   b48fc1afc23ea8050638140dba1804d4075ea7cb
   ```

   enter the one exact R5 bootstrap path;
4. otherwise feed `baseArtifact.bytes` directly to:

   ```js
   parseAndValidateSemanticAuthorityV2(baseArtifact.bytes)
   ```

5. require ordinary BASE authority to validate as schema v2;
6. reject every other authority form.

There is no:

* reusable schema-v1 parser;
* general schema-v1 semantic validator;
* schema-v1 compatibility API;
* schemaVersion-based fallback into bootstrap.

Do not parse an arbitrary schema-v1 artifact first and then decide whether its blob is eligible. Blob identity is the bootstrap selector.

Inside the exact bootstrap path:

* do not invoke a reusable v1 semantic validator;
* exact BASE blob identity already proves the only accepted historical predecessor artifact;
* require BASE and HEAD `skills` tree exactly R5;
* require complete observed BASE and HEAD R5 package map;
* load candidate HEAD canonical authority through `readAuthorityArtifactAtCommit()`;
* pass candidate HEAD raw bytes to the strict Semantic Authority v2 parser;
* require candidate schema exactly v2;
* require candidate baseline exactly R5 package/root state;
* require candidate `architect` entry exactly the adopted R5 architect tree;
* require candidate `transition === null`;
* require candidate classify STABLE;
* allow qualification architecture files to change only in this exact bootstrap path.

When BASE does not have the exact frozen predecessor blob, the bootstrap path is unreachable.

When BASE is v2 and HEAD is v1, candidate v2 validation fails and the downgrade rejects.

When BASE is v2, an authority change combined with qualification-architecture change remains rejected by the ordinary post-v2 rule from Task 6.

* [ ] **Step 5: Run GREEN**

```bash
node --test tests/pr-transition-qualification.test.mjs
```

Expected:

* exact predecessor-blob R5 bootstrap PASS;
* different schema-v1 blob claiming version 1 rejects before any bootstrap exception;
* non-R5 predecessor state rejects;
* armed/applied bootstrap candidate rejects;
* replay and downgrade reject;
* no reusable schema-v1 compatibility route exists.

* [ ] **Step 6: Commit**

```bash
git add scripts/qualify_pr_transition.mjs \
  tests/pr-transition-qualification.test.mjs \
  tests/fixtures/semantic-authority-v1-r5-bootstrap.json
git commit -m "feat: add one-time R5 semantic authority bootstrap"
```

---

### Task 9: Migrate the Governing Manifest and Wire Repository Commands

**Files:**

* Modify: `qualification/head-semantic-authority.json`
* Modify: `scripts/qualify_head_semantic_authority.mjs`
* Modify: `package.json`
* Modify: `tests/qualification-gates.test.mjs`

* [ ] **Step 1: Add integration RED assertions**

Replace schema-v1 HEAD-authority tests in `tests/qualification-gates.test.mjs` with assertions that:

```text
governing authority is schema v2
governing authority has no admittedCanonicalPackages field
governing authority baseline is exact adopted R5
governing authority transition is null
current repository HEAD classifies STABLE
```

Do not remove or weaken the existing frozen-R1 positive and negative oracle tests.

* [ ] **Step 2: Run RED**

```bash
node --test tests/qualification-gates.test.mjs
```

Expected: FAIL against the current schema-v1 manifest.

* [ ] **Step 3: Replace the authority manifest**

Write exactly:

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

* [ ] **Step 4: Rewrite current-HEAD command as an adapter**

Preserve the public adapter interface:

```js
qualifyHeadSemanticAuthority({ cwd, commit = "HEAD" })
```

but make exact commit handling explicit.

If `commit === "HEAD"`:

1. observe the current checkout once with:

   ```bash
   git rev-parse --verify HEAD^{commit}
   ```

2. require the metadata output to be exactly one lowercase 40-hex SHA;
3. treat that SHA as `exactCommit`;
4. pass `exactCommit` to `assertExactCommitAvailable()` and all later Git readers.

The literal default `"HEAD"` is a local current-checkout selector only. It is not passed to `assertExactCommitAvailable()` and is not treated as equivalent to an externally requested SHA.

If a non-default `commit` argument is supplied:

* require it already be an exact lowercase 40-hex SHA;
* pass it to `assertExactCommitAvailable()`;
* reject arbitrary branch/tag/ref names.

Then `qualifyHeadSemanticAuthority()` must:

1. prove `exactCommit`;
2. load authority raw bytes through:

   ```js
   readAuthorityArtifactAtCommit({
     cwd,
     commit: exactCommit
   })
   ```

3. pass the exact returned `bytes` directly to strict v2 parse/validation;
4. assert Merkle consistency;
5. read current Skill state at `exactCommit`;
6. call the shared classifier;
7. return a report containing:

   ```js
   {
     status: "PASS",
     claim: "HEAD_SEMANTIC_MUTATION_AUTHORITY",
     schemaVersion: 2,
     state: "STABLE" | "ARMED" | "APPLIED",
     baselineCanonicalSkillTree: string,
     currentCanonicalSkillTree: string,
     transitionId: string | null
   }
   ```

Remove schema-v1 `admittedCanonicalPackages` logic entirely.

Do not add any current-HEAD v1 fallback.

* [ ] **Step 5: Add PR command**

In `package.json` add:

```json
"qualify:pr-transition": "node scripts/qualify_pr_transition.mjs"
```

Do not insert it into `"check"`.

`check` remains:

```json
"check": "npm run qualify:head-authority && npm run qualify:r1 && npm run qualify:r4-lab"
```

* [ ] **Step 6: Run focused GREEN**

```bash
node --test tests/semantic-authority-v2.test.mjs
node --test tests/pr-transition-qualification.test.mjs
node --test tests/qualification-gates.test.mjs
npm run qualify:head-authority
```

Expected:

```text
all node tests PASS
qualify:head-authority PASS
state = STABLE
schemaVersion = 2
```

* [ ] **Step 7: Run canonical qualification**

```bash
npm run check
```

Expected: PASS without invoking `qualify:r1:frozen`.

* [ ] **Step 8: Prove Skill identity remained frozen against the exact planning base**

```bash
test "$(git rev-parse HEAD:skills)" = "c7bbb5757fe220da115617940bd007bab9397641"
test "$(git rev-parse HEAD:skills/architect)" = "c58d60466b0b88594be0776390c9fe0efbe2b067"
git diff --quiet bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c HEAD -- skills
```

Expected: all commands exit 0.

The comparison base is exactly `bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c`; do not substitute a later commit or merge-base.

* [ ] **Step 9: Commit**

```bash
git add qualification/head-semantic-authority.json \
  scripts/qualify_head_semantic_authority.mjs \
  package.json \
  tests/qualification-gates.test.mjs
git commit -m "feat: adopt semantic authority v2"
```

Do not stage `package-lock.json`.

---

### Task 10: Unified Every-PR Qualification Workflow and Frozen-R1 Separation

**Files:**

* Create: `.github/workflows/current-head-qualification.yml`
* Create: `tests/qualification-workflow-contract.test.mjs`
* Delete: `.github/workflows/r1-qualification.yml`
* Delete: `.github/workflows/r4-lab-qualification.yml`

**Stable future required-check name:**

```text
Pryzael current HEAD qualification
```

Use:

```yaml
name: Pryzael qualification

jobs:
  qualify:
    name: Pryzael current HEAD qualification
```

* [ ] **Step 1: Write workflow RED contract**

The test must assert:

```text
new unified workflow exists
old R1 workflow does not exist
old R4 workflow does not exist
pull_request trigger exists
workflow_dispatch trigger exists
no workflow-level paths filter exists
pull_request_target is absent
permissions are contents: read
checkout uses the existing immutable checkout SHA
checkout ref is EXPECTED_SHA
checkout fetch-depth is 1
exact HEAD proof follows checkout
Node 22 setup uses existing immutable action SHA
Python 3.12 setup uses existing immutable action SHA
event BASE_SHA is used
exact BASE is shallow-fetched by SHA
BASE_SHA^{commit} is proved equal to BASE_SHA
git merge-base is absent
moving main fetch/substitution is absent
fetch-depth: 0 is absent
PR transition command runs only for pull_request
dispatch does not invent a BASE
stale dependency marker is seeded
npm run check executes
stale marker absence is proved after check
qualify:r1:frozen is absent from the current workflow
```

Also use index/order assertions so:

```text
checkout
< exact HEAD proof
< exact BASE materialization
< PR transition qualification
< stale sentinel
< npm run check
< stale-sentinel proof
```

on PR execution.

* [ ] **Step 2: Run RED**

```bash
node --test tests/qualification-workflow-contract.test.mjs
```

Expected: FAIL because two old workflows still exist and the unified workflow does not.

* [ ] **Step 3: Implement unified workflow**

Use the existing immutable action pins:

```text
actions/checkout@11d5960a326750d5838078e36cf38b85af677262
actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065
```

Environment:

```yaml
EXPECTED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
BASE_SHA: ${{ github.event.pull_request.base.sha || '' }}
```

Checkout:

```yaml
with:
  ref: ${{ env.EXPECTED_SHA }}
  fetch-depth: 1
```

Exact HEAD proof:

```bash
test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"
```

PR-only BASE materialization:

```bash
git fetch --no-tags --depth=1 origin "$BASE_SHA"
test "$(git rev-parse --verify "$BASE_SHA^{commit}")" = "$BASE_SHA"
```

`BASE_SHA` and `EXPECTED_SHA` originate from GitHub's exact event/current commit identities and are passed to the repository PR-pair command as exact SHA values. The repository command independently applies `assertExactCommitAvailable()` to both.

PR-only semantic transition qualification:

```bash
npm run qualify:pr-transition -- "$BASE_SHA" "$EXPECTED_SHA"
```

Preserve the existing sentinel:

```bash
mkdir -p node_modules
printf 'stale dependency fixture\n' > node_modules/pryzael-r1-stale-marker
```

Then:

```bash
npm run check
test ! -e node_modules/pryzael-r1-stale-marker
```

Delete both previous current-HEAD workflows. Do not create a replacement frozen-R1 automatic workflow.

* [ ] **Step 4: Run GREEN**

```bash
node --test tests/qualification-workflow-contract.test.mjs
```

Expected: PASS.

* [ ] **Step 5: Re-run historical/current regression**

```bash
node --test tests/qualification-gates.test.mjs
npm run check
```

Expected:

* historical frozen fixture positive/negative tests PASS;
* current R5+ qualification PASS;
* no normal path invokes `npm run qualify:r1:frozen`.

* [ ] **Step 6: Commit**

```bash
git add .github/workflows/current-head-qualification.yml \
  tests/qualification-workflow-contract.test.mjs
git rm .github/workflows/r1-qualification.yml \
  .github/workflows/r4-lab-qualification.yml
git commit -m "ci: unify current head qualification"
```

---

### Task 11: Document the Adopted Lifecycle and Ownership Boundaries

**Files:**

* Modify: `docs/PROTOCOL.md`
* Modify: `docs/DEVELOPMENT.md`
* Modify: `ARCHITECTURE.md`

* [ ] **Step 1: Update `docs/PROTOCOL.md`**

Replace schema-v1/package-admission language with:

* exact v2 semantic epoch;
* STABLE / ARMED / APPLIED;
* raw duplicate rejection before normalization;
* exact raw canonical authority bytes are observed through Git before strict parsing;
* exact pre-authorized target;
* predecessor validity;
* two-PR authority-only → Skill-only lifecycle;
* maintenance while ARMED;
* qualification repair cannot change authority/permission;
* qualification architecture is conservatively classified by governed repository surfaces rather than a helper filename allowlist;
* canonical `qualification/head-semantic-authority.json` remains separately classified as semantic authority;
* direct APPLIED → old baseline is unauthorized;
* intentional revert requires a newly armed exact reverse transition;
* one-time bootstrap is selected by exact predecessor authority blob identity, not by general schema-v1 parsing;
* no reusable schema-v1 compatibility parser remains;
* `qualify:r1:frozen` remains historical-only.

* [ ] **Step 2: Update `docs/DEVELOPMENT.md`**

Canonical commands must describe:

```text
npm run check
npm run qualify:pr-transition -- <exact-base-sha> <exact-head-sha>
npm run qualify:r1:frozen
```

Clarify:

* PR transition command is pairwise and CI-owned when an authoritative PR BASE exists;
* both PR command arguments are exact lowercase commit SHAs, not moving refs;
* contributor-local `npm run check` does not invent a predecessor;
* Skill semantic changes require already-armed authority;
* qualification architecture changes must keep semantic authority/permission unchanged;
* ordinary post-v2 authority change plus any generic qualification change under the governed surfaces rejects;
* exact v1 → v2 bootstrap is the sole exception implemented here;
* current required CI status is `Pryzael current HEAD qualification`.

* [ ] **Step 3: Update `ARCHITECTURE.md`**

Add Semantic Authority v2 as a process/qualification authority without making it authored Skill semantics.

Document:

```text
exact commit
 -> exact canonical Git blob
 -> raw Buffer bytes
 -> strict duplicate/fatal UTF-8 rejection
 -> v2 manifest validation
 -> Git mktree --missing consistency
 -> local state classification

exact PR BASE + HEAD
 -> exact artifact/diff classification
 -> predecessor validation
 -> directionality
 -> current HEAD qualification
```

Also document:

* Git metadata text helpers and raw blob Buffer helpers are separate boundaries;
* `git cat-file blob` payload is not decoded or normalized before the strict parser;
* canonical authority source is exactly `qualification/head-semantic-authority.json`;
* there is no repository-global basename reservation;
* actual byte-identical duplicate candidate authority artifacts fail closed;
* qualification implementation is classified by complete governed surfaces, with the canonical authority path excluded from generic `qualification/**` classification;
* one current-HEAD workflow owns the Actions execution harness while historical R1 remains separately executable.

* [ ] **Step 4: Validate docs and commands**

```bash
git diff --check
node --test tests/qualification-workflow-contract.test.mjs
node --test tests/qualification-gates.test.mjs
npm run check
```

Expected: all PASS.

* [ ] **Step 5: Commit**

```bash
git add docs/PROTOCOL.md docs/DEVELOPMENT.md ARCHITECTURE.md
git commit -m "docs: document semantic authority v2 lifecycle"
```

---

### Task 12: Full Requirement-by-Requirement Verification

**Files:**

* No repository files modified.
* This task must finish with a clean working tree.

* [ ] **Step 1: Run all focused authority tests**

```bash
node --test tests/semantic-authority-v2.test.mjs
node --test tests/pr-transition-qualification.test.mjs
node --test tests/qualification-gates.test.mjs
node --test tests/qualification-workflow-contract.test.mjs
```

Expected: all PASS.

* [ ] **Step 2: Run repository qualification**

```bash
npm run qualify:head-authority
npm run check
```

Expected:

```text
HEAD authority PASS / schemaVersion 2 / STABLE
R1 current conformance PASS
R4 Lab qualification PASS
```

Do not require `npm run qualify:r1:frozen` to pass on current R5 bytes; its fixture-level positive/negative regressions are the preserved historical proof.

* [ ] **Step 3: Prove immutable semantic content against the exact planning base**

```bash
test "$(git rev-parse HEAD:skills)" = "c7bbb5757fe220da115617940bd007bab9397641"
test "$(git rev-parse HEAD:skills/architect)" = "c58d60466b0b88594be0776390c9fe0efbe2b067"
git diff --quiet bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c HEAD -- skills
```

Expected: all exit 0.

Do not substitute a later base, merge-base, semantically equivalent tree or descendant.

* [ ] **Step 4: Prove final authority shape**

```bash
node -e "const a=require('fs').readFileSync('qualification/head-semantic-authority.json','utf8'); const j=JSON.parse(a); if(j.schemaVersion!==2||j.transition!==null||Object.hasOwn(j,'admittedCanonicalPackages')) process.exit(1)"
```

Expected: exit 0.

* [ ] **Step 5: Prove workflow consolidation**

```bash
test -f .github/workflows/current-head-qualification.yml
test ! -e .github/workflows/r1-qualification.yml
test ! -e .github/workflows/r4-lab-qualification.yml
```

Expected: exit 0.

* [ ] **Step 6: Scan prohibited scope against the exact planning base**

Use direct exact-commit comparison:

```bash
git diff --name-only \
  bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c \
  HEAD
```

Do not use a later commit or merge-base as the implementation authority.

Review output and require:

```text
no skills/**
no worker/**
no wrangler.jsonc
no evaluation/**
no repository-ruleset configuration
no Dependabot maintenance implementation
```

The design document and plan/documentation files may appear.

* [ ] **Step 7: Requirement coverage check**

Verify explicitly:

```text
A  schema v2 exact R5 STABLE                       Tasks 2,3,9
B  raw recursive duplicate rejection              Task 1
C  exact manifest validation                      Tasks 2,3
D  exact raw Git authority artifact observation   Task 3
E  git mktree --missing                            Task 3
F  STABLE/ARMED/APPLIED classifier                Task 4
G  predecessor validity/laundering rejection      Task 6
H  no self-authorization                          Task 7
I  repair/permission separation                   Tasks 5,6
J  broad qualification-surface classification     Tasks 5,6
K  one-time blob-first v1 -> v2 bootstrap         Task 8
L  canonical authority artifact identity          Task 5
M  no global authority basename reservation       Task 5
N  maintenance while ARMED                        Task 7
O  emergency reverse requires new authorization   Tasks 7,11
P  PR-context repository command                  Task 9
Q  exact event BASE materialization               Task 10
R  historical frozen-R1 separation                Tasks 9,10
S  single current-HEAD Actions harness             Task 10
T  exact implementation-base binding              Global Constraints, Task 12
```

* [ ] **Step 8: Verify corrected security-boundary invariants**

Explicitly verify all of the following in implementation and tests:

```text
assertExactCommitAvailable rejects moving refs and proves exact SHA equality

readAuthorityArtifactAtCommit:
  proves exact commit
  resolves canonical path
  validates exact blob SHA
  uses git cat-file blob
  returns Buffer bytes unchanged

no authority payload bytes are text-decoded before strict fatal UTF-8 parsing

final newline is preserved
missing final newline is not synthesized
invalid UTF-8 reaches strict parser unchanged and rejects there

qualification architecture automatically includes every scripts/** change
qualification architecture automatically includes newly introduced helpers
canonical authority path is excluded from generic qualification/** counting

ordinary post-v2 authority + qualification architecture change rejects

bootstrap dispatch checks exact predecessor blob identity before any v1 interpretation
no generalized v1 parser or semantic validator exists

canonical authority exists as tracked regular blob at BASE and HEAD
canonical deletion rejects
canonical rename rejects
canonical non-blob substitution rejects
same-path blob replacement is authority change, not identity failure
byte-identical duplicate authority blob at another tracked path rejects
different-content same-basename documentation is not rejected by basename alone
rename/copy diff evidence comes from Git rename/copy detection
alternate authority-source implementation plus semantic permission change rejects
```

* [ ] **Step 9: Placeholder and interface scan**

Search the implementation and final docs for accidental planning residue:

```bash
git grep -n -E 'TODO|TBD|IMPLEMENT LATER' -- \
  scripts/strict_json.mjs \
  scripts/semantic_authority.mjs \
  scripts/semantic_authority_git.mjs \
  scripts/qualify_pr_transition.mjs \
  tests/semantic-authority-v2.test.mjs \
  tests/pr-transition-qualification.test.mjs \
  tests/qualification-workflow-contract.test.mjs \
  docs/PROTOCOL.md \
  docs/DEVELOPMENT.md \
  ARCHITECTURE.md
```

Expected: no matches introduced by this implementation.

Also inspect exported interface use and require exact consistency:

```text
parseJsonRejectingDuplicateMembers(rawBytes, { label })
parseAndValidateSemanticAuthorityV2(rawBytes)
validateSemanticAuthorityV2(value)
validateCanonicalPackageTreeMap(value, { context })
deriveTargetCanonicalPackageTrees(authority)
classifySemanticAuthorityState({ model, observed })
reconstructCanonicalSkillTree({ cwd, canonicalPackageTrees })
assertAuthorityMerkleConsistency({ cwd, model })
readCanonicalSkillStateAtCommit({ cwd, commit })
readAuthorityArtifactAtCommit({ cwd, commit }) -> { bytes: Buffer, blobSha: string }
assertExactCommitAvailable({ cwd, commit }) -> exact SHA string
classifyPrDiff({ cwd, baseSha, headSha })
assertCanonicalAuthorityArtifactIdentity({ cwd, baseSha, headSha })
qualifyPrTransition({ cwd, baseSha, headSha })
qualifyHeadSemanticAuthority({ cwd, commit = "HEAD" })
```

Require all later consumers to use these exact contracts.

* [ ] **Step 10: Confirm excluded work remains excluded**

Require:

```text
no skills/** modification
no R4 evaluation redesign
no Track-D MCP/runtime production hardening
no Dependabot/maintenance PR implementation
no Stage-2 ruleset mutation
```

* [ ] **Step 11: Confirm clean worktree**

```bash
git status --short
```

Expected: no output.

No additional commit is created in this verification-only task.

---

## Implementation Notes for Reviewers

The principal architectural change is deliberately not a large refactor of R1 or R4. Existing R1 current conformance, frozen R1 identity, R4 Lab execution, deterministic-order utility, Skill validators, and `skills/**` remain where they are.

The new split is limited to the ownership boundary that was previously overloaded inside `qualify_head_semantic_authority.mjs`:

```text
strict_json.mjs
    raw syntax evidence

semantic_authority.mjs
    pure v2 semantic/process model

semantic_authority_git.mjs
    exact commit proof
    Git representation and state observations
    raw Buffer-exact canonical authority artifact reading

qualify_head_semantic_authority.mjs
    one-commit adapter

qualify_pr_transition.mjs
    exact BASE/HEAD adapter
    exact diff/artifact classification
    predecessor/directionality enforcement
```

No JavaScript code computes Git tree hashes. `git mktree --missing` remains the sole owner of Git tree encoding and hash construction.

Canonical authority artifact reading has a separate raw-buffer boundary:

```text
exact commit SHA
  -> git rev-parse --verify <sha>^{commit}
  -> exact canonical path object SHA
  -> git cat-file blob <blob-sha>
  -> Buffer unchanged
  -> strict fatal UTF-8 / duplicate-member parser
```

Git metadata commands may use a text-oriented helper because their output is required to match strict ASCII SHA/tree formats. Canonical authority blob payload must never pass through that helper.

The one-time schema-v1 bootstrap is anchored and **selected** by exact predecessor authority blob identity:

```text
b48fc1afc23ea8050638140dba1804d4075ea7cb
```

The implementation does not parse an arbitrary schema-v1 artifact to decide whether bootstrap applies. Exact BASE blob identity is inspected first. Only that one blob can enter bootstrap. Every other BASE artifact is fed to strict Semantic Authority v2 validation and must be v2.

There is no reusable v1 semantic validator, compatibility parser, or schemaVersion-based bootstrap fallback.

Post-v2 qualification-architecture classification is intentionally conservative and future-proof:

```text
scripts/**
tests/**
.github/workflows/**
qualification/**
package.json
package-lock.json
```

The canonical authority path is classified separately and excluded from generic `qualification/**` counting.

This means a new helper under `scripts/**`, even one whose filename did not exist when this plan was written, is automatically a qualification-architecture change. Ordinary post-v2 authority mutation plus such a change rejects. A qualification repair with unchanged semantic authority/permission and unchanged Skills can pass when BASE and HEAD remain legal.

Canonical authority identity is path- and Git-object-based, not basename-reservation-based.

The authoritative source remains exactly:

```text
qualification/head-semantic-authority.json
```

At BASE and HEAD it must exist as a tracked regular Git blob. Deletion, rename-away, non-blob substitution and an actual byte-identical duplicate candidate authority artifact fail closed.

A normal blob-content replacement at the same canonical path is classified as an authority change, not an identity violation.

An unrelated documentation/example file is not forbidden merely because its basename is `head-semantic-authority.json`.

Rename/copy evidence is obtained from exact Git commit-to-commit diff with Git rename/copy detection. If qualification implementation is changed so another path becomes an authority source while semantic permission also changes, broad qualification classification plus separate canonical-authority classification makes the PR a forbidden mixed semantic/qualification change.

The exact implementation base is not an equivalence class. Execution authority is:

```text
commit:
bf9a6865f0dd63a1c7b9fc98c70e56a4c4dbd49c

tree:
3965570ef7f45ec39869dc9bd46e1c814a9088cb
```

If the intended implementation base moves before execution, implementation stops until the project Orchestrator explicitly rebinds or re-reviews the authority. No descendant, docs-only change, tree-equivalence argument or planner-created safe-later-commit rule substitutes for that exact base.

The exact predecessor bootstrap fixture is created in Task 8 by copying the still-current canonical authority bytes before Task 9 migrates the governing manifest. Its blob identity is proved immediately. It is historical evidence for the one exact bootstrap predecessor, not a reusable schema-v1 fixture family.

The old Actions workflows are removed rather than retained as historical lanes. Historical R1 evidence remains the explicit `npm run qualify:r1:frozen` command plus its existing fixture/oracle tests. This avoids creating another automatically materialized status whose applicability would again drift from current semantic epochs.

The future Stage-2 ruleset is outside this plan. When separately authorized later, its intended exact required check is:

```text
Pryzael current HEAD qualification
```
