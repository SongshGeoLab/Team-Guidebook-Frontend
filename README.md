# Team Guidebook Lab Site (Astro)

Astro 5 + TypeScript + Tailwind static site for the lab. Content is Obsidian-driven with direct mapping from the `Team-Guidebook/` vault. Dual-language routes `/zh` (primary) and `/en` (shell/empty state) are already scaffolded.

## Content Sync Strategy

- Content destination: `.content/` (gitignored) is the working directory consumed by the site.
- Local development:
  - Default source: `./Team-Guidebook` if present.
  - Override via `CONTENT_DIR=/path/to/obsidian` to point at any local vault folder.
  - `npm run dev` runs `scripts/setup-content.mjs` before starting; it symlinks the source into `.content/`.
- CI / build (Vercel):
  - Provide `CONTENT_REPO_URL` (and optional `CONTENT_REPO_REF`, default `main`) to clone content into `.content/` before build.
  - `npm run build` will trigger the same setup script via `prebuild`.
  - See [Deployment (Vercel)](#deployment-vercel) section for detailed setup instructions.
- Manual preparation: `npm run setup:content` triggers the setup script without running dev/build.

See [Configuration Guide](./docs/CONFIGURATION.md) for detailed setup instructions, especially for private content repositories.

## Commands

| Command             | Action                               |
| :------------------ | :----------------------------------- |
| `npm install`       | Install dependencies                 |
| `npm run dev`       | Prepare content, start dev server    |
| `npm run build`     | Prepare content, build to `dist/`    |
| `npm run preview`   | Preview the production build locally |
| `npm run astro ...` | Run Astro CLI commands               |

## Deployment (Vercel)

This project is configured for deployment on Vercel. The build process automatically:

1. Runs `prebuild` hook to sync content from the content repository
2. Builds the Astro site to `dist/`
3. Generates Pagefind search index in `postbuild` hook

### Environment Variables

Configure the following environment variables in Vercel dashboard:

- **`CONTENT_REPO_URL`** (required): GitHub repository URL for the content repository
  - Public repo: `https://github.com/username/Team-Guidebook.git`
  - Private repo: `https://github.com/username/Team-Guidebook.git` (Vercel GitHub App handles auth automatically)
- **`CONTENT_REPO_REF`** (optional): Branch or tag to clone from (default: `main`)
- **`PUBLIC_GISCUS_REPO`** (optional): GitHub repository for Giscus comments (e.g., `username/repo`)
- **`PUBLIC_GISCUS_REPO_ID`** (optional): Giscus repository ID
- **`PUBLIC_GISCUS_CATEGORY`** (optional): Giscus discussion category name
- **`PUBLIC_GISCUS_CATEGORY_ID`** (optional): Giscus category ID

### Setup Steps

1. Connect your repository to Vercel
2. Configure environment variables in Vercel project settings
3. Deploy - Vercel will automatically detect the Astro framework and use the configuration in `vercel.json`

The build will automatically:
- Clone the content repository specified in `CONTENT_REPO_URL`
- Sync attachments from the content repository
- Build the static site
- Generate search index with Pagefind
