// koi — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const koi = {
      label: "Koi Pond",
      defaults: { density: 5, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "density", label: "Fish", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Fish Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 5;
        state.fish = [];
        const colors = ["#f97316", "#ef4444", "#fbbf24", "#ffffff"];
        for (let i = 0; i < count; i++) {
          state.fish.push({
            x: Math.random() * w, y: Math.random() * h,
            angle: Math.random() * Math.PI * 2,
            speed: (Math.random() * 30 + 20) * (opts.speed ?? 1),
            size: Math.random() * 12 + 8,
            wander: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            tailPhase: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        // water ripples
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 4; i++) {
          const rx = w * (0.3 + i * 0.15);
          const ry = h * (0.3 + Math.sin(i * 2.1) * 0.2);
          const rr = 30 + Math.sin((state.t || 0) + i) * 10;
          ctx.strokeStyle = "#4a9"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        state.t = (state.t || 0) + dt * speed;
        for (const f of state.fish) {
          f.wander += (Math.random() - 0.5) * 2 * dt;
          f.angle += f.wander * dt;
          f.x += Math.cos(f.angle) * f.speed * dt;
          f.y += Math.sin(f.angle) * f.speed * dt;
          if (f.x < -30) f.x = w + 30; if (f.x > w + 30) f.x = -30;
          if (f.y < -30) f.y = h + 30; if (f.y > h + 30) f.y = -30;
          f.tailPhase += dt * 8;
          ctx.save();
          ctx.translate(f.x, f.y); ctx.rotate(f.angle);
          // body
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size, f.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          // tail
          const tailSwing = Math.sin(f.tailPhase) * f.size * 0.3;
          ctx.beginPath();
          ctx.moveTo(-f.size * 0.8, 0);
          ctx.lineTo(-f.size * 1.3, -f.size * 0.3 + tailSwing);
          ctx.lineTo(-f.size * 1.3, f.size * 0.3 + tailSwing);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
