use crate::store::HistorySide;
use std::path::Path;

const MAX_PREVIEW_LENGTH: usize = 40;

pub fn file_name(file_path: &str) -> &str {
    Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(file_path)
}

pub fn describe_recent_file(file_path: &str) -> String {
    let parts: Vec<&str> = Path::new(file_path)
        .components()
        .filter_map(|c| c.as_os_str().to_str())
        .collect();
    let name = parts.last().copied().unwrap_or(file_path);
    let folder = parts.get(parts.len().saturating_sub(2)).copied();
    if let Some(folder) = folder {
        format!("{name} — {folder}")
    } else {
        name.to_string()
    }
}

pub fn describe_side(side: &HistorySide) -> String {
    if let Some(path) = &side.path {
        return file_name(path).to_string();
    }

    let first_line = side
        .content
        .lines()
        .map(str::trim)
        .find(|s| !s.is_empty());
    if let Some(line) = first_line {
        if line.len() > MAX_PREVIEW_LENGTH {
            format!("{}…", &line[..MAX_PREVIEW_LENGTH])
        } else {
            line.to_string()
        }
    } else {
        "(empty)".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_name() {
        assert_eq!(file_name("src/main.rs"), "main.rs");
        assert_eq!(file_name("/path/to/file.txt"), "file.txt");
        assert_eq!(file_name("file"), "file");
    }

    #[test]
    fn test_describe_recent_file() {
        assert_eq!(describe_recent_file("src/main.rs"), "main.rs — src");
        assert_eq!(describe_recent_file("src/lib.rs"), "lib.rs — src");
        assert_eq!(describe_recent_file("/home/user/project/src/main.rs"), "main.rs — src");
    }

    #[test]
    fn test_describe_side() {
        assert_eq!(
            describe_side(&HistorySide {
                path: Some("src/main.rs".into()),
                content: String::new(),
            }),
            "main.rs"
        );
        assert_eq!(
            describe_side(&HistorySide {
                path: None,
                content: "fn main() {\n    println!(\"hello\");\n}".into(),
            }),
            "fn main() {"
        );
        assert_eq!(
            describe_side(&HistorySide {
                path: None,
                content: String::new(),
            }),
            "(empty)"
        );
        let long = "a".repeat(50);
        assert_eq!(
            describe_side(&HistorySide {
                path: None,
                content: long,
            }),
            format!("{}…", "a".repeat(40))
        );
    }
}