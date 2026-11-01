import { describe, expect, it } from 'vitest';
import { groupKind, toMarkers } from './markers';

describe('groupKind', () => {
  it('is added or removed when the group only has one of them', () => {
    expect(groupKind(['added', 'added'])).toBe('added');
    expect(groupKind(['removed'])).toBe('removed');
  });

  it('is modified for modified lines or a mix of added and removed', () => {
    expect(groupKind(['modified'])).toBe('modified');
    expect(groupKind(['removed', 'added'])).toBe('modified');
    expect(groupKind(['added', 'modified'])).toBe('modified');
  });
});

describe('toMarkers', () => {
  it('turns pixel positions into fractions of the scrollable height', () => {
    expect(toMarkers([{ kind: 'added', top: 100, height: 50 }], 1000)).toEqual([
      { index: 0, kind: 'added', top: 0.1, height: 0.05 },
    ]);
  });

  it('numbers the markers in order', () => {
    const markers = toMarkers([
      { kind: 'added', top: 0, height: 20 },
      { kind: 'removed', top: 500, height: 20 },
    ], 1000);

    expect(markers.map(marker => marker.index)).toEqual([0, 1]);
  });

  it('gives nothing when there is no scrollable height yet', () => {
    expect(toMarkers([{ kind: 'added', top: 0, height: 20 }], 0)).toEqual([]);
  });
});
