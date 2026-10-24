// dandelion — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const dandelion = {
      label: "Dandelion Seeds",
      defaults: { density: 40, speed: 1, color: "#e2e8f0" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1a08", "#0d1117"],
      options: [
        { key: "density", label: "Seeds", type: "range", min: 10, max: 100, step: 5 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Seed Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 40;
        state.seeds = [];
        for (let i = 0; i < count; i++) {
          state.seeds.push({
            x: Math.random() * w * 1.5 - w * 0.25,
            y: Math.random() * h * 0.8,
            vx: (Math.random() * 25 + 10),
            vy: -(Math.random() * 15 + 5),
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 2,
            wobble: Math.random() * Math.PI * 2,
            wobbleSp: Math.random() * 1.5 + 0.5,
            wobbleAmp: Math.random() * 15 + 5,
            alpha: Math.random() * 0.4 + 0.5,
            size: Math.random() * 4 + 3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#e2e8f0";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        const gust = 0.6 + 0.4 * Math.sin(state.t * 0.4);
        for (const s of state.seeds) {
          s.rot += s.rotSp * dt * speed;
          s.wobble += s.wobbleSp * dt;
          s.x += s.vx * gust * dt * speed;
          s.y += s.vy * dt * speed + Math.sin(s.wobble) * s.wobbleAmp * dt;
          if (s.x > w + 30) { s.x = -30; s.y = Math.random() * h * 0.7; }
          if (s.y < -20) { s.y = h * 0.8; s.x = -20; }
          ctx.save();
          ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.globalAlpha = s.alpha;
          ctx.strokeStyle = color; ctx.lineWidth = 0.5;
          // stem
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s.size * 3); ctx.stroke();
          // seed puff (starburst)
          const rays = 6;
          for (let r = 0; r < rays; r++) {
            const a = (r / rays) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
            ctx.stroke();
            // tiny dot at tip
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * s.size, Math.sin(a) * s.size, 0.6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
