import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const b = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1000, height: 760, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => { localStorage.clear(); });
await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(async () => {
  const cfg = { id: 'ct_probe', name: 'Probe', createdAt: new Date().toISOString(),
    bg: { type: 'solid', color: '#d94f2b' }, colors: { ...ThemeEngine.DEFAULTS }, overlay: { color: 'rgba(0,0,0,0)' } };
  const n = document.getElementById('updateNoticePopup');
  if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  document.querySelectorAll('.modal.open, .popup.open').forEach(m => m.classList.remove('open'));
  ThemeEngine.save(cfg); ThemeEngine.activate('ct_probe');
  await new Promise(r => setTimeout(r, 900));
  document.querySelectorAll('.modal.open, .popup.open').forEach(m => m.classList.remove('open'));
});
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: 'scene-lab/zz-cta-after-detected.png' });
await p.evaluate(() => { ThemeEngine.delete('ct_probe'); ThemeEngine.deactivate(); localStorage.clear(); });
await b.close();
