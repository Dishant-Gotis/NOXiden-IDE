# noxiden-core

Native high-performance indexing, AST symbol extraction, and workspace search engine for NOXiden IDE.

## Features
- **Ripgrep-speed workspace search:** Multi-threaded traversal using `ignore` and `regex`. Respects `.gitignore` and ignores binary assets.
- **AST Symbol Extraction:** Fast extraction of functions, structs, classes, interfaces, and types across Rust, TypeScript, JavaScript, and Python.
- **Token Estimation & Context Budgeting:** Token calculations per symbol for compact LLM context window loading.

## Building
Requires Rust toolchain (`rustc` & `cargo` 1.75+):
```bash
cargo build --release
```

