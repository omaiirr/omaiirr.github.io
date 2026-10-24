    ocean: {
      label: "Ocean Shore",
      defaults: { speed: 1, intensity: 60, color: "#38bdf8" },
      presetBgColors: ["#020617", "#000000", "#04121c", "#06202c", "#0a1220", "#0d1117"],
      options: [
        { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "intensity", label: "Waves", type: "range", min: 10, max: 100, step: 5 },
        { key: "color", label: "Water Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.gulls = [];
        for (let i = 0; i < 3; i++) {
          state.gulls.push({ x: Math.random(), y: 0.08 + Math.random() * 0.1, dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * Math.PI * 2 });
        }
        state.foam = [];
        for (let i = 0; i < 22; i++) {
          state.foam.push({ x: Math.random(), r: Math.random() * 2.2 + 0.8, ph: Math.random() * Math.PI * 2, sp: Math.random() * 0.8 + 0.3 });
        }
        state.sparkles = [];
        for (let i = 0; i < 46; i++) {
          state.sparkles.push({ x: Math.random(), y: Math.random(), ph: Math.random() * Math.PI * 2, sp: Math.random() * 1.5 + 0.5 });
        }
        state.ripples = [];
        for (let i = 0; i < 8; i++) {
          state.ripples.push({ x: Math.random(), y: Math.random(), r: Math.random() * 3 + 1, ph: Math.random() * Math.PI * 2, sp: Math.random() * 0.6 + 0.3 });
        }
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const intensity = (opts.intensity ?? 60) / 100;
        const color = opts.color || "#38bdf8";
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        ctx.clearRect(0, 0, w, h);
        const [cr, cg, cb] = _hexToRgb(color);
        const horizon = h * 0.42;
        const shoreY = h * 0.78;
        // ── dusk sky: deep indigo up top melting into a warm mauve horizon ──
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        if (bgColor) {
          sky.addColorStop(0, bgColor);
          sky.addColorStop(1, _mixHex(bgColor, "#c96a5a", 0.4));
        } else {
          sky.addColorStop(0, "#0a1226");
          sky.addColorStop(0.45, "#16244a");
          sky.addColorStop(0.78, "#5a3f66");
          sky.addColorStop(1, "#c4715e");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);
        // stars in the upper sky
        if (!state.specks) {
          state.specks = [];
          for (let i = 0; i < 30; i++) state.specks.push({ x: Math.random(), y: Math.random() * 0.6, r: Math.random() * 0.9 + 0.2, ph: Math.random() * 6.28 });
        }
        for (const s of state.specks) {
          ctx.globalAlpha = 0.2 + 0.3 * Math.sin(state.t * 1.2 + s.ph);
          ctx.fillStyle = "#e8eefc";
          ctx.beginPath(); ctx.arc(s.x * w, s.y * horizon, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // setting sun low on the horizon — big warm disc with layered glow
        const sx = w * 0.66, sy = horizon * 0.98;
        const sunGlow1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.3);
        sunGlow1.addColorStop(0, "rgba(255, 214, 170, 0.75)");
        sunGlow1.addColorStop(0.35, "rgba(255, 160, 120, 0.3)");
        sunGlow1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow1;
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.3, 0, Math.PI * 2); ctx.fill();
        const sunGlow2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.13);
        sunGlow2.addColorStop(0, "rgba(255, 243, 220, 0.95)");
        sunGlow2.addColorStop(0.5, "rgba(255, 205, 155, 0.55)");
        sunGlow2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow2;
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 250, 240, 0.98)";
        ctx.beginPath(); ctx.arc(sx, sy, h * 0.034, 0, Math.PI * 2); ctx.fill();
        // low cloud bands catching the last light
        for (let i = 0; i < 4; i++) {
          const cy0 = horizon * (0.5 + i * 0.12);
          const cx0 = w * (0.25 + 0.5 * Math.sin(state.t * 0.03 + i * 1.6));
          const cw0 = w * (0.4 + 0.15 * Math.sin(state.t * 0.05 + i * 2));
          const warm = i < 2 ? "rgba(255, 190, 150," : "rgba(150, 110, 170,";
          const cg0 = ctx.createLinearGradient(0, cy0 - h * 0.012, 0, cy0 + h * 0.014);
          cg0.addColorStop(0, warm + ` ${0.2 - i * 0.03})`);
          cg0.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = cg0;
          ctx.beginPath(); ctx.ellipse(cx0, cy0, cw0 * 0.3, h * 0.011, 0, 0, Math.PI * 2); ctx.fill();
        }
        // mist hanging over the horizon
        const mist = ctx.createLinearGradient(0, horizon - h * 0.04, 0, horizon + h * 0.05);
        mist.addColorStop(0, "rgba(0,0,0,0)");
        mist.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.16)`);
        mist.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = mist;
        ctx.fillRect(0, horizon - h * 0.04, w, h * 0.09);
        // distant islet silhouette on the horizon
        ctx.fillStyle = "rgba(22, 26, 46, 0.9)";
        ctx.beginPath();
        ctx.moveTo(w * 0.12, horizon);
        ctx.quadraticCurveTo(w * 0.14, horizon - h * 0.035, w * 0.175, horizon);
        ctx.quadraticCurveTo(w * 0.2, horizon - h * 0.05, w * 0.225, horizon);
        ctx.closePath();
        ctx.fill();
        // ── the sea: layered swells with lit crests ──
        const waterTop = horizon + h * 0.004;
        const waterGrad = ctx.createLinearGradient(0, waterTop, 0, shoreY);
        waterGrad.addColorStop(0, `rgb(${Math.round(cr * 0.72)}, ${Math.round(cg * 0.78)}, ${Math.round(cb * 0.92)})`);
        waterGrad.addColorStop(0.45, `rgb(${Math.round(cr * 0.42)}, ${Math.round(cg * 0.55)}, ${Math.round(cb * 0.74)})`);
        waterGrad.addColorStop(1, `rgb(${Math.round(cr * 0.24)}, ${Math.round(cg * 0.4)}, ${Math.round(cb * 0.58)})`);
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, waterTop, w, shoreY - waterTop);
        const swell = (x, li, off) => {
          return Math.sin(x * 0.006 + state.t * (0.28 + li * 0.09) + off) * h * 0.016 * (0.55 + li * 0.5) +
                 Math.sin(x * 0.012 - state.t * 0.16 + li * 2.1 + off) * h * 0.008 * intensity;
        };
        const layers = 6;
        for (let li = 0; li < layers; li++) {
          const t0 = li / layers;
          const baseY = waterTop + (shoreY - waterTop) * (t0 * 0.82 + 0.08);
          const amp = h * (0.009 + li * 0.005) * intensity;
          const fillShade = 0.92 - t0 * 0.34;
          ctx.fillStyle = `rgba(${Math.round(cr * fillShade)}, ${Math.round(cg * fillShade)}, ${Math.round(cb * fillShade)}, ${0.42 + t0 * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(0, shoreY);
          ctx.lineTo(0, baseY);
          for (let x = 0; x <= w; x += 6) {
            ctx.lineTo(x, baseY + swell(x, li, li * 2.4) + Math.sin(x * 0.02 + state.t * (0.7 + li * 0.14) + li) * amp);
          }
          ctx.lineTo(w, shoreY);
          ctx.closePath();
          ctx.fill();
          // lit crest edge
          ctx.strokeStyle = `rgba(225, 245, 255, ${0.14 + li * 0.02})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            const y = baseY + swell(x, li, li * 2.4) + Math.sin(x * 0.02 + state.t * (0.7 + li * 0.14) + li) * amp;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // sun reflection — shimmering broken column on the water
        const reflW = w * 0.09;
        for (let i = 0; i < 18; i++) {
          const ry0 = waterTop + (i / 18) * (shoreY - waterTop) * 0.75;
          const rlen = h * 0.014 * (1 - i / 18) + h * 0.005;
          const rx0 = sx - reflW / 2 + Math.sin(state.t * 1.7 + i * 1.1) * w * 0.01;
          const wa = 0.34 * (1 - i / 19);
          ctx.globalAlpha = wa;
          ctx.fillStyle = "rgba(255, 235, 210, 0.95)";
          ctx.fillRect(rx0, ry0, reflW + Math.sin(state.t * 1.9 + i) * w * 0.022, rlen);
        }
        ctx.globalAlpha = 1;
        // broken foam streaks on the swells
        for (let i = 0; i < 26; i++) {
          const fx = (i * 0.137 + Math.sin(state.t * 0.3 + i * 2.7) * 0.04) % 1;
          const fy = 0.3 + (i % 5) * 0.1 + Math.sin(state.t * 0.6 + i * 1.3) * 0.02;
          ctx.globalAlpha = 0.14 + 0.14 * Math.sin(state.t * 1.4 + i * 2.1);
          ctx.fillStyle = "rgba(235, 250, 255, 0.9)";
          ctx.beginPath();
          ctx.ellipse(fx * w, waterTop + fy * (shoreY - waterTop), w * 0.028, h * 0.004, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // water sparkles
        for (const s of state.sparkles) {
          const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.ph + state.t * s.sp));
          ctx.globalAlpha = tw * 0.45;
          ctx.fillStyle = "#eaf7ff";
          ctx.beginPath(); ctx.arc(s.x * w, waterTop + s.y * (shoreY - waterTop), 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // ── the shore: wet sand glistening under the surf ──
        const sandGrad = ctx.createLinearGradient(0, shoreY, 0, h);
        if (bgColor) {
          sandGrad.addColorStop(0, _mixHex(bgColor, "#8a6a4a", 0.28));
          sandGrad.addColorStop(1, _mixHex(bgColor, "#3a2a1c", 0.6));
        } else {
          sandGrad.addColorStop(0, "#5a4650");
          sandGrad.addColorStop(0.35, "#6b5448");
          sandGrad.addColorStop(1, "#241a26");
        }
        ctx.fillStyle = sandGrad;
        ctx.fillRect(0, shoreY, w, h - shoreY);
        // receding wet-sand glints
        for (let i = 0; i < 44; i++) {
          const gx = (i * 0.061) % 1;
          const gy = shoreY + h * (0.02 + 0.05 * (i % 5)) + Math.sin(i * 7.3) * h * 0.02;
          ctx.globalAlpha = 0.05 + 0.05 * Math.sin(state.t * 0.5 + i);
          ctx.fillStyle = "rgba(225, 215, 240, 0.55)";
          ctx.fillRect(gx * w, gy, w * 0.012, h * 0.015);
        }
        ctx.globalAlpha = 1;
        // the surf line — foam advancing and retreating on the sand
        const waveEdge = shoreY + h * 0.03 + Math.sin(state.t * 0.55) * h * 0.012;
        const foamGrad = ctx.createLinearGradient(0, waveEdge - h * 0.03, 0, waveEdge + h * 0.055);
        foamGrad.addColorStop(0, "rgba(225, 248, 255, 0.2)");
        foamGrad.addColorStop(0.35, "rgba(240, 252, 255, 0.75)");
        foamGrad.addColorStop(1, "rgba(225, 248, 255, 0)");
        ctx.fillStyle = foamGrad;
        ctx.beginPath();
        ctx.moveTo(0, waveEdge + h * 0.055);
        for (let x = 0; x <= w; x += 7) {
          const yy = waveEdge + Math.sin(x * 0.014 + state.t * 1.05) * h * 0.009 + Math.sin(x * 0.031 - state.t * 1.6) * h * 0.004;
          ctx.lineTo(x, yy);
        }
        ctx.lineTo(w, waveEdge + h * 0.055);
        ctx.closePath();
        ctx.fill();
        // foam bubbles left on the sand
        for (const f of state.foam) {
          const fx = (f.x + Math.sin(state.t * 0.2 + f.ph) * 0.05 + 1) % 1;
          const fy = shoreY + h * (0.045 + 0.1 * Math.sin(state.t * 0.4 + f.ph * 3));
          const tw = 0.5 + 0.5 * Math.sin(state.t * f.sp + f.ph);
          ctx.globalAlpha = 0.08 + 0.16 * tw;
          ctx.strokeStyle = "rgba(240, 252, 255, 0.9)";
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(fx * w, fy, f.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // expanding ripples on the water
        for (const rp of state.ripples) {
          const ph = (state.t * rp.sp + rp.ph) % 1;
          const rx = rp.x * w, ry = waterTop + rp.y * (shoreY - waterTop) * 0.7;
          ctx.globalAlpha = (1 - ph) * 0.15;
          ctx.strokeStyle = "#dff3ff";
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.ellipse(rx, ry, (0.5 + ph * 2.2) * h * 0.02, (0.3 + ph * 1.4) * h * 0.012, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // gulls
        for (const g of state.gulls) {
          g.x += g.dir * dt * 0.025;
          if (g.x > 1.06) g.x = -0.06;
          if (g.x < -0.06) g.x = 1.06;
          const gy = g.y * horizon + Math.sin(state.t * 2 + g.ph) * h * 0.007;
          ctx.strokeStyle = "rgba(25, 30, 48, 0.85)";
          ctx.lineWidth = 1;
          const gw = w * 0.016;
          ctx.beginPath();
          ctx.moveTo(g.x * w - gw, gy);
          ctx.quadraticCurveTo(g.x * w - gw * 0.4, gy - gw * 0.5, g.x * w, gy);
          ctx.quadraticCurveTo(g.x * w + gw * 0.4, gy - gw * 0.5, g.x * w + gw, gy);
          ctx.stroke();
        }
      },
    },
