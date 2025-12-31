/**
 * Giscus Comments Configuration
 * 
 * Giscus is a comments system powered by GitHub Discussions.
 * 
 * Setup instructions:
 * 1. Go to https://giscus.app
 * 2. Enter your repository information
 * 3. Configure the discussion category
 * 4. Copy the configuration values and set them here or via environment variables
 * 
 * @see https://giscus.app for more information
 */

export interface GiscusConfig {
  /**
   * GitHub repository in format: owner/repo
   * Example: "songshgeo/Team-Guidebook-Frontend"
   */
  repo: string;
  /**
   * GitHub repository ID (numeric)
   * Can be found at: https://github.com/settings/installations
   */
  repoId: string;
  /**
   * Category name for discussions
   * Example: "Announcements"
   */
  category: string;
  /**
   * Category ID (numeric)
   * Can be found in GitHub Discussions settings
   */
  categoryId: string;
  /**
   * Theme: "light" | "dark" | "preferred_color_scheme" | "dark_dimmed" | "transparent_dark" | etc.
   * Default: "preferred_color_scheme"
   */
  theme?: string;
}

/**
 * Get Giscus configuration from environment variables or return default/empty config
 * 
 * Environment variables:
 * - PUBLIC_GISCUS_REPO: GitHub repository (e.g., "owner/repo")
 * - PUBLIC_GISCUS_REPO_ID: Repository ID (numeric string)
 * - PUBLIC_GISCUS_CATEGORY: Category name
 * - PUBLIC_GISCUS_CATEGORY_ID: Category ID (numeric string)
 * - PUBLIC_GISCUS_THEME: Theme name (optional)
 */
export function getGiscusConfig(): GiscusConfig | undefined {
  const repo = import.meta.env.PUBLIC_GISCUS_REPO;
  const repoId = import.meta.env.PUBLIC_GISCUS_REPO_ID;
  const category = import.meta.env.PUBLIC_GISCUS_CATEGORY;
  const categoryId = import.meta.env.PUBLIC_GISCUS_CATEGORY_ID;
  const theme = import.meta.env.PUBLIC_GISCUS_THEME;

  // Return undefined if required fields are missing
  if (!repo || !repoId || !category || !categoryId) {
    return undefined;
  }

  return {
    repo,
    repoId,
    category,
    categoryId,
    theme: theme || 'preferred_color_scheme'
  };
}

