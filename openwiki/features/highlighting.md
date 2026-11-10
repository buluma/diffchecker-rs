---
type: "Reference"
title: "Syntax Highlighting"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-6c55891c4e6acc21226b7aa1
    resource: repo://src-tauri/src/highlight.rs
  - id: openwiki-source-c2ee3a2b40a9de2de1914f6f
    resource: repo://src-tauri/src/language.rs
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-537e94600b9727c5e86a9089
    resource: repo://src/components/DiffView.tsx
  - id: openwiki-source-ced6dec7551b503c7d471790
    resource: repo://src/components/Editor.tsx
  - id: openwiki-source-8f7f181782bf076ce00ed803
    resource: repo://src/hooks/useHighlightedLines.ts
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-372e5034efc882a6eb3bbb4e
    resource: repo://src/utils/highlight.ts
  - id: openwiki-source-0ed8e1a5a24459d6a0e51d8c
    resource: repo://src/utils/language.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Syntax Highlighting

The syntax highlighting system provides **code highlighting for diffs and editors** using **syntect (Rust)** and **highlight.js (TypeScript)**, with a shared language mapping and detection logic.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Highlighting Pipeline                         │
├─────────────────────────────────────────────────────────────────┤
│  Desktop (Tauri)                    │  Web (Vite)                │
│  ─────────────────                  │  ──────────────            │
│  highlight_code_cmd                 │  highlightCode()           │
│  highlight_fragments_cmd            │  useHighlightedLines hook  │
│  detect_language_cmd                │  detectLanguageFrom*()     │
│         │                           │         │                  │
│         ▼                           │         ▼                  │
│  syntect (Rust)                     │  highlight.js (TS)         │
│  - base16-ocean.dark theme          │  - atom-one-dark theme     │
│  - 50+ language mapping             │  - Same language IDs       │
└─────────────────────────────────────────────────────────────────┘
```

## Rust Implementation (`highlight.rs`)

### Core Functions

```rust
// Full file HTML with CSS classes
pub fn highlight_code(code: &str, language: &str) -> Result<String, String>

// Full file HTML with inline styles
pub fn highlight_code_inline(code: &str, language: &str) -> Result<String, String>

// Per-line fragments for virtualized editor
pub fn highlight_fragments(lines: &[String], language: &str) -> Result<Vec<String>, String>
```

### Language Mapping

```rust
fn map_language(language: &str) -> Option<&'static str> {
    match language.to_lowercase().as_str() {
        "plaintext" | "text" | "txt" => Some("Plain Text"),
        "javascript" | "js" => Some("JavaScript"),
        "typescript" | "ts" => Some("TypeScript"),
        "jsx" => Some("JavaScript (Babel)"),
        "tsx" => Some("TypeScript (Babel)"),
        "python" | "py" => Some("Python"),
        "rust" | "rs" => Some("Rust"),
        // ... 50+ mappings
        _ => None,
    }
}
```

### Theme & Output

- **Theme**: `base16-ocean.dark` (fallback: `InspiredGitHub`, `Monokai`)
- **CSS-class output**: `<span class="color-#rrggbb bold">token</span>`
- **Inline-style output**: `<span style="color:#rrggbb;font-weight:bold">token</span>`
- **HTML escaping**: `&`, `<`, `>`, `"`, `'` → entities

### Tauri Commands

```rust
#[tauri::command]
async fn highlight_code_cmd(code: String, language: String) -> Result<String, String>

#[tauri::command]
async fn highlight_fragments_cmd(lines: Vec<String>, language: String) -> Result<Vec<String>, String>

#[tauri::command]
async fn detect_language_cmd(path: Option<String>, content: String) -> Result<String, String>
```

## TypeScript Implementation (`highlight.ts`)

```typescript
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// Re-exports hljs.highlight for use in Editor/DiffView
export function highlightCode(code: string, language: string): string {
  const lang = mapLanguage(language);
  const result = lang ? hljs.highlight(code, { language: lang }) : hljs.highlightAuto(code);
  return result.value;
}
```

### Language Mapping (Shared IDs)

```typescript
export const SUPPORTED_LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'jsx', 'tsx',
  'python', 'rust', 'go', 'java', 'cpp', 'c', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css',
  // ... 50+ entries matching Rust
];
```

## Language Detection (`language.ts` / `language.rs`)

Both implementations use **path-based first, content-based fallback**:

```typescript
// TypeScript
export function detectLanguageFromPath(path: string | null): string {
  if (!path) return 'plaintext';
  const ext = path.split('.').pop()?.toLowerCase();
  return EXTENSION_MAP[ext ?? ''] ?? 'plaintext';
}

export function detectLanguageFromContent(content: string): string {
  // Heuristics: shebang, common patterns
  if (content.startsWith('#!')) { ... }
  // ... pattern matching
  return 'plaintext';
}
```

```rust
// Rust
pub fn detect_language_from_path(path: Option<&str>) -> String { ... }
pub fn detect_language_from_content(content: &str) -> String { ... }
```

**Extension map** (partial):
| Extension | Language |
|-----------|----------|
| `.rs` | rust |
| `.ts` / `.tsx` | typescript |
| `.js` / `.jsx` | javascript |
| `.py` | python |
| `.go` | go |
| `.java` | java |
| `.cpp` / `.cc` / `.cxx` | cpp |
| `.cs` | csharp |
| `.rb` | ruby |
| `.php` | php |
| `.swift` | swift |
| `.kt` | kotlin |
| `.html` | html |
| `.css` | css |
| `.json` | json |
| `.yaml` / `.yml` | yaml |
| `.toml` | toml |
| `.md` | markdown |
| `.sh` | bash |
| `.sql` | sql |

## Frontend Integration

### Editor Component
```typescript
// Editor.tsx uses useHighlightedLines hook
const highlighted = useHighlightedLines(visibleLines, file.language);
// Renders <pre class="highlighted-code"> with line spans
```

### DiffView Component
```typescript
// DiffView.tsx uses useHighlightedLines for both panes
const originalHighlights = useHighlightedLines(lines.map(l => l.originalContent ?? l.content), originalLanguage);
const changedHighlights = useHighlightedLines(lines.map(l => l.content), changedLanguage);
// Renders via dangerouslySetInnerHTML
```

### useHighlightedLines Hook
```typescript
// Batches via highlight_fragments_cmd (desktop) or local highlightCode (web)
export function useHighlightedLines(lines: string[], language: string): Map<string, string>
```

## Token Mapping Consistency

| Aspect | Rust (syntect) | TypeScript (highlight.js) |
|--------|----------------|---------------------------|
| Language IDs | Same 50+ strings | Same 50+ strings |
| Theme | base16-ocean.dark | atom-one-dark (similar) |
| Output | CSS classes / inline styles | HTML string with spans |
| Escape | Manual | hljs built-in |

## Performance

- **Desktop**: `highlight_fragments_cmd` batches unique lines per render; cache keyed by `JSON.stringify(lines) + language`
- **Web**: `highlightCode()` called per-line in `useHighlightedLines`; memoized by line content
- **Virtualized**: Editor/DiffView only highlight visible lines (500+ threshold)

## Testing

Rust tests (`highlight.rs`):
```rust
#[test] fn test_highlight_javascript() { ... }
#[test] fn test_highlight_rust() { ... }
#[test] fn test_highlight_fallback() { ... }  // Unknown language
#[test] fn fragments_escape_markup_and_preserve_empty_lines() { ... }
```

TypeScript: No dedicated tests (covered by Editor/DiffView component tests).
