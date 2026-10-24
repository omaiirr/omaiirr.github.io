(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  let _dropSprite = null;
  function _makeDropSprite() {
    const S = 64;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    const r = S * 0.28;
    const cx = S * 0.5, cy = S * 0.52;
    const body = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15);
    body.addColorStop(0, "rgba(226,240,252,0.95)");
    body.addColorStop(0.45, "rgba(190,215,240,0.72)");
    body.addColorStop(0.8, "rgba(150,185,225,0.42)");
    body.addColorStop(1, "rgba(120,160,210,0)");
    x.fillStyle = body;
    x.beginPath();
    x.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = "rgba(200,225,248,0.5)";
    x.lineWidth = S * 0.02;
    x.beginPath();
    x.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.beginPath();
    x.ellipse(cx - r * 0.34, cy - r * 0.42, r * 0.26, r * 0.16, -0.55, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(255,244,214,0.5)";
    x.beginPath();
    x.ellipse(cx + r * 0.12, cy + r * 0.5, r * 0.38, r * 0.12, 0.2, 0, Math.PI * 2);
    x.fill();
    return c;
  }

  function _pine(x, cx, cy, s) {
    for (let i = 0; i < 3; i++) {
      const topY = cy - s * (1.55 + i * 0.8);
      const baseY = topY + s * 0.95;
      const halfW = s * (0.62 - i * 0.17);
      x.beginPath();
      x.moveTo(cx, topY);
      x.lineTo(cx - halfW, baseY);
      x.lineTo(cx + halfW, baseY);
      x.closePath();
      x.fill();
    }
  }

  function _buildView(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.round(w));
    c.height = Math.max(2, Math.round(h));
    const x = c.getContext("2d");
    const rnd = Math.random;
    const sky = x.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#070b18");
    sky.addColorStop(0.55, "#0c1328");
    sky.addColorStop(0.8, "#172442");
    sky.addColorStop(1, "#223252");
    x.fillStyle = sky;
    x.fillRect(0, 0, w, h);
    const nStars = Math.round((w * h) / 18000);
    for (let i = 0; i < nStars; i++) {
      x.globalAlpha = 0.1 + rnd() * 0.28;
      x.fillStyle = "#dfe6ff";
      x.beginPath();
      x.arc(rnd() * w, rnd() * h * 0.5, 0.4 + rnd() * 0.9, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    const mx = w * 0.74;
    const my = h * 0.2;
    const haloR = Math.min(w, h) * 0.22;
    const halo = x.createRadialGradient(mx, my, 0, mx, my, haloR);
    halo.addColorStop(0, "rgba(214,224,255,0.26)");
    halo.addColorStop(0.4, "rgba(200,214,252,0.09)");
    halo.addColorStop(1, "rgba(190,205,250,0)");
    x.fillStyle = halo;
    x.beginPath();
    x.arc(mx, my, haloR, 0, Math.PI * 2);
    x.fill();
    const mr = Math.min(w, h) * 0.034;
    const moon = x.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.1, mx, my, mr);
    moon.addColorStop(0, "rgba(255,255,252,0.98)");
    moon.addColorStop(0.7, "rgba(238,241,252,0.92)");
    moon.addColorStop(1, "rgba(214,224,255,0.72)");
    x.fillStyle = moon;
    x.beginPath();
    x.arc(mx, my, mr, 0, Math.PI * 2);
    x.fill();
    const ridgePts = (baseY, amp, seed) => {
      const n = Math.max(8, Math.round(w / 70));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const y = baseY * h - h * amp * (0.5 + 0.5 * Math.sin(u * Math.PI * 2.1 + seed) + 0.25 * Math.sin(u * Math.PI * 4.3 + seed * 2.1));
        pts.push({ x: u * w, y });
      }
      return pts;
    };
    const fillRidge = (pts, col) => {
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(-2, h + 2);
      x.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i].x, pts[i].y);
      x.lineTo(w + 2, h + 2);
      x.closePath();
      x.fill();
    };
    fillRidge(ridgePts(0.68, 0.07, 1.3), "rgba(96,122,172,0.42)"); 
    const mist = x.createLinearGradient(0, h * 0.56, 0, h * 0.74);
    mist.addColorStop(0, "rgba(165,185,225,0)");
    mist.addColorStop(0.5, "rgba(165,185,225,0.11)");
    mist.addColorStop(1, "rgba(165,185,225,0)");
    x.fillStyle = mist;
    x.fillRect(0, h * 0.55, w, h * 0.2);
    const midPts = ridgePts(0.8, 0.085, 4.6);
    fillRidge(midPts, "rgba(32,50,94,0.85)");
    const ridgeYAt = (u) => 0.8 * h - h * 0.085 * (0.5 + 0.5 * Math.sin(u * Math.PI * 2.1 + 4.6) + 0.25 * Math.sin(u * Math.PI * 4.3 + 9.66));
    x.fillStyle = "rgba(15,23,50,0.95)";
    const np = Math.max(3, Math.round(w / 120));
    for (let i = 0; i < np; i++) {
      const u = (i + 0.5 + (rnd() - 0.5) * 0.8) / np;
      const s = (0.9 + rnd() * 1.3) * (w / 500);
      _pine(x, u * w, ridgeYAt(u) + s * 0.6, s);
    }
    fillRidge(ridgePts(0.91, 0.095, 7.9), "rgba(8,12,26,0.98)");
    return c;
  }

  function _frostCanvas(src, w, h) {
    const f = document.createElement("canvas");
    f.width = Math.max(2, Math.round(w));
    f.height = Math.max(2, Math.round(h));
    const fx = f.getContext("2d");
    const low = document.createElement("canvas");
    low.width = Math.max(10, Math.round(w / 7));
    low.height = Math.max(8, Math.round(h / 7));
    const lx = low.getContext("2d");
    lx.drawImage(src, 0, 0, low.width, low.height);
    fx.imageSmoothingEnabled = true;
    fx.filter = "blur(2px)";
    fx.drawImage(low, 0, 0, w, h);
    fx.filter = "none";
    return f;
  }

  function _drawBead(ctx, view, x, y, r, stretch) {
    const rx = r * 1.28;
    const ry = rx * stretch;
    const mag = 1.15 + Math.min(0.5, r * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      view,
      x - rx / mag, y - ry / mag, (rx * 2) / mag, (ry * 2) / mag,
      x - rx, y - ry, rx * 2, ry * 2,
    );
    ctx.restore();
    const lens = ctx.createRadialGradient(
      x - rx * 0.2, y - ry * 0.3, 0, x, y, Math.max(rx, ry) * 1.1,
    );
    lens.addColorStop(0, "rgba(190,214,246,0.1)");
    lens.addColorStop(0.7, "rgba(190,214,246,0.03)");
    lens.addColorStop(1, "rgba(190,214,246,0)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(196,220,252,0.4)";
    ctx.lineWidth = Math.max(0.8, rx * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(5,8,17,0.5)";
    ctx.lineWidth = Math.max(1, rx * 0.2);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.3, y - ry * 0.45, rx * 0.28, ry * 0.18, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,238,200,0.45)";
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.08, y + ry * 0.5, rx * 0.36, ry * 0.12, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ThemeScenes.register("condensation", {
    label: "Condensation",
    defaults: { density: 70, speed: 1, size: 1, blur: false, landscape: false },
    presetBgColors: ["#0f172a", "#020617", "#000000", "#1a1a2e", "#16213e", "#0d1117"],
    options: [
      { key: "density", label: "Droplets", type: "range", min: 30, max: 160, step: 5 },
      { key: "speed", label: "Drip Speed", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "size", label: "Drop Size", type: "range", min: 0.5, max: 2, step: 0.1 },
      { key: "blur", label: "Fogged Glass Blur", type: "checkbox" },
      { key: "landscape", label: "Moonlit View", type: "checkbox" },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      if (!_dropSprite) _dropSprite = _makeDropSprite();
      state.view = _buildView(w, h);
      state.frostedView = _frostCanvas(state.view, w, h);
      const rnd = Math.random;
      const count = Math.max(6, Math.round(opts.density ?? 70));
      const S = (opts.size ?? 1) * state.S;
      state.drops = [];
      for (let i = 0; i < count; i++) {
        state.drops.push({
          x: rnd() * w,
          y: rnd() * h,
          r: (rnd() * 2.2 + 1.2) * S,
          maxR: (rnd() * 4.2 + 2.6) * S,
          growSpeed: (rnd() * 0.22 + 0.08) * S,
          running: false,
          vy: 0,
          wobble: rnd() * Math.PI * 2,
          wobbleSpeed: rnd() * 2 + 0.8,
          wobbleAmp: (rnd() * 0.4 + 0.25) * S,
          streak: 0,
          runSpeed: (rnd() * 46 + 26) * S,
          alpha: 0.45 + rnd() * 0.3,
          respawn: false,
        });
      }
      state.drips = [];
      const nd = Math.max(6, Math.round(count * 0.2));
      for (let i = 0; i < nd; i++) {
        state.drips.push({
          x: rnd() * w,
          y: -rnd() * h * 0.3,
          len: (rnd() * 34 + 18) * S,
          speed: (rnd() * 26 + 18) * S,
          width: (rnd() * 1.1 + 0.7) * S,
          wobble: rnd() * Math.PI * 2,
          wobbleAmp: (rnd() * 0.26 + 0.08) * S,
          wobbleSpeed: rnd() * 1.4 + 0.5,
          t: 0,
          alpha: 0.22 + rnd() * 0.14,
        });
      }
      state.coalesceT = 0;
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const size = (opts.size ?? 1) * state.S;
      const blurred = !!opts.blur;
      const showView = !!opts.landscape;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t;

      ctx.clearRect(0, 0, w, h);
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }
      if (showView) {
        ctx.drawImage(blurred ? state.frostedView : state.view, 0, 0, w, h);
      }

      if (blurred) {
        const veil = ctx.createLinearGradient(0, 0, 0, h);
        veil.addColorStop(0, "rgba(175,192,216,0.13)");
        veil.addColorStop(0.5, "rgba(190,206,226,0.17)");
        veil.addColorStop(1, "rgba(160,178,205,0.11)");
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, w, h);
      }

      const glass = ctx.createLinearGradient(0, 0, 0, h);
      glass.addColorStop(0, "rgba(14,20,36,0.16)");
      glass.addColorStop(0.55, "rgba(8,12,24,0.08)");
      glass.addColorStop(1, "rgba(20,26,44,0.2)");
      ctx.fillStyle = glass;
      ctx.fillRect(0, 0, w, h);
      const sheen = ctx.createLinearGradient(0, 0, w, h * 0.9);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.42, "rgba(220,235,255,0.05)");
      sheen.addColorStop(0.55, "rgba(220,235,255,0.09)");
      sheen.addColorStop(0.68, "rgba(220,235,255,0.05)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = "round";
      for (const dp of state.drips) {
        dp.y += dp.speed * speed * dt;
        dp.t += dp.wobbleSpeed * dt * speed;
        dp.x += Math.sin(dp.t) * dp.wobbleAmp * dt * speed;
        if (dp.y - dp.len > h) {
          dp.y = -dp.len;
          dp.x = Math.random() * w;
          dp.len = (Math.random() * 34 + 18) * size;
          dp.speed = (Math.random() * 26 + 18) * size;
        }
        const streakA = Math.min(0.34, dp.alpha * 1.5);
        const sg = ctx.createLinearGradient(0, dp.y - dp.len, 0, dp.y);
        sg.addColorStop(0, "rgba(205,228,250,0)");
        sg.addColorStop(1, `rgba(205,228,250,${streakA.toFixed(3)})`);
        ctx.strokeStyle = sg;
        ctx.lineWidth = dp.width;
        ctx.beginPath();
        ctx.moveTo(dp.x, dp.y - dp.len);
        ctx.lineTo(dp.x, dp.y - dp.width * 1.2);
        ctx.stroke();
        const hr = dp.width * 1.5 + 0.6;
        ctx.fillStyle = "rgba(220,240,255,0.5)";
        ctx.beginPath();
        ctx.ellipse(dp.x, dp.y - hr * 0.2, hr, hr * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(dp.x - hr * 0.3, dp.y - hr * 0.45, hr * 0.22, hr * 0.14, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }

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
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const minD = (a.r + b.r) * 0.82;
            if (dx * dx + dy * dy < minD * minD) {
              const big = a.r >= b.r ? a : b;
              const small = big === a ? b : a;
              big.r = Math.min(big.maxR * 1.9, Math.sqrt(big.r * big.r + small.r * small.r) + 0.4);
              small.r = 0;
              small.respawn = true;
            }
          }
        }
      }

      const spr = _dropSprite;
      for (const d of state.drops) {
        if (d.r <= 0) {
          if (d.respawn && Math.random() < 0.4) {
            d.x = Math.random() * w;
            d.y = Math.random() * h;
            d.r = (Math.random() * 2.2 + 1.2) * size;
            d.maxR = (Math.random() * 4.2 + 2.6) * size;
            d.running = false;
            d.vy = 0;
            d.streak = 0;
            d.respawn = false;
          }
          continue;
        }
        if (!d.running) {
          d.r += d.growSpeed * dt * speed;
          if (d.r >= d.maxR) {
            d.running = true;
            d.vy = d.runSpeed * 0.35;
          }
        } else {
          d.vy += 560 * dt * speed;
          d.vy = Math.min(d.vy, d.runSpeed * 2.0);
          d.y += d.vy * dt;
          d.wobble += d.wobbleSpeed * dt;
          d.x += Math.sin(d.wobble) * d.wobbleAmp * dt * speed;
          d.streak = Math.min(d.streak + d.vy * dt, h * 0.4);
          if (d.y - d.r > h) {
            d.x = Math.random() * w;
            d.y = -d.r;
            d.r = (Math.random() * 2.2 + 1.2) * size;
            d.maxR = (Math.random() * 4.2 + 2.6) * size;
            d.running = false;
            d.vy = 0;
            d.streak = 0;
          }
        }
        d.streak = Math.max(0, d.streak - d.vy * dt * 0.85);
        const stretch = d.running ? Math.min(2.0, 1 + d.vy * 0.004) : 1;
        if (d.streak > 2) {
          const s2 = Math.min(0.32, d.alpha * 1.3);
          const sg2 = ctx.createLinearGradient(0, d.y - d.streak, 0, d.y);
          sg2.addColorStop(0, "rgba(205,228,250,0)");
          sg2.addColorStop(1, `rgba(205,228,250,${s2.toFixed(3)})`);
          ctx.strokeStyle = sg2;
          ctx.lineWidth = Math.max(0.8, d.wobbleAmp * 0.7);
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - d.streak);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }
        if (showView) {
          _drawBead(ctx, blurred ? state.frostedView : state.view, d.x, d.y, d.r, stretch);
        } else {
          ctx.globalAlpha = d.alpha;
          const dw = d.r * 4.4;
          const dh = dw * stretch;
          ctx.drawImage(spr, d.x - dw / 2, d.y - dh / 2, dw, dh);
        }
      }
      ctx.globalAlpha = 1;

      const vig = ctx.createRadialGradient(
        w / 2, h * 0.45, Math.min(w, h) * 0.42,
        w / 2, h * 0.5, Math.max(w, h) * 0.82,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.34)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
