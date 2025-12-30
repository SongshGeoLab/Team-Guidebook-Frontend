# Team Guidebook Lab Site (Astro)

Astro 5 + TypeScript + Tailwind static site for the lab. Content is Obsidian-driven with direct mapping from the `Team-Guidebook/` vault. Dual-language routes `/zh` (primary) and `/en` (shell/empty state) are already scaffolded.

## Content Sync Strategy

- Content destination: `.content/` (gitignored) is the working directory consumed by the site.
- Local development:
  - Default source: `./Team-Guidebook` if present.
  - Override via `CONTENT_DIR=/path/to/obsidian` to point at any local vault folder.
  - `npm run dev` runs `scripts/setup-content.mjs` before starting; it symlinks the source into `.content/`.
- CI / build:
  - Provide `CONTENT_REPO_URL` (and optional `CONTENT_REPO_REF`, default `main`) to clone content into `.content/` before build.
  - `npm run build` will trigger the same setup script via `prebuild`.
- Manual preparation: `npm run setup:content` triggers the setup script without running dev/build.

## Commands

| Command             | Action                               |
| :------------------ | :----------------------------------- |
| `npm install`       | Install dependencies                 |
| `npm run dev`       | Prepare content, start dev server    |
| `npm run build`     | Prepare content, build to `dist/`    |
| `npm run preview`   | Preview the production build locally |
| `npm run astro ...` | Run Astro CLI commands               |
