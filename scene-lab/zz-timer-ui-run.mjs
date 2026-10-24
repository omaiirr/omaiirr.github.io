// zz-timer-ui-run.mjs — Pomodoro vs Stopwatch centre-UI consistency battery.
//
// Measures the REAL page in both timer modes and pins the two things the user
// sees: the digits (the colon's typography must match) and the vertical
// geometry (toggling modes must not move the centre block).
//   node scene-lab/zz-timer-ui-run.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 170) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed: ornate/i.test(m.text()))
      errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(1200);

  const setMode = async (mode) => {
    await page.evaluate((m) => {
      const sel = document.getElementById('timerModeSelect');
      sel.value = m;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, mode);
    await sleep(500);
  };

  // Everything the centre block is made of, in whichever mode is showing.
  const probe = () =>
    page.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: +r.top.toFixed(2),
          bottom: +r.bottom.toFixed(2),
          height: +r.height.toFixed(2),
          left: +r.left.toFixed(2),
          width: +r.width.toFixed(2),
          font: `${cs.fontFamily}|${cs.fontSize}|${cs.fontWeight}|${cs.letterSpacing}|${cs.fontVariantNumeric}`,
          lineHeight: cs.lineHeight,
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        };
      };
      const strip = document.getElementById('timerModeStrip');
      return {
        strip: box(strip),
        pomoWrap: box(document.getElementById('timerSection')),
        swWrap: box(document.getElementById('stopwatchSection')),
        pomoDisplay: box(document.getElementById('display')),
        swDisplay: box(document.getElementById('swDisplay')),
        pomoActions: box(document.querySelector('#timerSection .timer-actions')),
        swActions: box(document.querySelector('#stopwatchSection .stopwatch-modes')),
        bodyMode: document.body.className,
      };
    });

  console.log('== 1. the two displays render the same digits the same way');
  await setMode('pomodoro');
  const pomo = await probe();
  await setMode('stopwatch');
  const sw = await probe();
  check('pomodoro display shows mm:ss', /^\d{2}:\d{2}$/.test(pomo.pomoDisplay.text), pomo.pomoDisplay.text);
  check('stopwatch display shows mm:ss.cc', /^\d{2}:\d{2}\.\d{2}$/.test(sw.swDisplay.text), sw.swDisplay.text);
  check(
    'both displays share font family/size/weight/variant',
    pomo.pomoDisplay.font === sw.swDisplay.font,
    `${pomo.pomoDisplay.font} vs ${sw.swDisplay.font}`,
  );
  check(
    'no mode-specific letter-spacing on the digits',
    /|0px\|/.test(pomo.pomoDisplay.font) && /|0px\|/.test(sw.swDisplay.font),
    `${pomo.pomoDisplay.font} / ${sw.swDisplay.font}`,
  );
  check(
    'line-height is identical in both modes',
    pomo.pomoDisplay.lineHeight === sw.swDisplay.lineHeight,
    `${pomo.pomoDisplay.lineHeight} vs ${sw.swDisplay.lineHeight}`,
  );

  console.log('== 2. toggling modes does not move the centre block');
  check(
    'the main display keeps its top edge',
    Math.abs(pomo.pomoDisplay.top - sw.swDisplay.top) <= 1,
    `${pomo.pomoDisplay.top} vs ${sw.swDisplay.top}`,
  );
  check(
    'the main display keeps its baseline (bottom edge)',
    Math.abs(pomo.pomoDisplay.bottom - sw.swDisplay.bottom) <= 1,
    `${pomo.pomoDisplay.bottom} vs ${sw.swDisplay.bottom}`,
  );
  check(
    'the action row starts at the same y',
    Math.abs(pomo.pomoActions.top - sw.swActions.top) <= 1,
    `${pomo.pomoActions.top} vs ${sw.swActions.top}`,
  );
  check(
    'the action row is the same height',
    Math.abs(pomo.pomoActions.height - sw.swActions.height) <= 1,
    `${pomo.pomoActions.height} vs ${sw.swActions.height}`,
  );
  check(
    'the mode strip does not shift either',
    Math.abs(pomo.strip.top - sw.strip.top) <= 1 && Math.abs(pomo.strip.height - sw.strip.height) <= 1,
    `${JSON.stringify([pomo.strip.top, pomo.strip.height])} vs ${JSON.stringify([sw.strip.top, sw.strip.height])}`,
  );

  console.log('== 3. the centre block stays horizontally centred in both modes');
  const cx = (b) => +(b.left + b.width / 2).toFixed(1);
  check(
    'the display column is centred on the same axis',
    Math.abs(cx(pomo.pomoDisplay) - cx(sw.swDisplay)) <= 1,
    `${cx(pomo.pomoDisplay)} vs ${cx(sw.swDisplay)}`,
  );

  console.log('== 4. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
