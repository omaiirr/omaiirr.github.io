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
  uniform float intensity;
  uniform vec3 tint;
  uniform vec3 background;
  out vec4 outputColor;

  const float TAU = 6.2831853;

  float causticLayer(vec2 uv, float t) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 5; n++) {
      float ft = t * (1.0 - 3.5 / float(n + 1));
      i = p + vec2(cos(ft - i.x) + sin(ft + i.y), sin(ft - i.y) + cos(ft + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + ft) / inten), p.y / (cos(i.y + ft) / inten)));
    }
    c /= 5.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 9.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (gl_FragCoord.xy - resolution * 0.5) / resolution.y;
    float t = time;
    vec2 bed = p * (2.1 + uv.y * 0.55);
    bed += vec2(0.08 * sin(bed.y * 1.4 + t * 0.2), 0.07 * cos(bed.x * 1.2 - t * 0.16));
    float primary = causticLayer(bed * 0.62, t);
    float secondary = causticLayer(mat2(0.8, -0.6, 0.6, 0.8) * bed * 0.83 + 4.2, t * 0.82 + 7.0);
    float light = primary * 0.8 + secondary * 0.35;
    float pool = exp(-dot(p - vec2(0.18, 0.16), p - vec2(0.18, 0.16)) * 1.05);
    float rays = pow(0.5 + 0.5 * sin(p.x * 9.0 + p.y * 2.0 + sin(p.x * 4.0 - t * 0.12)), 6.0);
    vec3 water = background * (0.75 + 0.3 * pool);
    water += tint * (0.02 + 0.06 * pool + rays * uv.y * 0.02) * intensity;
    vec3 pearl = mix(tint, vec3(1.0), 0.62);
    vec3 illumination = mix(tint, pearl, smoothstep(0.12, 1.25, light));
    water += illumination * light * (0.5 + 0.5 * pool) * intensity * 0.9;
    float vignette = 1.0 - 0.24 * smoothstep(0.25, 1.15, length(p * vec2(0.65, 1.0)));
    water = max(water * vignette, vec3(0.0));
    outputColor = vec4(1.0 - exp(-water * 1.35), 1.0);
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
    const color = rgb(opts.color, "#06b6d4").map((v) => Math.round(v * 255));
    const power = (opts.intensity ?? 60) / 100;
    ctx.fillStyle = opts.bgColor || "#061522";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 16; i++) {
      const x = w * (0.5 + 0.55 * Math.sin(i * 2.399 + state.t * 0.045));
      const y = h * (0.5 + 0.55 * Math.cos(i * 1.73 - state.t * 0.037));
      const radius = h * (0.1 + 0.04 * Math.sin(i + state.t * 0.1));
      const glow = ctx.createRadialGradient(x, y, radius * 0.55, x, y, radius);
      glow.addColorStop(0, `rgba(${color},0)`);
      glow.addColorStop(0.65, `rgba(${color},${power * 0.12})`);
      glow.addColorStop(0.76, `rgba(${color},${power * 0.35})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  ThemeScenes.register("caustics", {
    label: "Caustics",
    defaults: { speed: 1, intensity: 60, color: "#06b6d4" },
    presetBgColors: [
      "#020617",
      "#000000",
      "#0a1a2e",
      "#0f172a",
      "#0a1a1a",
      "#0d1117",
    ],
    presetCombos: [
      { color: "#06b6d4", bg: "#0a1a2e" },
      { color: "#34d399", bg: "#0a1a1a" },
      { color: "#fbbf24", bg: "#0a0a1a" },
      { color: "#a78bfa", bg: "#0a0015" },
      { color: "#7dd3fc", bg: "#020617" },
      { color: "#f87171", bg: "#1c0c10" },
    ],
    options: [
      {
        key: "speed",
        label: "Speed",
        type: "range",
        min: 0.3,
        max: 3,
        step: 0.1,
      },
      {
        key: "intensity",
        label: "Intensity",
        type: "range",
        min: 20,
        max: 100,
        step: 5,
      },
      { key: "color", label: "Color", type: "color" },
    ],
    init(state) {
      release(state);
      state.t = state.t || 0;
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
        if (!state.program) throw new Error("Caustics program unavailable");
        for (const [type, source] of [
          [gl.VERTEX_SHADER, vertexSource],
          [gl.FRAGMENT_SHADER, fragmentSource],
        ]) {
          const shader = gl.createShader(type);
          if (!shader) throw new Error("Caustics shader unavailable");
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
          ["resolution", "time", "intensity", "tint", "background"].map(
            (key) => [key, gl.getUniformLocation(state.program, key)],
          ),
        );
      } catch {
        release(state);
      }
    },
    draw(ctx, w, h, state, opts, dt) {
      if (w <= 0 || h <= 0) return;
      state.t += Math.min(0.05, Math.max(0, dt || 0)) * (opts.speed ?? 1);
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
      gl.uniform1f(u.intensity, (opts.intensity ?? 60) / 100);
      gl.uniform3fv(u.tint, rgb(opts.color, "#06b6d4"));
      gl.uniform3fv(u.background, rgb(opts.bgColor, "#061522"));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ctx.drawImage(state.surface, 0, 0, w, h);
      ctx.restore();
    },
    destroy(state) {
      release(state);
    },
  });
})();
