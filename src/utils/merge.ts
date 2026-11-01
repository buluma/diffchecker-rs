import type { DiffLine } from '../types/diff';

export type MergeChoice = 'left' | 'right';

/** Builds merged output from the complete diff, preserving unchanged lines. */
export function buildMergedContent(
  lines: DiffLine[],
  choices: Record<number, MergeChoice> = {},
): string {
  return lines.flatMap((line, index) => {
    const choice = choices[index];

    if (line.type === 'equal') return [line.content];
    if (line.type === 'added') return choice === 'left' ? [] : [line.content];
    if (line.type === 'removed') {
      return choice === 'right' ? [line.originalContent ?? line.content] : [];
    }

    return [choice === 'left' ? line.originalContent ?? line.content : line.content];
  }).join('\n');
}
