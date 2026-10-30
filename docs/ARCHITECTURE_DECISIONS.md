# NOXiden IDE — Architecture Decision Records (ADRs)

**Document ID:** DOC-03  
**Status:** Living Document  
**Canonical Reference:** `docs/NOXIDEN_MASTER_ENGINEERING_PLAYBOOK.md`

---

## ADR-001: Desktop Foundation, Editor Engine, and Core Integration Strategy

**Date:** 2026-10-30  
**Status:** Accepted  
**Deciders:** NOXiden Core Team  
**Requirements Addressed:** REQ-DESK-001, REQ-DESK-002, REQ-EDIT-001, REQ-PROV-001

---

### Context & Problem Statement

NOXiden IDE requires an installable native desktop foundation for Windows, macOS, and Linux. The IDE must support a full, high-performance editor experience (syntax highlighting, diagnostics, diffing, tabs, file explorer), an integrated AI agent runtime with process/tool execution capabilities, local-first privacy, and support for both cloud and local model inference (including the owner's fine-tuned model).

Three primary architecture candidates were evaluated:

1. **Option A: Full Fork of Microsoft Code - OSS**
2. **Option B: Electron Shell + Monaco Editor + Modular Node/Native Core**
3. **Option C: Tauri Shell (Rust backend + Webview2 frontend) + Monaco Editor**

---

### Evaluation Matrix

| Evaluation Criteria | Option A: Code - OSS Fork | Option B: Electron + Monaco + Core | Option C: Tauri + Webview + Monaco |
|---|---|---|---|
| **Native Desktop Delivery** | Full installable desktop | Full installable desktop | Full installable desktop |
| **Legal & Extension Source** | ⚠️ Microsoft Visual Studio Marketplace terms strictly prohibit non-Visual Studio forks. Proprietary MS extensions (C/C++, Pylance) are prohibited. | Clean licensing: Can lawfully use Open VSX, custom registry, or direct VSIX loading without violating Microsoft Marketplace terms. | Clean licensing: Compatible with Open VSX or custom extensions. |
| **Maintainability & Divergence** | ❌ Extreme overhead: Millions of lines of upstream code. High merge conflict risk when customizing the AI workbench. | High: Clean, bounded codebase. We own the agent UX, provider adapters, and IPC boundaries completely. | Medium: Requires dual expertise in Rust FFI and Webview frontend. |
| **Editor Maturity** | Built-in Monaco workbench | Monaco Editor is the identical core engine powering VS Code; first-class desktop integration. | Monaco in Webview2 has platform-specific quirks (especially on Linux WebKitGTK). |
| **Process Isolation & Security** | Complex extension host architecture | Robust multi-process model: `contextIsolation: true`, sandboxed renderer, strictly typed IPC to Main process. | Strong Rust sandbox, but Webview IPC throughput is constrained. |
| **Toolchain & Developer Friction** | Extremely heavy build toolchain (20+ GB, lengthy compile times). | Lightweight, rapid developer feedback cycle with Node.js and TypeScript. | Requires Rust compiler (`rustc`/`cargo`) and C++ build tools on host (not pre-installed). |
| **Performance-Sensitive Services** | Node.js + C++ bindings | Modular architecture: Node.js main process with NAPI-RS / native binary integration for heavy indexing. | Native Rust core out of the box. |

---

### Decision

We choose **Option B: Electron Desktop Shell + Monaco Editor + Modular Native Core (TypeScript/Node.js with Rust native module extension point)** as the foundational architecture for NOXiden IDE.

#### Rationale:
1. **Desktop Native First:** Electron packages into authentic native platform installers (Windows NSIS `.exe`/MSI, macOS `.dmg`/Apple Silicon & Intel, Linux `.deb`/AppImage). It is not a web app.
2. **The Battle-Tested Monaco Core:** Monaco provides the exact editing ergonomics, AST tokens, language syntax, minimap, folding, and diff view that developers expect from VS Code, without the immense divergence debt of maintaining a 500,000-file Code - OSS fork.
3. **Uncompromising Security Boundaries:**
   - Renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
   - The UI communicates with the Main process only over explicit, validated IPC channels.
   - Filesystem writes, process spawns, and credential access are strictly guarded in the native Main process with human approval gates.
4. **Legal Compliance:** Eliminates any risk of infringing Microsoft's proprietary marketplace terms. Extensions will target Open VSX, LSP servers, and standard tool definitions.
5. **Rust Native Module Path:** For CPU-intensive tasks (symbol indexing, AST parsing, high-throughput vector search for RAG), native Rust modules will be loaded via NAPI-RS or native background sidecars as performance thresholds dictate.

---

### Consequences

- **Positive:** Rapid development velocity, instant cross-platform compatibility, first-class Monaco editor support, clean architecture boundaries, robust security sandboxing.
- **Negative:** Memory footprint is characteristic of Electron applications (~100–150 MB base RAM); mitigated through lazy-loading views, worker threads, and lean runtime dependencies.
- **Revisit Triggers:** If native memory footprint becomes an operational blocker, or when full VS Code extension host binary compatibility is mandated with zero custom adapter code.

