import { describe, expect, it } from 'vitest';
import { computeDiff, DiffLimitError, filterDiffLines } from './diff';
import { DEFAULT_DIFF_OPTIONS } from '../types/diff';

function referenceLcsLength(a: string[], b: string[]): number {
  const row = Array(b.length + 1).fill(0);
  for (const left of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = left === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = above;
    }
  }
  return row[b.length];
}

describe('computeDiff', () => {
  it('keeps optimal line matches across varied insertions, deletions, and replacements', () => {
    let seed = 41;
    const next = () => {
      seed = (seed * 48271) % 0x7fffffff;
      return seed;
    };

    for (let sample = 0; sample < 250; sample++) {
      const original = Array.from({ length: 1 + next() % 8 }, () => `line-${next() % 5}`);
      const changed = Array.from({ length: 1 + next() % 8 }, () => `line-${next() % 5}`);
      const result = computeDiff(original.join('\n'), changed.join('\n'), DEFAULT_DIFF_OPTIONS);

      expect(result.stats.unchanged).toBe(referenceLcsLength(original, changed));
    }
  });

  it('rejects inputs beyond the configured line limit', () => {
    const tooManyLines = Array(10_001).fill('line').join('\n');

    expect(() => computeDiff(tooManyLines, 'line', DEFAULT_DIFF_OPTIONS)).toThrow(DiffLimitError);
  });

  it('bounds highly dissimilar inputs with a simplified alignment warning', () => {
    const original = Array.from({ length: 500 }, (_, i) => `old-${i}`).join('\n');
    const unrelated = Array.from({ length: 500 }, (_, i) => `zzz ${i * 7919} qqq`).join('\n');
    const result = computeDiff(original, unrelated, DEFAULT_DIFF_OPTIONS);

    expect(result.warning).toMatch(/simplified alignment/i);
    expect(result.stats).toMatchObject({ added: 500, removed: 500, modified: 0 });
  });

  it('classifies added and removed lines with statistics', () => {
    const result = computeDiff('same\nremoved line', 'same\nremoved lines\nnew', DEFAULT_DIFF_OPTIONS);

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'modified', 'added']);
    expect(result.stats).toEqual({ added: 1, removed: 0, modified: 1, unchanged: 1 });
  });

  it('pairs a replaced line into one modified line with both line numbers', () => {
    const result = computeDiff('a\nold line\nz', 'a\nnew line\nz', DEFAULT_DIFF_OPTIONS);

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'modified', 'equal']);
    expect(result.lines[1]).toMatchObject({
      originalLineNumber: 2,
      changedLineNumber: 2,
      originalContent: 'old line',
      changedContent: 'new line',
      content: 'new line',
    });
    expect(result.stats).toEqual({ added: 0, removed: 0, modified: 1, unchanged: 2 });
  });

  it('emits leftover removed lines after the modified pairs', () => {
    const result = computeDiff(
      'a\nconst total = 1;\nfirst stray line\nsecond stray line\nb',
      'a\nconst total = 2;\nb',
      DEFAULT_DIFF_OPTIONS,
    );

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'modified', 'removed', 'removed', 'equal']);
    expect(result.lines.map(line => line.originalLineNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(result.stats).toEqual({ added: 0, removed: 2, modified: 1, unchanged: 2 });
  });

  it('pairs a trailing replacement after the last matching line', () => {
    const result = computeDiff('a\nconst total = 1;', 'a\nconst total = 2;\nsomething else entirely', DEFAULT_DIFF_OPTIONS);

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'modified', 'added']);
  });

  it('records inline character changes for a modified line', () => {
    const result = computeDiff('say "hi"', 'say "hi!"', DEFAULT_DIFF_OPTIONS);
    const [line] = result.lines;

    expect(line.type).toBe('modified');
    expect(line.charDiffs?.filter(part => part.type === 'added').map(part => part.value).join('')).toBe('!');
    expect(line.charDiffs?.some(part => part.type === 'removed')).toBe(false);
  });

  it('leaves unrelated lines unpaired, removed before added', () => {
    const result = computeDiff('a\nalpha beta gamma\nz', 'a\n12345 67890\nz', DEFAULT_DIFF_OPTIONS);

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'removed', 'added', 'equal']);
    expect(result.stats).toEqual({ added: 1, removed: 1, modified: 0, unchanged: 2 });
  });

  it('pairs similar lines even when they are not at the same position in the gap', () => {
    const result = computeDiff(
      'const total = price * qty;\nunrelated old text here',
      'brand new completely different\nconst total = price * quantity;',
      DEFAULT_DIFF_OPTIONS,
    );

    expect(result.lines.map(line => line.type)).toEqual(['added', 'modified', 'removed']);
    expect(result.lines[1]).toMatchObject({
      originalLineNumber: 1,
      changedLineNumber: 2,
      originalContent: 'const total = price * qty;',
    });
  });

  it('treats an indentation-only change on a short line as the same line', () => {
    const result = computeDiff('a\nx\nz', 'a\n    x\nz', DEFAULT_DIFF_OPTIONS);

    expect(result.lines.map(line => line.type)).toEqual(['equal', 'modified', 'equal']);
  });

  it('still pairs by similarity, positionally, inside very large gaps', () => {
    const size = 400;
    const original = Array.from({ length: size }, (_, i) => `line number ${i} of the file`).join('\n');
    const similar = Array.from({ length: size }, (_, i) => `line number ${i} of the file!`).join('\n');
    const unrelated = Array.from({ length: size }, (_, i) => `zzz ${i * 7919} qqq`).join('\n');

    expect(computeDiff(original, similar, DEFAULT_DIFF_OPTIONS).stats).toMatchObject({
      modified: size,
      added: 0,
      removed: 0,
    });
    const unrelatedResult = computeDiff(original, unrelated, DEFAULT_DIFF_OPTIONS);
    expect(unrelatedResult.stats).toMatchObject({
      modified: 0,
      added: size,
      removed: size,
    });
    expect(unrelatedResult.warning).toMatch(/simplified alignment/i);
  });

  it('skips inline diffing for lines too long to diff cheaply', () => {
    const long = 'x'.repeat(5000);
    const result = computeDiff(`${long}a`, `${long}b`, DEFAULT_DIFF_OPTIONS);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ type: 'modified', originalContent: `${long}a` });
    expect(result.lines[0].charDiffs).toBeUndefined();
  });

  it('recognizes lines as equal after ignored normalization', () => {
    const result = computeDiff('  Hello   world  ', 'hello world', {
      ...DEFAULT_DIFF_OPTIONS,
      ignoreWhitespace: true,
      ignoreCase: true,
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('equal');
    expect(result.stats.unchanged).toBe(1);
  });

  it('applies custom ignore rules literally', () => {
    const result = computeDiff('build-123', 'build-456', {
      ...DEFAULT_DIFF_OPTIONS,
      customIgnoreRules: ['123', '456'],
    });

    expect(result.stats.unchanged).toBe(1);
  });
});

describe('filterDiffLines', () => {
  it('keeps three lines of context around a change', () => {
    const result = computeDiff(
      'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8',
      'line 1\nline 2\nline 3\nline X\nline 5\nline 6\nline 7\nline 8',
      DEFAULT_DIFF_OPTIONS,
    );

    const filtered = filterDiffLines(result.lines, {
      ...DEFAULT_DIFF_OPTIONS,
      hideUnchangedLines: true,
    });

    expect(filtered.map(line => line.content)).toEqual([
      'line 1', 'line 2', 'line 3', 'line X', 'line 5', 'line 6', 'line 7',
    ]);
  });
});
