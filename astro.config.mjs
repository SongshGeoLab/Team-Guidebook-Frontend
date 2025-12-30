// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import wikiLink from 'remark-wiki-link';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    remarkPlugins: [
      [wikiLink, {
        aliasDivider: '|',
        hrefTemplate: (permalink) => {
          // Remove hardcoded /zh/ prefix to allow relative resolution
          // or allow the permalink to define the path
          if (permalink.startsWith('/')) return permalink;
          return permalink;
        }
      }]
    ]
  }
});