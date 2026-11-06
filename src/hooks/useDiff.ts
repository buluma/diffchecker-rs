import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { DiffResult, DiffOptions, FileContent } from '../types/diff';
import { filterDiffLines } from '../utils/diff';
import { detectLanguageFromPath, detectLanguageFromContent } from '../utils/language';
import { DEFAULT_DIFF_OPTIONS } from '../types/diff';
import { MAX_INPUT_BYTES, getInputLimitError } from '../utils/limits';
import { getDesktopAPI } from '../platform/desktop';
import { invoke, isTauri } from '@tauri-apps/api/core';

async function detectLanguage(path: string | null, content: string): Promise<string> {
  const api = getDesktopAPI();
  return api ? api.detectLanguage(path, content) : path
    ? detectLanguageFromPath(path)
    : detectLanguageFromContent(content);
}

export function useDiff() {
  const [originalFile, setOriginalFile] = useState<FileContent>({
    path: null,
    content: '',
    language: 'plaintext',
  });
  const [changedFile, setChangedFile] = useState<FileContent>({
    path: null,
    content: '',
    language: 'plaintext',
  });
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_DIFF_OPTIONS);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [comparisonWarning, setComparisonWarning] = useState<string | null>(null);
  // Diff only runs after the user explicitly asks for it, so pasting into one side doesn't trigger it
  const [isComparing, setIsComparing] = useState(false);
  // Picked by hand; null means use each side's detected language
  const [languageOverride, setLanguageOverride] = useState<string | null>(null);

  // Whether a diff is already showing, so later recomputes (typing in the editors under the diff) can be debounced
  const hasResultRef = useRef(false);
  const requestIdRef = useRef(0);
  const languageRequestRef = useRef({ original: 0, changed: 0 });

  // Compute diff while comparing, and recompute when content or options change
  useEffect(() => {
    // Use requestIdleCallback or setTimeout to avoid blocking UI
    // The first diff runs immediately; recomputes wait a beat so typing doesn't diff on every keystroke
    const delay = hasResultRef.current ? 150 : 0;
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      if (!isComparing || (!originalFile.content && !changedFile.content)) {
        hasResultRef.current = false;
        setDiffResult(null);
        setIsComputing(false);
        setComparisonWarning(null);
        return;
      }

      setIsComputing(true);
      setInputError(null);
      setComparisonWarning(null);
      const requestId = ++requestIdRef.current;

      const finish = (result?: DiffResult, error?: string) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        if (result) {
          hasResultRef.current = true;
          setDiffResult(result);
          setComparisonWarning(result.warning ?? null);
        } else {
          setDiffResult(null);
          setComparisonWarning(null);
          setInputError(error ?? 'The comparison could not be completed.');
        }
        setIsComputing(false);
      };

      try {
        let result: DiffResult;
        if (isTauri()) {
          // Use Rust backend via Tauri
          result = await invoke('compute_diff_cmd', {
            original: originalFile.content,
            changed: changedFile.content,
            options,
          });
        } else {
          // Fallback for web - use TypeScript implementation
          const { computeDiff } = await import('../utils/diff');
          result = computeDiff(originalFile.content, changedFile.content, options);
        }
        if (!cancelled) finish(result);
      } catch (error) {
        if (!cancelled) finish(undefined, error instanceof Error ? error.message : 'The comparison could not be completed.');
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isComparing, originalFile.content, changedFile.content, options]);

  const filteredLines = useMemo(() => {
    if (!diffResult) return [];
    return filterDiffLines(diffResult.lines, options);
  }, [diffResult, options]);

  const updateSide = useCallback((side: 'original' | 'changed', content: string, path: string | null) => {
    const error = getInputLimitError(content);
    if (error) { setInputError(error); return false; }
    setInputError(null);
    setComparisonWarning(null);
    const requestId = ++languageRequestRef.current[side];
    const setFile = side === 'original' ? setOriginalFile : setChangedFile;
    setFile(prev => ({ ...prev, content, path }));
    void detectLanguage(path, content).catch(() => path ? detectLanguageFromPath(path) : detectLanguageFromContent(content)).then(language => {
      if (requestId === languageRequestRef.current[side]) {
        setFile(prev => ({ ...prev, language }));
      }
    });
    return true;
  }, []);

  const updateOriginalContent = useCallback((content: string, path?: string) => {
    updateSide('original', content, path ?? originalFile.path);
  }, [updateSide, originalFile.path]);

  const updateChangedContent = useCallback((content: string, path?: string) => {
    updateSide('changed', content, path ?? changedFile.path);
  }, [updateSide, changedFile.path]);

  const setOption = useCallback((updates: Partial<DiffOptions>) => {
    setOptions(prev => ({ ...prev, ...updates }));
  }, []);

  const reportInputError = useCallback((message: string) => setInputError(message), []);

  const swapFiles = useCallback(() => {
    languageRequestRef.current.original++;
    languageRequestRef.current.changed++;
    setOriginalFile(prevOrig => {
      setChangedFile(prevChanged => ({ ...prevChanged, ...prevOrig }));
      return { ...prevOrig, ...changedFile };
    });
  }, [changedFile]);

  const compare = useCallback(() => setIsComparing(true), []);

  const setSideFile = useCallback((side: 'original' | 'changed', file: { path: string | null; content: string }) =>
    updateSide(side, file.content, file.path), [updateSide]);

  /** Reopens a file from the recent list. False if it couldn't be read (it may have moved). */
  const openRecent = useCallback(async (side: 'original' | 'changed', filePath: string) => {
    const result = await getDesktopAPI()?.openRecentFile(filePath);
    if (!result) return false;
    if ('error' in result) {
      setInputError(result.error);
      return false;
    }
    return setSideFile(side, result);
  }, [setSideFile]);

  /** Loads both sides from a saved comparison and shows its diff */
  const restoreComparison = useCallback(async (
    original: { path: string | null; content: string },
    changed: { path: string | null; content: string },
  ) => {
    setSideFile('original', original);
    setSideFile('changed', changed);
    setLanguageOverride(null);
    setInputError(null);
    setIsComparing(true);
  }, [setSideFile]);

  const closeDiff = useCallback(() => {
    hasResultRef.current = false;
    setIsComparing(false);
  }, []);

  const clearFiles = useCallback(() => {
    languageRequestRef.current.original++;
    languageRequestRef.current.changed++;
    hasResultRef.current = false;
    setIsComparing(false);
    setLanguageOverride(null);
    setOriginalFile({ path: null, content: '', language: 'plaintext' });
    setChangedFile({ path: null, content: '', language: 'plaintext' });
    setDiffResult(null);
    setInputError(null);
    setComparisonWarning(null);
  }, []);

  const loadFile = useCallback(async (side: 'original' | 'changed') => {
    const desktopAPI = getDesktopAPI();
    if (desktopAPI) {
      const result = await desktopAPI.openFile();
      if (result) {
        if ('error' in result) {
          setInputError(result.error);
          return;
        }
        setSideFile(side, result);
      }
    } else {
      // Fallback for web - use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.json,.xml,.yaml,.yml,.toml,.csv,.tsv,.env,.log,.js,.ts,.jsx,.tsx,.py,.java,.cs,.go,.rs,.rb,.php,.swift,.kt,.sh,.sql,.html,.css,.scss,.less';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          if (file.size > MAX_INPUT_BYTES) {
            setInputError('Each input is limited to 5 MiB.');
            return;
          }
          void file.text().then(async content => {
            setSideFile(side, { path: file.name, content });
          }).catch(() => setInputError(`Could not read ${file.name}.`));
        }
      };
      input.click();
    }
  }, [setSideFile]);

  const originalFileView = useMemo(
    () => (languageOverride ? { ...originalFile, language: languageOverride } : originalFile),
    [originalFile, languageOverride],
  );
  const changedFileView = useMemo(
    () => (languageOverride ? { ...changedFile, language: languageOverride } : changedFile),
    [changedFile, languageOverride],
  );

  return {
    // State
    originalFile: originalFileView,
    changedFile: changedFileView,
    languageOverride,
    options,
    diffResult,
    filteredLines,
    isComputing,
    inputError,
    comparisonWarning,
    isComparing,
    
    // Actions
    updateOriginalContent,
    updateChangedContent,
    setOption,
    reportInputError,
    setLanguageOverride,
    swapFiles,
    compare,
    openRecent,
    restoreComparison,
    closeDiff,
    clearFiles,
    loadFile,
  };
}
