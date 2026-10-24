(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _mix(t, a, b) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function _buildLayers(h, w) {
    const L = 9;
    const yH = 0.4; 
    const layers = [];
    for (let i = 0; i < L; i++) {
      const u = i / (L - 1); 
      const rowY = yH + Math.pow(u, 1.45) * (0.94 - yH); 
      const amp = h * (0.004 + Math.pow(u, 2) * 0.05); 
      const waveLen = w * (0.34 + 1.25 * Math.pow(u, 1.15)); 
      const k = (Math.PI * 2) / waveLen;
      const travel = 12 + 52 * Math.pow(u, 1.6); 
      layers.push({ u, rowY, amp, k, travel, ph: i * 1.9 });
    }
    return layers;
  }

  function _crestY(x, h, L, t, i01) {
    const s = Math.sin(L.k * x - t * L.travel * L.k + L.ph);
    const s2 = Math.sin(L.k * 0.53 * x + t * L.travel * 0.42 * L.k + L.ph * 2.3);
    const surge = 0.85 + 0.15 * Math.sin(t * 0.18 + L.u * 4);
    const amp = L.amp * (0.55 + 0.65 * i01) * surge;
    return L.rowY * h + (s * 0.7 + s2 * 0.3) * amp;
  }

  ThemeScenes.register("ocean", {
    label: "Ocean Waves",
    defaults: { speed: 1, intensity: 70, color: "#0ea5e9" },
    presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
    presetCombos: [
      { color: "#0ea5e9", bg: "#020617" }, 
      { color: "#14b8a6", bg: "#0a1a1a" }, 
      { color: "#8b5cf6", bg: "#1a0a2e" }, 
      { color: "#cbd5e1", bg: "#0a1628" }, 
      { color: "#fb7185", bg: "#1c0f0c" }, 
      { color: "#34d399", bg: "#0a1a14" }, 
    ],
    options: [
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
      { key: "color", label: "Wave Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      const [cr, cg, cb] = _hexToRgb(opts.color || "#0ea5e9");
      state.waveRGB = [cr, cg, cb];
      state.deepRGB = [Math.round(cr * 0.16), Math.round(cg * 0.2), Math.round(cb * 0.42)];
      state.litRGB = [255, 244, 224]; 
      state.skyRGB = [186, 208, 240]; 
      state.layers = _buildLayers(h, w);

      state.shimmers = [];
      const shimmerN = 46;
      for (let i = 0; i < shimmerN; i++) {
        const g = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
        state.shimmers.push({
          xOff: g * 0.5, 
          yFrac: Math.random(), 
          len: 4 + Math.random() * 14,
          phase: Math.random() * Math.PI * 2,
          twSp: 2 + Math.random() * 6,
        });
      }

      state.stars = [];
      for (let i = 0; i < 34; i++) {
        state.stars.push({
          x: Math.random(),
          y: Math.pow(Math.random(), 1.5) * 0.3,
          s: 0.4 + Math.random() * 0.9,
          a: 0.1 + Math.random() * 0.24,
          ph: Math.random() * Math.PI * 2,
        });
      }
    },
    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const i01 = (opts.intensity ?? 70) / 100;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;
      const [cr, cg, cb] = state.waveRGB;

      ctx.clearRect(0, 0, w, h);

      const horizon = h * 0.4;
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, horizon * 1.25);
        sky.addColorStop(0, "#02030a");
        sky.addColorStop(0.55, "#050a18");
        sky.addColorStop(0.9, "#0a1526");
        sky.addColorStop(1, "#122033");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon * 1.25);
      }

      ctx.fillStyle = "#cdd8ff";
      for (const st of state.stars) {
        ctx.globalAlpha = st.a * (0.72 + 0.28 * Math.sin(st.ph + t * 0.6));
        ctx.fillRect(st.x * w, st.y * h, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      const mx = w * 0.5, my = h * 0.13, mr = Math.min(w, h) * 0.052;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const corona = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
      corona.addColorStop(0, "rgba(190,208,255,0.2)");
      corona.addColorStop(0.35, "rgba(150,178,240,0.07)");
      corona.addColorStop(1, "rgba(150,178,240,0)");
      ctx.fillStyle = corona;
      ctx.beginPath(); ctx.arc(mx, my, mr * 6, 0, Math.PI * 2); ctx.fill();
      const path = ctx.createLinearGradient(0, horizon, 0, h * 0.9);
      path.addColorStop(0, "rgba(214,228,255,0.13)");
      path.addColorStop(1, "rgba(214,228,255,0)");
      ctx.fillStyle = path;
      ctx.fillRect(mx - w * 0.16, horizon, w * 0.32, h * 0.5);
      ctx.restore();
      const disc = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.15, mx, my, mr);
      disc.addColorStop(0, "#fffdf4");
      disc.addColorStop(0.8, "#e9edf8");
      disc.addColorStop(1, "#b9c6de");
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();

      const water = ctx.createLinearGradient(0, horizon, 0, h);
      water.addColorStop(0, _rgba(state.deepRGB, 0.9));
      water.addColorStop(1, "rgba(2,5,12,0.96)");
      ctx.fillStyle = water;
      ctx.fillRect(0, horizon, w, h - horizon);

      const L = state.layers;
      const step = Math.max(4, Math.floor(w / 180));
      for (let i = 0; i < L.length; i++) {
        const lay = L[i];
        const u = lay.u;
        const rowYpx = lay.rowY * h;
        const crestMix = Math.min(1, 0.1 + u * 0.38 + i01 * 0.14);
        const crestRGB = _mix(crestMix, u > 0.55 ? state.litRGB : state.skyRGB, state.deepRGB);
        const a = (0.15 + u * 0.22) * (0.8 + 0.3 * i01);
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) {
          const cy = _crestY(x, h, lay, t, i01);
          if (x === 0) ctx.moveTo(x, cy);
          else ctx.lineTo(x, cy);
        }
        ctx.lineTo(w, h + 2);
        ctx.lineTo(0, h + 2);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, rowYpx - lay.amp * 1.4, 0, h);
        g.addColorStop(0, _rgba(crestRGB, a));
        g.addColorStop(0.16, _rgba(crestRGB, a * 0.5));
        g.addColorStop(0.5, _rgba(state.deepRGB, a * 0.32));
        g.addColorStop(1, "rgba(1,3,8,0)");
        ctx.fillStyle = g;
        ctx.fill();

        if (u > 0.25 && i01 > 0.25) {
          const foamA = Math.max(0, u - 0.2) * i01 * 0.85;
          ctx.strokeStyle = `rgba(235,246,255,${foamA * 0.45})`;
          ctx.lineWidth = 0.8 + u * 2.2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += step) {
            const cy = _crestY(x, h, lay, t, i01) + 1;
            if (x === 0) ctx.moveTo(x, cy);
            else ctx.lineTo(x, cy);
          }
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${foamA})`;
          ctx.setLineDash([2 + u * 9, 11 - u * 4]);
          ctx.lineDashOffset = -t * lay.travel * 1.4;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const colX = w * 0.5;
      const colTop = h * (0.42 + 0.02 * i01);
      const colBottom = h * 0.88;
      const halfW = w * 0.1;
      for (const s of state.shimmers) {
        const y = colTop + s.yFrac * (colBottom - colTop);
        const colW = halfW * (0.25 + s.yFrac * 1.4);
        const x = colX + s.xOff * colW;
        if (x < 0 || x > w) continue;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(s.phase + t * s.twSp), 2.4);
        const a = tw * (0.35 + 0.65 * (1 - Math.abs(s.xOff))) * (0.4 + i01 * 0.6);
        if (a < 0.03) continue;
        ctx.strokeStyle = `rgba(255,250,232,${a})`;
        ctx.lineWidth = 1 + s.yFrac * 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - s.len, y);
        ctx.lineTo(x + s.len, y);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.restore();

      const haze = ctx.createLinearGradient(0, horizon * 0.9, 0, horizon * 1.18);
      haze.addColorStop(0, "rgba(150,180,220,0)");
      haze.addColorStop(0.5, `rgba(${Math.min(255, cr + 60)},${Math.min(255, cg + 70)},${Math.min(255, cb + 60)},${0.12 + i01 * 0.08})`);
      haze.addColorStop(1, "rgba(150,180,220,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon * 0.9, w, horizon * 0.28);

      const vg = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.4, w / 2, h * 0.52, Math.max(w, h) * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(1,2,6,0.42)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
