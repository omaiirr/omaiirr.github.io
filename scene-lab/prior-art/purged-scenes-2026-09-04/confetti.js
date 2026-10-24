// confetti — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const confetti = {
      label: "Confetti",
      defaults: { density: 80, speed: 1, color: "#f472b6" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Pieces", type: "range", min: 20, max: 300, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 80;
        const palette = ['#f472b6','#a78bfa','#34d399','#fbbf24','#60a5fa','#f87171','#e879f9','#2dd4bf','#fb923c','#67e8f9'];
        state.pieces = [];
        for (let i = 0; i < count; i++) {
          state.pieces.push({
            x: Math.random() * w, y: -Math.random() * h * 1.5,
            vx: (Math.random() - 0.5) * 60,
            vy: Math.random() * 80 + 20,
            rotX: Math.random() * Math.PI * 2,
            rotY: Math.random() * Math.PI * 2,
            rotSpX: (Math.random() - 0.5) * 6,
            rotSpY: (Math.random() - 0.5) * 8,
            w: Math.random() * 5 + 3,
            hh: Math.random() * 8 + 3,
            color: palette[Math.floor(Math.random() * palette.length)],
            wobble: Math.random() * Math.PI * 2,
            wobbleSp: Math.random() * 3 + 1,
            depth: Math.random(),
            shape: Math.floor(Math.random() * 3),
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);
        for (const p of state.pieces) {
          p.rotX += p.rotSpX * dt * speed;
          p.rotY += p.rotSpY * dt * speed;
          p.wobble += p.wobbleSp * dt;
          p.vy += 8 * dt * speed;
          p.x += p.vx * dt + Math.sin(p.wobble) * 20 * dt;
          p.y += p.vy * dt * speed;
          if (p.y > h + 30) {
            p.y = -20 - Math.random() * 40;
            p.x = Math.random() * w;
            p.vy = Math.random() * 80 + 20;
          }
          const flipX = Math.cos(p.rotX);
          const flipY = Math.cos(p.rotY);
          const hw = p.w * Math.abs(flipX) + 1;
          const hh2 = p.hh * Math.abs(flipY) + 1;
          const shade = 0.6 + 0.4 * Math.abs(flipY);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = 0.75 + 0.25 * p.depth;
          if (p.shape === 0) {
            // rectangle
            ctx.fillStyle = p.color;
            ctx.globalAlpha *= shade;
            ctx.fillRect(-hw / 2, -hh2 / 2, hw, hh2);
            // highlight edge
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(-hw / 2, -hh2 / 2, hw, 1);
          } else if (p.shape === 1) {
            // circle
            ctx.fillStyle = p.color;
            ctx.globalAlpha *= shade;
            ctx.beginPath();
            ctx.ellipse(0, 0, hw * 0.6, hh2 * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // triangle
            ctx.fillStyle = p.color;
            ctx.globalAlpha *= shade;
            ctx.beginPath();
            ctx.moveTo(0, -hh2 / 2);
            ctx.lineTo(-hw / 2, hh2 / 2);
            ctx.lineTo(hw / 2, hh2 / 2);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
