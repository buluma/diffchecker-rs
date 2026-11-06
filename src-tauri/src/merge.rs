use crate::types::{DiffLine, DiffType};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MergeChoice {
    Left,
    Right,
}

/// Builds merged output from the complete diff, preserving unchanged lines.
<<<<<<< HEAD
pub fn build_merged_content(lines: &[DiffLine], choices: &HashMap<usize, MergeChoice>) -> String {
    let mut result = Vec::new();

=======
pub fn build_merged_content(
    lines: &[DiffLine],
    choices: &HashMap<usize, MergeChoice>,
) -> String {
    let mut result = Vec::new();
    
>>>>>>> origin/master
    for (index, line) in lines.iter().enumerate() {
        let choice = choices.get(&index).copied();

        match line.r#type {
            DiffType::Equal => {
                result.push(line.content.clone());
            }
            DiffType::Added => {
                if choice != Some(MergeChoice::Left) {
                    result.push(line.content.clone());
                }
            }
            DiffType::Removed => {
                if choice != Some(MergeChoice::Right) {
<<<<<<< HEAD
                    result.push(
                        line.original_content
                            .clone()
                            .unwrap_or_else(|| line.content.clone()),
                    );
=======
                    result.push(line.original_content.clone().unwrap_or_else(|| line.content.clone()));
>>>>>>> origin/master
                }
            }
            DiffType::Modified => {
                let content = if choice == Some(MergeChoice::Left) {
<<<<<<< HEAD
                    line.original_content
                        .clone()
                        .unwrap_or_else(|| line.content.clone())
=======
                    line.original_content.clone().unwrap_or_else(|| line.content.clone())
>>>>>>> origin/master
                } else {
                    line.content.clone()
                };
                result.push(content);
            }
        }
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    result.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::DiffLine;

    fn make_line(
        r#type: DiffType,
        content: &str,
        original_content: Option<&str>,
        index: usize,
    ) -> DiffLine {
        DiffLine {
            r#type,
            original_line_number: Some(index),
            changed_line_number: Some(index),
            content: content.to_string(),
            original_content: original_content.map(String::from),
            changed_content: None,
            char_diffs: None,
        }
    }

    #[test]
    fn test_build_merged_content_preserves_unchanged() {
        let lines = vec![
            make_line(DiffType::Equal, "line1", None, 0),
            make_line(DiffType::Equal, "line2", None, 1),
        ];
        let result = build_merged_content(&lines, &HashMap::new());
        assert_eq!(result, "line1\nline2");
    }

    #[test]
    fn test_build_merged_content_added() {
        let lines = vec![
            make_line(DiffType::Equal, "line1", None, 0),
            make_line(DiffType::Added, "new_line", None, 1),
            make_line(DiffType::Equal, "line2", None, 2),
        ];
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose left (original) - added line should be omitted
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Left);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nline2");
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose right (changed) - added line should be included
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Right);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nnew_line\nline2");
    }

    #[test]
    fn test_build_merged_content_removed() {
        let lines = vec![
            make_line(DiffType::Equal, "line1", None, 0),
            make_line(DiffType::Removed, "old_line", Some("old_line"), 1),
            make_line(DiffType::Equal, "line2", None, 2),
        ];
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose left (original) - removed line should be included
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Left);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nold_line\nline2");
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose right (changed) - removed line should be omitted
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Right);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nline2");
    }

    #[test]
    fn test_build_merged_content_modified() {
        let lines = vec![
            make_line(DiffType::Equal, "line1", None, 0),
            make_line(DiffType::Modified, "new_content", Some("old_content"), 1),
            make_line(DiffType::Equal, "line2", None, 2),
        ];
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose left (original)
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Left);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nold_content\nline2");
<<<<<<< HEAD

=======
        
>>>>>>> origin/master
        // Choose right (changed)
        let mut choices = HashMap::new();
        choices.insert(1, MergeChoice::Right);
        let result = build_merged_content(&lines, &choices);
        assert_eq!(result, "line1\nnew_content\nline2");
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/master
