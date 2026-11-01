import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Editor } from './Editor';
import type { FileContent } from '../types/diff';
import { MAX_INPUT_BYTES } from '../utils/limits';

const emptyFile: FileContent = { path: null, content: '', language: 'plaintext' };

describe('Editor file drop', () => {
  it('passes dropped file names through for language detection', async () => {
    const onChange = vi.fn();
    render(<Editor file={emptyFile} onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    const file = new File(['const answer = 42;'], 'answer.ts', { type: 'text/plain' });

    fireEvent.drop(textarea, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('const answer = 42;', 'answer.ts'));
  });

  it('rejects a dropped file above the input size limit', () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    render(<Editor file={emptyFile} onChange={onChange} onError={onError} />);
    const file = new File(['x'], 'large.txt');
    Object.defineProperty(file, 'size', { value: MAX_INPUT_BYTES + 1 });

    fireEvent.drop(screen.getByRole('textbox'), { dataTransfer: { files: [file] } });

    expect(onError).toHaveBeenCalledWith('Each input is limited to 5 MiB.');
    expect(onChange).not.toHaveBeenCalled();
  });
});
