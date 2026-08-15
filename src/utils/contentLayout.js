/**
 * Facts about the vault layout that more than one place needs to agree on.
 *
 * Deliberately free of Astro imports: `astro.config.mjs` imports this at
 * config-load time, before Astro's `astro:content` virtual module exists, so
 * this file must not reach for it (that is why it does not live in
 * libraryEntries.ts). Node builtins are fine — the config runs in Node.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Top-level vault directories, by the collection each one feeds. */
export const VAULT_DIRS = {
  people: '通讯录',
  news: '档案馆',
  library: '图书馆',
};

/**
 * Resolve the Obsidian vault root.
 *
 * `scripts/setup-content.mjs` can leave the vault in one of three shapes, so
 * every consumer has to probe for all three. This was copy-pasted verbatim into
 * both loaders (differing only in which directory it sniffed for), which is
 * exactly the duplication this module exists to prevent — and it is the
 * function that throws the error every new contributor hits first.
 *
 * @param {string} [sentinel] a directory that must exist directly under the
 *   root, used to tell a bare `.content` apart from an unrelated folder.
 *   Defaults to the library, which every vault has.
 * @returns {string} absolute path to the vault root
 */
export function getContentRoot(sentinel = VAULT_DIRS.library) {
  const root = findContentRoot(sentinel);
  if (!root) throw new Error('Content root not found. Please run npm run setup:content');
  return root;
}

/**
 * As {@link getContentRoot}, but returns null instead of throwing.
 *
 * `src/content.config.ts` needs the vault path at *config-load* time to point a
 * glob at a root-level file. Throwing there would turn "content not synced yet"
 * — the normal state of a fresh clone — into a crash before Astro can print
 * anything useful. A missing base makes the glob yield nothing instead, and the
 * consumers fall back to their defaults.
 *
 * @param {string} [sentinel]
 * @returns {string | null}
 */
export function findContentRoot(sentinel = VAULT_DIRS.library) {
  const cwd = process.cwd();

  // .content/Team-Guidebook (a clone that kept its repository directory)
  const nested = path.join(cwd, '.content', 'Team-Guidebook');
  if (fs.existsSync(nested)) return nested;

  // .content IS the vault (a symlink straight at the vault, or a bare clone)
  const dotContent = path.join(cwd, '.content');
  if (fs.existsSync(path.join(dotContent, sentinel))) return dotContent;

  // A vault checked out beside the site, without setup-content.mjs having run
  const local = path.join(cwd, 'Team-Guidebook');
  if (fs.existsSync(local)) return local;

  return null;
}

/**
 * Subdirectories of 图书馆/ that have their own collection.
 *
 * The `library` symlink points at 图书馆/, which also contains 项目/ (projects)
 * and 文献/ (publications). Without excluding them a published project renders
 * both at /[lang]/projects/<id> and at /[lang]/library/项目/<id>, the latter
 * through a passthrough schema that knows nothing about project fields.
 */
export const OWNED_BY_OTHER_COLLECTIONS = ['项目', '文献'];

/** Glob patterns for the same rule, for loaders that take exclusions. */
export const OWNED_BY_OTHER_COLLECTIONS_GLOBS = OWNED_BY_OTHER_COLLECTIONS.map(
  (dir) => `!${dir}/**`
);

/** Locales that a `<name>.<locale>.md` sibling file can carry. */
export const CONTENT_LOCALES = ['zh', 'en'];

/**
 * Exclusions that keep translation siblings out of a base collection.
 *
 * `通讯录/song-shuang.en.md` holds an English biography and nothing else — no
 * role, no email, because those are language-independent and live once in the
 * base note. It therefore cannot satisfy the people schema, and it must not
 * become a second person. It is picked up by the `translations` collection
 * instead, which has a schema shaped for an overlay.
 */
export const TRANSLATION_GLOBS = CONTENT_LOCALES.map((locale) => `!**/*.${locale}.md`);

/**
 * Where each collection's notes sit, relative to the vault root.
 *
 * The `translations` collection globs the whole vault, so its ids are
 * vault-relative paths (`通讯录/song-shuang.en`). Pairing one back to a people
 * entry (`song-shuang`) needs this prefix.
 */
export const COLLECTION_VAULT_PATHS = {
  people: '通讯录',
  projects: '图书馆/项目',
  library: '图书馆',
};

/**
 * Does this collection id / relative path belong to another collection?
 * @param {string} idOrPath
 */
export function isOwnedByOtherCollection(idOrPath) {
  return OWNED_BY_OTHER_COLLECTIONS.includes(idOrPath.split('/')[0]);
}
