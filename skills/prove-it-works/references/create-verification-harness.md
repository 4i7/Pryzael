# Create a project verification harness

Use when the project lacks a repeatable executable path that proves real behavior. Prefer an existing repo-native verification surface before creating any Pryzael-specific wrapper.

## 1. Interview the repository

Determine from source/docs where possible:

- **Surface.** Web UI, CLI/TUI, desktop/mobile app, API/service, library, or multiple surfaces.
- **Run.** Existing build/dev/start commands, env, ports, seed/auth requirements.
- **Drive.** Existing Playwright/Cypress/PTY/expect/curl/integration harnesses before inventing a new one.
- **Observe.** Screenshots, transcripts, response bodies, logs, exit codes, persisted state, emitted files/messages.
- **Isolate.** Whether parallel instances can use separate ports/data/profile/state.

If the checkout cannot start as documented, fix or report that base failure before generating verification instructions around it.

## 2. Prefer the smallest durable lever

Order of preference:

1. an existing test/verification command that already exercises the real surface;
2. a small script/Make/npm/task entry that composes existing primitives;
3. a project-local verification guide/feature map when the workflow is too rich for one command;
4. a host-specific Skill wrapper only when it adds value without becoming the executable source of truth.

Do not duplicate launch commands, selectors, or expected states across several authorities if one generated/readable source can own them.

## 3. Define the contract

The harness/guide should specify:

- launch/readiness and teardown;
- a read-only doctor check;
- stable drive handles/commands;
- evidence to preserve and where;
- cleanup that kills only what the run started;
- top user-facing features and the observable end state that proves each one.

Proof should exercise the real user/downstream path, not internal setters or test-only backdoors. Verify side effects as well as visible output.

## 4. Prove the harness itself

Run launch -> doctor -> one representative feature -> evidence capture -> cleanup. Confirm evidence survives cleanup. A generated harness that has never executed successfully is a draft, not proof infrastructure.
