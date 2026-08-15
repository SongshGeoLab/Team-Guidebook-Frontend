import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inferPublicationType, loadSidecars } from '../src/content/loaders/publicationsLoader';

describe('inferPublicationType', () => {
  it('maps the BibTeX entry types the vault uses', () => {
    expect(inferPublicationType('@article{k, title={T}}')).toBe('journal');
    expect(inferPublicationType('@inproceedings{k,}')).toBe('conference');
    expect(inferPublicationType('@incollection{k,}')).toBe('chapter');
    expect(inferPublicationType('@book{k,}')).toBe('book');
    expect(inferPublicationType('@phdthesis{k,}')).toBe('thesis');
  });

  it('treats @misc as a preprint, which is what Zotero writes for one', () => {
    // The distinction a reader most needs: peer-reviewed or not.
    expect(inferPublicationType('@misc{k,}')).toBe('preprint');
  });

  it('is case-insensitive and tolerates leading whitespace', () => {
    expect(inferPublicationType('\n  @ARTICLE{k,}')).toBe('journal');
  });

  it('falls back to `other` for an unknown or missing type', () => {
    expect(inferPublicationType('@weirdtype{k,}')).toBe('other');
    expect(inferPublicationType(undefined)).toBe('other');
    expect(inferPublicationType('')).toBe('other');
  });
});

describe('loadSidecars', () => {
  /** Write a throwaway 精选/ directory and hand back its path. */
  function withSidecars(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecars-'));
    for (const [name, body] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), body, 'utf-8');
    }
    return dir;
  }

  it('joins a sidecar to its entry by citation key', () => {
    const dir = withSidecars({
      'zeng2023.md': '---\nbib_key: zeng2023\nhighlight: 首次量化\n---\nbody',
    });
    const sidecars = loadSidecars(dir, new Set(['zeng2023']));
    expect(sidecars.get('zeng2023')?.highlight).toBe('首次量化');
  });

  it('defaults the key to the filename, so it is not written twice', () => {
    const dir = withSidecars({ 'zeng2023.md': '---\nfeatured: true\n---\nbody' });
    expect(loadSidecars(dir, new Set(['zeng2023'])).get('zeng2023')?.featured).toBe(true);
  });

  it('warns instead of silently ignoring a sidecar that matches no entry', () => {
    // Otherwise an author writes a highlight, sees nothing on the site, and has
    // no way to discover they mistyped the citation key.
    const warn = vi.fn();
    const dir = withSidecars({ 'typo2023.md': '---\nhighlight: x\n---' });
    const sidecars = loadSidecars(dir, new Set(['zeng2023']), warn);

    expect(sidecars.size).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('typo2023');
    expect(warn.mock.calls[0][0]).toContain('no .bib entry defines');
  });

  it('honours publish: false', () => {
    const dir = withSidecars({ 'zeng2023.md': '---\npublish: false\nhighlight: x\n---' });
    expect(loadSidecars(dir, new Set(['zeng2023'])).size).toBe(0);
  });

  it('returns an empty map when the directory does not exist', () => {
    // The normal state of a vault with no featured papers yet.
    expect(loadSidecars('/nonexistent/精选', new Set(['zeng2023'])).size).toBe(0);
  });
});
