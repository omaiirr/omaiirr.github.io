// zz-stats-run.mjs — statistics battery: momentum + focus-pattern cards.
//
// Drives the REAL modal in the real site (fixture seeded into localStorage, the
// modal opened through its own button) and asserts rendered values against the
// pure module computed in-page, plus toggle persistence and both empty states.
//   node scene-lab/zz-stats-run.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 150) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- fixtures
// Built here (not in-page) so the shape is exactly what logSession() writes.
const focus = (daysAgo, hour, duration, subject = 'Maths') => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, 0, 0, 0);
  return {
    type: 'focus',
    duration,
    subject,
    date: new Date(start.getTime() + duration * 60000).toISOString(),
  };
};
const brk = (daysAgo, hour, duration) => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, 0, 0, 0);
  return {
    type: 'break',
    duration,
    subject: 'Maths',
    date: new Date(start.getTime() + duration * 60000).toISOString(),
  };
};

// A rich profile: 3 × 40 min every day for a week (score should saturate the
// volume/active/length terms), a weaker week before it (positive delta), and
// six weeks of history so the heatmap has both sessions and distinct days.
function richSessions() {
  const out = [];
  for (let d = 0; d < 7; d++) {
    out.push(focus(d, 9, 40, 'Maths'), focus(d, 11, 40, 'Physics'), focus(d, 14, 40, 'Chemistry'));
    out.push(brk(d, 10, 5), brk(d, 12, 5));
  }
  out.push(focus(7, 9, 20, 'Maths'), focus(8, 9, 20, 'Maths'));
  for (let d = 9; d < 42; d += 1) {
    if (d % 3 === 0) out.push(focus(d, 10, 30, 'Maths'));
    if (d % 5 === 0) out.push(focus(d, 16, 45, 'Physics'));
  }
  return out;
}
// Each guard in isolation:
// · 5 sessions on ONE day → passes the session floor, fails the distinct-days floor
// · 1 session on each of 4 days → passes the days floor, fails the session floor
const thinDays = [focus(0, 9, 30), focus(0, 10, 30), focus(0, 11, 30), focus(0, 13, 30), focus(0, 14, 30)];
const thinSessions = [focus(0, 9, 30), focus(1, 9, 30), focus(2, 9, 30), focus(3, 9, 30)];

const statsFor = (sessions) => {
  const focusOnly = sessions.filter((s) => s.type === 'focus');
  const subjectTime = {};
  focusOnly.forEach((s) => {
    subjectTime[s.subject] = (subjectTime[s.subject] || 0) + s.duration;
  });
  return {
    totalStudyTime: focusOnly.reduce((a, s) => a + s.duration, 0),
    totalBreakTime: sessions.filter((s) => s.type !== 'focus').reduce((a, s) => a + s.duration, 0),
    subjectTime,
    sessions,
  };
};

// ---------------------------------------------------------------- harness
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

  const seed = async (sessions) => {
    await page.evaluate(
      (s) => {
        localStorage.clear();
        localStorage.setItem('timerHasVisited', 'true');
        localStorage.setItem('statisticsEnabled', 'true');
        if (s) localStorage.setItem('timerStats', JSON.stringify(s));
      },
      sessions ? statsFor(sessions) : null,
    );
  };
  const openModal = async () => {
    await page.evaluate(() => {
      const notice = document.getElementById('updateNoticePopup');
      if (notice && notice.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
      document.getElementById('statisticsModal')?.classList.remove('open');
    });
    await sleep(200);
    await page.evaluate(() => document.getElementById('openStatsModalBtn')?.click());
    await sleep(700);
  };
  // shots are clipped to the modal panel so they show the cards at real size
  // Pick a date-range pill the way a user does; the cards must re-render to it.
  const selectRange = async (range) => {
    await page.evaluate((r) => document.querySelector(`.date-pill[data-range="${r}"]`)?.click(), range);
    await sleep(500);
  };
  const shot = async (name) => {
    const panel = await page.$('#statisticsModal .analytics-panel');
    if (panel) await panel.screenshot({ path: `scene-lab/${name}.png` });
  };
  // Mirrors the modal's own window rule (activeRangeOptions) so expectations can
  // never be written against a different window than the UI renders.
  const mirror = (range) =>
    page.evaluate((range) => {
      const s = JSON.parse(localStorage.getItem('timerStats')).sessions;
      const now = new Date();
      const startOfWeek = (d) => {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
        return x;
      };
      const opts = { now, buckets: 8 };
      if (range === 'today') opts.from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (range === 'week') opts.from = startOfWeek(now);
      else if (range === 'month') opts.from = new Date(now.getFullYear(), now.getMonth(), 1);
      else {
        const all = s.map((x) => new Date(x.date)).filter((d) => !isNaN(d));
        const first = new Date(Math.min(...all));
        opts.from = new Date(first.getTime() - 1);
      }
      const spanDays = Math.max(1, Math.ceil((now - opts.from) / 864e5));
      opts.bucketDays = Math.max(1, Math.ceil(spanDays / opts.buckets));
      opts.minDays = spanDays < 2 ? 1 : 2;
      opts.minSessions = spanDays < 2 ? 2 : 5;
      if (range === 'all') opts.scoringDays = Math.min(30, spanDays);
      const m = StatsMetrics.momentum(s, opts);
      const hm = StatsMetrics.heatmap(s, opts);
      const rh = StatsMetrics.rhythm(s, { ...opts, minSessions: spanDays < 2 ? 2 : 3 });
      const inRange = (x) => {
        if (range === 'all') return true;
        const d = new Date(x.date);
        if (range === 'today') return d.toDateString() === now.toDateString();
        return d >= opts.from;
      };
      const kept = s.filter(inRange);
      return {
        spanDays,
        score: m.score,
        delta: m.delta,
        week: m.weekMinutes,
        weekLabel: StatsMetrics.formatMinutes(m.weekMinutes),
        activeDays: m.activeDays,
        days: m.days,
        trend: m.trend.length,
        hasPrevious: m.hasPrevious,
        heatCells: hm.mins.flat().length,
        heatSessions: hm.sessionCount,
        heatEnough: hm.hasEnough,
        minSessions: hm.minSessions,
        minDays: hm.minDays,
        peakLabel: hm.peakLabel,
        rhythmCounts: rh.counts,
        rhythmSessions: rh.sessionCount,
        rhEnough: rh.hasEnough,
        weeks8: StatsMetrics.PATTERN_WEEKS,
        kpiStudy: StatsMetrics.formatMinutes(kept.filter((x) => x.type === 'focus').reduce((a, x) => a + x.duration, 0)),
        kpiTotal: kept.filter((x) => x.type === 'focus').reduce((a, x) => a + x.duration, 0),
      };
    }, range);

  const cards = () =>
    page.evaluate(() => {
      const mom = document.getElementById('statMomentumCard');
      const pattern = document.getElementById('statPatternCard');
      const text = (id) => document.getElementById(id)?.textContent ?? null;
      const delta = document.getElementById('momDelta');
      return {
        modalOpen: document.getElementById('statisticsModal').classList.contains('open'),
        momHidden: mom.hidden,
        patternHidden: pattern.hidden,
        momScore: text('momScore'),
        momDelta: delta && !delta.hidden ? delta.textContent : null,
        momDeltaClass: delta?.className ?? null,
        momInsight: text('momInsight'),
        momWeek: text('momWeek'),
        momDays: text('momDays'),
        momAvg: text('momAvg'),
        momFormula: text('momFormula'),
        momScope: text('momScope'),
        momWindowLabel: text('momWindowLabel'),
        sparkAxisFrom: text('momSparkAxisFrom'),
        activePill: document.querySelector('.date-pill.active')?.dataset.range ?? null,
        dateLabel: text('analyticsDateLabel'),
        kpiStudy: text('kpiStudyTime'),
        kpiSessions: text('kpiSessions'),
        sparkBars: document.querySelectorAll('#momSpark .bar').length,
        sparkNowBars: document.querySelectorAll('#momSpark .bar.now').length,
        sparkNote: text('momSparkNote'),
        scope: text('patternScope'),
        segActive: document.querySelector('#patternSeg .seg-btn.active')?.dataset.pattern ?? null,
        segAria: [...document.querySelectorAll('#patternSeg .seg-btn')].map((b) => b.getAttribute('aria-pressed')).join(','),
        segTabRoles: document.querySelectorAll('#patternSeg [role="tab"], #patternBody[role="tabpanel"]').length,
        segGroup: document.getElementById('patternSeg')?.getAttribute('role'),
        bodyLive: document.getElementById('patternBody')?.getAttribute('aria-live'),
        heatCells: document.querySelectorAll('#patternBody .hm-cell').length,
        peakCells: document.querySelectorAll('#patternBody .hm-cell.peak').length,
        peakCallout: document.querySelector('#patternBody .stat-callout')?.textContent ?? null,
        rhBars: document.querySelectorAll('#patternBody .rh-bar').length,
        rhCounts: [...document.querySelectorAll('#patternBody .rh-count')].map((e) => Number(e.textContent)),
        rhLabels: [...document.querySelectorAll('#patternBody .rh-labels span')].map((e) => e.textContent).join(','),
        rhSubs: [...document.querySelectorAll('#patternBody .rh-sub .v')].map((e) => e.textContent),
        emptyText: document.querySelector('#patternBody .stat-empty')?.textContent ?? null,
        patternTitle: document.querySelector('#patternBody .stat-title')?.textContent ?? null,
        momCardText: mom.innerText,
        patternCardText: pattern.innerText,
      };
    });
  console.log('== 1. rich profile — the "This Week" pill drives both cards');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await seed(richSessions());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  await selectRange('week');
  let st = await cards();
  // Expected values come from the mirror of the modal's own window rule, so a
  // card that ignored the pill would disagree here.
  const expected = await mirror('week');
  check('the week pill is the active one', st.activePill === 'week', String(st.activePill));
  check('statistics modal is open', st.modalOpen, JSON.stringify({ open: st.modalOpen }));
  check('momentum card is revealed', st.momHidden === false);
  check('score matches StatsMetrics.momentum()', Number(st.momScore) === expected.score, `${st.momScore} vs ${expected.score}`);
  check('delta chip matches the sign of the delta', (expected.delta > 0 && /up/.test(st.momDeltaClass)) || (expected.delta < 0 && /down/.test(st.momDeltaClass)) || (expected.delta === 0 && /flat/.test(st.momDeltaClass)), `${expected.delta} → ${st.momDeltaClass}`);
  check('delta chip shows the magnitude', st.momDelta?.includes(String(Math.abs(expected.delta))), st.momDelta);
  check('this-week value matches the window minutes', st.momWeek === expected.weekLabel, `${st.momWeek} vs ${expected.weekLabel}`);
  check('active days read n/7', st.momDays === `${expected.activeDays}/${expected.days}`, st.momDays);
  check('momentum header names the week window', /previous 7 days/.test(st.momScope ?? ''), st.momScope);
  check('the window sub-label follows the pill', st.momWindowLabel === 'This week', st.momWindowLabel);
  check('average session is rendered as minutes', typeof st.momAvg === 'string' && /(min|h)/.test(st.momAvg), st.momAvg);
  check('sparkline has 8 bars in week mode', st.sparkBars === expected.trend && expected.trend === 8, String(st.sparkBars));
  check('sparkline marks the newest bucket', st.sparkNowBars === 1, String(st.sparkNowBars));
  check('sparkline note names the best bucket', /Best/.test(st.sparkNote ?? ''), st.sparkNote);
  check('formula caption spells out the weights', /0\.45/.test(st.momFormula ?? '') && /0\.30/.test(st.momFormula ?? '') && /0\.25/.test(st.momFormula ?? ''), st.momFormula);
  check('insight line is a sentence', (st.momInsight ?? '').length > 20, st.momInsight);
  check('no NaN / undefined leaked into the momentum card', !/NaN|undefined/.test(st.momCardText), st.momCardText.slice(0, 80));

  console.log('== 2. focus pattern — heatmap view, scope label, values');
  check('pattern card is revealed', st.patternHidden === false);
  check('scope label states the week window', st.scope === '· this week', st.scope);
  check('heatmap rendered the week window’s session count', expected.heatSessions > 0 && st.heatCells === 168, `heat ${expected.heatSessions}/${st.heatCells}`);
  check('heatmap is the default view', st.segActive === 'heat' && st.heatCells === expected.heatCells, `${st.segActive}/${st.heatCells}`);
  check('exactly one peak cell is marked', st.peakCells === 1, String(st.peakCells));
  check('peak callout names the window and per-day average', (st.peakCallout ?? '').startsWith(`Peak ${expected.peakLabel}`) && /avg across \d+ days?/.test(st.peakCallout ?? ''), st.peakCallout);
  check('no NaN / undefined leaked into the pattern card', !/NaN|undefined/.test(st.patternCardText), st.patternCardText.slice(0, 80));

  await shot('zz-stats-after-heatmap');

  console.log('== 3. focus pattern — rhythm view (toggle)');
  await page.evaluate(() => document.getElementById('patternRhythmBtn')?.click());
  await sleep(400);
  st = await cards();
  check('rhythm view renders 5 buckets', st.rhBars === 5, String(st.rhBars));
  check('bucket counts match the module', JSON.stringify(st.rhCounts) === JSON.stringify(expected.rhythmCounts), `${JSON.stringify(st.rhCounts)} vs ${JSON.stringify(expected.rhythmCounts)}`);
  check('bucket labels are the length ranges', st.rhLabels === '0–15,15–30,30–45,45–60,60+', st.rhLabels);
  check('rhythm callout reports the median', /Median/.test(st.peakCallout ?? ''), st.peakCallout);
  check('sessions-logged sub-stat matches the module', Number(st.rhSubs[2]) === expected.rhythmSessions, `${st.rhSubs[2]} vs ${expected.rhythmSessions}`);
  check('break coverage is a percentage', /^\d+%$/.test(st.rhSubs[0] ?? ''), st.rhSubs[0]);
  check('aria-pressed tracks the active view', st.segAria === 'false,true', st.segAria);
  check('no role=tab promise without arrow-key support', st.segTabRoles === 0 && st.segGroup === 'group', `${st.segTabRoles}/${st.segGroup}`);
  check('swapped view is announced (aria-live)', st.bodyLive === 'polite', String(st.bodyLive));
  const stored = await page.evaluate(() => localStorage.getItem('statsPatternView'));
  check('toggle choice is written to localStorage', stored === 'rhythm', String(stored));

  await shot('zz-stats-after-rhythm');

  console.log('== 4. toggle choice survives a reload');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  st = await cards();
  check('rhythm view is restored on reopen', st.segActive === 'rhythm' && st.rhBars === 5, `${st.segActive}/${st.rhBars}`);
  await page.evaluate(() => document.getElementById('patternHeatBtn')?.click());
  await sleep(300);
  const back = await page.evaluate(() => localStorage.getItem('statsPatternView'));
  check('switching back persists too', back === 'heat', String(back));

  console.log('== 5. empty profile — both cards show an empty state, not zeros');
  await seed(null);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  await selectRange('week');
  st = await cards();
  check('momentum card still renders (it has a trend to show)', st.momHidden === false);
  check('score shows an em dash, not 0', st.momScore === '—', st.momScore);
  check('delta chip is hidden with no sessions', st.momDelta === null, st.momDelta);
  check('insight explains the empty state', /No focus sessions this week/.test(st.momInsight ?? ''), st.momInsight);
  check('active days read 0/7', st.momDays === '0/7', st.momDays);
  check('sparkline still renders 8 empty bars', st.sparkBars === 8, String(st.sparkBars));
  check('heatmap shows the not-enough-data state', /Not enough data yet/.test(st.emptyText ?? ''), st.emptyText);
  check('empty state asks for the shortfall in sessions', /5 more focus sessions/.test(st.emptyText ?? ''), st.emptyText);
  check('no zero-filled grid is rendered', st.heatCells === 0, String(st.heatCells));
  check('no NaN / undefined in either card when empty', !/NaN|undefined/.test(st.momCardText + st.patternCardText), (st.momCardText + st.patternCardText).slice(0, 80));

  await shot('zz-stats-after-empty');

  console.log('== 6. the two heatmap floors are enforced separately');
  await seed(thinDays);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  await selectRange('week');
  st = await cards();
  check('5 sessions on one day: still gated', /Not enough data yet/.test(st.emptyText ?? ''), st.emptyText);
  check('that gate names the DAY shortfall only', /sessions on 1 more day/.test(st.emptyText ?? '') && !/more focus session/.test(st.emptyText ?? ''), st.emptyText);
  check('momentum scores a thin week without saturating', Number(st.momScore) > 0 && Number(st.momScore) < 100, st.momScore);
  // The same fixture is clearable under the Today pill: one day, relaxed floors.
  await selectRange('today');
  st = await cards();
  check('the Today pill drops the two-day floor for a one-day window', !/Not enough data yet/.test(st.emptyText ?? '') && st.heatCells === 168, `${st.heatCells}/${st.emptyText}`);
  check('Today’s active-day denominator is 1', st.momDays === '1/1', st.momDays);
  check('Today’s momentum window states the yesterday comparison', /previous day/.test(st.momScope ?? ''), st.momScope);
  check('Today’s insight still reads as a sentence', (st.momInsight ?? '').length > 20, st.momInsight);
  await selectRange('week');
  await page.evaluate(() => document.getElementById('patternRhythmBtn')?.click());
  await sleep(400);
  st = await cards();
  check('rhythm is not gated by the days floor', st.rhBars === 5 && /Median/.test(st.peakCallout ?? ''), `${st.rhBars}/${st.peakCallout}`);

  await seed(thinSessions);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  await selectRange('week');
  st = await cards();
  check('4 sessions over 4 days: still gated', /Not enough data yet/.test(st.emptyText ?? ''), st.emptyText);
  check('that gate names the SESSION shortfall only', /1 more focus session/.test(st.emptyText ?? '') && !/more days/.test(st.emptyText ?? ''), st.emptyText);

  console.log('== 7. every pill re-windows momentum and the focus pattern');
  await seed(richSessions());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);
  await openModal();
  const ranges = [
    { range: 'today', label: 'Today', scope: '· today' },
    { range: 'week', label: 'This week', scope: '· this week' },
    { range: 'month', label: 'This month', scope: '· this month' },
    { range: 'all', label: 'All time', scope: '· all time' },
  ];
  for (const r of ranges) {
    await selectRange(r.range);
    st = await cards();
    const exp = await mirror(r.range);
    check(`[${r.range}] the pill is active`, st.activePill === r.range, String(st.activePill));
    check(`[${r.range}] momentum follows the window (${exp.weekLabel})`, st.momWeek === exp.weekLabel, `${st.momWeek} vs ${exp.weekLabel}`);
    check(`[${r.range}] active-day denominator is the window's calendar days (${exp.days})`, st.momDays.endsWith(`/${exp.days}`), `${st.momDays} vs /${exp.days}`);
    check(`[${r.range}] active days never exceed the window`, Number(st.momDays.split('/')[0]) <= exp.days, st.momDays);
    check(`[${r.range}] the trend tiles the window into 8 buckets`, st.sparkBars === exp.trend && exp.trend === 8, `${st.sparkBars} vs ${exp.trend}`);
    check(`[${r.range}] the axis states the bucket span`, /\d+ days ago/.test(st.sparkAxisFrom ?? ''), st.sparkAxisFrom);
    check(`[${r.range}] window sub-label names the pill`, st.momWindowLabel === r.label, st.momWindowLabel);
    check(`[${r.range}] focus-pattern scope names the pill`, st.scope === r.scope, st.scope);
    check(`[${r.range}] the rich profile clears the pattern floors in every window`, exp.heatEnough === true && exp.rhEnough === true && st.heatCells === 168, `${exp.heatEnough}/${exp.rhEnough}/${st.heatCells}`);
    check(`[${r.range}] momentum and KPI row agree on the window's minutes`, st.momWeek === exp.kpiStudy, `${st.momWeek} vs ${exp.kpiStudy}`);
  }
  await selectRange('all');
  st = await cards();
  check('all-time momentum draws no delta, having nothing to compare with', st.momDelta === null, st.momDelta);
  check('all-time insight says so instead of claiming a rise', /to compare against/.test(st.momInsight ?? ''), st.momInsight);

  console.log('== 8. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
