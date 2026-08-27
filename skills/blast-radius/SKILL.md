---
name: blast-radius
description: Examine what a change can break beyond the visible diff, identify the safety assumptions it depends on, and push those assumptions toward direct executable or runtime proof.
source: cursor/plugins pstack/skills/blast-radius
adapted_for: WebChatGPT
---

# Blast Radius

Use this skill when a small-looking change may have non-obvious effects elsewhere, or when reviewing a diff that is plausible but not yet trustworthy.

The job is not merely to list direct callers. Search can do that. The job is to find breakage that simple symbol search misses and to prove the facts the change's safety depends on.

## Confidence ladder

For every safety-critical claim, state how far it was verified:

1. **Assertion only.** A reasoned claim with no direct evidence.
2. **Source evidence.** Concrete code, schema, documentation, pinned dependency source, commit, PR, or configuration supports it.
3. **Failure-path proof.** The relevant bad case was traced and shown not to reach the changed behavior.
4. **Executable proof.** A test, script, query, or command exercised the real code path and would fail if the claim were false.
5. **Runtime/end-to-end proof.** The behavior was reproduced in the real running system or closest available production-equivalent surface.

Do not report a claim as settled if the available evidence only supports a lower level. When direct execution is unavailable in WebChatGPT, say so and stop at the highest evidence level actually reached.

## Procedure

### 1. Understand the semantic change

Read the diff or changed files and determine what behavior changes, including implications not obvious from the textual patch.

Identify:

- added, changed, and deleted symbols;
- changed defaults or ordering;
- changed persistence, serialization, protocol, or API behavior;
- changed error handling or validation;
- changed concurrency or retry semantics;
- changed dependency assumptions.

### 2. Find the safety assumptions

Reduce the review to the one or few facts on which safety actually depends.

Examples:

- a cleanup function only removes unreachable entries;
- an identifier is never reused across generations;
- a wire format remains byte-compatible;
- a retry cannot duplicate a side effect;
- a caller cannot observe intermediate state.

Spend more effort proving these facts than generating long speculative risk lists.

### 3. Look where grep stops

Follow effects beyond direct callers:

- pinned third-party library behavior;
- generated or serialized formats;
- DB columns and migrations;
- API payloads;
- files read by another process or language;
- caches and persistent state;
- feature flags and configuration;
- teardown, async ordering, retries, and timeouts;
- hidden contracts encoded by tests or historical fixes.

Use connected GitHub/files/web sources when necessary and cite concrete evidence. Never invent a caller or downstream contract.

### 4. Separate confirmed risks from cleared risks

For each confirmed risk, state:

- failure mechanism;
- affected surface;
- likelihood;
- impact;
- evidence;
- cheapest decisive check.

Also record important risks that were investigated and cleared, with the evidence that clears them.

### 5. Prove the critical assumptions

Prefer a deterministic check that exercises the real path. If code execution is available, run the smallest test or script that can falsify the assumption. If only repository access is available, identify the exact executable proof that should be run and classify the result as `INCONCLUSIVE` until it is actually executed.

When the observation passes suspiciously easily, challenge the observation method before declaring the system safe.

## Output

Return:

### What changed
A concise semantic description of the change.

### Safety assumptions
For each critical assumption, include its confidence level and evidence.

### Confirmed risks
Only risks with a concrete failure path or meaningful supporting evidence.

### Cleared
Important suspected risks that were checked and ruled out.

### Verification
Show the executable/runtime evidence when available. Otherwise state the exact missing check.

### Verdict
Use `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`. Do not round `INCONCLUSIVE` up to a pass.
