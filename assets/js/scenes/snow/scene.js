(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  let _snowSpriteCache = null;
  ThemeScenes.register("snow", {
      label: "Snowfall",
      defaults: { density: 140, speed: 1, size: 2.4 },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1e293b", "#16213e", "#1a1a2e"],
      options: [
        { key: "density", label: "Flakes", type: "range", min: 30, max: 400, step: 10 },
        { key: "speed", label: "Fall Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "size", label: "Flake Size", type: "range", min: 0.5, max: 7, step: 0.1 },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 140;
        const size = opts.size ?? 2.4;
        state.S = h / 1080;
        state.t = 0;
        state.sprites = _snowSpriteCache || (_snowSpriteCache = _makeSnowSprites());
        state.flakes = [];
        for (let i = 0; i < count; i++) {
          state.flakes.push({
            x: Math.random() * w, y: Math.random() * h,
            s: (0.5 + Math.random() * 1.2) * size * state.S,
            vy: (Math.random() * 38 + 24) * (opts.speed ?? 1) * state.S,
            drift: Math.random() * 1 + 0.4,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.55 + 0.35,
            rot: Math.random() * Math.PI * 2,
            tw: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const bgColor = opts.bgColor || null;
        state.t += dt;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, "#0f1830"); bg.addColorStop(0.6, "#0a1020"); bg.addColorStop(1, "#060a14");
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        }
        for (const f of state.flakes) {
          f.y += f.vy * dt;
          f.x += Math.sin((f.phase += dt * f.drift * 2)) * 22 * (state.S ?? 1) * dt;
          if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
          if (f.x < -10) f.x = w + 10;
          if (f.x > w + 10) f.x = -10;
          f.rot += dt * (0.35 + f.s * 0.25);
          const tw = 0.8 + 0.2 * Math.sin(f.tw + state.t * 1.5);
          ctx.globalAlpha = f.alpha * tw;
          const d = f.s * 2;
          const level = f.s > 4 ? 3 : f.s > 2.6 ? 2 : f.s > 1.4 ? 1 : 0;
          const fi = Math.floor(f.rot * 2.55) % 16;
          ctx.drawImage(state.sprites[level][fi], f.x - d / 2, f.y - d / 2, d, d);
        }
        ctx.globalAlpha = 1;
      },
    });
})();
