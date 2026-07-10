use std::collections::HashSet;
use syn::spanned::Spanned;
use syn::visit::{self, Visit};
use syn::{
    BinOp, Expr, ExprBinary, ExprCall, ExprMethodCall, ImplItemFn, ItemImpl, Macro, Pat,
};

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    Critical,
    Warning,
    Info,
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub rule_id: String,
    pub title: String,
    pub severity: Severity,
    pub description: String,
    pub line: usize,
    pub code_snippet: String,
}

pub struct SorobanScanner<'a> {
    pub findings: Vec<Finding>,
    source_lines: Vec<&'a str>,
}

impl<'a> SorobanScanner<'a> {
    pub fn new(source: &'a str) -> Self {
        Self {
            findings: Vec::new(),
            source_lines: source.lines().collect(),
        }
    }

    fn get_line_snippet(&self, line: usize) -> String {
        if line > 0 && line <= self.source_lines.len() {
            self.source_lines[line - 1].trim().to_string()
        } else {
            String::new()
        }
    }
}

// Struct to collect expressions and statements inside a single function block
struct FunctionBodyAnalyzer {
    has_require_auth: bool,
    has_storage_write: bool,
    has_transfer_call: bool,
    has_balance_call: bool,
    has_upgrade_call: bool,
    has_event_publish: bool,
    panic_locations: Vec<usize>,
    unchecked_ops: Vec<(usize, String)>,
    referenced_identifiers: HashSet<String>,
    external_calls: Vec<usize>, // lines where client calls occur
    storage_writes: Vec<usize>, // lines where storage.set occurs
}

impl<'ast> Visit<'ast> for FunctionBodyAnalyzer {
    fn visit_expr_method_call(&mut self, i: &'ast ExprMethodCall) {
        let method_name = i.method.to_string();

        if method_name == "require_auth" || method_name == "require_auth_for_args" {
            self.has_require_auth = true;
        }

        if method_name == "set" {
            self.has_storage_write = true;
            self.storage_writes.push(i.span().start().line);
        }

        if method_name == "transfer" || method_name == "transfer_from" {
            self.has_transfer_call = true;
        }

        if method_name == "balance" {
            self.has_balance_call = true;
        }

        if method_name == "update_current_contract_wasm" {
            self.has_upgrade_call = true;
        }

        if method_name == "publish" {
            self.has_event_publish = true;
        }

        if method_name == "unwrap" || method_name == "expect" {
            self.panic_locations.push(i.span().start().line);
        }

        // Check for potential external client calls, e.g. client.some_method()
        // Usually, client calls in Soroban are on structures named *Client (like TokenClient, etc.)
        // We will generic check any method call on a variable name ending in "client" or where method is not standard
        if let Expr::Path(ref expr_path) = *i.receiver {
            if let Some(ident) = expr_path.path.get_ident() {
                let receiver_name = ident.to_string().to_lowercase();
                if receiver_name.contains("client") || receiver_name.contains("external") {
                    self.external_calls.push(i.span().start().line);
                }
            }
        }

        visit::visit_expr_method_call(self, i);
    }

    fn visit_expr_binary(&mut self, i: &'ast ExprBinary) {
        match i.op {
            BinOp::Add(_) => self.unchecked_ops.push((i.span().start().line, "+".to_string())),
            BinOp::Sub(_) => self.unchecked_ops.push((i.span().start().line, "-".to_string())),
            BinOp::Mul(_) => self.unchecked_ops.push((i.span().start().line, "*".to_string())),
            BinOp::Div(_) => self.unchecked_ops.push((i.span().start().line, "/".to_string())),
            BinOp::AddAssign(_) => self.unchecked_ops.push((i.span().start().line, "+=".to_string())),
            BinOp::SubAssign(_) => self.unchecked_ops.push((i.span().start().line, "-=".to_string())),
            BinOp::MulAssign(_) => self.unchecked_ops.push((i.span().start().line, "*=".to_string())),
            BinOp::DivAssign(_) => self.unchecked_ops.push((i.span().start().line, "/=".to_string())),
            _ => {}
        }
        visit::visit_expr_binary(self, i);
    }

    fn visit_macro(&mut self, i: &'ast Macro) {
        if let Some(ident) = i.path.get_ident() {
            let macro_name = ident.to_string();
            if macro_name == "panic" || macro_name == "todo" || macro_name == "unimplemented" || macro_name == "assert" || macro_name == "assert_eq" {
                self.panic_locations.push(i.span().start().line);
            }
        }
        visit::visit_macro(self, i);
    }

    fn visit_expr_call(&mut self, i: &'ast ExprCall) {
        visit::visit_expr_call(self, i);
    }

    fn visit_pat_ident(&mut self, i: &'ast syn::PatIdent) {
        self.referenced_identifiers.insert(i.ident.to_string());
        visit::visit_pat_ident(self, i);
    }

    fn visit_expr_path(&mut self, i: &'ast syn::ExprPath) {
        if let Some(ident) = i.path.get_ident() {
            self.referenced_identifiers.insert(ident.to_string());
        }
        visit::visit_expr_path(self, i);
    }
}

impl<'ast> Visit<'ast> for SorobanScanner<'_> {
    fn visit_item_impl(&mut self, i: &'ast ItemImpl) {
        let mut is_contract_impl = false;
        for attr in &i.attrs {
            if let Some(ident) = attr.path().get_ident() {
                if ident == "contractimpl" {
                    is_contract_impl = true;
                    break;
                }
            }
        }

        if is_contract_impl || true {
            for item in &i.items {
                if let syn::ImplItem::Fn(method) = item {
                    self.analyze_method(method);
                }
            }
        }

        visit::visit_item_impl(self, i);
    }
}

impl<'a> SorobanScanner<'a> {
    fn analyze_method(&mut self, method: &ImplItemFn) {
        let fn_name = method.sig.ident.to_string();
        let fn_line = method.sig.ident.span().start().line;

        let is_public = matches!(method.vis, syn::Visibility::Public(_));
        if !is_public && fn_name.starts_with('_') {
            return;
        }

        let mut analyzer = FunctionBodyAnalyzer {
            has_require_auth: false,
            has_storage_write: false,
            has_transfer_call: false,
            has_balance_call: false,
            has_upgrade_call: false,
            has_event_publish: false,
            panic_locations: Vec::new(),
            unchecked_ops: Vec::new(),
            referenced_identifiers: HashSet::new(),
            external_calls: Vec::new(),
            storage_writes: Vec::new(),
        };

        analyzer.visit_block(&method.block);

        let is_state_changing = analyzer.has_storage_write || analyzer.has_transfer_call || analyzer.has_upgrade_call;
        if is_state_changing && !analyzer.has_require_auth && fn_name != "initialize" {
            self.findings.push(Finding {
                rule_id: "RULE-01".to_string(),
                title: "Missing authorization check (require_auth)".to_string(),
                severity: Severity::Critical,
                description: format!(
                    "Function '{}' modifies state or moves funds, but does not call require_auth() or require_auth_for_args() on any Address parameter. This could allow unauthorized users to execute this action.",
                    fn_name
                ),
                line: fn_line,
                code_snippet: self.get_line_snippet(fn_line),
            });
        }

        for (line, op) in &analyzer.unchecked_ops {
            self.findings.push(Finding {
                rule_id: "RULE-02".to_string(),
                title: "Unchecked arithmetic operator".to_string(),
                severity: Severity::Warning,
                description: format!(
                    "Use of unchecked arithmetic operator '{}' inside function '{}'. Soroban contracts should use checked_add, checked_sub, checked_mul, etc., to prevent integer overflow or underflow exploits.",
                    op, fn_name
                ),
                line: *line,
                code_snippet: self.get_line_snippet(*line),
            });
        }

        let input_names_to_check = ["amount", "value", "val", "qty", "quantity", "shares", "price", "fee"];
        for input in &method.sig.inputs {
            if let syn::FnArg::Typed(pat_type) = input {
                if let Pat::Ident(pat_ident) = &*pat_type.pat {
                    let arg_name = pat_ident.ident.to_string();
                    let is_val_type = input_names_to_check.iter().any(|&name| arg_name.to_lowercase().contains(name));
                    
                    if is_val_type {
                        let mut finder_found = false;
                        struct ComparisonFinder {
                            target_var: String,
                            found: bool,
                        }
                        impl<'ast> Visit<'ast> for ComparisonFinder {
                            fn visit_expr_binary(&mut self, i: &'ast ExprBinary) {
                                match i.op {
                                    BinOp::Lt(_) | BinOp::Le(_) | BinOp::Gt(_) | BinOp::Ge(_) | BinOp::Eq(_) | BinOp::Ne(_) => {
                                        let left_str = quote::quote!(#i.left).to_string();
                                        let right_str = quote::quote!(#i.right).to_string();
                                        if left_str.contains(&self.target_var) || right_str.contains(&self.target_var) {
                                            self.found = true;
                                        }
                                    }
                                    _ => {}
                                }
                                visit::visit_expr_binary(self, i);
                            }
                        }
                        let mut finder = ComparisonFinder {
                            target_var: arg_name.clone(),
                            found: false,
                        };
                        finder.visit_block(&method.block);
                        finder_found = finder.found;

                        if !finder_found {
                            self.findings.push(Finding {
                                rule_id: "RULE-03".to_string(),
                                title: "Missing input validation".to_string(),
                                severity: Severity::Warning,
                                description: format!(
                                    "Numeric parameter '{}' in function '{}' does not appear to undergo validation checks (such as checking if it is greater than zero). Ensure all input parameters are bounds-checked.",
                                    arg_name, fn_name
                                ),
                                line: fn_line,
                                code_snippet: self.get_line_snippet(fn_line),
                            });
                        }
                    }
                }
            }
        }

        if analyzer.has_storage_write {
            let mut uses_collections = false;
            let code_text = quote::quote!(#method).to_string();
            if code_text.contains("Vec") || code_text.contains("Map") {
                uses_collections = true;
            }

            if uses_collections {
                let has_pruning = code_text.contains("remove") || code_text.contains("pop") || code_text.contains("len") || code_text.contains("size");
                if !has_pruning {
                    self.findings.push(Finding {
                        rule_id: "RULE-04".to_string(),
                        title: "Potential unbounded storage growth".to_string(),
                        severity: Severity::Warning,
                        description: format!(
                            "Function '{}' writes a collection (Vec or Map) to storage, but lacks visible safety checks for size limits or data pruning. This could lead to unbounded state growth and excessive gas costs.",
                            fn_name
                        ),
                        line: fn_line,
                        code_snippet: self.get_line_snippet(fn_line),
                    });
                }
            }
        }

        if analyzer.has_upgrade_call && !analyzer.has_require_auth {
            self.findings.push(Finding {
                rule_id: "RULE-05".to_string(),
                title: "Unprotected contract upgrade function".to_string(),
                severity: Severity::Critical,
                description: format!(
                    "Function '{}' calls update_current_contract_wasm() to upgrade the contract, but does not perform a require_auth() check. This would allow anyone to overwrite the contract code.",
                    fn_name
                ),
                line: fn_line,
                code_snippet: self.get_line_snippet(fn_line),
            });
        }

        if analyzer.has_transfer_call && !analyzer.has_balance_call {
            self.findings.push(Finding {
                rule_id: "RULE-06".to_string(),
                title: "Missing balance verification before transfer".to_string(),
                severity: Severity::Warning,
                description: format!(
                    "Function '{}' performs a fund transfer but does not query the balance of the payer or contract. Verify that the contract explicitly checks for sufficient funds before attempting a transfer.",
                    fn_name
                ),
                line: fn_line,
                code_snippet: self.get_line_snippet(fn_line),
            });
        }

        for loc in &analyzer.panic_locations {
            self.findings.push(Finding {
                rule_id: "RULE-07".to_string(),
                title: "Use of panic/unwrap/expect".to_string(),
                severity: Severity::Warning,
                description: format!(
                    "Function '{}' contains a call that can cause an abrupt panic (e.g. unwrap(), expect(), or panic! macro). Consider returning a Result with a custom contract error to fail gracefully.",
                    fn_name
                ),
                line: *loc,
                code_snippet: self.get_line_snippet(*loc),
            });
        }

        if analyzer.has_storage_write && !analyzer.has_event_publish {
            self.findings.push(Finding {
                rule_id: "RULE-09".to_string(),
                title: "Missing event emission on state change".to_string(),
                severity: Severity::Info,
                description: format!(
                    "Function '{}' updates contract storage but does not emit a tracking event. Emitting events is highly recommended for auditability and off-chain sync.",
                    fn_name
                ),
                line: fn_line,
                code_snippet: self.get_line_snippet(fn_line),
            });
        }

        if !analyzer.external_calls.is_empty() && !analyzer.storage_writes.is_empty() {
            let first_external = analyzer.external_calls.iter().min().unwrap();
            let last_write = analyzer.storage_writes.iter().max().unwrap();
            if first_external < last_write {
                self.findings.push(Finding {
                    rule_id: "RULE-10".to_string(),
                    title: "Check-Effects-Interactions violation (Potential Reentrancy)".to_string(),
                    severity: Severity::Warning,
                    description: format!(
                        "Function '{}' performs an external call (line {}) before finalizing storage writes (line {}). While Soroban limits reentrancy protocol-wide, adhering to the check-effects-interactions pattern is a security best practice.",
                        fn_name, first_external, last_write
                    ),
                    line: *first_external,
                    code_snippet: self.get_line_snippet(*first_external),
                });
            }
        }
    }

    pub fn scan_secrets(&mut self, source: &str) {
        use regex::Regex;

        let pub_key_regex = Regex::new(r"\bG[A-Z2-7]{55}\b").unwrap();
        let sec_key_regex = Regex::new(r"\bS[A-Z2-7]{55}\b").unwrap();
        let hex_key_regex = Regex::new(r"\b[0-9a-fA-F]{64}\b").unwrap();

        for (idx, line) in source.lines().enumerate() {
            let line_num = idx + 1;

            if pub_key_regex.is_match(line) {
                self.findings.push(Finding {
                    rule_id: "RULE-08".to_string(),
                    title: "Hardcoded Stellar public address".to_string(),
                    severity: Severity::Warning,
                    description: "A hardcoded Stellar public address (G...) was detected in the source. Consider loading addresses dynamically or passing them as arguments.".to_string(),
                    line: line_num,
                    code_snippet: line.trim().to_string(),
                });
            }

            if sec_key_regex.is_match(line) {
                self.findings.push(Finding {
                    rule_id: "RULE-08".to_string(),
                    title: "Hardcoded Stellar secret key".to_string(),
                    severity: Severity::Critical,
                    description: "CRITICAL SECURITY WARNING: A hardcoded Stellar secret key (S...) was detected. This key will be exposed to anyone reading the source code. Revoke this key immediately!".to_string(),
                    line: line_num,
                    code_snippet: line.trim().to_string(),
                });
            }

            if hex_key_regex.is_match(line) {
                let lower_line = line.to_lowercase();
                if lower_line.contains("key") || lower_line.contains("secret") || lower_line.contains("priv") {
                    self.findings.push(Finding {
                        rule_id: "RULE-08".to_string(),
                        title: "Potential hardcoded private key hex".to_string(),
                        severity: Severity::Critical,
                        description: "A raw 64-character hex string associated with key/secret names was detected. This may be a hardcoded private key.".to_string(),
                        line: line_num,
                        code_snippet: line.trim().to_string(),
                    });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use syn::visit::Visit;

    #[test]
    fn test_scan_secrets_public_key() {
        let code = "let address = \"GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY\";";
        let mut scanner = SorobanScanner::new(code);
        scanner.scan_secrets(code);
        assert!(!scanner.findings.is_empty());
        assert_eq!(scanner.findings[0].rule_id, "RULE-08");
        assert!(scanner.findings[0].title.contains("Stellar public address"));
    }

    #[test]
    fn test_scan_secrets_secret_key() {
        let code = "let secret = \"SAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77J5\";";
        let mut scanner = SorobanScanner::new(code);
        scanner.scan_secrets(code);
        assert!(!scanner.findings.is_empty());
        assert_eq!(scanner.findings[0].rule_id, "RULE-08");
        assert!(scanner.findings[0].title.contains("secret key"));
    }

    #[test]
    fn test_visit_unchecked_math() {
        let code = "
            struct Contract;
            
            #[contractimpl]
            impl Contract {
                pub fn add(env: Env, a: i32, b: i32) -> i32 {
                    a + b
                }
            }
        ";
        let file = syn::parse_str::<syn::File>(code).unwrap();
        let mut scanner = SorobanScanner::new(code);
        scanner.visit_file(&file);
        assert!(!scanner.findings.is_empty());
        assert_eq!(scanner.findings[0].rule_id, "RULE-02");
        assert!(scanner.findings[0].title.contains("Unchecked arithmetic"));
    }
}

