(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function _shade(rgb, f) {
    return [
      Math.min(255, Math.round(rgb[0] * f)),
      Math.min(255, Math.round(rgb[1] * f)),
      Math.min(255, Math.round(rgb[2] * f)),
    ];
  }
  function _mix(a, b, w) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * w),
      Math.round(a[1] + (b[1] - a[1]) * w),
      Math.round(a[2] + (b[2] - a[2]) * w),
    ];
  }
  function _rgbToHsl([r0, g0, b0]) {
    const r = r0 / 255,
      g = g0 / 255,
      b = b0 / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0,
      s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function _maplePath(ctx, r) {
    ctx.beginPath();
    const tips = 5;
    for (let i = 0; i < tips; i++) {
      const a0 = (i / tips) * Math.PI * 2 - Math.PI / 2;
      const half = Math.PI / tips;
      const tipX = Math.cos(a0) * r * 1.04;
      const tipY = Math.sin(a0) * r * 1.04;
      const notX = Math.cos(a0 + half) * r * 0.36;
      const notY = Math.sin(a0 + half) * r * 0.36;
      const c1X = Math.cos(a0 + half * 0.5) * r * 1.14;
      const c1Y = Math.sin(a0 + half * 0.5) * r * 1.14;
      if (i === 0) ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(c1X, c1Y, notX, notY);
      const c2X = Math.cos(a0 - half * 0.5) * r * 1.14;
      const c2Y = Math.sin(a0 - half * 0.5) * r * 1.14;
      ctx.quadraticCurveTo(c2X, c2Y, Math.cos(a0 - half * 2) * r * 1.04, Math.sin(a0 - half * 2) * r * 1.04);
    }
    ctx.closePath();
    ctx.moveTo(r * 0.05, r * 0.5);
    ctx.lineTo(-r * 0.02, r * 0.92);
  }

  function _oakPath(ctx, r) {
    ctx.beginPath();
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr =
        r *
        (1.06 +
          0.05 * Math.sin(a) +
          0.23 * Math.sin(a * 3 + 0.9) +
          0.08 * Math.sin(a * 5 + 2.3));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.moveTo(r * 0.08, r * 0.55);
    ctx.lineTo(-r * 0.02, r * 0.95);
  }

  function _birchPath(ctx, r) {
    ctx.beginPath();
    const n = 44;
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * Math.PI * 2; 
      const a = u - Math.PI / 2;
      const rr =
        r *
        (0.24 +
          0.78 * Math.pow(Math.cos(u / 2), 1.15) +
          0.04 * Math.sin(u * 18 + 0.6));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.moveTo(r * 0.03, r * 0.3);
    ctx.lineTo(-r * 0.01, r * 0.92);
  }

  function _blossomPath(ctx, r) {
    ctx.beginPath();
    const petals = 5;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const P = (len, off) => [Math.cos(a + off) * len, Math.sin(a + off) * len];
      const w = 0.5; 
      const bL = P(r * 0.2, -0.58);
      const bR = P(r * 0.2, 0.58);
      const tipL = P(r * 0.98, -w * 0.34);
      const tipR = P(r * 0.98, w * 0.34);
      const notch = P(r * 0.84, 0);
      const c1 = P(r * 0.9, -w * 0.8);
      const c2 = P(r * 0.9, w * 0.8);
      const cN1 = P(r * 1.04, -w * 0.12);
      const cN2 = P(r * 1.04, w * 0.12);
      ctx.moveTo(bL[0], bL[1]);
      ctx.quadraticCurveTo(c1[0], c1[1], tipL[0], tipL[1]);
      ctx.quadraticCurveTo(cN1[0], cN1[1], notch[0], notch[1]);
      ctx.quadraticCurveTo(cN2[0], cN2[1], tipR[0], tipR[1]);
      ctx.quadraticCurveTo(c2[0], c2[1], bR[0], bR[1]);
    }
    ctx.closePath();
  }

  function _petalPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, r * 0.24);
    ctx.quadraticCurveTo(-r * 0.56, r * 0.5, -r * 0.4, r * 0.96);
    ctx.quadraticCurveTo(-r * 0.1, r * 1.08, 0, r * 0.9);
    ctx.quadraticCurveTo(r * 0.1, r * 1.08, r * 0.4, r * 0.96);
    ctx.quadraticCurveTo(r * 0.56, r * 0.5, r * 0.26, r * 0.24);
    ctx.closePath();
  }

  const PATHS = { maple: _maplePath, oak: _oakPath, birch: _birchPath, blossom: _blossomPath, petal: _petalPath };

  const TYPE_PALETTES = {
    maple: { lo: [178, 30, 26], hi: [248, 122, 40] }, 
    oak: { lo: [70, 48, 22], hi: [150, 100, 44] }, 
    birch: { lo: [206, 158, 42], hi: [250, 224, 118] }, 
    blossom: { lo: [240, 175, 195], hi: [252, 213, 224] }, 
  };

  ThemeScenes.register("leaves", {
    label: "Falling Leaves",
    defaults: { density: 60, speed: 1, type: "maple", scale: 1 },
    presetBgColors: ["#020617", "#000000", "#1a1008", "#0f172a", "#1e1208", "#0d1117"],
    options: [
      { key: "density", label: "Leaves", type: "range", min: 10, max: 180, step: 5 },
      { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
      {
        key: "type",
        label: "Leaf Type",
        type: "select",
        choices: [
          ["maple", "Maple"],
          ["oak", "Oak"],
          ["birch", "Birch"],
          ["blossom", "Cherry Blossom"],
        ],
      },
      { key: "scale", label: "Leaf Size", type: "range", min: 0.5, max: 2.5, step: 0.1 },
    ],
    init(state, w, h, opts) {
      state.t = 0;
      state.S = h / 1080;
      const S = state.S;
      const scale = opts.scale ?? 1;
      const shape = opts.type || "maple";
      const pal = TYPE_PALETTES[shape] || TYPE_PALETTES.maple;
      const leafCol = () => [
        Math.round(pal.lo[0] + (pal.hi[0] - pal.lo[0]) * Math.random()),
        Math.round(pal.lo[1] + (pal.hi[1] - pal.lo[1]) * Math.random()),
        Math.round(pal.lo[2] + (pal.hi[2] - pal.lo[2]) * Math.random()),
      ];
      const groundY = h * 0.86;

      const bands = [
        { n: 0.35, size: 1, spd: 0.6, alpha: 0.55, shadeLo: 0.6, shadeHi: 0.85 }, 
        { n: 0.4, size: 1.55, spd: 0.85, alpha: 0.75, shadeLo: 0.8, shadeHi: 1.05 }, 
        { n: 0.25, size: 2.3, spd: 1.15, alpha: 0.95, shadeLo: 0.95, shadeHi: 1.15 }, 
      ];
      const count = opts.density ?? 60;
      state.bands = [];
      for (const band of bands) {
        const leaves = [];
        const n = Math.round(count * band.n);
        for (let i = 0; i < n; i++) {
          const col = leafCol();
          const lshape = shape === "blossom" && Math.random() < 0.4 ? "petal" : shape;
          leaves.push({
            x: Math.random() * w * 1.35 - w * 0.15,
            y: Math.random() * h * 1.25 - h * 0.35,
            r: (3.5 + Math.random() * 5.5) * S * band.size * scale,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 3.2,
            vx: (22 + Math.random() * 42) * band.spd,
            vy: (10 + Math.random() * 24) * band.spd,
            wob: Math.random() * Math.PI * 2,
            wobSp: 0.8 + Math.random() * 1.8,
            amp: (12 + Math.random() * 22) * band.spd,
            col: _rgba(_shade(col, band.shadeLo + Math.random() * (band.shadeHi - band.shadeLo)), band.alpha),
            vein: _rgba(_shade(col, 0.45), 0.5),
            shape: lshape,
          });
        }
        state.bands.push(leaves);
      }

      state.trees = [];
      const nTrees = Math.max(4, Math.round(w / 110));
      for (let i = 0; i < nTrees; i++) {
        state.trees.push({
          x: (i / nTrees) * w + (Math.random() - 0.5) * (w / nTrees) * 0.7,
          r: (26 + Math.random() * 36) * S,
          ph: Math.random() * Math.PI * 2,
        });
      }

      state.grass = [];
      const nGrass = Math.round(Math.min(w / 26, 26));
      for (let i = 0; i < nGrass; i++) {
        state.grass.push({
          x: Math.random() * w,
          y: groundY + (2 + Math.random() * 12) * S,
          h: (12 + Math.random() * 18) * S,
          sp: 1.4 + Math.random() * 1.8,
          ph: Math.random() * Math.PI * 2,
          amp: (3.5 + Math.random() * 5) * S,
          wd: Math.max(1, (1.2 + Math.random() * 0.9) * S),
        });
      }

      state.ground = [];
      const nGround = Math.round(Math.min(w / 80, 22));
      state.maxGround = nGround + 36; 
      for (let i = 0; i < nGround; i++) {
        const col = leafCol();
        const lshape = shape === "blossom" && Math.random() < 0.4 ? "petal" : shape;
        state.ground.push({
          x: Math.random() * w,
          y: Math.min(h - 4 * S, groundY + 4 * S + Math.random() * (h - groundY - 8 * S)),
          r: (4 + Math.random() * 5) * S * scale,
          rot: Math.random() * Math.PI * 2,
          col: _rgba(_shade(col, 0.55 + Math.random() * 0.2), 0.75),
          shape: lshape,
        });
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      const speed = opts.speed ?? 1;
      const bgColor = opts.bgColor || null;
      state.t += dt;
      const t = state.t * speed;
      const dtm = dt * speed;
      const S = state.S;
      const groundY = h * 0.86;

      let pal = null;
      if (bgColor) {
        const [h, s] = _rgbToHsl(_hexToRgb(bgColor));
        const sat = (floor, cap) => Math.max(floor, Math.min(s * 100, cap));
        const hsla = (l, a, satPct) =>
          `hsla(${h.toFixed(1)},${satPct.toFixed(1)}%,${l}%,${a})`;
        const earthSat = sat(10, 28);
        const grassSat = sat(18, 46);
        pal = {
          trees: hsla(3, 0.88, earthSat),
          gTop: hsla(3.6, 0.78, earthSat),
          gDeep: hsla(1.5, 0.97, earthSat),
          sheen: hsla(55, 0.05, sat(26, 55)),
          grass: hsla(32, 0.6, grassSat),
        };
      }

      ctx.clearRect(0, 0, w, h);

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#02040c");
        sky.addColorStop(0.7, "#060a18");
        sky.addColorStop(1, "#150d06");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
      }

      const drawBand = (leaves) => {
        for (const l of leaves) {
          const gust = 0.72 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.55 + (l.y / h) * 3));
          l.wob += l.wobSp * dtm;
          l.rot += l.rotSp * dtm;
          l.x += (l.vx * gust + Math.sin(l.wob) * l.amp) * dtm;
          l.y += l.vy * dtm;
          if (l.x > w + 50) {
            l.x = -50;
            l.y = Math.random() * h * 0.6 - h * 0.3;
          }
          if (l.y >= groundY - l.r * 0.35) {
            if (state.ground.length < state.maxGround) {
              state.ground.push({
                x: l.x,
                y: Math.min(h - 3 * state.S, groundY + l.r * 0.3 + Math.random() * 3 * state.S),
                r: l.r * (0.85 + Math.random() * 0.25),
                rot: l.rot + (Math.random() - 0.5) * 1.2,
                col: l.col,
                shape: l.shape,
              });
            }
            l.y = -50 - Math.random() * 60;
            l.x = Math.random() * w * 1.2 - w * 0.1;
          }
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rot);
          ctx.fillStyle = l.col;
          PATHS[l.shape](ctx, l.r);
          ctx.fill();
          if (l.shape === "blossom") {
            if (l.r >= 5) {
              ctx.fillStyle = "rgba(206,94,128,0.55)";
              ctx.beginPath();
              ctx.arc(0, 0, l.r * 0.3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "rgba(255,214,150,0.9)";
              for (let s = 0; s < 5; s++) {
                const sa = (s / 5) * Math.PI * 2 + 0.35;
                ctx.beginPath();
                ctx.arc(Math.cos(sa) * l.r * 0.15, Math.sin(sa) * l.r * 0.15, Math.max(0.4, l.r * 0.045), 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } else if (l.shape !== "petal") {
            ctx.strokeStyle = l.vein;
            ctx.lineWidth = Math.max(0.5, l.r * 0.07);
            ctx.beginPath();
            ctx.moveTo(0, -l.r * 0.8);
            ctx.lineTo(0, l.r * 0.8);
            ctx.stroke();
          }
          ctx.restore();
        }
      };

      drawBand(state.bands[0]);

      ctx.fillStyle = pal ? pal.trees : "rgba(8,6,4,0.88)";
      for (const tr of state.trees) {
        const sway = Math.sin(t * 0.35 + tr.ph) * tr.r * 0.05;
        const cy = groundY - tr.r * 0.38;
        ctx.beginPath();
        ctx.arc(tr.x + sway, cy, tr.r * 1.05, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tr.x - tr.r * 0.7 + sway, cy - tr.r * 0.12, tr.r * 0.72, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tr.x + tr.r * 0.75 + sway, cy - tr.r * 0.08, tr.r * 0.66, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillRect(0, groundY - 2 * S, w, 4 * S);

      const gnd = ctx.createLinearGradient(0, groundY, 0, h);
      gnd.addColorStop(0, pal ? pal.gTop : "rgba(14,9,4,0.78)");
      gnd.addColorStop(1, pal ? pal.gDeep : "rgba(5,3,2,0.97)");
      ctx.fillStyle = gnd;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = pal ? pal.sheen : "rgba(200,140,60,0.05)";
      ctx.fillRect(0, groundY, w, Math.max(1, 2 * S));

      ctx.lineCap = "round";
      for (const g of state.grass) {
        const sway = Math.sin(t * g.sp + g.ph) * g.amp;
        ctx.strokeStyle = pal ? pal.grass : "rgba(122,102,50,0.6)";
        ctx.lineWidth = g.wd;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.quadraticCurveTo(g.x + sway * 0.35, g.y - g.h * 0.55, g.x + sway, g.y - g.h);
        ctx.stroke();
      }

      for (const f of state.ground) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.fillStyle = f.col;
        PATHS[f.shape](ctx, f.r);
        ctx.fill();
        ctx.restore();
      }

      drawBand(state.bands[1]);
      drawBand(state.bands[2]);

      const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
})();
