import type { HistorySide } from '../types/history';
import { getDesktopAPI } from '../platform/desktop';

const MAX_PREVIEW_LENGTH = 40;

export const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath;

/** "a.ts — src": the file name plus the folder it's in, so same-named files can be told apart */
export function describeRecentFile(filePath: string): string {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  const name = parts[parts.length - 1] ?? filePath;
  const folder = parts[parts.length - 2];
  return folder ? `${name} — ${folder}` : name;
}

/** The file name, or for pasted text the first line with something on it */
export function describeSide(side: HistorySide): string {
  if (side.path) return fileName(side.path);

  const firstLine = side.content.split('\n').map(line => line.trim()).find(Boolean);
  if (!firstLine) return '(empty)';
  return firstLine.length > MAX_PREVIEW_LENGTH ? `${firstLine.slice(0, MAX_PREVIEW_LENGTH)}…` : firstLine;
}

export async function describeRecentFileDesktop(path: string): Promise<string> {
  const api = getDesktopAPI();
  return api ? api.describeRecentFile(path) : describeRecentFile(path);
}

export async function describeSideDesktop(side: HistorySide): Promise<string> {
  const api = getDesktopAPI();
  return api ? api.describeHistorySide(side) : describeSide(side);
}
