// NAPI bindings for noxiden-core
// Exposes search_workspace and extract_symbols to Node.js/Electron via napi-rs

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::path::Path;

use crate::search::{search_workspace as search_workspace_inner, SearchMatch, SearchResult};
use crate::symbols::{extract_symbols as extract_symbols_inner, SymbolDefinition};

#[napi(object)]
pub struct NapiSearchMatch {
    pub file_path: String,
    pub line_number: u32,
    pub column: u32,
    pub line_content: String,
}

impl From<SearchMatch> for NapiSearchMatch {
    fn from(m: SearchMatch) -> Self {
        Self {
            file_path: m.file_path,
            line_number: m.line_number as u32,
            column: m.column as u32,
            line_content: m.line_content,
        }
    }
}

#[napi(object)]
pub struct NapiSearchResult {
    pub query: String,
    pub total_matches: u32,
    pub duration_ms: u64,
    pub matches: Vec<NapiSearchMatch>,
}

impl From<SearchResult> for NapiSearchResult {
    fn from(r: SearchResult) -> Self {
        Self {
            query: r.query,
            total_matches: r.total_matches as u32,
            duration_ms: r.duration_ms,
            matches: r.matches.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi(object)]
pub struct NapiSymbolDefinition {
    pub name: String,
    pub kind: String,
    pub line_number: u32,
    pub signature: String,
    pub estimated_tokens: u32,
}

impl From<SymbolDefinition> for NapiSymbolDefinition {
    fn from(s: SymbolDefinition) -> Self {
        Self {
            name: s.name,
            kind: s.kind,
            line_number: s.line_number as u32,
            signature: s.signature,
            estimated_tokens: s.estimated_tokens as u32,
        }
    }
}

#[napi]
pub fn search_workspace(
    root: String,
    pattern: String,
    is_regex: bool,
    max_results: u32,
) -> Result<NapiSearchResult> {
    let path = Path::new(&root);
    let result = search_workspace_inner(path, &pattern, is_regex, max_results as usize)
        .map_err(|e| Error::new(Status::GenericFailure, e))?;
    Ok(result.into())
}

#[napi]
pub fn extract_symbols(source_code: String, file_ext: String) -> Vec<NapiSymbolDefinition> {
    extract_symbols_inner(&source_code, &file_ext)
        .into_iter()
        .map(Into::into)
        .collect()
}