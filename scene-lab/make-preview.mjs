// make-preview.mjs — build a self-contained preview page for one scene.
// Usage: node scene-lab/make-preview.mjs <sceneId>
// Inlines assets/js/scenes/core.js + assets/js/scenes/<sceneId>/scene.js into
// scene-lab/preview-<sceneId>.html so the scene can be viewed in the Freebuff
// Preview tab (which serves a single file, so relative script srcs won't load).
import { readFileSync, writeFileSync } from "node:fs";

const sceneId = process.argv[2];
if (!sceneId) {
  console.error("usage: node scene-lab/make-preview.mjs <sceneId>");
  process.exit(1);
}

const core = readFileSync("assets/js/scenes/core.js", "utf8");
const scene = readFileSync(`assets/js/scenes/${sceneId}/scene.js`, "utf8");

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Preview — ${sceneId}</title>
<style>
  body { background:#101018; color:#e8e8ee; font-family:system-ui; margin:0; padding:16px; display:flex; flex-direction:column; gap:10px; align-items:center; }
  canvas { width:min(960px, 94vw); aspect-ratio:16/10; background:#000; border-radius:10px; }
  #opts { display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:center; font-size:13px; color:#bbb; }
  input[type=range], input[type=color] { vertical-align:middle; }
  button { background:#2a2a35; color:#e8e8ee; border:1px solid #4a4a5a; border-radius:6px; padding:4px 12px; font-size:13px; cursor:pointer; }
  button:hover { background:#3a3a48; }
  #info { font-size:12px; color:#888; }
</style>
</head>
<body>
<div id="opts"></div>
<button id="reroll" type="button">↻ Re-roll layout</button>
<canvas id="c" width="1280" height="800"></canvas>
<div id="info"></div>
<script>
${core}
${scene}
const canvas = document.getElementById('c');
const scene = ThemeScenes.get('${sceneId}');
const optsRow = document.getElementById('opts');
const info = document.getElementById('info');
const opts = { ...scene.defaults };
const labels = {};
optsRow.innerHTML = '';
scene.options.forEach(opt => {
  const lab = document.createElement('label');
  lab.textContent = opt.label + ': ';
  if (opt.type === 'range') {
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = opt.min; inp.max = opt.max; inp.step = opt.step;
    inp.value = opts[opt.key];
    inp.oninput = () => {
      opts[opt.key] = parseFloat(inp.value);
      lab.textContent = opt.label + ': ' + inp.value + ' ';
      lab.appendChild(inp); // textContent above cleared it — put it back
      ThemeScenes.updateOptions(opts);
    };
    lab.appendChild(inp);
  } else if (opt.type === 'color') {
    const inp = document.createElement('input');
    inp.type = 'color'; inp.value = opts[opt.key];
    inp.oninput = () => { opts[opt.key] = inp.value; ThemeScenes.updateOptions(opts); };
    lab.appendChild(inp);
  } else if (opt.type === 'select') {
    const sel = document.createElement('select');
    opt.choices.forEach(([v, l]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = l;
      if (String(opts[opt.key]) === String(v)) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => { opts[opt.key] = sel.value; ThemeScenes.updateOptions(opts); };
    lab.appendChild(sel);
  }
  labels[opt.key] = lab;
  optsRow.appendChild(lab);
});
ThemeScenes.start('${sceneId}', opts, canvas);
document.getElementById('reroll').onclick = () => ThemeScenes.updateOptions(opts);
info.textContent = '${sceneId} — ' + scene.label + ' (1280x800)';
</script>
</body>
</html>
`;

writeFileSync(`scene-lab/preview-${sceneId}.html`, html);
console.log(`wrote scene-lab/preview-${sceneId}.html`);