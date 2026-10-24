// zz-uo-remove-s4.mjs — strips the Surface-4 override block from timer.css so a
// "before" screenshot can capture the genuine original look; --restore puts the
// exact original bytes back. Whole-file strategy: strip writes the S4-free
// variant to timer.css and saves the complete original to timer.css.s4bak;
// restore copies the original back verbatim. Run from repo ROOT:
//   node scene-lab/zz-uo-remove-s4.mjs            (strip)
//   node scene-lab/zz-uo-remove-s4.mjs --restore  (restore)
import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from 'node:fs';

const CSS = 'assets/css/timer.css';
const BAK = `${CSS}.s4bak`;
const START_C = '/*._UO-S4-START_*/';
const END_C = '/*._UO-S4-END_*/';

const restore = process.argv.includes('--restore');

if (restore) {
  if (!existsSync(BAK)) {
    console.error('No timer.css.s4bak — nothing to restore.');
    process.exit(1);
  }
  copyFileSync(BAK, CSS);
  unlinkSync(BAK);
  console.log('timer.css restored byte-identically; backup removed.');
  process.exit(0);
}

// strip mode
if (existsSync(BAK)) {
  console.error('Leftover backup found: run `node scene-lab/zz-uo-remove-s4.mjs --restore` first.');
  process.exit(1);
}

const css = readFileSync(CSS, 'utf8');
const s = css.indexOf(START_C);
const e = css.indexOf(END_C);
if (s === -1 || e === -1 || e < s) {
  console.error('Marker shell not found in timer.css — cannot strip.');
  process.exit(1);
}
writeFileSync(BAK, css);
writeFileSync(CSS, css.slice(0, s) + css.slice(e + END_C.length));
console.log(`S4 block stripped (${e + END_C.length - s} chars); full original saved to ${BAK}`);
