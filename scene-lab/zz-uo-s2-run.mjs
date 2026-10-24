// zz-uo-s2-run.mjs — surface-2 (release notes popup) overhaul battery (throwaway).
// Asserts every behavior that must survive, then takes AFTER shots.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 140) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  // Known sandbox noise (no internet in the test env): the page's cdnjs
  // Font Awesome <link> fails with a CORS pageerror — pre-existing, unrelated
  // to surface 2. Excluded the same way as the downloadable-font noise.
  const isNoise = (t) => /downloadable font/i.test(t) || /Cross-Origin Request Blocked/i.test(t) || /cdnjs\.cloudflare/i.test(t);
  page.on('pageerror', (e) => { if (!isNoise(e.message)) errors.push(e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m.text()) && !/thumbnail failed: ornate/i.test(m.text()))
      errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);

  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
  const state = () => page.evaluate(() => ({
    notice: document.getElementById('updateNoticePopup')?.classList.contains('open'),
    patch: document.getElementById('patchNotesPopup')?.classList.contains('open'),
    adv: document.getElementById('advancedSettingsModal')?.classList.contains('open'),
    theme: document.getElementById('themeModal')?.classList.contains('open'),
  }));

  console.log('== 1. first-run update notice → view release notes');
  let st = await state();
  check('update notice opens on first run', st.notice, JSON.stringify(st));
  await page.screenshot({ path: 'scene-lab/zz-uo-after-updatenotice.png' });
  await click('#viewPatchNotesFromUpdateBtn');
  await sleep(600);
  st = await state();
  check('view-notes opens patch popup + closes notice', st.patch && !st.notice, JSON.stringify(st));

  console.log('== 2. entry list rendered with date/title hierarchy');
  st = await page.evaluate(() => {
    const entries = [...document.querySelectorAll('.patch-notes-entry')];
    const body = entries.map((e) => e.querySelector('p')?.textContent || '').join(' ');
    return {
      count: entries.length,
      shaped: entries.every((e) => e.querySelector('h4') && e.querySelector('span') && e.querySelector('p')),
      h4: entries[0]?.querySelector('h4')?.textContent?.slice(0, 40),
      noEntities: !/&#39;|&quot;|&lt;|&gt;/.test(body),
      apostropheOk: body.includes("site's"),
    };
  });
  check('entries ≥ 1, each with title+date+details', st.count >= 1 && st.shaped, JSON.stringify(st));
  check("details render unescaped (no entities, site's intact)", st.noEntities && st.apostropheOk, JSON.stringify([st.noEntities, st.apostropheOk]));

  console.log('== 3. close button + backdrop click');
  await click('#patchNotesCloseBtn');
  await sleep(400);
  st = await state();
  check('close button closes', !st.patch, JSON.stringify(st));
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(600);
  // switch to the Extras pane so the preview card is actually visible
  await page.evaluate(() => document.querySelector('.fs-tab-btn[data-tab="extras"]')?.click());
  await sleep(300);
  // open patch popup from Extras preview card
  await page.evaluate(() => document.querySelector('.patch-note-preview')?.scrollIntoView({ block: 'center' }));
  await sleep(300);
  const extras = await page.evaluate(() => ({
    previews: document.querySelectorAll('.patch-note-preview').length,
    hasStrong: !!document.querySelector('.patch-note-preview strong'),
    hasSmall: !!document.querySelector('.patch-note-preview small'),
    openBtn: !!document.getElementById('openPatchNotesBtn'),
  }));
  check('Extras preview card present (strong+small+open btn)', extras.previews >= 1 && extras.hasStrong && extras.hasSmall && extras.openBtn, JSON.stringify(extras));
  await page.screenshot({ path: 'scene-lab/zz-uo-after-extras.png' });
  await click('.patch-note-preview');
  await sleep(500);
  st = await state();
  check('preview card click opens popup', st.patch, JSON.stringify(st));

  console.log('== 4. ESC hierarchy: patchNotes closes before advanced');
  await page.keyboard.press('Escape');
  await sleep(400);
  st = await state();
  check('ESC closes patch popup, advanced stays', !st.patch && st.adv, JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(400);
  st = await state();
  check('ESC then closes advanced', !st.adv, JSON.stringify(st));

  console.log('== 5. backdrop click closes popup');
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(500);
  await click('#openPatchNotesBtn');
  await sleep(500);
  st = await state();
  check('openPatchNotesBtn opens popup', st.patch, JSON.stringify(st));
  await page.screenshot({ path: 'scene-lab/zz-uo-after-releasenotes.png' });
  await page.evaluate(() => {
    const pop = document.getElementById('patchNotesPopup');
    pop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(400);
  st = await state();
  check('backdrop click closes popup', !st.patch, JSON.stringify(st));

  console.log('== 6. v2 colorful tokens live (planner-v3 language)');
  st = await page.evaluate(() => {
    const card = document.querySelector('.patch-notes-card');
    const notice = document.querySelector('.update-notice-card');
    const prev = document.querySelector('.patch-note-preview');
    const date = document.querySelector('.patch-notes-entry span');
    const small = document.querySelector('.patch-note-preview small');
    const btn = document.querySelector('.patch-notes-primary-btn');
    const eyebrow = document.querySelector('.patch-notes-eyebrow');
    const title = document.querySelector('.patch-notes-title');
    return {
      cardR: card && getComputedStyle(card).borderRadius,
      cardBorder: card && getComputedStyle(card).borderColor,
      accentVar: card && getComputedStyle(card).getPropertyValue('--s23-accent').trim(),
      noticeR: notice && getComputedStyle(notice).borderRadius,
      prevR: prev && getComputedStyle(prev).borderRadius,
      prevBorder: prev && getComputedStyle(prev).borderColor,
      dateFs: date && getComputedStyle(date).fontSize,
      dateColor: date && getComputedStyle(date).color,
      smallFs: small && getComputedStyle(small).fontSize,
      eyebrowColor: eyebrow && getComputedStyle(eyebrow).color,
      titleGrad: title && getComputedStyle(title).backgroundImage,
      titleColor: title && getComputedStyle(title).color,
      spring: btn && getComputedStyle(btn).transitionTimingFunction,
      btnShadow: btn && getComputedStyle(btn).boxShadow,
      active: document.activeElement?.tagName,
    };
  });
  check('shell radius unified to 18px', st.cardR === '18px' && st.noticeR === '18px', JSON.stringify([st.cardR, st.noticeR]));
  check('extras preview card radius 12px', st.prevR === '12px', String(st.prevR));
  check('date typography unified (entry span == preview small)', st.dateFs && st.dateFs === st.smallFs, JSON.stringify([st.dateFs, st.smallFs]));
  check('primary btn springy-consistent', (st.spring || '').includes('1.56'), String(st.spring));
  check('v2: cards carry the --s23-* register', st.accentVar === '#6366f1', st.accentVar);
  check('v2: card hairline is accent-bounded (indigo 35%)', st.cardBorder === 'rgba(99, 102, 241, 0.35)', st.cardBorder);
  check('v2: eyebrow in alto blue', st.eyebrowColor === 'rgb(143, 164, 212)', st.eyebrowColor);
  check('v2.1: title is plain white (no gradient)', st.titleColor === 'rgb(255, 255, 255)' && !(st.titleGrad || '').includes('linear-gradient'), JSON.stringify([st.titleColor, String(st.titleGrad).slice(0, 40)]));
  check('v2: dates in alto blue (not white-alpha)', st.dateColor === 'rgb(143, 164, 212)', st.dateColor);
  check('v2: preview card tinted chrome register', st.prevBorder === 'rgba(123, 139, 178, 0.22)', st.prevBorder);
  // round 4 (2026-10-10): the user asked for the button glow gone everywhere.
  check('round-4: primary btn has NO glow (button glow removed)', (st.btnShadow || 'none') === 'none', String(st.btnShadow).slice(0, 80));

  console.log('== 7. AFTER screenshot of popup (already taken) — summary');
  console.log('  shots → zz-uo-after-{updatenotice,releasenotes,extras}.png');

  console.log('\n---');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  console.log(failed === 0 && errors.length === 0 ? 'SURFACE-2 BATTERY: ALL GREEN' : `SURFACE-2 BATTERY: ${failed} FAILURES`);
  process.exitCode = failed === 0 && errors.length === 0 ? 0 : 1;
} finally { await browser.close(); }
