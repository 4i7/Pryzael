# Development and qualification guide

## Purpose

Pryzael deliberately separates workflow semantics, generated projections, runtime behavior, and behavioral qualification. This guide gives contributors one entry point for deciding which authority and validation path applies to a change.

It does not replace the detailed contracts in `ARCHITECTURE.md`, `docs/PROTOCOL.md`, or `docs/EVALUATION.md`.

## Canonical commands

Install the exact dependency graph from the lockfile:

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

Validate canonical Skill-package invariants:

```bash
npm run validate:skills
```

Run the repository qualification chain:

```bash
npm run check
```

`npm run check` currently runs, in order:

1. `npm run qualify:head-authority`
2. `npm run qualify:r1`
3. `npm run qualify:r4-lab`

Use the package scripts as the command authority rather than duplicating implementation filenames in contributor instructions. This keeps documentation stable if an underlying validator implementation changes language or filename.

## Which authority applies?

| Change type | Primary authority | Minimum local check | Additional gate considerations |
|---|---|---|---|
| README, explanatory docs, licensing/provenance only | repository documentation and distribution boundary | inspect exact diff; verify referenced commands/files exist | must not silently redefine Skill, protocol, or evaluation semantics |
| `skills/<name>/**` semantic change | canonical Skill package + HEAD semantic authority | `npm run check` | only admitted package mutations may pass HEAD semantic authority; hidden qualification rules remain separate |
| Skill package structure/frontmatter/resource change | canonical Skill package contract | `npm run validate:skills`, then `npm run check` | generated MCP projection must remain derived and equivalent |
| MCP generator or Worker change | MCP projection/runtime contract | `npm run check` | preserve stateless/read-only boundary unless an explicit architecture change is approved |
| qualification scripts/tests/authority metadata | corresponding R1/R4 authority | `npm run check`; historical oracle where applicable | changing qualification machinery must not silently change frozen semantic identity |
| `evaluation/**` or R4 evaluation semantics | `docs/EVALUATION.md` + frozen executable authority | `npm run check` | held-out material must remain outside candidate-development access |
| deployment configuration | runtime/deployment contract | `npm run check` plus deployment-specific dry-run/evidence | local/static success does not prove live product-surface behavior |

## Contributor decision flow

```text
What is changing?
        |
        +-- workflow semantics? ----------------------> canonical Skill + HEAD authority
        |
        +-- package/projection/runtime mechanics? ----> R1 structural/runtime qualification
        |
        +-- evaluation authority or evidence schema? -> R4 executable authority
        |
        +-- docs/license/provenance only? ------------> documentation/distribution boundary

Then ask:

1. Is the exact artifact/revision identified?
2. Does the change alter an authority boundary or only describe it?
3. Which package script proves the required invariant?
4. Is hidden qualification required, forbidden, or irrelevant at this phase?
5. What evidence is still unavailable?

If a required predicate cannot be observed, keep it `INCONCLUSIVE`; do not convert missing evidence into a pass claim.
```

## Semantic versus generated artifacts

`skills/<name>/SKILL.md` and package-local resources are canonical workflow sources.

`worker/generated/catalog.mjs` is disposable derived output. Do not edit generated workflow text as a second implementation. Regenerate it through the repository build/qualification path.

The version exposed by the generated MCP catalog is derived from `.codex-plugin/plugin.json`; do not introduce a second runtime version authority.

## Exact-artifact discipline

For reviews, CI evidence, and qualification claims, prefer exact commit/tree identities over moving branch names. A verdict for one candidate SHA does not automatically apply after the branch head moves.

When a workflow explicitly checks an expected candidate SHA, preserve that identity check rather than replacing it with a moving checkout.

## Behavioral qualification boundary

Structural and runtime checks can prove package validity, deterministic projection, protocol behavior, and deployment buildability. They cannot by themselves prove that Pryzael improves model behavior on held-out engineering tasks.

R4/R4C behavioral evidence is a separate authority. Follow `docs/EVALUATION.md` for the current state, frozen comparator identity, hidden-packet isolation, and candidate-admission sequence.

Public development fixtures may be used for mechanics and regression work. Hidden qualification prompts, predicates, responses, Judge material, and result-bearing feedback must not enter ordinary candidate-development context.

## Security and dependency hygiene

Correctness qualification and vulnerability-management checks solve different problems. Do not weaken deterministic qualification by making it depend on live advisory availability. Security scanning, dependency review, and workflow supply-chain hardening should be maintained as separate controls when added.

Trusted GitHub Actions should prefer immutable full commit SHA references where practical, consistent with Pryzael's exact-artifact provenance model.

## Distribution

See [`docs/DISTRIBUTION.md`](DISTRIBUTION.md) for the repository MIT license, pstack attribution, standalone Skill redistribution, generated artifacts, and qualification-material boundaries.
