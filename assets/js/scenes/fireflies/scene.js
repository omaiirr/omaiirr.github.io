(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _makeGlowSprite(hex) {
    const [r, g, b] = _hexToRgb(hex);
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},0.42)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
    return c;
  }

  function _makeCoreSprite() {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255,252,235,1)");
    grad.addColorStop(0.4, "rgba(255,250,220,0.6)");
    grad.addColorStop(1, "rgba(255,250,220,0)");
    x.fillStyle = grad;
    x.fillRect(0, 0, 16, 16);
    return c;
  }

  function _gust(t) {
    return 0.55 + 0.45 * Math.sin(t * 0.55) * Math.sin(t * 0.17 + 1.3);
  }

  ThemeScenes.register("fireflies", {
    label: "Fireflies",
    defaults: { density: 50, speed: 1, size: 1, color: "#fef08a", mist: 1 },
    presetBgColors: ["#020617", "#000000", "#0a1a0a", "#0f172a", "#1a1208", "#0d1117"],
    presetCombos: [
      { color: "#fef08a", bg: "#020617" }, 
      { color: "#a3e635", bg: "#0a1a0a" }, 
      { color: "#fb923c", bg: "#1a1208" }, 
      { color: "#22d3ee", bg: "#0a1a1a" }, 
      { color: "#a78bfa", bg: "#1e1b4b" }, 
      { color: "#f8fafc", bg: "#0d1117" }, 
    ],
    options: [
      { key: "density", label: "Fireflies", type: "range", min: 10, max: 120, step: 5 },
      { key: "speed", label: "Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "size", label: "Glow Size", type: "range", min: 0.5, max: 2.5, step: 0.1 },
      { key: "mist", label: "Mist Thickness", type: "range", min: 1, max: 1.75, step: 0.05 },
      { key: "color", label: "Glow Color", type: "color" },
    ],
    init(state, w, h, opts) {
      const count = opts.density ?? 50;
      state.t = 0;
      state.S = Math.max(w, h) / 900; 
      state.glowSprite = _makeGlowSprite(opts.color || "#10b981");
      state.coreSprite = _makeCoreSprite();

      state.fireflies = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const layer = roll < 0.38 ? "far" : roll < 0.82 ? "mid" : "near";
        const near = layer === "near";
        const far = layer === "far";
        state.fireflies.push({
          layer,
          x: Math.random() * w,
          y: far
            ? h * (0.16 + Math.random() * 0.4)
            : near
              ? h * (0.55 + Math.random() * 0.38)
              : h * (0.28 + Math.random() * 0.55),
          ang: Math.random() * Math.PI * 2,
          sp: (far ? 8 + Math.random() * 9 : near ? 24 + Math.random() * 20 : 12 + Math.random() * 16) * state.S,
          r: (far ? 0.6 + Math.random() * 0.5 : near ? 1.15 + Math.random() * 0.7 : 0.8 + Math.random() * 0.55),
          phase: Math.random() * Math.PI * 2,
          twSp: (far ? 0.5 + Math.random() * 0.8 : 0.8 + Math.random() * 1.5) * (far ? 0.8 : 1),
          wanderSp: 0.3 + Math.random() * 1.1,
          wanderPhase: Math.random() * Math.PI * 2,
          bob: Math.random() * Math.PI * 2,
          bobSp: 0.8 + Math.random() * 1.6,
        });
      }

      state.stars = [];
      for (let i = 0; i < 90; i++) {
        state.stars.push({
          x: Math.random(),
          y: Math.pow(Math.random(), 1.4) * 0.42, 
          s: 0.5 + Math.random() * 1.1,
          a: 0.1 + Math.random() * 0.32,
          tw: Math.random() * Math.PI * 2,
          twSp: 0.4 + Math.random() * 1.4,
        });
      }

      state.trees = [];
      const treeN = Math.max(10, Math.round(w / 60));
      for (let i = 0; i < treeN; i++) {
        const wd = 0.5 + Math.random() * 0.7;
        state.trees.push({
          x: i / treeN + (Math.random() - 0.5) * (0.6 / treeN),
          w: wd * (0.035 + Math.random() * 0.03), 
          hgt: 0.5 + Math.random() * 0.9, 
        });
      }

      state.grass = { mid: [], near: [], fore: [] };
      const mk = (arr, n, x0, x1, hgt0, hgt1, w0, w1, tilt) => {
        for (let i = 0; i < n; i++) {
          arr.push({
            x: x0 + Math.random() * (x1 - x0),
            hgt: hgt0 + Math.random() * (hgt1 - hgt0), 
            w: w0 + Math.random() * (w1 - w0),
            tilt: tilt * (Math.random() - 0.5) * 2, 
            phase: Math.random() * Math.PI * 2,
            sp: 0.6 + Math.random() * 1.1,
            lite: Math.random() < 0.3,
          });
        }
      };
      mk(state.grass.mid, Math.round(w / 9), 0, 1, 0.03, 0.075, 1.2, 2.6, 0.22);
      mk(state.grass.near, Math.round(w / 22), 0, 1, 0.06, 0.16, 1.8, 4.2, 0.4);
      mk(state.grass.fore, 6, 0, 1, 0.16, 0.3, 5, 9, 0.6);
    },
    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const size = opts.size ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;      
      const dtm = dt * speed;          

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#02030a");
        sky.addColorStop(0.42, "#050a16");
        sky.addColorStop(0.72, "#0a1720");
        sky.addColorStop(1, "#0d2018");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = "#cdd8ff";
      for (const st of state.stars) {
        const twk = 0.7 + 0.3 * Math.sin(st.tw + t * st.twSp);
        ctx.globalAlpha = st.a * twk;
        const sx = st.x * w, sy = st.y * h;
        ctx.fillRect(sx, sy, st.s * twk, st.s * twk);
      }
      ctx.globalAlpha = 1;

      const mx = w * 0.74, my = h * 0.17, mr = Math.min(w, h) * 0.075;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const corona = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5.5);
      corona.addColorStop(0, "rgba(190,208,255,0.16)");
      corona.addColorStop(0.35, "rgba(150,178,240,0.06)");
      corona.addColorStop(1, "rgba(150,178,240,0)");
      ctx.fillStyle = corona;
      ctx.beginPath(); ctx.arc(mx, my, mr * 5.5, 0, Math.PI * 2); ctx.fill();
      const warm = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 1.6);
      warm.addColorStop(0, "rgba(255,244,214,0.2)");
      warm.addColorStop(1, "rgba(255,244,214,0)");
      ctx.fillStyle = warm;
      ctx.beginPath(); ctx.arc(mx, my, mr * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const disc = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.2, mx, my, mr);
      disc.addColorStop(0, "#fffdf2");
      disc.addColorStop(0.75, "#e8ecf7");
      disc.addColorStop(1, "#c3cde0");
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(160,175,205,0.22)";
      ctx.beginPath(); ctx.arc(mx + mr * 0.2, my + mr * 0.15, mr * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx - mr * 0.3, my + mr * 0.32, mr * 0.13, 0, Math.PI * 2); ctx.fill();

      const horiz = h * 0.74;
      const gust = _gust(t);
      const drawTrees = (lineY, bumpH, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-5, h);
        for (let i = 0; i < state.trees.length; i++) {
          const tr = state.trees[i];
          const cx = Math.max(0, Math.min(w, tr.x * w));
          const halfW = (tr.w * w) / 2;
          const bh = bumpH * tr.hgt * h;
          ctx.lineTo(cx - halfW, lineY);
          ctx.arc(cx, lineY - bh * 0.62, halfW, Math.PI, 0, false);
          ctx.lineTo(cx + halfW, lineY);
        }
        ctx.lineTo(w + 5, h);
        ctx.closePath();
        ctx.fill();
      };
      drawTrees(horiz - h * 0.012, 0.055, "rgba(20,42,44,0.55)");
      drawTrees(horiz + h * 0.004, 0.085, "rgba(8,22,18,0.92)");

      const mistRows = [
        { y: 0.585, th: 0.045, a: 0.12, drift: 16, ph: 0.0, vb: 0.85, r1: 0.17, r2: 0.08 },
        { y: 0.7, th: 0.06, a: 0.17, drift: 20, ph: 2.2, vb: 1.05, r1: 0.18, r2: 0.09 },
        { y: 0.8, th: 0.05, a: 0.14, drift: 24, ph: 4.4, vb: 1.3, r1: 0.19, r2: 0.1 },
      ];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const mistMult = opts.mist ?? 1;
      for (const m of mistRows) {
        const yc = m.y * h;
        const th = m.th * h * mistMult; 
        const bob = Math.sin(t * m.vb + m.ph) * th * 0.18; 
        const breathe = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(t * m.vb * 0.55 + m.ph * 0.5));
        const alpha = m.a * breathe;
        const k1 = (Math.PI * 2) / (0.5 * w);
        const k2 = (Math.PI * 2) / (0.36 * w);
        const edge = (x, phOff) =>
          yc
          + bob
          + Math.sin(x * k1 - t * (k1 * m.drift) + m.ph + phOff) * th * m.r1
          + Math.sin(x * k2 - t * (k2 * m.drift) + t * m.vb * 1.3 + m.ph * 2.1 + phOff) * th * m.r2;
        const step = 6;
        let minY = Infinity, maxY = -Infinity;
        for (let x = 0; x <= w; x += step) {
          const ty = edge(x, 0);
          const by = edge(x, Math.PI * 0.55);
          if (ty < minY) minY = ty;
          if (by > maxY) maxY = by;
        }
        const pad = th * 0.4;
        const grad = ctx.createLinearGradient(0, minY - pad, 0, maxY + pad);
        grad.addColorStop(0, `rgba(158,214,196,0)`);
        grad.addColorStop(0.3, `rgba(158,214,196,${(alpha * 0.6).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(158,214,196,${alpha.toFixed(3)})`);
        grad.addColorStop(0.7, `rgba(158,214,196,${(alpha * 0.6).toFixed(3)})`);
        grad.addColorStop(1, `rgba(158,214,196,0)`);
        ctx.fillStyle = grad;
        ctx.filter = "blur(4px)";
        ctx.beginPath();
        ctx.moveTo(-step, edge(-step, 0));
        for (let x = 0; x <= w; x += step) ctx.lineTo(x, edge(x, 0));
        ctx.lineTo(w + step, edge(w + step, Math.PI * 0.55));
        for (let x = w; x >= 0; x -= step) ctx.lineTo(x, edge(x, Math.PI * 0.55));
        ctx.closePath();
        ctx.fill();
        ctx.filter = "none";
      }
      ctx.restore();

      const paintGrass = (arr, baseY, colorDark, colorLite) => {
        ctx.lineCap = "round";
        for (const g of arr) {
          const gx = g.x * w;
          const gh = g.hgt * h;
          const wind = Math.sin(t * g.sp + g.phase) * (0.5 + 0.5 * gust);
          const bend = g.tilt + (wind - 0.5) * 1.6; 
          const tipX = gx + Math.sin(bend) * gh;
          const tipY = baseY - Math.cos(bend) * gh;
          ctx.strokeStyle = g.lite ? colorLite : colorDark;
          ctx.lineWidth = g.w;
          ctx.beginPath();
          ctx.moveTo(gx, baseY);
          ctx.quadraticCurveTo(
            gx + Math.sin(bend * 0.6) * gh * 0.5,
            baseY - gh * 0.55,
            tipX,
            tipY
          );
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      };
      paintGrass(state.grass.mid, h * 0.93, "#061f17", "#0b3523");
      paintGrass(state.grass.near, h * 0.97, "#041a11", "#0d3320");

      const drawLayer = (layer, alphaMul, glowMul, coreMul, sizeMul) => {
        ctx.globalCompositeOperation = "lighter";
        for (const f of state.fireflies) {
          if (f.layer !== layer) continue;
          f.wanderPhase += f.wanderSp * dtm;
          f.ang += Math.sin(f.wanderPhase) * 1.4 * dtm;
          f.x += Math.cos(f.ang) * f.sp * dtm;
          f.y += Math.sin(f.ang) * f.sp * dtm * 0.55;
          f.y += Math.sin(f.bob + t * f.bobSp) * (layer === "near" ? 10 : 6) * state.S * dtm;
          if (layer === "near") f.y += (h * 0.76 - f.y) * 0.1 * dtm;
          if (layer === "far") f.y += (h * 0.3 - f.y) * 0.04 * dtm;
          if (f.x < -40) f.x = w + 40;
          if (f.x > w + 40) f.x = -40;
          if (f.y < h * 0.08) f.y = h * 0.08;
          if (f.y > h * 0.96) f.y = h * 0.96;

          const on = Math.pow(0.5 + 0.5 * Math.sin(f.phase + t * f.twSp), 1.6);
          const b = Math.max(0, Math.min(1, (0.16 + 0.84 * on) * (0.85 + 0.15 * Math.sin(f.phase * 2.1 - t * 0.8))));
          const gPx = (f.r * 16 + 9) * sizeMul * glowMul * state.S;
          ctx.globalAlpha = b * alphaMul;
          ctx.drawImage(state.glowSprite, f.x - gPx / 2, f.y - gPx / 2, gPx, gPx);
          if (coreMul > 0) {
            const cPx = Math.max(1.4, gPx * 0.24 * coreMul);
            ctx.globalAlpha = b * alphaMul * 1.15;
            ctx.drawImage(state.coreSprite, f.x - cPx / 2, f.y - cPx / 2, cPx, cPx);
          }
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      };
      drawLayer("far", 0.34, 0.6, 0, size);
      drawLayer("mid", 0.8, 1.0, 1.0, size);
      drawLayer("near", 0.55, 1.5, 0.5, size * 1.25);

      paintGrass(state.grass.fore, h + 4, "rgba(2,10,7,0.96)", "rgba(6,26,16,0.85)");

      const vg = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.42, w / 2, h * 0.52, Math.max(w, h) * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(1,2,6,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
