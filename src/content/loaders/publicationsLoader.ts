import type { Loader, LoaderContext } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import {
  getContentRoot,
  VAULT_DIRS,
  PUBLICATION_SIDECAR_DIR,
} from '../../utils/contentLayout.js';

// Use createRequire to load CommonJS modules robustly in all environments
const require = createRequire(import.meta.url);

// Define the shape of the publication item
// Must match the schema in config.ts
interface PublicationItem {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  bib_key?: string;
  bibtex?: string;
  doi?: string;
  pdf?: string;
  tags: string[];
  publish: boolean;
  date?: Date;
}

/** Zotero writes these into `keywords`; they are not research topics. */
const LANGUAGE_KEYWORDS = new Set(['english', 'chinese', '中文', '英文']);

/** What each BibTeX entry type means as a publication kind. */
const TYPE_BY_BIBTEX_TYPE: Record<string, PublicationType> = {
  article: 'journal',
  inproceedings: 'conference',
  conference: 'conference',
  proceedings: 'conference',
  incollection: 'chapter',
  inbook: 'chapter',
  book: 'book',
  phdthesis: 'thesis',
  mastersthesis: 'thesis',
  // @misc is what Zotero writes for a preprint, and preprints are the entries a
  // reader most needs distinguished from peer-reviewed work.
  misc: 'preprint',
  unpublished: 'preprint',
};

export type PublicationType =
  | 'journal'
  | 'conference'
  | 'preprint'
  | 'chapter'
  | 'book'
  | 'thesis'
  | 'other';

/**
 * Read the entry type out of the raw BibTeX text.
 *
 * citation-js normalises `type` onto CSL names that collapse distinctions we
 * want (both @article and @misc can arrive as 'article-journal'), so take it
 * from the `@type{` token that `extractBibEntries` preserved verbatim.
 */
export function inferPublicationType(originalBibtex: string | undefined): PublicationType {
  const match = /^\s*@(\w+)\s*\{/m.exec(originalBibtex ?? '');
  if (!match) return 'other';
  return TYPE_BY_BIBTEX_TYPE[match[1].toLowerCase()] ?? 'other';
}

/** Fields a sidecar note may contribute to a publication. */
export interface PublicationSidecar {
  bib_key: string;
  featured?: boolean;
  order?: number;
  cover?: string;
  highlight?: string;
  highlight_en?: string;
  author_ids?: string[];
  code?: string;
  data?: string;
  type?: PublicationType;
  press?: Array<{ outlet: string; outlet_en?: string; url: string; date?: string | Date }>;
}

/**
 * Read the sidecar notes that enrich individual BibTeX entries.
 *
 * A `.bib` file is regenerated wholesale by Zotero, which drops any field it
 * does not recognise — so a cover image or a one-line highlight written into
 * the .bib would survive exactly until the next export. They live in
 * `文献/精选/<bib_key>.md` instead and are joined here on the citation key.
 *
 * @param warn called with an actionable message for each sidecar that matches
 *   no entry — silence would leave an author wondering why their highlight
 *   never appeared.
 */
export function loadSidecars(
  dir: string,
  knownKeys: Set<string>,
  warn: (message: string) => void = () => {}
): Map<string, PublicationSidecar> {
  const sidecars = new Map<string, PublicationSidecar>();
  if (!fs.existsSync(dir)) return sidecars;

  for (const file of fg.globSync('**/*.md', { cwd: dir })) {
    const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf-8'));
    if (data.publish === false) continue;

    // Default the key to the filename: naming the file after the citation key
    // is the obvious convention, and repeating it in frontmatter is a second
    // place to get it wrong.
    const bibKey = String(data.bib_key ?? path.basename(file, '.md')).trim();
    if (!bibKey) continue;

    if (!knownKeys.has(bibKey)) {
      warn(
        `[publications] sidecar ${file} references bib_key "${bibKey}", which no ` +
          `.bib entry defines — the highlight will not appear on any publication`
      );
      continue;
    }
    sidecars.set(bibKey, { ...(data as PublicationSidecar), bib_key: bibKey });
  }
  return sidecars;
}

/**
 * Extract individual BibTeX entries from a BibTeX file.
 * Returns a map of citation key -> BibTeX string.
 * Handles multi-line entries and nested braces.
 *
 * Exported for testing: this is a hand-rolled scanner, and the bugs it has had
 * (silently corrupting entries) were only ever caught by eye on the built site.
 */
export function extractBibEntries(bibContent: string): Record<string, string> {
  const entries: Record<string, string> = {};
  
  // Match BibTeX entries: @type{key, ...}
  // This regex handles:
  // - Entry type: @article, @inproceedings, etc.
  // - Citation key: first string after opening brace
  // - Entry content: everything until matching closing brace (handles nested braces)
  const entryRegex = /@(\w+)\s*\{([^,\s]+)\s*,/g;
  let match;
  
  const matches: Array<{ key: string; start: number }> = [];
  
  // Find all entry starts
  while ((match = entryRegex.exec(bibContent)) !== null) {
    const key = match[2].trim();
    const start = match.index;
    matches.push({ key, start });
  }
  
  // Extract each entry by finding matching braces
  for (let i = 0; i < matches.length; i++) {
    const { key, start } = matches[i];
    const nextStart = i < matches.length - 1 ? matches[i + 1].start : bibContent.length;
    
    // Find the opening brace after @type
    const openBracePos = bibContent.indexOf('{', start);
    if (openBracePos === -1) continue;
    
    // Find matching closing brace (handle nested braces)
    let braceCount = 0;
    let endPos = openBracePos;
    
    for (let j = openBracePos; j < nextStart && j < bibContent.length; j++) {
      if (bibContent[j] === '{') braceCount++;
      if (bibContent[j] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endPos = j + 1;
          break;
        }
      }
    }
    
    if (braceCount === 0) {
      entries[key] = bibContent.substring(start, endPos).trim();
    }
  }
  
  return entries;
}

/**
 * Parse BibTeX entry to extract publication data.
 * Handles common BibTeX fields and converts to our schema format.
 * @param entry - Citation-js entry object
 * @param bibKey - BibTeX citation key
 * @param originalBibtex - Original BibTeX string for this entry (optional)
 *
 * Exported for testing. Every field mapping below encodes a bug that reached
 * production once (`keyword` vs `keywords`, local `file=` paths, the missing
 * year falling back to "now"); the tests pin each one.
 */
export function parseBibEntry(
  entry: any,
  bibKey: string,
  originalBibtex?: string,
  warn: (message: string) => void = () => {}
): PublicationItem | null {
  try {
    // Extract basic fields
    const title = entry.title || entry['title'] || '';
    if (!title) {
      return null; // Skip entries without title
    }

    // Extract authors - citation-js formats this as an array of objects with given/family
    let authors: string[] = [];
    if (entry.author) {
      if (Array.isArray(entry.author)) {
        authors = entry.author.map((author: any) => {
          if (typeof author === 'string') return author;
          // Handle structured author objects
          const given = author.given || author.first || '';
          const family = author.family || author.last || '';
          return given && family ? `${given} ${family}` : family || given || '';
        });
      } else if (typeof entry.author === 'string') {
        // Split by "and" if it's a string
        authors = entry.author.split(/\s+and\s+/i).map((a: string) => a.trim()).filter(Boolean);
      }
    }

    // Extract year
    let year = 0;
    if (entry.issued?.['date-parts']?.[0]?.[0]) {
      year = entry.issued['date-parts'][0][0];
    } else if (entry.year) {
      year = typeof entry.year === 'number' ? entry.year : parseInt(String(entry.year), 10);
    } else if (entry['date-parts']?.[0]?.[0]) {
      year = entry['date-parts'][0][0];
    }

    // Extract venue (journal, booktitle, etc.)
    const venue = entry['container-title'] || 
                  entry.journal || 
                  entry.booktitle || 
                  entry.publisher || 
                  '';

    // Extract DOI
    const doi = entry.DOI || entry.doi || '';

    // Extract PDF path (if stored in attachments).
    // Zotero exports `file = {Name:/Users/.../paper.pdf:application/pdf}` — an
    // absolute local path that is meaningless as a web URL, so only accept
    // values that can actually be served.
    // citation-js drops BibTeX's `file` field entirely, so read it back out of
    // the original entry text we already keep for the "Copy BibTeX" button.
    const fileFromBibtex = originalBibtex?.match(/^\s*(?:file|pdf)\s*=\s*\{([^}]*)\}/im)?.[1] ?? '';
    const rawPdf = String(entry.file || entry.pdf || fileFromBibtex || '');
    const pdf = /^(https?:\/\/|\/)/.test(rawPdf) ? rawPdf : '';
    if (rawPdf && !pdf) {
      // Silently dropping it is the very failure mode this loader was fixed for.
      warn(
        `[publications] ${bibKey}: ignoring unusable pdf/file value ` +
        `"${rawPdf.slice(0, 60)}" — only http(s) URLs and site-absolute paths are served`
      );
    }

    // Extract tags from keywords or custom fields.
    // NOTE: Zotero writes `keywords = {English}` on every record in this vault,
    // which produced a single meaningless facet for the whole publication list.
    // Language names are dropped so the filter reflects real topics.
    let tags: string[] = [];
    // citation-js exposes this as `keyword` (singular). Reading `keywords`
    // meant tags were ALWAYS empty — which is why the topic filter offered
    // nothing, a symptom previously misattributed to the language-name filter
    // below.
    const rawKeywords = entry.keyword ?? entry.keywords;
    if (rawKeywords) {
      if (Array.isArray(rawKeywords)) {
        tags = rawKeywords.map((k: unknown) => String(k).trim()).filter(Boolean);
      } else if (typeof rawKeywords === 'string') {
        tags = rawKeywords.split(/[,;]/).map((k: string) => k.trim()).filter(Boolean);
      }
      tags = tags.filter((tag) => !LANGUAGE_KEYWORDS.has(tag.toLowerCase()));
    }

    // Use bib_key as the ID
    const id = bibKey;

    return {
      id,
      title,
      authors,
      venue: venue || undefined,
      // Do NOT fall back to the current year: that silently turned an entry
      // with an unparseable date into a brand-new publication at the top of the
      // list, with no log and no way for a reader to tell.
      year: year || undefined,
      bib_key: bibKey,
      bibtex: originalBibtex || undefined, // Store original BibTeX for copying
      doi: doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : undefined,
      pdf: pdf || undefined,
      tags,
      publish: true, // Default to published unless specified otherwise
      // Date.UTC, not new Date(y, 0, 1): the latter is *local* midnight, so
      // in UTC+8 a 2024 paper serialised via toISOString() as 2023-12-31.
      date: year ? new Date(Date.UTC(year, 0, 1)) : undefined,
    };
  } catch (error) {
    console.error(`Error parsing BibTeX entry ${bibKey}:`, error);
    return null;
  }
}

export function publicationsLoader(): Loader {
  return {
    name: 'publications-loader',
    load: async (context: LoaderContext) => {
      const contentRoot = getContentRoot(VAULT_DIRS.library);

      const loadAll = async () => {
      // Same reasoning as newsLoader: full rebuild each run, so clear first.
      // Otherwise an entry deleted from the .bib stayed on the publications
      // page indefinitely.
      context.store.clear();

      /** Every entry across every .bib, before the sidecar merge. */
      const parsed: Array<PublicationItem & { type: PublicationType }> = [];

      // Try 图书馆/文献/ first, then fallback to 图书馆/ root
      const publicationsDir = path.join(contentRoot, VAULT_DIRS.library, '文献');
      const libraryRoot = path.join(contentRoot, VAULT_DIRS.library);
      
      let searchDir = publicationsDir;
      let bibFiles: string[] = [];
      
      // First, try 图书馆/文献/ directory
      if (fs.existsSync(publicationsDir)) {
        bibFiles = await fg.glob('**/*.bib', { cwd: publicationsDir, absolute: false });
        if (bibFiles.length > 0) {
          searchDir = publicationsDir;
        }
      }
      
      // If no files found in 文献/, try 图书馆/ root
      if (bibFiles.length === 0 && fs.existsSync(libraryRoot)) {
        bibFiles = await fg.glob('*.bib', { cwd: libraryRoot, absolute: false });
        if (bibFiles.length > 0) {
          searchDir = libraryRoot;
          context.logger.info(`Found .bib files in ${libraryRoot}, using as publications source`);
        }
      }
      
      if (bibFiles.length === 0) {
        context.logger.warn(`No .bib files found in ${publicationsDir} or ${libraryRoot}`);
        return;
      }

      // Load citation-js synchronously using createRequire
      // This avoids "Vite module runner has been closed" error during build
      let Cite: any;
      try {
        const citationCore = require('@citation-js/core');
        Cite = citationCore.Cite;
        
        // Load and register BibTeX plugin
        try {
          const citationBibtex = require('@citation-js/plugin-bibtex');
          // Support different export formats (CJS/ESM interop)
          const plugin = citationBibtex.default || citationBibtex;
          
          if (typeof plugin === 'function') {
             plugin(Cite);
          } else if (Cite.plugins && typeof Cite.plugins.add === 'function') {
             Cite.plugins.add(plugin);
          }
        } catch (pluginErr) {
           context.logger.warn(`BibTeX plugin load warning: ${pluginErr instanceof Error ? pluginErr.message : String(pluginErr)}`);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        context.logger.warn(
          `Publications loader: Skipping BibTeX processing due to citation-js load failure. ` +
          `Error: ${errorMessage}. ` +
          `Please ensure @citation-js/core and @citation-js/plugin-bibtex are installed.`
        );
        return;
      }

      for (const bibFile of bibFiles) {
        const filePath = path.join(searchDir, bibFile);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        try {
          // Parse BibTeX file using citation-js
          const cite = new Cite(fileContent);
          const data = cite.data;

          // Extract individual BibTeX entries from original file
          // Split by @entry pattern and match with parsed entries
          const bibEntries = extractBibEntries(fileContent);

          // Process each entry in the BibTeX file
          for (const entry of data) {
            // Math.random() gave a keyless entry a different id, route and HTML
            // on every build, breaking reproducible builds and any external link
            // to it. Derive the id from the content instead.
            const bibKey =
              entry.id ||
              entry['citation-key'] ||
              `entry-${createHash('sha256')
                .update(JSON.stringify([entry.title ?? '', entry.author ?? '', entry.issued ?? '']))
                .digest('hex')
                .slice(0, 9)}`;
            
            // Find matching BibTeX string for this entry
            const originalBibtex = bibEntries[bibKey] || '';
            
            // Generate BibTeX from citation-js if original not found
            let bibtexString = originalBibtex;
            if (!bibtexString) {
              try {
                const entryCite = new Cite([entry]);
                bibtexString = entryCite.format('bibtex');
              } catch {
                // If format fails, skip bibtex
                bibtexString = '';
              }
            }
            
            const publication = parseBibEntry(entry, bibKey, bibtexString, (m) =>
              context.logger.warn(m)
            );

            // Collected rather than stored immediately: the sidecar join below
            // needs the full set of citation keys, so that a sidecar naming a
            // key defined in a *different* .bib file still resolves, and so an
            // unmatched one can be reported rather than silently ignored.
            if (publication) {
              parsed.push({
                ...publication,
                type: inferPublicationType(bibtexString),
              });
            }
          }
        } catch (error) {
          context.logger.error(
            `Error processing BibTeX file ${bibFile}: ${error instanceof Error ? error.message : String(error)}`
          );
          // Continue processing other files
        }
      }

      const sidecars = loadSidecars(
        path.join(searchDir, PUBLICATION_SIDECAR_DIR),
        new Set(parsed.map((p) => p.id)),
        (m) => context.logger.warn(m)
      );

      for (const publication of parsed) {
        const extra = sidecars.get(publication.id);
        const data = {
          title: publication.title,
          authors: publication.authors,
          venue: publication.venue,
          year: publication.year,
          bib_key: publication.bib_key,
          bibtex: publication.bibtex,
          doi: publication.doi,
          pdf: publication.pdf,
          tags: publication.tags,
          publish: publication.publish,
          date: publication.date,
          // The sidecar may correct an inferred type — @misc covers both a
          // preprint and a dataset, and only a human can tell them apart.
          type: extra?.type ?? publication.type,
          featured: extra?.featured ?? false,
          order: extra?.order,
          cover: extra?.cover,
          highlight: extra?.highlight,
          highlight_en: extra?.highlight_en,
          author_ids: extra?.author_ids ?? [],
          code: extra?.code,
          data: extra?.data,
          press: extra?.press ?? [],
        };

        context.store.set({
          digest: context.generateDigest?.(JSON.stringify(data)),
          id: publication.id,
          data,
        });
      }
      };

      await loadAll();

      // KNOWN LIMITATION: re-running the loader refreshes the store, but Astro
      // does not re-render the affected routes from it, so editing content in
      // dev still needs a server restart. Measured, not assumed: changing a
      // fixture daily note with the server up leaves the page unchanged.
      // The hook is kept because the loader is now re-entrant, which is the
      // prerequisite for fixing this properly.
      const bibRoot = path.join(contentRoot, VAULT_DIRS.library);
      context.watcher?.add(bibRoot);
      for (const event of ['change', 'add', 'unlink'] as const) {
        context.watcher?.on(event, (changedPath: string) => {
          if (changedPath.endsWith('.bib')) void loadAll();
        });
      }
    }
  };
}
