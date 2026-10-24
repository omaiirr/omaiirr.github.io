(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("ripples", {
      label: "Ripples",
      defaults: { frequency: 3, speed: 1, intensity: 60, color: "#0ea5e9" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      presetCombos: [
        { color: "#0ea5e9", bg: "#020617" }, 
        { color: "#22d3ee", bg: "#0a1a2e" }, 
        { color: "#a78bfa", bg: "#1e1b4b" }, 
        { color: "#34d399", bg: "#0a1a14" }, 
        { color: "#f472b6", bg: "#2a1222" }, 
        { color: "#e2e8f0", bg: "#0a1628" }, 
      ],
      options: [
        { key: "frequency", label: "Frequency", type: "range", min: 1, max: 8, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 2.5, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.rings = [];
        for (let i = 0; i < 6; i++) {
          state.rings.push({
            x: Math.random() * w, y: Math.random() * h,
            radius: 0, maxRadius: Math.min(w, h) * (0.2 + Math.random() * 0.3),
            life: Math.random(), wait: i * 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const freq = opts.frequency ?? 3;
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 60) / 100;
        const color = opts.color || "#0ea5e9";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.7)"; ctx.fillRect(0, 0, w, h);

        for (const r of state.rings) {
          r.wait -= dt * speed;
          if (r.wait > 0) continue;
          r.life += dt * speed * 0.3;
          r.radius = r.life * r.maxRadius;
          if (r.life > 1) {
            r.x = Math.random() * w; r.y = Math.random() * h;
            r.maxRadius = Math.min(w, h) * (0.2 + Math.random() * 0.3);
            r.life = 0; r.radius = 0;
          }

          const fade = (1 - r.life) * intensity;
          const ringWidth = Math.max(1, r.maxRadius * 0.08);

          ctx.globalAlpha = fade * 0.2;
          const glowGrad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius + ringWidth);
          glowGrad.addColorStop(0, "transparent");
          glowGrad.addColorStop(0.7, color);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + ringWidth, 0, Math.PI * 2); ctx.fill();

          ctx.globalAlpha = fade * 0.6;
          ctx.strokeStyle = color; ctx.lineWidth = ringWidth;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        if (state.rings.length < Math.floor(freq * 2)) {
          const needed = Math.ceil((Math.floor(freq * 2) - state.rings.length) * dt);
          for (let i = 0; i < needed; i++) {
            state.rings.push({
              x: Math.random() * w, y: Math.random() * h,
              radius: 0, maxRadius: Math.min(w, h) * (0.2 + Math.random() * 0.3),
              life: 0, wait: 0,
            });
          }
        }
        while (state.rings.length > Math.floor(freq * 2) + 3) {
          const oldest = state.rings.reduce((a, b) => a.life > b.life ? a : b);
          const idx = state.rings.indexOf(oldest);
          if (idx !== -1) state.rings.splice(idx, 1);
          else break;
        }
      },
    });
})();
