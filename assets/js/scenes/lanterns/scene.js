(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function _rgbToHsl([r0, g0, b0]) {
    const r = r0 / 255,
      g = g0 / 255,
      b = b0 / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0,
      s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  ThemeScenes.register("lanterns", {
    label: "Floating Lanterns",
    defaults: { density: 15, speed: 1, color: "#fbbf24" },
    presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
    presetCombos: [
      { color: "#fbbf24", bg: "#020617" }, 
      { color: "#f59e0b", bg: "#1a1208" }, 
      { color: "#fde68a", bg: "#1a1508" }, 
      { color: "#f9a8d4", bg: "#1f0a1e" }, 
      { color: "#7dd3fc", bg: "#0a1628" }, 
      { color: "#fb7185", bg: "#200a14" }, 
    ],
    options: [
      { key: "density", label: "Lanterns", type: "range", min: 5, max: 40, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Lantern Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const rgb = _hexToRgb(opts.color || "#fbbf24");
      const count = opts.density ?? 15;

      const bands = [
        { n: 0.4, size: 0.55, spd: 0.7, alpha: 0.45 },
        { n: 0.35, size: 0.85, spd: 0.9, alpha: 0.7 },
        { n: 0.25, size: 1.25, spd: 1.15, alpha: 1 },
      ];
      state.lanterns = [];
      for (const band of bands) {
        const n = Math.max(1, Math.round(count * band.n));
        for (let i = 0; i < n; i++) {
          state.lanterns.push({
            x: Math.random() * w,
            y: Math.random() * h,
            s: (7 + Math.random() * 7) * S * band.size,
            vy: -(7 + Math.random() * 9) * band.spd,
            swaySp: 0.35 + Math.random() * 0.5,
            swayAmp: (7 + Math.random() * 10) * band.spd,
            ph: Math.random() * Math.PI * 2,
            flSp: 2 + Math.random() * 2.5,
            flPh: Math.random() * Math.PI * 2,
            rgb,
            alpha: band.alpha * (0.8 + Math.random() * 0.4),
          });
        }
      }

      state.stars = [];
      for (let i = 0; i < 70; i++) {
        state.stars.push({
          x: Math.random(),
          y: Math.pow(Math.random(), 1.4) * 0.6,
          s: 0.4 + Math.random() * 0.9,
          a: 0.06 + Math.random() * 0.2,
          ph: Math.random() * Math.PI * 2,
          big: i % 23 === 0,
        });
      }

      state.groundY = h * 0.9;
      state.ridge = [];
      const nRidge = Math.max(14, Math.round(w / 64));
      for (let i = 0; i < nRidge; i++) {
        state.ridge.push({
          x: (i / (nRidge - 1)) + (Math.random() - 0.5) * (0.5 / nRidge),
          w: 0.03 + Math.random() * 0.02, 
          h: 0.5 + Math.random() * 0.8,   
        });
      }
      state.hills = [];
      for (let i = 0; i < 5; i++) {
        state.hills.push({
          x: (i / 4) * w + (Math.random() - 0.5) * w * 0.1,
          r: h * (0.05 + Math.random() * 0.05),
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;
      const dtm = dt * speed;
      const S = state.S;

      let pal = null;
      if (bgColor) {
        const [h, s] = _rgbToHsl(_hexToRgb(bgColor));
        const sat = (floor, cap) => Math.max(floor, Math.min(s * 100, cap));
        const hsla = (l, a, satPct) =>
          `hsla(${h.toFixed(1)},${satPct.toFixed(1)}%,${l}%,${a})`;
        const ridgeSat = sat(10, 30);
        const darkSat = sat(8, 22);
        pal = {
          ridge1: hsla(6.5, 0.5, ridgeSat),
          ridge2: hsla(3, 0.92, ridgeSat),
          hills: hsla(2.4, 0.98, darkSat),
          gMid: hsla(4.5, 0.99, ridgeSat),
          gDeep: hsla(1.8, 1, darkSat),
        };
      }

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#030410");
        sky.addColorStop(0.6, "#070a1c");
        sky.addColorStop(1, "#120c14");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      for (const st of state.stars) {
        const tw = st.a * (0.7 + 0.3 * Math.sin(st.ph + t * 0.5));
        if (tw < 0.01) continue;
        ctx.globalAlpha = tw;
        ctx.fillStyle = st.big ? "#eaf0ff" : "#d6deff";
        const sx = st.x * w, sy = st.y * h;
        ctx.fillRect(sx, sy, st.s, st.s);
        if (st.big && st.s > 0.8) {
          ctx.fillRect(sx - st.s * 0.7, sy + st.s * 0.2, st.s * 2.4, st.s * 0.35);
          ctx.fillRect(sx + st.s * 0.2, sy - st.s * 0.7, st.s * 0.35, st.s * 2.4);
        }
      }
      ctx.globalAlpha = 1;

      const groundY = state.groundY;
      const warm = _hexToRgb(opts.color || "#fbbf24");

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const bloom = ctx.createRadialGradient(w * 0.5, groundY, 0, w * 0.5, groundY, w * 0.62);
      bloom.addColorStop(0, _rgba(warm, 0.13));
      bloom.addColorStop(0.5, _rgba(warm, 0.05));
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, groundY - h * 0.5, w, h * 0.5);
      ctx.restore();

      const ridgeRow = (topY, bumpMul, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-6, groundY);
        for (const tr of state.ridge) {
          const cx = Math.max(0, Math.min(w, tr.x * w));
          const hw = (tr.w * w) / 2;
          const bh = h * 0.045 * tr.h * bumpMul;
          ctx.lineTo(cx - hw, topY);
          ctx.arc(cx, topY - bh * 0.62, hw, Math.PI, 0, false);
          ctx.lineTo(cx + hw, topY);
        }
        ctx.lineTo(w + 6, groundY);
        ctx.closePath();
        ctx.fill();
      };
      ridgeRow(groundY - h * 0.012, 0.75, pal ? pal.ridge1 : "rgba(16,13,24,0.5)");
      ridgeRow(groundY - h * 0.006, 1, pal ? pal.ridge2 : "rgba(7,6,13,0.92)");

      ctx.fillStyle = pal ? pal.hills : "rgba(4,3,8,0.98)";
      for (const hl of state.hills) {
        ctx.beginPath();
        ctx.arc(hl.x, groundY + hl.r * 0.5, hl.r, Math.PI, 0);
        ctx.fill();
      }
      const gnd = ctx.createLinearGradient(0, groundY, 0, h);
      gnd.addColorStop(0, _rgba(warm, 0.05));
      gnd.addColorStop(0.2, pal ? pal.gMid : "rgba(13,10,16,0.99)");
      gnd.addColorStop(1, pal ? pal.gDeep : "rgba(3,2,5,1)");
      ctx.fillStyle = gnd;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const haze = ctx.createLinearGradient(0, groundY - h * 0.02, 0, groundY + h * 0.03);
      haze.addColorStop(0, _rgba(warm, 0.04));
      haze.addColorStop(0.5, _rgba(warm, 0.012));
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, groundY - h * 0.02, w, h * 0.05);
      ctx.restore();

      for (const l of state.lanterns) {
        l.y += l.vy * dtm;
        if (l.y < -l.s * 4) {
          l.y = h + l.s * 3;
          l.x = Math.random() * w;
        }
        const fx = l.x + Math.sin(t * l.swaySp + l.ph) * l.swayAmp;
        const fl = 0.85 + 0.15 * Math.sin(t * l.flSp + l.flPh);
        const hr = l.s * 3.8;
        const halo = ctx.createRadialGradient(fx, l.y, 0, fx, l.y, hr);
        halo.addColorStop(0, _rgba(l.rgb, 0.2 * l.alpha * fl));
        halo.addColorStop(0.45, _rgba(l.rgb, 0.07 * l.alpha * fl));
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(fx - hr, l.y - hr, hr * 2, hr * 2);
        ctx.fillStyle = _rgba(l.rgb, 0.4 * l.alpha * fl);
        ctx.beginPath();
        ctx.ellipse(fx, l.y, l.s * 0.62, l.s * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = _rgba([255, 243, 205], 0.55 * l.alpha * fl);
        ctx.beginPath();
        ctx.ellipse(fx, l.y + l.s * 0.12, l.s * 0.3, l.s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(24,16,6,0.9)";
        ctx.fillRect(fx - l.s * 0.34, l.y - l.s * 0.96, l.s * 0.68, Math.max(1, l.s * 0.14));
        ctx.fillRect(fx - l.s * 0.3, l.y + l.s * 0.84, l.s * 0.6, Math.max(1, l.s * 0.12));
        ctx.strokeStyle = _rgba(l.rgb, 0.3 * l.alpha);
        ctx.lineWidth = Math.max(0.5, l.s * 0.07);
        ctx.beginPath();
        for (const off of [-0.34, 0, 0.34]) {
          ctx.moveTo(fx + off * l.s, l.y - l.s * 0.86);
          ctx.lineTo(fx + off * l.s, l.y + l.s * 0.8);
        }
        ctx.stroke();
      }

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
