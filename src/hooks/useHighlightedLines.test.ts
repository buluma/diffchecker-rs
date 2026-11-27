import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useHighlightedLines } from './useHighlightedLines';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: vi.fn() }));

describe('desktop syntax highlighting', () => {
  it('shows only highlights from the current Rust request', async () => {
    let resolveFirst!: (value: string[]) => void;
    const first = new Promise<string[]>(resolve => { resolveFirst = resolve; });
    vi.mocked(invoke).mockReturnValueOnce(first).mockResolvedValueOnce(['<span>second</span>']);
    const { result, rerender } = renderHook(
      ({ line }) => useHighlightedLines([line], 'rust'),
      { initialProps: { line: 'first' } },
    );

    expect(result.current.size).toBe(0);
    rerender({ line: 'second' });
    await waitFor(() => expect(result.current.get('second')).toBe('<span>second</span>'));
    await act(async () => resolveFirst(['<span>first</span>']));
    expect(result.current.get('second')).toBe('<span>second</span>');
    expect(result.current.has('first')).toBe(false);
  });

  it('leaves failed fragments as plain text', async () => {
    let reject!: (error: Error) => void;
    const pending = new Promise<string[]>((_, fail) => { reject = fail; });
    vi.mocked(invoke).mockReturnValueOnce(pending);
    const { result } = renderHook(() => useHighlightedLines(['let x = 1;'], 'rust'));

    await act(async () => reject(new Error('Highlighting failed')));
    expect(result.current.size).toBe(0);
  });
});
