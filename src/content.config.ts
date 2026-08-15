import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  OWNED_BY_OTHER_COLLECTIONS_GLOBS,
  TRANSLATION_GLOBS,
  CONTENT_LOCALES,
  findContentRoot,
} from './utils/contentLayout.js';
import { normalizeRole } from './utils/roles';
import { newsLoader } from './content/loaders/newsLoader';
import { publicationsLoader } from './content/loaders/publicationsLoader';

/**
 * Astro 6 removed legacy `type: 'content'` collections, so these are glob
 * loaders now. The default generateId slugifies the path, which would silently
 * rewrite every existing library URL (`词条/Git` -> `词条/git`). Keep the
 * on-disk path verbatim instead — routes are built from these ids, and
 * src/utils/obsidian-links.js resolves wiki links against the same paths.
 */
const keepPathAsId = ({ entry }: { entry: string }) => entry.replace(/\.md$/i, '');

/**
 * Base schema fields shared across multiple collections.
 */
const baseSchema = {
  publish: z.boolean().default(true).describe('Whether this item should be published'),
  date: z.union([z.date(), z.string()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined).describe('Publication or creation date'),
  tags: z.union([z.array(z.string()), z.null()]).default([]).transform(val => val || []).describe('Tags for categorization'),
};

/**
 * Translation overlays: `<name>.en.md` beside the note it translates.
 *
 * These carry a body and nothing else. Language-independent facts — a person's
 * role, email, ORCID — live once in the base note; duplicating them per
 * language is how the two copies drift. See src/utils/localized.ts for the
 * pairing, and note that overlays are excluded from every base collection by
 * TRANSLATION_GLOBS so a translation can never become a second person.
 */
const translationSchema = z.object({
  lang: z.enum(CONTENT_LOCALES as [string, ...string[]]).describe('Locale of this body'),
  translation_of: z.string().optional().describe('Base id, for the author\'s reference'),
  title: z.string().optional().describe('Translated page title, where one is shown'),
  publish: z.boolean().default(true),
});

/**
 * People collection schema.
 * Maps from: .content/Team-Guidebook/通讯录/ (all .md files bar translations)
 */
const peopleSchema = z.object({
  publish: baseSchema.publish,
  tags: baseSchema.tags,
  id: z.string().describe('Unique identifier (slug)'),
  name: z.string().describe('Display name'),
  name_en: z.string().optional().describe('Display name in English'),
  /**
   * Canonical position, used for grouping.
   *
   * Normalised rather than validated as an enum: the vault predates this
   * vocabulary, so 'Professor', '教授', ' PhD Student ' and 'phd' must all keep
   * working. Free-text job titles belong in `title`, not here — this field only
   * decides which section the person appears in.
   */
  role: z.string().transform(normalizeRole).describe('Position: pi | postdoc | phd | master | undergrad | staff | visitor'),
  title: z.string().optional().describe('Free-text job title shown on the card, e.g. 副教授'),
  title_en: z.string().optional(),
  /** Sort key within a role section. Unset sorts last, then by name. */
  order: z.number().optional().describe('Display order within the role group'),
  status: z.enum(['current', 'alumni']).default('current').describe('Still in the group?'),
  destination: z.string().optional().describe('Where an alumnus went next'),
  destination_en: z.string().optional(),
  joined: z.union([z.date(), z.string()]).optional().transform(val => val ? new Date(val) : undefined),
  left: z.union([z.date(), z.string()]).optional().transform(val => val ? new Date(val) : undefined),
  avatar: z.string().optional().describe('Avatar image path (e.g., "/attachments/avatar.jpg")'),
  email: z.string().email().optional().describe('Email address'),
  aliases: z.union([z.array(z.string()), z.null()]).default([]).transform(val => val || []).describe('Alternative names for resolving #P/<Name> tags'),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional().describe('External links (homepage, GitHub, etc.)'),
  // Declared separately from `links` because each has a known icon and a known
  // URL shape, so the UI can render them consistently instead of hoping the
  // author typed a matching label.
  orcid: z.string().optional().describe('ORCID iD or URL'),
  scholar: z.string().url().optional().describe('Google Scholar profile URL'),
  github: z.string().optional().describe('GitHub username or URL'),
  homepage: z.string().url().optional().describe('Personal homepage'),
  interests: z.array(z.string()).optional().describe('Research interests'),
  interests_en: z.array(z.string()).optional(),
});

/**
 * Projects collection schema.
 * Maps from: .content/Team-Guidebook/图书馆/项目/ (all .md files)
 */
const projectsSchema = z.object({
  publish: baseSchema.publish,
  tags: baseSchema.tags,
  id: z.string().describe('Unique identifier (slug)'),
  title: z.string().describe('Project title'),
  title_en: z.string().optional(),
  /**
   * Card blurb.
   *
   * `Project.summary` was declared in the React DTO and rendered by HomePage,
   * but no schema declared it and no page supplied it — a phantom field that
   * was permanently undefined, so the card body was permanently blank.
   */
  summary: z.string().optional().describe('One-or-two-line blurb for the card'),
  summary_en: z.string().optional(),
  cover: z.string().optional().describe('Cover image path under /attachments'),
  start_date: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val).describe('Project start date'),
  end_date: z.union([z.date(), z.string()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined).describe('Project end date (empty means "Present")'),
  people: z.array(z.string()).default([]).describe('Array of Person IDs (must match people collection)'),
  research: z.array(z.string()).default([]).describe('Research theme ids this project belongs to'),
  repo: z.string().url().optional().describe('GitHub repository URL'),
  bib_key: z.string().optional().describe('BibTeX key for associated publication'),
  // The home page used to show "featured" projects by taking the first three in
  // collection order — i.e. whatever the filesystem happened to return.
  featured: z.boolean().default(false).describe('Show on the home page'),
  order: z.number().optional().describe('Sort key among featured projects'),
});

/**
 * Research themes — the evergreen directions the group works on.
 * Maps from: .content/Team-Guidebook/图书馆/研究/
 *
 * Deliberately distinct from `projects`. A project has a start date, an end
 * date and a funder; a theme has neither and outlives any one project. Folding
 * them together would mean either dating a theme arbitrarily or making
 * `start_date` optional on projects, and a reader would lose the distinction
 * between "what we study" and "what we are currently paid to do".
 */
const researchSchema = z.object({
  publish: baseSchema.publish,
  tags: baseSchema.tags,
  id: z.string().describe('Unique identifier (slug)'),
  title: z.string().describe('Theme name'),
  title_en: z.string().optional(),
  summary: z.string().optional().describe('One or two lines for the card'),
  summary_en: z.string().optional(),
  order: z.number().default(0).describe('Display order; themes are few and hand-ordered'),
  cover: z.string().optional().describe('Illustration path under /attachments'),
  people: z.array(z.string()).default([]).describe('Person ids leading this theme'),
  /** BibTeX keys. The join is checked at build time by the research page. */
  featured_publications: z.array(z.string()).default([]).describe('bib_key values to showcase'),
  projects: z.array(z.string()).default([]).describe('Project ids under this theme'),
});

/**
 * Datasets, code and tools the group publishes.
 * Maps from: .content/Team-Guidebook/图书馆/资源/
 */
const resourcesSchema = z.object({
  publish: baseSchema.publish,
  tags: baseSchema.tags,
  id: z.string().describe('Unique identifier (slug)'),
  title: z.string(),
  title_en: z.string().optional(),
  type: z
    .enum(['dataset', 'code', 'model', 'tool', 'course'])
    .describe('What kind of resource this is; drives the icon and the filter'),
  summary: z.string().optional(),
  summary_en: z.string().optional(),
  url: z.string().url().describe('Where to get it'),
  doi: z.string().optional().describe('DOI for citing the resource itself'),
  repo: z.string().url().optional(),
  license: z.string().optional().describe('SPDX identifier or licence name'),
  version: z.string().optional(),
  released: z.union([z.date(), z.string()]).optional().transform(val => val ? new Date(val) : undefined),
  people: z.array(z.string()).default([]).describe('Person ids who maintain it'),
  bib_key: z.string().optional().describe('The paper to cite when using this'),
  cover: z.string().optional(),
});

/**
 * News collection schema.
 * Maps from: .content/Team-Guidebook/档案馆/YYYY-MM-DD.md (Daily Notes)
 * Note: This requires a custom loader to extract bullet items from Daily Notes.
 */
const newsSchema = z.object({
  ...baseSchema,
  date: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val).describe('News item date (extracted from filename or frontmatter)'),
  title: z.string().optional().describe('News item title (defaults to date string)'),
  content: z.string().describe('HTML content extracted from bullet items'),
  related_people: z.array(z.string()).default([]).describe('Related Person IDs (resolved from #P/<Name> tags)'),
});

/**
 * Library collection schema.
 * Maps from: .content/Team-Guidebook/图书馆/ (all .md files, excluding 项目/)
 * This is a wiki-style collection preserving directory structure.
 * Note: Library files may have minimal frontmatter, so schema is very permissive.
 */
const librarySchema = z.object({
  publish: z.boolean().default(true).describe('Whether this item should be published'),
  date: z.union([z.date(), z.string()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined).describe('Publication or creation date'),
  tags: z.union([z.array(z.string()), z.null()]).default([]).transform(val => val || []).describe('Tags for categorization'),
  title: z.string().optional().describe('Page title (defaults to filename)'),
  title_en: z.string().optional().describe('Page title in English, for the sidebar'),
  // Base notes are Chinese; an English body goes in a `<name>.en.md` sibling,
  // which the `translations` collection picks up. This field is therefore
  // almost never needed by hand — it stays for notes authored directly in
  // English, which obsidian-links.js already honours when resolving wiki links.
  lang: z.enum(['zh', 'en']).optional().describe('Language of this note (defaults to zh)'),
  // Read by LibraryPage for the index cards. Previously these survived only
  // because of .passthrough(), so nothing caught a typo like `descriptio:`.
  description: z.string().optional().describe('Card summary on the library index'),
  excerpt: z.string().optional().describe('Fallback for description'),
}).passthrough(); // Allow additional fields that don't match schema

/**
 * Publications collection schema.
 * Phase 2: Integrated BibTeX via citation-js.
 * Maps from: .content/Team-Guidebook/图书馆/文献/ (all .bib files)
 * Uses custom loader to parse BibTeX entries.
 */
const publicationsSchema = z.object({
  ...baseSchema,
  title: z.string().describe('Publication title'),
  authors: z.array(z.string()).describe('Author names'),
  venue: z.string().optional().describe('Publication venue (journal, conference, etc.)'),
  year: z.number().int().optional().describe('Publication year; absent when the entry has no parseable date'),
  bib_key: z.string().optional().describe('BibTeX key; the join key for sidecars and cross-references'),
  bibtex: z.string().optional().describe('Original BibTeX entry string'),
  doi: z.string().url().optional().describe('DOI URL'),
  pdf: z.string().optional().describe('PDF file path in attachments'),
  // Re-declared with baseSchema's null tolerance restored. Spreading baseSchema
  // and then overriding `tags` dropped it, so `tags: null` — which every other
  // collection accepts — failed validation here alone.
  tags: baseSchema.tags.describe('Research topic tags for filtering'),
  /** Inferred from the BibTeX entry type (@article, @inproceedings, …). */
  type: z
    .enum(['journal', 'conference', 'preprint', 'chapter', 'book', 'thesis', 'other'])
    .default('other')
    .describe('Publication kind'),

  // ---- Fields below come from a sidecar note, not from the .bib ----
  // Zotero rewrites .bib files wholesale and drops non-standard fields, so
  // anything the site adds has to live beside it. See PUBLICATION_SIDECAR_DIR.
  featured: z.boolean().default(false).describe('Showcase on the home and research pages'),
  order: z.number().optional().describe('Sort key among featured publications'),
  cover: z.string().optional().describe('Figure or cover image under /attachments'),
  highlight: z.string().optional().describe('One line on why this paper matters'),
  highlight_en: z.string().optional(),
  author_ids: z.array(z.string()).default([]).describe('Person ids for the lab authors'),
  code: z.string().url().optional().describe('Repository implementing the paper'),
  data: z.string().url().optional().describe('Dataset behind the paper'),
  press: z
    .array(
      z.object({
        outlet: z.string(),
        outlet_en: z.string().optional(),
        url: z.string().url(),
        date: z.union([z.date(), z.string()]).optional(),
      })
    )
    .default([])
    .describe('Media coverage'),
});

/**
 * Sidecar note enriching one BibTeX entry.
 * Maps from: .content/Team-Guidebook/图书馆/文献/精选/<bib_key>.md
 *
 * Validated as its own collection so a malformed sidecar names its own file in
 * the error, rather than surfacing as a confusing failure inside the
 * publications loader. The loader reads the same files and merges them.
 */
const publicationHighlightSchema = z.object({
  publish: baseSchema.publish,
  bib_key: z.string().describe('Citation key of the entry this enriches'),
  featured: z.boolean().default(true),
  order: z.number().optional(),
  cover: z.string().optional(),
  highlight: z.string().optional(),
  highlight_en: z.string().optional(),
  author_ids: z.array(z.string()).default([]),
  code: z.string().url().optional(),
  data: z.string().url().optional(),
  type: z.enum(['journal', 'conference', 'preprint', 'chapter', 'book', 'thesis', 'other']).optional(),
  press: z
    .array(
      z.object({
        outlet: z.string(),
        outlet_en: z.string().optional(),
        url: z.string().url(),
        date: z.union([z.date(), z.string()]).optional(),
      })
    )
    .default([]),
});

/**
 * Site identity, navigation and social links.
 * Maps from: <vault root>/site.md — a single entry, id `site`.
 *
 * Before this the site had three different identities hardcoded in three
 * components: Header.astro said "Our Lab" / "实验室", Footer.astro said
 * "Lab Website", and HomePage.tsx said "SongshGeo Lab" with an institute name
 * and hero copy. Nothing reconciled them, and a content maintainer could not
 * change any of them without a code change and a redeploy.
 *
 * The body of site.md is the About page lead, which is why this is a markdown
 * file rather than YAML — it needs `render()`, and an Obsidian author can open
 * and preview it like any other note.
 */
const siteSchema = z.object({
  name: z.string().describe('Lab name, in the primary (Chinese) language'),
  name_en: z.string().optional().describe('Lab name in English'),
  tagline: z.string().optional().describe('One-line description'),
  tagline_en: z.string().optional(),
  // The hero renders the headline over two lines, the second in the accent
  // gradient. Kept as two fields because that is what the layout needs; a
  // single string would have to be split on a marker somewhere.
  headline: z.string().optional().describe('First line of the hero headline'),
  headline_en: z.string().optional(),
  headline_accent: z.string().optional().describe('Second, highlighted hero line'),
  headline_accent_en: z.string().optional(),
  affiliation: z.string().optional().describe('Institute or university'),
  affiliation_en: z.string().optional(),
  logo: z.string().optional().describe('Path under /attachments'),
  email: z.string().email().optional(),
  address: z.string().optional(),
  address_en: z.string().optional(),
  socials: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        icon: z.string().optional().describe('lucide-react icon name'),
      })
    )
    .default([]),
  /**
   * Optional nav override.
   *
   * Left optional on purpose: nav entries point at routes, and routes are code.
   * A content author who adds an item here for a page that does not exist ships
   * a 404 with no build error. When absent, Header.astro uses the route list it
   * can actually verify, with labels from src/i18n/ui.ts.
   */
  nav: z
    .array(
      z.object({
        href: z.string(),
        label: z.string(),
        label_en: z.string().optional(),
      })
    )
    .optional(),
  footer_note: z.string().optional(),
  footer_note_en: z.string().optional(),
});

/**
 * Define all content collections.
 *
 * Most read from src/content/{collection}/, which scripts/setup-content.mjs
 * symlinks into the Obsidian vault. `news` and `publications` bypass the
 * symlinks and read the vault directly through custom loaders; `site` and
 * `translations` glob the vault root, because they are not one directory.
 */
export const collections = {
  site: defineCollection({
    // Globbed straight from the vault root rather than through a symlink under
    // src/content/: setup-content.mjs links directories, and this is one file.
    // A null root (fresh clone, content not synced) yields no entries and the
    // consumers fall back to their defaults — see findContentRoot.
    loader: glob({ pattern: 'site.md', base: findContentRoot() ?? './.content' }),
    schema: siteSchema,
  }),
  /**
   * English (and other non-base) bodies: `<name>.en.md` beside their base note.
   *
   * Globbed from the vault root so one collection covers every other one; ids
   * are vault-relative paths (`通讯录/song-shuang.en`), which
   * `translationIndex()` maps back onto base ids.
   */
  translations: defineCollection({
    loader: glob({
      pattern: CONTENT_LOCALES.map((locale) => `**/*.${locale}.md`),
      base: findContentRoot() ?? './.content',
      generateId: keepPathAsId,
    }),
    schema: translationSchema,
  }),
  people: defineCollection({
    loader: glob({
      pattern: ['**/*.md', ...TRANSLATION_GLOBS],
      base: './src/content/people',
      generateId: keepPathAsId,
    }),
    schema: peopleSchema,
  }),
  projects: defineCollection({
    loader: glob({
      pattern: ['**/*.md', ...TRANSLATION_GLOBS],
      base: './src/content/projects',
      generateId: keepPathAsId,
    }),
    schema: projectsSchema,
  }),
  news: defineCollection({
    loader: newsLoader(),
    schema: newsSchema,
  }),
  library: defineCollection({
    // 项目/ and 文献/ live under this base but belong to other collections.
    // Excluded here as well as in getLibraryEntries(), so a stray consumer
    // cannot resurface them.
    loader: glob({
      pattern: ['**/*.md', ...OWNED_BY_OTHER_COLLECTIONS_GLOBS, ...TRANSLATION_GLOBS],
      base: './src/content/library',
      generateId: keepPathAsId
    }),
    schema: librarySchema,
  }),
  research: defineCollection({
    loader: glob({
      pattern: ['**/*.md', ...TRANSLATION_GLOBS],
      base: './src/content/library/研究',
      generateId: keepPathAsId,
    }),
    schema: researchSchema,
  }),
  resources: defineCollection({
    loader: glob({
      pattern: ['**/*.md', ...TRANSLATION_GLOBS],
      base: './src/content/library/资源',
      generateId: keepPathAsId,
    }),
    schema: resourcesSchema,
  }),
  publications: defineCollection({
    // Reads the .bib files AND merges the sidecars from 文献/精选/.
    loader: publicationsLoader(),
    schema: publicationsSchema,
  }),
  /**
   * The sidecars again, as their own collection.
   *
   * Redundant with the merge inside publicationsLoader, and deliberately so:
   * this is what validates them. A typo in a sidecar reports as an error
   * naming that file, instead of silently failing to enrich a paper.
   */
  publicationHighlights: defineCollection({
    loader: glob({
      pattern: ['**/*.md', ...TRANSLATION_GLOBS],
      base: './src/content/library/文献/精选',
      generateId: keepPathAsId,
    }),
    schema: publicationHighlightSchema,
  }),
};

