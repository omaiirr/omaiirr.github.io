// verify-analytics.mjs — throwaway end-to-end check of the rebuilt analytics
// section. All fixtures are backdated, so the clock time of day cannot affect
// the result (the committed zz-stats-run.mjs fixtures date "today" at 09:00 and
// therefore only pass when the suite runs after 15:00).
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 220) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBJECTS = ['Maths', 'Biology', 'Economics', 'Statistics'];

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  const errors = [];
  page.on('pageerror', (e) => { if (!/downloadable font/i.test(e.message)) errors.push(e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed/i.test(m.text()))
      errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((subjects) => {
    localStorage.clear();
    localStorage.setItem('timerHasVisited', 'true');
    localStorage.setItem('statisticsEnabled', 'true');
    const sessions = [];
    const add = (startMs, type, duration, subject) => sessions.push({
      type, duration, subject,
      date: new Date(startMs + duration * 60000).toISOString(),
    });
    const day = (back) => {
      const d = new Date();
      d.setDate(d.getDate() - back);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    };
    // A completed session earlier TODAY (always in the past: it ends a minute
    // ago whatever the clock says, so the Today pill is never empty).
    add(Date.now() - 70 * 60000, 'focus', 60, 'Maths');
    add(Date.now() - 65 * 60000, 'break', 5, 'Maths');
    add(Date.now() - 5 * 60000, 'focus', 2, 'Maths');
    add(Date.now() - 200 * 60000, 'focus', 60, 'Maths');
    add(Date.now() - 100 * 60000, 'break', 10, 'Maths');
    // Backdated history: every subject, both sides of the 7-day line.
    for (let back = 1; back <= 40; back++) {
      add(day(back), 'focus', 30, subjects[back % subjects.length]);
      if (back % 3 === 0) add(day(back), 'break', 5, subjects[back % subjects.length]);
    }
    const focusOnly = sessions.filter((s) => s.type === 'focus');
    const subjectTime = {};
    focusOnly.forEach((s) => { subjectTime[s.subject] = (subjectTime[s.subject] || 0) + s.duration; });
    localStorage.setItem('timerStats', JSON.stringify({
      totalStudyTime: focusOnly.reduce((a, s) => a + s.duration, 0),
      totalBreakTime: sessions.filter((s) => s.type !== 'focus').reduce((a, s) => a + s.duration, 0),
      subjectTime, sessions,
    }));
  }, SUBJECTS);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);

  console.log('== 1. the compact popup is the always-on entry to Study Analytics');
  const entry = await page.evaluate(async () => {
    document.querySelector('.settings-btn')?.click();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    const link = document.querySelector('.subject-more-link');
    return {
      linkText: link?.textContent ?? null,
      linkId: link?.id ?? null,
      moreInsideCard: !!document.querySelector('#subjectBreakdown .subject-more-link'),
    };
  });
  check('a Study Analytics link is always rendered', !!entry.linkText, JSON.stringify(entry));
  check('it reads as a "+N more" hand-off when subjects are hidden', /^\+\d+ more in Study Analytics$/.test(entry.linkText || ''), entry.linkText);
  check('and it is reachable by the shared id', entry.linkId === 'openStatsModalBtn', entry.linkId);

  const opened = await page.evaluate(async () => {
    document.getElementById('openStatsModalBtn')?.click();
    await new Promise((r) => setTimeout(r, 800));
    return {
      analytics: document.getElementById('statisticsModal').classList.contains('open'),
      popup: document.getElementById('themeModal').classList.contains('open'),
      momentumHidden: document.getElementById('statMomentumCard').hidden,
      patternHidden: document.getElementById('statPatternCard').hidden,
    };
  });
  check('clicking it opens Study Analytics', opened.analytics === true, JSON.stringify(opened));
  check('the compact popup closes behind it', opened.popup === false, String(opened.popup));
  check('both stat cards are revealed', opened.momentumHidden === false && opened.patternHidden === false, JSON.stringify(opened));

  console.log('== 2. the date pill re-windows every card');
  const stateFor = async (range) =>
    page.evaluate(async (r) => {
      document.querySelector(`.date-pill[data-range="${r}"]`)?.click();
      await new Promise((res) => setTimeout(res, 900));
      const text = (id) => document.getElementById(id)?.textContent ?? null;
      const ticks = [...document.querySelectorAll('#chartXLabels .chart-x-label')].map((t) => ({
        top: t.querySelector('.chart-x-label-top')?.textContent || '',
        bottom: t.querySelector('.chart-x-label-bottom')?.textContent || '',
      }));
      return {
        header: text('activityCardLabel'),
        dateLabel: text('analyticsDateLabel'),
        ticks,
        momScore: text('momScore'),
        momScope: text('momScope'),
        momDays: text('momDays'),
        momWindow: text('momWindowLabel'),
        momWeek: text('momWeek'),
        kpiStudy: text('kpiStudyTime'),
        delta: document.getElementById('momDelta')?.hidden ? null : text('momDelta'),
        sparkBars: document.querySelectorAll('#momSpark .bar').length,
        segActive: document.querySelector('#patternSeg .seg-btn.active')?.dataset.pattern ?? null,
        scope: text('patternScope'),
        heatCells: document.querySelectorAll('#patternBody .hm-cell').length,
        peakCells: document.querySelectorAll('#patternBody .hm-cell.peak').length,
        peakCallout: document.querySelector('#patternBody .stat-callout')?.textContent ?? null,
        empty: document.querySelector('#patternBody .stat-empty')?.textContent ?? null,
        subjectRows: document.querySelectorAll('#subjectList .subject-row').length,
        inlineRows: document.querySelectorAll('#sessionHistory .session-entry').length,
        showAll: text('toggleSessionHistory'),
      };
    }, range);

  const month = await stateFor('month');
  check('month header reads Monthly Activity', month.header === 'Monthly Activity', month.header);
  check('month date label names the range', /month/i.test(month.dateLabel || ''), month.dateLabel);
  check('month axis stacks a day number above a month', month.ticks.length > 0 && month.ticks.every((t) => /^\d{1,2}$/.test(t.top) && /^[A-Za-z]{3,4}$/.test(t.bottom)), JSON.stringify(month.ticks.slice(0, 3)));
  check('the momentum window sub-label follows the pill', month.momWindow === 'This month', month.momWindow);
  check('the pattern scope follows the pill', month.scope === '· this month', month.scope);
  check('the heatmap rendered 168 cells', month.heatCells === 168, String(month.heatCells));
  check('exactly one peak cell is marked', month.peakCells === 1, String(month.peakCells));
  check('the peak callout names the window and a per-day average', /^Peak \w{3} \d{2}:00–\d{2}:00 — .+ avg across \d+ days?\.$/.test(month.peakCallout || ''), month.peakCallout);
  check('no NaN / undefined leaked into the pattern card', !/NaN|undefined/.test(month.peakCallout || ''), month.peakCallout);
  check('every subject in range is listed', month.subjectRows === 4, `${month.subjectRows} rows`);
  check('the inline card caps at five rows', month.inlineRows === 5, String(month.inlineRows));
  check("Show all advertises the range's session count", /^Show all \((\d+)\)$/.test(month.showAll || ''), month.showAll);
  check('the momentum window minutes equal the KPI study total', month.momWeek === month.kpiStudy, `${month.momWeek} vs ${month.kpiStudy}`);
  check('the sparkline tiles the window into eight buckets', month.sparkBars === 8, String(month.sparkBars));

  const week = await stateFor('week');
  check('week header reads Weekly Activity', week.header === 'Weekly Activity', week.header);
  check('week axis stacks a day number above a month', week.ticks.length > 0 && week.ticks.every((t) => /^\d{1,2}$/.test(t.top) && /^[A-Za-z]{3,4}$/.test(t.bottom)), JSON.stringify(week.ticks));
  // "This week" is a calendar window, so on a Monday it is one day long — the
  // scope text must name whichever span the window actually is.
  check('the momentum scope names the previous window of equal length', /^\d+-day score vs previous (day|\d+ days)$/.test(week.momScope || ''), week.momScope);
  check('a numeric momentum score is rendered', /^\d+$/.test(week.momScore || ''), week.momScore);
  check('the delta chip shows a magnitude', week.delta === null || /\d/.test(week.delta), String(week.delta));

  const today = await stateFor('today');
  check('today header reads Daily Activity', today.header === 'Daily Activity', today.header);
  check('today slices the day into six 4-hour blocks', today.ticks.length === 6 && today.ticks.every((t) => /^\d{2}h–\d{2}h$/.test(t.top) && t.bottom === ''), JSON.stringify(today.ticks));
  check('the first block is 00h–04h and the last 20h–24h', today.ticks[0]?.top === '00h–04h' && today.ticks[5]?.top === '20h–24h', JSON.stringify([today.ticks[0]?.top, today.ticks[5]?.top]));
  check("today's momentum scope compares with the previous day", /previous day$/.test(today.momScope || ''), today.momScope);
  check("today's window is a single day", today.momDays?.endsWith('/1'), today.momDays);

  const all = await stateFor('all');
  check('all-time header reads All-Time Activity', all.header === 'All-Time Activity', all.header);
  check('all-time scope reads "All-Time Overall Score"', all.momScope === 'All-Time Overall Score', all.momScope);
  check('all-time draws no delta, having nothing to compare with', all.delta === null, String(all.delta));
  check('all-time insight says so instead of claiming a rise', /to compare against/.test(await page.evaluate(() => document.getElementById('momInsight')?.textContent || '')), 'insight');
  check('the chart is not emptied at All Time', all.ticks.length > 0, String(all.ticks.length));
  check('the heatmap still renders at All Time', all.heatCells === 168, String(all.heatCells));
  check('no formula footer element exists anywhere', await page.evaluate(() => document.getElementById('momFormula') === null));

  console.log('== 3. the Study Rhythm view + its persistence');
  await page.evaluate(() => document.getElementById('patternRhythmBtn')?.click());
  await sleep(400);
  const rhythm = await page.evaluate(() => ({
    bars: document.querySelectorAll('#patternBody .rh-bar').length,
    counts: [...document.querySelectorAll('#patternBody .rh-count')].map((e) => Number(e.textContent)),
    labels: [...document.querySelectorAll('#patternBody .rh-labels span')].map((e) => e.textContent).join(','),
    subs: [...document.querySelectorAll('#patternBody .rh-sub .v')].map((e) => e.textContent),
    keys: [...document.querySelectorAll('#patternBody .rh-sub .k')].map((e) => e.textContent),
    callout: document.querySelector('#patternBody .stat-callout')?.textContent ?? null,
    eyebrow: document.getElementById('patternEyebrowWord')?.textContent ?? null,
    aria: [...document.querySelectorAll('#patternSeg .seg-btn')].map((b) => b.getAttribute('aria-pressed')).join(','),
    stored: localStorage.getItem('statsPatternView'),
  }));
  check('rhythm renders five buckets', rhythm.bars === 5, String(rhythm.bars));
  check('bucket labels are the length ranges', rhythm.labels === '0–15,15–30,30–45,45–60,60+', rhythm.labels);
  check('the bucket counts sum to the window session count', rhythm.counts.reduce((a, b) => a + b, 0) === 43, JSON.stringify(rhythm.counts));
  check('the rhythm callout reports the median', /Median session \d+ min/.test(rhythm.callout || ''), rhythm.callout);
  check('break coverage reads as a percentage', /^\d+%$/.test(rhythm.subs[0] || ''), String(rhythm.subs[0]));
  check('the eyebrow renames the card for the view', rhythm.eyebrow === 'Study Rhythm', rhythm.eyebrow);
  check('aria-pressed tracks the active view', rhythm.aria === 'false,true', rhythm.aria);
  check('the toggle choice is persisted', rhythm.stored === 'rhythm', rhythm.stored);

  console.log('== 4. the Session Log History dialog');
  const log = await page.evaluate(async () => {
    document.getElementById('toggleSessionHistory')?.click();
    await new Promise((r) => setTimeout(r, 500));
    const modal = document.getElementById('sessionLogModal');
    const panel = modal.querySelector('.sessionlog-panel');
    const cs = getComputedStyle(panel);
    const close = document.getElementById('sessionLogClose').getBoundingClientRect();
    const header = modal.querySelector('.sessionlog-header').getBoundingClientRect();
    const dots = [...modal.querySelectorAll('.sessionlog-list .session-entry .session-dot')]
      .map((d) => getComputedStyle(d).backgroundColor);
    return {
      open: modal.classList.contains('open'),
      ariaHidden: modal.getAttribute('aria-hidden'),
      role: modal.getAttribute('role'),
      rows: modal.querySelectorAll('.sessionlog-list .session-entry').length,
      bg: cs.backgroundColor,
      radius: cs.borderRadius,
      badges: [...modal.querySelectorAll('.sessionlog-badge')].map((b) => b.textContent),
      summary: document.getElementById('sessionLogSummary').textContent,
      closeText: document.getElementById('sessionLogClose').textContent.trim(),
      closeSize: [Math.round(close.width), Math.round(close.height)],
      closeInset: Math.round(header.right - close.right),
      scrollable: getComputedStyle(document.getElementById('sessionLogList')).overflowY,
      dots,
      inlineRows: document.querySelectorAll('#sessionHistory .session-entry').length,
    };
  });
  check('it opens as a dialog', log.open === true && log.ariaHidden === 'false' && log.role === 'dialog', JSON.stringify([log.open, log.ariaHidden, log.role]));
  check('every session in range is listed', log.rows > 40, `${log.rows} rows`);
  check('the inline card stays at five', log.inlineRows === 5, String(log.inlineRows));
  check('the panel uses the shared surface token', log.bg === 'rgb(15, 23, 42)', log.bg);
  check('the ✕ is the standard 30px control inset at the header edge', log.closeText === '✕' && log.closeSize[0] === 30 && log.closeInset === 0, JSON.stringify(log.closeSize) + ' inset ' + log.closeInset);
  check('the list scrolls', log.scrollable === 'auto' || log.scrollable === 'scroll', String(log.scrollable));
  check('the summary reads as badge pills', log.badges.length === 4 && /sessions?$/.test(log.badges[0]) && /focus$/.test(log.badges[1]) && /study$/.test(log.badges[2]), JSON.stringify(log.badges));
  check('the badges are separated so the line stays readable', / · /.test(log.summary), log.summary);
  check('subject dots inherit the palette colour, not the generic indigo', log.dots.includes('rgb(52, 211, 153)') && log.dots.includes('rgb(245, 158, 11)'), JSON.stringify([...new Set(log.dots)]));
  check('break dots stay slate', log.dots.includes('rgb(100, 116, 139)'), JSON.stringify([...new Set(log.dots)]));

  console.log('== 5. the subject palette matches the Time by Subject chart');
  const palette = await page.evaluate(() => {
    const bars = {};
    document.querySelectorAll('#subjectList .subject-row').forEach((row) => {
      const name = row.querySelector('.subject-name')?.textContent;
      const fill = row.querySelector('.subject-progress-fill');
      if (name && fill) bars[name] = getComputedStyle(fill).backgroundColor;
    });
    const dotColors = {};
    document.querySelectorAll('.sessionlog-list .session-entry').forEach((e) => {
      const title = e.querySelector('.session-entry-title')?.textContent;
      const dot = e.querySelector('.session-dot');
      if (title && dot && !(title in dotColors)) dotColors[title] = getComputedStyle(dot).backgroundColor;
    });
    return { bars, dotColors };
  });
  check('Maths is indigo in both', palette.bars.Maths === 'rgb(99, 102, 241)' && palette.dotColors.Maths === 'rgb(99, 102, 241)', JSON.stringify([palette.bars.Maths, palette.dotColors.Maths]));
  check('Biology is green in both', palette.bars.Biology === 'rgb(52, 211, 153)' && palette.dotColors.Biology === 'rgb(52, 211, 153)', JSON.stringify([palette.bars.Biology, palette.dotColors.Biology]));
  check('Economics is red in both', palette.bars.Economics === 'rgb(248, 113, 113)' && palette.dotColors.Economics === 'rgb(248, 113, 113)', JSON.stringify([palette.bars.Economics, palette.dotColors.Economics]));
  check('Statistics is amber in both', palette.bars.Statistics === 'rgb(245, 158, 11)' && palette.dotColors.Statistics === 'rgb(245, 158, 11)', JSON.stringify([palette.bars.Statistics, palette.dotColors.Statistics]));
  check('a Break row keeps its own slate dot', palette.dotColors.Break === 'rgb(100, 116, 139)', String(palette.dotColors.Break));

  console.log('== 6. dialog close mechanics');
  const byBackdrop = await page.evaluate(async () => {
    document.getElementById('sessionLogBackdrop').click();
    await new Promise((r) => setTimeout(r, 300));
    return !document.getElementById('sessionLogModal').classList.contains('open');
  });
  check('the backdrop dismisses the session log', byBackdrop === true, String(byBackdrop));
  const before = await page.evaluate(async () => {
    document.getElementById('dismissUpdateNoticeBtn')?.click();
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById('toggleSessionHistory').click();
    await new Promise((r) => setTimeout(r, 400));
    return {
      log: document.getElementById('sessionLogModal').classList.contains('open'),
      analytics: document.getElementById('statisticsModal').classList.contains('open'),
      notice: !!document.getElementById('updateNoticePopup')?.classList.contains('open'),
      notes: !!document.getElementById('patchNotesPopup')?.classList.contains('open'),
    };
  });
  console.log('    before-Escape:', JSON.stringify(before));
  await page.keyboard.press('Escape');
  await sleep(300);
  const esc = await page.evaluate(() => ({
    log: document.getElementById('sessionLogModal').classList.contains('open'),
    analytics: document.getElementById('statisticsModal').classList.contains('open'),
  }));
  check('Escape closes the log and leaves analytics open', esc.log === false && esc.analytics === true, JSON.stringify(esc));
  const closed = await page.evaluate(async () => {
    document.getElementById('statisticsCloseBtn').click();
    await new Promise((r) => setTimeout(r, 300));
    return !document.getElementById('statisticsModal').classList.contains('open');
  });
  check('✕ still closes analytics', closed === true, String(closed));

  console.log('== 7. Expanded Settings → the Auto-detect toggle applies immediately');
  const toggle = await page.evaluate(async () => {
    const read = () => ({
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      start: getComputedStyle(document.getElementById('startBtn')).backgroundColor,
      stored: localStorage.getItem('tlAutoDetectColors'),
    });
    // A Theme Library preset first, so there is a derived palette to drop.
    ThemeEngine.applyNativeScene('koi', {}, '');
    await new Promise((r) => setTimeout(r, 1300));
    const derived = read();
    document.getElementById('openAdvancedSettingsBtn')?.click();
    await new Promise((r) => setTimeout(r, 500));
    const box = document.getElementById('tlAutoDetectToggle');
    const before = { checked: box.checked, stored: localStorage.getItem('tlAutoDetectColors') };
    box.click();
    await new Promise((r) => setTimeout(r, 500));
    const off = read();
    box.click();
    await new Promise((r) => setTimeout(r, 1300));
    const on = read();
    return { derived, before, off, on, checkedAfter: box.checked };
  });
  check('a derived preset palette is live before the flip', toggle.derived.accent === '#0d9488' && toggle.derived.start === 'rgb(13, 148, 136)', JSON.stringify(toggle.derived));
  check('the toggle opens ON', toggle.before.checked === true && toggle.before.stored === null, JSON.stringify(toggle.before));
  check('switch it OFF and the site defaults come back at once', toggle.off.accent === '#6366f1' && toggle.off.start === 'rgb(99, 102, 241)', JSON.stringify(toggle.off));
  check('the OFF choice is persisted', toggle.off.stored === '0', String(toggle.off.stored));
  check('switch it ON and the preset palette is derived immediately', toggle.on.accent === '#0d9488' && toggle.on.start === 'rgb(13, 148, 136)', JSON.stringify(toggle.on));
  check('the ON choice is persisted too', toggle.on.stored === '1' && toggle.checkedAfter === true, JSON.stringify([toggle.on.stored, toggle.checkedAfter]));

  console.log('== 8. no page or console errors');
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `RED — ${failed} failed` : 'ALL GREEN');
process.exit(failed ? 1 : 0);

