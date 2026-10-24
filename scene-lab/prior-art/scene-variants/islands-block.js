    cloudsea: {
      // Floating Islands — lush islands drifting in a sunset sky, waterfalls
      // spilling off their edges into the void, with birds and drifting
      // sparkles. Replaces the cloud-sea scene; the id stays `cloudsea` so
      // saved themes keep working.
      label: "Floating Islands",
      defaults: { density: 4, speed: 1, color: "#7ec46a", scale: 1 },
      presetBgColors: ["#0a0e1f", "#0f0a1e", "#0d1226", "#1a0f28", "#0a1220", "#120a20"],
      options: [
        { key: "density", label: "Islands", type: "range", min: 2, max: 6, step: 1 },
        { key: "speed", label: "Drift Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
        { key: "scale", label: "Island Size", type: "range", min: 0.5, max: 1.8, step: 0.1 },
        { key: "color", label: "Grass Tint", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.S = h / 1080;
        const n = Math.max(2, Math.round(opts.density ?? 4));
        state.islands = [];
        for (let i = 0; i < n; i++) {
          const depth = i / Math.max(1, n - 1);
          const r = h * (0.05 + Math.random() * 0.05) * (1.25 - depth * 0.5);
          state.islands.push({
            x: w * (0.08 + Math.random() * 0.84),
            y: h * (0.16 + depth * 0.3),
            r,
            tilt: (Math.random() - 0.5) * 0.16,
            bob: 4 + Math.random() * 6,
            ph: Math.random() * 6.28,
            sp: (4 + Math.random() * 8) * state.S,
            treeN: 2 + Math.floor(Math.random() * 3),
            falls: Math.random() < 0.75 ? 1 : 0,
          });
        }
        state.farClouds = [];
        for (let i = 0; i < 6; i++) {
          state.farClouds.push({ x: Math.random() * w, y: h * (0.5 + Math.random() * 0.45), r: h * (0.03 + Math.random() * 0.05), sp: (2 + Math.random() * 4) * state.S });
        }
        state.birds = [];
        for (let i = 0; i < 5; i++) {
          state.birds.push({ x: Math.random() * w, y: h * (0.2 + Math.random() * 0.5), sp: (10 + Math.random() * 12) * state.S, flap: Math.random() * 6.28, size: 0.6 + Math.random() * 0.5 });
        }
        state.sparkles = [];
        for (let i = 0; i < 30; i++) {
          state.sparkles.push({ x: Math.random() * w, y: Math.random() * h * 0.7, r: (Math.random() * 1.2 + 0.4) * state.S, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const scale = opts.scale ?? 1;
        const grass = opts.color || "#7ec46a";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        const S = state.S || 1;
        ctx.clearRect(0, 0, w, h);
        const [gr, gg, gb] = _hexToRgb(grass);
        // dreamy sky — indigo melting into warm rose-gold at the bottom
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(0.6, _mixHex(bgColor, "#4a3a6a", 0.5));
          sky.addColorStop(1, _mixHex(bgColor, "#e0a06a", 0.75));
        } else {
          sky.addColorStop(0, "#0a0e1f");
          sky.addColorStop(0.5, "#332a5e");
          sky.addColorStop(0.85, "#8a5a7e");
          sky.addColorStop(1, "#f0a06a");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        // the warm sun low in the sky
        const sx = w * 0.22, sy = h * 0.6;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.3);
        glow.addColorStop(0, "rgba(255, 236, 205, 0.5)");
        glow.addColorStop(0.5, "rgba(255, 220, 180, 0.14)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sx - h * 0.3, sy - h * 0.3, h * 0.6, h * 0.6);
        // drifting far clouds
        for (const c of state.farClouds) {
          const cx = (c.x + state.t * c.sp * speed) % (w * 1.3);
          const g = ctx.createLinearGradient(0, c.y - c.r, 0, c.y + c.r);
          g.addColorStop(0, "rgba(255, 210, 190, 0.05)");
          g.addColorStop(0.5, `rgba(255, 220, 200, ${0.16 - (c.y / h) * 0.05})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(cx, c.y, c.r * 2.6, c.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        }
        // drifting sparkles in the air
        for (const sp of state.sparkles) {
          const tw = 0.5 + 0.5 * Math.sin(state.t * sp.sp + sp.ph);
          ctx.globalAlpha = tw * 0.18;
          ctx.fillStyle = "#fff2dd";
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // each floating island
        for (const is of state.islands) {
          const ix = (is.x + state.t * is.sp * speed) % (w * 1.3) - w * 0.15;
          const iy = is.y + Math.sin(state.t * 0.5 + is.ph) * is.bob * 0.02 * speed;
          const r = is.r * scale;
          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(is.tilt * Math.sin(state.t * 0.3 + is.ph));
          // dirt cone hanging below the grassy top
          ctx.fillStyle = "#3a2f26";
          ctx.beginPath();
          ctx.moveTo(-r * 0.95, 0);
          ctx.quadraticCurveTo(0, r * 1.05, r * 0.95, 0);
          ctx.quadraticCurveTo(r * 0.55, r * 0.35, 0, r * 0.42);
          ctx.quadraticCurveTo(-r * 0.55, r * 0.35, -r * 0.95, 0);
          ctx.closePath();
          ctx.fill();
          // darker streaks on the cone
          ctx.strokeStyle = "rgba(20, 15, 12, 0.35)";
          ctx.lineWidth = 1;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * r * 0.22, 0);
            ctx.quadraticCurveTo(i * r * 0.3, r * 0.55, i * r * 0.12, r * 0.9);
            ctx.stroke();
          }
          // grassy top
          const tg = ctx.createLinearGradient(0, -r * 0.12, 0, r * 0.05);
          tg.addColorStop(0, `rgb(${Math.min(255, gr + 40)}, ${Math.min(255, gg + 45)}, ${Math.min(255, gb + 30)})`);
          tg.addColorStop(1, `rgb(${gr}, ${gg}, ${gb})`);
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          // little grass tufts on the rim
          ctx.strokeStyle = "rgba(20, 60, 30, 0.5)";
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            const gx = Math.cos(a) * r * 0.9, gy = Math.sin(a) * r * 0.28;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + Math.cos(a) * r * 0.12, gy - r * 0.06);
            ctx.stroke();
          }
          // a waterfall spilling off one edge into the sky
          if (is.falls) {
            const fx = r * 0.55, fy = r * 0.18;
            const wl = r * (0.5 + 0.4 * Math.sin(state.t * 1.2 + is.ph));
            const wg = ctx.createLinearGradient(0, fy, 0, fy + wl);
            wg.addColorStop(0, "rgba(235, 248, 255, 0.75)");
            wg.addColorStop(1, "rgba(235, 248, 255, 0)");
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.moveTo(fx - r * 0.06, fy);
            ctx.quadraticCurveTo(fx - r * 0.02, fy + wl * 0.55, fx - r * 0.09, fy + wl);
            ctx.quadraticCurveTo(fx + r * 0.05, fy + wl * 0.6, fx + r * 0.1, fy + wl * 0.4);
            ctx.quadraticCurveTo(fx + r * 0.12, fy + wl * 0.5, fx + r * 0.09, fy);
            ctx.closePath();
            ctx.fill();
            // splash mist at the fall's end
            const mist = ctx.createRadialGradient(fx, fy + wl, 0, fx, fy + wl, r * 0.22);
            mist.addColorStop(0, "rgba(240, 250, 255, 0.3)");
            mist.addColorStop(1, "rgba(240, 250, 255, 0)");
            ctx.fillStyle = mist;
            ctx.beginPath(); ctx.arc(fx, fy + wl, r * 0.22, 0, Math.PI * 2); ctx.fill();
          }
          // trees on the top
          for (let i = 0; i < is.treeN; i++) {
            const a = -0.6 + (i / Math.max(1, is.treeN - 1)) * 1.2;
            const tx = Math.cos(a) * r * 0.55, ty = Math.sin(a) * r * 0.18 - r * 0.06;
            const th = r * (0.5 + 0.25 * Math.sin(i * 2.7));
            _drawPine(ctx, tx, ty + th * 0.05, th, "#12351f");
          }
          ctx.restore();
        }
        // birds circling between the islands
        for (const b of state.birds) {
          b.x += b.sp * dt * speed;
          if (b.x > w + 30) b.x = -30;
          const wing = Math.sin(state.t * 5 + b.flap) * 2.5;
          const bs = h * 0.005 * b.size;
          ctx.strokeStyle = "rgba(24, 18, 40, 0.6)";
          ctx.lineWidth = 1.3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(b.x - bs, b.y + wing);
          ctx.quadraticCurveTo(b.x, b.y - wing * 0.6, b.x + bs, b.y + wing);
          ctx.stroke();
        }
        // soft vignette to frame the scene
        const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(4, 3, 12, 0.38)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      },
    },

