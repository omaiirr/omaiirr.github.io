// fireflies — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const fireflies = {
      label: "Fireflies",
      defaults: { density: 50, speed: 1, color: "#fef08a" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1208", "#0d1117"],
      options: [
        { key: "density", label: "Fireflies", type: "range", min: 10, max: 120, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Glow Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 50;
        state.fireflies = [];
        for (let i = 0; i < count; i++) {
          state.fireflies.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 2 + 1,
            r: Math.random() * 2 + 1,
            wander: Math.random() * Math.PI * 2,
            wanderSpeed: Math.random() * 0.8 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fef08a";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        // grass ground
        ctx.fillStyle = "#0a1a0a";
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.82 + Math.sin(x * 0.02) * 12);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        for (const f of state.fireflies) {
          f.phase += f.pulseSpeed * dt * speed;
          f.wander += f.wanderSpeed * dt;
          f.vx += Math.cos(f.wander) * 15 * dt;
          f.vy += Math.sin(f.wander) * 10 * dt;
          f.vx *= 0.98; f.vy *= 0.98;
          f.x += f.vx * dt * speed; f.y += f.vy * dt * speed;
          if (f.x < 0) f.x = w; if (f.x > w) f.x = 0;
          if (f.y < h * 0.2) f.vy += 5 * dt;
          if (f.y > h * 0.85) f.vy -= 5 * dt;
          const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.phase));
          // outer glow
          ctx.globalAlpha = brightness * 0.15;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 12);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.6)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 12, 0, Math.PI * 2); ctx.fill();
          // core
          ctx.globalAlpha = brightness * 0.9;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
          // bright center
          ctx.globalAlpha = brightness;
          ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
