// zz-uo-s2-before.mjs — BEFORE shots for surface 2 (release notes popup) — throwaway.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  // 1. first-run update-notice card
  const noticeOpen = await page.evaluate(() => document.getElementById('updateNoticePopup')?.classList.contains('open'));
  console.log('update notice open:', noticeOpen);
  if (noticeOpen) await page.screenshot({ path: 'scene-lab/zz-uo-before-updatenotice.png' });
  await page.evaluate(() => window.dismissUpdateNoticeBtn?.click());
  await sleep(400);

  // 2. advanced settings → Extras tab → "View all updates" preview card.
  // NOTE: surface-2 CSS edits are already applied at this point, so the true
  // pre-edit look is reconstructed by re-declaring the exact old values
  // (equal specificity, later in the cascade → wins).
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(800);
  await page.evaluate(() => document.querySelector('.fs-tab-btn[data-tab="extras"]')?.click());
  await sleep(300);
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = `
      .update-notice-card { border-radius: 24px !important; }
      .patch-notes-card { border-radius: 24px !important; padding: 32px !important; }
      .patch-note-preview { border-radius: 16px !important; transition: transform 0.2s ease, background 0.2s ease !important; }
      .patch-note-preview:active { transform: none !important; }
      .patch-notes-entry span { font-size: 0.82rem !important; color: rgba(255, 255, 255, 0.55) !important; }
      .patch-notes-primary-btn { transition: transform 0.2s ease, filter 0.2s ease !important; }
      .patch-notes-primary-btn:active { transform: none !important; }
      .patch-notes-close { transition: all 0.2s !important; }
    `;
    document.head.appendChild(s);
  });
  await page.evaluate(() => document.querySelector('.patch-note-preview')?.scrollIntoView({ block: 'center' }));
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-extras.png' });
  console.log('before shots: updatenotice / extras (extras reconstructed via old-value override)');
} finally { await browser.close(); }
