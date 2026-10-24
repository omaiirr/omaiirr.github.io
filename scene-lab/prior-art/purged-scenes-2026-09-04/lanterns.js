// lanterns — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const lanterns = {
      label: "Floating Lanterns",
      defaults: { density: 15, speed: 1, color: "#fbbf24" },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Lanterns", type: "range", min: 5, max: 40, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Lantern Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 15;
        state.lanterns = [];
        for (let i = 0; i < count; i++) {
          state.lanterns.push({
            x: Math.random() * w, y: h + Math.random() * h * 0.5,
            vy: -(Math.random() * 25 + 10),
            vx: (Math.random() - 0.5) * 8,
            size: Math.random() * 8 + 6,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 3 + 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fbbf24";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#1a0f08";
        ctx.fillRect(0, 0, w, h);
        for (const l of state.lanterns) {
          l.y += l.vy * dt * speed;
          l.x += l.vx * dt + Math.sin(l.y * 0.01) * 0.5;
          l.flicker += l.flickerSpeed * dt;
          if (l.y < -l.size * 3) {
            l.y = h + l.size * 3; l.x = Math.random() * w;
          }
          const brightness = 0.7 + 0.3 * Math.sin(l.flicker);
          // outer glow
          ctx.globalAlpha = brightness * 0.15;
          const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.size * 4);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.6)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(l.x, l.y, l.size * 4, 0, Math.PI * 2); ctx.fill();
          // lantern body
          ctx.globalAlpha = brightness * 0.8;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(l.x, l.y, l.size * 0.7, l.size, 0, 0, Math.PI * 2);
          ctx.fill();
          // bright core
          ctx.globalAlpha = brightness;
          ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(l.x, l.y, l.size * 0.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
