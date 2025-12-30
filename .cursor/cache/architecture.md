## Content Spec (Obsidian-driven) for Lab Website

### 1) Repository Layout

- `lab/`
  - `zh/`
    - `people/`
    - `projects/`
    - `publications/`
  - `en/`
    - `people/`
    - `projects/`
    - `publications/`
- `Team-Guidebook/` (mapped to Library)
- `Team-Guidebook/档案馆/` (Obsidian Daily Notes; mapped to News)
- `attachments/` (all media and downloadable files)

### 2) URL & Slug Rules

- A lab content note's URL is derived from its path relative to `lab/{lang}/`.
  - Example: `lab/zh/people/Alice_Wang.md` -> `/zh/people/alice-wang`
- Slug generation:
  - Use the file stem (filename without extension).
  - Normalize to `kebab-case`.
- Collision rule:
  - Full relative path must be unique.
  - Same filename under different folders is allowed.

### 3) Publish Rules

- `publish: false` means:
  - The item does not appear in lists.
  - The page route is not generated (404 in production build).
- Default behavior if missing: `publish: true`.

### 4) Obsidian WikiLinks Rules

- Internal links:
  - `[[Some_Page]]` resolves by file name within the same language tree first.
  - If ambiguous, require explicit path-like link: `[[people/Some_Page]]`.
- Aliases:
  - `[[Some_Page|Display Text]]` is supported.
- Embeds (attachments only):
  - `![[image.png]]` resolves only within `attachments/`.
  - If not found, keep as plain text (do not break build).

### 5) Attachments

- All attachments live in `attachments/`.
- Recommended naming:
  - Prefer globally unique names, e.g. `2025-12-30-lab-group-photo.jpg`.
- Supported usages:
  - Standard Markdown: `![](/attachments/xxx.png)`
  - Obsidian embed: `![[xxx.png]]` (resolved to `/attachments/xxx.png`)
- Large files:
  - Allowed; will be served as static downloads.

### 6) i18n Content Pairing (Recommended)

- Each language has its own tree: `lab/zh/...` and `lab/en/...`.
- To pair translations, add a stable id:
  - `id: <stable-id>` on each page, and/or
  - `translation_of: <stable-id>` to link a translated page to the canonical one.
- Language switch should try to jump to the paired page; if missing, fallback to the section index.

### 7) Project Structure & Role Explanations

- **`src/layouts/BaseLayout.astro`**:
  - The master layout template.
  - Handles `<head>` metadata, global CSS imports (`styles/global.css`), and the basic page structure (HTML/Body).
  - Integrates `Header` and `Footer` components.
  - Accepts `title`, `description`, and `lang` props for SEO and accessibility.

- **`src/components/Header.astro`**:
  - Top navigation bar.
  - Contains site branding (Logo/Title) and main navigation links.
  - Handles language switching logic (linking to `/zh` or `/en`).

- **`src/components/Footer.astro`**:
  - Page footer.
  - Contains copyright info and secondary links.

- **`src/pages/index.astro`**:
  - **Role**: Root Redirector.
  - **Behavior**: Immediately redirects users to the default language path (`/zh/`).
  - **SEO**: Can be enhanced with language detection logic in the future.

- **`src/pages/[lang]/index.astro`**:
  - **Role**: Localized Landing Pages (`/zh/` and `/en/`).
  - **Content**: Contains the actual homepage content (Welcome message, News highlights, Quick links) tailored to the specific language.

- **`astro.config.mjs`**:
  - Astro configuration file.
  - **Integrations**: Configures Tailwind CSS.
  - **Markdown**: Configures `remark-wiki-link` for Obsidian compatibility.
    - `hrefTemplate`: Controls how `[[WikiLinks]]` are resolved to URL paths.

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
      - Parse frontmatter to check `publish: true`.
      - Iterate through list items (bullet points).
      - Regex match `#P/<Name>` to extract related people.
      - Construct `NewsItem` object: `{ date, content (html), related_people, tags }`.
    - **Output**: A virtual `news` collection.

2.  **BibTeX Loader (Publications)**:
    - **Input**: `lab/{lang}/publications/*.bib`
    - **Library**: Use `citation-js` or similar.
    - **Logic**:
      - Parse `.bib` file into JSON.
      - Generate a unique ID for each entry (e.g., citation key).
    - **Output**: A virtual `publications` collection exposed as JSON objects to the frontend.

#### Markdown Processing Pipeline (`astro.config.mjs`)
To support Obsidian-specific syntax, the remark/rehype pipeline must be configured:

- **WikiLinks (`[[...]]`)**:
  - Use `remark-wiki-link`.
  - **Resolution**: Map `[[slug]]` to `/[lang]/library/[slug]`.
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
