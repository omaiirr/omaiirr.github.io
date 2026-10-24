// zz-uo-shot-before-all23.mjs — honest ORIGINAL before-shots for the surface
// 2/3 redo. Assumes UO blocks are STRIPPED (zz-uo-remove-uos.mjs). Selectors
// mirror the s2/s3 batteries. Run from repo ROOT:
//   node scene-lab/zz-uo-shot-before-all23.mjs
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (page, sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 140)));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(1500);
// First-run notice is OPEN — that IS the surface-2 before shot
await page.screenshot({ path: 'scene-lab/zz-uo-before-all23-updatenotice.png' });

// View release notes from the notice
await click(page, '#viewPatchNotesFromUpdateBtn');
await sleep(600);
await page.screenshot({ path: 'scene-lab/zz-uo-before-all23-releasenotes.png' });
await page.keyboard.press('Escape');
await sleep(400);

// Extras preview card inside the advanced/expanded settings modal
await page.evaluate(() => {
  document.getElementById('advancedSettingsModal')?.classList.add('open');
});
await sleep(500);
await page.screenshot({ path: 'scene-lab/zz-uo-before-all23-extras.png' });
await page.keyboard.press('Escape');
await sleep(400);

// Reset-stats confirm (statistics tab inside the theme/settings modal)
await page.evaluate(() => {
  document.getElementById('themeModal').classList.add('open');
  document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
});
await sleep(400);
await click(page, '#resetStatsBtn');
await sleep(500);
await page.screenshot({ path: 'scene-lab/zz-uo-before-all23-confirm.png' });
await page.keyboard.press('Escape');
await sleep(300);

// Task-title error modal (open add-task popup, save with empty title)
await page.evaluate(() => {
  localStorage.setItem('plannerTasks', '[]');
});
await click(page, '#plannerAddBtn');
await sleep(500);
await click(page, '#saveTaskBtn');
await sleep(400);
await page.screenshot({ path: 'scene-lab/zz-uo-before-all23-error.png' });
await page.keyboard.press('Escape');
await sleep(200);

await browser.close();
console.log('done');
