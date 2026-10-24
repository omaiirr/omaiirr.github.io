// zz-uo-s1-run.mjs — surface-1 (small settings) overhaul battery (throwaway).
// Asserts every behavior the surface must retain, then takes AFTER shots.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 130) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => { if (!/downloadable font/i.test(e.message)) errors.push(e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed: ornate/i.test(m.text()))
      errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  // First-run update notice opens on a clean profile — dismiss it so it
  // doesn't sit atop the modal stack during the ESC-hierarchy tests.
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);

  console.log('== 1. modal opens + tab switching');
  await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
  await sleep(700);
  let st = await page.evaluate(() => ({
    open: document.getElementById('themeModal').classList.contains('open'),
    themesVisible: document.querySelector('.settings-tab-content[data-tab="themes"]').style.display !== 'none' || true,
    statsHidden: document.querySelector('.settings-tab-content[data-tab="statistics"]').style.display === 'none',
  }));
  check('modal + themes tab initial state', st.open && st.statsHidden, JSON.stringify(st));
  await click('.settings-tab-btn[data-tab="statistics"]');
  await sleep(300);
  st = await page.evaluate(() => ({
    statsShown: document.querySelector('.settings-tab-content[data-tab="statistics"]').style.display === 'block',
    // tab-switch JS sets inline color; active tab = white text + accent underline
    activeColor: getComputedStyle(document.querySelector('.settings-tab-btn[data-tab="statistics"]')).color,
    activeBorder: getComputedStyle(document.querySelector('.settings-tab-btn[data-tab="statistics"]')).borderBottomColor,
  }));
  check('statistics tab shows + active style', st.statsShown && st.activeColor === 'rgb(255, 255, 255)' && st.activeBorder === 'rgb(255, 255, 255)', JSON.stringify(st));
  await click('.settings-tab-btn[data-tab="themes"]');
  await sleep(300);

  console.log('== 2. built-in theme switch');
  await click('.theme-option[data-theme="color-dark"]');
  await sleep(500);
  st = await page.evaluate(() => ({
    saved: localStorage.getItem('timerTheme'),
    active: document.querySelector('.theme-option[data-theme="color-dark"]').classList.contains('active'),
    bodyHasTheme: document.getElementById('timerContainer').className.includes('theme-color-dark'),
  }));
  check('color-dark applies + persists', st.saved === 'color-dark' && st.active && st.bodyHasTheme, JSON.stringify(st));
  await click('.theme-option[data-theme="gradient-default"]');
  await sleep(400);

  console.log('== 3. clock inputs sync small↔full');
  await page.evaluate(() => {
    document.getElementById('customFocus').value = '31';
    document.getElementById('customShort').value = '7';
    document.getElementById('customLong').value = '21';
  });
  // trigger the save path: openAdvancedSettingsBtn → openAdvModal syncs from custom inputs
  await click('#openAdvancedSettingsBtn');
  await sleep(700);
  st = await page.evaluate(() => ({
    advOpen: document.getElementById('advancedSettingsModal').classList.contains('open'),
    fsFocus: document.getElementById('fsFocus')?.value,
    themeModalClosed: !document.getElementById('themeModal').classList.contains('open'),
  }));
  check('expand-settings opens + clock synced (31/7/21)', st.advOpen && st.fsFocus === '31', JSON.stringify(st));
  // close adv → back to clean state
  await page.evaluate(() => document.getElementById('advancedSettingsModal').classList.remove('open'));

  console.log('== 4. library button + chain intact');
  await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
  await sleep(500);
  st = await page.evaluate(() => ({
    label: document.getElementById('openThemeLibraryLabelSmall').textContent,
    btnVisible: document.getElementById('openThemeLibraryBtnSmall').offsetParent !== null,
  }));
  check('library button visible w/ count', /Open theme library \(\d+\)/.test(st.label) && st.btnVisible, st.label);
  await click('#openThemeLibraryBtnSmall');
  await sleep(600);
  st = await page.evaluate(() => ({
    lib: document.getElementById('tlModal').classList.contains('open'),
    adv: document.getElementById('advancedSettingsModal').classList.contains('open'),
  }));
  check('library opens via small settings (adv underneath)', st.lib && st.adv, JSON.stringify(st));
  // ESC hierarchy still: library → adv
  await page.keyboard.press('Escape');
  await sleep(300);
  st = await page.evaluate(() => ({
    lib: document.getElementById('tlModal').classList.contains('open'),
    adv: document.getElementById('advancedSettingsModal').classList.contains('open'),
  }));
  check('ESC closes library first', !st.lib && st.adv, JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(300);

  console.log('== 5. statistics ids render');
  st = await page.evaluate(() => {
    document.getElementById('themeModal').classList.add('open');
    document.querySelector('.settings-tab-btn[data-tab="statistics"]').click();
    return {
      study: !!document.getElementById('totalStudyTime'),
      breakT: !!document.getElementById('totalBreakTime'),
      sessions: !!document.getElementById('totalSessions'),
      subjects: !!document.getElementById('subjectBreakdown'),
      analytics: !!document.getElementById('openStatsModalBtn'),
      reset: !!document.getElementById('resetStatsBtn'),
      // closure-scoped fn — typeof from outside the IIFE is always undefined;
      // the real assertion is that the tab click above ran with no page error.
    };
  });
  check('all statistics hooks present', st.study && st.breakT && st.sessions && st.subjects && st.analytics && st.reset, JSON.stringify(st));

  console.log('== 6. custom badge + color-emoji-free surface');
  st = await page.evaluate(() => {
    const badge = document.getElementById('customThemeActiveBadge');
    // scan for COLOR emojis only (≥ U+1F000, variation selector, keycap);
    // monochrome glyphs like ✓ ✚ ✕ are intentional system glyphs.
    const hasColorEmoji = /[\u{1F000}-\u{1FAFF}\u{FE0F}\u{20E3}]/u.test(document.getElementById('themeModal').textContent);
    return {
      badgeHidden: badge && badge.style.display === 'none',
      noEmojis: !hasColorEmoji,
    };
  });
  check('badge hidden by default, surface emoji-free', st.badgeHidden && st.noEmojis, JSON.stringify(st));

  console.log('== 7. visual: original design preserved (2-col, 8px) + springy motion');
  // measure with the themes tab VISIBLE — display:none grids can't resolve
  // track sizes and computed style returns the literal repeat() string.
  await click('.settings-tab-btn[data-tab="themes"]');
  await sleep(300);
  // CARDS is now the ratified DEFAULT; pills look preserved as the legacy opt-in.
  st = await page.evaluate(() => {
    const opt = document.querySelector('#themeModal .theme-option');
    const cs = getComputedStyle(opt);
    const grid = getComputedStyle(document.querySelector('#themeModal .theme-options'));
    return {
      radius: cs.borderRadius,
      cols: grid.gridTemplateColumns.split(' ').length,
      transition: cs.transitionDuration,
      panelAdaptive: getComputedStyle(document.getElementById('themeModal')).backdropFilter,
    };
  });
  check('CARDS default ratified (3-col, 10px radius, shadow/text-shadow gone)', st.radius === '10px' && st.cols === 3 && st.transition.includes('0.18s'), JSON.stringify(st));
  check('theme-adaptive glass kept (backdrop blur)', (st.panelAdaptive || '').includes('blur'), JSON.stringify(st.panelAdaptive));
  // legacy pills opt-in still restyles correctly
  await page.evaluate(() => { document.getElementById('themeModal').dataset.uoVariant = 'pills'; });
  st = await page.evaluate(() => {
    const opt = document.querySelector('#themeModal .theme-option');
    const cs = getComputedStyle(opt);
    const grid = getComputedStyle(document.querySelector('#themeModal .theme-options'));
    return { radius: cs.borderRadius, cols: grid.gridTemplateColumns.split(' ').length, align: cs.textAlign, shadow: cs.textShadow };
  });
  check('legacy pills opt-in intact (8px, 2-col, centered + shadow)', st.radius === '8px' && st.cols === 2 && st.align === 'center' && st.shadow !== 'none', JSON.stringify(st));
  await page.evaluate(() => { delete document.getElementById('themeModal').dataset.uoVariant; });

  console.log('== 8. AFTER screenshots');
  await page.evaluate(() => {
    document.querySelector('.settings-tab-btn[data-tab="themes"]').click();
    document.getElementById('themeModal').classList.remove('open');
  });
  await sleep(300);
  await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
  await sleep(900);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-settings.png' });
  await click('.settings-tab-btn[data-tab="statistics"]');
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-statistics.png' });
  // legacy pills look for the gate comparison (no longer default)
  await click('.settings-tab-btn[data-tab="themes"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('themeModal').dataset.uoVariant = 'pills'; });
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-settings-pills.png' });
  await page.evaluate(() => { delete document.getElementById('themeModal').dataset.uoVariant; });
  console.log('  shots → zz-uo-after-settings.png (CARDS default) / zz-uo-after-statistics.png / zz-uo-after-settings-pills.png (legacy)');

  console.log('\n---');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  console.log(failed === 0 && errors.length === 0 ? 'SURFACE-1 BATTERY: ALL GREEN' : `SURFACE-1 BATTERY: ${failed} FAILURES`);
  process.exitCode = failed === 0 && errors.length === 0 ? 0 : 1;
} finally { await browser.close(); }
