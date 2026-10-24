    mistysunrise: {
      // Hot Air Balloon Dawn — a golden sunrise over a misty valley with a
      // small fleet of colorful balloons drifting up into the light. Replaces
      // the old misty-valley scene; the id stays `mistysunrise` so saved
      // themes keep working.
      label: "Hot Air Balloon Dawn",
      defaults: { density: 4, speed: 1, color: "#f0646a", scale: 1 },
      presetBgColors: ["#1a1430", "#20143a", "#14102a", "#2a1438", "#101020", "#1f1230"],
      options: [
        { key: "density", label: "Balloons", type: "range", min: 2, max: 6, step: 1 },
        { key: "speed", label: "Drift Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Balloon Size", type: "range", min: 0.5, max: 1.8, step: 0.1 },
        { key: "color", label: "Balloon Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        const n = Math.max(2, Math.round(opts.density ?? 4));
        state.balloons = [];
        for (let i = 0; i < n; i++) {
          const depth = i / Math.max(1, n - 1); // 0 far, 1 near
          state.balloons.push({
            x: w * (0.1 + Math.random() * 0.8),
            y: h * (0.16 + depth * 0.3),
            r: h * (0.035 + Math.random() * 0.045) * (1 - depth * 0.45),
            hue: Math.random(),
            sp: (6 + Math.random() * 10) * state.S * (1 - depth * 0.4),
            ph: Math.random() * 6.28,
            bob: 6 + Math.random() * 10,
          });
        }
        // layered valley hills fading into the mist
        state.hills = [];
        for (let i = 0; i < 4; i++) {
          const t = i / 3;
          const baseY = h * (0.55 + t * 0.33);
          const pts = [];
          const nP = 9;
          for (let j = 0; j <= nP; j++) {
            const x = (j / nP) * w;
            const wob = Math.sin(j * 2.1 + i * 3.3) * 0.5 + Math.sin(j * 5.1 + i * 1.7) * 0.3;
            const y = baseY - (h * (0.03 + t * 0.05)) * (0.5 + 0.5 * wob);
            pts.push({ x, y });
          }
          state.hills.push({ pts, t });
        }
        state.mist = [];
        for (let i = 0; i < 5; i++) {
          state.mist.push({ y: h * (0.4 + Math.random() * 0.3), r: h * (0.03 + Math.random() * 0.04), sp: (3 + Math.random() * 7) * state.S, dir: Math.random() < 0.5 ? 1 : -1, a: 0.05 + Math.random() * 0.06 });
        }
        state.birds = [];
        for (let i = 0; i < 4; i++) {
          state.birds.push({ x: w * (0.1 + i * 0.2 + Math.random() * 0.1), y: h * (0.1 + Math.random() * 0.12), sp: (18 + Math.random() * 16) * state.S, flap: Math.random() * 6.28, size: 0.7 + Math.random() * 0.5 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const scale = opts.scale ?? 1;
        const balC = opts.color || "#f0646a";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        const S = state.S || 1;
        ctx.clearRect(0, 0, w, h);
        // sunrise sky — indigo melting into rose and gold
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(1, _mixHex(bgColor, "#f0a06a", 0.6));
        } else {
          sky.addColorStop(0, "#1a1430");
          sky.addColorStop(0.45, "#5a3555");
          sky.addColorStop(0.8, "#c06a6a");
          sky.addColorStop(1, "#f6b080");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h * 0.5);
        // the rising sun with a wide glow
        const sx = w * 0.5, sy = h * 0.32;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.38);
        glow.addColorStop(0, "rgba(255, 240, 214, 0.9)");
        glow.addColorStop(0.3, "rgba(255, 224, 180, 0.35)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sx - h * 0.38, sy - h * 0.38, h * 0.76, h * 0.76);
        const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.085);
        disc.addColorStop(0, "rgba(255, 252, 244, 0.98)");
        disc.addColorStop(0.6, "rgba(255, 240, 214, 0.85)");
        disc.addColorStop(1, "rgba(255, 220, 180, 0)");
        ctx.fillStyle = disc;
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.085, 0, Math.PI * 2); ctx.fill();
        // soft rays fanning from the disc
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 8; i++) {
          const a = -1.1 + i * 0.3;
          const rl = h * (0.3 + 0.12 * ((i * 37) % 3));
          const g2 = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * rl, sy + Math.sin(a) * rl);
          g2.addColorStop(0, "rgba(255, 240, 214, 0.26)");
          g2.addColorStop(1, "rgba(255, 240, 214, 0)");
          ctx.strokeStyle = g2;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * rl, sy + Math.sin(a) * rl); ctx.stroke();
        }
        ctx.restore();
        // drifting mist bands
        for (const m of state.mist) {
          let mx = (m.x + state.t * m.sp * m.dir * speed) % (w * 1.2);
          if (mx < -w * 0.1) mx += w * 1.2;
          const g = ctx.createLinearGradient(0, m.y - m.r, 0, m.y + m.r);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(0.5, `rgba(255, 226, 205, ${m.a})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, m.y - m.r, w, m.r * 2);
        }
        // receding valley hills
        for (const hill of state.hills) {
          const t = hill.t;
          const r = Math.round(40 + (1 - t) * 30 + t * 14);
          const g = Math.round(28 + (1 - t) * 22 + t * 10);
          const b = Math.round(44 + (1 - t) * 40 + t * 12);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.beginPath();
          ctx.moveTo(hill.pts[0].x, h);
          for (const p of hill.pts) ctx.lineTo(p.x, p.y);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 205, 165, ${0.14 - t * 0.09})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (const p of hill.pts) ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        // the balloons — striped envelopes with baskets, bobbing and drifting
        for (const b of state.balloons) {
          b.x += b.sp * dt * speed;
          const by = b.y + Math.sin(state.t * 0.7 + b.ph) * b.bob * 0.05 * speed;
          if (b.x > w + b.r * 3) b.x = -b.r * 3;
          const r = b.r * scale;
          const [cr2, cg2, cb2] = _hexToRgb(balC);
          // warm glow pooling around each balloon
          const bg = ctx.createRadialGradient(b.x, by, 0, b.x, by, r * 2.2);
          bg.addColorStop(0, "rgba(255, 214, 170, 0.1)");
          bg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = bg;
          ctx.fillRect(b.x - r * 2.2, by - r * 2.2, r * 4.4, r * 4.4);
          // envelope: classic teardrop with a pinched bottom
          const pg = ctx.createLinearGradient(b.x - r, by - r, b.x + r, by + r * 0.7);
          pg.addColorStop(0, `rgb(${Math.min(255, cr2 + 70)}, ${Math.min(255, cg2 + 55)}, ${Math.min(255, cb2 + 60)})`);
          pg.addColorStop(0.45, `rgb(${cr2}, ${cg2}, ${cb2})`);
          pg.addColorStop(1, `rgb(${Math.max(0, cr2 - 50)}, ${Math.max(0, cg2 - 45)}, ${Math.max(0, cb2 - 45)})`);
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.moveTo(b.x, by - r * 1.05);
          ctx.bezierCurveTo(b.x + r * 0.95, by - r * 0.85, b.x + r * 0.8, by + r * 0.45, b.x, by + r * 0.62);
          ctx.bezierCurveTo(b.x - r * 0.8, by + r * 0.45, b.x - r * 0.95, by - r * 0.85, b.x, by - r * 1.05);
          ctx.fill();
          // vertical gores
          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 1;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(b.x + i * r * 0.28, by - r * 0.9);
            ctx.quadraticCurveTo(b.x + i * r * 0.34, by + r * 0.1, b.x + i * r * 0.18, by + r * 0.6);
            ctx.stroke();
          }
          // highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.beginPath();
          ctx.ellipse(b.x - r * 0.32, by - r * 0.5, r * 0.2, r * 0.42, -0.5, 0, Math.PI * 2);
          ctx.fill();
          // skirt, ropes and basket
          ctx.fillStyle = "#5a4a3a";
          ctx.beginPath();
          ctx.moveTo(b.x - r * 0.42, by + r * 0.6);
          ctx.lineTo(b.x + r * 0.42, by + r * 0.6);
          ctx.lineTo(b.x + r * 0.5, by + r * 0.82);
          ctx.lineTo(b.x - r * 0.5, by + r * 0.82);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(70, 55, 40, 0.9)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x - r * 0.42, by + r * 0.62);
          ctx.lineTo(b.x - r * 0.3, by + r * 1.35);
          ctx.moveTo(b.x + r * 0.42, by + r * 0.62);
          ctx.lineTo(b.x + r * 0.3, by + r * 1.35);
          ctx.stroke();
          ctx.fillStyle = "#6b5438";
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(b.x - r * 0.3, by + r * 1.35, r * 0.6, r * 0.42, r * 0.08) : ctx.rect(b.x - r * 0.3, by + r * 1.35, r * 0.6, r * 0.42);
          ctx.fill();
        }
        // birds gliding across the sky
        for (const b of state.birds) {
          b.x += b.sp * dt * speed;
          b.y += Math.sin(state.t * 0.5 + b.flap) * 3 * dt;
          if (b.x > w + 30) { b.x = -30; b.y = h * (0.08 + Math.random() * 0.14); }
          const wing = Math.sin(state.t * 5 + b.flap) * 2.5;
          const bs = h * 0.006 * b.size;
          ctx.strokeStyle = "rgba(26, 20, 40, 0.7)";
          ctx.lineWidth = 1.4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(b.x - bs, b.y + wing);
          ctx.quadraticCurveTo(b.x, b.y - wing * 0.6, b.x + bs, b.y + wing);
          ctx.stroke();
        }
        // warm haze over the valley floor
        const haze = ctx.createLinearGradient(0, h * 0.6, 0, h);
        haze.addColorStop(0, "rgba(255, 225, 205, 0.18)");
        haze.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = haze;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);
      },
    },

