import { useEffect, useMemo, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { highlightCode } from '../utils/highlight';

/** Batch desktop highlighting and discard results for older content. */
export function useHighlightedLines(lines: string[], language: string): Map<string, string> {
  const key = JSON.stringify(lines);
  const uniqueLines = useMemo(() => [...new Set(JSON.parse(key) as string[])], [key]);
  const [result, setResult] = useState<{ key: string; language: string; values: Map<string, string> }>();

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void invoke<string[]>('highlight_fragments_cmd', { lines: uniqueLines, language })
      .then(values => {
        if (!cancelled) setResult({ key, language, values: new Map(uniqueLines.map((line, i) => [line, values[i]])) });
      }).catch(() => {
        if (!cancelled) setResult({ key, language, values: new Map(uniqueLines.map(line => [line, highlightCode(line || ' ', language)])) });
      });
    return () => { cancelled = true; };
  }, [key, language, uniqueLines]);

  return useMemo(() => {
    if (isTauri() && result?.key === key && result.language === language) return result.values;
    return new Map(uniqueLines.map(line => [line, highlightCode(line || ' ', language)]));
  }, [key, language, result, uniqueLines]);
}
