(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function _mix(t, a, b) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function _clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
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

  const _spriteCache = {};
  function _softSprite(rgb, alpha) {
    const key = `${rgb[0]},${rgb[1]},${rgb[2]},${alpha}`;
    if (_spriteCache[key]) return _spriteCache[key];
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, _rgba(rgb, alpha));
    g.addColorStop(0.45, _rgba(rgb, alpha * 0.4));
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    _spriteCache[key] = c;
    return c;
  }
  function _drawSprite(ctx, spr, x, y, rx, ry, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(spr, x - rx, y - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
  }

  function _pinePath(ctx, x, ground, w, hgt) {
    ctx.moveTo(x - w * 0.52, ground + 3);
    ctx.lineTo(x, ground - hgt * 0.6);
    ctx.lineTo(x + w * 0.52, ground + 3);
    ctx.moveTo(x - w * 0.34, ground - hgt * 0.28);
    ctx.lineTo(x, ground - hgt * 0.86);
    ctx.lineTo(x + w * 0.34, ground - hgt * 0.28);
    ctx.moveTo(x - w * 0.18, ground - hgt * 0.58);
    ctx.lineTo(x, ground - hgt * 1.02);
    ctx.lineTo(x + w * 0.18, ground - hgt * 0.58);
    ctx.closePath();
  }
  function _drawPine(ctx, x, ground, w, hgt, trunk) {
    ctx.beginPath();
    _pinePath(ctx, x, ground, w, hgt);
    ctx.fill();
    if (trunk) {
      ctx.fillRect(x - w * 0.045, ground - 2, w * 0.09, hgt * 0.055 + 4);
    }
  }

  function _bladeTip(ctx, x, rootY, hgt, wdt, bend, col) {
    const tipX = x + Math.sin(bend) * hgt;
    const tipY = rootY - Math.cos(bend) * hgt;
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(x, rootY);
    ctx.quadraticCurveTo(
      x + Math.sin(bend * 0.5) * hgt * 0.45,
      rootY - hgt * 0.62,
      tipX,
      tipY
    );
    ctx.stroke();
  }

  ThemeScenes.register("campfire", {
    label: "Campfire",
    defaults: { density: 30, speed: 1, color: "#f97316" },
    presetBgColors: ["#020617", "#000000", "#1a0f0a", "#0f172a", "#1e0a0a", "#0d1117"],
    presetCombos: [
      { color: "#f97316", bg: "#020617" }, 
      { color: "#fbbf24", bg: "#1a1208" }, 
      { color: "#f59e0b", bg: "#1e0f0a" }, 
      { color: "#f87171", bg: "#1f0d10" }, 
      { color: "#fde68a", bg: "#221705" }, 
      { color: "#fb923c", bg: "#0f172a" }, 
    ],
    options: [
      { key: "density", label: "Sparks", type: "range", min: 10, max: 80, step: 5 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Fire Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      const S = h / 1080;
      state.S = S;
      const color = _hexToRgb(opts.color || "#f97316");

      state.fireRGB = color;
      state.coreRGB = [255, 250, 236];
      state.innerRGB = _mix(0.5, color, [255, 236, 170]);
      state.warmRGB = _mix(0.42, color, [255, 210, 120]);
      state.coalRGB = _mix(0.5, color, [255, 190, 90]);
      state.smokeSpr = _softSprite([150, 146, 160], 0.55);

      state.groundY = h * 0.8;
      state.fireX = w * 0.5;
      state.bedY = state.groundY + 2 * S;
      state.flameH = h * 0.185;

      let seed = Math.random() * 1e9;
      function rnd() {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      }
      const R = () => rnd();

      state.stars = [];
      for (let i = 0; i < 60; i++) {
        state.stars.push({
          x: Math.random(),
          y: Math.pow(Math.random(), 1.35) * 0.44,
          s: 0.4 + Math.random() * 1,
          a: 0.05 + Math.random() * 0.2,
          ph: Math.random() * Math.PI * 2,
          tw: 0.4 + Math.random() * 1.2,
        });
      }

      state.farTrees = [];
      const nFar = Math.max(12, Math.round(w / 90));
      for (let i = 0; i < nFar; i++) {
        state.farTrees.push({
          x: (i / (nFar - 1)) * w + (Math.random() - 0.5) * w * 0.03,
          w: w * (0.018 + Math.random() * 0.012),
          h: h * (0.075 + Math.random() * 0.07),
          ridge: Math.random() < 0.4 ? 1 : 0, 
        });
      }
      state.midTrees = [];
      for (let i = 0; i < 9; i++) {
        const side = i < 4 ? -1 : i < 8 ? 1 : (Math.random() - 0.5) * 2;
        state.midTrees.push({
          x: w * 0.5 + side * w * (0.06 + Math.random() * 0.32),
          w: w * (0.035 + Math.random() * 0.03),
          h: h * (0.13 + Math.random() * 0.16),
          ph: Math.random() * Math.PI * 2,
        });
      }
      state.nearTrees = [];
      const nearDefs = [
        { x: -w * 0.07, w: w * 0.17, h: h * 0.5 },
        { x: w * 0.012, w: w * 0.12, h: h * 0.36 },
        { x: w * 1.04, w: w * 0.18, h: h * 0.52 },
        { x: w * 0.985, w: w * 0.11, h: h * 0.34 },
        { x: w * 0.055, w: w * 0.09, h: h * 0.23 },
        { x: w * 0.955, w: w * 0.075, h: h * 0.2 },
      ];
      for (const t of nearDefs) state.nearTrees.push(t);

      state.dirt = [];
      for (let i = 0; i < 110; i++) {
        state.dirt.push({
          x: Math.random(),
          y: 0.04 + Math.random() * 0.95, 
          r: (0.8 + Math.random() * 2.2) * S,
          sh: 0.12 + Math.random() * 0.28,
        });
      }
      state.glints = [];
      for (let i = 0; i < 34; i++) {
        const a = (Math.random() - 0.5) * 2 * (Math.PI * 0.92); 
        const rr = Math.pow(Math.random(), 0.8) * 0.26;
        state.glints.push({
          x: state.fireX + Math.sin(a) * w * rr,
          y: state.groundY + h * (0.02 + Math.random() * 0.14) * (1 - rr * 0.4),
          r: (0.7 + Math.random() * 1.2) * S,
          sp: 2 + Math.random() * 7,
          ph: Math.random() * Math.PI * 2,
        });
      }

      state.stones = [];
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2;
        state.stones.push({
          x: state.fireX + Math.cos(a) * w * (0.055 + Math.random() * 0.16),
          y: state.groundY + h * (0.035 + Math.random() * 0.1),
          r: (2.2 + Math.random() * 4.6) * S,
          rot: Math.random() * Math.PI,
          lit: Math.random() < 0.75,
        });
      }
      state.twigs = [];
      for (let i = 0; i < 10; i++) {
        state.twigs.push({
          x: state.fireX + (Math.random() - 0.5) * w * 0.3,
          y: state.groundY + Math.random() * h * 0.045,
          len: (14 + Math.random() * 26) * S,
          rot: (Math.random() - 0.5) * Math.PI,
        });
      }

      state.grass = [];
      const mkTuft = (x, y, n, hgt0, hgt1, lit) => {
        const blades = [];
        for (let k = 0; k < n; k++) {
          blades.push({
            xo: (Math.random() - 0.5) * 8 * S,
            hgt: (hgt0 + Math.random() * (hgt1 - hgt0)) * h,
            ph: Math.random() * Math.PI * 2,
            sp: 0.5 + Math.random() * 0.8,
            lean: (Math.random() - 0.5) * 0.5,
            wd: (1 + Math.random() * 1.2) * S,
          });
        }
        return { x, y, blades, lit, ph: Math.random() * Math.PI * 2 };
      };
      const pitR = 160 * S;
      const rowFrac = [0.848, 0.902, 0.956];
      const hgtLo = [0.012, 0.017, 0.022];
      const hgtHi = [0.024, 0.034, 0.046];
      const nCol = Math.max(6, Math.round(w / 88));
      const spacing = w / nCol;
      for (let r = 0; r < rowFrac.length; r++) {
        const y = h * (rowFrac[r] + (Math.random() - 0.5) * 0.02);
        for (let c = 0; c < nCol; c++) {
          const x = spacing * (c + 0.5) + (Math.random() - 0.5) * spacing * 0.5;
          const dx = x - state.fireX;
          const dy = (y - state.groundY) * 1.7;
          if (dx * dx + dy * dy < pitR * pitR) continue;
          const nearFire = Math.abs(dx) < w * 0.3 && y < state.groundY + h * 0.12;
          state.grass.push(
            mkTuft(
              x, y,
              2 + Math.floor(Math.random() * 2),
              hgtLo[r], hgtHi[r],
              nearFire && Math.random() < 0.4
            )
          );
        }
      }

      state.ring = [];
      const nRing = 10;
      for (let i = 0; i < nRing; i++) {
        const a = (i / nRing) * Math.PI * 2 + Math.random() * 0.28;
        state.ring.push({
          a,
          d: (62 + Math.random() * 20) * S,
          rx: (7.5 + Math.random() * 5) * S,
          rot: Math.random() * Math.PI,
        });
      }

      state.logs = [];
      const mkLog = (x, y, len, rot, wd, tone, front) =>
        ({ x, y, len, rot, wd, tone, ph: Math.random() * Math.PI * 2, front: !!front });
      state.logs.push(mkLog(state.fireX - 34 * S, state.groundY + 12 * S, 120 * S, -0.09, 13 * S, 0.2));
      state.logs.push(mkLog(state.fireX + 34 * S, state.groundY + 14 * S, 120 * S, 0.1, 13 * S, 0.2));
      state.logs.push(mkLog(state.fireX - 12 * S, state.groundY - 4 * S, 74 * S, 0.68, 11 * S, 0.6));
      state.logs.push(mkLog(state.fireX + 8 * S, state.groundY - 6 * S, 70 * S, -0.62, 11 * S, 0.6));
      state.logs.push(mkLog(state.fireX - 26 * S, state.groundY + 3 * S, 56 * S, 1.35, 9 * S, 0.4));
      state.logs.push(mkLog(state.fireX + 30 * S, state.groundY + 4 * S, 58 * S, -1.3, 9 * S, 0.4));
      state.logs.push(mkLog(state.fireX - 10 * S, state.groundY - 13 * S, 82 * S, 0.44, 14 * S, 0.85, true));
      state.logs.push(mkLog(state.fireX + 12 * S, state.groundY - 17 * S, 78 * S, -0.42, 14 * S, 0.65, true));

      state.coals = [];
      for (let i = 0; i < 16; i++) {
        state.coals.push({
          x: state.fireX + (Math.random() - 0.5) * 62 * S,
          y: state.groundY + 1 * S + (Math.random() - 0.5) * 8 * S,
          r: (2 + Math.random() * 3.4) * S,
          ph: Math.random() * Math.PI * 2,
          sp: 3 + Math.random() * 5,
        });
      }

      state.tongues = [];
      const T = (role, xOff, hFrac, wHalf, sp) =>
        state.tongues.push({ role, xOff: xOff * S, hFrac, wHalf: wHalf * S, sp, ph: Math.random() * Math.PI * 2 });
      const jit = (m) => (R() - 0.5) * 2 * m;
      T(0, 0, 1.0 + R() * 0.06, 42 + R() * 6, 0.45 + R() * 0.3);
      T(0, -40 + jit(6), 0.64 + R() * 0.12, 24 + R() * 5, 0.6 + R() * 0.4);
      T(0, 40 + jit(6), 0.64 + R() * 0.12, 24 + R() * 5, 0.6 + R() * 0.4);
      T(1, -9 + jit(5), 0.85 + R() * 0.07, 33 + R() * 5, 0.7 + R() * 0.4);
      T(1, 10 + jit(5), 0.78 + R() * 0.08, 31 + R() * 5, 0.75 + R() * 0.4);
      T(2, -3 + jit(4), 0.6 + R() * 0.07, 23 + R() * 4, 0.9 + R() * 0.5);
      T(2, 5 + jit(4), 0.55 + R() * 0.07, 20 + R() * 4, 1.0 + R() * 0.5);
      T(3, 0, 0.42 + R() * 0.06, 15 + R() * 3, 1.2 + R() * 0.6);
      T(3, -11 + jit(4), 0.3 + R() * 0.06, 10 + R() * 2, 1.5 + R() * 0.7);
      T(3, 11 + jit(4), 0.32 + R() * 0.06, 11 + R() * 2, 1.6 + R() * 0.7);

      state.smoke = [];
      for (let i = 0; i < 9; i++) {
        state.smoke.push({
          sp: 0.09 + Math.random() * 0.06,
          ph: Math.random(),
          drift: (Math.random() - 0.35) * 60 * S,
          sway: Math.random() * Math.PI * 2,
          sFac: 0.8 + Math.random() * 0.9,
        });
      }

      state.embers = [];
      const nEmbers = opts.density ?? 30;
      for (let i = 0; i < nEmbers; i++) state.embers.push({ life: 99 });
      state.groundSparks = [];

      state.motes = [];
      for (let i = 0; i < 14; i++) {
        state.motes.push({
          x: state.fireX + (Math.random() - 0.5) * w * 0.16,
          y: state.groundY - Math.random() * h * 0.2,
          sp: 3 + Math.random() * 7,
          ph: Math.random() * Math.PI * 2,
          s: (0.7 + Math.random() * 1.4) * S,
          a: 0.5 + Math.random() * 0.5,
        });
      }

      state.bgWarm = _mix(0.35, color, [255, 200, 110]);
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;
      const dtm = dt * speed;
      const S = state.S;
      const { fireX, groundY, bedY, flameH } = state;

      let pal = null;
      if (bgColor) {
        const [h, s] = _rgbToHsl(_hexToRgb(bgColor));
        const sat = (floor, cap) => Math.max(floor, Math.min(s * 100, cap));
        const hsla = (l, a, satPct) =>
          `hsla(${h.toFixed(1)},${satPct.toFixed(1)}%,${l}%,${a})`;
        const ridgeSat = sat(10, 30);
        const darkSat = sat(8, 24);
        const grassSat = sat(16, 42);
        pal = {
          far1: hsla(8, 0.55, ridgeSat),
          far2: hsla(5, 0.85, ridgeSat),
          mid: hsla(3.5, 0.94, darkSat),
          near: hsla(2.5, 0.97, darkSat),
          gTop: hsla(6, 0.97, ridgeSat),
          gMid: hsla(4.5, 0.98, ridgeSat),
          gDeep: hsla(2, 0.99, darkSat),
          grassLit: hsla(8, 0.95, grassSat),
          grassDim: hsla(5, 0.95, grassSat),
        };
      }

      const fl =
        (0.82 + 0.2 * Math.sin(t * 8.1 + 1.2) * Math.sin(t * 3.4 + 0.6)) *
        (0.88 + 0.12 * Math.sin(t * 1.42 + 0.3));
      const lean = Math.sin(t * 0.8) * 6 * S + Math.sin(t * 2.3) * 2 * S; 

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#02040d");
        sky.addColorStop(0.5, "#060914");
        sky.addColorStop(1, "#100c0e");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }
      const horizGlow = ctx.createRadialGradient(fireX, groundY, 0, fireX, groundY, h * 0.7);
      horizGlow.addColorStop(0, _rgba(state.bgWarm, 0.22 * fl));
      horizGlow.addColorStop(0.4, _rgba(state.bgWarm, 0.08 * fl));
      horizGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = horizGlow;
      ctx.fillRect(fireX - h * 0.7, groundY - h * 0.7, h * 1.4, h * 0.75);
      ctx.restore();

      ctx.fillStyle = "#ccd6f5";
      for (const st of state.stars) {
        if (st.y * h > groundY - h * 0.2) continue;
        const twk = 0.7 + 0.3 * Math.sin(st.ph + t * st.tw);
        ctx.globalAlpha = st.a * twk;
        ctx.fillRect(st.x * w, st.y * h, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      const farTop = groundY - h * 0.02;
      for (const tr of state.farTrees) {
        ctx.fillStyle = pal ? pal.far1 : "rgba(13,17,28,0.55)";
        _drawPine(ctx, tr.x, farTop - tr.ridge * h * 0.02, tr.w, tr.h, false);
      }
      for (const tr of state.farTrees) {
        ctx.fillStyle = pal ? pal.far2 : "rgba(7,10,18,0.85)";
        _drawPine(ctx, tr.x, farTop, tr.w, tr.h, false);
      }

      const gnd = ctx.createLinearGradient(0, groundY, 0, h);
      if (pal) {
        gnd.addColorStop(0, pal.gTop);
        gnd.addColorStop(0.45, pal.gMid);
        gnd.addColorStop(1, pal.gDeep);
      } else {
        gnd.addColorStop(0, "rgba(20,16,10,0.97)");
        gnd.addColorStop(0.45, "rgba(13,10,8,0.98)");
        gnd.addColorStop(1, "rgba(5,4,4,0.99)");
      }
      ctx.fillStyle = gnd;
      ctx.fillRect(0, groundY, w, h - groundY);

      for (const tr of state.midTrees) {
        ctx.fillStyle = pal ? pal.mid : "rgba(5,8,14,0.94)";
        _drawPine(ctx, tr.x, groundY, tr.w, tr.h, true);
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const reach = ctx.createRadialGradient(fireX, bedY - 30 * S, 0, fireX, bedY - 30 * S, h * 0.78);
      reach.addColorStop(0, _rgba(state.warmRGB, 0.17 * fl));
      reach.addColorStop(0.35, _rgba(state.fireRGB, 0.075 * fl));
      reach.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = reach;
      ctx.fillRect(fireX - h * 0.8, bedY - h * 0.9, h * 1.6, h * 0.95);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const poolA = ctx.createRadialGradient(fireX, groundY + 8 * S, 0, fireX, groundY + 8 * S, w * 0.115);
      poolA.addColorStop(0, _rgba(state.warmRGB, 0.24 * fl * (0.8 + 0.2 * Math.sin(t * 12))));
      poolA.addColorStop(0.55, _rgba(state.fireRGB, 0.11 * fl));
      poolA.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = poolA;
      ctx.fillRect(fireX - w * 0.12, groundY - w * 0.12, w * 0.24, w * 0.24);
      const poolB = ctx.createRadialGradient(fireX, groundY + h * 0.06, 0, fireX, groundY + h * 0.06, w * 0.4);
      poolB.addColorStop(0, _rgba(state.fireRGB, 0.085 * fl));
      poolB.addColorStop(0.5, _rgba(state.fireRGB, 0.04 * fl));
      poolB.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = poolB;
      ctx.fillRect(fireX - w * 0.42, groundY, w * 0.84, h * 0.34);
      ctx.restore();

      for (const d of state.dirt) {
        const px = d.x * w;
        const py = groundY + d.y * (h - groundY);
        const nearFire = _clamp01(1 - Math.abs(px - fireX) / (w * 0.5));
        ctx.fillStyle = d.sh < 0.2 ? "rgba(6,6,7,0.62)" : "rgba(0,0,0,0.34)";
        ctx.beginPath();
        ctx.ellipse(px, py, d.r, d.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        if (nearFire > 0.55 && d.sh > 0.2) {
          ctx.fillStyle = _rgba(state.coalRGB, 0.05 * fl * nearFire);
          ctx.beginPath();
          ctx.ellipse(px + d.r * 0.2, py - d.r * 0.2, d.r * 0.6, d.r * 0.24, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const gl of state.glints) {
        const tw = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * gl.sp + gl.ph)), 3);
        if (tw < 0.05) continue;
        ctx.fillStyle = _rgba(state.warmRGB, 0.5 * tw);
        ctx.fillRect(gl.x - gl.r, gl.y, gl.r * 2, gl.r * 1.4);
      }
      ctx.restore();

      ctx.lineCap = "round";
      for (const tuft of state.grass) {
        const gust = 0.5 + 0.5 * Math.sin(t * 0.7 + tuft.ph);
        for (const b of tuft.blades) {
          const wind = Math.sin(t * b.sp + b.ph) * 0.5 * gust;
          const col = tuft.lit
            ? pal
              ? pal.grassLit
              : "rgba(18,23,13,0.95)"
            : pal
              ? pal.grassDim
              : "rgba(9,12,8,0.95)";
          _bladeTip(ctx, tuft.x + b.xo, tuft.y, b.hgt * (0.85 + 0.3 * gust), b.wd, b.lean + wind, col);
        }
      }
      ctx.lineCap = "butt";

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const tuft of state.grass) {
        if (!tuft.lit) continue;
        for (const b of tuft.blades) {
          const wind = Math.sin(t * b.sp + b.ph) * 0.5 * (0.5 + 0.5 * Math.sin(t * 0.7 + tuft.ph));
          _bladeTip(ctx, tuft.x + b.xo, tuft.y, b.hgt * 0.6, b.wd * 1.1, b.lean + wind, _rgba(state.warmRGB, 0.06 + 0.025 * Math.sin(t * 5.5 + b.ph)));
        }
      }
      ctx.restore();

      for (const st of state.stones) {
        const rx = st.r, ry = st.r * 0.6;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(st.x + rx * 0.15, st.y + ry * 0.25, rx * 1.05, ry * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(26,24,30,0.9)";
        ctx.beginPath();
        ctx.ellipse(st.x, st.y, rx, ry, st.rot * 0.4, 0, Math.PI * 2);
        ctx.fill();
        if (st.lit) {
          const dx = fireX - st.x;
          const dy = groundY - st.y;
          const dd = Math.max(20 * S, Math.sqrt(dx * dx + dy * dy));
          const warm = _clamp01(1 - dd / (w * 0.55));
          if (warm > 0.02) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = _rgba(state.warmRGB, 0.1 * fl * warm);
            ctx.beginPath();
            ctx.ellipse(st.x - dx * 0.035, st.y - ry * 0.35, rx * 0.6, ry * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      ctx.strokeStyle = "rgba(22,15,8,0.9)";
      ctx.lineCap = "round";
      for (const tw of state.twigs) {
        ctx.lineWidth = 1.8 * S;
        ctx.beginPath();
        ctx.moveTo(tw.x, tw.y);
        ctx.lineTo(tw.x + Math.cos(tw.rot) * tw.len, tw.y + Math.sin(tw.rot) * tw.len * 0.3);
        ctx.stroke();
      }
      ctx.lineCap = "butt";

      for (const tr of state.nearTrees) {
        ctx.fillStyle = pal ? pal.near : "rgba(3,4,8,0.97)";
        _drawPine(ctx, tr.x, groundY + 4 * S, tr.w, tr.h, true);
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const tr of state.midTrees) {
        const edgeA = Math.max(0, 0.62 - Math.abs(tr.x - fireX) / (w * 0.34));
        if (edgeA <= 0.03) continue;
        const sh = Math.sign(fireX - tr.x);
        ctx.fillStyle = _rgba(state.warmRGB, 0.05 * fl * edgeA);
        _drawPine(ctx, tr.x + sh * tr.w * 0.03, groundY + 2 * S, tr.w * 1.04, tr.h * 1.04, false);
      }
      ctx.restore();

      ctx.save();
      for (const st of state.ring) {
        const sx = fireX + Math.cos(st.a) * st.d;
        const sy = groundY + 6 * S + Math.sin(st.a) * st.d * 0.42;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(sx + 4 * S, sy + 2 * S, st.rx * 1.15, st.rx * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(46,44,50,0.98)";
        ctx.beginPath();
        ctx.ellipse(sx, sy, st.rx, st.rx * 0.62, st.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = _rgba(state.warmRGB, (0.16 + 0.12 * fl) * _clamp01(1 - Math.abs(Math.sin(st.a)) * 1.4));
        ctx.beginPath();
        ctx.ellipse(sx, sy - st.rx * 0.12, st.rx * 0.6, st.rx * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = `rgba(255,216,150,${(0.14 * fl).toFixed(3)})`;
        ctx.lineWidth = 1.2 * S;
        ctx.beginPath();
        ctx.ellipse(sx, sy - st.rx * 0.05, st.rx * 0.82, st.rx * 0.5, st.rot, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      ctx.restore();

      const paintLog = (lg) => {
        ctx.save();
        ctx.translate(lg.x, lg.y);
        ctx.rotate(lg.rot);
        ctx.lineCap = "round";
        ctx.strokeStyle = `rgba(${26 + lg.tone * 18},${18 + lg.tone * 12},${8 + lg.tone * 6},0.99)`;
        ctx.lineWidth = lg.wd;
        ctx.beginPath();
        ctx.moveTo(-lg.len / 2, 0);
        ctx.lineTo(lg.len / 2, 0);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.32)";
        ctx.lineWidth = Math.max(1, lg.wd * 0.08);
        for (let g = -2; g <= 2; g++) {
          ctx.beginPath();
          const gy = (g / 3) * lg.wd * 0.42;
          ctx.moveTo(-lg.len / 2 + 4 * S, gy);
          ctx.bezierCurveTo(-lg.len * 0.1, gy + Math.sin(lg.ph) * 2 * S, lg.len * 0.1, gy - Math.sin(lg.ph + 1) * 2 * S, lg.len / 2 - 4 * S, gy);
          ctx.stroke();
        }
        const lift = _clamp01((state.groundY - lg.y) / (h * 0.06) + 0.25);
        const litA = (0.4 + 0.35 * fl * lift) * (0.55 + Math.abs(Math.sin(lg.rot + Math.PI / 2)) * 0.7);
        ctx.strokeStyle = _rgba(state.warmRGB, litA);
        ctx.lineWidth = Math.max(1.2, lg.wd * 0.16);
        ctx.beginPath();
        ctx.moveTo(-lg.len / 2 + 2 * S, -lg.wd * 0.42);
        ctx.lineTo(lg.len / 2 - 2 * S, -lg.wd * 0.42);
        ctx.stroke();
        ctx.strokeStyle = _rgba(state.coalRGB, 0.22 * fl);
        ctx.lineWidth = lg.wd * 0.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-lg.len / 2, 0);
        ctx.lineTo(-lg.len / 2 + lg.wd * 0.5, 0);
        ctx.moveTo(lg.len / 2, 0);
        ctx.lineTo(lg.len / 2 - lg.wd * 0.5, 0);
        ctx.stroke();
        ctx.restore();
      };
      ctx.lineCap = "butt";
      for (const lg of state.logs) if (!lg.front) paintLog(lg);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      _drawSprite(ctx, _softSprite(state.coalRGB, 0.95), fireX + lean * 0.25, groundY + 2 * S, 46 * S, 15 * S, 0.75 + 0.25 * fl);
      for (const c of state.coals) {
        const pul = 0.55 + 0.45 * Math.sin(t * c.sp + c.ph);
        _drawSprite(ctx, _softSprite(state.warmRGB, 1), c.x, c.y, c.r * (2.4 + pul), c.r * (1.5 + pul), 0.5 + 0.5 * pul);
      }
      ctx.restore();

      for (const p of state.smoke) {
        const k = (t * p.sp + p.ph) % 1;
        const rise = k * k;
        const px = fireX + p.drift * rise + Math.sin(t * 0.4 + p.sway) * 12 * S * (0.3 + rise);
        const py = bedY - h * 0.01 - rise * h * 0.3;
        const rad = (16 + rise * 44) * S * p.sFac;
        const alpha = Math.pow(Math.sin(Math.min(1, k * 1.2) * Math.PI), 1.5) * 0.13;
        _drawSprite(ctx, state.smokeSpr, px, py, rad, rad * 1.2, alpha);
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const py = bedY - flameH * 0.4;
      const plume = ctx.createRadialGradient(fireX + lean * 0.6, py, 0, fireX + lean * 0.6, py, flameH * 1.02);
      plume.addColorStop(0, _rgba(state.innerRGB, 0.16 * fl));
      plume.addColorStop(0.5, _rgba(state.fireRGB, 0.07 * fl));
      plume.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = plume;
      ctx.fillRect(fireX - flameH, py - flameH, flameH * 2, flameH * 2.2);
      ctx.restore();

      const colFor = (role) =>
        role === 0 ? _mix(0.25, state.fireRGB, [255, 120, 30])
        : role === 1 ? state.fireRGB
        : role === 2 ? state.innerRGB
        : _mix(0.3, state.coreRGB, [255, 230, 170]);

      const drawTongue = (tn, baseA) => {
        const breathe = 0.9 + 0.1 * Math.sin(t * (tn.sp * 1.1 + 0.7) + tn.ph * 2.6);
        const hgt = flameH * tn.hFrac * breathe;
        if (hgt < flameH * 0.1) return;
        const flick = 0.72 + 0.28 * Math.sin(t * (tn.sp * 2.2 + 1.6) + tn.ph * 7.2);
        const al = baseA * flick * fl;
        if (al < 0.02) return;
        const bx = fireX + tn.xOff + lean * 0.6;
        const tipLean = lean * 0.9 + tn.xOff * 0.07 + flameH * 0.05 * Math.sin(t * 0.7 + tn.ph * 2.4);
        const w1 = Math.sin(t * (tn.sp + 1.3) + tn.ph * 4.4);
        const w2 = Math.sin(t * (tn.sp + 1.0) + tn.ph * 3.6 + 2.2);
        const col = colFor(tn.role);
        const N = 18;
        const yBase = bedY - 4 * S;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const s = i / N;
          const y = yBase - hgt * Math.pow(s, 0.9);
          const cx = bx + tipLean * s * s;
          const r = tn.wHalf * Math.pow(Math.cos((s * Math.PI) / 2), 1.25);
          const nL = 1 + 0.045 * w1 * Math.sin(s * 9 + tn.ph * 2) + 0.03 * w2 * Math.sin(s * 17 - tn.ph * 1.5);
          if (i === 0) ctx.moveTo(cx - r * nL, y);
          else ctx.lineTo(cx - r * nL, y);
        }
        for (let i = N; i >= 0; i--) {
          const s = i / N;
          const y = yBase - hgt * Math.pow(s, 0.9);
          const cx = bx + tipLean * s * s;
          const r = tn.wHalf * Math.pow(Math.cos((s * Math.PI) / 2), 1.25);
          const nR = 1 + 0.045 * w2 * Math.sin(s * 10 + tn.ph * 2.3) + 0.03 * w1 * Math.sin(s * 16 + tn.ph * 1.8);
          ctx.lineTo(cx + r * nR, y);
        }
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, yBase, 0, yBase - hgt);
        grad.addColorStop(0, _rgba(col, al));
        grad.addColorStop(0.6, _rgba(col, al * 0.72));
        grad.addColorStop(1, _rgba(col, al * 0.42));
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fill();
      };

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const roleA = [0.3, 0.3, 0.32, 0.45];
      for (let role = 0; role <= 3; role++) {
        for (const tn of state.tongues) {
          if (tn.role === role) drawTongue(tn, roleA[role]);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const heartPulse = 0.7 + 0.3 * Math.sin(t * 13.5 + 0.8);
      _drawSprite(ctx, _softSprite(state.coreRGB, 1), fireX + lean * 0.5, bedY - 18 * S, 18 * S, 12 * S, 0.6 * fl * heartPulse);
      _drawSprite(ctx, _softSprite(state.innerRGB, 1), fireX + lean * 0.8, bedY - 40 * S, 15 * S, 19 * S, 0.33 * fl);
      ctx.restore();

      for (const lg of state.logs) if (lg.front) paintLog(lg);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      _drawSprite(ctx, _softSprite(state.coreRGB, 1), fireX + lean * 0.5, bedY - 32 * S, 10 * S, 14 * S, 0.36 * fl * heartPulse);
      ctx.restore();

      for (const e of state.embers) {
        if (e.life >= e.maxLife) {
          e.x = fireX + (Math.random() - 0.5) * 34 * S;
          e.y = bedY - 8 * S - Math.random() * 20 * S;
          e.vx = (Math.random() - 0.5) * 60 * S;
          e.vy = -(30 + Math.random() * 100) * S;
          e.r = (1 + Math.random() * 1.7) * S;
          e.life = 0;
          e.maxLife = 1.6 + Math.random() * 2.6;
          e.ph = Math.random() * Math.PI * 2;
          e.bright = 0.4 + Math.random() * 0.6;
        }
        e.life += dtm;
        if (e.life >= e.maxLife) continue;
        const k = e.life / e.maxLife;
        const nx = e.x + (e.vx + Math.sin(t * 0.9 + e.ph) * 16 * S) * dtm;
        const ny = e.y + (e.vy * (1 - k * 0.5) + (k > 0.25 ? 90 * S * (k - 0.25) * 2 : 0)) * dtm;
        const alpha = Math.max(0, 1 - k);
        if (ny >= groundY + 10 * S && k > 0.2) {
          e.life = e.maxLife;
          state.groundSparks.push({ x: nx, y: groundY + 8 * S + Math.random() * 4 * S, life: 0, max: 0.4 + Math.random() * 0.5, r: (2 + Math.random() * 2.5) * S, ph: Math.random() * Math.PI * 2 });
          continue;
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = _rgba(state.warmRGB, 0.55 * alpha * e.bright);
        ctx.lineWidth = Math.max(0.8, e.r * 1.3);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
        _drawSprite(ctx, _softSprite(state.fireRGB, 0.85), nx, ny, e.r * 5.5, e.r * 5.5, 0.7 * alpha * e.bright);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(255,246,220,${(alpha * e.bright).toFixed(3)})`;
        ctx.fillRect(nx - e.r / 2, ny - e.r / 2, e.r, e.r);
        ctx.restore();
        e.x = nx;
        e.y = ny;
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = state.groundSparks.length - 1; i >= 0; i--) {
        const gs = state.groundSparks[i];
        gs.life += dtm;
        if (gs.life >= gs.max) { state.groundSparks.splice(i, 1); continue; }
        const kk = gs.life / gs.max;
        const a = Math.sin(Math.min(1, kk * 1.6) * Math.PI);
        _drawSprite(ctx, _softSprite(state.warmRGB, 1), gs.x, gs.y, gs.r * 3 * (1 + kk), gs.r * 1.4 * (1 + kk), 0.5 * a);
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const m of state.motes) {
        const cyc = (t * 0.06 + m.ph) % 1;
        const yy = m.y - cyc * h * 0.1;
        if (yy < 0) continue;
        const xx = m.x + Math.sin(t * 0.4 + m.ph * 3) * 10 * S;
        const a = Math.pow(Math.sin(cyc * Math.PI), 0.8) * 0.1;
        _drawSprite(ctx, _softSprite(state.warmRGB, 0.9), xx, yy, m.s * 3.4, m.s * 3.4, a * m.a);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(15,13,19,0.6)";
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.05 + i / 3 + 0.08 * Math.sin(t * 0.13 + i * 2.1)) % 1;
        const px = fireX + lean * 2 + (k - 0.5) * w * 0.2;
        const py = bedY - flameH * 1.35 - k * h * 0.22;
        const rad = (12 + k * 34) * S * 1.5;
        ctx.globalAlpha = Math.pow(Math.sin(k * Math.PI), 1.2) * (i === 1 ? 0.22 : 0.14);
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cast = ctx.createRadialGradient(fireX, groundY - h * 0.06, 0, fireX, groundY - h * 0.06, Math.max(w, h) * 0.72);
      cast.addColorStop(0, _rgba(state.warmRGB, 0.07 * fl));
      cast.addColorStop(0.35, _rgba(state.fireRGB, 0.03 * fl));
      cast.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cast;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      const vig = ctx.createRadialGradient(w / 2, h * 0.4, Math.min(w, h) * 0.4, w / 2, h * 0.52, Math.max(w, h) * 0.94);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
