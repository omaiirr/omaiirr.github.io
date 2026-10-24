(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function _hueOf(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  }
  function _satOf(c) {
    const max = Math.max(c[0], c[1], c[2]) / 255;
    const min = Math.min(c[0], c[1], c[2]) / 255;
    if (max === min) return 0;
    const l = (max + min) / 2;
    return (max - min) / (1 - Math.abs(2 * l - 1) || 1);
  }
  function _mixHue(a, b, t) {
    const d = ((b - a + 540) % 360) - 180;
    return ((a + d * t) % 360 + 360) % 360;
  }
  function _hsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }
  const _lighter = (c, amt) =>
    c.map((v) => Math.min(255, Math.round(v + amt)));
  const _darker = (c, k) => c.map((v) => Math.round(v * k));

  const VISIT_KEY = "koiPondVisits";
  const RARE_EVERY = 10; 
  const COMPANION_EVERY = 15; 
  const COMPANION_SLOT = 12;
  let _memVisits = 0; 

  const PURPLE = "#a855f7";
  const BLUE = "#3b82f6";
  const ROSE = "#d8446b";

  const COMPANION_KEY = "koiCompanion";
  const COMPANION_BAG_KEY = "koiCompanionBag";
  const COMPANIONS = {
    moonstone: {
      hearts: [PURPLE],
      body: [51, 64, 110],
      hi: [125, 141, 196],
      lo: [27, 35, 64],
      fin: [139, 154, 208],
      glow: "226,236,255",
      fleck: "226,236,255",
      metallic: true,
      flecks: true,
      patches: [
        [-0.4, -0.16, 0.44, [201, 212, 238]],
        [0.7, 0.12, 0.3, [174, 187, 228]],
      ],
    },
    heartspot: {
      hearts: [PURPLE],
      body: [251, 246, 238],
      hi: [255, 253, 248],
      lo: [213, 198, 182],
      fin: [246, 239, 228],
      glow: "255,214,200",
      heart: true,
      patches: [],
    },
    twin: {
      hearts: [BLUE, PURPLE],
      body: [242, 236, 228],
      hi: [255, 253, 249],
      lo: [195, 184, 173],
      fin: [246, 239, 230],
      glow: "198,220,255",
      fleck: "198,220,255",
      pair: true,
      flecks: true,
      patches: [
        [0.15, -0.06, 0.5, [188, 208, 245]],
        [-0.9, 0.08, 0.3, [127, 159, 224]],
      ],
    },
  };
  const TWIN_VIOLET = {
    body: [242, 236, 242],
    hi: [253, 250, 255],
    lo: [194, 180, 198],
    fin: [246, 238, 250],
    glow: "226,198,255",
    fleck: "226,198,255",
    patches: [
      [0.18, -0.06, 0.46, [201, 166, 236]],
      [-0.85, 0.08, 0.26, [155, 110, 224]],
    ],
  };

  function _companionKind(opts) {
    if (typeof opts.__companion === "string" && COMPANIONS[opts.__companion])
      return opts.__companion;
    try {
      const saved = localStorage.getItem(COMPANION_KEY);
      if (saved && COMPANIONS[saved]) return saved;
    } catch (e) {}
    const keys = Object.keys(COMPANIONS);
    let bag = null;
    try {
      bag = JSON.parse(localStorage.getItem(COMPANION_BAG_KEY) || "null");
    } catch (e) {}
    if (Array.isArray(bag)) bag = bag.filter((k) => COMPANIONS[k]);
    if (!Array.isArray(bag) || !bag.length) {
      bag = keys.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = bag[i];
        bag[i] = bag[j];
        bag[j] = tmp;
      }
    }
    const kind = bag.pop();
    try {
      localStorage.setItem(COMPANION_BAG_KEY, JSON.stringify(bag));
    } catch (e) {}
    return kind;
  }

  function _activeCanvas() {
    if (typeof ThemeScenes.isActiveCanvas !== "function") return null;
    for (const c of document.querySelectorAll("canvas"))
      if (ThemeScenes.isActiveCanvas(c)) return c;
    return null;
  }
  const _pageCanvas = () => {
    const c = _activeCanvas();
    return c && c.id === "bgCanvas" ? c : null;
  };

  function _visitFor() {
    if (!_pageCanvas()) return 0;
    try {
      const now = Date.now();
      const raw = JSON.parse(localStorage.getItem(VISIT_KEY) || "{}");
      const n = Number(raw.n) || 0;
      const t = Number(raw.t) || 0;
      if (now - t > 2000) {
        const next = n + 1;
        localStorage.setItem(VISIT_KEY, JSON.stringify({ n: next, t: now }));
        return next;
      }
      return n; 
    } catch (e) {
      _memVisits += 1;
      return _memVisits;
    }
  }
  function _rareDue(opts, visit) {
    if (typeof opts.__rare === "boolean") return opts.__rare;
    return visit > 0 && visit % RARE_EVERY === 0;
  }
  function _companionDue(opts, visit) {
    if (typeof opts.__companion === "boolean") return opts.__companion;
    if (typeof opts.__companion === "string") return !!COMPANIONS[opts.__companion];
    return visit > 0 && visit % COMPANION_EVERY === COMPANION_SLOT;
  }

  function _hitsFish(f, px, py) {
    const dx = px - f.x;
    const dy = py - f.y;
    const c = Math.cos(-f.head);
    const s = Math.sin(-f.head);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    return Math.abs(lx) < f.s * 2.7 && Math.abs(ly) < f.s * 1.6;
  }

  function _bindTaps(state, w, h) {
    const handler = (e) => {
      const list = state.specials;
      if (!list || !list.length) return;
      const c = state._cv || _activeCanvas();
      if (!c) return;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = ((e.clientX - r.left) / r.width) * w;
      const py = ((e.clientY - r.top) / r.height) * h;
      let f = null;
      let best = Infinity;
      for (const cand of list) {
        if (!_hitsFish(cand, px, py)) continue;
        const d = (cand.x - px) * (cand.x - px) + (cand.y - py) * (cand.y - py);
        if (d < best) {
          best = d;
          f = cand;
        }
      }
      if (!f) return;
      f.taps = f.tapT > 0 ? f.taps + 1 : 1;
      f.tapT = 3.2;
      state.rings.push({
        x: px,
        y: py,
        r: f.s * 0.7,
        life: 0,
        max: 1.4,
        sp: f.s * 2.6,
      });
      if (f.gold) {
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2;
          const sp = f.s * (0.6 + Math.random() * 1.4);
          state.motes.push({
            x: f.x,
            y: f.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp * 0.7,
            r: Math.max(0.7, f.s * 0.05 * (0.6 + Math.random())),
            life: 0,
            max: 0.9 + Math.random() * 0.8,
          });
        }
        return;
      }
      if (f.taps >= 3) {
        f.taps = 0;
        state.note = { fish: f.lead || f, t: 0, dur: 4.6 };
      }
    };
    state._onTap = handler;
    document.addEventListener("pointerdown", handler);
  }  
  function _heartPath(ctx, x, y, s) {
    ctx.moveTo(x, y + s * 0.86);
    ctx.bezierCurveTo(x - s * 1.28, y - s * 0.04, x - s * 0.7, y - s * 1.06, x, y - s * 0.34);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.06, x + s * 1.28, y - s * 0.04, x, y + s * 0.86);
    ctx.closePath();
  }
  function _heart(ctx, x, y, s) {
    ctx.beginPath();
    _heartPath(ctx, x, y, s);
    ctx.fill();
  }
  function _markingPath(ctx, p, s, grow) {
    if (p.shape === "heart") {
      _heartPath(ctx, p.fx * s, p.fy * s + grow * s, (p.size + grow) * s);
      return;
    }
    for (const part of p.parts) {
      ctx.ellipse(
        (p.fx + part.dx) * s,
        (p.fy + part.dy) * s + grow * s,
        (part.rx + grow) * s,
        (part.ry + grow) * s,
        part.rot,
        0,
        Math.PI * 2,
      );
    }
  }

  function _drawNote(ctx, w, h, state, dt) {
    const note = state.note;
    if (!note) return;
    note.t += dt;
    const f = note.fish;
    const life = note.t / note.dur;
    if (life >= 1) {
      state.note = null;
      return;
    }
    const a = life < 0.08 ? life / 0.08 : life > 0.78 ? (1 - life) / 0.22 : 1;
    const rise = life > 0.78 ? (life - 0.78) * 26 : 0;
    const fs = Math.max(12, Math.min(17, f.s * 0.62));
    const label = f.noteText || "";
    const hearts = f.hearts && f.hearts.length ? f.hearts : [ROSE];
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.font = `600 ${fs}px ui-rounded, "Segoe UI", system-ui, -apple-system, sans-serif`;
    if (ctx.textBaseline !== undefined) ctx.textBaseline = "middle";
    const padX = fs * 0.9;
    const heartS = fs * 0.62;
    const heartGap = heartS * 2.3;
    const tw = label ? ctx.measureText(label).width : 0;
    const gap = label ? fs * 0.5 : 0;
    const bw = tw + gap + hearts.length * heartGap + padX * 2;
    const bh = fs * 2.15;
    const bx = Math.max(8, Math.min(w - bw - 8, f.x - bw / 2));
    const by = Math.max(8, Math.min(h - bh - 8, f.y - f.s * 2.9 - bh - rise));
    ctx.fillStyle = "rgba(252,246,233,0.97)";
    ctx.strokeStyle = "rgba(214,164,96,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(bx, by, bw, bh, bh * 0.42)
      : ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + bw / 2 - fs * 0.45, by + bh - 1);
    ctx.lineTo(bx + bw / 2, by + bh + fs * 0.55);
    ctx.lineTo(bx + bw / 2 + fs * 0.45, by + bh - 1);
    ctx.closePath();
    ctx.fillStyle = "rgba(252,246,233,0.97)";
    ctx.fill();
    let cx = bx + padX;
    if (label) {
      ctx.fillStyle = "#3a2a1b";
      ctx.fillText(label, cx, by + bh / 2 + 0.5);
      cx += tw + gap;
    }
    for (const col of hearts) {
      ctx.fillStyle = col;
      _heart(ctx, cx + heartGap / 2, by + bh / 2 + heartS * 0.12, heartS);
      cx += heartGap;
    }
    ctx.restore();
  }

  const KOI_TOP = [
    [2.1, 0],
    [1.62, -0.46],
    [0.85, -0.72],
    [0.0, -0.74],
    [-0.9, -0.55],
    [-1.5, -0.2],
  ];
  function _koiBody(ctx, s) {
    const up = KOI_TOP.map(([x, y]) => [x * s, y * s]);
    const dn = up.slice(1, -1).reverse().map(([x, y]) => [x, -y]);
    const ring = [...up, ...dn];
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length - 1; i++) {
      ctx.quadraticCurveTo(ring[i][0], ring[i][1], ...mid(ring[i], ring[i + 1]));
    }
    ctx.quadraticCurveTo(ring[ring.length - 1][0], ring[ring.length - 1][1], ...mid(ring[ring.length - 1], ring[0]));
    ctx.closePath();
  }
  function _koiTail(ctx, s, sw) {
    ctx.moveTo(-1.66 * s, 0);
    ctx.quadraticCurveTo(-2.15 * s, -0.55 * s - sw, -3.05 * s, -0.62 * s - sw * 0.7);
    ctx.quadraticCurveTo(-2.6 * s, -0.1 * s - sw * 0.45, -2.55 * s, sw * 0.28);
    ctx.quadraticCurveTo(-2.6 * s, 0.1 * s + sw * 0.45, -3.05 * s, 0.62 * s + sw * 0.7);
    ctx.quadraticCurveTo(-2.15 * s, 0.55 * s + sw, -1.66 * s, 0);
    ctx.closePath();
  }

  ThemeScenes.register("koi", {
    label: "Koi Pond",
    defaults: { density: 5, speed: 1, color: "#f97316" },
    presetBgColors: ["#0f172a", "#020617", "#000000", "#0a1a0a", "#0a1a1a", "#0d1117"],
    options: [
      { key: "density", label: "Fish", type: "range", min: 2, max: 15, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
    ],
    __debug: {
      rareDue: (opts) => _rareDue(opts || {}, _visitFor()),
      companionDue: (opts) => _companionDue(opts || {}, _visitFor()),
      companions: () => Object.keys(COMPANIONS),
      companionKind: (opts) => _companionKind(opts || {}),
      rarity: () => ({
        goldEvery: RARE_EVERY,
        companionEvery: COMPANION_EVERY,
        companionSlot: COMPANION_SLOT,
      }),
      rareDueAt: (v) => _rareDue({}, v),
      companionDueAt: (v) => _companionDue({}, v),
      hearts: () =>
        Object.fromEntries(
          Object.entries(COMPANIONS).map(([k, d]) => [k, d.hearts.slice()]),
        ),
    },
    init(state, w, h, opts) {
      state.t = 0;
      if (typeof state._onTap === "function")
        document.removeEventListener("pointerdown", state._onTap);
      state._onTap = null;
      state.note = null;
      const scl = h / 800; 
      const count = Math.round(opts.density ?? 5);
      const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

      const opt = _hexToRgb(opts.color || "#f97316");
      const optHue = _hueOf(opt);
      const optSat = _satOf(opt);
      const redHue = optSat < 0.2 ? 8 : _mixHue(8, optHue, 0.45);
      const RED = _hsl(redHue, 0.85, 0.5);
      const RED_DEEP = _hsl(redHue, 0.88, 0.37);
      const RED_LIGHT = _hsl(redHue, 0.78, 0.62);
      const SHIRO = [252, 249, 242];
      const SHIRO_FIN = [248, 243, 233];
      const SUMI = [27, 28, 36];
      const PEARL = [231, 233, 239];
      const AMBER = [186, 94, 34];
      const AMBER_DEEP = [140, 66, 22];
      const BRASS = [176, 132, 64];
      const SILVER = [201, 208, 217];
      const PLAT = _hsl(optHue, Math.min(0.3, 0.1 + optSat * 0.4), 0.84);

      const patch = (fx, fy, size, col, round = false, shape = null) => {
        if (shape === "heart")
          return { fx, fy, size, parts: [], col, edge: _darker(col, 0.7), shape };
        const parts = [
          round
            ? { dx: 0, dy: 0, rx: size, ry: size, rot: 0 }
            : { dx: 0, dy: 0, rx: size * 1.3, ry: size * 0.86, rot: 0 },
        ];
        const n = round ? 0 : 1 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) {
          parts.push({
            dx: (Math.random() - 0.5) * size * 1.5,
            dy: (Math.random() - 0.5) * size * 0.9,
            rx: size * (0.5 + Math.random() * 0.5),
            ry: size * (0.36 + Math.random() * 0.36),
            rot: (Math.random() - 0.5) * 0.4,
          });
        }
        return { fx, fy, parts, col, edge: _darker(col, 0.74) };
      };

      const VARIETIES = [
        "kohaku",
        "kohaku",
        "sanke",
        "showa",
        "tancho",
        "amber",
        "amber",
        "ogon",
      ];
      const deck = [];
      while (deck.length < count) {
        const cycle = VARIETIES.slice();
        for (let i = cycle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = cycle[i];
          cycle[i] = cycle[j];
          cycle[j] = tmp;
        }
        for (let i = 0; i < cycle.length && deck.length < count; i++) deck.push(cycle[i]);
      }

      state.fish = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const far = roll < 0.42;
        const s = (far ? 6.5 + Math.random() * 5 : 12 + Math.random() * 10) * scl;
        const yMin = far ? h * 0.12 : h * 0.5;
        const yMax = far ? h * 0.58 : h * 0.92;
        const y = yMin + Math.random() * (yMax - yMin);
        const variety = deck[i];
        let body, patches = [], fin = SHIRO_FIN, metallic = false;
        if (variety === "kohaku") {
          body = SHIRO;
          fin = SHIRO_FIN;
          const nR = 2 + Math.floor(Math.random() * 3);
          for (let k = 0; k < nR; k++)
            patches.push(
              patch(
                rnd(-1.15, 1.05),
                rnd(-0.38, 0.38),
                rnd(0.44, 0.98),
                k === 0 ? RED : k === 1 ? RED_DEEP : RED_LIGHT,
              ),
            );
          if (Math.random() < 0.3) patches.push(patch(1.74, 0, 0.19, RED, true));
        } else if (variety === "sanke") {
          body = SHIRO;
          fin = SHIRO_FIN;
          const nR = 2 + (Math.random() < 0.5 ? 1 : 0);
          for (let k = 0; k < nR; k++)
            patches.push(
              patch(
                rnd(-1.05, 1.0),
                rnd(-0.36, 0.36),
                rnd(0.42, 0.92),
                k === 0 ? RED : k === 1 ? RED_LIGHT : RED_DEEP,
              ),
            );
          const nB = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < nB; k++)
            patches.push(
              patch(rnd(-1.2, 0.85), rnd(-0.44, 0.44), rnd(0.13, 0.27), SUMI),
            );
        } else if (variety === "showa") {
          body = SUMI;
          fin = PEARL;
          const nR = 1 + (Math.random() < 0.5 ? 1 : 0);
          for (let k = 0; k < nR; k++)
            patches.push(
              patch(
                rnd(-0.85, 1.0),
                rnd(-0.4, 0.4),
                rnd(0.42, 0.82),
                Math.random() < 0.5 ? RED_DEEP : RED,
              ),
            );
          const nW = 1 + (Math.random() < 0.5 ? 1 : 0);
          for (let k = 0; k < nW; k++)
            patches.push(
              patch(
                rnd(-0.75, 0.9),
                rnd(-0.38, 0.38),
                rnd(0.32, 0.62),
                Math.random() < 0.65 ? SHIRO : PEARL,
              ),
            );
        } else if (variety === "tancho") {
          body = SHIRO;
          fin = SHIRO_FIN;
          patches.push(patch(rnd(1.04, 1.14), 0, rnd(0.56, 0.66), RED, true));
        } else if (variety === "amber") {
          body = AMBER;
          fin = SHIRO_FIN;
        } else {
          metallic = true;
          const tone = [SILVER, PLAT, BRASS][Math.floor(Math.random() * 3)];
          body = tone;
          fin = tone;
        }
        const lum = 0.2126 * body[0] + 0.7152 * body[1] + 0.0722 * body[2];
        const lightBody = lum > 115;
        const bodyHi = _lighter(body, lightBody ? 6 : 58);
        const bodyLo = _darker(body, lightBody ? 0.82 : 0.6);
        state.fish.push({
          far,
          x: w * (0.1 + Math.random() * 0.8),
          y,
          yMin,
          yMax,
          head: Math.random() * Math.PI * 2,
          sp: (far ? 9 + Math.random() * 10 : 16 + Math.random() * 16) * scl,
          baseSp: (far ? 9 + Math.random() * 10 : 16 + Math.random() * 16) * scl,
          s,
          variety,
          body,
          bodyHi,
          bodyLo,
          patches,
          fin,
          finHi: _lighter(fin, 30),
          metallic,
          tailPh: Math.random() * Math.PI * 2,
          tailSp: 5.5 + Math.random() * 3,
          tx: w * (0.1 + Math.random() * 0.8),
          ty: yMin + Math.random() * (yMax - yMin),
          turnT: 1 + Math.random() * 3,
          bob: Math.random() * Math.PI * 2,
          hx: 0,
          hy: 0,
          roam: 0,
        });
      }

      for (const tier of [true, false]) {
        const group = state.fish.filter((f) => f.far === tier);
        if (!group.length) continue;
        const n = group.length;
        const cols = Math.max(1, Math.round(Math.sqrt(n * (w / Math.max(1, h)))));
        const rows = Math.ceil(n / cols);
        const bandTop = tier ? h * 0.12 : h * 0.5;
        const bandBot = tier ? h * 0.58 : h * 0.92;
        const cellW = w / cols;
        const cellH = (bandBot - bandTop) / rows;
        const cells = [];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) cells.push([c, r]);
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = cells[i];
          cells[i] = cells[j];
          cells[j] = tmp;
        }
        group.forEach((f, i) => {
          const [c, r] = cells[i % cells.length];
          f.hx = cellW * (c + 0.5) + (Math.random() - 0.5) * cellW * 0.34;
          f.hy = bandTop + cellH * (r + 0.5) + (Math.random() - 0.5) * cellH * 0.34;
          f.roam = Math.max(cellW, cellH) * (0.55 + Math.random() * 0.35) + f.s * 2;
          f.x = Math.max(f.s * 3, Math.min(w - f.s * 3, f.hx + (Math.random() - 0.5) * f.roam));
          f.y = Math.max(f.yMin, Math.min(f.yMax, f.hy + (Math.random() - 0.5) * f.roam * 0.6));
          f.tx = f.hx;
          f.ty = f.hy;
        });
      }

      state.rare = null;
      state.companion = null;
      state.specials = [];
      state.note = null;
      state.motes = [];
      const visit = _visitFor();
      const stockMax = state.fish.reduce((m, f) => Math.max(m, f.s), 0);

      const specialFish = (extra) => {
        const sx = w * (0.28 + Math.random() * 0.44);
        const sy = h * (0.58 + Math.random() * 0.22);
        return {
        far: false,
        x: sx,
        y: sy,
        hx: sx,
        hy: sy,
        roam: Math.min(w, h) * 0.2,
        yMin: h * 0.5,
        yMax: h * 0.93,
        head: Math.random() * Math.PI * 2,
        sp: 14 * scl,
        baseSp: 14 * scl,
        s: (19 + Math.random() * 5) * scl,
        body: [200, 200, 200],
        bodyHi: [220, 220, 220],
        bodyLo: [140, 140, 140],
        patches: [],
        fin: [200, 200, 200],
        finHi: [220, 220, 220],
        tailPh: Math.random() * Math.PI * 2,
        tailSp: 4.4,
        tx: w * 0.5,
        ty: h * 0.7,
        turnT: 2 + Math.random() * 3,
        bob: Math.random() * Math.PI * 2,
        special: true,
        taps: 0,
        tapT: 0,
        ...extra,
        };
      };

      const heartMark = (fx, fy, size, col) =>
        patch(fx, fy, size, col, false, "heart");

      if (_rareDue(opts, visit)) {
        const body = _hsl(43, 0.86, 0.56);
        const fin = _hsl(45, 0.9, 0.66);
        const spots = [];
        for (let k = 0; k < 2; k++)
          spots.push(
            patch(
              rnd(-0.7, 0.7),
              rnd(-0.3, 0.3),
              rnd(0.3, 0.55),
              _hsl(48, 0.95, 0.78),
            ),
          );
        state.rare = specialFish({
          variety: "golden",
          body,
          bodyHi: _hsl(46, 0.98, 0.74),
          bodyLo: _hsl(34, 0.8, 0.34),
          patches: spots,
          fin,
          finHi: _hsl(48, 0.95, 0.8),
          metallic: true,
          rare: true,
          gold: true, 
          glow: "255,214,120",
          s: Math.max(21 * scl, stockMax + 3 * scl),
          y: h * (0.6 + Math.random() * 0.22),
          yMin: h * 0.52,
          yMax: h * 0.92,
        });
        state.fish.push(state.rare);
        state.specials.push(state.rare);
      }

      if (_companionDue(opts, visit)) {
        const kind = _companionKind(opts);
        const d = COMPANIONS[kind];
        const marks = d.patches.map(([fx, fy, size, col]) => patch(fx, fy, size, col));
        if (d.heart) marks.push(heartMark(0.0, -0.04, 0.56, _hsl(4, 0.8, 0.46)));
        const c1 = specialFish({
          variety: "companion",
          companion: kind,
          body: d.body,
          bodyHi: d.hi,
          bodyLo: d.lo,
          patches: marks,
          fin: d.fin,
          finHi: _lighter(d.fin, 22),
          metallic: !!d.metallic,
          flecks: !!d.flecks,
          fleck: d.fleck || "226,236,255",
          glow: d.glow,
          hearts: d.hearts,
          s: Math.max(20 * scl, stockMax + 1.5 * scl),
        });
        state.companion = c1;
        state.fish.push(c1);
        state.specials.push(c1);
        if (d.pair) {
          const c2 = specialFish({
            variety: "companion",
            companion: kind,
            paired: true,
            body: TWIN_VIOLET.body,
            bodyHi: TWIN_VIOLET.hi,
            bodyLo: TWIN_VIOLET.lo,
            patches: TWIN_VIOLET.patches.map(([fx, fy, size, col]) =>
              patch(fx, fy, size, col),
            ),
            fin: TWIN_VIOLET.fin,
            finHi: _lighter(TWIN_VIOLET.fin, 18),
            flecks: true,
            fleck: TWIN_VIOLET.fleck,
            glow: TWIN_VIOLET.glow,
            hearts: d.hearts,
            s: (18 + Math.random() * 3) * scl,
            lead: c1,
          });
          c2.x = c1.x - c1.s * 3.4;
          c2.y = Math.min(c1.yMax, c1.y + c1.s * 1.5);
          c2.yMin = c1.yMin;
          c2.yMax = c1.yMax;
          state.fish.push(c2);
          state.specials.push(c2);
        }
      }
      if (state.specials.length) _bindTaps(state, w, h);

      state.pads = [];
      for (let i = 0; i < 5; i++) {
        state.pads.push({
          x: w * (0.08 + Math.random() * 0.84),
          y: h * (0.12 + Math.random() * 0.76),
          r: (12 + Math.random() * 13) * scl,
          rot: Math.random() * Math.PI * 2,
          ph: Math.random() * Math.PI * 2,
          a: 0.55 + Math.random() * 0.2,
          notch: 0.9 + Math.random() * 0.7, 
        });
      }

      state.rings = [];
      state.ringT = 0.5 + Math.random() * 2;
    },

    draw(ctx, w, h, state, opts, dt) {
      state._cv = ctx.canvas || state._cv; 
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed; 
      const dtm = dt * speed; 
      const scl = h / 800;

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const wat = ctx.createLinearGradient(0, 0, 0, h);
        wat.addColorStop(0, "#03080f");
        wat.addColorStop(0.38, "#071820");
        wat.addColorStop(0.72, "#092830");
        wat.addColorStop(1, "#0a3335");
        ctx.fillStyle = wat;
        ctx.fillRect(0, 0, w, h);
      }
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, "rgba(20,78,100,0.22)");
      veil.addColorStop(0.5, "rgba(22,96,112,0.17)");
      veil.addColorStop(1, "rgba(26,110,116,0.12)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.5, -h * 0.12, 10, w * 0.5, -h * 0.12, h * 0.95);
      glow.addColorStop(0, "rgba(150,205,235,0.1)");
      glow.addColorStop(0.5, "rgba(120,170,215,0.035)");
      glow.addColorStop(1, "rgba(120,170,215,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      const shX = w * 0.52;
      const sheen = ctx.createLinearGradient(shX - w * 0.1, 0, shX + w * 0.1, 0);
      sheen.addColorStop(0, "rgba(190,225,255,0)");
      sheen.addColorStop(0.5, "rgba(190,225,255,0.05)");
      sheen.addColorStop(1, "rgba(190,225,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(shX - w * 0.12, 0, w * 0.24, h * 0.6);
      const sheen2 = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sheen2.addColorStop(0, "rgba(210,235,255,0.05)");
      sheen2.addColorStop(1, "rgba(210,235,255,0)");
      ctx.fillStyle = sheen2;
      ctx.fillRect(shX - w * 0.06, 0, w * 0.12, h * 0.6);
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const f = i / 9;
        const gy = h * (0.07 + f * 0.5);
        const gx = shX + Math.sin(t * (0.35 + f * 0.5) + i * 1.9) * w * (0.06 + f * 0.16);
        const l = w * (0.035 + f * 0.04);
        const a = 0.045 * (0.55 + 0.45 * Math.sin(t * 0.8 + i * 2.4));
        ctx.strokeStyle = `rgba(205,235,255,${a.toFixed(3)})`;
        ctx.lineWidth = 1.4 + f * 1.2;
        ctx.beginPath();
        ctx.moveTo(gx - l, gy + 2);
        ctx.quadraticCurveTo(gx, gy - 2, gx + l, gy + 2);
        ctx.stroke();
      }
      ctx.restore();

      for (const p of state.pads) {
        const bob = 1 + 0.025 * Math.sin(t * 0.9 + p.ph);
        const r = p.r * bob;
        const wob = Math.sin(t * 0.35 + p.ph * 1.3) * 0.12;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + wob * 0.2);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.ellipse(r * 0.12, r * 0.5, r * 1.04, r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        const a0 = p.notch * 0.4; 
        const a1 = Math.PI * 2 - p.notch * 0.6;
        const leaf = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.12);
        leaf.addColorStop(0, "#1d5a41");
        leaf.addColorStop(0.7, "#123a2c");
        leaf.addColorStop(1, "#0d2b22");
        ctx.fillStyle = leaf;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx.arc(0, 0, r, a0, a1);
        ctx.closePath(); 
        ctx.fill();
        ctx.strokeStyle = "rgba(160,220,190,0.3)";
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.94, a0 + 0.4, a1 - 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      const drawFish = (f) => {
        const s = f.s;
        const headA = f.head;
        const alpha = f.far ? 0.88 : 0.97;
        if (f.special) {
          const tint = f.glow || "255,214,120";
          const g = ctx.createRadialGradient(f.x, f.y, s * 0.3, f.x, f.y, s * 3.6);
          g.addColorStop(0, `rgba(${tint},0.16)`);
          g.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(f.x, f.y, s * 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(f.x + Math.sin(headA) * s * 0.6, f.y + s * 0.9, s * 1.7, s * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.ellipse(f.x + Math.sin(headA) * s * 1.2, f.y + s * 1.7, s * 2.2, s * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(headA + Math.sin(f.tailPh) * 0.06);
        const sw = Math.sin(f.tailPh) * s * 0.5; 
        ctx.globalAlpha = alpha * (f.far ? 0.62 : 0.82);
        ctx.fillStyle = `rgba(${f.finHi[0]},${f.finHi[1]},${f.finHi[2]},0.9)`;
        ctx.beginPath();
        _koiTail(ctx, s, sw);
        ctx.fill();
        ctx.strokeStyle = `rgba(${f.fin[0]},${f.fin[1]},${f.fin[2]},0.55)`;
        ctx.lineWidth = Math.max(0.4, s * 0.035);
        for (let r = -1; r <= 1; r++) {
          ctx.beginPath();
          ctx.moveTo(-1.75 * s, r * s * 0.14);
          ctx.quadraticCurveTo(-2.35 * s, r * s * 0.34 - sw * 0.4, -2.95 * s, r * s * 0.5 - sw * 0.6);
          ctx.stroke();
        }
        ctx.globalAlpha = alpha * 0.5;
        const finSw = Math.sin(f.tailPh * 0.7) * 0.3;
        ctx.fillStyle = `rgba(${f.fin[0]},${f.fin[1]},${f.fin[2]},1)`;
        ctx.beginPath();
        ctx.ellipse(s * 0.5, -s * 0.8, s * 0.52, s * 0.2, -0.55 + finSw, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s * 0.5, s * 0.8, s * 0.52, s * 0.2, 0.55 - finSw, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        const bg = ctx.createLinearGradient(0, -s * 0.78, 0, s * 0.78);
        bg.addColorStop(0, `rgb(${f.bodyLo[0]},${f.bodyLo[1]},${f.bodyLo[2]})`);
        bg.addColorStop(0.34, `rgb(${f.bodyHi[0]},${f.bodyHi[1]},${f.bodyHi[2]})`);
        bg.addColorStop(0.62, `rgb(${f.body[0]},${f.body[1]},${f.body[2]})`);
        bg.addColorStop(1, `rgb(${f.bodyLo[0]},${f.bodyLo[1]},${f.bodyLo[2]})`);
        ctx.fillStyle = bg;
        ctx.beginPath();
        _koiBody(ctx, s);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        _koiBody(ctx, s);
        ctx.clip();
        for (const p of f.patches) {
          ctx.fillStyle = `rgba(${p.edge[0]},${p.edge[1]},${p.edge[2]},0.55)`;
          ctx.beginPath();
          _markingPath(ctx, p, s, 0.055);
          ctx.fill();
          ctx.fillStyle = `rgb(${p.col[0]},${p.col[1]},${p.col[2]})`;
          ctx.beginPath();
          _markingPath(ctx, p, s, 0);
          ctx.fill();
        }
        const sheenA = f.metallic ? 0.34 : 0.14;
        const shine = ctx.createLinearGradient(0, -s * 0.74, 0, s * 0.1);
        shine.addColorStop(0, `rgba(255,255,255,${sheenA})`);
        shine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(-s * 2.3, -s * 0.8, s * 4.6, s * 0.9);
        if (f.gold) {
          const ph = (Math.sin(t * 0.85) + 1) / 2; 
          const gx = (-1.1 + ph * 2.2) * s;
          const spec = ctx.createLinearGradient(gx - s * 0.7, 0, gx + s * 0.7, 0);
          spec.addColorStop(0, "rgba(255,250,225,0)");
          spec.addColorStop(0.5, "rgba(255,252,232,0.5)");
          spec.addColorStop(1, "rgba(255,250,225,0)");
          ctx.fillStyle = spec;
          ctx.fillRect(-s * 2.3, -s * 0.8, s * 4.6, s * 1.6);
        }
        if (f.flecks) {
          const tint = f.fleck || "226,236,255";
          for (let i = 0; i < 14; i++) {
            const fx = (-1.5 + ((i * 0.37) % 3)) * s;
            const fy = (-0.5 + ((i * 0.61) % 1)) * s;
            const a = 0.2 + 0.5 * Math.abs(Math.sin(t * 2.2 + i));
            ctx.fillStyle = `rgba(${tint},${a.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(fx, fy, Math.max(0.5, s * 0.035), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        ctx.strokeStyle = `rgba(2,10,14,${f.far ? 0.28 : 0.4})`;
        ctx.lineWidth = Math.max(0.8, s * 0.075);
        ctx.beginPath();
        _koiBody(ctx, s);
        ctx.stroke();
        ctx.strokeStyle = `rgba(178,226,255,${f.far ? 0.16 : 0.3})`;
        ctx.lineWidth = Math.max(0.6, s * 0.045);
        ctx.beginPath();
        _koiBody(ctx, s);
        ctx.stroke();
        if (s > 5.5) {
          const er = Math.max(0.7, s * 0.062);
          for (const ey of [-0.34, 0.34]) {
            ctx.fillStyle = "rgba(10,10,14,0.78)";
            ctx.beginPath();
            ctx.arc(s * 1.44, s * ey, er, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.arc(s * 1.44 + er * 0.35, s * ey - er * 0.35, er * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      };

      for (const f of state.fish) if (f.far) drawFish(f);
      for (const f of state.fish) if (!f.far) drawFish(f);

      const SEP_W = 2.2, ALI_W = 0.6, COH_W = 0.13, HOME_W = 0.9, EDGE_W = 2.4;
      for (const f of state.fish) {
        if (f.lead) {
          const lead = f.lead;
          f.tx = lead.x - Math.cos(lead.head) * lead.s * 3.2;
          f.ty = Math.max(f.yMin, Math.min(f.yMax, lead.y + lead.s * 1.6));
          const want = Math.atan2(f.ty - f.y, f.tx - f.x);
          let turn = _wrap(want - f.head);
          const maxTurn = 2.6 * dtm;
          if (turn > maxTurn) turn = maxTurn;
          else if (turn < -maxTurn) turn = -maxTurn;
          f.head += turn;
          const gap = Math.hypot(f.tx - f.x, f.ty - f.y);
          const wantSp = Math.min(lead.sp * 2.4, Math.max(lead.sp * 0.55, gap * 3));
          f.sp += (wantSp - f.sp) * Math.min(1, dtm * 3);
          f.x += Math.cos(f.head) * f.sp * dtm;
          f.y += Math.sin(f.head) * f.sp * dtm;
          if (f.y < f.yMin) f.y = f.yMin;
          if (f.y > f.yMax) f.y = f.yMax;
          f.tailPh += dtm * f.tailSp;
          if (f.tapT > 0) {
            f.tapT -= dtm;
            if (f.tapT <= 0) f.taps = 0;
          }
          continue;
        }

        f.turnT -= dtm;
        const dxT = f.tx - f.x;
        const dyT = f.ty - f.y;
        if (f.turnT <= 0 || dxT * dxT + dyT * dyT < Math.pow(f.s * 4, 2)) {
          const a = Math.random() * Math.PI * 2;
          const rr = f.roam * (0.3 + Math.random() * 0.7);
          f.tx = Math.max(f.s * 2, Math.min(w - f.s * 2, f.hx + Math.cos(a) * rr));
          f.ty = Math.max(f.yMin, Math.min(f.yMax, f.hy + Math.sin(a) * rr * 0.7));
          f.turnT = 2.5 + Math.random() * 4.5;
        }

        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, nAli = 0;
        for (const o of state.fish) {
          if (o === f) continue;
          let dx = f.x - o.x;
          let dy = f.y - o.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1e-4) {
            const ang = Math.random() * Math.PI * 2;
            dx = Math.cos(ang);
            dy = Math.sin(ang);
            d2 = 1;
          }
          const d = Math.sqrt(d2);
          const sepR = (f.s + o.s) * 2.1;
          if (d < sepR) {
            const wgt = 1 - d / sepR;
            sepX += (dx / d) * wgt * wgt * 2;
            sepY += (dy / d) * wgt * wgt * 2;
          }
          const aliR = f.s * 13;
          if (o.far === f.far && d < aliR) {
            aliX += Math.cos(o.head);
            aliY += Math.sin(o.head);
            cohX += o.x;
            cohY += o.y;
            nAli++;
          }
        }

        const hdx = f.tx - f.x;
        const hdy = f.ty - f.y;
        const hl = Math.hypot(hdx, hdy) || 1;
        let vx = (hdx / hl) * HOME_W;
        let vy = (hdy / hl) * HOME_W;
        vx += sepX * SEP_W;
        vy += sepY * SEP_W;
        if (nAli) {
          const al = Math.hypot(aliX, aliY);
          if (al > 0.001) {
            const k = ALI_W * Math.min(1, nAli / 2);
            vx += (aliX / al) * k;
            vy += (aliY / al) * k;
          }
          const cx = cohX / nAli - f.x;
          const cy = cohY / nAli - f.y;
          const cl = Math.hypot(cx, cy) || 1;
          if (cl > f.s * 5) {
            vx += (cx / cl) * COH_W;
            vy += (cy / cl) * COH_W;
          }
        }
        const mx = f.s * 3.2;
        if (f.x < mx) vx += ((mx - f.x) / mx) * EDGE_W;
        else if (f.x > w - mx) vx -= ((f.x - (w - mx)) / mx) * EDGE_W;
        const my = Math.min(f.s * 2.4, (f.yMax - f.yMin) * 0.3);
        if (f.y < f.yMin + my) vy += ((f.yMin + my - f.y) / my) * EDGE_W;
        else if (f.y > f.yMax - my) vy -= ((f.y - (f.yMax - my)) / my) * EDGE_W;

        const want = Math.atan2(vy, vx);
        const urgency = Math.min(1, Math.hypot(sepX, sepY));
        const rate = (f.far ? 0.9 : 1.2) * (1 + 0.4 * urgency);
        const maxTurn = rate * dtm;
        let turn = _wrap(want - f.head);
        if (turn > maxTurn) turn = maxTurn;
        else if (turn < -maxTurn) turn = -maxTurn;
        f.head += turn;
        const targetSp = f.baseSp * (1 - 0.3 * Math.min(1, Math.abs(turn) / (maxTurn || 1)));
        f.sp += (targetSp - f.sp) * Math.min(1, dtm * 1.6);
        f.x += Math.cos(f.head) * f.sp * dtm;
        f.y += Math.sin(f.head) * f.sp * dtm;
        if (f.x < -f.s * 6) {
          f.x = w + f.s * 6;
          f.tx = w * 0.5;
        } else if (f.x > w + f.s * 6) {
          f.x = -f.s * 6;
          f.tx = w * 0.5;
        }
        if (f.y < f.yMin) f.y = f.yMin + 1;
        if (f.y > f.yMax) f.y = f.yMax - 1;
        f.tailPh += dtm * f.tailSp;
        if (f.tapT > 0) {
          f.tapT -= dtm;
          if (f.tapT <= 0) f.taps = 0;
        }
      }

      for (let i = 0; i < state.fish.length; i++) {
        const a = state.fish[i];
        if (a.lead) continue;
        for (let j = i + 1; j < state.fish.length; j++) {
          const b = state.fish[j];
          if (b.lead || a.far !== b.far) continue;
          const min = (a.s + b.s) * 1.5;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 0.001) {
            dx = 1;
            dy = 0;
            d = 1;
          }
          const push = (min - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
      for (const f of state.fish) {
        if (f.y < f.yMin) f.y = f.yMin;
        else if (f.y > f.yMax) f.y = f.yMax;
        if (f.x < -f.s * 6) f.x = -f.s * 6;
        else if (f.x > w + f.s * 6) f.x = w + f.s * 6;
      }

      if (state.motes && state.motes.length) {
        for (let i = state.motes.length - 1; i >= 0; i--) {
          const m = state.motes[i];
          m.life += dtm;
          if (m.life >= m.max) {
            state.motes.splice(i, 1);
            continue;
          }
          m.x += m.vx * dtm;
          m.y += m.vy * dtm;
          m.vx *= 0.96;
          m.vy = m.vy * 0.96 - 9 * scl * dtm;
          const a = 1 - m.life / m.max;
          ctx.fillStyle = `rgba(255,226,140,${(a * 0.85).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * (0.55 + a * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      state.ringT -= dtm;
      if (state.ringT <= 0) {
        state.ringT = 2.2 + Math.random() * 3.5;
        state.rings.push({
          x: w * (0.08 + Math.random() * 0.84),
          y: h * (0.14 + Math.random() * 0.72),
          r: 2,
          life: 0,
          max: 2.6 + Math.random() * 2,
          sp: (10 + Math.random() * 9) * scl,
        });
      }
      for (let i = state.rings.length - 1; i >= 0; i--) {
        const ring = state.rings[i];
        ring.life += dtm;
        ring.r += ring.sp * dtm;
        if (ring.life >= ring.max) { state.rings.splice(i, 1); continue; }
        const a = 0.13 * (1 - ring.life / ring.max);
        ctx.strokeStyle = `rgba(190,230,235,${a.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      const vig = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.34, w / 2, h * 0.48, Math.max(w, h) * 0.78);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      _drawNote(ctx, w, h, state, dt);
    },

    destroy(state) {
      if (state && typeof state._onTap === "function")
        document.removeEventListener("pointerdown", state._onTap);
      if (state) state._onTap = null;
    },
  });
})();
