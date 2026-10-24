// zz-copy-scan.mjs — modal copy scan (missing whitespace).
//
// Opens every modal in the real app, reads the headings/labels inside it, and
// flags any string where two words have run together: a lowercase run followed
// by a capital and another lowercase ("CustomizeYourTheme"). Acronyms are not
// flagged (PiP is P-i-P, not a joined word).
//   node scene-lab/zz-copy-scan.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 240) + ']' : ''}`);
};

// Two words joined with no space: at least two lowercase letters, then a
// capital, then a lowercase. `PiP`/`iOS` style acronyms do not match.
const SUSPECT = /[a-z]{2,}[A-Z][a-z]/;

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => {
    localStorage.clear();
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);

  const HEADINGS = [
    'h1', 'h2', 'h3', 'h4', 'p', 'span', 'button', 'label', 'option',
  ].join(',');

  // Each surface: how to open it, and the container its copy lives in.
  const surfaces = [
    ['small settings', "#settingsBtn", "#themeModal"],
    ['theme builder', "ThemeEngine.openEditor(null)", "#themeEditorModal"],
    ['theme library', "ThemeEngine.openThemeLibrary()", "#tlModal"],
    ['expanded settings', "#openAdvancedSettingsBtn", "#advancedSettingsModal"],
    ['planner / task dashboard', "#plannerBtn", "#plannerModal"],
    ['study analytics', "#openStatsModalBtn", "#statisticsModal"],
    ['release notes', "#openPatchNotesBtn || #patchNotesBtn", "#patchNotesPopup"],
  ];

  const seen = new Map();
  for (const [name, opener, container] of surfaces) {
    const texts = await page.evaluate(
      async (code, sel) => {
        document.querySelectorAll('.modal.open, .popup.open').forEach((m) => m.classList.remove('open'));
        try {
          const target = document.querySelector(code.startsWith('#') ? code.split('||')[0].trim() : null);
          if (target) target.click();
          else new Function(code)();
        } catch (e) {
          return ['OPEN FAILED: ' + e.message];
        }
        await new Promise((r) => setTimeout(r, 800));
        const root = document.querySelector(sel) || document;
        return Array.from(root.querySelectorAll('h1,h2,h3,h4,p,span,button,label,option'))
          .filter((el) => {
            const box = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (!box.width || !box.height || cs.visibility === 'hidden' || cs.display === 'none') return false;
            return !el.querySelector('h1,h2,h3,h4,p,span,button,label');
          })
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter((t) => t && t.length < 70);
      },
      opener,
      container,
    );
    const unique = [...new Set(texts)];
    unique.forEach((t) => {
      if (!seen.has(t)) seen.set(t, name);
    });
    console.log(`  · ${name}: ${unique.length} visible strings  ${unique[0] === 'OPEN FAILED' ? unique[0] : ''}`);
  }

  console.log('== 1. no heading or label has two words run together');
  const suspects = [...seen.entries()].filter(([t]) => SUSPECT.test(t));
  check(
    'every string reads as separate words',
    suspects.length === 0,
    suspects.map(([t, where]) => `"${t}" (${where})`).join(' | ') || `${seen.size} strings scanned across ${surfaces.length} surfaces`,
  );

  console.log('== 2. the theme builder header is spelled out');
  const teTitle = await page.evaluate(() => {
    ThemeEngine.openEditor(null);
    return document.getElementById('teTitle')?.textContent.trim() || '';
  });
  check('theme builder title is "Customize Your Theme"', teTitle === 'Customize Your Theme', teTitle);

  console.log('== 3. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
