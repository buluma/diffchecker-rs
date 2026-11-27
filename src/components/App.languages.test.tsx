import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: vi.fn() }));

describe('desktop languages', () => {
  it('loads the Rust menu and uses plain text when detection fails', async () => {
    vi.mocked(invoke).mockImplementation(async command => {
      if (command === 'highlight_languages_cmd') return ['rust'];
      if (command === 'detect_language_cmd') throw new Error('Detection failed');
      if (command === 'validate_input_cmd') return undefined;
      if (command === 'get_version') return '1.0.9';
      if (command === 'get_save_history') return false;
      return [];
    });
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(await screen.findByRole('option', { name: 'rust' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'python' })).toBeNull();
    const editor = screen.getByPlaceholderText(/^Original text/);
    await user.click(editor);
    await user.paste('#!/usr/bin/env python\nprint("hello")');
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('detect_language_cmd', expect.anything()));
    expect(container.querySelector('.editor-language')).toHaveTextContent('plaintext');
  });
});
