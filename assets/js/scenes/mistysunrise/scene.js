(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  const SUN_CYCLE = 110;
  const TAU = Math.PI * 2;

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
    const v = Array.isArray(c) ? c : _rgb(c);
    return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }
  function _css(c) {
    const v = Array.isArray(c) ? c : _rgb(c);
    return `rgb(${v[0]},${v[1]},${v[2]})`;
  }
  function _ease(t) {
    return t * t * (3 - 2 * t);
  }
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function _buildRidge(w, h, base, amp, freq, phase, jitter) {
    const pts = [];
    const n = Math.max(24, Math.round(w / 40));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const y =
        base -
        Math.sin(u * Math.PI * freq + phase) * amp -
        Math.sin(u * Math.PI * freq * 2.7 + phase * 1.7) * amp * 0.32 -
        (Math.random() - 0.5) * jitter;
      pts.push({ x: u * w, y: y * h });
    }
    return pts;
  }

  function _ridgePath(ctx, pts, w, h) {
    ctx.beginPath();
    ctx.moveTo(-2, h + 2);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(w + 2, h + 2);
    ctx.closePath();
  }

  ThemeScenes.register("mistysunrise", {
    label: "Misty Sunrise",
    defaults: { density: 6, speed: 0.5, color: "#f59e0b" },
    presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
    presetCombos: [
      { color: "#f59e0b", bg: "#1a0f08" }, 
      { color: "#fbbf24", bg: "#1e1208" }, 
      { color: "#f472b6", bg: "#2a1438" }, 
      { color: "#7dd3fc", bg: "#0a1a2e" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
      { color: "#e2e8f0", bg: "#0d1117" }, 
    ],
    options: [
      { key: "density", label: "Mist Layers", type: "range", min: 2, max: 15, step: 1 },
      { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
      { key: "color", label: "Sun Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.S = h / 1080;
      const S = state.S;
      state.sunT = SUN_CYCLE * 0.06;
      state.rays = [];

      state.ridges = [
        { pts: _buildRidge(w, h, 0.6, 0.05, 1.6, 1.35, 0.012), tone: "#33253a", lit: 0.85 },
        { pts: _buildRidge(w, h, 0.665, 0.042, 2.4, 0.7, 0.014), tone: "#1d1428", lit: 0.6 },
        { pts: _buildRidge(w, h, 0.73, 0.034, 3.3, 2.9, 0.016), tone: "#0f0a14", lit: 0.35 },
      ];

      const count = Math.max(2, Math.round(opts.density ?? 6));
      state.bands = [];
      for (let i = 0; i < count; i++) {
        const depth = count === 1 ? 1 : i / (count - 1);
        state.bands.push({
          depth,
          base: h * (0.66 + depth * 0.24),
          thickness: h * (0.035 + depth * 0.055),
          amp: (6 + depth * 14) * S,
          freq: 0.0016 + Math.random() * 0.0016,
          freq2: 0.0042 + Math.random() * 0.003,
          drift: (12 + depth * 22) * S,
          alpha: 0.07 + depth * 0.15,
          phase: Math.random() * TAU,
          phase2: Math.random() * TAU,
        });
      }

      state.wisps = [];
      for (let i = 0; i < 14; i++) {
        state.wisps.push({
          x: Math.random(),
          y: h * (0.66 + Math.random() * 0.28),
          r: (70 + Math.random() * 130) * S,
          alpha: 0.035 + Math.random() * 0.06,
          speed: (9 + Math.random() * 20) * S,
          ph: Math.random() * TAU,
        });
      }

      state.stars = [];
      for (let i = 0; i < 90; i++) {
        state.stars.push({
          x: Math.random(),
          y: Math.random() * 0.5,
          r: (0.4 + Math.random() * 1.1) * S,
          ph: Math.random() * TAU,
          tw: (0.5 + Math.random() * 1.6) * 0.35,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 0.5;
      const color = opts.color || "#f59e0b";
      const bgColor = opts.bgColor || null;
      const S = state.S || 1;

      state.sunT += dt * speed;
      const p = _ease(_clamp(state.sunT / SUN_CYCLE, 0, 1));
      state.amb = (state.amb || 0) + dt * speed;
      const t = state.amb;

      const base = bgColor || "#1a0f08";
      const sun = _rgb(color);
      const warm = _mix(sun, [255, 214, 150], 0.35);

      ctx.clearRect(0, 0, w, h);

      const rose = _mix(sun, [255, 126, 156], 0.5);
      const top = _mix(base, [10, 9, 28], 0.5 - p * 0.25);
      const upper = _mix(top, rose, 0.1 + p * 0.35);
      const mid = _mix(base, warm, 0.2 + p * 0.55);
      const bottom = _mix(warm, [255, 236, 200], 0.2 + p * 0.55);
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.86);
      sky.addColorStop(0, _css(top));
      sky.addColorStop(0.34, _css(upper));
      sky.addColorStop(0.62, _css(mid));
      sky.addColorStop(0.86, _css(bottom));
      sky.addColorStop(1, _css(_mix(bottom, [12, 8, 10], 0.35)));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const starA = 1 - _clamp(p * 2.2, 0, 1);
      if (starA > 0.01) {
        for (const s of state.stars) {
          const tw = 0.55 + 0.45 * Math.sin(t * s.tw * 2 + s.ph);
          ctx.globalAlpha = starA * (0.18 + tw * 0.5);
          ctx.fillStyle = "#dfe3ff";
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const sunX = w * (0.44 + p * 0.12 + Math.sin(t * 0.05) * 0.006);
      const sunY = h * (0.6 - p * 0.42) + Math.sin(t * 0.08) * h * 0.004;
      const sunR = h * (0.024 + p * 0.02);

      const low = 1 - _clamp((p - 0.15) / 0.55, 0, 1);
      const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * (0.24 + p * 0.2));
      bloom.addColorStop(0, _rgba(warm, 0.28 + low * 0.18));
      bloom.addColorStop(0.25, _rgba(warm, 0.1 + low * 0.1));
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      const rayA = _clamp(1 - (p - 0.2) / 0.7, 0, 1) * (0.045 + low * 0.045);
      if (rayA > 0.004) {
        const rays = 11;
        const spin = t * 0.012;
        const rayLen = h * (0.6 + 0.25 * (1 - p));
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(spin);
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * TAU;
          const wid = (0.012 + 0.01 * Math.sin(t * 0.35 + i * 1.7)) * (1 - p * 0.4);
          const len = rayLen * (0.78 + 0.22 * Math.abs(Math.sin(i * 2.3 + 0.7)));
          const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
          g.addColorStop(0, _rgba(warm, rayA));
          g.addColorStop(0.4, _rgba(warm, rayA * 0.3));
          g.addColorStop(0.8, _rgba(warm, 0));
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const ex = Math.cos(a) * len;
          const ey = Math.sin(a) * len;
          const nx = -Math.sin(a) * len * wid;
          const ny = Math.cos(a) * len * wid;
          ctx.lineTo(ex + nx, ey + ny);
          ctx.lineTo(ex - nx, ey - ny);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      const disc = ctx.createRadialGradient(sunX - sunR * 0.25, sunY - sunR * 0.3, sunR * 0.1, sunX, sunY, sunR * 2.4);
      disc.addColorStop(0, "rgba(255, 250, 235, 0.98)");
      disc.addColorStop(0.28, _rgba(warm, 0.92));
      disc.addColorStop(0.55, _rgba(warm, 0.3));
      disc.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 2.4, 0, TAU);
      ctx.fill();

      const crest = ctx.createLinearGradient(0, 0, w, 0);
      const rel = _clamp(sunX / w, 0.06, 0.94);
      crest.addColorStop(0, _rgba(warm, 0));
      crest.addColorStop(Math.max(0.02, rel - 0.34), _rgba(warm, 0.05 * (0.4 + p)));
      crest.addColorStop(rel, _rgba(warm, 0.5 * (0.35 + p * 0.65)));
      crest.addColorStop(Math.min(0.98, rel + 0.34), _rgba(warm, 0.05 * (0.4 + p)));
      crest.addColorStop(1, _rgba(warm, 0));

      state.ridges.forEach((r, i) => {
        ctx.fillStyle = _css(_mix(r.tone, warm, 0.05 + p * 0.16 * r.lit));
        _ridgePath(ctx, r.pts, w, h);
        ctx.fill();
        ctx.globalAlpha = 0.5 + p * 0.4;
        ctx.strokeStyle = crest;
        ctx.lineWidth = Math.max(1, (1.1 + (2 - i) * 0.5) * S);
        ctx.beginPath();
        r.pts.forEach((pt, k) => (k ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      for (const b of state.bands) {
        const lit = _clamp(1 - Math.abs(b.base - sunY) / (h * 0.5), 0, 1);
        const tone = _mix([158, 174, 204], warm, 0.14 + lit * p * 0.45);
        const scroll = t * b.drift * b.freq;
        const y0 = b.base - b.amp * 2.6;
        const y1 = b.base + b.thickness;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, _rgba(tone, 0));
        g.addColorStop(0.4, _rgba(tone, b.alpha * (0.5 + lit * 0.5)));
        g.addColorStop(0.75, _rgba(tone, b.alpha * (0.7 + lit * 0.4)));
        g.addColorStop(1, _rgba(tone, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        const up = [];
        const dn = [];
        for (let x = 0; x <= w + 8; x += 10) {
          const yy =
            b.base +
            Math.sin(x * b.freq + scroll + b.phase) * b.amp +
            Math.sin(x * b.freq2 - scroll * 0.6 + b.phase2) * b.amp * 0.45;
          up.push([x, yy]);
          dn.push([x, yy + b.thickness]);
        }
        ctx.moveTo(up[0][0], up[0][1]);
        for (const pt of up) ctx.lineTo(pt[0], pt[1]);
        for (let i = dn.length - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
        ctx.closePath();
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.62);
      glow.addColorStop(0, _rgba(warm, 0.07 + low * 0.07));
      glow.addColorStop(0.45, _rgba(warm, 0.03));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      for (const wi of state.wisps) {
        const x = ((wi.x * w + t * wi.speed) % (w + wi.r * 2)) - wi.r;
        const y = wi.y + Math.sin(t * 0.25 + wi.ph) * 5 * S;
        const g = ctx.createRadialGradient(x, y, 0, x, y, wi.r);
        const tone = _mix([170, 182, 208], warm, 0.3 * p);
        g.addColorStop(0, _rgba(tone, wi.alpha * (0.5 + p * 0.5)));
        g.addColorStop(0.55, _rgba(tone, wi.alpha * 0.45));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - wi.r, y - wi.r, wi.r * 2, wi.r * 2);
      }

      const floor = ctx.createLinearGradient(0, h * 0.8, 0, h);
      floor.addColorStop(0, _rgba(warm, 0.06 + p * 0.08));
      floor.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
    },
  });
})();
