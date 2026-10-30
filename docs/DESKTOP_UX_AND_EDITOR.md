# NOXiden IDE — Desktop UX and Editor Architecture

**Document ID:** DOC-04  
**Status:** Implemented (Foundation Slice)  
**Last Updated:** 2026-10-30  
**References:** `docs/PRODUCT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md` (ADR-001)

---

## 1. Overview & Workbench Information Architecture

NOXiden IDE's desktop user interface provides a focused, high-performance workstation for developers and local AI coding models.

```
+-----------------------------------------------------------------------------------+
|  [Header Bar]  ⚡ NOXiden | Native Desktop IDE    [📂 Open Folder]   [● Engine Ready] |
+---+----------------+----------------------------------------+---------------------+
| A |                |  [Tabs Bar] active-file.ts             | [Agent Panel]       |
| c |   EXPLORER     +----------------------------------------+ Model Selector:     |
| t |                |                                        | - Ollama (Local)    |
| i | 📁 src/        |  [Monaco Editor Viewport]              | - Fine-Tuned (Local)|
| v |   📄 app.ts    |  - Syntax highlighting & tokenization  | - OpenAI (Cloud)    |
| i |   📄 main.ts   |  - Minimap, code folding, line numbers |---------------------|
| t | 📁 tests/      |                                        | Chat History:       |
| y |                +----------------------------------------+                     |
|   |                |  [Side-by-Side Diff Review Mode]       | [🔍 Review Diff]   |
| B |                |  Original (Left)  |  Proposed (Right)  |---------------------|
| a |                |  [✓ Accept & Apply]   [✕ Discard]      | Prompt Input Area   |
| r |                |                                        | [Send (Enter)]      |
+---+----------------+----------------------------------------+---------------------+
|  [Footer] NOXiden v0.1.0 • Monaco Core Engine • Side-by-Side Review Enabled       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Monaco Editor Integration

### 2.1. Native Engine Configuration
- **Bundle Strategy:** Monaco Editor AMD minified bundle (`min/vs`) loaded directly via `loader.js` and local desktop worker scripts.
- **Web Workers:** Local web-workers for TypeScript/JavaScript (`ts.worker.js`), JSON (`json.worker.js`), HTML (`html.worker.js`), CSS (`css.worker.js`), and core editor tokenization/diffing (`editor.worker.js`).
- **Theme:** `noxiden-dark`, styled to match `#161622` background with `#6366f1` accent and high-contrast syntax tokens.
- **Language Detection:** Automatic multi-language resolution based on file extensions (Rust, TypeScript, JavaScript, Python, Markdown, HTML, CSS, YAML, Shell, PowerShell, SQL, TOML).

---

## 3. Side-by-Side Diff Review Engine

### 3.1. User Approval & Review Gate (REQ-AGNT-002)
When the NOXiden agent proposes an edit:
1. The agent generates a targeted change proposal.
2. The UI renders a **"🔍 Review Side-by-Side Diff"** action card in the agent panel.
3. Clicking launches the **Monaco Diff Editor** (`monaco.editor.createDiffEditor`):
   - **Left Pane:** Original file loaded from the active local workspace.
   - **Right Pane:** Agent's proposed modifications, fully editable by the user for manual adjustments before applying.
   - **Visual Diffing:** Line-level insertions (`#10b98125`) and removals (`#ef444425`).
4. **Action Bar Controls:**
   - `✓ Accept & Apply`: Atomically writes the approved content to disk via `window.noxiden.writeFile(path, content)`, synchronizes the primary editor model, closes diff review, and notifies the agent.
   - `✕ Discard`: Cancels the proposal without modifying files on disk.
   - `⇄ Toggle View`: Switches dynamically between side-by-side split view and inline unified diff view.

