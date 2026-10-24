(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("rain", {
      label: "Rain",
      defaults: { density: 120, speed: 1.5, color: "#3b82f6" },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#16213e", "#0d1117"],
      presetCombos: [
        { color: "#3b82f6", bg: "#0f172a" }, 
        { color: "#22d3ee", bg: "#0a1628" }, 
        { color: "#94a3b8", bg: "#111827" }, 
        { color: "#a78bfa", bg: "#1a1a2e" }, 
        { color: "#14b8a6", bg: "#0a1a1a" }, 
        { color: "#e2e8f0", bg: "#000000" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 40, max: 250, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.5, max: 4, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 120;
        state.drops = [];
        for (let i = 0; i < count; i++) {
          state.drops.push({
            x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 18 + 8,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1.5),
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const color = opts.color || "#3b82f6";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(15, 23, 42, 0.65)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = "round";
        for (const d of state.drops) {
          d.y += d.speed * 400 * dt; d.x += d.speed * 40 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          if (d.x > w) d.x = 0;
          ctx.globalAlpha = 0.35 + (d.len / 26) * 0.4;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y + d.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    });
})();
