---
name: prove-it-works
description: "Verify a completed code, configuration, migration, integration, or artifact claim before declaring success. Use when asked to verify/prove a change, before marking non-trivial engineering work done, or when compile/tests/source review may be only proxies for the real behavior."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/principle-prove-it-works"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Prove It Works

Verify the real artifact and behavior path directly whenever available. Do not promote a proxy, self-report, or plausible code reading into stronger proof.

## Verification hierarchy

State the strongest level actually reached:

1. **Static/source:** exact diff/file/schema/config/dependency source.
2. **Build/type/lint:** useful but usually not runtime proof.
3. **Focused executable:** test/script/validator/query/command exercises changed logic.
4. **Integration:** relevant components communicate/persist end to end.
5. **Real artifact/runtime:** the surface relied on by the real user/downstream consumer is exercised.

## Workflow

1. **Restate finish predicates** as observable claims.
2. **Bind artifact identity.** Inspect the exact repository/ref/commit/files or generated artifact actually being judged.
3. **Choose falsifying checks.** A good check would fail if the predicate were false.
4. **Exercise the strongest relevant path.** Examples: real CLI command, valid/invalid parser replay, write-reopen-read persistence, request-response integration, running UI flow, same-workload performance comparison, or migration plus proof that old consumers are gone.
5. **Challenge the observation method.** Ask whether cached/derived state, wrong ref, swallowed failures, stale screenshots, or a test that misses the changed path could create a false green.
6. **Classify each predicate** as `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`.

`INCONCLUSIVE` is never a pass.

## Capability contract

Use only tools available in the active session. Never claim tests, commands, builds, local files, browser flows, or runtime behavior were exercised when they were not. When execution is unavailable, specify the exact decisive check that remains.

For GitHub evidence, prefer exact commit identity. A green result tied to another commit does not prove the candidate.

## Output

Return a compact table:

| Predicate | Method | Evidence | Result |
|---|---|---|---|
| ... | ... | ... | VERIFIED / NOT VERIFIED / INCONCLUSIVE |

Then state overall verdict, missing decisive checks, and artifact identity.
