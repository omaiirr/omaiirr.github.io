import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const b = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => {
  const n = document.getElementById('updateNoticePopup');
  if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  document.querySelectorAll('.modal.open, .popup.open').forEach(m => m.classList.remove('open'));
  localStorage.clear();
});
await new Promise(r => setTimeout(r, 900));
const clip = { x: 220, y: 200, width: 560, height: 360 };
await p.screenshot({ path: 'scene-lab/zz-timer-after-pomodoro.png', clip });
await p.evaluate(() => {
  const sel = document.getElementById('timerModeSelect');
  sel.value = 'stopwatch';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise(r => setTimeout(r, 700));
await p.screenshot({ path: 'scene-lab/zz-timer-after-stopwatch.png', clip });
await b.close();
