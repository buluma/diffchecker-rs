use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::diff::{compute_diff, filter_diff_indices};
use crate::export::format_diff;
use crate::highlight::{highlight_fragments, HIGHLIGHT_LANGUAGES};
use crate::language::{detect_language_from_content, detect_language_from_path};
use crate::limits::get_input_limit_error;
use crate::markers::{compute_markers, MeasuredGroup};
use crate::merge::{build_merged_content, MergeChoice, RemovedLines};
use crate::types::{DiffLine, DiffOptions, DiffResult, DiffViewMode};

#[derive(Deserialize)]
#[serde(tag = "operation", content = "arguments", rename_all = "camelCase")]
enum Operation {
    Compare(String, String, DiffOptions),
    DetectLanguage(Option<String>, String),
    Highlight(Vec<String>, String),
    Languages,
    Markers(Vec<MeasuredGroup>, f64),
    Merge(Vec<DiffLine>, Vec<(usize, MergeChoice)>),
    Export(Vec<DiffLine>, DiffViewMode),
    Validate((String,)),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Comparison {
    result: DiffResult,
    indices: Option<Vec<usize>>,
}

fn encode(value: impl Serialize) -> Result<JsValue, JsError> {
    Ok(value.serialize(&serde_wasm_bindgen::Serializer::json_compatible())?)
}

#[wasm_bindgen]
pub fn dispatch(request: JsValue) -> Result<JsValue, JsError> {
    let operation = serde_wasm_bindgen::from_value(request)?;
    match operation {
        Operation::Compare(original, changed, options) => {
            let result = compute_diff(&original, &changed, &options)?;
            let indices = options
                .hide_unchanged_lines
                .then(|| filter_diff_indices(&result.lines, &options));
            encode(Comparison { result, indices })
        }
        Operation::DetectLanguage(path, content) => encode(match path {
            Some(path) => detect_language_from_path(Some(&path)),
            None => detect_language_from_content(&content),
        }),
        Operation::Highlight(lines, language) => {
            encode(highlight_fragments(&lines, &language).map_err(|error| JsError::new(&error))?)
        }
        Operation::Languages => encode(HIGHLIGHT_LANGUAGES),
        Operation::Markers(groups, height) => encode(compute_markers(groups, height)),
        Operation::Merge(lines, choices) => encode(build_merged_content(
            &lines,
            &choices.into_iter().collect(),
            RemovedLines::DropByDefault,
        )),
        Operation::Export(lines, mode) => encode(format_diff(&lines, &mode)),
        Operation::Validate((content,)) => match get_input_limit_error(&content) {
            Some(error) => Err(error.into()),
            None => Ok(JsValue::UNDEFINED),
        },
    }
}
