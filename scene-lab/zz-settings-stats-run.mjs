// zz-settings-stats-run.mjs — compact Settings popup: subject cap + surface.
//
// Drives the real spring-open Settings popup in the real site and asserts:
//   · the subject breakdown shows at most three subjects, ordered by minutes
//   · a "+N more in Study Analytics" control appears only when there are more,
//     and hands off to the analytics modal
//   · an unthemed popup renders the app's navy surface, not pitch black, and
//     still follows --th-surface when a theme sets one
//   node scene-lab/zz-settings-stats-run.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 160) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Six subjects with clearly separated totals, so the top three are unambiguous.
const SIX = { Physics: 100, Mathematics: 80, Chemistry: 60, Biology: 40, 'English Language': 20, Economics: 10 };
const THREE = { Physics: 100, Mathematics: 80, Chemistry: 60 };

const statsFor = (subjectTime) => {
  const sessions = [];
  Object.entries(subjectTime).forEach(([subject, mins]) => {
    sessions.push({
      type: 'focus',
      duration: mins,
      subject,
      date: new Date().toISOString(),
    });
  });
  return {
    totalStudyTime: Object.values(subjectTime).reduce((a, b) => a + b, 0),
    totalBreakTime: 0,
    subjectTime: { ...subjectTime },
    sessions,
  };
};

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed: ornate/i.test(m.text()))
      errors.push(m.text());
  });

  const seed = async (stats) => {
    // Land on the origin first — localStorage is not reachable from about:blank.
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.evaluate(
      (s) => {
        localStorage.clear();
        localStorage.setItem('timerHasVisited', 'true');
        localStorage.setItem('statisticsEnabled', 'true');
        if (s) localStorage.setItem('timerStats', JSON.stringify(s));
      },
      stats,
    );
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
  };

  // Opens the spring-open Settings popup and switches to its Statistics tab.
  const openStatsTab = async () => {
    await page.evaluate(() => {
      const notice = document.getElementById('updateNoticePopup');
      if (notice && notice.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
      document.getElementById('statisticsModal')?.classList.remove('open');
      document.querySelector('.settings-btn')?.click();
    });
    await sleep(400);
    await page.evaluate(() => document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click());
    await sleep(400);
  };

  const read = () =>
    page.evaluate(() => {
      const box = document.getElementById('subjectBreakdown');
      const rows = [...box.querySelectorAll('div')].filter((d) => d.querySelector('span'));
      const more = box.querySelector('.subject-more-link');
      return {
        popupOpen: document.getElementById('themeModal')?.classList.contains('open') ?? null,
        rows: rows.map((r) => [...r.querySelectorAll('span')].map((s) => s.textContent)),
        empty: box.querySelector('.stat-empty, div')?.textContent?.trim() ?? null,
        moreText: more?.textContent ?? null,
        moreTag: more?.tagName ?? null,
        moreLabel: more?.getAttribute('aria-label') ?? null,
        popupBg: getComputedStyle(document.getElementById('themeModal')).backgroundColor,
        panelBg: getComputedStyle(document.querySelector('.analytics-panel')).backgroundColor,
        surfaceVar: getComputedStyle(document.documentElement).getPropertyValue('--th-surface').trim(),
        bodyThemed: document.body.classList.contains('custom-theme-active'),
      };
    });

  console.log('== 1. six subjects — the popup caps the list at three');
  await seed(statsFor(SIX));
  await openStatsTab();
  let st = await read();
  check('the compact Settings popup is open', st.popupOpen === true, String(st.popupOpen));
  check('exactly three subject rows are rendered', st.rows.length === 3, JSON.stringify(st.rows));
  check('the rows are the three largest, biggest first', JSON.stringify(st.rows.map((r) => r[0])) === JSON.stringify(['Physics', 'Mathematics', 'Chemistry']), JSON.stringify(st.rows));
  check('each row pairs the subject with its formatted time', st.rows[0][1] === '1h 40m' && st.rows[2][1] === '1h', JSON.stringify(st.rows));
  check('a "more" control is offered for the hidden subjects', /^\+3 more in Study Analytics$/.test(st.moreText ?? ''), st.moreText);
  check('the "more" control is a real button, not a bare link', st.moreTag === 'BUTTON', String(st.moreTag));
  check('the "more" control is labelled for screen readers', /all 6 subjects/.test(st.moreLabel ?? ''), st.moreLabel);

  console.log('== 2. the "more" control hands off to Study Analytics');
  await page.evaluate(() => document.querySelector('.subject-more-link')?.click());
  await sleep(600);
  const handoff = await page.evaluate(() => ({
    analyticsOpen: document.getElementById('statisticsModal').classList.contains('open'),
    popupOpen: document.getElementById('themeModal').classList.contains('open'),
    subjectRows: document.querySelectorAll('#subjectList .subject-row').length,
  }));
  check('Study Analytics opens from the popup', handoff.analyticsOpen === true, JSON.stringify(handoff));
  check('the compact popup closes behind it', handoff.popupOpen === false, String(handoff.popupOpen));
  check('the full modal lists every subject', handoff.subjectRows === 6, String(handoff.subjectRows));

  console.log('== 3. three subjects — no "more" control, no misleading count');
  await seed(statsFor(THREE));
  await openStatsTab();
  st = await read();
  check('all three subjects fit in the popup', st.rows.length === 3, String(st.rows.length));
  check('no "more" control when nothing is hidden', st.moreText === null, String(st.moreText));

  console.log('== 4. no subjects — the empty line survives, still no "more" control');
  await seed(statsFor({}));
  await openStatsTab();
  st = await read();
  check('the empty state reads as before', st.empty === 'No subject data yet', String(st.empty));
  check('no "more" control with no data', st.moreText === null, String(st.moreText));

  console.log('== 5. the unthemed popup uses the app surface, not pitch black');
  await seed(statsFor(SIX));
  await openStatsTab();
  st = await read();
  check('the popup is not black', !/^rgba?\(0, 0, 0/.test(st.popupBg), st.popupBg);
  check('the popup carries the app navy surface', st.popupBg === 'rgba(10, 18, 34, 0.96)', st.popupBg);
  check('that is the value --th-surface resolves to', st.surfaceVar === 'rgba(10, 18, 34, 0.96)', st.surfaceVar);
  // The panels carry the same navy through different tokens (the analytics
  // modal is an opaque fixed dark), so compare channels rather than strings.
  const chan = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const [pr, pg, pb] = chan(st.popupBg);
  const [ar, ag, ab] = chan(st.panelBg);
  check(
    'the popup matches the surface the other panels already used',
    Math.abs(pr - ar) <= 10 && Math.abs(pg - ag) <= 10 && Math.abs(pb - ab) <= 10,
    `${st.popupBg} vs ${st.panelBg}`,
  );
  check('the surface is the navy, not a grey or black', pb > pr && pb > pg, st.popupBg);
  check('no themed-chrome class is involved by default', st.bodyThemed === false, String(st.bodyThemed));

  console.log('== 6. a theme that sets --th-surface still wins');
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--th-surface', 'rgba(20, 40, 60, 0.9)');
  });
  await sleep(200);
  st = await read();
  check('the popup follows the themed surface', st.popupBg === 'rgba(20, 40, 60, 0.9)', st.popupBg);
  await page.evaluate(() => document.documentElement.style.removeProperty('--th-surface'));
  await sleep(200);
  st = await read();
  check('clearing the theme restores the app surface', st.popupBg === 'rgba(10, 18, 34, 0.96)', st.popupBg);

  console.log('== 7. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
