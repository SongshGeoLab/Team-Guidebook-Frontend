/**
 * Resolve Obsidian `[[wiki links]]` and `![[image embeds]]` to real URLs.
 *
 * The two are handled at different levels of the tree, because
 * `remark-wiki-link` treats them differently:
 *
 *  - `[[Entry]]`     is consumed by its micromark extension at *parse* time and
 *                    arrives here as a `wikiLink` node.
 *  - `![[image.png]]` is NOT consumed — the whole thing survives as literal
 *                    `text`, so it is rewritten with a text-node pass.
 *
 * Link targets are resolved through an index built from the actual content on
 * disk. Obsidian wiki links carry only the *shortest unique filename*, never a
 * path, while routes are generated from the full collection id — so no string
 * transform can bridge the two. Only a filename -> slug lookup can, which is
 * why `[[Git]]` used to resolve to `/zh/library/git` while the page lived at
 * `/zh/library/词条/Git`.
 */

import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { visit } from 'unist-util-visit';
import { isOwnedByOtherCollection } from './contentLayout.js';

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'
]);

const LIBRARY_ROOT = 'src/content/library';
const ATTACHMENTS_ROOT = 'public/attachments';

/**
 * Scan the content on disk once and build the lookup tables.
 *
 * @returns {{
 *   slugs: Map<string, string>,
 *   byBasename: Map<string, string>,
 *   attachments: Map<string, string>,
 *   collisions: Map<string, string[]>
 * }}
 */
export function buildContentIndex(cwd = process.cwd()) {
  const slugs = new Map(); // lowercased path -> on-disk path
  const byBasename = new Map();
  const collisions = new Map();
  const attachments = new Map();

  const libraryDir = path.resolve(cwd, LIBRARY_ROOT);
  let files = [];
  try {
    files = fg.sync('**/*.md', { cwd: libraryDir, followSymbolicLinks: true });
  } catch {
    // No content wired up yet (e.g. a bare checkout). Resolution degrades to
    // "leave the link alone and warn", which is preferable to crashing config
    // load.
  }

  for (const file of files) {
    // 项目/ and 文献/ live under 图书馆/ but belong to the projects and
    // publications collections, so they get no library route.
    if (isOwnedByOtherCollection(file)) continue;

    // Only index what actually gets a route. The library pages filter on
    // `publish !== false`, so indexing an unpublished entry would hand out a
    // link to a page that is never built — the same 404 in a new costume.
    try {
      const raw = fs.readFileSync(path.join(libraryDir, file), 'utf-8');
      if (matter(raw).data?.publish === false) continue;
    } catch {
      // unreadable: fall through and index it, a broken link is better than
      // dropping a real page from the index
    }

    const slug = file.replace(/\.md$/, '');
    slugs.set(slug.toLowerCase(), slug);

    const basename = slug.split('/').pop();
    const key = basename.toLowerCase();
    if (byBasename.has(key)) {
      // Ambiguous shortest-name: Obsidian would require a path prefix here.
      const existing = collisions.get(key) ?? [byBasename.get(key)];
      existing.push(slug);
      collisions.set(key, existing);
    } else {
      byBasename.set(key, slug);
    }
  }

  const attachmentsDir = path.resolve(cwd, ATTACHMENTS_ROOT);
  let assets = [];
  try {
    assets = fg.sync('**/*', { cwd: attachmentsDir, onlyFiles: true, followSymbolicLinks: true });
  } catch {
    // attachments are synced by scripts/setup-content.mjs; absent on a bare checkout
  }
  for (const asset of assets) {
    // Obsidian references attachments by basename even when they live in a
    // subdirectory, so index by basename and keep the full relative path.
    const key = asset.split('/').pop().toLowerCase();
    if (!attachments.has(key)) attachments.set(key, asset);
  }

  return { slugs, byBasename, attachments, collisions };
}

/** Split `Target#heading|alias` into its parts. */
function parseTarget(raw) {
  let rest = raw.trim();
  let alias;
  const pipe = rest.indexOf('|');
  if (pipe !== -1) {
    alias = rest.slice(pipe + 1).trim();
    rest = rest.slice(0, pipe).trim();
  }
  let hash;
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex + 1).trim();
    rest = rest.slice(0, hashIndex).trim();
  }
  return { target: rest, alias, hash };
}

function isImageTarget(target) {
  return IMAGE_EXTENSIONS.has(path.extname(target).toLowerCase());
}

/**
 * @param {object} [options]
 * @param {ReturnType<typeof buildContentIndex>} [options.index]
 * @param {(message: string) => void} [options.onUnresolved]
 */
export default function remarkObsidianLinks(options = {}) {
  const index = options.index ?? buildContentIndex();
  const warn = options.onUnresolved ?? ((message) => console.warn(`[obsidian-links] ${message}`));
  const warned = new Set();
  const warnOnce = (key, message) => {
    if (warned.has(key)) return;
    warned.add(key);
    warn(message);
  };

  // NOTE the two levels. unified calls the value passed to `.use()` as the
  // attacher and uses its return value as the transformer. A factory that
  // returns the transformer directly gets invoked with no arguments, so `tree`
  // is undefined and the plugin silently does nothing — which is exactly what
  // happened to the previous `wikiLinkWithLocale`, whose `if (!tree) return`
  // guard hid the mistake and left every wiki link unprocessed.
  return function attacher() {
    return function transformer(tree, file) {
      const filePath = file?.history?.[0] ?? '';
      const fmLang = file?.data?.astro?.frontmatter?.lang;
      const inferredFromPath = filePath.includes('/en/')
        ? 'en'
        : filePath.includes('/zh/')
          ? 'zh'
          : undefined;
      const lang = fmLang || inferredFromPath || 'zh';

      // --- pass 1: image embeds `![[picture.png]]`, still literal text -----
      visit(tree, 'text', (node, nodeIndex, parent) => {
        if (!parent || typeof nodeIndex !== 'number') return;
        if (!node.value.includes('![[')) return;

        const parts = [];
        let cursor = 0;
        const pattern = /!\[\[([^\]]+)\]\]/g;
        let match;
        while ((match = pattern.exec(node.value)) !== null) {
          if (match.index > cursor) {
            parts.push({ type: 'text', value: node.value.slice(cursor, match.index) });
          }
          const { target, alias } = parseTarget(match[1]);

          // `![[Some Note#Heading]]` is a *note* transclusion, not an image.
          // Emitting an <img> for it produced a permanently broken image; leave
          // the source text alone until transclusion is actually supported.
          if (!isImageTarget(target)) {
            parts.push({ type: 'text', value: match[0] });
            cursor = match.index + match[0].length;
            continue;
          }

          parts.push({
            type: 'image',
            url: resolveAttachment(target, index),
            // Obsidian's `|300` is a display width, not alt text.
            alt: alias && !/^\d+(x\d+)?$/.test(alias) ? alias : target,
            data: {
              hProperties: {
                className: ['obsidian-image'],
                loading: 'lazy',
                decoding: 'async'
              }
            }
          });
          cursor = match.index + match[0].length;
        }
        if (!parts.length) return;
        if (cursor < node.value.length) {
          parts.push({ type: 'text', value: node.value.slice(cursor) });
        }
        parent.children.splice(nodeIndex, 1, ...parts);
        return nodeIndex + parts.length; // resume after what we inserted
      });

      // --- pass 2: document links `[[Entry]]`, parsed into wikiLink nodes ---
      visit(tree, 'wikiLink', (node) => {
        const raw = node.data?.permalink || node.value;
        if (!raw) return;

        const { target, hash } = parseTarget(raw);
        if (!target) return;

        let href;
        if (target.startsWith('/')) {
          href = target;
        } else {
          const slug = resolveSlug(target, index);
          if (slug) {
            href = `/${lang}/library/${slug}`;
          } else {
            // Do NOT silently emit a plausible-looking dead link: that is
            // exactly how every wiki link on the site came to 404.
            warnOnce(
              target,
              `unresolved wiki link [[${target}]] in ${filePath || 'unknown file'} — ` +
                `no page matches that name under ${LIBRARY_ROOT}/`
            );
            href = undefined;
          }
        }

        node.data ??= {};
        node.data.hProperties ??= {};
        if (href) {
          node.data.hProperties.href = hash ? `${href}#${hash}` : href;
          node.data.hProperties.className = ['internal-link'];
        } else {
          node.data.hName = 'span';
          node.data.hProperties.className = ['internal-link', 'internal-link-broken'];
          node.data.hProperties.title = `Unresolved link: ${target}`;
          delete node.data.hProperties.href;
        }
      });

      return tree;
    };
  };
}

function resolveAttachment(target, index) {
  const basename = target.split('/').pop();
  const found = index.attachments.get(basename.toLowerCase());
  return `/attachments/${found ?? basename}`;
}

function resolveSlug(rawTarget, index) {
  // The library collection is rooted at 图书馆/, so an author writing the vault
  // path `[[图书馆/词条/Git]]` supplies one segment too many.
  const target = rawTarget.replace(/^图书馆\//, '');

  // `[[词条/Git]]` — an explicit path. Look it up as a path and STOP: falling
  // back to the basename here meant `[[专栏/Git]]`, whose directory does not
  // exist, silently resolved to 词条/Git — a different page, with no warning.
  // A directory the author spelled out is part of what they asked for.
  if (target.includes('/')) {
    return index.slugs.get(target.toLowerCase());
  }

  // `[[Git]]` — Obsidian's shortest unique filename.
  return index.byBasename.get(target.toLowerCase());
}
