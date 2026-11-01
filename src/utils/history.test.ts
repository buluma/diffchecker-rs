import { describe, expect, it } from 'vitest';
import { describeRecentFile, describeSide, fileName } from './history';

describe('fileName', () => {
  it('takes the last segment of posix and windows paths', () => {
    expect(fileName('/a/b/c.txt')).toBe('c.txt');
    expect(fileName('C:\\a\\b\\c.txt')).toBe('c.txt');
    expect(fileName('c.txt')).toBe('c.txt');
  });
});

describe('describeRecentFile', () => {
  it('shows the name and the folder it lives in', () => {
    expect(describeRecentFile('/Users/me/project/src/a.ts')).toBe('a.ts — src');
  });

  it('shows just the name when there is no folder', () => {
    expect(describeRecentFile('a.ts')).toBe('a.ts');
  });
});

describe('describeSide', () => {
  it('uses the file name when there is a path', () => {
    expect(describeSide({ path: '/x/a.txt', content: 'hello' })).toBe('a.txt');
  });

  it('uses the first non-empty line of pasted text', () => {
    expect(describeSide({ path: null, content: '\n  \nfirst line\nsecond' })).toBe('first line');
  });

  it('shortens long lines', () => {
    const described = describeSide({ path: null, content: 'x'.repeat(100) });

    expect(described).toHaveLength(41);
    expect(described.endsWith('…')).toBe(true);
  });

  it('says so when there is no text', () => {
    expect(describeSide({ path: null, content: '' })).toBe('(empty)');
  });
});
