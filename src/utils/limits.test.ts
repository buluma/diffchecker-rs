import { describe, expect, it } from 'vitest';
import { MAX_INPUT_BYTES, MAX_INPUT_LINES, getInputLimitError } from './limits';

describe('input limits', () => {
  it('measures UTF-8 bytes', () => {
    expect(getInputLimitError('€'.repeat(Math.ceil(MAX_INPUT_BYTES / 3)))).toBe('Each input is limited to 5 MiB.');
  });

  it('allows text at the byte limit', () => {
    expect(getInputLimitError('x'.repeat(MAX_INPUT_BYTES))).toBeNull();
  });

  it('rejects more than the configured number of lines', () => {
    expect(getInputLimitError(Array(MAX_INPUT_LINES + 1).fill('x').join('\n')))
      .toBe(`Each input is limited to ${MAX_INPUT_LINES.toLocaleString()} lines.`);
  });
});
