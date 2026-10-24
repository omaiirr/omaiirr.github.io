(() => {
  const vertexSource = `#version 300 es
  void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const fragmentSource = `#version 300 es
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform float density;
  uniform float scale;
  uniform vec3 tint;
  uniform vec3 background;
  out vec4 outputColor;

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

  float cloudField(vec3 p) {
    vec2 q = (p.xz + vec2(time * 0.055, time * 0.018)) / scale;
    float billow = fbm(q * 0.85 + vec2(p.y * 0.42, -p.y * 0.28));
    float crest = 0.2 + billow * 1.8 + noise(q * 4.0 + p.y) * 0.12;
    float coverage = mix(0.08, 0.37, (density - 3.0) / 17.0);
    return smoothstep(-0.12, 0.55, crest - p.y + coverage * 0.4)
      * smoothstep(-0.2, 0.25, p.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (gl_FragCoord.xy - resolution * 0.5) / resolution.y;
    vec3 lightColor = mix(tint, vec3(1.0, 0.91, 0.8), 0.45);
    float horizonY = 0.66;
    float glow = exp(-abs(uv.y - horizonY) * 7.0);
    vec3 col = mix(background * 0.7, background + tint * 0.32, glow);
    col += lightColor * exp(-length(p - vec2(0.5, 0.18)) * 4.0) * 0.25;
    float peaks = 0.11 * exp(-abs(p.x + 0.48) * 15.0)
      + 0.065 * exp(-abs(p.x - 0.23) * 22.0);
    float ridge = horizonY - 0.022 + peaks + 0.04 * fbm(vec2(p.x * 14.0, 5.0));
    float rock = 1.0 - smoothstep(ridge - 0.003, ridge + 0.003, uv.y);
    col = mix(col, background * 0.5 + tint * 0.06, rock);
    vec3 ro = vec3(0.0, 3.0, -4.0);
    vec3 rd = normalize(vec3(p.x, (uv.y - horizonY) * 1.25, 1.2));
    if (rd.y < -0.005) {
      float start = max(0.0, (1.95 - ro.y) / rd.y);
      float end = min(65.0, (0.15 - ro.y) / rd.y);
      float stride = max(0.0, end - start) / 72.0;
      float transmittance = 1.0;
      vec3 sum = vec3(0.0);
      float jitter = 0.5;
      for (int i = 0; i < 72; i++) {
        float distance = start + (float(i) + jitter) * stride;
        vec3 pos = ro + rd * distance;
        float d = cloudField(pos);
        if (d > 0.01) {
          float occlusion = cloudField(pos + vec3(0.4, 0.3, -0.2));
          float lit = clamp((d - occlusion) * 2.0 + 0.42, 0.08, 1.0);
          vec3 shade = mix(tint * 0.23 + background * 0.2, lightColor, lit);
          shade = mix(shade, background + tint * 0.38, 1.0 - exp(-distance * 0.018));
          float alpha = 1.0 - exp(-d * stride * 2.3);
          sum += transmittance * alpha * shade;
          transmittance *= 1.0 - alpha;
          if (transmittance < 0.025) break;
        }
      }
      col = col * transmittance + sum;
    }
    col *= 1.0 - 0.15 * smoothstep(0.3, 1.2, length(p));
    outputColor = vec4(pow(max(col, vec3(0.0)), vec3(0.85)), 1.0);
  }`;

  function rgb(hex, fallback) {
    const value = /^#[\da-f]{6}$/i.test(hex || "") ? hex : fallback;
    return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  }

  function release(state) {
    const gl = state.gl;
    if (state.surface && state.onLost)
      state.surface.removeEventListener("webglcontextlost", state.onLost);
    if (gl) {
      if (state.program) gl.deleteProgram(state.program);
      for (const shader of state.shaders || []) gl.deleteShader(shader);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose && !gl.isContextLost()) lose.loseContext();
    }
    if (state.surface) state.surface.width = state.surface.height = 1;
    state.gl = null;
    state.program = null;
    state.shaders = null;
    state.surface = null;
    state.uniforms = null;
    state.onLost = null;
  }

  function fallback(ctx, w, h, state, opts) {
    const color = rgb(opts.color, "#38bdf8").map((v) => Math.round(v * 255));
    const bg = opts.bgColor || "#0f172a";
    const drift = state.t * 12;
    const S = h / 1080;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(
      w * 0.72,
      h * 0.32,
      0,
      w * 0.72,
      h * 0.32,
      h * 0.5,
    );
    glow.addColorStop(0, `rgba(${color},0.14)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8,12,24,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 24)
      ctx.lineTo(x, h * 0.34 - Math.sin(x * 0.008) * h * 0.05);
    ctx.lineTo(w, h);
    ctx.fill();
    const count = Math.round(opts.density ?? 8);
    for (let i = 0; i < count; i++) {
      const seed = i * 7.13;
      const rx =
        (90 + (Math.sin(seed) * 0.5 + 0.5) * 120) * (opts.scale ?? 1) * S;
      const x =
        ((((seed * 137 +
          drift * (0.8 + (Math.sin(seed * 3) * 0.5 + 0.5) * 0.6)) %
          (w + rx * 4)) +
          w +
          rx * 4) %
          (w + rx * 4)) -
        rx * 2;
      const y = h * (0.44 + (Math.sin(seed * 5) * 0.5 + 0.5) * 0.36);
      const ry = rx * 0.32;
      const g = ctx.createRadialGradient(x, y - ry * 0.3, 0, x, y, rx);
      g.addColorStop(0, `rgba(${color},0.5)`);
      g.addColorStop(0.5, `rgba(${color},0.2)`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ThemeScenes.register("cloudsea", {
    label: "Cloud Sea",
    hidden: true,
    defaults: { density: 8, speed: 0.5, scale: 1, color: "#38bdf8" },
    presetBgColors: [
      "#0f172a",
      "#020617",
      "#000000",
      "#1a1a2e",
      "#0a1a2e",
      "#0d1117",
    ],
    presetCombos: [
      { color: "#38bdf8", bg: "#0f172a" },
      { color: "#fbbf24", bg: "#1a1208" },
      { color: "#f472b6", bg: "#1a0a2e" },
      { color: "#7dd3fc", bg: "#0a1a2e" },
      { color: "#e2e8f0", bg: "#020617" },
      { color: "#34d399", bg: "#0a1a0a" },
    ],
    options: [
      {
        key: "density",
        label: "Clouds",
        type: "range",
        min: 3,
        max: 20,
        step: 1,
      },
      {
        key: "speed",
        label: "Drift",
        type: "range",
        min: 0.1,
        max: 2,
        step: 0.1,
      },
      {
        key: "scale",
        label: "Cloud Size",
        type: "range",
        min: 0.5,
        max: 2,
        step: 0.1,
      },
      { key: "color", label: "Cloud Color", type: "color" },
    ],
    init(state) {
      release(state);
      state.t = state.t || 0;
      state.dt = 0;
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
        state.program = gl.createProgram();
        if (!state.program) throw new Error("Cloudsea program unavailable");
        for (const [type, source] of [
          [gl.VERTEX_SHADER, vertexSource],
          [gl.FRAGMENT_SHADER, fragmentSource],
        ]) {
          const shader = gl.createShader(type);
          if (!shader) throw new Error("Cloudsea shader unavailable");
          state.shaders.push(shader);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(shader));
          gl.attachShader(state.program, shader);
        }
        gl.linkProgram(state.program);
        if (!gl.getProgramParameter(state.program, gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(state.program));
        for (const shader of state.shaders) {
          gl.detachShader(state.program, shader);
          gl.deleteShader(shader);
        }
        state.shaders = [];
        state.uniforms = Object.fromEntries(
          ["resolution", "time", "density", "scale", "tint", "background"].map(
            (key) => [key, gl.getUniformLocation(state.program, key)],
          ),
        );
      } catch {
        release(state);
      }
    },
    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      const dtc = Math.min(0.05, Math.max(0, dt || 0));
      state.t += dtc * (opts.speed ?? 0.5);
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
      const width = Math.max(
        1,
        Math.round(w * Math.hypot(transform.a, transform.b)),
      );
      const height = Math.max(
        1,
        Math.round(h * Math.hypot(transform.c, transform.d)),
      );
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
      gl.viewport(0, 0, width, height);
      gl.useProgram(state.program);
      const u = state.uniforms;
      gl.uniform2f(u.resolution, width, height);
      gl.uniform1f(u.time, state.t);
      gl.uniform1f(u.density, opts.density ?? 8);
      gl.uniform1f(u.scale, opts.scale ?? 1);
      gl.uniform3fv(u.tint, rgb(opts.color, "#38bdf8"));
      gl.uniform3fv(u.background, rgb(opts.bgColor, "#0f172a"));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ctx.drawImage(state.surface, 0, 0, w, h);
      ctx.restore();
    },
    destroy(state) {
      release(state);
    },
  });
})();
