(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  ThemeScenes.register("neoncity", {
    label: "Neon City",
    defaults: { density: 12, speed: 1, color: "#ff6ec7" },
    presetBgColors: ["#0a0a1a", "#050510", "#0d0a1f", "#120820", "#08081a", "#0a0f1e"],
    presetCombos: [
      { color: "#ff6ec7", bg: "#0a0a1a" }, 
      { color: "#22d3ee", bg: "#050d1a" }, 
      { color: "#a78bfa", bg: "#120820" }, 
      { color: "#4ade80", bg: "#07120a" }, 
      { color: "#fbbf24", bg: "#150f0a" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
    ],
    options: [
      { key: "density", label: "Buildings", type: "range", min: 6, max: 25, step: 1 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Neon Color", type: "color" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const neon = _hexToRgb(opts.color || "#ff6ec7");

      const count = opts.density ?? 12;
      state.buildings = [];
      for (let i = 0; i < count; i++) {
        const bw = (w / count) * (0.55 + Math.random() * 0.75);
        const bh = h * (0.35 + Math.random() * 0.5); 
        const x = (i / count) * w + (Math.random() - 0.5) * (w / count) * 0.35;
        const cols = Math.max(1, Math.floor(bw / 17));
        const rows = Math.max(1, Math.floor(bh / 24));
        const windows = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            windows.push({
              lit: Math.random() < 0.62,
              a: 0.25 + Math.random() * 0.45,
              sp: Math.random() < 0.12 ? 4 + Math.random() * 4 : 0.5 + Math.random() * 1.4,
              ph: Math.random() * Math.PI * 2,
            });
          }
        }
        const hasAntenna = Math.random() < 0.45;
        state.buildings.push({
          x,
          w: bw,
          h: bh,
          windows,
          cols,
          rows,
          neonY: 0.22 + Math.random() * 0.45, 
          phase: Math.random() * Math.PI * 2,
          edge: Math.random() < 0.5 ? -1 : 1, 
          antenna: hasAntenna,
          antennaX: hasAntenna ? 0.2 + Math.random() * 0.6 : 0,
          antennaH: hasAntenna ? (8 + Math.random() * 14) * S : 0,
          beacon: Math.random() < 0.55,
          beacT: Math.random() * Math.PI * 2,
          drop: Math.random() < 0.3, 
          dropT: Math.random() * 3,
        });
      }

      state.back = [];
      const nBack = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < nBack; i++) {
        state.back.push({
          x: (i / nBack) * w + (Math.random() - 0.5) * w * 0.2,
          w: w * (0.05 + Math.random() * 0.05),
          h: h * (0.5 + Math.random() * 0.3),
        });
      }

      state.rain = [];
      const nRain = Math.min(120, Math.round(w / 16));
      for (let i = 0; i < nRain; i++) {
        state.rain.push({
          x: Math.random() * w,
          y: Math.random() * h,
          len: (5 + Math.random() * 10) * S,
          sp: (300 + Math.random() * 220) * S,
          ph: Math.random() * Math.PI * 2,
        });
      }
      state.splashes = [];

      const gy = h * 0.9;
      state.lamps = [];
      for (let i = 0; i < 3; i++) {
        state.lamps.push({
          x: w * (0.14 + 0.36 * i + (Math.random() - 0.5) * 0.05),
          baseY: gy + 3 * S,
          headY: gy - (34 + Math.random() * 18) * S,
          headX: 0,
          r: (42 + Math.random() * 18) * S,
          ph: Math.random() * Math.PI * 2,
        });
      }
      for (const L of state.lamps) {
        L.headX = L.x + (10 + Math.random() * 6) * S; 
      }

      const laneY = [gy + (h - gy) * 0.3, gy + (h - gy) * 0.68];
      state.cars = [];
      const nCars = 4;
      const bodyCols = ["#171c30", "#1e1a33", "#201a2d", "#15202f"];
      const cabCols = ["#222a4a", "#2c2650", "#2e2646", "#1f2e45"];
      for (let i = 0; i < nCars; i++) {
        const far = i % 2 === 0;
        const dir = far ? 1 : -1; 
        const len = (far ? 13 : 21) * S * (0.9 + Math.random() * 0.3);
        state.cars.push({
          x: Math.random() * w,
          y: laneY[far ? 0 : 1],
          len,
          h: len * (far ? 0.3 : 0.34),
          vx: dir * (far ? 55 : 85) * S * (0.85 + Math.random() * 0.35),
          body: bodyCols[i],
          cab: cabCols[i],
          far,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const neon = _hexToRgb(opts.color || "#ff6ec7");
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed; 
      const dtm = dt * speed; 
      const S = state.S;
      const gy = h * 0.9; 

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#04040d");
        sky.addColorStop(0.6, "#070718");
        sky.addColorStop(1, "#0d0a1f");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.55);
      glow.addColorStop(0, _rgba(neon, 0.12));
      glow.addColorStop(0.5, _rgba(neon, 0.04));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      for (const b of state.back) {
        ctx.fillStyle = "rgba(26,30,58,0.55)";
        ctx.fillRect(b.x, gy - b.h, b.w, b.h);
      }

      for (const b of state.buildings) {
        const by = gy - b.h;
        ctx.fillStyle = "#0b0d1c";
        ctx.fillRect(b.x, by, b.w, b.h);
        ctx.fillStyle = "rgba(120,130,190,0.18)";
        ctx.fillRect(b.x, by, b.w, Math.max(2, 3 * S));

        const wPad = b.w * 0.16;
        const hPad = b.h * 0.12;
        let wi = 0;
        for (let r = 0; r < b.rows; r++) {
          for (let c = 0; c < b.cols; c++) {
            const win = b.windows[wi++];
            if (!win.lit) continue;
            const wx = b.x + wPad + (c / Math.max(1, b.cols - 1)) * (b.w - wPad * 2);
            const wy = by + hPad + (r / Math.max(1, b.rows - 1)) * (b.h - hPad * 2);
            const tw = 0.72 + 0.28 * Math.sin(t * win.sp + win.ph);
            ctx.fillStyle = `rgba(205,222,255,${(win.a * tw).toFixed(3)})`;
            ctx.fillRect(wx - 2.2 * S, wy - 3 * S, 4.4 * S, 6 * S);
          }
        }

        const ny = by + b.h * b.neonY;
        let flick = 0.62 + 0.38 * Math.sin(t * 3.1 + b.phase) * Math.sin(t * 7.7 + b.phase * 2);
        if (b.drop) {
          const dtp = (t * 0.9 + b.dropT) % 3.2;
          if (dtp > 2.6) flick *= Math.max(0, 1 - (dtp - 2.6) * 1.6); 
        }
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.65 * flick;
        ctx.strokeStyle = _rgba(neon, 0.9);
        ctx.lineWidth = Math.max(1.5, 2.2 * S);
        ctx.shadowColor = _rgba(neon, 1);
        ctx.shadowBlur = 14 * S;
        ctx.beginPath();
        ctx.moveTo(b.x + 4 * S, ny);
        ctx.lineTo(b.x + b.w - 4 * S, ny);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.35 + 0.4 * flick;
        ctx.strokeStyle = _rgba(neon, 0.8);
        ctx.lineWidth = Math.max(1, 1.6 * S);
        ctx.shadowColor = _rgba(neon, 1);
        ctx.shadowBlur = 8 * S;
        const ex = b.edge > 0 ? b.x + b.w - 0.5 : b.x + 0.5;
        ctx.beginPath();
        ctx.moveTo(ex, by);
        ctx.lineTo(ex, by + b.h);
        ctx.stroke();
        ctx.restore();

        if (b.antenna) {
          const ax = b.x + b.w * b.antennaX;
          const ah = b.antennaH;
          ctx.strokeStyle = "rgba(90,100,150,0.7)";
          ctx.lineWidth = 1.2 * S;
          ctx.beginPath();
          ctx.moveTo(ax, by);
          ctx.lineTo(ax, by - ah);
          ctx.stroke();
          if (b.beacon) {
            const blink = Math.max(0, Math.sin(t * 2.4 + b.beacT));
            ctx.save();
            ctx.globalAlpha = 0.2 + 0.8 * blink;
            ctx.fillStyle = "#ff4747";
            ctx.shadowColor = "#ff4747";
            ctx.shadowBlur = 10 * blink * S;
            ctx.beginPath();
            ctx.arc(ax, by - ah, Math.max(1.2, 2 * S), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ctx.lineWidth = Math.max(0.8, S);
      for (const d of state.rain) {
        d.y += d.sp * dtm;
        d.x += d.sp * 0.08 * dtm;
        if (d.y > h + d.len) {
          d.y = -d.len;
          d.x = Math.random() * w;
        }
        if (d.y >= gy && d.y < gy + 8 * S && Math.random() < 0.15 && state.splashes.length < 60) {
          state.splashes.push({
            x: d.x,
            y: gy + 2 * S,
            t: 0,
            max: 0.3 + Math.random() * 0.2,
            r: (2.5 + Math.random() * 3) * S,
          });
        }
        const nearGround = Math.min(1, d.y / (h * 0.8));
        ctx.strokeStyle = `rgba(150,170,215,${(0.06 + 0.13 * nearGround).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 2 * S, d.y + d.len);
        ctx.stroke();
      }

      const street = ctx.createLinearGradient(0, gy, 0, h);
      street.addColorStop(0, "rgba(10,12,26,0.95)");
      street.addColorStop(1, "rgba(3,4,10,0.98)");
      ctx.fillStyle = street;
      ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = "rgba(170,190,240,0.07)";
      ctx.fillRect(0, gy, w, Math.max(1, S));
      for (const b of state.buildings) {
        const sy = gy - b.h + b.h * b.neonY;
        if (sy >= gy) continue; 
        let flick = 0.62 + 0.38 * Math.sin(t * 3.1 + b.phase) * Math.sin(t * 7.7 + b.phase * 2);
        if (b.drop) {
          const dtp = (t * 0.9 + b.dropT) % 3.2;
          if (dtp > 2.6) flick *= Math.max(0, 1 - (dtp - 2.6) * 1.6);
        }
        const refl = ctx.createLinearGradient(0, gy, 0, h);
        refl.addColorStop(0, _rgba(neon, (0.05 + 0.11 * flick).toFixed(3)));
        refl.addColorStop(0.35, _rgba(neon, 0.04));
        refl.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = refl;
        const rw = b.w * 0.55;
        ctx.fillRect(b.x + b.w / 2 - rw / 2, gy, rw, h - gy);
      }

      for (const L of state.lamps) {
        const flick = 0.9 + 0.1 * Math.sin(t * 1.3 + L.ph);
        ctx.strokeStyle = "rgba(45,52,92,0.9)";
        ctx.lineWidth = Math.max(1.1, 1.8 * S);
        ctx.beginPath();
        ctx.moveTo(L.x, L.baseY);
        ctx.lineTo(L.x, L.headY + 1.5 * S);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(L.x, L.headY + 1.5 * S);
        ctx.lineTo(L.headX, L.headY);
        ctx.stroke();
        const halo = ctx.createRadialGradient(L.headX, L.headY, 0, L.headX, L.headY, L.r);
        halo.addColorStop(0, _rgba(neon, 0.16 * flick));
        halo.addColorStop(0.45, _rgba(neon, 0.055 * flick));
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(L.headX - L.r, L.headY - L.r, L.r * 2, L.r * 2);
        const pool = ctx.createLinearGradient(0, L.headY, 0, h);
        pool.addColorStop(0, _rgba(neon, 0.06 * flick));
        pool.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = pool;
        ctx.fillRect(L.headX - L.r * 0.7, L.headY, L.r * 1.4, h - L.headY);
        ctx.fillStyle = _rgba(neon, 0.85);
        ctx.beginPath();
        ctx.arc(L.headX, L.headY, Math.max(1, 1.5 * S), 0, Math.PI * 2);
        ctx.fill();
      }

      const dot = (x, y, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
      for (const c of state.cars) {
        c.x += c.vx * dtm;
        if (c.vx > 0 && c.x - c.len > w) c.x = -c.len;
        if (c.vx < 0 && c.x + c.len < 0) c.x = w + c.len;
        const fwd = c.vx > 0 ? 1 : -1;
        const cy = c.y;
        const cH = c.h;
        const frontX = fwd > 0 ? c.x + c.len : c.x;
        const rearX = fwd > 0 ? c.x : c.x + c.len;

        if (cy + cH < h) {
          const rTop = cy + cH;
          const bodyRef = ctx.createLinearGradient(0, rTop, 0, h);
          bodyRef.addColorStop(0, "rgba(10,12,24,0.4)");
          bodyRef.addColorStop(1, "rgba(10,12,24,0)");
          ctx.fillStyle = bodyRef;
          ctx.fillRect(c.x, rTop, c.len, h - rTop);
          const refW = Math.max(1.4, 2.4 * S);
          const hlRef = ctx.createLinearGradient(0, rTop, 0, h);
          hlRef.addColorStop(0, "rgba(255,236,190,0.15)");
          hlRef.addColorStop(1, "rgba(255,236,190,0)");
          ctx.fillStyle = hlRef;
          ctx.fillRect(frontX - refW / 2, rTop, refW, h - rTop);
          const tlRef = ctx.createLinearGradient(0, rTop, 0, h);
          tlRef.addColorStop(0, "rgba(255,71,71,0.13)");
          tlRef.addColorStop(1, "rgba(255,71,71,0)");
          ctx.fillStyle = tlRef;
          ctx.fillRect(rearX - refW / 2, rTop, refW, h - rTop);
        }

        ctx.fillStyle = c.body;
        ctx.fillRect(c.x, cy, c.len, cH);
        ctx.fillStyle = "rgba(4,5,10,0.45)";
        ctx.fillRect(c.x, cy + cH * 0.72, c.len, cH * 0.28);
        ctx.fillStyle = "rgba(150,170,215,0.14)";
        ctx.fillRect(c.x, cy, c.len, Math.max(1, 1.2 * S));

        if (!c.far) {
          const wh = cH * 0.36;
          const wy = cy + cH - wh * 0.4;
          ctx.fillStyle = "#05070d";
          ctx.fillRect(c.x + c.len * 0.07, wy, c.len * 0.14, wh);
          ctx.fillRect(c.x + c.len * 0.79, wy, c.len * 0.14, wh);
          const cabW = c.len * 0.44;
          const cabH = cH * 0.85;
          const cabX = fwd > 0 ? c.x + c.len * 0.13 : c.x + c.len * 0.43;
          ctx.fillStyle = c.cab;
          ctx.fillRect(cabX, cy - cabH, cabW, cabH);
          const wsW = Math.max(1, cabW * 0.26);
          ctx.fillStyle = "rgba(160,182,228,0.42)";
          ctx.fillRect(fwd > 0 ? cabX + cabW * 0.64 : cabX + cabW * 0.1, cy - cabH + 0.8 * S, wsW, cabH - 1.6 * S);
          dot(fwd > 0 ? frontX - 1.3 * S : frontX, cy + cH * 0.2, Math.max(1, 1.3 * S), Math.max(1, 1.7 * S), "#ffedbe");
          dot(fwd > 0 ? frontX - 1.3 * S : frontX, cy + cH * 0.62, Math.max(1, 1.3 * S), Math.max(1, 1.7 * S), "#ffe9b0");
          dot(fwd > 0 ? rearX : rearX - 1.2 * S, cy + cH * 0.2, Math.max(1, 1.2 * S), Math.max(1, 1.5 * S), "#ff5a5a");
          dot(fwd > 0 ? rearX : rearX - 1.2 * S, cy + cH * 0.62, Math.max(1, 1.2 * S), Math.max(1, 1.5 * S), "#ff4747");
        } else {
          const cabW = c.len * 0.46;
          const cabH = cH * 0.8;
          const cabX = fwd > 0 ? c.x + c.len * 0.12 : c.x + c.len * 0.42;
          ctx.fillStyle = c.cab;
          ctx.fillRect(cabX, cy - cabH, cabW, cabH);
          dot(fwd > 0 ? frontX - 1.2 * S : frontX, cy + cH * 0.35, Math.max(1, 1.2 * S), Math.max(1, 1.5 * S), "#ffedbe");
          dot(fwd > 0 ? rearX : rearX - 1.1 * S, cy + cH * 0.35, Math.max(1, 1.1 * S), Math.max(1, 1.4 * S), "#ff5a5a");
        }

        const hg = ctx.createRadialGradient(frontX, cy + cH / 2, 0, frontX, cy + cH / 2, c.len * 0.9);
        hg.addColorStop(0, "rgba(255,236,190,0.5)");
        hg.addColorStop(0.35, "rgba(255,236,190,0.15)");
        hg.addColorStop(1, "rgba(255,236,190,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(frontX - c.len * 0.9, cy - c.len * 0.9, c.len * 1.8, c.len * 1.8);
        const tg = ctx.createRadialGradient(rearX, cy + cH / 2, 0, rearX, cy + cH / 2, c.len * 0.5);
        tg.addColorStop(0, "rgba(255,71,71,0.45)");
        tg.addColorStop(1, "rgba(255,71,71,0)");
        ctx.fillStyle = tg;
        ctx.fillRect(rearX - c.len * 0.5, cy - c.len * 0.5, c.len, c.len);
      }

      for (let i = state.splashes.length - 1; i >= 0; i--) {
        const s = state.splashes[i];
        s.t += dt;
        if (s.t >= s.max) {
          state.splashes.splice(i, 1);
          continue;
        }
        const k = s.t / s.max;
        const rx = s.r * (0.5 + k * 2.4);
        ctx.strokeStyle = `rgba(175,195,240,${(0.2 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.7, 1.1 * S);
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, rx * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
