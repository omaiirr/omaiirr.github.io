// eclipse — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const eclipse = {
      label: "Eclipse",
      defaults: { speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a0a1a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2, step: 0.1 },
        { key: "color", label: "Corona Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const mr = Math.min(w, h) * 0.15;
        // corona rays
        const [cr, cg, cb] = _hexToRgb(color);
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2 + state.t * 0.1;
          const rayLen = mr * (1.8 + 0.5 * Math.sin(a * 3 + state.t * 2));
          ctx.globalAlpha = 0.08 + 0.05 * Math.sin(a * 5 + state.t * 3);
          const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.4)`);
          g.addColorStop(1, "transparent");
          ctx.strokeStyle = g; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * mr * 0.9, cy + Math.sin(a) * mr * 0.9);
          ctx.lineTo(cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen);
          ctx.stroke();
        }
        // corona glow
        ctx.globalAlpha = 0.3;
        const corona = ctx.createRadialGradient(cx, cy, mr * 0.9, cx, cy, mr * 2.5);
        corona.addColorStop(0, `rgba(${cr},${cg},${cb},0.3)`);
        corona.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.1)`);
        corona.addColorStop(1, "transparent");
        ctx.fillStyle = corona;
        ctx.beginPath(); ctx.arc(cx, cy, mr * 2.5, 0, Math.PI * 2); ctx.fill();
        // dark moon silhouette
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#010108";
        ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2); ctx.fill();
        // edge highlight
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.4)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2); ctx.stroke();
      },
    };
