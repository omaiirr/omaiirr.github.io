// ornate — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const ornate = {
      label: "Ornate",
      defaults: { density: 8, speed: 1, color: "#fbbf24", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Rings", type: "range", min: 3, max: 15, step: 1 },
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fbbf24";
        const bgColor = opts.bgColor || null;
        const sc = opts.scale ?? 1;
        const rings = Math.round(opts.density ?? 8);
        state.t += dt * speed;
        const TAU = Math.PI * 2;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.42 * sc;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.save(); ctx.translate(cx, cy);
        // breathing pulse
        const breathe = 1 + 0.06 * Math.sin(state.t * 1.5);
        ctx.scale(breathe, breathe);
        // outer glow
        const glowR = maxR * 1.1;
        const glow = ctx.createRadialGradient(0, 0, maxR * 0.3, 0, 0, glowR);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.06)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
        // rings
        for (let r = 0; r < rings; r++) {
          const t = r / Math.max(1, rings - 1);
          const radius = (maxR * 0.12 + t * maxR * 0.88);
          const petals = 5 + Math.floor(r * 2.5);
          const rot = state.t * (0.3 + r * 0.08) * (r % 2 === 0 ? 1 : -1);
          const ringAlpha = 0.15 + (1 - t) * 0.35;
          // petal glow
          ctx.globalAlpha = ringAlpha * 0.15;
          const rg = ctx.createRadialGradient(0, 0, radius - 8, 0, 0, radius + 8);
          rg.addColorStop(0, 'transparent');
          rg.addColorStop(0.5, color); rg.addColorStop(1, 'transparent');
          ctx.strokeStyle = rg; ctx.lineWidth = 12 * sc;
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
          // filigree petals (teardrop shapes)
          for (let p = 0; p < petals; p++) {
            const a = (p / petals) * TAU + rot;
            const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
            const ps = (5 + r * 0.8) * sc;
            const breathe2 = 0.8 + 0.2 * Math.sin(state.t * 2 + p * 0.5 + r);
            ctx.globalAlpha = ringAlpha * (0.4 + 0.3 * breathe2);
            ctx.fillStyle = color;
            ctx.save(); ctx.translate(px, py); ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-ps * 0.6, -ps * 0.8, -ps * 0.3, -ps * 1.8, 0, -ps * 2);
            ctx.bezierCurveTo(ps * 0.3, -ps * 1.8, ps * 0.6, -ps * 0.8, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          // connecting arcs between petals
          ctx.globalAlpha = ringAlpha * 0.25;
          ctx.strokeStyle = color; ctx.lineWidth = 0.7 * sc;
          for (let p = 0; p < petals; p++) {
            const a1 = (p / petals) * TAU + rot;
            const a2 = ((p + 1) / petals) * TAU + rot;
            const mx = Math.cos((a1 + a2) / 2) * radius * 0.92;
            const my = Math.sin((a1 + a2) / 2) * radius * 0.92;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
            ctx.quadraticCurveTo(mx, my, Math.cos(a2) * radius, Math.sin(a2) * radius);
            ctx.stroke();
          }
        }
        // center mandala jewel
        ctx.globalAlpha = 0.9;
        for (let s = 3; s >= 0; s--) {
          const jr = (8 + s * 4) * sc;
          const jg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, jr);
          jg2.addColorStop(0, `rgba(255,250,220,0.9)`);
          jg2.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.6)`);
          jg2.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.15)`);
          jg2.addColorStop(1, 'transparent');
          ctx.fillStyle = jg2;
          ctx.beginPath(); ctx.arc(0, 0, jr, 0, TAU); ctx.fill();
        }
        // tiny inner spokes
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color; ctx.lineWidth = 0.5 * sc;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + state.t * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 12 * sc, Math.sin(a) * 12 * sc);
          ctx.lineTo(Math.cos(a) * maxR * 0.15, Math.sin(a) * maxR * 0.15);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    };
