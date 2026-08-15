import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { OWNED_BY_OTHER_COLLECTIONS_GLOBS, findContentRoot } from './utils/contentLayout.js';
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
 * People collection schema.
 * Maps from: .content/Team-Guidebook/通讯录/ (all .md files)
 */
const peopleSchema = z.object({
  ...baseSchema,
  id: z.string().describe('Unique identifier (slug)'),
  name: z.string().describe('Display name'),
  role: z.string().describe('Role (e.g., "PhD Student", "Professor")'),
  avatar: z.string().optional().describe('Avatar image path (e.g., "/attachments/avatar.jpg")'),
  email: z.string().email().optional().describe('Email address'),
  aliases: z.union([z.array(z.string()), z.null()]).default([]).transform(val => val || []).describe('Alternative names for resolving #P/<Name> tags'),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional().describe('External links (homepage, GitHub, etc.)'),
  interests: z.array(z.string()).optional().describe('Research interests'),
});

/**
 * Projects collection schema.
 * Maps from: .content/Team-Guidebook/图书馆/项目/ (all .md files)
 */
const projectsSchema = z.object({
  ...baseSchema,
  id: z.string().describe('Unique identifier (slug)'),
  title: z.string().describe('Project title'),
  start_date: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val).describe('Project start date'),
  end_date: z.union([z.date(), z.string()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined).describe('Project end date (empty means "Present")'),
  people: z.array(z.string()).default([]).describe('Array of Person IDs (must match people collection)'),
  repo: z.string().url().optional().describe('GitHub repository URL'),
  bib_key: z.string().optional().describe('BibTeX key for associated publication'),
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
  lang: z.enum(['zh', 'en']).optional().describe('Language (inferred from path or frontmatter)'),
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
  bib_key: z.string().optional().describe('BibTeX key for citation'),
  bibtex: z.string().optional().describe('Original BibTeX entry string'),
  doi: z.string().url().optional().describe('DOI URL'),
  pdf: z.string().optional().describe('PDF file path in attachments'),
  tags: z.array(z.string()).default([]).describe('Research topic tags for filtering'),
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
 * Note: Content Collections will read from src/content/{collection}/ directories,
 * which are symlinked to .content/Team-Guidebook/ via setup-content.mjs.
 * 
 * For News collection: A custom loader is required to extract bullet items from Daily Notes.
 * This will be implemented in a separate loader file (see src/content/loaders/news.ts).
 * 
 * For Library collection: The symlink points to 图书馆/, but we need to exclude
 * 项目/ and 文献/ subdirectories. This is handled by filtering in the loader or
 * by using a more specific symlink structure.
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
  people: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/people', generateId: keepPathAsId }),
    schema: peopleSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects', generateId: keepPathAsId }),
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
      pattern: ['**/*.md', ...OWNED_BY_OTHER_COLLECTIONS_GLOBS],
      base: './src/content/library',
      generateId: keepPathAsId
    }),
    schema: librarySchema,
    // Note: Library symlink points to 图书馆/, which includes 项目/ and 文献/
    // We need to filter these out. This can be done via:
    // 1. Custom loader that filters paths
    // 2. More specific symlink structure (separate symlinks for each subdirectory)
    // For now, we'll rely on the fact that 项目/ and 文献/ have their own collections
    // and can be filtered at query time if needed.
  }),
  publications: defineCollection({
    loader: publicationsLoader(),
    schema: publicationsSchema,
  }),
};

