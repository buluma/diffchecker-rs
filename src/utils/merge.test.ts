import { describe, expect, it } from 'vitest';
import { buildMergedContent } from './merge';
import { computeDiff, filterDiffLines } from './diff';
import { DEFAULT_DIFF_OPTIONS, type DiffLine } from '../types/diff';

describe('buildMergedContent', () => {
  it('preserves hidden unchanged lines from the complete diff', () => {
    const result = computeDiff(
      'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten',
      'one\ntwo\nthree\nfour\nFIVE\nsix\nseven\neight\nnine\nten',
      DEFAULT_DIFF_OPTIONS,
    );
    const visibleLines = filterDiffLines(result.lines, {
      ...DEFAULT_DIFF_OPTIONS,
      hideUnchangedLines: true,
    });

    expect(visibleLines.length).toBeLessThan(result.lines.length);
    expect(buildMergedContent(result.lines)).toBe('one\ntwo\nthree\nfour\nFIVE\nsix\nseven\neight\nnine\nten');
  });

  it('retains choices across multiple changed lines', () => {
    const lines: DiffLine[] = [
      { type: 'equal', originalLineNumber: 1, changedLineNumber: 1, content: 'keep', originalContent: null, changedContent: null, charDiffs: null },
      {
        type: 'modified',
        originalLineNumber: 2,
        changedLineNumber: 2,
        content: 'new',
        originalContent: 'old',
        changedContent: 'new',
        charDiffs: null,
      },
      {
        type: 'modified',
        originalLineNumber: 3,
        changedLineNumber: 3,
        content: 'updated',
        originalContent: 'stale',
        changedContent: 'updated',
        charDiffs: null,
      },
    ];

    expect(buildMergedContent(lines, { 1: 'left', 2: 'left' })).toBe('keep\nold\nstale');
  });
});
