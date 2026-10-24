    blossomstorm: {
      label: "Blossom Storm",
      defaults: { density: 110, speed: 1, color: "#f9a8d4", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#1a1226", "#16122a", "#0f172a", "#2a1222"],
      options: [
        { key: "density", label: "Petals", type: "range", min: 40, max: 300, step: 10 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "scale", label: "Petal Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Blossom Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 110;
        state.S = h / 1080;
        state.t = 0;
        const sc = opts.scale ?? 1;
        state.petals = [];
        for (let i = 0; i < count; i++) {
          const depth = Math.random() * 0.7 + 0.3;
          state.petals.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: (Math.random() * 2.6 + 1.6) * state.S * sc * (0.6 + depth * 0.8),
            depth,
            ph: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 8,
            vy: (Math.random() * 16 + 8) * state.S,
          });
        }
        // ── the cherry tree: the original wide, screen-spanning silhouette.
        // A trunk rises from the bottom-center and the main branches sweep
        // left and right across the top of the frame. Every limb is clamped
        // inside the frame and the trunk base is hidden behind a rolling hill,
        // so the tree is never cut up by the edges.
        state.trunk = [];
        state.clumps = [];
        const minX = w * 0.045, maxX = w * 0.955;
        const minY = h * 0.07, maxY = h * 0.82;
        const grow = (x, y, ang, len, wdt, depth) => {
          let x1 = x + Math.cos(ang) * len;
          let y1 = y + Math.sin(ang) * len;
          x1 = Math.max(minX, Math.min(maxX, x1));
          y1 = Math.max(minY, Math.min(maxY, y1));
          state.trunk.push({ x0: x, y0: y, x1, y1, w: wdt, ph: Math.random() * 6.28, sway: Math.max(0.14, 1 - depth * 0.13) });
          if (depth >= 4) return;
          const kids = 2 + (Math.random() < 0.4 ? 1 : 0);
          for (let i = 0; i < kids; i++) {
            const spread = 0.55 + Math.random() * 0.5;
            const na = ang + (i - (kids - 1) / 2) * spread + (Math.random() - 0.5) * 0.32;
            const nl = len * (0.6 + Math.random() * 0.18);
            const nw = wdt * (0.58 + Math.random() * 0.14);
            grow(x1, y1, na, nl, nw, depth + 1);
          }
        };
        // trunk: starts below the frame (hidden behind the hill) and rises to
        // the branch point at center height
        state.trunk.push({ x0: w * 0.5, y0: h * 1.05, x1: w * 0.5, y1: h * 0.62, w: h * 0.03, ph: 0, sway: 0.9 });
        // main branches sweeping across the whole width of the sky
        grow(w * 0.5, h * 0.62, -Math.PI * 0.5, h * 0.2, h * 0.016, 1);
        grow(w * 0.5, h * 0.62, -Math.PI * 0.74, h * 0.3, h * 0.02, 1);
        grow(w * 0.5, h * 0.62, -Math.PI * 0.26, h * 0.3, h * 0.02, 1);
        grow(w * 0.5, h * 0.62, -Math.PI * 0.94, h * 0.24, h * 0.014, 1);
        grow(w * 0.5, h * 0.62, -Math.PI * 0.06, h * 0.24, h * 0.014, 1);
        // blossom canopy — clusters of translucent petals placed along the
        // branches, spanning the width of the crown
        const clumpN = 48 + Math.floor(Math.random() * 8);
        for (let i = 0; i < clumpN; i++) {
          const seg = state.trunk[1 + Math.floor(Math.random() * (state.trunk.length - 1))] || state.trunk[1];
          const along = Math.random();
          let cx = seg.x0 + (seg.x1 - seg.x0) * along;
          let cy = seg.y0 + (seg.y1 - seg.y0) * along;
          cx += (Math.random() - 0.5) * w * 0.08;
          cy += (Math.random() - 0.5) * h * 0.05;
          cx = Math.max(minX, Math.min(maxX, cx));
          cy = Math.max(minY, Math.min(h * 0.68, cy));
          state.clumps.push({
            x: cx, y: cy,
            r: (h * 0.018 + Math.random() * h * 0.016) * (0.85 + 0.3 * Math.random()),
            ph: Math.random() * Math.PI * 2,
            sp: Math.random() * 0.8 + 0.4,
            tone: Math.random(),
            n: 4 + Math.floor(Math.random() * 3),
          });
        }
        // a subtle rolling hill silhouette at the bottom
        state.hill = [];
        const hn = 12;
        for (let j = 0; j <= hn; j++) {
          state.hill.push({
            x: (j / hn) * w,
            y: h * (0.89 + Math.sin(j * 1.7) * h * 0.028 + Math.sin(j * 0.6 + 2) * h * 0.022),
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#f9a8d4";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const S = state.S || 1;
        // deep night sky
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, bgColor || "#0c0918");
        bg.addColorStop(0.6, bgColor || "#150f28");
        bg.addColorStop(1, bgColor || "#1e1634");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // the moon, upper right, with a soft halo
        const mx = w * 0.78, my = h * 0.16;
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.18);
        halo.addColorStop(0, "rgba(246, 236, 255, 0.4)");
        halo.addColorStop(0.5, "rgba(246, 236, 255, 0.12)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(mx, my, h * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(250, 246, 255, 0.92)";
        ctx.beginPath(); ctx.arc(mx, my, h * 0.028, 0, Math.PI * 2); ctx.fill();
        // a few faint stars
        for (let i = 0; i < 26; i++) {
          const sx = (((i * 137) % 100) / 100) * w;
          const sy = (((i * 61) % 55) / 100) * h;
          const tw = 0.5 + 0.5 * Math.sin(state.t * (0.4 + (i % 5) * 0.2) + i);
          ctx.globalAlpha = 0.12 + tw * 0.2;
          ctx.fillStyle = "#e8e2ff";
          ctx.beginPath(); ctx.arc(sx, sy, (1 + (i % 3)) * S, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // ── the cherry tree ──
        const sway = Math.sin(state.t * 0.5);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // bark: dark plum-purple limbs with a faint lighter top edge so the
        // branches read rounded, like the original
        for (const s of state.trunk) {
          const ox = sway * w * 0.006 * s.sway;
          ctx.strokeStyle = "rgba(58, 47, 82, 0.98)";
          ctx.lineWidth = s.w;
          ctx.beginPath();
          ctx.moveTo(s.x0 + ox * 0.3, s.y0);
          ctx.lineTo(s.x1 + ox, s.y1);
          ctx.stroke();
          ctx.strokeStyle = "rgba(178, 160, 220, 0.28)";
          ctx.lineWidth = Math.max(0.9, s.w * 0.16);
          ctx.beginPath();
          ctx.moveTo(s.x0 + ox * 0.3 + s.w * 0.12, s.y0);
          ctx.lineTo(s.x1 + ox + s.w * 0.12, s.y1);
          ctx.stroke();
        }
        // blossom clusters — overlapping translucent petals
        const [pr, pg, pb] = _hexToRgb(color);
        for (const cl of state.clumps) {
          const ox = sway * w * 0.006 * 0.9;
          const pulse = 1 + 0.05 * Math.sin(state.t * cl.sp + cl.ph);
          const r = cl.r * pulse;
          const cx = cl.x + ox, cy = cl.y + sway * h * 0.003;
          // soft glow around each cluster
          const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.7);
          glow.addColorStop(0, `rgba(${Math.min(255, pr + 46)}, ${Math.min(255, pg + 34)}, ${Math.min(255, pb + 46)}, 0.24)`);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill();
          for (let k2 = 0; k2 < cl.n; k2++) {
            const a2 = cl.ph + k2 * 2.4;
            const dx = Math.cos(a2) * r * 0.6;
            const dy = Math.sin(a2) * r * 0.5;
            const tone = cl.tone + k2 * 0.13;
            const bright = 0.75 + 0.25 * Math.sin(tone * 9);
            ctx.fillStyle = `rgba(${Math.min(255, Math.round(pr * (0.8 + bright * 0.2)))}, ${Math.min(255, Math.round(pg * (0.84 + bright * 0.16)))}, ${Math.min(255, Math.round(pb * (0.88 + bright * 0.12)))}, 0.82)`;
            ctx.beginPath();
            ctx.ellipse(cx + dx, cy + dy, r * 0.58, r * 0.4, a2, 0, Math.PI * 2);
            ctx.fill();
          }
          // a slightly deeper heart for depth
          ctx.fillStyle = `rgba(${Math.round(pr * 0.78)}, ${Math.round(pg * 0.78)}, ${Math.round(pb * 0.82)}, 0.45)`;
          ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.fill();
        }
        // the rolling hill silhouette, hiding the trunk base so nothing is cut
        ctx.fillStyle = "rgba(30, 22, 52, 0.98)";
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (const p of state.hill) ctx.lineTo(p.x, p.y);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(150, 132, 200, 0.14)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (const p of state.hill) ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // falling petals
        const gust = 0.65 + 0.35 * Math.sin(state.t * 1.1) * Math.sin(state.t * 0.23);
        for (const p of state.petals) {
          p.rot += p.rotSp * dt * speed;
          p.x += (55 + p.depth * 60) * S * gust * dt * speed;
          p.y += (p.vy + Math.sin(state.t * 3 + p.ph) * 8 * S) * dt * speed;
          if (p.x > w + 16) { p.x = -16; p.y = Math.random() * h; }
          if (p.y > h + 14) { p.y = -14; p.x = Math.random() * w; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = 0.5 + p.depth * 0.45;
          ctx.fillStyle = p.depth > 0.75 ? color : _mixHex(color, "#0a0a18", 0.22);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },

