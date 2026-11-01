export type DiffType = 'equal' | 'added' | 'removed' | 'modified';

export interface DiffLine {
  type: DiffType;
  originalLineNumber: number | null;
  changedLineNumber: number | null;
  content: string;
  originalContent?: string;
  changedContent?: string;
  charDiffs?: CharDiff[];
}

export interface CharDiff {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export interface DiffResult {
  lines: DiffLine[];
  warning?: string;
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

export interface DiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  hideUnchangedLines: boolean;
  customIgnoreRules: string[];
  precision: 'smart' | 'word' | 'character';
  viewMode: 'side-by-side' | 'unified';
  wrapLines: boolean;
}

export interface FileContent {
  path: string | null;
  content: string;
  language: string;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  hideUnchangedLines: false,
  customIgnoreRules: [],
  precision: 'smart',
  viewMode: 'side-by-side',
  wrapLines: false,
};
