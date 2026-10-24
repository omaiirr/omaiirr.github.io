// neoncity — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const neoncity = {
      label: "Neon City",
      defaults: { density: 12, speed: 1, color: "#ff6ec7" },
      presetBgColors: ["#0a0a1a", "#050510", "#0d0a1f", "#120820", "#08081a", "#0a0f1e"],
      options: [
        { key: "density", label: "Buildings", type: "range", min: 6, max: 25, step: 1 },
        { key: "speed", label: "Animation", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Neon Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        const count = opts.density ?? 12;
        state.buildings = [];
        const [nr, ng, nb] = _hexToRgb(opts.color || "#ff6ec7");
        for (let i = 0; i < count; i++) {
          const bw = w / count * (0.6 + Math.random() * 0.6);
          const bh = h * (0.15 + Math.random() * 0.45);
          const x = (i / count) * w + (Math.random() - 0.5) * (w / count) * 0.3;
          const neonHue = Math.random();
          state.buildings.push({
            x, w: bw, h: bh,
            windows: Math.floor(Math.random() * 12 + 4),
            neonColor: `rgb(${Math.round(nr * neonHue + 80 * (1 - neonHue))},${Math.round(ng * neonHue + 40 * (1 - neonHue))},${Math.round(nb * neonHue + 200 * (1 - neonHue))})`,
            neonY: 0.3 + Math.random() * 0.4,
            flicker: Math.random() * Math.PI * 2,
          });
        }
        state.raindrops = [];
        for (let i = 0; i < 60; i++) {
          state.raindrops.push({ x: Math.random() * w, y: Math.random() * h, len: Math.random() * 12 + 4, speed: (Math.random() * 0.4 + 0.3) * (opts.speed ?? 1) });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#0a0a1a"); sky.addColorStop(1, bgColor || "#120820");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // buildings
        for (const b of state.buildings) {
          const by = h - b.h;
          ctx.fillStyle = "#0e0e1a";
          ctx.fillRect(b.x, by, b.w, b.h);
          // windows
          const cols = Math.floor(b.w / 14);
          const rows = Math.floor(b.h / 18);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (Math.random() > 0.4) {
                const wx = b.x + 6 + c * (b.w - 12) / Math.max(1, cols - 1);
                const wy = by + 8 + r * (b.h - 16) / Math.max(1, rows - 1);
                const brightness = 0.3 + Math.random() * 0.5;
                ctx.fillStyle = `rgba(200, 220, 255, ${brightness * 0.6})`;
                ctx.fillRect(wx - 2, wy - 3, 4, 6);
              }
            }
          }
          // neon sign
          const ny = by + b.h * b.neonY;
          const flick = 0.6 + 0.4 * Math.sin(state.t * 3 + b.flicker);
          ctx.globalAlpha = flick * 0.8;
          ctx.strokeStyle = b.neonColor; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(b.x + 4, ny); ctx.lineTo(b.x + b.w - 4, ny); ctx.stroke();
          // neon glow
          ctx.globalAlpha = flick * 0.2;
          ctx.shadowColor = b.neonColor; ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.moveTo(b.x + 4, ny); ctx.lineTo(b.x + b.w - 4, ny); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        // rain
        ctx.strokeStyle = "rgba(140, 160, 200, 0.25)"; ctx.lineWidth = 1;
        for (const d of state.raindrops) {
          d.y += d.speed * 400 * dt; d.x += d.speed * 20 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y + d.len); ctx.stroke();
        }
        // wet street reflections
        const gy = h * 0.88;
        const street = ctx.createLinearGradient(0, gy, 0, h);
        street.addColorStop(0, "rgba(14, 17, 32, 0.95)"); street.addColorStop(1, "rgba(5, 6, 12, 0.98)");
        ctx.fillStyle = street;
        ctx.fillRect(0, gy, w, h - gy);
        for (const b of state.buildings) {
          const ny = h - b.h * b.neonY;
          const refl = ctx.createLinearGradient(0, ny, 0, h);
          refl.addColorStop(0, "rgba(0,0,0,0)");
          refl.addColorStop(0.3, b.neonColor.replace("rgb", "rgba").replace(")", ",0.08)"));
          refl.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = refl;
          ctx.fillRect(b.x, ny, b.w, h - ny);
        }
      },
    };
