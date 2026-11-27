use crate::store::HistorySide;

const MAX_PREVIEW_LENGTH: usize = 40;

pub fn file_name(file_path: &str) -> &str {
    file_path
        .rsplit(['/', '\\'])
        .next()
        .filter(|name| !name.is_empty())
        .unwrap_or(file_path)
}

pub fn describe_recent_file(file_path: &str) -> String {
    let mut parts = file_path
        .rsplit(['/', '\\'])
        .filter(|part| !part.is_empty());
    let name = parts.next().unwrap_or(file_path);
    match parts.next() {
        Some(folder) => format!("{name} — {folder}"),
        None => name.to_owned(),
    }
}

pub fn describe_side(side: &HistorySide) -> String {
    if let Some(path) = side.path.as_deref().filter(|path| !path.is_empty()) {
        return file_name(path).to_string();
    }

    let first_line = side.content.lines().map(str::trim).find(|s| !s.is_empty());
    if let Some(line) = first_line {
        let mut units = 0;
        for (index, character) in line.char_indices() {
            units += character.len_utf16();
            if units > MAX_PREVIEW_LENGTH {
                return format!("{}…", &line[..index]);
            }
        }
        line.to_owned()
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
        assert_eq!(file_name(r"C:\work\src\a.rs"), "a.rs");
    }

    #[test]
    fn test_describe_recent_file() {
        assert_eq!(describe_recent_file("src/main.rs"), "main.rs — src");
        assert_eq!(describe_recent_file("src/lib.rs"), "lib.rs — src");
        assert_eq!(describe_recent_file("a.rs"), "a.rs");
        assert_eq!(describe_recent_file(r"C:\work\src\a.rs"), "a.rs — src");
        assert_eq!(
            describe_recent_file("/home/user/project/src/main.rs"),
            "main.rs — src"
        );
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
    #[test]
    fn previews_skip_blank_lines_and_truncate_at_unicode_boundaries() {
        assert_eq!(
            describe_side(&HistorySide {
                path: None,
                content: format!("\n  \n{}🙂tail\nsecond", "a".repeat(39)),
            }),
            format!("{}…", "a".repeat(39))
        );
    }
}
