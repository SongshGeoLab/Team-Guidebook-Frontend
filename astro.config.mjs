// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import wikiLink from 'remark-wiki-link';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkObsidianLinks, { buildContentIndex } from './src/utils/obsidian-links.js';
import remarkObsidianCallouts from './src/utils/remark-obsidian-callouts.js';
import rehypeCallouts from './src/utils/rehype-callouts.js';

// Built once per process and shared by every markdown file, instead of
// re-globbing the whole vault for each page.
const contentIndex = buildContentIndex();

// https://astro.build/config
export default defineConfig({
  // Required for absolute canonical / hreflang / OG URLs. Override with
  // SITE_URL once a custom domain is in front of the Vercel deployment.
  site: process.env.SITE_URL || 'https://team-guidebook-frontend.vercel.app',
  redirects: {
    '/': '/en/'
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
      // NOTE: remark-wiki-link is a micromark *syntax* extension, so it runs at
      // parse time — before every transformer below, whatever the array order.
      // `pageResolver` is the identity here so the raw target survives to
      // remarkObsidianLinks, which resolves it against the on-disk index.
      // The old default lowercased the name and dropped its directory, which is
      // why every wiki link 404'd.
      [wikiLink, { aliasDivider: '|', pageResolver: (/** @type {string} */ name) => [name] }],
      /** @type {any} */ (remarkObsidianLinks({ index: contentIndex }))
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
