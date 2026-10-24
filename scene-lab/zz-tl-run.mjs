// zz-tl-run.mjs — throwaway Puppeteer+Firefox battery for the Phase-1 Theme
// Library (theme-library-spec.md §8). Verifies the live page at /pomora/.
// Prints results incrementally and never loses a section to a crash.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const results = [];
let failed = 0;
const check = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass });
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 140) + ']' : ''}`);
};
const section = async (name, fn) => {
  console.log(`\n== ${name}`);
  try { await fn(); } catch (e) { check(name + ' (section)', false, e.message); }
};

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/usr/bin/firefox',
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => {
    if (!/downloadable font/i.test(e.message)) errors.push(e.message);
  });
  page.on('console', (m) => {
    // Ignore sandbox-blocked font fetches and the KNOWN pre-existing ornate
    // thumbnail failure (createRadialGradient negative radius inside the
    // ornate scene at thumb size — reproduces on the builder's library too;
    // ornate is queued for full rework, so out of scope here).
    if (
      m.type() === 'error' &&
      !/downloadable font/i.test(m.text()) &&
      !/thumbnail failed: ornate/i.test(m.text())
    )
      errors.push(m.text());
  });

  // domcontentloaded (not networkidle0 — external font/CDN requests make
  // network-idle flaky in the sandbox; plain scripts execute before DCL).
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1500));

  // Deterministic click helper (dispatches on the real element → exercises
  // the actual listener path without racing modal spring animations).
  const click = (sel) =>
    page.evaluate((s) => document.querySelector(s)?.click(), sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await section('1. entry points & buttons', async () => {
    const btns = await page.evaluate(() => ({
      small: !!document.getElementById('openThemeLibraryBtnSmall'),
      full: !!document.getElementById('openThemeLibraryBtnFull'),
      smallVisible:
        document.getElementById('openThemeLibraryBtnSmall')?.offsetParent !==
        null,
      modalPresent: !!document.getElementById('tlModal'),
      // const-declared at top level of core.js — NOT on window; use typeof
      sceneCount: typeof ThemeScenes !== 'undefined' ? ThemeScenes.list().length : 0,
      labelS: document.getElementById('openThemeLibraryLabelSmall')?.textContent,
    }));
    check('buttons present (small+full+modal)', btns.small && btns.full && btns.modalPresent);
    check('small button visible', btns.smallVisible);
    check('label carries scene count', /Open theme library \(\d+\)/.test(btns.labelS || ''), btns.labelS);
    check('scene count sane (>=40)', btns.sceneCount >= 40, btns.sceneCount);
  });

  await section('2. small-settings chain', async () => {
    await click('.settings-btn');
    await sleep(500);
    await click('#openThemeLibraryBtnSmall');
    await sleep(500);
    const state = await page.evaluate(() => ({
      themeModal: document.getElementById('themeModal')?.classList.contains('open'),
      adv: document.getElementById('advancedSettingsModal')?.classList.contains('open'),
      lib: document.getElementById('tlModal')?.classList.contains('open'),
    }));
    check('adv open + library open + theme modal closed', state.adv && state.lib && !state.themeModal, JSON.stringify(state));
  });

  await section('3. grid census', async () => {
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#tlGrid .te-scene-card').length,
      count: document.getElementById('tlCount')?.textContent,
      total: ThemeScenes.list().length,
    }));
    check('All: card count == registry', state.cards === state.total, `${state.cards}/${state.total}`);
    check('count line "N of M themes"', state.count === `${state.total} of ${state.total} themes`, state.count);
  });

  await section('4. filters', async () => {
    const pills = await page.evaluate(() =>
      [...document.querySelectorAll('.tl-filter-pill')].map((p) => p.dataset.filter),
    );
    check('pills are all/simple/calm/dramatic', JSON.stringify(pills) === JSON.stringify(['all', 'simple', 'calm', 'dramatic']), pills.join(','));
    await click('.tl-filter-pill[data-filter="simple"]');
    await sleep(250);
    let state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#tlGrid .te-scene-card')].map((c) => c.dataset.scene),
    }));
    const SIMPLE = ['bubbles', 'particles', 'ripples', 'comets', 'confetti', 'balloon', 'snow', 'starfield', 'embers', 'grass'];
    check('Simple pill == curated 10', state.cards.length === 10 && state.cards.every((id) => SIMPLE.includes(id)), state.cards.join(','));
    await click('.tl-filter-pill[data-filter="calm"]');
    await sleep(250);
    const calmN = await page.evaluate(() => document.querySelectorAll('#tlGrid .te-scene-card').length);
    check('Calm pill filters (subset, >0)', calmN > 0 && calmN < 40, calmN);
    await click('.tl-filter-pill[data-filter="all"]');
    await sleep(250);
  });

  await section('5. search', async () => {
    await page.type('#tlSearch', 'koi');
    await sleep(300);
    let state = await page.evaluate(() => ({
      n: document.querySelectorAll('#tlGrid .te-scene-card').length,
      count: document.getElementById('tlCount')?.textContent,
    }));
    check('search "koi" → 1 card', state.n === 1, JSON.stringify(state));
    await click('.tl-filter-pill[data-filter="dramatic"]');
    await sleep(250);
    const n = await page.evaluate(() => document.querySelectorAll('#tlGrid .te-scene-card').length);
    check('search+filter intersect → 0', n === 0, n);
    await click('.tl-filter-pill[data-filter="all"]');
    await page.evaluate(() => {
      const s = document.getElementById('tlSearch');
      s.value = '';
      s.dispatchEvent(new Event('input'));
    });
    await sleep(250);
  });

  let thumbPainted = 0, thumbTotal = 0;
  await section('6. thumbnails painted', async () => {
    await sleep(1800);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#tlGrid .te-scene-card')];
      let painted = 0;
      for (const c of cards) {
        const cv = c.querySelector('canvas.te-scene-frame');
        if (!cv) continue;
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let sum = 0;
        for (let i = 3; i < d.length; i += 400) sum += d[i] > 0 ? 1 : 0;
        if (sum > 0) painted++;
      }
      return { painted, total: cards.length };
    });
    thumbPainted = state.painted; thumbTotal = state.total;
    check('thumbnails painted >=90%', state.painted / state.total >= 0.9, `${state.painted}/${state.total}`);
  });

  await section('7. open latency', async () => {
    await page.evaluate(() => ThemeLibrary.close());
    await sleep(250);
    const ms = await page.evaluate(() => {
      const t0 = performance.now();
      ThemeEngine.openThemeLibrary();
      return performance.now() - t0;
    });
    check('open→grid paint < 100ms', ms < 100, `${ms.toFixed(1)}ms`);
  });

  const grabDiff = async (w = 160, h = 90) =>
    page.evaluate(
      async (w, h) => {
        const canvas = document.getElementById('bgCanvas');
        const grab = () => {
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const x = c.getContext('2d');
          x.drawImage(canvas, 0, 0, w, h);
          return x.getImageData(0, 0, w, h).data;
        };
        const a = grab();
        await new Promise((r) => setTimeout(r, 350));
        const b = grab();
        let diff = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.abs(a[i] - b[i]) > 6 || Math.abs(a[i + 2] - b[i + 2]) > 6) diff++;
        }
        return diff;
      },
      w,
      h,
    );

  // Same probe, but inside the Theme Library's live preview window — proves the
  // modal shows a real animating scene, not a frozen frame.
  const previewDiff = async () =>
    page.evaluate(async () => {
      const canvas = document.getElementById('tlPreviewCanvas');
      if (!canvas || !canvas.width) return -1;
      const w = 120,
        h = 70;
      const grab = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d');
        x.drawImage(canvas, 0, 0, w, h);
        return x.getImageData(0, 0, w, h).data;
      };
      const a = grab();
      await new Promise((r) => setTimeout(r, 350));
      const b = grab();
      let diff = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i] - b[i]) > 6 || Math.abs(a[i + 2] - b[i + 2]) > 6) diff++;
      }
      return diff;
    });

  await section('8. apply flow (koi) — NATIVE, no custom theme', async () => {
    await sleep(600);
    await click('#tlGrid .te-scene-card[data-scene="koi"]');
    await sleep(700);
    const state = await page.evaluate(() => {
      const st = ThemeEngine.getNativeSceneState();
      const canvas = document.getElementById('bgCanvas');
      return {
        sceneId: st && st.sceneId,
        storage: localStorage.getItem('sceneLibraryState'),
        customConfig: ThemeEngine.getActiveCustomThemeConfig(),
        customEntries: ThemeEngine.list().map((t) => t.id),
        canvasShown: canvas.style.display !== 'none',
        // The scene is painted on the fixed canvas UNDER the (now transparent)
        // page background. Without these two the scene runs invisibly behind the
        // built-in gradient — the exact bug this round found and fixed.
        bodyBg: document.body.style.background,
        containerBg: getComputedStyle(document.getElementById('timerContainer')).backgroundColor,
        sceneLibClass: document.body.classList.contains('scene-library-active'),
        libStillOpen: document.getElementById('tlModal')?.classList.contains('open'),
        cardActive: document.querySelector('#tlGrid .te-scene-card[data-scene="koi"]')?.classList.contains('active'),
        panelShown: document.getElementById('tlBgSceneGroup')?.style.display !== 'none',
        panelTitle: document.getElementById('tlEditorTitle')?.textContent,
        previewActive: ThemeScenes.isActiveCanvas(document.getElementById('tlPreviewCanvas')),
      };
    });
    const motion = await previewDiff();
    check('apply: native scene state = koi', state.sceneId === 'koi' && !!state.storage, state.sceneId + ' / ' + String(state.storage).slice(0, 60));
    check('apply: NO custom theme entry created', state.customConfig === null && state.customEntries.length === 0, JSON.stringify([state.customConfig, state.customEntries]));
    check('apply: picked scene animates in the modal preview window', motion > 20, motion);
    check(
      'apply: page background cleared so the scene is actually visible',
      state.bodyBg === 'transparent' && state.containerBg === 'rgba(0, 0, 0, 0)',
      JSON.stringify([state.bodyBg, state.containerBg]),
    );
    check('apply: active card highlighted', state.cardActive);
    check('library stays open after apply', state.libStillOpen);

    // The scene runtime is single-instance: while the modal is open its preview
    // window owns it, and closing the modal hands it back to the page canvas.
    await page.evaluate(() => ThemeLibrary.close());
    await sleep(600);
    const handoff = await page.evaluate(() => ({
      pageActive: ThemeScenes.isActiveCanvas(document.getElementById('bgCanvas')),
      previewActive: ThemeScenes.isActiveCanvas(document.getElementById('tlPreviewCanvas')),
    }));
    const pageMotion = await grabDiff();
    check(
      'closing hands the scene back to the page background (painting)',
      handoff.pageActive && !handoff.previewActive && pageMotion > 20,
      JSON.stringify([handoff, pageMotion]),
    );
    await page.evaluate(() => ThemeEngine.openThemeLibrary());
    await sleep(600);
  });

  await section('9. the builder\'s animated-scene panel, live preview included', async () => {
    const fields = await page.evaluate(() => {
      const host = document.getElementById('tlBgSceneGroup');
      const opts = [...host.querySelectorAll('.te-scene-opt')];
      return {
        visible: host.style.display !== 'none',
        title: document.getElementById('tlEditorTitle')?.textContent,
        ranges: opts.filter((o) => o.type === 'range').length,
        colors: opts.filter((o) => o.type === 'color').length,
        checks: opts.filter((o) => o.type === 'checkbox').length,
        select: opts.filter((o) => o.tagName === 'SELECT').length,
        labels: [...host.querySelectorAll('.te-label')].map((l) => l.textContent.trim()),
        pickers: host.querySelectorAll('.te-color-picker').length,
        swatches: host.querySelectorAll('#tlSceneBgPresets .te-scene-bg-swatch').length,
        bgLabel: document.getElementById('tlSceneBgLabel')?.textContent,
        bgPickerCard: !!document.getElementById('tlSceneBgPicker'),
        previewShown: getComputedStyle(document.getElementById('tlPreviewEmpty')).display === 'none',
      };
    });
    check(
      'panel opens for the picked preset with its own option schema',
      fields.visible && /koi/i.test(fields.title || '') && fields.ranges >= 2 && fields.colors >= 1 && fields.bgPickerCard,
      JSON.stringify(fields),
    );
    check(
      'panel carries the builder\'s parts: swatch pickers + suggested row + background picker',
      fields.pickers >= 2 && fields.swatches >= 5 && !!fields.bgLabel && fields.previewShown,
      JSON.stringify(fields),
    );
    check('preview window shows the scene (empty note hidden)', fields.previewShown, JSON.stringify(fields.previewShown));

    // The live preview window really animates (pixels inside #tlPreviewCanvas
    // change over time) — not a static frame.
    const previewMotion = await previewDiff();
    check('live preview window is painting motion', previewMotion > 20, previewMotion);

    // The library panel and the builder pane are the SAME partial: identical
    // slot markers and the same te-* classes, only the id prefix differs.
    const mirrored = await page.evaluate(() => {
      const slots = (root) => [...root.querySelectorAll('[data-sp]')].map((e) => e.dataset.sp).join(',');
      const tl = document.getElementById('tlBgSceneGroup');
      const classesOf = (root) => [...root.querySelectorAll('*')].map((e) => e.className).filter((c) => typeof c === 'string' && /te-/.test(c)).length;
      return { tlSlots: slots(tl), tlPrefix: tl.dataset.scenePrefix, tlClassNodes: classesOf(tl) };
    });
    const builderMirror = await page.evaluate(() => {
      const te = document.getElementById('teBgSceneGroup');
      const slots = (root) => [...root.querySelectorAll('[data-sp]')].map((e) => e.dataset.sp).join(',');
      const classesOf = (root) => [...root.querySelectorAll('*')].map((e) => e.className).filter((c) => typeof c === 'string' && /te-/.test(c)).length;
      return { teSlots: slots(te), tePrefix: te.dataset.scenePrefix, teClassNodes: classesOf(te) };
    });
    const tlSlots = mirrored.tlSlots.split(',');
    const teSlots = builderMirror.teSlots.split(',');
    const shelfOnly = ['FeaturedShelf', 'ViewAllBtn'];
    check(
      'library panel mirrors the builder pane slot-for-slot (same partial)',
      mirrored.tlPrefix === 'tl' &&
        builderMirror.tePrefix === 'te' &&
        tlSlots.length > 5 &&
        // every library slot exists in the builder pane…
        tlSlots.every((s) => teSlots.includes(s)) &&
        // …and the builder carries exactly the two shelf-only extras on top
        teSlots.filter((s) => !tlSlots.includes(s)).join(',') === shelfOnly.join(','),
      JSON.stringify([mirrored, builderMirror]),
    );

    // Change an option through the REAL control (first range field).
    await page.evaluate(() => {
      const el = document.querySelector('#tlSceneOptions .te-scene-opt[type="range"]');
      el.value = el.max;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(500);
    const live = await page.evaluate(() => {
      const el = document.querySelector('#tlSceneOptions .te-scene-opt[type="range"]');
      const st = ThemeEngine.getNativeSceneState();
      return { key: el.dataset.opt, value: parseFloat(el.value), saved: st?.sceneOptions?.[el.dataset.opt], readout: document.getElementById(el.id + 'Val')?.textContent };
    });
    check('panel change persists into the native scene state', live.saved === live.value, JSON.stringify(live));
    check('range readout follows the slider', String(live.readout) === String(live.value), JSON.stringify(live));
    const motionAfterEdit = await previewDiff();
    check('preview still animating after a live edit', motionAfterEdit > 20, motionAfterEdit);

    // A suggested-colour swatch writes through to the running scene too.
    const swatch = await page.evaluate(async () => {
      const host = document.getElementById('tlBgSceneGroup');
      const btn = host.querySelector('#tlSceneBgPresets .te-scene-bg-swatch:not(.te-scene-bg-swatch--custom)');
      if (!btn) return { missing: true };
      btn.click();
      await new Promise((r) => setTimeout(r, 250));
      const st = ThemeEngine.getNativeSceneState();
      const sw = document.getElementById('tlSceneBgPreviewSwatch');
      return { color: btn.dataset.color, native: st?.sceneBgColor, swatch: getComputedStyle(sw).backgroundColor, active: btn.classList.contains('active') };
    });
    check(
      'suggested background swatch applies natively and shows as active',
      !swatch.missing && swatch.native === swatch.color && swatch.active,
      JSON.stringify(swatch),
    );

    // Reset returns the scene to its registry defaults.
    const reset = await page.evaluate(async () => {
      document.getElementById('tlEditorReset').click();
      await new Promise((r) => setTimeout(r, 350));
      const st = ThemeEngine.getNativeSceneState();
      return { opts: st?.sceneOptions, bg: st?.sceneBgColor };
    });
    check('Reset restores the scene defaults', Object.keys(reset.opts || {}).length === 0, JSON.stringify(reset));

    // Re-pick the SAME card → a fresh tweak survives.
    await page.evaluate(() => {
      const el = document.querySelector('#tlSceneOptions .te-scene-opt[type="range"]');
      el.value = el.max;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(300);
    const kept = await page.evaluate(() => {
      const el = document.querySelector('#tlSceneOptions .te-scene-opt[type="range"]');
      return { key: el.dataset.opt, value: parseFloat(el.value) };
    });
    await page.evaluate(() => ThemeLibrary.close());
    await sleep(200);
    await page.evaluate(() => ThemeEngine.openThemeLibrary());
    await sleep(300);
    await click('#tlGrid .te-scene-card[data-scene="koi"]');
    await sleep(400);
    const same = await page.evaluate(() => {
      const st = ThemeEngine.getNativeSceneState();
      return st?.sceneOptions || {};
    });
    check('re-pick of the same preset keeps its tweaks', same[kept.key] === kept.value, JSON.stringify([same, kept]));

    // A DIFFERENT preset starts from that scene's own defaults.
    await click('#tlGrid .te-scene-card[data-scene="bubbles"]');
    await sleep(500);
    const other = await page.evaluate(() => {
      const st = ThemeEngine.getNativeSceneState();
      return { sceneId: st?.sceneId, opts: st?.sceneOptions };
    });
    check('a different preset starts from its own defaults', other.sceneId === 'bubbles' && Object.keys(other.opts || {}).length === 0, JSON.stringify(other));
  });

  await section('10. no custom-theme entries; custom list untouched', async () => {
    const state = await page.evaluate(() => {
      ThemeEngine.save({ id: 'ct_tl_mine', name: 'My Own Theme', bg: { type: 'solid', color: '#101010' }, colors: {}, overlay: { color: 'rgba(0,0,0,0)' } });
      ThemeEngine._rebuildCustomList();
      const before = ThemeEngine.list().map((t) => t.id);
      return { before, rows: document.querySelectorAll('#customThemeListExpanded .te-theme-row').length };
    });
    check('a user theme is the only entry (no scene:* rows)', !state.before.some((id) => id.startsWith('scene:')) && state.before.includes('ct_tl_mine'), JSON.stringify(state.before));
    await page.evaluate(() => ThemeLibrary.close());
    await sleep(200);
    await page.evaluate(() => ThemeEngine.openThemeLibrary());
    await sleep(300);
    await click('#tlGrid .te-scene-card[data-scene="snow"]');
    await sleep(400);
    const after = await page.evaluate(() => ({ ids: ThemeEngine.list().map((t) => t.id), native: ThemeEngine.getNativeSceneState()?.sceneId }));
    check('picking a preset adds NO row to the custom list', !after.ids.some((id) => id.startsWith('scene:')) && after.ids.includes('ct_tl_mine') && after.native === 'snow', JSON.stringify(after));
    await page.evaluate(() => { ThemeEngine.delete('ct_tl_mine'); ThemeEngine._rebuildCustomList(); });
  });

  await section('11. basic themes REMOVED from the library only', async () => {
    const scoped = await page.evaluate(() => ({
      libraryGrid: !!document.querySelector('#tlModal .theme-options'),
      libraryBasicWrap: !!document.getElementById('tlBasic'),
      smallGrid: [...document.querySelectorAll('#themeModal .theme-options .theme-option')].map((b) => b.dataset.theme),
      smallDisabled: [...document.querySelectorAll('#themeModal .theme-option')].filter((b) => b.disabled).map((b) => b.dataset.theme),
      advancedGrid: [...document.querySelectorAll('#advancedSettingsModal .theme-options .theme-option')].map((b) => b.dataset.theme),
    }));
    check('library no longer lists the basic themes', !scoped.libraryGrid && !scoped.libraryBasicWrap, JSON.stringify([scoped.libraryGrid, scoped.libraryBasicWrap]));
    check(
      'small settings still lists all six basics',
      scoped.smallGrid.join(',') === 'gradient-default,gradient-day-night,gradient-deep-ocean,gradient-forest,color-dark,color-light',
      JSON.stringify(scoped.smallGrid),
    );
    check('Day / Night keeps its disabled state in the picker', JSON.stringify(scoped.smallDisabled) === JSON.stringify(['gradient-day-night']), JSON.stringify(scoped.smallDisabled));
    check('expanded settings still lists the basics', scoped.advancedGrid.length === 6, JSON.stringify(scoped.advancedGrid));

    // Picking a basic theme while a native scene is live still clears it — and
    // the scene panel goes back to its "pick a preset" state.
    await page.evaluate(() => {
      document.getElementById('themeModal')?.classList.add('open');
      document.querySelector('#themeModal .theme-option[data-theme="color-dark"]').click();
    });
    await sleep(700);
    const applied = await page.evaluate(() => ({
      theme: localStorage.getItem('timerTheme'),
      native: ThemeEngine.getNativeSceneState(),
      sceneLibClass: document.body.classList.contains('scene-library-active'),
      panelHidden: document.getElementById('tlBgSceneGroup')?.style.display === 'none',
      emptyNote: getComputedStyle(document.getElementById('tlPreviewEmpty')).display !== 'none',
      resetHidden: document.getElementById('tlEditorReset')?.hidden === true,
    }));
    check('basic theme applies and clears the native scene', applied.theme === 'color-dark' && !applied.native && !applied.sceneLibClass, JSON.stringify(applied));
    check('scene panel returns to the empty state with no preset', applied.panelHidden && applied.emptyNote && applied.resetHidden, JSON.stringify(applied));
  });

  await section('12. persistence across reload', async () => {
    await page.evaluate(() => ThemeEngine.applyNativeScene('koi', { fishCount: 6 }, '#031427'));
    await sleep(400);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    const state = await page.evaluate(() => {
      const st = ThemeEngine.getNativeSceneState();
      return {
        sceneId: st?.sceneId,
        opts: st?.sceneOptions,
        bg: st?.sceneBgColor,
        canvasShown: document.getElementById('bgCanvas').style.display !== 'none',
        custom: ThemeEngine.getActiveCustomThemeConfig(),
      };
    });
    const painting = await grabDiff(120, 70);
    check('reload: native scene restored with its options + bg color', state.sceneId === 'koi' && state.opts?.fishCount === 6 && state.bg === '#031427', JSON.stringify(state));
    check('reload: scene still painting, no custom theme involved', painting > 10 && state.custom === null, painting);
  });

  await section('13. built-ins intact', async () => {
    const state = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('#themeModal .theme-option')].map((b) => b.textContent.trim());
      return { hasDeleted: labels.some((t) => /sunset glow|midnight bloom/i.test(t)) };
    });
    check('deleted themes still absent', !state.hasDeleted);
    await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
    await sleep(600);
    await page.click('#themeModal .theme-option[data-theme="color-dark"]');
    await sleep(500);
    const theme = await page.evaluate(() => ({
      theme: localStorage.getItem('timerTheme'),
      native: ThemeEngine.getNativeSceneState(),
    }));
    check('built-in quick-pick in small settings still works', theme.theme === 'color-dark', JSON.stringify(theme));
  });

  await section('13b. the builder has its animated-scene section BACK', async () => {
    await page.evaluate(() => {
      // start from a clean, non-scene theme so the pane visibility is provable
      ThemeEngine.openEditor(null);
    });
    await sleep(700);
    const before = await page.evaluate(() => ({
      options: [...document.getElementById('teBgType').querySelectorAll('option')].map((o) => ({ v: o.value, disabled: o.disabled })),
      paneHiddenForSolid: document.getElementById('teBgSceneGroup')?.style.display === 'none',
      sceneLib: !!document.getElementById('teSceneLibModal'),
      hoverPreview: !!document.getElementById('teHoverPreview'),
      shelfCards: document.getElementById('teFeaturedShelf')?.querySelectorAll('.te-scene-card').length,
    }));
    check('background type offers a choosable Animated Theme again', before.options.some((o) => o.v === 'scene' && !o.disabled), JSON.stringify(before.options));
    check('scene pane stays collapsed for a solid background', before.paneHiddenForSolid, JSON.stringify(before.paneHiddenForSolid));
    check('featured shelf is populated before the pane is even shown', before.shelfCards === 6, JSON.stringify(before.shelfCards));

    await page.evaluate(() => {
      const sel = document.getElementById('teBgType');
      sel.value = 'scene';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(600);
    const state = await page.evaluate(() => ({
      paneShown: document.getElementById('teBgSceneGroup').style.display !== 'none',
      shelfCards: document.getElementById('teFeaturedShelf').querySelectorAll('.te-scene-card').length,
      viewAll: document.getElementById('teViewAllBtn').textContent.trim(),
      options: document.querySelectorAll('#teSceneOptions .te-scene-opt').length,
      suggested: document.querySelectorAll('#teSceneBgPresets .te-scene-bg-swatch').length,
      builderPreviewActive: ThemeScenes.isActiveCanvas(document.getElementById('tePreviewCanvas')),
      sceneLib: !!document.getElementById('teSceneLibModal'),
      hoverPreview: !!document.getElementById('teHoverPreview'),
    }));
    check(
      'pane opens with shelf, view-all, fine controls and suggested swatches',
      state.paneShown && state.shelfCards === 6 && /^View all \d+ themes/.test(state.viewAll) && state.options > 0 && state.suggested > 0,
      JSON.stringify(state),
    );
    check('builder previews the picked scene on its own canvas', state.builderPreviewActive, JSON.stringify(state.builderPreviewActive));

    // "View all themes" opens the builder's full theme library again.
    const lib = await page.evaluate(async () => {
      document.getElementById('teViewAllBtn').click();
      await new Promise((r) => setTimeout(r, 700));
      const m = document.getElementById('teSceneLibModal');
      return {
        open: m.classList.contains('open'),
        cards: document.getElementById('teSceneLibGrid').querySelectorAll('.te-scene-card').length,
        count: document.getElementById('teSceneLibCount').textContent,
        moods: document.getElementById('teSceneLibMoods').querySelectorAll('.te-lib-mood').length,
      };
    });
    check('View all themes reopens the builder theme library', lib.open && lib.cards === 40 && lib.moods === 6, JSON.stringify(lib));

    // Picking from the shelf or the library writes the scene into the theme form.
    const picked = await page.evaluate(async () => {
      document.querySelector('#teSceneLibGrid .te-scene-card[data-scene="snow"]').click();
      await new Promise((r) => setTimeout(r, 500));
      return {
        selected: ThemeEngine._getSelectedSceneId(),
        libClosed: !document.getElementById('teSceneLibModal').classList.contains('open'),
        shelfActive: document.querySelector('#teFeaturedShelf .te-scene-card.active')?.dataset.scene,
        fields: document.querySelectorAll('#teSceneOptions .te-scene-opt').length,
      };
    });
    check(
      'library pick selects the scene, closes the modal and rebuilds the fields',
      picked.selected === 'snow' && picked.libClosed && picked.shelfActive === 'snow' && picked.fields > 0,
      JSON.stringify(picked),
    );
    // The restored pane must feed the theme FORM again, in the same legacy
    // per-scene shape saved themes already use (scenes were never rewritten).
    const form = await page.evaluate(() => {
      const cfg = ThemeEngine._gatherForm();
      return {
        type: cfg.bg.type,
        sceneId: cfg.bg.sceneId,
        optsIsMap: !!cfg.bg.sceneOptions && typeof cfg.bg.sceneOptions === 'object' && !!cfg.bg.sceneOptions.snow,
        bg: cfg.bg.sceneBgColor,
        bgIsMap: !!cfg.bg.sceneBgColors && !!cfg.bg.sceneBgColors.snow,
      };
    });
    check(
      'saving a scene theme gathers the legacy scene config from the pane',
      form.type === 'scene' && form.sceneId === 'snow' && form.optsIsMap && /^#[0-9a-f]{6}$/i.test(form.bg || '') && form.bgIsMap,
      JSON.stringify(form),
    );

    await page.evaluate(() => ThemeEngine.closeEditor());
    await sleep(300);
    check('hover preview element present for both grids', state.hoverPreview && before.hoverPreview, JSON.stringify([state.hoverPreview, before.hoverPreview]));
  });

  await section('14. ESC hierarchy', async () => {
    await page.evaluate(() => {
      document.getElementById('themeModal')?.classList.remove('open');
      document.getElementById('advancedSettingsModal')?.classList.add('open');
      ThemeEngine.openThemeLibrary();
    });
    await sleep(300);
    await page.keyboard.press('Escape');
    await sleep(300);
    let state = await page.evaluate(() => ({
      lib: document.getElementById('tlModal')?.classList.contains('open'),
      adv: document.getElementById('advancedSettingsModal')?.classList.contains('open'),
    }));
    check('ESC closes library first, adv stays', !state.lib && state.adv, JSON.stringify(state));
    await page.keyboard.press('Escape');
    await sleep(300);
    state = await page.evaluate(() => document.getElementById('advancedSettingsModal')?.classList.contains('open'));
    check('ESC then closes adv', !state);
  });

  await section('15. real pointer click on animated panel', async () => {
    // Soft check: a genuine mouse click on a card, with a settled panel.
    await page.evaluate(() => {
      document.getElementById('advancedSettingsModal')?.classList.add('open');
      ThemeEngine.openThemeLibrary();
    });
    await sleep(900); // let the spring animation fully settle
    try {
      await page.click('#tlGrid .te-scene-card[data-scene="confetti"]', { delay: 60 });
      await sleep(500);
      const active = await page.evaluate(() => ThemeEngine.getNativeSceneState()?.sceneId);
      check('real pointer click applies confetti', active === 'confetti', active);
    } catch (e) {
      check('real pointer click applies confetti', false, e.message);
    }
  });

  await section('16. hover-preview loop stops on close', async () => {
    // NOTE: the page has an AMBIENT rAF loop (timer UI/waves — 36 frames per
    // 600ms at baseline, measured in zz-tl-raf.mjs), so frame counting cannot
    // isolate a leak. Instead: assert the library's only rAF consumer — the
    // hover preview — is torn down by close() (class removed → _hoverStop ran).
    const state = await page.evaluate(() => {
      const el = () => document.getElementById('teHoverPreview');
      document.getElementById('advancedSettingsModal')?.classList.remove('open');
      ThemeEngine.openThemeLibrary();
      const card = document.querySelector('#tlGrid .te-scene-card[data-scene="koi"]');
      ThemeEngine._hoverStart(card);
      const openedWhileHover = el()?.classList.contains('open');
      ThemeLibrary.close();
      return { openedWhileHover, openAfterClose: el()?.classList.contains('open') };
    });
    check('hover preview opens on hover', state.openedWhileHover);
    check('hover preview torn down by close()', !state.openAfterClose, JSON.stringify(state));
  });

  console.log('== 17. picking a scene derives + applies its palette (round 7)');
  {
    // Reset to a clean default site state, then pick a scene through the real
    // library UI. Round 7 (2026-10-11, user) SUPERSEDES round 5's "leave the
    // colours alone": a library pick now auto-detects the scene's palette (the
    // colour token, or a live canvas read for scenes that have none) and applies
    // it — inline --th-accent, themed-chrome class, registers, modal surface —
    // while still writing NO custom-theme record (presets stay native).
    await page.evaluate(() => {
      ThemeEngine.deactivate();
      document.documentElement.removeAttribute('style');
      document.getElementById('advancedSettingsModal')?.classList.add('open');
    });
    await sleep(400);
    const before = await page.evaluate(() => {
      const as = document.getElementById('advancedSettingsModal');
      return {
        s7Label: getComputedStyle(as).getPropertyValue('--s7-label').trim(),
        s4Label: getComputedStyle(document.querySelector('.planner-modal')).getPropertyValue('--s4-label').trim(),
        modalBg: getComputedStyle(document.getElementById('themeModal')).backgroundColor,
      };
    });
    await page.evaluate(() => {
      document.getElementById('themeModal')?.classList.add('open');
      ThemeEngine.openThemeLibrary();
    });
    await sleep(500);
    await page.evaluate(() => {
      document.querySelector('#tlGrid .te-scene-card[data-scene="bubbles"]')?.click();
    });
    await sleep(900);
    const after = await page.evaluate(() => {
      const as = document.getElementById('advancedSettingsModal');
      const saved = JSON.parse(localStorage.getItem('customThemes') || '[]');
      return {
        bodyClass: document.body.className,
        inlineAccent: document.documentElement.style.getPropertyValue('--th-accent') || '',
        s7Label: getComputedStyle(as).getPropertyValue('--s7-label').trim(),
        s4Label: getComputedStyle(document.querySelector('.planner-modal')).getPropertyValue('--s4-label').trim(),
        modalBg: getComputedStyle(document.getElementById('themeModal')).backgroundColor,
        customEntries: saved.length,
        native: ThemeEngine.getNativeSceneState()?.sceneId,
      };
    });
    check(
      'library pick derives and applies a palette (accent override + themed chrome)',
      /^#[0-9a-f]{6}$/i.test(after.inlineAccent) && /custom-theme-active/.test(after.bodyClass),
      JSON.stringify([after.inlineAccent, after.bodyClass]),
    );
    check(
      'the derived accent reaches the settings registers + modal surface',
      after.s7Label !== before.s7Label &&
        after.s4Label !== before.s4Label &&
        after.s7Label.toLowerCase().includes(after.inlineAccent.toLowerCase()) &&
        after.s4Label.toLowerCase().includes(after.inlineAccent.toLowerCase()) &&
        after.modalBg !== before.modalBg,
      JSON.stringify([before, after]),
    );
    check(
      'library pick writes NO palette anywhere (native scene, empty custom list)',
      after.customEntries === 0 && after.native === 'bubbles',
      JSON.stringify([after.customEntries, after.native]),
    );

    // …but a theme whose colours WERE edited still applies them everywhere
    // (that path is the builder's now — the library never stores a palette).
    await page.evaluate(() => {
      ThemeEngine.save({
        id: 'ct_tl_edited',
        name: 'Edited palette',
        createdAt: new Date().toISOString(),
        bg: { type: 'solid', color: '#101010' },
        colors: ThemeEngine.getLiveColors(),
        overlay: { color: 'rgba(0,0,0,0)' },
      });
      const cfg = ThemeEngine.get('ct_tl_edited');
      cfg.colors = { ...cfg.colors, accent: '#f59e0b' };
      ThemeEngine.save(cfg);
      ThemeEngine.activate('ct_tl_edited');
    });
    // The checked toggle tweens its background (`transition: background 0.25s`),
    // so a read in the same tick still returns the PREVIOUS colour. Let the
    // transition settle before sampling — the assertion itself is unchanged.
    await sleep(450);
    const edited = await page.evaluate(() => ({
      bodyClass: document.body.className,
      inlineAccent: document.documentElement.style.getPropertyValue('--th-accent'),
      toggleBg: getComputedStyle(
        document.querySelector('.advanced-settings-modal .fs-toggle-input:checked ~ .fs-toggle-thumb'),
      ).backgroundColor,
    }));
    check(
      'an EDITED palette still applies (themed-chrome class + accent everywhere)',
      /custom-theme-active/.test(edited.bodyClass) &&
        edited.inlineAccent === '#f59e0b' &&
        edited.toggleBg === 'rgb(245, 158, 11)',
      JSON.stringify(edited),
    );
    await page.evaluate(() => {
      ThemeEngine.delete('ct_tl_edited');
      ThemeEngine.deactivateNativeScene();
      ThemeEngine.deactivate();
      ThemeEngine._rebuildCustomList();
      document.getElementById('themeModal')?.classList.remove('open');
      document.getElementById('advancedSettingsModal')?.classList.remove('open');
      localStorage.clear();
    });
  }

  console.log('\n---');
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
  const totalFailed = failed + (errors.length ? 1 : 0);
  console.log(totalFailed === 0 ? 'THEME LIBRARY BATTERY: ALL GREEN' : `BATTERY: ${totalFailed} FAILURES`);
  process.exitCode = totalFailed === 0 ? 0 : 1;
} finally {
  await browser.close();
}
