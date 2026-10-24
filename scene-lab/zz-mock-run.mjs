// zz-mock-run.mjs — Stage A mockup battery (throwaway).
// For each of the 4 direction pages: load, assert zero page errors, exercise
// every variant toggle (motion, font, steppers, pills, checks, chips, tabs,
// swatches), assert state changes, then screenshot full page.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { writeFileSync } from 'fs';

const DIRS = ['refined', 'lighter', 'bolder', 'raycast'];
const BASE = 'http://127.0.0.1:4000/scene-lab/';
const results = [];
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 120) + ']' : ''}`);
};

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  for (const dir of DIRS) {
    console.log(`\n== ${dir}`);
    const errors = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/downloadable font/i.test(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE}mockup-${dir}.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 700));

    // presence census
    const census = await page.evaluate(() => ({
      swatches: document.querySelectorAll('.swatches .swatch').length,
      libBtns: document.querySelectorAll('.lib-btn').length,
      steppers: document.querySelectorAll('.stepper').length,
      pills: document.querySelectorAll('.pills-row .pill').length,
      tasks: document.querySelectorAll('.task').length,
      chips: document.querySelectorAll('.chipx').length,
      tabs: document.querySelectorAll('.te-tab').length,
      panels: document.querySelectorAll('.panel').length,
    }));
    check('panels rendered (9: settings + notes + confirm + stats + 3 planners + add + editor)', census.panels === 9, census.panels);
    check('swatches (6) + lib button', census.swatches === 6 && census.libBtns === 1, JSON.stringify(census));
    check('steppers (3) + pills (4) + tasks (7) + chips (5) + tabs (3)',
      census.steppers === 3 && census.pills === 4 && census.tasks === 7 && census.chips === 5 && census.tabs === 3);

    // motion toggle
    await page.click('.seg[data-kind="motion"] button[data-v="subtle"]');
    await new Promise((r) => setTimeout(r, 120));
    let v = await page.evaluate(() => document.body.dataset.motion);
    check('motion toggle → subtle', v === 'subtle', v);
    const springVar = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--spring'));
    check('subtle swaps spring curve', /0\.22,\s*1/.test(springVar), springVar.trim());
    await page.click('.seg[data-kind="motion"] button[data-v="springy"]');
    await new Promise((r) => setTimeout(r, 120));
    v = await page.evaluate(() => document.body.dataset.motion);
    check('motion toggle → springy', v === 'springy', v);

    // font toggle (Inter actually applies)
    await page.click('.seg[data-kind="font"] button[data-v="inter"]');
    await new Promise((r) => setTimeout(r, 350));
    const font1 = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    check('font toggle applies Inter', /InterVar/i.test(font1), font1.slice(0, 60));
    const fontLoaded = await page.evaluate(() => document.fonts.check('16px InterVar'));
    check('Inter woff2 actually loaded', fontLoaded);
    await page.click('.seg[data-kind="font"] button[data-v="jakarta"]');
    await new Promise((r) => setTimeout(r, 200));

    // stepper interaction
    const before = await page.evaluate(() => document.querySelector('.stepper .val').dataset.n);
    await page.evaluate(() => {
      const st = document.querySelector('.stepper');
      st.querySelector('button[data-d="+"]').click();
      st.querySelector('button[data-d="+"]').click();
      st.querySelector('button[data-d="-"]').click();
    });
    const after = await page.evaluate(() => document.querySelector('.stepper .val').dataset.n);
    check('stepper +1 +1 -1 works', String(Number(before) + 1) === after, `${before}→${after}`);

    // pill single-select
    await page.evaluate(() => {
      const row = document.querySelector('.pills-row');
      row.children[0].click(); row.children[2].click();
    });
    const onCount = await page.evaluate(() => document.querySelectorAll('.pills-row .pill.on').length);
    check('pills single-select (1 on)', onCount === 1, onCount);

    // task check toggles
    const doneBefore = await page.evaluate(() => document.querySelectorAll('.task .chk.done').length);
    await page.evaluate(() => document.querySelector('.task .chk').click());
    const doneAfter = await page.evaluate(() => document.querySelectorAll('.task .chk.done').length);
    check('task check toggles', Math.abs(doneAfter - doneBefore) === 1, `${doneBefore}→${doneAfter}`);
    // restore
    await page.evaluate(() => document.querySelector('.task .chk').click());

    // chip toggle
    await page.evaluate(() => document.querySelector('.chips .chipx').click());
    const chipOn = await page.evaluate(() => document.querySelector('.chips .chipx').classList.contains('on'));
    check('chips toggle', chipOn);

    // editor tab switch
    await page.evaluate(() => document.querySelectorAll('.te-tab')[2].click());
    const tabOn = await page.evaluate(() => document.querySelectorAll('.te-tab')[2].classList.contains('on'));
    check('editor tab switch', tabOn);

    // swatch switch
    await page.evaluate(() => document.querySelectorAll('.swatches .swatch')[2].click());
    const swOn = await page.evaluate(() => document.querySelectorAll('.swatches .swatch')[2].classList.contains('active'));
    check('swatch switch', swOn);

    // direction token actually applied (accent differs per direction)
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--uo-accent').trim());
    check('direction accent token applied', accent.length > 0, accent);

    const realErrors = errors.filter((e) => !/thumbnail failed|downloadable font/i.test(e));
    check('zero page errors', realErrors.length === 0, realErrors.join(' | ').slice(0, 100));

    // screenshot (reset to springy + jakarta defaults first)
    await page.evaluate(() => {
      document.body.dataset.motion = 'springy';
      document.body.dataset.font = 'jakarta';
      document.querySelector('.seg[data-kind="motion"] button[data-v="springy"]').classList.add('on');
      document.querySelector('.seg[data-kind="motion"] button[data-v="subtle"]').classList.remove('on');
      document.querySelector('.seg[data-kind="font"] button[data-v="jakarta"]').classList.add('on');
      document.querySelector('.seg[data-kind="font"] button[data-v="inter"]').classList.remove('on');
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `scene-lab/zz-mock-${dir}.png`, fullPage: true });
    console.log(`  shot → zz-mock-${dir}.png`);
  }

  console.log('\n---');
  console.log(failed === 0 ? 'MOCKUP BATTERY: ALL GREEN' : `MOCKUP BATTERY: ${failed} FAILURES`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}
