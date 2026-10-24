// lighthouse — purged scene snapshot (2026-09-04)
// Registry block extracted VERBATIM from assets/js/theme-scenes.js (pre-split).
// Code was corrupt/broken; scene is scheduled for a ground-up rebuild.
// This file is a read-only reference only — it is not loaded anywhere.
const lighthouse = {
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
    };
