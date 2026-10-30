---
trigger: model_decision
description: Apply when creating or changing requirements, architecture docs, tests, quality gates, technical documentation, task plans, or traceability records.
---

# Testing, Requirements, and Documentation Rules

## Incremental delivery

- Build and document one bounded milestone or vertical slice at a time. Never generate all canonical documents or implement the entire IDE merely because the catalogue exists.
- If asked to plan, create or update only the planning artifacts needed for that decision. If asked to implement, read the relevant approved specification and implement the requested slice. If the request is broad, propose phases and work only on the first agreed phase.
- Prefer a small, working end-to-end slice over a large collection of disconnected components.

## Requirements and documents

- Give important requirements stable IDs. Requirements must be clear, testable, and traceable to design, code, and verification.
- Maintain the minimal documentation catalogue as a register of 10 consolidated canonical documents. Update status and paths as needed; do not expand it into one file per traditional specification.
- Treat the 10-document plan as a set of living documents, not a one-shot production checklist. Create/update only what helps decide, implement, test, release, or operate the current subsystem. Merge overlapping content and link to canonical sources.
- Keep one canonical source for each fact. Link rather than duplicate long architectural decisions, schemas, or setup instructions.
- Diagrams must match the architecture. Use Mermaid or another maintainable text format where practical. Keep machine-readable contracts (for example OpenAPI for real HTTP APIs) in source control.
- Distinguish facts, assumptions, proposals, and decisions. Cite authoritative sources and access dates for externally verified claims that may change.

## Testing and completion evidence

- Test the changed behavior at the narrowest relevant layer first. Add regression coverage for fixed bugs.
- Use unit tests for deterministic logic, integration tests for boundaries, and end-to-end tests for critical user workflows. Mock external providers where appropriate; retain a small controlled set of real integration smoke tests where useful.
- Cross-platform support requires build/test evidence per claimed platform. Do not infer it from one OS.
- Define performance criteria before claiming optimization. Benchmark representative workloads and report hardware, dataset, commands, variance/limitations, and results.
- Do not lower coverage or disable a failing test merely to obtain a green CI result. If a test is flaky or impossible to run, document it and create a follow-up issue/task.
- A task is complete only when its acceptance criteria and required checks pass or remaining failures are explicitly documented.

## Change and handoff

- Keep changes focused and reviewable. Update docs alongside public interface, configuration, security, or release changes.
- Finish material tasks with changed files, checks run and outcomes, gaps/unverified assumptions, and one recommended next step. Do not start that next step automatically.
- Check `git status` and update `.gitignore` with each task finished so newly generated build artifacts, temporary files, test fixtures, or caches are never left untracked.
