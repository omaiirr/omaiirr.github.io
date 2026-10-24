(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("particles", {
      label: "Particles",
      defaults: { density: 80, speed: 1, color: "#818cf8" },
      presetBgColors: ["#020617", "#1c1917", "#0a1a14", "#1e1b4b", "#111827", "#1a1208"],
      presetCombos: [
        { color: "#818cf8", bg: "#020617" }, 
        { color: "#fb923c", bg: "#1c1917" }, 
        { color: "#34d399", bg: "#0a1a14" }, 
        { color: "#f472b6", bg: "#1e1b4b" }, 
        { color: "#f8fafc", bg: "#111827" }, 
        { color: "#fbbf24", bg: "#1a1208" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 20, max: 160, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 80;
        state.particles = [];
        for (let i = 0; i < count; i++) {
          state.particles.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4 * (opts.speed ?? 1),
            vy: (Math.random() - 0.5) * 0.4 * (opts.speed ?? 1),
            r: Math.random() * 2 + 0.8, a: Math.random() * 0.5 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#818cf8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.55)";
        ctx.fillRect(0, 0, w, h);
        const pts = state.particles;
        for (const p of pts) {
          p.x += p.vx * speed * dt * 60;
          p.y += p.vy * speed * dt * 60;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        }
        const linkDist = Math.min(w, h) * 0.12;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d = Math.hypot(dx, dy);
            if (d < linkDist) {
              ctx.strokeStyle = color;
              ctx.globalAlpha = (1 - d / linkDist) * 0.25;
              ctx.lineWidth = 0.6;
              ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
        for (const p of pts) {
          ctx.fillStyle = color; ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });
})();
