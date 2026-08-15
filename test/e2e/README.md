# Browser tests

Tests that need a real browser, because the thing under test is what the
compositor puts on screen. `npm test` (vitest) cannot see any of it.

## Running

These need a dev server already up, and they drive **your installed Chrome**
(`channel: 'chrome'`) rather than a downloaded browser — so there is no
`npx playwright install` step:

```bash
CONTENT_DIR=fixtures/Team-Guidebook npm run dev   # in one terminal, serves :4321
npm run test:e2e                                  # in another
```

Astro takes the next free port if 4321 is busy, so pass `BASE` when it does:
`BASE=http://localhost:4323 npm run test:e2e`.

The dev server is the convenient target, not the authoritative one. Before
trusting a green run on anything release-shaped, point it at the built site —
that is the artifact readers get, and `.cursor/rules/Astro.mdc` asks for e2e
against the build:

```bash
CONTENT_DIR=fixtures/Team-Guidebook npm run build && npm run preview
BASE=http://localhost:4321 npm run test:e2e
```

## Not in CI, deliberately

CI would need a browser image and a served build, which roughly doubles its
runtime. That is a real cost for one test, so it is a decision to take
explicitly rather than by drift — see the discussion on the PR for issue #33.

Until then these are run by hand when touching the background layers, and the
harnesses are written to be self-explanatory about what they assert and why.

## `background-flash.mjs` — issue #33

Asserts that once a page's static backdrop image has loaded, the backdrop never
goes black again.

The bug it locks down, and why, is written where the fix lives — see the
comment on `gl={{ alpha }}` in `src/components/react/RippleBackground.tsx`.

**If you change this file, validate it both ways.** It must go red with
`alpha: false` in `src/components/react/RippleBackground.tsx` and green with
`alpha: true`. Two earlier versions of this harness passed against known-bad
code; the reasons are written up in the file's header comment, because they are
easy to re-derive and expensive to rediscover.
