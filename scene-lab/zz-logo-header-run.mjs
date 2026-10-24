// zz-logo-header-run.mjs — logo mark geometry + header inset battery.
//
// Pins the two things the header refactor promised:
//   • the third (dashed) ticket's outline starts at the middle ticket's right
//     edge (x=937) and leaves a gap exactly over that ticket's tab joint, with a
//     stroke that survives the 32px header size, and
//   • the top-left branding group sits on the SAME gutter as the bottom FABs.
//   node scene-lab/zz-logo-header-run.mjs   → ALL GREEN, exit 0
import { readFileSync } from 'node:fs';
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 170) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('== 1. the dashed ticket outline in assets/logo.svg');
const svg = readFileSync(new URL('../assets/logo.svg', import.meta.url), 'utf8');
const svgMarkup = svg.replace(/<!--[\s\S]*?-->/g, ''); // comments explain the choices; don't read them as code
const tag = (svgMarkup.match(/<path[^>]*stroke-dasharray="[^"]+"[^>]*\/>/) || [''])[0];
const dashed = tag.match(/d="([^"]+)"/);
const dashArr = tag.match(/stroke-dasharray="([^"]+)"/);
check('there is exactly one dashed outline', !!dashed, dashArr ? dashArr[1] : 'not found');
if (dashed) {
  const d = dashed[1];
  const strokeW = Number(tag.match(/stroke-width="(\d+)"/)?.[1] || 0);
  check('the outline is a single real dashed path (not hand-drawn segments)', (d.match(/M/g) || []).length === 1, `${(d.match(/M/g) || []).length} subpaths`);
  check('the left border starts at the middle ticket seam (x=937)', /^M937 296/.test(d), d.slice(0, 24));
  check('the left border ends above the seam too (x=937)', /937 35V132$/.test(d), d.slice(-24));
  // The middle ticket's tab joint is the blue semicircle at x=937 spanning
  // y=134…294 — the dashed border must leave that whole span open.
  check('the gap covers the tab joint (y 134…294)', 132 <= 134 && 296 >= 294, 'gap y=132…296 vs tab y=134…294');
  check('the ribbon is thick enough to render at 32px', strokeW === 9, `stroke-width=${strokeW}`);
  check('the dash pattern keeps whole dashes when scaled down', dashArr[1].trim() === '30 22', dashArr[1]);
  check(
    'non-scaling-stroke is deliberately NOT set (it would pin 9 device px)',
    !/non-scaling-stroke/.test(svgMarkup) && !/vector-effect/.test(tag),
    'absent',
  );
  // 1400x416 viewBox at a 32px-tall header: one device px ≈ 13 viewBox units.
  const scale = 32 / 416;
  check('the rendered ribbon is proportional, not hairline', strokeW * scale >= 0.6 && strokeW * scale <= 1, `${(strokeW * scale).toFixed(2)}px`);
}

console.log('== 2. the branding group shares the FAB gutter');
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed: ornate/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1000);

  const geo = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    };
    return {
      logo: box('.logo-container'),
      mark: box('.logo-mark'),
      planner: box('.planner-btn'),
      settings: box('.settings-btn'),
      edge: getComputedStyle(document.documentElement).getPropertyValue('--app-edge').trim(),
    };
  });
  check('the logo group is on screen', !!geo.logo && !!geo.mark, JSON.stringify(geo.logo));
  check('the planner FAB is on screen', !!geo.planner, JSON.stringify(geo.planner));
  check('one gutter variable drives both', geo.edge === '30px', geo.edge);
  check(
    'the branding left edge matches the planner FAB left edge',
    geo.logo && geo.planner && Math.abs(geo.logo.left - geo.planner.left) < 0.6,
    `logo ${geo.logo?.left} vs fab ${geo.planner?.left}`,
  );
  check(
    'the settings FAB mirrors the same gutter on the right',
    geo.settings && Math.abs(1440 - geo.settings.right - geo.planner.left) < 0.6,
    `right inset ${geo.settings ? (1440 - geo.settings.right).toFixed(2) : 'n/a'} vs left ${geo.planner.left}`,
  );
  check(
    'the mark itself has no transparent side padding (paints from the gutter)',
    geo.mark && Math.abs(geo.mark.left - geo.logo.left) < 0.6,
    `mark ${geo.mark?.left} vs container ${geo.logo?.left}`,
  );
  check(
    'the mark is 32px tall as authored',
    geo.mark && Math.abs(geo.mark.h - 32) < 0.6,
    `${geo.mark?.h}px`,
  );
  check(
    'the mark keeps the logo aspect ratio (1400:416)',
    geo.mark && Math.abs(geo.mark.w / geo.mark.h - 1400 / 416) < 0.02,
    geo.mark && (geo.mark.w / geo.mark.h).toFixed(3),
  );

  // Narrow viewport: the gutter must stay on the same line as the FABs.
  await page.setViewport({ width: 420, height: 800 });
  await sleep(400);
  const narrow = await page.evaluate(() => {
    const l = document.querySelector('.logo-container')?.getBoundingClientRect();
    const p = document.querySelector('.planner-btn')?.getBoundingClientRect();
    return { logoLeft: l && +l.left.toFixed(2), fabLeft: p && +p.left.toFixed(2), markH: document.querySelector('.logo-mark')?.getBoundingClientRect().height };
  });
  check(
    'the gutter still matches at 420px wide',
    narrow.logoLeft != null && Math.abs(narrow.logoLeft - narrow.fabLeft) < 0.6,
    JSON.stringify(narrow),
  );
  check('the mark shrinks on small screens', narrow.markH <= 24.6, `${narrow.markH}px`);

  console.log('== 3. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
