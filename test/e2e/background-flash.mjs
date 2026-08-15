/**
 * Regression loop for issue #33 — "background image shows, goes black, comes
 * back" on every navigation.
 *
 * The invariant, stated precisely:
 *
 *   Once the new document's static backdrop <img> has loaded, the backdrop
 *   must never be black again.
 *
 * Anchoring on the <img> being loaded — not on a luma heuristic — is what
 * makes this deterministic. Two earlier attempts failed for instructive
 * reasons, both recorded here so nobody re-derives them:
 *
 *   - "no lit -> dark -> lit dip" latched onto the document swap, a single
 *     frame inherent to any MPA navigation. It was red before the fix AND
 *     after it, and red for the wrong reason before — which nearly sent the
 *     diagnosis down the wrong path.
 *   - "no dark after the first lit frame following a dark one" was flaky:
 *     whether the static image got a sampled lit frame before the canvas
 *     covered it was a race with the 40ms sampling interval, so the harness
 *     passed against known-bad code.
 *
 * Validate any change to this file the same way: it MUST go red with
 * `alpha: false` in RippleBackground.tsx and green with `alpha: true`.
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = process.env.BASE ?? 'http://localhost:4323';
const SAMPLE_MS = 40;
const WATCH_MS = 1800;
/** A strip below the header, where the backdrop is unobstructed by text. */
const CLIP = { x: 700, y: 120, width: 300, height: 160 };
const DARK_MAX = 18; // at or below this the backdrop has gone black

function meanLuma(buf) {
  const png = PNG.sync.read(buf);
  let sum = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    sum += 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
  }
  return sum / (png.data.length / 4);
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  // The island is gated on this media query; with `reduce` it never mounts and
  // the bug cannot occur. Pinned for determinism; set RM=reduce to confirm that
  // suppressing the island makes the failure go away.
  reducedMotion: process.env.RM === 'reduce' ? 'reduce' : 'no-preference',
});

// Warm the HTTP and image cache so we measure the flash, not a cold fetch.
await page.goto(`${BASE}/zh/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const target = process.argv[2] ?? '研究';
await Promise.all([page.waitForURL(/\/research\/?$/), page.click(`nav a:has-text("${target}")`)]);

// The anchor: the server-rendered backdrop image is decoded and paintable on
// the NEW document. Everything after this instant is the new page's own doing.
await page.waitForFunction(() => {
  const img = document.querySelector('img[src*="background.jpg"]');
  return !!img && img.complete && img.naturalWidth > 0;
});

const samples = [];
const started = Date.now();
while (Date.now() - started < WATCH_MS) {
  samples.push({ t: Date.now() - started, luma: meanLuma(await page.screenshot({ clip: CLIP })) });
  await new Promise((r) => setTimeout(r, SAMPLE_MS));
}
await browser.close();

console.log(`samples (t:luma) -> ${samples.map((s) => `${s.t}:${s.luma.toFixed(0)}`).join(' ')}`);

const black = samples.filter((s) => s.luma <= DARK_MAX);
if (black.length) {
  console.log(
    `\nFAIL (issue #33): backdrop black for ~${black.length * SAMPLE_MS}ms after the static image had loaded — ` +
      black.map((s) => `${s.t}ms:${s.luma.toFixed(1)}`).join(' '),
  );
  process.exit(1);
}
console.log(
  `\nPASS: backdrop never went black (min luma ${Math.min(...samples.map((s) => s.luma)).toFixed(1)})`,
);
