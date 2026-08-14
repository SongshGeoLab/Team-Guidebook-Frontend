import type { Loader, LoaderContext } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { entrySlug } from '../../utils/entrySlug';
import { parseCalendarDate } from '../../utils/formatDate';
import fg from 'fast-glob';
import { renderMarkdown } from '../../utils/render-markdown.js';

// Define the shape of the news item
// Must match the schema in config.ts (minus the Zod transformation, or pre-transformation)
interface NewsItem {
  id: string;
  date: Date;
  title: string;
  content: string;
  related_people: string[];
  tags: string[];
  publish: boolean;
}

// Helper to resolve the content root
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
    // Check if it looks like Team-Guidebook (has 档案馆, etc)
    if (fs.existsSync(path.join(dotContent, '档案馆'))) {
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

// Helper to load people aliases -> id map
function loadPeopleMap(contentRoot: string): Record<string, string> {
  const peopleDir = path.join(contentRoot, '通讯录');
  if (!fs.existsSync(peopleDir)) return {};

  const files = fg.globSync('*.md', { cwd: peopleDir });
  const aliasMap: Record<string, string> = {};

  for (const file of files) {
    const filePath = path.join(peopleDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    
    // The canonical id is the one declared in frontmatter — that is what the
    // person route is built from. Deriving it from the filename produced
    // "Boyu Wang", which matches no route.
    const id = entrySlug({ id: file, data });

    // Every spelling an author might use resolves to that one id.
    const keys = [data.id, path.basename(file, '.md'), data.name, ...(Array.isArray(data.aliases) ? data.aliases : [])];
    for (const key of keys) {
      if (typeof key === 'string' && key.trim()) aliasMap[key.trim()] = id;
    }
  }
  return aliasMap;
}

export function newsLoader(): Loader {
  return {
    name: 'news-loader',
    load: async (context: LoaderContext) => {
      const contentRoot = getContentRoot();
      const newsDir = path.join(contentRoot, '档案馆');
      const aliasMap = loadPeopleMap(contentRoot);

      if (!fs.existsSync(newsDir)) {
        context.logger.warn(`News directory not found: ${newsDir}`);
        return;
      }

      const files = await fg.glob('*.md', { cwd: newsDir });
      
      for (const file of files) {
        const filePath = path.join(newsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Strict opt-in: must have publish: true AND not be draft
        if (data.publish !== true || data.draft === true) {
          continue;
        }

        // Date from filename (YYYY-MM-DD.md) or frontmatter
        let date = data.date;
        if (!date) {
          const basename = path.basename(file, '.md');
          // Try to parse YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
            // Explicit UTC: `new Date('2025-12-17')` is already UTC midnight,
            // but say so, because publicationsLoader used local midnight and
            // the two conventions disagreed across a day boundary.
            date = parseCalendarDate(basename);
          } else {
             // If not YYYY-MM-DD, skip or use mtime? 
             // Plan implies Daily Notes are YYYY-MM-DD
             continue; 
          }
        }

        // Extract bullets
        // Simple regex to find lines starting with - or *
        const lines = content.split('\n');
        let bulletIndex = 0;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletContent = trimmed.substring(2).trim();
            if (!bulletContent) continue;

            // Extract tags (#Tag) and People (#P/Name)
            const relatedPeople: string[] = [];
            const tags: string[] = [];

            // Regex for #P/Name
            // Matches #P/Name where Name can be Chinese, English, spaces etc.
            // Until next space or end of line.
            const pRegex = /#P\/([^\s.,;!?]+)/g;
            let pMatch;
            while ((pMatch = pRegex.exec(bulletContent)) !== null) {
              const name = pMatch[1];
              // Resolve alias
              if (aliasMap[name]) {
                relatedPeople.push(aliasMap[name]);
              } else {
                // Never fail silently here: this warning was commented out, and
                // that is the only reason 100% of #P/ tags going unresolved went
                // unnoticed. Content authors need to see their typo.
                context.logger.warn(
                  `[news] unresolved #P/${name} in ${path.basename(file)} — ` +
                  `no entry in 通讯录/ has that id, name or alias`
                );
              }
            }

            // Regex for other tags #Tag (excluding #P/)
            // Negative lookahead for P/
            const tagRegex = /#(?!(?:P\/))([^\s.,;!?]+)/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(bulletContent)) !== null) {
              tags.push(tagMatch[1]);
            }

            // Render through the same plugin chain the rest of the site uses,
            // then sanitise. `marked` bypassed both: no wiki links, no callouts,
            // and no sanitiser in front of dangerouslySetInnerHTML.
            const html = await renderMarkdown(bulletContent);

            // Create ID: Date-Index
            const id = `${path.basename(file, '.md')}-${bulletIndex++}`;
            
            // Format title as YYYY-MM-DD (matches basename usually)
            const title = date instanceof Date 
              ? date.toISOString().split('T')[0]
              : path.basename(file, '.md');

            context.store.set({
              id,
              data: {
                date,
                title,
                content: html,
                related_people: [...new Set(relatedPeople)], // Deduplicate
                tags: [...new Set(tags)],
                publish: true
              }
            });
          }
        }
      }
    }
  };
}

