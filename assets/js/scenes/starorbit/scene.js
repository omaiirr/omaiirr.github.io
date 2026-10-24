(() => {
  "use strict";

  const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUV;
void main() {
  vUV = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const STAR_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aA; // R, phase, omega, band (0..2)
layout(location = 1) in vec4 aB; // size, bright, twSp, twPh
layout(location = 2) in vec2 aC; // hotness, tailSpan (radians)

uniform vec2  uRes;    // device px
uniform float uTime;
uniform vec3  uTint;
uniform vec2  uDrift;  // x: roll (rad), y: zoom
uniform float uAspect; // w/h

out vec3 vCol;
out float vMag;   // brightness for spike gating
out float vHead;  // 1.0 head, 0.0 ghost

const float GHOSTS = 6.0;

void main() {
  float g = mod(float(gl_VertexID), GHOSTS);           // ghost slot 0..5

  float R     = aA.x;
  float phase = aA.y;
  float omega = aA.z;
  float band  = aA.w;

  float size   = aB.x;
  float bright = aB.y;

  float hot  = aC.x;
  float tail = aC.y;

  float tw = 0.72 + 0.28 * sin(uTime * aB.z + aB.w);

  float lag   = g * tail;
  float phi   = phase + uTime * omega - lag;
  float gFade = (g < 0.5) ? 1.0 : pow(1.0 - g / GHOSTS, 1.7) * 0.55;
  float b     = bright * (g < 0.5 ? tw : mix(tw, 1.0, 0.4)) * gFade;

  float tilt = 0.93;
  vec2 p = R * vec2(cos(phi), sin(phi) * tilt);

  float bandScale = 1.0 + (band - 1.0) * 0.035;
  p *= bandScale * uDrift.y;
  float cr = cos(uDrift.x), sr = sin(uDrift.x);
  p = vec2(p.x * cr - p.y * sr, p.x * sr + p.y * cr);

  gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);

  float szPx = size * (g < 0.5 ? 10.0 : 6.0) * uRes.y * 0.5 * uDrift.y;
  float minPx = (g < 0.5 ? 1.5 : 1.0) * max(uRes.y / 540.0, 1.0) * 1.25;
  gl_PointSize = clamp(szPx, minPx, 96.0);

  float bFac = 0.78 + band * 0.16;
  vec3 c = mix(uTint, vec3(1.0, 0.985, 0.94), hot * 0.65);
  vCol = c * b * bFac;
  vMag = b * (1.0 + hot) * bFac;
  vHead = (g < 0.5) ? 1.0 : 0.0;
}`;

  const STAR_FRAG = `#version 300 es
precision highp float;

in vec3 vCol;
in float vMag;
in float vHead;
out vec4 outColor;

void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;

  float core = exp(-r2 * 14.0);
  float halo = exp(-r2 * 2.6) * 0.30;
  float cut  = smoothstep(1.0, 0.72, sqrt(r2));
  vec3 col = vCol * ((core * 1.3 + halo) * cut);

  if (vHead > 0.5 && vMag > 1.02) {
    float sp = exp(-abs(q.x) * 7.0) * exp(-abs(q.y) * 30.0)
             + exp(-abs(q.y) * 7.0) * exp(-abs(q.x) * 30.0);
    col += vCol * sp * smoothstep(1.02, 1.6, vMag) * 0.7;
  }
  outColor = vec4(col, 1.0);
}`;

  const FIELD_FRAG = `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform vec2  uRes;     // device px
uniform float uTime;
uniform vec3  uTint;    // star/nebula tint (0..1)
uniform vec3  uBg;      // theme bg color (0..1)
uniform vec2  uDrift;   // roll, zoom
uniform float uMaxR;
uniform float uAspect;
uniform float uDPR;
uniform sampler2D uStars;

const float PI = 3.141592653589793;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(19.7, 7.3);
    a *= 0.52;
  }
  return s;
}

vec3 bgStars(vec2 pp, float t) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float sc = (layer == 0) ? 26.0 : 47.0;
    vec2 g = pp * sc;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash12(id + float(layer) * 17.31);
    float gate = (layer == 0) ? 0.968 : 0.981;
    if (h > gate) {
      vec2 sp = vec2(hash12(id + 11.1), hash12(id + 23.7)) - 0.5;
      float dd = length(f - sp * 0.6);
      float star = smoothstep(0.09, 0.0, dd);
      float tw = 0.6 + 0.4 * sin(t * (0.5 + 2.1 * h) + h * 61.7);
      float mag = (layer == 0) ? 0.9 : 0.5;
      vec3 tint = mix(vec3(0.74, 0.81, 1.0), vec3(1.0, 0.88, 0.7), hash12(id + 5.5));
      col += star * star * tw * mag * tint * 1.35;
    }
  }
  return col;
}

void main() {
  vec2 uvC = vUV * 2.0 - 1.0;
  vec2 sc = vec2(uvC.x * uAspect, uvC.y);   // scene coords, y ∈ [-1,1]
  float px2y = 2.0 / uRes.y;                // px → y-units

  float cr = cos(uDrift.x), sr = sin(uDrift.x);
  vec2 pp0 = sc * uDrift.y;
  vec2 pp = vec2(pp0.x * cr - pp0.y * sr, pp0.x * sr + pp0.y * cr);
  float len = length(pp);
  float t = uTime;

  vec3 col = uBg * (0.80 + 0.22 * exp(-len * len * 0.9));

  float crB = cos(uDrift.x * 0.55), srB = sin(uDrift.x * 0.55);
  vec2 pb = vec2(pp.x * crB - pp.y * srB, pp.x * srB + pp.y * crB);
  col += bgStars(pb * 0.92, t);

  float n1 = fbm(pp * 1.9 + vec2(t * 0.006, -t * 0.004));
  float n2 = fbm(pp * 0.9 - vec2(t * 0.004, t * 0.003) + 9.4);
  float w  = exp(-pow(len / max(uMaxR, 0.2), 2.0) * 0.85);
  float dust = 1.0 - 0.55 * smoothstep(0.52, 0.82, fbm(pp * 2.6 + 7.3));
  col += uTint * (n1 * n2 * w * dust * 0.34);
  col += uTint * (exp(-pow(len / max(uMaxR, 0.2), 2.0) * 2.2) * 0.055);

  for (int k = 1; k <= 4; k++) {
    float rk = uMaxR * (0.25 * float(k));
    float dPx = abs(len - rk) / px2y;
    float wPx = 1.15 * uDPR;
    float g = exp(-pow(dPx / wPx, 2.0));
    col += uTint * (g * 0.05);
  }

  float pulse = 0.86 + 0.14 * sin(t * 0.9);
  float coreR = 0.045;
  float core = exp(-pow(len / coreR, 2.0) * 2.0);
  float halo = exp(-pow(len / (coreR * 4.2), 2.0));
  col += vec3(1.0, 0.985, 0.95) * (core * 1.15 * pulse);
  col += uTint * (halo * 0.50 * pulse);

  col += texture(uStars, vUV).rgb;

  col *= 1.06;
  col = vec3(1.0) - exp(-col * 1.35);
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(luma), 0.12 * smoothstep(0.75, 1.0, luma));
  col = pow(col, vec3(0.4545));
  vec2 vq = vUV - 0.5;
  col *= 1.0 - 0.40 * dot(vq, vq) * 1.9;
  col += (hash12(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * (1.5 / 255.0);
  outColor = vec4(col, 1.0);
}`;

  const FALLBACK_TINT = [0.231, 0.510, 0.965]; 
  const FALLBACK_BG = [0.008, 0.024, 0.090];   

  const _clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function _hexToRgb01(hex, fallback) {
    if (typeof hex !== "string") return fallback.slice();
    const clean = hex.replace("#", "");
    if (clean.length < 6) return fallback.slice();
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
    ];
  }

  function _mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("starorbit: shader compile failed:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function _soTeardown(state) {
    const gl = state.gl;
    if (gl) {
      if (state.starProg) gl.deleteProgram(state.starProg);
      if (state.fieldProg) gl.deleteProgram(state.fieldProg);
      if (state.starShaders) for (const sh of state.starShaders) gl.deleteShader(sh);
      if (state.fieldShaders) for (const sh of state.fieldShaders) gl.deleteShader(sh);
      if (state.starVao) gl.deleteVertexArray(state.starVao);
      if (state.starVbo) gl.deleteBuffer(state.starVbo);
      if (state.triVao) gl.deleteVertexArray(state.triVao);
      if (state.triVbo) gl.deleteBuffer(state.triVbo);
      if (state.fbo) gl.deleteFramebuffer(state.fbo);
      if (state.starTex) gl.deleteTexture(state.starTex);
      if (state.lostExt) try { state.lostExt.loseContext(); } catch (e) { }
    }
    if (state.canvas && state.onLost) {
      state.canvas.removeEventListener("webglcontextlost", state.onLost);
    }
    state.gl = null;
    state.starProg = null;
    state.fieldProg = null;
    state.starShaders = null;
    state.fieldShaders = null;
    state.starVao = null;
    state.starVbo = null;
    state.triVao = null;
    state.triVbo = null;
    state.fbo = null;
    state.starTex = null;
    state.uniStar = null;
    state.uniField = null;
    state.onLost = null;
    state.lostExt = null;
    state.canvas = null;
    state.tint = null;
    state.bg = null;
    state.ok = false;
  }

  ThemeScenes.register("starorbit", {
    label: "Star Orbit",
    hidden: true,
    defaults: { density: 200, speed: 0.5, color: "#3b82f6" },
    presetBgColors: ["#020617", "#000000", "#0a0e27", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#3b82f6", bg: "#020617" }, 
      { color: "#a78bfa", bg: "#0a0015" }, 
      { color: "#fbbf24", bg: "#0a0e27" }, 
      { color: "#f472b6", bg: "#1a0a2e" }, 
      { color: "#4ade80", bg: "#050d0a" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
    ],
    options: [
      { key: "density", label: "Stars", type: "range", min: 50, max: 600, step: 10 },
      { key: "speed", label: "Orbit Speed", type: "range", min: 0.1, max: 2, step: 0.1 },
      { key: "color", label: "Star Color", type: "color" },
    ],

    init(state, w, h, opts) {
      _soTeardown(state);
      state.t = 0;
      state.w = w;
      state.h = h;
      state.paused = false;
      state.tint = _hexToRgb01(opts && opts.color, FALLBACK_TINT);
      state.bg = _hexToRgb01(opts && opts.bgColor, FALLBACK_BG);

      const dpr = _clamp(window.devicePixelRatio || 1, 1, 2.0);
      const W = _clamp(Math.round(w * dpr), 2, 4096);
      const H = _clamp(Math.round(h * dpr), 2, 4096);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;

      let gl = null;
      try {
        gl = canvas.getContext("webgl2", {
          alpha: false,
          depth: false,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
        });
      } catch (e) {
        gl = null;
      }
      if (!gl) {
        console.warn("starorbit: WebGL2 unavailable, scene disabled");
        state.ok = false;
        return;
      }

      const sv = _compile(gl, gl.VERTEX_SHADER, STAR_VERT);
      const sf = _compile(gl, gl.FRAGMENT_SHADER, STAR_FRAG);
      const fv = _compile(gl, gl.VERTEX_SHADER, VERT);
      const ff = _compile(gl, gl.FRAGMENT_SHADER, FIELD_FRAG);
      if (!sv || !sf || !fv || !ff) {
        for (const sh of [sv, sf, fv, ff]) if (sh) gl.deleteShader(sh);
        state.ok = false;
        return;
      }

      const starProg = gl.createProgram();
      gl.attachShader(starProg, sv);
      gl.attachShader(starProg, sf);
      gl.linkProgram(starProg);
      const fieldProg = gl.createProgram();
      gl.attachShader(fieldProg, fv);
      gl.attachShader(fieldProg, ff);
      gl.linkProgram(fieldProg);
      if (!gl.getProgramParameter(starProg, gl.LINK_STATUS) ||
          !gl.getProgramParameter(fieldProg, gl.LINK_STATUS)) {
        console.error("starorbit: program link failed:",
          gl.getProgramInfoLog(starProg), gl.getProgramInfoLog(fieldProg));
        gl.deleteProgram(starProg);
        gl.deleteProgram(fieldProg);
        for (const sh of [sv, sf, fv, ff]) gl.deleteShader(sh);
        state.ok = false;
        return;
      }

      const GHOSTS = 6;
      const count = _clamp(Math.round((opts && opts.density) ?? 200), 1, 900);
      const rng = _mulberry32((Math.random() * 0xffffffff) >>> 0);
      const aspect = W / H;
      const maxR = 0.9 * Math.min(1, w / Math.max(1, h));
      const data = new Float32Array(count * GHOSTS * 10);
      let o = 0;
      for (let i = 0; i < count; i++) {
        const dist = Math.pow(rng(), 0.72) * maxR;          
        const phase = rng() * Math.PI * 2;
        const omega = (1 - dist / maxR) * 0.8 + 0.2;        
        const band = Math.floor(rng() * 3);                 
        const size = (0.0007 + Math.pow(rng(), 2.0) * 0.0026); 
        const bright = 0.3 + rng() * 0.7 * (1 - (dist / maxR) * 0.8);
        const twSp = rng() * 2 + 1;
        const twPh = rng() * Math.PI * 2;
        const hot = Math.pow(rng(), 2.2);
        const tail = 0.06 + rng() * 0.16;                   
        for (let g = 0; g < GHOSTS; g++) {
          data[o++] = dist; data[o++] = phase; data[o++] = omega; data[o++] = band;
          data[o++] = size; data[o++] = bright; data[o++] = twSp; data[o++] = twPh;
          data[o++] = hot; data[o++] = tail;
        }
      }

      const starVao = gl.createVertexArray();
      gl.bindVertexArray(starVao);
      const starVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, starVbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 16);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 40, 32);
      gl.bindVertexArray(null);

      const starTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, starTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, starTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);

      const triVao = gl.createVertexArray();
      gl.bindVertexArray(triVao);
      const triVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triVbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      const uniStar = {};
      const uniField = {};
      for (const name of ["uRes", "uTime", "uTint", "uDrift", "uAspect"]) {
        uniStar[name] = gl.getUniformLocation(starProg, name);
      }
      for (const name of ["uRes", "uTime", "uTint", "uBg", "uDrift", "uMaxR", "uAspect", "uDPR", "uStars"]) {
        uniField[name] = gl.getUniformLocation(fieldProg, name);
      }

      const onLost = (e) => {
        e.preventDefault();
        state.ok = false;
      };
      canvas.addEventListener("webglcontextlost", onLost);
      const lostExt = gl.getExtension("WEBGL_lose_context");

      state.canvas = canvas;
      state.gl = gl;
      state.starProg = starProg;
      state.fieldProg = fieldProg;
      state.starShaders = [sv, sf];
      state.fieldShaders = [fv, ff];
      state.starVao = starVao;
      state.starVbo = starVbo;
      state.triVao = triVao;
      state.triVbo = triVbo;
      state.fbo = fbo;
      state.starTex = starTex;
      state.uniStar = uniStar;
      state.uniField = uniField;
      state.onLost = onLost;
      state.lostExt = lostExt;
      state.maxR = maxR;
      state.count = count;
      state.GHOSTS = GHOSTS;
      state.dpr = dpr;
      state.aspect = aspect;
      state.ok = true;
    },

    draw(ctx, w, h, state, opts, dt) {
      if (state.paused) return;
      if (!state.ok || !state.gl || !state.canvas) return;
      const speed = opts && typeof opts.speed === "number" ? opts.speed : 0.5;
      state.t += Math.min(dt, 0.05) * (0.3 + speed * 1.0);
      const t = state.t;

      const roll = 0.05 * Math.sin(t * 0.05);
      const zoom = 1 + 0.035 * Math.sin(t * 0.033);

      const gl = state.gl;
      const W = state.canvas.width, H = state.canvas.height;
      const tint = state.tint || FALLBACK_TINT;

      gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbo);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(state.starProg);
      gl.bindVertexArray(state.starVao);
      if (state.uniStar.uRes) gl.uniform2f(state.uniStar.uRes, W, H);
      if (state.uniStar.uTime) gl.uniform1f(state.uniStar.uTime, t);
      if (state.uniStar.uTint) gl.uniform3f(state.uniStar.uTint, tint[0], tint[1], tint[2]);
      if (state.uniStar.uDrift) gl.uniform2f(state.uniStar.uDrift, roll, zoom);
      if (state.uniStar.uAspect) gl.uniform1f(state.uniStar.uAspect, state.aspect);
      gl.drawArrays(gl.POINTS, 0, state.count * state.GHOSTS);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(state.fieldProg);
      gl.bindVertexArray(state.triVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.starTex);
      if (state.uniField.uRes) gl.uniform2f(state.uniField.uRes, W, H);
      if (state.uniField.uTime) gl.uniform1f(state.uniField.uTime, t);
      const bg = state.bg || FALLBACK_BG;
      if (state.uniField.uTint) gl.uniform3f(state.uniField.uTint, tint[0], tint[1], tint[2]);
      if (state.uniField.uBg) gl.uniform3f(state.uniField.uBg, bg[0], bg[1], bg[2]);
      if (state.uniField.uDrift) gl.uniform2f(state.uniField.uDrift, roll, zoom);
      if (state.uniField.uMaxR) gl.uniform1f(state.uniField.uMaxR, state.maxR);
      if (state.uniField.uAspect) gl.uniform1f(state.uniField.uAspect, state.aspect);
      if (state.uniField.uDPR) gl.uniform1f(state.uniField.uDPR, state.dpr);
      if (state.uniField.uStars) gl.uniform1i(state.uniField.uStars, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      ctx.drawImage(state.canvas, 0, 0, w, h);
    },

    start(state) { if (state && typeof state === "object") state.paused = false; },
    pause(state) { if (state && typeof state === "object") state.paused = true; },
    stop(state) { if (state && typeof state === "object") state.paused = true; },

    destroy(state) {
      if (state) _soTeardown(state);
    },
  });
})();
