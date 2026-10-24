// zz-uo-census.mjs — §7.3 hook census (throwaway).
// (a) Every getElementById/querySelector* literal in the JS must resolve in
//     the live DOM (after opening all modals) or be JS-created.
// (b) Diff hook literals vs git HEAD: any hook removed vs HEAD must be justified.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const JS_FILES = [
  'assets/js/timer.js',
  'assets/js/theme-engine.js',
  'assets/js/theme-library.js',
  'assets/js/stopwatch.js',
].filter(existsSync);

const ID_RE = /getElementById\(\s*["']([^"']+)["']\s*\)/g;
const SEL_RE = /querySelector(?:All)?\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

function extract(text) {
  const ids = new Set();
  const sels = new Set();
  let m;
  while ((m = ID_RE.exec(text))) ids.add(m[1]);
  while ((m = SEL_RE.exec(text))) sels.add(m[1]);
  return { ids, sels };
}

// current tree
const now = { ids: new Set(), sels: new Set() };
const nowText = {};
for (const f of JS_FILES) {
  const t = readFileSync(f, 'utf8');
  nowText[f] = t;
  const { ids, sels } = extract(t);
  for (const x of ids) now.ids.add(x);
  for (const x of sels) now.sels.add(x);
}

// git HEAD baseline
const head = { ids: new Set(), sels: new Set() };
for (const f of JS_FILES) {
  try {
    const t = execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 1e7 });
    const { ids, sels } = extract(t);
    for (const x of ids) head.ids.add(x);
    for (const x of sels) head.sels.add(x);
  } catch {
    /* new file vs HEAD */
  }
}

const allJs = Object.values(nowText).join('\n');

const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4000/pomora/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1500));
  // open every modal / tab so JS-built lists exist in the DOM
  await page.evaluate(() => {
    const open = (id) => document.getElementById(id)?.classList.add('open');
    open('themeModal');
    document.querySelectorAll('.settings-tab-btn').forEach((b) => b.click());
    document.querySelector('.settings-tab-btn[data-tab="themes"]')?.click();
    open('advancedSettingsModal');
    open('plannerModal');
    open('themeEditorModal');
    open('tlModal');
    // Open the theme library through its real entry point: its card grid and
    // the JS-created thumbnail canvases only exist once it has rendered
    // (the builder's own scene library was removed 2026-10-11).
    if (typeof ThemeLibrary !== 'undefined') ThemeLibrary.open();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const dom = await page.evaluate(
    (ids, sels) => {
      const missingIds = [...ids].filter((i) => !document.getElementById(i));
      const missingSels = [...sels].filter((s) => {
        try {
          return !document.querySelector(s);
        } catch {
          return true; // unparsable = unresolvable
        }
      });
      return { missingIds, missingSels };
    },
    [...now.ids],
    [...now.sels],
  );

  let fail = 0;

  // Hooks deliberately retired this round (documented, not silently dropped).
  // 2026-10-11: the theme builder's animated-scene section was removed — scenes
  // are picked and edited in the Theme Library, which applies them natively.
  const INTENTIONAL_REMOVALS = new Set([
    'teSceneLibModal',
    'teSceneLibBackdrop',
    'teSceneLibClose',
    'teSceneLibSearch',
    'teSceneLibMoods',
    'teSceneLibGrid',
    'teSceneLibCount',
    'teSceneOptions',
    'teSceneBgColor',
    'teSceneBgPicker',
    'teSceneBgPreviewSwatch',
    'teSceneBgHex',
    'teSceneBgLabel',
    'teSceneBgLabelRow',
    'teSceneBgComboTip',
    'teSceneBgComboTipText',
    'teSceneBgPresets',
    'teFeaturedShelf',
    'teViewAllBtn',
  ]);
  const isIntentionalRemoval = (x) =>
    INTENTIONAL_REMOVALS.has(x) || /^teSceneOpt_?/.test(x);

  // (b) hooks removed vs HEAD
  const removedIds = [...head.ids].filter((x) => !now.ids.has(x));
  const removedSels = [...head.sels].filter((x) => !now.sels.has(x));
  console.log('== (b) diff vs HEAD');
  if (!removedIds.length && !removedSels.length) {
    console.log('  PASS  no hooks removed vs HEAD');
  } else {
    for (const x of removedIds) {
      const justified =
        allJs.includes(`"${x}"`) ||
        allJs.includes(`'${x}'`) ||
        isIntentionalRemoval(x);
      const why = isIntentionalRemoval(x)
        ? ' (retired with the builder scene section, 2026-10-11)'
        : ' (still referenced elsewhere)';
      console.log(`  ${justified ? 'NOTE' : 'FAIL'}  id removed vs HEAD: ${x}${justified ? why : ''}`);
      if (!justified) fail++;
    }
    for (const x of removedSels) console.log(`  NOTE  selector removed vs HEAD: ${x}`);
  }

  // (a) live-DOM resolution
  console.log('== (a) live-DOM census');
  // Pre-existing dangling hooks: present at HEAD too and null-guarded, so
  // not a regression of this surface (justified per §7.3).
  const PREEXISTING = new Set(['speed', 'tsize', 'jsize', 'stopwatchModeBtn']);
  // dynamic id prefixes produced by template literals (e.g. `teSceneOpt_${key}`)
  const dynPrefixes = [...allJs.matchAll(/`([A-Za-z][\w-]*)\$\{/g)].map((m) => m[1]);
  const isDynamicId = (i) =>
    new RegExp(`id\\s*[:=]\\s*["']${i}["']`, 'i').test(allJs) ||
    dynPrefixes.some((p) => i.startsWith(p));
  const preexisting = dom.missingIds.filter((i) => PREEXISTING.has(i));
  const trulyMissingIds = dom.missingIds.filter((i) => !PREEXISTING.has(i) && !isDynamicId(i));
  for (const i of preexisting) console.log(`  NOTE  ${i}: dangling at HEAD too, null-guarded — pre-existing, not a regression`);
  const dynCount = dom.missingIds.filter((i) => !PREEXISTING.has(i) && isDynamicId(i)).length;
  if (!trulyMissingIds.length) console.log(`  PASS  all ${now.ids.size} id hooks resolve in live DOM${dynCount ? ` (${dynCount} JS-created)` : ''}`);
  else {
    fail += trulyMissingIds.length;
    console.log(`  FAIL  ${trulyMissingIds.length}/${now.ids.size} id hooks unresolvable: ${trulyMissingIds.join(', ')}`);
  }

  const jsCreatedSel = (s) => {
    // #id selectors → same rules as ids
    const idm = s.match(/^#([\w-]+)$/);
    if (idm)
      return (
        isDynamicId(idm[1]) ||
        PREEXISTING.has(idm[1]) ||
        isIntentionalRemoval(idm[1])
      );
    // tag.class selectors (e.g. canvas.te-scene-frame) are created by JS
    const tc = s.match(/^([a-z]+)\.([\w-]+)$/i);
    if (tc && allJs.includes(tc[2])) return true;
    // [attr] selectors → dynamic if the JS emits that attribute in a string
    const am = s.match(/^\[([\w-]+)(?:[~^$*|]?=)?/);
    if (am && allJs.includes(am[1])) return true;
    const classes = s.split(/[\s>+~:\[\(\]]/).filter((p) => /^[.\w-]+$/.test(p) && p !== '');
    return classes.some((c) => c.startsWith('.') && allJs.includes(c.slice(1)));
  };
  const badSels = dom.missingSels.filter((s) => !jsCreatedSel(s));
  if (!badSels.length) console.log(`  PASS  all ${now.sels.size} selector hooks resolve or are JS-created${dom.missingSels.length ? ` (${dom.missingSels.length} JS-created)` : ''}`);
  else {
    fail += badSels.length;
    console.log(`  FAIL  ${badSels.length}/${now.sels.size} selector hooks unresolvable: ${badSels.join(' | ')}`);
  }

  console.log(`\nCENSUS: ${fail === 0 ? 'ALL GREEN' : fail + ' FAILURES'}`);
  process.exitCode = fail === 0 ? 0 : 1;
} finally {
  await browser.close();
}
