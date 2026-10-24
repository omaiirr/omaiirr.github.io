// zz-uo-s3-run.mjs — surface 3 (system popups) overhaul battery (throwaway).
// Covers both dialog families: .confirm-* (timer.js showConfirm + task-title
// error) and .te-confirm-* (theme-engine _showAlert/_promptAction/
// _confirmAction/_choiceAction). Asserts shell tokens, preserved behavior
// (close mechanics, stacking, alignment, per-family spacing), then takes
// AFTER shots.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + String(detail).slice(0, 140) + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  const isNoise = (t) => /downloadable font/i.test(t) || /Cross-Origin Request Blocked/i.test(t) || /cdnjs\.cloudflare/i.test(t);
  page.on('pageerror', (e) => { if (!isNoise(e.message)) errors.push(e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m.text()) && !/thumbnail failed: ornate/i.test(m.text()))
      errors.push(m.text());
  });

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
  const dlgOpen = () => page.evaluate(() => ({
    confirm: !!document.querySelector('.confirm-backdrop'),
    te: !!document.querySelector('.te-confirm-backdrop'),
  }));
  const listNames = () => page.evaluate(() => ThemeEngine.list().map((t) => t.name));
  const ensureSettingsTab = async () => {
    await page.evaluate(() => document.querySelector('.settings-tab-btn')?.click());
    await sleep(300);
  };
  const ensureThemeModal = async () => {
    const st = await page.evaluate(() => ({
      open: document.getElementById('themeModal').classList.contains('open'),
    }));
    if (!st.open) {
      await page.evaluate(() => document.getElementById('themeModal').classList.add('open'));
      await sleep(350);
    }
    await ensureSettingsTab();
  };

  console.log('== 1. statistics reset confirm (.confirm-* shell)');
  await page.evaluate(() => {
    document.getElementById('themeModal').classList.add('open');
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
  });
  await sleep(400);
  await click('#resetStatsBtn');
  await sleep(500);
  let st = await page.evaluate(() => {
    const card = document.querySelector('.confirm-card');
    if (!card) return null;
    const bd = document.querySelector('.confirm-backdrop');
    const pri = document.querySelector('.confirm-btn-danger, .confirm-btn-primary');
    const can = document.querySelector('.confirm-btn-cancel');
    const act = document.querySelector('.confirm-actions');
    const cs = getComputedStyle(card);
    const ps = getComputedStyle(pri);
    return {
      radius: cs.borderRadius, width: cs.width, align: cs.textAlign,
      z: getComputedStyle(bd).zIndex,
      priCls: pri.className, priRadius: ps.borderRadius, priPad: ps.padding,
      priTrans: ps.transitionProperty + ' | ' + ps.transitionDuration,
      priColor: ps.color, priShadow: ps.boxShadow, priBgImg: ps.backgroundImage,
      canRadius: getComputedStyle(can).borderRadius,
      gap: getComputedStyle(act).gap,
    };
  });
  check('reset confirm opens', !!st, 'dialog missing');
  check('card radius 18px (--uo-radius-lg)', st?.radius === '18px', st?.radius);
  check('card width 360 + centered text (original)', st?.width === '360px' && st?.align === 'center', JSON.stringify([st?.width, st?.align]));
  check('backdrop z-index 99999 preserved', st?.z === '99999', st?.z);
  check('both buttons radius 9px (--uo-radius-sm)', st?.priRadius === '9px' && st?.canRadius === '9px', JSON.stringify([st?.priRadius, st?.canRadius]));
  check('primary padding 8px 16px (original)', st?.priPad === '8px 16px', st?.priPad);
  check('springy transition (transform 0.18s)', /transform/.test(st?.priTrans || '') && /0\.18s/.test(st?.priTrans || ''), st?.priTrans);
  check('actions gap 10px (original)', st?.gap === '10px', st?.gap);
  // v2 (planner-v3 language): destructive confirms get the danger variant
  check('destructive confirm uses .confirm-btn-danger (v2)', st?.priCls === 'confirm-btn-danger', st?.priCls);
  // round 4 (2026-10-10): the button glow was removed by request, so the red
  // is asserted on the fill now, not on a halo — and the halo must be gone.
  check(
    'danger button is red (white label) + NO glow (round 4)',
    st?.priColor === 'rgb(255, 255, 255)' && /248, 113, 113/.test(st?.priBgImg || '') && st?.priShadow === 'none',
    JSON.stringify([st?.priColor, (st?.priBgImg || '').slice(0, 70), st?.priShadow]),
  );

  await page.keyboard.press('Escape');
  await sleep(300);
  st = await dlgOpen();
  check('ESC closes', !st.confirm, JSON.stringify(st));

  await click('#resetStatsBtn');
  await sleep(400);
  await page.mouse.click(20, 20);
  await sleep(300);
  st = await dlgOpen();
  check('backdrop click closes', !st.confirm, JSON.stringify(st));

  await click('#resetStatsBtn');
  await sleep(400);
  await page.evaluate(() => document.querySelector('.confirm-btn-cancel')?.click());
  await sleep(300);
  st = await dlgOpen();
  check('Cancel closes', !st.confirm, JSON.stringify(st));

  // restore the before-shot context (statistics tab panel may have been
  // closed by the ESC test above) so the gate pair matches framing
  await page.evaluate(() => {
    document.getElementById('themeModal').classList.add('open');
    document.querySelector('.settings-tab-btn[data-tab="statistics"]')?.click();
  });
  await sleep(400);
  await click('#resetStatsBtn');
  await sleep(500);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-confirm.png' });
  await page.evaluate(() => document.querySelector('.confirm-actions .confirm-btn-danger, .confirm-actions .confirm-btn-primary')?.click());
  await sleep(300);
  st = await dlgOpen();
  check('primary Reset closes + runs action', !st.confirm, JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(250);
  await page.keyboard.press('Escape');
  await sleep(350);

  console.log('== 2. task-title error modal (same .confirm-* shell)');
  await click('#plannerBtn');
  await sleep(600);
  await click('#plannerAddBtn');
  await sleep(500);
  await click('#saveTaskBtn');
  await sleep(400);
  st = await page.evaluate(() => {
    const msg = document.querySelector('.confirm-message')?.textContent;
    const btns = [...document.querySelectorAll('.confirm-actions button')];
    return { msg, n: btns.length, texts: btns.map((b) => b.textContent) };
  });
  check(
    'error modal: "Task title is required" + single OK',
    st?.msg === 'Task title is required' && st?.n === 1 && st?.texts[0] === 'OK',
    JSON.stringify(st),
  );
  await page.screenshot({ path: 'scene-lab/zz-uo-after-error.png' });
  await page.evaluate(() => document.querySelector('.confirm-actions .confirm-btn-danger, .confirm-actions .confirm-btn-primary')?.click());
  await sleep(300);
  st = await dlgOpen();
  check('OK closes error modal', !st.confirm, JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(250);
  await page.keyboard.press('Escape');
  await sleep(350);

  console.log('== 3. te shell — rename prompt (_promptAction)');
  const created = await page.evaluate(() => {
    try {
      const r = ThemeEngine.save({ id: 'ct_probe', name: 'ZZ Gate3 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
      ThemeEngine._rebuildCustomList();
      return r ? 'ok' : 'null';
    } catch (e) { return 'ERR ' + e.message; }
  });
  check('probe theme created', created === 'ok', created);
  await ensureThemeModal();
  await click('.te-theme-row-more');
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="rename"]')?.click());
  await sleep(450);
  st = await page.evaluate(() => {
    const bd = document.querySelector('.te-confirm-backdrop');
    if (!bd) return null;
    const card = bd.querySelector('.te-confirm-card');
    const btn = bd.querySelector('.te-confirm-btn');
    const cs = getComputedStyle(card);
    const bs = getComputedStyle(btn);
    return {
      z: getComputedStyle(bd).zIndex,
      radius: cs.borderRadius, width: cs.width, align: cs.textAlign,
      btnRadius: bs.borderRadius, btnPad: bs.padding,
      trans: bs.transitionProperty + ' | ' + bs.transitionDuration,
      gap: getComputedStyle(bd.querySelector('.te-confirm-actions')).gap,
      hasInput: !!bd.querySelector('input'),
      title: bd.querySelector('.te-confirm-title')?.textContent,
    };
  });
  check('rename prompt opens (title + input)', !!st && st.hasInput && st.title === 'Rename theme', JSON.stringify(st));
  check('te card radius 18px (shared shell token)', st?.radius === '18px', st?.radius);
  check('te card width 360 (original)', st?.width === '360px', st?.width);
  check('te backdrop z-index 20001 preserved', st?.z === '20001', st?.z);
  check('te left alignment (original)', st?.align === 'start', st?.align);
  check('te btn radius 9px + padding 8px 12px (original)', st?.btnRadius === '9px' && st?.btnPad === '8px 12px', JSON.stringify([st?.btnRadius, st?.btnPad]));
  check('te btn springy transition (transform 0.18s)', /transform/.test(st?.trans || '') && /0\.18s/.test(st?.trans || ''), st?.trans);
  check('te actions gap 8px (original)', st?.gap === '8px', st?.gap);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-teprompt.png' });

  await page.keyboard.press('Escape');
  await sleep(300);
  st = await dlgOpen();
  check('ESC closes prompt', !st.te, JSON.stringify(st));

  await ensureThemeModal();
  await click('.te-theme-row-more');
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="rename"]')?.click());
  await sleep(400);
  await page.evaluate(() => { document.querySelector('.te-confirm-card input').value = 'ZZ Gate3 Renamed'; });
  await page.evaluate(() => document.querySelector('.te-confirm-btn.primary')?.click());
  await sleep(400);
  let names = await listNames();
  check('rename applies', names.includes('ZZ Gate3 Renamed') && !names.includes('ZZ Gate3 Probe'), JSON.stringify(names));
  st = await dlgOpen();
  check('prompt closed after rename', !st.te, JSON.stringify(st));

  console.log('== 4. delete confirm (_confirmAction)');
  await ensureThemeModal();
  await click('.te-theme-row-more');
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="delete"]')?.click());
  await sleep(450);
  st = await page.evaluate(() => {
    const bd = document.querySelector('.te-confirm-backdrop');
    if (!bd) return null;
    return {
      title: bd.querySelector('.te-confirm-title')?.textContent,
      btns: [...bd.querySelectorAll('.te-confirm-btn')].map((b) => b.textContent),
    };
  });
  check('delete dialog: "Delete theme?" + Cancel/Delete', st?.title === 'Delete theme?' && (st?.btns || []).join('|') === 'Cancel|Delete', JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(300);
  st = await dlgOpen();
  check('ESC does NOT close _confirmAction (pre-existing pin)', st.te, JSON.stringify(st));
  await page.mouse.click(20, 20);
  await sleep(300);
  st = await dlgOpen();
  check('backdrop click does NOT close _confirmAction (pre-existing pin)', st.te, JSON.stringify(st));
  await ensureThemeModal();
  await page.screenshot({ path: 'scene-lab/zz-uo-after-teconfirm.png' });
  await page.evaluate(() => document.querySelector('.te-confirm-btn:not(.primary)')?.click());
  await sleep(300);
  names = await listNames();
  check('Cancel keeps theme', names.includes('ZZ Gate3 Renamed'), JSON.stringify(names));

  await ensureThemeModal();
  await click('.te-theme-row-more');
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="delete"]')?.click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.te-confirm-btn.primary')?.click());
  await sleep(400);
  names = await listNames();
  check('Delete primary removes theme', !names.includes('ZZ Gate3 Renamed'), JSON.stringify(names));

  console.log('== 5. duplicate-name alert (_showAlert)');
  await page.evaluate(() => {
    ThemeEngine.save({ id: 'ct_probe', name: 'ZZ Gate3 Probe', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
    ThemeEngine.save({ id: 'ct_dup', name: 'ZZ Gate3 Dup', colors: { ...ThemeEngine.DEFAULTS }, bg: { type: 'solid' } });
    ThemeEngine._rebuildCustomList();
  });
  await ensureThemeModal();
  await click('.te-theme-row-more');
  await sleep(300);
  await page.evaluate(() => document.querySelector('.te-menu-item[data-action="rename"]')?.click());
  await sleep(400);
  await page.evaluate(() => { document.querySelector('.te-confirm-card input').value = 'ZZ Gate3 Dup'; });
  await page.evaluate(() => document.querySelector('.te-confirm-btn.primary')?.click());
  await sleep(450);
  st = await page.evaluate(() => {
    const bd = document.querySelector('.te-confirm-backdrop');
    if (!bd) return null;
    return {
      title: bd.querySelector('.te-confirm-title')?.textContent ?? null,
      body: bd.querySelector('.te-confirm-body')?.textContent || '',
      btns: [...bd.querySelectorAll('.te-confirm-btn')].map((b) => b.textContent),
    };
  });
  check(
    'alert: no title, duplicate-name message, single OK',
    st && !st.title && /already used/.test(st.body) && st.btns.length === 1 && st.btns[0] === 'OK',
    JSON.stringify(st),
  );
  await page.screenshot({ path: 'scene-lab/zz-uo-after-tealert.png' });
  await page.evaluate(() => document.querySelector('.te-confirm-btn.primary')?.click());
  await sleep(300);
  st = await dlgOpen();
  check('alert OK closes (prompt already gone)', !st.te, JSON.stringify(st));
  names = await listNames();
  check('duplicate rename rejected, both themes intact', names.includes('ZZ Gate3 Probe') && names.includes('ZZ Gate3 Dup'), JSON.stringify(names));

  console.log('== 6. import → choice (_choiceAction)');
  await click('#teImportBtn');
  await sleep(400);
  st = await dlgOpen();
  check('import prompt opens', st.te, JSON.stringify(st));
  const payload = await page.evaluate(() => {
    const p = { name: 'ZZ Imported', colors: { ...ThemeEngine.DEFAULTS } };
    return btoa(
      encodeURIComponent(JSON.stringify(p)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  });
  await page.evaluate((enc) => { document.querySelector('.te-confirm-card input').value = enc; }, payload);
  await page.evaluate(() => document.querySelector('.te-confirm-btn.primary')?.click());
  await sleep(500);
  st = await page.evaluate(() => {
    const bd = document.querySelector('.te-confirm-backdrop');
    if (!bd) return null;
    return {
      title: bd.querySelector('.te-confirm-title')?.textContent,
      btns: [...bd.querySelectorAll('.te-confirm-btn')].map((b) => b.textContent),
      hasPrimary: !!bd.querySelector('.te-confirm-btn.primary'),
    };
  });
  check(
    'choice dialog: "Import theme" + 2 buttons (primary marked)',
    st?.title === 'Import theme' && (st?.btns || []).length === 2 && st?.hasPrimary,
    JSON.stringify(st),
  );
  await page.screenshot({ path: 'scene-lab/zz-uo-after-techoice.png' });
  await page.evaluate(() => {
    [...document.querySelectorAll('.te-confirm-btn')].find((b) => /Save as new/.test(b.textContent))?.click();
  });
  await sleep(500);
  names = await listNames();
  check('choice pick saves imported theme', names.includes('ZZ Imported'), JSON.stringify(names));
  st = await dlgOpen();
  check('choice dialog closed after pick', !st.te, JSON.stringify(st));

  check('zero page errors', errors.length === 0, errors.join(' | '));
  console.log(failed ? `FAILURES: ${failed}` : 'ALL GREEN');
  process.exitCode = failed ? 1 : 0;
} finally {
  await browser.close();
}
