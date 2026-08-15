import { describe, expect, it, vi } from 'vitest';
import { extractBibEntries, parseBibEntry } from '../src/content/loaders/publicationsLoader';

/**
 * `extractBibEntries` is a hand-rolled brace-matching scanner and `parseBibEntry`
 * is the field mapping over citation-js output. Both have shipped silent
 * data-corruption bugs (see `fe09584 fix(publications): stop the loader silently
 * corrupting entries`). Every case below pins a behaviour that was previously
 * verified only by looking at the built site.
 */

describe('extractBibEntries', () => {
  it('keeps the verbatim entry text, which is what the Copy BibTeX button serves', () => {
    const bib = `@article{lovelace2024,
  title = {A Paper},
  year = {2024}
}`;
    expect(extractBibEntries(bib)).toEqual({ lovelace2024: bib });
  });

  it('separates multiple entries in one file', () => {
    const bib = `@article{a2024, title = {A}, year = {2024}}

@misc{b2023, title = {B}, year = {2023}}`;
    const entries = extractBibEntries(bib);
    expect(Object.keys(entries)).toEqual(['a2024', 'b2023']);
    expect(entries.a2024).toBe('@article{a2024, title = {A}, year = {2024}}');
    expect(entries.b2023).toBe('@misc{b2023, title = {B}, year = {2023}}');
  });

  it('does not truncate an entry at a nested closing brace', () => {
    // The corruption mode: `{\"O}` inside a title ends the entry early, and the
    // rest of the fields vanish with no error.
    const bib = `@article{umlaut2024,
  title = {Effects of {CO$_2$} on {\\"O}sterreich},
  year = {2024}
}`;
    const entries = extractBibEntries(bib);
    expect(entries.umlaut2024).toContain('year = {2024}');
    expect(entries.umlaut2024.endsWith('}')).toBe(true);
  });

  it('ignores an unterminated final entry rather than emitting a mangled one', () => {
    const bib = `@article{good2024, title = {Good}, year = {2024}}

@article{broken2024, title = {Never closed`;
    const entries = extractBibEntries(bib);
    expect(entries).toHaveProperty('good2024');
    expect(entries).not.toHaveProperty('broken2024');
  });

  it('returns an empty map for a file with no entries', () => {
    expect(extractBibEntries('% just a comment\n')).toEqual({});
  });
});

describe('parseBibEntry', () => {
  const base = { title: 'A Fixture Paper', author: [{ given: 'Ada', family: 'Lovelace' }] };

  it('joins structured author objects into display names', () => {
    const result = parseBibEntry(
      {
        ...base,
        author: [
          { given: 'Ada', family: 'Lovelace' },
          { given: 'Charles', family: 'Babbage' },
        ],
      },
      'k',
    );
    expect(result?.authors).toEqual(['Ada Lovelace', 'Charles Babbage']);
  });

  it('splits an "and"-joined author string', () => {
    const result = parseBibEntry({ ...base, author: 'Lovelace, Ada and Babbage, Charles' }, 'k');
    expect(result?.authors).toEqual(['Lovelace, Ada', 'Babbage, Charles']);
  });

  it('drops an entry with no title instead of rendering a blank citation', () => {
    expect(parseBibEntry({ author: 'Someone' }, 'k')).toBeNull();
  });

  it('leaves year undefined rather than defaulting to the current year', () => {
    // The regression: an unparseable date became a brand-new publication at the
    // top of the list, with no log and nothing for a reader to notice.
    const result = parseBibEntry(base, 'turing_undated');
    expect(result?.year).toBeUndefined();
    expect(result?.date).toBeUndefined();
  });

  it('builds the date at UTC midnight so the year survives serialisation in UTC+8', () => {
    const result = parseBibEntry({ ...base, year: 2024 }, 'k');
    expect(result?.date?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('prefers citation-js issued date-parts over a bare year field', () => {
    const result = parseBibEntry(
      { ...base, issued: { 'date-parts': [[2019, 5]] }, year: 1999 },
      'k',
    );
    expect(result?.year).toBe(2019);
  });

  it('reads tags from `keyword` (singular), which is what citation-js emits', () => {
    // Reading `keywords` meant tags were ALWAYS empty and the topic filter was
    // permanently blank — a symptom once misattributed to the language filter.
    const result = parseBibEntry({ ...base, keyword: 'Hydrology, Modelling' }, 'k');
    expect(result?.tags).toEqual(['Hydrology', 'Modelling']);
  });

  it('still accepts plural `keywords`', () => {
    expect(parseBibEntry({ ...base, keywords: 'Hydrology; GIS' }, 'k')?.tags).toEqual([
      'Hydrology',
      'GIS',
    ]);
  });

  it('drops language names, which Zotero writes onto every record', () => {
    const result = parseBibEntry({ ...base, keyword: 'English, 中文, Hydrology' }, 'k');
    expect(result?.tags).toEqual(['Hydrology']);
  });

  it('prefixes a bare DOI and leaves a URL-shaped one alone', () => {
    expect(parseBibEntry({ ...base, DOI: '10.1038/x' }, 'k')?.doi).toBe(
      'https://doi.org/10.1038/x',
    );
    expect(parseBibEntry({ ...base, DOI: 'https://doi.org/10.1038/x' }, 'k')?.doi).toBe(
      'https://doi.org/10.1038/x',
    );
  });

  it('rejects a Zotero local file path and says so instead of dropping it silently', () => {
    const warn = vi.fn();
    const bibtex =
      '@misc{k,\n  file = {Full Text:/Users/someone/Zotero/paper.pdf:application/pdf}\n}';
    const result = parseBibEntry(base, 'k', bibtex, warn);
    expect(result?.pdf).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('ignoring unusable pdf/file value');
  });

  it('accepts a servable pdf value without warning', () => {
    const warn = vi.fn();
    const result = parseBibEntry(base, 'k', '@misc{k,\n  file = {/attachments/x.pdf}\n}', warn);
    expect(result?.pdf).toBe('/attachments/x.pdf');
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back through container-title, journal, booktitle, publisher for the venue', () => {
    expect(parseBibEntry({ ...base, booktitle: 'Proc. of X' }, 'k')?.venue).toBe('Proc. of X');
    expect(parseBibEntry({ ...base, journal: 'Nature', 'container-title': 'CT' }, 'k')?.venue).toBe(
      'CT',
    );
  });
});
