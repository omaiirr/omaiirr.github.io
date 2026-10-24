// balloon — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const balloon = {
      label: "Balloons",
      defaults: { density: 10, speed: 1, color: "#f472b6" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Balloons", type: "range", min: 3, max: 25, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 10;
        const palette = ['#f472b6','#a78bfa','#34d399','#fbbf24','#60a5fa','#f87171','#fb923c','#e879f9'];
        state.t = 0; state.balloons = [];
        for (let i = 0; i < count; i++) {
          state.balloons.push({
            x: Math.random() * w,
            y: h + Math.random() * h * 0.8,
            vy: -(Math.random() * 25 + 12),
            vx: (Math.random() - 0.5) * 8,
            size: Math.random() * 14 + 10,
            color: opts.color !== '#f472b6' ? opts.color : palette[Math.floor(Math.random() * palette.length)],
            wobble: Math.random() * Math.PI * 2,
            wobbleSp: Math.random() * 1.5 + 0.5,
            wobbleAmp: Math.random() * 8 + 4,
            stringLen: Math.random() * 0.8 + 1.5,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);
        const [pr, pg, pb] = opts.color !== '#f472b6' ? _hexToRgb(opts.color) : [244, 114, 182];
        for (const b of state.balloons) {
          b.y += b.vy * dt * speed;
          b.wobble += b.wobbleSp * dt;
          b.x += b.vx * dt + Math.sin(b.wobble) * b.wobbleAmp * dt;
          if (b.y < -b.size * 3) { b.y = h + b.size * 3; b.x = Math.random() * w; }
          const bx = b.x, by = b.y, sz = b.size;
          // string with wavy curve
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(bx, by + sz * 0.95);
          const strLen = sz * b.stringLen;
          ctx.bezierCurveTo(
            bx + Math.sin(b.wobble) * 4, by + sz * 0.95 + strLen * 0.3,
            bx - Math.sin(b.wobble * 0.7) * 3, by + sz * 0.95 + strLen * 0.7,
            bx + Math.sin(b.wobble * 0.5) * 2, by + sz * 0.95 + strLen
          );
          ctx.stroke();
          // balloon shadow (below and offset)
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(bx + 4, by + 5, sz * 0.55, sz * 0.8, 0, 0, Math.PI * 2); ctx.fill();
          // balloon body
          const [br, bg2, bb] = _hexToRgb(b.color);
          const bgGrad = ctx.createRadialGradient(bx - sz * 0.25, by - sz * 0.3, 0, bx, by, sz);
          bgGrad.addColorStop(0, `rgba(${Math.min(255, br + 80)},${Math.min(255, bg2 + 80)},${Math.min(255, bb + 80)},0.9)`);
          bgGrad.addColorStop(0.4, b.color);
          bgGrad.addColorStop(1, `rgba(${Math.max(0, br - 40)},${Math.max(0, bg2 - 40)},${Math.max(0, bb - 40)},0.85)`);
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = bgGrad;
          ctx.beginPath();
          ctx.ellipse(bx, by, sz * 0.7, sz, 0, 0, Math.PI * 2); ctx.fill();
          // specular highlight
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.ellipse(bx - sz * 0.2, by - sz * 0.3, sz * 0.15, sz * 0.25, -0.3, 0, Math.PI * 2);
          ctx.fill();
          // small secondary highlight
          ctx.globalAlpha = 0.15;
          ctx.beginPath();
          ctx.ellipse(bx - sz * 0.1, by + sz * 0.1, sz * 0.08, sz * 0.12, -0.2, 0, Math.PI * 2);
          ctx.fill();
          // knot
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.moveTo(bx - 2, by + sz * 0.93);
          ctx.lineTo(bx, by + sz * 1.08);
          ctx.lineTo(bx + 2, by + sz * 0.93);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
