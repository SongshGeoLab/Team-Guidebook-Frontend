## Tech Stack

### Principles
- Static-first, content-driven.
- Schema-validated content, typed build pipeline.
- Minimal runtime dependencies.

### Core
- Framework: Astro 5+ (v5.16.6)
- Language: TypeScript (v5.9.3)
- React Integration: `@astrojs/react` (v4.2.0) - 用于 React 岛模式组件
  - React (v18.3.1) + React DOM (v18.3.1)
  - 类型支持: `@types/react` (v18.3.12), `@types/react-dom` (v18.3.1)

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
  - **Astro Content Collections** (Zod schema validation + type generation):
    - **Schema Definition** (`src/content/config.ts`): Defines Zod schemas for all collections (`people`, `projects`, `news`, `library`, `publications`).
    - **Direct Map Strategy**: Content Collections read from `src/content/{collection}/` directories, which are symlinked to `.content/Team-Guidebook/` subdirectories via `setup-content.mjs`.
    - **Type Safety**: Full TypeScript type inference for all collections via `getCollection()` API from `astro:content`.
    - **Schema Features**:
      - Handles `null` values gracefully (especially for arrays).
      - Transforms date strings to Date objects automatically.
      - Permissive schemas (e.g., Library uses `.passthrough()`) to allow extra fields.
    - **Collection Mapping**:
      - `people` → `通讯录/*.md`
      - `projects` → `图书馆/项目/*.md`
      - `library` → `图书馆/**/*.md` (excluding `项目/` and `文献/`)
      - `publications` → `图书馆/文献/*.bib` or `图书馆/*.bib` (requires custom loader for BibTeX parsing)
      - `news` → `档案馆/YYYY-MM-DD.md` (requires custom loader for bullet extraction)
  - **BibTeX Processing**:
    - **`@citation-js/core`** (v0.7.0): Core library for parsing and formatting citations. Used by `publicationsLoader.ts` to parse BibTeX files.
    - **`@citation-js/plugin-bibtex`** (v0.7.0): Plugin for BibTeX format support. Provides BibTeX input/output capabilities for citation-js.
    - **Plugin Registration**: The loader handles multiple registration strategies to ensure compatibility across different citation-js versions:
      - Auto-registration on import (preferred)
      - Function call registration: `plugin(Cite)`
      - Explicit registration: `Cite.plugins.add(plugin)`
    - **BibTeX Parsing Flow**:
      1. Scan for `.bib` files in `图书馆/文献/` or `图书馆/` root
      2. Read and parse BibTeX file content using `Cite` class
      3. Extract individual entries and their original BibTeX strings
      4. Transform citation-js entry objects to our schema format
      5. Store as publications collection items
  - **Markdown Processing**:
    - **`marked`** (v17.0.1): Markdown-to-HTML converter. Used by `newsLoader.ts` to convert bullet point content from Daily Notes to HTML.
    - **`gray-matter`** (v4.0.3): Frontmatter parser. Used by `newsLoader.ts` to extract YAML frontmatter from Daily Notes files.
    - **`fast-glob`** (v3.3.3): Fast file pattern matching library. Used by `newsLoader.ts` to scan `Team-Guidebook/档案馆/YYYY-MM-DD.md` files.
  - Obsidian markdown extensions (WikiLinks, Callouts, `![[...]]` attachments) via remark/rehype
    - **`remark-wiki-link`** (v2.0.1): Configured in `astro.config.mjs` to parse `[[WikiLinks]]`.
      - **Locale-Aware Resolution**: Wrapped in `wikiLinkWithLocale()` to infer language from file path or frontmatter.
      - **URL Normalization**: Converts WikiLink targets to kebab-case (spaces/underscores → hyphens, lowercase).
      - **Path Mapping**: Defaults to `/<lang>/library/...` but supports explicit language prefixes (`[[en/Page]]`, `[[zh/Page]]`).
      - **Styling**: Generates links with `internal-link` class for frontend styling (see `FRONTEND_GUIDELINES.md`).
      - **Alias Support**: Handles `[[Page|Display Text]]` syntax.
    - **`remark-directive`** (v4.0.0): Parses directive syntax (`:::type[title]...:::`).
      - Used as intermediate format for Obsidian callouts.
    - **`remark-directive-rehype`** (v0.4.2): Converts remark directive nodes to rehype HTML nodes.
      - Bridges the gap between remark (Markdown AST) and rehype (HTML AST).
    - **Custom Plugins**:
      - **`remark-obsidian-callouts`** (`src/utils/remark-obsidian-callouts.js`): Transforms Obsidian callout syntax `> [!INFO] Title` to directive format.
        - Visits blockquote nodes, detects `[!TYPE]` pattern, extracts type and title.
        - Supports all Obsidian callout types (case-insensitive).
      - **`remark-obsidian-image`** (`src/utils/remark-obsidian-image.js`): Transforms `![[image.png]]` to standard Markdown images.
        - Visits text nodes, matches `![[...]]` pattern, converts to image nodes with `/attachments/` prefix.
        - Handles nested paths and path normalization.
      - **`rehype-callouts`** (`src/utils/rehype-callouts.js`): Transforms directive nodes to styled HTML callouts.
        - Creates `<aside>` elements with `admonition` classes.
        - Generates title paragraphs and content structure.
    - **`unist-util-visit`** (v5.0.0): Utility for traversing and transforming AST nodes.
      - Used by all custom remark/rehype plugins.

### UI
- Styling: Tailwind CSS (v4 via `@tailwindcss/vite`)
- Components: 
  - **React Islands**: 使用 Astro 的 React 集成 (`@astrojs/react` v4.2.0) 实现岛模式架构。
    - 页面级组件位于 `src/components/react/pages/`，使用 `client:load` 指令挂载。
    - UI 组件位于 `src/components/react/ui/`，可复用。
  - shadcn/ui (Radix UI) - *Planned*
- Icons: `lucide-react` (v0.487.0) - React 图标库
- Motion/动画: 
  - `motion` (v11.11.15) - 交互动效库（原 framer-motion 的后续版本）
  - CSS 过渡和 Tailwind 动画类
- 背景/3D: 
  - `three` (v0.168.0) - WebGL 3D 库
  - `@react-three/fiber` (v8.15.16) - React Three.js 渲染器
  - `@react-three/drei` (v9.113.0) - Three.js React 工具库
  - 用于水波背景 (`RippleBackground.tsx`)，纹理位于 `public/background.jpg`
- 工具库:
  - `clsx` (v2.1.1) - 条件类名工具
  - `tailwind-merge` (v2.5.5) - Tailwind 类名合并工具
  - `class-variance-authority` (v0.7.1) - 变体类名管理

### Search
- **Pagefind** (v1.2.1): Static full-text search engine for static sites.
  - **Installation**: Installed as `devDependency` via npm.
  - **Build Integration**: 
    - Automatically runs after Astro build via `postbuild` script: `pagefind --site dist`.
    - Scans all HTML files in `dist/` directory and generates search index.
    - Index files stored in `dist/pagefind/` directory.
  - **Runtime Loading**: 
    - Uses dynamic ES module import at runtime to avoid build-time resolution issues.
    - Implemented via `Function` constructor to prevent Vite from bundling.
    - Module path `/pagefind/pagefind.js` only exists after build.
  - **Features**:
    - Full-text search across all site content.
    - Automatic language detection (supports multi-language sites).
    - Relevance-based ranking.
    - Highlights search terms in results.
    - Zero runtime dependencies (pure static).
  - **API Usage**:
    - Import: `await import('/pagefind/pagefind.js')`
    - Initialize: `await pagefindModule.init()`
    - Search: `await pagefindModule.search(query)`
    - Results include async `data()` method to load full page data.
  - **Development Mode**:
    - Search not available in dev mode (requires built HTML files).
    - Search page displays friendly message prompting user to build first.
    - Use `npm run build && npm run preview` to test search functionality.

### i18n
- Astro i18n routing (locale-prefixed routes: `/zh/...`, `/en/...`)

### Comments
- **Giscus** (GitHub Discussions-based, client-side embedding):
  - **Component**: `src/components/react/ui/GiscusComments.tsx` - React component that dynamically loads Giscus script.
  - **Configuration**: `src/config/giscus.ts` - Reads configuration from environment variables (`PUBLIC_GISCUS_*`).
  - **Integration**: Embedded in News pages via `NewsTimeline` component with expandable/collapsible UI.
  - **Setup**: Requires public GitHub repository, enabled Discussions, and installed Giscus App.
  - **Documentation**: See `docs/GISCUS_SETUP.md` for detailed setup instructions.
  - **Features**:
    - Client-side only (no server required).
    - Comments stored in GitHub Discussions.
    - Supports multiple languages and themes.
    - Unique discussion threads per content item via identifier mapping.

### Build & Deploy
- Output: pure static HTML (`output: "static"`)
- Hosting: GitHub Pages (default), compatible with any static host.
- Content sync: `scripts/setup-content.mjs` prepares `.content/` via `CONTENT_DIR` (symlink) or `CONTENT_REPO_URL`/`CONTENT_REPO_REF` (clone), fallback to local `Team-Guidebook/`.
- Attachment sync: Automatically syncs `Team-Guidebook/assets/` and `Team-Guidebook/图片库/` to `public/attachments/` during `predev` and `prebuild` phases.
  - Handles filename collisions with warnings.
  - Supports recursive directory copying.
- Search index generation: Pagefind automatically generates search index in `postbuild` phase after Astro build completes.
  - Index stored in `dist/pagefind/` directory.
  - Only available in production builds (not in dev mode).
- 依赖安装注意：r3f 与 React 18 需使用 `@react-three/fiber@^8`，必要时用 `npm install --legacy-peer-deps` 以避免 peer 冲突。
