/**
 * Render a fragment of vault Markdown to sanitised HTML.
 *
 * Content collections that go through Astro's own markdown pipeline get the
 * Obsidian plugins for free. Loaders that produce HTML themselves — currently
 * the news loader, which slices bullets out of daily notes — do not, and used
 * `marked` instead. That had two consequences:
 *
 *   - `marked` knows nothing about callouts, `[[wiki links]]` or `![[embeds]]`,
 *     so a bullet containing `[[Git]]` rendered as the literal text `[[Git]]`.
 *   - `marked` v17 has no sanitiser (the `sanitize` option was removed), and the
 *     output went straight into `dangerouslySetInnerHTML`. Since the vault is a
 *     separate repository, write access there meant script execution here.
 *
 * This module runs the same plugin chain as astro.config.mjs and then sanitises,
 * so both problems are fixed in one place and stay fixed for any future loader.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import wikiLink from 'remark-wiki-link';

import remarkObsidianCallouts from './remark-obsidian-callouts.js';
import remarkObsidianLinks, { buildContentIndex } from './obsidian-links.js';
import remarkReviveDirectives from './remark-revive-directives.js';

/**
 * Allow through exactly the markup our own plugins emit, and nothing else.
 * Everything not listed here — script, iframe, event handlers, style — is
 * dropped by rehype-sanitize.
 */
/**
 * Merge extra allowed class names into a tag's attribute list.
 *
 * `className` is allow-listed *by value* in the default schema (e.g. `a` only
 * permits `data-footnote-backref`). Appending a second `['className', ...]`
 * entry does not widen it — sanitize honours the first one and silently strips
 * everything else, leaving a bare `class=""`. The existing entry has to be
 * replaced by the union instead.
 *
 * @param {string} tag
 * @param {string[]} classNames
 * @param {string[]} [extraAttributes]
 */
function allowClasses(tag, classNames, extraAttributes = []) {
  const base = defaultSchema.attributes?.[tag] ?? [];
  const existingClassValues = base
    .filter((entry) => Array.isArray(entry) && entry[0] === 'className')
    .flatMap((entry) => entry.slice(1));
  const withoutClassName = base.filter(
    (entry) => !(Array.isArray(entry) && entry[0] === 'className') && entry !== 'className'
  );
  return [
    ...withoutClassName,
    ...extraAttributes,
    ['className', ...existingClassValues, ...classNames]
  ];
}

const schema = {
  ...defaultSchema,
  strip: ['script', 'style'],
  tagNames: [...(defaultSchema.tagNames ?? []), 'aside'],
  attributes: {
    ...defaultSchema.attributes,
    a: allowClasses('a', ['internal-link', 'internal-link-broken'], ['title']),
    img: allowClasses('img', ['obsidian-image'], ['loading', 'decoding']),
    span: allowClasses('span', ['internal-link', 'internal-link-broken'], ['title']),
    aside: [['className', /^admonition/], ['dataCallout', /.*/], ['dataTitle', /.*/]]
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https'],
    href: ['http', 'https', 'mailto']
  }
};

let sharedProcessor;

/**
 * @param {object} [options]
 * @param {ReturnType<typeof buildContentIndex>} [options.index]
 */
function createProcessor(options = {}) {
  const index = options.index ?? buildContentIndex();
  return unified()
    .use(remarkParse)
    .use(remarkObsidianCallouts())
    .use(remarkDirective)
    .use(remarkReviveDirectives())
    .use(wikiLink, { aliasDivider: '|', pageResolver: (/** @type {string} */ n) => [n] })
    .use(remarkObsidianLinks({ index }))
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify);
}

/**
 * Render Markdown to sanitised HTML.
 *
 * @param {string} markdown
 * @returns {Promise<string>}
 */
export async function renderMarkdown(markdown) {
  sharedProcessor ??= createProcessor();
  const result = await sharedProcessor.process(markdown);
  return String(result).trim();
}
