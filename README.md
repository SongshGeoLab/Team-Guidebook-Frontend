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
- No vault access? Build against the committed fixtures instead:
  `CONTENT_DIR=fixtures/Team-Guidebook npm run build`. `fixtures/Team-Guidebook/`
  holds a handful of fake entries covering every collection. CI uses exactly this,
  which keeps the pipeline hermetic — no secrets, no dependency on the private
  content repository.

See [Configuration Guide](./docs/CONFIGURATION.md) for detailed setup instructions, especially for private content repositories.

For content maintainers, see [Content Maintenance Guide](./docs/CONTENT_MAINTENANCE.md) for instructions on how to maintain content in the `Team-Guidebook` repository.

## Commands

| Command             | Action                               |
| :------------------ | :----------------------------------- |
| `npm install`       | Install dependencies                 |
| `npm run check`     | Type-check (`astro check`)           |
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

## Version Management (Release Please)

This project uses [Release Please](https://github.com/googleapis/release-please) to automatically manage versions and releases based on [Conventional Commits](https://www.conventionalcommits.org/).

### How It Works

1. **Conventional Commits**: Use conventional commit messages in your PRs:
   - `feat:` - New features (triggers minor version bump)
   - `fix:` - Bug fixes (triggers patch version bump)
   - `feat!:` or `BREAKING CHANGE:` - Breaking changes (triggers major version bump)
   - `docs:`, `style:`, `refactor:`, `test:`, `chore:` - No version bump

2. **Automatic Release PRs**: When you push to `main` branch, Release Please will:
   - Analyze commits since the last release
   - Update `CHANGELOG.md` with new changes
   - Update `package.json` version
   - Create a release PR with the changes

3. **Publishing Releases**: When the release PR is merged:
   - A new git tag is created (e.g., `v1.0.0`)
   - A GitHub release is created with the changelog
   - The version in `package.json` is updated

### Example Commit Messages

```bash
# Feature (minor version bump)
git commit -m "feat: add new search functionality"

# Bug fix (patch version bump)
git commit -m "fix: resolve image loading issue"

# Breaking change (major version bump)
git commit -m "feat!: refactor content loading API"
```

### Manual Release

If you need to manually trigger a release, you can:

1. Create a release PR manually by running the Release Please workflow
2. Or use the GitHub CLI:
   ```bash
   gh workflow run release-please.yml
   ```

For more information, see the [Release Please documentation](https://github.com/googleapis/release-please).

## License

- **Code** — [MIT](./LICENSE).
- **Content** — the prose and images sourced from the `Team-Guidebook` vault and
  rendered into these pages are [CC BY 4.0](./LICENSE-CONTENT).
