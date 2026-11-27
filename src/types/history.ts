// Mirrors the history data stored by the Tauri Rust backend.
export interface HistorySide {
  path: string | null;
  content: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  original: HistorySide;
  changed: HistorySide;
  originalLabel: string;
  changedLabel: string;
}

export interface RecentFile {
  path: string;
  openedAt: number;
  label: string;
}

export interface HistoryAddResult {
  entries: HistoryEntry[];
  status: 'saved' | 'disabled' | 'too-large';
}
