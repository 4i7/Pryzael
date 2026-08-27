---
name: prove-it-works
description: Verify completed work against the real artifact and full behavior path before declaring success. Prefer deterministic rerunnable evidence over proxies, summaries, or compile-only confidence.
source: cursor/plugins pstack/skills/principle-prove-it-works
adapted_for: WebChatGPT
---

# Prove It Works

Use this skill before declaring any non-trivial task complete.

The core rule is: verify the real thing directly whenever the available tools allow it. Do not promote a proxy, a self-report, or a plausible code reading into proof.

## Verification hierarchy

Use the strongest level actually available:

1. **Static/source evidence.** Inspect the actual diff, file, schema, configuration, or dependency source.
2. **Build/type/lint evidence.** Necessary for many code tasks but rarely sufficient alone.
3. **Focused executable evidence.** Run a test, script, validator, query, or command that exercises the changed logic.
4. **Integration evidence.** Exercise the full communication or persistence path across the relevant components.
5. **Real-artifact/runtime evidence.** Drive the actual feature or system surface a user or downstream consumer relies on.

State the highest level reached. Do not imply level 5 from level 2.

## Procedure

### 1. Restate the finish predicates

Translate the task into observable claims.

Examples:

- the parser rejects malformed generation state;
- text output remains byte-identical;
- JSON output parses and contains the expected field;
- retries do not duplicate the write;
- no legacy callers remain;
- the UI persists the value across restart.

A task may have several predicates. Verify each separately.

### 2. Inspect the actual artifact

Before trusting summaries, inspect what was really produced:

- exact repository/ref/commit;
- changed files/diff;
- generated file contents;
- configuration or schema;
- tool-created artifact.

For delegated or externally produced work, trust the artifact over the description of the artifact.

### 3. Exercise the real path

Choose a check that would fail if the claim were false.

Examples:

- CLI: run the actual command with representative input and inspect exit code/stdout/stderr.
- Parser: replay saved valid and invalid inputs.
- Persistence: write, restart/reopen when relevant, then read back.
- API/integration: exercise request through response, not only one internal function.
- UI: drive the changed flow in the running app and inspect the resulting state.
- Performance: compare measured before/after data under the same workload.
- Migration: verify both transformed data and absence of remaining old-format consumers.

When a deterministic reusable check is cheap, prefer it over a one-time manual inspection.

### 4. Challenge the observation method

If a verification passes suspiciously easily, test the verifier.

Ask:

- would this check fail if the defect were still present?
- am I reading cached or derived state instead of source state?
- is the test executing the changed path?
- is a screenshot blank or stale?
- is the validator using the same artifact/ref that will actually ship?
- did the command exit successfully because the failure was swallowed?

A broken gate can produce a false green result.

### 5. Classify every predicate

Use exactly these meanings:

- `VERIFIED`: direct evidence supports the predicate at an appropriate level.
- `NOT VERIFIED`: evidence contradicts the predicate or the check failed.
- `INCONCLUSIVE`: the necessary check could not be run, the observation method is insufficient, or available evidence does not decide the claim.

`INCONCLUSIVE` is not a pass.

## WebChatGPT adaptation

Use only tools actually available in the current session: connected GitHub/files, web access, code execution, browser-capable tools, or other connectors.

Do not claim that tests, commands, builds, local files, or runtime flows were executed when the session cannot execute them. Instead specify the exact decisive check that remains and return `INCONCLUSIVE` for that predicate.

For GitHub-bound work, prefer exact branch/commit identities and citations to the real files or diffs.

## Evidence quality

Good evidence is:

- direct;
- falsifiable;
- tied to the exact artifact under review;
- reproducible when practical;
- narrow enough that a failure has clear meaning.

Avoid relying on:

- modification timestamps;
- agent summaries;
- "tests should pass" reasoning;
- compile success as proof of runtime behavior;
- cached screenshots;
- a validator run against a different checkout or commit;
- inferred state when the authoritative value can be read directly.

## Output

Return a compact verification table:

| Predicate | Method | Evidence | Result |
|---|---|---|---|
| ... | ... | ... | VERIFIED / NOT VERIFIED / INCONCLUSIVE |

Then state:

### Overall verdict
The overall result, including any predicate that prevents a complete pass.

### Missing decisive checks
Exact checks still required, if any.

### Artifact identity
Repository/ref/commit/file identity when relevant so the evidence cannot be confused with another version.
