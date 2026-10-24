// zz-accent-variants.mjs — A/B/C for the solid-background CTA colour.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const b = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 900, height: 620, deviceScaleFactor: 2 });
const hex = (n) => n.toString(16).padStart(2, '0');
const mix = (a, bb, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(bb.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => hex(Math.round(v + (pb[i] - v) * t))).join('');
};
const variants = {
  A_literal: (bg) => bg,
  B_lifted: (bg) => mix(bg, '#ffffff', 0.4),
  C_deepened: (bg) => mix(bg, '#000000', 0.45),
};
for (const [name, fn] of Object.entries(variants)) {
  await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 700));
  await p.evaluate(() => localStorage.clear());
  await p.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 900));
  await p.evaluate(
    async (accent) => {
      document.getElementById('updateNoticePopup')?.classList.remove('open');
      const bg = '#d94f2b';
      const cfg = {
        id: 'ct_var', name: 'Variant', createdAt: new Date().toISOString(),
        bg: { type: 'solid', color: bg }, colors: { ...ThemeEngine.DEFAULTS },
        overlay: { color: 'rgba(0,0,0,0)' },
      };
      ThemeEngine.save(cfg);
      ThemeEngine.activate('ct_var');
      await new Promise((r) => setTimeout(r, 900));
      // Pin the accent exactly as the variant prescribes (the engine's own
      // detection is what we are comparing, so bypass it here).
      document.documentElement.style.setProperty('--th-accent', accent);
      document.documentElement.style.setProperty('--th-logo', accent);
      document.querySelectorAll('.modal.open, .popup.open').forEach((m) => m.classList.remove('open'));
      await new Promise((r) => setTimeout(r, 400));
    },
    fn('#d94f2b'),
  );
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: `scene-lab/zz-accent-${name}.png` });
  console.log(name, 'shot');
  await p.evaluate(() => { ThemeEngine.delete('ct_var'); ThemeEngine.deactivate(); localStorage.clear(); });
}
await b.close();
