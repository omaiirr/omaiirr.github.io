(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgbOf(c) {
    if (Array.isArray(c)) return c;
    if (typeof c === "string" && c.startsWith("rgb")) return c.match(/\d+/g).slice(0, 3).map(Number);
    return _hexToRgb(c);
  }
  function _mix(c1, c2, t) {
    const a = _rgbOf(c1);
    const b = _rgbOf(c2);
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function _css(c) {
    const v = _rgbOf(c);
    return `rgb(${v[0]},${v[1]},${v[2]})`;
  }
  function _rgba(c, a) {
    const v = _rgbOf(c);
    return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }
  function _lighten(rgb, f) {
    return [
      Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * f)),
      Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * f)),
      Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * f)),
    ];
  }
  function _darken(rgb, f) {
    return [
      Math.round(rgb[0] * f),
      Math.round(rgb[1] * f),
      Math.round(rgb[2] * f),
    ];
  }
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function _craneWing(ctx, s, up, far, rgb, d) {
    const off = far ? -s * 0.09 : 0;
    const dark = d || 0;
    ctx.globalAlpha *= far ? 0.85 : 1;
    const base = far ? _darken(rgb, 0.72) : _lighten(rgb, 0.12);
    ctx.fillStyle = _rgba(_mix(base, _mix(rgb, [22, 12, 28], 0.82), dark), 1);
    ctx.strokeStyle = _rgba(_mix(_darken(rgb, 0.5), _lighten(rgb, 0.32), dark), 0.3 + dark * 0.25);
    ctx.lineWidth = Math.max(0.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 0.04 + off);
    ctx.lineTo(-s * 0.42, -s * up * 1.05 + off);
    ctx.lineTo(-s * 0.18, s * 0.06 + off);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function _drawCrane(ctx, x, y, s, flap, dir, alpha, rgb, dark01) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = alpha;
    const wingUp = 0.35 + flap * 0.95;
    const d = dark01 || 0;
    const paper = _mix(_lighten(rgb, 0.62), _mix(rgb, [26, 14, 32], 0.78), d);
    const line = _rgba(_mix(_darken(rgb, 0.55), _lighten(rgb, 0.3), d), 0.32 + d * 0.28);
    _craneWing(ctx, s, wingUp * 0.92, true, rgb, d);
    ctx.fillStyle = _rgba(paper, 1);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(0.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(s * 0.4, -s * 0.02);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.3, s * 0.63, -s * 0.46);
    ctx.lineTo(s * 0.8, -s * 0.5);
    ctx.lineTo(s * 0.68, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.28, s * 0.4, -s * 0.02);
    ctx.lineTo(-s * 0.38, s * 0.02);
    ctx.lineTo(-s * 0.62, -s * 0.36);
    ctx.lineTo(-s * 0.48, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = _rgba(paper, 1);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(0.6, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(s * 0.63, -s * 0.46);
    ctx.quadraticCurveTo(s * 0.68, -s * 0.6, s * 0.74, -s * 0.63);
    ctx.lineTo(s * 0.88, -s * 0.58);
    ctx.lineTo(s * 0.76, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.68, -s * 0.44, s * 0.63, -s * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    _craneWing(ctx, s, wingUp, false, rgb, d);
    ctx.strokeStyle = _rgba(_mix(_darken(rgb, 0.55), _lighten(rgb, 0.35), d), 0.4);
    ctx.lineWidth = Math.max(0.4, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(s * 0.02, -s * 0.02);
    ctx.lineTo(-s * 0.28, -s * wingUp * 0.95);
    ctx.moveTo(s * 0.02, -s * 0.02);
    ctx.lineTo(s * 0.2, -s * 0.3);
    ctx.moveTo(-s * 0.24, -s * 0.1);
    ctx.lineTo(-s * 0.42, -s * 0.34);
    ctx.stroke();
    ctx.restore();
  }

  function _waveY(b, x, t) {
    return (
      b.base +
      Math.sin(x * b.k - t * b.omega + b.phase) * b.amp +
      Math.sin(x * b.k * 2.1 + t * b.omega * 0.55 + b.phase * 1.7) * b.amp * 0.12
    );
  }

  const HORIZON = 0.75; 
  const SUN_X = 0.29;
  const SUN_Y = 0.672;

  function _spawnBird(state, w, h, near, keepDir) {
    const S = state.S;
    const depth = near ? 0.82 + Math.random() * 0.18 : 0.18 + Math.random() * 0.74;
    const dir = keepDir || (Math.random() < 0.7 ? 1 : -1);
    const size = (9 + depth * 44) * S;
    return {
      depth,
      dir,
      x: dir > 0 ? -size * 3 - Math.random() * w * 0.4 : w + size * 3 + Math.random() * w * 0.4,
      baseY: h * (0.16 + Math.random() * 0.48),
      size,
      vx: dir * (20 + depth * 58) * S,
      ph: Math.random() * Math.PI * 2,
      flapSp: 1.5 + Math.random() * 2.2 + depth * 1.2,
      bobAmp: (4 + depth * 12) * S,
      bobPh: Math.random() * Math.PI * 2,
      alpha: 0.42 + depth * 0.55,
      tint: Math.random() * 0.4, 
      near: !!near,
    };
  }

  ThemeScenes.register("origami", {
    label: "Origami",
    defaults: { density: 10, speed: 1, color: "#f472b6" },
    presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#f472b6", bg: "#020617" }, 
      { color: "#a78bfa", bg: "#1a0a2e" }, 
      { color: "#7dd3fc", bg: "#0a1628" }, 
      { color: "#fbbf24", bg: "#1a1208" }, 
      { color: "#86efac", bg: "#0a1a0a" }, 
      { color: "#f87171", bg: "#1c0f0c" }, 
    ],
    options: [
      { key: "density", label: "Shapes", type: "range", min: 3, max: 25, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const count = Math.max(3, Math.round(opts.density ?? 10));
      state.birds = [];
      for (let i = 0; i < count; i++) state.birds.push(_spawnBird(state, w, h, false, 0));
      state.nearBirds = [_spawnBird(state, w, h, true), _spawnBird(state, w, h, true)];
      for (const b of state.birds) {
        b.x = b.dir > 0 ? Math.random() * w : w - Math.random() * w;
      }
      state.nearBirds.forEach((b, i) => (b.x = b.dir > 0 ? w * (0.2 + i * 0.5) : w * (0.8 - i * 0.5)));

      state.clouds = [];
      for (let i = 0; i < 7; i++) {
        const cw = (140 + Math.random() * 420) * S;
        state.clouds.push({
          x: Math.random() * w - cw * 0.3,
          y: h * (0.26 + Math.random() * 0.42),
          w: cw,
          h: (5 + Math.random() * 13) * S,
          speed: (2 + Math.random() * 6) * S,
          alpha: 0.12 + Math.random() * 0.22,
          lift: Math.random(), 
        });
      }

      const WAVE_PACE = 1.15;
      const seaTop = h * HORIZON;
      const SEA_BANDS = 5;
      const _base = (u) => seaTop + (h - seaTop) * (0.085 + 0.735 * Math.pow(u, 1.35));
      state.sea = [];
      for (let i = 0; i < SEA_BANDS; i++) {
        const u = i / (SEA_BANDS - 1); 
        const len = w * (0.14 + 0.16 * u) * (0.94 + Math.random() * 0.12);
        const k = (Math.PI * 2) / Math.max(26, len);
        const travel = (6.5 + 22 * Math.pow(u, 1.5)) * WAVE_PACE;
        const spacing = (i + 1 < SEA_BANDS ? _base((i + 1) / (SEA_BANDS - 1)) : h) - _base(u);
        state.sea.push({
          u,
          base: _base(u),
          amp: Math.max(1.6, spacing * 0.2),
          k,
          omega: k * travel, 
          phase: Math.random() * Math.PI * 2,
          alpha: 0.52 + 0.4 * u,
        });
      }
      state.glitter = [];
      for (let i = 0; i < 80; i++) {
        const band = Math.min(SEA_BANDS - 1, Math.floor(Math.pow(Math.random(), 0.7) * SEA_BANDS));
        state.glitter.push({
          band,
          x0: (Math.random() - 0.5) * w * 0.42,
          drop: (1 + Math.random() * 4) * S,
          len: (1.6 + Math.random() * 14) * S * (0.7 + band * 0.18),
          ph: Math.random() * Math.PI * 2,
          sp: 0.35 + Math.random() * 0.95,
          drift: 1.5 + Math.random() * 5,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const color = opts.color || "#f472b6";
      const bgColor = opts.bgColor || null;
      const S = state.S || 1;

      state.t += dt * speed;
      const t = state.t; 
      const dtm = dt * speed;

      const paper = _rgbOf(color);
      const warm = _mix(paper, [255, 158, 76], 0.62);
      const rose = _mix(paper, [255, 92, 112], 0.5);
      const sunX = w * SUN_X;
      const sunY = h * SUN_Y;
      const horizon = h * HORIZON;

      ctx.clearRect(0, 0, w, h);

      const deep = _mix(bgColor || "#020617", [22, 14, 46], 0.5);
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, _css(deep));
      sky.addColorStop(0.34, _css(_mix(deep, rose, 0.45)));
      sky.addColorStop(0.62, _css(_mix(rose, warm, 0.5)));
      sky.addColorStop(0.85, _css(_mix(warm, [255, 236, 190], 0.3)));
      sky.addColorStop(1, _css(_mix(warm, [255, 246, 214], 0.45)));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon + 1);

      const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.46);
      bloom.addColorStop(0, _rgba(warm, 0.34));
      bloom.addColorStop(0.28, _rgba(warm, 0.15));
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, horizon);

      const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.17);
      disc.addColorStop(0, "rgba(255, 253, 246, 0.99)");
      disc.addColorStop(0.18, _rgba(_mix(warm, [255, 249, 228], 0.62), 0.92));
      disc.addColorStop(0.36, _rgba(_mix(warm, [255, 240, 210], 0.3), 0.58));
      disc.addColorStop(0.56, _rgba(warm, 0.28));
      disc.addColorStop(0.76, _rgba(warm, 0.1));
      disc.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sunX, sunY, h * 0.17, 0, Math.PI * 2);
      ctx.fill();

      for (const c of state.clouds) {
        c.x += c.speed * dtm;
        if (c.x > w + 40) c.x = -c.w - 40;
        const cd = Math.hypot(c.x + c.w / 2 - sunX, c.y - sunY);
        const glow = _clamp(1 - cd / (h * 0.65), 0, 1);
        const lit = _mix(_mix(deep, rose, 0.5), warm, 0.35 + c.lift * 0.5 + glow * 0.45);
        const g = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
        g.addColorStop(0, _rgba(lit, 0));
        g.addColorStop(0.22, _rgba(lit, c.alpha));
        g.addColorStop(0.75, _rgba(lit, c.alpha * 0.8));
        g.addColorStop(1, _rgba(lit, 0));
        ctx.fillStyle = g;
        const half = c.w * 0.5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.quadraticCurveTo(c.x + half, c.y - c.h, c.x + c.w, c.y);
        ctx.quadraticCurveTo(c.x + half, c.y + c.h, c.x, c.y);
        ctx.closePath();
        ctx.fill();
      }

      const farWater = _mix(_mix(deep, warm, 0.55), [255, 232, 196], 0.3);
      const midWater = _mix(deep, [52, 30, 64], 0.45);
      const nearWater = _mix(deep, [7, 4, 14], 0.7);
      const water = ctx.createLinearGradient(0, horizon, 0, h);
      water.addColorStop(0, _css(farWater));
      water.addColorStop(0.24, _css(midWater));
      water.addColorStop(1, _css(nearWater));
      ctx.fillStyle = water;
      ctx.fillRect(0, horizon, w, h - horizon);

      const hazeTop = horizon - h * 0.055;
      const haze = ctx.createLinearGradient(0, hazeTop, 0, horizon + h * 0.04);
      haze.addColorStop(0, _rgba(_mix(warm, [255, 246, 220], 0.4), 0));
      haze.addColorStop(0.58, _rgba(_mix(warm, [255, 246, 220], 0.4), 0.26));
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, hazeTop, w, horizon + h * 0.04 - hazeTop);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const poolR = h * 0.36;
      const pool = ctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, poolR);
      pool.addColorStop(0, _rgba(_mix(warm, [255, 244, 214], 0.5), 0.34));
      pool.addColorStop(0.45, _rgba(warm, 0.11));
      pool.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.restore();

      const crest = [];
      const nextCrest = [];
      const step = Math.max(6, Math.min(13, w / 90));
      const sample = (b, out) => {
        out.length = 0;
        for (let x = -step; x <= w + step; x += step)
          out.push([x, _waveY(b, x, t)]);
      };
      const strokeCrest = (arr, dy) => {
        ctx.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const x = arr[i][0];
          const y = arr[i][1] + dy;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      for (let bi = 0; bi < state.sea.length; bi++) {
        const b = state.sea[bi];
        const below = state.sea[bi + 1] || null;
        sample(b, crest);
        if (below) sample(below, nextCrest);

        const top = _mix(farWater, nearWater, 0.1 + 0.66 * b.u);
        const trough = _mix(top, nearWater, 0.2 + 0.3 * b.u);
        const face = ctx.createLinearGradient(
          0,
          b.base - b.amp * 1.5,
          0,
          (below ? below.base : h) + b.amp * 0.5,
        );
        face.addColorStop(0, _rgba(_mix(top, warm, 0.26 + 0.2 * (1 - b.u)), Math.min(1, b.alpha)));
        face.addColorStop(0.26, _rgba(top, Math.min(1, b.alpha * 0.94)));
        face.addColorStop(0.7, _rgba(trough, Math.min(1, b.alpha * 0.9)));
        face.addColorStop(1, _rgba(_mix(trough, nearWater, 0.26), Math.min(1, b.alpha * 0.82)));
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.moveTo(crest[0][0], crest[0][1]);
        for (let i = 1; i < crest.length; i++) ctx.lineTo(crest[i][0], crest[i][1]);
        if (below) {
          for (let i = nextCrest.length - 1; i >= 0; i--)
            ctx.lineTo(nextCrest[i][0], nextCrest[i][1]);
        } else {
          ctx.lineTo(w + step, h + step * 2);
          ctx.lineTo(-step, h + step * 2);
        }
        ctx.closePath();
        ctx.fill();

        const wl = (Math.PI * 2) / b.k;
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = _rgba(_mix(trough, nearWater, 0.5), 0.1 + 0.08 * b.u);
        ctx.lineWidth = Math.max(0.6, (0.7 + 0.6 * b.u) * S);
        strokeCrest(crest, Math.max(0.8, (0.9 + 0.7 * b.u) * S));
        ctx.globalCompositeOperation = "lighter";
        const cw = w * 0.16;
        const gx0 = _clamp((sunX - cw) / w, 0, 0.94);
        const gx1 = _clamp(sunX / w, gx0 + 0.01, 0.99);
        const gx2 = _clamp((sunX + cw) / w, gx1 + 0.001, 1);
        const ridge = ctx.createLinearGradient(0, 0, w, 0);
        const hot = _mix(warm, [255, 250, 232], 0.72);
        ridge.addColorStop(0, "rgba(0,0,0,0)");
        ridge.addColorStop(Math.max(0, gx0 - 0.05), "rgba(0,0,0,0)");
        ridge.addColorStop(gx0, _rgba(hot, 0.03));
        ridge.addColorStop(gx1, _rgba(hot, 0.13 + 0.13 * b.u));
        ridge.addColorStop(gx2, _rgba(hot, 0.03));
        ridge.addColorStop(Math.min(1, gx2 + 0.05), "rgba(0,0,0,0)");
        ridge.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = ridge;
        ctx.setLineDash([Math.max(2.4, wl * 0.07), Math.max(5, wl * 0.2)]);
        ctx.lineDashOffset = -t * (2 + 7 * b.u);
        ctx.lineWidth = Math.max(0.7, (0.8 + 1.1 * b.u) * S);
        strokeCrest(crest, 0);
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.strokeStyle = _rgba(_mix(farWater, [255, 246, 224], 0.5), 0.22);
      ctx.lineWidth = Math.max(1, 1.6 * S);
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const gl of state.glitter) {
        const b = state.sea[gl.band];
        if (!b) continue;
        const tw = Math.sin(t * gl.sp + gl.ph);
        if (tw <= 0.25) continue;
        const x = ((sunX + gl.x0 + t * gl.drift) % (w + 120) + w + 120) % (w + 120) - 60;
        const y = _waveY(b, x, t) + gl.drop;
        const depthFade = 1 - _clamp((y - horizon) / (h - horizon), 0, 1) * 0.55;
        const a = (tw - 0.25) / 0.75;
        ctx.fillStyle = _rgba(_mix(warm, [255, 251, 236], 0.72), a * a * 0.24 * depthFade);
        ctx.fillRect(x - gl.len / 2, y, gl.len * 0.85, Math.max(0.7, 1.3 * S));
      }
      ctx.restore();

      const drawBird = (b, extra) => {
        const dx = b.x - sunX;
        const dy = b.y - sunY;
        const nearSun = Math.max(0, 1 - Math.hypot(dx, dy) / (h * 0.36));
        const low = _clamp((b.y / h - 0.08) / 0.5, 0, 1);
        const dark01 = _clamp(nearSun * 0.75 + low * 0.65, 0, 1);
        const tint = _mix(paper, warm, 0.2 + b.tint + nearSun * 0.35);
        _drawCrane(
          ctx, 0, 0, b.size, Math.sin(b.ph), b.dir,
          b.alpha * extra,
          tint,
          dark01,
        );
      };

      for (const b of state.birds) {
        b.x += b.vx * dtm;
        b.ph += b.flapSp * dtm;
        b.y = b.baseY + Math.sin(b.ph * 0.5 + b.bobPh) * b.bobAmp;
        if (b.dir > 0 && b.x > w + b.size * 3) {
          Object.assign(b, _spawnBird(state, w, h, false, b.dir));
          b.x = -b.size * 3;
        } else if (b.dir < 0 && b.x < -b.size * 3) {
          Object.assign(b, _spawnBird(state, w, h, false, b.dir));
          b.x = w + b.size * 3;
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.sin(b.ph * 0.5 + b.bobPh) * 0.06 * b.dir);
        drawBird(b, 1);
        ctx.restore();
      }

      for (const b of state.nearBirds) {
        b.x += b.vx * dtm;
        b.ph += b.flapSp * dtm;
        b.y = b.baseY + Math.sin(b.ph * 0.4 + b.bobPh) * b.bobAmp * 1.6;
        if (b.dir > 0 && b.x > w + b.size * 3) Object.assign(b, _spawnBird(state, w, h, true, b.dir), { x: -b.size * 3 });
        if (b.dir < 0 && b.x < -b.size * 3) Object.assign(b, _spawnBird(state, w, h, true, b.dir), { x: w + b.size * 3 });
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(-Math.sin(b.ph * 0.4 + b.bobPh) * 0.07);
        drawBird(b, 0.5);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  });
})();
