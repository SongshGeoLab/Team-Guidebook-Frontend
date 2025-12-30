## Tech Stack

### Principles
- Static-first, content-driven.
- Schema-validated content, typed build pipeline.
- Minimal runtime dependencies.

### Core
- Framework: Astro 5+
- Language: TypeScript

### Content Pipeline
- Source: Obsidian-driven content (primary: `Team-Guidebook`), with a dual-mode sync strategy:
  - Dev: symlink local Obsidian vault (or a subfolder) into the project content directory
  - CI: git clone content repository at build time
- Formats:
  - Markdown/MDX (pages and long-form content)
  - YAML front matter / YAML data (structured metadata)
  - BibTeX (`.bib`) for publications
  - Obsidian Daily Notes for News (`Team-Guidebook/档案馆/YYYY-MM-DD.md`)
  - Inline people tags: `#P/<Name>` (resolved via People `aliases`)
- Parsing & validation:
  - Astro Content Collections (Zod schema validation + type generation)
  - `citation-js` (BibTeX -> JSON + formatted citations)
  - Obsidian markdown extensions (WikiLinks, Callouts, `![[...]]` attachments) via remark/rehype
    - **`remark-wiki-link`**: Configured in `astro.config.mjs` to parse `[[WikiLinks]]`.
      - **Locale-Aware Resolution**: Wrapped in `wikiLinkWithLocale()` to infer language from file path or frontmatter.
      - **URL Normalization**: Converts WikiLink targets to kebab-case (spaces/underscores → hyphens, lowercase).
      - **Path Mapping**: Defaults to `/<lang>/library/...` but supports explicit language prefixes (`[[en/Page]]`, `[[zh/Page]]`).
      - **Styling**: Generates links with `internal-link` class for frontend styling (see `FRONTEND_GUIDELINES.md`).
      - **Alias Support**: Handles `[[Page|Display Text]]` syntax.
    - **`remark-gh-admonitions`** (or similar): For Obsidian Callouts.

### UI
- Styling: Tailwind CSS (v4 via `@tailwindcss/vite`)
- Components: shadcn/ui (Radix UI) - *Planned*
- Icons: Lucide

### Search
- Pagefind (static full-text search)

### i18n
- Astro i18n routing (locale-prefixed routes: `/zh/...`, `/en/...`)

### Comments
- Giscus (GitHub Discussions-based, client-side embedding)

### Build & Deploy
- Output: pure static HTML (`output: "static"`)
- Hosting: GitHub Pages (default), compatible with any static host.
