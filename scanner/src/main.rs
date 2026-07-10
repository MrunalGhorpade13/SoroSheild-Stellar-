use std::env;
use std::fs;
use std::io::{self, Read};
use std::path::Path;
use serde_json::json;

mod parser;
use parser::{SorobanScanner, Finding};
use syn::visit::Visit;

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = env::args().collect();
    let mut source_code = String::new();
    let mut file_name = "stdin".to_string();

    if args.len() > 1 {
        // Read from specified file path
        let path_str = &args[1];
        if path_str == "--help" || path_str == "-h" {
            println!("SoroShield Static Analyzer v1.0");
            println!("Usage: soroshield-scan [file_path]");
            println!("If no file path is specified, reads from stdin.");
            return Ok(());
        }
        let path = Path::new(path_str);
        source_code = fs::read_to_string(path)?;
        file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    } else {
        // Read from stdin
        io::stdin().read_to_string(&mut source_code)?;
    }

    let mut scanner = SorobanScanner::new(&source_code);

    // Try parsing the file as a Rust source file
    match syn::parse_str::<syn::File>(&source_code) {
        Ok(file) => {
            // Traverse AST
            scanner.visit_file(&file);
            // Run regex-based secret checks
            scanner.scan_secrets(&source_code);

            // Output JSON findings
            let output = json!({
                "success": true,
                "fileName": file_name,
                "findings": scanner.findings,
                "totalCount": scanner.findings.len(),
            });
            println!("{}", serde_json::to_string_pretty(&output)?);
        }
        Err(e) => {
            // Output parsing error in JSON format so the frontend can show syntax errors
            let output = json!({
                "success": false,
                "fileName": file_name,
                "error": {
                    "message": e.to_string(),
                    "line": e.span().start().line,
                    "column": e.span().start().column,
                },
                "findings": Vec::<Finding>::new(),
                "totalCount": 0
            });
            println!("{}", serde_json::to_string_pretty(&output)?);
        }
    }

    Ok(())
}
