// zz-run-concepts.mjs — throwaway harness for scene-lab/lighthouse-concepts.html
// Loads the page in headless Firefox, collects page errors, screenshots each
// canvas, and runs structural pixel probes (sky/sea/tower/beam/lantern/foam).
// Delete after the concept review, per the handoff harness convention.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { pathToFileURL } from 'url';
import { writeFileSync } from 'fs';

const pagePath = new URL('./lighthouse-concepts.html', import.meta.url).pathname;
const url = pathToFileURL(pagePath).href;

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
  args: ['--width=1400', '--height=1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 2400 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));

const results = { pageErrors, probes: {} };
const canvasInfo = await page.evaluate(() => {
  const out = {};
  for (const id of ['a', 'b', 'c']) {
    const cv = document.getElementById(id);
    out[id] = cv ? { w: cv.width, h: cv.height } : null;
  }
  out.title = document.title;
  return out;
});
results.canvasInfo = canvasInfo;

// Probe each canvas: region brightness/color censuses via getImageData
results.probes = await page.evaluate(() => {
  const out = {};
  const hexRgb = (hex) => {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  for (const id of ['a', 'b', 'c']) {
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
    const warmCensus = (x0, y0, x1, y1, beam) => {
      // fraction of pixels where R > B significantly and brightness above floor
      let warm = 0, n = 0;
      const [br, bg, bb] = beam;
      for (let y = y0; y < y1; y += 3)
        for (let x = x0; x < x1; x += 3) {
          const [r, g, b] = px(x, y);
          if (r > b * 1.18 && r > 60 && r > b + 14) warm++;
          n++;
        }
      return warm / n;
    };
    const seaY = h * 0.74;
    const beam = hexRgb('#ffe1a8');
    const P = window.__CONCEPT_PARAMS[id];
    const S = (h / 1080) * P.scale;
    const towerX = w * P.tx, towerTop = h * P.topY, towerBase = h * P.baseY;
    const m = {};
    m.skyRegion = region(w * 0.55, h * 0.04, w * 0.9, h * 0.22);
    m.seaRegion = region(w * 0.5, seaY + h * 0.08, w * 0.9, h * 0.95);
    m.towerRegion = region(towerX - w * 0.02, towerTop + (towerBase - towerTop) * 0.6, towerX + w * 0.02, towerTop + (towerBase - towerTop) * 0.85);
    m.towerLit = (() => { // plaster band brighter than red band? (fractions of TOWER height)
      const f = (fr) => towerTop + (towerBase - towerTop) * fr;
      const pl = region(towerX - 10 * S, f(0.66), towerX + 10 * S, f(0.80), 2); // plaster band [0.60..1.0]
      const rd = region(towerX - 10 * S, f(0.48), towerX + 10 * S, f(0.58), 2); // red band [0.46..0.60]
      return pl[0] > rd[0] && pl[1] > rd[1];
    })();
    m.lantern = region(towerX - 14 * S, towerTop - 32 * S - 14 * S, towerX + 14 * S, towerTop - 32 * S + 14 * S, 2);
    m.lanternBright = m.lantern[0] > 150 && m.lantern[1] > 130;
    m.beamSectorWarm = warmCensus(w * 0.3, h * 0.25, w * 0.75, h * 0.6, beam);
    m.skyControlWarm = warmCensus(w * 0.4, h * 0.02, w * 0.95, h * 0.10, beam);
    m.moonGlintZone = (() => { // moon glint present: 90th-pct red channel beats control's 90th pct
      if (id === 'c') return null;
      const mx = id === 'a' ? w * 0.30 : w * 0.74;
      const p90 = (x0, y0, x1, y1) => {
        const vals = [];
        for (let y = y0; y < y1; y += 2)
          for (let x = x0; x < x1; x += 2) vals.push(px(x, y)[0]);
        vals.sort((a, b) => a - b);
        return vals[Math.floor(vals.length * 0.9)];
      };
      const glint = p90(mx - w * 0.05, seaY + h * 0.02, mx + w * 0.05, seaY + h * 0.10);
      // control mirrored to the other side of the moon column, away from the
      // seaward beam glint path (which travels right of the tower in A/B)
      const ctrl = p90(Math.max(0, mx - w * 0.26), seaY + h * 0.02, Math.max(w * 0.02, mx - w * 0.13), seaY + h * 0.10);
      return { glint, ctrl, brighter: glint > ctrl + 2 };
    })();
    m.foamNearRocks = (() => {
      const r = region(w * 0.03, seaY + h * 0.005, w * 0.22, seaY + h * 0.03, 2);
      return r[2] > 18; // bluish foam light over near-black rocks
    })();
    m.seaDark = m.seaRegion[0] < 40 && m.seaRegion[2] < 70;
    m.skyDark = m.skyRegion[0] < 60;
    results_ok: {
      m.ok =
        m.towerLit === true &&
        m.lanternBright === true &&
        m.beamSectorWarm > 0.04 &&
        m.beamSectorWarm > m.skyControlWarm * 1.5 &&
        m.seaDark === true &&
        m.skyDark === true &&
        m.foamNearRocks === true;
    }
    out[id] = m;
  }
  return out;
});

// Screenshot for optional human eyeball fallback
await page.screenshot({ path: new URL('./zz-concepts-shot.png', import.meta.url).pathname, fullPage: true });

console.log(JSON.stringify(results, null, 2));
await browser.close();
if (results.pageErrors.length > 0) process.exit(2);
let fail = false;
for (const [id, p] of Object.entries(results.probes)) {
  if (!p || p.ok === false) { fail = true; }
}
process.exit(fail ? 1 : 0);