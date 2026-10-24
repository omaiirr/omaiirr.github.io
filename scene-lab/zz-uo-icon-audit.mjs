// zz-uo-icon-audit.mjs — live read of every icon slot the user flagged, plus the untouched 7/8 anchors.
// Reads artwork attributes and layout positions straight from the rendered DOM so I can confirm:
//  - small-settings palette (screenshot 1)
//  - auto-detect (screenshot 2)
//  - editor tabs bg/colors/overlay (screenshot 5)
//  - footer menu preview/export/import (screenshot 6)
//  - row edit/rename/delete (screenshot 4)
//  - expand-settings gear (screenshot 3, unchanged slot)
//  - untouched anchors: analytics button + expanded-settings tabs (screenshots 7/8)
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

  // Seed a custom theme + active so the small-settings palette row + badge are real.
  await page.evaluate(() => {
    try {
      ThemeEngine.save({ id: 'ct_audit', name: 'ZZ Audit', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      ThemeEngine.activate('ct_audit');
    } catch (e) { /* ignore */ }
  });
  await sleep(300);

  // small settings modal open (screenshot 1 + 2 anchors)
  await page.evaluate(() => document.getElementById('themeModal')?.classList.add('open'));
  await sleep(500);
  await page.evaluate(() => document.querySelector('.settings-tab-btn[data-tab="themes"]')?.click());
  await sleep(300);

  const smallSettings = await page.evaluate(() => {
    const badge = document.getElementById('customThemeActiveBadge');
    const autoDetect = document.getElementById('teAutoDetectColors');
    const swatchSvg = badge?.querySelector('svg');
    const adSvg = autoDetect?.querySelector('svg');
    const adStyle = adSvg ? window.getComputedStyle(adSvg) : null;
    const adRect = adSvg ? adSvg.getBoundingClientRect() : null;
    const adBtn = autoDetect?.getBoundingClientRect();
    return {
      badgeSvg: swatchSvg ? { w: swatchSvg.getAttribute('width'), h: swatchSvg.getAttribute('height'), viewBox: swatchSvg.getAttribute('viewBox'), fill: swatchSvg.getAttribute('fill'), stroke: swatchSvg.getAttribute('stroke'), paths: swatchSvg.querySelectorAll('path').length } : null,
      badgeDisplay: badge ? window.getComputedStyle(badge).display : null,
      autoDetectSvg: adSvg ? { w: adSvg.getAttribute('width'), h: adSvg.getAttribute('height'), viewBox: adSvg.getAttribute('viewBox'), fill: adSvg.getAttribute('fill'), stroke: adSvg.getAttribute('stroke') } : null,
      autoDetectComputed: adStyle ? { width: adStyle.width, height: adStyle.height, display: adStyle.display, verticalAlign: adStyle.verticalAlign, marginRight: adStyle.marginRight } : null,
      autoDetectBtn: adBtn ? { top: adBtn.top.toFixed(1), height: adBtn.height.toFixed(1), left: adBtn.left.toFixed(1), width: adBtn.width.toFixed(1) } : null,
      autoDetectSvgRect: adRect ? { x: adRect.x.toFixed(1), y: adRect.y.toFixed(1), width: adRect.width.toFixed(1), height: adRect.height.toFixed(1), top: adRect.top.toFixed(1) } : null,
    };
  });

  // editor modal (screenshot 5 + 6)
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.add('open'));
  await sleep(700);

  const editor = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.te-tab-btn')].map((b) => {
      const svg = b.querySelector('svg');
      return { tab: b.dataset.tab, svg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width') } : null, text: (b.childNodes[b.childNodes.length - 1]?.textContent || '').trim() };
    });
    const menuItems = [...document.querySelectorAll('.te-footer-menu .te-menu-item')].map((it) => {
      const svg = it.querySelector('svg');
      const r = svg?.getBoundingClientRect();
      const cs = svg ? window.getComputedStyle(svg) : null;
      return { id: it.id, text: (it.childNodes[it.childNodes.length - 1]?.textContent || '').trim(), svg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width'), hasStyle: svg.outerHTML.includes('style=') } : null, css: cs ? { width: cs.width, height: cs.height, verticalAlign: cs.verticalAlign, marginRight: cs.marginRight } : null, rect: r ? { x: r.x.toFixed(1), y: r.y.toFixed(1), width: r.width.toFixed(1), height: r.height.toFixed(1), top: r.top.toFixed(1), left: r.left.toFixed(1), right: r.right.toFixed(1) } : null };
    });
    const moreBtn = document.getElementById('teMoreBtn');
    const moreRect = moreBtn?.getBoundingClientRect();
    const menu = document.getElementById('teFooterMenu');
    const menuRect = menu?.getBoundingClientRect();
    const menuOpen = menu?.classList.contains('open');
    return { tabs, menuItems, moreBtnRect: moreRect ? { top: moreRect.top.toFixed(1), left: moreRect.left.toFixed(1), width: moreRect.width.toFixed(1), height: moreRect.height.toFixed(1) } : null, menuRect: menuRect ? { top: menuRect.top.toFixed(1), left: menuRect.left.toFixed(1), width: menuRect.width.toFixed(1), height: menuRect.height.toFixed(1) } : null, menuOpen };
  });

  // row menu (screenshot 4)
  await page.evaluate(() => document.querySelector('.te-theme-row-more')?.click());
  await sleep(350);

  const rowMenu = await page.evaluate(() => {
    const menu = document.querySelector('.te-theme-row-menu.open');
    const items = [...(menu?.querySelectorAll('.te-menu-item') || [])].map((it) => {
      const svg = it.querySelector('svg');
      return { action: it.dataset.action, text: (it.childNodes[it.childNodes.length - 1]?.textContent || '').trim(), svg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), head: svg.outerHTML.slice(0, 200) } : null };
    });
    return { open: !!menu, items };
  });

  // expand settings (screenshot 3 anchor: gear slot unchanged)
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(700);

  const adv = await page.evaluate(() => {
    const btn = document.getElementById('openAdvancedSettingsBtn');
    const svg = btn?.querySelector('svg');
    const cs = svg ? window.getComputedStyle(svg) : null;
    return {
      gearSvg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), strokeLinecap: svg.getAttribute('stroke-linecap'), strokeLinejoin: svg.getAttribute('stroke-linejoin') } : null,
      gearCss: cs ? { width: cs.width, height: cs.height, display: cs.display } : null,
      btnText: (btn?.childNodes[btn.childNodes.length - 1]?.textContent || '').trim(),
    };
  });

  // analytics button anchor (screenshot 7, untouched)
  await page.evaluate(() => {
    const advModal = document.getElementById('advancedSettingsModal');
    if (advModal) advModal.classList.remove('open');
  });
  await sleep(300);
  await page.evaluate(() => document.getElementById('themeModal')?.classList.remove('open'));
  await sleep(300);
  await page.evaluate(() => document.getElementById('themeEditorModal')?.classList.remove('open'));
  await sleep(300);

  const analyticsBtn = await page.evaluate(() => {
    const btn = document.getElementById('openStatsModalBtn');
    const svg = btn?.querySelector('svg');
    return { present: !!btn, text: (btn?.childNodes[btn.childNodes.length - 1]?.textContent || '').trim(), svg: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), fill: svg.getAttribute('fill'), stroke: svg.getAttribute('stroke'), sw: svg.getAttribute('stroke-width') } : null };
  });

  // expanded-settings tabs anchor (screenshot 8, untouched)
  await page.evaluate(() => document.getElementById('openAdvancedSettingsBtn')?.click());
  await sleep(700);

  const fsTabs = await page.evaluate(() => {
    return [...document.querySelectorAll('.fs-tab-btn')].map((b) => ({
      tab: b.dataset.tab,
      iconClass: b.querySelector('i')?.className,
      text: (b.childNodes[b.childNodes.length - 1]?.textContent || '').trim(),
    }));
  });

  console.log('--- small settings (screenshots 1 & 2) ---');
  console.log(JSON.stringify(smallSettings, null, 2));
  console.log('--- editor (screenshots 5 & 6) ---');
  console.log(JSON.stringify(editor, null, 2));
  console.log('--- row menu (screenshot 4) ---');
  console.log(JSON.stringify(rowMenu, null, 2));
  console.log('--- expand settings gear anchor (screenshot 3 slot) ---');
  console.log(JSON.stringify(adv, null, 2));
  console.log('--- analytics button anchor (screenshot 7, untouched) ---');
  console.log(JSON.stringify(analyticsBtn, null, 2));
  console.log('--- expanded-settings tabs anchor (screenshot 8, untouched) ---');
  console.log(JSON.stringify(fsTabs, null, 2));

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'zero page errors');
} finally {
  await browser.close();
}
