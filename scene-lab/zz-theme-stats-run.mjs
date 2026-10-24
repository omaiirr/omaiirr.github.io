// zz-theme-stats-run.mjs — theme-library palette + analytics polish battery.
//
// Pins this round's changes on the REAL app:
//   1. picking a preset in the Theme Library derives and applies its palette
//      (colour token, or a live canvas read for the scenes that have none)
//   2. switching the preset off restores the static palette
//   3. a fresh custom theme opens on the navy surface, not black, and still
//      auto-detects its colours
//   4. the four dialog eyebrows all read as the same bright blue
//   5. the compact statistics rows carry their units and no stray label
//   6. the Daily Activity plot fills its card
//   7. "Show all (N)" opens the Session Log History dialog on the app's shell
//   node scene-lab/zz-theme-stats-run.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 200) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const focus = (daysAgo, hour, duration, subject = 'Maths') => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, 0, 0, 0);
  return { type: 'focus', duration, subject, date: new Date(start.getTime() + duration * 60000).toISOString() };
};
const brk = (daysAgo, hour, duration) => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, 0, 0, 0);
  return { type: 'break', duration, subject: 'Maths', date: new Date(start.getTime() + duration * 60000).toISOString() };
};
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

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text()) && !/thumbnail failed/i.test(m.text()))
      errors.push(m.text());
  });
  const boot = async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('timerHasVisited', 'true');
      localStorage.setItem('statisticsEnabled', 'true');
      const n = document.getElementById('updateNoticePopup');
      if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1100);
  };
  const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

  await boot();

  console.log('== 1. a Theme Library pick derives and applies its palette');
  const koi = await page.evaluate(async () => {
    ThemeEngine.openThemeLibrary();
    await new Promise((r) => setTimeout(r, 700));
    document.querySelector('#tlGrid .te-scene-card[data-scene="koi"]')?.click();
    await new Promise((r) => setTimeout(r, 900));
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      logo: document.documentElement.style.getPropertyValue('--th-logo').trim(),
      themed: document.body.classList.contains('custom-theme-active'),
      scene: document.body.classList.contains('scene-library-active'),
      start: cs('#startBtn', 'backgroundColor'),
      pill: cs('.mode-btn.active', 'backgroundColor'),
      subjectBorder: cs('#subjectSelector select.form-input', 'borderColor'),
    };
  });
  check('the preset applies natively', koi.scene === true, String(koi.scene));
  check('a derived accent reaches the live CSS variable', /^#[0-9a-f]{6}$/i.test(koi.accent) && koi.accent !== '#6366f1', koi.accent);
  check('the themed chrome turns on for the preset', koi.themed === true, String(koi.themed));
  check('Start wears the derived accent', koi.start === rgb(koi.accent), `${koi.start} vs ${koi.accent}`);
  check('the active mode pill wears it too', koi.pill === rgb(koi.accent), String(koi.pill));
  check('the logo accent follows', koi.logo === koi.accent, koi.logo);
  // Firefox serializes color-mix() as color(srgb …): read the channels, not the
  // syntax, and require the accent hue (koi's #f97316 → red-dominant).
  const chan = (v) => {
    const n = (String(v || '').match(/[\d.]+/g) || []).map(Number);
    const scale = n.some((x) => x > 1.001) ? 1 : 255;
    return n.slice(0, 3).map((x) => Math.round(x * scale));
  };
  // Hue-agnostic: the border must be tinted toward the derived accent (koi is
  // #0d9488 teal, so green/blue dominate) and never a neutral white/grey.
  const subj = chan(koi.subjectBorder);
  const accentRgb = chan(koi.accent);
  const dom = (c) => c.indexOf(Math.max(...c));
  const subjSpread = subj.length === 3 ? Math.max(...subj) - Math.min(...subj) : 0;
  check(
    'the subject dropdown is accent-tinted, not neutral white',
    subj.length === 3 && subjSpread > 20 && dom(subj) === dom(accentRgb),
    `${koi.subjectBorder} → ${JSON.stringify(subj)} vs accent ${JSON.stringify(accentRgb)}`,
  );

  const snow = await page.evaluate(async () => {
    document.querySelector('#tlGrid .te-scene-card[data-scene="snow"]')?.click();
    await new Promise((r) => setTimeout(r, 1500));
    const start = document.getElementById('startBtn');
    return {
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      start: start ? getComputedStyle(start).backgroundColor : null,
      canvasLive: (() => {
        const c = document.getElementById('bgCanvas');
        return !!c && c.style.display !== 'none' && c.width > 0;
      })(),
    };
  });
  check(
    'a scene with no colour token still gets a FRESH palette (live canvas read)',
    /^#[0-9a-f]{6}$/i.test(snow.accent) && snow.accent !== '#6366f1' && snow.accent !== koi.accent,
    `${snow.accent} (was ${koi.accent}; canvas live: ${snow.canvasLive})`,
  );
  check('Start follows that derived accent', snow.start === rgb(snow.accent), `${snow.start} vs ${snow.accent}`);

  const cleared = await page.evaluate(async () => {
    ThemeEngine.deactivateNativeScene();
    await new Promise((r) => setTimeout(r, 300));
    return {
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      themed: document.body.classList.contains('custom-theme-active'),
      start: getComputedStyle(document.getElementById('startBtn')).backgroundColor,
    };
  });
  check('switching the preset off drops the derived palette', cleared.accent === '' && cleared.themed === false, JSON.stringify(cleared));
  check('and the static CTA colour comes back', cleared.start === 'rgb(99, 102, 241)', String(cleared.start));

  console.log('== 2. a new custom theme starts on the navy surface');
  const fresh = await page.evaluate(async () => {
    ThemeEngine.deactivate();
    ThemeEngine.openEditor(null);
    await new Promise((r) => setTimeout(r, 500));
    const surface = document.getElementById('teColSurface');
    const swatch = document.querySelector('.te-color-picker[data-for="teColSurface"] .te-color-picker-swatch');
    return {
      engineDefault: ThemeEngine.DEFAULTS.surface,
      input: surface ? surface.value : null,
      swatch: swatch ? getComputedStyle(swatch).backgroundColor : null,
    };
  });
  check('the engine default surface is the site navy', fresh.engineDefault === '#0f172a', fresh.engineDefault);
  check('the builder opens on #0f172a, not black', fresh.input === '#0f172a', String(fresh.input));
  check('and its swatch paints that navy', fresh.swatch === 'rgb(15, 23, 42)', String(fresh.swatch));

  const saved = await page.evaluate(async () => {
    const type = document.getElementById('teBgType');
    type.value = 'solid';
    type.dispatchEvent(new Event('change', { bubbles: true }));
    const color = document.getElementById('teBgColor');
    color.value = '#d94f2b';
    color.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById('teSaveBtn').click();
    await new Promise((r) => setTimeout(r, 1500));
    // load() hands back the active theme CONFIG, not its id.
    const cfg = ThemeEngine.load();
    return cfg
      ? {
          surface: cfg.colors.surface,
          detected: cfg.colorsAutoDetected === true,
          accent: cfg.colors.accent,
          themed: document.body.classList.contains('custom-theme-active'),
        }
      : null;
  });
  check(
    'the saved theme carries a real surface, never pitch black',
    !!saved && /^#[0-9a-f]{6}$/i.test(saved.surface) && saved.surface !== '#000000',
    JSON.stringify(saved),
  );
  check('an untouched new theme still auto-detects its colours', !!saved && saved.detected === true, String(saved && saved.detected));
  check('and the detected accent is applied', !!saved && saved.accent !== '#6366f1' && saved.themed === true, JSON.stringify(saved));

  console.log('== 3. the four dialog eyebrows share one blue');
  const eyebrows = await page.evaluate(async () => {
    ThemeEngine.deactivate();
    const read = async (open, sel) => {
      document.querySelectorAll('.modal.open, .popup.open').forEach((m) => m.classList.remove('open'));
      await open();
      await new Promise((r) => setTimeout(r, 600));
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).color : null;
    };
    const analytics = await read(async () => document.getElementById('openStatsModalBtn')?.click(), '#statisticsModal .analytics-eyebrow');
    const settings = await read(async () => document.getElementById('openAdvancedSettingsBtn')?.click(), '#advancedSettingsModal .advanced-settings-eyebrow');
    const builder = await read(async () => ThemeEngine.openEditor(null), '#themeEditorModal .te-eyebrow');
    const planner = await read(async () => document.getElementById('plannerBtn')?.click(), '#plannerModal .planner-label');
    return { analytics, settings, builder, planner };
  });
  check('OVERVIEW matches SETTINGS', eyebrows.analytics === eyebrows.settings, `${eyebrows.analytics} vs ${eyebrows.settings}`);
  check('OVERVIEW matches THEME BUILDER', eyebrows.analytics === eyebrows.builder, `${eyebrows.analytics} vs ${eyebrows.builder}`);
  check('OVERVIEW matches PLANNER', eyebrows.analytics === eyebrows.planner, `${eyebrows.analytics} vs ${eyebrows.planner}`);
  check('and it is the bright blue, not the old grey', eyebrows.analytics === 'rgb(165, 180, 252)', String(eyebrows.analytics));

  // ── the analytics surfaces, with a seeded profile ────────────────
  const sessions = [];
  for (let d = 0; d < 3; d++) {
    sessions.push(focus(d, 9, 40, 'Maths'), focus(d, 11, 40, 'Physics'));
    sessions.push(brk(d, 10, 5));
  }
  await page.evaluate(
    (s) => {
      localStorage.clear();
      localStorage.setItem('timerHasVisited', 'true');
      localStorage.setItem('statisticsEnabled', 'true');
      localStorage.setItem('timerStats', JSON.stringify(s));
    },
    statsFor(sessions),
  );
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);

  console.log('== 4. the compact statistics rows carry their units');
  const compact = await page.evaluate(async () => {
    document.getElementById('settingsBtn')?.click();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    const modal = document.getElementById('themeModal');
    return {
      study: document.getElementById('totalStudyTime')?.textContent.trim(),
      brk: document.getElementById('totalBreakTime')?.textContent.trim(),
      sessions: document.getElementById('totalSessions')?.textContent.trim(),
      completedLeft: [...modal.querySelectorAll('span')].filter((s) => s.textContent.trim() === 'completed').length,
    };
  });
  check('study time reads as a duration with its unit', /\d+\s*(h|min)/.test(compact.study || ''), String(compact.study));
  check('break time too', /\d+\s*(h|min)/.test(compact.brk || ''), String(compact.brk));
  check('sessions count carries its own unit', /^\d+ sessions?$/.test(compact.sessions || ''), String(compact.sessions));
  check('the floating "completed" label is gone', compact.completedLeft === 0, String(compact.completedLeft));

  console.log('== 5. the Daily Activity plot fills its card');
  const chart = await page.evaluate(async () => {
    document.querySelectorAll('.modal.open, .popup.open').forEach((m) => m.classList.remove('open'));
    document.getElementById('openStatsModalBtn')?.click();
    await new Promise((r) => setTimeout(r, 900));
    const card = document.querySelector('.analytics-chart-card');
    const area = document.getElementById('activityChart');
    const bars = [...area.querySelectorAll('.chart-bar')];
    const tallest = bars.reduce((a, b) => Math.max(a, b.getBoundingClientRect().height), 0);
    const cs = getComputedStyle(card);
    const inner = card.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return {
      cardInner: Math.round(inner),
      area: Math.round(area.getBoundingClientRect().height),
      tallest: Math.round(tallest),
      bars: bars.length,
    };
  });
  check('the plot has real bars', chart.bars > 0, JSON.stringify(chart));
  check('the plot takes most of the card height', chart.area / chart.cardInner >= 0.7, `${chart.area} of ${chart.cardInner}`);
  check('the tallest bar fills ~70-100% of the plot', chart.tallest / chart.area >= 0.7 && chart.tallest / chart.area <= 1.02, `${chart.tallest} of ${chart.area}`);

  console.log('== 6. "Show all (N)" opens the Session Log History dialog');
  // Widen the pill to All Time first so the whole 9-session profile is in range
  // (the default Today pill only ever sees the 3 sessions logged today).
  await page.evaluate(async () => {
    document.querySelector('.date-pill[data-range="all"]').click();
    await new Promise((r) => setTimeout(r, 500));
  });
  const logModal = await page.evaluate(async () => {
    const btn = document.getElementById('toggleSessionHistory');
    const label = btn ? btn.textContent.trim() : null;
    const inlineRows = document.querySelectorAll('#sessionHistory .session-entry').length;
    btn?.click();
    await new Promise((r) => setTimeout(r, 600));
    const modal = document.getElementById('sessionLogModal');
    const panel = modal.querySelector('.sessionlog-panel');
    const cs = getComputedStyle(panel);
    const close = document.getElementById('sessionLogClose');
    const closeBox = close.getBoundingClientRect();
    const headerBox = modal.querySelector('.sessionlog-header').getBoundingClientRect();
    return {
      label,
      inlineRows,
      open: modal.classList.contains('open'),
      rows: modal.querySelectorAll('.sessionlog-list .session-entry').length,
      ariaHidden: modal.getAttribute('aria-hidden'),
      role: modal.getAttribute('role'),
      bg: cs.backgroundColor,
      radius: cs.borderRadius,
      eyebrow: getComputedStyle(modal.querySelector('.sessionlog-eyebrow')).color,
      summary: document.getElementById('sessionLogSummary')?.textContent.trim(),
      closeText: close.textContent.trim(),
      closeSize: [Math.round(closeBox.width), Math.round(closeBox.height)],
      closeInset: Math.round(headerBox.right - closeBox.right),
      scrollable: getComputedStyle(document.getElementById('sessionLogList')).overflowY,
    };
  });
  check('the button advertises the count', /^Show all \(\d+\)$/.test(logModal.label || ''), String(logModal.label));
  check('it opens the dialog', logModal.open === true && logModal.ariaHidden === 'false', JSON.stringify([logModal.open, logModal.ariaHidden]));
  check('the dialog is announced as one', logModal.role === 'dialog', String(logModal.role));
  check('every session for the range is listed', logModal.rows === 9, `${logModal.rows} rows (inline card shows ${logModal.inlineRows})`);
  check('the inline card stays at five', logModal.inlineRows === 5, String(logModal.inlineRows));
  check('the panel is the site navy surface', logModal.bg === 'rgb(15, 23, 42)', logModal.bg);
  check('the panel uses the 16px dialog radius', logModal.radius === '16px', logModal.radius);
  check('the eyebrow uses the shared header blue', logModal.eyebrow === 'rgb(165, 180, 252)', logModal.eyebrow);
  check('the ✕ close is the standard 30px control, inset at the header edge', logModal.closeText === '✕' && logModal.closeSize[0] === 30 && logModal.closeInset === 0, JSON.stringify(logModal.closeSize) + ' inset ' + logModal.closeInset);
  check('the list scrolls', logModal.scrollable === 'auto' || logModal.scrollable === 'scroll', String(logModal.scrollable));
  check('the summary names the range and the totals', /9 sessions · 6 focus · .+ · all time/i.test(logModal.summary || ''), String(logModal.summary));

  // Escape is driven as a REAL key press (page.keyboard), not a synthetic
  // dispatch — that is the path a user takes and the one the other batteries
  // use; Firefox does not route a hand-built KeyboardEvent to the app's
  // document listener the same way.
  const closes = {};
  closes.byButton = await page.evaluate(async () => {
    document.getElementById('sessionLogClose').click();
    await new Promise((r) => setTimeout(r, 300));
    return (
      !document.getElementById('sessionLogModal').classList.contains('open') &&
      document.getElementById('statisticsModal').classList.contains('open')
    );
  });
  closes.byBackdrop = await page.evaluate(async () => {
    document.getElementById('toggleSessionHistory').click();
    await new Promise((r) => setTimeout(r, 400));
    document.getElementById('sessionLogBackdrop').click();
    await new Promise((r) => setTimeout(r, 300));
    return !document.getElementById('sessionLogModal').classList.contains('open');
  });
  // The app closes the TOP-most layer, and a fresh localStorage can re-open the
  // update notice behind the analytics modal — clear the stack above the log
  // first so this measures the log's own Escape behavior.
  closes.stackCleared = await page.evaluate(async () => {
    document.getElementById('dismissUpdateNoticeBtn')?.click();
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById('toggleSessionHistory').click();
    await new Promise((r) => setTimeout(r, 400));
    return {
      notice: !!document.getElementById('updateNoticePopup')?.classList.contains('open'),
      log: document.getElementById('sessionLogModal').classList.contains('open'),
    };
  });
  await page.keyboard.press('Escape');
  await sleep(300);
  Object.assign(
    closes,
    await page.evaluate(() => ({
      byEscape: !document.getElementById('sessionLogModal').classList.contains('open'),
      analyticsStillOpen: document.getElementById('statisticsModal').classList.contains('open'),
    })),
  );
  await page.evaluate(async () => {
    document.getElementById('statisticsCloseBtn').click();
    await new Promise((r) => setTimeout(r, 300));
  });
  closes.analyticsClosed = await page.evaluate(
    () => !document.getElementById('statisticsModal').classList.contains('open'),
  );
  check('the log is the top-most layer when Escape is pressed', closes.stackCleared.notice === false && closes.stackCleared.log === true, JSON.stringify(closes.stackCleared));
  check('✕ closes the log and leaves analytics open', closes.byButton === true, JSON.stringify(closes));
  check('the backdrop closes it', closes.byBackdrop === true, String(closes.byBackdrop));
  check('Escape closes the log only (it is a sub-layer)', closes.byEscape === true && closes.analyticsStillOpen === true, JSON.stringify(closes));
  check('closing analytics still works', closes.analyticsClosed === true, String(closes.analyticsClosed));

  console.log('== 7. no page or console errors');
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
