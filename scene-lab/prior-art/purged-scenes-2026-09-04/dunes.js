// dunes — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const dunes = {
      label: "Sand Dunes",
      defaults: { density: 80, speed: 1, color: "#d4a574" },
      presetBgColors: ["#020617", "#000000", "#1a1508", "#0f172a", "#1e1a0a", "#0d1117"],
      options: [
        { key: "density", label: "Grains", type: "range", min: 20, max: 200, step: 10 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Sand Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        const count = opts.density ?? 80;
        state.grains = [];
        for (let i = 0; i < count; i++) {
          state.grains.push({
            x: Math.random() * w * 1.3 - w * 0.15,
            y: h * 0.45 + Math.random() * h * 0.5,
            vx: (Math.random() * 80 + 30),
            vy: -(Math.random() * 4 + 1),
            r: Math.random() * 1.2 + 0.2,
            alpha: Math.random() * 0.35 + 0.1,
            trail: [],
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || '#d4a574';
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // desert sky
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        sky.addColorStop(0, bgColor || '#1a1508');
        sky.addColorStop(0.6, '#2a2018');
        sky.addColorStop(1, '#3a2a1a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // sun haze
        const sunX = w * 0.75, sunY = h * 0.15;
        const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.3);
        sunG.addColorStop(0, 'rgba(255,200,120,0.15)');
        sunG.addColorStop(0.5, 'rgba(255,180,100,0.05)');
        sunG.addColorStop(1, 'transparent');
        ctx.fillStyle = sunG; ctx.fillRect(0, 0, w, h);
        // dune layers with time-based shift
        for (let layer = 0; layer < 4; layer++) {
          const depth = layer / 3;
          const baseY = h * (0.5 + layer * 0.1);
          const darken = 1 - depth * 0.2;
          const lr = Math.round(cr * darken), lg = Math.round(cg * darken), lb = Math.round(cb * darken);
          const alpha = 0.5 + depth * 0.25;
          ctx.fillStyle = `rgba(${lr},${lg},${lb},${alpha})`;
          ctx.beginPath(); ctx.moveTo(-10, h);
          const shift = state.t * (3 + layer * 2);
          for (let x = -10; x <= w + 10; x += 6) {
            const y = baseY
              + Math.sin(x * 0.002 + layer * 1.7 + shift * 0.01) * (25 + layer * 8)
              + Math.sin(x * 0.007 + layer * 0.8) * (10 + layer * 3)
              + Math.sin(x * 0.001 + state.t * 0.005) * 5;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w + 10, h); ctx.closePath(); ctx.fill();
        }
        // heat shimmer (horizontal distortion bands near horizon)
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = `rgb(${Math.min(255, cr + 60)},${Math.min(255, cg + 40)},${Math.min(255, cb + 20)})`;
        for (let i = 0; i < 8; i++) {
          const shimY = h * 0.48 + Math.sin(state.t * 0.7 + i * 2) * h * 0.02;
          const shimW = w * 0.15;
          const shimX = (state.t * 15 + i * w * 0.13) % (w + shimW * 2) - shimW;
          ctx.fillRect(shimX, shimY, shimW, 2 + Math.sin(state.t + i) * 1);
        }
        ctx.globalAlpha = 1;
        // blowing sand with trails
        ctx.globalCompositeOperation = 'screen';
        for (const g of state.grains) {
          g.x += g.vx * dt * speed;
          g.y += g.vy * dt * speed;
          g.vy += 1.5 * dt;
          // save trail
          g.trail.push({ x: g.x, y: g.y });
          if (g.trail.length > 4) g.trail.shift();
          if (g.x > w + 20 || g.y > h + 20 || g.y < -20) {
            g.x = -10 + Math.random() * w * 0.3;
            g.y = h * 0.45 + Math.random() * h * 0.3;
            g.vy = -(Math.random() * 3 + 1);
            g.trail = [];
          }
          // trail
          if (g.trail.length > 1) {
            ctx.globalAlpha = g.alpha * 0.3;
            ctx.strokeStyle = color; ctx.lineWidth = g.r * 0.5;
            ctx.beginPath();
            ctx.moveTo(g.trail[0].x, g.trail[0].y);
            for (let t = 1; t < g.trail.length; t++) ctx.lineTo(g.trail[t].x, g.trail[t].y);
            ctx.stroke();
          }
          ctx.globalAlpha = g.alpha;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      },
    };
