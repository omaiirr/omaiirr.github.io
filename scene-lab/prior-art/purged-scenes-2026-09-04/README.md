# Purged scenes snapshot — 2026-09-04

Read-only archive taken before the modular refactor split `assets/js/theme-scenes.js`.
None of this code exists in git history, so this directory is the only recovery net
until each scene is rebuilt from scratch as its own module under `assets/js/scenes/`.

## Contents

* `theme-scenes.pre-split.js` — full pre-split source (all 40 scenes, helpers, runtime).
* one `<id>.js` file per purged scene, each holding that scene's complete registry
  block verbatim (label, defaults, presetBgColors, options, init, draw).

## Purged scenes (29)

* `condensation`
* `grass`
* `meteor`
* `neoncity`
* `fireflies`
* `leaves`
* `campfire`
* `dandelion`
* `butterflies`
* `thunderstorm`
* `eclipse`
* `ocean`
* `lighthouse`
* `blackhole`
* `starorbit`
* `caustics`
* `cloudsea`
* `dunes`
* `mistysunrise`
* `inkwater`
* `jellyfish`
* `koi`
* `lanterns`
* `balloon`
* `confetti`
* `ornate`
* `origami`
* `lighttunnel`
* `zengarden`

## Notes

* Kept scenes (11): particles, aurora, rain, bubbles, starfield, embers, ripples, comets, galaxy, snow, blossomstorm — moved to modules in Stage 1.
* Consult these blocks when rebuilding: option keys, default values, and id must stay
  stable so saved user themes keep resolving (theme-engine fallback arrives in Stage 2).
