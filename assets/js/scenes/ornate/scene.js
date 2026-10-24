(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgb(c) {
    if (Array.isArray(c)) return c;
    return typeof c === "string" && c.startsWith("rgb")
      ? c.match(/\d+/g).slice(0, 3).map(Number)
      : _hexToRgb(c);
  }
  function _mix(c1, c2, t) {
    const a = _rgb(c1);
    const b = _rgb(c2);
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function _rgba(c, a) {
    const v = _rgb(c);
    return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  const TAU = Math.PI * 2;

  function _rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _buildGear(r, teeth) {
    const p = new Path2D();
    const pitch = TAU / teeth;
    const tip = r;
    const root = r * 0.87;
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = i * pitch;
      const profile = [
        [root, a + pitch * 0.06],
        [tip, a + pitch * 0.2],
        [tip, a + pitch * 0.46],
        [root, a + pitch * 0.6],
        [root, a + pitch * 0.94],
      ];
      for (const [rad, ang] of profile) {
        pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
      }
    }
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    p.moveTo(r * 0.66, 0);
    p.arc(0, 0, r * 0.66, 0, TAU);
    return p;
  }

  function _buildSpokes(r, spokes) {
    const p = new Path2D();
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU;
      const x0 = Math.cos(a) * r * 0.22;
      const y0 = Math.sin(a) * r * 0.22;
      const x1 = Math.cos(a) * r * 0.67;
      const y1 = Math.sin(a) * r * 0.67;
      const w0 = r * 0.045;
      const nx = Math.cos(a + Math.PI / 2) * w0;
      const ny = Math.sin(a + Math.PI / 2) * w0;
      p.moveTo(x0 + nx, y0 + ny);
      p.lineTo(x1 + nx * 0.6, y1 + ny * 0.6);
      p.lineTo(x1 - nx * 0.6, y1 - ny * 0.6);
      p.lineTo(x0 - nx, y0 - ny);
      p.closePath();
    }
    return p;
  }

  function _bakeBackdrop(w, h, base, gears, metal, glowFade) {
    const glowScale = glowFade == null ? 1 : glowFade;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const x = c.getContext("2d");
    const top = _mix(base, [14, 18, 38], 0.55);
    const bot = _mix(base, [3, 4, 11], 0.7);
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, _rgba(top, 1));
    bg.addColorStop(0.55, _rgba(_mix(top, bot, 0.65), 1));
    bg.addColorStop(1, _rgba(bot, 1));
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);

    x.globalCompositeOperation = "lighter";
    const bloom = x.createRadialGradient(w * 0.74, h * 0.12, 0, w * 0.74, h * 0.12, Math.max(w, h) * 0.55);
    bloom.addColorStop(0, "rgba(96, 122, 178, 0.09)");
    bloom.addColorStop(0.5, "rgba(70, 92, 148, 0.035)");
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = bloom;
    x.fillRect(0, 0, w, h);

    const glowSprite = _bakeGlow(metal);
    for (const g of gears) {
      const near = _clamp(g.near, 0.3, 1);
      const gd = g.r * 1.22;
      x.globalAlpha = (0.26 * near + 0.1) * glowScale;
      x.drawImage(glowSprite, g.x - gd, g.y - gd, gd * 2, gd * 2);
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";

    const vig = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, _rgba(_mix(bot, [0, 0, 0], 0.5), 0.55));
    x.fillStyle = vig;
    x.fillRect(0, 0, w, h);
    return c;
  }

  function _bakeGlow(metal) {
    const SZ = 128;
    const c = document.createElement("canvas");
    c.width = c.height = SZ;
    const x = c.getContext("2d");
    const brass = _mix(metal, [255, 226, 160], 0.32);
    const hot = _mix(brass, [255, 248, 222], 0.62);
    const g = x.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ / 2);
    g.addColorStop(0, _rgba(hot, 1));
    g.addColorStop(0.082, _rgba(hot, 1));
    g.addColorStop(0.587, _rgba(hot, 0.53));
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, SZ, SZ);
    return c;
  }

  ThemeScenes.register("ornate", {
    label: "Celestial Clockwork",
    defaults: { density: 7, speed: 0.6, color: "#c9a227", scale: 1 },
    presetBgColors: ["#05060f", "#000000", "#0a0f22", "#0f172a", "#120b1a", "#07100f"],
    presetCombos: [
      { color: "#c9a227", bg: "#05060f" }, 
      { color: "#f0c04a", bg: "#0a0f22" }, 
      { color: "#e0a37a", bg: "#120b1a" }, 
      { color: "#c7d2e4", bg: "#0f172a" }, 
      { color: "#c87941", bg: "#140f08" }, 
      { color: "#d9b8ff", bg: "#0a0714" }, 
    ],
    options: [
      { key: "density", label: "Gears", type: "range", min: 3, max: 15, step: 1 },
      { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
      { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
      { key: "color", label: "Metal", type: "color" },
    ],

    init(state, w, h, opts) {
      state.t = 0;
      const sc = opts.scale ?? 1;
      const n = _clamp(Math.round(opts.density ?? 7), 3, 15);
      const minSide = Math.min(w, h);
      const cx = w / 2;
      const cy = h / 2;

      const rMin = Math.min(minSide * 0.04, h * 0.05);
      const rMax = Math.min(h * 0.26, w * 0.3);
      const core = minSide * 0.15; 
      const rnd = _rng(0x5ce1e57);
      const metal = _rgb(opts.color || "#c9a227");
      const countFade = _clamp(Math.sqrt(7 / n), 0.5, 1);
      const sizeBase =
        minSide * 0.19 * (0.72 + 0.28 * sc) * Math.pow(7 / n, 0.62);
      const gearsOut = [];
      for (let i = 0; i < n; i++) {
        const ang = i * 2.399963 + 0.55; 
        const t = Math.pow((i + 0.5) / n, 0.55);
        const size = 0.7 + 0.6 * ((i * 0.37 + 0.11) % 1);
        let r = _clamp(sizeBase * size, rMin, rMax);
        let x = cx + Math.cos(ang) * t * w * 0.4 * (0.94 + 0.12 * rnd());
        let y = cy + Math.sin(ang) * t * h * 0.4 * (0.94 + 0.12 * rnd());

        x = _clamp(x, r, w - r);
        y = _clamp(y, r, h - r);
        const reach = () => Math.hypot(x - cx, y - cy);
        if (reach() < core + r) {
          const d = reach() || 1;
          x = cx + ((x - cx) / d) * (core + r);
          y = cy + ((y - cy) / d) * (core + r);
          x = _clamp(x, r, w - r);
          y = _clamp(y, r, h - r);
          const room = reach() - core;
          if (room < r) r = Math.max(rMin, Math.min(r, room));
        }
        gearsOut.push({ x, y, r });
      }

      state.gears = [];
      for (let i = 0; i < gearsOut.length; i++) {
        const g0 = gearsOut[i];
        const r = g0.r;
        let teeth = Math.round((2 * r) / (minSide * 0.0105));
        if (teeth % 2) teeth += 1;
        teeth = _clamp(teeth, 10, 64);
        const spokes = teeth > 32 ? 7 : teeth > 20 ? 6 : 5;
        state.gears.push({
          x: g0.x,
          y: g0.y,
          r,
          teeth,
          dir: i % 2 === 0 ? 1 : -1,
          near: _clamp((r - rMin) / Math.max(1, rMax - rMin), 0, 1),
          rot: rnd() * TAU,
          omega: 0, 
          teethPath: _buildGear(r, teeth),
          spokePath: _buildSpokes(r, spokes),
        });
      }

      const w0 = 0.16 * (16 / state.gears[0].teeth);
      state.gears[0].omega = w0;
      for (let i = 1; i < state.gears.length; i++) {
        const prev = state.gears[i - 1];
        const g = state.gears[i];
        g.omega = _clamp(-prev.omega * (prev.teeth / g.teeth), -0.8, 0.8);
      }

      const brass = _mix(metal, [255, 226, 160], 0.32);
      const hot = _mix(brass, [255, 248, 222], 0.62);
      const cold = _mix(brass, [58, 74, 110], 0.55);
      state.brass = brass;
      for (const g of state.gears) {
        const near = _clamp(g.near, 0.3, 1);
        g.nearC = near;
        g.tone = _mix(brass, cold, 0.02 + 0.16 * (1 - near));
        g.edge = _mix(g.tone, hot, 0.52 + 0.34 * near);
        const fade = countFade;
        g.bodyA = Math.min(0.15, (0.11 + 0.04 * near) * fade); 
        g.rimA = Math.min(0.24, (0.18 + 0.06 * near) * fade); 
        g.innerA = (0.13 + 0.04 * near) * fade;
        g.spokeA = (0.1 + 0.04 * near) * fade;
        g.spokeLineA = (0.15 + 0.05 * near) * fade;
        g.hubA = (0.17 + 0.05 * near) * fade;
      }
      state.order = state.gears.slice().sort((a, b) => a.r - b.r);
      state.limits = {
        keepX: Math.min(w * 0.42, minSide * 0.46),
        keepY: Math.min(h * 0.4, minSide * 0.34),
        rMin,
        rMax,
        core,
      };

      state.backdrop = _bakeBackdrop(
        w,
        h,
        opts.bgColor || "#05060f",
        state.gears,
        metal,
        countFade,
      );

      state.stars = [];
      const starCount = Math.max(24, Math.round(70 * Math.min(1, (w * h) / 500000) + 24));
      for (let i = 0; i < starCount; i++) {
        let sx = rnd();
        let sy = rnd() * 0.86;
        for (
          let tries = 0;
          tries < 10 &&
          Math.abs(sx * w - cx) < core * 1.05 &&
          Math.abs(sy * h - cy) < core * 0.7;
          tries++
        ) {
          sx = rnd();
          sy = rnd() * 0.86;
        }
        state.stars.push({
          x: sx,
          y: sy,
          size: (0.6 + rnd() * 1.3) * Math.max(0.7, minSide / 900),
          ph: rnd() * TAU,
          sp: 0.25 + rnd() * 0.85,
          a: 0.12 + rnd() * 0.4,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0 || !state.gears) return;
      const speed = opts.speed ?? 0.6;
      state.t += Math.min(0.05, Math.max(0, dt || 0));
      const t = state.t * speed;
      const brass = state.brass; 
      const minSide = Math.min(w, h);
      const keepX = state.limits ? state.limits.keepX : w * 0.4;
      const keepY = state.limits ? state.limits.keepY : h * 0.24;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      ctx.drawImage(state.backdrop, 0, 0, w, h);

      for (const s of state.stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        ctx.fillStyle = `rgba(214, 226, 255, ${s.a * tw})`;
        ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
      }

      const bezel = (grow) => {
        const x0 = cx - keepX - grow;
        const y0 = cy - keepY - grow;
        const x1 = cx + keepX + grow;
        const y1 = cy + keepY + grow;
        const rad = Math.min(48, keepX * 0.2);
        ctx.beginPath();
        ctx.moveTo(x0 + rad, y0);
        ctx.lineTo(x1 - rad, y0);
        ctx.arcTo(x1, y0, x1, y0 + rad, rad);
        ctx.lineTo(x1, y1 - rad);
        ctx.arcTo(x1, y1, x1 - rad, y1, rad);
        ctx.lineTo(x0 + rad, y1);
        ctx.arcTo(x0, y1, x0, y1 - rad, rad);
        ctx.lineTo(x0, y0 + rad);
        ctx.arcTo(x0, y0, x0 + rad, y0, rad);
        ctx.closePath();
      };
      ctx.strokeStyle = _rgba(brass, 0.1);
      ctx.lineWidth = Math.max(0.6, minSide * 0.0012);
      bezel(minSide * 0.02);
      ctx.stroke();
      bezel(minSide * 0.055);
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.008);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const long = i % 3 === 0;
        const rx = keepX + minSide * (long ? 0.03 : 0.045);
        const ry = keepY + minSide * (long ? 0.03 : 0.045);
        ctx.strokeStyle = _rgba(brass, long ? 0.16 : 0.09);
        ctx.lineWidth = Math.max(0.6, minSide * (long ? 0.0016 : 0.001));
        ctx.beginPath();
        ctx.moveTo(ca * rx, sa * ry);
        ctx.lineTo(ca * (rx + minSide * 0.022), sa * (ry + minSide * 0.022));
        ctx.stroke();
      }
      ctx.restore();

      for (const g of state.order) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot + t * g.omega);

        ctx.fillStyle = _rgba(g.tone, g.bodyA);
        ctx.fill(g.teethPath, "evenodd");
        ctx.strokeStyle = _rgba(g.edge, g.rimA);
        ctx.lineWidth = Math.max(0.55, g.r * 0.019);
        ctx.stroke(g.teethPath);

        ctx.strokeStyle = _rgba(g.tone, g.innerA);
        ctx.lineWidth = Math.max(0.5, g.r * 0.032);
        ctx.beginPath();
        ctx.arc(0, 0, g.r * 0.66, 0, TAU);
        ctx.stroke();

        ctx.fillStyle = _rgba(g.tone, g.spokeA);
        ctx.fill(g.spokePath);
        ctx.strokeStyle = _rgba(g.edge, g.spokeLineA);
        ctx.lineWidth = Math.max(0.4, g.r * 0.01);
        ctx.stroke(g.spokePath);

        ctx.fillStyle = _rgba(g.tone, g.hubA);
        ctx.beginPath();
        ctx.arc(0, 0, g.r * 0.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = _rgba(g.edge, Math.min(0.3, g.rimA + 0.03));
        ctx.lineWidth = Math.max(0.5, g.r * 0.018);
        ctx.stroke();
        ctx.fillStyle = _rgba(_mix(g.edge, [255, 255, 255], 0.55), Math.min(0.38, g.rimA + 0.08));
        ctx.beginPath();
        ctx.arc(0, 0, g.r * 0.055, 0, TAU);
        ctx.fill();

        ctx.restore();
      }

    },
  });
})();
