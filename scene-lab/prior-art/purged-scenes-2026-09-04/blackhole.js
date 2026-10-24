// blackhole — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const blackhole = {
      label: "Black Hole",
      defaults: { speed: 0.5, color: "#a78bfa" },
      presetBgColors: ["#020617", "#000000", "#0a0015", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Disk Color", type: "color" },
      ],
      init(state) { state.t = 0; state.particles = []; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#a78bfa";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const [cr, cg, cb] = _hexToRgb(color);
        // accretion disk
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.35);
        for (let ring = 0; ring < 40; ring++) {
          const r = Math.min(w, h) * 0.12 + ring * Math.min(w, h) * 0.006;
          const alpha = (1 - ring / 40) * 0.4;
          const hueShift = ring * 3 + state.t * 50;
          const g = ctx.createRadialGradient(0, 0, r - 2, 0, 0, r + 2);
          g.addColorStop(0, `hsla(${(hueShift + 20) % 360}, 80%, 60%, ${alpha * 0.5})`);
          g.addColorStop(0.5, `hsla(${hueShift % 360}, 80%, 55%, ${alpha})`);
          g.addColorStop(1, `hsla(${(hueShift - 20) % 360}, 70%, 45%, ${alpha * 0.5})`);
          ctx.strokeStyle = g; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r, state.t * 0.2 + ring * 0.01, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        // event horizon
        const bhR = Math.min(w, h) * 0.08;
        const bhGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bhR);
        bhGrad.addColorStop(0, "#000000");
        bhGrad.addColorStop(0.8, "#000000");
        bhGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0.2)`);
        ctx.fillStyle = bhGrad;
        ctx.beginPath(); ctx.arc(cx, cy, bhR, 0, Math.PI * 2); ctx.fill();
        // gravitational lensing ring
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, bhR * 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      },
    };
