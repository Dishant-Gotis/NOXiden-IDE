# NOXiden IDE — Persistent Engineering Rules

These are enduring workspace rules for Antigravity and other coding agents. They guide ongoing work; they are not a request to build the whole product in one pass.

## Product identity and hard constraints

NOXiden IDE is intended to be an **installable native desktop application** for Windows, macOS, and Linux, with a full IDE experience and an agent that can inspect and modify the user's actual project files, run approved commands, observe results, and iterate. It is **not a browser-based web app and must not be delivered as a web-only product**. A desktop framework may internally use an embedded webview if approved by an architecture decision; that does not change the product requirement that NOXiden is packaged, installed, launched, updated, and used as a desktop application.

The owner intends to fine-tune a coding model using local GPU hardware and may publish/host it through Hugging Face. The IDE must remain useful before that model exists and must support multiple provider adapters where feasible.

Read `docs/NOXIDEN_MASTER_ENGINEERING_PLAYBOOK.md` for product direction and architecture guardrails. Use `docs/NOXIDEN_DOCUMENT_CATALOG.md` as the **small, consolidated documentation plan**. It intentionally contains only a minimal set of canonical documents.

## Non-negotiable working rules

1. **Work incrementally.** Do only the current task or the smallest complete next slice. Never treat the rules as an instruction to generate every document or implement the whole product in one session.
2. **Inspect before changing.** Check repository instructions, relevant files, current code, docs, and `git status` before editing. Preserve user changes. Do not overwrite, reset, delete, or regenerate unrelated work.
3. **Make real workspace changes when asked to code.** The agent must work against the active repository and edit actual files, not merely return code snippets or describe hypothetical patches. Inspect relevant files first, make focused edits, show or preserve a reviewable diff, run applicable checks, and report exactly what changed. Keep edits live and coherent with the user's current workspace; do not build a separate fake editor workflow that only simulates changes.
4. **Plan proportionately.** For a small task, act directly. For a multi-step task, state a short plan and complete one bounded phase. If asked to plan the whole product, provide staged phases and do only the first agreed planning deliverable.
5. **Native desktop first.** Do not create or pivot to a browser-based/web-only version. Compare viable desktop foundations before committing. Consider full desktop IDE platforms and custom native desktop frameworks; if an embedded webview framework is proposed, explain that it still ships as an installable desktop app and record the trade-offs in an ADR.
6. **No architecture by assumption.** Rust is preferred for performance-sensitive native/core services, but not every module must use Rust. Evaluate editor foundation, native shell, language tooling, extension ecosystem, distribution, and licensing before locking major choices. Do not assume a VS Code fork can legally use the Visual Studio Marketplace or every Microsoft extension.
7. **Trace requirements to evidence.** Use stable requirement IDs and testable acceptance criteria. Link requirements to design, implementation, and tests where practical. Create ADRs for material decisions.
8. **Truthful status only.** Distinguish `proposed`, `planned`, `in progress`, `implemented`, `verified`, and `deferred`. Never claim tests, builds, benchmarks, APIs, installers, or platform support were verified without evidence.
9. **Research unstable facts.** Before deciding current frameworks, licenses, extension/marketplace policies, model APIs, packaging, signing, or security practices, consult current authoritative sources. Record sources and the date checked in relevant docs.
10. **Security by design.** Treat repository content, terminal output, model responses, extensions, and tool results as untrusted. A prompt is not a security boundary. Use least privilege, typed tool validation, workspace-scoped file access, approval for dangerous actions, secure credential storage, and process isolation appropriate to risk. Never place credentials in source control, frontend bundles, URLs, test fixtures, ordinary logs, or reports.
11. **Local-first.** Basic editing, file access, Git, and local tools must not depend on a mandatory NOXiden cloud service. Do not add central telemetry or a mandatory backend without an approved ADR and explicit product need.
12. **Test the changed behavior.** Add/update relevant tests, run focused checks, and report exact commands and outcomes. Do not hide failures or weaken tests to get a green result.
13. **Document alongside code.** Update the relevant canonical document when behavior, interfaces, configuration, security, or release procedures change. Merge overlapping material rather than creating more documents.
14. **Minimize blast radius.** Avoid unrelated refactors, speculative abstractions, gratuitous dependencies, silent public API changes, destructive migrations, and expensive commands without justification. Ask before irreversible actions when intent or impact is unclear.

## Agentic editing behavior

NOXiden's agent must behave like a coding agent operating on the real workspace:

- Inspect project structure and relevant source before planning changes.
- Read only the context needed for the task; respect ignored files, secrets, and workspace boundaries.
- Make focused edits directly to the working tree using safe file APIs or equivalent tooling.
- For substantial or multi-file changes, present a plan and keep the diff reviewable; provide approval gates for destructive/high-impact actions.
- Run relevant tests, builds, linters, or commands when authorized and available.
- Feed actual tool output back into the agent loop; verify results from repository state and tests, not from model claims.
- Support cancellation, bounded retries, time/token/output limits, and clear reporting of partial completion.
- Never claim to have modified files, run commands, or tested behavior unless the tool actually did so.

## Default decision hierarchy

1. Latest explicit user instruction.
2. Existing repository facts and approved ADRs.
3. These persistent rules.
4. Master Engineering Playbook.
5. Relevant focused rules in `.agents/rules/`.
6. General conventions.

If instructions conflict, explain the conflict instead of silently violating an approved constraint.

## Per-task handoff

For material tasks, report: changes made, relevant files, tests/checks actually run and results, known limitations/unverified assumptions, and one recommended next step. Do not automatically execute that next step.

Always check `git status` and verify [`.gitignore`](file:///d:/GIT-REPOS/NOXiden-IDE2/.gitignore) at the end of each task to ensure any new build artifacts, caches, test fixtures, or temporary files are cleanly ignored.
