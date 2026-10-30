# NOXiden IDE — Master Engineering Playbook

**Status:** Living project reference and decision framework  
**Product:** NOXiden IDE  
**Last researched:** 2026-10-30  
**Audience:** Antigravity, developers, reviewers, and maintainers

> This file defines product intent and engineering guardrails. It is not a command to perform every phase in one session. Follow the task and phase rules in the root `AGENTS.md`.

## 1. Product north star

NOXiden IDE is intended to become an open-source, installable native desktop development environment for Windows, macOS, and Linux, with a polished, VS Code-class workflow and agentic coding features inspired by modern AI IDEs. It is not a browser-based web app or web-only product. An embedded webview may be used only as an implementation detail of an installed desktop application and only after the desktop architecture is evaluated and approved. Its users should be able to install it on Windows, macOS, or Linux, work in local repositories, choose their AI provider, inspect usage where data is available, and control how agents interact with code and tools.

The project owner plans to fine-tune a coding model on local GPU hardware and may publish the model/adapter on Hugging Face and serve it from an inference endpoint. The IDE must be useful before that model exists and must not depend on one provider.

### Product goals

- A coherent desktop IDE: explorer, tabs, editor, search, command palette, terminal, Git, diagnostics, language tooling, debugging integrations, settings, themes, accessibility, and extension management.
- Agentic workflows: repository-aware context, planning, file reads/search/edits, patch review, approved process execution, test feedback, bounded iterative repair, cancellation, and history.
- Provider choice: user-configured credentials/endpoints, provider abstraction, per-model capability reporting, safe secret storage, rate-limit/error handling, honest usage and quota display.
- Extensibility: a versioned extension API and a legally and operationally viable extension source. Compatibility is a target to measure, not an assumption.
- Distribution: tested installable artifacts, trustworthy updates, release notes, code-signing/notarization planning, dependency/license compliance, and maintainable cross-platform CI.
- Open-source sustainability: contributor guidance, governance basics, security disclosure, dependency hygiene, and documentation kept in sync with code.

### Non-goals unless explicitly approved

- Training a foundational model from scratch.
- Requiring a NOXiden cloud account or central service for normal local editing.
- Sending user source code or telemetry to NOXiden by default.
- Rebuilding every feature in the first release.
- Claiming total VS Code extension compatibility before measurable verification.
- Operating a model endpoint or marketplace at public scale before costs, security, operations, and ownership are accepted.

## 2. Engineering principles

1. **Incremental vertical slices:** build the smallest path that users can exercise end to end, then extend it.
2. **Local-first and opt-in network use:** local file editing works without NOXiden infrastructure; remote model calls occur only through the configured provider.
3. **Separate UI, native services, agent runtime, provider adapters, and extension host.**
4. **Rust where it earns its complexity:** prefer Rust for native, performance-sensitive, and security-sensitive core services; use other technologies when their ecosystem materially improves interoperability or maintenance.
5. **Prefer reuse when it delivers real ecosystem value, not blindly:** compare existing desktop editor platforms with custom desktop approaches, including any embedded-webview option, native integration, licensing, and extension constraints.
6. **Security boundaries over prompt instructions:** tools, processes, extensions, credentials, and filesystem access require enforceable controls.
7. **Measurable quality:** tests, builds, performance claims, quota values, and cross-platform support require observable evidence.
8. **Document real decisions:** use ADRs for choices with meaningful long-term consequences and avoid speculative paperwork.
9. **Design for recovery:** cancellation, crashes, partial edits, failed updates, and provider outages must be considered.
10. **Keep users informed and in control:** show diffs, action/permission state, provider selection, and privacy-relevant network behavior.

## 3. Architecture decision: do the due diligence early

The project aspires to a full IDE experience and broad extension support, so the base architecture is one of its highest-impact decisions. Before committing, write a focused ADR comparing:

- Code - OSS or another existing editor platform.
- A custom installable desktop application with a Rust core; if an embedded-webview shell is considered, evaluate it as a desktop packaging/runtime choice, not as a web product.
- Any other well-supported candidate justified by evidence.

Evaluate editor features, extension host/API maturity, language servers, debugging, accessibility, native integration, performance, packaging, update mechanism, contributor workflow, maintenance burden, security boundaries, and licensing.

### Critical extension ecosystem caveat

The `microsoft/vscode` repository is MIT-licensed, but the branded Visual Studio Code distribution and its Marketplace have separate terms. Microsoft's current VS Code FAQ says the Visual Studio Marketplace is for the Visual Studio product family and that alternative products, including Code - OSS forks, are not permitted to access it. Some extensions are proprietary or licensed for the Visual Studio family only.

Therefore, the agent must not propose “fork VS Code and use every Marketplace extension” as an unquestioned plan. Evaluate Open VSX, extension package installs, a NOXiden-run registry, and any other lawful option. Verify the current terms before implementation. Define “compatibility” as a tested matrix by API, extension type, operating system, and extension source.

## 4. Native desktop and local-core boundaries

Candidate responsibilities (final names depend on the ADR):

- **Desktop/UI:** editor experience, panels, command palette, provider settings, diff review, extension UI, accessibility.
- **Native core:** workspace/file operations, process lifecycle, search/indexing, local settings, secure credential APIs, event/IPC boundary.
- **Agent runtime:** task state, context budgeting, plan/execute/observe loops, tool routing, permission checks, cancellation, retries, completion criteria.
- **Provider adapters:** endpoint settings, capability negotiation, streaming, tool-call normalization, usage, error handling, limits.
- **Extension host:** activation lifecycle, extension API, trust, isolation, compatibility, publishing source.
- **Release engineering:** reproducible build inputs, platform packages, signing, update metadata, verification, rollback and release notes.
- **Optional hosted services:** only when approved; document their data flows, cost owner, security, availability, SLOs, and incident response separately.

Do not use HTTP between modules merely by habit. Select IPC or in-process interfaces based on isolation, reliability, and testability needs.

## 5. UI and product-level requirements

The interface should follow familiar IDE information architecture without copying proprietary branding or assets. Evaluate and phase these capabilities:

- Activity/navigation bar, explorer, multi-root workspaces where supported, tabs, split editors, breadcrumbs, minimap if useful, command palette, status bar, keyboard shortcuts, accessible menus.
- Editor integrations: language syntax, diagnostics, formatting, symbol navigation, code actions, completion, rename, refactoring, debugging adapter support, and language servers.
- Integrated terminal with session lifecycle and permission-aware agent access.
- Git status, diffs, stage/unstage, branch awareness, history and safe destructive-action handling.
- AI chat, inline edit, selected-code context, repository context, plan/task view, tool activity, cancellation, diffs, patch application, tests and error feedback.
- Extension browser/manager, theme settings, keybindings, settings search, import/export of settings when appropriate.
- Onboarding, provider configuration, model health, usage activity, privacy information, diagnostics, update information and recovery.

Build a feature parity matrix that labels each item `MVP`, `later`, `not planned`, or `blocked by licensing/technical constraint`. Never claim parity with VS Code or Antigravity solely because the layout looks similar.

## 6. API providers and usage panel

The provider UI should make the user's choices and data trustworthy.

- Add/edit/remove/test providers and endpoints; support model IDs and capabilities.
- Mask keys and use platform credential storage. Keep secrets out of frontend bundles, repository files, query strings and logs.
- Support an account-independent record of local request count, duration, latency, errors, cancellation, and token usage when the provider reports it.
- Label every metric as `measured locally`, `reported by provider`, or `estimated`.
- Only show remaining quota, account-wide usage, and billable cost when the provider supplies reliable authoritative values. Otherwise explain that the data is unavailable or estimated.
- Avoid sending full repositories by default. Send only the selected or indexed context needed for the task, subject to user preferences and provider behavior.
- Document endpoint compatibility, timeout, cancellation, streaming interruption, 429/backoff, retry, provider outages, model removal, and incompatible API behavior.
- A custom endpoint is a trust boundary: handle endpoint URLs, redirects, certificates, and credentials carefully; do not leak a key to a different host.

## 6A. Real workspace editing experience

NOXiden is intended to behave like a coding agent (for example, Codex or Claude Code) operating on the user's actual open project. The agent must not merely return snippets or simulate edits in chat. It must inspect the real workspace, make focused file changes, use actual terminal/tool results, and verify the resulting repository state.

- Resolve and validate workspace paths before reads or writes; respect ignore rules and avoid secrets unless explicitly needed.
- Keep edits on disk and visible in the normal editor, with file-change events, reviewable diffs, and undo/recovery where practical.
- For multi-file or risky tasks, show a plan and make changes in small, inspectable steps.
- Execute commands through a controlled process manager with working-directory limits, timeouts, cancellation, output limits, and approvals for dangerous operations.
- Feed actual command/test output into the next agent step; do not trust the model's claim that an edit or test succeeded.
- Support stop/cancel, bounded retries, partial completion reports, and safe handling of concurrent user edits. Never silently overwrite changes the user made while the agent was working.

## 7. Agentic runtime and safety

The model may propose actions; the application enforces policy. Implement the agent runtime independently from provider-specific API calls.

### Minimum task loop

1. Accept a user task and clarify scope only where needed.
2. Build a bounded project context from allowed files and known tools.
3. Plan steps with completion checks.
4. Request a typed tool call from the model.
5. Validate tool, arguments, paths, permissions, limits, and approval requirements.
6. Execute the action in the correct isolation boundary.
7. Return structured observations, with secrets redacted.
8. Verify repository state and tests; continue only within task/time/token budgets.
9. Stop on success, cancellation, repeated failure, or a permission boundary; report evidence and remaining gaps.

### Required controls

- Workspace-scoped file APIs; path traversal and symlink escape protection.
- Process execution with structured arguments where possible, explicit shell policy, working-directory restrictions, timeout, output limits, and cancellation.
- Human approval for destructive or high-impact actions and sensitive access.
- Clear read/write/execute/network permission separation.
- Tool call count, token/context, retries, wall-clock and output limits.
- Prompt-injection threat model for source files, docs, terminal output, web content, dependencies, tools and extensions.
- Untrusted model output and content must never silently change trust settings, permission scopes, endpoint settings, or secret-handling policy.
- Diff review, checkpoint or version-control recovery for multi-file edits.
- Structured activity history with sensible redaction defaults.

A prompt or system message alone cannot reliably neutralize prompt injection. Mitigate the consequence through least privilege, sandboxing/isolation, explicit approvals and output validation.

## 8. Model development and Hugging Face

The model lifecycle is separate from desktop release engineering.

- First make the application work with a compatible existing model, provider stub, or deterministic fake provider.
- When training begins, verify license, format, GPU capacity, serving compatibility, dataset rights, data provenance and evaluation plan.
- Record base revision, dataset revision, preprocessing, configuration, training environment, dependencies, adapter/full-model details and evaluations.
- Evaluate code correctness, edits, debugging, tool-call format/validity, permission behavior, regressions, latency, memory and failure behavior. Compare to the base model; do not claim improvement without evidence.
- Publish model/dataset cards and required notices when publishing artifacts.
- Abstract serving so hosted Hugging Face endpoints, other APIs and local serving can be configured without hard-coding one provider.
- Distinguish endpoint analytics from user billing/quota. Hugging Face Inference Endpoints exposes endpoint-level metrics; those metrics do not automatically represent every user's account-wide allowance or billing balance.

## 9. Production engineering

For the appropriate phase, establish:

- CI for formatting, lint/type checks, unit/integration tests, build checks, dependency/license checks and supported platform packages.
- Versioning, changelog, release notes, release artifact checksums, signing, update integrity, rollback/recovery, uninstall and user-data preservation.
- Dependency inventory/SBOM, vulnerability disclosure, security response ownership, contributor guidelines and issue triage.
- Structured local logs and opt-in/transparent diagnostics; telemetry should be minimized, documented, and disabled by default unless an explicit approved product decision says otherwise.
- Crash recovery, safe partial-edit behavior, provider outage handling and bounded resource usage.
- Performance baselines for startup, idle memory, indexing, search, editing responsiveness, cancellation, agent overhead and provider latency; report environment and methodology.
- Operations documents only for real operated systems. Do not create Kubernetes/IaC/SLO/DR paperwork for infrastructure that does not exist.

## 10. Incremental work protocol

At the start of a task:

1. Inspect repository instructions, relevant files/docs, current implementation and working-tree state.
2. Identify the requested outcome and its boundary.
3. Determine whether the task is discovery, architecture decision, documentation, implementation, testing, or release work.
4. Read the relevant rules and canonical documents.
5. For a multi-step task, propose a brief plan and define acceptance criteria.

Then:

- Perform only the current bounded task or approved milestone.
- Prefer a small end-to-end vertical slice over creating many disconnected files.
- Do not create every document from the catalog. Create only the documents needed to resolve the current decision, build/test the current slice, or satisfy a phase/release gate.
- Do not write placeholder files to make a checklist look complete.
- If a new architectural discovery invalidates an approved decision, stop, explain the impact, and update the ADR before broad refactoring.
- Run relevant checks and report exact evidence.
- End with a short handoff. Do not start the suggested next phase without instruction.

## 11. Documentation lifecycle

Use `docs/NOXIDEN_DOCUMENT_CATALOG.md` as the minimal canonical documentation plan. It consolidates related traditional artifacts into 10 living documents; do not recreate the original long inventory as separate files.

For each catalogue entry, assign one disposition with rationale: `P0 before foundation`, `P1 before related feature/release`, `P2 conditional`, `merge`, `generated from code/config`, or `not applicable`. Re-evaluate as the architecture evolves. Merge duplicate material and keep a traceable reference to the source entry. If a feature does not exist, do not write operational facts as if it did.

Write the minimum documentation needed at each stage:

- **Foundation:** product scope, SRS/requirements, architecture ADR, architecture overview, constraints/assumptions, initial threat model, test strategy, developer setup, initial roadmap.
- **First vertical slice:** only the module/interface specs, sequence/state diagrams, test cases and API contracts that support that slice.
- **Feature phase:** update related design and security docs, acceptance criteria and tests as behavior is implemented.
- **Before public beta:** packaging, compatibility matrix, license inventory, SBOM strategy, security tests, updater/signing decisions, support/troubleshooting docs, release runbooks.
- **After operation exists:** metrics, incident records, RCAs, capacity plans, SLOs/DR, restore tests and other operational artifacts as applicable.

## 12. Completion criteria

A task is complete when its stated acceptance criteria are met, relevant checks have been run, changed behavior is documented where needed, and any unverified assumptions or blocked checks are clear. A document counts as complete only when it is specific to NOXiden, reviewed for consistency, and useful to a developer; empty templates or invented details do not count.

## 13. Research references

These sources were reviewed on 2026-10-30. Re-check current terms and APIs before making release or architecture commitments.

- Antigravity workspace rules and activation modes: https://antigravity.google/docs/rules/
- Antigravity workflows (distinct from persistent rules): https://antigravity.google/docs/ide/workflows/
- VS Code licensing and Marketplace FAQ: https://code.visualstudio.com/docs/supporting/faq
- VS Code extension API: https://code.visualstudio.com/api/
- VS Code source repository license: https://github.com/microsoft/vscode/blob/main/LICENSE.txt
- Eclipse Open VSX: https://open-vsx.org/ and https://www.eclipse.org/legal/open-vsx-registry-faq/
- Tauri capability-based permissions: https://tauri.app/security/capabilities/
- Tauri distribution and signing: https://v2.tauri.app/distribute/
- Tauri updater: https://v2.tauri.app/plugin/updater/
- OWASP GenAI excessive agency (2025): https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- OWASP Application Security Verification Standard 5.0: https://asvs.owasp.org/
- Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/en/index
- Hugging Face Inference Endpoint metrics: https://huggingface.co/docs/inference-endpoints/en/guides/metrics
- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use

### Research conclusions that directly affect NOXiden

- Antigravity rules are persistent project instructions. Its rule system supports `AGENTS.md` and modular `.agents/rules/*.md` with scoped activation, while large always-on rules consume context. Keep the root rules concise and place detailed guidance in focused rules.
- Rules are not workflows: persistent constraints belong in `AGENTS.md` or focused rules; multi-step processes can be run as deliberate workflows when useful. Do not encode a one-shot “do everything” command as an always-on rule.
- Code - OSS licensing does not settle Marketplace/extension rights. Verify actual product/extension/source terms; Open VSX is a credible registry candidate, but specific extension compatibility and licenses still need validation.
- Tauri exposes a capability-based permission model and updater/distribution facilities; these facilities still require minimal scope, signing, platform testing and correct configuration.
- OWASP identifies excessive agency as a distinct LLM risk. Least-privilege tools, isolation, validation and human approvals belong in the architecture rather than being deferred to prompt polish.
- Provider usage and quota are not uniform. A usage dashboard must distinguish local measurements, provider metrics and estimates.
