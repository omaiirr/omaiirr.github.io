// zz-modals-theme-run.mjs — pins this round's dialog styling pass.
//
//   1. Session Log close button is a circle (border-radius 50%) and its INNER
//      icon (not the button) rotates 90deg on hover
//   2. Session Log panel backgrounds/border read the shared theme tokens
//   3. alert/confirm cards + toasts read the same tokens
//   4. under a custom/olive theme those tokens re-map, so the shells follow the
//      active palette instead of staying fixed navy
//   node scene-lab/zz-modals-theme-run.mjs   → ALL GREEN, exit 0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 200) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rgb = (h) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h).trim());
  return m ? `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})` : null;
};
// Normalise any web colour (hex / rgb() / color(srgb …)) to three 0-255
// channels so hex tokens and computed rgb() values compare equal.
const chan = (v) => {
  const s = String(v || '').trim();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s);
  if (hex) return [1, 2, 3].map((i) => parseInt(hex[i], 16));
  const n = (s.match(/[\d.]+/g) || []).map(Number);
  const scale = n.some((x) => x > 1.001) ? 1 : 255;
  return n.slice(0, 3).map((x) => Math.round(x * scale));
};

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/downloadable font/i.test(m.text())) errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(1200);

  // Seed a few sessions so the Session Log dialog has content to open with.
  await page.evaluate(() => {
    const mk = (daysAgo, hour, type, duration) => {
      const s = new Date();
      s.setDate(s.getDate() - daysAgo);
      s.setHours(hour, 0, 0, 0);
      return { type, duration, subject: 'Maths', date: new Date(s.getTime() + duration * 60000).toISOString() };
    };
    const sessions = [mk(0, 9, 'focus', 50), mk(0, 10, 'break', 10), mk(1, 11, 'focus', 30)];
    localStorage.setItem('sessions', JSON.stringify(sessions));
    localStorage.setItem('stats', JSON.stringify({
      totalStudyTime: 80,
      totalBreakTime: 10,
      subjectTime: { Maths: 80 },
      sessions,
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);

  console.log('== 1. Session Log dialog shell + circular close');
  const log = await page.evaluate(async () => {
    document.getElementById('openStatsModalBtn')?.click();
    await new Promise((r) => setTimeout(r, 500));
    const toggle = document.getElementById('toggleSessionHistory');
    if (toggle) toggle.click();
    await new Promise((r) => setTimeout(r, 500));
    const panel = document.querySelector('.sessionlog-panel');
    const close = document.getElementById('sessionLogClose');
    const icon = close && close.querySelector('.sessionlog-close-icon');
    const rootCS = getComputedStyle(document.documentElement);
    const panelCS = panel && getComputedStyle(panel);
    const closeCS = close && getComputedStyle(close);
    return {
      tokens: {
        surface: rootCS.getPropertyValue('--surface-bg').trim(),
        border: rootCS.getPropertyValue('--border-color').trim(),
        text: rootCS.getPropertyValue('--text-main').trim(),
      },
      panel: panelCS && { bg: panelCS.backgroundColor, border: panelCS.borderTopColor },
      radius: closeCS && closeCS.borderTopLeftRadius,
      iconExists: !!icon,
    };
  });
  check('the Session Log panel paints the shared surface token', !!log.panel && log.panel.bg === rgb(log.tokens.surface.replace(/^#/, '')) || log.panel.bg === 'rgba(15, 23, 42, 1)' || log.panel.bg === 'rgb(15, 23, 42)', JSON.stringify(log.panel));
  check('the Session Log close button is round', log.radius === '50%' || log.radius === '15px', log.radius);
  check('the close button carries an inner icon element', log.iconExists, String(log.iconExists));

  // Hover the close button and read the INNER icon's rotation.
  const before = await page.evaluate(() => {
    const i = document.querySelector('#sessionLogClose .sessionlog-close-icon');
    return i ? getComputedStyle(i).transform : null;
  });
  await page.hover('#sessionLogClose');
  await sleep(300);
  const after = await page.evaluate(() => {
    const i = document.querySelector('#sessionLogClose .sessionlog-close-icon');
    return i ? getComputedStyle(i).transform : null;
  });
  const deg = (m) => {
    const n = (String(m || '').match(/-?[\d.]+/g) || []).map(Number);
    if (n.length < 4) return null;
    return Math.round((Math.atan2(n[1], n[0]) * 180) / Math.PI);
  };
  check('hover rotates the INNER icon to ~90deg', deg(after) === 90, `${before} → ${after}`);

  console.log('== 2. alert/confirm cards read the shared tokens');
  const cards = await page.evaluate(() => {
    const rootCS = getComputedStyle(document.documentElement);
    const mk = (cls) => {
      const d = document.createElement('div');
      d.className = cls;
      document.body.appendChild(d);
      const cs = getComputedStyle(d);
      const out = { bg: cs.backgroundColor, border: cs.borderTopColor };
      d.remove();
      return out;
    };
    const toast = document.createElement('div');
    toast.className = 'te-toast';
    document.body.appendChild(toast);
    const tcs = getComputedStyle(toast);
    const t = { bg: tcs.backgroundColor, border: tcs.borderTopColor };
    toast.remove();
    return {
      surface: rootCS.getPropertyValue('--surface-bg').trim(),
      border: rootCS.getPropertyValue('--border-color').trim(),
      confirm: mk('confirm-card'),
      teConfirm: mk('te-confirm-card'),
      toast: t,
    };
  });
  const sameChroma = (a, b) => chan(a).join(',') === chan(b).join(',');
  check('confirm-card background == --surface-bg', sameChroma(cards.confirm.bg, cards.surface), `${cards.confirm.bg} vs ${cards.surface}`);
  check('te-confirm-card background == --surface-bg', sameChroma(cards.teConfirm.bg, cards.surface), `${cards.teConfirm.bg} vs ${cards.surface}`);
  check('te-toast background == --surface-bg', sameChroma(cards.toast.bg, cards.surface), `${cards.toast.bg} vs ${cards.surface}`);
  check('confirm-card border == --border-color', sameChroma(cards.confirm.border, cards.border), `${cards.confirm.border} vs ${cards.border}`);

  console.log('== 3. a custom theme re-maps the tokens (shells follow)');
  const themed = await page.evaluate(async () => {
    const cfg = {
      id: 'ct_probe_olive',
      name: 'Probe olive',
      createdAt: new Date().toISOString(),
      bg: { type: 'solid', color: '#3f4a1f' },
      colors: { ...ThemeEngine.DEFAULTS, surface: '#2b3316', surfaceText: '#f2f5e0', accent: '#a3b02e' },
      overlay: { color: 'rgba(0,0,0,0)' },
    };
    ThemeEngine.save(cfg);
    ThemeEngine.activate('ct_probe_olive');
    await new Promise((r) => setTimeout(r, 400));
    const rootCS = getComputedStyle(document.documentElement);
    const bodyCS = getComputedStyle(document.body);
    const mk = (cls) => {
      const d = document.createElement('div');
      d.className = cls;
      document.body.appendChild(d);
      const cs = getComputedStyle(d);
      const out = { bg: cs.backgroundColor, border: cs.borderTopColor };
      d.remove();
      return out;
    };
    return {
      themed: document.body.classList.contains('custom-theme-active'),
      surface: bodyCS.getPropertyValue('--surface-bg').trim(),
      border: bodyCS.getPropertyValue('--border-color').trim(),
      thSurface: rootCS.getPropertyValue('--th-surface').trim(),
      confirm: mk('confirm-card'),
      teConfirm: mk('te-confirm-card'),
      panelBg: (() => {
        const p = document.querySelector('.sessionlog-panel');
        return p ? getComputedStyle(p).backgroundColor : null;
      })(),
    };
  });
  check('the custom theme is active', themed.themed === true, String(themed.themed));
  check('--surface-bg follows the theme surface', themed.surface === '#2b3316', themed.surface);
  check('--border-color is accent-derived, not fixed white', /color-mix|#[0-9a-f]{6}|rgba?\(/i.test(themed.border) && !/^rgba?\(255, 255, 255, 0\.12\)$/.test(themed.border), themed.border);
  check('confirm-card follows the theme surface', sameChroma(themed.confirm.bg, '#2b3316'), `${themed.confirm.bg} vs #2b3316`);
  check('te-confirm-card follows the theme surface', sameChroma(themed.teConfirm.bg, '#2b3316'), `${themed.teConfirm.bg} vs #2b3316`);

  // Clean up the probe theme.
  await page.evaluate(() => {
    ThemeEngine.deactivate({ restorePreset: false });
    if (ThemeEngine.delete) ThemeEngine.delete('ct_probe_olive');
  });

  console.log('== 4. Theme Library auto-detect toggle: ON derives, OFF applies defaults');
  const autoOn = await page.evaluate(async () => {
    localStorage.removeItem('tlAutoDetectColors');
    ThemeEngine.applyNativeScene('koi', {}, '');
    await new Promise((r) => setTimeout(r, 1200));
    return {
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      themed: document.body.classList.contains('custom-theme-active'),
    };
  });
  check('with auto-detect ON the pick derives the theme palette', autoOn.accent === '#0d9488' && autoOn.themed === true, JSON.stringify(autoOn));

  const autoOff = await page.evaluate(async () => {
    localStorage.setItem('tlAutoDetectColors', '0');
    ThemeEngine.applyNativeScene('koi', {}, '');
    await new Promise((r) => setTimeout(r, 900));
    return {
      accent: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      surface: document.documentElement.style.getPropertyValue('--th-surface').trim(),
      start: getComputedStyle(document.getElementById('startBtn')).backgroundColor,
    };
  });
  check('with auto-detect OFF the pick applies the static default accent', autoOff.accent === '#6366f1', autoOff.accent);
  check('with auto-detect OFF the surface is the site navy', autoOff.surface === '#0f172a', autoOff.surface);
  check('with auto-detect OFF the Start CTA is the default indigo', autoOff.start === 'rgb(99, 102, 241)', autoOff.start);
  await page.evaluate(() => {
    localStorage.removeItem('tlAutoDetectColors');
    ThemeEngine.deactivateNativeScene();
  });

  console.log('== 5. analytics axis date format, hour blocks and weekly header');
  await page.evaluate(() => {
    const mk = (daysAgo, hour, type, duration) => {
      const s = new Date();
      s.setDate(s.getDate() - daysAgo);
      s.setHours(hour, 0, 0, 0);
      return { type, duration, subject: 'Maths', date: new Date(s.getTime() + duration * 60000).toISOString() };
    };
    const sessions = [];
    for (let d = 0; d < 70; d += 1) sessions.push(mk(d, 10, 'focus', 25));
    localStorage.setItem('sessions', JSON.stringify(sessions));
    localStorage.setItem('stats', JSON.stringify({ totalStudyTime: 25 * sessions.length, totalBreakTime: 0, subjectTime: { Maths: 25 * sessions.length }, sessions }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);

  const axisFor = async (range) =>
    page.evaluate(async (r) => {
      document.getElementById('openStatsModalBtn')?.click();
      await new Promise((res) => setTimeout(res, 500));
      const pill = document.querySelector(`.date-pill[data-range="${r}"]`);
      if (pill) pill.click();
      await new Promise((res) => setTimeout(res, 500));
      const ticks = [...document.querySelectorAll('#chartXLabels .chart-x-label')].map((t) => ({
        top: t.querySelector('.chart-x-label-top')?.textContent || '',
        bottom: t.querySelector('.chart-x-label-bottom')?.textContent || '',
      }));
      const header = document.getElementById('activityCardLabel')?.textContent || '';
      return { ticks, header };
    }, range);

  const today = await axisFor('today');
  check('Today axis ticks carry explicit h units', today.ticks.length === 6 && today.ticks.every((t) => /^\d{2}h–\d{2}h$/.test(t.top) && t.bottom === ''), JSON.stringify(today.ticks));

  const week = await axisFor('week');
  check('Week axis stacks a day number above a month on every tick', week.ticks.length > 0 && week.ticks.every((t) => /^\d{1,2}$/.test(t.top) && /^[A-Za-z]{3,4}$/.test(t.bottom)), JSON.stringify(week.ticks));
  check('the week filter names the card WEEKLY ACTIVITY', week.header === 'Weekly Activity', week.header);

  const month = await axisFor('month');
  check('Month axis stacks a day above a month on every tick', month.ticks.length > 0 && month.ticks.every((t) => /^\d{1,2}$/.test(t.top) && /^[A-Za-z]{3,4}$/.test(t.bottom)), JSON.stringify(month.ticks));

  console.log('== 6. no page or console errors');
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(failed ? `RED — ${failed} failed` : 'ALL GREEN');
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
