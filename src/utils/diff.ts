import type { DiffLine, DiffResult, DiffOptions, CharDiff } from '../types/diff';
import { MAX_INPUT_LINES, getInputLimitError } from './limits';

/**
 * Computes the Longest Common Subsequence (LCS) between two arrays
 * Returns the indices of matching elements in both arrays
 */
function computeLCS<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean): [number, number][] {
  const m = a.length;
  const n = b.length;
  
  // DP table for LCS length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (equals(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: [number, number][] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (equals(a[i - 1], b[j - 1])) {
      lcs.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

const MAX_MYERS_TRACE_CELLS = 200_000;
const MAX_MYERS_WORK = 2_000_000;

export class DiffLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffLimitError';
  }
}

class DiffComplexityError extends Error {}

/** Myers diff keeps common large inputs linear in input size and bounds pathological edit distance. */
function computeMyersMatches<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean): [number, number][] {
  const maxDistance = a.length + b.length;
  let frontier = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  let work = 0;

  for (let distance = 0; distance <= maxDistance; distance++) {
    if ((distance + 1) * (distance + 1) > MAX_MYERS_TRACE_CELLS) {
      throw new DiffComplexityError('Edit trace limit reached');
    }

    const previous = frontier;
    frontier = new Map(previous);

    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      if (++work > MAX_MYERS_WORK) {
        throw new DiffComplexityError('Comparison work limit reached');
      }

      const fromDown = diagonal === -distance || (
        diagonal !== distance && (previous.get(diagonal - 1) ?? -1) < (previous.get(diagonal + 1) ?? -1)
      );
      let x = fromDown
        ? previous.get(diagonal + 1) ?? 0
        : (previous.get(diagonal - 1) ?? 0) + 1;
      let y = x - diagonal;

      while (x < a.length && y < b.length && equals(a[x], b[y])) {
        x++;
        y++;
        if (++work > MAX_MYERS_WORK) {
          throw new DiffComplexityError('Comparison work limit reached');
        }
      }

      frontier.set(diagonal, x);
      if (x >= a.length && y >= b.length) {
        trace.push(frontier);
        return backtrackMyers(trace, a, b, equals);
      }
    }

    trace.push(frontier);
  }

  return [];
}

function backtrackMyers<T>(
  trace: Map<number, number>[],
  a: T[],
  b: T[],
  equals: (x: T, y: T) => boolean,
): [number, number][] {
  let x = a.length;
  let y = b.length;
  const matches: [number, number][] = [];

  for (let distance = trace.length - 1; distance > 0; distance--) {
    const previous = trace[distance - 1];
    const diagonal = x - y;
    const fromDown = diagonal === -distance || (
      diagonal !== distance && (previous.get(diagonal - 1) ?? -1) < (previous.get(diagonal + 1) ?? -1)
    );
    const previousDiagonal = fromDown ? diagonal + 1 : diagonal - 1;
    const previousX = previous.get(previousDiagonal) ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      matches.push([--x, --y]);
    }

    if (x === previousX) y--;
    else x--;
  }

  while (x > 0 && y > 0 && equals(a[x - 1], b[y - 1])) {
    matches.push([--x, --y]);
  }

  return matches.reverse();
}

/**
 * Normalizes a line based on diff options
 */
function normalizeLine(line: string, options: DiffOptions): string {
  let normalized = line;
  
  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  
  for (const rule of options.customIgnoreRules) {
    if (rule) {
      const escaped = rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      normalized = normalized.replace(new RegExp(escaped, 'g'), '');
    }
  }
  
  return normalized;
}

/**
 * Computes character-level diff between two strings
 */
function computeCharDiff(original: string, changed: string, options: DiffOptions): CharDiff[] {
  const origNormalized = options.ignoreCase ? original.toLowerCase() : original;
  const changedNormalized = options.ignoreCase ? changed.toLowerCase() : changed;
  
  // Use LCS at character level
  const lcs = computeLCS(
    origNormalized.split(''),
    changedNormalized.split(''),
    (a, b) => a === b
  );
  
  const result: CharDiff[] = [];
  let origIdx = 0;
  let changedIdx = 0;
  
  for (const [origPos, changedPos] of lcs) {
    // Added characters
    while (changedIdx < changedPos) {
      result.push({ type: 'added', value: changed[changedIdx] });
      changedIdx++;
    }
    // Removed characters
    while (origIdx < origPos) {
      result.push({ type: 'removed', value: original[origIdx] });
      origIdx++;
    }
    // Equal characters
    while (origIdx <= origPos && changedIdx <= changedPos) {
      result.push({ type: 'equal', value: original[origIdx] });
      origIdx++;
      changedIdx++;
    }
  }
  
  // Remaining added
  while (changedIdx < changed.length) {
    result.push({ type: 'added', value: changed[changedIdx] });
    changedIdx++;
  }
  
  // Remaining removed
  while (origIdx < original.length) {
    result.push({ type: 'removed', value: original[origIdx] });
    origIdx++;
  }
  
  return result;
}

/**
 * Computes word-level diff between two strings
 */
function computeWordDiff(original: string, changed: string, options: DiffOptions): CharDiff[] {
  const origWords = original.split(/(\s+)/);
  const changedWords = changed.split(/(\s+)/);
  
  const origNormalized = origWords.map(w => options.ignoreCase ? w.toLowerCase() : w);
  const changedNormalized = changedWords.map(w => options.ignoreCase ? w.toLowerCase() : w);
  
  const lcs = computeLCS(origNormalized, changedNormalized, (a, b) => a === b);
  
  const result: CharDiff[] = [];
  let origIdx = 0;
  let changedIdx = 0;
  
  for (const [origPos, changedPos] of lcs) {
    while (changedIdx < changedPos) {
      result.push({ type: 'added', value: changedWords[changedIdx] });
      changedIdx++;
    }
    while (origIdx < origPos) {
      result.push({ type: 'removed', value: origWords[origIdx] });
      origIdx++;
    }
    while (origIdx <= origPos && changedIdx <= changedPos) {
      result.push({ type: 'equal', value: origWords[origIdx] });
      origIdx++;
      changedIdx++;
    }
  }
  
  while (changedIdx < changedWords.length) {
    result.push({ type: 'added', value: changedWords[changedIdx] });
    changedIdx++;
  }
  
  while (origIdx < origWords.length) {
    result.push({ type: 'removed', value: origWords[origIdx] });
    origIdx++;
  }
  
  return result;
}

/**
 * Determines the best precision for a specific change
 */
function determinePrecision(original: string, changed: string, options: DiffOptions): 'word' | 'character' {
  if (options.precision !== 'smart') {
    return options.precision;
  }
  
  // Smart: use character level for short strings or strings with similar structure
  // (like IDs, hashes, numbers), word level for prose
  const avgLength = (original.length + changed.length) / 2;
  const hasNumbers = /\d/.test(original) || /\d/.test(changed);
  const hasSpecialChars = /[^\w\s]/.test(original) || /[^\w\s]/.test(changed);
  
  if (avgLength < 50 || hasNumbers || hasSpecialChars) {
    return 'character';
  }
  
  return 'word';
}

// Two differing lines are only shown as one modified line when they share at least this much text
const MIN_LINE_SIMILARITY = 0.5;

// Aligning a gap by similarity compares every removed line with every added line. Past this many
// comparisons, fall back to comparing lines at the same position only.
const MAX_GAP_COMPARISONS = 100_000;

function bigramCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.slice(i, i + 2);
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
  }
  return counts;
}

interface LineProfile {
  text: string;
  bigrams: Map<string, number>;
}

// Built once per line so comparing every removed line against every added line stays cheap
const profileLine = (text: string): LineProfile => ({ text, bigrams: bigramCounts(text) });

/**
 * Whether two differing lines are close enough to show as one modified line (Dice coefficient
 * over character bigrams). Lines that only differ in surrounding whitespace always count.
 */
function areSimilarLines(a: LineProfile, b: LineProfile): boolean {
  if (a.text.trim() === b.text.trim()) return true;

  const total = Math.max(a.text.length - 1, 0) + Math.max(b.text.length - 1, 0);
  if (total === 0) return false;

  let shared = 0;
  for (const [bigram, count] of a.bigrams) {
    shared += Math.min(count, b.bigrams.get(bigram) ?? 0);
  }

  return (2 * shared) / total >= MIN_LINE_SIMILARITY;
}

// Inline diffing builds an LCS table of roughly (chars in original x chars in changed) cells,
// so very long lines (minified JSON, bundles) would stall the UI. Past this size a modified
// line is still reported, just without inline highlighting.
const MAX_INLINE_DIFF_CELLS = 4_000_000;

/**
 * Main diff function - compares two texts and returns structured diff result
 */
export function computeDiff(originalText: string, changedText: string, options: DiffOptions): DiffResult {
  const inputError = getInputLimitError(originalText) ?? getInputLimitError(changedText);
  if (inputError) throw new DiffLimitError(inputError);

  const originalLines = originalText.split('\n');
  const changedLines = changedText.split('\n');
  if (originalLines.length > MAX_INPUT_LINES || changedLines.length > MAX_INPUT_LINES) {
    throw new DiffLimitError(`Each input is limited to ${MAX_INPUT_LINES.toLocaleString()} lines.`);
  }
  
  const origNormalized = originalLines.map(line => normalizeLine(line, options));
  const changedNormalized = changedLines.map(line => normalizeLine(line, options));
  
  // Compute LCS at line level
  let lcs: [number, number][];
  let warning: string | undefined;
  try {
    lcs = computeMyersMatches(origNormalized, changedNormalized, (a, b) => a === b);
  } catch (error) {
    if (!(error instanceof DiffComplexityError)) throw error;
    // Let the existing bounded positional gap alignment give a useful result without a huge trace.
    lcs = [];
    warning = 'Used simplified alignment because the inputs differ too extensively for a precise diff.';
  }
  
  const lines: DiffLine[] = [];
  let origIdx = 0;
  let changedIdx = 0;
  let origLineNum = 1;
  let changedLineNum = 1;
  
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  
  const buildModifiedLine = (
    origContent: string,
    changedContent: string,
    originalLineNumber: number,
    changedLineNumber: number,
  ): DiffLine => {
    const line: DiffLine = {
      type: 'modified',
      originalLineNumber,
      changedLineNumber,
      content: changedContent,
      originalContent: origContent,
      changedContent,
    };

    if (origContent.length * changedContent.length <= MAX_INLINE_DIFF_CELLS) {
      const precision = determinePrecision(origContent, changedContent, options);
      line.charDiffs = precision === 'character'
        ? computeCharDiff(origContent, changedContent, options)
        : computeWordDiff(origContent, changedContent, options);
    }

    return line;
  };

  // Picks which lines in a gap between two matches to show as modified pairs: an in-order
  // alignment of similar lines, so unrelated lines stay plain removed/added
  const alignGap = (origEnd: number, changedEnd: number): [number, number][] => {
    const removed = origNormalized.slice(origIdx, origEnd).map(profileLine);
    const added = changedNormalized.slice(changedIdx, changedEnd).map(profileLine);

    if (removed.length * added.length <= MAX_GAP_COMPARISONS) {
      return computeLCS(removed, added, areSimilarLines)
        .map(([removedPos, addedPos]) => [origIdx + removedPos, changedIdx + addedPos]);
    }

    const pairs: [number, number][] = [];
    for (let offset = 0; offset < Math.min(removed.length, added.length); offset++) {
      if (areSimilarLines(removed[offset], added[offset])) {
        pairs.push([origIdx + offset, changedIdx + offset]);
      }
    }
    return pairs;
  };

  const emitRemovedUntil = (end: number) => {
    while (origIdx < end) {
      lines.push({
        type: 'removed',
        originalLineNumber: origLineNum,
        changedLineNumber: null,
        content: originalLines[origIdx],
      });
      stats.removed++;
      origIdx++;
      origLineNum++;
    }
  };

  const emitAddedUntil = (end: number) => {
    while (changedIdx < end) {
      lines.push({
        type: 'added',
        originalLineNumber: null,
        changedLineNumber: changedLineNum,
        content: changedLines[changedIdx],
      });
      stats.added++;
      changedIdx++;
      changedLineNum++;
    }
  };

  // Lines between two matches exist on only one side or were replaced. Similar ones become a
  // modified row; the rest are emitted removed-first, then added.
  const emitGap = (origEnd: number, changedEnd: number) => {
    for (const [origPair, changedPair] of alignGap(origEnd, changedEnd)) {
      emitRemovedUntil(origPair);
      emitAddedUntil(changedPair);

      lines.push(buildModifiedLine(originalLines[origIdx], changedLines[changedIdx], origLineNum, changedLineNum));
      stats.modified++;
      origIdx++;
      changedIdx++;
      origLineNum++;
      changedLineNum++;
    }

    emitRemovedUntil(origEnd);
    emitAddedUntil(changedEnd);
  };

  for (const [origPos, changedPos] of lcs) {
    emitGap(origPos, changedPos);
    
    // The LCS only matches lines that are equal after normalization
    lines.push({
      type: 'equal',
      originalLineNumber: origLineNum,
      changedLineNumber: changedLineNum,
      content: originalLines[origIdx],
    });
    stats.unchanged++;
    origIdx++;
    changedIdx++;
    origLineNum++;
    changedLineNum++;
  }
  
  emitGap(originalLines.length, changedLines.length);
  
  return warning ? { lines, stats, warning } : { lines, stats };
}

/**
 * Filters diff lines based on options (e.g., hide unchanged)
 */
export function filterDiffLines(lines: DiffLine[], options: DiffOptions): DiffLine[] {
  if (!options.hideUnchangedLines) {
    return lines;
  }
  
  const CONTEXT = 3;
  const visibleIndexes = new Set<number>();

  lines.forEach((line, index) => {
    if (line.type !== 'equal') {
      for (let contextIndex = Math.max(0, index - CONTEXT);
        contextIndex <= Math.min(lines.length - 1, index + CONTEXT);
        contextIndex++) {
        visibleIndexes.add(contextIndex);
      }
    }
  });

  return lines.filter((_line, index) => visibleIndexes.has(index));
}
