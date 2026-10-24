// zz-lh-run.mjs — throwaway runner for zz-lh-harness.html (Puppeteer + Firefox).
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { pathToFileURL } from 'url';

const pagePath = new URL('./zz-lh-harness.html', import.meta.url).pathname;
const url = pathToFileURL(pagePath).href;

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
  args: ['--width=1100', '--height=1400'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1400 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 500));

const res = await page.evaluate(() => window.__RUN([
  'host', 'motion', 'options', 'combos', 'flash', 'occlusion', 'pacing', 'dpr', 'reinit', 'perf',
]));

console.log(JSON.stringify(res, null, 2));
console.log('pageErrors:', JSON.stringify(pageErrors));
await browser.close();

// ── pass criteria ──
let fail = 0;
const t = (name, cond) => { if (!cond) { fail++; console.log('FAIL:', name); } };
t('no page errors', pageErrors.length === 0);
t('host', res.host && res.host.ok === true);
t('motion', res.motion && res.motion.temporalMeanAbs > 0.5 && res.motion.temporalMeanAbs < 80);
t('options.intensity', res.options && res.options.intensityMeanAbs > 2);
t('options.color', res.options && res.options.colorMeanAbs > 2);
t('options.colorRepeat', res.options && res.options.colorRepeatMeanAbs < 1.5);
t('options.azRatio', res.options && res.options.azRatio > 5 && res.options.azRatio < 30);
t('options.stormDarker', res.options && res.options.stormDarker === true);
t('combos', Array.isArray(res.combos) && res.combos.length === 6 && res.combos.every((c) => c.sky.every(Number.isFinite)));
t('flash peak az', res.flash && Math.abs(res.flash.peakAz - 1.57) < 0.35);
t('flash lift', res.flash && res.flash.lift > 0.3);
t('occlusion', res.occlusion && res.occlusion.landwardCold === true && res.occlusion.seawardWarm === true);
t('seaward delta', res.occlusion && res.occlusion.flashWater && res.occlusion.waterBase && res.occlusion.flashWater[0] - res.occlusion.waterBase[0] > 8);
t('pacing', res.pacing && res.pacing.modulates === true && res.pacing.allPositive === true);
t('dpr host path', res.dpr && res.dpr.dpr && res.dpr.dpr.okStart && res.dpr.dpr.surfaceMatchesDpr1 && res.dpr.dpr.transformSurvivesDpr1);
t('reinit', res.reinit && res.reinit.errs === 0);
t('perf', res.perf && res.perf.msPerFrame < 20);

console.log(fail === 0 ? 'ALL GREEN' : `${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);