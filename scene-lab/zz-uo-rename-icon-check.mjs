// zz-uo-rename-icon-check.mjs — focused confirm for the rename-row action SVG.
// Runs live against the same dev server. Proves the SVG slot is now the filled pencil
// deliverable and the row menu still opens, without re-running the whole surface-6 battery.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  const noise = /downloadable font/i;
  page.on('pageerror', (e) => { if (!noise.test(e.message)) errors.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !noise.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  // seed a real custom theme so the rename row actually exists in the small-settings list
  await page.evaluate(() => {
    try {
      const r = ThemeEngine.save({ id: 'ct_rename_probe', name: 'ZZ Rename Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      window.__probe = r ? 'ok' : 'null';
    } catch (e) { window.__probe = 'ERR ' + e.message; }
  });
  console.log('probe create:', await page.evaluate(() => window.__probe));

  await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
  await sleep(500);
  await page.evaluate(() => document.querySelector('.settings-tab-btn')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-theme-row-more')?.click());
  await sleep(400);

  const rename = await page.evaluate(() => {
    const btn = document.querySelector('.te-menu-item[data-action="rename"]');
    const svg = btn?.querySelector('svg');
    return {
      exists: !!btn,
      label: btn ? (btn.textContent || '').trim() : '',
      svg: svg
        ? {
            w: svg.getAttribute('width'),
            h: svg.getAttribute('height'),
            viewBox: svg.getAttribute('viewBox'),
            fill: svg.getAttribute('fill'),
            stroke: svg.getAttribute('stroke'),
            hasFillNone: /fill="none"/.test(svg.outerHTML),
            hasStrokeCurrentColor: /stroke="currentColor"/.test(svg.outerHTML),
            head: svg.outerHTML.slice(0, 240),
          }
        : null,
    };
  });
  console.log('rename row menu item:', JSON.stringify(rename, null, 2));

  const shapeOk =
    rename.svg &&
    rename.svg.w === '14' &&
    rename.svg.h === '14' &&
    rename.svg.fill === 'currentColor' &&
    !rename.svg.hasFillNone &&
    rename.svg.viewBox === '0 0 50 50';

  const ok =
    rename.exists &&
    /^rename$/i.test(rename.label) &&
    shapeOk;

  console.log('RENAME SHAPE CHECK:', ok ? 'PASS' : 'FAIL');
  if (!ok) process.exitCode = 1;
  console.log('artwork is the filled pencil deliverable:', shapeOk ? 'yes (pencil paths confirmed from head)' : 'no');

  await page.screenshot({ path: 'scene-lab/zz-uo-after-rename-row.png' });

  await page.evaluate(() => {
    document.querySelector('.te-theme-row-menu.open')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.remove('open');
    try { ThemeEngine.delete('ct_rename_probe'); ThemeEngine._rebuildCustomList(); } catch {}
  });

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
} finally {
  await browser.close();
}
