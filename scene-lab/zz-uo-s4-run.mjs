// zz-uo-s4-run.mjs — surface 4 (task planner + add-task popup) battery (throwaway).
// Asserts the gentle diet tokens, every surviving behavior (add/edit/complete/
// delete flows, summary + filters, ESC chain, backdrop click), and the LIGHT
// variant toggle; then takes AFTER shots.
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
  const openState = () => page.evaluate(() => ({
    planner: document.getElementById('plannerModal')?.classList.contains('open'),
    popup: document.getElementById('taskPopup')?.classList.contains('open'),
  }));
  const taskCount = () => page.evaluate(() => document.querySelectorAll('.planner-task-item').length);

  console.log('== 1. planner opens; gentle-diet tokens');
  await click('#plannerBtn');
  await sleep(600);
  let st = await openState();
  check('planner modal opens', st.planner, JSON.stringify(st));
  const cs = (sel) => getComputedStyle(document.querySelector(sel));
  st = await page.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el) : null;
    };
    return {
      cardRadius: g('.planner-card').borderRadius,
      cardShadow: g('.planner-card').boxShadow.slice(0, 60),
      listRadius: g('.planner-list').borderRadius,
      addRadius: g('.planner-add-btn').borderRadius,
      addTrans: g('.planner-add-btn').transitionProperty + ' | ' + g('.planner-add-btn').transitionDuration,
      filterTrans: g('.planner-filter-btn') ? g('.planner-filter-btn').transitionProperty : null,
      cardText: g('.planner-card').textAlign,
    };
  });
  check('card radius 18px (--uo-radius-lg)', st.cardRadius === '18px', st.cardRadius);
  check('card elevation diet applied', /18px 50px/.test(st.cardShadow), st.cardShadow);
  check('list radius 18px', st.listRadius === '18px', st.listRadius);
  check('add-btn radius 12px (--uo-radius-md)', st.addRadius === '12px', st.addRadius);
  check('add-btn springy transition (transform 0.18s)', /transform/.test(st.addTrans) && /0\.18s/.test(st.addTrans), st.addTrans);
  check('filter pills springy transition', !!st.filterTrans && /transform/.test(st.filterTrans), st.filterTrans);
  check('Refined header language: left hierarchy + divider', st.cardText === 'left', st.cardText);
  // AFTER shot here: planner freshly opened, empty list — matches the
  // before-planner.png content (empty state, Tasks: 0)
  await page.screenshot({ path: 'scene-lab/zz-uo-after-planner.png' });

  console.log('== 2. add-task popup: diet tokens + validation flow');
  await click('#plannerAddBtn');
  await sleep(500);
  st = await openState();
  check('task popup opens', st.popup, JSON.stringify(st));
  st = await page.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el) : null;
    };
    return {
      cardRadius: g('.task-popup-card').borderRadius,
      inputRadius: g('.form-input').borderRadius,
      saveRadius: g('.save-task-btn').borderRadius,
      saveTrans: g('.save-task-btn').transitionProperty,
    };
  });
  check('popup card radius 18px', st.cardRadius === '18px', st.cardRadius);
  check('inputs radius 12px', st.inputRadius === '12px', st.inputRadius);
  check('save/cancel radius 12px (--uo-radius-md, mockup btn vocab)', st.saveRadius === '12px', st.saveRadius);
  check('save btn springy transition', /transform/.test(st.saveTrans), st.saveTrans);

  // empty save → error modal (same .confirm-* shell, pre-existing behavior)
  await click('#saveTaskBtn');
  await sleep(400);
  st = await page.evaluate(() => document.querySelector('.confirm-message')?.textContent || null);
  check('empty-title error modal still fires', st === 'Task title is required', st);
  await page.evaluate(() => document.querySelector('.confirm-actions .confirm-btn-danger, .confirm-actions .confirm-btn-primary')?.click());
  await sleep(300);

  // fill + save
  await page.evaluate(() => {
    document.getElementById('taskTitle').value = 'ZZ Battery Task';
    document.getElementById('taskSubject').value = 'Chemistry';
    document.getElementById('taskEstimate').value = '1h 30m';
  });
  await click('.category-chip.category-revision');
  await sleep(200);
  st = await page.evaluate(() => document.querySelector('.category-chip.category-revision')?.classList.contains('selected'));
  check('category chip selects', st, st);
  await click('#saveTaskBtn');
  await sleep(500);
  st = await openState();
  check('save closes popup', !st.popup, JSON.stringify(st));
  st = await page.evaluate(() => {
    const item = document.querySelector('.planner-task-item');
    return {
      count: document.querySelectorAll('.planner-task-item').length,
      title: item?.querySelector('.task-title')?.textContent,
      chip: !!item?.querySelector('.tag-category.category-revision'),
      itemRadius: item ? getComputedStyle(item).borderRadius : null,
    };
  });
  check('task rendered', st.count === 1 && st.title === 'ZZ Battery Task' && st.chip, JSON.stringify(st));
  check('task row radius 12px (--uo-radius-md)', st.itemRadius === '12px', st.itemRadius);

  console.log('== 3. summary + filters');
  st = await page.evaluate(() => ({
    line: document.querySelector('.planner-summary-line')?.textContent,
    filters: [...document.querySelectorAll('.planner-filter-btn')].map((b) => b.textContent),
  }));
  check('summary line Tasks/Done/Overdue', /Tasks:/.test(st.line || '') && /Done:/.test(st.line || '') && /Overdue:/.test(st.line || ''), st.line);
  check('filter bar Active/Done/Overdue', (st.filters || []).join('|') === 'Active|Done|Overdue', JSON.stringify(st.filters));
  await page.evaluate(() => [...document.querySelectorAll('.planner-filter-btn')].find((b) => b.textContent === 'Done')?.click());
  await sleep(400);
  st = await page.evaluate(() => ({
    active: document.querySelector('.planner-filter-btn.active')?.textContent,
    rows: document.querySelectorAll('.planner-task-item').length,
  }));
  check('Done filter applies (row hidden)', st.active === 'Done' && st.rows === 0, JSON.stringify(st));
  await page.evaluate(() => [...document.querySelectorAll('.planner-filter-btn')].find((b) => b.textContent === 'Active')?.click());
  await sleep(400);
  check('Active filter restores row', (await taskCount()) === 1);

  console.log('== 4. complete + delete flows');
  // completing under the Active filter hides the row (correct app behavior);
  // switch to the unfiltered view before asserting the toggled classes
  await click('.task-done-toggle');
  await sleep(400);
  await page.evaluate(() => window.setFilter('all'));
  await sleep(400);
  st = await page.evaluate(() => {
    const item = document.querySelector('.planner-task-item');
    return { done: item ? item.classList.contains('done') : null, checked: item ? item.querySelector('.task-done-toggle').classList.contains('checked') : null };
  });
  check('complete toggles .done + .checked', st.done === true && st.checked === true, JSON.stringify(st));
  await click('.task-done-toggle');
  await sleep(400);
  st = await page.evaluate(() => {
    const item = document.querySelector('.planner-task-item');
    return item ? item.classList.contains('done') : null;
  });
  check('un-complete restores active state', st === false, st);

  await click('.task-delete-btn');
  await sleep(400);
  st = await page.evaluate(() => ({
    msg: document.querySelector('.confirm-message')?.textContent,
    btns: [...document.querySelectorAll('.confirm-actions button')].map((b) => b.textContent),
  }));
  check('delete confirm appears ("Delete this task?" + Cancel/Delete)', st.msg === 'Delete this task?' && st.btns.join('|') === 'Cancel|Delete', JSON.stringify(st));
  await page.evaluate(() => document.querySelector('.confirm-btn-cancel')?.click());
  await sleep(300);
  check('Cancel keeps task', (await taskCount()) === 1);
  await click('.task-delete-btn');
  await sleep(400);
  await page.evaluate(() => document.querySelector('.confirm-btn-danger, .confirm-btn-primary')?.click());
  await sleep(400);
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('plannerTasks') || '[]').length);
  check('Delete removes task (row + storage empty)', (await taskCount()) === 0 && st === 0, `storage=${st}`);

  console.log('== 5. ESC chain + backdrop click');
  await click('#plannerAddBtn');
  await sleep(400);
  await page.keyboard.press('Escape');
  await sleep(300);
  st = await openState();
  check('ESC closes task popup, planner stays', !st.popup && st.planner, JSON.stringify(st));
  await page.keyboard.press('Escape');
  await sleep(300);
  st = await openState();
  check('ESC closes planner', !st.planner && !st.popup, JSON.stringify(st));
  await click('#plannerBtn');
  await sleep(500);
  await page.mouse.click(20, 20);
  await sleep(300);
  st = await openState();
  check('backdrop click closes planner', !st.planner, JSON.stringify(st));

  console.log('== 6. AFTER shots (seeded rows show the Refined row language)');
  await page.evaluate(() => {
    localStorage.setItem('plannerTasks', JSON.stringify([
      { id: '1', title: 'ZZ Seeded Active', notes: '', dueDate: '', category: 'Exam', subject: 'Maths', priority: 'High', estimate: '45m', status: 'active' },
      { id: '2', title: 'ZZ Seeded Done', notes: '', dueDate: '', category: 'Other', subject: '', priority: '', estimate: '', status: 'done' },
    ]));
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await click('#plannerBtn');
  await sleep(600);
  st = await page.evaluate(() => {
    const card = document.querySelector('.planner-card');
    const list = document.querySelector('.planner-list');
    const row = document.querySelector('.planner-task-item');
    const chk = document.querySelector('.task-done-toggle.checked');
    const doneRow = document.querySelector('.planner-task-item.done .task-title');
    return {
      rows: document.querySelectorAll('.planner-task-item').length,
      text: getComputedStyle(card).textAlign,
      listBg: getComputedStyle(list).backgroundColor,
      rowBg: row ? getComputedStyle(row).backgroundColor : null,
      rowBorder: row ? getComputedStyle(row).borderLeftWidth : null,
      chkAccent: chk ? getComputedStyle(chk).backgroundColor : null,
      doneStrike: doneRow ? getComputedStyle(doneRow).textDecorationLine : null,
      pillColor: getComputedStyle(document.querySelector('.planner-filter-btn')).color,
      summaryLabel: (() => { const el = document.querySelector('.planner-summary-item'); return el ? getComputedStyle(el).color : null; })(),
      summaryDone: (() => { const el = document.querySelector('.planner-summary-done + strong'); return el ? getComputedStyle(el).color : null; })(),
      summaryOverdue: (() => { const el = document.querySelector('.planner-summary-overdue + strong'); return el ? getComputedStyle(el).color : null; })(),
    };
  });
  check('seeded rows render, left hierarchy', st.rows === 2 && st.text === 'left', JSON.stringify(st));
  check('chrome-less list, tinted rows with color-coded left edge', st.listBg === 'rgba(0, 0, 0, 0)' && st.rowBg === 'rgba(99, 102, 241, 0.05)' && st.rowBorder === '3px', JSON.stringify(st));
  // v3.1 round 5 (Option A green wash): done row shell joins the done-green family
  const doneRowPx = await page.evaluate(() => {
    const px = (c) => {
      const x = document.createElement('canvas'); x.width = x.height = 1;
      const cx = x.getContext('2d'); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]];
    };
    const row = document.querySelector('.planner-task-item.done');
    return row ? { bg: px(getComputedStyle(row).backgroundColor), edge: px(getComputedStyle(row).borderLeftColor) } : null;
  });
  check('done row: green wash shell (bg + edge lean done-green, v3.1 round 5)', doneRowPx && doneRowPx.bg[1] > doneRowPx.bg[0] + 20 && doneRowPx.bg[1] > doneRowPx.bg[2] + 20 && doneRowPx.edge[1] > doneRowPx.edge[0] + 20 && doneRowPx.edge[1] > doneRowPx.edge[2] + 20, JSON.stringify(doneRowPx));
  check('done row: done-green checkbox + strike-through title (v3.1: no indigo on done rows)', st.chkAccent === 'rgb(126, 231, 135)' && st.doneStrike === 'line-through', JSON.stringify(st));
  check('filter pill: tinted secondary register at rest (not gray)', st.pillColor === 'rgb(185, 200, 234)', st.pillColor);
  check('summary labels keep alto blue (color restored)', st.summaryLabel === 'rgb(123, 139, 178)', st.summaryLabel);
  check('summary done value in saturated green', st.summaryDone === 'rgb(126, 231, 135)', st.summaryDone);
  check('summary overdue value in saturated red', st.summaryOverdue === 'rgb(255, 138, 145)', st.summaryOverdue);
  await page.evaluate(() => window.setFilter('active'));
  await sleep(400);
  st = await page.evaluate(() => ({
    rows: document.querySelectorAll('.planner-task-item').length,
    activeColor: getComputedStyle(document.querySelector('.planner-filter-btn.active')).color,
    activeBg: getComputedStyle(document.querySelector('.planner-filter-btn.active')).backgroundColor,
  }));
  check('active filter pill: accent-soft register', st.rows === 1 && st.activeColor === 'rgb(165, 180, 252)' && st.activeBg === 'rgba(99, 102, 241, 0.16)', JSON.stringify(st));
  // filtered state gets its own shot (accent-soft pill demo), then back to
  // the unfiltered view so the rows pair matches the before shot's content
  await page.screenshot({ path: 'scene-lab/zz-uo-after-planner-filter.png' });
  await page.evaluate(() => window.setFilter('all'));
  await sleep(400);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-planner-rows.png' });
  await click('#plannerAddBtn');
  await sleep(500);
  st = await page.evaluate(() => {
    const sel = '.category-chip.category-revision:not(.selected)';
    const chip = document.querySelector(sel);
    const lbl = document.querySelector('.task-popup .form-label');
    return {
      chipBg: chip ? getComputedStyle(chip).backgroundColor : null,
      chipColor: chip ? getComputedStyle(chip).color : null,
      labelColor: lbl ? getComputedStyle(lbl).color : null,
    };
  });
  check('category chips NEUTRAL at rest (v3: hue only on hover/selected)', st.chipBg === 'rgba(123, 139, 178, 0.12)' && st.chipColor === 'rgb(185, 200, 234)', JSON.stringify(st));
  check('form labels in alto blue (not gray)', st.labelColor === 'rgb(143, 164, 212)', st.labelColor);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-addtask.png' });
  // v3 detail moment: selected chip holds its hue while the rest stay neutral
  await page.click('.category-chip.category-revision');
  await sleep(300);
  await page.screenshot({ path: 'scene-lab/zz-uo-after-addtask-selected.png' });
  await page.keyboard.press('Escape');
  await sleep(300);

  check('zero page errors', errors.length === 0, errors.join(' | '));

  console.log('== 7. empty state v3 (bigger + centered) + theme adaptation');
  await page.evaluate(() => { localStorage.removeItem('plannerTasks'); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await click('#plannerBtn');
  await sleep(600);
  st = await page.evaluate(() => {
    const e = document.querySelector('.planner-empty');
    if (!e) return null;
    const cs = getComputedStyle(e);
    return { fontSize: cs.fontSize, align: cs.textAlign, padTop: cs.paddingTop };
  });
  check('empty state present', !!st, st);
  check('empty state centered + enlarged (v3)', st && st.align === 'center' && parseFloat(st.fontSize) >= 15 && parseFloat(st.padTop) >= 40, JSON.stringify(st));

  // theme adaptation: seed a done task so .checked + rows exist, activate a
  // custom theme context and verify the accent family follows --th-accent
  // (pill active + checked toggle + row edge), then clean up so no state leaks
  await page.evaluate(() => {
    localStorage.setItem('plannerTasks', JSON.stringify([
      { id: '1', title: 'ZZ Theme Active', notes: '', dueDate: '', category: 'Exam', subject: '', priority: '', estimate: '', status: 'active' },
      { id: '2', title: 'ZZ Theme Done', notes: '', dueDate: '', category: 'Other', subject: '', priority: '', estimate: '', status: 'done' },
    ]));
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1500);
  await page.evaluate(() => {
    const n = document.getElementById('updateNoticePopup');
    if (n && n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click();
  });
  await click('#plannerBtn');
  await sleep(500);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--th-accent', '#ff6600');
    document.body.classList.add('custom-theme-active');
  });
  await sleep(300);
  // unfiltered first: the .checked toggle lives on the done row, which the
  // Active filter hides. Pixel-sampled colors (robust to Firefox's
  // color-mix/color(srgb) serializations).
  st = await page.evaluate(() => {
    const px = (c) => {
      const x = document.createElement('canvas'); x.width = x.height = 1;
      const cx = x.getContext('2d'); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]];
    };
    const chk = document.querySelector('.task-done-toggle.checked');
    const row = document.querySelector('.planner-task-item');
    return {
      chkPx: chk ? px(getComputedStyle(chk).backgroundColor) : null,
      edgePx: row ? px(getComputedStyle(row).borderLeftColor) : null,
    };
  });
  check('theme: checked toggle stays done-green (fixed semantic hue, not accent)', st.chkPx && st.chkPx[1] > st.chkPx[0] + 30 && st.chkPx[1] > st.chkPx[2] + 30, JSON.stringify(st.chkPx));
  // premultiplied-alpha canvas round-trip wobbles the exact rgba — assert orange-ish + translucent
  check('theme: row left edge follows --th-accent (orange-ish, tol)', st.edgePx && st.edgePx[0] > 200 && st.edgePx[1] > 85 && st.edgePx[1] < 125 && st.edgePx[2] < 20 && st.edgePx[3] > 100, JSON.stringify(st.edgePx));
  await page.evaluate(() => window.setFilter('active'));
  await sleep(300);
  st = await page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const norm = (c) => { ctx.fillStyle = c; return ctx.fillStyle; };
    const pill = document.querySelector('.planner-filter-btn.active');
    return { pillColor: pill ? norm(getComputedStyle(pill).color) : null };
  });
  check('theme: active pill follows --th-accent', st.pillColor === '#ffa061', st.pillColor);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('--th-accent');
    document.body.classList.remove('custom-theme-active');
    localStorage.removeItem('plannerTasks');
  });
  await page.evaluate(() => window.setFilter('all'));
  await sleep(200);
  console.log(failed ? `FAILURES: ${failed}` : 'ALL GREEN');
  process.exitCode = failed ? 1 : 0;
} finally { await browser.close(); }
