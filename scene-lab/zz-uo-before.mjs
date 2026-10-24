// zz-uo-before.mjs — BEFORE shots of small settings (Settings + Statistics tabs).
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: 'scene-lab/zz-uo-before-settings.png' });
  await page.evaluate(() => document.querySelector('.settings-tab-btn[data-tab="statistics"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: 'scene-lab/zz-uo-before-statistics.png' });
  console.log('before shots saved');
} finally { await browser.close(); }
