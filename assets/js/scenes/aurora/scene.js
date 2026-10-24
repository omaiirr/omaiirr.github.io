(() => {
  const { _hexToRgb, _mixHex, _makeSnowSprites, resetComet } = ThemeScenes.__helpers;
  ThemeScenes.register("aurora", {
      label: "Aurora",
      defaults: { speed: 1, intensity: 70, hue: 150, scale: 1, curtains: false },
      presetBgColors: ["#020617", "#000000", "#0a0f1a", "#0f172a", "#1a0a2e", "#0a1a1a"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "hue", label: "Hue", type: "range", min: 80, max: 280, step: 5 },
        { key: "scale", label: "Size", type: "range", min: 0.3, max: 2, step: 0.1 },
        { key: "curtains", label: "Curtain Style", type: "checkbox" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 70) / 100;
        const hue = opts.hue ?? 150;
        const scale = opts.scale ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, '#020617'); bg.addColorStop(1, '#0f172a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        }
        if (opts.curtains) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const sheets = 5;
          for (let i = 0; i < sheets; i++) {
            const cx0 = w * (0.05 + i * 0.2) + Math.sin(state.t * (0.15 + i * 0.07) + i * 2.4) * w * 0.025;
            const cw0 = w * (0.15 + 0.05 * Math.sin(i * 1.7)) * scale;
            const hue1 = hue + i * 18 - 30;
            const alpha = Math.max(0.05, (0.3 + 0.2 * Math.sin(state.t * (0.4 + i * 0.11) + i * 1.3)) * intensity);
            const foldAmp = h * 0.06 * (0.7 + i * 0.1);
            const foldSp = 1.1 + i * 0.28;
            const baseY = h * (0.16 + i * 0.03) + Math.sin(state.t * 0.5 + i) * h * 0.015;
            const x0 = cx0 - cw0 / 2, x1 = cx0 + cw0 / 2;
            const bendAt = (x) => Math.sin(x * 0.02 + state.t * foldSp) * foldAmp + Math.sin(x * 0.007 - state.t * (0.5 + i * 0.05)) * h * 0.02;
            for (let x = x0; x <= x1; x += 3) {
              const t = (x - x0) / (x1 - x0);
              const bot = baseY + bendAt(x) + t * h * 0.06;
              const rayLen = h * (0.32 + t * 0.1);
              const g = ctx.createLinearGradient(0, bot - rayLen, 0, bot);
              g.addColorStop(0, 'rgba(0,0,0,0)');
              g.addColorStop(0.62, `hsla(${hue1}, 85%, ${52 + t * 8}%, ${alpha * 0.3})`);
              g.addColorStop(1, `hsla(${hue1}, 90%, ${60 + t * 8}%, ${alpha})`);
              ctx.strokeStyle = g; ctx.lineWidth = 2.2;
              ctx.beginPath(); ctx.moveTo(x, bot - rayLen); ctx.lineTo(x, bot); ctx.stroke();
            }
            ctx.beginPath();
            for (let x = x0; x <= x1; x += 2) {
              const bot = baseY + bendAt(x) + ((x - x0) / (x1 - x0)) * h * 0.06;
              if (x === x0) ctx.moveTo(x, bot); else ctx.lineTo(x, bot);
            }
            ctx.strokeStyle = `hsla(${hue1 + 8}, 95%, ${68 + i * 2}%, ${Math.min(1, alpha * 1.6)})`;
            ctx.lineWidth = 1.6; ctx.stroke();
            const glowY = baseY + bendAt(x0);
            const glow = ctx.createLinearGradient(0, glowY, 0, glowY + h * 0.16);
            glow.addColorStop(0, `hsla(${hue1}, 85%, 60%, ${alpha * 0.5})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x0, glowY, x1 - x0, h * 0.16);
          }
          ctx.restore();
        } else {
          const bands = 4;
          const bandSpread = 0.12 * scale;
          const amp = h * 0.06 * scale;
          const amp2 = h * 0.03 * scale;
          for (let b = 0; b < bands; b++) {
            ctx.beginPath();
            const baseY = h * (0.2 + b * bandSpread);
            for (let x = 0; x <= w; x += 4) {
              const wave = Math.sin(x * 0.004 + state.t * (1.2 + b * 0.3)) * amp + Math.sin(x * 0.009 - state.t * 0.8) * amp2;
              const y = baseY + wave;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
            const g = ctx.createLinearGradient(0, baseY - h * 0.1 * scale, 0, h);
            const h1 = hue + b * 25;
            g.addColorStop(0, `hsla(${h1}, 80%, 55%, ${0.35 * intensity})`);
            g.addColorStop(0.5, `hsla(${h1 + 40}, 70%, 45%, ${0.2 * intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.fill();
          }
        }
      },
    });
})();
