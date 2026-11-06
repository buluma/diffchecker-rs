use phf::phf_map;
<<<<<<< HEAD
=======
use std::collections::HashMap;
>>>>>>> origin/master

static EXTENSION_LANGUAGE_MAP: phf::Map<&'static str, &'static str> = phf_map! {
    // Web
    "js" => "javascript",
    "jsx" => "javascript",
    "ts" => "typescript",
    "tsx" => "typescript",
    "html" => "html",
    "css" => "css",
    "scss" => "scss",
    "less" => "less",
    "json" => "json",
    "jsonc" => "json",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Python
    "py" => "python",
    "pyw" => "python",
    "pyi" => "python",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Java/JVM
    "java" => "java",
    "kt" => "kotlin",
    "kts" => "kotlin",
    "scala" => "scala",
    "groovy" => "groovy",
    "clj" => "clojure",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // C/C++
    "c" => "c",
    "h" => "c",
    "cpp" => "cpp",
    "cc" => "cpp",
    "cxx" => "cpp",
    "hpp" => "cpp",
    "hxx" => "cpp",
<<<<<<< HEAD

    // C#
    "cs" => "csharp",
    "csx" => "csharp",

    // Go
    "go" => "go",

    // Rust
    "rs" => "rust",

=======
    
    // C#
    "cs" => "csharp",
    "csx" => "csharp",
    
    // Go
    "go" => "go",
    
    // Rust
    "rs" => "rust",
    
>>>>>>> origin/master
    // Ruby
    "rb" => "ruby",
    "erb" => "ruby",
    "rake" => "ruby",
    "gemspec" => "ruby",
<<<<<<< HEAD

    // PHP
    "php" => "php",
    "phtml" => "php",

    // Swift
    "swift" => "swift",

=======
    
    // PHP
    "php" => "php",
    "phtml" => "php",
    
    // Swift
    "swift" => "swift",
    
>>>>>>> origin/master
    // Shell
    "sh" => "bash",
    "bash" => "bash",
    "zsh" => "bash",
    "fish" => "fish",
<<<<<<< HEAD

    // SQL
    "sql" => "sql",

=======
    
    // SQL
    "sql" => "sql",
    
>>>>>>> origin/master
    // Data/Config
    "yaml" => "yaml",
    "yml" => "yaml",
    "toml" => "toml",
    "xml" => "xml",
    "csv" => "csv",
    "tsv" => "tsv",
    "ini" => "ini",
    "cfg" => "ini",
    "conf" => "ini",
    "env" => "dotenv",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Documentation
    "md" => "markdown",
    "mdx" => "markdown",
    "rst" => "rst",
    "txt" => "plaintext",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Logs
    "log" => "plaintext",
    "out" => "plaintext",
    "err" => "plaintext",
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Other
    "dockerfile" => "dockerfile",
    "dockerignore" => "dockerfile",
    "gitignore" => "gitignore",
    "gitattributes" => "gitignore",
    "makefile" => "makefile",
    "cmake" => "cmake",
    "vim" => "vim",
    "lua" => "lua",
    "r" => "r",
    "pl" => "perl",
    "pm" => "perl",
};

static FILENAME_LANGUAGE_MAP: phf::Map<&'static str, &'static str> = phf_map! {
    "Dockerfile" => "dockerfile",
    "Makefile" => "makefile",
    "CMakeLists.txt" => "cmake",
    ".gitignore" => "gitignore",
    ".gitattributes" => "gitignore",
    ".dockerignore" => "dockerfile",
    ".env" => "dotenv",
    ".env.example" => "dotenv",
    ".env.local" => "dotenv",
    ".editorconfig" => "ini",
    ".eslintrc" => "json",
    ".prettierrc" => "json",
    "package.json" => "json",
    "tsconfig.json" => "json",
    "composer.json" => "json",
    "Cargo.toml" => "toml",
    "go.mod" => "go",
    "pom.xml" => "xml",
    "build.gradle" => "groovy",
    "settings.gradle" => "groovy",
};

/// Detect language from file path
pub fn detect_language_from_path(file_path: Option<&str>) -> String {
    let file_path = match file_path {
        Some(p) if !p.is_empty() => p,
        _ => return "plaintext".to_string(),
    };
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Get filename from path
    let filename = file_path
        .split('/')
        .last()
        .unwrap_or(file_path)
        .split('\\')
        .last()
        .unwrap_or(file_path);
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // Check exact filename matches first
    if let Some(lang) = FILENAME_LANGUAGE_MAP.get(filename) {
        return lang.to_string();
    }
<<<<<<< HEAD

    // Check extension
    let ext = filename.split('.').last().unwrap_or("").to_lowercase();

    if let Some(lang) = EXTENSION_LANGUAGE_MAP.get(&ext) {
        return lang.to_string();
    }

=======
    
    // Check extension
    let ext = filename
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();
    
    if let Some(lang) = EXTENSION_LANGUAGE_MAP.get(&ext) {
        return lang.to_string();
    }
    
>>>>>>> origin/master
    "plaintext".to_string()
}

/// Detect language from content
pub fn detect_language_from_content(content: &str) -> String {
    // Shebang detection
    if let Some(shebang_match) = content.lines().next() {
        if let Some(rest) = shebang_match.strip_prefix("#!") {
            let interpreter = rest.trim().split('/').last().unwrap_or("");
            match interpreter {
                i if i.contains("python") => return "python".to_string(),
                i if i.contains("node") => return "javascript".to_string(),
                i if i.contains("bash") || i.contains("sh") => return "bash".to_string(),
                i if i.contains("perl") => return "perl".to_string(),
                i if i.contains("ruby") => return "ruby".to_string(),
                i if i.contains("php") => return "php".to_string(),
                _ => {}
            }
        }
    }
<<<<<<< HEAD

    let trimmed = content.trim_start();

=======
    
    let trimmed = content.trim_start();
    
>>>>>>> origin/master
    // XML declaration
    if trimmed.starts_with("<?xml") {
        return "xml".to_string();
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // HTML doctype
    if trimmed.to_lowercase().starts_with("<!doctype html") {
        return "html".to_string();
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // JSON detection
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        if serde_json::from_str::<serde_json::Value>(content).is_ok() {
            return "json".to_string();
        }
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // YAML detection (simple heuristic)
    if regex::Regex::new(r"^[\w-]+:\s").unwrap().is_match(content) {
        return "yaml".to_string();
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    // CSV detection
    if content.contains(',') {
        let lines: Vec<&str> = content.lines().collect();
        if !lines.is_empty() && lines.iter().all(|l| l.split(',').count() > 1) {
            return "csv".to_string();
        }
    }
<<<<<<< HEAD

=======
    
>>>>>>> origin/master
    "plaintext".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_language_from_path() {
        assert_eq!(detect_language_from_path(Some("test.rs")), "rust");
        assert_eq!(detect_language_from_path(Some("test.py")), "python");
        assert_eq!(detect_language_from_path(Some("test.js")), "javascript");
        assert_eq!(detect_language_from_path(Some("test.ts")), "typescript");
        assert_eq!(detect_language_from_path(Some("Dockerfile")), "dockerfile");
        assert_eq!(detect_language_from_path(Some("Makefile")), "makefile");
        assert_eq!(detect_language_from_path(Some(".gitignore")), "gitignore");
        assert_eq!(detect_language_from_path(Some("unknown.xyz")), "plaintext");
        assert_eq!(detect_language_from_path(None), "plaintext");
        assert_eq!(detect_language_from_path(Some("")), "plaintext");
    }

    #[test]
    fn test_detect_language_from_content() {
<<<<<<< HEAD
        assert_eq!(
            detect_language_from_content("#!/usr/bin/env python3\nprint('hi')"),
            "python"
        );
        assert_eq!(detect_language_from_content("#!/bin/bash\necho hi"), "bash");
        assert_eq!(
            detect_language_from_content("<?xml version=\"1.0\"?><root/>"),
            "xml"
        );
        assert_eq!(
            detect_language_from_content("<!DOCTYPE html><html></html>"),
            "html"
        );
        assert_eq!(detect_language_from_content("{\"key\": \"value\"}"), "json");
        assert_eq!(
            detect_language_from_content("key: value\nother: value"),
            "yaml"
        );
        assert_eq!(detect_language_from_content("a,b,c\n1,2,3"), "csv");
        assert_eq!(detect_language_from_content("just some text"), "plaintext");
    }
}
=======
        assert_eq!(detect_language_from_content("#!/usr/bin/env python3\nprint('hi')"), "python");
        assert_eq!(detect_language_from_content("#!/bin/bash\necho hi"), "bash");
        assert_eq!(detect_language_from_content("<?xml version=\"1.0\"?><root/>"), "xml");
        assert_eq!(detect_language_from_content("<!DOCTYPE html><html></html>"), "html");
        assert_eq!(detect_language_from_content("{\"key\": \"value\"}"), "json");
        assert_eq!(detect_language_from_content("key: value\nother: value"), "yaml");
        assert_eq!(detect_language_from_content("a,b,c\n1,2,3"), "csv");
        assert_eq!(detect_language_from_content("just some text"), "plaintext");
    }
}
>>>>>>> origin/master
