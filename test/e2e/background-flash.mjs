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

// Astro's default; astro.config.mjs sets no server.port. It will pick 4322,
// 4323... if that is taken, hence the override.
const BASE = process.env.BASE ?? 'http://localhost:4321';
const SAMPLE_MS = 40;
const WATCH_MS = 1800;
/**
 * A strip below the header, where the backdrop is unobstructed by text.
 * Coupled to the viewport pinned below and to the header's height — if either
 * changes, re-check that this rectangle still lands on bare backdrop, or the
 * test goes green without measuring anything.
 */
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
  // failure goes away with it.
  reducedMotion: process.env.REDUCED_MOTION === 'reduce' ? 'reduce' : 'no-preference',
});

// Warm the HTTP and image cache so we measure the flash, not a cold fetch.
await page.goto(`${BASE}/zh/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

// Selected by href, not by link text. Nav labels are translated and site.md
// can replace the whole nav (`site.nav ?? defaultNav` in Header.astro), so
// matching on "研究" would turn a content edit into a red test for a reason
// that has nothing to do with this bug.
await Promise.all([page.waitForURL(/\/research\/?$/), page.click('nav a[href="/zh/research/"]')]);

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
// POSITIVE CONTROL, and the reason this test is not vacuous.
//
// The bug is the canvas painting black. If the island never hydrates, or the
// machine has no WebGL, there is no canvas, therefore no black, therefore the
// assertion below passes — while proving nothing, and passing identically with
// `alpha: false`. That is precisely the failure this file's header describes.
// So require the canvas to have been SIZED BY r3f before believing a PASS.
//
// Checking merely that a <canvas> exists is not enough, and that mistake was
// made here first: Astro server-renders the element even when the island never
// hydrates, leaving it at the HTML default of 300x150. Only a hydrated canvas
// is stretched to the viewport, so compare against that.
const canvas = await page.evaluate(() => {
  const el = document.querySelector('canvas');
  return el ? { w: el.width, h: el.height, viewportWidth: window.innerWidth } : null;
});
await browser.close();

console.log(`samples (t:luma) -> ${samples.map((s) => `${s.t}:${s.luma.toFixed(0)}`).join(' ')}`);

if (!canvas || canvas.w < canvas.viewportWidth) {
  console.log(
    `\nINCONCLUSIVE: <canvas> was never sized to the viewport (${JSON.stringify(canvas)}). ` +
      'The island did not hydrate, so this run could not have observed the bug either way — ' +
      'a PASS here would mean nothing. Check WebGL availability and that REDUCED_MOTION is unset.',
  );
  process.exit(2);
}

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
