## 2025-12-30

- **Initial Setup**:
    - Created Astro 5 + TypeScript + Tailwind project skeleton using `npm create astro@latest`.
    - Integrated Tailwind CSS via `@tailwindcss/vite` plugin.
    - Set up directory structure: `src/layouts`, `src/components`, `src/content`, `src/pages`.
    - Installed `remark-wiki-link` for Obsidian compatibility.
    - Added `src/layouts/BaseLayout.astro`.
    - Verified `npm run dev` works correctly.

- **i18n Routing & Navigation (Step 2)**:
    - Implemented locale-prefixed routing (`/zh/` and `/en/`) with language switching in Header component.
    - Created 7 section placeholder pages: Home, News, Projects, Library, Publications, People, About (both `/zh/` and `/en/` versions).
    - Configured root redirect (`/` → `/zh/`) using `redirects` in `astro.config.mjs` (static mode compatible).
    - Removed conflicting `src/pages/index.astro` to avoid build conflicts.

- **WikiLink Integration & Bug Fixes**:
    - Implemented `wikiLinkWithLocale()` wrapper function in `astro.config.mjs` to inject locale awareness into WikiLink resolution.
    - Language inference: from frontmatter `lang`, file path (`/en/` or `/zh/`), or defaults to `zh`.
    - WikiLink `hrefTemplate` now correctly maps `[[...]]` to `/<lang>/library/...` with kebab-case normalization (spaces/underscores → hyphens, lowercase).
    - Added `wikiLinkClassName: 'internal-link'` to match frontend styling contract in `FRONTEND_GUIDELINES.md`.
    - Supports explicit language prefixes in WikiLinks: `[[en/SomePage]]` or `[[zh/SomePage]]` override inferred locale.
    - Fixed plugin invocation: `wikiLinkWithLocale()` must be called to return the actual remark plugin.
