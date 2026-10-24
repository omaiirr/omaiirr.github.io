// zz-uo-before-all.mjs — BEFORE shots of remaining Stage-B surfaces (throwaway).
// Small settings + statistics were already captured pre-rebuild by zz-uo-before.mjs.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => { if (!/downloadable font/i.test(e.message)) errors.push(e.message); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);

  // 1. Expanded settings modal (surface 7)
  await click('#openAdvancedSettingsBtn');
  await sleep(800);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-advanced.png' });

  // 2. Release notes popup (surface 2) — opened from Extras card button
  await click('#openPatchNotesBtn');
  await sleep(700);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-releasenotes.png' });
  await page.evaluate(() => document.getElementById('patchNotesCloseBtn')?.click());
  await sleep(400);

  // close advanced settings again
  await page.evaluate(() => document.getElementById('advancedSettingsModal').classList.remove('open'));
  await sleep(400);

  // 3. System popup — confirm dialog via statistics reset (surface 3)
  await page.evaluate(() => {
    document.getElementById('themeModal').classList.add('open');
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
  });
  await sleep(500);
  await click('#resetStatsBtn');
  await sleep(600);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-confirm.png' });
  // dismiss the confirm (ESC, then close theme modal)
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(400);

  // 4. Task planner + Add Task popup (surface 5)
  await click('#plannerBtn');
  await sleep(700);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-planner.png' });
  await click('#plannerAddBtn');
  await sleep(600);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-addtask.png' });
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(400);

  // 5. Theme editor chrome (surface 6)
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(800);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-editor.png' });

  console.log('before shots saved:', 'advanced / releasenotes / confirm / planner / addtask / editor');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally { await browser.close(); }
