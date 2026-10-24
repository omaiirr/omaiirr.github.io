// condensation — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const condensation = {
      label: "Condensation",
      defaults: { density: 70, speed: 1, size: 1, blur: false },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#16213e", "#0d1117"],
      options: [
        { key: "density", label: "Droplets", type: "range", min: 30, max: 160, step: 5 },
        { key: "speed", label: "Drip Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "size", label: "Drop Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "blur", label: "Fogged Glass Blur", type: "checkbox" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 70;
        const S = opts.size ?? 1;
        state.drops = [];
        state.drips = [];
        for (let i = 0; i < Math.max(6, Math.round(count * 0.2)); i++) {
          state.drips.push({ x: Math.random() * w, y: -Math.random() * h * 0.3, len: (Math.random() * 40 + 20) * S, speed: (Math.random() * 30 + 20) * S, width: (Math.random() * 1.5 + 0.8) * S, wobble: Math.random() * Math.PI * 2, wobbleAmp: (Math.random() * 0.3 + 0.1) * S, wobbleSpeed: Math.random() * 1.5 + 0.5, t: 0, alpha: 0.2 + Math.random() * 0.15 });
        }
        for (let i = 0; i < count; i++) {
          state.drops.push({
            x: Math.random() * w, y: Math.random() * h,
            r: (Math.random() * 3 + 1.5) * S, maxR: (Math.random() * 5 + 3) * S,
            growSpeed: (Math.random() * 0.3 + 0.15) * S,
            running: false, vy: 0, wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 2 + 1, wobbleAmp: (Math.random() * 0.5 + 0.3) * S,
            streak: 0, stretch: 1, runSpeed: (Math.random() * 80 + 40) * S,
            alpha: 0.25 + Math.random() * 0.2,
          });
        }
        state.coalesceT = 0;
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        const glass = ctx.createLinearGradient(0, 0, 0, h);
        glass.addColorStop(0, bgColor || 'rgba(17, 23, 40, 0.97)');
        glass.addColorStop(1, bgColor || 'rgba(9, 13, 24, 0.97)');
        ctx.fillStyle = glass; ctx.fillRect(0, 0, w, h);
        // thin vertical drips streaking down
        for (const dp of state.drips) {
          dp.y += dp.speed * speed * dt;
          dp.x += Math.sin((dp.t += dp.wobble * dt * speed)) * dp.wobbleAmp * dt;
          if (dp.y - dp.len > h) { dp.y = -dp.len; dp.x = Math.random() * w; dp.len = (Math.random() * 40 + 20) * (opts.size ?? 1); }
          const streakA = Math.min(0.4, dp.alpha * 1.6);
          const streakG = ctx.createLinearGradient(0, dp.y - dp.len, 0, dp.y);
          streakG.addColorStop(0, 'rgba(200, 224, 248, 0)');
          streakG.addColorStop(1, `rgba(200, 224, 248, ${streakA})`);
          ctx.strokeStyle = streakG; ctx.lineWidth = dp.width; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(dp.x, dp.y - dp.len); ctx.lineTo(dp.x, dp.y - dp.width * 1.2); ctx.stroke();
          const hr = dp.width * 1.5 + 0.6;
          ctx.fillStyle = 'rgba(215, 236, 252, 0.5)';
          ctx.beginPath(); ctx.ellipse(dp.x, dp.y - hr * 0.2, hr, hr * 1.15, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.ellipse(dp.x - hr * 0.3, dp.y - hr * 0.45, hr * 0.22, hr * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
        }
        // coalescence: nearby growing drops merge
        state.coalesceT += dt;
        if (state.coalesceT > 0.4) {
          state.coalesceT = 0;
          const drops = state.drops;
          for (let i = 0; i < drops.length; i++) {
            const a = drops[i];
            if (a.running || a.r <= 0) continue;
            for (let j = i + 1; j < drops.length; j++) {
              const b = drops[j];
              if (b.running || b.r <= 0) continue;
              const dx = a.x - b.x, dy = a.y - b.y;
              const minD = (a.r + b.r) * 0.82;
              if (dx * dx + dy * dy < minD * minD) {
                const big = a.r >= b.r ? a : b;
                const small = big === a ? b : a;
                big.r = Math.min(big.maxR * 1.9, Math.sqrt(big.r * big.r + small.r * small.r) + 0.4);
                small.r = 0; small.respawn = true;
              }
            }
          }
        }
        for (const d of state.drops) {
          if (d.r <= 0) {
            if (d.respawn && Math.random() < 0.4) {
              const S2 = opts.size ?? 1;
              d.x = Math.random() * w; d.y = Math.random() * h;
              d.r = (Math.random() * 3 + 1.5) * S2; d.maxR = (Math.random() * 5 + 3) * S2;
              d.running = false; d.vy = 0; d.streak = 0; d.respawn = false;
            }
            continue;
          }
          if (!d.running) {
            d.r += d.growSpeed * dt * speed;
            if (d.r >= d.maxR) { d.running = true; d.vy = d.runSpeed * 0.35; }
          } else {
            d.vy += 700 * dt * speed;
            d.vy = Math.min(d.vy, d.runSpeed * 2.2);
            d.y += d.vy * dt;
            d.wobble += d.wobbleSpeed * dt;
            d.x += Math.sin(d.wobble) * d.wobbleAmp * dt;
            d.streak = Math.min(d.streak + d.vy * dt, h * 0.45);
            if (d.y - d.r > h) {
              d.x = Math.random() * w; d.y = -d.r;
              const S3 = opts.size ?? 1;
              d.r = (Math.random() * 3 + 1.5) * S3; d.maxR = (Math.random() * 5 + 3) * S3;
              d.running = false; d.vy = 0; d.streak = 0;
            }
          }
          d.streak = Math.max(0, d.streak - d.vy * dt * 0.85);
          d.stretch = d.running ? Math.min(2.1, 1 + d.vy * 0.0045) : 1;
          if (d.streak > 2) {
            const streakG = ctx.createLinearGradient(0, d.y - d.streak, 0, d.y);
            streakG.addColorStop(0, 'rgba(200, 224, 248, 0)');
            streakG.addColorStop(1, `rgba(200, 224, 248, ${Math.min(0.35, d.alpha * 1.4)})`);
            ctx.strokeStyle = streakG; ctx.lineWidth = d.wobbleAmp * 0.8; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(d.x, d.y - d.streak); ctx.lineTo(d.x, d.y); ctx.stroke();
          }
          ctx.globalAlpha = d.alpha;
          ctx.fillStyle = 'rgba(215, 236, 252, 0.5)';
          ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * d.stretch, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.25, d.r * 0.15, -0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
