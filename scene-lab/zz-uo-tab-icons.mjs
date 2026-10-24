// zz-uo-tab-icons.mjs — builds scene-lab/zz-uo-tab-icons.html: a live,
// self-contained comparison of the three candidate icon sets for the theme
// builder's tab column (Background / Colors / Overlay).
//
// Why generated: the SVG partials live in _includes/ (Jekyll never serves an
// underscore directory), and an <img> can't inherit currentColor — so the
// page needs the real markup inlined. Everything is local; no CDN, no network.
//
//   node scene-lab/zz-uo-tab-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = '_includes/svg/';
const read = (f) => readFileSync(dir + f, 'utf8');

/** Normalize any source svg into an inline, currentColor, 24-viewBox icon. */
const inline = (src, size = 14) => {
  let s = src.replace(/<\?xml[^>]*\?>/g, '').trim();
  // drop any author-supplied size/fill so the page controls both
  s = s.replace(/\s(width|height|x|y)="[^"]*"/g, '');
  s = s.replace(/\sfill="(?!none)[^"]*"/g, ' fill="currentColor"');
  if (!/fill=/.test(s)) s = s.replace(/<svg/, '<svg fill="currentColor"');
  s = s.replace(
    /<svg/,
    `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"`,
  );
  return s;
};

// The real, current builder glyph (what a tab renders today).
const palette = inline(read('icons8-color-palette.svg'));
const picture = inline(read('icons8-picture.svg'));
const userPicture = inline(read('2. picture.svg'));
const userPalette = inline(read('1. palette.svg'));
const userLayers = inline(read('4. layers (3 layers).svg'));

// Authored 2px-stroke line set — the language the round-6b placeholders used.
const line = (body) =>
  `<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const linePicture = line(
  '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M3.4 17.2l5-5 4.4 4.4 3-2.6 4.6 4.4"/>',
);
const linePalette = line(
  '<circle cx="12" cy="12" r="9"/><circle cx="8.6" cy="9.6" r="1.15"/><circle cx="12" cy="7.6" r="1.15"/><circle cx="15.4" cy="9.6" r="1.15"/><circle cx="9.2" cy="15.2" r="1.15"/>',
);
const lineLayers = line(
  '<path d="M12 3.2l8.6 4.7-8.6 4.7-8.6-4.7 8.6-4.7z"/><path d="M3.8 12.6L12 17.1l8.2-4.5"/><path d="M3.8 16.4L12 20.9l8.2-4.5"/>',
);

// ── Part 2: candidates for the COLORS tab only, shown in context with the
// picture + layers glyphs already picked for Background and Overlay.
const lineWheel = line(
  '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
);
const lineWheelHub = line(
  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/>' +
    '<path d="M12 3v5.8M19.8 7.5l-5 2.9M19.8 16.5l-5-2.9M12 21v-5.8M4.2 16.5l5-2.9M4.2 7.5l5 2.9"/>',
);
const lineSwatch = line(
  '<rect x="3.5" y="3.5" width="17" height="17" rx="3.2"/><path d="M12 3.5v17M3.5 12h17"/>',
);
const filledWheel = inline(read('wheel.svg'));

/** Part 2 row: the picked picture + a Colors candidate + the picked layers. */
const colorRow = (icon, tag, note) => `<div class="row">
    <div class="col">
      <button class="te-tab-btn active">${linePicture}Background</button>
      <button class="te-tab-btn">${icon}Colors</button>
      <button class="te-tab-btn">${lineLayers}Overlay</button>
    </div>
    <div class="meta">
      <div class="set" style="font-weight:600;color:#e8eefc">${tag}</div>
      <div class="src">${note}</div>
    </div>
  </div>`;

const tabs = (icons, note, src) => {
  const names = ['Background', 'Colors', 'Overlay'];
  return `<div class="row">
    <div class="col">
      ${names
        .map(
          (n, i) =>
            `<button class="te-tab-btn${i === 0 ? ' active' : ''}">${icons[i]}${n}</button>`,
        )
        .join('')}
    </div>
    <div class="meta">
      <div class="set" style="font-weight:600;color:#e8eefc">${note}</div>
      <div class="src">${src}</div>
    </div>
  </div>`;
};

const A = tabs(
  [palette, palette, palette],
  'A — what is live today',
  'one glyph (palette) reused for all three tabs',
);
const B = tabs(
  [linePicture, linePalette, lineLayers],
  'B — picture / palette / layers, line set',
  'authored 2px-stroke shells — the round-6b placeholder language, 14px',
);
const C = tabs(
  [picture, palette, userLayers],
  'C — picture / palette / layers, filled set',
  'the filled glyphs already in the tree (icons8-*) + your own layers asset, 14px',
);

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Theme builder — tab icon options</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:28px; background:#0b111f; color:#d0def2;
         font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
  h1 { font-size:1.35rem; margin:0 0 4px; color:#fff; letter-spacing:-.01em; }
  p.lede { margin:0 0 24px; color:#9fb0d0; max-width:62ch; }
  .row { display:flex; gap:26px; align-items:center; padding:18px;
         border:1px solid rgba(123,139,178,.16); border-radius:14px; margin-bottom:16px;
         background:rgba(123,139,178,.04); }
  .col { display:flex; flex-direction:column; gap:6px; width:150px; flex:none; }
  .te-tab-btn { display:flex; align-items:center; text-align:left; gap:6px;
      padding:10px 12px; background:transparent; border:1px solid transparent;
      color:rgba(255,255,255,.5); border-radius:9px; cursor:pointer;
      font-size:.85rem; font-weight:500; white-space:nowrap;
      font-family:inherit; }
  .te-tab-btn.active { background:rgba(99,102,241,.2);
      border-color:rgba(99,102,241,.35); color:#d0d2fa; }
  .meta { min-width:0; }
  .src { color:#8fa4d4; font-size:.82rem; margin-top:2px; }
  .note { margin:26px 0 0; color:#9fb0d0; font-size:.84rem; }
  h2 { font-size:1.05rem; margin:30px 0 6px; color:#fff; }
  .pick { font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
          color:#a5b4fc; background:rgba(99,102,241,.16); border:1px solid rgba(99,102,241,.35);
          border-radius:999px; padding:3px 9px; vertical-align:2px; }
  code { background:rgba(123,139,178,.14); padding:1px 5px; border-radius:5px; }
</style></head>
<body>
  <h1>Theme builder — tab icon options</h1>
  <p class="lede">One distinct metaphor per tab, rendered at the real sizes the builder uses
     (14&nbsp;px glyphs, 6&nbsp;px gap) with the active tab in its real state.</p>

  <h2>Part 1 — the set <span class="pick">you picked B</span></h2>
  ${A}
  ${B}
  ${C}

  <h2>Part 2 — the Colors glyph <span class="pick">needs your pick</span></h2>
  <p class="lede">You asked for a wheel or a swatch instead of the palette. Each row below shows
     the <em>whole</em> tab column with B's picture and layers in place, so the Colors glyph is
     judged as part of the set rather than on its own.</p>
  ${colorRow(lineWheel, '1 — colour wheel, line', 'circle + six segments, 2px stroke — the plainest wheel')}
  ${colorRow(lineWheelHub, '2 — colour wheel with hub, line', 'same wheel with a centre dot, so it reads as a wheel rather than a pie')}
  ${colorRow(lineSwatch, '3 — colour swatch, line', 'a swatch divided into four — the swatch metaphor, not a wheel')}
  ${colorRow(filledWheel, '4 — your own wheel, filled', 'wheel.svg — the trace of your own 3. wheel.png, already in the tree')}

  <p class="note">The builder's other slots (close, colour-picker chevrons, info dots, footer
     Save/Preview/Export/Import) are untouched by this choice —
     <code>zz-uo-tab-icons.mjs</code> regenerates this page.</p>
</body></html>
`;

writeFileSync('scene-lab/zz-uo-tab-icons.html', page);
console.log('wrote scene-lab/zz-uo-tab-icons.html');
