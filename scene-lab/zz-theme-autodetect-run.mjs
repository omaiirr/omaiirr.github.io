// zz-theme-autodetect-run.mjs — automatic palette detection battery.
//
// Pins the behaviour the CTAs depend on: a custom theme the user never
// colour-edited inherits the palette of its own background (solid / gradient /
// animated scene / live canvas frame), the detected palette is stored once, and
// colours the user DID choose are never overwritten.
//   node scene-lab/zz-theme-autodetect-run.mjs   → ALL GREEN, exit 0
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
    localStorage.clear();
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1200);

  // Palette of a background the user picked but never recoloured.
  const detect = (bg) => page.evaluate((b) => ThemeEngine.detectColorsFor(b), bg);

  console.log('== 1. every background type yields a palette');
  // The palette the rest of the file is pinned against (computed once, so a
  // legitimate change to the separation rule needs no magic numbers here).
  let detectedAccent = null;
  const toRgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  const lumaOf = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const solid = await detect({ type: 'solid', color: '#d94f2b' });
  check(
    'solid: the accent keeps the background hue',
    solid &&
      parseInt(solid.accent.slice(1, 3), 16) > parseInt(solid.accent.slice(5, 7), 16) + 40 &&
      parseInt(solid.accent.slice(1, 3), 16) > parseInt(solid.accent.slice(3, 5), 16),
    JSON.stringify(solid && solid.accent),
  );
  check(
    'solid: the accent separates from the background it is painted on',
    solid && Math.abs(lumaOf(solid.accent) - lumaOf('#d94f2b')) >= 40,
    JSON.stringify([solid && solid.accent, Math.round(lumaOf(solid && solid.accent)), Math.round(lumaOf('#d94f2b'))]),
  );
  check('solid: a surface is derived for the panels', /^#[0-9a-f]{6}$/i.test(solid.surface), solid.surface);
  check('solid: every palette key is present', ['accent', 'text', 'surface', 'surfaceText', 'timerDisplay', 'logo', 'focusMode'].every((k) => typeof solid[k] === 'string' && /^#/.test(solid[k])), Object.keys(solid).join(','));

  detectedAccent = solid.accent;

  const pale = await detect({ type: 'solid', color: '#f2f2f2' });
  check('a light background flips the text colour', pale && pale.text === '#111111', JSON.stringify(pale));

  const grad = await detect({ type: 'gradient', gradStops: [{ color: '#102030', pos: 0 }, { color: '#50a0f0', pos: 100 }] });
  check('gradient: accent blends both stops', grad && grad.accent !== '#102030' && grad.accent !== '#50a0f0', JSON.stringify(grad.accent));
  check('gradient: the accent separates from the gradient it sits on', grad && Math.abs(lumaOf(grad.accent) - lumaOf('#306090')) >= 40, String(grad && grad.accent));
  check('a dark background gives the logo the theme hue', solid.logo === solid.accent, solid.logo);
  check('a light background keeps the logo neutral', pale.logo === '#111111', pale.logo);

  const scene = await detect({ type: 'scene', sceneId: 'koi' });
  check('scene: accent comes from the scene colour token', scene && scene.accent === '#0d9488', JSON.stringify(scene));

  const sceneMoved = await detect({ type: 'scene', sceneId: 'koi', sceneOptions: { color: '#22d3ee' } });
  check('scene: a moved scene colour slider moves the accent', sceneMoved && sceneMoved.accent === '#22d3ee', sceneMoved && sceneMoved.accent);

  const sceneBg = await detect({ type: 'scene', sceneId: 'koi', sceneBgColor: '#0b0f19' });
  check('scene: the scene background becomes the surface', sceneBg && sceneBg.surface === '#0b0f19', sceneBg && sceneBg.surface);

  check('nothing sampleable resolves to null (no throw)', (await detect({ type: 'image' })) === null, 'image with no source');

  console.log('== 2. a live canvas frame can be pixel-read');
  const live = await page.evaluate(async () => {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return { skipped: 'no canvas' };
    // Paint a known dominant colour through the real scene runtime.
    const ctx = canvas.getContext('2d');
    canvas.style.display = 'block';
    canvas.width = 320;
    canvas.height = 200;
    ctx.fillStyle = '#c81e5b';
    ctx.fillRect(0, 0, 320, 200);
    return { sampled: ThemeEngine.sampleElementColors(canvas) };
  });
  check('a pixel read off a canvas returns a palette', !!(live.sampled && live.sampled.accent), JSON.stringify(live).slice(0, 120));
  check(
    'the sampled accent is the painted colour',
    live.sampled && live.sampled.accent.toLowerCase() === '#c81e5b',
    live.sampled && live.sampled.accent,
  );

  console.log('== 3. saving a theme with untouched colours detects automatically');
  const saved = await page.evaluate(async () => {
    const cfg = {
      id: 'ct_auto_solid',
      name: 'Auto solid',
      createdAt: new Date().toISOString(),
      bg: { type: 'solid', color: '#d94f2b' },
      colors: { ...ThemeEngine.DEFAULTS },
      overlay: { color: 'rgba(0,0,0,0)' },
    };
    ThemeEngine.save(cfg);
    const stored = ThemeEngine.get('ct_auto_solid');
    return { accentBefore: stored.colors.accent, isDefault: stored.colors.accent === ThemeEngine.DEFAULTS.accent };
  });
  check('the theme starts on the static default accent', saved.isDefault, saved.accentBefore);

  // Selecting it is what triggers detection (deferred, so the click never waits).
  const applied = await page.evaluate(async () => {
    ThemeEngine.activate('ct_auto_solid');
    await new Promise((r) => setTimeout(r, 700));
    const stored = ThemeEngine.get('ct_auto_solid');
    return {
      accent: stored.colors.accent,
      flagged: stored.colorsAutoDetected === true,
      cssAccent: getComputedStyle(document.documentElement).getPropertyValue('--th-accent').trim(),
      logged: document.documentElement.style.getPropertyValue('--th-accent').trim(),
      themed: document.body.classList.contains('custom-theme-active'),
    };
  });
  check('selection detects the background palette', applied.accent === detectedAccent, JSON.stringify(applied));
  check('the detection is recorded as done', applied.flagged === true, String(applied.flagged));
  check('the live CSS accent follows the detected colour', applied.logged === detectedAccent, applied.logged);
  check('themed chrome turns on for the derived palette', applied.themed === true, String(applied.themed));

  const startBtn = await page.evaluate(() => {
    const b = document.getElementById('startBtn');
    return b ? getComputedStyle(b).backgroundColor : null;
  });
  check('the Start CTA picks the detected accent up', startBtn === toRgb(detectedAccent), String(startBtn));

  // The whole CTA family, not just Start: active mode pill + the subject dropdown.
  const ctas = await page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    // Firefox serializes color-mix() as `color(srgb …)` — normalise to 0-255.
    const rgb = (v) => {
      if (!v) return null;
      const n = (v.match(/[\d.]+/g) || []).map(Number);
      const scale = n.some((x) => x > 1.001) ? 1 : 255;
      return n.slice(0, 3).map((x) => Math.round(x * scale));
    };
    return {
      pill: cs('.mode-btn.active', 'backgroundColor'),
      pillText: cs('.mode-btn.active', 'color'),
      subjectBg: cs('#subjectSelector select.form-input', 'backgroundColor'),
      subjectBorder: cs('#subjectSelector select.form-input', 'borderColor'),
      subjectRgb: rgb(cs('#subjectSelector select.form-input', 'backgroundColor')),
      subjectBorderRgb: rgb(cs('#subjectSelector select.form-input', 'borderColor')),
    };
  });
  check('the active mode pill wears the accent', ctas.pill === toRgb(detectedAccent), String(ctas.pill));
  check('the subject dropdown is tinted by the accent, not neutral white', !!ctas.subjectBorderRgb && ctas.subjectBorderRgb[0] - ctas.subjectBorderRgb[2] > 40, JSON.stringify(ctas.subjectBorderRgb));
  check('the subject dropdown background leans to the accent too', !!ctas.subjectRgb && ctas.subjectRgb[0] - ctas.subjectRgb[2] > 20, JSON.stringify(ctas.subjectRgb));

  console.log('== 4. detection runs once and never overwrites a chosen colour');
  const edited = await page.evaluate(async () => {
    const cfg = ThemeEngine.get('ct_auto_solid');
    cfg.colors = { ...cfg.colors, accent: '#f59e0b' };
    ThemeEngine.save(cfg);
    ThemeEngine.activate('ct_auto_solid');
    await new Promise((r) => setTimeout(r, 600));
    return ThemeEngine.get('ct_auto_solid').colors.accent;
  });
  check('a later manual accent survives re-selection', edited === '#f59e0b', String(edited));

  const already = await page.evaluate(async () => {
    ThemeEngine.deactivate();
    const cfg = {
      id: 'ct_auto_done',
      name: 'Already detected',
      createdAt: new Date().toISOString(),
      bg: { type: 'solid', color: '#d94f2b' },
      colors: { ...ThemeEngine.DEFAULTS },
      colorsAutoDetected: true,
      overlay: { color: 'rgba(0,0,0,0)' },
    };
    ThemeEngine.save(cfg);
    ThemeEngine.activate('ct_auto_done');
    await new Promise((r) => setTimeout(r, 600));
    return ThemeEngine.get('ct_auto_done').colors.accent;
  });
  check('a theme already flagged detected is left alone', already === ThemeEngine_DEFAULTS(), String(already));

  console.log('== 5. scene-backed custom themes detect from the scene config');
  const sceneTheme = await page.evaluate(async () => {
    ThemeEngine.deactivate();
    const cfg = {
      id: 'ct_auto_scene',
      name: 'Auto scene',
      createdAt: new Date().toISOString(),
      bg: { type: 'scene', sceneId: 'koi', sceneOptions: {} },
      colors: { ...ThemeEngine.DEFAULTS },
      overlay: { color: 'rgba(0,0,0,0)' },
    };
    ThemeEngine.save(cfg);
    ThemeEngine.activate('ct_auto_scene');
    await new Promise((r) => setTimeout(r, 900));
    return { accent: ThemeEngine.get('ct_auto_scene').colors.accent, flagged: ThemeEngine.get('ct_auto_scene').colorsAutoDetected === true };
  });
  check('the scene theme accents from its own colour token', sceneTheme.accent === '#f97316', JSON.stringify(sceneTheme));
  check('the scene detection is recorded too', sceneTheme.flagged === true, String(sceneTheme.flagged));

  console.log('== 6. cleanup + no page or console errors');
  await page.evaluate(() => {
    ['ct_auto_solid', 'ct_auto_done', 'ct_auto_scene'].forEach((id) => ThemeEngine.delete(id));
    ThemeEngine.deactivate();
    localStorage.clear();
  });
  check('zero page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

function ThemeEngine_DEFAULTS() {
  return '#6366f1';
}

console.log(`\n${failed ? 'RED' : 'ALL GREEN'} — ${failed} failed`);
process.exit(failed ? 1 : 0);
