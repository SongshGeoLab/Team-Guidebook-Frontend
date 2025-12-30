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
- Exception (Obsidian Daily Notes used as News): if `publish` is missing, treat it as `publish: false` (explicit opt-in).

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

### 7) Frontmatter Schemas (Minimal)

#### News (Obsidian Daily Notes)

**Source**
- News entries are derived from Obsidian Daily Notes under:
  - `Team-Guidebook/档案馆/YYYY-MM-DD.md`

**Visibility**
- A daily note is eligible to produce News entries when:
  - frontmatter `publish: true`, AND
  - frontmatter `draft` is not true
- Rationale: daily notes often include private/internal logs; therefore they require explicit opt-in via `publish: true`.

**Date**
- The canonical date defaults to the filename (`YYYY-MM-DD`).
- If frontmatter `date` exists, it may override the filename date (but should be consistent).

**People Relation via Inline Tags**
- Use inline tags to associate a News entry with people:
  - `#P/<DisplayName>` (example: `#P/宋爽`)
- Parsing rules:
  - Extract `<DisplayName>` after `#P/`.
  - Resolve `<DisplayName>` by matching against People frontmatter `aliases`.
  - If unresolved, ignore (do not break build).

**Extraction**
- Each bullet item line in the daily note is treated as one News entry.
  - Example: `- 10:04 Completed something #P/Someone`
- Optional future extension: only extract bullets under a dedicated `## News` section.

#### People (`lab/{lang}/people/*.md`)

```yaml
---
id: "hu-bo"                 # stable person id (recommended = slug)
name: "胡博"                # display name (for zh page; en page uses its own content tree)
publish: true
aliases: ["胡博", "Hu Bo"]   # used to resolve #P/<DisplayName> tags from daily notes
role: "PhD Student"
avatar: "/attachments/hu-bo.jpg"
links:
  - label: "GitHub"
    url: "https://github.com/..."
---
```

```yaml
---
id: "alice-wang"
name: "Alice Wang"
publish: true
role: "PhD Student"
avatar: "/attachments/alice.jpg"
links:
  - label: "GitHub"
    url: "https://github.com/..."
  - label: "Google Scholar"
    url: "https://scholar.google.com/..."
interests: ["Hydrology", "GIS"]
email: "alice@example.com"
---
```

#### Projects (`lab/{lang}/projects/*.md`)

```yaml
---
id: "project-absespy"
title: "Project Title"
publish: true
tags: ["hpc", "open-source"]
people: ["alice-wang"]
start_date: "2024-01-01"
end_date: null
repo: "https://github.com/org/repo"
---
```

#### Publications (BibTeX)

- BibTeX file location:
  - `lab/{lang}/publications/publications.bib`

Optional highlight notes:
- `lab/{lang}/publications/highlights/*.md`

```yaml
---
id: "highlight-wang2025"
title: "Paper Highlight Title"
publish: true
bib_key: "Wang2025SomePaper" # must match BibTeX entry key
tags: ["method"]
---
```

### 8) Comments Policy (Recommended Default)

- Enable comments for:
  - News pages
  - Publication highlight pages
- Disable comments for:
  - People / Projects / Library pages (can be enabled later)

### 9) Team-Guidebook as Library

- `Team-Guidebook/**/*.md` is rendered under `/[lang]/library/...`.
- Prefer normal Markdown links where possible.
- Images should prefer `/attachments/...` for website compatibility.

### 10) Content Quality Constraints

- Dates must be ISO strings: `YYYY-MM-DD`.
- All referenced slugs must exist in the same language tree.
- Prefer stable slugs (avoid frequent renames).

