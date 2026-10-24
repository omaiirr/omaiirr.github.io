# scene-lab / prior-art

Read-only archive of work salvaged from `.freebuff/` (deleted 2026-09-04)
before the modular scene refactor. Nothing here is loaded by the site; files
are kept as reference for future scene work.

## Layout

| Directory | Contents | Use for |
|-----------|----------|---------|
| `purged-scenes-2026-09-04/` | The 29 purged scene registry blocks + full pre-split `theme-scenes.js` | Rebuilding the purged scenes from scratch (option keys, defaults, ids must stay stable for saved themes) |
| `blossom-tools/` | Tree-tracing/preview pages (`trace.html`, `trecrop.html`, `trace-check.html`, `trunkcrop.html`, `refzoom.html`, `tree_trace.js`) | Iterating on the Blossom Storm reference tree (ref1.png) |
| `scene-variants/` | Working scene definitions/helpers from `.freebuff/scratch` (`*-block.js`, `scene-helpers.js`, `new-scenes.js`, `blossom-clean.js`, `new_blossomstorm.js`, `ocean-scene.js`, `ornate-scene.js`) | Ground-up rebuilds of purged scenes; earlier implementations to study and beat |

## Notes

- The tracing pages under `blossom-tools/` reference `imgref/ref1.png` with a
  relative path that no longer resolves from this directory. To use them,
  serve the repo root locally and open them from their new location, or
  adjust the `src` to `../../../imgref/ref1.png`.
- Reference assets themselves now live at the repo root: `imgref/` (still
  frames `ref1–4.png`, viewer `imgref/index.html`) and `ref/` (master video
  `ref.mp4`, scrubber viewer `ref/index.html`).
- `aurora-block.js` documents the scene-id-stability strategy used across
  rebuilds ("keep the id, change the visuals") — e.g. it carries an
  "Aurora Nights" replacement for the old `zengarden` scene.
