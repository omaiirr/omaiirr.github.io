// Pure study math for the analytics modal.
const StatsMetrics = (() => {
  const DAY_MS = 864e5;

  const PATTERN_WEEKS = 8;

  const MOMENTUM_DAYS = 7;

  const MOMENTUM_BUCKETS = 8;

  const TARGET_DAILY_MINUTES = 120;
  const TARGET_SESSION_MINUTES = 40;

  const MIN_HEATMAP_SESSIONS = 5;
  const MIN_HEATMAP_DAYS = 2;
  const MIN_RHYTHM_SESSIONS = 3;

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const BUCKETS = [
    [0, 15],
    [15, 30],
    [30, 45],
    [45, 60],
    [60, Infinity],
  ];

  const isFocus = (s) => !!s && s.type === "focus";
  const focusSessions = (sessions) => (sessions || []).filter(isFocus);
  const dayKey = (d) => new Date(d).toDateString();

  function startOf(session) {
    const end = new Date(session.date);
    return new Date(end.getTime() - (session.duration || 0) * 60000);
  }

  function formatMinutes(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes || 0));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function streakOf(sessions, now) {
    const ref = now ? new Date(now) : new Date();
    const days = new Set(focusSessions(sessions).map((s) => dayKey(s.date)));
    let streak = 0;
    const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function patternWindow(sessions, options) {
    const opts = options || {};
    const weeks = opts.weeks || PATTERN_WEEKS;
    const now = opts.now ? new Date(opts.now) : new Date();

    const from = opts.from
      ? new Date(opts.from)
      : new Date(
          now.getTime() - (opts.days ? opts.days * DAY_MS : weeks * 7 * DAY_MS),
        );
    const focus = focusSessions(sessions).filter((s) => {
      const d = new Date(s.date);
      return d > from && d <= now;
    });
    return {
      weeks: (now - from) / (7 * DAY_MS),
      now,
      from,
      focus,
    };
  }

  function heatmap(sessions, options) {
    const opts = options || {};

    const minSessions =
      opts.minSessions === undefined ? MIN_HEATMAP_SESSIONS : opts.minSessions;
    const minDays =
      opts.minDays === undefined ? MIN_HEATMAP_DAYS : opts.minDays;
    const win = patternWindow(sessions, options);
    const mins = [];
    const days = [];
    for (let wd = 0; wd < 7; wd++) {
      mins.push(new Array(24).fill(0));
      days.push(Array.from({ length: 24 }, () => new Set()));
    }

    win.focus.forEach((s) => {
      const start = startOf(s);
      const wd = (start.getDay() + 6) % 7; 
      const hour = start.getHours();
      mins[wd][hour] += s.duration || 0;
      days[wd][hour].add(dayKey(s.date));
    });

    let peak = null;
    for (let wd = 0; wd < 7; wd++) {
      for (let hour = 0; hour < 24; hour++) {
        const m = mins[wd][hour];
        if (!m) continue;
        if (!peak || m > peak.mins) {
          peak = { wd, hour, mins: m, occurrences: days[wd][hour].size };
        }
      }
    }
    if (peak) peak.perDay = peak.mins / Math.max(1, peak.occurrences);

    const activeDays = new Set(win.focus.map((s) => dayKey(s.date))).size;
    return {
      weeks: win.weeks,
      mins,
      days,
      peak,
      peakLabel: peak ? peakLabel(peak) : null,
      sessionCount: win.focus.length,
      activeDays,
      hasEnough:
        win.focus.length >= minSessions && activeDays >= minDays,
      minSessions,
      minDays,
    };
  }

  function peakLabel(peak) {
    const h = peak.hour;
    return `${WEEKDAYS[peak.wd]} ${pad(h)}:00–${pad((h + 1) % 24)}:00`;
  }

  const pad = (n) => String(n).padStart(2, "0");

  function rhythm(sessions, options) {
    const win = patternWindow(sessions, options);
    const opts = options || {};
    const now = opts.now ? new Date(opts.now) : new Date();
    const from = new Date(now.getTime() - win.weeks * 7 * DAY_MS);

    const counts = BUCKETS.map(() => 0);
    const lengths = [];
    win.focus.forEach((s) => {
      lengths.push(s.duration || 0);
      for (let i = 0; i < BUCKETS.length; i++) {
        if ((s.duration || 0) >= BUCKETS[i][0] && (s.duration || 0) < BUCKETS[i][1]) {
          counts[i]++;
          break;
        }
      }
    });
    lengths.sort((a, b) => a - b);

    let median = 0;
    if (lengths.length) {
      const mid = Math.floor(lengths.length / 2);
      median =
        lengths.length % 2
          ? lengths[mid]
          : (lengths[mid - 1] + lengths[mid]) / 2;
    }

    const breaks = (sessions || []).filter((s) => {
      if (!s || s.type === "focus") return false;
      const d = new Date(s.date);
      return d > from && d <= now;
    });
    const minSessions =
      opts.minSessions === undefined ? MIN_RHYTHM_SESSIONS : opts.minSessions;
    const avgBreak = breaks.length
      ? breaks.reduce((a, s) => a + (s.duration || 0), 0) / breaks.length
      : 0;

    const coverage = win.focus.length
      ? Math.min(100, Math.round((breaks.length / win.focus.length) * 100))
      : 0;

    return {
      weeks: win.weeks,
      buckets: BUCKETS.map((b, i) => ({
        from: b[0],
        to: b[1],
        label: b[1] === Infinity ? "60+" : `${b[0]}–${b[1]}`,
        count: counts[i],
      })),
      counts,
      max: Math.max(...counts, 1),
      median,
      avgBreak,
      coverage,
      breakCount: breaks.length,
      sessionCount: win.focus.length,
      hasEnough: win.focus.length >= minSessions,
      minSessions,
    };
  }

  function trendBuckets(sessions, options) {
    const opts = options || {};
    const days = opts.days || MOMENTUM_DAYS;
    const buckets = opts.buckets || MOMENTUM_BUCKETS;
    const now = opts.now ? new Date(opts.now) : new Date();
    const focus = focusSessions(sessions);
    const out = [];
    for (let b = buckets - 1; b >= 0; b--) {
      const end = new Date(now.getTime() - b * days * DAY_MS);
      const start = new Date(end.getTime() - days * DAY_MS);
      out.push(
        focus
          .filter((s) => {
            const d = new Date(s.date);
            return d > start && d <= end;
          })
          .reduce((a, s) => a + (s.duration || 0), 0),
      );
    }
    return out;
  }

  function weeklyTotals(sessions, options) {
    const opts = options || {};
    return trendBuckets(sessions, {
      now: opts.now,
      days: 7,
      buckets: opts.weeks || PATTERN_WEEKS,
    });
  }

  function windowStats(focus, end, days, options) {
    const opts = options || {};

    const scoringDays = opts.scoringDays || days;
    const start =
      opts.start || new Date(end.getTime() - days * DAY_MS);
    const inWindow = focus.filter((s) => {
      const d = new Date(s.date);
      return d > start && d <= end;
    });
    const minutes = inWindow.reduce((a, s) => a + (s.duration || 0), 0);
    const activeDays = new Set(inWindow.map((s) => dayKey(s.date))).size;
    const avgSession = inWindow.length ? minutes / inWindow.length : 0;
    const volume = Math.min(1, minutes / (scoringDays * TARGET_DAILY_MINUTES));
    const active = Math.min(1, activeDays / scoringDays);
    const length = Math.min(1, avgSession / TARGET_SESSION_MINUTES);
    return {
      minutes,
      activeDays,
      avgSession,
      sessions: inWindow.length,
      score: Math.round(100 * (0.45 * volume + 0.3 * active + 0.25 * length)),
    };
  }

  function momentum(sessions, options) {
    const opts = options || {};
    const now = opts.now ? new Date(opts.now) : new Date();
    const focus = focusSessions(sessions);
    let days = opts.days || MOMENTUM_DAYS;
    let anchor = now;
    let span = null;
    if (opts.from) {
      anchor = new Date(opts.from);
      span = now - anchor;

      days = Math.max(1, Math.ceil(span / DAY_MS));
    }
    const sizing = { days, scoringDays: opts.scoringDays };
    const current = windowStats(focus, now, days, {
      ...sizing,
      start: opts.from ? anchor : undefined,
    });

    const previous = opts.from
      ? windowStats(focus, new Date(anchor.getTime() - 1), days, {
          ...sizing,
          start: new Date(anchor.getTime() - span),
        })
      : windowStats(focus, new Date(now.getTime() - days * DAY_MS), days, sizing);
    const bucketDays = opts.bucketDays || Math.max(1, Math.round(days));
    const buckets = trendBuckets(sessions, {
      now,
      days: bucketDays,
      buckets: opts.buckets || MOMENTUM_BUCKETS,
    });
    const bestMinutes = Math.max(...buckets, 0);
    const bestIndex = buckets.indexOf(bestMinutes);

    return {
      days,
      score: current.score,
      delta: current.score - previous.score,
      hasPrevious: previous.sessions > 0,
      weekMinutes: current.minutes,
      prevWeekMinutes: previous.minutes,
      avgPerDay: days ? current.minutes / days : 0,
      prevAvgPerDay: days ? previous.minutes / days : 0,
      activeDays: current.activeDays,
      avgSession: current.avgSession,
      sessionCount: current.sessions,
      trend: buckets,
      bucketDays,
      weeklyTotals: buckets,
      bestWeek: bestMinutes
        ? { minutes: bestMinutes, weeksAgo: buckets.length - 1 - bestIndex }
        : null,
      targets: {
        dailyMinutes: TARGET_DAILY_MINUTES,
        sessionMinutes: TARGET_SESSION_MINUTES,
      },
      hasEnough: current.sessions > 0,
    };
  }

  return {
    PATTERN_WEEKS,
    MOMENTUM_DAYS,
    MOMENTUM_BUCKETS,
    TARGET_DAILY_MINUTES,
    TARGET_SESSION_MINUTES,
    MIN_HEATMAP_SESSIONS,
    MIN_HEATMAP_DAYS,
    MIN_RHYTHM_SESSIONS,
    WEEKDAYS,
    BUCKETS,
    focusSessions,
    startOf,
    dayKey,
    formatMinutes,
    streakOf,
    heatmap,
    peakLabel,
    rhythm,
    weeklyTotals,
    trendBuckets,
    momentum,
  };
})();
