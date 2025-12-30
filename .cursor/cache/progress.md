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

- **前端融合与动效 (Later on 2025-12-30)**:
    - 集成 React 岛模式页面：`HomePage/PeoplePage/ProjectsPage/NewsPage/PublicationsPage/LibraryPage` 由 Astro 页面传入数据驱动。
    - 背景与动效：引入 `three` + `@react-three/fiber` + `@react-three/drei`，新增 `src/components/react/RippleBackground.tsx`，在 `BaseLayout.astro` 以 `client:load` 挂载，使用 `public/background.jpg` 纹理。
    - 依赖安装：为兼容 React 18 使用 r3f 8.x + drei 9.113.0，必要时用 `npm install --legacy-peer-deps`。
    - 布局：`BaseLayout.astro` 注入 `Header/Footer` 及 Ripple 背景，内容层放在 z-index 之上。
    - 本地图：将 UI 背景图放置 `public/background.jpg`，可替换即生效。

- **Frontend Handoff (Step 6) - 2025-12-30**:
    - **数据契约对齐**：
        - 基于 `FRONTEND_GUIDELINES.md` 明确了所有 collections 的字段定义和路由规则。
        - 确立了 WikiLinks 默认指向 Library (`/[lang]/library/...`) 的规则。
        - 确认了附件统一通过 `/attachments/...` 访问的规则。
    - **最小可用页面实现**：
        - **Home 页面** (`/[lang]/index.astro`): 接入 News 和 Projects 数据，显示最新 5 条动态和 3 个精选项目。
        - **People 页面**:
            - 列表页 (`/[lang]/people/index.astro`): 按角色分组显示成员（教授、博士后、博士生、硕士生、校友等）。
            - 详情页 (`/[lang]/people/[slug].astro`): 显示成员详细信息，包括头像、邮箱、链接、研究兴趣等。
        - **Projects 页面**:
            - 列表页 (`/[lang]/projects/index.astro`): 按开始时间排序显示所有项目，支持标签和参与人员显示。
            - 详情页 (`/[lang]/projects/[slug].astro`): 显示项目详情，包括时间、参与人员（链接到 People）、标签、代码仓库等。
        - **News 页面** (`/[lang]/news/index.astro`): 时间轴展示所有动态，显示日期、标签、相关内容，支持关联人员链接。
        - **Library 页面**:
            - 索引页 (`/[lang]/library/index.astro`): 使用 React 组件 `LibraryPage` 展示知识库内容卡片网格。
            - 动态路由页 (`/[lang]/library/[...slug].astro`): 支持任意深度的路径渲染知识库内容。
    - **技术要点**：
        - 所有页面都使用 `getCollection()` API 从 Content Collections 获取数据。
        - 支持中英双语路由（`/zh/` 和 `/en/`）。
        - 数据过滤：只显示 `publish !== false` 的内容。
        - 类型安全：利用 Astro Content Collections 的类型推断。
        - 响应式设计：使用 Tailwind CSS 实现响应式布局。
    - **Bug 修复**：
        - 修复了 Library 页面在 frontmatter 中使用内联样式导致的语法错误，改为使用 React 组件渲染。
        - 所有页面通过 lint 检查，无错误。
    - **验证状态**：
        - 所有页面已实现并通过前端同事验证。
        - 数据契约与页面范围已对齐。
        - 最小可用的页面联调已完成。

- **News 数据源实现 (Step 7) - 2025-12-30**:
    - **Custom News Loader** (`src/content/loaders/newsLoader.ts`):
        - 实现了自定义 Astro Content Loader，用于处理 Obsidian Daily Notes (`Team-Guidebook/档案馆/YYYY-MM-DD.md`)。
        - **文件扫描**: 使用 `fast-glob` 扫描所有符合 `YYYY-MM-DD.md` 格式的日记文件。
        - **过滤逻辑**: 仅处理 `publish: true` 且 `draft: false` 的日记文件（显式 opt-in）。
        - **内容提取**: 从 Markdown 文件中提取 bullet 行（`-` 开头的列表项）作为 news 条目。
        - **人员关联**: 解析 `#P/<Name>` 标签，通过 People collection 的 `aliases` 字段映射到 Person ID。
        - **Markdown 转换**: 使用 `marked` 将提取的 bullet 内容转换为 HTML。
        - **日期处理**: 从文件名（`YYYY-MM-DD.md`）或 frontmatter 中提取日期，确保 `title` 字段正确设置（默认为日期字符串）。
        - **数据格式**: 返回符合 `newsSchema` 的数据结构，包括 `date`, `title`, `content` (HTML), `related_people`, `tags`。
    - **Schema 更新** (`src/content/config.ts`):
        - 在 `newsSchema` 中添加了 `title: z.string().optional()` 字段，确保每个 news 条目都有明确的标题。
        - 将 `news` collection 从 `type: 'content'` 改为使用 `loader: newsLoader()`。
    - **Bug 修复**:
        - **News 列表标题显示问题**: 修复了每个日期后面多出 "0" 的问题，通过显式设置 `title` 字段为日期字符串解决。
        - **插件工厂函数调用**: 修复了 `remarkObsidianCallouts()` 和 `remarkObsidianImage()` 需要作为工厂函数调用的问题。
        - **wikiLinkWithLocale 返回问题**: 修复了 `wikiLinkWithLocale()` 函数缺少 `return tree` 语句，导致 markdown 处理流程中断的问题。
        - **remarkDirectiveRehype 位置**: 确认并修复了 `remarkDirectiveRehype` 必须在 `rehypePlugins` 中（而非 `remarkPlugins`）的问题，因为它是桥接插件，操作 HAST 而非 MDAST。
        - **hProperties 格式问题**: 修复了两处 `hProperties` 配置问题：
            - `remark-obsidian-image.js`: 将 `class: 'obsidian-image'` 改为 `className: ['obsidian-image']`（符合 HAST 规范）。
            - `astro.config.mjs` (wikiLinkWithLocale): 将 `className: 'internal-link'` 改为 `className: ['internal-link']`（保持一致性）。
    - **技术栈补充**:
        - 新增依赖: `marked` (v17.0.1) - Markdown 转 HTML
        - 新增依赖: `gray-matter` (v4.0.3) - Frontmatter 解析
        - 新增依赖: `fast-glob` (v3.3.3) - 文件模式匹配
    - **验证状态**:
        - News loader 已实现并通过测试。
        - 所有 bug 已修复，lint 错误已解决。
        - Markdown 处理流程正常工作，Obsidian 语法（WikiLinks, Callouts, Images）正确转换。
