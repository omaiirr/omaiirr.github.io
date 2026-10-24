#!/usr/bin/env node
// zz-stats-metrics-run.mjs — pure-math harness for assets/js/stats-metrics.js.
//
// No browser and no server: the module is evaluated in a vm context and its
// functions are asserted directly against hand-computed fixtures. This is the
// half of the statistics verification that does NOT need the DOM.
//   node scene-lab/zz-stats-metrics-run.mjs   → ALL GREEN, exit 0
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(path.resolve(HERE, ".."), "assets/js/stats-metrics.js");

let pass = 0;
const failures = [];

function section(title) {
  console.log(`\n== ${title}`);
}
function ok(label, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail !== undefined ? ` → ${detail}` : ""}`);
  }
}
function eq(label, actual, expected) {
  ok(label, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}
function near(label, actual, expected, tol = 1e-9) {
  ok(label, Math.abs(actual - expected) <= tol, `got ${actual}, want ${expected}`);
}

// ---------------------------------------------------------------- load module
const source = fs.readFileSync(SRC, "utf8");
const ctx = vm.createContext({});
vm.runInContext(`${source}\n;globalThis.__SM = StatsMetrics;`, ctx, { filename: SRC });
const SM = ctx.__SM;

// ------------------------------------------------------------------- fixtures
// A fixed "now" so nothing depends on the wall clock. Sessions are stamped at
// COMPLETION, so focusAt() takes the START hour and stamps start + duration.
const NOW = new Date(2026, 9, 11, 15, 0, 0);
const day = (offset) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset);

function focusAt(dayOffset, startHour, duration, subject = "Maths") {
  const start = new Date(day(dayOffset).getTime() + startHour * 3600000);
  return {
    type: "focus",
    duration,
    subject,
    date: new Date(start.getTime() + duration * 60000).toISOString(),
  };
}
function breakAt(dayOffset, startHour, duration) {
  const start = new Date(day(dayOffset).getTime() + startHour * 3600000);
  return {
    type: "break",
    duration,
    subject: "Maths",
    date: new Date(start.getTime() + duration * 60000).toISOString(),
  };
}
const wdIndex = (date) => (date.getDay() + 6) % 7; // Mon = 0 … Sun = 6

// -------------------------------------------------------------- 1. module surface
section("1. module surface + guard constants");
ok("StatsMetrics is exported by the script", !!SM && typeof SM === "object");
for (const fn of ["focusSessions", "startOf", "dayKey", "formatMinutes", "streakOf", "heatmap", "peakLabel", "rhythm", "weeklyTotals", "momentum"]) {
  ok(`${fn}() is a function`, typeof SM[fn] === "function");
}
eq("PATTERN_WEEKS is 8 (heatmap + rhythm window)", SM.PATTERN_WEEKS, 8);
eq("MOMENTUM_DAYS is 7", SM.MOMENTUM_DAYS, 7);
eq("heatmap needs 5 sessions", SM.MIN_HEATMAP_SESSIONS, 5);
eq("heatmap needs 2 distinct days", SM.MIN_HEATMAP_DAYS, 2);
eq("rhythm needs 3 sessions", SM.MIN_RHYTHM_SESSIONS, 3);
eq("7 weekday labels, Mon-first", SM.WEEKDAYS.join(","), "Mon,Tue,Wed,Thu,Fri,Sat,Sun");
eq("5 session-length buckets", SM.BUCKETS.length, 5);

// ------------------------------------------------------------- 2. format + streak
section("2. formatMinutes + streakOf");
eq("0 min", SM.formatMinutes(0), "0 min");
eq("45 min", SM.formatMinutes(45), "45 min");
eq("59 min stays minutes", SM.formatMinutes(59), "59 min");
eq("60 min becomes 1h", SM.formatMinutes(60), "1h");
eq("95 min → 1h 35m", SM.formatMinutes(95), "1h 35m");
eq("120 min → 2h (no trailing 0m)", SM.formatMinutes(120), "2h");
eq("negative input clamps to 0", SM.formatMinutes(-10), "0 min");
eq("undefined input clamps to 0", SM.formatMinutes(undefined), "0 min");

const streakDays = [focusAt(0, 10, 30), focusAt(-1, 10, 30), focusAt(-2, 10, 30)];
eq("3 consecutive days → streak 3", SM.streakOf(streakDays, NOW), 3);
eq("a gap stops the streak", SM.streakOf([focusAt(0, 10, 30), focusAt(-2, 10, 30)], NOW), 1);
eq("breaks do not count", SM.streakOf([breakAt(0, 10, 5), breakAt(-1, 10, 5)], NOW), 0);
eq("nothing today → 0 even with history", SM.streakOf([focusAt(-1, 10, 30)], NOW), 0);
eq("empty input → 0", SM.streakOf([], NOW), 0);

// ------------------------------------------------------------------- 3. heatmap
section("3. heatmap — cells, window, peak, guards");
const hmEmpty = SM.heatmap([], { now: NOW });
ok("empty input: hasEnough false", hmEmpty.hasEnough === false);
eq("empty input: no peak", hmEmpty.peak, null);
eq("empty input: peakLabel null", hmEmpty.peakLabel, null);
eq("empty input: sessionCount 0", hmEmpty.sessionCount, 0);
eq("grid is 7 × 24", `${hmEmpty.mins.length}x${hmEmpty.mins[0].length}`, "7x24");
ok("grid is zero-filled", hmEmpty.mins.every((row) => row.every((m) => m === 0)));

// a single session: cell placement comes from start = completion − duration
const one = [focusAt(0, 10, 30)];
const hmOne = SM.heatmap(one, { now: NOW });
const wd0 = wdIndex(day(0));
eq("session lands in its start hour", hmOne.mins[wd0][10], 30);
eq("neighbouring hours stay empty", hmOne.mins[wd0][11] + hmOne.mins[wd0][9], 0);
eq("startOf() reverses the completion stamp", SM.startOf(one[0]).getHours(), 10);
ok("1 session is below the heatmap floor", hmOne.hasEnough === false);

// floor is on sessions AND distinct days
const fourOverThreeDays = [focusAt(0, 9, 30), focusAt(-1, 9, 30), focusAt(-2, 9, 30), focusAt(-2, 16, 30)];
ok("4 sessions over 3 days: still below the floor", SM.heatmap(fourOverThreeDays, { now: NOW }).hasEnough === false);
const fiveOneDay = [9, 10, 11, 13, 14].map((h) => focusAt(0, h, 20));
const hmFiveOneDay = SM.heatmap(fiveOneDay, { now: NOW });
eq("5 sessions on one day: sessionCount 5", hmFiveOneDay.sessionCount, 5);
eq("5 sessions on one day: activeDays 1", hmFiveOneDay.activeDays, 1);
ok("5 sessions on ONE day is not enough (needs 2 days)", hmFiveOneDay.hasEnough === false);
const sixOverThree = [focusAt(0, 9, 30), focusAt(0, 16, 30), focusAt(-1, 9, 30), focusAt(-1, 16, 30), focusAt(-2, 9, 30), focusAt(-2, 16, 30)];
const hmSix = SM.heatmap(sixOverThree, { now: NOW });
ok("6 sessions over 3 days: enough", hmSix.hasEnough === true);
eq("6 sessions over 3 days: activeDays 3", hmSix.activeDays, 3);

// peak: per-day average, not a multi-week total
const peakSessions = [focusAt(0, 9, 30), focusAt(-7, 9, 45), focusAt(-14, 9, 30)];
const hmPeak = SM.heatmap(peakSessions, { now: NOW });
eq("peak cell totals its minutes", hmPeak.peak.mins, 105);
eq("peak cell counts its distinct days", hmPeak.peak.occurrences, 3);
near("peak perDay = mins / occurrences", hmPeak.peak.perDay, 35);
eq("peak label is a one-hour window", hmPeak.peakLabel, `${SM.WEEKDAYS[hmPeak.peak.wd]} 09:00–10:00`);
eq("peakLabel pads single digits", SM.peakLabel({ wd: 0, hour: 6 }), "Mon 06:00–07:00");
eq("peakLabel wraps midnight", SM.peakLabel({ wd: 0, hour: 23 }), "Mon 23:00–00:00");

// window: older than 8 weeks and future sessions are both excluded
const outside = [focusAt(-60, 9, 30), focusAt(-57, 9, 30), focusAt(0, 9, 30)];
const hmOutside = SM.heatmap(outside, { now: NOW });
eq("sessions older than the 8-week window are dropped", hmOutside.sessionCount, 1);
const future = [{ type: "focus", duration: 30, subject: "Maths", date: new Date(NOW.getTime() + 3600000).toISOString() }];
eq("future-stamped sessions are dropped", SM.heatmap(future, { now: NOW }).sessionCount, 0);
eq("weeks echoed back for the card label", hmSix.weeks, 8);

// ------------------------------------------------------------------- 4. rhythm
section("4. rhythm — buckets, median, coverage, guards");
const rhEmpty = SM.rhythm([], { now: NOW });
ok("empty input: hasEnough false", rhEmpty.hasEnough === false);
eq("empty input: median 0", rhEmpty.median, 0);
eq("empty input: coverage 0", rhEmpty.coverage, 0);
eq("bucket labels", rhEmpty.buckets.map((b) => b.label).join(","), "0–15,15–30,30–45,45–60,60+");

const boundary = [focusAt(0, 9, 14), focusAt(0, 10, 15), focusAt(0, 11, 29), focusAt(0, 12, 30), focusAt(0, 13, 59), focusAt(0, 14, 60)];
const rhBoundary = SM.rhythm(boundary, { now: NOW });
eq("14 min → bucket 0–15", rhBoundary.counts[0], 1);
eq("15 min → bucket 15–30 (lower bound inclusive)", rhBoundary.counts[1], 2);
eq("30 min → bucket 30–45", rhBoundary.counts[2], 1);
eq("59 min → bucket 45–60", rhBoundary.counts[3], 1);
eq("60 min → bucket 60+ (upper bound exclusive)", rhBoundary.counts[4], 1);
eq("counts sum to the session count", rhBoundary.counts.reduce((a, b) => a + b, 0), 6);
eq("max drives the bar heights", rhBoundary.max, 2);

const odd = SM.rhythm([focusAt(0, 9, 20), focusAt(0, 10, 30), focusAt(0, 11, 40)], { now: NOW });
eq("odd count median is the middle value", odd.median, 30);
const even = SM.rhythm([focusAt(0, 9, 10), focusAt(0, 10, 20), focusAt(0, 11, 30), focusAt(0, 12, 40)], { now: NOW });
eq("even count median averages the two middles", even.median, 25);
eq("2 sessions is below the rhythm floor", SM.rhythm([focusAt(0, 9, 20), focusAt(0, 10, 30)], { now: NOW }).hasEnough, false);
eq("3 sessions reaches the rhythm floor", odd.hasEnough, true);

const withBreaks = SM.rhythm([focusAt(0, 9, 30), focusAt(0, 11, 30), focusAt(0, 13, 30), breakAt(0, 9.5, 5), breakAt(0, 11.5, 10)], { now: NOW });
eq("break coverage counts breaks per focus session", withBreaks.coverage, 67);
near("average break duration", withBreaks.avgBreak, 7.5);
eq("break count echoed", withBreaks.breakCount, 2);
const capped = SM.rhythm([focusAt(0, 9, 30), breakAt(0, 9.5, 5), breakAt(0, 10, 5), breakAt(0, 10.5, 5)], { now: NOW });
eq("coverage is capped at 100%", capped.coverage, 100);
eq("breaks outside the window are ignored", SM.rhythm([focusAt(0, 9, 30), breakAt(-90, 9.5, 5)], { now: NOW }).breakCount, 0);

// ----------------------------------------------------------------- 5. momentum
section("5. momentum — composite, delta, weekly trend, guards");
const momEmpty = SM.momentum([], { now: NOW });
eq("empty input: score 0", momEmpty.score, 0);
eq("empty input: hasEnough false", momEmpty.hasEnough, false);
eq("empty input: activeDays 0", momEmpty.activeDays, 0);
eq("empty input: avgSession 0 (no NaN)", momEmpty.avgSession, 0);
eq("8 weekly totals returned", momEmpty.weeklyTotals.length, 8);
eq("targets are surfaced for the formula caption", `${momEmpty.targets.dailyMinutes}/${momEmpty.targets.sessionMinutes}`, "120/40");

// a perfect week: 120 min every day, sessions of 40 min → every term saturates
const perfect = [];
for (let d = 0; d < 7; d++) perfect.push(focusAt(-d, 9, 40), focusAt(-d, 11, 40), focusAt(-d, 14, 40));
const momPerfect = SM.momentum(perfect, { now: NOW });
eq("volume + active-days + length all saturated → 100", momPerfect.score, 100);
eq("7 active days", momPerfect.activeDays, 7);
eq("840 minutes this week", momPerfect.weekMinutes, 840);
eq("avg session 40 min", momPerfect.avgSession, 40);

// volume term alone: half the daily target, one day a week
const thin = [focusAt(0, 9, 60)];
const momThin = SM.momentum(thin, { now: NOW });
// volume is measured against the WEEKLY target (7 × 120 = 840 min), so a single
// 60-min day is 0.45·(60/840) + 0.30·(1/7) + 0.25·1 = 0.325 → 32
eq("one 60-min day → 32", momThin.score, 32);
near("volume term is a fraction of the weekly target", momThin.weekMinutes / (7 * 120), 60 / 840);

// delta compares two adjacent windows
const improving = [...perfect, focusAt(-7, 9, 20)];
const momImproving = SM.momentum(improving, { now: NOW });
ok("a weaker previous week gives a positive delta", momImproving.delta > 0, `delta ${momImproving.delta}`);
eq("previous week's minutes are separate", momImproving.prevWeekMinutes, 20);
const declining = [focusAt(-7, 9, 40), focusAt(-7, 11, 40), focusAt(-7, 14, 40)];
eq("a weaker current week gives a negative delta", SM.momentum(declining, { now: NOW }).delta < 0, true);

const ordered = [focusAt(-21, 9, 30), focusAt(0, 9, 30)];
const weeks = SM.weeklyTotals(ordered, { now: NOW, weeks: 8 });
eq("weeklyTotals: 8 entries", weeks.length, 8);
eq("weeklyTotals: oldest first (empty)", weeks[0], 0);
eq("weeklyTotals: newest last (this week)", weeks[7], 30);
eq("weeklyTotals: 3 weeks back carries its minutes", weeks[4], 30);
const bestOld = SM.momentum([focusAt(-21, 9, 120), focusAt(0, 9, 30)], { now: NOW });
eq("bestWeek finds the strongest week", bestOld.bestWeek.minutes, 120);
eq("bestWeek reports how long ago it was", bestOld.bestWeek.weeksAgo, 3);
eq("bestWeek is null with no sessions", momEmpty.bestWeek, null);

// ------------------------------------------------------- 6. degenerate input
section("6. degenerate input stays NaN-free");
const junk = [
  { type: "focus", duration: undefined, subject: null, date: new Date(NOW.getTime() - 3600000).toISOString() },
  { type: "focus", duration: 30, subject: "Maths", date: "not-a-date" },
  { type: "break", duration: 5, subject: "", date: new Date(NOW.getTime() - 1800000).toISOString() },
  null,
];
let threw = null;
try {
  const hm = SM.heatmap(junk, { now: NOW });
  const rh = SM.rhythm(junk, { now: NOW });
  const mom = SM.momentum(junk, { now: NOW });
  const nums = [...hm.mins.flat(), rh.median, rh.coverage, rh.avgBreak, mom.score, mom.delta, mom.avgSession, ...mom.weeklyTotals];
  ok("no NaN in any metric", nums.every((n) => Number.isFinite(n)), nums.filter((n) => !Number.isFinite(n)).join(","));
  eq("an unparseable date is excluded from the window", hm.sessionCount, 1);
  eq("a null session is skipped", SM.focusSessions(junk).length, 2);
} catch (error) {
  threw = error;
}
ok("degenerate input does not throw", threw === null, threw && threw.message);

// ------------------------------------------------- 7. pill-driven window length
section("7. range options — the cards follow the active date pill");
// "Today": pinned to local midnight, one-day window, guarded by relaxed floors.
const todayFrom = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const todayOpts = { now: NOW, from: todayFrom, minDays: 1, minSessions: 2 };
const todaySessions = [focusAt(0, 9, 30), focusAt(0, 11, 30), focusAt(-1, 9, 30)];
const hmToday = SM.heatmap(todaySessions, todayOpts);
eq("today window drops yesterday's session", hmToday.sessionCount, 2);
near("today window is the elapsed part of one day", hmToday.weeks, 15 / 168);
eq("today window can clear the relaxed floors", hmToday.hasEnough, true);
eq("the relaxed floors are reported for the empty-state copy", `${hmToday.minSessions}/${hmToday.minDays}`, "2/1");
const hmTodayThin = SM.heatmap([focusAt(0, 9, 30)], todayOpts);
eq("a single session is still below today's floor", hmTodayThin.hasEnough, false);
const rhToday = SM.rhythm(todaySessions, { ...todayOpts, minSessions: 2 });
eq("rhythm honours the same one-day window", rhToday.sessionCount, 2);
eq("rhythm honours an overridden session floor", rhToday.hasEnough, true);

// "This Week" / "This Month" are trailing windows of 7 and 30 days.
const spread = [
  focusAt(0, 9, 30),
  focusAt(-3, 9, 30),
  focusAt(-10, 9, 60),
  focusAt(-40, 9, 90),
  focusAt(-200, 9, 90),
];
const hmWeek = SM.heatmap(spread, { now: NOW, days: 7 });
eq("week window keeps only the last 7 days", hmWeek.sessionCount, 2);
const hmMonth = SM.heatmap(spread, { now: NOW, days: 30 });
eq("month window keeps the last 30 days", hmMonth.sessionCount, 3);
const rhMonth = SM.rhythm(spread, { now: NOW, days: 30 });
eq("rhythm follows the month window too", rhMonth.sessionCount, 3);
eq("rhythm's bucket counts add up to the window", rhMonth.counts.reduce((a, b) => a + b, 0), 3);
const oldest = new Date(spread[spread.length - 1].date);
// The window is open at the start, so "all time" pins the boundary a
// millisecond before the oldest session (which is how timer.js builds it).
const hmAll = SM.heatmap(spread, { now: NOW, from: new Date(oldest.getTime() - 1) });
eq("an all-time from reaches every session, oldest included", hmAll.sessionCount, 5);
eq("pinning from exactly on a session excludes it (open start)", SM.heatmap(spread, { now: NOW, from: oldest }).sessionCount, 4);

// Momentum takes the same window length and tiles its trend into equal buckets.
const momDay = SM.momentum(spread, { now: NOW, days: 1, bucketDays: 1, buckets: 8 });
eq("day-long momentum window reports 1 active day", momDay.days, 1);
eq("day-long window counts only today's minutes", momDay.weekMinutes, 30);
eq("day-long trend draws 8 daily buckets", momDay.trend.length, 8);
eq("day-long trend's newest bucket is today", momDay.trend[7], 30);
eq("bucket length is surfaced for the axis copy", momDay.bucketDays, 1);
const momMonth = SM.momentum(spread, { now: NOW, days: 30, bucketDays: 30, buckets: 3 });
eq("month-long window sums the last 30 days", momMonth.weekMinutes, 120);
eq("month trend draws 3 buckets", momMonth.trend.length, 3);
eq("month trend's oldest bucket is the empty 30 days before", momMonth.trend[0], 0);
const momPinned = SM.momentum(spread, { now: NOW, from: todayFrom, scoringDays: 1 });
eq("a pinned window rounds to whole days", momPinned.days, 1);
eq("a pinned window's previous window excludes a session on its boundary", momPinned.prevWeekMinutes, 0);
eq("the session at the boundary sits in the current window", momPinned.weekMinutes, 30);
// A window pinned to a real instant is not a whole number of days back, so the
// minutes must come from the pinned start rather than from a rounded day count.
const momSpan = SM.momentum(spread, {
  now: NOW,
  from: new Date(new Date(spread[4].date).getTime() - 1),
  scoringDays: 30,
});
eq("a pinned window keeps the oldest session inside it", momSpan.weekMinutes, 300);
// Rounded UP, never down: a 27.4-day window touches 28 calendar days, so a
// down-round would let active days exceed the window they are divided by.
ok("a pinned window's day count rounds up, never below the span", momSpan.days >= 201, String(momSpan.days));
ok(
  "active days can never exceed a pinned window's day count",
  momSpan.activeDays <= momSpan.days,
  `${momSpan.activeDays}/${momSpan.days}`,
);
const momPinnedYesterday = SM.momentum([focusAt(0, 9, 30), focusAt(-1, 9, 45)], { now: NOW, from: todayFrom, scoringDays: 1 });
eq("a pinned window compares against the day before", momPinnedYesterday.prevWeekMinutes, 45);
const momAll = SM.momentum(spread, { now: NOW, from: new Date(spread[spread.length - 1].date), scoringDays: 30 });
ok("all-time window spans the whole history", momAll.days >= 199, String(momAll.days));
eq("all-time window has no earlier period, so no delta is claimed", momAll.hasPrevious, false);
ok("a normal 7-day window does claim a previous period", SM.momentum(spread, { now: NOW }).hasPrevious, true);
const momAllFrom = new Date(spread[4].date);
eq("the trend bucket defaults to the window length", SM.momentum(spread, { now: NOW, from: momAllFrom }).bucketDays, 201);
eq("an explicit bucket size wins (what the modal passes for All Time)", SM.momentum(spread, { now: NOW, from: momAllFrom, bucketDays: 7 }).bucketDays, 7);
eq("weeklyTotals is still the 7-day default", SM.weeklyTotals(ordered, { now: NOW }).length, 8);

// ------------------------------------------------------------------- summary
console.log(`\n${failures.length ? "RED" : "ALL GREEN"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
