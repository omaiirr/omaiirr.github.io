(() => {
  const { _hexToRgb } = ThemeScenes.__helpers;

  function _makeRng() {
    let seed = (Math.random() * 1e9) >>> 0;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const TERRAIN_GLSL = `
float limbTerrain(float phi, float s){
  return sin(phi*5.0 + s)*0.42 + sin(phi*13.0 + s*2.7)*0.33 + sin(phi*31.0 + s*5.3)*0.25;
}`;

  const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uT;      // phase clock (flicker, rotation), speed-scaled
uniform float uMotion; // motion clock (transit wobble, parallax)
uniform vec3 uTint;    // corona streamer / bokeh tint (0-1)
uniform vec3 uBg;      // background base color (0-1)
uniform float uSeed;   // terrain + composition seed
${TERRAIN_GLSL}

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1,0)), c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.55;
  for(int i=0;i<4;i++){ v += a*vnoise(p); p = p*2.03 + vec2(7.3,3.1); a *= 0.5; }
  return v;
}

vec3 coronaRamp(float t, vec3 tint){
  vec3 hot  = vec3(1.0, 0.985, 0.94);
  vec3 gold = vec3(1.0, 0.88, 0.68);
  vec3 mid  = mix(gold, tint, 0.30);
  return t < 0.22 ? mix(hot, gold, t/0.22)
       : t < 0.55 ? mix(gold, mid, (t-0.22)/0.33)
       : mix(mid, tint, (t-0.55)/0.45);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  float aspect = uRes.x / uRes.y;
  vec2 p = (frag - 0.5*uRes) / uRes.y; // centered, y-normalized scene units

  vec2 sunC = vec2(0.0, -0.045);
  float sunR = 0.235; // eclipse system ≈ 47% of frame height — sky room for streamers
  float wobX = 0.012 * cos(uMotion*0.10 + uSeed*1.7);
  float wobY = 0.009 * sin(uMotion*0.16 + uSeed*2.3);
  vec2 moonC = sunC + vec2(wobX, wobY);
  float moonR = sunR * 1.045;
  vec2 q = p - moonC;
  float dMoon = length(q);
  float jag = 0.010; // lunar limb roughness (scene units)

  vec3 col = uBg * 0.85;
  vec2 sp = p;
  sp.x += uMotion * 0.0025;
  vec2 sg = sp * 90.0;
  vec2 cell = floor(sg);
  float starA = hash21(cell + 31.7);
  if (starA > 0.982) {
    vec2 lp = fract(sg) - (vec2(hash21(cell+13.3), hash21(cell+47.9)) * 0.6 + 0.2);
    float mag = 0.30 + 0.70*hash21(cell+91.3);
    float tw = 0.65 + 0.35*sin(uT*(0.3 + 2.0*hash21(cell+77.7)) + starA*40.0);
    float d = length(lp);
    col += vec3(0.84,0.87,0.95) * exp(-d*d*(mag*260.0+60.0)) * (0.10+0.75*mag) * tw;
  }
  vec2 sg2 = sp*44.0 + 17.0; // second, fainter field for depth
  if (hash21(floor(sg2)+5.2) > 0.986) {
    vec2 lp2 = fract(sg2) - 0.5;
    col += vec3(0.75,0.79,0.90) * exp(-dot(lp2,lp2)*140.0) * 0.16;
  }
  float neb = fbm(sp*3.0 + vec2(4.0, uSeed));
  col += mix(vec3(0.10,0.07,0.16), vec3(0.05,0.09,0.15), 0.5+0.5*sin(uSeed)) * smoothstep(0.55, 1.0, neb) * 0.22;

  vec2 sunQ = p - sunC;
  float rSun = length(sunQ);
  float ang = atan(sunQ.y, sunQ.x);
  float axis = 0.20 + 0.012*sin(uT*0.05); // solar axis, slow drift
  float eq = cos(ang - axis - 1.5707963);
  float belt = exp(-eq*eq*3.5);            // equatorial streamer belt
  float plume = exp(-eq*eq*0.18)*(1.0 - belt*0.85); // polar plumes
  float rot = uT*0.012;                    // whole-corona drift
  vec2 nz = vec2(cos(ang+rot), sin(ang+rot)) * (2.2 + rSun*1.6) + uSeed*3.1;
  float turb = fbm(nz*2.4 + vec2(uT*0.05, -uT*0.035));
  float flick = 0.75 + 0.5*turb;
  float rho = (0.10 + 0.32*belt + 0.10*plume) * flick;
  float xOut = max(rSun/sunR - 1.0, 0.0);
  float streak = 0.60 + 0.85 * fbm(vec2(cos(ang + rot*0.5), sin(ang + rot*0.5)) * (3.2 + xOut*0.9) + uSeed*2.0);
  float falloff = exp(-xOut*10.0)*2.4 + pow(xOut + 0.06, -1.6) * 0.55;
  float coronaI = rho * falloff * streak;
  float regA = abs(fract((ang - axis - 1.5707963)*0.477 + 0.5) - 0.5);
  float lpT = fbm(vec2(ang*3.0 + uT*0.3, rSun*2.0 - uT*0.22));
  coronaI += smoothstep(0.16, 0.02, regA) * belt * lpT * 0.55 * exp(-max(rSun/sunR - 1.0, 0.0)*1.8);
  float temp = clamp(1.0 - log2(max(rSun/sunR, 1.0))*0.36, 0.0, 1.0);
  col += coronaRamp(temp, uTint) * coronaI * 0.50;
  col += vec3(1.0, 0.97, 0.90) * exp(-xOut*30.0) * 1.6 * (0.75 + 0.5*turb);

  col += vec3(1.0, 0.85, 0.66) * exp(-max(rSun/sunR - 1.0, 0.0)*0.5) * 0.030 * (0.8 + 0.4*turb);

  float sunD = rSun / sunR;
  vec3 photo = vec3(1.0, 0.972, 0.918) * (1.0 - 0.42*sunD*sunD);
  photo = mix(photo, vec3(0.98, 0.87, 0.72), smoothstep(0.75, 1.0, sunD));
  float sunMask = 1.0 - smoothstep(sunR*0.985, sunR*1.005, rSun);
  col = mix(col, photo * 1.35, sunMask);

  float rimV = (sunD - 1.0) * 90.0;
  col += vec3(1.0, 0.45, 0.30) * exp(-rimV*rimV) * 0.5 * (0.8 + 0.4*turb);

  vec3 beads = vec3(0.0);
  float beadMax = 0.0;
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float phi = (fi/24.0)*6.2831853;
    vec2 sl = sunC + vec2(cos(phi), sin(phi)) * sunR;
    float lm = moonR + limbTerrain(phi, uSeed*23.0) * jag;
    float ex = length(sl - moonC) - lm; // >0 → exposed photosphere
    float bead = smoothstep(0.0, 0.004, ex) * max(1.0 - ex/0.008, 0.0)*1.15;
    bead *= 1.0 - clamp(-limbTerrain(phi, uSeed*23.0), 0.0, 1.0)*0.35;
    float tw = 0.7 + 0.3*sin(uT*(2.0 + 3.0*hash11(fi)) + hash11(fi*7.0)*6.2831853);
    vec2 db = p - sl;
    beads += vec3(1.0, 0.97, 0.9) * bead * tw * exp(-dot(db,db)/0.00016);
    beadMax = max(beadMax, bead);
  }
  col += beads * 1.1;
  float limbG = exp(-pow((rSun/sunR - 1.0)*46.0, 2.0));
  col += vec3(1.0, 0.96, 0.88) * beadMax * limbG * 0.42;

  float contact = atan(wobY, wobX); // wobble direction = last-contact side
  vec2 spikeDir = vec2(-sin(contact), cos(contact));
  float spike = exp(-pow(abs(dot(normalize(sunQ + 1e-5), spikeDir))*3.2, 2.0));
  col += vec3(1.0, 0.96, 0.86) * spike * 0.65 * beadMax;

  float lm = moonR + limbTerrain(atan(q.y, q.x), uSeed*23.0) * jag;
  float rv = (dMoon - lm - 0.004) * 130.0;
  float frV = (dMoon - lm - 0.010) * 230.0;
  float fbV = (dMoon - lm - 0.002) * 230.0;
  col += vec3(1.0, 0.97, 0.90) * exp(-rv*rv) * 0.16;
  col += vec3(1.0, 0.35, 0.28) * exp(-frV*frV) * 0.10;
  col += vec3(0.35, 0.55, 1.0) * exp(-fbV*fbV) * 0.10;

  float moonMask = 1.0 - smoothstep(lm - 0.0012, lm + 0.0012, dMoon);
  vec3 moonCol = vec3(0.024, 0.030, 0.048) * (0.85 + 0.3*fbm(q*90.0 + uSeed*5.0));
  moonCol += vec3(0.05, 0.06, 0.08) * exp(-dMoon/max(moonR, 1e-3)*2.2); // earthshine
  col = mix(col, moonCol, moonMask);

  vec2 tA = vec2(-0.42, -0.50), tB = vec2(0.16, -0.16);
  vec2 tb = tB - tA;
  float tt = clamp(dot(p - tA, tb)/dot(tb, tb), 0.0, 1.0);
  float beam = 1.0 - smoothstep(0.016, 0.030, length(p - tA - tb*tt));
  float strut = 0.0;
  for (int s = 0; s < 2; s++) {
    float fi = float(s);
    vec2 sA = tA + tb*(0.22 + fi*0.30);
    vec2 sb = normalize(vec2(0.62 - fi*0.9, -0.42 - fi*0.2)) * (0.16 - fi*0.05);
    float st = clamp(dot(p - sA, sb)/dot(sb, sb), 0.0, 1.0);
    strut += 1.0 - smoothstep(0.006, 0.013, length(p - sA - sb*st));
  }
  vec2 pr = p - (tA + vec2(0.24, -0.02));
  float ca = cos(-0.22), sa = sin(-0.22);
  pr = vec2(pr.x*ca - pr.y*sa, pr.x*sa + pr.y*ca);
  float panel = (1.0 - smoothstep(0.14, 0.155, abs(pr.x))) * (1.0 - smoothstep(0.028, 0.036, abs(pr.y)));
  float panelGrid = panel * step(0.5, fract(pr.x*24.0));
  float opaque = clamp((beam + strut)*0.94 + panel*0.94, 0.0, 1.0);
  vec3 structCol = vec3(0.016, 0.022, 0.040) + vec3(0.045, 0.075, 0.115)*panelGrid;
  col = mix(col, structCol, opaque);

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float sp1 = hash11(fi*3.1 + uSeed);
    float sp2 = hash11(fi*7.7 + uSeed*1.3);
    vec2 bp = vec2(-0.40 + sp1*0.55, -0.50 + sp2*0.34);
    bp += 0.012*vec2(sin(uT*0.11 + fi*2.2), cos(uT*0.09 + fi*1.7));
    float br = 0.022 + 0.030*hash11(fi*11.3 + uSeed*0.7);
    float bk = smoothstep(br, br*0.55, length(p - bp));
    float tw = 0.6 + 0.4*sin(uT*(0.5 + sp1) + sp2*6.2831853);
    col += uTint * bk * (0.10 + 0.14*tw) * (1.0 - opaque*0.5);
  }

  float vig = smoothstep(1.35, 0.35, length(p*vec2(0.82, 1.0)));
  col *= mix(0.48, 1.0, vig);
  col += (hash21(frag + fract(uT)*61.7) - 0.5) * 0.028;        // film grain
  col += (hash21(frag*1.7 + 0.5) - 0.5) / 255.0;               // dither
  col = max(col, vec3(0.0));                                   // grain guard
  col = col / (1.0 + col);                                      // filmic curve
  col = pow(col, vec3(0.92));
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const eclipseScene = {
    label: "Eclipse",
    hidden: true,
    defaults: { speed: 1, color: "#a855f7" },
    presetBgColors: ["#020617", "#000000", "#0a0a1a", "#0f172a", "#1a0a2e", "#0d1117"],
    presetCombos: [
      { color: "#a855f7", bg: "#020617" }, 
      { color: "#f472b6", bg: "#1a0a2e" }, 
      { color: "#fbbf24", bg: "#1a1208" }, 
      { color: "#7dd3fc", bg: "#0a1628" }, 
      { color: "#f87171", bg: "#1c0f0c" }, 
      { color: "#e2e8f0", bg: "#050510" }, 
    ],
    options: [
      { key: "speed", label: "Speed", type: "range", min: 0.2, max: 2, step: 0.1 },
      { key: "color", label: "Corona Color", type: "color" },
    ],

    init(state, w, h, opts) {
      state.t = 0;
      if (state._gl || state._glCanvas) this.destroy(state);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.min(4096, Math.max(1, Math.round(w * dpr)));
      const bh = Math.min(4096, Math.max(1, Math.round(h * dpr)));

      const canvas = document.createElement("canvas");
      canvas.width = bw;
      canvas.height = bh;
      let gl = null;
      try {
        gl = canvas.getContext("webgl2", {
          alpha: false, antialias: false, depth: false, stencil: false,
          preserveDrawingBuffer: true, powerPreference: "high-performance",
        });
      } catch (e) { gl = null; }
      state._gl = gl;
      state._glCanvas = canvas;
      if (!gl) return; 

      const mkShader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn("[eclipse] shader:", gl.getShaderInfoLog(s));
          gl.deleteShader(s);
          return null;
        }
        return s;
      };
      const vs = mkShader(gl.VERTEX_SHADER, VERT);
      const fs = mkShader(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        this.destroy(state);
        return;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("[eclipse] link:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        this.destroy(state);
        return;
      }
      state._prog = prog;

      const quad = new Float32Array([-1, -1, 3, -1, -1, 3]);
      state._vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state._vbo);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
      state._vao = gl.createVertexArray();
      gl.bindVertexArray(state._vao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      state._uRes = gl.getUniformLocation(prog, "uRes");
      state._uT = gl.getUniformLocation(prog, "uT");
      state._uMotion = gl.getUniformLocation(prog, "uMotion");
      state._uTint = gl.getUniformLocation(prog, "uTint");
      state._uBg = gl.getUniformLocation(prog, "uBg");
      state._uSeed = gl.getUniformLocation(prog, "uSeed");

      state._seed = _makeRng()();
      state._bg = opts.bgColor ? _hexToRgb(opts.bgColor).map(v => v / 255) : [0.008, 0.009, 0.026];
      state._running = true;

      state._onLost = (e) => { e.preventDefault(); state._gl = null; };
      canvas.addEventListener("webglcontextlost", state._onLost);
    },

    draw(ctx, w, h, state, opts, dt) {
      if (state._running !== false) state.t = (state.t || 0) + dt; 
      if (!state._gl || !state._prog) {
        const r = Math.min(w, h);
        ctx.fillStyle = opts.bgColor || "#05060e";
        ctx.fillRect(0, 0, w, h);
        const rgb = _hexToRgb(opts.color || "#a855f7");
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 0.35);
        g.addColorStop(0, "rgba(255,250,235,0.9)");
        g.addColorStop(0.18, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#05070d";
        ctx.beginPath();
        ctx.arc(
          w / 2 + Math.sin(state.t * 0.1) * r * 0.012,
          h / 2 + Math.cos(state.t * 0.16) * r * 0.010,
          r * 0.21, 0, Math.PI * 2,
        );
        ctx.fill();
        return;
      }
      const gl = state._gl;
      const canvas = state._glCanvas;
      const speed = opts.speed ?? 1;
      const tint = _hexToRgb(opts.color || "#a855f7");
      const bg = opts.bgColor ? _hexToRgb(opts.bgColor).map(v => v / 255) : state._bg;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(state._prog);
      gl.uniform2f(state._uRes, canvas.width, canvas.height);
      gl.uniform1f(state._uT, state.t * speed);
      gl.uniform1f(state._uMotion, state.t * speed);
      gl.uniform3f(state._uTint, tint[0] / 255, tint[1] / 255, tint[2] / 255);
      gl.uniform3f(state._uBg, bg[0], bg[1], bg[2]);
      gl.uniform1f(state._uSeed, state._seed);
      gl.bindVertexArray(state._vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      ctx.drawImage(canvas, 0, 0, w, h);
    },

    start(state) { state._running = true; },
    pause(state) { state._running = false; },
    stop(state) { state._running = false; },
    destroy(state) {
      const gl = state ? state._gl : null;
      if (gl) {
        try {
          if (state._prog) gl.deleteProgram(state._prog);
          if (state._vbo) gl.deleteBuffer(state._vbo);
          if (state._vao) gl.deleteVertexArray(state._vao);
          const lose = gl.getExtension("WEBGL_lose_context");
          if (lose) lose.loseContext();
        } catch (e) { }
      }
      if (state && state._glCanvas && state._onLost) {
        state._glCanvas.removeEventListener("webglcontextlost", state._onLost);
      }
      if (state) {
        state._gl = null;
        state._glCanvas = null;
        state._prog = null;
        state._vbo = null;
        state._vao = null;
        state._uRes = state._uT = state._uMotion = null;
        state._uTint = state._uBg = state._uSeed = null;
        state._onLost = null;
        state._bg = null;
      }
    },
  };

  ThemeScenes.register("eclipse", eclipseScene);
})();
