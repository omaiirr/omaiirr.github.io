(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  const PALETTE = ["#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#f87171", "#fb923c", "#e879f9"];
  const DEFAULT_COLOR = "#f472b6";

  ThemeScenes.register("balloon", {
    label: "Balloons",
    defaults: { density: 10, speed: 1, color: "#f472b6" },
    presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#f472b6", bg: "#020617" }, 
      { color: "#a78bfa", bg: "#1a0a2e" }, 
      { color: "#34d399", bg: "#0a1a0a" }, 
      { color: "#fbbf24", bg: "#1a1208" }, 
      { color: "#60a5fa", bg: "#0a1628" }, 
      { color: "#f87171", bg: "#1c0f0c" }, 
    ],
    options: [
      { key: "density", label: "Balloons", type: "range", min: 3, max: 25, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const count = Math.round(opts.density ?? 10);
      const solo = opts.color !== DEFAULT_COLOR ? opts.color : null;
      state.balloons = [];
      for (let i = 0; i < count; i++) {
        state.balloons.push({
          x: Math.random() * w,
          y: Math.random() * (h + h * 0.9) - h * 0.35,
          vy: -(Math.random() * 30 + 18) * S,
          vx: (Math.random() - 0.5) * 8 * S,
          size: (Math.random() * 14 + 10) * S,
          color: solo || PALETTE[Math.floor(Math.random() * PALETTE.length)],
          wobble: Math.random() * Math.PI * 2,
          wobbleSp: Math.random() * 1.5 + 0.5,
          wobbleAmp: (Math.random() * 8 + 4) * S,
          stringLen: Math.random() * 0.8 + 1.5,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const dtm = dt * speed;

      ctx.clearRect(0, 0, w, h);
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#01030f");
        sky.addColorStop(0.55, "#020617");
        sky.addColorStop(1, "#0b0f22");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      for (const b of state.balloons) {
        b.y += b.vy * dtm;
        b.wobble += b.wobbleSp * dtm;
        b.x += (b.vx + Math.sin(b.wobble) * b.wobbleAmp) * dtm;
        if (b.y < -b.size * 3) {
          b.y = h + b.size * 3;
          b.x = Math.random() * w;
        }
        const bx = b.x, by = b.y, sz = b.size;
        const rgb = _hexToRgb(b.color);

        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = Math.max(0.6, 0.7 * state.S);
        ctx.beginPath();
        ctx.moveTo(bx, by + sz * 0.95);
        const strLen = sz * b.stringLen;
        ctx.bezierCurveTo(
          bx + Math.sin(b.wobble) * 4, by + sz * 0.95 + strLen * 0.3,
          bx - Math.sin(b.wobble * 0.7) * 3, by + sz * 0.95 + strLen * 0.7,
          bx + Math.sin(b.wobble * 0.5) * 2, by + sz * 0.95 + strLen
        );
        ctx.stroke();

        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(bx + 4, by + 5, sz * 0.55, sz * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        const bgGrad = ctx.createRadialGradient(bx - sz * 0.25, by - sz * 0.3, 0, bx, by, sz);
        bgGrad.addColorStop(0, _rgba([Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)], 0.92));
        bgGrad.addColorStop(0.4, _rgba(rgb, 0.92));
        bgGrad.addColorStop(1, _rgba([Math.max(0, rgb[0] - 40), Math.max(0, rgb[1] - 40), Math.max(0, rgb[2] - 40)], 0.88));
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.ellipse(bx, by, sz * 0.7, sz, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.2, by - sz * 0.3, sz * 0.15, sz * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.1, by + sz * 0.1, sz * 0.08, sz * 0.12, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(bx - 2, by + sz * 0.93);
        ctx.lineTo(bx, by + sz * 1.08);
        ctx.lineTo(bx + 2, by + sz * 0.93);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.4, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
