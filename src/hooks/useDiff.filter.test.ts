import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useDiff } from './useDiff';
import { DEFAULT_DIFF_OPTIONS } from '../types/diff';
import { computeDiff } from '../test/wasm';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: vi.fn() }));

const original = 'same\nsame\nsame\nsame\nold';
const changed = 'same\nsame\nsame\nsame\nnew';
const comparison = computeDiff(original, changed, DEFAULT_DIFF_OPTIONS);

function startComparison() {
  const hook = renderHook(useDiff);
  act(() => {
    hook.result.current.updateOriginalContent(original);
    hook.result.current.updateChangedContent(changed);
    hook.result.current.setOption({ hideUnchangedLines: true });
    hook.result.current.compare();
  });
  return hook.result;
}

describe('desktop diff filtering', () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it('publishes the diff with Rust indices once filtering completes', async () => {
    let resolveFilter!: (indices: number[]) => void;
    const pending = new Promise<number[]>(resolve => { resolveFilter = resolve; });
    vi.mocked(invoke).mockImplementation(async command => {
      if (command === 'compute_diff_cmd') return comparison;
      if (command === 'filter_diff_indices_cmd') return pending;
      return 'plaintext';
    });
    const result = startComparison();

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('filter_diff_indices_cmd', expect.anything());
      expect(result.current.isComputing).toBe(true);
    });
    expect(result.current.diffResult).toBeNull();
    expect(result.current.filteredLines).toEqual([]);

    await act(async () => resolveFilter([2, 4]));
    expect(result.current.filteredLines).toEqual([comparison.lines[2], comparison.lines[4]]);
    expect(result.current.isComputing).toBe(false);
  });

  it('reports a Rust filtering error', async () => {
    vi.mocked(invoke).mockImplementation(async command => {
      if (command === 'compute_diff_cmd') return comparison;
      if (command === 'filter_diff_indices_cmd') throw new Error('Filtering failed');
      return 'plaintext';
    });
    const result = startComparison();

    await waitFor(() => expect(result.current.inputError).toBe('Filtering failed'));
    expect(result.current.filteredLines).toEqual([]);
  });
});
