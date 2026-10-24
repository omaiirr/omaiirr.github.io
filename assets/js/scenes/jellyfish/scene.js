(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  ThemeScenes.register("jellyfish", {
    label: "Jellyfish",
    defaults: { density: 8, speed: 1, color: "#06b6d4" },
    presetBgColors: ["#020617", "#000000", "#0a0a2e", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#06b6d4", bg: "#020617" }, 
      { color: "#e879f9", bg: "#1a0a2e" }, 
      { color: "#fb7185", bg: "#2a0e1a" }, 
      { color: "#7dd3fc", bg: "#0a1628" }, 
      { color: "#5eead4", bg: "#04221b" }, 
      { color: "#fcd34d", bg: "#1a1508" }, 
    ],
    options: [
      { key: "density", label: "Jellyfish", type: "range", min: 3, max: 25, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const rgb = _hexToRgb(opts.color || "#06b6d4");
      state.groundY = h * 0.88;

      const bands = [
        { n: 0.5, size: 0.6, spd: 0.8, alpha: 0.5 },
        { n: 0.5, size: 1.0, spd: 1.1, alpha: 0.95 },
      ];
      state.jellies = [];
      const count = opts.density ?? 8;
      for (const band of bands) {
        const n = Math.max(1, Math.round(count * band.n));
        for (let i = 0; i < n; i++) {
          state.jellies.push({
            x: Math.random() * w,
            y: Math.random() * h,
            s: (10 + Math.random() * 8) * S * band.size,
            vy: -(6 + Math.random() * 10) * band.spd,
            pulseSp: 1.4 + Math.random() * 1.4,
            pulse: Math.random() * Math.PI * 2,
            waveSp: 2 + Math.random() * 2,
            ph: Math.random() * Math.PI * 2,
            tent: 4 + Math.floor(Math.random() * 3),
            rgb,
            alpha: band.alpha * (0.7 + Math.random() * 0.4),
          });
        }
      }

      state.rays = [];
      for (let i = 0; i < 4; i++) {
        state.rays.push({
          x: Math.random(),
          w: w * (0.05 + Math.random() * 0.07),
          ph: Math.random() * Math.PI * 2,
          a: 0.05 + Math.random() * 0.04,
        });
      }

      state.particles = [];
      for (let i = 0; i < 42; i++) {
        state.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (0.6 + Math.random() * 1.4) * S,
          sp: (4 + Math.random() * 10) * S,
          a: 0.08 + Math.random() * 0.2,
          ph: Math.random() * Math.PI * 2,
        });
      }

      state.seabed = [];
      for (let i = 0; i < 8; i++) {
        state.seabed.push({
          x: (i / 7) * w + (Math.random() - 0.5) * w * 0.06,
          r: h * (0.03 + Math.random() * 0.04),
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;
      const dtm = dt * speed;
      const S = state.S;
      const groundY = state.groundY;

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const water = ctx.createLinearGradient(0, 0, 0, h);
        water.addColorStop(0, "#041322");
        water.addColorStop(0.6, "#071a2e");
        water.addColorStop(1, "#081226");
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, w, h);
      }

      for (const r of state.rays) {
        const rx = r.x * w + Math.sin(t * 0.15 + r.ph) * w * 0.025;
        const ray = ctx.createLinearGradient(rx, 0, rx + r.w, h * 0.55);
        ray.addColorStop(0, _rgba(state.jellies[0]?.rgb || [103, 232, 249], r.a * (0.75 + 0.25 * Math.sin(t * 0.8 + r.ph * 3))));
        ray.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ray;
        ctx.save();
        ctx.translate(rx, 0);
        ctx.transform(1, 0, -0.35, 1, 0, 0);
        ctx.fillRect(-r.w, 0, r.w * 2, h * 0.55);
        ctx.restore();
      }

      for (const p of state.particles) {
        p.y -= p.sp * dtm;
        p.x += Math.sin(t * 0.5 + p.ph) * 3 * S * dtm;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        ctx.fillStyle = `rgba(190,205,255,${(p.a * (0.7 + 0.3 * Math.sin(t + p.ph))).toFixed(3)})`;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }

      for (const l of state.jellies) {
        l.y += l.vy * dtm;
        l.x += Math.sin(t * 0.3 + l.ph) * 8 * S * dtm;
        if (l.y < -l.s * 3) {
          l.y = h + l.s * 2;
          l.x = Math.random() * w;
        }
        const p = Math.sin(t * l.pulseSp + l.pulse);
        const ph = p >= 0 ? Math.pow(p, 0.55) : -Math.pow(-p, 1.7);
        const bw = l.s * (0.9 + 0.16 * ph);
        const bh = l.s * 0.78 * (1.15 - 0.25 * ph);
        if (ph > 0.35) l.y -= (ph - 0.35) * l.s * 1.4 * dtm;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const glow = ctx.createRadialGradient(l.x, l.y - bh * 0.25, 0, l.x, l.y - bh * 0.25, l.s * 1.7);
        glow.addColorStop(0, _rgba(l.rgb, 0.3 * l.alpha * (0.75 + 0.25 * ph)));
        glow.addColorStop(0.55, _rgba(l.rgb, 0.1 * l.alpha));
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(l.x - l.s * 1.7, l.y - bh - l.s, l.s * 3.4, l.s * 3.4);

        ctx.fillStyle = _rgba(l.rgb, 0.32 * l.alpha);
        ctx.beginPath();
        ctx.ellipse(l.x, l.y, bw, bh, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = _rgba([255, 255, 255], 0.4 * l.alpha);
        ctx.lineWidth = Math.max(0.8, l.s * 0.07);
        ctx.beginPath();
        ctx.ellipse(l.x, l.y, bw * 0.96, bh * 0.92, 0, Math.PI * 0.92, Math.PI * 0.08);
        ctx.stroke();
        ctx.strokeStyle = _rgba(l.rgb, 0.28 * l.alpha);
        ctx.lineWidth = Math.max(0.6, l.s * 0.05);
        for (let gx = -1; gx <= 1; gx += 2) {
          for (let gy = -1; gy <= 1; gy += 2) {
            ctx.beginPath();
            ctx.ellipse(l.x + gx * bw * 0.16, l.y - bh * 0.42 + gy * bh * 0.14, bw * 0.09, bh * 0.12, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();

        ctx.strokeStyle = _rgba(l.rgb, 0.38 * l.alpha);
        ctx.lineWidth = Math.max(0.7, l.s * 0.07);
        for (let ti = 0; ti < l.tent; ti++) {
          const tx0 = l.x + (l.tent === 1 ? 0 : (ti / (l.tent - 1) - 0.5) * bw * 1.5);
          const len = l.s * (1.7 + 0.6 * Math.sin(ti * 2.1 + l.ph));
          ctx.beginPath();
          ctx.moveTo(tx0, l.y + bh * 0.22);
          const segs = 5;
          for (let sgi = 1; sgi <= segs; sgi++) {
            const yy = l.y + bh * 0.22 + (len / segs) * sgi;
            const wave = Math.sin(t * l.waveSp + l.ph + sgi * 0.9 + ti * 1.7) * l.s * 0.24 * (sgi / segs);
            ctx.lineTo(tx0 + wave, yy);
          }
          ctx.stroke();
        }
      }

      const warm = state.jellies[0]?.rgb || [103, 232, 249];
      const glowLine = ctx.createLinearGradient(0, groundY - h * 0.06, 0, groundY);
      glowLine.addColorStop(0, _rgba(warm, 0.08));
      glowLine.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowLine;
      ctx.fillRect(0, groundY - h * 0.06, w, h * 0.06);
      ctx.fillStyle = "rgba(5,8,16,0.95)";
      for (const b of state.seabed) {
        ctx.beginPath();
        ctx.arc(b.x, groundY + b.r * 0.5, b.r, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillRect(0, groundY, w, h - groundY);

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
