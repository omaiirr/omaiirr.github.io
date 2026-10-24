(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("comets", {
      label: "Comets",
      defaults: { density: 30, speed: 1, color: "#f59e0b" },
      presetBgColors: ["#020617", "#000000", "#1e1b2e", "#0f172a", "#1a0a2e", "#0a0a1a"],
      presetCombos: [
        { color: "#f59e0b", bg: "#020617" }, 
        { color: "#22d3ee", bg: "#0a1628" }, 
        { color: "#f472b6", bg: "#1a0a2e" }, 
        { color: "#34d399", bg: "#0a1a14" }, 
        { color: "#e2e8f0", bg: "#0d1117" }, 
        { color: "#a78bfa", bg: "#1e1b4b" }, 
      ],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 30;
        state.comets = [];
        for (let i = 0; i < count; i++) {
          state.comets.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1),
            trail: [], maxTrail: Math.floor(Math.random() * 20 + 15),
            tailLen: Math.random() * 30 + 15,
            alpha: Math.random() * 0.4 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const density = opts.density ?? 30;
        const color = opts.color || "#f59e0b";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.75)"; ctx.fillRect(0, 0, w, h);

        for (const c of state.comets) {
          c.x += c.vx * speed * dt;
          c.y += c.vy * speed * dt;

          if (c.x < -50) { c.x = w + 50; resetComet(c, w, h, speed); }
          if (c.x > w + 50) { c.x = -50; resetComet(c, w, h, speed); }
          if (c.y < -50) { c.y = h + 50; resetComet(c, w, h, speed); }
          if (c.y > h + 50) { c.y = -50; resetComet(c, w, h, speed); }

          c.trail.push({ x: c.x, y: c.y });
          if (c.trail.length > c.maxTrail) c.trail.shift();

          const trailLen = c.trail.length;
          for (let i = 1; i < trailLen; i++) {
            const t = i / trailLen;
            ctx.globalAlpha = t * c.alpha * 0.5;
            ctx.strokeStyle = color;
            ctx.lineWidth = t * 3 + 0.5;
            ctx.beginPath(); ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
            ctx.lineTo(c.trail[i].x, c.trail[i].y); ctx.stroke();
          }

          if (trailLen > 2) {
            const tail = c.trail[trailLen - 1];
            const prev = c.trail[Math.max(0, trailLen - 5)];
            const gx = (tail.x + prev.x) / 2;
            const gy = (tail.y + prev.y) / 2;
            ctx.globalAlpha = c.alpha * 0.3;
            const glowGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 20);
            glowGrad.addColorStop(0, color); glowGrad.addColorStop(1, "transparent");
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(gx, gy, 20, 0, Math.PI * 2); ctx.fill();
          }

          ctx.globalAlpha = c.alpha * 0.9;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2); ctx.fill();

          ctx.globalAlpha = c.alpha * 0.4;
          const headGlow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 8);
          headGlow.addColorStop(0, color); headGlow.addColorStop(1, "transparent");
          ctx.fillStyle = headGlow;
          ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });
})();
