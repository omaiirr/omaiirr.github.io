// zz-uo-shot-s67.mjs — before/after shots for surface 6 (theme editor chrome)
// and surface 7 (expanded settings), the last two unbuilt UI-overhaul surfaces.
//
// Usage (from repo root, Jekyll serving 127.0.0.1:4000):
//   node scene-lab/zz-uo-shot-s67.mjs before
//   node scene-lab/zz-uo-shot-s67.mjs after
//
// Writes scene-lab/zz-uo-<label>-s67-{editor,footermenu,general,theme,extras}.png
// Panel-scoped (element screenshots) so before/after pairs compare 1:1.
// Drives the app's REAL open paths (ThemeEngine.openEditor /
// #openAdvancedSettingsBtn) so state, tab handlers and JS-rendered content
// (release-notes preview, custom-theme list) are present in the shots; then
// prints a computed-style probe per surface as verifiable evidence.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const LABEL = process.argv[2] || 'before';
const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font|cdnjs|ERR_/i.test(e.message)) errors.push(e.message);
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1600);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(400);

  const shot = async (name, sel) => {
    const path = `scene-lab/zz-uo-${LABEL}-s67-${name}.png`;
    const el = sel ? await page.$(sel) : null;
    if (el) await el.screenshot({ path });
    else await page.screenshot({ path });
    console.log(`wrote ${path}`);
  };

  const probe = async (label, sel) => {
    const info = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return 'MISSING';
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return JSON.stringify({
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: cs.display,
        opacity: cs.opacity,
        radius: cs.borderRadius,
        borderTop: cs.borderTopColor,
        borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomColor}`,
        bg: cs.backgroundColor,
        fg: cs.color,
        shadow: cs.boxShadow.slice(0, 78),
      });
    }, sel);
    console.log(`probe ${label}: ${info}`);
  };

  // ── Surface 6: theme editor chrome (real open path) ──
  await page.evaluate(() => {
    /* global ThemeEngine */
    ThemeEngine.openEditor(null);
  });
  await sleep(1300);
  await probe('editor panel', '#themeEditorModal .te-panel');
  await probe('editor header', '#themeEditorModal .te-header');
  await probe('editor tab (active)', '#themeEditorModal .te-tab-btn.active');
  await probe('editor footer', '#themeEditorModal .te-footer');
  await probe('editor preview area', '#themeEditorModal .te-preview-area');
  await probe('editor save btn', '#themeEditorModal #teSaveBtn');
  await probe('editor cancel btn', '#themeEditorModal #teCancelBtn');
  await shot('editor', '#themeEditorModal .te-panel');

  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(500);
  await probe('footer menu', '#themeEditorModal .te-footer-menu');
  await shot('footermenu', '#themeEditorModal .te-panel');
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(300);
  await page.evaluate(() => ThemeEngine.closeEditor());
  await sleep(600);

  // ── Surface 7: expanded settings (real open path attaches tab handlers) ──
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(1000);
  await probe('adv modal', '.advanced-settings-modal');
  await probe('adv panel', '.advanced-settings-panel');
  await probe('adv header', '.advanced-settings-header');
  await probe('adv eyebrow', '.advanced-settings-eyebrow');
  await probe('adv tab (active)', '.fs-tab-btn.active');
  await probe('adv card', '#tab-general .fs-card');
  await probe('adv card label', '#tab-general .fs-card-label');
  await probe('adv toggle track', '#tab-general .fs-toggle-thumb');
  await shot('general', '.advanced-settings-panel');
  await page.evaluate(() => document.getElementById('fsFocus')?.focus());
  await sleep(300);
  await probe('adv clock input (focused)', '#tab-general #fsFocus');
  await shot('general-focus', '.advanced-settings-panel');
  await page.evaluate(() => document.getElementById('fsFocus')?.blur());
  await sleep(200);

  await page.evaluate(() =>
    document.querySelector('.fs-tab-btn[data-tab="theme"]')?.click()
  );
  await sleep(900);
  await probe('adv tab theme active', '.fs-tab-btn.active');
  await probe('adv library btn', '#openThemeLibraryBtnFull');
  await probe('adv new-theme btn', '#newThemeBtnExpanded');
  await probe('adv mode btn active', '#tab-theme .mode-toggle-btn.active');
  await shot('theme', '.advanced-settings-panel');

  // theme-library dialog (sibling modal) — real open chain from the Theme tab
  await page.evaluate(() => document.getElementById('openThemeLibraryBtnFull')?.click());
  await sleep(1100);
  await probe('theme library panel', '#tlModal .tl-panel');
  await probe('theme library header', '#tlModal .tl-header');
  await probe('theme library close', '#tlModal .tl-close');
  await shot('tllib', '#tlModal .tl-panel');
  await page.evaluate(() => document.getElementById('tlClose')?.click());
  await sleep(600);

  await page.evaluate(() =>
    document.querySelector('.fs-tab-btn[data-tab="extras"]')?.click()
  );
  await sleep(900);
  await probe('adv view-updates btn', '#openPatchNotesBtn');
  await probe('adv save btn', '#advancedSettingsSaveBtn');
  await probe('adv footer', '.advanced-settings-footer');
  await shot('extras', '.advanced-settings-panel');

  await page.evaluate(() => document.getElementById('advancedSettingsCloseBtn')?.click());
  await sleep(300);
  console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
} finally {
  await browser.close();
}
