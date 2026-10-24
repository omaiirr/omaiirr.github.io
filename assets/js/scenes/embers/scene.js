(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("embers", {
      label: "Embers",
      defaults: { density: 35, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#1c1917", "#1a0f0a", "#1e0a0a", "#0f0a0a"],
      presetCombos: [
        { color: "#f97316", bg: "#020617" }, 
        { color: "#fbbf24", bg: "#1a0f0a" }, 
        { color: "#ef4444", bg: "#1e0a0a" }, 
        { color: "#a855f7", bg: "#1a0a24" }, 
        { color: "#34d399", bg: "#06170f" }, 
        { color: "#38bdf8", bg: "#0a1628" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 35;
        state.embers = [];
        for (let i = 0; i < count; i++) {
          state.embers.push({
            x: w * (0.05 + Math.random() * 0.9),
            y: h - Math.random() * h * 0.2,
            r: Math.random() * 3 + 1,
            speed: (Math.random() * 0.4 + 0.3) * (opts.speed ?? 1),
            drift: (Math.random() - 0.5) * 20,
            life: Math.random() * 0.7,
            lifeSpeed: Math.random() * 0.3 + 0.15,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1; const color = opts.color || "#f97316";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.75)"; ctx.fillRect(0, 0, w, h);
        for (const e of state.embers) {
          e.life += e.lifeSpeed * dt * speed;
          if (e.life > 1) {
            e.life = 0; e.x = w * (0.1 + Math.random() * 0.8); e.y = h;
            e.r = Math.random() * 3 + 1; e.drift = (Math.random() - 0.5) * 20;
          }
          e.y -= e.speed * 80 * dt * speed;
          e.x += Math.sin(e.life * Math.PI * 4) * e.drift * dt;
          const fadeOut = 1 - e.life;
          const brightness = fadeOut * (0.8 + 0.2 * Math.sin(e.life * Math.PI * 6));
          ctx.globalAlpha = Math.max(0, brightness * 0.7);
          const glowGrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 6);
          glowGrad.addColorStop(0, color); glowGrad.addColorStop(0.3, color); glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = Math.max(0, brightness * 0.9); ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = Math.max(0, brightness * 0.8); ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });
})();
