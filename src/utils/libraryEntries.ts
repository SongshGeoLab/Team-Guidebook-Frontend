import { getCollection, type CollectionEntry } from 'astro:content';

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
const OWNED_BY_OTHER_COLLECTIONS = ['项目', '文献'];

function isOwnedElsewhere(id: string): boolean {
  const firstSegment = id.split('/')[0];
  return OWNED_BY_OTHER_COLLECTIONS.includes(firstSegment);
}

/**
 * Published library entries, excluding anything another collection owns.
 *
 * Use this instead of `getCollection('library', ...)` so the exclusion cannot
 * be forgotten by a new consumer.
 */
export async function getLibraryEntries(): Promise<CollectionEntry<'library'>[]> {
  const entries = await getCollection('library', ({ data }) => data.publish !== false);
  return entries.filter((entry) => !isOwnedElsewhere(entry.id));
}
