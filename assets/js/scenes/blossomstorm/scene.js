(() => {
  const { _hexToRgb, _mixHex } = ThemeScenes.__helpers;

  function _toRgb(c) {
    if (typeof c === "string" && c.startsWith("rgb")) {
      const m = c.match(/\d+/g);
      if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    }
    return _hexToRgb(c);
  }
  function _mixC(c1, c2, t) {
    const a = _toRgb(c1), b = _toRgb(c2);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
      a[1] + (b[1] - a[1]) * t,
    )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }
  function _hexA(c, a) {
    const rgb = _toRgb(c);
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }
  function _wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  const SPRITE_SS = 2; 
  const BLOOM_R = [5, 7.5, 10.5, 14];
  const LAYER_TINTS = ["deep", "base", "light"];

  function _blossomSprite(rPx, tint, centre) {
    const c = document.createElement("canvas");
    const d = Math.ceil(rPx * 2 * SPRITE_SS) + 4;
    c.width = d;
    c.height = d;
    const x = c.getContext("2d");
    const TAU = Math.PI * 2;
    x.translate(d / 2, d / 2);
    x.scale(SPRITE_SS, SPRITE_SS);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      const px = Math.cos(a) * rPx * 0.5;
      const py = Math.sin(a) * rPx * 0.5;
      const g = x.createRadialGradient(px, py, rPx * 0.04, px, py, rPx * 0.7);
      g.addColorStop(0, tint);
      g.addColorStop(0.7, tint);
      g.addColorStop(1, _hexA(tint, 0));
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(px, py, rPx * 0.6, rPx * 0.43, a, 0, TAU);
      x.fill();
    }
    const cg = x.createRadialGradient(0, 0, 0, 0, 0, rPx * 0.48);
    cg.addColorStop(0, centre);
    cg.addColorStop(0.5, _hexA(centre, 0.7));
    cg.addColorStop(1, _hexA(centre, 0));
    x.fillStyle = cg;
    x.beginPath();
    x.arc(0, 0, rPx * 0.48, 0, TAU);
    x.fill();
    return c;
  }

  function _makeBlossomSprites(color) {
    const tints = {
      deep: _mixC(color, "#3d1a3f", 0.34),
      base: color,
      light: _mixC(color, "#ffffff", 0.5),
    };
    const centre = _mixC(color, "#fffdf7", 0.74);
    const grid = [];
    for (const name of LAYER_TINTS) {
      const row = [];
      for (const r of BLOOM_R) row.push({ c: _blossomSprite(r, tints[name], centre), r });
      grid.push(row);
    }
    return grid;
  }

  const MASS_R = [50, 80, 115, 155];
  function _makeMassSprites(color) {
    const haze = _mixC(color, "#ffffff", 0.15);
    return MASS_R.map((rPx) => {
      const c = document.createElement("canvas");
      const d = Math.ceil(rPx * 2) + 2;
      c.width = d;
      c.height = d;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, rPx);
      g.addColorStop(0, _hexA(haze, 0.5));
      g.addColorStop(0.42, _hexA(haze, 0.28));
      g.addColorStop(0.74, _hexA(haze, 0.08));
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, d, d);
      return { c, r: rPx };
    });
  }

  function _buildTree(w, h, S) {
    const segs = [];
    const add = (parent, x1, y1, cx, cy, x2, y2, w0, w1, flex) => {
      segs.push({
        parent, x1, y1, cx, cy, x2, y2,
        w0: w0 * h, w1: w1 * h, flex,
        ph: Math.random() * Math.PI * 2,
      });
      return segs.length - 1;
    };

    const TAU = Math.PI * 2;
    const UP = -Math.PI / 2;
    const tips = [];
    const queue = [{
      parent: -1,
      x: w * 0.16, y: h * 1.02,
      ang: UP - 0.13, 
      len: h * 0.3,
      wid: 0.04,
      depth: 0,
      bend: 0.25,
    }];
    const TAPER = 0.72;
    const MAX_DEPTH = 5;
    const SEG_BUDGET = 124;

    while (queue.length) {
      const b = queue.shift();
      const ex = b.x + Math.cos(b.ang) * b.len;
      const ey = b.y + Math.sin(b.ang) * b.len;
      const cx = b.x + Math.cos(b.ang) * b.len * 0.5
        + Math.cos(b.ang + Math.PI / 2) * b.bend * b.len;
      const cy = b.y + Math.sin(b.ang) * b.len * 0.5
        + Math.sin(b.ang + Math.PI / 2) * b.bend * b.len;
      const idx = add(
        b.parent, b.x, b.y, cx, cy, ex, ey,
        b.wid, b.wid * TAPER,
        0.14 + b.depth * 0.2,
      );

      if (
        b.depth >= MAX_DEPTH ||
        b.wid * h < 0.7 ||
        segs.length >= SEG_BUDGET
      ) {
        tips.push({ seg: idx, u: 1 });
        continue;
      }
      const kids = b.depth === 0 ? 3
        : b.depth === 1 ? 2 + (Math.random() < 0.5 ? 1 : 0)
        : 2;
      const spread = b.depth === 0 ? 0.95 : 0.62;
      for (let k = 0; k < kids; k++) {
        const f = kids === 1 ? 0 : k / (kids - 1) - 0.5; 
        let ang = b.ang + f * spread * 2 + (Math.random() - 0.5) * 0.24;
        ang += _wrap(UP - ang) * 0.16;
        queue.push({
          parent: idx,
          x: ex, y: ey,
          ang,
          len: b.len * (0.72 + Math.random() * 0.12),
          wid: b.wid * TAPER,
          depth: b.depth + 1,
          bend: (Math.random() - 0.5) * 0.8,
        });
      }
    }

    const clusters = [];
    const anchors = tips.slice();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.parent < 0) continue;
      const depthish = (s.w1 / h) * 10; 
      if (depthish < 0.06) continue;
      if (Math.random() < 0.95) anchors.push({ seg: i, u: 0.5 + Math.random() * 0.5 });
    }
    for (const an of anchors) {
      const flowers = [];
      const n = 8 + Math.floor(Math.random() * 6); 
      const cr = (26 + Math.random() * 30) * S;
      for (let k = 0; k < n; k++) {
        const ang = Math.random() * TAU;
        const dist = Math.sqrt(Math.random()) * cr; 
        const layer = Math.random() < 0.32 ? 0 : Math.random() < 0.65 ? 1 : 2;
        flowers.push({
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist * 0.85,
          size: Math.floor(Math.random() * BLOOM_R.length),
          f: 0.62 + Math.random() * 0.85, 
          layer,
          alpha: 0.52 + layer * 0.17 + Math.random() * 0.1,
        });
      }
      flowers.sort((a, b) => a.layer - b.layer);
      clusters.push({
        seg: an.seg,
        u: an.u,
        flowers,
        ph: Math.random() * TAU,
      });
    }

    const far = [];
    for (const an of anchors) {
      if (Math.random() > 0.6) continue;
      far.push({
        seg: an.seg,
        u: an.u,
        size: Math.floor(Math.random() * MASS_R.length),
        f: 0.55 + Math.random() * 0.5,
        alpha: 0.6 + Math.random() * 0.35,
        ph: Math.random() * TAU,
      });
    }

    return { segs, clusters, far };
  }

  const LIMB_SAMPLES = 12;
  function _widthAt(s, u) {
    const k = u <= 0.5 ? 0 : (u - 0.5) / 0.5;
    const e = k * k * (3 - 2 * k); 
    return Math.max(1.2, s.w0 + (s.w1 - s.w0) * e);
  }
  function _limbOutline(ctx, s, oBase, oTip, uMax, mul) {
    const x0 = s.x1 + oBase, y0 = s.y1;
    const xc = s.cx + (oBase + oTip) / 2, yc = s.cy;
    const x1 = s.x2 + oTip, y1 = s.y2;
    const n = Math.max(4, Math.round(LIMB_SAMPLES * (uMax || 1)));
    const left = [];
    const right = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * (uMax || 1), mt = 1 - u;
      const px = mt * mt * x0 + 2 * mt * u * xc + u * u * x1;
      const py = mt * mt * y0 + 2 * mt * u * yc + u * u * y1;
      const tx = 2 * (mt * (xc - x0) + u * (x1 - xc));
      const ty = 2 * (mt * (yc - y0) + u * (y1 - yc));
      const len = Math.hypot(tx, ty) || 1;
      let hw = _widthAt(s, u) / 2;
      if (mul) hw *= mul(u);
      const nx = (-ty / len) * hw, ny = (tx / len) * hw;
      left.push([px + nx, py + ny]);
      right.push([px - nx, py - ny]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
    ctx.arc(x1, y1, _widthAt(s, 1) / 2, 0, Math.PI * 2);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
  }

  function _barkTones(color) {
    const bark = _mixC("#241c26", color, 0.1);
    return {
      bark,
      barkDeep: _mixC(bark, "#0b0810", 0.45),
      barkLight: _mixC(bark, "#f4eefc", 0.22),
    };
  }

  function _drawTree(ctx, w, h, state, color) {
    const tree = state.tree;
    if (!tree) return;
    const t = state.t;
    const S = state.S;
    const off = state.treeOff;
    const segs = tree.segs;

    if (state.spriteColor !== color) {
      state.blossoms = _makeBlossomSprites(color);
      state.masses = _makeMassSprites(color);
      state.spriteColor = color;
    }
    const blossoms = state.blossoms;
    const masses = state.masses;

    const g = Math.sin(t * 1.3) * Math.sin(t * 0.3); 
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const own =
        (g * 0.9 + Math.sin(t * 1.35 + s.ph) * 0.2) * s.flex * h * 0.016;
      off[i] = (s.parent < 0 ? 0 : off[s.parent]) + own;
    }

    const { bark, barkDeep, barkLight } = _barkTones(color);
    const plen = (s, u, oA, oB) => {
      const mt = 1 - u;
      return [
        mt * mt * (s.x1 + oA) + 2 * mt * u * (s.cx + (oA + oB) / 2) + u * u * (s.x2 + oB),
        mt * mt * s.y1 + 2 * mt * u * s.cy + u * u * s.y2,
      ];
    };

    for (const f of tree.far) {
      const s = segs[f.seg];
      const [px, py] = plen(s, f.u, s.parent < 0 ? 0 : off[s.parent], off[f.seg]);
      const spr = masses[f.size];
      const wpx = spr.r * 2 * f.f * S;
      const wob = Math.sin(t * 2.2 + f.ph) * 2.2 * S;
      ctx.globalAlpha = f.alpha;
      ctx.drawImage(spr.c, px - wpx / 2, py - wpx / 2 + wob, wpx, wpx);
    }
    ctx.globalAlpha = 1;

    ctx.lineCap = "round";
    ctx.fillStyle = barkDeep;
    const trunk = segs[0];
    if (trunk) {
      const FL = 0.5;
      _limbOutline(ctx, trunk, 0, 0, FL, (u) => {
        const k = Math.min(1, u / FL);
        return 1 + 1.6 * (1 - k * k * (3 - 2 * k));
      });
      ctx.fill();
    }
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      _limbOutline(ctx, s, s.parent < 0 ? 0 : off[s.parent], off[i]);
      ctx.fill();
    }
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const oBase = s.parent < 0 ? 0 : off[s.parent];
      const oTip = off[i];
      ctx.globalAlpha = s.w0 > h * 0.014 ? 0.22 : 0.12;
      ctx.strokeStyle = barkLight;
      ctx.lineWidth = Math.max(0.7, s.w0 * 0.2);
      ctx.beginPath();
      ctx.moveTo(s.x1 + oBase + s.w0 * 0.24, s.y1 - s.w0 * 0.14);
      ctx.quadraticCurveTo(
        s.cx + (oBase + oTip) / 2 + s.w0 * 0.24,
        s.cy - s.w0 * 0.14,
        s.x2 + oTip + s.w1 * 0.22,
        s.y2 - s.w1 * 0.14,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.w0 < h * 0.01) continue;
      const oBase = s.parent < 0 ? 0 : off[s.parent];
      const oTip = off[i];
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = bark;
      ctx.lineWidth = Math.max(1, s.w0 * 0.42);
      ctx.beginPath();
      ctx.moveTo(s.x1 + oBase, s.y1);
      ctx.quadraticCurveTo(s.cx + (oBase + oTip) / 2, s.cy, s.x2 + oTip, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const clusters = tree.clusters;
    for (let ci = 0; ci < clusters.length; ci++) {
      const cl = clusters[ci];
      const s = segs[cl.seg];
      const [px, py] = plen(s, cl.u, s.parent < 0 ? 0 : off[s.parent], off[cl.seg]);
      const wob = Math.sin(t * 2.6 + cl.ph) * 1.8 * S;
      for (const fl of cl.flowers) {
        const spr = blossoms[fl.layer][fl.size];
        const wpx = spr.r * 2 * fl.f * S;
        ctx.globalAlpha = fl.alpha;
        ctx.drawImage(
          spr.c,
          px + fl.dx - wpx / 2,
          py + fl.dy + wob - wpx / 2,
          wpx,
          wpx,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function _petalPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.74, -r * 0.5, r * 0.7, r * 0.42, 0, r);
    ctx.bezierCurveTo(-r * 0.7, r * 0.42, -r * 0.74, -r * 0.5, 0, -r);
    ctx.closePath();
  }

  ThemeScenes.register("blossomstorm", {
    label: "Blossom Storm",
    hidden: true,
    defaults: { density: 110, speed: 1, color: "#ec4899", scale: 1 },
    presetBgColors: ["#020617", "#000000", "#1a1226", "#16122a", "#0f172a", "#2a1222"],
    presetCombos: [
      { color: "#ec4899", bg: "#020617" }, 
      { color: "#f8fafc", bg: "#1a1226" }, 
      { color: "#fbbf24", bg: "#16122a" }, 
      { color: "#a78bfa", bg: "#1a0a2e" }, 
      { color: "#fdba74", bg: "#2a1222" }, 
      { color: "#f43f5e", bg: "#1c0f0c" }, 
    ],
    options: [
      { key: "density", label: "Petals", type: "range", min: 40, max: 300, step: 10 },
      { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "scale", label: "Petal Size", type: "range", min: 0.5, max: 2, step: 0.1 },
      { key: "color", label: "Blossom Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.w = w;
      state.h = h;
      state.S = h / 1080;
      const S = state.S;

      state.petals = [];
      const count = Math.round(opts.density ?? 110);
      for (let i = 0; i < count; i++) {
        const depth = Math.random() * 0.8 + 0.2;
        state.petals.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (2.2 + Math.random() * 2.4) * S * (0.6 + depth * 0.85),
          depth,
          ph: Math.random() * Math.PI * 2,
          rot: Math.random() * Math.PI * 2,
          rotSp: (Math.random() - 0.5) * 5,
          vy: (Math.random() * 16 + 8) * S,
          sway: 6 + Math.random() * 12,
        });
      }

      state.stars = [];
      for (let i = 0; i < 64; i++) {
        const x = Math.random();
        const y = Math.random() * 0.74;
        if (Math.hypot((x - 0.8) * w, (y - 0.16) * h) < h * 0.17) continue;
        state.stars.push({
          x, y,
          r: (Math.random() * 1.1 + 0.35) * S,
          ph: Math.random() * Math.PI * 2,
          tw: 0.5 + Math.random() * 1.4,
        });
      }

      const ridge = (lift, amp, freq, phase) => {
        const pts = [];
        const n = 42;
        for (let j = 0; j <= n; j++) {
          const u = j / n;
          pts.push({
            x: u * w,
            y: h * (lift - amp * Math.sin(u * Math.PI * freq + phase)),
          });
        }
        return pts;
      };
      state.hillFar = ridge(0.9, 0.026, 1.7, 1.1);
      state.hill = ridge(0.945, 0.03, 2.4, 0.6);

      state.tree = _buildTree(w, h, S);
      state.treeOff = new Float32Array(state.tree.segs.length);
      state.spriteColor = null; 
    },
    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const color = opts.color || "#ec4899";
      const bgColor = opts.bgColor || null;
      const sc = opts.scale ?? 1;
      const TAU = Math.PI * 2;
      state.t += dt * speed;
      state.w = w;
      state.h = h;
      ctx.clearRect(0, 0, w, h);
      const S = state.S || 1;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      if (bgColor) {
        bg.addColorStop(0, _mixHex(bgColor, "#04030c", 0.5));
        bg.addColorStop(0.55, _mixHex(bgColor, "#150f2c", 0.2));
        bg.addColorStop(1, _mixHex(bgColor, "#241a44", 0.3));
      } else {
        bg.addColorStop(0, "#0a0718");
        bg.addColorStop(0.55, "#140e28");
        bg.addColorStop(1, "#1e1638");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const s of state.stars) {
        const tw = 0.5 + 0.5 * Math.sin(state.t * s.tw + s.ph);
        ctx.globalAlpha = 0.14 + tw * 0.3;
        ctx.fillStyle = "#e9e4fb";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const mx = w * 0.8, my = h * 0.16;
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.26);
      halo.addColorStop(0, "rgba(226, 224, 250, 0.26)");
      halo.addColorStop(0.4, "rgba(214, 214, 246, 0.08)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(mx - h * 0.26, my - h * 0.26, h * 0.52, h * 0.52);
      const mr = h * 0.032;
      const dg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
      dg.addColorStop(0, "rgba(246, 245, 253, 0.97)");
      dg.addColorStop(0.72, "rgba(228, 226, 246, 0.9)");
      dg.addColorStop(1, "rgba(196, 193, 226, 0.84)");
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(158, 148, 196, 0.16)";
      ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.18, mr * 0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.28, mr * 0.14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + mr * 0.02, my - mr * 0.42, mr * 0.1, 0, TAU); ctx.fill();

      ctx.fillStyle = "#1b1533";
      ctx.beginPath();
      ctx.moveTo(-6, h + 6);
      for (const p of state.hillFar) ctx.lineTo(p.x, p.y);
      ctx.lineTo(w + 6, h + 6);
      ctx.closePath();
      ctx.fill();

      _drawTree(ctx, w, h, state, color);

      ctx.fillStyle = "#161129";
      ctx.beginPath();
      ctx.moveTo(-6, h + 6);
      for (const p of state.hill) ctx.lineTo(p.x, p.y);
      ctx.lineTo(w + 6, h + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(163, 150, 214, 0.2)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < state.hill.length; i++) {
        const p = state.hill[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      const petalLight = _mixC(color, "#ffffff", 0.45);
      const petalDeep = _mixC(color, "#1d1130", 0.42);
      const gust = 0.7 + 0.3 * Math.sin(state.t * 1.3) * Math.sin(state.t * 0.3);
      for (const p of state.petals) {
        p.rot += p.rotSp * dt * speed;
        p.x += (44 + p.depth * 62) * S * gust * dt * speed;
        p.y +=
          (p.vy + Math.sin(state.t * 2.6 + p.ph) * p.sway * S) * dt * speed;
        if (p.x > w + 22) { p.x = -22; p.y = Math.random() * h; }
        if (p.y > h + 18) { p.y = -18; p.x = Math.random() * w; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.5 + p.depth * 0.45;
        ctx.fillStyle = p.depth > 0.72 ? petalLight : p.depth > 0.42 ? color : petalDeep;
        _petalPath(ctx, p.r * sc);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  });
})();
