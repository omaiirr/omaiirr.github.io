// Baked icon data URIs (network-independent).
// Source: Icons8 MCP png URLs, fetched during icon selection pass,
// downloaded to /tmp, verified to render as 24x24 RGBA, then
// re-encoded to canonical PNG here so the audit battery can assert exact
// artwork without making any live network calls.
//
// PREVIEW is an alias for EYE (same eye icon, reused for openPatchNotesBtn).
// Each const below is the canonical data URI for a 24x24 RGBA PNG.
// Byte counts are the actual decoded PNG sizes of the files we ship.

export const EDIT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAA0ElEQVR4nO3VP0YDQRiG8Z+ENG5sgngPQdvcQvA6NjZZcwk9Rv5goq2dFh7BJqUrCIaBTxm23Vmb5IFp3oVnhnfh+yjPkZ6o8IAvvOGipHyIM7zgJ85rKfkIG1xjnF3yWaKuUcinWfZ7yX0J+bolT1zhNP5Jcfk08kEXeYUV7lr5LZ5wsp/y477lS8wO8pxDLf9fyxCPqFt5HXmaPZ2YoMF5H/LETSyJLS6jlk3XWnKes1XXxMs7zXNBWmnpfOAd878vaQEm6kUaQuVz3yXezw6JDU0NAdG6pAAAAABJRU5ErkJggg=="; // 265 bytes

export const EDIT_FILLED = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4nO3VO4oCQRRG4a9FEx87MTYycwLd0aSzFdFVKAg+mCXoFgYmcWSMlJaCEkTaxO7K+sCloArOz70UVVRPJhFdzPGHPQZVy9eYoolRDKlUnuMHfbRwRKNKef4QEjqZpZDnsdbx/G06WL2Qb9Gr5Xk9ljud+rYUUY+lkGbKhyswxH8KeRbXL1zQxmfc22GCU5mA+4/zEX+gc6wNxmXlgdBBqF8csMAS37iWlT8HJeEGIQZ/YVJBq70AAAAASUVORK5CYII="; // 236 bytes

export const SAVE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABVElEQVR4nO3VsUpcQRTG8Z8bZQULFS2C2ugDRMRWETTgc+gbiKBbCenS+QJis68uiIWFYKeFoK1okxAiZGUDKlGDDMzK5bJ39+5dY5U/XIa5c+Z8nMM3M/xjelLzQZQK5HnC73YCe5jBA/oxhB85kpcxhnVsZwUN43tiPo/9FkkHMIVRzOIC51hLBzba8QF/5GcLxziM819YwmpapEi/A33YjWODn1jECirdCmRxg8/YiIYpLPAI2xHGNKGSeqO6LIHn6I4svmAu9r0c45vSm/H/DCO4brU5Euy82anAHaajfdsRzs19pwINarqklcAyFnIY4S+OcNBsMWtzOKU70Q21Nl89xk52UsF4PP5f5SNUOoGrvBW8GaX/Ap22KDihqjjVtJtKqbvnW/KqLUAl5ijHZ/TVpsHPp9FmySfzMmfij/iU2HuC27DwVo9+ktCNcPjehxecR0MB99n5DAAAAABJRU5ErkJggg=="; // 397 bytes

export const EYE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABkElEQVR4nO3US2+PQRgF8J9GFxZWRZQNG8qepCxUlIiSlMRt4fYJJD6DBR+BnRXaSDSpELcVS2pTEbeE1GXBxoIFQSY5bzPe+Ev/sWt6ksk7mfM8531m5szDAuY9FnURuwyrMn+PT//7g8LtxiHswRd8DNePpbiBcdzCry6KtQ9P8BOnU30by3EmwlPYOxfhIjSGp7iAaxW3E/dwF8PV+nVcxDSuoq+T+Aa8wFn04hIOhluLb6m2jK9YE+5wYnuT+zxaf6BU9y5n3eAOBjM/Wok340i4wcQ2GInW7C634kO+Na5gNPON+FGJf8DAuAO43MptNLf0tJJq3E+y3MkpvMwxnsSzcPtzNzWaYmaxA2+qiguW4DWGdMZ2vEqs6odvo/nXSz6HxVnbjBmcQNltg57sqHCbslZyzkejOb6ONi2+3pa19bgZsYmMmTyydYkZyrv5p021nPAYD3Asj6o/bivuWIkVOI6HeNRy4Jxbxa60ipF4v/SggtU598m0itudWkU3za4vwuLzz13kLmA+4zfIsVz5NEGDSQAAAABJRU5ErkJggg=="; // 457 bytes

export const PREVIEW = EYE; // alias for EYE — same eye icon reused for tePreviewBtn and openPatchNotesBtn

export const ICON_NAMES = ["EDIT", "EDIT_FILLED", "SAVE", "EYE", "PREVIEW"];

export function iconDataUri(name) {
  switch (name) {
    case "EDIT": return EDIT;
    case "EDIT_FILLED": return EDIT_FILLED;
    case "SAVE": return SAVE;
    case "EYE": return EYE;
    case "PREVIEW": return PREVIEW;
    default: throw new Error("unknown icon: " + name);
  }
}
