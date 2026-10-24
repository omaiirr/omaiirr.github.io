// mistysunrise — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const mistysunrise = {
      label: "Misty Sunrise",
      defaults: { density: 6, speed: 0.5, color: "#f59e0b" },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Mist Layers", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Sun Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 6;
        state.layers = [];
        for (let i = 0; i < count; i++) {
          state.layers.push({
            y: h * (0.35 + (i / count) * 0.5),
            amplitude: Math.random() * 20 + 10,
            freq: Math.random() * 0.003 + 0.001,
            speed: (Math.random() * 5 + 2) * (opts.speed ?? 0.5),
            alpha: 0.1 + (i / count) * 0.15,
            phase: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#f59e0b";
        const bgColor = opts.bgColor || null;
        state.t = (state.t || 0) + dt * speed;
        ctx.clearRect(0, 0, w, h);
        // dawn gradient
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#1a0f08");
        sky.addColorStop(0.3, "#2a1a10");
        sky.addColorStop(0.6, "#3a2518");
        sky.addColorStop(1, bgColor || "#0d1117");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // sun glow
        const sunX = w * 0.5, sunY = h * 0.3;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.35);
        sunGlow.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
        sunGlow.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.1)`);
        sunGlow.addColorStop(1, "transparent");
        ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, w, h);
        // sun disc
        ctx.globalAlpha = 0.8;
        const discG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.06);
        discG.addColorStop(0, `rgba(255,240,200,0.9)`);
        discG.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.6)`);
        discG.addColorStop(1, "transparent");
        ctx.fillStyle = discG;
        ctx.beginPath(); ctx.arc(sunX, sunY, h * 0.06, 0, Math.PI * 2); ctx.fill();
        // mist layers
        for (const l of state.layers) {
          ctx.globalAlpha = l.alpha;
          ctx.fillStyle = `rgba(180, 170, 160, 0.4)`;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = l.y + Math.sin(x * l.freq + state.t * l.speed * 0.3 + l.phase) * l.amplitude;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
