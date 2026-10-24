// zz-uo-edit-row-artwork-check.mjs — confirm the Edit menu item now uses the same palette art as the badge.
// Focused confirm only: opens the expanded-settings Theme tab, opens a custom row menu, and reads the Edit svg.
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

  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(700);
  await page.evaluate(() => document.querySelector('.fs-tab-btn[data-tab="theme"]')?.click());
  await sleep(400);

  await page.evaluate(() => document.querySelector('.te-theme-row-more')?.click());
  await sleep(350);

  const editItem = await page.evaluate(() => {
    const menu = document.querySelector('.te-theme-row-menu.open');
    const editBtn = menu?.querySelector('.te-menu-item[data-action="edit"]');
    const svg = editBtn?.querySelector('svg');
    return {
      found: !!editBtn,
      text: editBtn ? (editBtn.textContent || '').trim() : '',
      svg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), head: svg.outerHTML.slice(0, 260) } : null,
    };
  });

  console.log('edit menu item:', JSON.stringify(editItem, null, 2));

  const ok =
    editItem.found &&
    /^edit$/i.test(editItem.text) &&
    editItem.svg &&
    editItem.svg.w === '14' &&
    editItem.svg.h === '14' &&
    editItem.svg.viewBox === '0 0 48 48' &&
    editItem.svg.fill === 'currentColor' &&
    /stroke="currentColor"/.test(editItem.svg.head) &&
    /M24\.86,41\.09/.test(editItem.svg.head);

  console.log('EDIT ROW ARTWORK CHECK:', ok ? 'PASS' : 'FAIL');
  if (!ok) process.exitCode = 1;
  await page.screenshot({ path: 'scene-lab/zz-uo-after-edit-row.png' });

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
} finally {
  await browser.close();
}
