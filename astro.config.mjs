// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import wikiLink from 'remark-wiki-link';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import { visit } from 'unist-util-visit';
import remarkObsidianImage from './src/utils/remark-obsidian-image.js';
import remarkObsidianCallouts from './src/utils/remark-obsidian-callouts.js';
import rehypeCallouts from './src/utils/rehype-callouts.js';

/**
 * Remark plugin to inject locale awareness into WikiLinks.
 * Assumes 'remark-wiki-link' has already run and created 'wikiLink' nodes.
 */
const wikiLinkWithLocale = () => {
  return (/** @type {import('mdast').Root} */ tree, /** @type {import('vfile').VFile} */ file) => {
    // file parameter is optional and should not cause early exit
    if (!tree) return tree;
    
    const filePath = file?.history?.[0] ?? '';
    const fmLang = file?.data?.astro?.frontmatter?.lang;
    const inferredFromPath = filePath.includes('/en/') ? 'en' : (filePath.includes('/zh/') ? 'zh' : undefined);
    const lang = fmLang || inferredFromPath || 'zh';

    const normalize = (/** @type {string} */ value) =>
      value
        .split('/')
        .map((/** @type {string} */ segment) =>
          segment
            .trim()
            .replace(/[\s_]+/g, '-')
            .toLowerCase()
        )
        .join('/');

    visit(tree, 'wikiLink', (/** @type {any} */ node) => {
      const permalink = node.data?.permalink || node.value;
      if (!permalink) return;

      let href;
      if (permalink.startsWith('/')) {
        href = permalink;
      } else {
        const normalized = normalize(permalink);
        if (normalized.startsWith('en/')) {
          href = `/en/library/${normalized.slice(3)}`;
        } else if (normalized.startsWith('zh/')) {
          href = `/zh/library/${normalized.slice(3)}`;
        } else {
          href = `/${lang}/library/${normalized}`;
        }
      }

      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};
      
      node.data.hProperties.href = href;
      node.data.hProperties.className = ['internal-link'];
    });
    
    // Always return the tree to maintain the processing pipeline
    return tree;
  };
};

// https://astro.build/config
export default defineConfig({
  redirects: {
    '/': '/zh/'
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js']
      }
    },
    resolve: {
      alias: {
        // Prevent Vite from trying to resolve pagefind at build time
        '/pagefind/pagefind.js': '/pagefind/pagefind.js'
      }
    }
  },
  markdown: {
    remarkPlugins: [
      remarkObsidianCallouts(), // Transform Obsidian callouts (> [!INFO]) to directives
      remarkDirective, // Parse directives (:::info[...]:::) 
      remarkObsidianImage(), // Transform ![[image.png]] to ![](/attachments/image.png)
      [wikiLink, { aliasDivider: '|' }], // Parse [[WikiLinks]] syntax
      /** @type {any} */ (wikiLinkWithLocale()) // Transform [[links]] hrefs
    ],
    rehypePlugins: [
      // IMPORTANT: remarkDirectiveRehype MUST be in rehypePlugins, not remarkPlugins.
      // This bridge plugin operates on HAST (HTML AST), not MDAST (Markdown AST).
      // Placing it in remarkPlugins would cause it to receive incompatible node types
      // and fail to convert remark directives to HTML nodes, breaking the callout pipeline.
      /** @type {any} */ (remarkDirectiveRehype), // Convert remark directives to rehype nodes (bridge plugin)
      rehypeCallouts // Transform callout directives to styled HTML
    ]
  }
});
