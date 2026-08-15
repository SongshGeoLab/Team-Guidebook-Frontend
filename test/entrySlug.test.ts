import { describe, expect, it } from 'vitest';
import { entrySlug, slugify } from '../src/utils/entrySlug';

describe('slugify', () => {
  it('strips the .md extension', () => {
    expect(slugify('boyu-wang.md')).toBe('boyu-wang');
  });

  it('turns spaces into hyphens instead of leaving them in an href', () => {
    // The bug this function exists for: ids like `Boyu Wang.md` became
    // `/zh/people/Boyu Wang.md` — a bare space in a URL.
    expect(slugify('Boyu Wang.md')).toBe('boyu-wang');
  });

  it('keeps CJK characters rather than dropping them to an empty slug', () => {
    expect(slugify('词条/Git')).toBe('词条/git');
    expect(slugify('宋爽')).toBe('宋爽');
  });

  it('preserves path separators but slugifies each segment', () => {
    expect(slugify('专栏/Python4Science/Week1 导论')).toBe('专栏/python4science/week1-导论');
  });

  it('collapses runs of punctuation into a single hyphen and trims them', () => {
    expect(slugify('--a...b--')).toBe('a-b');
  });

  it('drops empty segments instead of emitting a double slash', () => {
    expect(slugify('a//b')).toBe('a/b');
  });
});

describe('entrySlug', () => {
  it('prefers the frontmatter id over the filename', () => {
    expect(entrySlug({ id: '通讯录/Ada Lovelace.md', data: { id: 'ada-lovelace' } })).toBe(
      'ada-lovelace',
    );
  });

  it('falls back to the filename when no id is declared', () => {
    expect(entrySlug({ id: 'Ada Lovelace.md', data: {} })).toBe('ada-lovelace');
  });

  it('treats a blank id as absent rather than producing an empty slug', () => {
    expect(entrySlug({ id: 'ada-lovelace.md', data: { id: '   ' } })).toBe('ada-lovelace');
  });
});
