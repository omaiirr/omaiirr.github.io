    origami: {
      label: "Origami Cranes",
      defaults: { density: 5, speed: 1, scale: 1 },
      presetBgColors: ["#0d1830", "#000000", "#1a1226", "#16213e", "#0a0e27", "#241522"],
      options: [
        { key: "density", label: "Cranes", type: "range", min: 2, max: 10, step: 1 },
        { key: "speed", label: "Flight Speed", type: "range", min: 0.3, max: 2.5, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 1.8, step: 0.1 },
      ],
      init(state, w, h, opts) {
        const count = opts.density ?? 5;
        state.t = 0;
        state.S = h / 1080;
        state.cranes = [];
        for (let i = 0; i < count; i++) {
          const depth = Math.random() * 0.7 + 0.3;
          state.cranes.push({
            x: Math.random() * w,
            y: h * (0.2 + Math.random() * 0.42),
            dir: Math.random() < 0.5 ? 1 : -1,
            s: (0.05 + 0.045 * depth) * h * (opts.scale ?? 1),
            sp: (0.45 + Math.random() * 0.6) * (opts.speed ?? 1) * (0.6 + depth),
            phase: Math.random() * Math.PI * 2,
            flapSp: 3 + Math.random() * 2.2,
            bob: Math.random() * Math.PI * 2,
            alpha: 0.55 + depth * 0.45,
          });
        }
        state.scraps = [];
        for (let i = 0; i < 10; i++) {
          state.scraps.push({
            x: Math.random() * w, y: Math.random() * h,
            r: (2 + Math.random() * 3) * state.S,
            vy: (8 + Math.random() * 16) * state.S,
            vx: (Math.random() - 0.5) * 10 * state.S,
            rot: Math.random() * Math.PI, rotSp: (Math.random() - 0.5) * 2,
            ph: Math.random() * Math.PI * 2,
          });
        }
        state.clouds = [];
        for (let i = 0; i < 4; i++) {
          state.clouds.push({ x: Math.random(), y: 0.14 + Math.random() * 0.2, w: 0.3 + Math.random() * 0.3, sp: Math.random() * 0.02 + 0.008, a: 0.09 + Math.random() * 0.12 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt;
        ctx.clearRect(0, 0, w, h);
        // dusk sky — deep indigo fading to a warm glow near the horizon
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.85);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(1, _mixHex(bgColor, "#c98574", 0.35));
        } else {
          sky.addColorStop(0, "#0d1830");
          sky.addColorStop(0.5, "#233a5e");
          sky.addColorStop(0.8, "#6b5370");
          sky.addColorStop(1, "#c98574");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h * 0.85);
        // soft glowing sun low on the horizon
        const sx = w * 0.5, sy = h * 0.82;
        const sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.28);
        sunGlow.addColorStop(0, "rgba(255, 236, 205, 0.9)");
        sunGlow.addColorStop(0.35, "rgba(255, 205, 165, 0.4)");
        sunGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 243, 222, 0.95)";
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.05, 0, Math.PI * 2); ctx.fill();
        // thin cloud bands catching the last light
        for (const cl of state.clouds) {
          cl.x += cl.sp * dt;
          if (cl.x > 1.15) cl.x = -0.15;
          ctx.globalAlpha = cl.a;
          ctx.fillStyle = "rgba(255, 214, 200, 0.9)";
          ctx.beginPath(); ctx.ellipse(cl.x * w, cl.y * h, cl.w * w * 0.3, h * 0.008, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse((cl.x + 0.06) * w, (cl.y - 0.02) * h, cl.w * w * 0.2, h * 0.006, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // ground haze at the horizon
        const haze = ctx.createLinearGradient(0, h * 0.72, 0, h * 0.88);
        haze.addColorStop(0, "rgba(0,0,0,0)");
        haze.addColorStop(1, "rgba(30, 22, 40, 0.35)");
        ctx.fillStyle = haze;
        ctx.fillRect(0, h * 0.72, w, h * 0.16);
        // cranes gliding across the sky
        for (const cr of state.cranes) {
          cr.x += cr.dir * cr.sp * w * 0.045 * dt;
          if (cr.dir > 0 && cr.x > w + cr.s * 2) { cr.x = -cr.s * 2; cr.y = h * (0.2 + Math.random() * 0.4); }
          if (cr.dir < 0 && cr.x < -cr.s * 2) { cr.x = w + cr.s * 2; cr.y = h * (0.2 + Math.random() * 0.4); }
          const bob = Math.sin(state.t * 0.8 + cr.bob) * h * 0.012;
          const flap = 0.5 + 0.5 * Math.sin(state.t * cr.flapSp + cr.phase);
          _drawCrane(ctx, cr.x, cr.y + bob, cr.s, flap, cr.dir, cr.alpha);
        }
        // drifting paper scraps
        for (const sc of state.scraps) {
          sc.y += sc.vy * dt * speed;
          sc.x += sc.vx * dt * speed + Math.sin(state.t * 0.7 + sc.ph) * 4 * state.S * dt;
          sc.rot += sc.rotSp * dt;
          if (sc.y > h + 8) { sc.y = -8; sc.x = Math.random() * w; }
          ctx.save();
          ctx.translate(sc.x, sc.y);
          ctx.rotate(sc.rot);
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = "rgba(250, 246, 240, 0.9)";
          ctx.fillRect(-sc.r, -sc.r * 0.5, sc.r * 2, sc.r);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },

    lighttunnel: {
      label: "Light Tunnel",
      defaults: { density: 26, speed: 1, color: "#7dd3fc", scale: 1 },
      presetBgColors: ["#05060f", "#000000", "#0a0e27", "#100a1a", "#0f172a", "#040a12"],
      options: [
        { key: "density", label: "Rings", type: "range", min: 12, max: 44, step: 2 },
        { key: "speed", label: "Flow Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "scale", label: "Tunnel Size", type: "range", min: 0.5, max: 1.5, step: 0.1 },
        { key: "color", label: "Light Color", type: "color" },
      ],
      init(state) { state.t = 0; },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const density = opts.density ?? 26;
        const color = opts.color || "#7dd3fc";
        const scale = opts.scale ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.46;
        const Rmax = Math.max(w, h) * 0.72 * scale;
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "#05060f";
          ctx.fillRect(0, 0, w, h);
        }
        const [cr, cg, cb] = _hexToRgb(color);
        // soft aura around the core
        const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rmax * 0.5);
        aura.addColorStop(0, `rgba(${cr},${cg},${cb},0.3)`);
        aura.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.06)`);
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // slow-rotating light rays
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.t * 0.03);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const g = ctx.createLinearGradient(0, 0, Math.cos(a) * Rmax, Math.sin(a) * Rmax);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * Rmax, Math.sin(a) * Rmax); ctx.stroke();
        }
        ctx.restore();
        // perspective rings streaming out from the core
        const N = Math.round(density);
        for (let j = 0; j < N; j++) {
          const u = ((state.t * 0.22 + j / N) % 1);
          const r = Math.pow(u, 2.2) * Rmax + Rmax * 0.012;
          const alpha = Math.pow(Math.sin(Math.PI * u), 0.75) * 0.5;
          if (alpha < 0.01) continue;
          ctx.strokeStyle = `rgba(${Math.min(255, cr + 120)}, ${Math.min(255, cg + 110)}, 255, ${alpha})`;
          ctx.lineWidth = 1.2 + u * 7;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // bright pulsing core
        const pulse = 0.85 + 0.15 * Math.sin(state.t * 1.4);
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rmax * 0.16);
        core.addColorStop(0, `rgba(255,255,255,${0.95 * pulse})`);
        core.addColorStop(0.25, `rgba(${cr},${cg},${cb},${0.5 * pulse})`);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(cx, cy, Rmax * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // vignette
        const vg = ctx.createRadialGradient(cx, cy, Rmax * 0.35, cx, cy, Rmax);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(0, 0, 6, 0.6)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      },
    },

    astronaut: {
      label: "Astronaut Tether",
      defaults: { density: 110, speed: 1, scale: 1, color: "#8b5cf6" },
      presetBgColors: ["#05070f", "#000000", "#0a0a1a", "#0a0e27", "#0f0a1a", "#040a12"],
      options: [
        { key: "density", label: "Stars", type: "range", min: 40, max: 220, step: 10 },
        { key: "speed", label: "Drift Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 1.6, step: 0.1 },
        { key: "color", label: "Nebula Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        const count = opts.density ?? 110;
        state.S = h / 1080;
        state.stars = [];
        for (let i = 0; i < count; i++) {
          state.stars.push({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.4 + 0.3) * state.S, ph: Math.random() * Math.PI * 2, sp: Math.random() * 1.6 + 0.4, big: Math.random() < 0.08 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const scale = opts.scale ?? 1;
        const color = opts.color || "#8b5cf6";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const S = state.S;
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          const sp = ctx.createLinearGradient(0, 0, 0, h);
          sp.addColorStop(0, "#04060e");
          sp.addColorStop(1, "#0a0d1c");
          ctx.fillStyle = sp;
          ctx.fillRect(0, 0, w, h);
        }
        const [nr, ng, nb] = _hexToRgb(color);
        // nebula washes
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const neb = [
          { x: w * 0.2, y: h * 0.22, r: h * 0.5, a: 0.16 },
          { x: w * 0.85, y: h * 0.8, r: h * 0.55, a: 0.12 },
          { x: w * 0.55, y: h * 0.5, r: h * 0.45, a: 0.1 },
        ];
        for (const n of neb) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          g.addColorStop(0, `rgba(${nr},${ng},${nb},${n.a})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
        }
        ctx.restore();
        // distant ringed planet, bottom-left
        {
          const px = w * 0.14, py = h * 0.86, pr = h * 0.16;
          const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
          pg.addColorStop(0, "#8fa3d8");
          pg.addColorStop(1, "#2c3a63");
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.35);
          ctx.strokeStyle = "rgba(190, 205, 240, 0.35)";
          ctx.lineWidth = pr * 0.08;
          ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.6, pr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        // stars
        for (const st of state.stars) {
          const tw = 0.5 + 0.5 * Math.sin(state.t * st.sp + st.ph);
          ctx.globalAlpha = tw * (st.big ? 0.95 : 0.6);
          ctx.fillStyle = st.big ? "#ffffff" : "#cdd6f0";
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (st.big ? 1.6 : 1), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // tether — a waving line from off-screen left to the astronaut
        const ax = w * 0.68, ay = h * 0.46;
        const bob = Math.sin(state.t * 0.5) * h * 0.01;
        const tumble = Math.sin(state.t * 0.32) * 0.14;
        const segs = 16;
        ctx.strokeStyle = "rgba(190, 205, 255, 0.15)";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const tt = i / segs;
          const px = -w * 0.05 + (ax + w * 0.05) * tt;
          const py = h * 0.32 + (ay + bob - h * 0.32) * tt + Math.sin(state.t * 0.9 + tt * 4.2) * h * 0.045 * tt * (1 - tt);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(225, 230, 245, 0.8)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        _drawAstronaut(ctx, ax, ay + bob, h * 0.135 * scale, tumble, state.t);
      },
    },

    dunes: {
      label: "Kinetic Dunes",
      defaults: { density: 60, speed: 1, color: "#e2b46c" },
      presetBgColors: ["#0e0a06", "#000000", "#1a1208", "#201407", "#0f0a05", "#26180a"],
      options: [
        { key: "density", label: "Ripples", type: "range", min: 20, max: 120, step: 5 },
        { key: "speed", label: "Flow Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "color", label: "Sand Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        state.sparkles = [];
        const count = Math.round((opts.density ?? 60) * 0.7);
        for (let i = 0; i < count; i++) {
          state.sparkles.push({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.3 + 0.5) * state.S, ph: Math.random() * Math.PI * 2, sp: Math.random() * 0.8 + 0.3, vx: (Math.random() - 0.5) * 6 * state.S, vy: (Math.random() * 4 + 2) * state.S });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#e2b46c";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        // sky — warm dusk haze over the desert
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          const sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
          sky.addColorStop(0, "#2a1d3a");
          sky.addColorStop(1, "#c98f63");
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, w, h * 0.4);
        }
        // a pale sun low in the sky
        const sx = w * 0.78, sy = h * 0.3;
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.16);
        sun.addColorStop(0, "rgba(255, 244, 225, 0.9)");
        sun.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.16, 0, Math.PI * 2); ctx.fill();
        // dune bands — crests drift and swell so the sand seems to flow
        const bands = 6;
        const skyH = h * 0.4;
        for (let b = 0; b < bands; b++) {
          const t0 = b / bands;
          const baseY = skyH + (h - skyH) * Math.pow(t0, 0.72);
          const amp = h * (0.045 + t0 * 0.05) * (1 + 0.12 * Math.sin(state.t * 0.18 + b * 1.7));
          const freq = 0.004 + t0 * 0.004;
          const drift = state.t * (0.1 + b * 0.045);
          const shade = 1 - t0 * 0.5;
          const rr = Math.round(Math.min(255, cr * (0.55 + shade * 0.6)));
          const gg = Math.round(Math.min(255, cg * (0.5 + shade * 0.6)));
          const bb = Math.round(Math.min(255, cb * (0.42 + shade * 0.55)));
          const g = ctx.createLinearGradient(0, baseY - amp, 0, h);
          g.addColorStop(0, `rgb(${Math.min(255, rr + 40)}, ${Math.min(255, gg + 34)}, ${Math.min(255, bb + 26)})`);
          g.addColorStop(0.35, `rgb(${rr}, ${gg}, ${bb})`);
          g.addColorStop(1, `rgb(${Math.round(rr * 0.55)}, ${Math.round(gg * 0.5)}, ${Math.round(bb * 0.42)})`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, baseY);
          for (let x = 0; x <= w; x += 4) {
            const y = baseY
              + Math.sin(x * freq + drift + b * 2.2) * amp
              + Math.sin(x * (freq * 3.1 + 0.001) - drift * 1.6 + b) * amp * 0.32
              + Math.sin(x * 0.0012 - state.t * 0.05 + b * 3) * h * 0.02;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
          // crest highlight
          ctx.strokeStyle = `rgba(255, 250, 235, ${0.35 - t0 * 0.14})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const y = baseY
              + Math.sin(x * freq + drift + b * 2.2) * amp
              + Math.sin(x * (freq * 3.1 + 0.001) - drift * 1.6 + b) * amp * 0.32
              + Math.sin(x * 0.0012 - state.t * 0.05 + b * 3) * h * 0.02;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // drifting sand sparkles
        for (const sp of state.sparkles) {
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          if (sp.y > h + 4) { sp.y = -4; sp.x = Math.random() * w; }
          const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(state.t * sp.sp + sp.ph));
          ctx.globalAlpha = tw * 0.5;
          ctx.fillStyle = "rgba(255, 248, 225, 0.95)";
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

