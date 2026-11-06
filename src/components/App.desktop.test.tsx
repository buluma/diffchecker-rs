import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import type { HistoryEntry, RecentFile } from '../types/history';

const originalEditor = () => screen.getByPlaceholderText(/^Original text/);
const changedEditor = () => screen.getByPlaceholderText(/^Changed text/);

const entry = (id: string, original: string, changed: string, path: string | null = null): HistoryEntry => ({
  id,
  createdAt: Date.UTC(2026, 8, 20, 12, 0, 0),
  original: { path, content: original },
  changed: { path: null, content: changed },
});

type Api = NonNullable<Window['desktopAPI']>;

function installApi(overrides: Partial<Api> = {}) {
  const api = {
    openFile: vi.fn().mockResolvedValue(null),
    saveFile: vi.fn().mockResolvedValue(null),
    getVersion: vi.fn().mockResolvedValue('9.9.9'),
    listRecentFiles: vi.fn<() => Promise<RecentFile[]>>().mockResolvedValue([]),
    openRecentFile: vi.fn().mockResolvedValue(null),
    listHistory: vi.fn<() => Promise<HistoryEntry[]>>().mockResolvedValue([]),
    addHistory: vi.fn().mockResolvedValue({ entries: [], status: 'saved' }),
    removeHistory: vi.fn().mockResolvedValue([]),
    clearHistory: vi.fn().mockResolvedValue([]),
    getSaveHistory: vi.fn().mockResolvedValue(true),
    setSaveHistory: vi.fn().mockImplementation(async (enabled: boolean) => enabled),
    detectLanguage: vi.fn().mockResolvedValue('plaintext'),
    buildMergedContent: vi.fn().mockResolvedValue(''),
    ...overrides,
  } satisfies Api;
  window.desktopAPI = api;
  return api;
}

describe('desktop history and recent files', () => {
  beforeEach(() => { window.desktopAPI = undefined; });
  afterEach(() => { window.desktopAPI = undefined; });

  it('has no history or recent controls outside the desktop app', () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/recent/i)).not.toBeInTheDocument();
  });

  it('saves a comparison to history when Compare is pressed', async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('old text');
    await user.click(changedEditor());
    await user.paste('new text');
    await user.click(screen.getByRole('button', { name: /compare/i }));

    expect(api.addHistory).toHaveBeenCalledTimes(1);
    expect(api.addHistory).toHaveBeenCalledWith({
      original: { path: null, content: 'old text' },
      changed: { path: null, content: 'new text' },
    });
  });

  it('explains when a comparison is too large to retain in history', async () => {
    installApi({ addHistory: vi.fn().mockResolvedValue({ entries: [], status: 'too-large' }) });
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('old text');
    await user.click(changedEditor());
    await user.paste('new text');
    await user.click(screen.getByRole('button', { name: /compare/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/history was not saved/i);
  });

  it('reports desktop save failures in the status bar', async () => {
    installApi({ saveFile: vi.fn().mockRejectedValue(new Error('Save failed')) });
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('text to save');
    await user.click(screen.getByRole('button', { name: /compare/i }));
    await user.click(await screen.findByRole('button', { name: /save/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Save failed');
  });

  it('does not save to history while editing under an open diff, only on Compare', async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('a');
    await user.click(screen.getByRole('button', { name: /compare/i }));
    await user.click(changedEditor());
    await user.paste('b');

    expect(api.addHistory).toHaveBeenCalledTimes(1);
  });

  it('lists saved comparisons, restores one and shows its diff', async () => {
    installApi({ listHistory: vi.fn().mockResolvedValue([entry('h1', 'left side', 'right side', '/x/a.txt')]) });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    const panel = await screen.findByRole('complementary', { name: /history/i });
    expect(await within(panel).findByText(/a\.txt/)).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: /restore/i }));

    expect(originalEditor()).toHaveValue('left side');
    expect(changedEditor()).toHaveValue('right side');
    expect(await screen.findByRole('button', { name: /close diff/i })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: /history/i })).not.toBeInTheDocument();
  });

  it('deletes one history entry, or all of them', async () => {
    const api = installApi({
      listHistory: vi.fn().mockResolvedValue([entry('h1', 'one', 'uno'), entry('h2', 'two', 'dos')]),
      removeHistory: vi.fn().mockResolvedValue([entry('h2', 'two', 'dos')]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    const panel = await screen.findByRole('complementary', { name: /history/i });
    await within(panel).findByText(/one/);

    await user.click(within(panel).getAllByRole('button', { name: /delete/i })[0]);
    expect(api.removeHistory).toHaveBeenCalledWith('h1');
    await waitFor(() => expect(within(panel).queryByText(/one/)).not.toBeInTheDocument());

    await user.click(within(panel).getByRole('button', { name: /clear history/i }));
    expect(api.clearHistory).toHaveBeenCalled();
    expect(await within(panel).findByText(/no history yet/i)).toBeInTheDocument();
  });

  it('reopens a recent file into the side it was picked for', async () => {
    const api = installApi({
      listRecentFiles: vi.fn().mockResolvedValue([
        { path: '/work/src/a.ts', openedAt: 2 },
        { path: '/work/src/b.ts', openedAt: 1 },
      ]),
      openRecentFile: vi.fn().mockResolvedValue({ path: '/work/src/b.ts', content: 'from b' }),
    });
    const user = userEvent.setup();
    render(<App />);

    const select = await screen.findByLabelText('Recent changed file');
    await user.selectOptions(select, '/work/src/b.ts');

    expect(api.openRecentFile).toHaveBeenCalledWith('/work/src/b.ts');
    await waitFor(() => expect(changedEditor()).toHaveValue('from b'));
    expect(originalEditor()).toHaveValue('');
  });

  it('refreshes the recent list after a file is opened with the dialog', async () => {
    const listRecentFiles = vi.fn<() => Promise<RecentFile[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ path: '/work/new.txt', openedAt: 1 }]);
    installApi({
      listRecentFiles,
      openFile: vi.fn().mockResolvedValue({ path: '/work/new.txt', content: 'opened' }),
    });
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByLabelText('Recent original file')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^original$/i }));

    expect(await screen.findByLabelText('Recent original file')).toBeInTheDocument();
    expect(originalEditor()).toHaveValue('opened');
  });

  it('shows history saving as on by default and turns it off from the panel', async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    const panel = await screen.findByRole('complementary', { name: /history/i });
    const toggle = within(panel).getByRole('checkbox', { name: /save comparisons/i });
    await waitFor(() => expect(toggle).toBeChecked());

    await user.click(toggle);

    expect(api.setSaveHistory).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(within(panel).getByText(/not being saved/i)).toBeInTheDocument();
  });

  it('shows the saved setting when history saving was already turned off', async () => {
    installApi({ getSaveHistory: vi.fn().mockResolvedValue(false) });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    const panel = await screen.findByRole('complementary', { name: /history/i });

    await waitFor(() => expect(within(panel).getByRole('checkbox', { name: /save comparisons/i })).not.toBeChecked());
  });

  it('keeps the list when history saving is off, so old entries can still be restored or deleted', async () => {
    installApi({
      getSaveHistory: vi.fn().mockResolvedValue(false),
      listHistory: vi.fn().mockResolvedValue([entry('h1', 'one', 'uno')]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    const panel = await screen.findByRole('complementary', { name: /history/i });

    expect(await within(panel).findByText(/one/)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /restore/i })).toBeInTheDocument();
  });
});
