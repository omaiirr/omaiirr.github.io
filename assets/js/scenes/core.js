const ThemeScenes = (() => {
  const SCENES = {};

  /* Every scene ships as its own file next to this one. The page loads only
     this core plus the scene that is actually on screen; the rest arrive
     through ensure()/ensureAll() when a picker needs them. Order here is the
     order the grids show, so lazy loading cannot reshuffle the library. */
  const SCENE_IDS = [
    "particles", "aurora", "rain", "bubbles", "starfield", "embers",
    "ripples", "comets", "galaxy", "snow", "thunderstorm", "blossomstorm",
    "butterflies", "campfire", "fireflies", "ocean", "koi", "lanterns",
    "leaves", "meteor", "condensation", "grass", "jellyfish", "neoncity",
    "eclipse", "blackhole", "inkwater", "confetti", "balloon", "dandelion",
    "cloudsea", "mistysunrise", "lighthouse", "starorbit", "caustics",
    "lighttunnel", "origami", "dunes", "fireworks", "ornate",
  ];
  const KNOWN = Object.fromEntries(SCENE_IDS.map((id) => [id, true]));

  let _basePath = "/assets/js/scenes/";
  try {
    const self = document.currentScript;
    if (self && self.src) _basePath = self.src.replace(/core\.js(?:\?.*)?$/, "");
  } catch (e) {}

  const _loads = {};
  let _allPromise = null;

  function register(id, def) { SCENES[id] = def; }

  function has(id) {
    return typeof id === "string" && KNOWN[id] === true;
  }

  function isLoaded(id) {
    return !!SCENES[id];
  }

  /* Loads one scene file on demand. Resolves true when the scene registered
     itself, false for unknown ids and network/parse failures — callers treat
     false as "not available" rather than throwing. */
  function ensure(id) {
    if (!has(id)) return Promise.resolve(false);
    if (SCENES[id]) return Promise.resolve(true);
    if (_loads[id]) return _loads[id];
    _loads[id] = new Promise((resolve) => {
      const tag = document.createElement("script");
      tag.src = _basePath + id + "/scene.js";
      tag.async = true;
      tag.dataset.scene = id;
      tag.onload = () => {
        _loads[id] = null;
        resolve(!!SCENES[id]);
      };
      tag.onerror = () => {
        _loads[id] = null;
        resolve(false);
      };
      (document.head || document.documentElement).appendChild(tag);
    });
    return _loads[id];
  }

  function ensureAll(ids) {
    if (Array.isArray(ids)) return Promise.all(ids.map(ensure)).then(() => true);
    if (_allPromise) return _allPromise;
    _allPromise = Promise.all(SCENE_IDS.map(ensure)).then((results) => {
      if (results.some((ok) => !ok)) _allPromise = null;
      return true;
    });
    return _allPromise;
  }

  /* Scenes the pickers hide. Mirrors `hidden: true` in each scene file; it
     lives here so the library count on the button is right before any scene
     file has been fetched. */
  const HIDDEN_IDS = [
    "blackhole", "blossomstorm", "cloudsea", "dunes", "eclipse", "inkwater",
    "lighttunnel", "starorbit",
  ];

  function count() {
    return SCENE_IDS.length;
  }

  function visibleCount() {
    return SCENE_IDS.length - HIDDEN_IDS.length;
  }

  function isComplete() {
    return SCENE_IDS.every((id) => !!SCENES[id]);
  }

  let _snowSpriteCache = null;
  function _makeSnowSprites() {
    const levels = [];
    for (let lv = 0; lv < 4; lv++) {
      const frames = [];
      const sz = 32;
      for (let fi = 0; fi < 16; fi++) {
        const c = document.createElement('canvas');
        c.width = c.height = sz;
        const x = c.getContext('2d');
        const cx = sz / 2, cy = sz / 2;
        const rot = (fi / 16) * Math.PI * 2;
        const arms = lv + 3;
        const armLen = sz * 0.35;
        const coreR = sz * (0.06 + lv * 0.02);
        x.save();
        x.translate(cx, cy);
        x.rotate(rot);
        const glow = x.createRadialGradient(0, 0, 0, 0, 0, coreR * 3);
        glow.addColorStop(0, 'rgba(232,237,245,0.5)');
        glow.addColorStop(1, 'rgba(232,237,245,0)');
        x.fillStyle = glow;
        x.beginPath(); x.arc(0, 0, coreR * 3, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(232,237,245,0.9)';
        x.lineWidth = 1 + lv * 0.3;
        x.lineCap = 'round';
        for (let a = 0; a < arms; a++) {
          const angle = (a / arms) * Math.PI * 2;
          x.beginPath();
          x.moveTo(0, 0);
          x.lineTo(Math.cos(angle) * armLen, Math.sin(angle) * armLen);
          x.stroke();
          if (lv >= 1) {
            const bLen = armLen * 0.4;
            const bDist = armLen * 0.6;
            const bx = Math.cos(angle) * bDist;
            const by = Math.sin(angle) * bDist;
            for (let s = -1; s <= 1; s += 2) {
              const ba = angle + s * Math.PI / 4;
              x.beginPath();
              x.moveTo(bx, by);
              x.lineTo(bx + Math.cos(ba) * bLen, by + Math.sin(ba) * bLen);
              x.stroke();
            }
          }
        }
        x.fillStyle = 'rgba(255,255,255,0.9)';
        x.beginPath(); x.arc(0, 0, coreR, 0, Math.PI * 2); x.fill();
        x.restore();
        frames.push(c);
      }
      levels.push(frames);
    }
    return levels;
  }

  function _mixHex(hex1, hex2, t) {
    const [r1, g1, b1] = _hexToRgb(hex1);
    const [r2, g2, b2] = _hexToRgb(hex2);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }

  function _hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return [167, 139, 250];
    const clean = hex.replace("#", "");
    if (clean.length < 6) return [167, 139, 250];
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
  }

  function resetComet(c, w, h, speed) {
    c.vx = (Math.random() - 0.5) * 200;
    c.vy = (Math.random() - 0.5) * 200;
    c.speed = (Math.random() * 0.5 + 0.5) * speed;
    c.trail = [];
    c.maxTrail = Math.floor(Math.random() * 20 + 15);
    c.alpha = Math.random() * 0.4 + 0.3;
  }

  let activeId = null;
  let rafId = null;
  /* Token for a start that is waiting on its scene file. stop() clears it, so
     closing a preview before the chunk lands cannot revive the scene. */
  let _queued = null;
  let canvasEl = null;
  let state = {};
  let lastTime = 0;
  let currentOptions = {};
  let resizeHandler = null;

  function _syncCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    /* Capped at 2: a 3x phone screen would otherwise push 2.25x more pixels
       through every frame for detail this ambience does not need. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
    const resized = canvas.width !== pw || canvas.height !== ph;
    if (resized) {
      canvas.width = pw; canvas.height = ph;
    }
    const ctx = canvas.getContext("2d");
    /* Always re-apply the device-pixel transform, not only when the bitmap is
       resized. Assigning canvas.width resets the context, and stop() resets it
       deliberately — both leave the bitmap size untouched, so the `resized`
       branch above never ran and the scene drew in CSS pixels into a dpr-sized
       bitmap: only the top-left 1/dpr² of the screen got painted (the
       quarter-canvas bug, visible only above dpr 1). Toggling fullscreen hid it
       because that changes the size and forced the branch to run. One idempotent
       setTransform per call keeps every start, restart and viewport change
       correct without depending on the size having changed. */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, ctx, resized, dpr };
  }

  function stop() {
    _queued = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      document.removeEventListener("DOMContentLoaded", resizeHandler);
      window.removeEventListener("load", resizeHandler);
      window.removeEventListener("orientationchange", resizeHandler);
      if (window.visualViewport)
        window.visualViewport.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    const scene = SCENES[activeId];
    if (scene && typeof scene.destroy === "function") scene.destroy(state);
    activeId = null; state = {}; lastTime = 0; currentOptions = {};
    if (canvasEl) {
      canvasEl.style.display = "none";
      canvasEl.style.zIndex = "1";
      canvasEl.style.backgroundColor = "";
      const ctx = canvasEl.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    canvasEl = null;
  }

  function start(sceneId, options, canvas) {
    const scene = SCENES[sceneId];
    /* The scene file may still be in flight — the saved theme is restored
       before its chunk lands. Queue the start and let the last request win,
       so a fast click-through never plays a stale scene. */
    if (!scene) {
      if (!canvas || !has(sceneId)) return false;
      const token = {};
      _queued = token;
      ensure(sceneId).then((ok) => {
        if (_queued !== token) return;
        _queued = null;
        if (ok && SCENES[sceneId]) start(sceneId, options, canvas);
      });
      return true;
    }
    _queued = null;
    stop();
    const opts = { ...scene.defaults, ...options };
    activeId = sceneId; currentOptions = opts; canvasEl = canvas;
    canvas.style.display = "block"; state = {};
    let dims = _syncCanvasSize(canvas);
    scene.init(state, dims.w, dims.h, opts);
    /* One re-measure path for every way the box can change: the window resize
       event, a rotation, the visual viewport (mobile URL bar / pinch zoom) and
       the two moments where layout is still settling around a theme that has
       just been applied. Each one re-inits only when the measured box or dpr
       actually moved, so a no-op event does not rebuild the scene. */
    const syncSceneSize = () => {
      if (!activeId || canvasEl !== canvas) return;
      const prev = dims;
      dims = _syncCanvasSize(canvas);
      if (
        dims.resized ||
        dims.w !== prev.w ||
        dims.h !== prev.h ||
        dims.dpr !== prev.dpr
      ) {
        if (typeof scene.destroy === "function") scene.destroy(state);
        scene.init(state, dims.w, dims.h, currentOptions);
      }
    };
    resizeHandler = syncSceneSize;
    window.addEventListener("resize", resizeHandler);
    document.addEventListener("DOMContentLoaded", resizeHandler);
    window.addEventListener("load", resizeHandler);
    window.addEventListener("orientationchange", resizeHandler);
    if (window.visualViewport)
      window.visualViewport.addEventListener("resize", resizeHandler);
    /* A theme can start before its container has finished laying out (fonts,
       stylesheets, a restore that runs on DOM content load). Re-measure on the
       next frame so the canvas never keeps a pre-layout size — previously the
       only thing that repaired it was a manual fullscreen toggle. */
    requestAnimationFrame(syncSceneSize);
    /* Reduced motion: settle the scene on one still frame instead of running
       an endless loop behind the timer. */
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      for (let i = 0; i < 30; i++)
        scene.draw(dims.ctx, dims.w, dims.h, state, currentOptions, 1 / 60);
      return true;
    }
    lastTime = performance.now();
    function frame(now) {
      if (!activeId || canvasEl !== canvas) return;
      const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now; syncSceneSize();
      scene.draw(dims.ctx, dims.w, dims.h, state, currentOptions, dt);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return true;
  }

  function updateOptions(options) {
    if (!activeId || !canvasEl) return;
    const scene = SCENES[activeId];
    currentOptions = { ...scene.defaults, ...options };
    const dims = _syncCanvasSize(canvasEl);
    if (typeof scene.destroy === "function") scene.destroy(state);
    scene.init(state, dims.w, dims.h, currentOptions);
  }

  function list() {
    /* Manifest order, not registration order: scenes now arrive in whatever
       order their files finish, and the grids must not reshuffle. */
    const ids = SCENE_IDS.filter((id) => SCENES[id]);
    for (const id of Object.keys(SCENES)) if (!KNOWN[id]) ids.push(id);
    return ids.map((id) => {
      const s = SCENES[id];
      return { id, label: s.label, defaults: s.defaults, options: s.options, hidden: !!s.hidden };
    });
  }

  function listLive() {
    return list().filter((s) => !s.hidden);
  }

  function get(id) { return SCENES[id] || null; }
  function isActiveCanvas(canvas) { return canvasEl === canvas; }

  const __helpers = { _hexToRgb, _mixHex, _makeSnowSprites, resetComet };

  return { start, stop, updateOptions, setOptions: updateOptions, list, listLive, get, isActiveCanvas, register, SCENES, ensure, ensureAll, has, isLoaded, count, visibleCount, isComplete, __helpers };
})();
