# SoroShield Scanner - Rust AST Static Analyzer

This is the static analysis engine for SoroShield. It uses Rust's abstract syntax tree (AST) compilation crates (`syn` and `proc-macro2`) to traverse Rust smart contracts and identify common security vulnerabilities.

## 🔍 Scanner Rules
The scanner traverses syntax elements to inspect function blocks and statements using visitor patterns. It checks for:
* **RULE-01**: Missing authorization check (`require_auth()`)
* **RULE-02**: Unchecked arithmetic operations (`+`, `-`, `*`, `/`)
* **RULE-03**: Missing input bounds validation on amounts/fees
* **RULE-04**: Unbounded storage collections usage
* **RULE-05**: Unprotected update contract WASM call
* **RULE-06**: Missing balance verification before transfer calls
* **RULE-07**: Panic / unwrap / expect patterns
* **RULE-08**: Hardcoded public/secret Stellar wallet addresses and keys

## ⚙️ How to Build
To compile the scanner binary:
```bash
cargo build --release
```
The output CLI binary will be created at `target/release/scanner`.
