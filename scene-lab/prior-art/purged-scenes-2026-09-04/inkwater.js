// inkwater — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const inkwater = {
      label: "Ink in Water",
      defaults: { density: 6, speed: 1, color: "#7c3aed" },
      presetBgColors: ["#020617", "#000000", "#0a0a1a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Ink Drops", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Ink Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 6;
        state.ink = [];
        for (let i = 0; i < count; i++) {
          state.ink.push({
            x: w * (0.2 + Math.random() * 0.6),
            y: h * (0.1 + Math.random() * 0.3),
            r: 0, maxR: Math.random() * 60 + 40,
            growSpeed: Math.random() * 20 + 10,
            drift: (Math.random() - 0.5) * 20,
            life: 0, delay: i * 1.5 + Math.random() * 2,
            alpha: Math.random() * 0.3 + 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#7c3aed";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a0a1a";
        ctx.fillRect(0, 0, w, h);
        for (const ink of state.ink) {
          ink.delay -= dt * speed;
          if (ink.delay > 0) continue;
          ink.life += dt * speed * 0.15;
          ink.r = Math.min(ink.maxR, ink.r + ink.growSpeed * dt * speed);
          ink.x += ink.drift * dt;
          ink.y += 8 * dt * speed;
          if (ink.life > 1.5) {
            ink.r = 0; ink.life = 0; ink.delay = 0;
            ink.x = w * (0.2 + Math.random() * 0.6);
            ink.y = h * (0.1 + Math.random() * 0.3);
          }
          const fade = ink.life < 0.5 ? ink.life * 2 : Math.max(0, 1 - (ink.life - 0.5) * 2);
          // ink blob
          ctx.globalAlpha = ink.alpha * fade;
          const g = ctx.createRadialGradient(ink.x, ink.y, 0, ink.x, ink.y, ink.r);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.8)`);
          g.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.3)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          // organic shape via multiple circles
          for (let b = 0; b < 5; b++) {
            const bx = ink.x + Math.sin(ink.life * 3 + b * 1.3) * ink.r * 0.3;
            const by = ink.y + Math.cos(ink.life * 2.5 + b * 1.7) * ink.r * 0.3;
            const br = ink.r * (0.4 + Math.sin(b * 2.1) * 0.2);
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    };
