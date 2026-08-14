/**
 * Public URL slug for a `people` or `projects` entry.
 *
 * Astro's collection id for a legacy `type: 'content'` collection keeps the
 * file extension and whatever characters the filename had, so using it as a
 * route param produced URLs like `/zh/people/Boyu Wang.md` — a bare space in
 * an href and a `.md` suffix some hosts content-negotiate on.
 *
 * Both schemas already declare a canonical `id` in frontmatter (e.g.
 * `boyu-wang`), so prefer that and fall back to a slugified filename.
 *
 * This must be the single source of truth: the list page and the detail route
 * previously derived the URL separately, which is exactly how they drifted.
 */

/** Slugify a raw collection id / filename. */
export function slugify(value: string): string {
  return value
    .replace(/\.md$/i, '')
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/\s+/g, '-')
        // Keep CJK and word characters; drop punctuation that needs escaping.
        .replace(/[^\p{Letter}\p{Number}_-]+/gu, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean)
    .join('/')
    .toLowerCase();
}

/**
 * @param entry a collection entry with `id` and frontmatter `data`
 */
export function entrySlug(entry: { id: string; data: { id?: string } }): string {
  const declared = entry.data?.id;
  if (declared && declared.trim()) return slugify(declared);
  return slugify(entry.id);
}
