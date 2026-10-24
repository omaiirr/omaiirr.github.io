// leaves — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const leaves = {
      label: "Falling Leaves",
      defaults: { density: 60, speed: 1, color: "#f97316", type: "maple" },
      presetBgColors: ["#020617", "#000000", "#1a1008", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Leaves", type: "range", min: 10, max: 180, step: 5 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Leaf Color", type: "color" },
        { key: "type", label: "Leaf Type", type: "select", choices: [["maple", "Maple"], ["oak", "Oak"], ["birch", "Birch"]] },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 60;
        state.leaves = [];
        for (let i = 0; i < count; i++) {
          state.leaves.push({
            x: Math.random() * w * 1.4 - w * 0.2,
            y: Math.random() * h - h * 0.3,
            r: Math.random() * 6 + 4,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 3,
            vx: (Math.random() * 40 + 20),
            vy: (Math.random() * 30 + 15),
            wobble: Math.random() * Math.PI * 2,
            wobbleSp: Math.random() * 2 + 1,
            wobbleAmp: Math.random() * 20 + 10,
            alpha: Math.random() * 0.4 + 0.6,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#f97316";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        const gust = 0.7 + 0.3 * Math.sin(state.t * 0.5);
        for (const l of state.leaves) {
          l.rot += l.rotSp * dt * speed;
          l.wobble += l.wobbleSp * dt;
          l.x += l.vx * gust * dt * speed;
          l.y += l.vy * dt * speed;
          l.x += Math.sin(l.wobble) * l.wobbleAmp * dt;
          if (l.x > w + 30) { l.x = -30; l.y = Math.random() * h * 0.5 - h * 0.2; }
          if (l.y > h + 30) { l.y = -30; l.x = Math.random() * w * 0.5; }
          ctx.save();
          ctx.translate(l.x, l.y); ctx.rotate(l.rot);
          ctx.globalAlpha = l.alpha;
          ctx.fillStyle = color;
          // simple leaf shape
          ctx.beginPath();
          ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          // vein
          ctx.strokeStyle = `rgba(${Math.max(0, cr - 40)},${Math.max(0, cg - 40)},${Math.max(0, cb - 40)},0.4)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(-l.r * 0.8, 0); ctx.lineTo(l.r * 0.8, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
