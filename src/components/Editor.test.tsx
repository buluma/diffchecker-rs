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

describe('large editor rendering', () => {
  it('renders a bounded window and updates it when the textarea scrolls', () => {
    const content = Array.from({ length: 10_000 }, (_, i) => `line ${i + 1}`).join('\n');
    const { container } = render(<Editor file={{ ...emptyFile, content }} onChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(container.querySelectorAll('.highlighted-line').length).toBeLessThan(100);
    expect(container.querySelector('.highlighted-code')).toHaveTextContent('line 1');
    Object.defineProperty(textarea, 'clientHeight', { value: 560 });
    fireEvent.scroll(textarea, { target: { scrollTop: 20 * 5000 } });
    expect(container.querySelectorAll('.highlighted-line').length).toBeLessThan(100);
    expect(container.querySelector('.highlighted-code')).toHaveTextContent('line 5001');
    expect(container.querySelector('.line-numbers')).toHaveTextContent('5001');
  });
});
