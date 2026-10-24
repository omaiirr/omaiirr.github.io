// zz-uo-shot-before-s6c.mjs — before shot: theme-row ⋯ menu (Edit/Rename/Delete)
// in the small-settings custom themes list (editor-family chrome, surface 6).
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

  // seed a probe theme so the row menu exists (same recipe as s3 battery)
  const created = await page.evaluate(() => {
    try {
      const r = ThemeEngine.save({ id: 'ct_s6probe', name: 'ZZ S6 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      return r ? 'ok' : 'null';
    } catch (e) { return 'ERR ' + e.message; }
  });
  console.log('probe:', created);

  await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
  await sleep(400);
  await page.evaluate(() => document.querySelector('.settings-tab-btn')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-theme-row-more')?.click());
  await sleep(400);
  const st = await page.evaluate(() => ({
    menu: !!document.querySelector('.te-theme-row-menu.open'),
    items: [...document.querySelectorAll('.te-theme-row-menu .te-menu-item')].map((b) => b.textContent.trim()),
  }));
  console.log('menu state:', JSON.stringify(st));
  if (!st.menu) throw new Error('row menu did not open — refusing wrong shot');
  await page.screenshot({ path: 'scene-lab/zz-uo-before-s6-rowmenu.png' });

  console.log('before-s6c rowmenu shot saved');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally {
  await browser.close();
}
