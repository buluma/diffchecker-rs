import { useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import type { DiffLine, DiffOptions } from '../types/diff';
import { useHighlightedLines } from '../hooks/useHighlightedLines';
import { groupKind, toMarkers, type ChangeMarker } from '../utils/markers';
import { invoke, isTauri } from '@tauri-apps/api/core';

interface DiffViewProps {
  lines: DiffLine[];
  options: DiffOptions;
  originalLanguage: string;
  changedLanguage: string;
  onMergeChange?: (line: DiffLine, direction: 'left' | 'right') => void;
  canMerge?: boolean;
  onScroll?: (scrollTop: number, side: 'split' | 'unified') => void;
}

const DIFF_TYPE_CLASSES: Record<string, string> = {
  equal: 'diff-equal',
  added: 'diff-added',
  removed: 'diff-removed',
  modified: 'diff-modified',
};

export function DiffView({
  lines,
  options,
  originalLanguage,
  changedLanguage,
  onMergeChange,
  canMerge = false,
  onScroll,
}: DiffViewProps) {
  const [expandedRanges, setExpandedRanges] = useState<Set<number>>(new Set());

  const splitPaneRef = useRef<HTMLDivElement>(null);
  const unifiedPaneRef = useRef<HTMLDivElement>(null);
  // Index into the changed groups; -1 until the user first navigates
  const [changeCursor, setChangeCursor] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });
  const [wideViewport, setWideViewport] = useState(() => window.innerWidth > 900);
  const virtual = lines.length > 500 && !options.wrapLines && !options.hideUnchangedLines && !showAll && wideViewport;
  useLayoutEffect(() => {
    const update = () => setWideViewport(window.innerWidth > 900);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const rowOffsets = useMemo(() => {
    const offsets = [0];
    for (const line of lines) offsets.push(offsets[offsets.length - 1] + (options.viewMode === 'unified' && line.type === 'modified' ? 40 : 20));
    return offsets;
  }, [lines, options.viewMode]);
  const headerHeight = options.viewMode === 'side-by-side' ? 42 : 0;
  const findRow = (position: number) => {
    let low = 0, high = lines.length;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (rowOffsets[mid] <= position) low = mid; else high = mid - 1;
    }
    return low;
  };
  const start = virtual ? Math.max(0, findRow(Math.max(0, viewport.top - headerHeight)) - 20) : 0;
  const end = virtual ? Math.min(lines.length, findRow(Math.max(0, viewport.top - headerHeight) + viewport.height) + 21) : lines.length;
  const visibleLines = useMemo(() => virtual ? lines.slice(start, end) : lines, [lines, virtual, start, end]);
  const originalHighlights = useHighlightedLines(visibleLines.map(line => line.originalContent ?? line.content), originalLanguage);
  const changedHighlights = useHighlightedLines(visibleLines.map(line => line.content), changedLanguage);
  const highlighted = (content: string, language: string) => language === originalLanguage
    ? originalHighlights.get(content) ?? (language === changedLanguage ? changedHighlights.get(content) : undefined) ?? ' '
    : changedHighlights.get(content) ?? ' ';

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, side: 'split' | 'unified') => {
    if (virtual) setViewport({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight || 600 });
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop, side);
    }
  }, [onScroll, virtual]);

  const toggleExpand = useCallback((index: number) => {
    setExpandedRanges(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback((index: number) => expandedRanges.has(index), [expandedRanges]);

  // Group consecutive unchanged lines for collapse; changed groups are numbered for navigation
  type LineGroup = { type: 'changed' | 'unchanged'; lines: DiffLine[]; startIndex: number; changeIndex?: number };

  const groupedLines = useMemo(() => {
    const groups: LineGroup[] = [];
    let currentGroup: LineGroup | null = null;
    let changeCount = 0;

    lines.forEach((line, index) => {
      const isChanged = line.type !== 'equal';
      
      if (!currentGroup || currentGroup.type !== (isChanged ? 'changed' : 'unchanged')) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          type: isChanged ? 'changed' : 'unchanged',
          lines: [line],
          startIndex: index,
          changeIndex: isChanged ? changeCount++ : undefined,
        };
      } else {
        currentGroup.lines.push(line);
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [lines]);

  const visibleGroups = useMemo(() => virtual ? groupedLines.flatMap(group => {
    const from = Math.max(start, group.startIndex);
    const to = Math.min(end, group.startIndex + group.lines.length);
    return from < to ? [{ ...group, startIndex: from, lines: group.lines.slice(from - group.startIndex, to - group.startIndex) }] : [];
  }) : groupedLines, [groupedLines, virtual, start, end]);

  const renderUnchangedToggle = (group: LineGroup) => {
    const expanded = isExpanded(group.startIndex);
    return (
      <button
        type="button"
        className="diff-collapsed"
        aria-expanded={expanded}
        onClick={() => toggleExpand(group.startIndex)}
      >
        <span className="collapse-indicator" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        <span>{expanded ? 'Hide' : 'Show'} {group.lines.length} unchanged {group.lines.length === 1 ? 'line' : 'lines'}</span>
        <span className="collapse-indicator" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
    );
  };

  const changeCount = groupedLines.filter(group => group.type === 'changed').length;
  const activeChange = Math.min(changeCursor, changeCount - 1);

  const activePane = useCallback(
    () => (options.viewMode === 'unified' ? unifiedPaneRef.current : splitPaneRef.current),
    [options.viewMode],
  );

  useLayoutEffect(() => {
    const pane = activePane();
    if (!pane || !virtual) return;
    const update = () => setViewport(previous => {
      const top = pane.scrollTop;
      const height = pane.clientHeight || 600;
      return previous.top === top && previous.height === height ? previous : { top, height };
    });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [activePane, virtual]);

  const showChange = useCallback((index: number) => {
    setChangeCursor(index);

    const pane = activePane();
    if (pane && virtual) {
      const group = groupedLines.find(group => group.changeIndex === index);
      if (group) {
        const top = Math.max(0, headerHeight + rowOffsets[group.startIndex] - pane.clientHeight / 3);
        pane.scrollTop = top;
        setViewport({ top, height: pane.clientHeight || 600 });
      }
      return;
    }
    const target = pane?.querySelector(`[data-change-group="${index}"]`);
    if (pane && target) {
      // Leave some context above the change instead of pinning it to the top edge
      pane.scrollTop += target.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientHeight / 3;
    }
  }, [activePane, virtual, groupedLines, headerHeight, rowOffsets]);

  const goToChange = useCallback((direction: 1 | -1) => {
    if (changeCount === 0) return;

    showChange(activeChange === -1 && direction === -1
      ? changeCount - 1
      : (activeChange + direction + changeCount) % changeCount);
  }, [activeChange, changeCount, showChange]);

  // Where each change sits in the scrollable area. Measured from the DOM because collapsed and wrapped
  // lines make row heights uneven, so line numbers alone can't say where a change ends up.
  const [markers, setMarkers] = useState<ChangeMarker[]>([]);

  useLayoutEffect(() => {
    const pane = activePane();
    if (!pane) return;
    let request = 0;
    let disposed = false;

    const measure = () => {
      const paneTop = pane.getBoundingClientRect().top;
      const positions = groupedLines.flatMap(group => {
        if (virtual) {
          if (group.changeIndex === undefined) return [];
          return [{ types: group.lines.map(line => line.type), top: headerHeight + rowOffsets[group.startIndex], height: rowOffsets[group.startIndex + group.lines.length] - rowOffsets[group.startIndex] }];
        }
        if (group.changeIndex === undefined) return [];
        const element = pane.querySelector(`[data-change-group="${group.changeIndex}"]`);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [{
          types: group.lines.map(line => line.type),
          top: rect.top - paneTop + pane.scrollTop,
          height: rect.height,
        }];
      });
      const current = ++request;
      const fallback = () => toMarkers(positions.map(({ types, ...position }) => ({
        ...position, kind: groupKind(types),
      })), pane.scrollHeight);
      if (!isTauri()) {
        setMarkers(fallback());
      } else {
        void invoke<ChangeMarker[]>('compute_markers_cmd', { groups: positions, scrollHeight: pane.scrollHeight })
          .catch(fallback)
          .then(result => { if (!disposed && current === request) setMarkers(result); });
      }
    };

    measure();
    // Wrapping depends on the width, so re-measure when the pane is resized
    if (typeof ResizeObserver === 'undefined') return () => { disposed = true; };
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    return () => { disposed = true; observer.disconnect(); };
  }, [activePane, groupedLines, expandedRanges, options.hideUnchangedLines, options.wrapLines, virtual, rowOffsets, headerHeight]);

  const renderLineContent = (line: DiffLine, language: string, side: 'original' | 'changed') => {
    const content = side === 'original' ? (line.originalContent ?? line.content) : line.content;
    
    if (line.charDiffs && line.charDiffs.length > 0) {
      // Render inline character/word diff
      return (
        <span className="inline-diff">
          {line.charDiffs
            // Each pane only shows its own side: the original never has added text, the changed side never has removed text
            .filter(charDiff => charDiff.type === 'equal' || charDiff.type === (side === 'original' ? 'removed' : 'added'))
            .map((charDiff, i) => (
            <span key={i} className={`char-diff char-diff-${charDiff.type}`}>
              {charDiff.value
                .replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/ /g, '\u00A0')
                .replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0')}
            </span>
          ))}
        </span>
      );
    }

    // Simple syntax highlighting
    return <span dangerouslySetInnerHTML={{ __html: highlighted(content, language) }} />;
  };

  const renderHighlightedCode = (content: string, language: string) => (
    <span dangerouslySetInnerHTML={{ __html: highlighted(content, language) }} />
  );

  // Both sides of a line share one row inside a single scroll container, so a line that wraps to
  // more rows on one side stretches the other side too instead of pushing the panes out of step
  const renderSideBySide = () => (
    <div
      ref={splitPaneRef}
      className="diff-side-by-side"
      onScroll={(e) => handleScroll(e, 'split')}
    >
      <div className="diff-sbs-header">
        <div className="diff-pane-header">Original</div>
        <div className="diff-pane-header">Changed</div>
      </div>
      {virtual && <div aria-hidden="true" style={{ height: rowOffsets[start] }} />}
      {visibleGroups.map((group, groupIndex) => {
        const collapsible = group.type === 'unchanged' && options.hideUnchangedLines;

        return (
          <div key={groupIndex} className="diff-line-group" data-change-group={group.changeIndex}>
            {collapsible && renderUnchangedToggle(group)}
            {(!collapsible || isExpanded(group.startIndex)) && group.lines.map((line, lineIndex) => (
              <div key={`${group.startIndex}-${lineIndex}`} className="diff-row">
                <div
                  className={`diff-line diff-side-left ${DIFF_TYPE_CLASSES[line.type]}`}
                  data-line-number={line.originalLineNumber}
                >
                  <span className="diff-line-number">{line.originalLineNumber ?? ''}</span>
                  <span className="diff-line-content">
                    {line.type === 'removed' || line.type === 'modified'
                      ? renderLineContent(line, originalLanguage, 'original')
                      : line.type === 'equal'
                        ? renderHighlightedCode(line.content, originalLanguage)
                        : null}
                  </span>
                  {canMerge && (line.type === 'added' || line.type === 'modified') && (
                    <button
                      className="merge-button merge-left"
                      onClick={() => onMergeChange?.(line, 'left')}
                      title="Merge this change to the right"
                      aria-label="Merge to right"
                    >
                      →
                    </button>
                  )}
                </div>
                <div
                  className={`diff-line diff-side-right ${DIFF_TYPE_CLASSES[line.type]}`}
                  data-line-number={line.changedLineNumber}
                >
                  <span className="diff-line-number">{line.changedLineNumber ?? ''}</span>
                  <span className="diff-line-content">
                    {line.type === 'added' || line.type === 'modified'
                      ? renderLineContent(line, changedLanguage, 'changed')
                      : line.type === 'equal'
                        ? renderHighlightedCode(line.content, changedLanguage)
                        : null}
                  </span>
                  {canMerge && (line.type === 'removed' || line.type === 'modified') && (
                    <button
                      className="merge-button merge-right"
                      onClick={() => onMergeChange?.(line, 'right')}
                      title="Merge this change to the left"
                      aria-label="Merge to left"
                    >
                      ←
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {virtual && <div aria-hidden="true" style={{ height: rowOffsets[lines.length] - rowOffsets[end] }} />}
    </div>
  );

  const renderUnified = () => (
    <div className="diff-unified">
      <div 
        ref={unifiedPaneRef}
        className="diff-pane-content"
        onScroll={(e) => handleScroll(e, 'unified')}
      >
        {virtual && <div aria-hidden="true" style={{ height: rowOffsets[start] }} />}
        {visibleGroups.map((group, groupIndex) => {
          const collapsible = group.type === 'unchanged' && options.hideUnchangedLines;
          
          return (
            <div key={groupIndex} className="diff-line-group" data-change-group={group.changeIndex}>
              {collapsible && renderUnchangedToggle(group)}
              {(!collapsible || isExpanded(group.startIndex)) && group.lines.map((line, lineIndex) => (
                <div
                  key={`${group.startIndex}-${lineIndex}`}
                  className={`diff-line unified ${DIFF_TYPE_CLASSES[line.type]}`}
                >
                  <span className="diff-line-number-left">{line.originalLineNumber ?? ''}</span>
                  <span className="diff-line-number-right">{line.changedLineNumber ?? ''}</span>
                  <span className="diff-line-content">
                    {line.type === 'removed' && (
                      <>
                        <span className="diff-prefix">-</span>
                        {renderLineContent(line, originalLanguage, 'original')}
                      </>
                    )}
                    {line.type === 'added' && (
                      <>
                        <span className="diff-prefix">+</span>
                        {renderLineContent(line, changedLanguage, 'changed')}
                      </>
                    )}
                    {line.type === 'modified' && (
                      <>
                        <span className="diff-prefix">-</span>
                        {renderLineContent(line, originalLanguage, 'original')}
                        <br />
                        <span className="diff-prefix">+</span>
                        {renderLineContent(line, changedLanguage, 'changed')}
                      </>
                    )}
                    {line.type === 'equal' && (
                      <>
                        <span className="diff-prefix"> </span>
                        {renderHighlightedCode(line.content, originalLanguage)}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        {virtual && <div aria-hidden="true" style={{ height: rowOffsets[lines.length] - rowOffsets[end] }} />}
      </div>
    </div>
  );

  return (
    <div className={`diff-view${options.wrapLines ? ' diff-view-wrap' : ''}${virtual ? ' diff-view-virtual' : ''}`}>
      <div className="diff-nav">
        {lines.length > 500 && wideViewport && !options.wrapLines && !options.hideUnchangedLines && <label><input type="checkbox" checked={showAll} onChange={event => setShowAll(event.target.checked)} /> Show all lines for search and accessibility</label>}
        {changeCount === 0 ? (
          <span className="diff-nav-status">No differences</span>
        ) : (
          <>
            <button className="toolbar-btn" onClick={() => goToChange(-1)} aria-label="Previous change" title="Previous change">
              ↑ Prev
            </button>
            <button className="toolbar-btn" onClick={() => goToChange(1)} aria-label="Next change" title="Next change">
              ↓ Next
            </button>
            <span className="diff-nav-status">
              {activeChange === -1 ? `${changeCount} ${changeCount === 1 ? 'change' : 'changes'}` : `${activeChange + 1} of ${changeCount}`}
            </span>
          </>
        )}
      </div>
      <div className="diff-body">
        {options.viewMode === 'unified' ? renderUnified() : renderSideBySide()}
        {markers.length > 0 && (
          <div className="diff-ruler" role="group" aria-label="Changes in this diff">
            {markers.map(marker => (
              <button
                key={marker.index}
                className={`diff-marker diff-marker-${marker.kind}${marker.index === activeChange ? ' diff-marker-active' : ''}`}
                style={{ top: `${marker.top * 100}%`, height: `${marker.height * 100}%` }}
                onClick={() => showChange(marker.index)}
                aria-label={`Go to change ${marker.index + 1} of ${changeCount}`}
                title={`Change ${marker.index + 1} of ${changeCount}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
