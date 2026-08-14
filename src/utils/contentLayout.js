/**
 * Facts about the vault layout that more than one place needs to agree on.
 *
 * Deliberately dependency-free: `astro.config.mjs` imports this at config-load
 * time, before Astro's `astro:content` virtual module exists, so this file must
 * not reach for it (that is why it does not live in libraryEntries.ts).
 */

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

/**
 * Does this collection id / relative path belong to another collection?
 * @param {string} idOrPath
 */
export function isOwnedByOtherCollection(idOrPath) {
  return OWNED_BY_OTHER_COLLECTIONS.includes(idOrPath.split('/')[0]);
}
