import { getCollection, type CollectionEntry } from 'astro:content';
import { isOwnedByOtherCollection } from './contentLayout.js';

/**
 * Subdirectories of 图书馆/ that have their own collection and must not also
 * surface as library pages.
 *
 * The `library` symlink points at 图书馆/, which contains 项目/ (the projects
 * collection) and 文献/ (publications). Without this filter a published project
 * renders at BOTH /[lang]/projects/<id> — with its metadata block — and
 * /[lang]/library/项目/<id>, where the passthrough library schema knows nothing
 * about project fields and emits a bare <h1>. Duplicate content, a diluted
 * Pagefind index, and a project card leaking into the Library grid.
 *
 * config.ts acknowledged this in a comment and deferred it to "query time";
 * this is that filter, in one place rather than at each of six call sites.
 */

/**
 * Published library entries, excluding anything another collection owns.
 *
 * Use this instead of `getCollection('library', ...)` so the exclusion cannot
 * be forgotten by a new consumer.
 */
export async function getLibraryEntries(): Promise<CollectionEntry<'library'>[]> {
  const entries = await getCollection('library', ({ data }) => data.publish !== false);
  return entries.filter((entry) => !isOwnedByOtherCollection(entry.id));
}
