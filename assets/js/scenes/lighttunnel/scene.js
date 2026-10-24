(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  ThemeScenes.register("lighttunnel", {
    label: "Light Tunnel",
    hidden: true,
    defaults: { density: 12, speed: 1, color: "#60a5fa", scale: 1 },
    presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#60a5fa", bg: "#020617" }, 
      { color: "#fbbf24", bg: "#0a0e27" }, 
      { color: "#a78bfa", bg: "#1a0a2e" }, 
      { color: "#22d3ee", bg: "#0a1a2e" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
      { color: "#e2e8f0", bg: "#050510" }, 
    ],
    options: [
      { key: "density", label: "Rays", type: "range", min: 4, max: 30, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
      { key: "color", label: "Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      state.dust = [];
      for (let i = 0; i < 60; i++) {
        state.dust.push({
          a: Math.random() * Math.PI * 2,
          d: Math.random(),
          speed: Math.random() * 0.3 + 0.1,
          size: (Math.random() * 1.5 + 0.3) * S,
          bright: Math.random(),
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const rayCount = Math.round(opts.density ?? 12);
      const color = opts.color || "#60a5fa";
      const bgColor = opts.bgColor || null;
      const sc = opts.scale ?? 1;
      state.t += dt;
      const t = state.t * speed;
      const dtm = dt * speed;
      const S = state.S;
      const rgb = _hexToRgb(color);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bgColor || "#020617";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5, cy = h * 0.35;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      haze.addColorStop(0, _rgba(rgb, 0.09));
      haze.addColorStop(0.5, _rgba(rgb, 0.03));
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < rayCount; i++) {
        const f = i / Math.max(1, rayCount);
        const baseAngle = f * Math.PI * 0.8 + Math.PI * 0.1;
        const sway = Math.sin(t * 0.15 + i * 1.7) * 0.04;
        const angle = baseAngle + sway;
        const rayLen = Math.max(w, h) * (0.8 + 0.3 * Math.sin(t * 0.3 + i));
        const x1 = cx + Math.cos(angle) * rayLen;
        const y1 = cy + Math.sin(angle) * rayLen;
        const baseWidth = (18 + 12 * Math.sin(i * 2.3)) * sc * S;
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.1);
        ctx.globalAlpha = 0.04 + 0.03 * flicker;
        const g = ctx.createLinearGradient(cx, cy, x1, y1);
        g.addColorStop(0, _rgba(rgb, 0.7));
        g.addColorStop(0.3, _rgba(rgb, 0.25));
        g.addColorStop(0.7, _rgba(rgb, 0.08));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        const perpX = -Math.sin(angle), perpY = Math.cos(angle);
        const hw0 = baseWidth * 1.5, hw1 = baseWidth * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + perpX * hw0, cy + perpY * hw0);
        ctx.lineTo(x1 + perpX * hw1, y1 + perpY * hw1);
        ctx.lineTo(x1 - perpX * hw1, y1 - perpY * hw1);
        ctx.lineTo(cx - perpX * hw0, cy - perpY * hw0);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalCompositeOperation = "screen";
      for (const m of state.dust) {
        m.d += m.speed * dtm * 0.15;
        if (m.d > 1) {
          m.d = 0;
          m.a = Math.random() * Math.PI * 2;
        }
        const dist = m.d * Math.max(w, h) * 0.55;
        const dx = cx + Math.cos(m.a + t * 0.05) * dist;
        const dy = cy + Math.sin(m.a + t * 0.05) * dist * 0.8;
        const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + m.bright * 10));
        ctx.globalAlpha = glow * 0.5;
        const mg = ctx.createRadialGradient(dx, dy, 0, dx, dy, m.size * 3);
        mg.addColorStop(0, `rgba(255,255,255,${glow})`);
        mg.addColorStop(0.5, _rgba(rgb, glow * 0.4));
        mg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(dx, dy, m.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";

      ctx.globalAlpha = 0.5 + 0.15 * Math.sin(t * 1.2);
      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25 * sc * S);
      sg.addColorStop(0, "rgba(255,255,255,0.95)");
      sg.addColorStop(0.3, _rgba(rgb, 0.5));
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(cx, cy, 25 * sc * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      const vig = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.72);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
