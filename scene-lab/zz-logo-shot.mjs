import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const b = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 4 });
await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => {
  const n = document.getElementById('updateNoticePopup');
  if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  document.querySelectorAll('.modal.open, .popup.open').forEach(m => m.classList.remove('open'));
});
await new Promise(r => setTimeout(r, 1200));
await p.screenshot({ path: 'scene-lab/zz-logo-after-header.png', clip: { x: 24, y: 24, width: 220, height: 60 } });
await b.close();
