// Run with node scene-lab/zz-uo-artifact-bake.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const BAKED = path.resolve(ROOT, 'scene-lab/zz-uo-icon-artifacts-baked.mjs');

const ICONS = [
  ['EDIT', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAyUlEQVR4nO3VMWpCQRSF4S8Em2gaCdlHwLTZRSDbsUmjZhPJMjQhGi3ttMgSbCw1ICQM3MDw2jfPRn+Y5hT/Hc7AXMpzoSHaeMMP1uiVlLdwiyV+46xKyTuY4QndbMiuRF2dkA+y7H/Iawn5tCJPPOIm3qS4fBD5ZR15Gx8YVfJnfOH6NOVXTcvf8XKW55xrOX4tLXxiWMmHkae/pxYP2OOuCXmiH0tii/uoZVa3lpx5tur2cfNa/7kgrbR0NvjGGMATYDjxoYHcAYUAIpxYrhpcQAAAABJRU5ErkJggg=='],
  ['EDIT_FILLED', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4nO3VO4oCQRRG4a9FEx87MTYycwLd0aSzFdFVKAg+mCXoFgYmcWSMlJaCEkTaxO7K+sCloArOz70UVVRPJhFdzPGHPQZVy9eYoolRDKlUnuMHfbRwRKNKef4QEjqZpZDnsdbx/G06WL2Qb9Gr5Xk9ljud+rYUUY+lkGbKhyswxH8KeRbXL1zQxmfc22GCU5mA+4/zEX+gc6wNxmXlgdBBqF8csMAS37iWlT8HJeEGIQZ/YVJBq70AAAAASUVORK5CYII='],
  ['SAVE', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABVElEQVR4nO3VsUpcQRTG8Z8bZQULFS2C2ugDRMRWETTgc+gbiKBbCenS+QJis68iiIWFYKeFoK1okxAiZGUDKlGDDMzK5bJ39+5dY5U/XIa5c+Z8nMM3M/xjelLzQZQK5HnC73YCe5jBA/oxhB85kpcxhnVsZwUN43tiPo/9FkkHMIVRzOIC51hLBzba8QF/5GcLxziM819YwmpapEi/A33YjWODn1jECirdCmRxg8/YiIYpLPAI2xHGNKGSeqO6LIHn6I4svmAu9r0c45vSm/H/DCO4brU5Euy82anAHaajfdsRzs19pwINarqklcAyFnIY4S+OcNBsMWtzOKU70Q21Nl89xk52UsF4PP5f5SNUOoGrvBW8GaX/Ap22KDihqjjVtJtKqbvnW/KqLUAl5ijHZ/TVpsHPp9FmySfzMmfij/iU2HuC27DwVo9+ktCNcPjehxecR0MB99n5DAAAAABJRU5ErkJggg=='],
  ['EYE', 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABkElEQVR4nO3US2+PQRgF8J9GFxZWRZQNG8qepCxUlIiSlMRt4fYJJD6DBR+BnRXaSDSpELcVS2pTEbeE1GXBxoIFQSY5bzPe+Ev/sWt6ksk7mfM8531m5szDAuY9FnURuwyrMn+PT//7g8LtxiHswRd8DNePpbiBcdzCry6KtQ9P8BOnU30by3EmwlPYOxfhIjSGp7iAaxW3E/dwF8PV+nVcxDSuoq+T+Aa8wFn04hIOhluLb6m2jK9YE+5wYnuT+zxaf6BU9y5n3eAOBjM/Wok340i4wcQ2GInW7C634kO+Na5gNPON+FGJf8DAuAO43MptNLf0tJJq3E+y3MkpvMwxnsSzcPtzNzWaYmaxA2+qiguW4DWGdMZ2vEqs6odvo/nXSz6HxVnbjBmcQNltg57sqHCbslZyzkejOb6ONi2+3pa19bgZsYmMmTyydYkZyrv5p021nPAYD3Asj6o/bivuWIkVOI6HeNRy4Jxbxa60ipF4v/SggtU598m0itudWkU3za4vwuLzz13kLmA+4zfIsVz5NEGDSQAAAABJRU5ErkJggg=='],
];

const lines = ICONS.map(([name, b64]) => {
  const bytes = Buffer.from(b64, 'base64').length;
  return `export const ${name} = "data:image/png;base64,${b64}"; // ${bytes} bytes decoded`;
}).join('\n');

const switchBody = ICONS.map(([n]) => `    case "${n}": return ${n};`).join('\n');

const src = `// Baked icon data URIs (network-independent).
// Source: Icons8 MCP png URLs, fetched during icon selection pass,
// decoded to raw bytes here so the audit battery can assert exact artwork
// without making any live network calls.
${lines}

export const ICON_NAMES = [${ICONS.map(([n])=>JSON.stringify(n)).join(', ')}];

export function iconDataUri(name) {
  switch (name) {
${switchBody}
    default: throw new Error("unknown icon: " + name);
  }
}
`;

fs.writeFileSync(BAKED, src, 'utf8');
console.log('wrote', BAKED);
console.log('exports:', ICONS.map(([n])=>n).join(', '));
console.log('total baked bytes (decoded):', ICONS.reduce((s,[,b])=>s+Buffer.from(b,'base64').length,0));

const report = {
  bakedFile: BAKED,
  icons: ICONS.map(([name,b64])=>({name, rawBytes: Buffer.from(b64,'base64').length})),
  totalBytes: ICONS.reduce((s,[,b])=>s+Buffer.from(b,'base64').length,0),
};
fs.writeFileSync(path.resolve(ROOT,'scene-lab/zz-uo-icon-artifacts-baked.json'), JSON.stringify(report,null,2));
console.log('wrote baked.json');
