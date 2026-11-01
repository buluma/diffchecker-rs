import type { DiffType } from '../types/diff';

export type MarkerKind = 'added' | 'removed' | 'modified';

/** A changed group's place in the scrollable area, in pixels */
export interface GroupPosition {
  kind: MarkerKind;
  top: number;
  height: number;
}

/** Where a change sits in the scrollable area, as fractions (0 to 1) of its total height */
export interface ChangeMarker {
  index: number;
  kind: MarkerKind;
  top: number;
  height: number;
}

export function groupKind(types: DiffType[]): MarkerKind {
  if (types.every(type => type === 'added')) return 'added';
  if (types.every(type => type === 'removed')) return 'removed';
  return 'modified';
}

export function toMarkers(groups: GroupPosition[], scrollHeight: number): ChangeMarker[] {
  if (scrollHeight <= 0) return [];
  return groups.map((group, index) => ({
    index,
    kind: group.kind,
    top: group.top / scrollHeight,
    height: group.height / scrollHeight,
  }));
}
