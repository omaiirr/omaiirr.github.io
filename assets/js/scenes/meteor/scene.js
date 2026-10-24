(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function _ridgePoints(w, h, baseY, amp, ph1, ph2, seed) {
    const n = Math.max(10, Math.round(w / 48));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const y =
        baseY * h
        - h
        * amp
        * (0.55
          + 0.3 * Math.sin(u * Math.PI * 2.3 + ph1 + seed)
          + 0.15 * Math.sin(u * Math.PI * 5.1 + ph2 + seed * 2.4));
      pts.push({ x: u * w, y });
    }
    return pts;
  }

  ThemeScenes.register("meteor", {
    label: "Meteor Shower",
    defaults: { density: 18, speed: 1, color: "#f59e0b", scale: 1 },
    presetBgColors: ["#020617", "#000000", "#050b18", "#0a0e27", "#0f172a", "#1a0a2e"],
    presetCombos: [
      { color: "#f59e0b", bg: "#020617" }, 
      { color: "#7dd3fc", bg: "#050b18" }, 
      { color: "#f472b6", bg: "#1a0a2e" }, 
      { color: "#34d399", bg: "#06170f" }, 
      { color: "#ef4444", bg: "#0f0a0a" }, 
      { color: "#e2e8f0", bg: "#0d1117" }, 
    ],
    options: [
      { key: "density", label: "Meteors / min", type: "range", min: 5, max: 40, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
      { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
      { key: "color", label: "Meteor Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      state.meteors = [];
      state.fireballs = [];
      state.spawn = 0.4 + Math.random() * 0.8;

      state.stars = [];
      const nStars = Math.round((w * h) / 9000);
      for (let i = 0; i < nStars; i++) {
        const yFrac = Math.pow(Math.random(), 1.5) * 0.62;
        state.stars.push({
          x: Math.random() * w,
          y: yFrac * h,
          r: (0.3 + Math.random() * 1.0) * state.S,
          a: 0.25 + Math.random() * 0.55,
          tw: Math.random() * Math.PI * 2,
          twSp: 0.4 + Math.random() * 1.6,
        });
      }

      state.ridges = [
        { pts: _ridgePoints(w, h, 0.72, 0.1, 1.7, 0.6, 0.4), col: "rgba(43,60,110,0.55)", baseY: 0.72, amp: 0.1, rgb: [43, 60, 110], ph: 0.4 }, 
        { pts: _ridgePoints(w, h, 0.8, 0.13, 3.9, 1.8, 1.1), col: "rgba(24,34,68,0.92)", baseY: 0.8, amp: 0.13, rgb: [24, 34, 68], ph: 2.1 }, 
        { pts: _ridgePoints(w, h, 0.88, 0.16, 0.9, 3.1, 2.6), col: "rgba(9,13,30,0.98)", baseY: 0.88, amp: 0.16, rgb: [9, 13, 30], ph: 3.9 }, 
      ];
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const color = opts.color || "#f59e0b";
      const scale = opts.scale ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed; 
      const dtm = dt * speed; 
      const S = state.S * scale;

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#020409");
        sky.addColorStop(0.55, "#050a18");
        sky.addColorStop(0.85, "#0b1430");
        sky.addColorStop(1, "#0d1732");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = "#e6ecff";
      for (const st of state.stars) {
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(st.tw + t * st.twSp));
        ctx.globalAlpha = st.a * tw * (st.y < h * 0.5 ? 1 : 0.6);
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const ridgePath = (pts) => {
        ctx.beginPath();
        ctx.moveTo(-4, h + 4);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineTo(w + 4, h + 4);
        ctx.closePath();
      };
      for (const r of state.ridges) {
        ridgePath(r.pts);
        const shim = 0.88 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.35 + r.ph));
        ctx.globalAlpha = shim;
        ctx.fillStyle = r.col;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const moonTint = [226, 233, 255]; 
      for (const r of state.ridges) {
        const breathe = 0.5 + 0.5 * Math.sin(t * 0.5 + r.ph * 1.3);
        const cx = w * (0.5 + 0.32 * Math.sin(t * 0.11 + r.ph * 1.7));
        const yTop = (r.baseY - r.amp * 1.4) * h;
        const yBot = (r.baseY + r.amp * 0.5) * h;
        const mix = 0.35;
        const lr = Math.round(r.rgb[0] + (moonTint[0] - r.rgb[0]) * mix);
        const lg = Math.round(r.rgb[1] + (moonTint[1] - r.rgb[1]) * mix);
        const lb = Math.round(r.rgb[2] + (moonTint[2] - r.rgb[2]) * mix);
        const peakA = 0.04 + 0.15 * breathe;
        const sheen = ctx.createLinearGradient(
          cx - w * 0.5,
          yTop,
          cx + w * 0.5,
          yBot,
        );
        sheen.addColorStop(0, `rgba(${lr},${lg},${lb},${peakA.toFixed(3)})`);
        sheen.addColorStop(
          0.42,
          `rgba(${lr},${lg},${lb},${(peakA * 0.45).toFixed(3)})`,
        );
        sheen.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
        ridgePath(r.pts);
        ctx.fillStyle = sheen;
        ctx.fill();
      }

      state.spawn -= dtm;
      if (state.spawn <= 0) {
        state.spawn = (60 / Math.max(1, opts.density ?? 18)) * (0.38 + Math.random() * 0.65);
        if (Math.random() < 0.13) {
          state.fireballs.push({
            x: w * (0.5 + Math.random() * 0.5),
            y: h * (0.03 + Math.random() * 0.26),
            vx: -(150 + Math.random() * 130) * state.S,
            vy: (100 + Math.random() * 110) * state.S,
            life: 1,
            flash: 0.85 + Math.random() * 0.15,
            sz: (1 + Math.random() * 0.6) * S,
          });
        } else {
          state.meteors.push({
            x: w * (0.5 + Math.random() * 0.5),
            y: h * (0.02 + Math.random() * 0.36),
            vx: -(120 + Math.random() * 140) * state.S,
            vy: (70 + Math.random() * 100) * state.S,
            life: 1.2 + Math.random() * 0.8,
            sz: (0.9 + Math.random() * 1.1) * S,
            tailFrac: 0.16 + Math.random() * 0.1, 
          });
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const [cr, cg, cb] = _hexToRgb(color);
      const hot = [Math.min(255, cr + 70), Math.min(255, cg + 70), Math.min(255, cb + 40)];
      for (const m of state.meteors) {
        m.x += m.vx * dtm;
        m.y += m.vy * dtm;
        m.life -= dtm * 0.32;
        if (m.life <= 0) continue;
        const sz = m.sz ?? (0.9 + Math.random() * 1.1) * state.S;
        const tailFrac = m.tailFrac ?? 0.2;
        const spd = Math.hypot(m.vx, m.vy) || 1;
        const len = spd * tailFrac; 
        const tx = m.x - (m.vx / spd) * len;
        const ty = m.y - (m.vy / spd) * len;
        const lw = Math.max(1.1, 2.1 * sz);
        const dirX = m.vx / spd;
        const dirY = m.vy / spd;
        let grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(${hot[0]},${hot[1]},${hot[2]},${(m.life * 0.8).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(${cr},${cg},${cb},${(m.life * 0.4).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        const tx2 = m.x - dirX * len * 0.5;
        const ty2 = m.y - dirY * len * 0.5;
        grad = ctx.createLinearGradient(m.x, m.y, tx2, ty2);
        grad.addColorStop(0, `rgba(255,255,255,${(m.life * 0.95).toFixed(3)})`);
        grad.addColorStop(0.55, `rgba(${hot[0]},${hot[1]},${hot[2]},${(m.life * 0.5).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1.2, lw * 0.68);
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5.5 * sz);
        hg.addColorStop(0, `rgba(255,255,255,${m.life})`);
        hg.addColorStop(0.4, `rgba(${hot[0]},${hot[1]},${hot[2]},${(m.life * 0.55).toFixed(3)})`);
        hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 5.5 * sz, 0, Math.PI * 2);
        ctx.fill();
      }
      state.meteors = state.meteors.filter((m) => m.life > 0);

      for (const f of state.fireballs) {
        f.x += f.vx * dtm;
        f.y += f.vy * dtm;
        f.life -= dtm * 0.3;
        f.flash -= dtm * 1.3;
        if (f.life <= 0) continue;
        const len = Math.hypot(f.vx, f.vy) * 0.16;
        const tx = f.x - (f.vx / Math.hypot(f.vx, f.vy)) * len;
        const ty = f.y - (f.vy / Math.hypot(f.vx, f.vy)) * len;
        const grad = ctx.createLinearGradient(f.x, f.y, tx, ty);
        grad.addColorStop(0, `rgba(255,248,225,${f.life})`);
        grad.addColorStop(0.25, `rgba(255,196,110,${(f.life * 0.8).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(2, 4.5 * f.sz);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 11 * f.sz);
        fg.addColorStop(0, `rgba(255,255,240,${f.life})`);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 11 * f.sz, 0, Math.PI * 2);
        ctx.fill();
      }
      state.fireballs = state.fireballs.filter((f) => f.life > 0);

      let flash = 0;
      for (const f of state.fireballs) if (f.flash > 0) flash = Math.max(flash, f.flash);
      ctx.restore();
      if (flash > 0) {
        const fl = flash * 0.16;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const wash = ctx.createLinearGradient(0, 0, 0, h);
        wash.addColorStop(0, `rgba(255,224,170,${(fl * 0.25).toFixed(3)})`);
        wash.addColorStop(0.55, `rgba(255,214,150,${(fl * 0.5).toFixed(3)})`);
        wash.addColorStop(1, `rgba(255,205,140,${(fl * 0.85).toFixed(3)})`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      const vig = ctx.createRadialGradient(w / 2, h * 0.34, Math.min(w, h) * 0.42, w / 2, h * 0.42, Math.max(w, h) * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
