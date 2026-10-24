// cloudsea — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const cloudsea = {
      label: "Cloud Sea",
      defaults: { density: 8, speed: 0.5, scale: 1, color: "#94a3b8" },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#0a1a2e", "#0d1117"],
      options: [
        { key: "density", label: "Clouds", type: "range", min: 3, max: 20, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Cloud Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Cloud Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 8;
        const sc = opts.scale ?? 1;
        state.clouds = [];
        for (let i = 0; i < count; i++) {
          state.clouds.push({
            x: Math.random() * w * 1.5 - w * 0.25,
            y: h * 0.4 + Math.random() * h * 0.45,
            rx: (Math.random() * 120 + 80) * sc,
            ry: (Math.random() * 40 + 20) * sc,
            speed: (Math.random() * 8 + 3) * (opts.speed ?? 0.5),
            alpha: Math.random() * 0.3 + 0.1,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const color = opts.color || "#94a3b8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#0f172a");
        sky.addColorStop(0.4, bgColor || "#1a2540");
        sky.addColorStop(1, bgColor || "#2a3550");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // distant mountains
        ctx.fillStyle = "rgba(20, 30, 50, 0.6)";
        ctx.beginPath(); ctx.moveTo(0, h * 0.65);
        for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * 0.65 - Math.sin(x * 0.005) * 30 - Math.sin(x * 0.013) * 15);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        // clouds
        const [cr, cg, cb] = _hexToRgb(color);
        for (const c of state.clouds) {
          c.x += c.speed * dt;
          if (c.x - c.rx > w) c.x = -c.rx * 2;
          ctx.globalAlpha = c.alpha;
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.5)`);
          g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.2)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
