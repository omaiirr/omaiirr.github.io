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
  function _hue(c) {
    const [r0, g0, b0] = _rgb(c);
    const r = r0 / 255, g = g0 / 255, b = b0 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return -1;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  }
  function _hueGap(a, b) {
    const ha = _hue(a), hb = _hue(b);
    if (ha < 0 || hb < 0) return 0;
    const d = Math.abs(ha - hb) % 360;
    return d > 180 ? 360 - d : d;
  }
  function _shade(c, dBright) {
    const v = _rgb(c);
    return v.map((n) => _clamp(Math.round(n * dBright), 0, 255));
  }
  function _jitter(c, deg) {
    const [r0, g0, b0] = _rgb(c);
    const r = r0 / 255, g = g0 / 255, b = b0 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    if (d > 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + deg + 360) % 360;
    }
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1) || 1);
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const xx = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma / 2;
    let rp, gp, bp;
    if (h < 60) [rp, gp, bp] = [chroma, xx, 0];
    else if (h < 120) [rp, gp, bp] = [xx, chroma, 0];
    else if (h < 180) [rp, gp, bp] = [0, chroma, xx];
    else if (h < 240) [rp, gp, bp] = [0, xx, chroma];
    else if (h < 300) [rp, gp, bp] = [xx, 0, chroma];
    else [rp, gp, bp] = [chroma, 0, xx];
    return [
      Math.round((rp + m) * 255),
      Math.round((gp + m) * 255),
      Math.round((bp + m) * 255),
    ];
  }
  function _reg(state, col) {
    const key = col[0] + "," + col[1] + "," + col[2];
    let c = state._colMap.get(key);
    if (!c) {
      c = col;
      state._colMap.set(key, c);
      state.paletteList.push(c);
    }
    return c;
  }

  const GRAVITY = 0.62; 
  const LAUNCH_MIN = 0.78; 
  const LAUNCH_VAR = 0.34;
  const DRAG = 1.35; 
  const SPARK_POOL = 1100;
  const SHAPES = ["ring", "sphere", "palm", "double"];

  const EXPLOSION_COLORS = [
    { name: "crimson", col: [255, 38, 74] },
    { name: "electric blue", col: [40, 116, 255] },
    { name: "emerald", col: [0, 224, 122] },
    { name: "deep purple", col: [164, 74, 255] },
    { name: "brilliant gold", col: [255, 196, 46] },
    { name: "silver", col: [236, 241, 255] },
    { name: "magenta", col: [255, 64, 196] },
    { name: "tangerine", col: [255, 128, 40] },
  ];

  function _takeSpark(state) {
    const pool = state.sparks;
    for (let i = 0; i < pool.length; i++) {
      const s = pool[state.cursor];
      state.cursor = (state.cursor + 1) % pool.length;
      if (!s.alive) {
        s.alive = true;
        return s;
      }
    }
    return null;
  }

  function _shellPicks(opts) {
    if (Array.isArray(opts.colors)) {
      return opts.colors
        .filter((c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c))
        .slice(0, 8);
    }
    if (typeof opts.color === "string" && /^#[0-9a-fA-F]{6}$/.test(opts.color))
      return [opts.color];
    return [];
  }

  function _pickSet(state) {
    if (!state.bag || state.bag.length === 0) {
      const bag = state.colorSets.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = bag[i];
        bag[i] = bag[j];
        bag[j] = tmp;
      }
      state.bag = bag;
    }
    const set = state.colorSets[state.bag.pop()];
    const variants = state.variants[set.name];
    return variants && variants.length
      ? variants[Math.floor(Math.random() * variants.length)]
      : set;
  }

  function _spawnShell(state, w, h, midair) {
    const y0 = midair ? h * (0.38 + Math.random() * 0.3) : h + 6;
    const rise = Math.max(h * 0.2, y0 - h * 0.14);
    const want = (LAUNCH_MIN + Math.random() * LAUNCH_VAR) * h;
    const vy = -Math.min(want, Math.sqrt(2 * GRAVITY * h * rise));
    const set = _pickSet(state);
    state.shells.push({
      x: w * (0.12 + Math.random() * 0.76),
      y: y0,
      px: 0,
      py: 0,
      vx: (Math.random() - 0.5) * 0.05 * w,
      vy,
      fuse: Math.abs(vy) / (GRAVITY * h),
      set,
      col: set.col,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    });
  }

  function _burst(state, w, h, x, y, shape, density, set) {
    const n = Math.round(58 + (density ?? 3) * 13);
    const main = set.col;
    let second = main;
    if (shape === "double") {
      const far = state.colorSets.filter((c) => _hueGap(c.col, main) >= 55);
      if (far.length) second = far[Math.floor(Math.random() * far.length)].col;
    }
    state.flashes.push({
      x, y, col: main,
      r: h * (0.13 + Math.random() * 0.08),
      life: 0.45,
      lifeMax: 0.45,
    });
    for (let i = 0; i < n; i++) {
      const s = _takeSpark(state);
      if (!s) return;
      const a = Math.random() * Math.PI * 2;
      let mag;
      if (shape === "ring") mag = 0.25 + Math.random() * 0.08;
      else if (shape === "double") mag = (i % 2 ? 0.18 : 0.33) + Math.random() * 0.05;
      else if (shape === "palm") mag = 0.09 + Math.random() * 0.17;
      else mag = 0.06 + Math.pow(Math.random(), 0.55) * 0.3;
      const sp = mag * h;
      s.px = x;
      s.py = y;
      s.x = x;
      s.y = y;
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp * 0.72;
      const willow = shape === "palm" ? 1.6 : 1;
      s.lifeMax = (0.55 + Math.random() * 0.5) * willow;
      s.life = s.lifeMax;
      s.size = Math.max(1.4, (1.5 + Math.random() * 1.4) * Math.max(0.8, state.S));
      if (shape === "double") s.col = i % 2 ? second : main;
      else {
        const r = Math.random();
        s.col = r < 0.78 ? main : r < 0.93 ? set.pale : set.hot;
      }
      s.hot = set.hot;
      s.crackle = Math.random() < 0.16 ? 1 : 0;
    }
  }

  function _crackle(state, w, h, src) {
    for (let k = 0; k < 3; k++) {
      const s = _takeSpark(state);
      if (!s) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.02 + Math.random() * 0.04) * h;
      s.px = src.x;
      s.py = src.y;
      s.x = src.x;
      s.y = src.y;
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp * 0.72;
      s.lifeMax = 0.22 + Math.random() * 0.2;
      s.life = s.lifeMax;
      s.size = Math.max(1, s.size * 0.8);
      s.col = src.hot || state.paletteList[0];
      s.crackle = 0;
    }
  }

  function _step(state, w, h, dt) {
    state.t += dt;
    const density = state.density ?? 3;

    state.launchIn -= dt;
    if (state.launchIn <= 0) {
      _spawnShell(state, w, h, false);
      const rate = 0.3 + density * 0.22; 
      state.launchIn = (0.7 + Math.random() * 1.15) / rate;
    }

    for (let i = state.shells.length - 1; i >= 0; i--) {
      const sh = state.shells[i];
      sh.px = sh.x;
      sh.py = sh.y;
      sh.vy += GRAVITY * h * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.fuse -= dt;
      if (sh.fuse <= 0 || sh.vy >= 0) {
        _burst(state, w, h, sh.x, sh.y, sh.shape, density, sh.set);
        state.shells.splice(i, 1);
      }
    }

    const drag = Math.exp(-DRAG * dt);
    for (const s of state.sparks) {
      if (!s.alive) continue;
      s.life -= dt;
      if (s.life <= 0) {
        if (s.crackle) _crackle(state, w, h, s);
        s.alive = false;
        continue;
      }
      s.px = s.x;
      s.py = s.y;
      s.vx *= drag;
      s.vy = s.vy * drag + GRAVITY * h * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y > h + 40 || s.x < -60 || s.x > w + 60) s.alive = false;
    }

    for (let i = state.flashes.length - 1; i >= 0; i--) {
      state.flashes[i].life -= dt;
      if (state.flashes[i].life <= 0) state.flashes.splice(i, 1);
    }
  }

  function _render(ctx, w, h, state) {
    ctx.globalCompositeOperation = "lighter";

    for (const f of state.flashes) {
      const p = 1 - f.life / f.lifeMax;
      const r = f.r * (0.3 + p * 1.15);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, _rgba(f.col, 0.5 * (1 - p)));
      g.addColorStop(0.4, _rgba(f.col, 0.16 * (1 - p)));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const buckets = state._buckets;
    for (const arr of buckets.values()) arr.length = 0;
    for (const s of state.sparks) {
      if (!s.alive) continue;
      let arr = buckets.get(s.col);
      if (!arr) {
        arr = [];
        buckets.set(s.col, arr);
      }
      arr.push(s);
    }
    ctx.lineCap = "round";
    for (const [col, arr] of buckets) {
      if (!arr.length) continue;
      ctx.strokeStyle = _rgba(col, 1);
      for (const s of arr) {
        const l = _clamp(s.life / s.lifeMax, 0, 1);
        if (l < 0.42) continue;
        ctx.globalAlpha = 0.16 * l;
        ctx.lineWidth = s.size * 4 * l;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      for (const s of arr) {
        const l = _clamp(s.life / s.lifeMax, 0, 1);
        ctx.globalAlpha = 0.35 + 0.65 * l;
        ctx.lineWidth = s.size * (0.75 + 0.75 * l);
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    for (const sh of state.shells) {
      const tail = Math.min(h * 0.06, Math.abs(sh.vy) * 0.09);
      const g = ctx.createLinearGradient(sh.x, sh.y, sh.x, sh.y + tail);
      g.addColorStop(0, _rgba(sh.col, 0.9));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, 1.7 * state.S);
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x, sh.y + tail);
      ctx.stroke();
      const hr = 5 * Math.max(0.7, state.S);
      const halo = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, hr);
      halo.addColorStop(0, _rgba(sh.col, 0.5));
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = _rgba(_mix(sh.col, [255, 255, 255], 0.6), 1);
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, Math.max(1.1, 1.7 * Math.max(0.7, state.S)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ThemeScenes.register("fireworks", {
    label: "Fireworks",
    defaults: { density: 3, speed: 1 },
    presetBgColors: ["#020617", "#000000", "#0f172a", "#1a0a2e", "#0a1628", "#0d1117"],
    presetShellColors: [
      { name: "Cyan", color: "#22d3ee" },
      { name: "Electric", color: "#2874ff" },
      { name: "Crimson", color: "#ff264a" },
      { name: "Emerald", color: "#00e07a" },
      { name: "Violet", color: "#a44aff" },
      { name: "Magenta", color: "#ff40c4" },
      { name: "Gold", color: "#ffc42e" },
      { name: "Silver", color: "#ecf1ff" },
    ],
    presetCombos: [
      { color: "#22d3ee", bg: "#020617" }, 
      { color: "#ff40c4", bg: "#1a0a2e" }, 
      { color: "#2874ff", bg: "#0a1628" }, 
      { color: "#00e07a", bg: "#06170f" }, 
      { color: "#ecf1ff", bg: "#0d1117" }, 
      { color: "#ffc42e", bg: "#1a1208" }, 
    ],
    options: [
      { key: "density", label: "Shells", type: "range", min: 1, max: 6, step: 1 },
      { key: "speed", label: "Pace", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "colors", label: "Shell Colors", type: "shellcolors" },
    ],

    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      state.cursor = 0;
      state.launchIn = 0.25;

      const picks = _shellPicks(opts);
      state.shellPicks = picks.slice();
      const baseSets = picks.length
        ? picks.map((hex, i) => ({ name: `shell ${i + 1}`, col: _rgb(hex) }))
        : EXPLOSION_COLORS.map((c) => ({ name: c.name, col: c.col }));
      state._colMap = new Map();
      state.paletteList = [];
      state.colorSets = baseSets.map((c) => ({
        name: c.name,
        pale: _mix(c.col, [255, 255, 255], 0.16),
        hot: _mix(c.col, [255, 255, 255], 0.6),
        col: c.col,
      }));
      for (const set of state.colorSets) {
        set.col = _reg(state, set.col);
        set.pale = _reg(state, set.pale);
        set.hot = _reg(state, set.hot);
      }
      state.variants = {};
      for (const set of state.colorSets) {
        const variants = [];
        for (const [deg, bright] of [[-11, 1.05], [9, 0.93]]) {
          const col = _reg(state, _shade(_jitter(set.col, deg), bright));
          variants.push({
            name: set.name,
            col,
            pale: _reg(state, _mix(col, [255, 255, 255], 0.16)),
            hot: _reg(state, _mix(col, [255, 255, 255], 0.6)),
          });
        }
        state.variants[set.name] = variants;
      }
      state._buckets = new Map();
      state.bag = [];
      state.density = opts.density ?? 3;

      state.shells = [];
      state.flashes = [];
      state.sparks = [];
      for (let i = 0; i < SPARK_POOL; i++) {
        state.sparks.push({
          alive: false,
          x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
          life: 0, lifeMax: 1, size: 1, col: state.paletteList[0], hot: null, crackle: 0,
        });
      }

      _spawnShell(state, w, h, true);
      _spawnShell(state, w, h, true);
      _burst(state, w, h, w * (0.25 + Math.random() * 0.5), h * (0.2 + Math.random() * 0.22),
        SHAPES[Math.floor(Math.random() * SHAPES.length)], state.density, _pickSet(state));
      for (let i = 0; i < 9; i++) _step(state, w, h, 0.05);
    },

    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      const speed = opts.speed ?? 1;
      const dtm = Math.min(0.05, Math.max(0, dt || 0)) * speed;
      state.density = opts.density ?? 3;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = opts.bgColor || "#020617";
      ctx.fillRect(0, 0, w, h);

      _step(state, w, h, dtm);
      _render(ctx, w, h, state);
      ctx.restore();
    },
  });
})();
