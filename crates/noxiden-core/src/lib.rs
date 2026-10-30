pub mod search;
pub mod symbols;

pub use search::{search_workspace, SearchMatch, SearchResult};
pub use symbols::{extract_symbols, SymbolDefinition};

#[cfg(feature = "napi")]
mod napi_bindings;

