use crate::types::{DiffLine, DiffType, DiffViewMode};

pub fn format_diff(lines: &[DiffLine], mode: &DiffViewMode) -> String {
    let mut output = match mode {
        DiffViewMode::Unified => "DIFFCHECKER - UNIFIED DIFF\n".to_string(),
        DiffViewMode::SideBySide => "DIFFCHECKER - SIDE BY SIDE COMPARISON\n".to_string(),
    };
    output.push_str(&"=".repeat(80));
    output.push_str("\n\n");
    for line in lines {
        let original = line.original_content.as_deref().unwrap_or(&line.content);
        match mode {
            DiffViewMode::Unified => match line.r#type {
                DiffType::Equal => output.push_str(&format!(" {}\n", line.content)),
                DiffType::Added => output.push_str(&format!("+{}\n", line.content)),
                DiffType::Removed => output.push_str(&format!("-{}\n", line.content)),
                DiffType::Modified => {
                    output.push_str(&format!("-{}\n+{}\n", original, line.content))
                }
            },
            DiffViewMode::SideBySide => {
                let number = |n: Option<usize>| {
                    n.map(|n| format!("{n:>4}"))
                        .unwrap_or_else(|| "    ".to_string())
                };
                let left = number(line.original_line_number);
                let right = number(line.changed_line_number);
                match line.r#type {
                    DiffType::Equal => output.push_str(&format!("{left} | {right} | {original}\n")),
                    DiffType::Added => {
                        output.push_str(&format!("     | {right} | + {}\n", line.content))
                    }
                    DiffType::Removed => {
                        output.push_str(&format!("{left} |      | - {original}\n"))
                    }
                    DiffType::Modified => output.push_str(&format!(
                        "{left} | {right} | - {original}\n     |      | + {}\n",
                        line.content
                    )),
                }
            }
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_modified_lines_in_both_views() {
        let lines = vec![DiffLine {
            r#type: DiffType::Modified,
            original_line_number: Some(2),
            changed_line_number: Some(3),
            content: "new".into(),
            original_content: Some("old".into()),
            changed_content: None,
            char_diffs: None,
        }];
        let header = "=".repeat(80);
        assert_eq!(
            format_diff(&lines, &DiffViewMode::Unified),
            format!("DIFFCHECKER - UNIFIED DIFF\n{header}\n\n-old\n+new\n")
        );
        assert_eq!(format_diff(&lines, &DiffViewMode::SideBySide), format!("DIFFCHECKER - SIDE BY SIDE COMPARISON\n{header}\n\n   2 |    3 | - old\n     |      | + new\n"));
    }
}
