// thunderstorm — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const thunderstorm = {
      label: "Thunderstorm",
      defaults: { density: 100, speed: 1, color: "#94a3b8" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#0a0e1a", "#0d1117"],
      options: [
        { key: "density", label: "Rain", type: "range", min: 30, max: 250, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Rain Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 100;
        state.drops = [];
        for (let i = 0; i < count; i++) {
          state.drops.push({
            x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 20 + 8,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1.5),
          });
        }
        state.lightning = 0;
        state.lightningTimer = 2 + Math.random() * 5;
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#94a3b8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        // dark stormy sky
        ctx.fillStyle = bgColor || "#0a0e1a";
        ctx.fillRect(0, 0, w, h);
        // lightning flash
        state.lightningTimer -= dt * speed;
        if (state.lightningTimer <= 0) {
          state.lightning = 0.8 + Math.random() * 0.2;
          state.lightningTimer = 3 + Math.random() * 8;
        }
        state.lightning *= 0.85;
        if (state.lightning > 0.05) {
          ctx.fillStyle = `rgba(200, 210, 255, ${state.lightning * 0.15})`;
          ctx.fillRect(0, 0, w, h);
        }
        // rain
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = "round";
        for (const d of state.drops) {
          d.y += d.speed * 500 * dt; d.x += d.speed * 30 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          if (d.x > w) d.x = 0;
          ctx.globalAlpha = 0.3 + (d.len / 28) * 0.4;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y + d.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
