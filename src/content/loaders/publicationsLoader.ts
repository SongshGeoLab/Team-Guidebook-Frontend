import type { Loader, LoaderContext } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

// Import citation-js at the top level to avoid module loading issues during build
// Use lazy evaluation to avoid loading if not needed
let CiteClass: any = null;
let citationJsLoaded = false;

async function ensureCitationJs(): Promise<any> {
  if (citationJsLoaded && CiteClass) {
    return CiteClass;
  }
  
  try {
    const citationJsModule = await import('@citation-js/core');
    CiteClass = citationJsModule.Cite;
    
    if (!CiteClass) {
      throw new Error('Cite class not found in @citation-js/core module');
    }
    
    // Import and register BibTeX plugin
    try {
      const bibtexPlugin = await import('@citation-js/plugin-bibtex');
      if (bibtexPlugin.default) {
        if (typeof bibtexPlugin.default === 'function') {
          bibtexPlugin.default(CiteClass);
        } else if (CiteClass.plugins && typeof CiteClass.plugins.add === 'function') {
          CiteClass.plugins.add(bibtexPlugin.default);
        }
      }
    } catch (err) {
      // Plugin might auto-register on import, continue anyway
      // This is not critical, as the plugin may auto-register
      if (err instanceof Error) {
        console.warn(`BibTeX plugin registration: ${err.message}`);
      }
    }
    
    citationJsLoaded = true;
    return CiteClass;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    throw new Error(
      `Failed to load @citation-js/core: ${errorMessage}${errorStack ? `\n${errorStack}` : ''}`
    );
  }
}

// Define the shape of the publication item
// Must match the schema in config.ts
interface PublicationItem {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year: number;
  bib_key?: string;
  bibtex?: string;
  doi?: string;
  pdf?: string;
  tags: string[];
  publish: boolean;
  date?: Date;
}

// Helper to resolve the content root (same as newsLoader)
function getContentRoot() {
  const cwd = process.cwd();
  // Check .content/Team-Guidebook
  const contentInDotContent = path.join(cwd, '.content', 'Team-Guidebook');
  if (fs.existsSync(contentInDotContent)) {
    return contentInDotContent;
  }
  // Check .content directly (if it is Team-Guidebook)
  const dotContent = path.join(cwd, '.content');
  if (fs.existsSync(dotContent)) {
    // Check if it looks like Team-Guidebook (has 图书馆, etc)
    if (fs.existsSync(path.join(dotContent, '图书馆'))) {
      return dotContent;
    }
  }
  // Fallback to local Team-Guidebook
  const local = path.join(cwd, 'Team-Guidebook');
  if (fs.existsSync(local)) {
    return local;
  }
  throw new Error('Content root not found. Please run npm run setup:content');
}

/**
 * Extract individual BibTeX entries from a BibTeX file.
 * Returns a map of citation key -> BibTeX string.
 * Handles multi-line entries and nested braces.
 */
function extractBibEntries(bibContent: string): Record<string, string> {
  const entries: Record<string, string> = {};
  
  // Match BibTeX entries: @type{key, ...}
  // This regex handles:
  // - Entry type: @article, @inproceedings, etc.
  // - Citation key: first string after opening brace
  // - Entry content: everything until matching closing brace (handles nested braces)
  const entryRegex = /@(\w+)\s*\{([^,\s]+)\s*,/g;
  let match;
  let lastIndex = 0;
  
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
 */
function parseBibEntry(entry: any, bibKey: string, originalBibtex?: string): PublicationItem | null {
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
        authors = entry.author.split(/\s+and\s+/i).map(a => a.trim()).filter(Boolean);
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

    // Extract PDF path (if stored in attachments)
    // BibTeX might have a file field or custom field
    const pdf = entry.file || entry.pdf || '';

    // Extract tags from keywords or custom fields
    let tags: string[] = [];
    if (entry.keywords) {
      if (Array.isArray(entry.keywords)) {
        tags = entry.keywords.map(k => String(k).trim()).filter(Boolean);
      } else if (typeof entry.keywords === 'string') {
        tags = entry.keywords.split(/[,;]/).map(k => k.trim()).filter(Boolean);
      }
    }

    // Use bib_key as the ID
    const id = bibKey;

    return {
      id,
      title,
      authors,
      venue: venue || undefined,
      year: year || new Date().getFullYear(), // Fallback to current year if missing
      bib_key: bibKey,
      bibtex: originalBibtex || undefined, // Store original BibTeX for copying
      doi: doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : undefined,
      pdf: pdf || undefined,
      tags,
      publish: true, // Default to published unless specified otherwise
      date: year ? new Date(year, 0, 1) : undefined, // Use year as date
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
      const contentRoot = getContentRoot();
      
      // Try 图书馆/文献/ first, then fallback to 图书馆/ root
      const publicationsDir = path.join(contentRoot, '图书馆', '文献');
      const libraryRoot = path.join(contentRoot, '图书馆');
      
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

      // Ensure citation-js is loaded
      let Cite: any;
      try {
        Cite = await ensureCitationJs();
      } catch (err) {
        // Use warn instead of error since build can continue without publications
        // This allows the site to build successfully even if BibTeX parsing is unavailable
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
            const bibKey = entry.id || entry['citation-key'] || `entry-${Math.random().toString(36).substr(2, 9)}`;
            
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
            
            const publication = parseBibEntry(entry, bibKey, bibtexString);

            if (publication) {
              context.store.set({
                id: publication.id,
                data: {
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
                }
              });
            }
          }
        } catch (error) {
          context.logger.error(`Error processing BibTeX file ${bibFile}:`, error);
          // Continue processing other files
        }
      }
    }
  };
}

