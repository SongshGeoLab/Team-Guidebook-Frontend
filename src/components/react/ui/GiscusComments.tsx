import { useEffect, useRef } from 'react';

/** Map our two-letter locales onto the ones Giscus actually accepts. */
const GISCUS_LOCALES: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en'
};

interface GiscusCommentsProps {
  /**
   * GitHub repository in format: owner/repo
   * Example: "songshgeo/Team-Guidebook-Frontend"
   */
  repo: string;
  /**
   * GitHub repository ID (numeric)
   * Can be found at: https://github.com/settings/installations
   * Or use giscus.app to generate the script and extract repo-id
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
   * Mapping strategy for discussion threads
   * Options: "pathname" | "url" | "title" | "og:title"
   * Default: "pathname"
   */
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  /**
   * Term used for discussion mapping
   * Default: "pathname"
   */
  term?: string;
  /**
   * Enable reactions (👍 👎)
   * Default: true
   */
  reactionsEnabled?: boolean;
  /**
   * Emit metadata to parent page
   * Default: false
   */
  emitMetadata?: boolean;
  /**
   * Input position: "top" | "bottom"
   * Default: "bottom"
   */
  inputPosition?: 'top' | 'bottom';
  /**
   * Theme: "light" | "dark" | "preferred_color_scheme" | "dark_dimmed" | "transparent_dark" | etc.
   * Default: "preferred_color_scheme"
   */
  theme?: string;
  /**
   * Language code
   * Default: "en"
   */
  lang?: string;
  /**
   * Loading strategy: "lazy" | "eager"
   * Default: "lazy"
   */
  loading?: 'lazy' | 'eager';
  /**
   * Unique identifier for this comment section
   * Used to generate unique discussion threads
   */
  identifier?: string;
}

/**
 * Giscus Comments Component
 * 
 * Embeds Giscus (GitHub Discussions-based comments) into a page.
 * 
 * @see https://giscus.app for configuration and setup instructions
 */
export function GiscusComments({
  repo,
  repoId,
  category,
  categoryId,
  mapping = 'pathname',
  term = 'pathname',
  reactionsEnabled = true,
  emitMetadata = false,
  inputPosition = 'bottom',
  theme = 'preferred_color_scheme',
  lang = 'en',
  loading = 'lazy',
  identifier
}: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptLoadedRef.current) return;

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', category);
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', mapping);
    // Use identifier for term if provided, otherwise use term prop
    script.setAttribute('data-term', identifier || term);
    script.setAttribute('data-reactions-enabled', reactionsEnabled ? '1' : '0');
    script.setAttribute('data-emit-metadata', emitMetadata ? '1' : '0');
    script.setAttribute('data-input-position', inputPosition);
    script.setAttribute('data-theme', theme);
    // Giscus's locale list uses zh-CN / zh-TW; a bare 'zh' is not valid and
    // silently falls back to the English UI.
    script.setAttribute('data-lang', GISCUS_LOCALES[lang] ?? lang);
    script.setAttribute('data-loading', loading);

    script.crossOrigin = 'anonymous';
    script.async = true;

    // Clear container and append script
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    scriptLoadedRef.current = true;

    // Cleanup function.
    // Detach via the script's own parentNode rather than containerRef.current:
    // by the time cleanup runs the ref may already point elsewhere (or be
    // null), which would leak the iframe. The script knows its own parent.
    return () => {
      script.parentNode?.removeChild(script);
      scriptLoadedRef.current = false;
    };
  }, [
    repo,
    repoId,
    category,
    categoryId,
    mapping,
    term,
    reactionsEnabled,
    emitMetadata,
    inputPosition,
    theme,
    lang,
    loading,
    identifier
  ]);

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <div ref={containerRef} className="giscus" />
    </div>
  );
}

