import { describe, expect, it } from 'vitest';
import { runWasm } from '../test/wasm';

// Each snippet mixes tokens that the language's syntax colours differently.
const SAMPLES: Record<string, string> = {
  javascript: 'const x = "a"; // c',
  typescript: 'const x: string = "a"; // c',
  python: 'x = "a"  # c',
  java: 'String x = "a"; // c',
  csharp: 'var x = "a"; // c',
  go: 'var x = "a" // c',
  rust: 'let x = "a"; // c',
  ruby: 'x = "a" # c',
  php: '<?php $x = "a"; // c',
  swift: 'let x = "a" // c',
  kotlin: 'val x = "a" // c',
  bash: 'echo "a" # c',
  sql: "SELECT 'a' -- c",
  json: '{"a": 1}',
  yaml: 'a: "b" # c',
  xml: '<a href="b">c</a>',
  html: '<a href="b">c</a>',
  css: 'a { color: red; }',
};

const colours = (html: string) => new Set(html.match(/style="color:#[0-9a-f]{6}/g)).size;

describe('browser syntax highlighting', () => {
  it('highlights every language in the menu', () => {
    const plain = runWasm('languages').filter(language => {
      const sample = SAMPLES[language];
      if (sample === undefined) throw new Error(`Add a highlight sample for ${language}`);
      return colours(runWasm('highlight', [sample], language)[0]) < 2;
    });

    expect(plain).toEqual([]);
  });
});
