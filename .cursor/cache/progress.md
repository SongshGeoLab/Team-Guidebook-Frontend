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

- **Content Sync & Header Navigation (Step 3 + Bugfix)**:
    - Added `scripts/setup-content.mjs` with dual-mode strategy:
        - `CONTENT_DIR` symlink to `.content/`
        - `CONTENT_REPO_URL` (+ optional `CONTENT_REPO_REF`) clone into `.content/`
        - Fallback to local `Team-Guidebook/`
    - Wired `predev`/`prebuild` and `setup:content` scripts to prepare `.content/` before dev/build.
    - Implemented `Header.astro`: URL-based locale detection, `/zh` ⇄ `/en` switch, 7 main nav links (Home/News/Projects/Library/Publications/People/About).

- **Obsidian Syntax Integration (Step 4)**:
    - **Callouts Support**:
        - Installed `remark-directive` and `remark-directive-rehype` for directive processing.
        - Created `src/utils/remark-obsidian-callouts.js`: Transforms Obsidian callout syntax `> [!INFO] Title` to directive format `:::info[Title]`.
        - Created `src/utils/rehype-callouts.js`: Transforms directive nodes to styled HTML `<aside>` elements with CSS classes.
        - Added comprehensive callout styles in `src/styles/global.css` supporting all Obsidian callout types (note, info, warning, danger, tip, success, question, failure, bug, example, quote).
    - **Image Embed Support**:
        - Created `src/utils/remark-obsidian-image.js`: Transforms `![[image.png]]` syntax to standard Markdown `![](/attachments/image.png)`.
        - Handles nested paths: `![[path/to/image.png]]` → `![](/attachments/path/to/image.png)`.
        - Added image collision detection and warnings in attachment sync.
    - **Attachment Sync**:
        - Enhanced `scripts/setup-content.mjs` with `syncAttachments()` function:
            - Automatically syncs `Team-Guidebook/assets/` and `Team-Guidebook/图片库/` to `public/attachments/`.
            - Handles both symlink and clone scenarios.
            - Detects and warns about filename collisions.
        - Attachments are synced during `predev` and `prebuild` phases.
    - **Plugin Configuration**:
        - Updated `astro.config.mjs` with proper plugin order:
            1. `remarkObsidianCallouts` - Convert Obsidian callouts to directives
            2. `remarkDirective` - Parse directive syntax
            3. `remarkObsidianImage` - Convert image embeds
            4. `wikiLinkWithLocale()` - Convert WikiLinks
            5. `remarkDirectiveRehype` (rehype) - Convert directives to HTML nodes
            6. `rehypeCallouts` (rehype) - Render callouts as styled HTML
        - All plugins properly integrated into Astro's markdown processing pipeline.
    - **Styling**:
        - Added `.internal-link` class styles for WikiLinks (dotted underline, blue color).
        - Added `.obsidian-image` class for embedded images (rounded corners, shadow).
        - Comprehensive callout styles with color-coded borders and backgrounds for each type.

- **Content Collections & Schema (Step 5)**:
    - **Schema Definition** (`src/content/config.ts`):
        - Created comprehensive Zod schemas for all collections: `people`, `projects`, `news`, `library`, `publications`.
        - Defined `baseSchema` with common fields: `publish` (boolean, default true), `date` (date/string with transform), `tags` (array/null handling).
        - **People Schema**: Includes `id`, `name`, `role`, `avatar`, `email`, `aliases` (for `#P/<Name>` resolution), `links`, `interests`.
        - **Projects Schema**: Includes `id`, `title`, `start_date`, `end_date`, `people` (array of Person IDs), `repo`, `bib_key`.
        - **News Schema**: Includes `date`, `content` (HTML), `related_people` (resolved from `#P/<Name>` tags). Note: Requires custom loader for Daily Notes extraction (TODO).
        - **Library Schema**: Permissive schema using `.passthrough()` to allow extra fields, includes `title`, `lang` (optional).
        - **Publications Schema**: Includes `title`, `authors`, `venue`, `year`, `bib_key`, `doi`, `pdf`, `tags`.
        - All schemas handle `null` values gracefully (especially for arrays) and transform date strings to Date objects.
    - **Direct Map Strategy**:
        - Enhanced `scripts/setup-content.mjs` with `setupContentCollections()` function.
        - Creates symlinks from `src/content/{collection}/` to corresponding directories in `.content/Team-Guidebook/`:
            - `src/content/people` → `.content/Team-Guidebook/通讯录/`
            - `src/content/projects` → `.content/Team-Guidebook/图书馆/项目/`
            - `src/content/library` → `.content/Team-Guidebook/图书馆/`
            - `src/content/publications` → `.content/Team-Guidebook/图书馆/文献/`
        - Symlinks are created automatically during `predev` and `prebuild` phases.
        - Handles edge cases: removes existing files/directories before creating symlinks, detects and handles regular files vs symlinks.
    - **Content Collections Configuration**:
        - All collections defined in `src/content/config.ts` using `defineCollection()`.
        - Collections automatically read from symlinked directories in `src/content/`.
        - Type-safe access via `getCollection()` API with full TypeScript type inference.
    - **Testing**:
        - Created `src/pages/test-collections.astro` to verify Content Collections are working correctly.
        - Test page displays counts and sample entries from all collections.
        - Verified data loading: People (1 item), Library (16 items), Projects (0 published items), Publications (0 items).
