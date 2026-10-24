// ocean — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const ocean = {
      label: "Ocean Waves",
      defaults: { speed: 1, intensity: 70, color: "#0ea5e9" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Wave Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 70) / 100;
        const color = opts.color || "#0ea5e9";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a1a2e";
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // moon reflection
        const moonX = w * 0.5, moonY = h * 0.12;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.15);
        moonGlow.addColorStop(0, `rgba(${Math.min(255, cr + 100)},${Math.min(255, cg + 100)},${Math.min(255, cb + 100)}, 0.2)`);
        moonGlow.addColorStop(1, "transparent");
        ctx.fillStyle = moonGlow; ctx.fillRect(0, 0, w, h * 0.5);
        // wave layers
        const layers = 5;
        for (let l = 0; l < layers; l++) {
          const baseY = h * (0.4 + l * 0.12);
          const alpha = intensity * (0.3 + l * 0.08);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const wave = Math.sin(x * 0.005 + state.t * (1.2 + l * 0.3) + l * 2) * h * 0.02
                       + Math.sin(x * 0.012 - state.t * 0.7 + l) * h * 0.01;
            const y = baseY + wave;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
          const g = ctx.createLinearGradient(0, baseY, 0, h);
          const blend = l / layers;
          g.addColorStop(0, `rgba(${Math.round(cr * (1 - blend * 0.3))},${Math.round(cg * (1 - blend * 0.2))},${Math.round(cb + blend * 30)},${alpha})`);
          g.addColorStop(1, `rgba(${Math.round(cr * 0.3)},${Math.round(cg * 0.3)},${Math.round(cb * 0.5)},${alpha * 0.5})`);
          ctx.fillStyle = g; ctx.fill();
          // foam on crests
          if (l > 1) {
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = `rgba(255,255,255,0.5)`; ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    };
