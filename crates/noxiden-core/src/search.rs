use ignore::WalkBuilder;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: usize,
    pub column: usize,
    pub line_content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub query: String,
    pub total_matches: usize,
    pub duration_ms: u64,
    pub matches: Vec<SearchMatch>,
}

pub fn search_workspace(root: &Path, pattern: &str, is_regex: bool, max_results: usize) -> Result<SearchResult, String> {
    let start_time = std::time::Instant::now();
    let re = if is_regex {
        Regex::new(pattern).map_err(|e| format!("Invalid regex: {}", e))?
    } else {
        Regex::new(&regex::escape(pattern)).map_err(|e| format!("Invalid query: {}", e))?
    };

    let mut matches = Vec::new();
    let walker = WalkBuilder::new(root)
        .standard_filters(true)
        .hidden(true)
        .parents(true)
        .build();

    for result in walker {
        if matches.len() >= max_results {
            break;
        }

        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().map_or(false, |ft| ft.is_file()) {
            continue;
        }

        let path = entry.path();
        let file = match File::open(path) {
            Ok(f) => f,
            Err(_) => continue,
        };

        let reader = BufReader::new(file);
        for (idx, line_res) in reader.lines().enumerate() {
            if matches.len() >= max_results {
                break;
            }

            let line = match line_res {
                Ok(l) => l,
                Err(_) => break, // Likely binary file
            };

            if let Some(mat) = re.find(&line) {
                matches.push(SearchMatch {
                    file_path: path.to_string_lossy().into_owned(),
                    line_number: idx + 1,
                    column: mat.start() + 1,
                    line_content: line.trim().to_string(),
                });
            }
        }
    }

    Ok(SearchResult {
        query: pattern.to_string(),
        total_matches: matches.len(),
        duration_ms: start_time.elapsed().as_millis() as u64,
        matches,
    })
}

