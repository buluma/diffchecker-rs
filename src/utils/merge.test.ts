import { describe, expect, it } from 'vitest';
import { runWasm } from '../test/wasm';
import { DEFAULT_DIFF_OPTIONS, type DiffLine } from '../types/diff';

describe('buildMergedContent', () => {
  it('preserves hidden unchanged lines from the complete diff', () => {
    const { result, indices } = runWasm(
      'compare',
      'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten',
      'one\ntwo\nthree\nfour\nFIVE\nsix\nseven\neight\nnine\nten',
      { ...DEFAULT_DIFF_OPTIONS, hideUnchangedLines: true },
    );

    expect(indices!.length).toBeLessThan(result.lines.length);
    expect(runWasm('merge', result.lines, [])).toBe('one\ntwo\nthree\nfour\nFIVE\nsix\nseven\neight\nnine\nten');
  });

  it('restores a removed line only after the browser merge choice', () => {
    const { result } = runWasm('compare', 'keep\nremoved', 'keep', DEFAULT_DIFF_OPTIONS);
    const index = result.lines.findIndex(line => line.type === 'removed');
    expect(runWasm('merge', result.lines, [])).toBe('keep');
    expect(runWasm('merge', result.lines, [[index, 'right']])).toBe('keep\nremoved');
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

    expect(runWasm('merge', lines, [[1, 'left'], [2, 'left']])).toBe('keep\nold\nstale');
  });
});
