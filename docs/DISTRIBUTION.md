# Distribution and licensing

## Purpose

This document defines how Pryzael source, Skill packages, generated MCP artifacts, and third-party notices relate when the project is copied, packaged, or deployed.

It is a distribution guide, not a second workflow or evaluation authority.

## Repository license

Unless a file states otherwise, Pryzael-authored source code and documentation in this repository are licensed under the MIT License in the repository-root [`LICENSE`](../LICENSE).

Selected Skill material is adapted from the MIT-licensed `pstack` plugin. Those upstream portions retain their original copyright and MIT notice. Repository-level provenance is recorded in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md), and every independently distributable Skill package carries `LICENSE.pstack.txt` so the upstream notice survives package-level copying.

The root Pryzael license does not erase or replace third-party attribution. Both the Pryzael license and applicable upstream notices should be preserved when redistributed.

## What to preserve when redistributing

### Full repository or source archive

Preserve at least:

- root `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- package-local `skills/*/LICENSE.pstack.txt` notices;
- source files required by the distribution.

### Individual Skill package

A standalone distribution of `skills/<name>/` contains both adapted upstream material and Pryzael-authored modifications. The distribution should therefore carry both license layers:

- include a copy of the repository-root Pryzael `LICENSE` with the standalone distribution;
- retain the package's `LICENSE.pstack.txt` upstream notice;
- retain `SKILL.md`;
- retain any package-local `references/`, `assets/`, or `scripts/` files that are part of the distributed package.

The root license does not need to become canonical Skill semantic material and should not be inserted into the Skill workflow body or MCP model-visible resource set solely for licensing purposes. It only needs to accompany the redistributed package so the Pryzael-authored license terms remain available outside the repository root.

### Remote MCP deployment

Deploying the generated MCP projection does not create a new workflow authority or a new license boundary. Canonical workflow material remains under `skills/<name>/`, and the generated catalog is a derived build artifact.

A source distribution used to build or deploy the Worker should preserve the same root and third-party notices described above.

## Generated artifacts

`worker/generated/catalog.mjs` is disposable derived output. It is generated from canonical Skill packages and plugin metadata and must not become a separately hand-maintained source of workflow semantics.

Distribution and deployment pipelines should prefer regenerating it from exact source rather than treating a previously generated copy as independent authority.

## Qualification material

Public evaluation contracts, schemas, commitments, and public development fixtures in this repository follow the repository license unless a file states otherwise.

Hidden qualification packets, hidden SUBJECT responses, hidden Judge material, and private qualification ledgers are intentionally kept outside this repository. Their absence from the public repository must not be interpreted as permission to publish or reconstruct them.

## Provenance boundary

Pryzael generalizes and adapts selected pstack procedures for ChatGPT, Codex, Agent Skills, and MCP-compatible hosts. Adapted behavior may diverge from upstream pstack behavior. Upstream provenance therefore identifies source material; it does not make upstream pstack an authority for current Pryzael semantics.

For current Pryzael workflow semantics, use the exact Pryzael Skill package and repository revision being evaluated or deployed.
