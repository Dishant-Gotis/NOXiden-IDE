use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolDefinition {
    pub name: string_or_owned::Name,
    pub kind: String, // "function" | "class" | "interface" | "struct" | "type"
    pub line_number: usize,
    pub signature: String,
    pub estimated_tokens: usize,
}

pub mod string_or_owned {
    pub type Name = String;
}

pub fn extract_symbols(source_code: &str, file_ext: &str) -> Vec<SymbolDefinition> {
    let mut symbols = Vec::new();

    // Regex patterns for TypeScript, JavaScript, Rust, Python
    let patterns = match file_ext {
        "rs" => vec![
            ("struct", r"pub\s+struct\s+([A-Za-z0-9_]+)"),
            ("enum", r"pub\s+enum\s+([A-Za-z0-9_]+)"),
            ("function", r"(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)"),
            ("trait", r"pub\s+trait\s+([A-Za-z0-9_]+)"),
        ],
        "py" => vec![
            ("class", r"class\s+([A-Za-z0-9_]+)"),
            ("function", r"(?:async\s+)?def\s+([A-Za-z0-9_]+)"),
        ],
        _ => vec![
            ("class", r"(?:export\s+)?class\s+([A-Za-z0-9_]+)"),
            ("interface", r"(?:export\s+)?interface\s+([A-Za-z0-9_]+)"),
            ("type", r"(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*="),
            ("function", r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)"),
            ("function", r"(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\("),
        ],
    };

    let compiled: Vec<(&str, Regex)> = patterns
        .into_iter()
        .filter_map(|(kind, pat)| Regex::new(pat).ok().map(|re| (kind, re)))
        .collect();

    for (line_idx, line) in source_code.lines().enumerate() {
        let trimmed = line.trim();
        for (kind, re) in &compiled {
            if let Some(caps) = re.captures(trimmed) {
                if let Some(name_match) = caps.get(1) {
                    let sig = trimmed.chars().take(80).collect::<String>();
                    let tokens = (sig.len() / 4).max(1);
                    symbols.push(SymbolDefinition {
                        name: name_match.as_str().to_string(),
                        kind: kind.to_string(),
                        line_number: line_idx + 1,
                        signature: sig,
                        estimated_tokens: tokens,
                    });
                    break;
                }
            }
        }
    }

    symbols
}

