// zz-uo-shot-after-icons8.mjs — AFTER shots of every wired icons8 slot.
// Covers: editor tabs (picture/wheel), auto-detect, Save, footer menu (eye),
// task popup Save, fullscreen exit bar (bolt), row menu (pencil), badge (palette).
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

  // assert every wired slot resolves to new-art (fill=currentColor) before shooting
  const audit = await page.evaluate(() => {
    const out = {};
    const q = (sel) => document.querySelector(sel);
    const vb = (sel) => { const s = q(sel); return s ? { vb: s.getAttribute('viewBox'), fill: s.getAttribute('fill') } : null; };
    out.bgTab = vb('.te-tab-btn[data-tab="bg"] svg');
    out.colorsTab = vb('.te-tab-btn[data-tab="colors"] svg');
    out.autoDetect = vb('#teAutoDetectColors svg');
    out.save = vb('#teSaveBtn svg');
    out.preview = vb('#tePreviewBtn svg');
    out.overlay = vb('.te-tab-btn[data-tab="overlay"] svg');
    out.export = vb('#teExportBtn svg');
    out.gear = vb('#openAdvancedSettingsBtn svg');
    return out;
  });
  console.log('slot audit:', JSON.stringify(audit));
  // wired fill art -> fill=currentColor; wired line art (picture) -> fill=none + non-24 viewBox;
  // placeholders -> fill=none + viewBox 0 0 24 24
  for (const k of ['bgTab', 'colorsTab', 'autoDetect', 'save', 'preview']) {
    if (!(audit[k] && (audit[k].fill === 'currentColor' || (audit[k].fill === 'none' && audit[k].vb !== '0 0 24 24'))))
      throw new Error(`${k} still placeholder: ${JSON.stringify(audit[k])} — refusing shot`);
  }
  for (const k of ['overlay', 'export', 'gear']) {
    if (!(audit[k] && audit[k].fill === 'none' && audit[k].vb === '0 0 24 24'))
      throw new Error(`${k} unexpectedly changed: ${JSON.stringify(audit[k])}`);
  }

  // 1. editor (tabs + auto-detect + Save)
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(900);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-editor.png' });

  // 2. footer more-menu (eye)
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-footermenu.png' });
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(200);

  // 3. colors tab (wheel)
  await page.evaluate(() => document.querySelector('.te-tab-btn[data-tab="colors"]')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-colors.png' });

  // 4. task popup (Save)
  await page.evaluate(() => {
    document.getElementById('themeEditorModal')?.classList.remove('open');
    window.openTaskPopup?.();
  });
  await sleep(700);
  const tpOpen = await page.evaluate(() => document.getElementById('taskPopup')?.classList.contains('open'));
  console.log('task popup open:', tpOpen);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-taskpopup.png' });

  // 5. fullscreen exit bar (bolt) — Preview flow
  await page.evaluate(() => {
    document.getElementById('taskPopup')?.classList.remove('open');
    document.getElementById('themeEditorModal')?.classList.add('open');
  });
  await sleep(400);
  await page.evaluate(() => document.getElementById('tePreviewBtn')?.click());
  await sleep(900);
  const bar = await page.evaluate(() => {
    const el = document.getElementById('teExitPreviewBar');
    return { present: !!el, visible: !!el && getComputedStyle(el).display !== 'none',
             bolt: el?.querySelector('span svg')?.getAttribute('viewBox') || el?.querySelector('svg')?.getAttribute('viewBox') };
  });
  console.log('exit bar:', JSON.stringify(bar));
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-exitbar.png' });
  await page.evaluate(() => document.getElementById('teExitPreviewBtn')?.click());
  await sleep(400);

  // 6. row menu (pencil) + badge (palette): probe theme, small settings
  const created = await page.evaluate(() => {
    try {
      const r = ThemeEngine.save({ id: 'ct_i8probe', name: 'ZZ I8 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      return r ? 'ok' : 'null';
    } catch (e) { return 'ERR ' + e.message; }
  });
  console.log('probe:', created);
  await page.evaluate(() => {
    document.getElementById('themeEditorModal')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.add('open');
  });
  await sleep(400);
  await page.evaluate(() => document.querySelector('.settings-tab-btn')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-theme-row-more')?.click());
  await sleep(400);
  const menu = await page.evaluate(() => {
    const m = document.querySelector('.te-theme-row-menu.open');
    const pencil = m?.querySelector('[data-action="rename"] svg');
    return { open: !!m, pencilVb: pencil?.getAttribute('viewBox'), pencilFill: pencil?.getAttribute('fill'), pencilStroke: pencil?.getAttribute('stroke') };
  });
  console.log('row menu:', JSON.stringify(menu));
  if (!menu.open || menu.pencilFill !== 'none' || menu.pencilStroke !== 'currentColor') throw new Error('rename pencil not wired — refusing shot');
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-rowmenu.png' });

  // badge: make the probe custom theme active
  const badge = await page.evaluate(() => {
    try { ThemeEngine.activate('ct_i8probe'); } catch (e) { /* ignore */ }
    const b = document.getElementById('customThemeActiveBadge');
    return { shown: !!b && b.style.display !== 'none', vb: b?.querySelector('svg')?.getAttribute('viewBox'),
             fill: b?.querySelector('svg')?.getAttribute('fill') };
  });
  console.log('badge:', JSON.stringify(badge));
  await sleep(300);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-icons8-badge.png' });

  // cleanup probe + state
  await page.evaluate(() => {
    try {
      ThemeEngine.deactivate({ restorePreset: true });
      ThemeEngine.delete('ct_i8probe');
      ThemeEngine._rebuildCustomList();
    } catch (e) { /* ignore */ }
  });

  console.log('after-icons8 shots saved');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  process.exitCode = errors.length ? 1 : 0;
} finally {
  await browser.close();
}
