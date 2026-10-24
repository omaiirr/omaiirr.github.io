(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function _mixc(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function _mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const TAU = Math.PI * 2;

  function _glowSprite(rgb, inner, mid, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, _rgba(rgb, inner));
    g.addColorStop(0.25, _rgba(rgb, mid));
    g.addColorStop(1, _rgba(rgb, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }
  function _cloudSprite(rnd, w, h, moonLit) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.filter = "blur(6px)";
    const puffs = 7 + Math.floor(rnd() * 5);
    for (let i = 0; i < puffs; i++) {
      const px = w * (0.12 + rnd() * 0.76);
      const py = h * (0.42 + rnd() * 0.4);
      const pr = h * (0.18 + rnd() * 0.3);
      const g = x.createRadialGradient(px, py - pr * 0.3, pr * 0.1, px, py, pr);
      g.addColorStop(0, moonLit ? "rgba(96,112,140,0.30)" : "rgba(52,62,84,0.26)");
      g.addColorStop(1, "rgba(20,26,40,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
    }
    x.filter = "none";
    return c;
  }
  function _beamSprite(hex) {
    const rgb = _hexToRgb(hex);
    const coreRGB = _mixc([255, 252, 236], rgb, 0.3);
    const len = 560, halfW = 0.30;
    const halfH = Math.ceil(len * Math.tan(halfW)) + 24;
    const c = document.createElement("canvas");
    c.width = len; c.height = halfH * 2;
    const x = c.getContext("2d");
    x.translate(0, halfH);
    const wedge = (hw, grad, blur) => {
      x.save();
      if (blur) x.filter = `blur(${blur}px)`;
      x.fillStyle = grad;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(len, -len * Math.tan(hw));
      x.lineTo(len, len * Math.tan(hw));
      x.closePath(); x.fill();
      x.filter = "none";
      x.restore();
    };
    const gFor = (stops) => {
      const g = x.createLinearGradient(0, 0, len, 0);
      for (const [p, col, a] of stops) g.addColorStop(p, _rgba(col, a));
      return g;
    };
    wedge(0.30, gFor([[0, rgb, 0.10], [0.35, rgb, 0.04], [1, rgb, 0]]), 14);
    wedge(0.17, gFor([[0, rgb, 0.34], [0.3, rgb, 0.12], [1, rgb, 0]]), 6);
    wedge(0.085, gFor([[0, coreRGB, 0.75], [0.25, rgb, 0.3], [1, rgb, 0]]), 0);
    const cl = x.createLinearGradient(0, 0, len, 0);
    cl.addColorStop(0, _rgba([255, 252, 235], 0.8));
    cl.addColorStop(0.3, _rgba(rgb, 0.32));
    cl.addColorStop(1, _rgba(rgb, 0));
    x.strokeStyle = cl;
    x.lineWidth = 2.6;
    x.lineCap = "round";
    x.beginPath(); x.moveTo(0, 0); x.lineTo(len, 0); x.stroke();
    return { canvas: c, halfH, len };
  }

  const WEATHER = {
    clear: {
      swellK: 0.6, skyDim: 0, starK: 1.3, cloudA: 0.35, cloudDrift: 0.7,
      mist: [
        { y: 0.10, th: 0.035, a: 0.07, ph: 0.6 },
        { y: 0.30, th: 0.03, a: 0.05, ph: 2.8 },
      ],
      surfA: 0.14, surfN: 5, whitecaps: 0, cloudCatchK: 0.8,
    },
    hazy: {
      swellK: 1.0, skyDim: 0, starK: 1.0, cloudA: 0.5, cloudDrift: 1,
      mist: [
        { y: 0.10, th: 0.05, a: 0.10, ph: 0.6 },
        { y: 0.26, th: 0.042, a: 0.08, ph: 2.6 },
        { y: 0.44, th: 0.034, a: 0.06, ph: 4.2 },
      ],
      surfA: 0.2, surfN: 6, whitecaps: 26, cloudCatchK: 1,
    },
    storm: {
      swellK: 1.8, skyDim: 0.18, starK: 0.4, cloudA: 0.8, cloudDrift: 1.7,
      mist: [
        { y: 0.08, th: 0.07, a: 0.15, ph: 0.4 },
        { y: 0.24, th: 0.058, a: 0.12, ph: 2.2 },
        { y: 0.42, th: 0.05, a: 0.10, ph: 4.1 },
      ],
      surfA: 0.34, surfN: 12, whitecaps: 80, cloudCatchK: 1.25,
    },
  };

  function _release(state) {
    state.staticC = null;
    state.beam = null;
    state.glowSprite = null;
    state.coreSprite = null;
    state.foamSprite = null;
    state.cloudSprites = null;
    state.clouds = null;
    state.stars = null;
    state.gulls = null;
    state.ships = null;
    state.coast = null;
  }

  function _rebuild(state, w, h, opts) {
    _release(state);
    state.S = h / 1080;
    const S = state.S;
    const rnd = _mulberry32(1101);
    const W = WEATHER[opts.weather] || WEATHER.hazy;
    state.W = W;
    state.weather = opts.weather || "hazy";
    state.color = opts.color || "#ffe1a8";

    const warmRGB = _hexToRgb(state.color);
    state.beam = _beamSprite(state.color);
    state.glowSprite = _glowSprite(_mixc([255, 250, 230], warmRGB, 0.4), 0.9, 0.42, 128);
    state.coreSprite = _glowSprite(_mixc([255, 252, 236], warmRGB, 0.25), 0.95, 0.5, 128);
    state.foamSprite = _glowSprite([220, 232, 242], 0.5, 0.22, 64);

    state.stars = [];
    const nStars = Math.round(82 * (w * h) / (1280 * 800));
    for (let i = 0; i < nStars; i++) {
      const y = Math.pow(rnd(), 1.5) * 0.55;
      state.stars.push({
        x: rnd(), y,
        r: 0.5 + rnd() * 1.1,
        a: (0.10 + rnd() * 0.34) * W.starK,
        flare: rnd() < 0.06,
        tw: 0.6 + rnd() * 1.6,
        ph: rnd() * TAU,
      });
    }

    state.clouds = [];
    state.cloudSprites = [];
    const cloudRows = opts.weather === "storm"
      ? [{ y: 0.06, sc: 1.1, n: 3, lit: false }, { y: 0.2, sc: 0.9, n: 3, lit: false }]
      : [{ y: 0.10, sc: 0.7, n: 2, lit: true }];
    for (const row of cloudRows) {
      const sp = _cloudSprite(rnd, 460, Math.round(150 * row.sc), row.lit);
      state.cloudSprites.push(sp);
      for (let k = 0; k < row.n; k++) {
        state.clouds.push({
          sp,
          x: (k * 0.42 + rnd() * 0.1) % 1.3 - 0.15,
          y: row.y + (rnd() - 0.5) * 0.03,
          sc: row.sc,
          cw: 0.30 + rnd() * 0.22,
          a: W.cloudA * (0.8 + rnd() * 0.4),
          vx: (2.2 + rnd() * 1.6) * W.cloudDrift,
        });
      }
    }

    state.coast = [];
    const nPts = Math.max(18, Math.round(w / 64));
    for (let i = 0; i <= nPts; i++) {
      state.coast.push({
        x: (i / nPts) * w,
        y: h * 0.74
          + Math.sin(i * 0.7 + 1) * h * 0.012
          + Math.sin(i * 2.1) * h * 0.006,
      });
    }

    state.gulls = [];
    for (let i = 0; i < 3; i++) {
      state.gulls.push({
        x: w * (0.42 + rnd() * 0.55),
        y: h * (0.14 + rnd() * 0.28),
        vx: -(9 + rnd() * 8) * S * 2.2,
        s: 5 + rnd() * 5,
        flap: rnd() * TAU,
        flapSp: 5 + rnd() * 3,
        alive: rnd() < 0.7,
        t0: rnd() * 6,
      });
    }

    state.ships = [];
    for (let i = 0; i < 1; i++) {
      state.ships.push({
        x: w * (0.5 + rnd() * 0.45),
        vx: -(1.6 + rnd() * 1.2) * S,
        bob: rnd() * TAU,
      });
    }

    if (state.az == null) state.az = 0.32; 
    if (state.flashE == null) state.flashE = 0;

    const dpr = state.dpr || 1;
    const sc = document.createElement("canvas");
    sc.width = Math.max(1, Math.round(w * dpr));
    sc.height = Math.max(1, Math.round(h * dpr));
    const o = sc.getContext("2d");
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    _paintHeadland(o, w, h, state, rnd);
    state.tower = _paintTower(o, w, h, state, rnd);
    state.staticC = sc;

    state.surf = [];
    for (let i = 0; i < W.surfN; i++) {
      state.surf.push({
        fx: w * (0.035 + rnd() * 0.20),
        fy: h * (0.744 + rnd() * 0.028),
        fr: w * (0.012 + rnd() * 0.022),
        ph: rnd() * TAU,
      });
    }
    state.surfFoot = [];
    for (let i = 0; i < 5; i++) {
      state.surfFoot.push({
        fx: state.tower.lx + (rnd() - 0.5) * 130 * S,
        fy: Math.min(h * 0.985, state.tower.baseY + (8 + rnd() * 20) * S),
        fr: (14 + rnd() * 22) * S,
        ph: rnd() * TAU,
      });
    }
  }

  function _paintHeadland(o, w, h, state, rnd) {
    const seaY = h * 0.74;
    o.fillStyle = "rgba(13,18,28,0.85)";
    o.beginPath();
    o.moveTo(-10, h);
    o.lineTo(-10, seaY - h * 0.010);
    o.lineTo(w * 0.055, seaY - h * 0.030);
    o.lineTo(w * 0.115, seaY - h * 0.052);
    o.lineTo(w * 0.175, seaY - h * 0.040);
    o.lineTo(w * 0.235, seaY + h * 0.010);
    o.lineTo(w * 0.26, h);
    o.closePath(); o.fill();
    o.fillStyle = "#070a12";
    o.beginPath();
    o.moveTo(-10, h);
    o.lineTo(-10, seaY + h * 0.012);
    o.lineTo(w * 0.03, seaY - h * 0.006);
    o.lineTo(w * 0.075, seaY - h * 0.026);
    o.lineTo(w * 0.125, seaY - h * 0.058);
    o.lineTo(w * 0.165, seaY - h * 0.046);
    o.lineTo(w * 0.205, seaY + h * 0.014);
    o.lineTo(w * 0.24, h);
    o.closePath(); o.fill();
  }

  function _paintTower(o, w, h, state, rnd) {
    const S = state.S;
    const lx = w * 0.165;
    const baseY = h * 0.775;
    const topY = h * 0.295;
    const wBase = 34 * S, wTop = wBase * 0.55;
    const warmRGB = _hexToRgb(state.color);
    const moonRGB = [188, 205, 235];

    o.fillStyle = "#070a12";
    for (let i = 0; i < 9; i++) {
      const rx = lx + (rnd() - 0.5) * 120 * S;
      const ry = baseY + (rnd() - 0.3) * 26 * S;
      const rr = (8 + rnd() * 20) * S;
      o.beginPath();
      o.ellipse(rx, Math.min(ry, h * 0.985), rr, rr * (0.45 + rnd() * 0.3), rnd() * 0.6, 0, TAU);
      o.fill();
    }

    const stripeW = (y) => wBase - (wBase - wTop) * (y - topY) / (baseY - topY);
    const bands = [[0.00, 0.16, 1], [0.16, 0.30, 0], [0.30, 0.46, 1], [0.46, 0.60, 0], [0.60, 1.0, 1]];
    for (const [f0, f1, plaster] of bands) {
      const y0 = topY + (baseY - topY) * f0, y1 = topY + (baseY - topY) * f1;
      const w0 = stripeW(y0), w1 = stripeW(y1);
      const g = o.createLinearGradient(lx - w0, 0, lx + w0, 0);
      if (plaster) {
        g.addColorStop(0, "#232830"); g.addColorStop(0.14, "#b9b4ac");
        g.addColorStop(0.4, "#e9e4da"); g.addColorStop(0.62, "#ddd6cb");
        g.addColorStop(0.86, "#8d8880"); g.addColorStop(1, "#191d24");
      } else {
        g.addColorStop(0, "#201417"); g.addColorStop(0.14, "#8f2f26");
        g.addColorStop(0.4, "#c04a3a"); g.addColorStop(0.62, "#a83b2e");
        g.addColorStop(0.86, "#5e1e18"); g.addColorStop(1, "#180f11");
      }
      o.fillStyle = g;
      o.beginPath();
      o.moveTo(lx - w0, y0); o.lineTo(lx + w0, y0);
      o.lineTo(lx + w1, y1); o.lineTo(lx - w1, y1);
      o.closePath(); o.fill();
      o.strokeStyle = "rgba(30,26,24,0.10)";
      o.lineWidth = 1.4 * S;
      for (let i = 0; i < 4; i++) {
        const sx = lx - w0 * 0.7 + (i + rnd() * 0.4) * w0 * 0.45;
        o.beginPath();
        o.moveTo(sx, y0);
        o.quadraticCurveTo(sx + 2 * S * (rnd() - 0.5), (y0 + y1) / 2, sx + 3 * S * (rnd() - 0.5), y1);
        o.stroke();
      }
    }
    for (const f0 of [0.16, 0.30, 0.46, 0.60]) {
      const y = topY + (baseY - topY) * f0;
      const ws = stripeW(y);
      o.fillStyle = "rgba(0,0,0,0.16)";
      o.fillRect(lx - ws, y - 1.2 * S, ws * 2, 2.4 * S);
    }
    o.strokeStyle = _rgba(moonRGB, 0.30);
    o.lineWidth = 1.6 * S;
    o.beginPath();
    o.moveTo(lx - stripeW(topY) * 0.92, topY);
    o.lineTo(lx - stripeW(baseY) * 0.92, baseY);
    o.stroke();
    const bounce = o.createLinearGradient(0, topY, 0, topY + (baseY - topY) * 0.5);
    bounce.addColorStop(0, _rgba(warmRGB, 0.10));
    bounce.addColorStop(1, _rgba(warmRGB, 0));
    o.fillStyle = bounce;
    o.beginPath();
    o.moveTo(lx - stripeW(topY), topY); o.lineTo(lx + stripeW(topY), topY);
    o.lineTo(lx + stripeW((topY + baseY) / 2), topY + (baseY - topY) * 0.5);
    o.lineTo(lx - stripeW((topY + baseY) / 2), topY + (baseY - topY) * 0.5);
    o.closePath(); o.fill();

    const deckY = topY - 6 * S;
    o.fillStyle = "#10131a";
    for (let i = -3; i <= 3; i++) {
      o.fillRect(lx + i * wTop * 0.42 - 1.6 * S, deckY + 3 * S, 3.2 * S, 4 * S);
    }
    o.fillStyle = "#181c26";
    o.fillRect(lx - wTop - 6 * S, deckY - 2 * S, wTop * 2 + 12 * S, 5 * S);
    o.fillStyle = "#232837";
    o.fillRect(lx - wTop - 6 * S, deckY - 2.8 * S, wTop * 2 + 12 * S, 1.6 * S);
    o.strokeStyle = "#2c3140";
    o.lineWidth = 1.5 * S;
    const railTop = deckY - 12 * S;
    o.beginPath();
    o.moveTo(lx - wTop - 4 * S, railTop); o.lineTo(lx + wTop + 4 * S, railTop);
    o.moveTo(lx - wTop - 4 * S, deckY + 0.5 * S); o.lineTo(lx + wTop + 4 * S, deckY + 0.5 * S);
    o.stroke();
    o.lineWidth = 1 * S;
    for (let bx = lx - wTop - 3.5 * S; bx <= lx + wTop + 3.5 * S; bx += 4.4 * S) {
      o.beginPath(); o.moveTo(bx, railTop); o.lineTo(bx, deckY + 0.5 * S); o.stroke();
    }

    const lrW = 15 * S, lrH = 20 * S;
    const lrY = deckY - 13 * S - lrH;
    o.fillStyle = "#11141c";
    o.fillRect(lx - lrW - 2 * S, lrY - 2 * S, (lrW + 2 * S) * 2, lrH + 4 * S);
    const lampX = lx, lampY = lrY + lrH * 0.5;
    const glass = o.createRadialGradient(lampX, lampY, 1 * S, lampX, lampY, lrW * 1.6);
    glass.addColorStop(0, "rgba(255,246,214,0.95)");
    glass.addColorStop(0.5, "rgba(255,236,180,0.55)");
    glass.addColorStop(1, "rgba(120,110,80,0.16)");
    o.fillStyle = glass;
    o.fillRect(lx - lrW, lrY, lrW * 2, lrH);
    o.strokeStyle = "rgba(16,18,26,0.85)";
    o.lineWidth = 1.6 * S;
    for (let i = -2; i <= 2; i++) {
      o.beginPath(); o.moveTo(lx + i * lrW * 0.42, lrY); o.lineTo(lx + i * lrW * 0.42, lrY + lrH); o.stroke();
    }
    o.beginPath(); o.moveTo(lx - lrW, lampY); o.lineTo(lx + lrW, lampY); o.stroke();
    o.fillStyle = "#171a24";
    o.beginPath();
    o.moveTo(lx - lrW - 2.5 * S, lrY);
    o.quadraticCurveTo(lx, lrY - 15 * S, lx + lrW + 2.5 * S, lrY);
    o.closePath(); o.fill();
    o.fillStyle = "#232837";
    o.beginPath(); o.arc(lx, lrY - 15 * S + 1.5 * S, 2.4 * S, 0, TAU); o.fill();
    o.fillRect(lx - 0.7 * S, lrY - 21 * S, 1.4 * S, 6 * S);
    o.beginPath(); o.arc(lx, lrY - 21.6 * S, 1.2 * S, 0, TAU); o.fill();

    for (const wf of [0.36, 0.52, 0.68]) {
      const wy = topY + (baseY - topY) * wf;
      const r = 3.4 * S;
      o.fillStyle = "#10131b";
      o.beginPath();
      o.moveTo(lx - r, wy + r * 1.4);
      o.arc(lx, wy + r * 1.4, r, Math.PI, 0);
      o.lineTo(lx + r, wy + r * 3.4);
      o.lineTo(lx - r, wy + r * 3.4);
      o.closePath(); o.fill();
    }
    const drW = 5.5 * S, drH = 11 * S, drY = baseY - drH - 2 * S;
    o.fillStyle = "#0c0f16";
    o.beginPath();
    o.moveTo(lx - drW, drY + drH);
    o.arc(lx, drY + drW, drW, Math.PI, 0);
    o.lineTo(lx + drW, drY + drH);
    o.closePath(); o.fill();
    o.fillStyle = "rgba(0,0,0,0.28)";
    o.fillRect(lx - drW - 2.5 * S, baseY - 1.5 * S, (drW + 2.5 * S) * 2, 3 * S);
    const ao = o.createRadialGradient(lx, baseY, 0, lx, baseY, wBase * 1.8);
    ao.addColorStop(0, "rgba(0,0,0,0.4)");
    ao.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = ao;
    o.fillRect(lx - wBase * 1.8, baseY - wBase * 0.7, wBase * 3.6, wBase * 0.9);

    return { lx, baseY, topY, lampX, lampY };
  }

  ThemeScenes.register("lighthouse", {
    label: "Lighthouse",
    defaults: {
      speed: 1,
      intensity: 80,
      color: "#ffe1a8",
      flash: true,
      weather: "hazy",
    },
    presetBgColors: ["#020617", "#000000", "#0a0e1a", "#0f172a", "#0a1a2e", "#0d1117"],
    presetCombos: [
      { color: "#ffe1a8", bg: "#0a0e1a" }, 
      { color: "#ffd9a0", bg: "#0d1117" }, 
      { color: "#fff3d6", bg: "#020617" }, 
      { color: "#f9a8d4", bg: "#1a0a2e" }, 
      { color: "#7dd3fc", bg: "#0a1a2e" }, 
      { color: "#a78bfa", bg: "#120820" }, 
    ],
    options: [
      { key: "speed", label: "Beam Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
      { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
      { key: "color", label: "Beam Color", type: "color" },
      { key: "flash", label: "Toward-viewer Flash", type: "checkbox" },
      {
        key: "weather", label: "Weather", type: "select",
        choices: [["clear", "Clear"], ["hazy", "Hazy"], ["storm", "Storm"]],
      },
    ],

    init(state, w, h, opts) {
      state.t = state.t || 0;
      _rebuild(state, w, h, opts);
    },

    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      if (!state.stars || !state.staticC || !state.tower) {
        _rebuild(state, w, h, opts);
      }
      const dtc = Math.min(0.05, Math.max(0, dt || 0));
      const speed = opts.speed ?? 1;
      const intensity = (opts.intensity ?? 80) / 100;
      const W = WEATHER[opts.weather] || WEATHER.hazy;
      const S = state.S || h / 1080;
      state.t += dtc * speed;
      const t = state.t;

      if (state.weather !== (opts.weather || "hazy") || state.color !== (opts.color || "#ffe1a8")) {
        _rebuild(state, w, h, opts);
      }

      const BASE_RATE = TAU / 9.5;
      const rateMod = 1 + 0.15 * Math.sin(t * 0.23) * Math.sin(t * 0.71 + 1.7);
      state.az = (state.az + dtc * speed * BASE_RATE * rateMod) % TAU;
      const az = state.az;
      const seaward = Math.cos(az) >= 0;

      const warmRGB = _hexToRgb(opts.color || "#ffe1a8");
      const k = 0.55 + 0.45 * intensity;
      const seaY = h * 0.74;
      const tower = state.tower;
      const lampX = tower.lampX, lampY = tower.lampY;

      const dViewer = Math.atan2(Math.sin(az - Math.PI / 2), Math.cos(az - Math.PI / 2));
      const flashOn = opts.flash !== false && Math.abs(dViewer) < 0.28;
      const target = flashOn ? Math.pow(Math.cos((dViewer / 0.28) * (Math.PI / 2)), 2) : 0;
      state.flashE = Math.max(target, state.flashE * Math.exp(-dtc * 3.2));
      const flashE = state.flashE;

      ctx.clearRect(0, 0, w, h);
      if (opts.bgColor) {
        ctx.fillStyle = opts.bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#02030a");
        sky.addColorStop(0.62, "#0a1420");
        sky.addColorStop(1, "#0d1e26");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }
      if (W.skyDim > 0) {
        ctx.fillStyle = `rgba(0,0,4,${W.skyDim})`;
        ctx.fillRect(0, 0, w, h);
      }

      const moonX = w * 0.30, moonY = h * 0.14, moonR = Math.min(w, h) * 0.062;
      ctx.fillStyle = "#cdd8f4";
      for (const st of state.stars) {
        const twk = 0.7 + 0.3 * Math.sin(st.ph + t * st.tw);
        let a = st.a * twk;
        a *= 1 - Math.min(1, Math.max(0, (st.y - 0.34) * 3));
        if (Math.hypot(st.x * w - moonX, st.y * h - moonY) < moonR * 2.6) a *= 0.25;
        if (a < 0.02) continue;
        const sx = st.x * w, sy = st.y * h;
        ctx.globalAlpha = a;
        ctx.fillRect(sx, sy, st.r, st.r);
        if (st.flare) {
          ctx.globalAlpha = a * 0.5;
          const L = st.r * 4;
          ctx.fillRect(sx - L, sy, L * 2, 0.7);
          ctx.fillRect(sx, sy - L, 0.7, L * 2);
        }
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const corona = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 6);
      corona.addColorStop(0, "rgba(185,205,250,0.15)");
      corona.addColorStop(0.35, "rgba(150,178,240,0.055)");
      corona.addColorStop(1, "rgba(150,178,240,0)");
      ctx.fillStyle = corona;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 6, 0, TAU); ctx.fill();
      const warmMoon = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 1.7);
      warmMoon.addColorStop(0, "rgba(255,244,214,0.18)");
      warmMoon.addColorStop(1, "rgba(255,244,214,0)");
      ctx.fillStyle = warmMoon;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.7, 0, TAU); ctx.fill();
      ctx.restore();
      const disc = ctx.createRadialGradient(moonX - moonR * 0.25, moonY - moonR * 0.25, moonR * 0.2, moonX, moonY, moonR);
      disc.addColorStop(0, "#fffdf2");
      disc.addColorStop(0.75, "#e8ecf7");
      disc.addColorStop(1, "#c3cde0");
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(160,175,205,0.20)";
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.2, moonY + moonR * 0.15, moonR * 0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX - moonR * 0.3, moonY + moonR * 0.32, moonR * 0.13, 0, TAU); ctx.fill();

      for (const cl of state.clouds) {
        cl.x += (cl.vx * dtc * speed) / w;
        if (cl.x > 1.3) cl.x -= 1.45;
        const cw = w * cl.cw;
        const ch = cw * (cl.sp.height / cl.sp.width);
        ctx.globalAlpha = cl.a;
        ctx.drawImage(cl.sp, cl.x * w, cl.y * h, cw, ch);
      }
      ctx.globalAlpha = 1;

      if (Math.sin(az) < -0.05) {
        for (const cl of state.clouds) {
          const cy = (cl.y + 0.05) * h;
          const dx = ((cy - lampY) / Math.sin(az)) * Math.cos(az);
          const cx = lampX + dx;
          if (cx < cl.x * w - w * 0.05 || cx > (cl.x * w) + w * cl.cw + w * 0.05) continue;
          const cw = w * cl.cw;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.35);
          g.addColorStop(0, _rgba(warmRGB, 0.20 * k * W.cloudCatchK));
          g.addColorStop(1, _rgba(warmRGB, 0));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx, cy, cw * 0.35, cw * 0.08, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }

      const sea = ctx.createLinearGradient(0, seaY, 0, h);
      sea.addColorStop(0, "#0c1c30");
      sea.addColorStop(1, "#060e1c");
      ctx.fillStyle = sea;
      ctx.fillRect(0, seaY, w, h - seaY);
      const veil = ctx.createLinearGradient(0, seaY, 0, h);
      veil.addColorStop(0, "rgba(10,24,44,0.30)");
      veil.addColorStop(1, "rgba(4,10,22,0.42)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, seaY, w, h - seaY);
      const bands = [
        { f: 0.035, a: 1.2 * W.swellK, k: 0.005, ph: 0.0 },
        { f: 0.16, a: 2.6 * W.swellK, k: 0.009, ph: 1.7 },
        { f: 0.42, a: 5 * W.swellK, k: 0.013, ph: 3.1 },
      ];
      for (const b of bands) {
        const y0 = seaY + b.f * (h - seaY);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) {
          const y = y0
            + Math.sin(x * b.k + t * 1.1 + b.ph) * b.a
            + Math.sin(x * b.k * 2.3 - t * 0.7 + b.ph * 2) * b.a * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(16,36,58,${(0.16 + b.f * 0.3).toFixed(3)})`;
        ctx.fill();
        if (b.f > 0.3 && W.whitecaps > 0) {
          const nCap = W.whitecaps;
          for (let i = 0; i < nCap; i++) {
            const seed = i * 12.9898 + Math.floor(t * 0.8) * 78.233;
            const rx = Math.abs(Math.sin(seed) * 43758.5453) % 1;
            const rr = Math.abs(Math.sin(seed * 1.7) * 12345.6789) % 1;
            const x = rx * w;
            const yy = y0 + Math.sin(x * b.k + t * 1.1 + b.ph) * b.a;
            const a = (0.14 + 0.16 * rr) * Math.max(0, Math.sin(x * 0.02 + b.ph * 3 + Math.floor(t * 0.8)));
            if (a < 0.03) continue;
            ctx.strokeStyle = `rgba(232,240,248,${a.toFixed(3)})`;
            ctx.lineWidth = 1 + rr * 1.5;
            ctx.beginPath();
            ctx.moveTo(x, yy);
            ctx.lineTo(x + 6 + rr * 14, yy - 1);
            ctx.stroke();
          }
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 0; i < 16; i++) {
        const f = i / 16;
        const gy = seaY + 6 + f * (h - seaY) * 0.6;
        const gx = moonX + Math.sin(f * 9 + t * 0.9) * w * (0.012 + f * 0.05);
        const L = w * (0.012 + f * 0.05);
        const a = 0.22 * (1 - f * 0.5) * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.4));
        ctx.strokeStyle = `rgba(198,220,246,${a.toFixed(3)})`;
        ctx.lineWidth = 1.5 + f * 2;
        ctx.beginPath(); ctx.moveTo(gx - L, gy); ctx.lineTo(gx + L, gy); ctx.stroke();
      }
      ctx.restore();

      for (const sh of state.ships) {
        sh.x += sh.vx * dtc * speed;
        if (sh.x < -20) sh.x = w + 20;
        const sy = seaY + h * 0.008 + Math.sin(t * 0.9 + sh.bob) * 1.2 * S;
        ctx.fillStyle = "rgba(6,9,14,0.9)";
        ctx.fillRect(sh.x - 4, sy - 1.2, 8, 1.6);
        ctx.fillStyle = _rgba(warmRGB, 0.85);
        ctx.fillRect(sh.x + 2.4, sy - 2.6, 1.2, 1.2);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(sh.x + 3, sy - 2, 0, sh.x + 3, sy - 2, 7);
        g.addColorStop(0, _rgba(warmRGB, 0.35 * k));
        g.addColorStop(1, _rgba(warmRGB, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sh.x + 3, sy - 2, 7, 0, TAU); ctx.fill();
        ctx.restore();
      }

      if (!seaward) _drawBeam(ctx, w, h, state, az, k, intensity);

      if (state.staticC) ctx.drawImage(state.staticC, 0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const sp of state.surf) {
        const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.3 + sp.fx * 0.02 + sp.ph));
        ctx.globalAlpha = W.surfA * pulse;
        ctx.drawImage(state.foamSprite, sp.fx - sp.fr, sp.fy - sp.fr * 0.42, sp.fr * 2, sp.fr * 0.84);
      }
      for (const sp of state.surfFoot) {
        const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.15 + sp.ph));
        ctx.globalAlpha = 0.18 * pulse;
        ctx.drawImage(state.foamSprite, sp.fx - sp.fr, sp.fy - sp.fr * 0.3, sp.fr * 2, sp.fr * 0.6);
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      for (const wf of [0.36, 0.52, 0.68]) {
        const wy = tower.topY + (tower.baseY - tower.topY) * wf;
        const r = 3.4 * S;
        const a = 0.5 + 0.14 * Math.sin(wf * 40 + t * 2.2);
        const wg = ctx.createRadialGradient(tower.lx, wy + r * 0.6, 0, tower.lx, wy + r * 0.6, r * 2.2);
        wg.addColorStop(0, _rgba(warmRGB, 0.5 * a * k));
        wg.addColorStop(1, _rgba(warmRGB, 0));
        ctx.fillStyle = wg;
        ctx.fillRect(tower.lx - r * 2.2, wy + r * 0.6 - r * 2.2, r * 4.4, r * 4.4);
        ctx.fillStyle = _rgba(warmRGB, 0.38 * a);
        ctx.beginPath();
        ctx.moveTo(tower.lx - r * 0.7, wy + r * 1.1);
        ctx.arc(tower.lx, wy + r * 1.1, r * 0.7, Math.PI, 0);
        ctx.lineTo(tower.lx + r * 0.7, wy + r * 1.9);
        ctx.lineTo(tower.lx - r * 0.7, wy + r * 1.9);
        ctx.closePath(); ctx.fill();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cs = 30 * S * (0.8 + 0.4 * k);
      ctx.drawImage(state.coreSprite, lampX - cs / 2, lampY - cs / 2, cs, cs);
      ctx.drawImage(state.coreSprite, lampX - cs * 0.25, lampY - cs * 0.25, cs * 0.5, cs * 0.5);
      const gs = 92 * S * (0.8 + 0.5 * k + flashE * 0.9);
      ctx.drawImage(state.glowSprite, lampX - gs / 2, lampY - gs / 2, gs, gs);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const m of W.mist) {
        const yc = seaY + m.y * (h - seaY);
        const th = m.th * h;
        const k1 = TAU / (0.5 * w), k2 = TAU / (0.36 * w);
        const edge = (x, phOff) =>
          yc
          + Math.sin(x * k1 + t * 0.4 + m.ph + phOff) * th * 0.34
          + Math.sin(x * k2 - t * 0.3 + m.ph * 2.1 + phOff) * th * 0.2;
        let minY = Infinity, maxY = -Infinity;
        for (let x = 0; x <= w; x += 6) {
          const ty = edge(x, 0), by = edge(x, Math.PI * 0.55);
          if (ty < minY) minY = ty;
          if (by > maxY) maxY = by;
        }
        const breathe = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.35 + m.ph));
        const grad = ctx.createLinearGradient(0, minY - th, 0, maxY + th);
        grad.addColorStop(0, "rgba(150,190,205,0)");
        grad.addColorStop(0.5, `rgba(150,190,205,${(m.a * breathe).toFixed(3)})`);
        grad.addColorStop(1, "rgba(150,190,205,0)");
        ctx.fillStyle = grad;
        ctx.filter = "blur(4px)";
        ctx.beginPath();
        ctx.moveTo(-6, edge(-6, 0));
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, edge(x, 0));
        ctx.lineTo(w + 6, edge(w + 6, Math.PI * 0.55));
        for (let x = w; x >= 0; x -= 6) ctx.lineTo(x, edge(x, Math.PI * 0.55));
        ctx.closePath(); ctx.fill();
        ctx.filter = "none";
      }
      ctx.restore();

      if (seaward) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        _towerKeepOutPath(ctx, tower, S);
        ctx.clip("evenodd");
        _drawBeam(ctx, w, h, state, az, k, intensity);
        ctx.restore();
      }

      if (seaward) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        const ax = lampX + Math.cos(az) * w * 0.06;
        const ay = seaY + h * 0.02;
        const dirX = Math.cos(az);
        const dirY = Math.max(0.12, Math.abs(Math.sin(az)) * 0.45);
        const steps = 22;
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          const d = f * w * 0.62;
          const px = ax + dirX * d;
          const py = ay + dirY * d;
          if (py < seaY + 4 || py > h - 6) continue;
          const spread = w * (0.01 + f * 0.055);
          for (let s = -2; s <= 2; s++) {
            const gx = px + s * spread * 0.4 + Math.sin(f * 31 + s * 5 + t * 0.5) * spread * 0.2;
            const L = (4 + f * 26) * (0.5 + 0.5 * Math.abs(Math.sin(f * 47 + s * 2.3 + t * 2.1)));
            const a = 0.20 * (1 - f * 0.8) * (0.35 + 0.65 * Math.abs(Math.sin(f * 47 + s * 2.3 + t * 2.1))) * k;
            if (a < 0.02) continue;
            ctx.strokeStyle = _rgba(_mixc([255, 252, 236], warmRGB, 0.3), a);
            ctx.lineWidth = 1 + f * 2.2;
            ctx.beginPath();
            ctx.moveTo(gx - L, py + Math.sin(gx * 0.05) * 1.5);
            ctx.lineTo(gx + L, py);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      ctx.lineCap = "round";
      for (const gull of state.gulls) {
        if (!gull.alive) continue;
        gull.t0 -= dtc;
        if (gull.t0 > 0) continue; 
        gull.x += gull.vx * dtc * speed;
        gull.y += Math.sin(t * 0.7 + gull.flap) * 2 * S * dtc * speed;
        gull.flap += dtc * gull.flapSp * speed;
        if (gull.x < -30) { gull.x = w + 30; gull.y = h * (0.14 + Math.random() * 0.28); }
        const flap = Math.sin(gull.flap) * 0.42;
        ctx.strokeStyle = "rgba(8,10,16,0.75)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(gull.x - gull.s, gull.y);
        ctx.quadraticCurveTo(gull.x - gull.s * 0.4, gull.y - gull.s * flap, gull.x, gull.y);
        ctx.quadraticCurveTo(gull.x + gull.s * 0.4, gull.y - gull.s * flap, gull.x + gull.s, gull.y);
        ctx.stroke();
      }
      ctx.lineCap = "butt";

      const vg = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.36, w / 2, h * 0.5, Math.max(w, h) * 0.76);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(1,2,6,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      if (flashE > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const bloomR = h * (0.16 + 0.18 * flashE);
        const bloom = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, bloomR);
        bloom.addColorStop(0, _rgba([255, 248, 224], 0.16 * flashE));
        bloom.addColorStop(0.4, _rgba(warmRGB, 0.06 * flashE));
        bloom.addColorStop(1, _rgba(warmRGB, 0));
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = _rgba([255, 244, 216], 0.03 * flashE);
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },

    destroy(state) {
      _release(state);
    },
  });

  function _towerKeepOutPath(ctx, tower, S) {
    const deckY = tower.topY - 6 * S;
    const wTop = 34 * S * 0.55, wBase = 34 * S;
    ctx.moveTo(tower.lx - wTop - 8 * S, deckY - 2 * S);
    ctx.lineTo(tower.lx + wTop + 8 * S, deckY - 2 * S);
    ctx.lineTo(tower.lx + wBase + 4 * S, tower.baseY + 6 * S);
    ctx.lineTo(tower.lx - wBase - 4 * S, tower.baseY + 6 * S);
    ctx.closePath();
  }

  function _drawBeam(ctx, w, h, state, az, k, intensity) {
    const beam = state.beam;
    if (!beam) return;
    const reach = Math.max(w, h) * 1.15;
    const scale = reach / beam.len;
    const tower = state.tower;
    ctx.save();
    ctx.translate(tower.lampX, tower.lampY);
    ctx.rotate(az);
    ctx.globalAlpha = 0.55 + 0.45 * intensity;
    ctx.drawImage(beam.canvas, 0, -beam.halfH * scale, beam.len * scale, beam.halfH * 2 * scale);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
})();
