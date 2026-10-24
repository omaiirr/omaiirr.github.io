    lighttunnel: {
      // Moonlit Clouds — a calm night sky of puffy cumulus drifting under a
      // full moon. The banks are spaced well apart so the sky breathes (the
      // id stays `lighttunnel` for saved-theme compatibility).
      label: "Moonlit Clouds",
      defaults: { density: 3, speed: 1, color: "#c8d2f0", scale: 1 },
      presetBgColors: ["#04070f", "#050a18", "#071224", "#02040a", "#0a0f20", "#060b16"],
      options: [
        { key: "density", label: "Cloud Banks", type: "range", min: 2, max: 5, step: 1 },
        { key: "speed", label: "Drift Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Cloud Size", type: "range", min: 0.5, max: 1.8, step: 0.1 },
        { key: "color", label: "Cloud Tint", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        const banks = Math.max(2, Math.round(opts.density ?? 3));
        state.banks = [];
        for (let i = 0; i < banks; i++) {
          const depth = i / Math.max(1, banks - 1);
          // banks are spaced far apart vertically — a clear band of sky
          // between them (0.22h → 0.8h for three banks)
          const y = h * (0.22 + depth * 0.58);
          state.banks.push({
            y: y + (Math.random() - 0.5) * h * 0.03,
            depth,
            size: (0.72 + depth * 0.6) * (0.92 + Math.random() * 0.2),
            puffs: [],
            sp: (1.5 + Math.random() * 3) * state.S,
            dir: Math.random() < 0.5 ? 1 : -1,
          });
        }
        // each bank is an overlapping row of puffs that reads as ONE connected
        // cloud body spanning the full width
        for (const bk of state.banks) {
          const n = Math.max(8, Math.round(w / (h * 0.09)) + 5);
          for (let j = 0; j < n; j++) {
            const r = h * (0.024 + Math.random() * 0.022) * bk.size;
            bk.puffs.push({
              x: (j / n) * w * 1.06 - w * 0.03 + (Math.random() - 0.5) * w * 0.05,
              y: bk.y + Math.sin(j * 2.1 + bk.depth * 3.4) * h * 0.013 + (Math.random() - 0.5) * h * 0.01,
              r,
              sub: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
                ox: (Math.random() - 0.5) * r * 1.4,
                oy: (Math.random() - 0.5) * r * 0.5,
                sr: r * (0.5 + Math.random() * 0.3),
              })),
              ph: Math.random() * 6.28,
            });
          }
        }
        // a few small drifting puffs floating in the gaps between banks
        state.drifters = [];
        for (let i = 0; i < 7; i++) {
          state.drifters.push({
            x: Math.random() * w,
            y: h * (0.28 + Math.random() * 0.44),
            r: h * (0.011 + Math.random() * 0.013),
            sp: (3 + Math.random() * 6) * state.S,
            dir: Math.random() < 0.5 ? 1 : -1,
          });
        }
        // faint stars in the deep sky
        state.stars = [];
        for (let i = 0; i < 70; i++) {
          state.stars.push({ x: Math.random() * w, y: Math.random() * h * 0.5, r: (Math.random() * 0.9 + 0.3) * state.S, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 1 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const scale = opts.scale ?? 1;
        const tint = opts.color || "#c8d2f0";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const S = state.S || 1;
        const [tr, tg, tb] = _hexToRgb(tint);
        // deep night sky, slightly lighter toward the horizon
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(1, _mixHex(bgColor, "#16283f", 0.5));
        } else {
          sky.addColorStop(0, "#04070f");
          sky.addColorStop(0.6, "#0a1226");
          sky.addColorStop(1, "#13203a");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        // stars
        for (const st of state.stars) {
          const tw = 0.5 + 0.5 * Math.sin(state.t * st.sp + st.ph);
          ctx.globalAlpha = 0.18 + tw * 0.32;
          ctx.fillStyle = "#dfe6ff";
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // the full moon with a soft halo and faint craters
        const mx = w * 0.72, my = h * 0.15, mr = h * 0.05 * scale;
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.2);
        halo.addColorStop(0, "rgba(235, 242, 255, 0.5)");
        halo.addColorStop(0.4, "rgba(235, 242, 255, 0.16)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2); ctx.fill();
        const moonG = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
        moonG.addColorStop(0, "rgba(255, 255, 252, 1)");
        moonG.addColorStop(0.7, "rgba(240, 244, 255, 0.95)");
        moonG.addColorStop(1, "rgba(214, 224, 250, 0.9)");
        ctx.fillStyle = moonG;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(190, 200, 235, 0.28)";
        for (let i = 0; i < 5; i++) {
          const a = i * 1.9 + 0.4;
          const cx2 = mx + Math.cos(a) * mr * 0.45, cy2 = my + Math.sin(a) * mr * 0.4;
          ctx.beginPath(); ctx.arc(cx2, cy2, mr * (0.12 + (i % 2) * 0.06), 0, Math.PI * 2); ctx.fill();
        }
        // each cloud bank: one connected body, silver-lit on top, shaded
        // underneath
        for (const bk of state.banks) {
          for (const pf of bk.puffs) {
            let px = (pf.x + state.t * pf.sp * bk.dir * speed) % (w * 1.1);
            if (px < -w * 0.05) px += w * 1.1;
            const by = bk.y + Math.sin(state.t * 0.25 + pf.ph) * h * 0.004;
            for (const s of pf.sub) {
              const g = ctx.createLinearGradient(0, by + s.oy - s.sr, 0, by + s.oy + s.sr);
              g.addColorStop(0, `rgba(226, 236, 255, ${0.85 - bk.depth * 0.18})`);
              g.addColorStop(0.55, `rgba(${Math.round(tr + (255 - tr) * 0.55)}, ${Math.round(tg + (255 - tg) * 0.55)}, ${Math.round(tb + (255 - tb) * 0.55)}, ${0.8 - bk.depth * 0.15})`);
              g.addColorStop(1, `rgba(${Math.round(tr * 0.28 + 60 * 0.72)}, ${Math.round(tg * 0.28 + 62 * 0.72)}, ${Math.round(tb * 0.28 + 96 * 0.72)}, ${0.42 - bk.depth * 0.08})`);
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(px + s.ox, by + s.oy, s.sr * scale, 0, Math.PI * 2); ctx.fill();
            }
            // moonlit silver top edge
            ctx.fillStyle = `rgba(236, 244, 255, ${0.55 - bk.depth * 0.16})`;
            ctx.beginPath(); ctx.ellipse(px, by - pf.r * 0.42, pf.r * 0.8, pf.r * 0.42, 0, Math.PI, 0); ctx.fill();
          }
        }
        // drifting puff clusters in the gaps between banks
        for (const d of state.drifters) {
          let dx = (d.x + state.t * d.sp * d.dir * speed) % (w * 1.15);
          if (dx < -w * 0.07) dx += w * 1.15;
          const g = ctx.createLinearGradient(0, d.y - d.r, 0, d.y + d.r);
          g.addColorStop(0, "rgba(226, 236, 255, 0.5)");
          g.addColorStop(0.55, `rgba(${Math.round(tr + (255 - tr) * 0.6)}, ${Math.round(tg + (255 - tg) * 0.6)}, ${Math.round(tb + (255 - tb) * 0.6)}, 0.42)`);
          g.addColorStop(1, `rgba(${Math.round(tr * 0.3 + 70 * 0.7)}, ${Math.round(tg * 0.3 + 72 * 0.7)}, ${Math.round(tb * 0.3 + 100 * 0.7)}, 0.2)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(dx, d.y, d.r * 2 * scale, d.r * 1.1 * scale, 0, 0, Math.PI * 2); ctx.fill();
        }
        // soft vignette
        const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(2, 4, 12, 0.4)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      },
    },

