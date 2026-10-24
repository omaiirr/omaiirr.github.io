// s4 block rewrite helper (throwaway) — replaces the byte range between the
// marker shell comments in timer.css with v3 content read from this file's
// sibling payload. Run from repo ROOT:  node scene-lab/zz-s4-rewrite.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'assets/css/timer.css';
const START_C = '/*._UO-S4-START_*/';
const END_C = '/*._UO-S4-END_*/';

const css = readFileSync(CSS, 'utf8');
const s = css.indexOf(START_C);
const e = css.indexOf(END_C);
if (s === -1 || e === -1 || e < s) {
  console.error('marker shell not found');
  process.exit(1);
}

const block = readFileSync('scene-lab/zz-uo-s4-v3.css', 'utf8').trimEnd();
writeFileSync(CSS, css.slice(0, s + START_C.length) + '\n' + block + '\n' + css.slice(e));
console.log(`S4 block rewritten to v3 (${block.length} chars)`);
