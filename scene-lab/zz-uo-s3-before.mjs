// zz-uo-s3-before.mjs — BEFORE shots of te-* system-popup dialogs (surface 3, throwaway).
// zz-uo-before-confirm.png (statistics reset, timer.js shell) was already captured
// by zz-uo-before-all.mjs. This script captures the theme-engine (te-confirm-*) shell:
// rename prompt (_promptAction) and delete confirm (_confirmAction).
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
  page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text()) && !/thumbnail failed: ornate/i.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  // create a custom theme so the custom list has a row with rename/delete menu
  const created = await page.evaluate(() => {
    try {
      const r = ThemeEngine.save({ id: 'ct_' + Date.now(), name: 'ZZ Gate3 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      return r ? r.id : 'null';
    } catch (e) { return 'ERR: ' + e.message; }
  });
  console.log('theme created:', created);
  if (created.startsWith('ERR') || created === 'null') { console.log('ABORT: could not create probe theme'); process.exit(1); }

  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
  const dialogOpen = () => page.evaluate(() => !!document.querySelector('.te-confirm-backdrop'));
  const openRowMenu = async () => {
    await click('.te-theme-row-more');
    await sleep(350);
  };

  // open theme modal (custom list lives there)
  await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
  await sleep(500);

  // 1. rename prompt (_promptAction)
  await openRowMenu();
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="rename"]')?.click());
  await sleep(500);
  console.log('rename prompt open:', await dialogOpen());
  await page.screenshot({ path: 'scene-lab/zz-uo-before-teprompt.png' });
  // prompt closes on backdrop click
  await page.mouse.click(10, 10);
  await sleep(400);

  // 2. delete confirm (_confirmAction)
  await openRowMenu();
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="delete"]')?.click());
  await sleep(500);
  console.log('delete confirm open:', await dialogOpen());
  await page.screenshot({ path: 'scene-lab/zz-uo-before-teconfirm.png' });
  // _confirmAction has no backdrop/ESC close — use the Cancel button
  await page.evaluate(() => document.querySelector('.te-confirm-btn:not(.primary)')?.click());
  await sleep(300);

  await page.keyboard.press('Escape');
  await sleep(400);

  console.log('before shots saved: teprompt / teconfirm (confirm.png pre-existing)');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally { await browser.close(); }
