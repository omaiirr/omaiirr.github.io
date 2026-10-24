// jellyfish — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const jellyfish = {
      label: "Jellyfish",
      defaults: { density: 8, speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a0a2e", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Jellyfish", type: "range", min: 3, max: 25, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 8;
        state.jellies = [];
        for (let i = 0; i < count; i++) {
          state.jellies.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 15, vy: -(Math.random() * 20 + 10),
            size: Math.random() * 15 + 10,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 2 + 1.5,
            tentacles: Math.floor(Math.random() * 3 + 4),
            wander: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        for (const j of state.jellies) {
          j.pulse += j.pulseSpeed * dt * speed;
          j.wander += 0.3 * dt;
          j.vx += Math.cos(j.wander) * 5 * dt;
          j.vy += Math.sin(j.wander) * 3 * dt;
          j.vx *= 0.99; j.vy *= 0.99;
          j.x += j.vx * dt * speed; j.y += j.vy * dt * speed;
          if (j.x < -30) j.x = w + 30; if (j.x > w + 30) j.x = -30;
          if (j.y < -30) j.y = h + 30; if (j.y > h + 30) j.y = -30;
          const squish = 0.85 + 0.15 * Math.sin(j.pulse);
          // glow
          ctx.globalAlpha = 0.15;
          const glow = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, j.size * 2.5);
          glow.addColorStop(0, color); glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(j.x, j.y, j.size * 2.5, 0, Math.PI * 2); ctx.fill();
          // bell
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(j.x, j.y, j.size * squish, j.size * (1.1 - squish * 0.1), 0, Math.PI, Math.PI * 2);
          ctx.fill();
          // tentacles
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = color; ctx.lineWidth = 1;
          for (let t = 0; t < j.tentacles; t++) {
            const tx = j.x + (t - (j.tentacles - 1) / 2) * (j.size * 0.4);
            ctx.beginPath();
            ctx.moveTo(tx, j.y);
            for (let s = 1; s <= 6; s++) {
              const sy = j.y + s * j.size * 0.3;
              const sx = tx + Math.sin(j.pulse + s * 0.8 + t) * j.size * 0.2;
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    };
