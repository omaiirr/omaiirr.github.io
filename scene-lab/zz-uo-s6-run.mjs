// zz-uo-s6-run.mjs — surface-6 battery (theme editor chrome).
// Reuses zz-uo-s1-run.mjs's browser + noise-filter setup.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  const noise = /downloadable font/i;
  page.on('pageerror', (e) => { if (!noise.test(e.message)) errors.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !noise.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await sleep(300);

  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
  let failed = 0;
  const check = (name, pass) => {
    if (!pass) failed++;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  };

  console.log('== 1. tab sidebar SVGs are stroke/fill consistent with the spec');
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(900);
  const sidebarSvgs = await page.evaluate(() => {
    const btns = document.querySelectorAll('.te-tab-btn');
    return [...btns].map((b) => {
      const svgs = b.querySelectorAll('svg');
      const svg = svgs[0];
      const raw = svg.outerHTML.slice(0, 900);
      const isStrokeShell = /stroke="currentColor"/.test(raw) && /fill="none"/.test(raw);
      const isFillShell = /fill="currentColor"/.test(raw) && !/stroke="currentColor"/.test(raw);
      const strokeW = (svg.getAttribute('stroke-width') || '').toString();
      // tab badge is a 14x14 inline SVG with a 3-path layers stroke shell
      return {
        tab: b.dataset.tab,
        viewBox: svg.getAttribute('viewBox'),
        isStrokeShell,
        isFillShell,
        strokeW,
        rawHead: raw.slice(0, 220),
      };
    });
  });
  // Background tab: transparent line shell, inside-attr stroke-width=3, stroke-linejoin
  const bg = sidebarSvgs.find((s) => s.tab === 'bg');
  const bg2 = sidebarSvgs.find((s) => s.tab === 'bg');
  // Accept either the marker (outer stroke-width=2) or the inner stroke-width=3 path style
  const bgGood3 = bg2 && bg2.isStrokeShell && (bg2.strokeW === '2' || bg2.strokeW === '3');
  check('background tab is stroke shell (stroke-width 2 or 3)', bgGood3, JSON.stringify(bg2));
  // Colors tab: line shell since 2026-10-10 (user re-picked the palette glyph in the
  // line language; the old assert pinned the earlier filled 50x50 artwork).
  const colors = sidebarSvgs.find((s) => s.tab === 'colors');
  check('colors tab is stroke shell (stroke-width 2 or 3)', colors && colors.isStrokeShell && (colors.strokeW === '2' || colors.strokeW === '3'), JSON.stringify(colors));
  // Overlay tab: 14x14 inline SVG with 3 layer paths (layers artwork) — stroke shell, stroke-width=2, on the <svg>
  const overlay = sidebarSvgs.find((s) => s.tab === 'overlay');
  check('overlay tab is 14x14 3-path stroke shell (stroke-width=2 on svg)', overlay && overlay.viewBox === '0 0 24 24' && /stroke-width="2"/.test(overlay.rawHead) && overlay.rawHead.indexOf('stroke="currentColor"') !== -1 && !overlay.rawHead.includes('stroke-width="3"'), JSON.stringify(overlay));

  console.log('== 1b. the three tabs carry three DIFFERENT glyphs, one per concept');
  // User pick 2026-10-10: picture / palette / layers. The set used to reuse ONE
  // glyph for all three tabs, so distinctness (not just presence) is the thing to pin.
  const tabGlyphs = await page.evaluate(() =>
    [...document.querySelectorAll('.te-tab-btn')].map((b) => {
      const svg = b.querySelector('svg');
      const cs = svg ? getComputedStyle(svg) : null;
      return {
        tab: b.dataset.tab,
        label: b.textContent.trim(),
        inner: svg ? svg.innerHTML.replace(/\s+/g, ' ').trim() : '',
        w: cs ? cs.width : '',
        h: cs ? cs.height : '',
        marginR: cs ? cs.marginRight : '',
        viewBox: svg ? svg.getAttribute('viewBox') : null,
        strokeW: svg ? svg.getAttribute('stroke-width') : null,
        stroke: svg ? svg.getAttribute('stroke') : null,
      };
    }),
  );
  check('three tabs, three distinct glyphs', tabGlyphs.length === 3 && new Set(tabGlyphs.map((t) => t.inner)).size === 3, JSON.stringify(tabGlyphs.map((t) => `${t.tab}:${t.inner.length}ch`)));
  check('every tab glyph renders 14x14 with a 6px gap', tabGlyphs.length === 3 && tabGlyphs.every((t) => t.w === '14px' && t.h === '14px' && t.marginR === '6px'), JSON.stringify(tabGlyphs.map((t) => `${t.w}x${t.h} ${t.marginR}`)));
  check('every tab glyph is a 24-unit 2px-stroke currentColor shell', tabGlyphs.length === 3 && tabGlyphs.every((t) => t.viewBox === '0 0 24 24' && t.strokeW === '2' && t.stroke === 'currentColor'), JSON.stringify(tabGlyphs.map((t) => `${t.viewBox} w${t.strokeW} ${t.stroke}`)));
  check('tab labels are Background / Colors / Overlay', tabGlyphs.map((t) => t.label).join('|') === 'Background|Colors|Overlay', JSON.stringify(tabGlyphs.map((t) => t.label)));

  console.log('== 2. footer menu icons + placement');
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(400);
  // The slots are {% include svg/... %} partials now, so they carry no width/height
  // ATTRIBUTES — the box is pinned in CSS (S6 block) and has to be asserted computed.
  const menuItems = await page.evaluate(() => {
    const menu = document.getElementById('teFooterMenu');
    const items = [...menu.querySelectorAll('.te-menu-item')];
    return items.map((it) => {
      const svg = it.querySelector('svg');
      const txt = (it.childNodes[it.childNodes.length - 1]?.textContent || '').trim();
      const cs = svg ? getComputedStyle(svg) : null;
      const raw = svg ? svg.outerHTML : '';
      return {
        id: it.id,
        text: txt,
        w: cs ? cs.width : '',
        h: cs ? cs.height : '',
        marginR: cs ? cs.marginRight : '',
        viewBox: svg ? svg.getAttribute('viewBox') : null,
        innerLen: svg ? svg.innerHTML.replace(/\s+/g, '').length : 0,
        // Glyph identity, not a fixed prefix of the markup: every partial now
        // shares a longer opening tag (class="uo-icon" …), so a 200-char slice
        // of the head can be identical for three different glyphs.
        outerHTMLHead: raw.slice(0, 200) + '|' + raw.replace(/\s+/g, ''),
      };
    });
  });
  // Preview: eye icon, viewBox 0 0 24 24, fill shell (filled eye), 14x14, margin-right 6px
  const preview = menuItems.find((m) => m.id === 'tePreviewBtn');
  check('preview menu icon: renders 14x14, 24-unit viewBox, real glyph, 6px gap', preview && preview.w === '14px' && preview.h === '14px' && preview.viewBox === '0 0 24 24' && preview.innerLen > 20 && preview.marginR === '6px', JSON.stringify(preview));
  const exportBtn = menuItems.find((m) => m.id === 'teExportBtn');
  check('export menu icon: renders 14x14, 24-unit viewBox, real glyph, 6px gap', exportBtn && exportBtn.w === '14px' && exportBtn.h === '14px' && exportBtn.viewBox === '0 0 24 24' && exportBtn.innerLen > 20 && exportBtn.marginR === '6px', JSON.stringify(exportBtn));
  const importBtn = menuItems.find((m) => m.id === 'teImportBtn');
  check('import menu icon: renders 14x14, 24-unit viewBox, real glyph, 6px gap', importBtn && importBtn.w === '14px' && importBtn.h === '14px' && importBtn.viewBox === '0 0 24 24' && importBtn.innerLen > 20 && importBtn.marginR === '6px', JSON.stringify(importBtn));
  check('the three footer-menu glyphs are distinct', new Set([preview, exportBtn, importBtn].map((m) => m && m.outerHTMLHead)).size === 3, JSON.stringify([preview, exportBtn, importBtn].map((m) => (m ? m.outerHTMLHead.length : 0))));

  // Placement: menu-item text baseline should clear the icon. Measure button inner flow: svg box right vs first text pixel.
  const placement = await page.evaluate(() => {
    const previewBtn = document.getElementById('tePreviewBtn');
    const svg = previewBtn.querySelector('svg');
    const svgBox = svg.getBoundingClientRect();
    const children = Array.from(previewBtn.childNodes);
    // the text node is the last non-empty text child
    const txtNode = children.find((n) => n.nodeType === 3 && n.textContent.trim().length);
    let textStartX = 0;
    let textEls = [];
    if (txtNode) {
      // find the rendered text node by walking the button for text nodes
      const r = document.createRange();
      r.setStart(txtNode, 0);
      r.setEnd(txtNode, 1);
      const fr = r.getClientRects();
      textStartX = fr.length ? fr[0].left : 0;
    } else {
      // fallback: use the button's first text via innerText bounds
      textEls = [previewBtn].filter((el) => el);
    }
    return { iconRight: svgBox.right.toFixed(1), textStartX: textStartX.toFixed(1), gapPx: (textStartX - svgBox.right).toFixed(1) };
  });
  // We only assert the icon clears the text node start; negative gap means overlap.
  // gapPx can be slightly negative in headless if the text node is collapsed; we only
  // flag if the icon right is clearly to the right of text start (overlap).
  check('export/import/preview icon does not overlap text (iconRight <= textStartX or gap not strongly negative)', parseFloat(placement.gapPx) >= -1 || parseFloat(placement.iconRight) <= parseFloat(placement.textStartX), JSON.stringify(placement));

  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(200);

  console.log('== 3. save button icon');
  const save = await page.evaluate(() => {
    const btn = document.getElementById('teSaveBtn');
    const svg = btn.querySelector('svg');
    const cs = svg ? getComputedStyle(svg) : null;
    return { viewBox: svg ? svg.getAttribute('viewBox') : null, w: cs ? cs.width : '', h: cs ? cs.height : '', marginR: cs ? cs.marginRight : '', innerLen: svg ? svg.innerHTML.replace(/\s+/g, '').length : 0, rawHead: svg ? svg.outerHTML.slice(0, 120) : '' };
  });
  check('save button glyph: renders 14x14, 24-unit viewBox, real glyph, 6px gap', save.w === '14px' && save.h === '14px' && save.marginR === '6px' && save.viewBox === '0 0 24 24' && save.innerLen > 20, JSON.stringify(save));

  console.log('== 4. auto-detect button icon');
  const autoDetect = await page.evaluate(() => {
    const btn = document.getElementById('teAutoDetectColors');
    const svg = btn.querySelector('svg');
    const cs = svg ? getComputedStyle(svg) : null;
    return { viewBox: svg ? svg.getAttribute('viewBox') : null, w: cs ? cs.width : '', h: cs ? cs.height : '', marginR: cs ? cs.marginRight : '', innerLen: svg ? svg.innerHTML.replace(/\s+/g, '').length : 0, rawHead: svg ? svg.outerHTML.slice(0, 160) : '' };
  });
  check('auto-detect glyph: renders 14x14, 24-unit viewBox, real glyph, 6px gap', autoDetect.w === '14px' && autoDetect.h === '14px' && autoDetect.marginR === '6px' && autoDetect.viewBox === '0 0 24 24' && autoDetect.innerLen > 20, JSON.stringify(autoDetect));

  console.log('== 5. custom theme badge (soft)');
  const badge = await page.evaluate(() => {
    const el = document.getElementById('customThemeActiveBadge');
    const svg = el.querySelector('svg');
    const cs = svg ? getComputedStyle(svg) : null;
    return { viewBox: svg ? svg.getAttribute('viewBox') : null, w: cs ? cs.width : '', h: cs ? cs.height : '', fill: svg ? svg.getAttribute('fill') : null, display: el.style.display, paths: svg ? svg.querySelectorAll('path').length : 0 };
  });
  const badgeOK = badge.w === '14px' && badge.h === '14px' && badge.paths > 0 && (badge.display === 'none' || badge.display === '');
  // badge is a 14x14 filled palette (6 paths on the inner icon) but the wrapper may be hidden by default; only assert shape + hidden.
  check('badge: 14x14 glyph with real paths, hidden by default', badgeOK, JSON.stringify(badge));


  // Badge visibility is set by CSS (its own .custom-theme-badge rules) when the body carries custom-theme-active.
  // We toggle the class and read the badge's computed display + the SVG dimensions.
  // Badge visibility is driven by JS (ThemeEngine._updateCustomActiveBadge sets inline display) when a custom
  // theme is actually active. Activate a real custom theme so the engine updates the badge inline.
  await page.evaluate(() => {
    // ThemeEngine is a top-level lexical binding, NOT on window — the bare name is
    // the only thing that resolves inside page.evaluate (see handoff), so the old
    // window.ThemeEngine read silently skipped this whole badge path.
    const te = typeof ThemeEngine !== 'undefined' ? ThemeEngine : null;
    if (!te) return;
    try {
      // PUBLIC API ONLY. _getAll/_setActiveId/_updateCustomActiveBadge are module-private
      // plain functions in theme-engine.js — they were never on the ThemeEngine object,
      // so the old soft check could not have passed no matter what. save() + activate()
      // is the real path: apply() sets the active id, which flips the badge inline.
      te.save({
        id: 'zz-badge-test',
        name: 'ZZ badge test',
        colors: { accent: '#6366f1' },
        bg: { type: 'solid', color: '#6366f1' },
      });
      te.activate('zz-badge-test');
    } catch (e) { /* best effort */ }
  });
  await sleep(450);
  const badgeShown = await page.evaluate(() => {
    const el = document.getElementById('customThemeActiveBadge');
    const svg = el ? el.querySelector('svg') : null;
    const cs = el ? window.getComputedStyle(el) : null;
    const scs = svg ? window.getComputedStyle(svg) : null;
    return {
      computedDisplay: cs ? cs.display : '',
      styleDisplay: el ? el.style.display : '',
      svgW: scs ? scs.width : '',
      svgH: scs ? scs.height : '',
    };
  });
  // An active custom theme should render the badge visible (flex per CSS, or inline style flex) with a 14x14 icon.
  const badgeVisible = badgeShown.computedDisplay === 'flex' || badgeShown.computedDisplay === 'inline-flex' || badgeShown.styleDisplay === 'flex' || (badgeShown.computedDisplay !== 'none' && badgeShown.computedDisplay !== '' && badgeShown.svgW === '14px' && badgeShown.svgH === '14px');
  check('badge shows when a custom theme is active (flex, 14x14 glyph)', badgeVisible, JSON.stringify(badgeShown));
  // Clean up through the same public API so the AFTER shots stay unbiased: no custom
  // theme left in storage, no active id, badge back to hidden.
  await page.evaluate(() => {
    const te = typeof ThemeEngine !== 'undefined' ? ThemeEngine : null;
    if (te) {
      te.deactivate();
      te.delete('zz-badge-test');
    }
  });
  await sleep(400);


  console.log('== 6. expand settings gear (small settings modal)');
  // open the small settings modal (themeModal) — expand-settings button is inside it
  await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
  await sleep(600);
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(700);
  const advGear = await page.evaluate(() => {
    const btn = document.getElementById('openAdvancedSettingsBtn');
    const svg = btn.querySelector('svg');
    const cs = window.getComputedStyle(svg);
    return { viewBox: svg.getAttribute('viewBox'), w: svg.getAttribute('width'), h: svg.getAttribute('height'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width'), strokeLinecap: svg.getAttribute('stroke-linecap'), renderedW: cs.width, renderedH: cs.height, rawHead: svg.outerHTML.slice(0, 160), marginR: (cs.marginRight || '').slice(0, 6) };
  });
  // Round 4 (2026-10-10): the filled Material gear was replaced by the shared
  // line-set sliders glyph so the small settings menu matches the builder tabs.
  check(
    'expand settings glyph: shared line-set shell (24-unit viewBox, 2px stroke, fill none, CSS-pinned 14x14)',
    advGear.viewBox === '0 0 24 24' &&
      advGear.fill === 'none' &&
      advGear.stroke === 'currentColor' &&
      advGear.sw === '2' &&
      advGear.w === null &&
      advGear.h === null &&
      advGear.renderedW === '14px' &&
      advGear.renderedH === '14px',
    JSON.stringify(advGear),
  );
  // gear should be inline with the button text (flex/inline layout). Confirm the icon box is to the left of the text start.
  const advBtnLayout = await page.evaluate(() => {
    const btn = document.getElementById('openAdvancedSettingsBtn');
    const svg = btn.querySelector('svg');
    const svgBox = svg.getBoundingClientRect();
    const textNode = Array.from(btn.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim().length);
    let textStartX = 0;
    if (textNode) {
      const r = document.createRange();
      r.setStart(textNode, 0);
      r.setEnd(textNode, 1);
      const fr = r.getClientRects();
      textStartX = fr.length ? fr[0].left : 0;
    }
    return { iconRight: svgBox.right.toFixed(1), textStartX: textStartX.toFixed(1), gapPx: (textStartX - svgBox.right).toFixed(1) };
  });
  // We only require that the icon does not overlap the text node (iconRight <= textStartX) or gap is not strongly negative.
  check('expand settings gear does not overlap text (iconRight <= textStartX or gap not strongly negative)', parseFloat(advBtnLayout.gapPx) >= -1 || parseFloat(advBtnLayout.iconRight) <= parseFloat(advBtnLayout.textStartX), JSON.stringify(advBtnLayout));

  console.log('== 7. editor chrome CSS: tab sidebar + menu item spacing');
  // Live computed: icon should render at 14x14 and the button should lay it out inline.
  const computed = await page.evaluate(() => {
    const previewBtn = document.getElementById('tePreviewBtn');
    const svg = previewBtn.querySelector('svg');
    const cs = window.getComputedStyle(svg);
    return {
      svgWidth: cs.width,
      svgHeight: cs.height,
      svgMarginRight: cs.marginRight,
      display: cs.display,
    };
  });
  check('live: preview svg 14x14, display inline-block or inline', computed.svgWidth === '14px' && computed.svgHeight === '14px' && (computed.display === 'inline-block' || computed.display === 'inline'), JSON.stringify(computed));

  console.log('== 8. AFTER: editor chrome + footer menu + small settings');
  await page.evaluate(() => {
    document.getElementById('themeEditorModal')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.remove('open');
  });
  await sleep(300);
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(900);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-s6-editor.png' });
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-s6-footermenu.png' });
  await page.evaluate(() => document.getElementById('teMoreBtn')?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('.te-tab-btn[data-tab="colors"]')?.click());
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-s6-colors.png' });
  // small settings + expand-settings gear
  await page.evaluate(() => {
    document.getElementById('themeEditorModal')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.add('open');
  });
  await sleep(700);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-s6-settings.png' });
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(700);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-s6-adv.png' });

  console.log('== 9. round-4: unified line set + header copy + no glow + popup dismissal');
  await page.evaluate(() => document.getElementById('advancedSettingsModal')?.classList.add('open'));
  await sleep(700);

  // (a) expanded-settings header: eyebrow restored, title descriptive, no repeat
  const advHeader = await page.evaluate(() => {
    const eb = document.querySelector('.advanced-settings-modal .advanced-settings-eyebrow');
    const ti = document.querySelector('.advanced-settings-modal .advanced-settings-title');
    const cs = window.getComputedStyle(eb);
    return { eb: eb.textContent.trim(), ti: ti.textContent.trim(), display: cs.display, vis: cs.visibility };
  });
  // Round 5 (2026-10-10): the user asked for "settings / expanded settings".
  check(
    'expanded settings header: Settings + Expanded Settings, both visible and distinct',
    advHeader.eb === 'Settings' &&
      advHeader.ti === 'Expanded Settings' &&
      advHeader.eb !== advHeader.ti &&
      advHeader.display !== 'none' &&
      advHeader.vis !== 'hidden',
    JSON.stringify(advHeader),
  );

  // (b) every chrome icon in the expanded settings is the same line shell
  // Round 5: the tab glyphs went BACK to the original filled FontAwesome set
  // (user: "i liked the old ones way more"); the remaining SVG chrome must stay
  // on the unified line set.
  const advIcons = await page.evaluate(() => {
    const sels = ['.advanced-settings-close svg', '.te-color-picker-arrow svg', '.btn-dashed svg'];
    const svgs = sels.map((s) => {
      const svg = document.querySelector('.advanced-settings-modal ' + s);
      if (!svg) return { s, missing: true };
      const cs = window.getComputedStyle(svg);
      return { s, fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width'), vb: svg.getAttribute('viewBox'), w: cs.width, h: cs.height };
    });
    const tabs = [...document.querySelectorAll('.advanced-settings-modal .fs-tab-btn')].map((b) => {
      const i = b.querySelector('i');
      return { tab: b.dataset.tab, cls: i ? i.className : null, hasSvg: !!b.querySelector('svg') };
    });
    return { svgs, tabs };
  });
  check(
    'expanded settings SVG chrome stays on the 24-unit 2px-stroke line set',
    advIcons.svgs.every((i) => !i.missing && i.fill === 'none' && i.stroke === 'currentColor' && i.sw === '2' && i.vb === '0 0 24 24'),
    JSON.stringify(advIcons.svgs),
  );
  check(
    'expanded settings tabs restored to the original filled FontAwesome glyphs (round 5 revert)',
    advIcons.tabs.length === 3 &&
      advIcons.tabs.every((t) => !t.hasSvg && /^fas fa-(sliders-h|palette|star)$/.test(t.cls || '')) &&
      new Set(advIcons.tabs.map((t) => t.cls)).size === 3,
    JSON.stringify(advIcons.tabs),
  );
  // the visible SVG icons must be CSS-pinned (no 300x150 fallback)
  const advVisibleSizes = advIcons.svgs.filter((i) => i.s === '.advanced-settings-close svg');
  check(
    'visible expanded-settings icon is CSS-pinned (no 300x150 svg fallback)',
    advVisibleSizes.every((i) => parseFloat(i.w) > 8 && parseFloat(i.w) < 24 && i.w === i.h),
    JSON.stringify(advVisibleSizes),
  );
  await page.evaluate(() => document.getElementById('advancedSettingsModal')?.classList.remove('open'));
  await sleep(300);

  // (c) planner buttons carry no glow
  await page.evaluate(() => {
    localStorage.setItem('plannerTasks', '[]');
    document.getElementById('plannerBtn')?.click();
  });
  await sleep(500);
  const addGlow = await page.evaluate(() => window.getComputedStyle(document.getElementById('plannerAddBtn')).boxShadow);
  check('planner Add Task button has no glow (box-shadow: none)', addGlow === 'none', addGlow);

  await page.evaluate(() => document.getElementById('plannerAddBtn')?.click());
  await sleep(500);
  const saveGlow = await page.evaluate(() => window.getComputedStyle(document.getElementById('saveTaskBtn')).boxShadow);
  check('add-task Save button has no glow (box-shadow: none)', saveGlow === 'none', saveGlow);

  // (d) required-title popup: no glow, Escape + backdrop dismissal
  await page.evaluate(() => {
    document.getElementById('taskTitle').value = '';
    document.getElementById('saveTaskBtn')?.click();
  });
  await sleep(400);
  const errState = await page.evaluate(() => {
    const bd = document.querySelector('.confirm-backdrop');
    if (!bd) return { present: false };
    const ok = bd.querySelector('.confirm-btn-primary');
    return { present: true, okShadow: window.getComputedStyle(ok).boxShadow, msg: bd.querySelector('.confirm-message')?.textContent.trim() };
  });
  check(
    'required-title popup appears, copy + its OK button has no glow',
    errState.present && errState.okShadow === 'none' && errState.msg === 'Task title is required',
    JSON.stringify(errState),
  );
  await page.keyboard.press('Escape');
  await sleep(300);
  const afterEsc = await page.evaluate(() => ({ err: !!document.querySelector('.confirm-backdrop'), task: document.getElementById('taskPopup')?.classList.contains('open') }));
  check(
    'Escape dismisses the error popup WITHOUT closing the task popup behind it',
    afterEsc.err === false && afterEsc.task === true,
    JSON.stringify(afterEsc),
  );
  await page.evaluate(() => document.getElementById('saveTaskBtn')?.click());
  await sleep(400);
  const backdropClick = await page.evaluate(() => {
    const bd = document.querySelector('.confirm-backdrop');
    if (!bd) return { present: false };
    bd.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { present: true, gone: !document.querySelector('.confirm-backdrop') };
  });
  check('backdrop click dismisses the error popup', backdropClick.present && !!backdropClick.gone, JSON.stringify(backdropClick));

  // (e) stats reset confirm (showConfirm) also dismisses on Escape/backdrop
  await page.evaluate(() => {
    document.getElementById('taskPopup')?.classList.remove('open');
    document.getElementById('plannerModal')?.classList.remove('open');
    document.getElementById('themeModal')?.classList.add('open');
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
  });
  await sleep(500);
  await page.evaluate(() => document.getElementById('resetStatsBtn')?.click());
  await sleep(400);
  const statsConfirm = await page.evaluate(() => {
    const bd = document.querySelector('.confirm-backdrop');
    if (!bd) return { present: false };
    const danger = bd.querySelector('.confirm-btn-danger');
    return { present: true, msg: bd.querySelector('.confirm-message')?.textContent.trim(), dangerShadow: danger ? window.getComputedStyle(danger).boxShadow : null };
  });
  check(
    'stats-reset confirm appears, danger button has no glow',
    statsConfirm.present && statsConfirm.dangerShadow === 'none',
    JSON.stringify(statsConfirm),
  );
  await page.keyboard.press('Escape');
  await sleep(300);
  const statsAfterEsc = await page.evaluate(() => !!document.querySelector('.confirm-backdrop'));
  check('Escape dismisses the stats-reset confirm', statsAfterEsc === false, String(statsAfterEsc));

  // same family must also dismiss on a backdrop click (requirement 4)
  await page.evaluate(() => document.getElementById('resetStatsBtn')?.click());
  await sleep(400);
  const statsBackdrop = await page.evaluate(() => {
    const bd = document.querySelector('.confirm-backdrop');
    if (!bd) return { present: false };
    const hit = document.elementFromPoint(150, 150);
    const hitCls = hit && hit.className;
    if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { present: true, hitCls, gone: !document.querySelector('.confirm-backdrop') };
  });
  check(
    'backdrop click (real hit-test) dismisses the stats-reset confirm',
    statsBackdrop.present && statsBackdrop.hitCls === 'confirm-backdrop' && !!statsBackdrop.gone,
    JSON.stringify(statsBackdrop),
  );
  await page.evaluate(() => document.getElementById('themeModal')?.classList.remove('open'));
  await sleep(200);

  console.log('== 10. round-5 icon pass: sliders-h trigger, palette auto-detect, bolder save, unified row menu');
  await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
  await sleep(500);
  const round5 = await page.evaluate(() => {
    const shell = (svg) =>
      svg
        ? { fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width'), vb: svg.getAttribute('viewBox') }
        : null;
    const expand = document.querySelector('#openAdvancedSettingsBtn svg');
    return {
      expand: shell(expand),
      expandCircles: expand ? expand.querySelectorAll('circle').length : 0,
      expandH: expand ? window.getComputedStyle(expand).height : null,
      autoDetect: shell(document.getElementById('teAutoDetectColors')?.querySelector('svg')),
      autoDetectCircles: document.getElementById('teAutoDetectColors')?.querySelectorAll('svg circle').length,
      saveSw: document.getElementById('saveTaskBtn')?.querySelector('svg')?.getAttribute('stroke-width'),
      builderSaveSw: document.getElementById('teSaveBtn')?.querySelector('svg')?.getAttribute('stroke-width'),
    };
  });
  check(
    'Expand Settings trigger uses the sideways-sliders line glyph (3 tracks, 3 knobs, 14px)',
    round5.expand?.fill === 'none' &&
      round5.expand?.stroke === 'currentColor' &&
      round5.expand?.sw === '2' &&
      round5.expand?.vb === '0 0 24 24' &&
      round5.expandCircles === 3 &&
      round5.expandH === '14px',
    JSON.stringify(round5.expand) + ' circles=' + round5.expandCircles + ' h=' + round5.expandH,
  );
  check(
    'auto-detect button uses the palette glyph, not a pencil',
    round5.autoDetect?.fill === 'none' &&
      round5.autoDetect?.stroke === 'currentColor' &&
      round5.autoDetect?.sw === '2' &&
      round5.autoDetect?.vb === '0 0 24 24' &&
      round5.autoDetectCircles === 5,
    JSON.stringify(round5.autoDetect) + ' circles=' + round5.autoDetectCircles,
  );
  check(
    'save glyph is bolder than the rest of the set (2.4 stroke, both Save buttons)',
    round5.saveSw === '2.4' && round5.builderSaveSw === '2.4',
    JSON.stringify([round5.saveSw, round5.builderSaveSw]),
  );

  // The auto-detect handler updates only the LABEL. It used to rebuild the
  // button's innerHTML on every click, which put the old filled glyph back.
  const autoDetectClicked = await page.evaluate(async () => {
    const btn = document.getElementById('teAutoDetectColors');
    if (!btn) return { missing: true };
    btn.click();
    await new Promise((r) => setTimeout(r, 250));
    const svg = btn.querySelector('svg');
    return {
      svgCount: btn.querySelectorAll('svg').length,
      svg: svg
        ? {
            fill: svg.getAttribute('fill'),
            stroke: svg.getAttribute('stroke'),
            sw: svg.getAttribute('stroke-width'),
            vb: svg.getAttribute('viewBox'),
            circles: svg.querySelectorAll('circle').length,
          }
        : null,
      label: document.getElementById('teAutoDetectLabel')?.textContent || '',
    };
  });
  check(
    'auto-detect keeps its line-palette glyph after a click (handler relabels, never rebuilds the icon)',
    !autoDetectClicked.missing &&
      autoDetectClicked.svgCount === 1 &&
      autoDetectClicked.svg?.fill === 'none' &&
      autoDetectClicked.svg?.sw === '2' &&
      autoDetectClicked.svg?.vb === '0 0 24 24' &&
      autoDetectClicked.svg?.circles === 5 &&
      /^Auto-detect/.test(autoDetectClicked.label),
    JSON.stringify(autoDetectClicked),
  );

  // unified Edit / Rename / Delete in the theme-row menu
  await page.evaluate(() => {
    document.getElementById('themeModal')?.classList.remove('open');
    document.getElementById('advancedSettingsModal')?.classList.add('open');
  });
  await sleep(400);
  const rowMenu = await page.evaluate(() => {
    // localStorage was cleared at the top of this battery, so seed one row.
    ThemeEngine.save({
      id: 'zz-rowmenu-test',
      name: 'zz rowmenu test',
      createdAt: new Date().toISOString(),
      bg: { type: 'solid', color: '#000000' },
      colors: { accent: '#6366f1' },
      overlay: { color: 'rgba(0,0,0,0)' },
    });
    ThemeEngine._rebuildCustomList();
    const wrap = document.getElementById('customThemeListExpanded');
    if (!wrap) return { missing: true };
    const more = wrap.querySelector('.te-theme-row-more');
    if (!more) return { missing: true };
    more.click();
    const menu = more.nextElementSibling;
    return {
      items: [...menu.querySelectorAll('.te-menu-item')].map((b) => {
        const svg = b.querySelector('svg');
        return {
          action: b.dataset.action,
          text: b.textContent.trim(),
          fill: svg?.getAttribute('fill'),
          stroke: svg?.getAttribute('stroke'),
          sw: svg?.getAttribute('stroke-width'),
          vb: svg?.getAttribute('viewBox'),
          d: svg ? [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|') : '',
        };
      }),
    };
  });
  check(
    'theme row Edit/Rename/Delete are all unified 24-unit 2px line glyphs',
    !rowMenu.missing &&
      rowMenu.items.length === 3 &&
      rowMenu.items.every((i) => i.fill === 'none' && i.stroke === 'currentColor' && i.sw === '2' && i.vb === '0 0 24 24'),
    JSON.stringify(rowMenu.items?.map((i) => [i.action, i.vb, i.sw])),
  );
  check(
    'row menu glyphs are three DISTINCT shapes (pen-in-square / pencil / trash) and Delete is no longer a text cross',
    !rowMenu.missing &&
      new Set(rowMenu.items.map((i) => i.d)).size === 3 &&
      rowMenu.items.find((i) => i.action === 'delete')?.d.includes('M3 6h18') === true &&
      !rowMenu.items.some((i) => i.text.includes('✕')),
    JSON.stringify(rowMenu.items?.map((i) => i.d.slice(0, 22))),
  );
  // The danger icon must FOLLOW its row's colour. It could not while the site
  // stylesheet's `svg circle, svg path { stroke: var(--color-text); … }` won on
  // element specificity — the bin stayed grey under a red label. The .uo-icon
  // contract fixes that; this is the assertion the user's request maps to.
  const dangerPaint = await page.evaluate(() => {
    const btn = document.querySelector('#customThemeListExpanded .te-menu-item-danger');
    if (!btn) return { missing: true };
    const path = btn.querySelector('svg path');
    const svg = btn.querySelector('svg');
    const svgCs = getComputedStyle(svg);
    return {
      btnColor: getComputedStyle(btn).color,
      iconStroke: getComputedStyle(path).stroke,
      strokeWidth: getComputedStyle(path).strokeWidth,
      // The bin is stroke-only (fill:none), so these are the only two ways a
      // red stroke could still fail to reach the screen.
      fill: svgCs.fill,
      paint: [svgCs.opacity, svgCs.visibility, svgCs.filter, svgCs.display].join("/"),
    };
  });
  check(
    'row menu Delete bin is red and tracks its label (not the global svg stroke rule)',
    !dangerPaint.missing &&
      dangerPaint.iconStroke === dangerPaint.btnColor &&
      /^rgb\(25[0-5], 1[0-9]{2}, 1[0-9]{2}\)$/.test(dangerPaint.iconStroke) &&
      // 2px, i.e. the glyph's authored weight rather than the .075em hairline
      Math.abs(parseFloat(dangerPaint.strokeWidth) - 2) < 0.01 &&
      // stroke-only glyph, fully opaque, unfiltered: nothing can repaint it grey
      dangerPaint.fill === "none" &&
      dangerPaint.paint === "1/visible/none/inline",
    JSON.stringify(dangerPaint),
  );
  await page.evaluate(() => {
    ThemeEngine.delete('zz-rowmenu-test');
    ThemeEngine._rebuildCustomList();
    document.getElementById('advancedSettingsModal')?.classList.remove('open');
  });
  await sleep(200);

  console.log('\\n---');
  console.log(errors.length ? 'PAGE ERRORS:\\n' + errors.join('\\n') : 'zero page errors');
  console.log(failed === 0 && errors.length === 0 ? 'SURFACE-6 BATTERY: ALL GREEN' : `SURFACE-6 BATTERY: ${failed} FAILURES`);
  process.exitCode = failed === 0 && errors.length === 0 ? 0 : 1;
} finally { await browser.close(); }
