import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntry, HistorySide, RecentFile } from '../types/history';
import { getDesktopAPI } from '../platform/desktop';

/** Recent files and comparison history, both kept by the Tauri Rust backend. Empty on the web. */
export function useLocalData() {
  const api = getDesktopAPI();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // On until the main process says otherwise, matching its default
  const [saveHistory, setSaveHistoryState] = useState(true);

  useEffect(() => {
    if (!api) return;
    api.listRecentFiles().then(setRecentFiles);
    api.listHistory().then(setHistory);
    api.getSaveHistory().then(setSaveHistoryState);
  }, [api]);

  const refreshRecentFiles = useCallback(async () => {
    if (api) setRecentFiles(await api.listRecentFiles());
  }, [api]);

  const recordComparison = useCallback(async (original: HistorySide, changed: HistorySide) => {
    if (!api) return 'disabled' as const;
    const result = await api.addHistory({ original, changed });
    setHistory(result.entries);
    return result.status;
  }, [api]);

  const removeHistoryEntry = useCallback(async (id: string) => {
    if (api) setHistory(await api.removeHistory(id));
  }, [api]);

  const setSaveHistory = useCallback(async (enabled: boolean) => {
    if (!api) return;
    // Flip right away so the checkbox doesn't snap back while the main process saves the setting
    setSaveHistoryState(enabled);
    setSaveHistoryState(await api.setSaveHistory(enabled));
  }, [api]);

  const clearHistory = useCallback(async () => {
    if (api) setHistory(await api.clearHistory());
  }, [api]);

  return {
    recentFiles,
    history,
    saveHistory,
    setSaveHistory,
    refreshRecentFiles,
    recordComparison,
    removeHistoryEntry,
    clearHistory,
  };
}
