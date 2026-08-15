import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the pure logic under src/utils/ and src/content/loaders/.
 *
 * Deliberately NOT using `getViteConfig` from 'astro/config': that boots the
 * Astro integration pipeline (including the content layer and the WebGL-heavy
 * React islands) for what are plain function tests, and it needs `.content/`
 * to exist. Nothing tested here imports `astro:content`.
 *
 * Anything that does need a built site belongs in an e2e suite, not this one.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The vault fixtures are read from disk by some tests; keep the repo root
    // as cwd so relative paths match what the loaders see at build time.
    root: import.meta.dirname,
  },
});
