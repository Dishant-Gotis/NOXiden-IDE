# NOXiden IDE — Minimal Canonical Documentation Plan

This catalogue intentionally defines **10 consolidated documents**, not 127 separate documents. Each canonical document should absorb related specifications, diagrams, matrices, runbooks, and checklists. Create only the documents needed for the current planning decision, implementation slice, or release gate; do not generate all ten at once.

## Documentation rules

- Keep one source of truth for each subject. Put diagrams and tables inside the relevant canonical document or its adjacent `diagrams/` assets.
- Expand a document when a related subsystem is implemented; do not create a separate file for every traditional document type.
- Create standalone machine-readable artifacts only when useful or required, such as OpenAPI for a real HTTP API, JSON schemas for tool contracts, or CI configuration.
- Mark content `proposed`, `planned`, `implemented`, `verified`, or `deferred` accurately.
- If a topic does not apply (for example, Kubernetes for a local desktop app with no hosted backend), omit it and record the reason only if the decision could be misunderstood.

## The 10 canonical documents

| ID | Canonical document | Minimum contents | When to create/update |
|---|---|---|---|
| DOC-01 | `PRODUCT_REQUIREMENTS.md` | Product vision, scope/non-goals, users and workflows, functional/non-functional requirements, constraints, assumptions, acceptance criteria, lightweight traceability matrix, supported OS targets | First planning deliverable; update when scope changes |
| DOC-02 | `ARCHITECTURE.md` | System context, architecture alternatives, selected stack, HLD, module boundaries, diagrams, data flows, key sequences/state machines, integrations, dependency choices, performance goals, links to ADRs | Before foundational implementation; evolve with architecture |
| DOC-03 | `ARCHITECTURE_DECISIONS.md` | Concise ADRs: context, options, decision, consequences, evidence, date, revisit triggers | Whenever a material long-lived decision is made |
| DOC-04 | `DESKTOP_UX_AND_EDITOR.md` | Native desktop behavior, window/workspace lifecycle, UI layout, editor/terminal/Git/debugging/language tooling, keyboard shortcuts, accessibility, extension UX, design system, interaction states | Before and during UI/editor implementation |
| DOC-05 | `CORE_INTERFACES_AND_DATA.md` | Rust modules, internal IPC/contracts, provider adapter contract, extension/tool interfaces, settings and persistence, schemas, migrations, errors, events, configuration, data lifecycle | As core contracts and persistence are designed |
| DOC-06 | `SECURITY_AND_AGENT_SAFETY.md` | Threat model, trust boundaries, secrets, permissions, workspace file access, process/shell execution, sandboxing, prompt injection, extension trust, privacy/data flow, security testing, incident response basics | Initial threat model before agent tools; update before risky capabilities/releases |
| DOC-07 | `AI_MODEL_AND_AGENT.md` | Agent task loop, context strategy, prompts, tool calling, model/provider capabilities, RAG only if needed, model selection, fine-tuning, dataset/model cards, inference serving, evaluation, observability, model rollback | Start with agent/provider design; add training details when training begins |
| DOC-08 | `QUALITY_AND_TESTING.md` | Test strategy, test plan, test types, acceptance/test cases, automation, cross-platform matrix, performance baselines, security tests, regression tracking, quality gates | Establish before first vertical slice; update with features |
| DOC-09 | `DEVELOPER_AND_RELEASE_GUIDE.md` | README essentials, environment setup, repository structure, coding/style/Git/review conventions, contribution guide, dependency/license policy, CI/CD, builds, installers, signing/notarization, updates, rollback, changelog, troubleshooting, release checklist, SBOM approach | Start with contributor setup; expand before public beta |
| DOC-10 | `OPERATIONS_AND_RISK.md` | Risk register, technical debt, support policy, diagnostics/logging, crash recovery, incident handling, RCA template, recovery/backup decisions, capacity/SLO/DR only for actual hosted services, production readiness checklist | Maintain risks from the start; expand operational sections when relevant |

## Consolidation map

Use these merges instead of creating separate files for every traditional document:

- SRS, technical/system specification, use cases, constraints, acceptance criteria, RTM → `PRODUCT_REQUIREMENTS.md`.
- SAD, HLD, relevant LLD, context/container/component diagrams, DFDs, sequence/state diagrams, integration/dependency architecture → `ARCHITECTURE.md`; consequential choices → `ARCHITECTURE_DECISIONS.md`.
- Frontend/UI architecture, component specs, design system, navigation, state, accessibility, responsiveness/window scaling, UI performance → `DESKTOP_UX_AND_EDITOR.md`.
- API contracts, internal IPC, configuration, database/data dictionary, persistence, migrations, caching and data lifecycle → `CORE_INTERFACES_AND_DATA.md`, but only include a database if the selected design needs one.
- Threat model, security architecture, secure coding, identity/permissions, key management, audit/logging, sandbox, prompt injection, approval policy, security incident basics → `SECURITY_AND_AGENT_SAFETY.md`.
- AI architecture, model selection/card, dataset card, fine-tuning, serving, prompts/context, RAG if applicable, orchestration, evaluation, LLM observability and rollback → `AI_MODEL_AND_AGENT.md`.
- Test strategy/plans/cases, unit/integration/E2E/API tests, performance/stress/security tests, automation and regressions → `QUALITY_AND_TESTING.md`.
- Developer docs, CI/CD, build artifacts, infrastructure needed for releases, packaging, signing, update, deployment/release/rollback and migration instructions → `DEVELOPER_AND_RELEASE_GUIDE.md`.
- Monitoring, incident response, RCA, DR/backup/restore, capacity, SLOs, reliability, technical debt and operational readiness → `OPERATIONS_AND_RISK.md`, with hosted-service topics conditional.

## Priority and incremental order

**Foundation (start with only these):**
1. `PRODUCT_REQUIREMENTS.md`
2. `ARCHITECTURE.md`
3. `ARCHITECTURE_DECISIONS.md` (begin with the desktop foundation/editor/extension strategy decision)
4. `SECURITY_AND_AGENT_SAFETY.md` (initial threat model only)
5. `QUALITY_AND_TESTING.md` (initial quality strategy)

**As the first vertical slice is designed and built:**
- Add the relevant parts of `DESKTOP_UX_AND_EDITOR.md`, `CORE_INTERFACES_AND_DATA.md`, and `AI_MODEL_AND_AGENT.md`.
- Create `DEVELOPER_AND_RELEASE_GUIDE.md` early enough for contributors to build and test locally.

**Before public beta/release:**
- Complete platform build, packaging, signing, updater, license, dependency/SBOM, compatibility, security, troubleshooting, and release-checklist sections.
- Expand `OPERATIONS_AND_RISK.md` only for actual operational responsibilities and any hosted services that exist.

Do not create blank templates. A document is complete only when its content is specific to NOXiden, useful to developers, consistent with the implementation, and appropriately verified.
