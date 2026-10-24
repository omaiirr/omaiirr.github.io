// zengarden — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const zengarden = {
      label: "Zen Garden",
      defaults: { density: 5, speed: 0.5, color: "#c8c0b0" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#0a1a1a", "#0d1117"],
      options: [
        { key: "density", label: "Rocks", type: "range", min: 2, max: 12, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Sand Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 5;
        state.t = 0;
        state.rocks = [];
        for (let i = 0; i < count; i++) {
          const rx = Math.random() * 18 + 8, ry = Math.random() * 12 + 5;
          state.rocks.push({
            x: w * (0.15 + Math.random() * 0.7),
            y: h * (0.25 + Math.random() * 0.45),
            rx, ry, rot: Math.random() * Math.PI,
            dark: 0.3 + Math.random() * 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#c8c0b0";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || '#0a0a14';
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // warm sand fill
        const sandG = ctx.createLinearGradient(0, 0, 0, h);
        sandG.addColorStop(0, `rgba(${cr},${cg},${cb},0.06)`);
        sandG.addColorStop(1, `rgba(${cr},${cg},${cb},0.18)`);
        ctx.fillStyle = sandG;
        ctx.fillRect(0, 0, w, h);
        // animated raked sand lines (flowing horizontal waves)
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = color; ctx.lineWidth = 0.8;
        for (let y = 0; y < h; y += 7) {
          ctx.beginPath();
          const drift = state.t * 8 * (y < h * 0.5 ? 0.6 : 1);
          for (let x = 0; x <= w; x += 3) {
            const dy = Math.sin(x * 0.015 + y * 0.008 + drift * 0.02) * 4
              + Math.sin(x * 0.04 - drift * 0.01) * 2;
            if (x === 0) ctx.moveTo(x, y + dy); else ctx.lineTo(x, y + dy);
          }
          ctx.stroke();
        }
        // rock shadows
        for (const r of state.rocks) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(r.x + 3, r.y + 4, r.rx * 1.1, r.ry * 0.7, r.rot, 0, Math.PI * 2);
          ctx.fill();
        }
        // rocks
        for (const r of state.rocks) {
          const dr = Math.floor(r.dark * 255);
          // body
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = `rgb(${dr},${dr + 2},${dr + 4})`;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, Math.PI * 2); ctx.fill();
          // highlight
          ctx.globalAlpha = 0.25;
          const hg = ctx.createRadialGradient(r.x - r.rx * 0.25, r.y - r.ry * 0.35, 0, r.x, r.y, r.rx);
          hg.addColorStop(0, 'rgba(255,255,255,0.5)');
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, Math.PI * 2); ctx.fill();
        }
        // animated ripples around each rock (expanding concentric ellipses)
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.7;
        for (const r of state.rocks) {
          for (let ring = 1; ring <= 5; ring++) {
            const phase = state.t * 0.4 + ring * 0.8;
            const pulse = Math.sin(phase) * 0.5 + 0.5;
            const rr = Math.max(r.rx, r.ry) + ring * 14 + pulse * 4;
            ctx.globalAlpha = (1 - ring / 6) * 0.12 * (0.6 + 0.4 * pulse);
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, rr, rr * 0.45, r.rot, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // gentle mist at the bottom
        const mist = ctx.createLinearGradient(0, h * 0.85, 0, h);
        mist.addColorStop(0, 'transparent');
        mist.addColorStop(1, `rgba(${cr},${cg},${cb},0.08)`);
        ctx.fillStyle = mist; ctx.globalAlpha = 1;
        ctx.fillRect(0, h * 0.85, w, h * 0.15);
        ctx.globalAlpha = 1;
      },
    };
