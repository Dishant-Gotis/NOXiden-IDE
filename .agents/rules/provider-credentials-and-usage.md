---
trigger: model_decision
description: Apply when designing provider configuration, API-key entry, model selection, usage dashboards, quotas, cost estimates, rate limiting, or endpoint health.
---

# Provider, Credentials, and Usage Rules

## Provider adapter contract

- Keep providers behind a documented adapter contract. Represent supported features explicitly: streaming, tool calls, JSON/structured output, context window, input/output token counts, usage data, provider-reported quota, request IDs, cancellation, and model capabilities.
- A generic OpenAI-compatible endpoint is a compatibility mode, not proof that every OpenAI feature behaves identically.
- Support user-defined endpoints only with clear validation and secure handling. Warn about arbitrary endpoints and ensure they cannot silently redirect credentials or leak project context.

## API-key protection

- Store credentials using the OS credential manager/keychain where supported. If encrypted local fallback storage is necessary, document threat-model limitations and avoid inventing custom cryptography.
- Never save credentials to tracked configuration, plain JSON/YAML, local logs, frontend code, browser storage, crash payloads, analytics, or URLs.
- Mask tokens in all UI states. Prevent accidental reveal, clipboard logging, and secrets appearing in error details.
- Do not send a configured key to a different endpoint or provider without clear user consent. Validate endpoint changes and account for redirects.
- Provide deletion and rotation flows and explain how users can revoke provider tokens.

## Usage and quota truthfulness

- Distinguish `locally measured`, `provider reported`, and `estimated` metrics in the UI and persisted records.
- Track local request counts, known token usage, elapsed time, latency, failures, and cancellation where data is available. Avoid describing a request count or endpoint metric as account-wide billing.
- Do not show “remaining quota”, account balance, or exact cost unless the provider exposes authoritative data and the adapter has verified the semantics. Otherwise show “not available from provider” or a clearly labelled estimate.
- Define behavior for missing usage fields, streaming interruptions, retries, cached responses, failed calls, and provider-specific billing rules. Do not double-count retries or claim token precision without source data.
- Handle HTTP 429 and provider-specific throttling with bounded backoff, respect `Retry-After` when supplied, and keep users informed. Do not automatically retry non-idempotent actions without considering duplicate effects.
- Allow user-set budgets/alerts where feasible; explain that a local budget warning may not be a hard provider-enforced spending cap.

## Privacy and network behavior

- Before a request, make clear which configured provider receives prompts and source context. Avoid sending entire repositories when targeted context is sufficient.
- Offer controls for history retention and sensitive-context inclusion where applicable. Redact data in local diagnostics.
- Test connectivity, authentication, model availability, streaming, timeouts, error normalization, rate limiting, and endpoint changes without logging secrets.
