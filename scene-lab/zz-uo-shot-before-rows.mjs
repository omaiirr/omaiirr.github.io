// zz-uo-shot-before-rows.mjs — capture the ORIGINAL (S4 block stripped) planner
// with seeded rows for the gate-4 rows pair. Seeds storage, reloads, shoots,
// then clears plannerTasks so the user's real state is untouched.
// Run from repo ROOT while the S4 block is stripped.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const BASE = 'http://127.0.0.1:4000/pomora/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
  await page.evaluate(() => document.getElementById('plannerBtn')?.click());
  await sleep(600);
  const rows = await page.evaluate(() => document.querySelectorAll('.planner-task-item').length);
  if (rows !== 2) throw new Error(`expected 2 seeded rows, saw ${rows}`);
  await page.screenshot({ path: 'scene-lab/zz-uo-before-planner-rows.png' });
  await page.evaluate(() => localStorage.removeItem('plannerTasks'));
  console.log('before-rows shot saved (original look, 2 seeded rows)');
} finally { await browser.close(); }
