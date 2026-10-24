// origami — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const origami = {
      label: "Origami",
      defaults: { density: 10, speed: 1, color: "#f9a8d4" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Shapes", type: "range", min: 3, max: 25, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 10;
        state.shapes = [];
        for (let i = 0; i < count; i++) {
          state.shapes.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 25,
            vy: (Math.random() - 0.5) * 18,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 2,
            flap: Math.random() * Math.PI * 2,
            flapSp: Math.random() * 3 + 1.5,
            size: Math.random() * 14 + 8,
            type: Math.floor(Math.random() * 3),
            alpha: Math.random() * 0.3 + 0.5,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || '#f9a8d4';
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);
        for (const s of state.shapes) {
          s.rot += s.rotSp * dt * speed;
          s.flap += s.flapSp * dt * speed;
          s.x += s.vx * dt * speed;
          s.y += s.vy * dt * speed;
          s.vx += Math.sin(s.flap * 0.3) * 2 * dt;
          s.vy += Math.cos(s.flap * 0.5) * 1.5 * dt;
          s.vx *= 0.998; s.vy *= 0.998;
          if (s.x < -40) s.x = w + 40; if (s.x > w + 40) s.x = -40;
          if (s.y < -40) s.y = h + 40; if (s.y > h + 40) s.y = -40;
          const wingFold = Math.sin(s.flap) * 0.35;
          const sz = s.size;
          ctx.save();
          ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.globalAlpha = s.alpha;
          if (s.type === 0) {
            // origami crane
            ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 0.6;
            // left wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-sz * 0.8, -sz * (0.3 + wingFold));
            ctx.lineTo(-sz * 0.15, -sz * 0.05);
            ctx.closePath();
            ctx.globalAlpha = s.alpha * 0.9;
            ctx.fill();
            // right wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sz * 0.8, -sz * (0.3 - wingFold));
            ctx.lineTo(sz * 0.15, -sz * 0.05);
            ctx.closePath();
            ctx.globalAlpha = s.alpha;
            ctx.fill();
            // fold line
            ctx.globalAlpha = s.alpha * 0.4;
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, -sz * 0.1); ctx.lineTo(0, sz * 0.3); ctx.stroke();
            // head/tail
            ctx.globalAlpha = s.alpha * 0.7;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(-sz * 0.15, -sz * 0.05);
            ctx.lineTo(-sz * 0.5, -sz * 0.15);
            ctx.lineTo(-sz * 0.25, sz * 0.05);
            ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sz * 0.15, -sz * 0.05);
            ctx.lineTo(sz * 0.4, sz * 0.1);
            ctx.lineTo(sz * 0.2, sz * 0.15);
            ctx.closePath(); ctx.fill();
          } else if (s.type === 1) {
            // origami star (hexagonal fold)
            ctx.fillStyle = color;
            const petals = 6;
            for (let i = 0; i < petals; i++) {
              const a = (i / petals) * Math.PI * 2 + s.rot * 0.3;
              const shade = 0.6 + 0.4 * Math.sin(a + s.flap * 0.2);
              ctx.globalAlpha = s.alpha * shade;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(a - 0.2) * sz * 0.35, Math.sin(a - 0.2) * sz * 0.35);
              ctx.lineTo(Math.cos(a) * sz, Math.sin(a) * sz);
              ctx.lineTo(Math.cos(a + 0.2) * sz * 0.35, Math.sin(a + 0.2) * sz * 0.35);
              ctx.closePath(); ctx.fill();
            }
          } else {
            // origami boat / fortune teller
            const bob = Math.sin(s.flap * 0.8) * sz * 0.05;
            ctx.fillStyle = color;
            ctx.globalAlpha = s.alpha * 0.85;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.7, bob);
            ctx.lineTo(-sz * 0.3, -sz * 0.5);
            ctx.lineTo(0, bob - sz * 0.1);
            ctx.lineTo(sz * 0.3, -sz * 0.5);
            ctx.lineTo(sz * 0.7, bob);
            ctx.lineTo(sz * 0.15, sz * 0.2);
            ctx.lineTo(-sz * 0.15, sz * 0.2);
            ctx.closePath(); ctx.fill();
            // fold creases
            ctx.globalAlpha = s.alpha * 0.3;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.moveTo(-sz * 0.3, -sz * 0.5); ctx.lineTo(0, sz * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sz * 0.3, -sz * 0.5); ctx.lineTo(0, sz * 0.2); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
