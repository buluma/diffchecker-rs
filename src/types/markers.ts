import type { DiffType } from './diff';

export interface MeasuredGroup {
  types: DiffType[];
  top: number;
  height: number;
}

export interface ChangeMarker {
  index: number;
  kind: 'added' | 'removed' | 'modified';
  top: number;
  height: number;
}
