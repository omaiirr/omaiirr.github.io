// caustics — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const caustics = {
      label: "Caustics",
      defaults: { speed: 1, intensity: 60, color: "#06b6d4" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 60) / 100;
        const color = opts.color || "#06b6d4";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a1a2e";
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // caustic light patterns — overlapping sine waves
        for (let layer = 0; layer < 4; layer++) {
          ctx.globalAlpha = intensity * 0.12;
          ctx.fillStyle = color;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            for (let y = 0; y <= h; y += 6) {
              const v = Math.sin(x * 0.02 + state.t * (1 + layer * 0.3) + layer)
                      * Math.cos(y * 0.02 - state.t * 0.7 + layer * 2)
                      + Math.sin((x + y) * 0.015 + state.t * 0.5);
              if (v > 1.2) {
                const r = (v - 1.2) * 15 + 3;
                ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
              }
            }
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
