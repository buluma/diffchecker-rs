import { invoke, isTauri } from '@tauri-apps/api/core';
import type { HistoryAddResult, HistoryEntry, RecentFile } from '../types/history';
import type { DiffLine } from '../types/diff';

type OpenFileResult = { path: string; content: string } | { error: string };

export interface DesktopAPI {
  openFile(): Promise<OpenFileResult | null>;
  saveFile(content: string, suggestedName: string): Promise<string | null>;
  getVersion(): Promise<string>;
  listRecentFiles(): Promise<RecentFile[]>;
  openRecentFile(filePath: string): Promise<OpenFileResult | null>;
  listHistory(): Promise<HistoryEntry[]>;
  addHistory(entry: { original: HistoryEntry['original']; changed: HistoryEntry['changed'] }): Promise<HistoryAddResult>;
  removeHistory(id: string): Promise<HistoryEntry[]>;
  clearHistory(): Promise<HistoryEntry[]>;
  getSaveHistory(): Promise<boolean>;
  setSaveHistory(enabled: boolean): Promise<boolean>;
  detectLanguage(path: string | null, content: string): Promise<string>;
  buildMergedContent(lines: DiffLine[], choices: Record<number, 'left' | 'right'>): Promise<string>;
}

const tauriApi: DesktopAPI = {
  async openFile() {
    try {
      return await invoke<OpenFileResult | null>('open_file');
    } catch (error) {
      return { error: String(error) };
    }
  },
  saveFile: (content, suggestedName) => invoke<string | null>('save_file', { content, suggestedName }),
  getVersion: () => invoke<string>('get_version'),
  listRecentFiles: () => invoke<RecentFile[]>('list_recent_files'),
  async openRecentFile(filePath) {
    try {
      return await invoke<OpenFileResult | null>('open_recent_file', { path: filePath });
    } catch (error) {
      return { error: String(error) };
    }
  },
  listHistory: () => invoke<HistoryEntry[]>('list_history'),
  addHistory: ({ original, changed }) => invoke<HistoryAddResult>('add_history', { original, changed }),
  removeHistory: (id) => invoke<HistoryEntry[]>('remove_history', { id }),
  clearHistory: () => invoke<HistoryEntry[]>('clear_history'),
  getSaveHistory: () => invoke<boolean>('get_save_history'),
  setSaveHistory: (enabled) => invoke<boolean>('set_save_history', { enabled }),
  detectLanguage: (path, content) => invoke<string>('detect_language_cmd', { path, content }),
  buildMergedContent: (lines, choices) => invoke<string>('build_merged_content_cmd', { lines, choices }),
};

export const isDesktopApp = () =>
  typeof window !== 'undefined' && (Boolean(window.desktopAPI) || isTauri());

export const getDesktopAPI = (): DesktopAPI | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (window.desktopAPI) return window.desktopAPI;
  return isTauri() ? tauriApi : undefined;
};
