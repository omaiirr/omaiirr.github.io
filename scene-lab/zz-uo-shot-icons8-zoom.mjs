// zz-uo-shot-icons8-zoom.mjs — high-DPI element close-ups of every wired slot.
// deviceScaleFactor 4 so 14px icons are legible for review.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 4 });
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

  const shot = async (sel, name, pad = 14) => {
    const el = await page.$(sel);
    if (!el) throw new Error('missing element: ' + sel);
    await el.screenshot({ path: `scene-lab/zz-uo-zoom-${name}.png` });
    console.log('shot', name);
  };

  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(900);

  // 1. tab sidebar (picture / wheel / overlay-placeholder)
  await shot('.te-tabs-sidebar', 'tabs');

  // switch to Colors pane first — auto-detect lives there
  await page.evaluate(() => document.querySelector('.te-tab-btn[data-tab="colors"]')?.click());
  await sleep(300);

  // 2. auto-detect (palette)
  await shot('#teAutoDetectColors', 'autodetect');

  // 3. Save row (save icon on primary btn)
  await shot('#teSaveBtn', 'save');

  // 4. footer menu (eye + export/import placeholders)
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(400);
  await shot('#teFooterMenu', 'footermenu');
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(200);

  // 5. task popup save
  await page.evaluate(() => {
    document.getElementById('themeEditorModal')?.classList.remove('open');
    window.openTaskPopup?.();
  });
  await sleep(700);
  await shot('.task-popup-actions', 'tasksave');
  await page.evaluate(() => document.getElementById('taskPopup')?.classList.remove('open'));
  await sleep(300);

  // 6. exit bar (bolt)
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(400);
  await page.evaluate(() => document.getElementById('tePreviewBtn')?.click());
  await sleep(900);
  await shot('#teExitPreviewBar', 'exitbar');
  await page.evaluate(() => document.getElementById('teExitPreviewBtn')?.click());
  await sleep(400);

  // 7. row menu (pencil) + badge (palette) — probe theme; the visible custom
  // list lives in Expanded Settings (sidebar copy is statically hidden)
  await page.evaluate(() => {
    try {
      ThemeEngine.save({ id: 'ct_i8probe', name: 'ZZ I8 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
    } catch (e) { /* ignore */ }
    document.getElementById('themeEditorModal')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.add('open');
  });
  await sleep(500);
  await page.evaluate(() => document.querySelector('.settings-tab-btn')?.click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(600);
  const advOpen = await page.evaluate(() => document.getElementById('advancedSettingsModal')?.classList.contains('open'));
  console.log('advanced settings open:', advOpen);
  if (!advOpen) throw new Error('advanced settings did not open');
  // activate the Theme tab inside expanded settings (custom list lives there)
  await page.evaluate(() => document.querySelector('.fs-tab-btn[data-tab="theme"]')?.click());
  await sleep(400);
  // scroll the expanded custom list into view, then open the first row menu
  await page.evaluate(() => {
    document.querySelector('#customThemeListExpanded .te-theme-row-more')?.scrollIntoView({ block: 'center' });
    document.querySelector('#customThemeListExpanded .te-theme-row-more')?.click();
  });
  await sleep(400);
  const rm = await page.evaluate(() => {
    const m = document.querySelector('#customThemeListExpanded .te-theme-row-menu.open');
    return { menu: !!m, rect: m ? JSON.stringify(m.getBoundingClientRect()) : null };
  });
  console.log('rowmenu diag:', JSON.stringify(rm));
  if (!rm.menu) throw new Error('row menu did not open — refusing wrong shot');
  await shot('#customThemeListExpanded .te-theme-row-menu.open', 'rowmenu');

  await page.evaluate(() => {
    try { ThemeEngine.activate('ct_i8probe'); } catch (e) { /* ignore */ }
  });
  await sleep(300);
  await shot('#customThemeActiveBadge', 'badge');

  await page.evaluate(() => {
    try {
      ThemeEngine.deactivate({ restorePreset: true });
      ThemeEngine.delete('ct_i8probe');
      ThemeEngine._rebuildCustomList();
    } catch (e) { /* ignore */ }
  });

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally {
  await browser.close();
}
