(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function _shade(rgb, f) {
    return [
      Math.min(255, Math.round(rgb[0] * f)),
      Math.min(255, Math.round(rgb[1] * f)),
      Math.min(255, Math.round(rgb[2] * f)),
    ];
  }
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
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

  ThemeScenes.register("butterflies", {
    label: "Butterflies",
    defaults: { density: 20, speed: 1, color: "#a855f7" },
    presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#a855f7", bg: "#020617" }, 
      { color: "#fbbf24", bg: "#1a1208" }, 
      { color: "#7dd3fc", bg: "#0a1628" }, 
      { color: "#f9a8d4", bg: "#1f0a1e" }, 
      { color: "#86efac", bg: "#0a1a0a" }, 
      { color: "#f87171", bg: "#1c0f0c" }, 
    ],
    options: [
      { key: "density", label: "Butterflies", type: "range", min: 5, max: 60, step: 5 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Wing Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const rgb = _hexToRgb(opts.color || "#a855f7");
      state.groundY = h * 0.86;

      const bands = [
        { n: 0.55, size: 0.6, spd: 0.75, alpha: 0.5 },
        { n: 0.45, size: 1.0, spd: 1.1, alpha: 0.95 },
      ];
      state.butterflies = [];
      const count = opts.density ?? 20;
      for (const band of bands) {
        const n = Math.max(1, Math.round(count * band.n));
        for (let i = 0; i < n; i++) {
          state.butterflies.push({
            x: Math.random() * w,
            y: h * (0.12 + Math.random() * 0.62),
            s: (6 + Math.random() * 5) * S * band.size,
            vx: (Math.random() - 0.5) * 34 * band.spd,
            vy: (Math.random() - 0.5) * 18 * band.spd,
            wingSp: 5 + Math.random() * 5,
            wingPh: Math.random() * Math.PI * 2,
            wander: Math.random() * Math.PI * 2,
            wanderSp: 0.25 + Math.random() * 0.5,
            tilt: (Math.random() - 0.5) * 0.6,
            wing: _rgba(_shade(rgb, 0.75 + Math.random() * 0.35), band.alpha),
            spot: _rgba(_shade(rgb, 0.4), band.alpha * 0.9),
          });
        }
      }

      state.trees = [];
      const treeN = Math.max(12, Math.round(w / 70));
      for (let i = 0; i < treeN; i++) {
        state.trees.push({
          x: i / treeN + (Math.random() - 0.5) * (0.7 / treeN),
          w: 0.028 + Math.random() * 0.02, 
          h: 0.55 + Math.random() * 0.8,   
        });
      }

      state.grass = { mid: [], near: [] };
      const mkG = (arr, y, h0, h1) => {
        arr.push({
          x: Math.random() * w,
          y,
          h: (h0 + Math.random() * (h1 - h0)) * S,
          sp: 1 + Math.random() * 1.8,
          ph: Math.random() * Math.PI * 2,
          amp: (2 + Math.random() * 4) * S,
        });
      };
      const nMid = Math.max(14, Math.round(w / 26));
      for (let i = 0; i < nMid; i++)
        mkG(state.grass.mid, state.groundY + (3 + Math.random() * 9) * S, 9, 22);
      const nNear = Math.max(12, Math.round(w / 34));
      for (let i = 0; i < nNear; i++)
        mkG(state.grass.near, state.groundY + h * (0.06 + Math.random() * 0.05), 14, 30);

      state.flowers = [];
      const nFl = Math.max(8, Math.round(w / 95));
      const pastel = [
        Math.round(rgb[0] * 0.35 + 246 * 0.65),
        Math.round(rgb[1] * 0.35 + 240 * 0.65),
        Math.round(rgb[2] * 0.35 + 252 * 0.65),
      ];
      for (let i = 0; i < nFl; i++) {
        state.flowers.push({
          x: Math.random() * w,
          y: state.groundY + h * (0.025 + Math.random() * 0.1),
          s: (1.1 + Math.random() * 1.3) * S,
          a: 0.35 + Math.random() * 0.35,
          ph: Math.random() * Math.PI * 2,
          col: `rgba(${pastel[0]},${pastel[1]},${pastel[2]},1)`,
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
      const groundY = state.groundY;

      const groundBase = bgColor || "#0d1124";
      const pal = (() => {
        const [h, s, l] = _rgbToHsl(_hexToRgb(groundBase));
        const L = (mul, lo, hi) => _clamp(l * mul, lo, hi);
        const hsla = (Lv, a, sat) =>
          `hsla(${h.toFixed(1)},${(sat * 100).toFixed(1)}%,${(Lv * 100).toFixed(1)}%,${a})`;
        const earthSat = _clamp(s * 0.85, 0.05, 0.42);
        const bladeSat = _clamp(s * 0.9 + 0.08, 0.18, 0.52);
        return {
          treeFar: hsla(L(2.8, 0.06, 0.2), 0.55, earthSat),
          treeNear: hsla(L(0.55, 0.012, 0.05), 0.9, earthSat),
          earthTop: hsla(L(1.5, 0.045, 0.13), 0.92, earthSat),
          earthMid: hsla(L(0.9, 0.024, 0.085), 0.97, earthSat),
          earthDeep: hsla(L(0.45, 0.014, 0.05), 1, earthSat),
          rim: hsla(L(9, 0.4, 0.62), 0.1, bladeSat),
          grassMid: hsla(L(6.5, 0.2, 0.46), 0.45, bladeSat),
          grassNear: hsla(L(4, 0.12, 0.26), 0.82, bladeSat),
          stem: hsla(L(1.9, 0.05, 0.12), 0.5, bladeSat),
        };
      })();

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#0a0918");
        sky.addColorStop(0.6, "#101226");
        sky.addColorStop(1, "#131b2f");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(w * 0.5, groundY, 0, w * 0.5, groundY, w * 0.6);
      glow.addColorStop(0, "rgba(255,224,196,0.09)");
      glow.addColorStop(0.55, "rgba(205,182,255,0.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, groundY - h * 0.42, w, h * 0.42);
      ctx.restore();

      const treeRow = (topY, bumpMul, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-6, h);
        for (const tr of state.trees) {
          const cx = Math.max(0, Math.min(w, tr.x * w));
          const hw = (tr.w * w) / 2;
          const bh = h * 0.05 * tr.h * bumpMul;
          ctx.lineTo(cx - hw, topY);
          ctx.arc(cx, topY - bh * 0.6, hw, Math.PI, 0, false);
          ctx.lineTo(cx + hw, topY);
        }
        ctx.lineTo(w + 6, h);
        ctx.closePath();
        ctx.fill();
      };
      treeRow(groundY - h * 0.008, 0.7, pal.treeFar);
      treeRow(groundY, 1, pal.treeNear);

      const gnd = ctx.createLinearGradient(0, groundY, 0, h);
      gnd.addColorStop(0, pal.earthTop);
      gnd.addColorStop(0.55, pal.earthMid);
      gnd.addColorStop(1, pal.earthDeep);
      ctx.fillStyle = gnd;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = pal.rim;
      ctx.fillRect(0, groundY, w, Math.max(1, 2 * S));

      ctx.lineCap = "round";
      const paintGrass = (list, color, wdt) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = wdt;
        for (const g of list) {
          const sway = Math.sin(t * g.sp + g.ph) * g.amp;
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.quadraticCurveTo(g.x + sway * 0.35, g.y - g.h * 0.55, g.x + sway, g.y - g.h);
          ctx.stroke();
        }
      };
      paintGrass(state.grass.mid, pal.grassMid, Math.max(0.9, 1.3 * S));
      paintGrass(state.grass.near, pal.grassNear, Math.max(1.1, 1.7 * S));

      for (const f of state.flowers) {
        ctx.strokeStyle = pal.stem;
        ctx.lineWidth = Math.max(0.6, f.s * 0.3);
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x, f.y - f.s * 2.6);
        ctx.stroke();
        ctx.globalAlpha = f.a * (0.8 + 0.2 * Math.sin(t * 0.6 + f.ph));
        ctx.fillStyle = f.col;
        ctx.beginPath();
        ctx.arc(f.x, f.y - f.s * 2.9, f.s * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,252,235,0.7)";
        ctx.beginPath();
        ctx.arc(f.x, f.y - f.s * 2.9, f.s * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const l of state.butterflies) {
        l.wander += l.wanderSp * dtm;
        l.x += (l.vx + Math.sin(t * 0.35 + l.wander) * 34 * S) * dtm;
        l.y += (l.vy + Math.sin(t * 0.6 + l.wander * 1.6) * 16 * S) * dtm;
        if (l.x < -40) l.x = w + 30;
        if (l.x > w + 40) l.x = -30;
        if (l.y < h * 0.04) l.y = h * 0.05;
        if (l.y > groundY - 8 * S) l.y = groundY - 8 * S;

        const flap = Math.abs(Math.sin(t * l.wingSp + l.wingPh));
        const spread = 0.22 + 0.78 * flap;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.tilt + Math.sin(t * 0.4 + l.wander) * 0.25);
        ctx.fillStyle = l.wing;
        ctx.beginPath();
        ctx.ellipse(-l.s * 1.15 * spread, -l.s * 0.12, l.s * 0.95, l.s * 0.55, -0.45, 0, Math.PI * 2);
        ctx.ellipse(l.s * 1.15 * spread, -l.s * 0.12, l.s * 0.95, l.s * 0.55, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-l.s * 0.72 * spread, l.s * 0.5, l.s * 0.62, l.s * 0.42, -0.28, 0, Math.PI * 2);
        ctx.ellipse(l.s * 0.72 * spread, l.s * 0.5, l.s * 0.62, l.s * 0.42, 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = l.spot;
        ctx.beginPath();
        ctx.ellipse(-l.s * 1.15 * spread, -l.s * 0.05, l.s * 0.22, l.s * 0.14, -0.4, 0, Math.PI * 2);
        ctx.ellipse(l.s * 1.15 * spread, -l.s * 0.05, l.s * 0.22, l.s * 0.14, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(24,18,30,0.92)";
        ctx.beginPath();
        ctx.ellipse(0, 0, l.s * 0.15, l.s * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(24,18,30,0.85)";
        ctx.lineWidth = Math.max(0.6, l.s * 0.08);
        ctx.beginPath();
        ctx.moveTo(-l.s * 0.07, -l.s * 0.7);
        ctx.quadraticCurveTo(-l.s * 0.3, -l.s * 1.1, -l.s * 0.48, -l.s * 1.02);
        ctx.moveTo(l.s * 0.07, -l.s * 0.7);
        ctx.quadraticCurveTo(l.s * 0.3, -l.s * 1.1, l.s * 0.48, -l.s * 1.02);
        ctx.stroke();
        ctx.restore();
      }

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
