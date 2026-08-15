# Browser tests

Tests that need a real browser, because the thing under test is what the
compositor puts on screen. `npm test` (vitest) cannot see any of it.

## Running

These need a dev server already up, and they drive **your installed Chrome**
(`channel: 'chrome'`) rather than a downloaded browser — so there is no
`npx playwright install` step:

```bash
CONTENT_DIR=fixtures/Team-Guidebook npm run dev   # in one terminal
npm run test:e2e                                  # in another
```

Override the target with `BASE=http://localhost:4321 npm run test:e2e`.

## Not in CI, deliberately

CI would need a browser image and a served build, which roughly doubles its
runtime. That is a real cost for one test, so it is a decision to take
explicitly rather than by drift — see the discussion on the PR for issue #33.

Until then these are run by hand when touching the background layers, and the
harnesses are written to be self-explanatory about what they assert and why.

## `background-flash.mjs` — issue #33

Asserts that once a page's static backdrop image has loaded, the backdrop never
goes black again.

The bug it locks down: `RippleBackground`'s canvas was created with
`alpha: false`, making it opaque, so it cleared to **black** over the static
backdrop for the ~240ms its texture took to load — a visible flash on every
navigation.

**If you change this file, validate it both ways.** It must go red with
`alpha: false` in `src/components/react/RippleBackground.tsx` and green with
`alpha: true`. Two earlier versions of this harness passed against known-bad
code; the reasons are written up in the file's header comment, because they are
easy to re-derive and expensive to rediscover.
