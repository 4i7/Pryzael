# Pryzael Behavioral Conformance Lab (R4)

## Authority and purpose

This directory is evaluation authority, not production Skill semantic authority. Production still flows from `skills/<name>/` packages. R4 evaluation uses a frozen public contract plus an independently frozen public qualification commitment plus a development-inaccessible hidden qualification packet, then exactly bound trial records and a deterministic `ADMIT | REJECT | INCONCLUSIVE` evaluator. Skill semantics, routing behavior, parser/generated MCP semantics, and Worker/runtime authority are outside this repair. Hidden chain-of-thought is neither requested nor judged.

## Held-out architecture decision

The previous R4 head committed full qualification prompts and answer-bearing predicates to `evaluation/corpus/held-out.json`. That material was frozen but not held out, so it is invalidated and removed.

Two viable isolation architectures were compared. An evaluator-only encrypted artifact in the development repository can hide plaintext only if key custody, decryption authorization, distribution, and non-disclosure are separately enforced; here it would add a second security authority and risk security theater. The selected design is an independent hidden packet with a public cryptographic commitment: the repository contains only immutable evaluation rules, packet/commitment schemas, admission code, and public manifest; an independent qualification authority creates and retains the packet outside candidate-development access and publishes only its commitment.

The repository must not contain a final hidden qualification packet. The Lab rejects `evaluation/corpus/held-out.json`, `evaluation/qualification-packet.json`, and equivalent repository-visible qualification payloads.

## Two-stage freeze

This repair does **not** create or inspect a final hidden packet.

Stage 1 freezes `evaluation/contract.json`, the packet/commitment/result schemas, the executable Lab authority, and `evaluation/frozen-manifest.json`. Stage 2 is performed only by an independent qualification authority after R4 Lab merge and before R4C baseline measurement: create a new packet outside the development repository, validate frozen family coverage, compute its exact SHA-256 and byte count, and publish only `evaluation/qualification-commitment.json` with qualification-set ID, packet schema/version, packet digest/bytes, task IDs/families/task digests, and freeze authority/timestamp. Prompts, success/critical predicates, judge material, and answers remain hidden. The same committed packet is used for `NO_PRYZAEL`, `CURRENT_PRYZAEL`, and later `CANDIDATE_PRYZAEL`.

The former repository-visible held-out prompts are not reusable qualification material and must not seed the final packet.

## Exact result identity binding

Every authoritative trial binds the evaluation-contract ID/SHA-256, Stage-1 manifest ID/SHA-256, qualification-set ID, Stage-2 commitment and hidden-packet SHA-256, exact task ID/family/partition/digest, R3 protocol revision, condition, exact Pryzael source commit/tree/plugin/canonical Skill-tree/package identity where applicable, activation mode/surface, observer revision, host/model/config/product/transport observations, ordinary tool availability, authority-envelope ID, and trial-protocol budget ID. Unobservable facts remain `UNKNOWN`.

`CURRENT_PRYZAEL` is frozen to source commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, plugin `0.3.0`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, and R3 protocol blob `90ea867c0495162eae4aebe00d3467b18afe4577`. Candidate identities are recorded only after the candidate is frozen; mixed artifacts are rejected.

## Metric authority and polarity

Each mechanically consumed metric is defined once in `evaluation/contract.json` with ID, semantic definition, applicability, domain, polarity, `NOT_APPLICABLE`/`INCONCLUSIVE` semantics, aggregation rule, and role (`AUTHORITATIVE`, `CRITICAL`, or `DIAGNOSTIC`). Important directions are explicit: `FALSE_VERIFIED = ABSENT_IS_BETTER`, `EVIDENCE_ADEQUACY = ADEQUATE_IS_BETTER`, and `REPLANNING_COMPETENCE = APPROPRIATE_REPLAN_IS_BETTER`. `SOLUTION_CLASS_COLLAPSE` is diagnostic and cannot reject a candidate by itself.

## Critical predicates and replanning

Qualification tasks own their exact critical predicate IDs. Trial records must observe every frozen success and critical predicate. An applicable critical predicate `VERIFIED` is disqualifying and cannot be averaged away; `INCONCLUSIVE` blocks `ADMIT`. Critical applicability remains task-specific.

`REPLANNING_COMPETENCE` measures response to material evidence change rather than plan-change frequency. Replanning tasks freeze observable prior assumption, new evidence, and material invalidation structure. Trials record the observed response and judge one of `APPROPRIATE_REPLAN`, `FAILED_TO_REPLAN`, `UNJUSTIFIED_PLAN_CHURN`, or `INCONCLUSIVE`; non-replanning tasks use `NOT_APPLICABLE`. Appropriate replanning cannot be awarded without material invalidation.

## Condition/surface separation and no-Pryzael control

`CONDITIONED_BEHAVIOR`, `NATIVE_AUTOMATIC_SKILL_SELECTION`, `MCP_AUTOMATIC_TOOL_SELECTION`, and `FORCED_INVOCATION_CALIBRATION` are mechanically separate. Native and MCP surfaces are distinct. Skill-body-only candidate admission uses conditioned qualification evidence; routing/discovery changes additionally require complete, separate native and MCP automatic-routing evidence. Forced invocation is calibration-only.

`NO_PRYZAEL` removes Pryzael procedural assistance while preserving ordinary engineering tools. The evaluator compares task revision, host/product surface, model/configuration where observable, observer, transport, ordinary tools, product version, authority envelope, and protocol budget. Known asymmetry yields `INCONCLUSIVE`; unknown facts remain `UNKNOWN`. GitHub/code/test tools are not removed simply because Pryzael is absent, and Pryzael procedural language is not leaked into the shared task prompt.

## Executable admission

`evaluateCandidateAdmission()` fail-closes on malformed or incomplete evidence. It enforces exact required N and task/condition/index/mode/surface matrix, missing/duplicate trials, partition and identity consistency, no-Pryzael comparability, critical overrides, authoritative inconclusive handling, total/family task-success non-inferiority, critical/repeated-same-task regressions, autonomy/replanning/ceremony limits, and diagnostic non-authority. Aggregation also rejects mixed partitions, conditioned/automatic modes, native/MCP surfaces, duplicate slots/IDs, and mixed Pryzael artifact identities. Deterministic categorical/count gates are used; no statistical significance is fabricated.

## Contamination guard and later procedure

The frozen authority records `AUTHORITATIVE_BASELINE_MEASURED = false` and `HELD_OUT_RESULTS_OBSERVED = false`. Only synthetic evaluator mechanics/schema/integrity checks are allowed in this repair.

After independent R4 repair review and merge: (A) independent authority creates the hidden packet outside development access; (B) publishes the non-secret commitment before R4C; (C) R4C verifies exact packet bytes and evaluates `NO_PRYZAEL` and `CURRENT_PRYZAEL`; (D) a future R5 candidate is developed without packet access and frozen to exact identity; (E) an independent qualifier evaluates that candidate against the same packet; (F) frozen R4 admission computes the decision. Candidate authors cannot mutate packet or evaluation rules.

The next admissible action after this repair is **independent R4 repair review only**.
