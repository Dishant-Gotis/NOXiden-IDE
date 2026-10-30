# NOXiden IDE — Product Requirements Document (PRD)

**Document ID:** DOC-01  
**Status:** Implemented (Foundation Slice)  
**Last Updated:** 2026-10-30  
**Traceability Target:** `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`

---

## 1. Product Vision & North Star

NOXiden IDE is an open-source, installable native desktop development environment for Windows, macOS, and Linux. It pairs a polished, VS Code-class editing experience with an integrated, privacy-focused agentic coding loop.

The product is **strictly a native desktop application**, not a web app or SaaS-only tool. It is local-first: basic file editing, workspace navigation, Git interaction, and terminal execution do not depend on any NOXiden cloud services.

NOXiden is provider-agnostic. While the owner trains/fine-tunes custom coding models on local GPU hardware (with Hugging Face integration and local inference servers), the IDE is fully functional today using standard provider adapters (OpenAI, Anthropic, Gemini, Ollama, and generic OpenAI-compatible local endpoints).

---

## 2. Target Users & Core Workflows

1. **Autonomous & Pair AI Developers:** Want an IDE where the agent can inspect context, propose targeted file diffs, execute approved terminal commands, and verify changes with real test output.
2. **Local AI / GPU Enthusiasts:** Run local open-source models (GGUF, Ollama, vLLM, Hugging Face) on their own hardware with low latency and zero telemetry leaks.
3. **Polyglot Software Engineers:** Expect standard desktop IDE ergonomics (file explorer, tabs, syntax highlighting, diagnostics, command palette, terminal, keyboard shortcuts).

---

## 3. Product Scope & Non-Goals

### In Scope (MVP & Foundation Slice)
- Installable desktop application packaging for Windows (`.exe` / NSIS installer), macOS, and Linux.
- Local workspace management with safe filesystem boundaries.
- Split-pane layout: File Explorer, Code Editor (Monaco), Terminal/Output, and AI Agent Panel.
- Model Provider Abstraction: Swappable adapters for OpenAI, Anthropic, Gemini, Ollama, and Custom/Local endpoints.
- Agent Task Loop: Plan -> Propose -> User Approval Gate -> Tool Execution -> Verification.
- Secure Credential Storage: Secrets masked in UI, excluded from git/telemetry.

### Explicit Non-Goals (MVP)
- Browser-based or web-only deployment.
- Requiring a mandatory NOXiden cloud account or central subscription.
- Unsanctioned access to Microsoft's proprietary Visual Studio Marketplace (respecting Microsoft terms; extension support targets Open VSX and standalone VSIX).
- Training foundation models from scratch inside the IDE runtime.

---

## 4. Requirements Register (Stable IDs)

| Requirement ID | Category | Description | Acceptance Criteria |
|---|---|---|---|
| **REQ-DESK-001** | Platform | Installable Native Desktop App | Packages into standalone desktop executable (`.exe` on Windows); does not require a browser. |
| **REQ-DESK-002** | Security | Process Isolation & IPC Security | Renderer has `contextIsolation: true` and `nodeIntegration: false`. All privileged system access mediated through validated IPC. |
| **REQ-EDIT-001** | Editor | Monaco Code Editor Integration | Syntax highlighting, line numbers, folding, diff editor, multi-tab buffer management. |
| **REQ-EDIT-002** | Workspace | Workspace File Explorer | Real-time directory tree, file open/save, file change detection, workspace-relative pathing. |
| **REQ-PROV-001** | Provider | Multi-Provider Adapter Contract | Uniform interface for streaming completion, tool calling, token counts, and error normalization. |
| **REQ-PROV-002** | Provider | Local Model / Custom Endpoint Support | Connects to local GPU inference servers (Ollama, vLLM, llama.cpp) via OpenAI-compatible API without cloud egress. |
| **REQ-PROV-003** | Security | Secret Protection & UI Masking | API keys stored securely; masked in UI; excluded from logs, error reports, and prompt context. |
| **REQ-AGNT-001** | Agent | Bounded Agentic Task Loop | Iterative loop (Plan, Propose Diffs, Execute Commands, Observe Results) with token budget and step limits. |
| **REQ-AGNT-002** | Agent | Reviewable Diff Application | Agent modifications presented as side-by-side or inline diffs requiring explicit user review before writing to disk. |
| **REQ-AGNT-003** | Security | Guarded Tool & Terminal Execution | Destructive operations (process execution, file deletion, network requests) require explicit user approval. |
| **REQ-QUAL-001** | Quality | Automated Test & Build Pipeline | Unit tests for provider adapters and agent runtime; automated packaging build checks. |

---

## 5. Traceability & Implementation Phases

- **Phase 1 (Current):** Foundation Architecture, PRD, ADR-001, and Core Desktop App Scaffolding (Electron + TypeScript + Vite + Monaco + Provider Abstraction).
- **Phase 2:** Native Core Workspace Operations & Terminal Integration (Secure file/process sandboxing).
- **Phase 3:** Agentic Task Engine (Context manager, tool router, diff engine, approval gates).
- **Phase 4:** Custom Model Adapter & Fine-Tuning Integration (Hugging Face endpoint connector, Ollama/vLLM presets).
- **Phase 5:** Cross-Platform Packaging, Installers, and Release Automation.

