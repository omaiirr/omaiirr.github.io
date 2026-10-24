(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("bubbles", {
      label: "Bubbles",
      defaults: { density: 40, speed: 1, color: "#6366f1" },
      presetBgColors: ["#020617", "#000000", "#1e1b4b", "#0f172a", "#1a0a2e", "#0d1117"],
      presetCombos: [
        { color: "#6366f1", bg: "#020617" }, 
        { color: "#22d3ee", bg: "#0a1a2e" }, 
        { color: "#f472b6", bg: "#1e1b4b" }, 
        { color: "#34d399", bg: "#0a1a14" }, 
        { color: "#fbbf24", bg: "#1a1208" }, 
        { color: "#e2e8f0", bg: "#0d1117" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 100, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 40;
        state.bubbles = [];
        for (let i = 0; i < count; i++) {
          state.bubbles.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 16 + 4,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 1.5 + 0.5,
            wobbleAmp: Math.random() * 20 + 5,
            alpha: Math.random() * 0.3 + 0.15,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1; const color = opts.color || "#6366f1";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.7)"; ctx.fillRect(0, 0, w, h);
        for (const b of state.bubbles) {
          b.wobble += b.wobbleSpeed * dt * 2;
          b.y -= b.speed * 60 * dt * speed;
          if (b.y + b.r < 0) { b.y = h + b.r; b.x = Math.random() * w; b.r = Math.random() * 16 + 4; }
          const cx = b.x + Math.sin(b.wobble) * b.wobbleAmp;
          const cy = b.y;
          const grad = ctx.createRadialGradient(cx - b.r * 0.3, cy - b.r * 0.3, 0, cx, cy, b.r);
          grad.addColorStop(0, `rgba(255,255,255,${b.alpha * 0.6})`);
          grad.addColorStop(0.5, color);
          ctx.globalAlpha = b.alpha; ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = b.alpha * 0.5;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.beginPath(); ctx.ellipse(cx - b.r * 0.25, cy - b.r * 0.25, b.r * 0.2, b.r * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = b.alpha * 0.3; ctx.strokeStyle = color; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    });
})();
