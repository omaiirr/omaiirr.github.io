// lighttunnel — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const lighttunnel = {
      label: "Light Tunnel",
      defaults: { density: 12, speed: 1, color: "#93c5fd", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Rays", type: "range", min: 4, max: 30, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0; state.dust = [];
        const n = 60;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random();
          state.dust.push({ a, d, speed: Math.random() * 0.3 + 0.1, size: Math.random() * 1.5 + 0.3, bright: Math.random() });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const rayCount = Math.round(opts.density ?? 12);
        const color = opts.color || "#93c5fd";
        const bgColor = opts.bgColor || null;
        const sc = opts.scale ?? 1;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || '#020617';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.35;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // broad atmospheric haze
        const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        haze.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
        haze.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.03)`);
        haze.addColorStop(1, 'transparent');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, w, h);
        // volumetric god rays
        for (let i = 0; i < rayCount; i++) {
          const t = i / rayCount;
          const baseAngle = t * Math.PI * 0.8 + Math.PI * 0.1;
          const sway = Math.sin(state.t * 0.15 + i * 1.7) * 0.04;
          const angle = baseAngle + sway;
          const rayLen = Math.max(w, h) * (0.8 + 0.3 * Math.sin(state.t * 0.3 + i));
          const x1 = cx + Math.cos(angle) * rayLen;
          const y1 = cy + Math.sin(angle) * rayLen;
          const baseWidth = (18 + 12 * Math.sin(i * 2.3)) * sc;
          const flicker = 0.5 + 0.5 * Math.sin(state.t * 0.8 + i * 1.1);
          ctx.globalAlpha = (0.04 + 0.03 * flicker);
          const g = ctx.createLinearGradient(cx, cy, x1, y1);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.7)`);
          g.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.25)`);
          g.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.08)`);
          g.addColorStop(1, 'transparent');
          ctx.strokeStyle = g;
          // tapered ray via filled shape
          ctx.beginPath();
          const perpX = -Math.sin(angle), perpY = Math.cos(angle);
          const hw0 = baseWidth * 1.5, hw1 = baseWidth * 0.15;
          ctx.moveTo(cx + perpX * hw0, cy + perpY * hw0);
          ctx.lineTo(x1 + perpX * hw1, y1 + perpY * hw1);
          ctx.lineTo(x1 - perpX * hw1, y1 - perpY * hw1);
          ctx.lineTo(cx - perpX * hw0, cy - perpY * hw0);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        }
        // floating dust motes in the light
        ctx.globalCompositeOperation = 'screen';
        for (const m of state.dust) {
          m.d += m.speed * dt * speed * 0.15;
          if (m.d > 1) { m.d = 0; m.a = Math.random() * Math.PI * 2; }
          const dist = m.d * Math.max(w, h) * 0.55;
          const dx = cx + Math.cos(m.a + state.t * 0.05) * dist;
          const dy = cy + Math.sin(m.a + state.t * 0.05) * dist * 0.8;
          const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(state.t * 2 + m.bright * 10));
          ctx.globalAlpha = glow * 0.5;
          const mg = ctx.createRadialGradient(dx, dy, 0, dx, dy, m.size * 3);
          mg.addColorStop(0, `rgba(255,255,255,${glow})`);
          mg.addColorStop(0.5, `rgba(${cr},${cg},${cb},${glow * 0.4})`);
          mg.addColorStop(1, 'transparent');
          ctx.fillStyle = mg;
          ctx.beginPath(); ctx.arc(dx, dy, m.size * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        // source glow
        ctx.globalAlpha = 0.5 + 0.15 * Math.sin(state.t * 1.2);
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25 * sc);
        sg.addColorStop(0, `rgba(255,255,255,0.9)`);
        sg.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.5)`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, cy, 25 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    };
