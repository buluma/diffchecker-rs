import type { HistoryAddResult, HistoryEntry, RecentFile } from './types/history';

type OpenFileResult = { path: string; content: string } | { error: string };

interface DesktopAPI {
  openFile: () => Promise<OpenFileResult | null>;
  saveFile: (content: string, suggestedName: string) => Promise<string | null>;
  getVersion: () => Promise<string>;
  listRecentFiles: () => Promise<RecentFile[]>;
  openRecentFile: (filePath: string) => Promise<OpenFileResult | null>;
  listHistory: () => Promise<HistoryEntry[]>;
  addHistory: (entry: { original: HistoryEntry['original']; changed: HistoryEntry['changed'] }) => Promise<HistoryAddResult>;
  removeHistory: (id: string) => Promise<HistoryEntry[]>;
  clearHistory: () => Promise<HistoryEntry[]>;
  getSaveHistory: () => Promise<boolean>;
  setSaveHistory: (enabled: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    /** Optional test adapter; production commands are invoked through Tauri's Rust command boundary. */
    desktopAPI?: DesktopAPI;
    __TAURI_INTERNALS__?: object;
  }
}

export {};
