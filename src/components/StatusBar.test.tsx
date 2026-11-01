import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import type { FileContent } from '../types/diff';

const file = (overrides: Partial<FileContent>): FileContent => ({
  path: null,
  content: '',
  language: 'plaintext',
  ...overrides,
});

const originalItem = (container: HTMLElement) => container.querySelectorAll('.status-item')[0];

describe('StatusBar', () => {
  it('labels text with no file as pasted and separates it from the line count', () => {
    const { container } = render(
      <StatusBar
        originalFile={file({ content: 'a\nb' })}
        changedFile={file({})}
        isComputing={false}
      />,
    );

    expect(originalItem(container)).toHaveTextContent('Original:(pasted)•2 lines•3 B•plaintext');
  });

  it('labels a side with no text as empty', () => {
    const { container } = render(
      <StatusBar originalFile={file({})} changedFile={file({})} isComputing={false} />,
    );

    expect(originalItem(container)).toHaveTextContent('Original:(empty)•1 lines•0 B•plaintext');
  });

  it('shows the file path when there is one', () => {
    const { container } = render(
      <StatusBar
        originalFile={file({ path: '/tmp/a.txt', content: 'x' })}
        changedFile={file({})}
        isComputing={false}
      />,
    );

    expect(originalItem(container)).toHaveTextContent('Original:/tmp/a.txt•1 lines•1 B•plaintext');
  });

  it('announces input and history errors', () => {
    render(
      <StatusBar originalFile={file({})} changedFile={file({})} isComputing={false} message="Input too large" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Input too large');
  });
});
