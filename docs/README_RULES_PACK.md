# Installing the NOXiden Antigravity Rules Pack

This package defines persistent engineering constraints for NOXiden IDE. It is designed for ongoing, incremental development in Antigravity—not as a one-shot instruction to build the entire product.

## Product constraint

NOXiden is an **installable native desktop application** for Windows, macOS, and Linux. It is not a browser-based web app or web-only product. An embedded webview may be considered only as an implementation detail of a packaged desktop application after an explicit architecture decision. The agent must modify the actual project files in the active workspace, use real tool/terminal results, and verify changes.

## Contents

- `AGENTS.md` — always-on project rules, native-desktop constraint, real-workspace editing protocol, security, and incremental delivery.
- `.agents/rules/architecture-and-platform.md` — desktop architecture, Rust core, extension ecosystem, and platform rules.
- `.agents/rules/agent-runtime-and-ai-security.md` — real file editing, agent loop, tool execution, permissions, prompt injection, and model lifecycle.
- `.agents/rules/provider-credentials-and-usage.md` — provider adapters, credential storage, usage and quota truthfulness.
- `.agents/rules/testing-and-documentation.md` — requirements, testing, incremental delivery, and documentation policy.
- `.agents/rules/release-and-supply-chain.md` — native installers, signing, updates, and dependency hygiene.
- `docs/NOXIDEN_MASTER_ENGINEERING_PLAYBOOK.md` — product vision and engineering guardrails.
- `docs/NOXIDEN_DOCUMENT_CATALOG.md` — **10 consolidated canonical documents**, replacing the previous 127-item checklist.

## Install into an existing repository

1. Merge `AGENTS.md` into the repository root; do not overwrite project-specific instructions without review.
2. Merge `.agents/rules/` into the repository's `.agents/rules/` directory.
3. Merge the two documents under `docs/` into the repository's `docs/` directory.
4. Preserve existing work and resolve conflicts deliberately.
5. Open the repository as the Antigravity workspace and verify the rules are recognized. Consult the current official Antigravity rules documentation if discovery behavior has changed.

## Recommended first request to Antigravity

> Read `AGENTS.md` and the NOXiden Master Engineering Playbook. Inspect the current repository and working tree without modifying application code. Summarize the existing state, confirm this is an installable native desktop application (not a web app), identify the highest-impact architectural unknowns, and recommend the single next bounded task. Do not generate every document or implement the whole product.

## Rule design

Persistent rules define constraints and default behavior. The master playbook provides context. The document catalogue defines only the minimum consolidated documentation set. Actual multi-step work should proceed in bounded tasks with acceptance criteria, tests, and evidence-based handoffs.
