## Content Spec (Obsidian-driven) for Lab Website

### 1) Repository Layout

- `src/`
  - `content/`: Astro Content Collections definitions (`config.ts`) and custom loaders.
  - `pages/`: File-based routing (e.g., `/[lang]/...`).
  - `layouts/`: Shared layouts (e.g., `BaseLayout.astro`).
  - `components/`: UI components.
- `public/attachments/`: Static assets synced from the Obsidian vault (see Attachments section).
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

- **`astro.config.mjs`**:
  - Astro configuration file.
  - **Integrations**: Configures Tailwind CSS via `@tailwindcss/vite` plugin.
  - **Redirects**: Static redirect configuration (`redirects: { '/': '/zh/' }`) for root path redirection (compatible with static output mode).
  - **Markdown Processing**: Configures `remark-wiki-link` for Obsidian WikiLink compatibility.
    - **`wikiLinkWithLocale()`**: Higher-order function that wraps `remark-wiki-link` to inject locale awareness.
      - **Language Inference**: Tries in order: 1) frontmatter `lang`, 2) file path containing `/en/` or `/zh/`, 3) defaults to `zh`.
      - **`hrefTemplate` Function**: Maps WikiLink permalinks to URL paths:
        - Normalizes segments to kebab-case (spaces/underscores → hyphens, lowercase).
        - Supports explicit language prefixes: `[[en/Page]]` → `/en/library/page`, `[[zh/Page]]` → `/zh/library/page`.
        - Default behavior: `[[Page]]` → `/<inferred-lang>/library/page`.
        - Preserves absolute paths (starting with `/`) unchanged.
      - **Styling Contract**: Sets `wikiLinkClassName: 'internal-link'` to match frontend expectations (see `FRONTEND_GUIDELINES.md`).
      - **Alias Support**: Handles `[[Page|Display Text]]` via `aliasDivider: '|'`.

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
To support Obsidian-specific syntax, the remark/rehype pipeline must be configured:

- **WikiLinks (`[[...]]`)**:
  - Use `remark-wiki-link`.
  - **Resolution**: Map `[[...]]` to `/[lang]/library/...` with disambiguation rules (path-like preferred).
  - **Styling**: Add class `.internal-link` for frontend styling.
- **Callouts (`> [!info]`)**:
  - Use `remark-gh-admonitions` or `remark-directive` to transform into semantic HTML `<aside>` or `<div>` with classes (e.g., `.admonition.info`).
- **Assets (`![[...]]`)**:
  - Transform Obsidian embed syntax into standard Markdown image syntax `![](/attachments/...)`.

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
