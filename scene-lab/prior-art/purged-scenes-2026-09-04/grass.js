// grass — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const grass = {
      label: "Long Grass",
      defaults: { density: 120, speed: 1, wind: 70, height: 100 },
      presetBgColors: ["#020617", "#030b06", "#000000", "#06210f", "#0a2a14", "#04151d"],
      options: [
        { key: "density", label: "Stalks", type: "range", min: 10, max: 340, step: 5 },
        { key: "height", label: "Grass Height", type: "range", min: 30, max: 220, step: 10 },
        { key: "wind", label: "Wind", type: "range", min: 10, max: 100, step: 5 },
        { key: "speed", label: "Sway Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 120;
        const hMul = (opts.height ?? 100) / 100;
        state.t = 0;
        const bands = [
          { n: Math.round(count * 0.45), hMin: 0.3, hMax: 0.5, aMin: 0.4, aMax: 0.6, wMin: 2.2, wMax: 3.6, tone: 28 },
          { n: Math.round(count * 0.35), hMin: 0.5, hMax: 0.78, aMin: 0.6, aMax: 0.8, wMin: 2.8, wMax: 4.6, tone: 42 },
          { n: Math.round(count * 0.2), hMin: 0.78, hMax: 1.05, aMin: 0.8, aMax: 0.98, wMin: 3.4, wMax: 5.6, tone: 52 },
        ];
        state.blades = [];
        for (const bd of bands) {
          for (let i = 0; i < bd.n; i++) {
            const x = Math.random() * w;
            const baseY = h + 2 + Math.random() * 8;
            const len = (bd.hMin + Math.random() * (bd.hMax - bd.hMin)) * h * 0.78 * hMul;
            const tone = bd.tone + Math.random() * 16 - 8;
            const hue = 122 + tone * 0.12;
            const bw = bd.wMin + Math.random() * (bd.wMax - bd.wMin);
            state.blades.push({
              x, baseY, len,
              lean: (Math.random() - 0.5) * 1.3,
              bend: Math.random() * 0.5 + 0.5,
              phase: Math.random() * Math.PI * 2,
              sp: Math.random() * 1.2 + 0.6,
              hue, tone, bw,
              alpha: bd.aMin + Math.random() * (bd.aMax - bd.aMin),
            });
          }
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const wind = (opts.wind ?? 70) / 100;
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        // sky gradient
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        if (bgColor) {
          bg.addColorStop(0, bgColor); bg.addColorStop(1, "#071410");
        } else {
          bg.addColorStop(0, "#04070d"); bg.addColorStop(0.6, "#071410"); bg.addColorStop(1, "#0c2a16");
        }
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        // moonlight glow at ground
        const groundGlow = ctx.createLinearGradient(0, h * 0.55, 0, h);
        groundGlow.addColorStop(0, 'rgba(150, 215, 170, 0)');
        groundGlow.addColorStop(1, 'rgba(150, 215, 170, 0.14)');
        ctx.fillStyle = groundGlow; ctx.fillRect(0, h * 0.55, w, h * 0.45);
        // draw blades
        for (const b of state.blades) {
          const sway = Math.sin(state.t * b.sp + b.phase) * wind * b.lean * 30;
          const gust = Math.sin(state.t * 0.7 + b.x * 0.003) * wind * 15;
          const tipX = b.x + sway + gust;
          const tipY = b.baseY - b.len;
          const midX = b.x + (tipX - b.x) * 0.5 + sway * 0.3;
          const midY = b.baseY - b.len * 0.5;
          const hue = b.hue;
          const grad = ctx.createLinearGradient(0, b.baseY, 0, tipY);
          grad.addColorStop(0, `hsla(${hue}, 62%, ${12 + b.tone * 0.16}%, ${b.alpha})`);
          grad.addColorStop(0.55, `hsla(${hue + 6}, 68%, ${24 + b.tone * 0.2}%, ${b.alpha})`);
          grad.addColorStop(1, `hsla(${hue + 12}, 66%, ${44 + b.tone * 0.22}%, ${b.alpha * 0.85})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = b.bw;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(b.x, b.baseY);
          ctx.quadraticCurveTo(midX, midY, tipX, tipY);
          ctx.stroke();
        }
      },
    };
