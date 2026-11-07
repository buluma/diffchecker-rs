use crate::types::{
    CharDiff, CharDiffType, DiffLimitError, DiffLine, DiffOptions, DiffPrecision, DiffResult,
    DiffStats, DiffType,
};
use std::collections::HashMap;

const MAX_INPUT_LINES: usize = 10_000;
const MAX_INPUT_BYTES: usize = 5 * 1024 * 1024;
const _MAX_SIDE_BYTES: usize = 1024 * 1024;
const MIN_LINE_SIMILARITY: f64 = 0.5;
const MAX_GAP_COMPARISONS: usize = 100_000;
const MAX_INLINE_DIFF_CELLS: usize = 4_000_000;
const MAX_MYERS_TRACE_CELLS: usize = 200_000;
const MAX_MYERS_WORK: usize = 2_000_000;

#[derive(Debug)]
struct DiffComplexityError;

impl std::fmt::Display for DiffComplexityError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Comparison work limit reached")
    }
}

impl std::error::Error for DiffComplexityError {}

/// Normalizes a line based on diff options
fn normalize_line(line: &str, options: &DiffOptions) -> String {
    let mut normalized = line.to_string();

    if options.ignore_whitespace {
        normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    }

    if options.ignore_case {
        normalized = normalized.to_lowercase();
    }

    for rule in &options.custom_ignore_rules {
        if !rule.is_empty() {
            normalized = normalized.replace(rule, "");
        }
    }

    normalized
}

/// Computes the Longest Common Subsequence (LCS) between two arrays
fn compute_lcs<T, F>(a: &[T], b: &[T], equals: F) -> Vec<(usize, usize)>
where
    F: Fn(&T, &T) -> bool,
{
    let m = a.len();
    let n = b.len();

    if m == 0 || n == 0 {
        return Vec::new();
    }

    // DP table for LCS length
    let mut dp = vec![vec![0; n + 1]; m + 1];

    // Fill DP table
    for i in 1..=m {
        for j in 1..=n {
            if equals(&a[i - 1], &b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    let mut lcs = Vec::new();
    let mut i = m;
    let mut j = n;
    while i > 0 && j > 0 {
        if equals(&a[i - 1], &b[j - 1]) {
            lcs.push((i - 1, j - 1));
            i -= 1;
            j -= 1;
        } else if dp[i - 1][j] >= dp[i][j - 1] {
            i -= 1;
        } else {
            j -= 1;
        }
    }

    lcs.reverse();
    lcs
}

/// Myers diff algorithm - computes matches between two sequences
fn compute_myers_matches<T, F>(
    a: &[T],
    b: &[T],
    equals: F,
) -> Result<Vec<(usize, usize)>, DiffComplexityError>
where
    F: Fn(&T, &T) -> bool,
{
    let max_distance = a.len() + b.len();
    let mut frontier: HashMap<isize, usize> = HashMap::new();
    frontier.insert(1, 0);
    let mut trace: Vec<HashMap<isize, usize>> = Vec::new();
    let mut work = 0;

    for distance in 0..=max_distance {
        if (distance + 1) * (distance + 1) > MAX_MYERS_TRACE_CELLS {
            return Err(DiffComplexityError);
        }

        let previous = frontier.clone();
        frontier = previous.clone();

        let distance_isize = distance as isize;
        for diagonal in (-distance_isize..=distance_isize).step_by(2) {
            if work > MAX_MYERS_WORK {
                return Err(DiffComplexityError);
            }
            work += 1;

            let from_down = diagonal == -distance_isize
                || (diagonal != distance_isize
                    && previous.get(&(diagonal - 1)).copied().unwrap_or(usize::MAX)
                        < previous.get(&(diagonal + 1)).copied().unwrap_or(0));

            let x = if from_down {
                previous.get(&(diagonal + 1)).copied().unwrap_or(0)
            } else {
                previous.get(&(diagonal - 1)).copied().unwrap_or(0) + 1
            };
            // y = x - diagonal, handling negative diagonal correctly
            let y = if diagonal >= 0 {
                x.saturating_sub(diagonal as usize)
            } else {
                x + (-diagonal) as usize
            };

            let mut x = x;
            let mut y = y;

            while x < a.len() && y < b.len() && equals(&a[x], &b[y]) {
                x += 1;
                y += 1;
                if work > MAX_MYERS_WORK {
                    return Err(DiffComplexityError);
                }
                work += 1;
            }

            frontier.insert(diagonal, x);

            if x >= a.len() && y >= b.len() {
                trace.push(frontier.clone());
                return Ok(backtrack_myers(&trace, a, b, equals));
            }
        }

        trace.push(frontier.clone());
    }

    Ok(Vec::new())
}

/// Backtrack through Myers trace to find matching pairs
fn backtrack_myers<T, F>(
    trace: &[HashMap<isize, usize>],
    a: &[T],
    b: &[T],
    equals: F,
) -> Vec<(usize, usize)>
where
    F: Fn(&T, &T) -> bool,
{
    let mut x = a.len();
    let mut y = b.len();
    let mut matches = Vec::new();

    for distance in (1..trace.len()).rev() {
        let previous = &trace[distance - 1];
        let diagonal = x as isize - y as isize;
        let from_down = diagonal == -(distance as isize)
            || (diagonal != distance as isize
                && previous.get(&(diagonal - 1)).copied().unwrap_or(usize::MAX)
                    < previous.get(&(diagonal + 1)).copied().unwrap_or(0));

        let previous_diagonal = if from_down {
            diagonal + 1
        } else {
            diagonal - 1
        };
        let previous_x = previous.get(&previous_diagonal).copied().unwrap_or(0);
        let previous_y = (previous_x as isize - previous_diagonal).max(0) as usize;

        while x > previous_x && y > previous_y {
            x -= 1;
            y -= 1;
            matches.push((x, y));
        }

        if x == previous_x {
            if y > 0 {
                y -= 1;
            }
        } else if x > 0 {
            x -= 1;
        }
    }

    while x > 0 && y > 0 && equals(&a[x - 1], &b[y - 1]) {
        x -= 1;
        y -= 1;
        matches.push((x, y));
    }

    matches.reverse();
    matches
}

/// Computes character-level diff between two strings
fn compute_char_diff(original: &str, changed: &str, options: &DiffOptions) -> Vec<CharDiff> {
    let orig_chars: Vec<char> = original.chars().collect();
    let changed_chars: Vec<char> = changed.chars().collect();

    let orig_normalized: Vec<char> = if options.ignore_case {
        orig_chars
            .iter()
            .map(|c| c.to_lowercase().next().unwrap_or(*c))
            .collect()
    } else {
        orig_chars.clone()
    };
    let changed_normalized: Vec<char> = if options.ignore_case {
        changed_chars
            .iter()
            .map(|c| c.to_lowercase().next().unwrap_or(*c))
            .collect()
    } else {
        changed_chars.clone()
    };

    let lcs = compute_lcs(&orig_normalized, &changed_normalized, |a, b| a == b);

    let mut result = Vec::new();
    let mut orig_idx = 0;
    let mut changed_idx = 0;

    for (orig_pos, changed_pos) in lcs {
        while changed_idx < changed_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Added,
                value: changed_chars[changed_idx].to_string(),
            });
            changed_idx += 1;
        }
        while orig_idx < orig_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Removed,
                value: orig_chars[orig_idx].to_string(),
            });
            orig_idx += 1;
        }
        while orig_idx <= orig_pos && changed_idx <= changed_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Equal,
                value: orig_chars[orig_idx].to_string(),
            });
            orig_idx += 1;
            changed_idx += 1;
        }
    }

    while changed_idx < changed_chars.len() {
        result.push(CharDiff {
            r#type: CharDiffType::Added,
            value: changed_chars[changed_idx].to_string(),
        });
        changed_idx += 1;
    }

    while orig_idx < orig_chars.len() {
        result.push(CharDiff {
            r#type: CharDiffType::Removed,
            value: orig_chars[orig_idx].to_string(),
        });
        orig_idx += 1;
    }

    result
}

/// Computes word-level diff between two strings
fn compute_word_diff(original: &str, changed: &str, options: &DiffOptions) -> Vec<CharDiff> {
    let orig_words: Vec<String> = original
        .split_inclusive(|c: char| c.is_whitespace())
        .map(|s| s.to_string())
        .collect();
    let changed_words: Vec<String> = changed
        .split_inclusive(|c: char| c.is_whitespace())
        .map(|s| s.to_string())
        .collect();

    let orig_normalized: Vec<String> = if options.ignore_case {
        orig_words.iter().map(|w| w.to_lowercase()).collect()
    } else {
        orig_words.clone()
    };
    let changed_normalized: Vec<String> = if options.ignore_case {
        changed_words.iter().map(|w| w.to_lowercase()).collect()
    } else {
        changed_words.clone()
    };

    let lcs = compute_lcs(&orig_normalized, &changed_normalized, |a, b| a == b);

    let mut result = Vec::new();
    let mut orig_idx = 0;
    let mut changed_idx = 0;

    for (orig_pos, changed_pos) in lcs {
        while changed_idx < changed_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Added,
                value: changed_words[changed_idx].clone(),
            });
            changed_idx += 1;
        }
        while orig_idx < orig_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Removed,
                value: orig_words[orig_idx].clone(),
            });
            orig_idx += 1;
        }
        while orig_idx <= orig_pos && changed_idx <= changed_pos {
            result.push(CharDiff {
                r#type: CharDiffType::Equal,
                value: orig_words[orig_idx].clone(),
            });
            orig_idx += 1;
            changed_idx += 1;
        }
    }

    while changed_idx < changed_words.len() {
        result.push(CharDiff {
            r#type: CharDiffType::Added,
            value: changed_words[changed_idx].clone(),
        });
        changed_idx += 1;
    }

    while orig_idx < orig_words.len() {
        result.push(CharDiff {
            r#type: CharDiffType::Removed,
            value: orig_words[orig_idx].clone(),
        });
        orig_idx += 1;
    }

    result
}

/// Determines the best precision for a specific change
fn determine_precision(original: &str, changed: &str, options: &DiffOptions) -> DiffPrecision {
    if options.precision != DiffPrecision::Smart {
        return options.precision.clone();
    }

    let avg_length = (original.len() + changed.len()) / 2;
    let has_numbers =
        original.chars().any(|c| c.is_ascii_digit()) || changed.chars().any(|c| c.is_ascii_digit());
    let has_special_chars = original
        .chars()
        .any(|c| !c.is_alphanumeric() && !c.is_whitespace())
        || changed
            .chars()
            .any(|c| !c.is_alphanumeric() && !c.is_whitespace());

    if avg_length < 50 || has_numbers || has_special_chars {
        DiffPrecision::Character
    } else {
        DiffPrecision::Word
    }
}

/// Profile for line similarity comparison
#[derive(Clone)]
struct LineProfile {
    text: String,
    bigrams: HashMap<String, usize>,
}

fn build_line_profile(text: &str) -> LineProfile {
    let mut bigrams = HashMap::new();
    for i in 0..text.len().saturating_sub(1) {
        let bigram = text[i..i + 2].to_string();
        *bigrams.entry(bigram).or_insert(0) += 1;
    }
    LineProfile {
        text: text.to_string(),
        bigrams,
    }
}

/// Whether two differing lines are close enough to show as one modified line
fn are_similar_lines(a: &LineProfile, b: &LineProfile) -> bool {
    if a.text.trim() == b.text.trim() {
        return true;
    }

    let total = a.text.len().saturating_sub(1).max(1) + b.text.len().saturating_sub(1).max(1);
    if total == 0 {
        return false;
    }

    let mut shared = 0;
    for (bigram, count) in &a.bigrams {
        shared += (*count).min(*b.bigrams.get(bigram).unwrap_or(&0));
    }

    (2.0 * shared as f64) / total as f64 >= MIN_LINE_SIMILARITY
}

/// Align gap between matches to find modified line pairs
fn align_gap(
    orig_normalized: &[String],
    changed_normalized: &[String],
    orig_idx: usize,
    changed_idx: usize,
    _orig_end: usize,
    _changed_end: usize,
) -> Vec<(usize, usize)> {
    let removed: Vec<LineProfile> = orig_normalized[orig_idx.._orig_end]
        .iter()
        .map(|s| build_line_profile(s))
        .collect();
    let added: Vec<LineProfile> = changed_normalized[changed_idx.._changed_end]
        .iter()
        .map(|s| build_line_profile(s))
        .collect();

    if removed.len() * added.len() <= MAX_GAP_COMPARISONS {
        let lcs = compute_lcs(&removed, &added, are_similar_lines);
        return lcs
            .into_iter()
            .map(|(r, a)| (orig_idx + r, changed_idx + a))
            .collect();
    }

    let mut pairs = Vec::new();
    for offset in 0..removed.len().min(added.len()) {
        if are_similar_lines(&removed[offset], &added[offset]) {
            pairs.push((orig_idx + offset, changed_idx + offset));
        }
    }
    pairs
}

/// Filters diff lines based on options (e.g., hide unchanged)
pub fn filter_diff_lines(lines: &[DiffLine], options: &DiffOptions) -> Vec<DiffLine> {
    if !options.hide_unchanged_lines {
        return lines.to_vec();
    }

    const CONTEXT: usize = 3;
    let mut visible_indexes = std::collections::HashSet::new();

    for (index, line) in lines.iter().enumerate() {
        if line.r#type != DiffType::Equal {
            let start = index.saturating_sub(CONTEXT);
            let end = (index + CONTEXT).min(lines.len() - 1);
            for context_index in start..=end {
                visible_indexes.insert(context_index);
            }
        }
    }

    lines
        .iter()
        .enumerate()
        .filter_map(|(index, line)| {
            if visible_indexes.contains(&index) {
                Some(line.clone())
            } else {
                None
            }
        })
        .collect()
}

/// Main diff function - compares two texts and returns structured diff result
pub fn compute_diff(
    original_text: &str,
    changed_text: &str,
    options: &DiffOptions,
) -> Result<DiffResult, DiffLimitError> {
    if original_text.len() > MAX_INPUT_BYTES || changed_text.len() > MAX_INPUT_BYTES {
        return Err(DiffLimitError::new("Each input is limited to 5 MiB."));
    }

    // Handle empty inputs early
    if original_text.is_empty() && changed_text.is_empty() {
        return Ok(DiffResult {
            lines: Vec::new(),
            stats: DiffStats {
                added: 0,
                removed: 0,
                modified: 0,
                unchanged: 0,
            },
            warning: None,
        });
    }

    let original_lines: Vec<String> = original_text.split('\n').map(|s| s.to_string()).collect();
    let changed_lines: Vec<String> = changed_text.split('\n').map(|s| s.to_string()).collect();

    if original_lines.len() > MAX_INPUT_LINES || changed_lines.len() > MAX_INPUT_LINES {
        return Err(DiffLimitError::new(&format!(
            "Each input is limited to {} lines.",
            MAX_INPUT_LINES
        )));
    }

    let orig_normalized: Vec<String> = original_lines
        .iter()
        .map(|l| normalize_line(l, options))
        .collect();
    let changed_normalized: Vec<String> = changed_lines
        .iter()
        .map(|l| normalize_line(l, options))
        .collect();

    // Compute LCS at line level using Myers
    let (lcs, simplified) =
        match compute_myers_matches(&orig_normalized, &changed_normalized, |a, b| a == b) {
            Ok(matches) => (matches, false),
            Err(_) => (Vec::new(), true),
        };

    let mut lines = Vec::new();
    let mut orig_idx = 0;
    let mut changed_idx = 0;
    let mut orig_line_num = 1;
    let mut changed_line_num = 1;

    let mut stats = DiffStats {
        added: 0,
        removed: 0,
        modified: 0,
        unchanged: 0,
    };

    let mut warning = None;
    if simplified {
        warning = Some("Used simplified alignment because the inputs differ too extensively for a precise diff.".to_string());
    }

    let build_modified_line = |orig_content: &str,
                               changed_content: &str,
                               original_line_number: usize,
                               changed_line_number: usize|
     -> DiffLine {
        let mut line = DiffLine {
            r#type: DiffType::Modified,
            original_line_number: Some(original_line_number),
            changed_line_number: Some(changed_line_number),
            content: changed_content.to_string(),
            original_content: Some(orig_content.to_string()),
            changed_content: Some(changed_content.to_string()),
            char_diffs: None,
        };

        if orig_content.len() * changed_content.len() <= MAX_INLINE_DIFF_CELLS {
            let precision = determine_precision(orig_content, changed_content, options);
            line.char_diffs = Some(match precision {
                DiffPrecision::Character => {
                    compute_char_diff(orig_content, changed_content, options)
                }
                DiffPrecision::Word => compute_word_diff(orig_content, changed_content, options),
                DiffPrecision::Smart => unreachable!(),
            });
        }

        line
    };

    let emit_removed_until = |lines: &mut Vec<DiffLine>,
                              stats: &mut DiffStats,
                              orig_idx: &mut usize,
                              _changed_idx: &mut usize,
                              orig_line_num: &mut usize,
                              _changed_line_num: &mut usize,
                              end: usize,
                              original_lines: &[String]| {
        while *orig_idx < end {
            lines.push(DiffLine {
                r#type: DiffType::Removed,
                original_line_number: Some(*orig_line_num),
                changed_line_number: None,
                content: original_lines[*orig_idx].clone(),
                original_content: None,
                changed_content: None,
                char_diffs: None,
            });
            stats.removed += 1;
            *orig_idx += 1;
            *orig_line_num += 1;
        }
    };
    let emit_added_until = |lines: &mut Vec<DiffLine>,
                            stats: &mut DiffStats,
                            _orig_idx: &mut usize,
                            changed_idx: &mut usize,
                            _orig_line_num: &mut usize,
                            changed_line_num: &mut usize,
                            end: usize,
                            changed_lines: &[String]| {
        while *changed_idx < end {
            lines.push(DiffLine {
                r#type: DiffType::Added,
                original_line_number: None,
                changed_line_number: Some(*changed_line_num),
                content: changed_lines[*changed_idx].clone(),
                original_content: None,
                changed_content: None,
                char_diffs: None,
            });
            stats.added += 1;
            *changed_idx += 1;
            *changed_line_num += 1;
        }
    };
    let emit_gap = |lines: &mut Vec<DiffLine>,
                    stats: &mut DiffStats,
                    orig_idx: &mut usize,
                    changed_idx: &mut usize,
                    orig_line_num: &mut usize,
                    changed_line_num: &mut usize,
                    _orig_end: usize,
                    _changed_end: usize,
                    orig_normalized: &[String],
                    changed_normalized: &[String],
                    original_lines: &[String],
                    changed_lines: &[String]| {
        let pairs = align_gap(
            orig_normalized,
            changed_normalized,
            *orig_idx,
            *changed_idx,
            _orig_end,
            _changed_end,
        );

        for (orig_pair, changed_pair) in pairs {
            emit_removed_until(
                lines,
                stats,
                orig_idx,
                changed_idx,
                orig_line_num,
                changed_line_num,
                orig_pair,
                original_lines,
            );
            emit_added_until(
                lines,
                stats,
                orig_idx,
                changed_idx,
                orig_line_num,
                changed_line_num,
                changed_pair,
                changed_lines,
            );

            lines.push(build_modified_line(
                &original_lines[*orig_idx],
                &changed_lines[*changed_idx],
                *orig_line_num,
                *changed_line_num,
            ));
            stats.modified += 1;
            *orig_idx += 1;
            *changed_idx += 1;
            *orig_line_num += 1;
            *changed_line_num += 1;
        }

        emit_removed_until(
            lines,
            stats,
            orig_idx,
            changed_idx,
            orig_line_num,
            changed_line_num,
            _orig_end,
            original_lines,
        );
        emit_added_until(
            lines,
            stats,
            orig_idx,
            changed_idx,
            orig_line_num,
            changed_line_num,
            _changed_end,
            changed_lines,
        );
    };

    for (orig_pos, changed_pos) in lcs {
        emit_gap(
            &mut lines,
            &mut stats,
            &mut orig_idx,
            &mut changed_idx,
            &mut orig_line_num,
            &mut changed_line_num,
            orig_pos,
            changed_pos,
            &orig_normalized,
            &changed_normalized,
            &original_lines,
            &changed_lines,
        );

        lines.push(DiffLine {
            r#type: DiffType::Equal,
            original_line_number: Some(orig_line_num),
            changed_line_number: Some(changed_line_num),
            content: original_lines[orig_idx].clone(),
            original_content: None,
            changed_content: None,
            char_diffs: None,
        });
        stats.unchanged += 1;
        orig_idx += 1;
        changed_idx += 1;
        orig_line_num += 1;
        changed_line_num += 1;
    }

    emit_gap(
        &mut lines,
        &mut stats,
        &mut orig_idx,
        &mut changed_idx,
        &mut orig_line_num,
        &mut changed_line_num,
        original_lines.len(),
        changed_lines.len(),
        &orig_normalized,
        &changed_normalized,
        &original_lines,
        &changed_lines,
    );

    Ok(DiffResult {
        lines,
        stats,
        warning,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::DiffOptions;

    fn default_options() -> DiffOptions {
        DiffOptions::default()
    }

    #[test]
    fn packaged_sample_comparison() {
        let result = compute_diff(
            "package qualification alpha",
            "package qualification beta",
            &default_options(),
        )
        .unwrap();
        assert_eq!(result.stats.modified, 1);
        assert!(result.warning.is_none());
    }

    #[test]
    fn test_empty_strings() {
        let result = compute_diff("", "", &default_options()).unwrap();
        assert!(result.lines.is_empty());
        assert_eq!(result.stats.added, 0);
        assert_eq!(result.stats.removed, 0);
    }

    #[test]
    fn test_identical_strings() {
        let result = compute_diff("hello\nworld", "hello\nworld", &default_options()).unwrap();
        assert_eq!(result.lines.len(), 2);
        assert!(result.lines.iter().all(|l| l.r#type == DiffType::Equal));
        assert_eq!(result.stats.unchanged, 2);
    }

    #[test]
    fn test_added_lines() {
        let result = compute_diff("hello", "hello\nworld", &default_options()).unwrap();
        let added = result
            .lines
            .iter()
            .filter(|l| l.r#type == DiffType::Added)
            .count();
        assert_eq!(added, 1);
        assert_eq!(result.stats.added, 1);
    }

    #[test]
    fn test_removed_lines() {
        let result = compute_diff("hello\nworld", "hello", &default_options()).unwrap();
        let removed = result
            .lines
            .iter()
            .filter(|l| l.r#type == DiffType::Removed)
            .count();
        assert_eq!(removed, 1);
        assert_eq!(result.stats.removed, 1);
    }

    #[test]
    fn test_modified_line() {
        let result = compute_diff("hello world", "hello there", &default_options()).unwrap();
        let modified = result
            .lines
            .iter()
            .filter(|l| l.r#type == DiffType::Modified)
            .count();
        assert_eq!(modified, 1);
        assert_eq!(result.stats.modified, 1);
    }

    #[test]
    fn test_ignore_whitespace() {
        let mut options = default_options();
        options.ignore_whitespace = true;
        let result = compute_diff("hello  world", "hello world", &options).unwrap();
        assert_eq!(result.stats.unchanged, 1);
        assert_eq!(result.stats.modified, 0);
    }

    #[test]
    fn test_ignore_case() {
        let mut options = default_options();
        options.ignore_case = true;
        let result = compute_diff("HELLO", "hello", &options).unwrap();
        assert_eq!(result.stats.unchanged, 1);
    }

    #[test]
    fn test_char_diff() {
        let result = compute_diff("hello", "helo", &default_options()).unwrap();
        let modified = result.lines.iter().find(|l| l.r#type == DiffType::Modified);
        assert!(modified.is_some());
        assert!(modified.unwrap().char_diffs.is_some());
    }

    #[test]
    fn test_word_diff() {
        let mut options = default_options();
        options.precision = DiffPrecision::Word;
        let result = compute_diff("hello world", "hello there", &options).unwrap();
        let modified = result.lines.iter().find(|l| l.r#type == DiffType::Modified);
        assert!(modified.is_some());
        assert!(modified.unwrap().char_diffs.is_some());
    }

    #[test]
    fn test_filter_unchanged() {
        let mut options = default_options();
        options.hide_unchanged_lines = true;
        // Use many lines so filtering actually reduces the output
        let original = (0..20)
            .map(|i| format!("line{}", i))
            .collect::<Vec<_>>()
            .join("\n");
        let changed = original.replace("line5", "line5modified");
        let result = compute_diff(&original, &changed, &options).unwrap();
        let filtered = filter_diff_lines(&result.lines, &options);
        // Should show context around changes but hide far unchanged lines
        assert!(filtered.len() < result.lines.len());
    }

    #[test]
    fn myers_matches_lcs_for_short_sequences() {
        let sequences: Vec<Vec<u8>> = (0..31)
            .map(|n: u32| {
                let length = (n + 1).ilog2() as usize;
                (0..length).map(|i| ((n + 1) >> i & 1) as u8).collect()
            })
            .collect();
        for original in &sequences {
            for changed in &sequences {
                let matches = compute_myers_matches(original, changed, |a, b| a == b).unwrap();
                assert_eq!(
                    matches.len(),
                    compute_lcs(original, changed, |a, b| a == b).len(),
                    "{original:?} vs {changed:?}"
                );
                assert!(matches.iter().all(|&(a, b)| original[a] == changed[b]));
                assert!(matches
                    .windows(2)
                    .all(|pair| pair[0].0 < pair[1].0 && pair[0].1 < pair[1].1));
            }
        }
    }

    #[test]
    fn ignore_rules_are_literal() {
        let mut options = default_options();
        options.custom_ignore_rules = vec![".".to_string()];
        assert_eq!(normalize_line("a.b", &options), "ab");
    }

    #[test]
    fn accepts_maximum_line_count_and_rejects_excess_bytes() {
        let input = (0..MAX_INPUT_LINES)
            .map(|i| format!("line {i}"))
            .collect::<Vec<_>>()
            .join("\n");
        let result = compute_diff(&input, &input, &default_options()).unwrap();
        assert_eq!(result.stats.unchanged, MAX_INPUT_LINES);
        assert!(result.warning.is_none());
        let too_large = "a".repeat(MAX_INPUT_BYTES + 1);
        assert!(compute_diff(&too_large, "", &default_options()).is_err());
    }

    #[test]
    fn large_unrelated_inputs_use_bounded_fallback() {
        let original = (0..400)
            .map(|i| format!("line number {i} of the file"))
            .collect::<Vec<_>>()
            .join("\n");
        let changed = (0..400)
            .map(|i| format!("zzz {} qqq", i * 7919))
            .collect::<Vec<_>>()
            .join("\n");
        let result = compute_diff(&original, &changed, &default_options()).unwrap();
        assert_eq!(result.stats.added, 400);
        assert_eq!(result.stats.removed, 400);
        assert!(result.warning.is_some());
    }

    #[test]
    fn test_large_input_rejection() {
        let large = "a\n".repeat(MAX_INPUT_LINES + 1);
        let result = compute_diff(&large, "b", &default_options());
        assert!(result.is_err());
    }

    #[test]
    fn test_custom_ignore_rules() {
        let mut options = default_options();
        options.custom_ignore_rules = vec!["123".to_string(), "456".to_string()];
        let result =
            compute_diff("TIMESTAMP=123\nvalue", "TIMESTAMP=456\nvalue", &options).unwrap();
        assert_eq!(result.stats.unchanged, 2);
    }
}
