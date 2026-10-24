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

        // ── the cherry tree, rebuilt from scratch ──
        // A clean, hand-shaped structure rather than a dense blob: a trunk
        // rising from the bottom-left (base tucked behind the hill), a fan
        // of seven primary limbs arcing from up-left across to the far
        // right, each shedding two secondary twigs — then blossom clusters
        // packed along the limbs with a soft gaussian core so the crown
        // reads as a rounded bloom mass densest around (22%w, 50%h),
        // matching the original reference screenshot. Limbs are drawn as
        // tapered polylines so every branch tapers smoothly and never shows
        // seams or gets chopped at the frame edge.
        state.branches = [];
        state.clumps = [];
        const curve = (x0, y0, cx, cy, x1, y1, n) => {
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n, mt = 1 - t;
            pts.push({ x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1 });
          }
          return pts;
        };
        const add = (pts, w0, w1, sway) => {
          state.branches.push({ pts, w0, w1, sway, ph: Math.random() * 6.28 });
        };
        // trunk — three tapering segments, the base hidden behind the hill
        add(curve(w * 0.085, h * 1.06, w * 0.095, h * 0.93, w * 0.115, h * 0.75, 4), h * 0.040, h * 0.028, 0.95);
        add(curve(w * 0.115, h * 0.75, w * 0.128, h * 0.66, w * 0.143, h * 0.59, 4), h * 0.028, h * 0.020, 0.93);
        add(curve(w * 0.143, h * 0.59, w * 0.158, h * 0.545, w * 0.172, h * 0.505, 4), h * 0.020, h * 0.013, 0.90);
        const OX = w * 0.172, OY = h * 0.505;
        // primary limbs — endpoint (fraction of w/h), control, starting width
        const prims = [
          { ex: 0.052, ey: 0.450, cx: 0.100, cy: 0.435, w0: 0.012 },
          { ex: 0.088, ey: 0.385, cx: 0.120, cy: 0.405, w0: 0.012 },
          { ex: 0.152, ey: 0.358, cx: 0.160, cy: 0.420, w0: 0.013 },
          { ex: 0.232, ey: 0.372, cx: 0.205, cy: 0.425, w0: 0.012 },
          { ex: 0.322, ey: 0.440, cx: 0.280, cy: 0.458, w0: 0.011 },
          { ex: 0.412, ey: 0.498, cx: 0.360, cy: 0.475, w0: 0.010 },
          { ex: 0.520, ey: 0.548, cx: 0.455, cy: 0.505, w0: 0.008 },
        ];
        const minX = w * 0.03, maxX = w * 0.60;
        const minY = h * 0.36, maxY = h * 0.66;
        for (let pi = 0; pi < prims.length; pi++) {
          const p = prims[pi];
          const pts = curve(OX, OY, p.cx * w, p.cy * h, p.ex * w, p.ey * h, 6);
          add(pts, p.w0 * h, p.w0 * h * 0.36, 0.92 - Math.random() * 0.08);
          const last = pts[pts.length - 1];
          // two secondary twigs forking off the outer half of each limb
          for (let k = 0; k < 2; k++) {
            const t = 0.55 + k * 0.2;
            const a = pts[Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)))];
            const side = k === 0 ? -1 : 1;
            const dx = last.x - a.x, dy = last.y - a.y;
            const dl = Math.hypot(dx, dy) || 1;
            const px = -dy / dl, py = dx / dl;
            const len = dl * (0.5 + Math.random() * 0.25);
            let ex = a.x + (dx / dl) * len * 0.9 + px * side * len * 0.55;
            let ey = a.y + (dy / dl) * len * 0.9 + py * side * len * 0.55 + (Math.random() - 0.5) * h * 0.015;
            ex = Math.max(minX, Math.min(maxX, ex));
            ey = Math.max(minY, Math.min(maxY, ey));
            const cx2 = (a.x + ex) / 2 + px * side * len * 0.4;
            const cy2 = (a.y + ey) / 2 + py * side * len * 0.4;
            add(curve(a.x, a.y, cx2, cy2, ex, ey, 5), p.w0 * h * 0.5, p.w0 * h * 0.16, 0.80 - Math.random() * 0.15);
          }
        }

        // blossom canopy — clusters packed along the limbs plus a gaussian
        // core, so the mass is densest around (22%w, 50%h) and feathers out
        const clumpN = 130 + Math.floor(Math.random() * 12);
        const weights = state.branches.map(b => {
          let l = 0;
          for (let i = 1; i < b.pts.length; i++) l += Math.hypot(b.pts[i].x - b.pts[i - 1].x, b.pts[i].y - b.pts[i - 1].y);
          return l;
        });
        const totalW = weights.reduce((a, b) => a + b, 0);
        const pickBranch = () => {
          let r = Math.random() * totalW;
          for (let i = 0; i < state.branches.length; i++) {
            r -= weights[i];
            if (r <= 0) return state.branches[i];
          }
          return state.branches[0];
        };
        for (let i = 0; i < clumpN; i++) {
          let cx, cy, small = false, sat = 0;
          const roll = i % 10;
          if (roll < 6) {
            // hug a random branch, biased toward its outer half
            const b = pickBranch();
            const pts = b.pts;
            const t = 0.30 + Math.random() * 0.68;
            const fi = Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)));
            const ti = t * (pts.length - 1) - fi;
            const p0 = pts[fi], p1 = pts[Math.min(pts.length - 1, fi + 1)];
            cx = p0.x + (p1.x - p0.x) * ti + (Math.random() - 0.5) * w * 0.028;
            cy = p0.y + (p1.y - p0.y) * ti + (Math.random() - 0.5) * h * 0.020;
            sat = Math.random() < 0.5 ? 2 : 1;
          } else if (roll < 9) {
            // gaussian core — the solid heart of the crown
            const g = (a, s) => a + (Math.random() + Math.random() + Math.random() - 1.5) * s;
            cx = g(w * 0.22, w * 0.10);
            cy = g(h * 0.50, h * 0.075);
            sat = Math.random() < 0.55 ? 2 : 1;
          } else {
            // sparse trail to the far right, smaller clusters
            cx = w * (0.42 + Math.random() * 0.16);
            cy = h * (0.42 + Math.random() * 0.16);
            small = true;
          }
          cx = Math.max(minX, Math.min(maxX, cx));
          cy = Math.max(minY, Math.min(maxY, cy));
          state.clumps.push({
            x: cx, y: cy,
            r: (small ? h * 0.011 : h * 0.014 + Math.random() * h * 0.012) * (0.85 + 0.3 * Math.random()),
            ph: Math.random() * Math.PI * 2,
            sp: Math.random() * 0.8 + 0.4,
            tone: Math.random(),
            n: small ? 3 : 5 + Math.floor(Math.random() * 3),
            sat,
            small,
          });
        }
        // a soft canopy haze behind the blossoms
        state.haze = {
          x: w * (0.20 + Math.random() * 0.08),
          y: h * (0.52 + Math.random() * 0.05),
          r: w * (0.16 + Math.random() * 0.03),
        };
        // a rolling hill silhouette at the bottom, hiding the trunk base
        state.hill = [];
        const hn = 12;
        for (let j = 0; j <= hn; j++) {
          state.hill.push({
            x: (j / hn) * w,
            y: h * 0.89 + Math.sin(j * 1.7) * h * 0.028 + Math.sin(j * 0.6 + 2) * h * 0.022,
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
        // a soft lavender backlight behind the canopy, so the dark limbs read
        // clearly against the sky
        const back = ctx.createRadialGradient(w * 0.22, h * 0.52, 0, w * 0.22, h * 0.52, w * 0.20);
        back.addColorStop(0, "rgba(116, 96, 190, 0.10)");
        back.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = back;
        ctx.beginPath(); ctx.arc(w * 0.22, h * 0.52, w * 0.20, 0, Math.PI * 2); ctx.fill();
        // pink haze that ties the individual clusters into a crown mass
        if (state.haze) {
          const hz = state.haze;
          const [hr, hg, hb] = _hexToRgb(color);
          const haze = ctx.createRadialGradient(hz.x, hz.y, hz.r * 0.1, hz.x, hz.y, hz.r);
          haze.addColorStop(0, `rgba(${Math.min(255, hr + 30)}, ${Math.min(255, hg + 20)}, ${Math.min(255, hb + 40)}, 0.15)`);
          haze.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haze;
          ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill();
        }
        // bark: tapered polylines — outline, main bark, moon-lit rim — drawn
        // segment by segment with round caps so joints stay seamless
        const rim = mx >= w * 0.5 ? 1 : -1; // lit side faces the moon
        for (const b of state.branches) {
          const pts = b.pts;
          const ox = sway * w * 0.006 * b.sway;
          const n = pts.length - 1;
          const wAt = (i) => b.w0 + (b.w1 - b.w0) * (i / n);
          // dark outline for definition
          ctx.strokeStyle = "rgba(26, 18, 44, 0.95)";
          for (let i = 0; i < n; i++) {
            ctx.lineWidth = wAt(i) + Math.max(1.2, wAt(i) * 0.25);
            ctx.beginPath();
            ctx.moveTo(pts[i].x + ox * (0.3 + i / n), pts[i].y);
            ctx.lineTo(pts[i + 1].x + ox * (0.3 + (i + 1) / n), pts[i + 1].y);
            ctx.stroke();
          }
          // main bark
          ctx.strokeStyle = "rgba(92, 72, 132, 0.98)";
          for (let i = 0; i < n; i++) {
            ctx.lineWidth = wAt(i);
            ctx.beginPath();
            ctx.moveTo(pts[i].x + ox * (0.3 + i / n), pts[i].y);
            ctx.lineTo(pts[i + 1].x + ox * (0.3 + (i + 1) / n), pts[i + 1].y);
            ctx.stroke();
          }
          // moon-lit rim on the lit side
          ctx.strokeStyle = "rgba(200, 182, 244, 0.42)";
          for (let i = 0; i < n; i++) {
            ctx.lineWidth = Math.max(0.7, wAt(i) * 0.16);
            ctx.beginPath();
            ctx.moveTo(pts[i].x + ox * (0.3 + i / n) + rim * wAt(i) * 0.12, pts[i].y);
            ctx.lineTo(pts[i + 1].x + ox * (0.3 + (i + 1) / n) + rim * wAt(i + 1) * 0.12, pts[i + 1].y);
            ctx.stroke();
          }
        }
        // bark texture: a few short darker streaks across the trunk
        const t0 = state.branches[0];
        if (t0 && t0.w0 > 3) {
          ctx.strokeStyle = "rgba(40, 28, 66, 0.6)";
          ctx.lineWidth = Math.max(1, t0.w0 * 0.08);
          const tp = t0.pts;
          for (let k = 0; k < 4; k++) {
            const tt = 0.2 + k * 0.22;
            const fi = Math.min(tp.length - 1, Math.floor(tt * (tp.length - 1)));
            const sx = tp[fi].x + Math.sin(k * 2.1) * t0.w0 * 0.18;
            const sy = tp[fi].y;
            ctx.beginPath();
            ctx.moveTo(sx - t0.w0 * 0.14, sy - t0.w0 * 0.02);
            ctx.lineTo(sx + t0.w0 * 0.10, sy + t0.w0 * 0.04);
            ctx.stroke();
          }
        }
        // blossom clusters — overlapping 5-petal flowers with small satellite
        // sprays, so the crown reads as a mass of bloom, not polka dots
        const [pr, pg, pb] = _hexToRgb(color);
        const drawFlower = (fx, fy, fr, ph) => {
          // soft glow around each flower
          const glow = ctx.createRadialGradient(fx, fy, fr * 0.2, fx, fy, fr * 1.6);
          glow.addColorStop(0, `rgba(${Math.min(255, pr + 46)}, ${Math.min(255, pg + 34)}, ${Math.min(255, pb + 46)}, 0.22)`);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(fx, fy, fr * 1.6, 0, Math.PI * 2); ctx.fill();
          // five petals
          for (let k2 = 0; k2 < 5; k2++) {
            const a2 = ph + k2 * 1.2566;
            const dx = Math.cos(a2) * fr * 0.55;
            const dy = Math.sin(a2) * fr * 0.5;
            const tone = (ph + k2 * 0.13) % 6.28;
            const bright = 0.75 + 0.25 * Math.sin(tone * 9);
            ctx.fillStyle = `rgba(${Math.min(255, Math.round(pr * (0.8 + bright * 0.2)))}, ${Math.min(255, Math.round(pg * (0.84 + bright * 0.16)))}, ${Math.min(255, Math.round(pb * (0.88 + bright * 0.12)))}, 0.82)`;
            ctx.beginPath();
            ctx.ellipse(fx + dx, fy + dy, fr * 0.5, fr * 0.34, a2, 0, Math.PI * 2);
            ctx.fill();
          }
          // the flower heart
          ctx.fillStyle = `rgba(${Math.round(pr * 0.78)}, ${Math.round(pg * 0.78)}, ${Math.round(pb * 0.82)}, 0.5)`;
          ctx.beginPath(); ctx.arc(fx, fy, fr * 0.22, 0, Math.PI * 2); ctx.fill();
        };
        for (const cl of state.clumps) {
          const pulse = 1 + 0.05 * Math.sin(state.t * cl.sp + cl.ph);
          const r = cl.r * pulse;
          const cx = cl.x + sway * w * 0.0054, cy = cl.y + sway * h * 0.003;
          drawFlower(cx, cy, r * (cl.small ? 0.75 : 1), cl.ph);
          for (let s = 0; s < cl.sat; s++) {
            const sa = cl.ph + s * 2.1 + 1;
            drawFlower(cx + Math.cos(sa) * r * 0.95, cy + Math.sin(sa) * r * 0.8, r * 0.55, sa);
          }
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
