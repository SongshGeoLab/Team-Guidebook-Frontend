## Content Spec (Obsidian-driven) for Lab Website

### 1) Repository Layout

- `src/`
  - `content/`: Astro Content Collections definitions (`config.ts`) and custom loaders.
  - `pages/`: File-based routing (e.g., `/[lang]/...`).
  - `layouts/`: Shared layouts (e.g., `BaseLayout.astro`).
  - `components/`: UI components.
- `public/attachments/`: Static assets synced from the Obsidian vault (see Attachments section).
- `public/background.jpg`: React Ripple 背景纹理，前端同事更新背景时只需替换此文件。
- `.content/` (gitignored): Symlink/clone target directory for Obsidian content in dev/CI.
- `scripts/setup-content.mjs`: Content bootstrapper. Prefers `CONTENT_DIR` (symlink to `.content/`), else `CONTENT_REPO_URL` (+ optional `CONTENT_REPO_REF`) to clone, else falls back to local `Team-Guidebook/`. Wired via `predev`/`prebuild` and `setup:content`.

**Direct-map Content Source (Obsidian Vault)**

The website content is **not** required to be rearranged into a new `lab/{lang}` tree. Instead, we directly map existing `Team-Guidebook/` structure:

- `Team-Guidebook/图书馆/**` -> Library
- `Team-Guidebook/图书馆/项目/*.md` -> Projects
- `Team-Guidebook/通讯录/*.md` -> People
- `Team-Guidebook/档案馆/YYYY-MM-DD.md` -> News (Daily Notes, bullet extraction)
- `Team-Guidebook/公告板/博客/*.md` -> Blog (optional)
- `Team-Guidebook/图书馆/文献/*.md` -> Publications (short-term, optional)

### 2) URL & Slug Rules

- Default language is `zh`. `en` route exists as UI shell and will be filled gradually.
- Core routes:
  - `/zh` and `/en`: localized landing pages
  - `/[lang]/news`: News timeline (from Daily Notes)
  - `/[lang]/people`: People index and detail pages (from `通讯录/`)
  - `/[lang]/projects`: Projects index and detail pages (from `图书馆/项目/`)
  - `/[lang]/library/...`: Library wiki pages (from `图书馆/**`)

**Slug rules (for People/Projects)**
- Use the file stem (filename without extension) as the canonical slug.
- Normalize to `kebab-case`.
- Collision rule: slugs must be unique **within their own collection** (people/projects).

**Library path rules**
- Library pages preserve their relative path within `Team-Guidebook/图书馆/`.
- The URL path is a normalized variant of the relative path (kebab-case per segment).

### 3) Publish Rules

- `publish: false` means:
  - The item does not appear in lists.
  - The page route is not generated (404 in production build).
- Default behavior if missing: `publish: true`.

### 4) Obsidian WikiLinks Rules

- Internal links (WikiLinks) default to **Library**:
  - `[[Some_Page]]` resolves to `/<lang>/library/...` (not People/Projects).
  - Prefer path-like links to avoid ambiguity: `[[词条/Git]]`, `[[专栏/Python4Science/Week1_导论]]`.
- Aliases:
  - `[[Some_Page|Display Text]]` is supported.
- Ambiguity handling:
  - If `[[Some_Page]]` matches multiple library pages, keep build **non-failing** but emit a warning and require content author to disambiguate with a path-like link.
- Embeds (attachments only):
  - `![[image.png]]` resolves only within synced attachment roots (see Attachments section).
  - If not found, keep as plain text (do not break build).

### 5) Attachments

We adopt **strategy A**: keep existing vault asset folders, but expose a single public mount point.

**Source folders in the vault (current)**
- `Team-Guidebook/assets/`
- `Team-Guidebook/图片库/`

**Website public output**
- During build/dev, sync/copy the above folders into:
  - `public/attachments/`

**Supported usages**
- Standard Markdown (preferred): `![](/attachments/xxx.png)`
- Obsidian embed: `![[xxx.png]]` (resolved to `/attachments/xxx.png`)

**Name collision rule**
- If multiple files share the same filename across source folders, the build must warn and prefer one deterministic resolution (or require renaming).

### 6) i18n Strategy (Phase 1)

- Phase 1 ships with **Chinese content** as primary.
- `/en` exists as UI shell:
  - show translated UI chrome and allow navigation
  - content pages can show empty state / "Coming soon" until translations exist
- Future: introduce mirrored English content tree (e.g., `Team-Guidebook-en/` or `lab/en/`) and translation pairing.

### 7) Project Structure & Role Explanations

- **`src/layouts/BaseLayout.astro`**:
  - The master layout template.
  - Handles `<head>` metadata, global CSS imports (`styles/global.css`), and the basic page structure (HTML/Body).
  - Integrates `Header` and `Footer` components.
  - Mounts `RippleBackground` (React island, `client:load`) as全局水波背景，叠加渐变遮罩；内容层使用更高 z-index 以确保交互。
  - 布局结构：`body` 使用 `flex flex-col`，包含 `RippleBackground` 和内容层（`relative z-10`），确保背景在底层，内容在上层。
  - Accepts `title`, `description`, and `lang` props for SEO and accessibility.

- **`src/components/Header.astro`**:
  - Top navigation bar component.
  - **Language Detection**: Infers current locale from `Astro.url.pathname` (checks for `/en/` or `/zh/` prefix).
  - **Language Switching**: Provides links to toggle between `/zh/` and `/en/` versions of the current page.
  - **Navigation**: Contains 7 main section links: Home, News, Projects, Library, Publications, People, About.
  - **Responsive**: Designed to work across different screen sizes (mobile-friendly navigation).

- **`src/components/Footer.astro`**:
  - Page footer.
  - Contains copyright info and secondary links.

- **`src/components/react/layout/ReactBaseLayout.tsx`**:
  - React 布局壳，包含导航、语言切换、页脚；接收 `lang`、`activePage`、`children`。
  - 背景：嵌入 `RippleBackground`，设置 `BG_IMAGE = '/background.jpg'`，由 Astro 布局控制层级。
  - 导航：静态 7 个入口，语言切换通过 `/zh`/`/en`。

- **`src/components/react/RippleBackground.tsx`**:
  - three + @react-three/fiber + @react-three/drei 实现的 GPU 水波动效；使用 FBO 迭代模拟与噪声扰动。
  - 依赖 `public/background.jpg` 作为纹理；缺省即可加载，替换文件即可换图。
  - 可在需要时从 `BaseLayout.astro` 暂停注入以禁用动效。

- **`src/components/react/pages/*`**:
  - 前端同事提供的页面级 UI 组件（Home/People/Projects/News/Publications/Library）。
  - 纯展示，不做数据拉取；由对应 Astro 页面用 `getCollection()` 取数后透传 props。
  - **`HomePage.tsx`**: 首页组件，接收 `news` 和 `projects` props，展示最新动态和精选项目。
  - **`PeoplePage.tsx`**: 成员列表页组件，接收 `people` 数组，按角色分组展示。
  - **`ProjectsPage.tsx`**: 项目列表页组件，接收 `projects` 和 `people` 数组，展示项目卡片网格。
  - **`NewsPage.tsx`**: 动态页组件，接收 `news` 数组，支持时间轴和日历两种视图切换。
  - **`PublicationsPage.tsx`**: 出版物列表页组件，接收 `publications` 数组，支持按年份和标签筛选。
  - **`LibraryPage.tsx`**: 图书馆索引页组件，接收 `items` 数组，以卡片网格形式展示知识库内容。

- **`src/components/react/ui/*`**:
  - 可复用的 UI 组件库。
  - **`GlassCard.tsx`**: 毛玻璃效果卡片组件，支持点击交互和自定义样式。
  - **`NewsTimeline.tsx`**: 新闻时间轴组件，展示带时间线的新闻列表。
  - **`NewsCalendar.tsx`**: 新闻日历组件，按月份分组展示新闻。
  - **`CitationItem.tsx`**: 引用项组件，展示出版物信息，支持 BibTeX 复制和 PDF 下载。

- **`src/components/react/types.ts`**:
  - 定义所有 React 组件使用的 TypeScript 类型接口。
  - 包括 `Person`, `Project`, `NewsItem`, `Publication`, `LibraryItem` 等类型。
  - 作为 Astro 页面和 React 组件之间的数据契约。

- **`src/pages/[lang]/*/index.astro`** (数据层):
  - **职责**: Astro 页面负责数据获取和转换，然后传递给 React 组件。
  - **数据获取**: 使用 `getCollection()` API 从 Content Collections 获取数据。
  - **数据转换**: 将 Content Collections 的数据格式转换为 React 组件期望的 props 格式。
  - **组件挂载**: 使用 `client:load` 指令挂载 React 组件，确保客户端交互正常工作。
  - **示例**:
    - `src/pages/zh/people/index.astro`: 获取所有 people，转换为 `Person[]` 格式，传递给 `PeoplePage`。
    - `src/pages/zh/projects/index.astro`: 获取 projects 和 people，转换为对应格式，传递给 `ProjectsPage`。
    - `src/pages/zh/library/index.astro`: 获取 library items，转换为 `LibraryItem[]` 格式，传递给 `LibraryPage`。

- **`src/pages/[lang]/*/[slug].astro`** (详情页):
  - **People 详情页** (`/[lang]/people/[slug].astro`): 使用 `getStaticPaths()` 生成所有成员的路由，渲染成员详情。
  - **Projects 详情页** (`/[lang]/projects/[slug].astro`): 使用 `getStaticPaths()` 生成所有项目的路由，渲染项目详情。
  - **Library 详情页** (`/[lang]/library/[...slug].astro`): 使用 `getStaticPaths()` 生成所有知识库页面的路由，支持任意深度的路径。

- **Root Redirect**:
  - **Implementation**: Configured in `astro.config.mjs` via `redirects: { '/': '/zh/' }`.
  - **Behavior**: Automatically redirects root path (`/`) to default language (`/zh/`).
  - **Rationale**: Uses Astro's static redirect feature instead of SSR-only `Astro.redirect()` to maintain compatibility with static output mode.
  - **Note**: No `src/pages/index.astro` file exists to avoid build conflicts with redirect configuration.

- **`src/pages/[lang]/index.astro`**:
  - **Role**: Localized Landing Pages (`/zh/` and `/en/`).
  - **Content**: Contains the actual homepage content (Welcome message, News highlights, Quick links) tailored to the specific language.
  - **Structure**: Uses `BaseLayout` with appropriate `lang` prop for SEO and accessibility.

- **Section Placeholder Pages**:
  - **Location**: `src/pages/[lang]/{news,projects,library,publications,people,about}/index.astro` (or `about.astro` for About).
  - **Purpose**: Provide routing structure for all 7 main sections in both languages.
  - **Current State**: Display "Coming soon" or empty state messages until Content Collections are implemented.
  - **Future**: Will be populated with actual content from Obsidian vault via Content Collections.

- **`src/pages/test-collections.astro`**:
  - **Purpose**: Test page to verify Content Collections are working correctly.
  - **Usage**: Accessible at `/test-collections` route for development/debugging.
  - **Functionality**: 
    - Queries all collections using `getCollection()` API.
    - Displays counts and sample entries from each collection (People, Projects, Library, Publications).
    - Filters by `publish !== false` to show only published content.
    - Useful for verifying schema validation, data loading, and symlink setup.
  - **Note**: This is a development/testing page and can be removed or moved to a development-only route in production.

- **`astro.config.mjs`**:
  - Astro configuration file.
  - **Integrations**: Configures Tailwind CSS via `@tailwindcss/vite` plugin.
  - **Redirects**: Static redirect configuration (`redirects: { '/': '/zh/' }`) for root path redirection (compatible with static output mode).
  - **Markdown Processing Pipeline**: Configured with multiple remark/rehype plugins for Obsidian syntax support:
    - **Remark Plugins (executed in order)**:
      1. **`remarkObsidianCallouts`** (`src/utils/remark-obsidian-callouts.js`): Transforms Obsidian callout syntax `> [!INFO] Title` into directive format `:::info[Title]`.
      2. **`remarkDirective`**: Parses directive syntax (`:::type[title]...:::`).
      3. **`remarkObsidianImage`** (`src/utils/remark-obsidian-image.js`): Transforms `![[image.png]]` to standard Markdown image syntax `![](/attachments/image.png)`.
      4. **`wikiLinkWithLocale()`**: Higher-order function that wraps `remark-wiki-link` to inject locale awareness.
         - **Language Inference**: Tries in order: 1) frontmatter `lang`, 2) file path containing `/en/` or `/zh/`, 3) defaults to `zh`.
         - **`hrefTemplate` Function**: Maps WikiLink permalinks to URL paths:
           - Normalizes segments to kebab-case (spaces/underscores → hyphens, lowercase).
           - Supports explicit language prefixes: `[[en/Page]]` → `/en/library/page`, `[[zh/Page]]` → `/zh/library/page`.
           - Default behavior: `[[Page]]` → `/<inferred-lang>/library/page`.
           - Preserves absolute paths (starting with `/`) unchanged.
         - **Styling Contract**: Sets `wikiLinkClassName: 'internal-link'` to match frontend expectations (see `FRONTEND_GUIDELINES.md`).
         - **Alias Support**: Handles `[[Page|Display Text]]` via `aliasDivider: '|'`.
    - **Rehype Plugins (executed in order)**:
      1. **`remarkDirectiveRehype`**: Converts remark directive nodes to rehype HTML nodes.
      2. **`rehypeCallouts`** (`src/utils/rehype-callouts.js`): Transforms directive nodes into styled HTML `<aside>` elements with CSS classes.

- **`src/utils/remark-obsidian-callouts.js`**:
  - **Purpose**: Converts Obsidian callout syntax to remark directive format.
  - **Input**: Markdown with Obsidian callouts: `> [!INFO] Title\n> Content`
  - **Output**: Remark directive nodes: `:::info[Title]...:::`
  - **Logic**: 
    - Visits `blockquote` nodes, detects `[!TYPE]` pattern in first paragraph.
    - Uses `extractText()` helper to collect all text from paragraph children (handles Markdown formatting like `**Bold Title**`).
    - Extracts callout type and title, converts remaining content to directive children.
    - Handles edge cases: empty titles, titles with Markdown formatting, content after title in first paragraph.
  - **Supported Types**: note, abstract, info, tip, success, question, warning, failure, danger, bug, example, quote (case-insensitive).
  - **Important**: Always returns the tree to maintain the processing pipeline (unified/remark requirement).

- **`src/utils/rehype-callouts.js`**:
  - **Purpose**: Transforms directive nodes (from `remark-directive-rehype`) into styled HTML callout elements.
  - **Input**: Rehype nodes with `tagName` set to directive name (e.g., 'info', 'warning') after `remark-directive-rehype` conversion.
  - **Output**: HTML `<aside>` elements with classes `admonition admonition-{type}` and `data-callout` attribute.
  - **Logic**:
    - Visits all nodes, checks if `tagName` matches known callout types.
    - Extracts title from `data-title` attribute or first child paragraph.
    - Transforms node to `<aside>` with proper structure: title paragraph (if exists) + content children.
  - **Styling**: CSS classes are defined in `src/styles/global.css` for each callout type.
  - **Important**: Always returns the tree to maintain the processing pipeline (unified/rehype requirement).

- **`src/utils/remark-obsidian-image.js`**:
  - **Purpose**: Transforms Obsidian image embed syntax to standard Markdown images.
  - **Input**: Markdown text nodes containing `![[image.png]]` or `![[path/to/image.png]]`.
  - **Output**: Standard Markdown image nodes pointing to `/attachments/...`.
  - **Logic**: 
    - Visits text nodes, matches `![[...]]` pattern using regex.
    - Collects all matches before processing (to avoid index issues when modifying parent.children).
    - Extracts image path, normalizes path (removes leading/trailing slashes).
    - Creates image node with `/attachments/` prefix and `obsidian-image` CSS class.
    - Replaces text nodes with new nodes (text + image) in reverse order to maintain correct indices.
  - **Path Handling**: Supports nested paths, normalizes to kebab-case segments.
  - **CSS Class**: Adds `obsidian-image` class to generated image nodes for styling.
  - **Important**: Always returns the tree to maintain the processing pipeline (unified/remark requirement). The `file` parameter is optional and should not cause early exit.

- **`scripts/setup-content.mjs`**:
  - **Purpose**: Prepares content directory and syncs attachments before dev/build.
  - **Content Sync** (`resolveSource()`, `linkSource()`, `cloneSource()` functions):
    - Handles three modes:
      1. `CONTENT_DIR` environment variable → symlink to `.content/`
      2. `CONTENT_REPO_URL` (+ optional `CONTENT_REPO_REF`) → git clone to `.content/`
      3. Fallback → use local `Team-Guidebook/`
    - **`cleanDest()` Function**: 
      - Removes existing `.content` if it exists (handles symlinks, regular files, and directories).
      - Detects and warns about regular files (shouldn't be committed) vs symlinks.
      - Ensures clean state before creating new symlink.
  - **Attachment Sync** (`syncAttachments()` function):
    - Syncs `Team-Guidebook/assets/` and `Team-Guidebook/图片库/` to `public/attachments/`.
    - Recursively copies directories and files.
    - Detects filename collisions and warns (doesn't overwrite).
    - Handles both symlink and direct directory scenarios.
  - **Content Collections Setup** (`setupContentCollections()` function):
    - Creates symlinks from `src/content/{collection}/` to corresponding directories in `.content/Team-Guidebook/`.
    - Maps collections: `people` → `通讯录/`, `projects` → `图书馆/项目/`, `library` → `图书馆/`, `publications` → `图书馆/文献/`.
    - Handles edge cases: removes existing files/directories before creating symlinks.
  - **Execution**: Wired via `predev` and `prebuild` npm scripts, also available via `npm run setup:content`.

- **`src/styles/global.css`**:
  - **Purpose**: Global styles for the site, including Obsidian syntax support.
  - **Callout Styles**: Comprehensive styles for all Obsidian callout types:
    - Each type has color-coded border and background (e.g., `admonition-info` has blue border, `admonition-warning` has orange border).
    - Title styling with uppercase, tracking, and type-specific colors.
    - Dark mode support via Tailwind's `dark:` prefix.
  - **Internal Links**: `.internal-link` class for WikiLinks (dotted underline, blue color, hover effects).
  - **Obsidian Images**: `.obsidian-image` class (rounded corners, shadow).

- **`src/content/config.ts`**:
  - **Purpose**: Defines Zod schemas for all Content Collections and establishes the data contract between Obsidian content and the website.
  - **Base Schema**: Common fields shared across collections:
    - `publish`: boolean (default true) - Controls whether content appears on the site.
    - `date`: date/string (optional, with transform) - Publication or creation date.
    - `tags`: array/null (default empty array) - Tags for categorization.
  - **Collection Schemas**:
    - **People**: Maps from `通讯录/*.md`. Required: `id`, `name`, `role`. Optional: `avatar`, `email`, `aliases` (for `#P/<Name>` resolution), `links`, `interests`.
    - **Projects**: Maps from `图书馆/项目/*.md`. Required: `id`, `title`, `start_date`. Optional: `end_date`, `people` (Person IDs), `repo`, `bib_key`.
    - **News**: Maps from `档案馆/YYYY-MM-DD.md` (Daily Notes). Required: `date`, `content` (HTML). Optional: `related_people` (resolved from `#P/<Name>`). **Note**: Requires custom loader for bullet extraction (TODO).
    - **Library**: Maps from `图书馆/**/*.md` (excluding `项目/` and `文献/`). Very permissive schema using `.passthrough()` to allow extra fields. Optional: `title`, `lang`.
    - **Publications**: Maps from `图书馆/文献/*.md` (Phase 1: markdown-based). Required: `title`, `authors`, `year`. Optional: `venue`, `bib_key`, `doi`, `pdf`, `tags`.
  - **Schema Features**:
    - Handles `null` values gracefully (especially for arrays like `tags`, `aliases`).
    - Transforms date strings to Date objects automatically.
    - Provides TypeScript type inference for all collections via Astro's Content Collections API.
  - **Usage**: Collections are accessed via `getCollection()` from `astro:content` in pages/components.

- **`scripts/setup-content.mjs` - Content Collections Setup**:
  - **`setupContentCollections()` Function**:
    - **Purpose**: Creates symlinks from `src/content/{collection}/` to corresponding directories in `.content/Team-Guidebook/`.
    - **Mapping**:
      - `src/content/people` → `.content/Team-Guidebook/通讯录/`
      - `src/content/projects` → `.content/Team-Guidebook/图书馆/项目/`
      - `src/content/library` → `.content/Team-Guidebook/图书馆/`
      - `src/content/publications` → `.content/Team-Guidebook/图书馆/文献/`
    - **Implementation**:
      - `linkCollection(collectionName, sourcePath)` helper function:
        - Resolves source path relative to Team-Guidebook root.
        - Removes existing symlinks/files/directories before creating new symlink.
        - Creates directory symlink using `fs.symlinkSync()`.
        - Handles edge cases: detects regular files (shouldn't be committed), directories, and existing symlinks.
    - **Execution**: Called automatically during `predev` and `prebuild` phases after content source is resolved.
    - **Note**: Library collection includes entire `图书馆/` directory (including `项目/` and `文献/` subdirectories). Filtering is handled at query time or via custom loaders if needed.

### 8) Backend Data Pipeline Specification

This section defines the technical implementation required to serve content to the frontend, ensuring separation of concerns.

#### Schema as Contract (`src/content/config.ts`)
The backend must provide strict Zod schemas for all collections. This acts as the API contract with the frontend.

- **People Collection**:
  - `id`: string (required)
  - `name`: string (required)
  - `role`: string (required)
  - `avatar`: string (optional, default to placeholder)
- **Projects Collection**:
  - `people`: array of strings (must match `people` collection IDs)
  - `start_date`: date (required)
- **Validation Strategy**:
  - Use `z.reference()` (if available in Astro 5) or custom validation to ensure relational integrity (e.g., project members must exist in the people collection).

#### Custom Content Loaders
Since source content comes from non-standard structures (Daily Notes, BibTeX), custom loaders are required.

1.  **News Loader (Obsidian Daily Notes)**:
    - **Input**: `Team-Guidebook/档案馆/*.md`
    - **Logic**:
      - Read file content.
      - Parse frontmatter to check `publish: true` (explicit opt-in; if missing, treat as not published).
      - Iterate through list items (bullet points).
      - Regex match `#P/<Name>` to extract related people.
      - Construct `NewsItem` object: `{ date, content (html), related_people, tags }`.
    - **Output**: A virtual `news` collection.

2.  **People Loader (Address Book)**:
    - **Input**: `Team-Guidebook/通讯录/*.md`
    - **Logic**:
      - Parse frontmatter with `id` (slug) and `aliases` (used for resolving `#P/<Name>` in Daily Notes).
    - **Output**: `people` collection.

3.  **Projects Loader**:
    - **Input**: `Team-Guidebook/图书馆/项目/*.md`
    - **Output**: `projects` collection.

4.  **Library Loader (Wiki)**:
    - **Input**: `Team-Guidebook/图书馆/**/*.md`
    - **Output**: `library` collection (path-preserving).

5.  **Publications (Future BibTeX Loader)**:
    - Phase 1 can render `Team-Guidebook/图书馆/文献/*.md` as library-like pages.
    - Phase 2 introduces BibTeX (`.bib`) + `citation-js` for structured filtering page.

#### Markdown Processing Pipeline (`astro.config.mjs`)
To support Obsidian-specific syntax, the remark/rehype pipeline is configured with the following plugins (executed in order):

**Remark Phase (Markdown AST transformation)**:
1. **`remarkObsidianCallouts`**: Converts `> [!INFO] Title` → `:::info[Title]`
2. **`remarkDirective`**: Parses directive syntax
3. **`remarkObsidianImage`**: Converts `![[image.png]]` → `![](/attachments/image.png)`
4. **`wikiLinkWithLocale()`**: Converts `[[link]]` → `/<lang>/library/...`

**Rehype Phase (HTML AST transformation)**:
1. **`remarkDirectiveRehype`**: Bridge plugin that converts remark directive nodes to rehype HTML nodes. **Must be in `rehypePlugins` array, not `remarkPlugins`**, as it operates on HAST (HTML AST) not MDAST (Markdown AST).
2. **`rehypeCallouts`**: Transforms directive nodes to styled `<aside>` elements

**Plugin Pipeline Requirements**:
- All remark/rehype transformer functions **must return the tree** (even if unmodified) to maintain the processing pipeline.
- Returning `undefined` breaks the pipeline and prevents subsequent plugins from receiving the AST.
- The `file` parameter in remark plugins is optional and should not trigger early exit.

**Details**:
- **WikiLinks (`[[...]]`)**:
  - **Resolution**: Map `[[...]]` to `/[lang]/library/...` with disambiguation rules (path-like preferred).
  - **Styling**: Add class `.internal-link` for frontend styling.
  - **Language Awareness**: Infers locale from file path or frontmatter.
- **Callouts (`> [!info]`)**:
  - **Transformation**: `> [!INFO] Title` → `:::info[Title]` → `<aside class="admonition admonition-info">`
  - **Supported Types**: note, abstract, info, tip, success, question, warning, failure, danger, bug, example, quote
  - **Styling**: Each type has color-coded CSS classes defined in `src/styles/global.css`.
- **Assets (`![[...]]`)**:
  - **Transformation**: `![[image.png]]` → `![](/attachments/image.png)`
  - **Path Resolution**: Images are synced from `Team-Guidebook/assets/` and `Team-Guidebook/图片库/` to `public/attachments/` during build/dev.
  - **CSS Class**: Generated images have `obsidian-image` class for styling.

### 9) Comments Policy (Recommended Default)

- Enable comments for:
  - News pages
  - Publication highlight pages
- Disable comments for:
  - People / Projects / Library pages (can be enabled later)

### 10) Team-Guidebook as Library

- `Team-Guidebook/**/*.md` is rendered under `/[lang]/library/...`.
- Prefer normal Markdown links where possible.
- Images should prefer `/attachments/...` for website compatibility.

### 11) Content Quality Constraints

- Dates must be ISO strings: `YYYY-MM-DD`.
- All referenced slugs must exist in the same language tree.
- Prefer stable slugs (avoid frequent renames).

### 12) Git Ignore Rules

The following files/directories are gitignored to prevent committing development artifacts:

- **`.content/`** (directory): The working directory for Obsidian content (symlinked or cloned).
- **`.content`** (file): Regular file that may be accidentally created (should be a symlink directory).
- **`src/content`**: Symlinked directories pointing to `.content/Team-Guidebook/` subdirectories.
- **`public/`**: Generated static assets (attachments synced from Obsidian vault, background images).
- **`.astro/`**: Generated TypeScript types from Content Collections.
- **`dist/`**: Build output directory.

**Important**: The `.content` file (not directory) should never be committed, as it contains absolute file system paths and conflicts with the symlink strategy used by `setup-content.mjs`.

### 13) React Islands Architecture (Frontend Integration)

项目采用 **Astro Islands** 架构，将 React 组件作为"岛屿"嵌入到静态 HTML 中：

- **数据流向**: `Astro 页面 (getCollection)` → `数据转换` → `React 组件 (props)`
- **组件挂载**: 使用 `client:load` 指令确保 React 组件在客户端正常交互。
- **类型安全**: `src/components/react/types.ts` 定义了所有组件的数据契约。
- **组件组织**:
  - `src/components/react/pages/`: 页面级组件（HomePage, PeoplePage, ProjectsPage, NewsPage, PublicationsPage, LibraryPage）
  - `src/components/react/ui/`: 可复用的 UI 组件（GlassCard, NewsTimeline, NewsCalendar, CitationItem）
  - `src/components/react/layout/`: 布局组件（ReactBaseLayout - 可选，当前使用 Astro BaseLayout）
  - `src/components/react/RippleBackground.tsx`: 全局背景动效组件

- **关键原则**:
  - React 组件不直接访问文件系统或 Content Collections。
  - 所有数据由 Astro 页面获取并转换为组件期望的格式。
  - 组件保持纯展示逻辑，交互通过 props 回调处理。
  - 背景和全局动效通过 `BaseLayout.astro` 统一管理。
