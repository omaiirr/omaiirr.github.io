(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("starfield", {
      label: "Starfield",
      defaults: { density: 80, twinkle: 1, color: "#fde68a" },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a1a2e", "#050510"],
      presetCombos: [
        { color: "#fde68a", bg: "#020617" }, 
        { color: "#f8fafc", bg: "#0a0e27" }, 
        { color: "#bfdbfe", bg: "#050510" }, 
        { color: "#f9a8d4", bg: "#1a0a2e" }, 
        { color: "#a7f3d0", bg: "#0a1a1a" }, 
        { color: "#fbbf24", bg: "#1a1208" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 20, max: 200, step: 10 },
        { key: "twinkle", label: "Twinkle", type: "range", min: 0.1, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 80;
        const base = _hexToRgb(opts.color || "#dfe9ff");
        const WARM = [255, 236, 208];
        const COOL = [204, 222, 255];
        state.stars = [];
        for (let i = 0; i < count; i++) {
          const roll = Math.random();
          const toward = roll < 0.42 ? COOL : roll > 0.74 ? WARM : null;
          const lean = 0.22 + Math.random() * 0.3;
          const col = toward
            ? base.map((v, k) => Math.round(v + (toward[k] - v) * lean))
            : base;
          state.stars.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.8 + 0.4,
            col: `rgb(${col[0]},${col[1]},${col[2]})`,
            core: `rgb(${Math.min(255, col[0] + 26)},${Math.min(255, col[1] + 24)},${Math.min(255, col[2] + 20)})`,
            phase: Math.random() * Math.PI * 2, speed: Math.random() * 1.5 + 0.5,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const twinkle = opts.twinkle ?? 1;
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)"; ctx.fillRect(0, 0, w, h);
        for (const s of state.stars) {
          s.phase += s.speed * dt * twinkle;
          const brightness = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase));
          ctx.globalAlpha = brightness; ctx.fillStyle = s.col || "#dfe9ff";
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
          if (s.r > 1.2 && brightness > 0.7) {
            ctx.globalAlpha = brightness * 0.15;
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
            g.addColorStop(0, s.core || s.col || "#dfe9ff"); g.addColorStop(1, "transparent");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    });
})();
