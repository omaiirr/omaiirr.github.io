(() => {
  ThemeScenes.register("grass", {
    label: "Long Grass",
    defaults: { density: 360, speed: 1, wind: 70, height: 100, tussocks: true },
    presetBgColors: ["#020617", "#030b06", "#000000", "#06210f", "#0a2a14", "#04151d"],
    options: [
      { key: "tussocks", label: "Clumped Growth", type: "checkbox" },
      { key: "density", label: "Stalks", type: "range", min: 10, max: 460, step: 5 },
      { key: "height", label: "Grass Height", type: "range", min: 30, max: 220, step: 10 },
      { key: "wind", label: "Wind", type: "range", min: 10, max: 100, step: 5 },
      { key: "speed", label: "Sway Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      const count = Math.round(opts.density ?? 360);
      const hMul = (opts.height ?? 100) / 100;
      const rnd = Math.random;
      const wf = w / 900 + h / 1500;
      const bands = [
        { n: 0.36, hMin: 0.34, hMax: 0.5, aMin: 0.42, aMax: 0.65, wMin: 1.0, wMax: 1.7, sway: 0.75, tone: 20 },
        { n: 0.34, hMin: 0.5, hMax: 0.74, aMin: 0.58, aMax: 0.8, wMin: 1.8, wMax: 2.9, sway: 1.0, tone: 30 },
        { n: 0.3, hMin: 0.74, hMax: 1.06, aMin: 0.7, aMax: 0.95, wMin: 2.8, wMax: 4.4, sway: 1.3, tone: 40 },
      ];
      const tuftCenters = [];
      if (opts.tussocks !== false && count > 12) {
        const nTuft = Math.max(2, Math.min(48, Math.round((count * 0.75) / 30)));
        const slot = w / nTuft;
        for (let i = 0; i < nTuft; i++) {
          tuftCenters.push((i + 0.5 + (rnd() - 0.5) * 0.6) * slot);
        }
      }
      state.blades = [];
      const makeBlade = (x, bd) => {
        const len = (bd.hMin + rnd() * (bd.hMax - bd.hMin)) * h * 0.62 * hMul;
        const tone = bd.tone + rnd() * 14 - 7;
        const hue = 124 + (tone - 34) * 0.4;
        const a = bd.aMin + rnd() * (bd.aMax - bd.aMin);
        const cols = [
          `hsla(${hue.toFixed(1)}, 55%, ${(7 + tone * 0.1).toFixed(1)}%, ${a.toFixed(3)})`,
          `hsla(${(hue + 6).toFixed(1)}, 62%, ${(16 + tone * 0.18).toFixed(1)}%, ${(a * 0.95).toFixed(3)})`,
          `hsla(${(hue + 12).toFixed(1)}, 60%, ${(34 + tone * 0.24).toFixed(1)}%, ${(a * 0.88).toFixed(3)})`,
        ];
        state.blades.push({
          x,
          baseY: h + 2 + rnd() * 6,
          len,
          lean: (rnd() - 0.5) * 1.9,
          reach: 0.14 + rnd() * 0.24,
          curve: 0.6 + rnd() * 0.32,
          phase: rnd() * Math.PI * 2,
          sp: 0.5 + rnd() * 1.1,
          gustPh: rnd() * Math.PI * 2,
          tone,
          bw: (bd.wMin + rnd() * (bd.wMax - bd.wMin)) * wf,
          cols,
          grad: null,
          sway: bd.sway * (0.7 + rnd() * 0.6),
        });
      };
      for (const bd of bands) {
        const n = Math.max(1, Math.round(count * bd.n));
        if (tuftCenters.length === 0) {
          const slot = w / n;
          for (let i = 0; i < n; i++) {
            makeBlade((i + 0.5 + (rnd() - 0.5) * 0.72) * slot, bd);
          }
        } else {
          const nTuft = tuftCenters.length;
          const slot = w / nTuft;
          const nFiller = Math.max(1, Math.round(n * 0.25));
          const nTufted = n - nFiller;
          for (let i = 0; i < nTufted; i++) {
            const cx = tuftCenters[(rnd() * nTuft) | 0];
            const spread = slot * (rnd() < 0.28 ? 0.85 : 0.42);
            makeBlade(cx + (rnd() + rnd() - 1) * spread, bd);
          }
          const slotF = w / nFiller;
          for (let i = 0; i < nFiller; i++) {
            makeBlade((i + 0.5 + (rnd() - 0.5) * 0.9) * slotF, bd);
          }
        }
      }
      state.maxLen = h * 0.62 * hMul;
    },

    draw(ctx, w, h, state, opts, dt) {
      const wind = (opts.wind ?? 70) / 100;
      const speed = opts.speed ?? 1;
      const hMul = (opts.height ?? 100) / 100;
      const bgColor = opts.bgColor || null;
      state.t += dt * speed;
      const t = state.t;

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#04070d");
        sky.addColorStop(0.55, "#06120e");
        sky.addColorStop(0.82, "#0b2315");
        sky.addColorStop(1, "#12351d");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }
      if (!state.stars) {
        state.stars = [];
        const n = Math.round((w * h) / 42000);
        for (let i = 0; i < n; i++) {
          state.stars.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.28,
            r: 0.4 + Math.random() * 0.9,
            a: 0.15 + Math.random() * 0.3,
            tw: Math.random() * Math.PI * 2,
            sp: 0.5 + Math.random() * 1.2,
          });
        }
      }
      ctx.fillStyle = "#dceac8";
      for (const s of state.stars) {
        ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t * s.sp + s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const gl = ctx.createLinearGradient(0, h * 0.4, 0, h);
      gl.addColorStop(0, "rgba(138,206,158,0)");
      gl.addColorStop(0.7, "rgba(138,206,158,0.06)");
      gl.addColorStop(1, "rgba(138,206,158,0.12)");
      ctx.fillStyle = gl;
      ctx.fillRect(0, h * 0.4, w, h * 0.6);

      const gustK = (Math.PI * 2) / (w * 0.62);
      const gustSp = 1.15 * (0.6 + wind * 0.8);
      const gust = (x, ph) => Math.sin(x * gustK - t * gustSp + ph);
      const windAmp = 26 * wind + 5; 
      const maxLen = state.maxLen;
      const SEG = 7;
      const lx = new Array(SEG + 1), ly = new Array(SEG + 1);
      const rx = new Array(SEG + 1), ry = new Array(SEG + 1);
      for (const b of state.blades) {
        const pers = Math.sin(t * b.sp + b.phase) * 0.6 + Math.sin(t * b.sp * 0.6 + b.phase * 1.7) * 0.4;
        const g = gust(b.x, b.gustPh);
        const amt = (pers * 0.45 + g * 0.55) * b.sway * windAmp * (b.len / maxLen);
        const p0x = b.x, p0y = b.baseY;
        const p1x = b.x + b.lean * b.len * 0.18 + amt * 0.55;
        const p1y = b.baseY - b.len * b.curve;
        const p2x = b.x + b.lean * b.reach * b.len + amt;
        const p2y = b.baseY - b.len;
        if (!b.grad) {
          b.grad = ctx.createLinearGradient(0, b.baseY, 0, p2y);
          b.grad.addColorStop(0, b.cols[0]);
          b.grad.addColorStop(0.55, b.cols[1]);
          b.grad.addColorStop(1, b.cols[2]);
        }
        const half0 = b.bw * 0.5;
        let bx = p0x, by = p0y;
        lx[0] = bx; ly[0] = by;
        rx[0] = bx; ry[0] = by;
        for (let k = 1; k <= SEG; k++) {
          const u = k / SEG;
          const m = 1 - u;
          bx = m * m * p0x + 2 * m * u * p1x + u * u * p2x;
          by = m * m * p0y + 2 * m * u * p1y + u * u * p2y;
          const dx = 2 * m * (p1x - p0x) + 2 * u * (p2x - p1x);
          const dy = 2 * m * (p1y - p0y) + 2 * u * (p2y - p1y);
          const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1e-6);
          const half = half0 * (1 - u);
          const nx = -dy * inv * half;
          const ny = dx * inv * half;
          lx[k] = bx + nx; ly[k] = by + ny;
          rx[k] = bx - nx; ry[k] = by - ny;
        }
        ctx.fillStyle = b.grad;
        ctx.beginPath();
        ctx.moveTo(lx[0], ly[0]);
        for (let k = 1; k <= SEG; k++) ctx.lineTo(lx[k], ly[k]);
        for (let k = SEG - 1; k >= 0; k--) ctx.lineTo(rx[k], ry[k]);
        ctx.closePath();
        ctx.fill();
      }

      const ground = ctx.createLinearGradient(0, h * 0.82, 0, h);
      ground.addColorStop(0, "rgba(2,22,8,0)");
      ground.addColorStop(1, "rgba(2,34,12,0.6)");
      ctx.fillStyle = ground;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);

      const vig = ctx.createRadialGradient(
        w / 2, h * 0.42, Math.min(w, h) * 0.4,
        w / 2, h * 0.5, Math.max(w, h) * 0.85,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.36)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
