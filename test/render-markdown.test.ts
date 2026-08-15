import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/utils/render-markdown.js';

/**
 * This is the security boundary. News bullets are rendered by a loader and go
 * into `dangerouslySetInnerHTML`; the vault is a *separate* repository, so
 * write access there would mean script execution here if the allow-list broke.
 *
 * `fixtures/Team-Guidebook/档案馆/2024-02-20.md` is the hostile fixture these
 * cases mirror — it was previously verified only by looking at the built site.
 */

/** A content index with one library entry, so no disk glob is needed. */
const index = {
  slugs: new Map([['词条/git', '词条/Git']]),
  byBasename: new Map([['git', '词条/Git']]),
  attachments: new Map([['sample-diagram.png', 'sample-diagram.png']]),
  collisions: new Map(),
};

const render = (md: string) => renderMarkdown(md, { index });

describe('sanitiser', () => {
  it('never emits a script element', async () => {
    const html = await render('Hostile: <script>alert(1)</script>');
    expect(html).not.toContain('<script');
    // The payload survives as inert text: remark-rehype drops raw HTML nodes
    // before the sanitiser even sees them (no `allowDangerousHtml`), so the
    // tags vanish and their content degrades to a text node. Defence in depth —
    // pinned here so a future `allowDangerousHtml` would fail loudly.
    expect(html).toBe('<p>Hostile: alert(1)</p>');
  });

  it('strips an inline event handler but keeps the element', async () => {
    const html = await render('<img src=x onerror="alert(document.cookie)">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('document.cookie');
  });

  it('removes a javascript: href', async () => {
    const html = await render('<a href="javascript:alert(2)">click</a>');
    expect(html).not.toContain('javascript:');
  });

  it('keeps http, https and mailto hrefs', async () => {
    expect(await render('[x](https://example.org)')).toContain('href="https://example.org"');
    expect(await render('[x](mailto:a@example.org)')).toContain('href="mailto:a@example.org"');
  });

  it('drops a style attribute', async () => {
    const html = await render('<p style="position:fixed;inset:0">x</p>');
    expect(html).not.toContain('style=');
  });
});

describe('Obsidian syntax', () => {
  it('resolves a wiki link by basename to a library route', async () => {
    // `marked` rendered this as the literal text `[[Git]]`.
    const html = await render('See [[Git]] for details.');
    // Case is preserved: library routes use `keepPathAsId`, so the URL is the
    // on-disk path verbatim. Lowercasing here would 404.
    expect(html).toContain('href="/zh/library/词条/Git"');
    expect(html).toContain('internal-link');
  });

  it('marks an unresolvable wiki link as broken rather than emitting a dead link', async () => {
    const html = await render('See [[No Such Entry]].');
    expect(html).toContain('internal-link-broken');
    expect(html).not.toContain('<a href="/zh/library/no-such-entry"');
  });

  it('rewrites an image embed to the attachments path with lazy loading', async () => {
    const html = await render('![[sample-diagram.png]]');
    expect(html).toContain('src="/attachments/sample-diagram.png"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('keeps the callout class through the allow-list', async () => {
    // className is allow-listed *by value*; a regex silently allowed nothing
    // and the callout lost its styling class.
    const html = await render('> [!INFO] Heads up\n> body text');
    expect(html).toContain('admonition');
    expect(html).toContain('admonition-info');
    expect(html).toContain('Heads up');
  });
});

describe('remark-directive interaction', () => {
  it('does not eat a timestamp that looks like a directive', async () => {
    // Regression: `0092bb0 fix(markdown): stop remark-directive eating
    // timestamps in news bullets` — `10:30` was parsed as a text directive.
    const html = await render('Meeting at 10:30 today.');
    expect(html).toContain('10:30');
  });
});
