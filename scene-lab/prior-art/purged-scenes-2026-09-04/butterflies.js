// butterflies — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const butterflies = {
      label: "Butterflies",
      defaults: { density: 20, speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Butterflies", type: "range", min: 5, max: 60, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Wing Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 20;
        state.butterflies = [];
        for (let i = 0; i < count; i++) {
          state.butterflies.push({
            x: Math.random() * w, y: Math.random() * h * 0.7,
            vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 20,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: Math.random() * 4 + 6,
            size: Math.random() * 4 + 3,
            wander: Math.random() * Math.PI * 2,
            wanderSpeed: Math.random() * 0.5 + 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        for (const b of state.butterflies) {
          b.wingPhase += b.wingSpeed * dt * speed;
          b.wander += b.wanderSpeed * dt;
          b.vx += Math.cos(b.wander) * 12 * dt;
          b.vy += Math.sin(b.wander) * 8 * dt;
          b.vx *= 0.97; b.vy *= 0.97;
          b.x += b.vx * dt * speed; b.y += b.vy * dt * speed;
          if (b.x < -20) b.x = w + 20; if (b.x > w + 20) b.x = -20;
          if (b.y < 10) b.vy += 3 * dt; if (b.y > h * 0.75) b.vy -= 3 * dt;
          const wingOpen = Math.abs(Math.sin(b.wingPhase));
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.globalAlpha = 0.8;
          // wings
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(-b.size * 0.5, 0, b.size, b.size * 0.6 * wingOpen, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(b.size * 0.5, 0, b.size, b.size * 0.6 * wingOpen, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // body
          ctx.fillStyle = "#333";
          ctx.fillRect(-0.5, -b.size * 0.3, 1, b.size * 0.6);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
