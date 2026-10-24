// zz-s23-rewrite.mjs — swaps the Surfaces-2+3 override block in timer.css
// with the payload in scene-lab/zz-uo-s23-v2.css. Run from repo ROOT:
//   node scene-lab/zz-s23-rewrite.mjs
// (no --restore here — the universal strip/restore keeps the original safe).
import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'assets/css/timer.css';
const CSS_BAK = `${CSS}.s23bak`;
const SC = '/*._UO-S23-START_*/';
const EC = '/*._UO-S23-END_*/';
const payload = readFileSync('scene-lab/zz-uo-s23-v2.css', 'utf8').trim() + '\n';

const css = readFileSync(CSS, 'utf8');
const s = css.indexOf(SC);
if (s === -1) {
  // first insert: before the S4 marker (keeping S4 last) or at EOF
  const s4 = css.indexOf('/*._UO-S4-START_*/');
  const out = s4 === -1
    ? css.replace(/\n*$/, '\n\n') + payload
    : css.slice(0, s4) + payload + '\n' + css.slice(s4);
  writeFileSync(CSS_BAK, css);
  writeFileSync(CSS, out);
  console.log('S23 block inserted (first run); backup at', CSS_BAK);
  process.exit(0);
}
const e = css.indexOf(EC);
if (e === -1 || e < s) {
  console.error('S23 END marker missing/misordered — cannot rewrite.');
  process.exit(1);
}
writeFileSync(CSS, css.slice(0, s) + payload + css.slice(e + EC.length));
console.log('S23 block replaced with payload.');
