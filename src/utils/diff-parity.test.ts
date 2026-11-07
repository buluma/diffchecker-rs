import { describe, expect, it } from 'vitest';
import fixtureData from './diff-parity-fixtures.json';
import { computeDiff } from './diff';
import { DEFAULT_DIFF_OPTIONS } from '../types/diff';

const fixtures = fixtureData as Array<{
  name: string; original: string; changed: string; types: string[];
  stats: { added: number; removed: number; modified: number; unchanged: number };
  ignoreRules?: string[]; ignoreCase?: boolean; ignoreWhitespace?: boolean;
}>;

describe('shared desktop and browser diff fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const result = computeDiff(fixture.original, fixture.changed, {
        ...DEFAULT_DIFF_OPTIONS,
        customIgnoreRules: fixture.ignoreRules ?? [],
        ignoreCase: fixture.ignoreCase ?? false,
        ignoreWhitespace: fixture.ignoreWhitespace ?? false,
      });
      expect(result.lines.map(line => line.type)).toEqual(fixture.types);
      expect(result.stats).toEqual(fixture.stats);
    });
  }
});
