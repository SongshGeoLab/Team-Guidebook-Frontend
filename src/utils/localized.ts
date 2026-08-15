import { LOCALES, type Lang } from '../i18n/ui';

/**
 * The one convention for bilingual vault content.
 *
 * Two mechanisms, chosen by field length:
 *
 *   1. **Short structured fields** are paired in one file: `name` holds the
 *      base (Chinese) value, `name_en` the English one. Duplicating whole
 *      files for a person's role and email means maintaining the
 *      language-independent half twice, and it drifts.
 *
 *   2. **Long prose** lives in a sibling file: `通讯录/song-shuang.md` and
 *      `通讯录/song-shuang.en.md`. Nobody wants an English biography inside a
 *      YAML string, and Obsidian shows the two notes next to each other.
 *
 * Chinese is the base language throughout; English is the optional overlay.
 * When it is missing the reader gets the Chinese with a notice, never a blank
 * page. `/zh` and `/en` previously served byte-identical bodies, so the
 * fallback is the *current* behaviour — this module only adds the ability to
 * do better where a translation exists.
 */

/** Suffixes that mark a file as a translation, e.g. `.en` in `bio.en.md`. */
const TRANSLATION_SUFFIXES = LOCALES.map((locale) => `.${locale}`);

/**
 * Split a collection id into its base id and the locale it translates, if any.
 *
 * `song-shuang.en` -> `{ baseId: 'song-shuang', lang: 'en' }`
 * `song-shuang`    -> `{ baseId: 'song-shuang', lang: undefined }`
 */
export function splitTranslationId(id: string): { baseId: string; lang?: Lang } {
  for (const suffix of TRANSLATION_SUFFIXES) {
    if (id.endsWith(suffix)) {
      return { baseId: id.slice(0, -suffix.length), lang: suffix.slice(1) as Lang };
    }
  }
  return { baseId: id };
}

/** Is this entry a translation overlay rather than a page of its own? */
export function isTranslation(id: string): boolean {
  return splitTranslationId(id).lang !== undefined;
}

/**
 * Read a field in the requested language, falling back to the base value.
 *
 * `pickLocalized(person.data, 'name', 'en')` returns `name_en` when it is a
 * non-empty string, else `name`. A whitespace-only translation counts as
 * absent: an author who typed a space should get the Chinese, not a blank.
 */
export function pickLocalized(
  data: Record<string, unknown>,
  field: string,
  lang: Lang
): string | undefined {
  if (lang !== 'zh') {
    const translated = data[`${field}_${lang}`];
    if (typeof translated === 'string' && translated.trim()) return translated;
  }
  const base = data[field];
  return typeof base === 'string' && base.trim() ? base : undefined;
}

/** As {@link pickLocalized}, for array fields such as `interests`. */
export function pickLocalizedList(
  data: Record<string, unknown>,
  field: string,
  lang: Lang
): string[] {
  if (lang !== 'zh') {
    const translated = data[`${field}_${lang}`];
    if (Array.isArray(translated) && translated.length) return translated as string[];
  }
  const base = data[field];
  return Array.isArray(base) ? (base as string[]) : [];
}

export interface LocalizedEntry<T extends { id: string }, X extends { id: string } = T> {
  /** The base entry. Frontmatter is always read from here. */
  entry: T;
  /** The entry to `render()` for the body — the translation when one exists. */
  bodySource: T | X;
  /** False when the reader is seeing the base language as a fallback. */
  hasTranslation: boolean;
}

/**
 * Index translation-overlay entries by the base id they translate.
 *
 * Overlays live in their own `translations` collection rather than alongside
 * their bases. They carry a body and nothing else — no role, no email, because
 * those are language-independent and belong in the base note exactly once — so
 * they cannot satisfy a base schema, and a union schema would make every
 * consumer treat `name` as possibly-undefined. A separate collection with a
 * schema shaped for an overlay costs one glob and keeps both types honest.
 *
 * That collection globs the whole vault, so its ids are vault-relative
 * (`通讯录/song-shuang.en`). `prefix` strips the directory back off.
 *
 * @param prefix the collection's path under the vault root, e.g. `通讯录`
 */
export function translationIndex<X extends { id: string }>(
  translations: X[],
  prefix: string,
  lang: Lang
): Map<string, X> {
  const index = new Map<string, X>();
  const dir = prefix.endsWith('/') ? prefix : `${prefix}/`;

  for (const translation of translations) {
    if (!translation.id.startsWith(dir)) continue;
    const { baseId, lang: entryLang } = splitTranslationId(translation.id.slice(dir.length));
    // Overlays for other locales are simply not this page's business.
    if (entryLang === lang) index.set(baseId, translation);
  }
  return index;
}

/**
 * Pair base entries with their translation overlays for one locale.
 *
 * Also drops any `.en`-suffixed entry that leaked into the base collection —
 * belt and braces behind the loader's exclusion globs, because a leak is not
 * cosmetic: `src/pages/[lang]/library/[...slug].astro` throws on duplicate
 * slugs, so it would fail the build rather than quietly shadow a page.
 */
export function resolveLocalized<T extends { id: string }, X extends { id: string } = T>(
  entries: T[],
  lang: Lang,
  translations?: Map<string, X>
): Array<LocalizedEntry<T, X>> {
  return entries
    .filter((entry) => !isTranslation(entry.id))
    .map((entry) => {
      const translation = translations?.get(entry.id);
      return {
        entry,
        bodySource: translation ?? entry,
        hasTranslation: translation !== undefined,
      };
    });
}
