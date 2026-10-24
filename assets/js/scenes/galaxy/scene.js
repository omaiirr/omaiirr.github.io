(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("galaxy", {
      label: "Galaxy",
      defaults: { density: 120, speed: 0.8, color: "#8b5cf6" },
      presetBgColors: ["#0f0a1a", "#020617", "#000000", "#1a0a2e", "#0a0015", "#1a0a1a"],
      presetCombos: [
        { color: "#8b5cf6", bg: "#0f0a1a" }, 
        { color: "#f472b6", bg: "#1a0a2e" }, 
        { color: "#7dd3fc", bg: "#0a1628" }, 
        { color: "#fbbf24", bg: "#1a1208" }, 
        { color: "#34d399", bg: "#06170f" }, 
        { color: "#e2e8f0", bg: "#000000" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 40, max: 250, step: 10 },
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2.5, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 120;
        const color = opts.color || "#8b5cf6";
        state.t = 0;
        state.stars = [];
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        for (let i = 0; i < count; i++) {
          const dist = Math.random() * maxR;
          const angle = Math.random() * Math.PI * 2;
          const armOffset = Math.sin(dist * 0.08) * 0.5;
          const spread = (1 - dist / maxR) * 0.15 + 0.05;
          state.stars.push({
            dist: dist,
            angle: angle + armOffset,
            r: Math.random() * 1.5 + 0.3 + (1 - dist / maxR) * 1.5,
            brightness: 0.3 + Math.random() * 0.7 * (1 - dist / maxR),
            coreOffset: (Math.random() - 0.5) * spread,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.8;
        const color = opts.color || "#8b5cf6";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.7);
          bg.addColorStop(0, "#0f0a1a");
          bg.addColorStop(1, "#020617");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
        }

        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        const [r, g, b] = _hexToRgb(color || "#8b5cf6");

        for (const s of state.stars) {
          const armAngle = s.angle + state.t * (1 - s.dist / maxR * 0.6);
          const x = cx + Math.cos(armAngle) * (s.dist + s.coreOffset * 10);
          const y = cy + Math.sin(armAngle) * (s.dist + s.coreOffset * 10);

          const t = s.dist / maxR;
          const fadeEdge = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
          const alpha = s.brightness * fadeEdge * 0.9;

          const blend = t;
          const cr = Math.round(r * (1 - blend * 0.3));
          const cg = Math.round(g * (1 - blend * 0.2));
          const cb = Math.round(b + blend * 40);
          const starColor = `rgb(${cr},${cg},${cb})`;

          ctx.globalAlpha = alpha * 0.12;
          const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, s.r * 8);
          glowGrad.addColorStop(0, starColor);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath(); ctx.arc(x, y, s.r * 8, 0, Math.PI * 2); ctx.fill();

          ctx.globalAlpha = alpha;
          ctx.fillStyle = starColor;
          ctx.beginPath(); ctx.arc(x, y, s.r * 0.6, 0, Math.PI * 2); ctx.fill();

          if (s.r > 1) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.beginPath(); ctx.arc(x, y, s.r * 0.25, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
        coreGrad.addColorStop(0, "rgba(255,255,255,0.12)");
        coreGrad.addColorStop(0.5, `${color}33`);
        coreGrad.addColorStop(1, "transparent");
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2); ctx.fill();
      },
    });
})();
