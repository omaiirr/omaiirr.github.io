// starorbit — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const starorbit = {
      label: "Star Orbit",
      defaults: { density: 200, speed: 0.5, color: "#93c5fd" },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Stars", type: "range", min: 50, max: 600, step: 10 },
        { key: "speed", label: "Orbit Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Star Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 200;
        state.t = 0; state.stars = [];
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        for (let i = 0; i < count; i++) {
          const dist = Math.random() * maxR;
          const angle = Math.random() * Math.PI * 2;
          state.stars.push({
            dist, angle,
            r: Math.random() * 1.5 + 0.3,
            brightness: 0.3 + Math.random() * 0.7 * (1 - dist / maxR),
            speed: (1 - dist / maxR) * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSp: Math.random() * 2 + 1,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || '#93c5fd';
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        const [cr, cg, cb] = _hexToRgb(color);
        // central nebula glow
        const nebula = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.4);
        nebula.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
        nebula.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.03)`);
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
        // faint orbit ring guides
        ctx.globalAlpha = 0.035;
        ctx.strokeStyle = color; ctx.lineWidth = 0.5;
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath(); ctx.arc(cx, cy, maxR * r * 0.25, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // stars
        for (const s of state.stars) {
          s.twinkle += s.twinkleSp * dt;
          const a = s.angle + state.t * s.speed;
          const x = cx + Math.cos(a) * s.dist;
          const y = cy + Math.sin(a) * s.dist;
          const tw = 0.5 + 0.5 * Math.sin(s.twinkle);
          ctx.globalAlpha = s.brightness * (0.5 + 0.5 * tw) * 0.85;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
          if (s.r > 1) {
            ctx.globalAlpha = s.brightness * tw * 0.12;
            const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 5);
            g.addColorStop(0, color); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, s.r * 5, 0, Math.PI * 2); ctx.fill();
          }
          // orbit trail (fading arc behind the star)
          if (s.r > 0.8) {
            ctx.globalAlpha = s.brightness * 0.06;
            ctx.strokeStyle = color; ctx.lineWidth = s.r * 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, s.dist, a - 0.15, a);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    };
