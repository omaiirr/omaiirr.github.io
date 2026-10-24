// campfire — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const campfire = {
      label: "Campfire",
      defaults: { density: 30, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#1a0f0a", "#0f172a", "#1e0a0a", "#0d1117"],
      options: [
        { key: "density", label: "Sparks", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Fire Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 30;
        state.sparks = [];
        for (let i = 0; i < count; i++) {
          state.sparks.push({
            x: w * 0.5 + (Math.random() - 0.5) * w * 0.08,
            y: h * 0.7 + Math.random() * h * 0.05,
            vx: (Math.random() - 0.5) * 30,
            vy: -(Math.random() * 80 + 40),
            r: Math.random() * 2 + 0.5,
            life: Math.random(),
            lifeSpeed: Math.random() * 0.5 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#f97316";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        // fire glow at base
        const fireGlow = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, h * 0.25);
        fireGlow.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
        fireGlow.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
        fireGlow.addColorStop(1, "transparent");
        ctx.fillStyle = fireGlow;
        ctx.fillRect(0, 0, w, h);
        // fire flicker
        const flicker = 0.7 + 0.3 * Math.sin(state.t * 8) * Math.sin(state.t * 13);
        const fireH = h * 0.15 * flicker;
        const fireGrad = ctx.createLinearGradient(0, h * 0.72, 0, h * 0.72 - fireH);
        fireGrad.addColorStop(0, `rgba(255, 180, 50, 0.8)`);
        fireGrad.addColorStop(0.3, `rgba(${cr},${cg},${cb}, 0.6)`);
        fireGrad.addColorStop(1, "transparent");
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - w * 0.03, h * 0.72);
        ctx.quadraticCurveTo(w * 0.5 - w * 0.01, h * 0.72 - fireH * 0.7, w * 0.5, h * 0.72 - fireH);
        ctx.quadraticCurveTo(w * 0.5 + w * 0.01, h * 0.72 - fireH * 0.7, w * 0.5 + w * 0.03, h * 0.72);
        ctx.closePath(); ctx.fill();
        // sparks
        for (const s of state.sparks) {
          s.life += s.lifeSpeed * dt * speed;
          if (s.life > 1) {
            s.life = 0;
            s.x = w * 0.5 + (Math.random() - 0.5) * w * 0.08;
            s.y = h * 0.7 + Math.random() * h * 0.05;
            s.vx = (Math.random() - 0.5) * 30;
            s.vy = -(Math.random() * 80 + 40);
          }
          s.x += s.vx * dt * speed;
          s.y += s.vy * dt * speed;
          s.vy += 20 * dt; // gravity
          const fade = 1 - s.life;
          ctx.globalAlpha = fade * 0.8;
          ctx.fillStyle = s.life < 0.3 ? "#fffbe6" : color;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * fade, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
