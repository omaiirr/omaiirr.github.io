// zz-uo-shot-before-s6b.mjs — before shot for the theme-library shell
// (surface 6 sub-modal). Scene-library shot already captured; this run only
// re-does themelib with explicit state assertions.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  const isNoise = (t) => /downloadable font/i.test(t) || /Cross-Origin Request Blocked/i.test(t) || /cdnjs\.cloudflare/i.test(t) || /thumbnail failed: ornate/i.test(t);
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

  // Theme library via the real entry point, with asserted state
  const st = await page.evaluate(() => {
    const ok = ThemeEngine.openThemeLibrary();
    const tl = document.getElementById('tlModal');
    const sl = document.getElementById('teSceneLibModal');
    return { ok, tlOpen: !!tl && tl.classList.contains('open'), slOpen: !!sl && sl.classList.contains('open') };
  });
  console.log('open state:', JSON.stringify(st));
  await sleep(1500);
  const st2 = await page.evaluate(() => ({
    tlOpen: document.getElementById('tlModal').classList.contains('open'),
    slOpen: document.getElementById('teSceneLibModal').classList.contains('open'),
  }));
  console.log('pre-shot state:', JSON.stringify(st2));
  if (!st2.tlOpen || st2.slOpen) { throw new Error('modal state wrong — refusing to capture a wrong shot'); }
  await page.screenshot({ path: 'scene-lab/zz-uo-before-s6-themelib.png' });

  console.log('before-s6b themelib shot saved');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally {
  await browser.close();
}
