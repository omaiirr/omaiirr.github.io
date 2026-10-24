// zz-smoke-main.mjs — throwaway smoke check for the 2026-10-01 site edits.
// Verifies: zero page errors, Sunset Glow / Midnight Bloom removed from both
// theme pickers, "Release Notes" wording live (and "Patch Notes" gone),
// and that a saved deleted theme falls back to gradient-default.
// Delete after review, per the handoff harness convention.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  // Pre-seed a deleted theme to exercise the fallback path
  // (localStorage needs a real origin first, so visit → seed → reload).
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('timerTheme', 'gradient-glow');
  });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  const result = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.theme-option')];
    const labels = btns.map((b) => b.textContent.trim());
    const bodyText = document.body.innerText;
    return {
      themeCount: btns.length,
      labels,
      hasSunsetGlow: labels.some((t) => /sunset glow/i.test(t)),
      hasMidnightBloom: labels.some((t) => /midnight bloom/i.test(t)),
      hasPatchNotesText: /patch notes/i.test(bodyText),
      hasReleaseNotesText: /release notes/i.test(bodyText),
      hasNewPatchLive: /new patch is live/i.test(bodyText),
      savedTheme: localStorage.getItem('timerTheme'),
      advancedSettingsLabel: (() => {
        const el = [...document.querySelectorAll('.fs-card-label')].find((n) =>
          /notes/i.test(n.textContent),
        );
        return el ? el.textContent.trim() : null;
      })(),
    };
  });

  console.log(JSON.stringify(result, null, 2));

  // Ignore headless-sandbox font-download noise (external CDN fetches blocked
  // here — unrelated to site changes).
  const realErrors = errors.filter(
    (e) => !/downloadable font/i.test(e),
  );

  const ok =
    realErrors.length === 0 &&
    !result.hasSunsetGlow &&
    !result.hasMidnightBloom &&
    !result.hasPatchNotesText &&
    result.hasReleaseNotesText &&
    !result.hasNewPatchLive &&
    result.savedTheme === 'gradient-default';

  console.log('---');
  console.log(realErrors.length ? 'ERRORS:\n' + realErrors.join('\n') : 'zero page errors (excluding blocked external font fetches)');
  console.log(ok ? 'SMOKE: ALL GREEN' : 'SMOKE: FAILURES PRESENT');
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
