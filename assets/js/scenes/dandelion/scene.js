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

  function _windField(nx, ny, t) {
    const a = Math.sin(ny * 5.1 + t * 0.83) * Math.cos(nx * 3.4 - t * 0.61);
    const b = Math.sin(nx * 7.3 + t * 1.27 + 1.7) * 0.45;
    const c = Math.cos(ny * 2.2 - t * 0.37) * 0.35;
    return (a + b + c) / 1.8;
  }

  const FILAMENTS = 19;
  const UNITS = 3.4; 
  const ACHENE = [122, 84, 51];
  const ACHENE_DARK = [86, 58, 34];

  function _bakeSeed(tintRgb, px) {
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const x = c.getContext("2d");
    const u = px / (UNITS * 2);
    x.translate(px / 2, px / 2);
    x.scale(u, u); 
    x.lineCap = "round";
    x.lineJoin = "round";

    const hubY = -0.55;
    const pale = _mix([253, 252, 248], tintRgb, 0.16);
    const filament = _mix(pale, [255, 255, 255], 0.55);

    const halo = x.createRadialGradient(0, hubY, 0, 0, hubY, UNITS * 0.95);
    halo.addColorStop(0, _rgba(pale, 0.09));
    halo.addColorStop(0.5, _rgba(pale, 0.03));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = halo;
    x.beginPath();
    x.arc(0, hubY, UNITS * 0.95, 0, Math.PI * 2);
    x.fill();

    const tipR = 2.08;
    const drawFan = (alpha, width) => {
      x.strokeStyle = _rgba(filament, alpha);
      x.lineWidth = width;
      x.beginPath();
      for (let k = 0; k < FILAMENTS; k++) {
        const phi = (k / (FILAMENTS - 1) - 0.5) * Math.PI * 0.87;
        const s = Math.sin(phi);
        const co = Math.cos(phi);
        const droop = 0.1 + 0.16 * s * s;
        x.moveTo(0, hubY);
        x.quadraticCurveTo(
          s * tipR * 0.52,
          hubY - co * tipR * 0.66,
          s * tipR,
          hubY - co * tipR + droop,
        );
      }
      x.stroke();
    };
    drawFan(0.2, 0.2);
    drawFan(0.92, 0.07);

    x.strokeStyle = _rgba(filament, 0.32);
    x.lineWidth = 0.045;
    x.beginPath();
    for (let k = 0; k < FILAMENTS; k++) {
      const phi = (k / (FILAMENTS - 1) - 0.5) * Math.PI * 0.87;
      const s = Math.sin(phi);
      const co = Math.cos(phi);
      for (let j = 0; j < 2; j++) {
        const f = 0.62 + j * 0.19;
        const bx = s * tipR * f;
        const by = hubY - co * tipR * f;
        const side = k % 2 === 0 ? 1 : -1;
        x.moveTo(bx, by);
        x.lineTo(bx + side * 0.19, by - 0.13);
      }
    }
    x.stroke();

    x.strokeStyle = _rgba(pale, 0.16);
    x.lineWidth = 0.42;
    x.beginPath();
    x.arc(0, hubY, tipR * 0.72, Math.PI * 1.06, Math.PI * 1.94);
    x.stroke();

    const stalk = x.createLinearGradient(0, hubY, 0, 1.2);
    stalk.addColorStop(0, _rgba(filament, 0.85));
    stalk.addColorStop(1, _rgba(_mix(pale, ACHENE, 0.35), 0.7));
    x.strokeStyle = stalk;
    x.lineWidth = 0.085;
    x.beginPath();
    x.moveTo(0, hubY);
    x.lineTo(0, 1.22);
    x.stroke();

    x.save();
    x.translate(0, 1.5);
    const body = x.createLinearGradient(0, -0.26, 0, 0.5);
    body.addColorStop(0, _rgba(_mix(ACHENE, [190, 154, 112], 0.35), 0.96));
    body.addColorStop(0.55, _rgba(ACHENE, 0.98));
    body.addColorStop(1, _rgba(ACHENE_DARK, 0.98));
    x.fillStyle = body;
    x.beginPath();
    x.moveTo(0, -0.3);
    x.bezierCurveTo(0.19, -0.16, 0.21, 0.16, 0.06, 0.44);
    x.lineTo(0, 0.52);
    x.lineTo(-0.06, 0.44);
    x.bezierCurveTo(-0.21, 0.16, -0.19, -0.16, 0, -0.3);
    x.closePath();
    x.fill();
    x.strokeStyle = _rgba(ACHENE_DARK, 0.55);
    x.lineWidth = 0.035;
    x.beginPath();
    x.moveTo(0, -0.22);
    x.lineTo(0, 0.4);
    x.stroke();
    x.strokeStyle = _rgba(filament, 0.6);
    x.lineWidth = 0.05;
    x.beginPath();
    x.moveTo(-0.07, -0.27);
    x.lineTo(0, -0.34);
    x.lineTo(0.07, -0.27);
    x.stroke();
    x.restore();

    x.fillStyle = _rgba(_mix(pale, [255, 255, 255], 0.35), 0.9);
    x.beginPath();
    x.arc(0, hubY, 0.12, 0, Math.PI * 2);
    x.fill();
    return c;
  }

  ThemeScenes.register("dandelion", {
    label: "Dandelion Seeds",
    defaults: { density: 40, speed: 1, color: "#eab308" },
    presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1a08", "#0d1117"],
    presetCombos: [
      { color: "#eab308", bg: "#020617" }, 
      { color: "#fde68a", bg: "#1a1a08" }, 
      { color: "#a7f3d0", bg: "#0a1a0a" }, 
      { color: "#f9a8d4", bg: "#1a0a2e" }, 
      { color: "#bae6fd", bg: "#0a1628" }, 
      { color: "#e7e5e4", bg: "#0d1117" }, 
    ],
    options: [
      { key: "density", label: "Seeds", type: "range", min: 10, max: 100, step: 5 },
      { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Seed Tint", type: "color" },
    ],

    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      state.sprite = null;
      state.spriteKey = "";

      const count = Math.max(1, Math.round(opts.density ?? 40));
      state.seeds = [];
      for (let i = 0; i < count; i++) {
        const depth = _clamp(
          (i + Math.random() * 0.8 - 0.4) / Math.max(1, count - 1),
          0.05,
          0.95,
        );
        const fallK = Math.random();
        const windK = Math.random();
        const wind = (0.01 + 0.012 * windK) * (0.5 + 0.8 * depth) * w;
        state.seeds.push({
          x: Math.random() * (w + 120),
          y: Math.random() * (h + 120),
          size: Math.max(2.4, (Math.random() * 5 + 5) * S) * (0.7 + 0.4 * depth),
          depth,
          fall: (0.02 + 0.022 * fallK) * (0.6 + 0.7 * depth) * h,
          wind,
          gust: (0.004 + 0.006 * depth) * Math.min(w, h),
          vx: wind, 
          phase: Math.random() * Math.PI * 2,
          rot0: (Math.random() - 0.5) * 0.3,
          rotAmp: 0.12 + Math.random() * 0.22,
          rotSp: 0.35 + Math.random() * 0.55,
          swayAmp: (0.01 + Math.random() * 0.018) * h,
          swaySp: 1.2 + 3.2 * Math.random(),
          alpha: Math.random() * 0.32 + 0.55,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      const speed = opts.speed ?? 1;
      const dtm = Math.min(0.05, Math.max(0, dt || 0)) * speed;
      state.t += dtm;
      const t = state.t;

      const color = opts.color || "#eab308";
      const tintRgb = _rgb(color);
      const transform = ctx.getTransform();
      const dpr = Math.max(1, Math.hypot(transform.a, transform.b));
      const spriteKey = `${tintRgb}|${dpr}`;
      if (state.spriteKey !== spriteKey) {
        state.sprite = _bakeSeed(tintRgb, Math.round(128 * dpr));
        state.spriteKey = spriteKey;
      }

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = opts.bgColor || "#020617";
      ctx.fillRect(0, 0, w, h);

      const sprite = state.sprite;
      for (const s of state.seeds) {
        const gust = _windField(s.x / w, s.y / h, t * 0.55 + s.phase * 0.03);
        const targetVx = s.wind + gust * s.gust;
        s.vx += (targetVx - s.vx) * Math.min(1, dtm * 1.45);
        s.x += s.vx * dtm;

        const drag = 1 + gust * 0.14;
        s.y += s.fall * Math.max(0.8, drag) * dtm;
        const rot = s.rot0 + s.rotAmp * Math.sin(t * s.rotSp + s.phase) * (1 + 0.5 * Math.abs(gust));

        if (s.y > h + 90) {
          s.y -= h + 180;
          s.x = Math.random() * (w + 120);
          s.vx = s.wind;
        }
        if (s.x > w + 90) s.x -= w + 180;
        if (s.x < -90) s.x += w + 180;

        const sway = Math.sin(t * s.swaySp + s.phase) * s.swayAmp;
        const bob = Math.sin(t * s.swaySp * 1.7 + s.phase * 1.7) * s.swayAmp * 0.28;
        const half = s.size * UNITS;

        ctx.save();
        ctx.translate(s.x + sway, s.y + bob);
        ctx.rotate(rot);
        ctx.globalAlpha = s.alpha * (0.35 + 0.65 * s.depth);
        ctx.drawImage(sprite, -half, -half, half * 2, half * 2);
        ctx.restore();
      }
      ctx.restore();
    },
  });
})();
