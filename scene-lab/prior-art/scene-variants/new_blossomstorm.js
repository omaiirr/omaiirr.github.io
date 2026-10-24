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

        // ── falling petals (base size stored; scale option applied live) ──
        state.petals = [];
        const count = Math.round(opts.density ?? 110);
        for (let i = 0; i < count; i++) {
          const depth = Math.random() * 0.8 + 0.2;
          state.petals.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: (Math.random() * 2.2 + 1.4) * S * (0.55 + depth * 0.9),
            depth,
            ph: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            rotSp: (Math.random() - 0.5) * 6,
            vy: (Math.random() * 16 + 8) * S,
          });
        }

        // ── twinkling stars, kept clear of the moon ──
        state.stars = [];
        for (let i = 0; i < 44; i++) {
          const x = Math.random();
          const y = Math.random() * 0.72;
          if (Math.hypot((x - 0.78) * w, (y - 0.17) * h) < h * 0.13) { i--; continue; }
          state.stars.push({
            x, y,
            r: (Math.random() * 1.1 + 0.35) * S,
            ph: Math.random() * Math.PI * 2,
            tw: 0.5 + Math.random() * 1.4,
          });
        }

        // ── rolling dark hill silhouette ──
        state.hill = [];
        const hn = 36;
        for (let j = 0; j <= hn; j++) {
          const t = j / hn;
          state.hill.push({
            x: t * w,
            y: h * (0.888 - 0.032 * Math.sin(t * Math.PI * 2.4 + 0.6) - 0.015 * Math.sin(t * Math.PI * 5.3 + 2.1)),
          });
        }

        // ── the cherry tree: gnarled limbs + dense blossom crown ──
        this._buildTree(state, w, h);
      },

      // Build the whole tree once: gnarled limb centerlines with smoothly
      // tapering widths plus a crown of soft fluff and overlapping 5-petal
      // blossoms. All geometry is static; the draw pass renders it to an
      // offscreen layer and re-renders only when the blossom color changes.
      _buildTree(state, w, h) {
        const TAU = Math.PI * 2;
        const cx = w * 0.27, cy = h * 0.50;   // crown heart
        const rx = w * 0.145, ry = h * 0.108; // crown dome radii

        // organic centerline: eases toward a target angle while wandering
        const genCurve = (x0, y0, ang0, targetAng, len, segs, wander, seed) => {
          const pts = [];
          let a = ang0, x = x0, y = y0;
          const step = len / segs;
          for (let i = 0; i <= segs; i++) {
            a += (targetAng - a) * 0.05
              + (Math.random() - 0.5) * wander
              + Math.sin(i * 0.85 + seed) * 0.026
              + Math.sin(i * 1.8 + seed * 2.4) * 0.013;
            x += Math.cos(a) * step;
            y += Math.sin(a) * step;
            pts.push({ x, y });
          }
          return pts;
        };

        // keep every limb tip tucked inside the blossom mass
        const contain = (pts, strength) => {
          const n = pts.length;
          const start = Math.floor(n * 0.75);
          for (let i = start; i < n; i++) {
            const t = (i - start) / (n - start);
            const p = pts[i];
            const u = (p.x - cx) / rx, v = (p.y - cy) / ry;
            const d = Math.hypot(u, v) || 1;
            if (d > 0.8) {
              const f = t * strength;
              p.x -= (u / d) * (d - 0.8) * rx * f;
              p.y -= (v / d) * (d - 0.8) * ry * f;
            }
          }
        };

        const branches = [];
        const grow = (x, y, ang, targetAng, len, w0, depth, maxDepth, seed) => {
          const segs = Math.max(5, Math.min(24, Math.round(len / (h * 0.02))));
          const pts = genCurve(x, y, ang, targetAng, len, segs, 0.14 + depth * 0.03, seed);
          contain(pts, depth === 0 ? 0.15 : 0.8);
          // smooth taper with a base flare and a few knot bulges
          const widths = new Array(pts.length);
          for (let i = 0; i < pts.length; i++) {
            const t = i / (pts.length - 1);
            let wdt = w0 + (w0 * 0.28 - w0) * Math.pow(t, 1.2);
            wdt *= 1 + 0.13 * Math.sin(t * 5.1 + seed) + 0.08 * Math.sin(t * 9.3 + seed * 2.2);
            if (depth === 0) wdt *= 1 + 0.45 * Math.pow(1 - t, 3);
            widths[i] = Math.max(h * 0.004, wdt);
          }
          const limb = { pts, widths, depth, seed };
          branches.push(limb);
          if (depth >= maxDepth) return limb;
          const kids = Math.random() < 0.55 ? 2 : 3;
          for (let k = 0; k < kids; k++) {
            const forkT = 0.5 + Math.random() * 0.48;
            const idx = Math.min(pts.length - 1, Math.max(1, Math.floor(forkT * (pts.length - 1))));
            const f = pts[idx];
            const p0 = pts[Math.max(0, idx - 1)], p1 = pts[Math.min(pts.length - 1, idx + 1)];
            const fAng = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const spread = 0.45 + Math.random() * 0.55;
            let kAng = fAng + (k - (kids - 1) / 2) * spread + (Math.random() - 0.5) * 0.5;
            kAng = Math.max(-2.75, Math.min(-0.25, kAng));
            const kLen = len * (0.5 + Math.random() * 0.18);
            grow(f.x, f.y, fAng, kAng, kLen, w0 * (0.52 + Math.random() * 0.16), depth + 1, maxDepth, seed + 3.7 + k * 2.9);
          }
          return limb;
        };

        // trunk rises from below the hill; it forks into thick angled branches
        const trunk = grow(w * 0.155, h * 1.1, -Math.PI / 2 + 0.03, -Math.PI / 2 + 0.14, h * 0.42, h * 0.055, 0, 3, 0.9);
        const tip = trunk.pts[trunk.pts.length - 1];
        const t0 = trunk.pts[trunk.pts.length - 3];
        const forkAng = Math.atan2(tip.y - t0.y, tip.x - t0.x);
        // four thick, angled main branches radiating into the crown
        grow(tip.x, tip.y, forkAng, -2.0, h * 0.30, h * 0.030, 1, 3, 4.1);
        grow(tip.x, tip.y, forkAng, -1.4, h * 0.34, h * 0.034, 1, 3, 7.3);
        grow(tip.x, tip.y, forkAng, -0.6, h * 0.32, h * 0.032, 1, 3, 10.5);
        grow(tip.x, tip.y, forkAng, -2.35, h * 0.25, h * 0.026, 1, 3, 13.9);

        // ── blossom crown ──
        // lumpy silhouette so the rim feathers instead of being a clean circle
        const edgeMod = (a) => 1 + 0.11 * Math.sin(3 * a + 1.7) + 0.07 * Math.sin(5 * a + 4.1) + 0.05 * Math.sin(2 * a + 0.4);
        const domeSample = (bias) => {
          for (let tries = 0; tries < 80; tries++) {
            const x = cx + (Math.random() * 2 - 1) * rx;
            const y = cy + (Math.random() * 2 - 1) * ry;
            const u = (x - cx) / rx, v = (y - cy) / ry;
            const d2 = u * u + v * v;
            if (d2 > 1) continue;
            if (Math.random() < Math.exp(-d2 * bias)) return { x, y };
          }
          return { x: cx + (Math.random() - 0.5) * rx, y: cy + (Math.random() - 0.5) * ry };
        };

        // soft fluff backing: the crown reads as one solid mass, not a cloud
        const fluff = [];
        for (let i = 0; i < 34; i++) {
          const s = domeSample(0.55);
          fluff.push({
            x: s.x, y: s.y,
            rx: h * (0.05 + Math.random() * 0.035),
            ry: h * (0.055 + Math.random() * 0.035),
            a: 0.34 + Math.random() * 0.16,
            shadow: Math.random() < 0.25,
          });
        }
        // big soft blobs guarantee a solid heart
        for (const [bx, by, br, sh] of [[0.27, 0.50, 0.075, 0], [0.22, 0.46, 0.065, 1], [0.32, 0.52, 0.06, 0], [0.30, 0.44, 0.055, 0]]) {
          fluff.push({ x: w * bx, y: h * by, rx: h * br, ry: h * br * 0.9, a: 0.5, shadow: sh === 1 });
        }

        const flowers = [];
        const pushFlower = (x, y, r, shade, alpha) => {
          flowers.push({
            x: Math.max(w * 0.03, Math.min(w * 0.62, x)),
            y: Math.max(h * 0.34, Math.min(h * 0.66, y)),
            r, shade,
            alpha: alpha ?? 0.92,
            rot: Math.random() * TAU,
          });
        };

        // back layer: deeper, larger blossoms add depth
        for (let i = 0; i < 170; i++) {
          const s = domeSample(0.35);
          pushFlower(s.x, s.y, h * (0.011 + Math.random() * 0.006), "back", 0.9);
        }
        // main mass: dense blossoms across the whole dome
        for (let i = 0; i < 480; i++) {
          const s = domeSample(0.5);
          pushFlower(s.x, s.y, h * (0.0085 + Math.random() * 0.0065), Math.random() < 0.5 ? "main" : "mid", 0.93);
        }
        // rim blossoms: bumpy feathered silhouette, stretched upward at top
        for (let i = 0; i < 150; i++) {
          const a = Math.random() * TAU;
          let rad = (0.8 + Math.random() * 0.2) * edgeMod(a);
          if (Math.sin(a) < -0.4) rad *= 1.22;
          let x = cx + Math.cos(a) * rad * rx;
          let y = cy + Math.sin(a) * rad * ry;
          if (y < h * 0.36) y = h * 0.36;
          pushFlower(x, y, h * (0.0065 + Math.random() * 0.005), "edge", 0.9);
        }
        // moonlit highlights across the upper rim
        for (let i = 0; i < 90; i++) {
          const a = -Math.PI * (0.06 + Math.random() * 0.88);
          const rad = (0.5 + Math.random() * 0.5) * edgeMod(a);
          let y = cy + Math.sin(a) * rad * ry;
          if (y < h * 0.36) y = h * 0.36;
          pushFlower(cx + Math.cos(a) * rad * rx, y, h * (0.0055 + Math.random() * 0.004), "hl", 0.95);
        }
        // a few satellites just off the rim keep the edge fuzzy
        for (let i = 0; i < 24; i++) {
          const a = Math.random() * TAU;
          const rad = (1.0 + Math.random() * 0.16) * edgeMod(a);
          let x = cx + Math.cos(a) * rad * rx;
          let y = cy + Math.sin(a) * rad * ry;
          if (y < h * 0.36) y = h * 0.36;
          pushFlower(x, y, h * (0.005 + Math.random() * 0.0035), "edge", 0.85);
        }
        // wind-blown trail: light clusters drifting right of the dome
        for (let i = 0; i < 10; i++) {
          const t = 0.12 + (i / 9) * 0.88;
          const tx = w * (0.415 + t * 0.155);
          const ty = h * (0.505 - t * 0.07);
          const n = 3 + Math.floor(Math.random() * 5);
          for (let k = 0; k < n; k++) {
            pushFlower(
              tx + (Math.random() - 0.5) * w * 0.02,
              ty + (Math.random() - 0.5) * h * 0.018,
              h * (0.005 + Math.random() * 0.0045),
              k % 3 === 0 ? "hl" : "mid",
              0.85
            );
          }
          fluff.push({ x: tx, y: ty, rx: h * 0.026, ry: h * 0.02, a: 0.22, shadow: false });
        }

        state.branches = branches;
        state.tree = { cx, cy, rx, ry, fluff, flowers };
        state.treeCanvas = null;
        state.treeColor = null;
      },

      // Render the static tree (limbs + crown) to an offscreen canvas once;
      // re-render whenever the blossom color changes so both the tree's
      // blossoms and the falling petals recolor live.
      _renderTree(state, color) {
        const w = state.w, h = state.h;
        const TAU = Math.PI * 2;
        const tc = document.createElement("canvas");
        tc.width = Math.max(2, Math.round(w));
        tc.height = Math.max(2, Math.round(h));
        const c = tc.getContext("2d");

        const [pr, pg, pb] = _hexToRgb(color);
        const DARK = [28, 19, 50], WHITE = [255, 255, 255];
        const arr = (t, target) => [Math.round(pr + (target[0] - pr) * t), Math.round(pg + (target[1] - pg) * t), Math.round(pb + (target[2] - pb) * t)];
        const str = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
        const dark = str(arr(0.45, DARK));
        const mid = str(arr(0.16, WHITE));
        const light = str(arr(0.42, WHITE));
        const pale = str(arr(0.62, WHITE));
        const fluffA = arr(0.30, DARK);
        const fluffB = arr(0.55, DARK);
        const centerCol = str(arr(0.5, DARK));

        // ── limbs: each is ONE smooth filled tapered polygon (no segmented
        // strokes), with a dark rim, bark fill, moonlit edge and furrows ──
        for (const b of state.branches) {
          const pts = b.pts, wd = b.widths, n = pts.length;
          const nm = (i) => {
            const a = pts[Math.max(0, i - 1)], cc = pts[Math.min(n - 1, i + 1)];
            let dx = cc.x - a.x, dy = cc.y - a.y;
            const dl = Math.hypot(dx, dy) || 1;
            return { nx: -dy / dl, ny: dx / dl };
          };
          const limbPoly = (pad) => {
            c.beginPath();
            for (let i = 0; i < n; i++) {
              const q = nm(i);
              const off = wd[i] * 0.5 + pad;
              const px = pts[i].x + q.nx * off, py = pts[i].y + q.ny * off;
              if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
            }
            for (let i = n - 1; i >= 0; i--) {
              const q = nm(i);
              const off = wd[i] * 0.5 + pad;
              c.lineTo(pts[i].x - q.nx * off, pts[i].y - q.ny * off);
            }
            c.closePath();
          };
          limbPoly(1.5);
          c.fillStyle = "rgba(41, 30, 49, 0.92)";
          c.fill();
          limbPoly(0);
          c.fillStyle = "#6C5768";
          c.fill();
          // moonlit edge on the side facing the moon (upper right)
          const mx = w * 0.78, my = h * 0.17;
          c.strokeStyle = "rgba(226, 208, 246, 0.16)";
          c.lineWidth = Math.max(0.8, wd[0] * 0.07);
          c.lineCap = "round";
          c.beginPath();
          for (let i = 0; i < n; i++) {
            let lx = mx - pts[i].x, ly = my - pts[i].y;
            const ll = Math.hypot(lx, ly) || 1;
            const px = pts[i].x + (lx / ll) * wd[i] * 0.26;
            const py = pts[i].y + (ly / ll) * wd[i] * 0.26;
            if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.stroke();
          // a few wood-grain furrows along the thicker limbs
          if (b.depth <= 1) {
            c.strokeStyle = "rgba(52, 37, 58, 0.42)";
            c.lineWidth = Math.max(0.7, wd[0] * 0.045);
            for (let g = -1; g <= 1; g += 2) {
              c.beginPath();
              for (let i = 0; i < n; i++) {
                const q = nm(i);
                const px = pts[i].x + q.nx * wd[i] * 0.16 * g;
                const py = pts[i].y + q.ny * wd[i] * 0.16 * g;
                if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
              }
              c.stroke();
            }
          }
        }

        // ── soft fluff backing ──
        for (const f of state.tree.fluff) {
          const col = f.shadow ? fluffB : fluffA;
          const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx);
          g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${f.a})`);
          g.addColorStop(0.7, `rgba(${col[0]},${col[1]},${col[2]},${f.a * 0.55})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, TAU);
          c.fill();
        }

        // ── dense overlapping 5-petal blossoms ──
        const flower = (fx, fy, fr, rot, fill, alpha) => {
          c.globalAlpha = alpha;
          c.fillStyle = fill;
          for (let k = 0; k < 5; k++) {
            const a = rot + k * 1.2566371;
            c.beginPath();
            c.ellipse(fx + Math.cos(a) * fr * 0.56, fy + Math.sin(a) * fr * 0.56, fr * 0.55, fr * 0.36, a, 0, TAU);
            c.fill();
          }
          c.fillStyle = centerCol;
          c.beginPath();
          c.arc(fx, fy, fr * 0.17, 0, TAU);
          c.fill();
        };
        for (const fl of state.tree.flowers) {
          const fill = fl.shade === "back" ? dark
            : fl.shade === "mid" ? mid
            : fl.shade === "edge" ? light
            : fl.shade === "hl" ? pale
            : color;
          flower(fl.x, fl.y, fl.r, fl.rot, fill, fl.alpha);
        }
        c.globalAlpha = 1;

        state.treeCanvas = tc;
        state.treeColor = color;
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

        // render the tree layer once; re-render when the blossom color changes
        if (!state.treeCanvas || state.treeColor !== color) this._renderTree(state, color);

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
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
          ctx.fill();
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
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(158, 148, 196, 0.18)";
        ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.18, mr * 0.22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.28, mr * 0.15, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.02, my - mr * 0.42, mr * 0.11, 0, TAU); ctx.fill();

        // the tree layer with a gentle wind sway
        const sway = Math.sin(state.t * 0.7) * w * 0.006;
        ctx.drawImage(state.treeCanvas, sway, 0);

        // rolling hill in front of the trunk base
        ctx.fillStyle = "#17122c";
        ctx.beginPath();
        ctx.moveTo(-6, h + 6);
        for (const p of state.hill) ctx.lineTo(p.x, p.y);
        ctx.lineTo(w + 6, h + 6);
        ctx.closePath();
        ctx.fill();
        // soft shadow the tree casts on the hill
        const sh = ctx.createRadialGradient(w * 0.21, h * 0.93, 0, w * 0.21, h * 0.93, h * 0.075);
        sh.addColorStop(0, "rgba(7, 5, 16, 0.35)");
        sh.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sh;
        ctx.fillRect(w * 0.21 - h * 0.075, h * 0.93 - h * 0.075, h * 0.15, h * 0.15);
        // faint moonlit crest
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
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = 0.5 + p.depth * 0.42;
          ctx.fillStyle = p.depth > 0.72 ? petalLight : (p.depth > 0.42 ? color : petalDeep);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * sc, p.r * 0.58 * sc, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    },
