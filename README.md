# Pryzael

Portable engineering skills for ChatGPT and other Agent Skills-compatible clients, adapted from selected `pstack` skills.

Pryzael is a source-of-truth repository. A GitHub repository is not itself a ChatGPT skill registry. Each directory under `skills/` is an independent Agent Skills package whose runtime manifest is its own `SKILL.md`.

## Skills

- `architect` — settle caller usage, data shapes, invariants, interfaces, and ownership before implementation.
- `blast-radius` — find non-obvious downstream breakage and prove the safety assumptions a change depends on.
- `figure-it-out` — orchestrate large, cross-cutting, unusual, or multi-phase work around falsifiable completion criteria.
- `show-me-your-work` — keep an auditable decision/evidence/result trail for handoffs and long work.
- `interrogate` — adversarially review a diff, PR, exact commit, or design and separate real findings from noise.
- `fix-root-causes` — reproduce failures, trace violated invariants, and repair the defect class rather than one symptom.
- `sequence-verifiable-units` — split multi-step work into independently checkable transitions and verify before advancing.
- `prove-it-works` — verify completion claims against the exact artifact and strongest available real behavior path.

## Runtime model

Pryzael follows the Agent Skills open format:

```text
skills/<name>/
  SKILL.md                 required manifest and instructions
  references/              optional, loaded on demand
  assets/                  optional templates/resources
  scripts/                 optional executable helpers
  LICENSE.pstack.txt       upstream notice for these adaptations
```

The `name` and `description` in each `SKILL.md` are the discovery surface. Keep them precise. Detailed procedures belong in the body or on-demand references.

Installed ChatGPT skills can be selected explicitly or activated automatically when the product and account surface support Skills. This repository intentionally does not assume that linking GitHub makes its skill folders automatically installable.

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for:

- WebChatGPT/Agent Skills loading boundaries;
- composition and trigger precedence;
- GitHub exact-head review semantics;
- capability detection and read/write boundaries;
- verification and audit contracts;
- packaging and validation rules.

See [`docs/WEBCHATGPT.md`](docs/WEBCHATGPT.md) for the product-facing deployment notes.

## Validation

The authoritative format validator is the Agent Skills `skills-ref` validator when available:

```text
skills-ref validate ./skills/architect
```

Pryzael also carries a lightweight repository check:

```text
python scripts/validate_skills.py
```

It checks the subset of format and packaging invariants Pryzael relies on. It is not a replacement for the upstream validator.

## Provenance

These materials are adapted from selected skills in Cursor's `pstack` plugin. Upstream pstack is MIT licensed. Each independently distributable skill folder contains `LICENSE.pstack.txt` so the notice remains present when a skill is copied or uploaded without the repository root.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for repository-level provenance.
