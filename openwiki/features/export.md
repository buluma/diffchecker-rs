---
type: "Reference"
title: "Export Functionality"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-569f4713a441ec2af9d798ec
    resource: repo://src-tauri/src/export.rs
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-a608478329d5508fc7010c4a
    resource: repo://src/components/App.tsx
  - id: openwiki-source-e4454ab3c7549dbac9de36ce
    resource: repo://src/utils/export.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Export Functionality

The export system provides **plain text diff output** in two formats: **Unified** and **Side-by-Side**. Both Rust (`src-tauri/src/export.rs`) and TypeScript (`src/utils/export.ts`) implementations produce identical output.

## Export Formats

### Unified Diff
Classic `diff -u` style with `+`, `-`, and ` ` prefixes:

```
DIFFCHECKER - UNIFIED DIFF
================================================================================

 context line
-old line
+new line
-old line
+new line
 context line
```

### Side-by-Side Comparison
Two columns with line numbers and change markers:

```
DIFFCHECKER - SIDE BY SIDE COMPARISON
================================================================================

   1 |    1 | context line
     |    2 | + added line
   2 |      | - removed line
   3 |    3 | - old line
     |      | + new line
   4 |    4 | context line
```

## Rust Implementation (`export.rs`)

```rust
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
                DiffType::Modified => output.push_str(&format!("-{}\n+{}\n", original, line.content)),
            },
            DiffViewMode::SideBySide => {
                let number = |n: Option<usize>| n.map(|n| format!("{n:>4}")).unwrap_or_else(|| "    ".to_string());
                let left = number(line.original_line_number);
                let right = number(line.changed_line_number);
                match line.r#type {
                    DiffType::Equal => output.push_str(&format!("{left} | {right} | {original}\n")),
                    DiffType::Added => output.push_str(&format!("     | {right} | + {}\n", line.content)),
                    DiffType::Removed => output.push_str(&format!("{left} |      | - {original}\n")),
                    DiffType::Modified => output.push_str(&format!("{left} | {right} | - {original}\n     |      | + {}\n", line.content)),
                }
            }
        }
    }
    output
}
```

## TypeScript Implementation (`export.ts`)

```typescript
export function buildUnifiedOutput(lines: DiffLine[]): string {
  let output = 'DIFFCHECKER - UNIFIED DIFF\n' + '='.repeat(80) + '\n\n';
  for (const line of lines) {
    switch (line.type) {
      case 'equal':
        output += ` ${line.content}\n`;
        break;
      case 'added':
        output += `+${line.content}\n`;
        break;
      case 'removed':
        output += `-${line.content}\n`;
        break;
      case 'modified':
        output += `-${line.originalContent ?? line.content}\n+${line.content}\n`;
        break;
    }
  }
  return output;
}

export function buildSideBySideOutput(lines: DiffLine[]): string {
  let output = 'DIFFCHECKER - SIDE BY SIDE COMPARISON\n' + '='.repeat(80) + '\n\n';
  const num = (n: number | null) => n != null ? String(n).padStart(4) : '    ';
  for (const line of lines) {
    const left = num(line.originalLineNumber);
    const right = num(line.changedLineNumber);
    const orig = line.originalContent ?? line.content;
    switch (line.type) {
      case 'equal':
        output += `${left} | ${right} | ${orig}\n`;
        break;
      case 'added':
        output += `     | ${right} | + ${line.content}\n`;
        break;
      case 'removed':
        output += `${left} |      | - ${orig}\n`;
        break;
      case 'modified':
        output += `${left} | ${right} | - ${orig}\n     |      | + ${line.content}\n`;
        break;
    }
  }
  return output;
}
```

## Tauri Command

```rust
#[tauri::command]
fn format_diff_cmd(lines: Vec<DiffLine>, mode: DiffViewMode) -> String {
    export::format_diff(&lines, &mode)
}
```

Frontend usage (in `App.tsx` `handleSave`):
```typescript
const content = isTauri()
  ? await invoke<string>('format_diff_cmd', { lines: filteredLines, mode: options.viewMode })
  : options.viewMode === 'unified' ? buildUnifiedOutput(filteredLines) : buildSideBySideOutput(filteredLines);
await desktopAPI.saveFile(content, suggestedName);
```

## Data Structures

Input: `Vec<DiffLine>` / `DiffLine[]` (shared type via ts-rs)

| Field | Used In |
|-------|---------|
| `type` | Format selection |
| `content` | Added/Equal/Modified (changed side) |
| `original_content` | Removed/Modified (original side) |
| `original_line_number` | Side-by-side left column |
| `changed_line_number` | Side-by-side right column |

## Output Characteristics

| Property | Unified | Side-by-Side |
|----------|---------|--------------|
| Header | `DIFFCHECKER - UNIFIED DIFF` | `DIFFCHECKER - SIDE BY SIDE COMPARISON` |
| Separator | `=` × 80 | `=` × 80 |
| Equal lines | ` content` | `left | right | content` |
| Added lines | `+content` | ` | right | + content` |
| Removed lines | `-content` | `left | | - content` |
| Modified lines | `-old\n+new` | `left | right | - old\n | | + new` |
| Line numbers | No | Yes (4-char padded) |

## HTML Export (Not Currently Implemented)

The current implementation exports **plain text only**. The `highlight_code` / `highlight_code_inline` functions in `highlight.rs` produce HTML for syntax highlighting, but there's no combined "export diff as HTML with embedded styles" feature. The Save button in the toolbar uses the text formats above.

## Testing

Rust tests (`export.rs`):
```rust
#[test]
fn formats_modified_lines_in_both_views() {
    let lines = vec![DiffLine { type: DiffType::Modified, ... }];
    assert_eq!(format_diff(&lines, &DiffViewMode::Unified), expected_unified);
    assert_eq!(format_diff(&lines, &DiffViewMode::SideBySide), expected_side_by_side);
}
```

TypeScript tests would mirror this in `export.test.ts` (not currently present).
