  // ── Origami crane & astronaut helpers ───────────────────────
  function _drawCrane(ctx, x, y, s, flap, dir, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = alpha;
    const wingUp = 0.35 + flap * 0.95; // wingtip height factor
    // far wing — slightly smaller and behind
    _craneWing(ctx, s, wingUp * 0.92, true);
    // body silhouette: neck up-forward, thin body, tail raised
    ctx.fillStyle = "#f5f3f1";
    ctx.strokeStyle = "rgba(120, 118, 130, 0.35)";
    ctx.lineWidth = Math.max(0.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(s * 0.4, -s * 0.02);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.3, s * 0.63, -s * 0.46);
    ctx.lineTo(s * 0.8, -s * 0.5);
    ctx.lineTo(s * 0.68, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.28, s * 0.4, -s * 0.02);
    ctx.lineTo(-s * 0.38, s * 0.02);
    ctx.lineTo(-s * 0.62, -s * 0.36);
    ctx.lineTo(-s * 0.48, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // head + beak so the profile reads at small sizes
    ctx.fillStyle = "#f5f3f1";
    ctx.strokeStyle = "rgba(120, 118, 130, 0.4)";
    ctx.lineWidth = Math.max(0.6, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(s * 0.63, -s * 0.46);
    ctx.quadraticCurveTo(s * 0.68, -s * 0.6, s * 0.74, -s * 0.63);
    ctx.lineTo(s * 0.88, -s * 0.58);
    ctx.lineTo(s * 0.76, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.68, -s * 0.44, s * 0.63, -s * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // near wing
    _craneWing(ctx, s, wingUp, false);
    // fold creases
    ctx.strokeStyle = "rgba(140, 138, 152, 0.4)";
    ctx.lineWidth = Math.max(0.4, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(s * 0.02, -s * 0.02);
    ctx.lineTo(-s * 0.28, -s * wingUp * 0.95);
    ctx.moveTo(s * 0.02, -s * 0.02);
    ctx.lineTo(s * 0.2, -s * 0.3);
    ctx.moveTo(-s * 0.24, -s * 0.1);
    ctx.lineTo(-s * 0.42, -s * 0.34);
    ctx.stroke();
    ctx.restore();
  }

  function _craneWing(ctx, s, up, far) {
    const off = far ? -s * 0.09 : 0;
    ctx.globalAlpha *= far ? 0.85 : 1;
    ctx.fillStyle = far ? "rgba(224, 222, 230, 0.85)" : "#f8f7f5";
    ctx.strokeStyle = "rgba(120, 118, 130, 0.3)";
    ctx.lineWidth = Math.max(0.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 0.04 + off);
    ctx.lineTo(-s * 0.42, -s * up * 1.05 + off);
    ctx.lineTo(-s * 0.18, s * 0.06 + off);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function _drawAstronaut(ctx, x, y, s, rot, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const white = "#f4f5f8", shade = "#cfd4e2", dark = "#a3a9bf";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // soft halo behind the astronaut
    const halo = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.5);
    halo.addColorStop(0, "rgba(190, 210, 255, 0.12)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2); ctx.fill();
    // backpack (behind the body)
    ctx.fillStyle = shade;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-s * 0.24, -s * 0.6, s * 0.48, s * 0.92, s * 0.08);
    else ctx.rect(-s * 0.24, -s * 0.6, s * 0.48, s * 0.92);
    ctx.fill();
    // tether hook ring on the backpack
    ctx.strokeStyle = "rgba(190, 205, 245, 0.9)";
    ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.arc(-s * 0.34, -s * 0.28, s * 0.07, 0, Math.PI * 2); ctx.stroke();
    // far arm and leg (slightly darker, tucked behind)
    ctx.strokeStyle = shade;
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, -s * 0.18);
    ctx.lineTo(-s * 0.4, -s * 0.42 + Math.cos(t * 0.6) * s * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.18);
    ctx.lineTo(-s * 0.34, s * 0.56 + Math.sin(t * 0.7) * s * 0.06);
    ctx.stroke();
    // legs — relaxed, drifting
    ctx.strokeStyle = white;
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.16);
    ctx.lineTo(-s * 0.3, s * 0.54 + Math.sin(t * 0.8) * s * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.16);
    ctx.lineTo(s * 0.3, s * 0.52 + Math.cos(t * 0.7) * s * 0.06);
    ctx.stroke();
    // boots
    ctx.strokeStyle = dark;
    ctx.lineWidth = s * 0.26;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.54 + Math.sin(t * 0.8) * s * 0.06);
    ctx.lineTo(-s * 0.36, s * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.52 + Math.cos(t * 0.7) * s * 0.06);
    ctx.lineTo(s * 0.37, s * 0.68);
    ctx.stroke();
    // torso
    ctx.fillStyle = white;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-s * 0.26, -s * 0.46, s * 0.52, s * 0.62, s * 0.1);
    else ctx.rect(-s * 0.26, -s * 0.46, s * 0.52, s * 0.62);
    ctx.fill();
    ctx.strokeStyle = shade;
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
    // chest panel + belt details
    ctx.fillStyle = "#9aa4c4";
    ctx.beginPath(); ctx.rect(-s * 0.11, -s * 0.36, s * 0.18, s * 0.1); ctx.fill();
    ctx.fillStyle = "#6a7294";
    ctx.beginPath(); ctx.rect(-s * 0.07, -s * 0.08, s * 0.14, s * 0.05); ctx.fill();
    // arms — one reaching back toward the tether, one drifting out
    ctx.strokeStyle = white;
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.42, s * 0.5, -s * 0.55 + Math.sin(t * 0.9) * s * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.28);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.34, -s * 0.5, -s * 0.42 + Math.cos(t * 0.6) * s * 0.05);
    ctx.stroke();
    // gloves
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.55 + Math.sin(t * 0.9) * s * 0.05, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.5, -s * 0.42 + Math.cos(t * 0.6) * s * 0.05, s * 0.12, 0, Math.PI * 2); ctx.fill();
    // helmet
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.33, 0, Math.PI * 2); ctx.fill();
    // gold visor with a glint (facing slightly right)
    ctx.fillStyle = "#c9a45c";
    ctx.beginPath(); ctx.ellipse(s * 0.06, -s * 0.72, s * 0.21, s * 0.25, -0.08, 0, Math.PI * 2); ctx.fill();
    const glint = ctx.createRadialGradient(s * 0.02, -s * 0.82, 0, s * 0.02, -s * 0.82, s * 0.16);
    glint.addColorStop(0, "rgba(255,255,255,0.85)");
    glint.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glint;
    ctx.beginPath(); ctx.ellipse(s * 0.06, -s * 0.72, s * 0.21, s * 0.25, -0.08, 0, Math.PI * 2); ctx.fill();
    // helmet rim + a small antenna
    ctx.strokeStyle = shade;
    ctx.lineWidth = s * 0.045;
    ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(160, 170, 200, 0.9)";
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.98);
    ctx.lineTo(-s * 0.22, -s * 1.12);
    ctx.stroke();
    ctx.fillStyle = "#c9a45c";
    ctx.beginPath(); ctx.arc(-s * 0.22, -s * 1.12, s * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
