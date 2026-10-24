// Byte-exact copy of assets/js/theme-scenes.js taken BEFORE the Stage 1 split (2026-09-04).
// Reference for the full pre-purge registry (all 40 scenes + helpers + runtime).
const ThemeScenes = (() => {
  const SCENES = {
    particles: {
      label: "Particles",
      defaults: { density: 80, speed: 1, color: "#c7d2fe" },
      presetBgColors: ["#020617", "#0f172a", "#1e1b4b", "#000000", "#1c1917", "#1a0a2e"],
      options: [
        { key: "density", label: "Density", type: "range", min: 20, max: 160, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 80;
        state.particles = [];
        for (let i = 0; i < count; i++) {
          state.particles.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4 * (opts.speed ?? 1),
            vy: (Math.random() - 0.5) * 0.4 * (opts.speed ?? 1),
            r: Math.random() * 2 + 0.8, a: Math.random() * 0.5 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c7d2fe";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.55)";
        ctx.fillRect(0, 0, w, h);
        const pts = state.particles;
        for (const p of pts) {
          p.x += p.vx * speed * dt * 60;
          p.y += p.vy * speed * dt * 60;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        }
        const linkDist = Math.min(w, h) * 0.12;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d = Math.hypot(dx, dy);
            if (d < linkDist) {
              ctx.strokeStyle = color;
              ctx.globalAlpha = (1 - d / linkDist) * 0.25;
              ctx.lineWidth = 0.6;
              ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
        for (const p of pts) {
          ctx.fillStyle = color; ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    aurora: {
      label: "Aurora",
      defaults: { speed: 1, intensity: 70, hue: 150, scale: 1, curtains: false },
      presetBgColors: ["#020617", "#000000", "#0a0f1a", "#0f172a", "#1a0a2e", "#0a1a1a"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "hue", label: "Hue", type: "range", min: 80, max: 280, step: 5 },
        { key: "scale", label: "Size", type: "range", min: 0.3, max: 2, step: 0.1 },
        { key: "curtains", label: "Curtain Style", type: "checkbox" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 70) / 100;
        const hue = opts.hue ?? 150;
        const scale = opts.scale ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, '#020617'); bg.addColorStop(1, '#0f172a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        }
        if (opts.curtains) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const sheets = 5;
          for (let i = 0; i < sheets; i++) {
            const cx0 = w * (0.05 + i * 0.2) + Math.sin(state.t * (0.15 + i * 0.07) + i * 2.4) * w * 0.025;
            const cw0 = w * (0.15 + 0.05 * Math.sin(i * 1.7)) * scale;
            const hue1 = hue + i * 18 - 30;
            const alpha = Math.max(0.05, (0.3 + 0.2 * Math.sin(state.t * (0.4 + i * 0.11) + i * 1.3)) * intensity);
            const foldAmp = h * 0.06 * (0.7 + i * 0.1);
            const foldSp = 1.1 + i * 0.28;
            const baseY = h * (0.16 + i * 0.03) + Math.sin(state.t * 0.5 + i) * h * 0.015;
            const x0 = cx0 - cw0 / 2, x1 = cx0 + cw0 / 2;
            const bendAt = (x) => Math.sin(x * 0.02 + state.t * foldSp) * foldAmp + Math.sin(x * 0.007 - state.t * (0.5 + i * 0.05)) * h * 0.02;
            for (let x = x0; x <= x1; x += 3) {
              const t = (x - x0) / (x1 - x0);
              const bot = baseY + bendAt(x) + t * h * 0.06;
              const rayLen = h * (0.32 + t * 0.1);
              const g = ctx.createLinearGradient(0, bot - rayLen, 0, bot);
              g.addColorStop(0, 'rgba(0,0,0,0)');
              g.addColorStop(0.62, `hsla(${hue1}, 85%, ${52 + t * 8}%, ${alpha * 0.3})`);
              g.addColorStop(1, `hsla(${hue1}, 90%, ${60 + t * 8}%, ${alpha})`);
              ctx.strokeStyle = g; ctx.lineWidth = 2.2;
              ctx.beginPath(); ctx.moveTo(x, bot - rayLen); ctx.lineTo(x, bot); ctx.stroke();
            }
            ctx.beginPath();
            for (let x = x0; x <= x1; x += 2) {
              const bot = baseY + bendAt(x) + ((x - x0) / (x1 - x0)) * h * 0.06;
              if (x === x0) ctx.moveTo(x, bot); else ctx.lineTo(x, bot);
            }
            ctx.strokeStyle = `hsla(${hue1 + 8}, 95%, ${68 + i * 2}%, ${Math.min(1, alpha * 1.6)})`;
            ctx.lineWidth = 1.6; ctx.stroke();
            const glowY = baseY + bendAt(x0);
            const glow = ctx.createLinearGradient(0, glowY, 0, glowY + h * 0.16);
            glow.addColorStop(0, `hsla(${hue1}, 85%, 60%, ${alpha * 0.5})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x0, glowY, x1 - x0, h * 0.16);
          }
          ctx.restore();
        } else {
          const bands = 4;
          const bandSpread = 0.12 * scale;
          const amp = h * 0.06 * scale;
          const amp2 = h * 0.03 * scale;
          for (let b = 0; b < bands; b++) {
            ctx.beginPath();
            const baseY = h * (0.2 + b * bandSpread);
            for (let x = 0; x <= w; x += 4) {
              const wave = Math.sin(x * 0.004 + state.t * (1.2 + b * 0.3)) * amp + Math.sin(x * 0.009 - state.t * 0.8) * amp2;
              const y = baseY + wave;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
            const g = ctx.createLinearGradient(0, baseY - h * 0.1 * scale, 0, h);
            const h1 = hue + b * 25;
            g.addColorStop(0, `hsla(${h1}, 80%, 55%, ${0.35 * intensity})`);
            g.addColorStop(0.5, `hsla(${h1 + 40}, 70%, 45%, ${0.2 * intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.fill();
          }
        }
      },
    },

    rain: {
      label: "Rain",
      defaults: { density: 120, speed: 1.5, color: "#94a3b8" },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#16213e", "#0d1117"],
      options: [
        { key: "density", label: "Density", type: "range", min: 40, max: 250, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.5, max: 4, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 120;
        state.drops = [];
        for (let i = 0; i < count; i++) {
          state.drops.push({
            x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 18 + 8,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1.5),
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const color = opts.color || "#94a3b8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(15, 23, 42, 0.65)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = "round";
        for (const d of state.drops) {
          d.y += d.speed * 400 * dt; d.x += d.speed * 40 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          if (d.x > w) d.x = 0;
          ctx.globalAlpha = 0.35 + (d.len / 26) * 0.4;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y + d.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    },

    bubbles: {
      label: "Bubbles",
      defaults: { density: 40, speed: 1, color: "#a5b4fc" },
      presetBgColors: ["#020617", "#000000", "#1e1b4b", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 100, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 40;
        state.bubbles = [];
        for (let i = 0; i < count; i++) {
          state.bubbles.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 16 + 4,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 1.5 + 0.5,
            wobbleAmp: Math.random() * 20 + 5,
            alpha: Math.random() * 0.3 + 0.15,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1; const color = opts.color || "#a5b4fc";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.7)"; ctx.fillRect(0, 0, w, h);
        for (const b of state.bubbles) {
          b.wobble += b.wobbleSpeed * dt * 2;
          b.y -= b.speed * 60 * dt * speed;
          if (b.y + b.r < 0) { b.y = h + b.r; b.x = Math.random() * w; b.r = Math.random() * 16 + 4; }
          const cx = b.x + Math.sin(b.wobble) * b.wobbleAmp;
          const cy = b.y;
          const grad = ctx.createRadialGradient(cx - b.r * 0.3, cy - b.r * 0.3, 0, cx, cy, b.r);
          grad.addColorStop(0, `rgba(255,255,255,${b.alpha * 0.6})`);
          grad.addColorStop(0.5, color);
          ctx.globalAlpha = b.alpha; ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = b.alpha * 0.5;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.beginPath(); ctx.ellipse(cx - b.r * 0.25, cy - b.r * 0.25, b.r * 0.2, b.r * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = b.alpha * 0.3; ctx.strokeStyle = color; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    },

    starfield: {
      label: "Starfield",
      defaults: { density: 80, twinkle: 1, color: "#fef9c3" },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a1a2e", "#050510"],
      options: [
        { key: "density", label: "Density", type: "range", min: 20, max: 200, step: 10 },
        { key: "twinkle", label: "Twinkle", type: "range", min: 0.1, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 80;
        state.stars = [];
        for (let i = 0; i < count; i++) {
          state.stars.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.8 + 0.4,
            phase: Math.random() * Math.PI * 2, speed: Math.random() * 1.5 + 0.5,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const twinkle = opts.twinkle ?? 1, color = opts.color || "#fef9c3";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)"; ctx.fillRect(0, 0, w, h);
        for (const s of state.stars) {
          s.phase += s.speed * dt * twinkle;
          const brightness = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase));
          ctx.globalAlpha = brightness; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
          if (s.r > 1.2 && brightness > 0.7) {
            ctx.globalAlpha = brightness * 0.15;
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
            g.addColorStop(0, color); g.addColorStop(1, "transparent");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    embers: {
      label: "Embers",
      defaults: { density: 35, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#1c1917", "#1a0f0a", "#1e0a0a", "#0f0a0a"],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 35;
        state.embers = [];
        for (let i = 0; i < count; i++) {
          state.embers.push({
            x: w * (0.05 + Math.random() * 0.9),
            y: h - Math.random() * h * 0.2,
            r: Math.random() * 3 + 1,
            speed: (Math.random() * 0.4 + 0.3) * (opts.speed ?? 1),
            drift: (Math.random() - 0.5) * 20,
            life: Math.random() * 0.7,
            lifeSpeed: Math.random() * 0.3 + 0.15,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1; const color = opts.color || "#f97316";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.75)"; ctx.fillRect(0, 0, w, h);
        for (const e of state.embers) {
          e.life += e.lifeSpeed * dt * speed;
          if (e.life > 1) {
            e.life = 0; e.x = w * (0.1 + Math.random() * 0.8); e.y = h;
            e.r = Math.random() * 3 + 1; e.drift = (Math.random() - 0.5) * 20;
          }
          e.y -= e.speed * 80 * dt * speed;
          e.x += Math.sin(e.life * Math.PI * 4) * e.drift * dt;
          const fadeOut = 1 - e.life;
          const brightness = fadeOut * (0.8 + 0.2 * Math.sin(e.life * Math.PI * 6));
          ctx.globalAlpha = Math.max(0, brightness * 0.7);
          const glowGrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 6);
          glowGrad.addColorStop(0, color); glowGrad.addColorStop(0.3, color); glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = Math.max(0, brightness * 0.9); ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = Math.max(0, brightness * 0.8); ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    ripples: {
      label: "Ripples",
      defaults: { frequency: 3, speed: 1, intensity: 60, color: "#67e8f9" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "frequency", label: "Frequency", type: "range", min: 1, max: 8, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 2.5, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.rings = [];
        for (let i = 0; i < 6; i++) {
          state.rings.push({
            x: Math.random() * w, y: Math.random() * h,
            radius: 0, maxRadius: Math.min(w, h) * (0.2 + Math.random() * 0.3),
            life: Math.random(), wait: i * 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const freq = opts.frequency ?? 3;
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 60) / 100;
        const color = opts.color || "#67e8f9";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.7)"; ctx.fillRect(0, 0, w, h);

        for (const r of state.rings) {
          r.wait -= dt * speed;
          if (r.wait > 0) continue;
          r.life += dt * speed * 0.3;
          r.radius = r.life * r.maxRadius;
          if (r.life > 1) {
            r.x = Math.random() * w; r.y = Math.random() * h;
            r.maxRadius = Math.min(w, h) * (0.2 + Math.random() * 0.3);
            r.life = 0; r.radius = 0;
          }

          const fade = (1 - r.life) * intensity;
          const ringWidth = Math.max(1, r.maxRadius * 0.08);

          // Outer glow
          ctx.globalAlpha = fade * 0.2;
          const glowGrad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius + ringWidth);
          glowGrad.addColorStop(0, "transparent");
          glowGrad.addColorStop(0.7, color);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + ringWidth, 0, Math.PI * 2); ctx.fill();

          // Ring line
          ctx.globalAlpha = fade * 0.6;
          ctx.strokeStyle = color; ctx.lineWidth = ringWidth;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Spawn new rings based on frequency
        if (state.rings.length < Math.floor(freq * 2)) {
          const needed = Math.ceil((Math.floor(freq * 2) - state.rings.length) * dt);
          for (let i = 0; i < needed; i++) {
            state.rings.push({
              x: Math.random() * w, y: Math.random() * h,
              radius: 0, maxRadius: Math.min(w, h) * (0.2 + Math.random() * 0.3),
              life: 0, wait: 0,
            });
          }
        }
        // Remove fully faded rings beyond max count
        while (state.rings.length > Math.floor(freq * 2) + 3) {
          const oldest = state.rings.reduce((a, b) => a.life > b.life ? a : b);
          const idx = state.rings.indexOf(oldest);
          if (idx !== -1) state.rings.splice(idx, 1);
          else break;
        }
      },
    },

    comets: {
      label: "Comets",
      defaults: { density: 30, speed: 1, color: "#fef08a" },
      presetBgColors: ["#020617", "#000000", "#1e1b2e", "#0f172a", "#1a0a2e", "#0a0a1a"],
      options: [
        { key: "density", label: "Density", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 30;
        state.comets = [];
        for (let i = 0; i < count; i++) {
          state.comets.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1),
            trail: [], maxTrail: Math.floor(Math.random() * 20 + 15),
            tailLen: Math.random() * 30 + 15,
            alpha: Math.random() * 0.4 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const density = opts.density ?? 30;
        const color = opts.color || "#fef08a";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.75)"; ctx.fillRect(0, 0, w, h);

        for (const c of state.comets) {
          c.x += c.vx * speed * dt;
          c.y += c.vy * speed * dt;

          // Wrap around edges
          if (c.x < -50) { c.x = w + 50; resetComet(c, w, h, speed); }
          if (c.x > w + 50) { c.x = -50; resetComet(c, w, h, speed); }
          if (c.y < -50) { c.y = h + 50; resetComet(c, w, h, speed); }
          if (c.y > h + 50) { c.y = -50; resetComet(c, w, h, speed); }

          // Trail
          c.trail.push({ x: c.x, y: c.y });
          if (c.trail.length > c.maxTrail) c.trail.shift();

          // Draw trail
          const trailLen = c.trail.length;
          for (let i = 1; i < trailLen; i++) {
            const t = i / trailLen;
            ctx.globalAlpha = t * c.alpha * 0.5;
            ctx.strokeStyle = color;
            ctx.lineWidth = t * 3 + 0.5;
            ctx.beginPath(); ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
            ctx.lineTo(c.trail[i].x, c.trail[i].y); ctx.stroke();
          }

          // Glow behind comet head
          if (trailLen > 2) {
            const tail = c.trail[trailLen - 1];
            const prev = c.trail[Math.max(0, trailLen - 5)];
            const gx = (tail.x + prev.x) / 2;
            const gy = (tail.y + prev.y) / 2;
            ctx.globalAlpha = c.alpha * 0.3;
            const glowGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 20);
            glowGrad.addColorStop(0, color); glowGrad.addColorStop(1, "transparent");
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(gx, gy, 20, 0, Math.PI * 2); ctx.fill();
          }

          // Comet head (bright core)
          ctx.globalAlpha = c.alpha * 0.9;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2); ctx.fill();

          // Head glow
          ctx.globalAlpha = c.alpha * 0.4;
          const headGlow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 8);
          headGlow.addColorStop(0, color); headGlow.addColorStop(1, "transparent");
          ctx.fillStyle = headGlow;
          ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    galaxy: {
      label: "Galaxy",
      defaults: { density: 120, speed: 0.8, color: "#a78bfa" },
      presetBgColors: ["#0f0a1a", "#020617", "#000000", "#1a0a2e", "#0a0015", "#1a0a1a"],
      options: [
        { key: "density", label: "Density", type: "range", min: 40, max: 250, step: 10 },
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2.5, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 120;
        const color = opts.color || "#a78bfa";
        state.t = 0;
        state.stars = [];
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        for (let i = 0; i < count; i++) {
          const dist = Math.random() * maxR;
          const angle = Math.random() * Math.PI * 2;
          const armOffset = Math.sin(dist * 0.08) * 0.5;
          const spread = (1 - dist / maxR) * 0.15 + 0.05;
          state.stars.push({
            dist: dist,
            angle: angle + armOffset,
            r: Math.random() * 1.5 + 0.3 + (1 - dist / maxR) * 1.5,
            brightness: 0.3 + Math.random() * 0.7 * (1 - dist / maxR),
            coreOffset: (Math.random() - 0.5) * spread,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.8;
        const color = opts.color || "#a78bfa";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          // Deep space gradient
          const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.7);
          bg.addColorStop(0, "#0f0a1a");
          bg.addColorStop(1, "#020617");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
        }

        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        const [r, g, b] = _hexToRgb(color || "#a78bfa");

        for (const s of state.stars) {
          const armAngle = s.angle + state.t * (1 - s.dist / maxR * 0.6);
          const x = cx + Math.cos(armAngle) * (s.dist + s.coreOffset * 10);
          const y = cy + Math.sin(armAngle) * (s.dist + s.coreOffset * 10);

          const t = s.dist / maxR;
          const fadeEdge = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
          const alpha = s.brightness * fadeEdge * 0.9;

          // Color blend: warm core, cool edges
          const blend = t;
          const cr = Math.round(r * (1 - blend * 0.3));
          const cg = Math.round(g * (1 - blend * 0.2));
          const cb = Math.round(b + blend * 40);
          const starColor = `rgb(${cr},${cg},${cb})`;

          // Glow
          ctx.globalAlpha = alpha * 0.12;
          const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, s.r * 8);
          glowGrad.addColorStop(0, starColor);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath(); ctx.arc(x, y, s.r * 8, 0, Math.PI * 2); ctx.fill();

          // Star dot
          ctx.globalAlpha = alpha;
          ctx.fillStyle = starColor;
          ctx.beginPath(); ctx.arc(x, y, s.r * 0.6, 0, Math.PI * 2); ctx.fill();

          // Core highlight
          if (s.r > 1) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.beginPath(); ctx.arc(x, y, s.r * 0.25, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        // Central glow (galaxy core)
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
        coreGrad.addColorStop(0, "rgba(255,255,255,0.12)");
        coreGrad.addColorStop(0.5, `${color}33`);
        coreGrad.addColorStop(1, "transparent");
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2); ctx.fill();
      },
    },

    snow: {
      label: "Snowfall",
      defaults: { density: 140, speed: 1, size: 2.4 },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1e293b", "#16213e", "#1a1a2e"],
      options: [
        { key: "density", label: "Flakes", type: "range", min: 30, max: 400, step: 10 },
        { key: "speed", label: "Fall Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "size", label: "Flake Size", type: "range", min: 0.5, max: 7, step: 0.1 },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 140;
        const size = opts.size ?? 2.4;
        state.S = h / 1080;
        state.t = 0;
        state.sprites = _snowSpriteCache || (_snowSpriteCache = _makeSnowSprites());
        state.flakes = [];
        for (let i = 0; i < count; i++) {
          state.flakes.push({
            x: Math.random() * w, y: Math.random() * h,
            s: (0.5 + Math.random() * 1.2) * size * state.S,
            vy: (Math.random() * 38 + 24) * (opts.speed ?? 1) * state.S,
            drift: Math.random() * 1 + 0.4,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.55 + 0.35,
            rot: Math.random() * Math.PI * 2,
            tw: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const bgColor = opts.bgColor || null;
        state.t += dt;
        ctx.clearRect(0, 0, w, h);
        if (bgColor) {
          ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, "#0f1830"); bg.addColorStop(0.6, "#0a1020"); bg.addColorStop(1, "#060a14");
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        }
        for (const f of state.flakes) {
          f.y += f.vy * dt;
          f.x += Math.sin((f.phase += dt * f.drift * 2)) * 22 * (state.S ?? 1) * dt;
          if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
          if (f.x < -10) f.x = w + 10;
          if (f.x > w + 10) f.x = -10;
          f.rot += dt * (0.35 + f.s * 0.25);
          const tw = 0.8 + 0.2 * Math.sin(f.tw + state.t * 1.5);
          ctx.globalAlpha = f.alpha * tw;
          const d = f.s * 2;
          const level = f.s > 4 ? 3 : f.s > 2.6 ? 2 : f.s > 1.4 ? 1 : 0;
          const fi = Math.floor(f.rot * 2.55) % 16;
          ctx.drawImage(state.sprites[level][fi], f.x - d / 2, f.y - d / 2, d, d);
        }
        ctx.globalAlpha = 1;
      },
    },

    condensation: {
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
    },

    grass: {
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
    },

    meteor: {
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
    },

    neoncity: {
      label: "Neon City",
      defaults: { density: 12, speed: 1, color: "#ff6ec7" },
      presetBgColors: ["#0a0a1a", "#050510", "#0d0a1f", "#120820", "#08081a", "#0a0f1e"],
      options: [
        { key: "density", label: "Buildings", type: "range", min: 6, max: 25, step: 1 },
        { key: "speed", label: "Animation", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Neon Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        const count = opts.density ?? 12;
        state.buildings = [];
        const [nr, ng, nb] = _hexToRgb(opts.color || "#ff6ec7");
        for (let i = 0; i < count; i++) {
          const bw = w / count * (0.6 + Math.random() * 0.6);
          const bh = h * (0.15 + Math.random() * 0.45);
          const x = (i / count) * w + (Math.random() - 0.5) * (w / count) * 0.3;
          const neonHue = Math.random();
          state.buildings.push({
            x, w: bw, h: bh,
            windows: Math.floor(Math.random() * 12 + 4),
            neonColor: `rgb(${Math.round(nr * neonHue + 80 * (1 - neonHue))},${Math.round(ng * neonHue + 40 * (1 - neonHue))},${Math.round(nb * neonHue + 200 * (1 - neonHue))})`,
            neonY: 0.3 + Math.random() * 0.4,
            flicker: Math.random() * Math.PI * 2,
          });
        }
        state.raindrops = [];
        for (let i = 0; i < 60; i++) {
          state.raindrops.push({ x: Math.random() * w, y: Math.random() * h, len: Math.random() * 12 + 4, speed: (Math.random() * 0.4 + 0.3) * (opts.speed ?? 1) });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#0a0a1a"); sky.addColorStop(1, bgColor || "#120820");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // buildings
        for (const b of state.buildings) {
          const by = h - b.h;
          ctx.fillStyle = "#0e0e1a";
          ctx.fillRect(b.x, by, b.w, b.h);
          // windows
          const cols = Math.floor(b.w / 14);
          const rows = Math.floor(b.h / 18);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (Math.random() > 0.4) {
                const wx = b.x + 6 + c * (b.w - 12) / Math.max(1, cols - 1);
                const wy = by + 8 + r * (b.h - 16) / Math.max(1, rows - 1);
                const brightness = 0.3 + Math.random() * 0.5;
                ctx.fillStyle = `rgba(200, 220, 255, ${brightness * 0.6})`;
                ctx.fillRect(wx - 2, wy - 3, 4, 6);
              }
            }
          }
          // neon sign
          const ny = by + b.h * b.neonY;
          const flick = 0.6 + 0.4 * Math.sin(state.t * 3 + b.flicker);
          ctx.globalAlpha = flick * 0.8;
          ctx.strokeStyle = b.neonColor; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(b.x + 4, ny); ctx.lineTo(b.x + b.w - 4, ny); ctx.stroke();
          // neon glow
          ctx.globalAlpha = flick * 0.2;
          ctx.shadowColor = b.neonColor; ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.moveTo(b.x + 4, ny); ctx.lineTo(b.x + b.w - 4, ny); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        // rain
        ctx.strokeStyle = "rgba(140, 160, 200, 0.25)"; ctx.lineWidth = 1;
        for (const d of state.raindrops) {
          d.y += d.speed * 400 * dt; d.x += d.speed * 20 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y + d.len); ctx.stroke();
        }
        // wet street reflections
        const gy = h * 0.88;
        const street = ctx.createLinearGradient(0, gy, 0, h);
        street.addColorStop(0, "rgba(14, 17, 32, 0.95)"); street.addColorStop(1, "rgba(5, 6, 12, 0.98)");
        ctx.fillStyle = street;
        ctx.fillRect(0, gy, w, h - gy);
        for (const b of state.buildings) {
          const ny = h - b.h * b.neonY;
          const refl = ctx.createLinearGradient(0, ny, 0, h);
          refl.addColorStop(0, "rgba(0,0,0,0)");
          refl.addColorStop(0.3, b.neonColor.replace("rgb", "rgba").replace(")", ",0.08)"));
          refl.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = refl;
          ctx.fillRect(b.x, ny, b.w, h - ny);
        }
      },
    },

    fireflies: {
      label: "Fireflies",
      defaults: { density: 50, speed: 1, color: "#fef08a" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1208", "#0d1117"],
      options: [
        { key: "density", label: "Fireflies", type: "range", min: 10, max: 120, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Glow Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 50;
        state.fireflies = [];
        for (let i = 0; i < count; i++) {
          state.fireflies.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 2 + 1,
            r: Math.random() * 2 + 1,
            wander: Math.random() * Math.PI * 2,
            wanderSpeed: Math.random() * 0.8 + 0.3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fef08a";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        // grass ground
        ctx.fillStyle = "#0a1a0a";
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.82 + Math.sin(x * 0.02) * 12);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        for (const f of state.fireflies) {
          f.phase += f.pulseSpeed * dt * speed;
          f.wander += f.wanderSpeed * dt;
          f.vx += Math.cos(f.wander) * 15 * dt;
          f.vy += Math.sin(f.wander) * 10 * dt;
          f.vx *= 0.98; f.vy *= 0.98;
          f.x += f.vx * dt * speed; f.y += f.vy * dt * speed;
          if (f.x < 0) f.x = w; if (f.x > w) f.x = 0;
          if (f.y < h * 0.2) f.vy += 5 * dt;
          if (f.y > h * 0.85) f.vy -= 5 * dt;
          const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.phase));
          // outer glow
          ctx.globalAlpha = brightness * 0.15;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 12);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.6)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 12, 0, Math.PI * 2); ctx.fill();
          // core
          ctx.globalAlpha = brightness * 0.9;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
          // bright center
          ctx.globalAlpha = brightness;
          ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    leaves: {
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
    },

    campfire: {
      label: "Campfire",
      defaults: { density: 30, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#1a0f0a", "#0f172a", "#1e0a0a", "#0d1117"],
      options: [
        { key: "density", label: "Sparks", type: "range", min: 10, max: 80, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Fire Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 30;
        state.sparks = [];
        for (let i = 0; i < count; i++) {
          state.sparks.push({
            x: w * 0.5 + (Math.random() - 0.5) * w * 0.08,
            y: h * 0.7 + Math.random() * h * 0.05,
            vx: (Math.random() - 0.5) * 30,
            vy: -(Math.random() * 80 + 40),
            r: Math.random() * 2 + 0.5,
            life: Math.random(),
            lifeSpeed: Math.random() * 0.5 + 0.3,
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
        // fire glow at base
        const fireGlow = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, h * 0.25);
        fireGlow.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
        fireGlow.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
        fireGlow.addColorStop(1, "transparent");
        ctx.fillStyle = fireGlow;
        ctx.fillRect(0, 0, w, h);
        // fire flicker
        const flicker = 0.7 + 0.3 * Math.sin(state.t * 8) * Math.sin(state.t * 13);
        const fireH = h * 0.15 * flicker;
        const fireGrad = ctx.createLinearGradient(0, h * 0.72, 0, h * 0.72 - fireH);
        fireGrad.addColorStop(0, `rgba(255, 180, 50, 0.8)`);
        fireGrad.addColorStop(0.3, `rgba(${cr},${cg},${cb}, 0.6)`);
        fireGrad.addColorStop(1, "transparent");
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - w * 0.03, h * 0.72);
        ctx.quadraticCurveTo(w * 0.5 - w * 0.01, h * 0.72 - fireH * 0.7, w * 0.5, h * 0.72 - fireH);
        ctx.quadraticCurveTo(w * 0.5 + w * 0.01, h * 0.72 - fireH * 0.7, w * 0.5 + w * 0.03, h * 0.72);
        ctx.closePath(); ctx.fill();
        // sparks
        for (const s of state.sparks) {
          s.life += s.lifeSpeed * dt * speed;
          if (s.life > 1) {
            s.life = 0;
            s.x = w * 0.5 + (Math.random() - 0.5) * w * 0.08;
            s.y = h * 0.7 + Math.random() * h * 0.05;
            s.vx = (Math.random() - 0.5) * 30;
            s.vy = -(Math.random() * 80 + 40);
          }
          s.x += s.vx * dt * speed;
          s.y += s.vy * dt * speed;
          s.vy += 20 * dt; // gravity
          const fade = 1 - s.life;
          ctx.globalAlpha = fade * 0.8;
          ctx.fillStyle = s.life < 0.3 ? "#fffbe6" : color;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * fade, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    dandelion: {
      label: "Dandelion Seeds",
      defaults: { density: 40, speed: 1, color: "#e2e8f0" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1a08", "#0d1117"],
      options: [
        { key: "density", label: "Seeds", type: "range", min: 10, max: 100, step: 5 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Seed Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 40;
        state.seeds = [];
        for (let i = 0; i < count; i++) {
          state.seeds.push({
            x: Math.random() * w * 1.5 - w * 0.25,
            y: Math.random() * h * 0.8,
            vx: (Math.random() * 25 + 10),
            vy: -(Math.random() * 15 + 5),
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 2,
            wobble: Math.random() * Math.PI * 2,
            wobbleSp: Math.random() * 1.5 + 0.5,
            wobbleAmp: Math.random() * 15 + 5,
            alpha: Math.random() * 0.4 + 0.5,
            size: Math.random() * 4 + 3,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#e2e8f0";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        const gust = 0.6 + 0.4 * Math.sin(state.t * 0.4);
        for (const s of state.seeds) {
          s.rot += s.rotSp * dt * speed;
          s.wobble += s.wobbleSp * dt;
          s.x += s.vx * gust * dt * speed;
          s.y += s.vy * dt * speed + Math.sin(s.wobble) * s.wobbleAmp * dt;
          if (s.x > w + 30) { s.x = -30; s.y = Math.random() * h * 0.7; }
          if (s.y < -20) { s.y = h * 0.8; s.x = -20; }
          ctx.save();
          ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.globalAlpha = s.alpha;
          ctx.strokeStyle = color; ctx.lineWidth = 0.5;
          // stem
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s.size * 3); ctx.stroke();
          // seed puff (starburst)
          const rays = 6;
          for (let r = 0; r < rays; r++) {
            const a = (r / rays) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
            ctx.stroke();
            // tiny dot at tip
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * s.size, Math.sin(a) * s.size, 0.6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },

    butterflies: {
      label: "Butterflies",
      defaults: { density: 20, speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Butterflies", type: "range", min: 5, max: 60, step: 5 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Wing Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 20;
        state.butterflies = [];
        for (let i = 0; i < count; i++) {
          state.butterflies.push({
            x: Math.random() * w, y: Math.random() * h * 0.7,
            vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 20,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: Math.random() * 4 + 6,
            size: Math.random() * 4 + 3,
            wander: Math.random() * Math.PI * 2,
            wanderSpeed: Math.random() * 0.5 + 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        for (const b of state.butterflies) {
          b.wingPhase += b.wingSpeed * dt * speed;
          b.wander += b.wanderSpeed * dt;
          b.vx += Math.cos(b.wander) * 12 * dt;
          b.vy += Math.sin(b.wander) * 8 * dt;
          b.vx *= 0.97; b.vy *= 0.97;
          b.x += b.vx * dt * speed; b.y += b.vy * dt * speed;
          if (b.x < -20) b.x = w + 20; if (b.x > w + 20) b.x = -20;
          if (b.y < 10) b.vy += 3 * dt; if (b.y > h * 0.75) b.vy -= 3 * dt;
          const wingOpen = Math.abs(Math.sin(b.wingPhase));
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.globalAlpha = 0.8;
          // wings
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(-b.size * 0.5, 0, b.size, b.size * 0.6 * wingOpen, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(b.size * 0.5, 0, b.size, b.size * 0.6 * wingOpen, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // body
          ctx.fillStyle = "#333";
          ctx.fillRect(-0.5, -b.size * 0.3, 1, b.size * 0.6);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },

    thunderstorm: {
      label: "Thunderstorm",
      defaults: { density: 100, speed: 1, color: "#94a3b8" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#0a0e1a", "#0d1117"],
      options: [
        { key: "density", label: "Rain", type: "range", min: 30, max: 250, step: 10 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Rain Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 100;
        state.drops = [];
        for (let i = 0; i < count; i++) {
          state.drops.push({
            x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 20 + 8,
            speed: (Math.random() * 0.5 + 0.5) * (opts.speed ?? 1.5),
          });
        }
        state.lightning = 0;
        state.lightningTimer = 2 + Math.random() * 5;
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#94a3b8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        // dark stormy sky
        ctx.fillStyle = bgColor || "#0a0e1a";
        ctx.fillRect(0, 0, w, h);
        // lightning flash
        state.lightningTimer -= dt * speed;
        if (state.lightningTimer <= 0) {
          state.lightning = 0.8 + Math.random() * 0.2;
          state.lightningTimer = 3 + Math.random() * 8;
        }
        state.lightning *= 0.85;
        if (state.lightning > 0.05) {
          ctx.fillStyle = `rgba(200, 210, 255, ${state.lightning * 0.15})`;
          ctx.fillRect(0, 0, w, h);
        }
        // rain
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = "round";
        for (const d of state.drops) {
          d.y += d.speed * 500 * dt; d.x += d.speed * 30 * dt;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          if (d.x > w) d.x = 0;
          ctx.globalAlpha = 0.3 + (d.len / 28) * 0.4;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y + d.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    },

    eclipse: {
      label: "Eclipse",
      defaults: { speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a0a1a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2, step: 0.1 },
        { key: "color", label: "Corona Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const mr = Math.min(w, h) * 0.15;
        // corona rays
        const [cr, cg, cb] = _hexToRgb(color);
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2 + state.t * 0.1;
          const rayLen = mr * (1.8 + 0.5 * Math.sin(a * 3 + state.t * 2));
          ctx.globalAlpha = 0.08 + 0.05 * Math.sin(a * 5 + state.t * 3);
          const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.4)`);
          g.addColorStop(1, "transparent");
          ctx.strokeStyle = g; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * mr * 0.9, cy + Math.sin(a) * mr * 0.9);
          ctx.lineTo(cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen);
          ctx.stroke();
        }
        // corona glow
        ctx.globalAlpha = 0.3;
        const corona = ctx.createRadialGradient(cx, cy, mr * 0.9, cx, cy, mr * 2.5);
        corona.addColorStop(0, `rgba(${cr},${cg},${cb},0.3)`);
        corona.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.1)`);
        corona.addColorStop(1, "transparent");
        ctx.fillStyle = corona;
        ctx.beginPath(); ctx.arc(cx, cy, mr * 2.5, 0, Math.PI * 2); ctx.fill();
        // dark moon silhouette
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#010108";
        ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2); ctx.fill();
        // edge highlight
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.4)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2); ctx.stroke();
      },
    },

    ocean: {
      label: "Ocean Waves",
      defaults: { speed: 1, intensity: 70, color: "#0ea5e9" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Wave Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 70) / 100;
        const color = opts.color || "#0ea5e9";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a1a2e";
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // moon reflection
        const moonX = w * 0.5, moonY = h * 0.12;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.15);
        moonGlow.addColorStop(0, `rgba(${Math.min(255, cr + 100)},${Math.min(255, cg + 100)},${Math.min(255, cb + 100)}, 0.2)`);
        moonGlow.addColorStop(1, "transparent");
        ctx.fillStyle = moonGlow; ctx.fillRect(0, 0, w, h * 0.5);
        // wave layers
        const layers = 5;
        for (let l = 0; l < layers; l++) {
          const baseY = h * (0.4 + l * 0.12);
          const alpha = intensity * (0.3 + l * 0.08);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const wave = Math.sin(x * 0.005 + state.t * (1.2 + l * 0.3) + l * 2) * h * 0.02
                       + Math.sin(x * 0.012 - state.t * 0.7 + l) * h * 0.01;
            const y = baseY + wave;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
          const g = ctx.createLinearGradient(0, baseY, 0, h);
          const blend = l / layers;
          g.addColorStop(0, `rgba(${Math.round(cr * (1 - blend * 0.3))},${Math.round(cg * (1 - blend * 0.2))},${Math.round(cb + blend * 30)},${alpha})`);
          g.addColorStop(1, `rgba(${Math.round(cr * 0.3)},${Math.round(cg * 0.3)},${Math.round(cb * 0.5)},${alpha * 0.5})`);
          ctx.fillStyle = g; ctx.fill();
          // foam on crests
          if (l > 1) {
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = `rgba(255,255,255,0.5)`; ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    lighthouse: {
      label: "Lighthouse",
      defaults: { speed: 1, intensity: 80, color: "#fef08a" },
      presetBgColors: ["#020617", "#000000", "#0a0e1a", "#0f172a", "#0a1a2e", "#0d1117"],
      options: [
        { key: "speed", label: "Beam Speed", type: "range", min: 0.2, max: 3, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Beam Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 80) / 100;
        const color = opts.color || "#fef08a";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a0e1a";
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // sea
        ctx.fillStyle = "#0a1525";
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) {
          ctx.lineTo(x, h * 0.75 + Math.sin(x * 0.008 + state.t) * 8);
        }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        // lighthouse
        const lx = w * 0.3, ly = h * 0.35;
        ctx.fillStyle = "#e8e0d8";
        ctx.beginPath();
        ctx.moveTo(lx - 8, ly); ctx.lineTo(lx + 8, ly);
        ctx.lineTo(lx + 5, h * 0.75); ctx.lineTo(lx - 5, h * 0.75);
        ctx.closePath(); ctx.fill();
        // red stripes
        ctx.fillStyle = "#c0392b";
        for (let s = 0; s < 3; s++) {
          const sy = ly + (h * 0.75 - ly) * (0.2 + s * 0.28);
          ctx.fillRect(lx - 7, sy, 14, 8);
        }
        // lantern room
        ctx.fillStyle = "#333";
        ctx.fillRect(lx - 6, ly - 10, 12, 10);
        // beam sweep
        const beamAngle = state.t * 1.5;
        const beamWidth = 0.15;
        ctx.save();
        ctx.translate(lx, ly - 5);
        ctx.rotate(beamAngle);
        const beamG = ctx.createLinearGradient(0, 0, w * 0.8, 0);
        beamG.addColorStop(0, `rgba(${cr},${cg},${cb},${0.7 * intensity})`);
        beamG.addColorStop(0.3, `rgba(${cr},${cg},${cb},${0.3 * intensity})`);
        beamG.addColorStop(1, "transparent");
        ctx.fillStyle = beamG;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.8, -w * 0.8 * Math.tan(beamWidth));
        ctx.lineTo(w * 0.8, w * 0.8 * Math.tan(beamWidth));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // light glow
        ctx.globalAlpha = 0.6 * intensity;
        const glow = ctx.createRadialGradient(lx, ly - 5, 0, lx, ly - 5, 20);
        glow.addColorStop(0, color); glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, ly - 5, 20, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      },
    },

    blackhole: {
      label: "Black Hole",
      defaults: { speed: 0.5, color: "#a78bfa" },
      presetBgColors: ["#020617", "#000000", "#0a0015", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Disk Color", type: "color" },
      ],
      init(state) { state.t = 0; state.particles = []; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#a78bfa";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const [cr, cg, cb] = _hexToRgb(color);
        // accretion disk
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.35);
        for (let ring = 0; ring < 40; ring++) {
          const r = Math.min(w, h) * 0.12 + ring * Math.min(w, h) * 0.006;
          const alpha = (1 - ring / 40) * 0.4;
          const hueShift = ring * 3 + state.t * 50;
          const g = ctx.createRadialGradient(0, 0, r - 2, 0, 0, r + 2);
          g.addColorStop(0, `hsla(${(hueShift + 20) % 360}, 80%, 60%, ${alpha * 0.5})`);
          g.addColorStop(0.5, `hsla(${hueShift % 360}, 80%, 55%, ${alpha})`);
          g.addColorStop(1, `hsla(${(hueShift - 20) % 360}, 70%, 45%, ${alpha * 0.5})`);
          ctx.strokeStyle = g; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r, state.t * 0.2 + ring * 0.01, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        // event horizon
        const bhR = Math.min(w, h) * 0.08;
        const bhGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bhR);
        bhGrad.addColorStop(0, "#000000");
        bhGrad.addColorStop(0.8, "#000000");
        bhGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0.2)`);
        ctx.fillStyle = bhGrad;
        ctx.beginPath(); ctx.arc(cx, cy, bhR, 0, Math.PI * 2); ctx.fill();
        // gravitational lensing ring
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, bhR * 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      },
    },

    starorbit: {
      label: "Star Orbit",
      defaults: { density: 200, speed: 0.5, color: "#93c5fd" },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Stars", type: "range", min: 50, max: 600, step: 10 },
        { key: "speed", label: "Orbit Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Star Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 200;
        state.t = 0; state.stars = [];
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        for (let i = 0; i < count; i++) {
          const dist = Math.random() * maxR;
          const angle = Math.random() * Math.PI * 2;
          state.stars.push({
            dist, angle,
            r: Math.random() * 1.5 + 0.3,
            brightness: 0.3 + Math.random() * 0.7 * (1 - dist / maxR),
            speed: (1 - dist / maxR) * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSp: Math.random() * 2 + 1,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || '#93c5fd';
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        const [cr, cg, cb] = _hexToRgb(color);
        // central nebula glow
        const nebula = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.4);
        nebula.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
        nebula.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.03)`);
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
        // faint orbit ring guides
        ctx.globalAlpha = 0.035;
        ctx.strokeStyle = color; ctx.lineWidth = 0.5;
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath(); ctx.arc(cx, cy, maxR * r * 0.25, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // stars
        for (const s of state.stars) {
          s.twinkle += s.twinkleSp * dt;
          const a = s.angle + state.t * s.speed;
          const x = cx + Math.cos(a) * s.dist;
          const y = cy + Math.sin(a) * s.dist;
          const tw = 0.5 + 0.5 * Math.sin(s.twinkle);
          ctx.globalAlpha = s.brightness * (0.5 + 0.5 * tw) * 0.85;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
          if (s.r > 1) {
            ctx.globalAlpha = s.brightness * tw * 0.12;
            const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 5);
            g.addColorStop(0, color); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, s.r * 5, 0, Math.PI * 2); ctx.fill();
          }
          // orbit trail (fading arc behind the star)
          if (s.r > 0.8) {
            ctx.globalAlpha = s.brightness * 0.06;
            ctx.strokeStyle = color; ctx.lineWidth = s.r * 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, s.dist, a - 0.15, a);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    caustics: {
      label: "Caustics",
      defaults: { speed: 1, intensity: 60, color: "#06b6d4" },
      presetBgColors: ["#020617", "#000000", "#0a1a2e", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "intensity", label: "Intensity", type: "range", min: 20, max: 100, step: 5 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 60) / 100;
        const color = opts.color || "#06b6d4";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a1a2e";
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // caustic light patterns — overlapping sine waves
        for (let layer = 0; layer < 4; layer++) {
          ctx.globalAlpha = intensity * 0.12;
          ctx.fillStyle = color;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            for (let y = 0; y <= h; y += 6) {
              const v = Math.sin(x * 0.02 + state.t * (1 + layer * 0.3) + layer)
                      * Math.cos(y * 0.02 - state.t * 0.7 + layer * 2)
                      + Math.sin((x + y) * 0.015 + state.t * 0.5);
              if (v > 1.2) {
                const r = (v - 1.2) * 15 + 3;
                ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
              }
            }
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    cloudsea: {
      label: "Cloud Sea",
      defaults: { density: 8, speed: 0.5, scale: 1, color: "#94a3b8" },
      presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#0a1a2e", "#0d1117"],
      options: [
        { key: "density", label: "Clouds", type: "range", min: 3, max: 20, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Cloud Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Cloud Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 8;
        const sc = opts.scale ?? 1;
        state.clouds = [];
        for (let i = 0; i < count; i++) {
          state.clouds.push({
            x: Math.random() * w * 1.5 - w * 0.25,
            y: h * 0.4 + Math.random() * h * 0.45,
            rx: (Math.random() * 120 + 80) * sc,
            ry: (Math.random() * 40 + 20) * sc,
            speed: (Math.random() * 8 + 3) * (opts.speed ?? 0.5),
            alpha: Math.random() * 0.3 + 0.1,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const color = opts.color || "#94a3b8";
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#0f172a");
        sky.addColorStop(0.4, bgColor || "#1a2540");
        sky.addColorStop(1, bgColor || "#2a3550");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // distant mountains
        ctx.fillStyle = "rgba(20, 30, 50, 0.6)";
        ctx.beginPath(); ctx.moveTo(0, h * 0.65);
        for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * 0.65 - Math.sin(x * 0.005) * 30 - Math.sin(x * 0.013) * 15);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        // clouds
        const [cr, cg, cb] = _hexToRgb(color);
        for (const c of state.clouds) {
          c.x += c.speed * dt;
          if (c.x - c.rx > w) c.x = -c.rx * 2;
          ctx.globalAlpha = c.alpha;
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.5)`);
          g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.2)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    dunes: {
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
    },

    mistysunrise: {
      label: "Misty Sunrise",
      defaults: { density: 6, speed: 0.5, color: "#f59e0b" },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Mist Layers", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Sun Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 6;
        state.layers = [];
        for (let i = 0; i < count; i++) {
          state.layers.push({
            y: h * (0.35 + (i / count) * 0.5),
            amplitude: Math.random() * 20 + 10,
            freq: Math.random() * 0.003 + 0.001,
            speed: (Math.random() * 5 + 2) * (opts.speed ?? 0.5),
            alpha: 0.1 + (i / count) * 0.15,
            phase: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#f59e0b";
        const bgColor = opts.bgColor || null;
        state.t = (state.t || 0) + dt * speed;
        ctx.clearRect(0, 0, w, h);
        // dawn gradient
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, bgColor || "#1a0f08");
        sky.addColorStop(0.3, "#2a1a10");
        sky.addColorStop(0.6, "#3a2518");
        sky.addColorStop(1, bgColor || "#0d1117");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // sun glow
        const sunX = w * 0.5, sunY = h * 0.3;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.35);
        sunGlow.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
        sunGlow.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.1)`);
        sunGlow.addColorStop(1, "transparent");
        ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, w, h);
        // sun disc
        ctx.globalAlpha = 0.8;
        const discG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.06);
        discG.addColorStop(0, `rgba(255,240,200,0.9)`);
        discG.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.6)`);
        discG.addColorStop(1, "transparent");
        ctx.fillStyle = discG;
        ctx.beginPath(); ctx.arc(sunX, sunY, h * 0.06, 0, Math.PI * 2); ctx.fill();
        // mist layers
        for (const l of state.layers) {
          ctx.globalAlpha = l.alpha;
          ctx.fillStyle = `rgba(180, 170, 160, 0.4)`;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = l.y + Math.sin(x * l.freq + state.t * l.speed * 0.3 + l.phase) * l.amplitude;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    inkwater: {
      label: "Ink in Water",
      defaults: { density: 6, speed: 1, color: "#7c3aed" },
      presetBgColors: ["#020617", "#000000", "#0a0a1a", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Ink Drops", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Ink Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 6;
        state.ink = [];
        for (let i = 0; i < count; i++) {
          state.ink.push({
            x: w * (0.2 + Math.random() * 0.6),
            y: h * (0.1 + Math.random() * 0.3),
            r: 0, maxR: Math.random() * 60 + 40,
            growSpeed: Math.random() * 20 + 10,
            drift: (Math.random() - 0.5) * 20,
            life: 0, delay: i * 1.5 + Math.random() * 2,
            alpha: Math.random() * 0.3 + 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#7c3aed";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#0a0a1a";
        ctx.fillRect(0, 0, w, h);
        for (const ink of state.ink) {
          ink.delay -= dt * speed;
          if (ink.delay > 0) continue;
          ink.life += dt * speed * 0.15;
          ink.r = Math.min(ink.maxR, ink.r + ink.growSpeed * dt * speed);
          ink.x += ink.drift * dt;
          ink.y += 8 * dt * speed;
          if (ink.life > 1.5) {
            ink.r = 0; ink.life = 0; ink.delay = 0;
            ink.x = w * (0.2 + Math.random() * 0.6);
            ink.y = h * (0.1 + Math.random() * 0.3);
          }
          const fade = ink.life < 0.5 ? ink.life * 2 : Math.max(0, 1 - (ink.life - 0.5) * 2);
          // ink blob
          ctx.globalAlpha = ink.alpha * fade;
          const g = ctx.createRadialGradient(ink.x, ink.y, 0, ink.x, ink.y, ink.r);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.8)`);
          g.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.3)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          // organic shape via multiple circles
          for (let b = 0; b < 5; b++) {
            const bx = ink.x + Math.sin(ink.life * 3 + b * 1.3) * ink.r * 0.3;
            const by = ink.y + Math.cos(ink.life * 2.5 + b * 1.7) * ink.r * 0.3;
            const br = ink.r * (0.4 + Math.sin(b * 2.1) * 0.2);
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    jellyfish: {
      label: "Jellyfish",
      defaults: { density: 8, speed: 1, color: "#c084fc" },
      presetBgColors: ["#020617", "#000000", "#0a0a2e", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Jellyfish", type: "range", min: 3, max: 25, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 8;
        state.jellies = [];
        for (let i = 0; i < count; i++) {
          state.jellies.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 15, vy: -(Math.random() * 20 + 10),
            size: Math.random() * 15 + 10,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 2 + 1.5,
            tentacles: Math.floor(Math.random() * 3 + 4),
            wander: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#c084fc";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        for (const j of state.jellies) {
          j.pulse += j.pulseSpeed * dt * speed;
          j.wander += 0.3 * dt;
          j.vx += Math.cos(j.wander) * 5 * dt;
          j.vy += Math.sin(j.wander) * 3 * dt;
          j.vx *= 0.99; j.vy *= 0.99;
          j.x += j.vx * dt * speed; j.y += j.vy * dt * speed;
          if (j.x < -30) j.x = w + 30; if (j.x > w + 30) j.x = -30;
          if (j.y < -30) j.y = h + 30; if (j.y > h + 30) j.y = -30;
          const squish = 0.85 + 0.15 * Math.sin(j.pulse);
          // glow
          ctx.globalAlpha = 0.15;
          const glow = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, j.size * 2.5);
          glow.addColorStop(0, color); glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(j.x, j.y, j.size * 2.5, 0, Math.PI * 2); ctx.fill();
          // bell
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(j.x, j.y, j.size * squish, j.size * (1.1 - squish * 0.1), 0, Math.PI, Math.PI * 2);
          ctx.fill();
          // tentacles
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = color; ctx.lineWidth = 1;
          for (let t = 0; t < j.tentacles; t++) {
            const tx = j.x + (t - (j.tentacles - 1) / 2) * (j.size * 0.4);
            ctx.beginPath();
            ctx.moveTo(tx, j.y);
            for (let s = 1; s <= 6; s++) {
              const sy = j.y + s * j.size * 0.3;
              const sx = tx + Math.sin(j.pulse + s * 0.8 + t) * j.size * 0.2;
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    koi: {
      label: "Koi Pond",
      defaults: { density: 5, speed: 1, color: "#f97316" },
      presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#0a1a1a", "#0d1117"],
      options: [
        { key: "density", label: "Fish", type: "range", min: 2, max: 15, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Fish Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 5;
        state.fish = [];
        const colors = ["#f97316", "#ef4444", "#fbbf24", "#ffffff"];
        for (let i = 0; i < count; i++) {
          state.fish.push({
            x: Math.random() * w, y: Math.random() * h,
            angle: Math.random() * Math.PI * 2,
            speed: (Math.random() * 30 + 20) * (opts.speed ?? 1),
            size: Math.random() * 12 + 8,
            wander: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            tailPhase: Math.random() * Math.PI * 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(0, 0, w, h);
        // water ripples
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 4; i++) {
          const rx = w * (0.3 + i * 0.15);
          const ry = h * (0.3 + Math.sin(i * 2.1) * 0.2);
          const rr = 30 + Math.sin((state.t || 0) + i) * 10;
          ctx.strokeStyle = "#4a9"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        state.t = (state.t || 0) + dt * speed;
        for (const f of state.fish) {
          f.wander += (Math.random() - 0.5) * 2 * dt;
          f.angle += f.wander * dt;
          f.x += Math.cos(f.angle) * f.speed * dt;
          f.y += Math.sin(f.angle) * f.speed * dt;
          if (f.x < -30) f.x = w + 30; if (f.x > w + 30) f.x = -30;
          if (f.y < -30) f.y = h + 30; if (f.y > h + 30) f.y = -30;
          f.tailPhase += dt * 8;
          ctx.save();
          ctx.translate(f.x, f.y); ctx.rotate(f.angle);
          // body
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size, f.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          // tail
          const tailSwing = Math.sin(f.tailPhase) * f.size * 0.3;
          ctx.beginPath();
          ctx.moveTo(-f.size * 0.8, 0);
          ctx.lineTo(-f.size * 1.3, -f.size * 0.3 + tailSwing);
          ctx.lineTo(-f.size * 1.3, f.size * 0.3 + tailSwing);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },

    lanterns: {
      label: "Floating Lanterns",
      defaults: { density: 15, speed: 1, color: "#fbbf24" },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Lanterns", type: "range", min: 5, max: 40, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "color", label: "Lantern Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 15;
        state.lanterns = [];
        for (let i = 0; i < count; i++) {
          state.lanterns.push({
            x: Math.random() * w, y: h + Math.random() * h * 0.5,
            vy: -(Math.random() * 25 + 10),
            vx: (Math.random() - 0.5) * 8,
            size: Math.random() * 8 + 6,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 3 + 2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fbbf24";
        const bgColor = opts.bgColor || null;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#1a0f08";
        ctx.fillRect(0, 0, w, h);
        for (const l of state.lanterns) {
          l.y += l.vy * dt * speed;
          l.x += l.vx * dt + Math.sin(l.y * 0.01) * 0.5;
          l.flicker += l.flickerSpeed * dt;
          if (l.y < -l.size * 3) {
            l.y = h + l.size * 3; l.x = Math.random() * w;
          }
          const brightness = 0.7 + 0.3 * Math.sin(l.flicker);
          // outer glow
          ctx.globalAlpha = brightness * 0.15;
          const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.size * 4);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.6)`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(l.x, l.y, l.size * 4, 0, Math.PI * 2); ctx.fill();
          // lantern body
          ctx.globalAlpha = brightness * 0.8;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(l.x, l.y, l.size * 0.7, l.size, 0, 0, Math.PI * 2);
          ctx.fill();
          // bright core
          ctx.globalAlpha = brightness;
          ctx.fillStyle = "#fffbe6";
          ctx.beginPath(); ctx.arc(l.x, l.y, l.size * 0.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    balloon: {
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
    },

    confetti: {
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
    },

    ornate: {
      label: "Ornate",
      defaults: { density: 8, speed: 1, color: "#fbbf24", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#1a0f08", "#0f172a", "#1e1208", "#0d1117"],
      options: [
        { key: "density", label: "Rings", type: "range", min: 3, max: 15, step: 1 },
        { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#fbbf24";
        const bgColor = opts.bgColor || null;
        const sc = opts.scale ?? 1;
        const rings = Math.round(opts.density ?? 8);
        state.t += dt * speed;
        const TAU = Math.PI * 2;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || "#020617";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.42 * sc;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.save(); ctx.translate(cx, cy);
        // breathing pulse
        const breathe = 1 + 0.06 * Math.sin(state.t * 1.5);
        ctx.scale(breathe, breathe);
        // outer glow
        const glowR = maxR * 1.1;
        const glow = ctx.createRadialGradient(0, 0, maxR * 0.3, 0, 0, glowR);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.06)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
        // rings
        for (let r = 0; r < rings; r++) {
          const t = r / Math.max(1, rings - 1);
          const radius = (maxR * 0.12 + t * maxR * 0.88);
          const petals = 5 + Math.floor(r * 2.5);
          const rot = state.t * (0.3 + r * 0.08) * (r % 2 === 0 ? 1 : -1);
          const ringAlpha = 0.15 + (1 - t) * 0.35;
          // petal glow
          ctx.globalAlpha = ringAlpha * 0.15;
          const rg = ctx.createRadialGradient(0, 0, radius - 8, 0, 0, radius + 8);
          rg.addColorStop(0, 'transparent');
          rg.addColorStop(0.5, color); rg.addColorStop(1, 'transparent');
          ctx.strokeStyle = rg; ctx.lineWidth = 12 * sc;
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
          // filigree petals (teardrop shapes)
          for (let p = 0; p < petals; p++) {
            const a = (p / petals) * TAU + rot;
            const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
            const ps = (5 + r * 0.8) * sc;
            const breathe2 = 0.8 + 0.2 * Math.sin(state.t * 2 + p * 0.5 + r);
            ctx.globalAlpha = ringAlpha * (0.4 + 0.3 * breathe2);
            ctx.fillStyle = color;
            ctx.save(); ctx.translate(px, py); ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-ps * 0.6, -ps * 0.8, -ps * 0.3, -ps * 1.8, 0, -ps * 2);
            ctx.bezierCurveTo(ps * 0.3, -ps * 1.8, ps * 0.6, -ps * 0.8, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          // connecting arcs between petals
          ctx.globalAlpha = ringAlpha * 0.25;
          ctx.strokeStyle = color; ctx.lineWidth = 0.7 * sc;
          for (let p = 0; p < petals; p++) {
            const a1 = (p / petals) * TAU + rot;
            const a2 = ((p + 1) / petals) * TAU + rot;
            const mx = Math.cos((a1 + a2) / 2) * radius * 0.92;
            const my = Math.sin((a1 + a2) / 2) * radius * 0.92;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
            ctx.quadraticCurveTo(mx, my, Math.cos(a2) * radius, Math.sin(a2) * radius);
            ctx.stroke();
          }
        }
        // center mandala jewel
        ctx.globalAlpha = 0.9;
        for (let s = 3; s >= 0; s--) {
          const jr = (8 + s * 4) * sc;
          const jg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, jr);
          jg2.addColorStop(0, `rgba(255,250,220,0.9)`);
          jg2.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.6)`);
          jg2.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.15)`);
          jg2.addColorStop(1, 'transparent');
          ctx.fillStyle = jg2;
          ctx.beginPath(); ctx.arc(0, 0, jr, 0, TAU); ctx.fill();
        }
        // tiny inner spokes
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color; ctx.lineWidth = 0.5 * sc;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + state.t * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 12 * sc, Math.sin(a) * 12 * sc);
          ctx.lineTo(Math.cos(a) * maxR * 0.15, Math.sin(a) * maxR * 0.15);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    },

    origami: {
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
    },

    lighttunnel: {
      label: "Light Tunnel",
      defaults: { density: 12, speed: 1, color: "#93c5fd", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
      options: [
        { key: "density", label: "Rays", type: "range", min: 4, max: 30, step: 1 },
        { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0; state.dust = [];
        const n = 60;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random();
          state.dust.push({ a, d, speed: Math.random() * 0.3 + 0.1, size: Math.random() * 1.5 + 0.3, bright: Math.random() });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const rayCount = Math.round(opts.density ?? 12);
        const color = opts.color || "#93c5fd";
        const bgColor = opts.bgColor || null;
        const sc = opts.scale ?? 1;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || '#020617';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.35;
        const [cr, cg, cb] = _hexToRgb(color);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // broad atmospheric haze
        const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        haze.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
        haze.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.03)`);
        haze.addColorStop(1, 'transparent');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, w, h);
        // volumetric god rays
        for (let i = 0; i < rayCount; i++) {
          const t = i / rayCount;
          const baseAngle = t * Math.PI * 0.8 + Math.PI * 0.1;
          const sway = Math.sin(state.t * 0.15 + i * 1.7) * 0.04;
          const angle = baseAngle + sway;
          const rayLen = Math.max(w, h) * (0.8 + 0.3 * Math.sin(state.t * 0.3 + i));
          const x1 = cx + Math.cos(angle) * rayLen;
          const y1 = cy + Math.sin(angle) * rayLen;
          const baseWidth = (18 + 12 * Math.sin(i * 2.3)) * sc;
          const flicker = 0.5 + 0.5 * Math.sin(state.t * 0.8 + i * 1.1);
          ctx.globalAlpha = (0.04 + 0.03 * flicker);
          const g = ctx.createLinearGradient(cx, cy, x1, y1);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.7)`);
          g.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.25)`);
          g.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.08)`);
          g.addColorStop(1, 'transparent');
          ctx.strokeStyle = g;
          // tapered ray via filled shape
          ctx.beginPath();
          const perpX = -Math.sin(angle), perpY = Math.cos(angle);
          const hw0 = baseWidth * 1.5, hw1 = baseWidth * 0.15;
          ctx.moveTo(cx + perpX * hw0, cy + perpY * hw0);
          ctx.lineTo(x1 + perpX * hw1, y1 + perpY * hw1);
          ctx.lineTo(x1 - perpX * hw1, y1 - perpY * hw1);
          ctx.lineTo(cx - perpX * hw0, cy - perpY * hw0);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        }
        // floating dust motes in the light
        ctx.globalCompositeOperation = 'screen';
        for (const m of state.dust) {
          m.d += m.speed * dt * speed * 0.15;
          if (m.d > 1) { m.d = 0; m.a = Math.random() * Math.PI * 2; }
          const dist = m.d * Math.max(w, h) * 0.55;
          const dx = cx + Math.cos(m.a + state.t * 0.05) * dist;
          const dy = cy + Math.sin(m.a + state.t * 0.05) * dist * 0.8;
          const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(state.t * 2 + m.bright * 10));
          ctx.globalAlpha = glow * 0.5;
          const mg = ctx.createRadialGradient(dx, dy, 0, dx, dy, m.size * 3);
          mg.addColorStop(0, `rgba(255,255,255,${glow})`);
          mg.addColorStop(0.5, `rgba(${cr},${cg},${cb},${glow * 0.4})`);
          mg.addColorStop(1, 'transparent');
          ctx.fillStyle = mg;
          ctx.beginPath(); ctx.arc(dx, dy, m.size * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        // source glow
        ctx.globalAlpha = 0.5 + 0.15 * Math.sin(state.t * 1.2);
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25 * sc);
        sg.addColorStop(0, `rgba(255,255,255,0.9)`);
        sg.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.5)`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, cy, 25 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    },    zengarden: {
      label: "Zen Garden",
      defaults: { density: 5, speed: 0.5, color: "#c8c0b0" },
      presetBgColors: ["#020617", "#000000", "#0f172a", "#1a1a2e", "#0a1a1a", "#0d1117"],
      options: [
        { key: "density", label: "Rocks", type: "range", min: 2, max: 12, step: 1 },
        { key: "speed", label: "Drift", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "color", label: "Sand Color", type: "color" },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 5;
        state.t = 0;
        state.rocks = [];
        for (let i = 0; i < count; i++) {
          const rx = Math.random() * 18 + 8, ry = Math.random() * 12 + 5;
          state.rocks.push({
            x: w * (0.15 + Math.random() * 0.7),
            y: h * (0.25 + Math.random() * 0.45),
            rx, ry, rot: Math.random() * Math.PI,
            dark: 0.3 + Math.random() * 0.2,
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 0.5;
        const color = opts.color || "#c8c0b0";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor || '#0a0a14';
        ctx.fillRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // warm sand fill
        const sandG = ctx.createLinearGradient(0, 0, 0, h);
        sandG.addColorStop(0, `rgba(${cr},${cg},${cb},0.06)`);
        sandG.addColorStop(1, `rgba(${cr},${cg},${cb},0.18)`);
        ctx.fillStyle = sandG;
        ctx.fillRect(0, 0, w, h);
        // animated raked sand lines (flowing horizontal waves)
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = color; ctx.lineWidth = 0.8;
        for (let y = 0; y < h; y += 7) {
          ctx.beginPath();
          const drift = state.t * 8 * (y < h * 0.5 ? 0.6 : 1);
          for (let x = 0; x <= w; x += 3) {
            const dy = Math.sin(x * 0.015 + y * 0.008 + drift * 0.02) * 4
              + Math.sin(x * 0.04 - drift * 0.01) * 2;
            if (x === 0) ctx.moveTo(x, y + dy); else ctx.lineTo(x, y + dy);
          }
          ctx.stroke();
        }
        // rock shadows
        for (const r of state.rocks) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(r.x + 3, r.y + 4, r.rx * 1.1, r.ry * 0.7, r.rot, 0, Math.PI * 2);
          ctx.fill();
        }
        // rocks
        for (const r of state.rocks) {
          const dr = Math.floor(r.dark * 255);
          // body
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = `rgb(${dr},${dr + 2},${dr + 4})`;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, Math.PI * 2); ctx.fill();
          // highlight
          ctx.globalAlpha = 0.25;
          const hg = ctx.createRadialGradient(r.x - r.rx * 0.25, r.y - r.ry * 0.35, 0, r.x, r.y, r.rx);
          hg.addColorStop(0, 'rgba(255,255,255,0.5)');
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, Math.PI * 2); ctx.fill();
        }
        // animated ripples around each rock (expanding concentric ellipses)
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.7;
        for (const r of state.rocks) {
          for (let ring = 1; ring <= 5; ring++) {
            const phase = state.t * 0.4 + ring * 0.8;
            const pulse = Math.sin(phase) * 0.5 + 0.5;
            const rr = Math.max(r.rx, r.ry) + ring * 14 + pulse * 4;
            ctx.globalAlpha = (1 - ring / 6) * 0.12 * (0.6 + 0.4 * pulse);
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, rr, rr * 0.45, r.rot, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // gentle mist at the bottom
        const mist = ctx.createLinearGradient(0, h * 0.85, 0, h);
        mist.addColorStop(0, 'transparent');
        mist.addColorStop(1, `rgba(${cr},${cg},${cb},0.08)`);
        ctx.fillStyle = mist; ctx.globalAlpha = 1;
        ctx.fillRect(0, h * 0.85, w, h * 0.15);
        ctx.globalAlpha = 1;
      },
    },

    blossomstorm: {
      label: "Blossom Storm",
      defaults: { density: 110, speed: 1, color: "#f9a8d4", scale: 1 },
      presetBgColors: ["#020617", "#000000", "#1a1226", "#16122a", "#0f172a", "#2a1222"],
      options: [
        { key: "density", label: "Petals", type: "range", min: 40, max: 300, step: 10 },
        { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
        { key: "scale", label: "Petal Size", type: "range", min: 0.5, max: 2, step: 0.1 },
        { key: "color", label: "Blossom Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.w = w;
        state.h = h;
        state.S = h / 1080;
        const S = state.S;
        state.petals = [];
        const count = Math.round(opts.density ?? 110);
        for (let i = 0; i < count; i++) {
          const depth = Math.random() * 0.8 + 0.2;
          state.petals.push({
            x: Math.random() * w, y: Math.random() * h,
            r: (Math.random() * 2.2 + 1.4) * S * (0.55 + depth * 0.9),
            depth, ph: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 6,
            vy: (Math.random() * 16 + 8) * S,
          });
        }
        state.stars = [];
        for (let i = 0; i < 44; i++) {
          const x = Math.random();
          const y = Math.random() * 0.72;
          if (Math.hypot((x - 0.78) * w, (y - 0.17) * h) < h * 0.13) { i--; continue; }
          state.stars.push({ x, y, r: (Math.random() * 1.1 + 0.35) * S, ph: Math.random() * Math.PI * 2, tw: 0.5 + Math.random() * 1.4 });
        }
        state.hill = [];
        const hn = 36;
        for (let j = 0; j <= hn; j++) {
          const t = j / hn;
          state.hill.push({
            x: t * w,
            y: h * (0.888 - 0.032 * Math.sin(t * Math.PI * 2.4 + 0.6) - 0.015 * Math.sin(t * Math.PI * 5.3 + 2.1)),
          });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#f9a8d4";
        const bgColor = opts.bgColor || null;
        const sc = opts.scale ?? 1;
        const TAU = Math.PI * 2;
        state.t += dt * speed;
        state.w = w;
        state.h = h;
        ctx.clearRect(0, 0, w, h);
        const S = state.S || 1;
        // night sky
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        if (bgColor) {
          bg.addColorStop(0, _mixHex(bgColor, "#04030c", 0.5));
          bg.addColorStop(0.55, _mixHex(bgColor, "#150f2c", 0.2));
          bg.addColorStop(1, _mixHex(bgColor, "#241a44", 0.3));
        } else {
          bg.addColorStop(0, "#0a0718");
          bg.addColorStop(0.55, "#140e28");
          bg.addColorStop(1, "#1e1638");
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // twinkling stars
        for (const s of state.stars) {
          const tw = 0.5 + 0.5 * Math.sin(state.t * s.tw + s.ph);
          ctx.globalAlpha = 0.12 + tw * 0.22;
          ctx.fillStyle = "#e9e4fb";
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // glowing moon, upper right
        const mx = w * 0.78, my = h * 0.17;
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.2);
        halo.addColorStop(0, "rgba(236, 230, 252, 0.34)");
        halo.addColorStop(0.45, "rgba(232, 226, 250, 0.1)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(mx - h * 0.2, my - h * 0.2, h * 0.4, h * 0.4);
        const mr = h * 0.047;
        const dg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
        dg.addColorStop(0, "rgba(250, 248, 255, 0.98)");
        dg.addColorStop(0.7, "rgba(236, 231, 248, 0.95)");
        dg.addColorStop(1, "rgba(204, 197, 233, 0.9)");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(158, 148, 196, 0.18)";
        ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.18, mr * 0.22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.28, mr * 0.15, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.02, my - mr * 0.42, mr * 0.11, 0, TAU); ctx.fill();
        // rolling hill
        ctx.fillStyle = "#17122c";
        ctx.beginPath(); ctx.moveTo(-6, h + 6);
        for (const p of state.hill) ctx.lineTo(p.x, p.y);
        ctx.lineTo(w + 6, h + 6); ctx.closePath(); ctx.fill();
        // moonlit crest on hill
        ctx.strokeStyle = "rgba(148, 130, 206, 0.15)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < state.hill.length; i++) {
          const p = state.hill[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        // falling petals
        const petalLight = _mixHex(color, "#ffffff", 0.38);
        const petalDeep = _mixHex(color, "#171028", 0.3);
        const gust = 0.7 + 0.3 * Math.sin(state.t * 1.3) * Math.sin(state.t * 0.3);
        for (const p of state.petals) {
          p.rot += p.rotSp * dt * speed;
          p.x += (44 + p.depth * 62) * S * gust * dt * speed;
          p.y += (p.vy + Math.sin(state.t * 2.6 + p.ph) * 7 * S) * dt * speed;
          if (p.x > w + 22) { p.x = -22; p.y = Math.random() * h; }
          if (p.y > h + 18) { p.y = -18; p.x = Math.random() * w; }
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = 0.5 + p.depth * 0.42;
          ctx.fillStyle = p.depth > 0.72 ? petalLight : p.depth > 0.42 ? color : petalDeep;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r * sc, p.r * 0.58 * sc, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },
  };

  let _snowSpriteCache = null;
  function _makeSnowSprites() {
    const levels = [];
    for (let lv = 0; lv < 4; lv++) {
      const frames = [];
      const sz = 32;
      for (let fi = 0; fi < 16; fi++) {
        const c = document.createElement('canvas');
        c.width = c.height = sz;
        const x = c.getContext('2d');
        const cx = sz / 2, cy = sz / 2;
        const rot = (fi / 16) * Math.PI * 2;
        const arms = lv + 3;
        const armLen = sz * 0.35;
        const coreR = sz * (0.06 + lv * 0.02);
        x.save();
        x.translate(cx, cy);
        x.rotate(rot);
        // core glow
        const glow = x.createRadialGradient(0, 0, 0, 0, 0, coreR * 3);
        glow.addColorStop(0, 'rgba(232,237,245,0.5)');
        glow.addColorStop(1, 'rgba(232,237,245,0)');
        x.fillStyle = glow;
        x.beginPath(); x.arc(0, 0, coreR * 3, 0, Math.PI * 2); x.fill();
        // crystal arms
        x.strokeStyle = 'rgba(232,237,245,0.9)';
        x.lineWidth = 1 + lv * 0.3;
        x.lineCap = 'round';
        for (let a = 0; a < arms; a++) {
          const angle = (a / arms) * Math.PI * 2;
          x.beginPath();
          x.moveTo(0, 0);
          x.lineTo(Math.cos(angle) * armLen, Math.sin(angle) * armLen);
          x.stroke();
          // side branches on larger flakes
          if (lv >= 1) {
            const bLen = armLen * 0.4;
            const bDist = armLen * 0.6;
            const bx = Math.cos(angle) * bDist;
            const by = Math.sin(angle) * bDist;
            for (let s = -1; s <= 1; s += 2) {
              const ba = angle + s * Math.PI / 4;
              x.beginPath();
              x.moveTo(bx, by);
              x.lineTo(bx + Math.cos(ba) * bLen, by + Math.sin(ba) * bLen);
              x.stroke();
            }
          }
        }
        // center dot
        x.fillStyle = 'rgba(255,255,255,0.9)';
        x.beginPath(); x.arc(0, 0, coreR, 0, Math.PI * 2); x.fill();
        x.restore();
        frames.push(c);
      }
      levels.push(frames);
    }
    return levels;
  }

  function _mixHex(hex1, hex2, t) {
    const [r1, g1, b1] = _hexToRgb(hex1);
    const [r2, g2, b2] = _hexToRgb(hex2);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }

  function _hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return [167, 139, 250];
    const clean = hex.replace("#", "");
    if (clean.length < 6) return [167, 139, 250];
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
  }

  function resetComet(c, w, h, speed) {
    c.vx = (Math.random() - 0.5) * 200;
    c.vy = (Math.random() - 0.5) * 200;
    c.speed = (Math.random() * 0.5 + 0.5) * speed;
    c.trail = [];
    c.maxTrail = Math.floor(Math.random() * 20 + 15);
    c.alpha = Math.random() * 0.4 + 0.3;
  }

  let activeId = null;
  let rafId = null;
  let canvasEl = null;
  let state = {};
  let lastTime = 0;
  let currentOptions = {};
  let resizeHandler = null;

  function _syncCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
    const resized = canvas.width !== pw || canvas.height !== ph;
    if (resized) {
      canvas.width = pw; canvas.height = ph;
      const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { w, h, ctx: canvas.getContext("2d"), resized };
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (resizeHandler) { window.removeEventListener("resize", resizeHandler); resizeHandler = null; }
    activeId = null; state = {}; lastTime = 0; currentOptions = {};
    if (canvasEl) {
      canvasEl.style.display = "none";
      canvasEl.style.zIndex = "1";
      canvasEl.style.backgroundColor = "";
      const ctx = canvasEl.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    canvasEl = null;
  }

  function start(sceneId, options, canvas) {
    stop();
    const scene = SCENES[sceneId];
    if (!scene || !canvas) return false;
    const opts = { ...scene.defaults, ...options };
    activeId = sceneId; currentOptions = opts; canvasEl = canvas;
    canvas.style.display = "block"; state = {};
    let dims = _syncCanvasSize(canvas);
    scene.init(state, dims.w, dims.h, opts);
    resizeHandler = () => { dims = _syncCanvasSize(canvas); scene.init(state, dims.w, dims.h, currentOptions); };
    window.addEventListener("resize", resizeHandler);
    lastTime = performance.now();
    function frame(now) {
      if (!activeId || canvasEl !== canvas) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now; dims = _syncCanvasSize(canvas);
      if (dims.resized) scene.init(state, dims.w, dims.h, currentOptions);
      scene.draw(dims.ctx, dims.w, dims.h, state, currentOptions, dt);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return true;
  }

  function updateOptions(options) {
    if (!activeId || !canvasEl) return;
    const scene = SCENES[activeId];
    currentOptions = { ...scene.defaults, ...options };
    const dims = _syncCanvasSize(canvasEl);
    scene.init(state, dims.w, dims.h, currentOptions);
  }

  function list() {
    return Object.entries(SCENES).map(([id, s]) => ({ id, label: s.label, defaults: s.defaults, options: s.options }));
  }

  function get(id) { return SCENES[id] || null; }
  function isActiveCanvas(canvas) { return canvasEl === canvas; }

  return { start, stop, updateOptions, setOptions: updateOptions, list, get, isActiveCanvas, SCENES };
})();
