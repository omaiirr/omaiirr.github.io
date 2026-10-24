    zengarden: {
      // Aurora Nights — rippling aurora curtains over a snowy ridge and a
      // frozen lake that mirrors the glow. Replaces the old static zen sand
      // garden; the id stays `zengarden` so saved themes keep working.
      label: "Aurora Nights",
      defaults: { density: 3, speed: 1, color: "#5ee6b0", scale: 1 },
      presetBgColors: ["#040718", "#070b24", "#0a0f2e", "#02040f", "#0b0a26", "#060a1c"],
      options: [
        { key: "density", label: "Aurora Layers", type: "range", min: 2, max: 5, step: 1 },
        { key: "speed", label: "Sway Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 1.8, step: 0.1 },
        { key: "color", label: "Aurora Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        const curtains = Math.max(2, Math.round(opts.density ?? 3));
        state.curtains = [];
        for (let i = 0; i < curtains; i++) {
          state.curtains.push({
            x: w * (0.06 + Math.random() * 0.4),
            span: w * (0.55 + Math.random() * 0.5),
            base: h * (0.28 + Math.random() * 0.24),
            amp: h * (0.02 + Math.random() * 0.035),
            f1: 2.2 + Math.random() * 2.2,
            f2: 4.5 + Math.random() * 3,
            ph: Math.random() * 6.28,
            sp: 0.25 + Math.random() * 0.35,
            sp2: -0.18 + Math.random() * 0.3,
            a: 0.16 + Math.random() * 0.2,
            drift: (2 + Math.random() * 4) * (h / 1080),
          });
        }
        state.stars = [];
        for (let i = 0; i < 90; i++) {
          state.stars.push({ x: Math.random() * w, y: Math.random() * h * 0.6, r: (Math.random() * 1.1 + 0.3) * state.S, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 1.1 });
        }
        // jagged ridges with snowy caps
        state.ridges = [];
        for (let r = 0; r < 2; r++) {
          const pts = [];
          const n = 8;
          const baseY = h * (0.64 + r * 0.14);
          for (let j = 0; j <= n; j++) {
            const x = (j / n) * w;
            const peakH = h * (0.06 + Math.random() * 0.09) * (1 - r * 0.35);
            const y = baseY - peakH * (0.5 + 0.5 * Math.abs(Math.sin(j * 2.1 + r * 3.3)));
            pts.push({ x, y });
          }
          state.ridges.push({ pts, baseY, r });
        }
        // pines dotting the nearer ridge
        state.pines = [];
        for (let i = 0; i < 9; i++) {
          state.pines.push({ x: w * (0.06 + Math.random() * 0.88), baseY: state.ridges[1].baseY - h * (0.01 + Math.random() * 0.05), hgt: h * (0.05 + Math.random() * 0.06) });
        }
        // shimmering snow sparkles
        state.sparkles = [];
        for (let i = 0; i < 40; i++) {
          state.sparkles.push({ x: Math.random() * w, y: h * (0.68 + Math.random() * 0.32), r: (Math.random() * 1 + 0.3) * state.S, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 1 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const scale = opts.scale ?? 1;
        const aur = opts.color || "#5ee6b0";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        const S = state.S || 1;
        ctx.clearRect(0, 0, w, h);
        const [ar, ag, ab] = _hexToRgb(aur);
        // night sky — deep navy opening up toward the horizon
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(1, _mixHex(bgColor, "#16324a", 0.55));
        } else {
          sky.addColorStop(0, "#040718");
          sky.addColorStop(0.55, "#0a1230");
          sky.addColorStop(1, "#16324a");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        // stars
        for (const st of state.stars) {
          const tw = 0.5 + 0.5 * Math.sin(state.t * st.sp + st.ph);
          ctx.globalAlpha = 0.25 + tw * 0.5;
          ctx.fillStyle = "#e8ecff";
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // aurora curtains — soft ribbons that wave, fold and flicker
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const c of state.curtains) {
          const cx = (c.x + state.t * c.drift * speed) % (w * 1.3) - w * 0.15;
          const n = 42;
          const step = c.span / n;
          for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            ctx.moveTo(cx - step, c.base + 4);
            for (let i = 0; i <= n; i++) {
              const x = cx + i * step;
              const t = i / n;
              const wob = Math.sin(state.t * c.sp + t * c.f1 + c.ph) * c.amp
                + Math.sin(state.t * c.sp2 + t * c.f2 * 0.7 - c.ph) * c.amp * 0.55;
              const y = c.base + wob * (1 + t * 0.4) + (pass === 1 ? Math.sin(state.t * c.sp * 1.3 + t * c.f1 * 0.8) * c.amp * 0.5 : 0);
              ctx.lineTo(x, y);
            }
            ctx.lineTo(cx + step * n + 4, c.base + 4);
            ctx.closePath();
            const bot = c.base + c.amp * 2 + 2;
            const a = c.a * (pass === 1 ? 0.6 : 1);
            const g = ctx.createLinearGradient(0, c.base, 0, bot);
            g.addColorStop(0, `rgba(${ar},${ag},${ab},${a * 0.85})`);
            g.addColorStop(0.55, `rgba(${ar},${ag},${ab},${a * 0.4})`);
            g.addColorStop(1, `rgba(${Math.min(255, ar + 60)},${Math.min(255, ag + 40)},${Math.min(255, ab + 80)},0)`);
            ctx.fillStyle = g;
            ctx.fill();
          }
          // bright flickering hem along the bottom edge
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const x = cx + i * step;
            const t = i / n;
            const wob = Math.sin(state.t * c.sp + t * c.f1 + c.ph) * c.amp
              + Math.sin(state.t * c.sp2 + t * c.f2 * 0.7 - c.ph) * c.amp * 0.55;
            const y = c.base + wob * (1 + t * 0.4);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(232, 255, 248, ${c.a * 0.8})`;
          ctx.lineWidth = 1.6 * scale;
          ctx.stroke();
        }
        ctx.restore();
        // snowy ridges
        for (const ridge of state.ridges) {
          ctx.fillStyle = ridge.r === 0 ? "#10162e" : "#0a0e22";
          ctx.beginPath();
          ctx.moveTo(ridge.pts[0].x, h);
          for (const p of ridge.pts) ctx.lineTo(p.x, p.y);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `rgba(226, 236, 255, ${0.5 - ridge.r * 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (const p of ridge.pts) ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        for (const p of state.pines) _drawPine(ctx, p.x, p.baseY, p.hgt * scale, "#070b1c");
        // frozen lake — dark ice mirroring the aurora
        const lakeY = h * 0.78;
        const lg = ctx.createLinearGradient(0, lakeY, 0, h);
        lg.addColorStop(0, "#0a1226");
        lg.addColorStop(1, "#060a1a");
        ctx.fillStyle = lg;
        ctx.fillRect(0, lakeY, w, h - lakeY);
        // vertical smears of aurora light reflected in the ice
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 26; i++) {
          const x = w * (0.04 + Math.random() * 0.92);
          const len = h * (0.02 + Math.random() * 0.07);
          const a = 0.05 + Math.random() * 0.1;
          const g = ctx.createLinearGradient(0, lakeY, 0, lakeY + len);
          g.addColorStop(0, `rgba(${ar},${ag},${ab},${a})`);
          g.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x, lakeY, 1.5 * S, len);
        }
        ctx.restore();
        // faint cracks in the ice
        ctx.strokeStyle = "rgba(200, 220, 255, 0.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const x0 = w * Math.random(), y0 = lakeY + h * 0.04 * Math.random();
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + w * 0.12 * (Math.random() - 0.5), y0 + h * 0.05);
          ctx.stroke();
        }
        // snow sparkles
        for (const sp of state.sparkles) {
          const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(state.t * sp.sp + sp.ph));
          ctx.globalAlpha = tw * 0.3;
          ctx.fillStyle = "#eef4ff";
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // gentle vignette
        const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(2, 4, 12, 0.4)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      },
    },

