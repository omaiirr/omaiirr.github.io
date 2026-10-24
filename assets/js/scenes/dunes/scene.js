(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  const CURVE_N = 64;
  const CURVE_SPAN = 1.5; 
  const PAD = 40; 
  const LAYERS = [
    { baseY: 0.565, amp: 0.052, us: 1.15, uo: 0.0, tint: 0.42, rim: 0.10 },
    { baseY: 0.635, amp: 0.07, us: 0.9, uo: 0.37, tint: 0.55, rim: 0.16 },
    { baseY: 0.715, amp: 0.092, us: 0.68, uo: 0.71, tint: 0.7, rim: 0.24 },
    { baseY: 0.815, amp: 0.118, us: 0.52, uo: 0.13, tint: 0.85, rim: 0.34 },
    { baseY: 0.925, amp: 0.15, us: 0.4, uo: 0.55, tint: 1.0, rim: 0.46 },
  ];
  const GRAIN_LAYER_W = [0.1, 0.15, 0.21, 0.25, 0.29];

  function _hash1(n) {
    const s = Math.sin(n) * 43758.5453123;
    return s - Math.floor(s);
  }
  function _vnoise(x, seed) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return _hash1(i + seed * 57.31) * (1 - u) + _hash1(i + 1 + seed * 57.31) * u;
  }
  function _fbm1(x, seed) {
    let v = 0, a = 0.5, fx = x;
    for (let o = 0; o < 3; o++) {
      v += a * _vnoise(fx, seed + o * 3.7);
      fx = fx * 2.03 + 11.3;
      a *= 0.5;
    }
    return v;
  }
  function _bakeCurve() {
    const c = new Float32Array(CURVE_N);
    for (let i = 0; i < CURVE_N; i++) {
      const u = (i / (CURVE_N - 1)) * CURVE_SPAN;
      c[i] =
        0.55 * _fbm1(u * 2.2, 3.1) +
        0.3 * _fbm1(u * 4.6 + 9.2, 7.7) +
        0.15 * _fbm1(u * 9.4 + 4.4, 15.3);
    }
    return c;
  }
  function _curveAt(curve, u) {
    const t = Math.min(Math.max(u, 0), CURVE_SPAN) * ((CURVE_N - 1) / CURVE_SPAN);
    const i = Math.min(Math.floor(t), CURVE_N - 2);
    const f = t - i;
    return curve[i] * (1 - f) + curve[i + 1] * f;
  }
  function _surface(curve, layer, x, w, h) {
    const span = w + 2 * PAD;
    const u = ((x + PAD) / span) * layer.us + layer.uo;
    const y = layer.baseY * h - layer.amp * h * _curveAt(curve, u);
    const e = 3;
    const uL = ((x - e + PAD) / span) * layer.us + layer.uo;
    const uR = ((x + e + PAD) / span) * layer.us + layer.uo;
    const yL = layer.baseY * h - layer.amp * h * _curveAt(curve, uL);
    const yR = layer.baseY * h - layer.amp * h * _curveAt(curve, uR);
    return { y, m: (yR - yL) / (2 * e) };
  }

  const quadVertSource = `#version 300 es
  layout(location = 0) in vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const curveSample = `float curveAt(float u) {
    float t = clamp(u, 0.0, uCurveSpan) * (${CURVE_N - 1}.0 / uCurveSpan);
    float fi = floor(t);
    float f = t - fi;
    int i0 = int(fi);
    int i1 = int(min(fi + 1.0, ${CURVE_N - 1}.0));
    return uCurve[i0] * (1.0 - f) + uCurve[i1] * f;
  }`;

  const skyFragSource = `#version 300 es
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform vec3 uBg;
  uniform vec3 uTint;
  out vec4 outColor;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = m * p * 2.02 + vec2(11.3, 7.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (gl_FragCoord.xy - resolution * vec2(0.5, 0.42)) / resolution.y;
    vec3 col = mix(uBg * 1.12, uBg * 0.38, smoothstep(0.0, 1.0, uv.y));
    vec3 gc = mix(uTint, vec3(1.0), 0.42);
    float gd = length((p - vec2(0.0, 0.0)) * vec2(1.0, 1.35));
    col += gc * exp(-gd * 3.4) * 0.26;
    col += gc * exp(-gd * 11.0) * 0.34;
    col += gc * exp(-abs(p.y) * 24.0) * 0.06;
    col += mix(uTint, gc, 0.4) * fbm(p * 2.0 + vec2(time * 0.014, -time * 0.004))
      * 0.05 * (0.35 + 0.65 * (1.0 - uv.y));
    vec2 g = (p + vec2(time * 0.004, 0.0)) * 44.0;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float h1 = hash(cell);
    vec2 sp = vec2(hash(cell + 7.1), hash(cell + 3.7)) * 0.6 + 0.2;
    float star = smoothstep(0.992, 1.0, h1)
      * exp(-dot(f - sp, f - sp) * 55.0)
      * (0.4 + 0.6 * hash(cell + 11.3))
      * (0.55 + 0.45 * sin(time * 1.7 + h1 * 91.0));
    col += vec3(0.92, 0.94, 1.0) * star * 0.42
      * smoothstep(0.16, 0.45, uv.y) * (1.0 - 0.75 * exp(-gd * 2.6));
    col *= 1.0 - 0.15 * smoothstep(0.5, 1.3, length((uv - 0.5) * vec2(1.15, 1.0)));
    outColor = vec4(max(col, vec3(0.0)), 1.0);
  }`;

  const duneVertSource = `#version 300 es
  layout(location = 0) in vec2 aPos;   // [0..1] quad corner
  layout(location = 1) in vec4 aL;     // baseY, amp, uScale, uOff
  layout(location = 2) in vec4 aL2;    // tintK, rimK, 0, 0
  uniform vec2 uSize;                  // css-space width/height
  out vec2 vWorld;
  out vec4 vL;
  out vec2 vLR;
  void main() {
    float x = mix(-${PAD}.0, uSize.x + ${PAD}.0, aPos.x);
    float top = (aL.x - aL.y * 1.25) * uSize.y - 4.0;
    float y = mix(top, uSize.y + 4.0, aPos.y);
    vWorld = vec2(x, y);
    vL = aL;
    vLR = aL2.xy;
    gl_Position = vec4(x / uSize.x * 2.0 - 1.0, 1.0 - y / uSize.y * 2.0, 0.0, 1.0);
  }`;

  const duneFragSource = `#version 300 es
  precision highp float;
  uniform vec2 uSize;
  uniform vec3 uBg;
  uniform vec3 uTint;
  uniform float uCurve[${CURVE_N}];
  uniform float uCurveSpan;
  in vec2 vWorld;
  in vec4 vL;    // baseY, amp, uScale, uOff
  in vec2 vLR;   // tintK, rimK
  out vec4 outColor;
  ${curveSample}
  void main() {
    float span = uSize.x + 2.0 * ${PAD}.0;
    float S = uSize.y / 1080.0;
    float u = ((vWorld.x + ${PAD}.0) / span) * vL.z + vL.w;
    float surf = vL.x * uSize.y - vL.y * uSize.y * curveAt(u);
    float d = vWorld.y - surf;             // px below the crest line
    float aa = clamp(d / 1.4 + 0.5, 0.0, 1.0);
    if (aa <= 0.004) discard;
    float e = 3.0;
    float uL = ((vWorld.x - e + ${PAD}.0) / span) * vL.z + vL.w;
    float uR = ((vWorld.x + e + ${PAD}.0) / span) * vL.z + vL.w;
    float m = (curveAt(uR) - curveAt(uL)) * vL.y * uSize.y / (2.0 * e);
    float windward = smoothstep(0.10, -0.16, m);
    float leeward = smoothstep(0.02, 0.22, m);
    vec3 gc = mix(uTint, vec3(1.0), 0.42);
    vec3 skyRef = mix(uBg * 1.02, gc, 0.30);
    vec3 body = mix(uTint * 0.13, uTint * 0.34, vLR.x);
    body = mix(body, skyRef * 0.5, (1.0 - vLR.x) * 0.5);   // aerial perspective
    body += uTint * 0.085 * windward * (0.35 + 0.65 * vLR.x);
    body *= 1.0 - 0.16 * leeward;
    float rip = sin(vWorld.x * (37.0 * S / uSize.y) * 37.0 + curveAt(u) * 17.0);
    body *= 1.0 - 0.045 * rip * vLR.x;
    float rimB = exp(-pow(d / (2.2 * S), 2.0));
    vec2 gp = vWorld / uSize.y - vec2(0.5, 0.58);           // glow proximity
    float gd = length(gp * vec2(1.0, 1.35));
    vec3 rimCol = mix(uTint, vec3(1.0), 0.55) * (0.62 + 0.5 * exp(-gd * 2.2));
    vec3 col = mix(body, rimCol, rimB * vLR.y);
    outColor = vec4(col, aa);
  }`;

  const grainVertSource = `#version 300 es
  layout(location = 0) in vec2 aPos;   // [0..1] quad corner
  layout(location = 1) in vec4 aA;     // p0, layer, size, depth
  layout(location = 2) in vec4 aB;     // phase, hopFreq, speedJit, alpha
  layout(location = 3) in vec4 aC;     // uScale, uOff, baseY, amp (terrain; 0 for free wind)
  uniform vec2 uSize;
  uniform float uTime;
  uniform float uLayer;
  uniform float uCurve[${CURVE_N}];
  uniform float uCurveSpan;
  out vec2 vCorner;
  out float vBright;
  out float vFree;
  ${curveSample}
  void main() {
    float span = uSize.x + 2.0 * ${PAD}.0;
    float S = uSize.y / 1080.0;
    float layer = aA.y;
    float sel = step(abs(layer - uLayer), 0.5);
    float depth = aA.w;
    float rate = (46.0 + 92.0 * aB.z) * mix(0.68 + 0.09 * layer, 1.35, step(4.5, layer)) * S;
    float x = mod(aA.x * span + uTime * rate, span) - ${PAD}.0;
    float y;
    float amp;
    float free = step(4.5, layer);
    if (free > 0.5) {
      y = (0.30 + 0.24 * fract(aA.x * 0.631)) * uSize.y
        + sin(uTime * 0.5 + aB.x) * 9.0 * S;
      amp = 0.0;
    } else {
      float u = ((x + ${PAD}.0) / span) * aC.x + aC.y;
      float surf = aC.z * uSize.y - aC.w * uSize.y * curveAt(u);
      float e = 3.0;
      float uL = ((x - e + ${PAD}.0) / span) * aC.x + aC.y;
      float uR = ((x + e + ${PAD}.0) / span) * aC.x + aC.y;
      float m = (curveAt(uR) - curveAt(uL)) * aC.w * uSize.y / (2.0 * e);
      amp = (1.6 + 30.0 * min(abs(m), 0.85)) * S * (0.35 + 0.65 * fract(aB.w * 3.17));
      y = surf - amp * (0.5 + 0.5 * sin(uTime * aB.y * 6.283 + aB.x)) - aA.z * 0.4;
    }
    float extX = aA.z * (2.5 + 7.0 * aB.z) * (1.0 + 0.6 * free);
    float extY = aA.z * 1.35;
    vec2 corner = (aPos * 2.0 - 1.0);
    vec2 pos = vec2(x + corner.x * extX, y + corner.y * extY);
    vCorner = corner;
    vBright = aB.w * (0.35 + 0.65 * depth) * sel * (1.0 - 0.45 * free);
    vFree = free;
    gl_Position = (sel > 0.5)
      ? vec4(pos.x / uSize.x * 2.0 - 1.0, 1.0 - pos.y / uSize.y * 2.0, 0.0, 1.0)
      : vec4(2.0, 2.0, 0.0, 1.0);
  }`;

  const grainFragSource = `#version 300 es
  precision highp float;
  in vec2 vCorner;
  in float vBright;
  in float vFree;
  uniform vec3 uTint;
  out vec4 outColor;
  void main() {
    vec3 col = mix(uTint, vec3(1.0), 0.5);
    float t = vCorner.x;
    float head = exp(-(t * t) * 2.4 - vCorner.y * vCorner.y * 3.2);
    float trail = exp(-pow(length(vec2((t + 0.55) * 0.5, vCorner.y * 2.2)), 2.0) * 2.2) * 0.55;
    float a = clamp(head + trail, 0.0, 1.0) * vBright;
    outColor = vec4(col, a);
  }`;

  function rgb255(hex, fallback) {
    const value = /^#[\da-f]{6}$/i.test(hex || "") ? hex : fallback;
    return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  }

  function release(state) {
    const gl = state.gl;
    if (state.surface && state.onLost)
      state.surface.removeEventListener("webglcontextlost", state.onLost);
    if (gl) {
      for (const vao of state.vaos || []) gl.deleteVertexArray(vao);
      for (const buf of state.buffers || []) gl.deleteBuffer(buf);
      for (const prog of state.programs || []) gl.deleteProgram(prog);
      for (const shader of state.shaders || []) gl.deleteShader(shader);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose && !gl.isContextLost()) lose.loseContext();
    }
    if (state.surface) state.surface.width = state.surface.height = 1;
    state.gl = null;
    state.programs = null;
    state.skyProgram = null;
    state.duneProgram = null;
    state.grainProgram = null;
    state.shaders = null;
    state.buffers = null;
    state.vaos = null;
    state.skyU = null;
    state.duneU = null;
    state.grainU = null;
    state.surface = null;
    state.onLost = null;
  }

  function makeProgram(gl, state, vertSrc, fragSrc) {
    const program = gl.createProgram();
    if (!program) throw new Error("dunes: program unavailable");
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertSrc],
      [gl.FRAGMENT_SHADER, fragSrc],
    ]) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("dunes: shader unavailable");
      state.shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program));
    for (const shader of state.shaders.splice(0)) {
      gl.detachShader(program, shader);
      gl.deleteShader(shader);
    }
    return program;
  }

  function fallback(ctx, w, h, state, opts) {
    const color = opts.color || "#d97706";
    const bgColor = opts.bgColor || null;
    const rgb = _hexToRgb(color);
    const t = state.t;
    const S = state.S;
    const curve = state.curve;

    ctx.clearRect(0, 0, w, h);
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#050510");
      sky.addColorStop(0.55, "#0d0b14");
      sky.addColorStop(1, "#1a1410");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
    }

    const gc = [
      Math.round(rgb[0] + (255 - rgb[0]) * 0.42),
      Math.round(rgb[1] + (255 - rgb[1]) * 0.42),
      Math.round(rgb[2] + (255 - rgb[2]) * 0.42),
    ];
    const glowX = w * 0.5, glowY = h * 0.58;

    ctx.globalCompositeOperation = "screen";
    for (const s of state.stars) {
      const a =
        s.a *
        (0.55 + 0.45 * Math.sin(t * s.sp + s.ph)) *
        Math.min(1, Math.max(0, (s.y / h - 0.16) * 4)) *
        (1 - 0.75 * Math.exp(-Math.hypot((s.x - glowX) / h, (s.y - glowY) / h * 1.35) * 2.6));
      if (a <= 0.01) continue;
      ctx.fillStyle = `rgba(235,238,250,${a.toFixed(3)})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    const gR = h * 0.75;
    const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, gR);
    glow.addColorStop(0, _rgba(gc, 0.30));
    glow.addColorStop(0.35, _rgba(gc, 0.10));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (const b of state.haze) {
      const bx = ((b.x + t * b.vx) % (w + b.r * 2) + w + b.r * 2) % (w + b.r * 2) - b.r;
      const hb = ctx.createRadialGradient(bx, b.y, 0, bx, b.y, b.r);
      hb.addColorStop(0, _rgba(rgb, 0.05));
      hb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hb;
      ctx.fillRect(bx - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalCompositeOperation = "source-over";

    const span = w + 2 * PAD;
    for (let li = 0; li < LAYERS.length; li++) {
      const layer = LAYERS[li];
      const tintK = layer.tint;

      ctx.beginPath();
      ctx.moveTo(-PAD - 4, h + 4);
      for (let px = -PAD - 4; px <= w + PAD + 4; px += 7) {
        ctx.lineTo(px, _surface(curve, layer, px, w, h).y);
      }
      ctx.lineTo(w + PAD + 4, h + 4);
      ctx.closePath();
      const bodyBase = [
        Math.round(rgb[0] * (0.13 + 0.21 * tintK)),
        Math.round(rgb[1] * (0.13 + 0.21 * tintK)),
        Math.round(rgb[2] * (0.13 + 0.21 * tintK)),
      ];
      const skyMix = (1 - tintK) * 0.5;
      const bodyCol = [
        Math.round(bodyBase[0] + (gc[0] * 0.5 - bodyBase[0]) * skyMix),
        Math.round(bodyBase[1] + (gc[1] * 0.5 - bodyBase[1]) * skyMix),
        Math.round(bodyBase[2] + (gc[2] * 0.5 - bodyBase[2]) * skyMix),
      ];
      ctx.fillStyle = `rgb(${bodyCol[0]},${bodyCol[1]},${bodyCol[2]})`;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      for (let px = -PAD - 4; px <= w + PAD + 4; px += 7) {
        const s = _surface(curve, layer, px, w, h);
        if (px <= -PAD - 4) ctx.moveTo(px, s.y);
        else ctx.lineTo(px, s.y);
      }
      ctx.strokeStyle = _rgba(gc, 0.85 * layer.rim);
      ctx.lineWidth = Math.max(1, 2.2 * S);
      ctx.stroke();
      for (let px = -PAD; px <= w + PAD; px += 26) {
        const s = _surface(curve, layer, px, w, h);
        if (s.m < -0.06) {
          const k = Math.min(1, -s.m / 0.4) * 0.20 * (0.35 + 0.65 * tintK);
          ctx.strokeStyle = _rgba(rgb, k);
          ctx.lineWidth = Math.max(1.5, 5 * S);
          ctx.beginPath();
          ctx.moveTo(px, s.y + 3 * S);
          ctx.lineTo(px + 22, _surface(curve, layer, px + 22, w, h).y + 5 * S);
          ctx.stroke();
        }
      }
      ctx.restore();

      ctx.globalCompositeOperation = "screen";
      for (const g of state.grains) {
        if (g.layer !== li) continue;
        const rate = (46 + 92 * g.jit) * (0.68 + 0.09 * g.layer) * S;
        const gx = (((g.p0 * span + t * rate) % span) + span) % span - PAD;
        const s = _surface(curve, layer, gx, w, h);
        const amp = (1.6 + 30 * Math.min(Math.abs(s.m), 0.85)) * S * (0.35 + 0.65 * g.hopAmp);
        const gy =
          s.y -
          amp * (0.5 + 0.5 * Math.sin(t * g.hopFreq * Math.PI * 2 + g.phase)) -
          g.size * 0.4;
        const streak = g.size * (2.5 + 7 * g.jit);
        const a = g.alpha * (0.35 + 0.65 * g.depth);
        ctx.strokeStyle = _rgba(gc, a * 0.5);
        ctx.lineWidth = Math.max(0.7, g.size * 0.7);
        ctx.beginPath();
        ctx.moveTo(gx - streak, gy);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.fillStyle = _rgba([255, 244, 220], a);
        ctx.fillRect(gx - g.size * 0.4, gy - g.size * 0.4, g.size * 0.8, g.size * 0.8);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.globalCompositeOperation = "screen";
    for (const g of state.grains) {
      if (g.layer !== 5) continue;
      const rate = (46 + 92 * g.jit) * 1.35 * S;
      const gx = (((g.p0 * span + t * rate) % span) + span) % span - PAD;
      const gy =
        (0.3 + 0.24 * ((g.p0 * 0.631) % 1)) * h + Math.sin(t * 0.5 + g.phase) * 9 * S;
      const streak = g.size * (2.5 + 7 * g.jit) * 1.6;
      ctx.strokeStyle = _rgba(gc, g.alpha * 0.3);
      ctx.lineWidth = Math.max(0.6, g.size * 0.5);
      ctx.beginPath();
      ctx.moveTo(gx - streak, gy);
      ctx.lineTo(gx, gy);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  ThemeScenes.register("dunes", {
    label: "Sand Dunes",
    hidden: true,
    defaults: { density: 80, speed: 1, color: "#d97706" },
    presetBgColors: ["#020617", "#000000", "#1a1508", "#0f172a", "#1e1a0a", "#0d1117"],
    presetCombos: [
      { color: "#d97706", bg: "#1a1508" }, 
      { color: "#fbbf24", bg: "#1e1a0a" }, 
      { color: "#fb923c", bg: "#150f0a" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
      { color: "#e2b46c", bg: "#0d1117" }, 
      { color: "#a78bfa", bg: "#0a0015" }, 
    ],
    options: [
      { key: "density", label: "Grains", type: "range", min: 20, max: 200, step: 10 },
      { key: "speed", label: "Wind", type: "range", min: 0.3, max: 3, step: 0.1 },
      { key: "color", label: "Sand Color", type: "color" },
    ],

    init(state, w, h, opts) {
      release(state);
      state.t = state.t || 0;
      state.S = h / 1080;
      const S = state.S;

      state.curve = _bakeCurve();

      state.stars = [];
      const nStars = Math.max(40, Math.round((w * h) / 7000));
      for (let i = 0; i < nStars; i++) {
        state.stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.55,
          r: Math.random() < 0.85 ? 1 : 2,
          a: 0.12 + Math.random() * 0.35,
          sp: 0.6 + Math.random() * 1.6,
          ph: Math.random() * Math.PI * 2,
        });
      }
      state.haze = [];
      for (let i = 0; i < 3; i++) {
        state.haze.push({
          x: Math.random() * w,
          y: h * (0.3 + Math.random() * 0.3),
          r: h * (0.35 + Math.random() * 0.3),
          vx: 4 + Math.random() * 6,
        });
      }

      const count = Math.max(1, Math.round(opts.density ?? 80));
      state.count = count;
      const nTerrain = Math.round(count * 0.68);
      state.grains = [];
      for (let i = 0; i < count; i++) {
        const freeWind = i >= nTerrain;
        let layer;
        if (freeWind) {
          layer = 5;
        } else {
          const r = Math.random();
          let acc = 0;
          layer = 0;
          for (let li = 0; li < GRAIN_LAYER_W.length; li++) {
            acc += GRAIN_LAYER_W[li];
            if (r <= acc) { layer = li; break; }
          }
        }
        const L = LAYERS[layer] || null;
        state.grains.push({
          p0: Math.random(),
          layer,
          size: (Math.random() * 1.6 + 1.1) * S * (freeWind ? 1.25 : 1),
          depth: freeWind ? 0.85 : 0.45 + 0.13 * layer,
          phase: Math.random() * Math.PI * 2,
          hopFreq: 0.9 + Math.random() * 1.8,
          hopAmp: Math.random(),
          jit: Math.random(),
          alpha: freeWind ? 0.10 + Math.random() * 0.14 : 0.35 + Math.random() * 0.4,
          us: L ? L.us : 0,
          uo: L ? L.uo : 0,
          baseY: L ? L.baseY : 0,
          amp: L ? L.amp : 0,
        });
      }
      state.grains.sort((a, b) => a.layer - b.layer);

      try {
        state.surface = document.createElement("canvas");
        const gl = state.surface.getContext("webgl2", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
        });
        state.gl = gl;
        if (!gl) {
          release(state);
          return;
        }
        state.onLost = (event) => {
          event.preventDefault();
          state.lost = true;
        };
        state.surface.addEventListener("webglcontextlost", state.onLost);
        state.lost = false;
        state.shaders = [];
        state.programs = [];
        state.buffers = [];
        state.vaos = [];

        state.skyProgram = makeProgram(gl, state, quadVertSource, skyFragSource);
        state.duneProgram = makeProgram(gl, state, duneVertSource, duneFragSource);
        state.grainProgram = makeProgram(gl, state, grainVertSource, grainFragSource);
        state.programs.push(state.skyProgram, state.duneProgram, state.grainProgram);
        const mkU = (prog, names) =>
          Object.fromEntries(names.map((k) => [k, gl.getUniformLocation(prog, k)]));
        state.skyU = mkU(state.skyProgram, ["resolution", "time", "uBg", "uTint"]);
        state.duneU = mkU(state.duneProgram, [
          "uSize", "uBg", "uTint", "uCurve[0]", "uCurveSpan",
        ]);
        state.grainU = mkU(state.grainProgram, [
          "uSize", "uTime", "uLayer", "uCurve[0]", "uCurveSpan", "uTint",
        ]);

        const skyQuadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, skyQuadBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-0.5, -0.5, 1.5, -0.5, -0.5, 1.5, -0.5, 1.5, 1.5, -0.5, 1.5, 1.5]),
          gl.STATIC_DRAW,
        );
        state.buffers.push(skyQuadBuf);
        const quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
          gl.STATIC_DRAW,
        );
        state.buffers.push(quadBuf);

        const skyVao = gl.createVertexArray();
        gl.bindVertexArray(skyVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, skyQuadBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        state.vaos.push(skyVao);

        const duneData = new Float32Array(LAYERS.length * 8);
        LAYERS.forEach((L, i) => {
          duneData[i * 8 + 0] = L.baseY;
          duneData[i * 8 + 1] = L.amp;
          duneData[i * 8 + 2] = L.us;
          duneData[i * 8 + 3] = L.uo;
          duneData[i * 8 + 4] = L.tint;
          duneData[i * 8 + 5] = L.rim;
        });
        const duneBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, duneBuf);
        gl.bufferData(gl.ARRAY_BUFFER, duneData, gl.STATIC_DRAW);
        state.buffers.push(duneBuf);
        const duneVao = gl.createVertexArray();
        gl.bindVertexArray(duneVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, duneBuf);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
        gl.vertexAttribDivisor(2, 1);
        state.vaos.push(duneVao);

        const instData = new Float32Array(count * 12);
        state.grains.forEach((g, i) => {
          instData[i * 12 + 0] = g.p0;
          instData[i * 12 + 1] = g.layer;
          instData[i * 12 + 2] = g.size;
          instData[i * 12 + 3] = g.depth;
          instData[i * 12 + 4] = g.phase;
          instData[i * 12 + 5] = g.hopFreq;
          instData[i * 12 + 6] = g.jit;
          instData[i * 12 + 7] = g.alpha;
          instData[i * 12 + 8] = g.us;
          instData[i * 12 + 9] = g.uo;
          instData[i * 12 + 10] = g.baseY;
          instData[i * 12 + 11] = g.amp;
        });
        const instBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        gl.bufferData(gl.ARRAY_BUFFER, instData, gl.STATIC_DRAW);
        state.buffers.push(instBuf);
        const grainVao = gl.createVertexArray();
        gl.bindVertexArray(grainVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 48, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16);
        gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 32);
        gl.vertexAttribDivisor(3, 1);
        state.vaos.push(grainVao);
        gl.bindVertexArray(null);
      } catch {
        release(state);
      }
    },

    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      const dtc = Math.min(0.05, Math.max(0, dt || 0));
      state.t += dtc * (opts.speed ?? 1);

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      const gl = state.gl;
      if (!gl || state.lost || gl.isContextLost()) {
        fallback(ctx, w, h, state, opts);
        ctx.restore();
        return;
      }
      const transform = ctx.getTransform();
      const width = Math.max(1, Math.round(w * Math.hypot(transform.a, transform.b)));
      const height = Math.max(1, Math.round(h * Math.hypot(transform.c, transform.d)));
      if (state.surface.width !== width || state.surface.height !== height) {
        const max = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        if (width > max[0] || height > max[1]) {
          fallback(ctx, w, h, state, opts);
          ctx.restore();
          return;
        }
        state.surface.width = width;
        state.surface.height = height;
      }

      const bg = rgb255(opts.bgColor, "#1a1508");
      const tint = rgb255(opts.color, "#d97706");
      const bg3 = [bg[0] / 255, bg[1] / 255, bg[2] / 255];
      const tint3 = [tint[0] / 255, tint[1] / 255, tint[2] / 255];

      gl.disable(gl.BLEND);
      gl.viewport(0, 0, width, height);

      gl.useProgram(state.skyProgram);
      gl.bindVertexArray(state.vaos[0]);
      gl.uniform2f(state.skyU.resolution, width, height);
      gl.uniform1f(state.skyU.time, state.t);
      gl.uniform3f(state.skyU.uBg, bg3[0], bg3[1], bg3[2]);
      gl.uniform3f(state.skyU.uTint, tint3[0], tint3[1], tint3[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(state.duneProgram);
      gl.bindVertexArray(state.vaos[1]);
      gl.uniform2f(state.duneU.uSize, w, h);
      gl.uniform3f(state.duneU.uBg, bg3[0], bg3[1], bg3[2]);
      gl.uniform3f(state.duneU.uTint, tint3[0], tint3[1], tint3[2]);
      gl.uniform1fv(state.duneU["uCurve[0]"], state.curve);
      gl.uniform1f(state.duneU.uCurveSpan, CURVE_SPAN);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, LAYERS.length);

      gl.useProgram(state.grainProgram);
      gl.bindVertexArray(state.vaos[2]);
      gl.uniform2f(state.grainU.uSize, w, h);
      gl.uniform1f(state.grainU.uTime, state.t);
      gl.uniform1fv(state.grainU["uCurve[0]"], state.curve);
      gl.uniform1f(state.grainU.uCurveSpan, CURVE_SPAN);
      gl.uniform3f(state.grainU.uTint, tint3[0], tint3[1], tint3[2]);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); 
      for (let li = 0; li <= 5; li++) {
        gl.uniform1f(state.grainU.uLayer, li);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, state.count);
      }
      gl.bindVertexArray(null);

      ctx.drawImage(state.surface, 0, 0, w, h);
      ctx.restore();
    },

    destroy(state) {
      release(state);
    },
  });
})();
