// meteor — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const meteor = {
      label: "Meteor Shower",
      defaults: { density: 18, speed: 1, color: "#e2e8f0", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#050b18", "#0a0e27", "#0f172a", "#1a0a2e"],
      options: [
        { key: "density", label: "Meteors / min", type: "range", min: 5, max: 40, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Meteor Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        state.meteors = [];
        state.fireballs = [];
        state.specks = [];
        for (let i = 0; i < 110; i++) {
          state.specks.push({ x: Math.random() * w, y: Math.random() * h * 0.85, r: Math.random() * 1 + 0.2, ph: Math.random() * 6.28, tw: Math.random() * 1.5 + 0.5 });
        }
        state.spawn = 0;
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const density = opts.density ?? 18;
        const color = opts.color || "#e2e8f0";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const S = (state.S || 1) * (opts.scale ?? 1);
        const [cr, cg, cb] = _hexToRgb(color);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#030712"); sky.addColorStop(1, bgColor || "#0a1020");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        for (const s of state.specks) {
          const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.ph + state.t * s.tw));
          ctx.globalAlpha = tw * (s.y < h * 0.5 ? 0.75 : 0.4);
          ctx.fillStyle = "#dfe7f5";
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * S, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        state.spawn -= dt;
        if (state.spawn <= 0) {
          state.spawn = Math.max(0.2, (60 / Math.max(1, density)) * (0.6 + Math.random() * 0.8));
          if (Math.random() < 0.12) {
            state.fireballs.push({ x: w * (0.55 + Math.random() * 0.45), y: h * (0.05 + Math.random() * 0.3), vx: -(Math.random() * 90 + 60) * S, vy: (Math.random() * 70 + 50) * S, life: 1, flash: 0.9 });
          } else {
            state.meteors.push({ x: w * (0.55 + Math.random() * 0.45), y: h * (0.02 + Math.random() * 0.35), vx: -(Math.random() * 160 + 120) * S, vy: (Math.random() * 120 + 90) * S, life: 1 });
          }
        }
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const m of state.meteors) {
          m.x += m.vx * dt * speed; m.y += m.vy * dt * speed; m.life -= dt * 0.55 * speed;
          if (m.life <= 0) { m.life = 0; continue; }
          const tailX = m.x - m.vx * 0.06, tailY = m.y - m.vy * 0.06;
          const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
          grad.addColorStop(0, `rgba(${Math.min(255, cr + 50)}, ${Math.min(255, cg + 50)}, 255, ${m.life})`);
          grad.addColorStop(0.25, `rgba(${cr},${cg},${cb},${m.life * 0.6})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.strokeStyle = grad; ctx.lineWidth = Math.max(1, 1.6 * S); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY); ctx.stroke();
          const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 4 * S);
          hg.addColorStop(0, `rgba(255, 255, 255, ${m.life})`); hg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(m.x, m.y, 4 * S, 0, Math.PI * 2); ctx.fill();
        }
        state.meteors = state.meteors.filter((m) => m.life > 0);
        for (const f of state.fireballs) {
          f.x += f.vx * dt * speed; f.y += f.vy * dt * speed; f.life -= dt * 0.35 * speed; f.flash -= dt * 1.4;
          if (f.life <= 0) { f.life = 0; continue; }
          const tailX = f.x - f.vx * 0.14, tailY = f.y - f.vy * 0.14;
          const grad = ctx.createLinearGradient(f.x, f.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255, 240, 200, ${f.life})`);
          grad.addColorStop(0.2, `rgba(255, 170, 90, ${f.life * 0.8})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.strokeStyle = grad; ctx.lineWidth = Math.max(2, 4 * S); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(tailX, tailY); ctx.stroke();
          const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10 * S);
          fg.addColorStop(0, `rgba(255, 255, 240, ${f.life})`); fg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, 10 * S, 0, Math.PI * 2); ctx.fill();
          if (f.flash > 0) { ctx.fillStyle = `rgba(255, 220, 160, ${f.flash * 0.05})`; ctx.fillRect(0, 0, w, h); }
        }
        state.fireballs = state.fireballs.filter((f) => f.life > 0);
        ctx.restore();
      },
    };
