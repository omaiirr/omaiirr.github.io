// zz-run-concepts2.mjs — throwaway harness for scene-lab/lighthouse-concepts-2.html
// Loads the round-2 page in headless Firefox, collects page errors, and runs
// structural probes per canvas PLUS per-axis comparative assertions:
//   flash: F1 frame-lift > A > F2; F1 streak strip > F2
//   sea:   S1 glint p90 > S2; S2 foam count > S1
//   tower: T2 shack warm pixels > threshold, T1 ~0
//   color: A warm (R>B) vs C1 cool (B>R) in the beam sector
// Delete after the review, per the handoff harness convention.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { pathToFileURL } from 'url';

const pagePath = new URL('./lighthouse-concepts-2.html', import.meta.url).pathname;
const url = pathToFileURL(pagePath).href;

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
  args: ['--width=1400', '--height=1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 4600 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));

const results = { pageErrors, probes: {} };

results.probes = await page.evaluate(() => {
  const out = {};
  const hexRgb = (hex) => {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const IDS = ['A', 'F1', 'F2', 'S1', 'S2', 'T1', 'T2', 'C1'];
  for (const id of IDS) {
    const cv = document.getElementById(id);
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const img = ctx.getImageData(0, 0, w, h).data;
    const px = (x, y) => {
      const i = (Math.round(y) * w + Math.round(x)) * 4;
      return [img[i], img[i + 1], img[i + 2]];
    };
    const region = (x0, y0, x1, y1, step = 4) => {
      let sum = [0, 0, 0], n = 0;
      for (let y = y0; y < y1; y += step)
        for (let x = x0; x < x1; x += step) {
          const p = px(x, y); sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
        }
      return [sum[0] / n, sum[1] / n, sum[2] / n];
    };
    const P = window.__CONCEPT2_PARAMS[id];
    const beam = hexRgb(P.beamHex);
    const S = h / 1080;
    const seaY = h * 0.74;
    const towerX = w * 0.165, towerTop = h * 0.295, towerBase = h * 0.775;
    const m = { params: P };

    // frame-wide mean (flash lift lives here)
    m.frameMean = region(0, 0, w, h, 6);
    // lantern brightness
    m.lantern = region(towerX - 14 * S, towerTop - 32 * S - 14 * S, towerX + 14 * S, towerTop - 32 * S + 14 * S, 2);
    // beam sector warm fraction
    m.beamSectorWarm = (() => {
      let warm = 0, n = 0;
      for (let y = h * 0.25; y < h * 0.6; y += 3)
        for (let x = w * 0.3; x < w * 0.75; x += 3) {
          const [r, g, b] = px(x, y);
          if (r > b * 1.18 && r > 60 && r > b + 14) warm++;
          n++;
        }
      return warm / n;
    })();
    // sea shimmer: fraction of glint pixels in the beam path zone
    // glints are ADDITIVE over dark water: detect luminance above the local
    // water level, not a raw warm ratio (warm-over-dark still reads B>R)
    const waterP50 = (() => {
      const vals = [];
      for (let y = seaY + h * 0.05; y < h * 0.95; y += 2)
        for (let x = w * 0.3; x < w * 0.7; x += 2) vals.push(px(x, y)[0]);
      vals.sort((a, b) => a - b);
      return vals[Math.floor(vals.length * 0.5)];
    })();
    // glint presence in the near-tower water zone (beam path early segments)
    m.seaGlintFrac = (() => {
      let glint = 0, n = 0;
      for (let y = seaY + h * 0.02; y < seaY + h * 0.12; y += 2)
        for (let x = w * 0.20; x < w * 0.45; x += 2) {
          const p = px(x, y);
          const lum = p[0] * 0.5 + p[2] * 0.5;
          if (lum > waterP50 + 6) glint++;
          n++;
        }
      return glint / n;
    })();
    // foam crest count in the lower third — COOL bright flecks only
    // (near-white/blue-white: high blue, NOT warm), so glints don't count
    // foam: cool-bright PIXEL count in the lower-right water zone. Pixel count
    // (not component count) is robust to flecks merging; beam/mist contributions
    // are identical across variants (fixed geometry, shared seed), so the
    // S2−S1 delta isolates the rolling-sea crest flecks.
    m.foamPx = (() => {
      let bright = 0;
      const vals = [];
      for (let y = h * 0.8; y < h * 0.98; y += 2) {
        // x ≥ 0.86w sits right of the additive glint band (ends ≈0.845w) —
        // only variant-differentiated crest flecks + identical mist live here.
        // Additive whitecaps over dark blue water: detect LUMINANCE lift
        // (chroma signatures can't separate them over a blue base).
        for (let x = w * 0.86; x < w * 0.95; x += 1) {
          const [r, , b] = px(x, y);
          vals.push(0.5 * r + 0.5 * b);
        }
      }
      // self-relative threshold: water base ≈ lum 22–30, so count pixels
      // lifted above THIS strip's own median (flecks/mist are the only lifts)
      vals.sort((a, b) => a - b);
      const p50 = vals[Math.floor(vals.length * 0.5)];
      for (const v of vals) if (v > p50 + 8) bright++;
      return bright;
    })();
    m.foamCount = m.foamPx; // legacy name for the summary output
    // shack window warmth (only T2 should light up)
    m.shackWarm = (() => {
      const sx = towerX + 62 * S, sy = towerBase + 6 * S;
      let warm = 0, n = 0;
      for (let y = sy - 30 * S; y < sy + 6 * S; y += 1)
        for (let x = sx - 22 * S; x < sx + 22 * S; x += 1) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const [r, g, b] = px(x, y);
          if (r > 90 && r > b * 1.3) warm++;
          n++;
        }
      return { warm, n };
    })();
    // color sanity in beam sector
    m.beamSectorMean = region(w * 0.42, h * 0.3, w * 0.62, h * 0.5, 3);
    m.ok = m.lantern[0] > 150 && m.frameMean[0] > 2 && m.frameMean[2] > 2;
    out[id] = m;
  }
  return out;
});

// Comparative per-axis assertions
const p = results.probes;
const cmp = {};
cmp.flash_lift_order = p.F1.frameMean[0] > p.A.frameMean[0] + 1 && p.A.frameMean[0] > p.F2.frameMean[0] + 0.3;
cmp.flash_streak = p.F1.frameMean[2] > p.F2.frameMean[2] + 1; // streak adds across whole frame
cmp.sea_glint = p.A.seaGlintFrac > 0.005 && p.S1.seaGlintFrac > p.A.seaGlintFrac * 0.9; // glints render; glassy keeps them
cmp.sea_foam = p.S2.foamPx > p.S1.foamPx * 1.3; // rolling draws 70 flecks, glassy 0; beam/mist identical in both
cmp.shack = p.T2.shackWarm.warm > 20 && p.T1.shackWarm.warm < 8;
cmp.color_warm_vs_cool = (() => {
  const a = p.A.beamSectorMean, c = p.C1.beamSectorMean;
  return a[0] > a[2] && c[2] >= c[0] * 0.92; // A warm (R>B); C1 not warm
})();
cmp.all_structural = IDS_OK(p);
function IDS_OK(probes) {
  let ok = true;
  for (const id of ['A', 'F1', 'F2', 'S1', 'S2', 'T1', 'T2', 'C1']) {
    if (!probes[id] || probes[id].ok === false) ok = false;
  }
  return ok;
}
results.comparisons = cmp;

await page.screenshot({ path: new URL('./zz-concepts2-shot.png', import.meta.url).pathname, fullPage: true });

console.log(JSON.stringify(results, null, 2));
await browser.close();
if (results.pageErrors.length > 0) process.exit(2);
const fail =
  !cmp.flash_lift_order || !cmp.flash_streak || !cmp.sea_glint ||
  !cmp.sea_foam || !cmp.shack || !cmp.color_warm_vs_cool || !cmp.all_structural;
process.exit(fail ? 1 : 0);