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

### UI
- Styling: Tailwind CSS
- Components: shadcn/ui (Radix UI)
- Icons: Lucide

### Search
- Pagefind (static full-text search)

### i18n
- Astro i18n routing (locale-prefixed routes)

### Comments
- GitHub Issues-based comments (one issue/discussion thread per content item, embedded client-side)

### Build & Deploy
- Output: pure static HTML (`output: "static"`)
- Hosting: any static hosting or a Go web server for distribution
