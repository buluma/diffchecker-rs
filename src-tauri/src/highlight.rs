use once_cell::sync::Lazy;
use syntect::easy::HighlightLines;
use syntect::highlighting::{Style, ThemeSet};
use syntect::parsing::SyntaxSet;

static SYNTAX_SET: Lazy<SyntaxSet> = Lazy::new(SyntaxSet::load_defaults_newlines);
static THEME_SET: Lazy<ThemeSet> = Lazy::new(ThemeSet::load_defaults);

/// Maps our language identifiers to syntect syntax names
fn map_language(language: &str) -> Option<&'static str> {
    match language.to_lowercase().as_str() {
        "plaintext" | "text" | "txt" => Some("Plain Text"),
        "javascript" | "js" => Some("JavaScript"),
        "typescript" | "ts" => Some("TypeScript"),
        "jsx" => Some("JavaScript (Babel)"),
        "tsx" => Some("TypeScript (Babel)"),
        "python" | "py" => Some("Python"),
        "rust" | "rs" => Some("Rust"),
        "go" | "golang" => Some("Go"),
        "java" => Some("Java"),
        "cpp" | "c++" | "cc" | "cxx" => Some("C++"),
        "c" => Some("C"),
        "csharp" | "cs" => Some("C#"),
        "php" => Some("PHP"),
        "ruby" | "rb" => Some("Ruby"),
        "swift" => Some("Swift"),
        "kotlin" | "kt" => Some("Kotlin"),
        "scala" => Some("Scala"),
        "html" => Some("HTML"),
        "css" => Some("CSS"),
        "scss" => Some("SCSS"),
        "less" => Some("Less"),
        "json" => Some("JSON"),
        "xml" => Some("XML"),
        "yaml" | "yml" => Some("YAML"),
        "toml" => Some("TOML"),
        "sql" => Some("SQL"),
        "sh" | "bash" | "shell" => Some("Bash"),
        "markdown" | "md" => Some("Markdown"),
        "dockerfile" | "docker" => Some("Dockerfile"),
        "nginx" => Some("Nginx"),
        "graphql" | "gql" => Some("GraphQL"),
        "protobuf" | "proto" => Some("Protobuf"),
        "lua" => Some("Lua"),
        "perl" => Some("Perl"),
        "r" => Some("R"),
        "julia" => Some("Julia"),
        "elm" => Some("Elm"),
        "haskell" | "hs" => Some("Haskell"),
        "clojure" | "clj" => Some("Clojure"),
        "erlang" | "erl" => Some("Erlang"),
        "elixir" | "ex" => Some("Elixir"),
        "dart" => Some("Dart"),
        "vue" => Some("Vue Component"),
        "svelte" => Some("Svelte"),
        _ => None,
    }
}

/// Highlights code and returns HTML with CSS classes
pub fn highlight_code(code: &str, language: &str) -> Result<String, String> {
    // Find the syntax definition
    let syntax_name = map_language(language);
    let syntax = if let Some(name) = syntax_name {
        SYNTAX_SET.find_syntax_by_name(name)
    } else {
        None
    };
    
    let syntax = syntax.unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text());
    
    // Use a popular theme (base16-ocean.dark is close to VS Code dark)
    let theme = THEME_SET.themes.get("base16-ocean.dark")
        .or_else(|| THEME_SET.themes.get("InspiredGitHub"))
        .or_else(|| THEME_SET.themes.get("Monokai"))
        .unwrap_or_else(|| &THEME_SET.themes.values().next().unwrap());
    
    let mut highlighter = HighlightLines::new(syntax, theme);
    
    let mut output = String::new();
    output.push_str("<pre><code>");
    
    for line in code.lines() {
        let regions = highlighter.highlight_line(line, &SYNTAX_SET)
            .map_err(|e| format!("Highlighting error: {}", e))?;
        
        for (style, text) in regions {
            let css_class = style_to_css_class(style);
            let escaped = escape_html(text);
            output.push_str(&format!("<span class=\"{}\">{}</span>", css_class, escaped));
        }
        output.push('\n');
    }
    
    output.push_str("</code></pre>");
    Ok(output)
}

/// Highlights code with inline styles (alternative to CSS classes)
pub fn highlight_code_inline(code: &str, language: &str) -> Result<String, String> {
    let syntax_name = map_language(language);
    let syntax = if let Some(name) = syntax_name {
        SYNTAX_SET.find_syntax_by_name(name)
    } else {
        None
    };
    
    let syntax = syntax.unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text());
    
    let theme = THEME_SET.themes.get("base16-ocean.dark")
        .or_else(|| THEME_SET.themes.get("InspiredGitHub"))
        .or_else(|| THEME_SET.themes.get("Monokai"))
        .unwrap_or_else(|| &THEME_SET.themes.values().next().unwrap());
    
    let mut highlighter = HighlightLines::new(syntax, theme);
    
    let mut html = String::new();
    html.push_str("<pre><code>");
    
    for line in code.lines() {
        let regions = highlighter.highlight_line(line, &SYNTAX_SET)
            .map_err(|e| format!("Highlighting error: {}", e))?;
        
        for (style, text) in regions {
            let style_html = style_to_inline_css(style);
            let escaped = escape_html(text);
            html.push_str(&format!("<span style=\"{}\">{}</span>", style_html, escaped));
        }
        html.push('\n');
    }
    
    html.push_str("</code></pre>");
    Ok(html)
}

fn style_to_css_class(style: Style) -> String {
    let mut classes = Vec::new();
    if style.foreground.r != 0 || style.foreground.g != 0 || style.foreground.b != 0 {
        classes.push(format!("color-#{:02x}{:02x}{:02x}", 
            style.foreground.r, style.foreground.g, style.foreground.b));
    }
    if style.background.r != 0 || style.background.g != 0 || style.background.b != 0 {
        classes.push(format!("bg-#{:02x}{:02x}{:02x}", 
            style.background.r, style.background.g, style.background.b));
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::BOLD) {
        classes.push("bold".to_string());
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::ITALIC) {
        classes.push("italic".to_string());
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::UNDERLINE) {
        classes.push("underline".to_string());
    }
    classes.join(" ")
}

fn style_to_inline_css(style: Style) -> String {
    let mut css = String::new();
    if style.foreground.r != 0 || style.foreground.g != 0 || style.foreground.b != 0 {
        css.push_str(&format!("color:#{:02x}{:02x}{:02x};", 
            style.foreground.r, style.foreground.g, style.foreground.b));
    }
    if style.background.r != 0 || style.background.g != 0 || style.background.b != 0 {
        css.push_str(&format!("background-color:#{:02x}{:02x}{:02x};", 
            style.background.r, style.background.g, style.background.b));
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::BOLD) {
        css.push_str("font-weight:bold;");
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::ITALIC) {
        css.push_str("font-style:italic;");
    }
    if style.font_style.contains(syntect::highlighting::FontStyle::UNDERLINE) {
        css.push_str("text-decoration:underline;");
    }
    css
}

fn escape_html(text: &str) -> String {
    const APOS: &str = "&apos;";
    const QUOT: &str = "&";
    text.replace('&', "&")
        .replace('<', "<")
        .replace('>', ">")
        .replace('"', QUOT)
        .replace('\'', APOS)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highlight_javascript() {
        let code = "const x = 42;\nconsole.log(x);";
        let result = highlight_code(code, "javascript").unwrap();
        assert!(result.contains("<span "));
        assert!(result.contains("const"));
        assert!(result.contains("42"));
    }

    #[test]
    fn test_highlight_rust() {
        let code = "fn main() { println!(\"hello\"); }";
        let result = highlight_code(code, "rust").unwrap();
        assert!(result.contains("<span "));
        assert!(result.contains("fn"));
        assert!(result.contains("main"));
    }

    #[test]
    fn test_highlight_python() {
        let code = "def hello(): print(\"world\")";
        let result = highlight_code(code, "python").unwrap();
        assert!(result.contains("<span "));
        assert!(result.contains("def"));
    }

    #[test]
    fn test_highlight_fallback() {
        let code = "xyz";
        let result = highlight_code(code, "unknownlang").unwrap();
        assert!(!result.is_empty());
    }

    #[test]
    fn test_highlight_empty() {
        let result = highlight_code("", "javascript").unwrap();
        // Empty input returns <pre><code></code></pre>
        assert!(result.contains("<pre><code>") || result.is_empty());
    }

    #[test]
    fn test_map_language() {
        assert_eq!(map_language("javascript"), Some("JavaScript"));
        assert_eq!(map_language("typescript"), Some("TypeScript"));
        assert_eq!(map_language("rust"), Some("Rust"));
        assert_eq!(map_language("unknown"), None);
    }
}
