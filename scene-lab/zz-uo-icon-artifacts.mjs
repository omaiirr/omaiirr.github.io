const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const OUT = path.resolve(ROOT, 'scene-lab/zz-uo-icon-artifacts.mjs');

const ARTIFACTS = [
  // Icons8 ios7/material edit pencil + save + eye, fetched via MCP png URLs, baked here as data URIs.
  ['EDIT', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAyUlEQVR4nO3VMWpCQRSF4S8Em2gaCdlHwLTZRSDbsUmjZhPJMjQhGi3ttMgSbCw1ICQM3MDw2jfPRn+Y5hT/Hc7AXMpzoSHaeMMP1uiVlLdwiyV+46xKyTuY4QndbMiuRF2dkA+y7H/Iawn5tCJPPOIm3qS4fBD5ZR15Gx8YVfJnfOH6NOVXTcvf8XKW55xrOX4tLXxiWMmHkae/pxYP2OOuCXmiH0tii/uoZVa3lpx5tur2cfNa/7kgrbR0NvjGGMATYDjxoYHcAYUAIpxYrhpcQAAAABJRU5ErkJggg=='],
  ['EDIT_FILLED', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4nO3VO4oCQRRG4a9FEx87MTYycwLd0aSzFdFVKAg+mCXoFgYmcWSMlJaCEkTaxO7K+sCloArOz70UVVRPJhFdzPGHPQZVy9eYoolRDKlUnuMHfbRwRKNKef4QEjqZpZDnsdbx/G06WL2Qb9Gr5Xk9ljud+rYUUY+lkGbKhyswxH8KeRbXL1zQxmfc22GCU5mA+4/zEX+gc6wNxmXlgdBBqF8csMAS37iWlT8HJeEGIQZ/YVJBq70AAAAASUVORK5CYII='],
  ['SAVE', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABVElEQVR4nO3VsUpcQRTG8Z8bZQULFS2C2ugDRMRWETTgc+gbiKBbCenS+QJis68giIWFYKeFoK1okxAiZGUDKlGDDMzK5bJ39+5dY5U/XIa5c+Z8nMM3M/xjelLzQZQK5HnC73YCe5jBA/oxhB85kpcxhnVsZwUN43tiPo/9FkkHMIVRzOIC51hLBzba8QF/5GcLxziM819YwmpapEi/A33YjWODn1jECirdCmRxg8/YiIYpLPAI2xHGNKGSeqO6LIHn6I4svmAu9r0c45vSm/H/DCO4brU5Euy82anAHaajfdsRzs19pwINarqklcAyFnIY4S+OcNBsMWtzOKU70Q21Nl89xk52UsF4PP5f5SNUOoGrvBW8GaX/Ap22KDihqjjVtJtKqbvnW/KqLUAl5ijHZ/TVpsHPp9FmySfzMmfij/iU2HuC27DwVo9+ktCNcPjehxecR0MB99n5DAAAAABJRU5ErkJggg=='],
  ['EYE', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABkElEQVR4nO3US2+PQRgF8J9GFxZWRZQNG8qepCxUlIiSlMRt4fYJJD6DBR+BnRXaSDSpELcVS2pTEbeE1GXBxoIFQSY5bzPe+Ev/sWt6ksk7mfM8531m5szDAuY9FnURuwyrMn+PT//7g8LtxiHswRd8DNePpbiBcdzCry6KtQ9P8BOnU30by3EmwlPYOxfhIjSGp7iAaxW3E/dwF8PV+nVcxDSuoq+T+Aa8wFn04hIOhluLb6m2jK9YE+5wYnuT+zxaf6BU9y5n3eAOBjM/Wok340i4wcQ2GInW7C634kO+Na5gNPON+FGJf8DAuAO43MptNLf0tJJq3E+y3MkpvMwxnsSzcPtzNzWaYmaxA2+qiguW4DWGdMZ2vEqs6odvo/nXSz6HxVnbjBmcQNltg57sqHCbslZyzkejOb6ONi2+3pa19bgZsYmMmTyydYkZyrv5p021nPAYD3Asj6o/bivuWIkVOI6HeNRy4Jxbxa60ipF4v/SggtU598m0itudWkU3za4vwuLzz13kLmA+4zfIsVz5NEGDSQAAAABJRU5ErkJggg=='],
];

const BY_ID = {
  '49': ARTIFACTS[0][1],
  '8192': ARTIFACTS[1][1],
  '18765': ARTIFACTS[2][1],
  '986': ARTIFACTS[3][1],
};

const BY_NAME = {
  edit: ARTIFACTS[0][1],
  'edit-filled': ARTIFACTS[1][1],
  save: ARTIFACTS[2][1],
  eye: ARTIFACTS[3][1],
};

const BY_ALIAS = {
  'icons8-ios7-edit': ARTIFACTS[0][1],
  'icons8-ios7-edit-filled': ARTIFACTS[1][1],
  'icons8-ios7-save': ARTIFACTS[2][1],
  'icons8-ios7-eye': ARTIFACTS[3][1],
};

const BY_ICON_ID = {
  '49': ARTIFACTS[0][1],
  '8192': ARTIFACTS[1][1],
  '18765': ARTIFACTS[2][1],
  '986': ARTIFACTS[3][1],
};

const SLOTS = new Set([
  'openThemeLibraryBtnSmall',
  'openThemeLibraryBtnFull',
  'openStatsModalBtn',
  'teMoreBtn',
  'tePreviewBtn',
  'teExportBtn',
  'teImportBtn',
  'teSaveBtn',
  'teAutoDetectColors',
  'advancedSettingsSaveBtn',
  'openPatchNotesBtn',
]);

const CONTENT = `// When you swap artwork in the markup, pair it with ` +
`// swapArtworkIconId('ELEMENT_OR_SELECTOR', 'icon id or name or alias')`.

export {
  EDIT, EDIT_FILLED, SAVE, EYE,
  BY_ID, BY_NAME, BY_ALIAS, BY_ICON_ID,
  SLOTS,
  content,
};

export default {
  EDIT, EDIT_FILLED, SAVE, EYE,
  BY_ID, BY_NAME, BY_ALIAS, BY_ICON_ID,
  SLOTS,
};

// Deterministic content snapshot used by the audit battery so it can
// assert that every slot whose source was changed resolves to one of
// these exact data URIs (no off-book artwork, no stale FO/A uri).
export const content = `
<!-- openThemeLibraryBtnSmall — Icons8 ios7 icon library (grid of 4 squares) -->
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>

<!-- openThemeLibraryBtnFull — same icon library, mirrored in expanded settings -->
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>

<!-- openStatsModalBtn — bar chart, 3 vertical bars of different height -->
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>

<!-- teMoreBtn — horizontal ellipsis, text glyph "⋯" -->
<button id="teMoreBtn" ...>⋯</button>

<!-- tePreviewBtn — Icons8 ios7 "Eye" (id 986 / commonName "visible"), 24x24 PNG baked as data URI -->
<img src="${BY_ID['986']}" width="14" height="14" alt="" aria-hidden="true" />

<!-- teExportBtn — Icons8 ios7 "Save" (id 18765 / commonName "save"), 24x24 PNG baked as data URI -->
<img src="${BY_ID['18765']}" width="14" height="14" alt="" aria-hidden="true" />

<!-- teImportBtn — Icons8 ios7 "Save" (id 18765 / commonName "save"), 24x24 PNG baked as data URI -->
<img src="${BY_ID['18765']}" width="14" height="14" alt="" aria-hidden="true" />

<!-- teSaveBtn — Icons8 ios7 "Save" (id 18765 / commonName "save"), 24x24 PNG baked as data URI -->
<img src="${BY_ID['18765']}" width="14" height="14" alt="" aria-hidden="true" />

<!-- teAutoDetectColors — Icons8 ios7 "Artist Palette" (id 25729 / commonName "color-palette"), 24x24 PNG baked as data URI. NOTE: id 25729 is the ios7 palette the user compared against; if fetch fails use the svg fallback below. -->
<!-- svg fallback (does not depend on network/MCP): -->
<svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M24.86,41.09C23.54,40.02 21.81,36.82 20.94,33.84L19.38,28.50L13.77,28.83C9.15,29.10 7.79,28.79 6.08,27.08C3.44,24.44 3.42,20.06 6.02,14.96C11.24,4.73 26.23,1.95 36.26,9.35C40.16,12.23 44.00,20.43 44.00,25.88C44.00,37.97 32.40,47.19 24.86,41.09Z M35.81,37.74C38.03,35.91 40.96,28.94 40.96,25.50C40.96,21.35 37.78,14.76 34.56,12.23C25.13,4.81 11.06,8.41 7.86,19.06C6.16,24.74 7.76,26.30 14.43,25.47C20.45,24.71 22.15,26.01 23.93,32.70C25.45,38.39 27.54,40.34 31.32,39.59C32.96,39.26 34.99,38.43 35.81,37.74Z M28.36,34.51C28.02,33.60 28.21,32.39 28.80,31.80C30.32,30.28 33.21,31.67 32.81,33.74C32.37,36.04 29.16,36.59 28.36,34.51Z M33.36,29.51C33.02,28.60 33.21,27.39 33.80,26.80C35.32,25.28 38.21,26.67 37.81,28.74C37.37,31.04 34.16,31.59 33.36,29.51Z M32.36,22.51C32.02,21.60 32.21,20.39 32.80,19.80C34.32,18.28 37.21,19.67 36.81,21.74C36.37,24.04 33.16,24.59 32.36,22.51Z M28.36,16.51C28.02,15.60 28.21,14.39 28.80,13.80C30.32,12.28 33.21,13.67 32.81,15.74C32.37,18.04 29.16,18.59 28.36,16.51Z M21.36,14.51C21.02,13.60 21.21,12.39 21.80,11.80C23.32,10.28 26.21,11.67 25.81,13.74C25.37,16.04 22.16,16.59 21.36,14.51Z"/></svg>

<!-- advancedSettingsSaveBtn — Icons8 ios7 "Save" (id 18765), same as export/import -->
<img src="${BY_ID['18765']}" width="14" height="14" alt="" aria-hidden="true" />

<!-- openPatchNotesBtn — Icons8 ios7 "Eye" (id 986), same as preview -->
<img src="${BY_ID['986']}" width="14" height="14" alt="" aria-hidden="true" />
`.trim();

/*
Notes on the palette icon (teAutoDetectColors):
- The user wants both "palette-style" icons in the UI to match the expanded-settings
  Themes tab, which on disk is <i class="fas fa-palette">.
- Icons8 has a ios7 "Color Palette" (id 25729) that looks visually nearest to a
  "palette" metaphor. It was not fetchable in this run (no MCP svg access + the png
  url returned an archived webpage rather than an image), so this slot is intentionally
  left on its existing same-family SVG (the 48x48 fill="currentColor" palette shape
  already shared by the small-settings badge and the auto-detect button). That is the
  correct family to match fa-palette visually; do not swap it for an unrelated shape.
- If you later get svg access for id 25729 (or a better palette id), replace BY_ID['palette']
  here and wire teAutoDetectColors to it.
*/
