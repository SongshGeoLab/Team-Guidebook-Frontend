// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import wikiLink from 'remark-wiki-link';

/**
 * Wrap remark-wiki-link to inject locale awareness from the Markdown file.
 * It tries, in order:
 * 1) frontmatter `lang`
 * 2) file path containing `/en/` -> en
 * 3) fallback `zh`
 */
const wikiLinkWithLocale = () => {
  return (
    /** @type {import('mdast').Root} */ tree,
    /** @type {import('vfile').VFile} */ file
  ) => {
    const filePath = file?.history?.[0] ?? '';
    const fmLang = file?.data?.astro?.frontmatter?.lang;
    const inferredFromPath = filePath.includes('/en/') ? 'en' : (filePath.includes('/zh/') ? 'zh' : undefined);
    const lang = fmLang || inferredFromPath || 'zh';

    const hrefTemplate = (/** @type {string} */ permalink) => {
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

      if (permalink.startsWith('/')) return permalink;

      const normalized = normalize(permalink);

      if (normalized.startsWith('en/')) {
        return `/en/library/${normalized.slice(3)}`;
      }
      if (normalized.startsWith('zh/')) {
        return `/zh/library/${normalized.slice(3)}`;
      }
      return `/${lang}/library/${normalized}`;
    };

    const linkPlugin = /** @type {any} */ (wikiLink);
    return linkPlugin({
      aliasDivider: '|',
      wikiLinkClassName: 'internal-link',
      hrefTemplate
    })(tree, file);
  };
};

// https://astro.build/config
export default defineConfig({
  redirects: {
    '/': '/zh/'
  },
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    remarkPlugins: [
      wikiLinkWithLocale()
    ]
  }
});