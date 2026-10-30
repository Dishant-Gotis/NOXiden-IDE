---
trigger: model_decision
description: Apply when changing or evaluating the NOXiden desktop architecture, editor foundation, Rust core, extension ecosystem, cross-platform support, or module boundaries.
---

# Architecture and Platform Rules

## Architecture principles

- NOXiden is a native/installable desktop product, not a browser-based web app. Do not build, ship, or pivot to a web-only version. Any embedded webview must live inside the packaged desktop application and must be justified by an approved ADR. Prefer native desktop behavior, filesystem/process integration, keyboard-first workflows, and OS credential facilities.

- Prefer a modular desktop application over microservices by default. Add process boundaries where they improve privilege separation, crash isolation, extension isolation, or a real integration requirement.
- Keep UI, native workspace services, agent orchestration, provider adapters, extensions, and release infrastructure separated by explicit interfaces.
- Rust is the preferred language for performance-sensitive native/core services (filesystem operations, process lifecycle, concurrency, indexing, IPC, permission enforcement). Use the best-supported ecosystem for a capability where that is materially safer or more maintainable; do not rewrite the entire product in Rust on principle.
- Keep model providers behind a common adapter contract. Distinguish provider API capabilities instead of pretending all APIs expose the same context window, tools, token counts, billing, quotas, streaming, or structured-output behavior.
- Do not couple basic editor, file, Git, or local-terminal functions to a hosted NOXiden service.

## Architecture selection gate

Before committing to a major architecture, inspect the repository and produce a small, evidence-based ADR comparing at least:

1. Code - OSS / an existing editor platform.
2. A custom installable desktop app with a Rust core; if Tauri or another embedded-webview shell is considered, evaluate it strictly as a desktop runtime and document trade-offs.
3. Other credible alternatives only when they offer a material advantage.

Compare feature parity, extension APIs, debugger/language tooling, maintainability, Rust integration, performance, accessibility, packaging, signing/updates, security boundaries, licensing, upstream divergence, and development cost. State the chosen approach and rejected alternatives with reasons. Do not spend a long implementation phase before this decision is recorded.

### Extension ecosystem and legal boundaries

- Do not assume the MIT-licensed Code - OSS repository makes the branded Visual Studio Code distribution, Visual Studio Marketplace, proprietary extensions, icons, or services freely redistributable or available to a fork.
- Verify current Microsoft licensing and Marketplace terms from official sources before using those services. Consider Open VSX or a separately governed extension source; evaluate coverage, publishing rules, package signing, malware handling, update policy, and compatibility.
- Do not claim complete VS Code extension compatibility until a defined compatibility matrix has passed tests. Build a staged feature/extension parity matrix and prioritize a useful first release.
- Keep NOXiden branding, visual assets, product identity, and documentation original. Do not copy proprietary Antigravity assets or imply affiliation.
- Treat extensions as potentially hostile executable code. Define trust prompts, permissions, update integrity, workspace trust, and isolation boundaries before enabling broad extension capabilities.

## Cross-platform architecture

- Treat Windows, macOS, and Linux as release targets, not assumptions based on one developer machine.
- Specify platform-dependent paths, process behavior, shells, permissions, credential stores, embedded UI runtime dependencies, and terminal behavior through adapters where needed.
- Define supported OS versions and actual release formats deliberately. Do not promise every possible installer format in the first release without an owner and test plan.
- Cross-platform support is verified only when build and smoke-test evidence exists for the relevant platform.

## Architecture Decision Records

Create an ADR only for a material decision. Each ADR must include status, context, constraints, considered options, decision, consequences/trade-offs, references, and revisit triggers. Do not write speculative ADRs for decisions that are not yet needed.
