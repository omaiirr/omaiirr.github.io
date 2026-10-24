(() => {
  "use strict";

  const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUV;
void main() {
  vUV = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform vec2  uRes;    // render target size
uniform float uTime;   // scene clock (speed-scaled)
uniform vec3  uCam;    // x: yaw, y: pitch, z: orbit distance
uniform vec3  uTint;   // accretion disk tint (0..1 rgb)

const float PI = 3.141592653589793;

const float R_SHADOW = 2.598;  // critical impact parameter, sqrt(27)/2
const float DISK_IN  = 3.0;    // ISCO
const float DISK_OUT = 12.0;   // outer disk edge

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
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
float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.55;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(19.7, 7.3);
    a *= 0.52;
  }
  return s;
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
float fbmThread(vec2 p, float t) {
  vec2 w = vec2(fbm3(p + vec2(0.0, t * 0.35)), fbm3(p - vec2(1.7, t * 0.28)));
  float v = fbm(p + 1.45 * (w - 0.5));
  float r = 1.0 - abs(2.0 * v - 1.0);
  return r * r;
}

vec3 bbCol(float T) {
  vec3 c = vec3(0.38, 0.030, 0.010);                              // deep crimson
  c = mix(c, vec3(0.98, 0.24, 0.045), smoothstep(0.05, 0.28, T)); // red-hot
  c = mix(c, vec3(1.00, 0.58, 0.16), smoothstep(0.28, 0.55, T));  // hot amber
  c = mix(c, vec3(1.00, 0.90, 0.62), smoothstep(0.55, 0.85, T));  // pale yellow
  c = mix(c, vec3(0.90, 0.95, 1.08), smoothstep(0.85, 1.15, T));  // blue-white
  return c;
}

vec3 starField(vec3 d) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float sc = (layer == 0) ? 21.0 : 43.0;
    vec3 g = d * sc;
    vec3 id = floor(g);
    vec3 f = fract(g) - 0.5;
    float h = hash13(id);
    float gate = (layer == 0) ? 0.965 : 0.976;
    if (h > gate) {
      vec3 sp = vec3(hash13(id + 11.1), hash13(id + 23.7), hash13(id + 37.9)) - 0.5;
      float dd = length(f - sp * 0.6);
      float star = smoothstep(0.10, 0.0, dd);
      float tw = 0.65 + 0.35 * sin(uTime * (0.6 + 2.4 * h) + h * 61.7);
      float mag = (layer == 0) ? 1.0 : 0.55;
      vec3 tint = mix(vec3(0.72, 0.80, 1.0), vec3(1.0, 0.86, 0.66), hash13(id + 5.5));
      col += star * star * tw * mag * tint * 1.9;
    }
  }
  float bandY = d.y - 0.25 * sin(d.x * 2.0 + 1.3);
  float band = exp(-4.0 * bandY * bandY);
  float neb = fbm3(d.xz * 3.1 + vec2(uTime * 0.008, 0.0)) * fbm3(d.xy * 2.3 - 4.0);
  col += band * neb * vec3(0.10, 0.13, 0.22) * 0.8;
  return col;
}

vec3 discSample(float rs, float phi, vec3 rd, float beamSign) {
  if (rs < 0.05 || rs > DISK_OUT) return vec3(0.0);
  float inner  = smoothstep(DISK_IN - 0.6, DISK_IN + 0.35, rs);
  float outer  = 1.0 - smoothstep(DISK_OUT - 4.5, DISK_OUT, rs);
  float plunge = smoothstep(R_SHADOW * 1.05, DISK_IN, rs);
  float w = 2.4 * pow(max(rs, 1.0), -1.5);
  float phiR = phi + uTime * w;
  vec2 q = rs * vec2(cos(phiR), sin(phiR));
  float n1 = fbmThread(q * 0.55, uTime * 0.05);
  float n2 = fbm3(q * 1.65 + 37.0);
  float threads = 2.1 * n1;
  float lr = log2(max(rs, 1.2));
  vec2 laneUV = vec2(lr * 2.6 - uTime * 0.12, 0.0) + 2.6 * vec2(cos(phiR), sin(phiR));
  float laneN = fbm3(laneUV);
  float lane  = smoothstep(0.46, 0.58, laneN) * (1.0 - smoothstep(0.58, 0.72, laneN));
  float dust  = 1.0 - 0.78 * lane * inner;
  float dens = inner * outer * plunge * (0.30 + 1.10 * n2) * (0.55 + threads) * dust;
  if (dens <= 0.0005) return vec3(0.0);
  float T = pow(DISK_IN / max(rs, DISK_IN * 0.72), 0.75);
  vec3 tv = vec3(-sin(phi), 0.0, cos(phi));
  float beta = min(0.62, 0.52 * pow(DISK_IN / max(rs, 1.4), 0.5));
  float cosd = dot(tv, rd) * beamSign;
  float D = 1.0 / max(1.0 - beta * cosd, 0.25);
  float beam = clamp(D * D * D, 0.04, 3.2);
  float Tb = T * (1.0 + 0.16 * (beam - 1.0));
  vec3 base = mix(vec3(1.0), uTint * 1.12, 0.42);
  return bbCol(Tb) * base * (dens * T * T * beam * 0.62);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  float aspect = uRes.x / uRes.y;
  vec2 sc = vec2(uv.x * aspect, uv.y);

  float cy = cos(uCam.x), sy = sin(uCam.x);
  float cp = cos(uCam.y), sp = sin(uCam.y);
  vec3 ro = uCam.z * vec3(cp * sy, sp, cp * cy);
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw + rt * (sc.x * 0.42) + up * (sc.y * 0.42));

  float tca = dot(-ro, rd);
  vec3 pca = ro + rd * max(tca, 0.0);
  float bImp = length(pca);

  vec3 col = vec3(0.0);

  vec3 toHoleV = -pca;
  float toHoleL = length(toHoleV);
  vec3 toHole = toHoleL > 1e-4 ? toHoleV / toHoleL : vec3(0.0, 1.0, 0.0);
  float bend = (R_SHADOW * R_SHADOW) / (bImp * bImp + 0.35);
  vec3 rdStar = normalize(rd + toHole * (bend * 1.35));
  float starVis = smoothstep(R_SHADOW, R_SHADOW * 1.06, bImp);
  col += starField(rdStar) * (starVis * 1.05);

  float rc = -ro.y / rd.y;
  if (rd.y * ro.y < 0.0 && rc > 0.0) {
    vec3 p = ro + rd * rc;
    float rr = length(p.xz);
    float rs = sqrt(max(rr * rr - R_SHADOW * R_SHADOW * 0.72, 0.0));
    float phi = atan(p.z, p.x);
    col += discSample(rs, phi, rd, 1.0);
  }

  float bw = (bImp - R_SHADOW) / (R_SHADOW * 1.35);
  if (bw > 0.0 && bw < 1.0) {
    float rs2 = DISK_IN * (1.0 + 1.05 * bw);
    float phi2 = atan(pca.z, pca.x) + PI + 0.9 * bw;
    float band = exp(-bw * bw * 16.0) * smoothstep(0.0, 0.025, bw);
    col += discSample(rs2, phi2, rd, -1.0) * (band * 1.45);
  }

  float pxSig = max(17.0 / uRes.y, 0.004);
  float rg = exp(-pow((bImp - R_SHADOW * 1.005) / pxSig, 2.0));
  float side = clamp(dot(normalize(cross(vec3(0.0, 1.0, 0.0), ro)), rd) * 1.4 + 0.5, 0.0, 1.0);
  vec3 ringCol = mix(vec3(1.0, 0.82, 0.55), vec3(0.97, 0.98, 1.02), side);
  col += ringCol * (rg * (0.75 + 1.05 * side) * starVis);
  float glow = exp(-max(bImp - R_SHADOW, 0.0) * 2.2);
  col += uTint * (glow * glow * 0.075 * starVis);

  float pxR = 26.0 / uRes.y;
  col *= smoothstep(R_SHADOW - pxR, R_SHADOW + pxR * 0.5, bImp);

  col *= 0.95;
  col = vec3(1.0) - exp(-col * 1.22);
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(luma), 0.14 * smoothstep(0.72, 1.0, luma));
  col = pow(col, vec3(0.4545));
  vec2 vq = vUV - 0.5;
  col *= 1.0 - 0.42 * dot(vq, vq) * 1.9;
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * (1.5 / 255.0);
  outColor = vec4(col, 1.0);
}`;

  const FALLBACK_TINT = [0.98, 0.75, 0.14];

  const _clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function _hexToRgb01(hex) {
    if (typeof hex !== "string") return FALLBACK_TINT.slice();
    const clean = hex.replace("#", "");
    if (clean.length < 6) return FALLBACK_TINT.slice();
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
    ];
  }

  function _compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("blackhole: shader compile failed:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function _bleTeardown(state) {
    const gl = state.gl;
    if (gl) {
      if (state.prog) gl.deleteProgram(state.prog);
      if (state.shaders) for (const sh of state.shaders) gl.deleteShader(sh);
      if (state.vao) gl.deleteVertexArray(state.vao);
      if (state.vbo) gl.deleteBuffer(state.vbo);
      if (state.lostExt) try { state.lostExt.loseContext(); } catch (e) { }
    }
    if (state.canvas && state.onLost) {
      state.canvas.removeEventListener("webglcontextlost", state.onLost);
    }
    state.gl = null;
    state.prog = null;
    state.shaders = null;
    state.vao = null;
    state.vbo = null;
    state.uni = null;
    state.onLost = null;
    state.lostExt = null;
    state.canvas = null;
    state.cam = null;
    state.tint = null;
    state.ok = false;
  }

  ThemeScenes.register("blackhole", {
    label: "Black Hole",
    hidden: true,
    defaults: { speed: 0.5, color: "#fbbf24" },
    presetBgColors: ["#020617", "#000000", "#0a0015", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#fbbf24", bg: "#020617" }, 
      { color: "#5eead4", bg: "#050d1a" }, 
      { color: "#22d3ee", bg: "#0a0015" }, 
      { color: "#f87171", bg: "#1c0c10" }, 
      { color: "#4ade80", bg: "#07120a" }, 
      { color: "#93c5fd", bg: "#0a0e27" }, 
    ],
    options: [
      { key: "speed", label: "Rotation", type: "range", min: 0.1, max: 2, step: 0.1 },
      { key: "color", label: "Disk Color", type: "color" },
    ],

    init(state, w, h, opts) {
      _bleTeardown(state);
      state.t = 0;
      state.w = w;
      state.h = h;
      state.paused = false;
      state.tint = _hexToRgb01(opts && opts.color);

      const dpr = _clamp(window.devicePixelRatio || 1, 1, 2.0);
      const bleW = _clamp(Math.round(w * dpr), 2, 4096);
      const bleH = _clamp(Math.round(h * dpr), 2, 4096);
      const canvas = document.createElement("canvas");
      canvas.width = bleW;
      canvas.height = bleH;

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
        console.warn("blackhole: WebGL2 unavailable, scene disabled");
        state.ok = false;
        return;
      }

      const vs = _compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = _compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        state.ok = false;
        return;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, "aPos");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("blackhole: program link failed:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        state.ok = false;
        return;
      }

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      const uni = {};
      for (const name of ["uRes", "uTime", "uCam", "uTint"]) {
        uni[name] = gl.getUniformLocation(prog, name);
      }

      const onLost = (e) => {
        e.preventDefault();
        state.ok = false;
      };
      canvas.addEventListener("webglcontextlost", onLost);
      const lostExt = gl.getExtension("WEBGL_lose_context");

      state.canvas = canvas;
      state.gl = gl;
      state.prog = prog;
      state.shaders = [vs, fs];
      state.vao = vao;
      state.vbo = vbo;
      state.uni = uni;
      state.onLost = onLost;
      state.lostExt = lostExt;
      state.cam = { yaw: -0.45, pitch: 0.15, dist: 26.0 };
      state.ok = true;
    },

    draw(ctx, w, h, state, opts, dt) {
      if (state.paused) return;
      if (!state.ok || !state.gl || !state.canvas) return;
      const speed = opts && typeof opts.speed === "number" ? opts.speed : 0.5;
      state.t += Math.min(dt, 0.05) * (0.3 + speed * 1.4);
      const t = state.t;

      const cam = state.cam;
      cam.yaw = -0.45 + 0.05 * Math.sin(t * 0.055);
      cam.pitch = 0.15 + 0.022 * Math.sin(t * 0.041 + 1.7);
      cam.dist = 26.0 + 1.4 * Math.sin(t * 0.023);

      const gl = state.gl;
      gl.viewport(0, 0, state.canvas.width, state.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(state.prog);
      gl.bindVertexArray(state.vao);
      if (state.uni.uRes) gl.uniform2f(state.uni.uRes, state.canvas.width, state.canvas.height);
      if (state.uni.uTime) gl.uniform1f(state.uni.uTime, t);
      if (state.uni.uCam) gl.uniform3f(state.uni.uCam, cam.yaw, cam.pitch, cam.dist);
      const tint = state.tint || FALLBACK_TINT;
      if (state.uni.uTint) gl.uniform3f(state.uni.uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      ctx.drawImage(state.canvas, 0, 0, w, h);
    },

    start(state) { if (state && typeof state === "object") state.paused = false; },
    pause(state) { if (state && typeof state === "object") state.paused = true; },
    stop(state) { if (state && typeof state === "object") state.paused = true; },

    destroy(state) {
      if (state) _bleTeardown(state);
    },
  });
})();
