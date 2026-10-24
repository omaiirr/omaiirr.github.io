// zz-uo-remove-uos.mjs — strips UO surface override blocks (marker shells)
// from the stylesheets so a "before" screenshot can capture the genuine
// original look; --restore puts the exact pre-strip bytes back, per file.
// Whole-file strategy: strip writes the UO-free variant to the file and saves
// the complete current file to <file>.uosbak; restore copies it back verbatim.
// Run from repo ROOT:
//   node scene-lab/zz-uo-remove-uos.mjs                    (strip all)
//   node scene-lab/zz-uo-remove-uos.mjs --only s6,s7       (strip one surface)
//   node scene-lab/zz-uo-remove-uos.mjs --restore          (restore)
// --only is what a per-surface A/B gate wants: it un-ships just the blocks
// under review, leaving already-approved surfaces in place.
import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from 'node:fs';

const TARGETS = [
  {
    file: 'assets/css/timer.css',
    marks: [
      ['/*._UO-S1-START_*/', '/*._UO-S1-END_*/'],
      ['/*._UO-S2-START_*/', '/*._UO-S2-END_*/'],
      ['/*._UO-S3-START_*/', '/*._UO-S3-END_*/'],
      ['/*._UO-S23-START_*/', '/*._UO-S23-END_*/'],
      ['/*._UO-S4-START_*/', '/*._UO-S4-END_*/'],
      ['/*._UO-S7-START_*/', '/*._UO-S7-END_*/'],
    ],
  },
  {
    file: 'assets/css/theme-editor.css',
    marks: [['/*._UO-S6-START_*/', '/*._UO-S6-END_*/']],
  },
];

const restore = process.argv.includes('--restore');
const bakOf = (f) => `${f}.uosbak`;
const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1] || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  : null;
const selected = ({ file, marks }) => {
  if (!only) return { file, marks };
  const kept = marks.filter(([sc]) =>
    only.some((id) => sc.toLowerCase().includes(`-${id}-`)),
  );
  return { file, marks: kept };
};

if (restore) {
  let restored = 0;
  for (const { file } of TARGETS) {
    const BAK = bakOf(file);
    if (!existsSync(BAK)) continue;
    copyFileSync(BAK, file);
    unlinkSync(BAK);
    console.log(`${file} restored byte-identically; backup removed.`);
    restored++;
  }
  if (!restored) {
    console.error('No .uosbak files — nothing to restore.');
    process.exit(1);
  }
  process.exit(0);
}

// strip mode
for (const { file, marks } of TARGETS.filter(selected)) {
  if (!marks.length) continue;
  if (existsSync(bakOf(file))) {
    console.error(
      `Leftover backup ${bakOf(file)}: run \`node scene-lab/zz-uo-remove-uos.mjs --restore\` first.`,
    );
    process.exit(1);
  }
}

let totalCuts = 0;
for (const target of TARGETS) {
  const { file, marks } = selected(target);
  if (!marks.length) continue;
  const css = readFileSync(file, 'utf8');
  const cuts = [];
  for (const [sc, ec] of marks) {
    const s = css.indexOf(sc);
    const e = css.indexOf(ec);
    if (s === -1 || e === -1 || e < s) continue; // surface not present
    cuts.push([s, e + ec.length]);
    console.log(`stripping ${sc} … ${ec} (${e + ec.length - s} chars) in ${file}`);
  }
  if (!cuts.length) {
    console.log(`no UO marker shells found in ${file} — left untouched.`);
    continue;
  }
  cuts.sort((a, b) => a[0] - b[0]);
  let out = '';
  let pos = 0;
  for (const [s, e] of cuts) {
    out += css.slice(pos, s);
    pos = e;
  }
  out += css.slice(pos);
  writeFileSync(bakOf(file), css);
  writeFileSync(file, out);
  totalCuts += cuts.length;
}

if (!totalCuts) {
  console.error('No UO marker shells found — nothing to strip.');
  process.exit(1);
}
console.log(`UO blocks stripped (${totalCuts}) — originals saved to .uosbak files`);
