# Runtime operations and observability

## Purpose

This document records the operational boundary of the public Pryzael MCP Worker. It describes what the current deployment is expected to expose and log, and which changes require a fresh threat-model review.

It is not workflow, Skill, protocol, or evaluation authority.

## Current public runtime

The deployed Worker exposes only:

- `/mcp` — the stateless read-only MCP endpoint;
- `/health` — service/version/tool-count health metadata.

The Worker does not hold GitHub credentials, private repository data, user accounts, a database, KV/D1/R2/Queues, Durable Objects, or Pryzael-owned model/API credentials. It does not execute package-local scripts; resources are returned as text.

The endpoint is intentionally unauthenticated while this threat model remains true: it serves public workflow material and has no mutation/private-data authority.

Authentication must be reconsidered before adding private data, write capabilities, credentials, per-user authorization, or another capability whose confidentiality/integrity depends on caller identity.

## Application logging

The current application-level tool-call log records only:

- event name;
- canonical Skill name;
- MCP tool name;
- whether the call returned a workflow body or a package-local resource.

Pryzael application code does not intentionally write the user's request text, Skill body, or returned resource body into its own `console.log` event.

This statement is limited to Pryzael application logging. It is not a claim about every field the Cloudflare platform may collect in invocation or infrastructure logs.

## Cloudflare observability configuration

`wrangler.jsonc` currently enables Workers observability with:

- logs enabled;
- `head_sampling_rate: 1` (100% head sampling);
- persisted logs enabled;
- invocation logs enabled;
- traces disabled.

Retention limits, quotas, pricing, and platform-collected metadata are external Cloudflare product behavior and can change independently of this repository. Operational decisions that depend on those values must use the current Cloudflare documentation and the actual account/dashboard rather than a stale value copied into Pryzael source documentation.

Before introducing private or sensitive capabilities, review the real log fields and retention policy again. Do not assume that the current public-data threat model remains sufficient after such a change.

## Sampling policy

100% head sampling is acceptable for the current small public read-only runtime because it gives direct operational evidence while the request volume is low.

It is not a permanent correctness invariant. Reduce sampling if measured traffic, log volume, cost, or signal-to-noise makes full sampling unjustified. A sampling change must preserve enough evidence to diagnose runtime failures and should be documented with the operational reason.

## Abuse and availability

Unauthenticated does not mean unlimited traffic is an architectural requirement.

No application-level rate limiter is currently required by the evidence available in this repository. Add one only when measured abuse, availability pressure, or cost justifies the extra runtime mechanism.

If a rate limiter is introduced, prefer a narrow edge/runtime control that:

- does not become workflow or user-state authority;
- does not require Pryzael to proxy credentials;
- distinguishes availability protection from authentication/authorization;
- keeps `/health` and `/mcp` behavior explicit;
- has a deterministic configuration and a bounded failure mode.

Cloudflare's Worker rate-limiting facilities are one possible implementation, but product availability and limits are external facts and must be re-checked at implementation time.

## Operational review triggers

Perform a fresh security/operations review before any change that adds:

- private workflow/resource content;
- repository or external-service credentials;
- mutation/write operations;
- per-user state or authorization;
- persistent application storage;
- server-side model/API calls;
- connector proxying;
- large binary/resource delivery;
- materially higher public traffic or abuse exposure.

Those changes invalidate assumptions behind the current minimal unauthenticated/stateless design.

## Evidence discipline

A healthy `/health` response proves only that the deployed Worker can serve its health route with the reported version/tool count. It does not prove MCP invocation from a specific ChatGPT product surface.

Likewise, local tests and Wrangler dry-run prove build/runtime properties but not live end-to-end selection or execution. Product-surface qualification remains separate observable evidence.
