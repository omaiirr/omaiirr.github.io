// zz-uo-shot-before-s6.mjs — honest BEFORE shots for surface 6 (theme editor chrome).
// The old zz-uo-before-editor.png predates the icon rounds; re-shoot current state.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  const isNoise = (t) => /downloadable font/i.test(t) || /Cross-Origin Request Blocked/i.test(t) || /cdnjs\.cloudflare/i.test(t);
  page.on('pageerror', (e) => { if (!isNoise(e.message)) errors.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  // Open the editor directly (same method as zz-uo-before-all.mjs)
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(900);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-s6-editor.png' });

  // Footer more-menu open (footer buttons + menu are in scope)
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-s6-footermenu.png' });
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(200);

  // Colors tab (secondary sidebar + form chrome context)
  await page.evaluate(() => document.querySelector('.te-tab-btn[data-tab="colors"]')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-s6-colors.png' });

  console.log('before-s6 shots saved');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally {
  await browser.close();
}
