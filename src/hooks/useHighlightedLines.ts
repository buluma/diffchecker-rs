import { useEffect, useMemo, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { runBrowser } from '../platform/browser';

const EMPTY_HIGHLIGHTS = new Map<string, string>();

/** Batch syntax highlighting and discard results for older content. */
export function useHighlightedLines(lines: string[], language: string): Map<string, string> {
  const key = JSON.stringify(lines);
  const uniqueLines = useMemo(() => [...new Set(JSON.parse(key) as string[])], [key]);
  const [result, setResult] = useState<{ key: string; language: string; values: Map<string, string> }>();

  useEffect(() => {
    if (language === 'plaintext' || uniqueLines.length === 0) return;
    let cancelled = false;
    const highlights = isTauri()
      ? invoke<string[]>('highlight_fragments_cmd', { lines: uniqueLines, language })
      : runBrowser('highlight', uniqueLines, language);
    void highlights.then(values => {
        if (!cancelled) setResult({ key, language, values: new Map(uniqueLines.map((line, i) => [line, values[i]])) });
      }).catch(() => {
        // The renderer can still display the original text without highlighting.
        if (!cancelled) setResult(undefined);
      });
    return () => { cancelled = true; };
  }, [key, language, uniqueLines]);

  return result?.key === key && result.language === language ? result.values : EMPTY_HIGHLIGHTS;
}
