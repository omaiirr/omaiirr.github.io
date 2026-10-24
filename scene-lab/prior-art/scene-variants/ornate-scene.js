    ornate: {
      label: "Vector Flourish",
      defaults: { density: 14, speed: 1, color: "#46304a", accent: "#a87890", scale: 1 },
      presetBgColors: ["#ffffff", "#f7f2f8", "#f1e9f5", "#faf4f2", "#ede6f0", "#fbf8fb"],
      options: [
        { key: "density", label: "Detail", type: "range", min: 6, max: 22, step: 1 },
        { key: "speed", label: "Trace Speed", type: "range", min: 0.2, max: 2.5, step: 0.1 },
        { key: "scale", label: "Size", type: "range", min: 0.5, max: 1.6, step: 0.1 },
        { key: "color", label: "Line Color", type: "color" },
        { key: "accent", label: "Accent Color", type: "color" },
      ],
      init(state, w, h, opts) {
        state.t = 0;
        state.items = _buildFlourishPaths(w, h, opts);
      },
      draw(ctx, w, h, state, opts, dt) {
        const speed = opts.speed ?? 1;
        const color = opts.color || "#46304a";
        const accent = opts.accent || "#a87890";
        const scale = opts.scale ?? 1;
        const bgColor = opts.bgColor || null;
        state.t += dt * speed;
        const t = state.t;
        ctx.clearRect(0, 0, w, h);
        // paper backdrop — near-white with a whisper of lavender at the bottom
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else {
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, "#ffffff");
          bg.addColorStop(0.55, "#fdfbfe");
          bg.addColorStop(1, "#f1ebf4");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
        }
        // loop: draw-in (0–3.2s) → hold (3.2–5s) → fade to paper (5–7.8s)
        let artAlpha = 1;
        if (t >= 5) {
          const f = Math.min(1, (t - 5) / 2.8);
          artAlpha = 1 - f * f * (3 - 2 * f);
          if (artAlpha <= 0.004) return;
        }
        const [cr, cg, cb] = _hexToRgb(color);
        const [ar, ag, ab] = _hexToRgb(accent);
        const lightRgb = [Math.min(255, ar + 74), Math.min(255, ag + 64), Math.min(255, ab + 70)];
        const paleRgb = [Math.min(255, ar + 118), Math.min(255, ag + 110), Math.min(255, ab + 112)];
        const deepRgb = [Math.max(0, cr - 16), Math.max(0, cg - 12), Math.max(0, cb - 14)];
        const toneRgb = (tn) => tn === "accent" ? [ar, ag, ab] : tn === "light" ? lightRgb : tn === "pale" ? paleRgb : deepRgb;
        const toneStr = (tn) => { const [r, g, b] = toneRgb(tn); return `rgb(${r},${g},${b})`; };
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const it of state.items) {
          const prog = (t - it.start) / it.dur;
          if (prog <= 0) continue;
          const p = Math.min(1, prog);
          const a = it.alpha * artAlpha * (p < 1 ? p * p * (3 - 2 * p) : 1);
          if (a <= 0.012) continue;
          if (it.kind === "line") {
            const pts = it.pts;
            const n = pts.length;
            const idx = Math.max(1, Math.min(n - 1, Math.ceil(p * (n - 1))));
            if (it.tone === "ink") {
              ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`;
            } else {
              const [r, g, b] = toneRgb(it.tone);
              ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
            }
            ctx.lineWidth = it.w * (0.35 + 0.65 * p);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i <= idx; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
            if (p < 1) {
              const hp = pts[idx];
              ctx.fillStyle = `rgba(${Math.min(255, cr + 96)}, ${Math.min(255, cg + 84)}, ${Math.min(255, cb + 96)}, ${a * 0.4})`;
              ctx.beginPath(); ctx.arc(hp.x, hp.y, it.w * 1.25, 0, Math.PI * 2); ctx.fill();
            }
          } else if (it.kind === "fill") {
            const grow = 0.84 + 0.16 * Math.min(1, p * 1.5);
            ctx.save();
            ctx.translate(it.cx, it.cy);
            ctx.scale(grow, grow);
            ctx.translate(-it.cx, -it.cy);
            ctx.globalAlpha = a;
            ctx.fillStyle = toneStr(it.tone);
            const pts = it.pts;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = Math.min(1, a * 0.45);
            ctx.strokeStyle = `rgb(${deepRgb[0]},${deepRgb[1]},${deepRgb[2]})`;
            ctx.lineWidth = Math.max(0.7, it.w * 0.6);
            ctx.stroke();
            ctx.restore();
          } else if (it.kind === "dot") {
            const grow = 0.7 + 0.3 * Math.min(1, p * 1.5);
            ctx.globalAlpha = a;
            ctx.fillStyle = toneStr(it.tone);
            ctx.beginPath(); ctx.arc(it.cx, it.cy, it.r * grow, 0, Math.PI * 2); ctx.fill();
          } else if (it.kind === "dseed") {
            const ex = it.x + Math.cos(it.ang) * it.len;
            const ey = it.y + Math.sin(it.ang) * it.len;
            ctx.globalAlpha = a;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.85})`;
            ctx.lineWidth = Math.max(0.6, it.w);
            ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.fillStyle = toneStr(it.tone);
            ctx.beginPath(); ctx.arc(ex, ey, it.r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      },
    },
