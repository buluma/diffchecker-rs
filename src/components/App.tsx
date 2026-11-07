import { invoke, isTauri } from '@tauri-apps/api/core';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from './Editor';
import { DiffView } from './DiffView';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { getDesktopAPI, isDesktopApp } from '../platform/desktop';
import { HistoryPanel } from './HistoryPanel';
import { useDiff } from '../hooks/useDiff';
import { useLocalData } from '../hooks/useLocalData';
import type { DiffLine } from '../types/diff';
import type { HistoryEntry } from '../types/history';
import { buildMergedContent, type MergeChoice } from '../utils/merge';
import { buildSideBySideOutput, buildUnifiedOutput } from '../utils/export';
import '../App.css';

export function App() {
  const {
    originalFile,
    changedFile,
    options,
    languageOverride,
    diffResult,
    filteredLines,
    isComputing,
    inputError,
    comparisonWarning,
    isComparing,
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
  } = useDiff();

  const {
    recentFiles,
    history,
    saveHistory,
    setSaveHistory,
    refreshRecentFiles,
    recordComparison,
    removeHistoryEntry,
    clearHistory,
  } = useLocalData();

  const [showHistory, setShowHistory] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  // Whether the input editors stay visible under the diff
  const [showInput, setShowInput] = useState(true);
  const [mergedContent, setMergedContent] = useState<string>('');
  const mergeRequestRef = useRef(0);
  const [mergeChoices, setMergeChoices] = useState<Record<number, MergeChoice>>({});
  const [version, setVersion] = useState('1.0.0');
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  // Load the desktop package version from Tauri
  useEffect(() => {
    const desktopAPI = getDesktopAPI();
    if (desktopAPI) {
      desktopAPI.getVersion().then(setVersion);
    }
  }, []);

  const updateMergedContent = useCallback((lines: DiffLine[], choices: Record<number, MergeChoice>) => {
    const request = ++mergeRequestRef.current;
    const api = getDesktopAPI();
    if (!api) {
      setMergedContent(buildMergedContent(lines, choices));
      return;
    }
    void api.buildMergedContent(lines, choices).then(content => {
      if (request === mergeRequestRef.current) setMergedContent(content);
    }).catch(error => {
      if (request === mergeRequestRef.current) reportInputError(String(error));
    });
  }, [reportInputError]);

  const handleMergeChange = useCallback((line: DiffLine, direction: 'left' | 'right') => {
    if (!diffResult) return;
    
    const lineIndex = diffResult.lines.findIndex(l => l === line);
    if (lineIndex === -1) return;

    const nextChoices = { ...mergeChoices, [lineIndex]: direction };
    setMergeChoices(nextChoices);
    updateMergedContent(diffResult.lines, nextChoices);
  }, [diffResult, mergeChoices, updateMergedContent]);

  const handleSave = useCallback(async () => {
    const desktopAPI = getDesktopAPI();
    if (desktopAPI) {
      const suggestedName = `diff-${new Date().toISOString().split('T')[0]}.txt`;
      try {
        const content = mergeMode ? mergedContent : isTauri()
          ? await invoke<string>('format_diff_cmd', { lines: filteredLines, mode: options.viewMode })
          : options.viewMode === 'unified' ? buildUnifiedOutput(filteredLines) : buildSideBySideOutput(filteredLines);
        await desktopAPI.saveFile(content, suggestedName);
      } catch (error) {
        reportInputError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [mergeMode, mergedContent, options.viewMode, filteredLines, reportInputError]);

  const canCompare = !!originalFile.content || !!changedFile.content;

  const handleCompare = useCallback(() => {
    if (!canCompare) return;
    compare();
    void recordComparison(
      { path: originalFile.path, content: originalFile.content },
      { path: changedFile.path, content: changedFile.content },
    ).then(status => {
      setHistoryNotice(status === 'too-large'
        ? 'Comparison ran, but history was not saved because each history side is limited to 1 MiB.'
        : null);
    });
  }, [canCompare, compare, recordComparison, originalFile.path, originalFile.content, changedFile.path, changedFile.content]);

  // The main process adds a file to the recent list when it's opened, so re-read it afterwards
  const handleLoad = useCallback(async (side: 'original' | 'changed') => {
    await loadFile(side);
    refreshRecentFiles();
  }, [loadFile, refreshRecentFiles]);

  const handleOpenRecent = useCallback(async (side: 'original' | 'changed', filePath: string) => {
    await openRecent(side, filePath);
    // Opening bumps the file to the top, and a file that couldn't be read gets dropped from the list
    refreshRecentFiles();
  }, [openRecent, refreshRecentFiles]);

  const handleRestore = useCallback((entry: HistoryEntry) => {
    mergeRequestRef.current++;
    setMergeMode(false);
    restoreComparison(entry.original, entry.changed);
    setShowHistory(false);
  }, [restoreComparison]);

  const handleCloseDiff = useCallback(() => {
    mergeRequestRef.current++;
    setMergeMode(false);
    closeDiff();
  }, [closeDiff]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Enter: Compare
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isComparing) {
      e.preventDefault();
      handleCompare();
    }
    // Ctrl+O: Load original
    if ((e.ctrlKey || e.metaKey) && e.key === 'o' && !e.shiftKey) {
      e.preventDefault();
      handleLoad('original');
    }
    // Ctrl+Shift+O: Load changed
    if ((e.ctrlKey || e.metaKey) && e.key === 'o' && e.shiftKey) {
      e.preventDefault();
      handleLoad('changed');
    }
    // Ctrl+Shift+X: Clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && e.shiftKey) {
      e.preventDefault();
      clearFiles();
    }
    // Ctrl+S: Save (when in merge mode or with diff)
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && (mergeMode || diffResult)) {
      e.preventDefault();
      handleSave();
    }
    // Escape: Exit merge mode
    if (e.key === 'Escape' && mergeMode) {
      setMergeMode(false);
    }
  }, [handleLoad, clearFiles, handleCompare, isComparing, handleSave, mergeMode, diffResult]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isDesktop = isDesktopApp();

  return (
    <div className="app">
      <Toolbar
        options={options}
        onOptionsChange={setOption}
        languageOverride={languageOverride}
        onLanguageChange={setLanguageOverride}
        stats={diffResult?.stats ?? null}
        onLoadOriginal={() => handleLoad('original')}
        onLoadChanged={() => handleLoad('changed')}
        recentFiles={recentFiles}
        onOpenRecent={handleOpenRecent}
        historyOpen={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onSwap={swapFiles}
        onClear={clearFiles}
        isComparing={isComparing}
        canCompare={canCompare}
        onCompare={handleCompare}
        onCloseDiff={handleCloseDiff}
        showInput={showInput}
        onToggleInput={() => setShowInput(!showInput)}
        onSave={handleSave}
        canMerge={!!diffResult && filteredLines.some(l => l.type !== 'equal')}
        onToggleMerge={() => {
          mergeRequestRef.current++;
          setMergeMode(!mergeMode);
          if (!mergeMode && diffResult) {
            setMergeChoices({});
            updateMergedContent(diffResult.lines, {});
          }
        }}
        mergeMode={mergeMode}
        isDesktop={isDesktop}
      />

      <div className="main-content">
        {mergeMode ? (
          // Merge mode - show merged result with editor
          <div className="merge-view">
            <div className="merge-header">
              <h2>Merged Result (editable)</h2>
              <div className="merge-actions">
                <button className="toolbar-btn toolbar-btn-primary" onClick={handleSave}>
                  Save Merged File
                </button>
                <button className="toolbar-btn" onClick={() => setMergeMode(false)}>
                  Cancel
                </button>
              </div>
            </div>
            <Editor
              file={{ path: 'merged.txt', content: mergedContent, language: originalFile.language }}
              onChange={content => {
                mergeRequestRef.current++;
                setMergedContent(content);
              }}
              showLineNumbers={true}
            />
          </div>
        ) : (
          <>
            {isComparing && (
              <div className="diff-container">
                <DiffView
                  lines={filteredLines}
                  options={options}
                  originalLanguage={originalFile.language}
                  changedLanguage={changedFile.language}
                  onMergeChange={handleMergeChange}
                  canMerge={true}
                />
              </div>
            )}
            {(!isComparing || showInput) && (
              // Editors: the whole view before comparing, a compact strip under the diff after
              <div className={`editor-pair${isComparing ? ' editor-pair-compact' : ''}`}>
                <Editor
                  file={originalFile}
                  onChange={updateOriginalContent}
                  onError={reportInputError}
                  placeholder="Original text - paste here or drop a file"
                  showLineNumbers={true}
                />
                <Editor
                  file={changedFile}
                  onChange={updateChangedContent}
                  onError={reportInputError}
                  placeholder="Changed text - paste here or drop a file"
                  showLineNumbers={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showHistory && (
        <HistoryPanel
          entries={history}
          saveHistory={saveHistory}
          onToggleSave={setSaveHistory}
          onRestore={handleRestore}
          onRemove={removeHistoryEntry}
          onClear={clearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <StatusBar
        originalFile={originalFile}
        changedFile={changedFile}
        isComputing={isComputing}
        message={inputError ?? comparisonWarning ?? historyNotice}
        version={version}
      />
    </div>
  );
}
