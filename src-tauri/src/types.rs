use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Represents a single line in the diff output
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    #[ts(type = "DiffType")]
    pub r#type: DiffType,
    pub original_line_number: Option<usize>,
    pub changed_line_number: Option<usize>,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub original_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub changed_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub char_diffs: Option<Vec<CharDiff>>,
}

/// Type of diff line
#[derive(Clone, Debug, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum DiffType {
    Equal,
    Added,
    Removed,
    Modified,
}

/// Character-level diff for inline highlighting
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct CharDiff {
    pub r#type: CharDiffType,
    pub value: String,
}

/// Type of character diff
#[derive(Clone, Debug, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum CharDiffType {
    Equal,
    Added,
    Removed,
}

/// Options for diff computation
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DiffOptions {
    pub precision: DiffPrecision,
    pub ignore_whitespace: bool,
    pub ignore_case: bool,
    pub wrap_lines: bool,
    pub hide_unchanged_lines: bool,
    pub view_mode: DiffViewMode,
    pub custom_ignore_rules: Vec<String>,
}

/// Precision mode for inline diff
#[derive(Clone, Debug, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum DiffPrecision {
    Smart,
    Word,
    Character,
}

/// View mode for diff display
#[derive(Clone, Debug, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "kebab-case")]
pub enum DiffViewMode {
    SideBySide,
    Unified,
}

impl Default for DiffOptions {
    fn default() -> Self {
        Self {
            precision: DiffPrecision::Smart,
            ignore_whitespace: false,
            ignore_case: false,
            wrap_lines: false,
            hide_unchanged_lines: false,
            view_mode: DiffViewMode::SideBySide,
            custom_ignore_rules: Vec::new(),
        }
    }
}

/// Default diff options constant for TypeScript
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DefaultDiffOptions {
    pub precision: DiffPrecision,
    pub ignore_whitespace: bool,
    pub ignore_case: bool,
    pub wrap_lines: bool,
    pub hide_unchanged_lines: bool,
    pub view_mode: DiffViewMode,
    pub custom_ignore_rules: Vec<String>,
}

impl Default for DefaultDiffOptions {
    fn default() -> Self {
        Self {
            precision: DiffPrecision::Smart,
            ignore_whitespace: false,
            ignore_case: false,
            wrap_lines: false,
            hide_unchanged_lines: false,
            view_mode: DiffViewMode::SideBySide,
            custom_ignore_rules: Vec::new(),
        }
    }
}

/// Result of diff computation
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DiffResult {
    pub lines: Vec<DiffLine>,
    pub stats: DiffStats,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub warning: Option<String>,
}

/// Statistics about the diff
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DiffStats {
    pub added: usize,
    pub removed: usize,
    pub modified: usize,
    pub unchanged: usize,
}

/// File content for editor
#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: Option<String>,
    pub content: String,
    pub language: String,
}

/// Error for diff limits
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DiffLimitError {
    pub message: String,
}

impl DiffLimitError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl std::fmt::Display for DiffLimitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for DiffLimitError {}