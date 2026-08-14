// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import wikiLink from 'remark-wiki-link';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkObsidianLinks, { buildContentIndex } from './src/utils/obsidian-links.js';
import remarkObsidianCallouts from './src/utils/remark-obsidian-callouts.js';
import remarkReviveDirectives from './src/utils/remark-revive-directives.js';
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
  integrations: [react(), sitemap()],
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
      // Must sit after remarkDirective: it undoes the text/leaf directives that
      // plugin claims from ordinary prose, e.g. the `:15` in a `19:15` timestamp.
      /** @type {any} */ (remarkReviveDirectives()),
      [wikiLink, { aliasDivider: '|', pageResolver: (/** @type {string} */ name) => [name] }],
      /** @type {any} */ (remarkObsidianLinks({ index: contentIndex }))
    ],
    rehypePlugins: [
      // Keep this in rehypePlugins. Moving it to remarkPlugins does make the
      // hand-written `:::info` form render, but it overwrites the data.hName /
      // hProperties that remark-obsidian-callouts already set, so data-callout
      // and data-title are lost and every Obsidian callout promotes its body
      // text to the title. Verified by trying it.
      /** @type {any} */ (remarkDirectiveRehype), // Convert remark directives to rehype nodes (bridge plugin)
      rehypeCallouts // Transform callout directives to styled HTML
    ]
  }
});
