document.addEventListener("DOMContentLoaded", function () {
  let modes = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  let currentMode = "focus";
  let interval = null;
  let running = false;
  let remaining = modes.focus;
  let currentSubject = null;

  // Stats functions
  function getStats() {
    return (
      JSON.parse(localStorage.getItem("timerStats")) || {
        totalStudyTime: 0,
        totalBreakTime: 0,
        sessions: [],
      }
    );
  }
  function saveStats(stats) {
    localStorage.setItem("timerStats", JSON.stringify(stats));
  }
  function logSession(type, duration) {
    const stats = getStats();
    stats.sessions.push({
      type,
      duration,
      subject: currentSubject,
      date: new Date().toISOString(),
    });
    if (type === "focus") {
      stats.totalStudyTime += duration;
      if (currentSubject) {
        if (!stats.subjectTime) stats.subjectTime = {};
        stats.subjectTime[currentSubject] =
          (stats.subjectTime[currentSubject] || 0) + duration;
      }
    } else {
      stats.totalBreakTime += duration;
    }
    saveStats(stats);
  }
  function resetStats() {
    localStorage.removeItem("timerStats");
  }
  function updateStatsDisplay() {
    const stats = getStats();
    const elem1 = document.getElementById("totalStudyTime");
    const elem2 = document.getElementById("totalBreakTime");
    const elem3 = document.getElementById("totalSessions");
    if (elem1) elem1.textContent = stats.totalStudyTime;
    if (elem2) elem2.textContent = stats.totalBreakTime;
    if (elem3)
      elem3.textContent = stats.sessions.filter(
        (s) => s.type === "focus",
      ).length;

    // Subject time breakdown
    const subjectBreakdown = document.getElementById("subjectBreakdown");
    if (subjectBreakdown) {
      const st = stats.subjectTime || {};
      const entries = Object.entries(st);
      if (entries.length === 0) {
        subjectBreakdown.innerHTML =
          '<div style="color:rgba(255,255,255,0.4);font-size:0.85rem;text-align:center;padding:8px 0;">No subject data yet</div>';
      } else {
        subjectBreakdown.innerHTML = entries
          .map(
            ([subj, mins]) =>
              `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:rgba(255,255,255,0.75);font-size:0.9rem;">${subj}</span>
            <span style="color:white;font-weight:600;">${mins} min</span>
          </div>`,
          )
          .join("");
      }
    }
  }

  const display = document.getElementById("display");
  const minutesInput = document.getElementById("minutes");
  const focusModeBtn = document.getElementById("focusMode");
  const shortBreakBtn = document.getElementById("shortBreakMode");
  const longBreakBtn = document.getElementById("longBreakMode");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const customFocusInput = document.getElementById("customFocus");
  const customShortInput = document.getElementById("customShort");
  const customLongInput = document.getElementById("customLong");
  const speedSlider = document.getElementById("speed");
  const tsizeSlider = document.getElementById("tsize");
  const jsizeSlider = document.getElementById("jsize");
  const overlay = document.getElementById("overlay");
  const overlayButton = document.getElementById("button");

  const params = {
    speed: 1,
    tsize: 1,
    jsize: 1,
  };

  function updateModes() {
    modes.focus = Number(customFocusInput.value) * 60;
    modes.short = Number(customShortInput.value) * 60;
    modes.long = Number(customLongInput.value) * 60;
    localStorage.setItem(
      "timerModes",
      JSON.stringify({
        focus: customFocusInput.value,
        short: customShortInput.value,
        long: customLongInput.value,
      }),
    );
  }

  function loadSavedModes() {
    const saved = localStorage.getItem("timerModes");
    if (saved) {
      const parsed = JSON.parse(saved);
      customFocusInput.value = parsed.focus;
      customShortInput.value = parsed.short;
      customLongInput.value = parsed.long;
      updateModes();
    }
  }

  function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    display.textContent = `${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0").replace(/ /g, "")} `;
  }

  function setActiveMode(mode) {
    currentMode = mode;
    focusModeBtn.classList.toggle("active", mode === "focus");
    shortBreakBtn.classList.toggle("active", mode === "short");
    longBreakBtn.classList.toggle("active", mode === "long");

    if (mode === "focus") {
      remaining = modes.focus;
      minutesInput.disabled = false;
    } else if (mode === "short") {
      remaining = modes.short;
      minutesInput.disabled = true;
    } else {
      remaining = modes.long;
      minutesInput.disabled = true;
    }

    clearInterval(interval);
    running = false;
    render();
  }

  // Sound helpers using Web Audio API
  function playBeep(freq, duration, vol) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }
  function playWarningSound() {
    // 3 quick beeps — "almost done"
    playBeep(880, 0.15, 0.25);
    setTimeout(() => playBeep(880, 0.15, 0.25), 200);
    setTimeout(() => playBeep(880, 0.15, 0.25), 400);
  }
  function playBreakStartSound() {
    // Rising tone — "break time"
    playBeep(440, 0.3, 0.3);
    setTimeout(() => playBeep(523, 0.3, 0.3), 320);
    setTimeout(() => playBeep(659, 0.5, 0.3), 640);
  }
  function playFocusStartSound() {
    // Descending — "back to work"
    playBeep(659, 0.3, 0.3);
    setTimeout(() => playBeep(523, 0.3, 0.3), 320);
    setTimeout(() => playBeep(440, 0.5, 0.3), 640);
  }

  let endTime = null;
  let timerTick = null;
  let warningPlayed = false;

  function updateTimerDisplay() {
    const msLeft = endTime - Date.now();
    const newRemaining = Math.max(0, Math.ceil(msLeft / 1000));

    if (newRemaining === 5 && !warningPlayed) {
      playWarningSound();
      warningPlayed = true;
    }

    remaining = newRemaining;
    render();

    if (remaining <= 0) {
      clearInterval(timerTick);
      timerTick = null;
      running = false;
      warningPlayed = false;

      const duration =
        currentMode === "focus"
          ? modes.focus / 60
          : currentMode === "short"
            ? modes.short / 60
            : modes.long / 60;

      logSession(currentMode, duration);
      remaining = 0;
      render();

      setTimeout(() => {
        if (currentMode === "focus") {
          setActiveMode("short");
          playBreakStartSound();
          setTimeout(() => startTimer(), 800);
        } else {
          setActiveMode("focus");
          playFocusStartSound();
          setTimeout(() => startTimer(), 800);
        }
      }, 500);
    }
  }

  function startTimer() {
    if (running) return;
    running = true;
    warningPlayed = false;
    endTime = Date.now() + remaining * 1000;
    updateTimerDisplay();
    timerTick = setInterval(updateTimerDisplay, 250);
  }

  function pauseTimer() {
    if (timerTick) clearInterval(timerTick);
    timerTick = null;
    running = false;
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    render();
  }

  function resetTimer() {
    if (timerTick) clearInterval(timerTick);
    timerTick = null;
    running = false;
    warningPlayed = false;
    endTime = null;

    if (currentMode === "focus") {
      remaining = modes.focus;
    } else if (currentMode === "short") {
      remaining = modes.short;
    } else {
      remaining = modes.long;
    }

    render();
  }

  function pauseTimer() {
    clearInterval(interval);
    running = false;
  }

  function resetTimer() {
    clearInterval(interval);
    running = false;

    if (currentMode === "focus") {
      remaining = modes.focus;
    } else if (currentMode === "short") {
      remaining = modes.short;
    } else {
      remaining = modes.long;
    }

    render();
  }

  focusModeBtn.addEventListener("click", () => setActiveMode("focus"));
  shortBreakBtn.addEventListener("click", () => setActiveMode("short"));
  longBreakBtn.addEventListener("click", () => setActiveMode("long"));
  startBtn.addEventListener("click", startTimer);
  pauseBtn.addEventListener("click", pauseTimer);
  resetBtn.addEventListener("click", resetTimer);

  minutesInput.addEventListener("change", () => {
    if (currentMode === "focus") {
      remaining = Number(minutesInput.value) * 60;
      render();
    }
  });

  customFocusInput.addEventListener("change", () => {
    updateModes();
    if (currentMode === "focus") {
      remaining = modes.focus;
      render();
    }
  });

  customShortInput.addEventListener("change", () => {
    updateModes();
    if (currentMode === "short") {
      remaining = modes.short;
      render();
    }
  });

  customLongInput.addEventListener("change", () => {
    updateModes();
    if (currentMode === "long") {
      remaining = modes.long;
      render();
    }
  });

  function changeSliders() {
    params.speed = Number(speedSlider.value) / 16 + 1;
    params.tsize = Number(tsizeSlider.value) / 20 + 1;
    params.jsize = Number(jsizeSlider.value) / 20 + 1;
  }

  speedSlider?.addEventListener("input", changeSliders);
  tsizeSlider?.addEventListener("input", changeSliders);
  jsizeSlider?.addEventListener("input", changeSliders);
  overlayButton?.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  document.addEventListener("keydown", (evt) => {
    const isEscape = evt.key === "Escape" || evt.key === "Esc";
    if (!isEscape) return;
    overlay.style.display =
      overlay.style.display === "block" ? "none" : "block";
  });

  changeSliders();
  loadSavedModes();
  render();

  const settingsBtn = document.getElementById("settingsBtn");
  const themeModal = document.getElementById("themeModal");
  const timerContainer = document.getElementById("timerContainer");
  const themeOptions = document.querySelectorAll(".theme-option");

  const savedTheme = localStorage.getItem("timerTheme") || "gradient-default";
  timerContainer.classList.add("theme-" + savedTheme);
  document
    .querySelector(`[data-theme="${savedTheme}"]`)
    ?.classList.add("active");

  settingsBtn.addEventListener("click", () => {
    themeModal.style.display =
      themeModal.style.display === "none" ? "block" : "none";
  });

  themeOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      const theme = e.target.dataset.theme;
      timerContainer.classList.remove(
        ...Array.from(timerContainer.classList).filter((c) =>
          c.startsWith("theme-"),
        ),
      );
      timerContainer.classList.add("theme-" + theme);
      themeOptions.forEach((opt) => opt.classList.remove("active"));
      e.target.classList.add("active");
      localStorage.setItem("timerTheme", theme);
      startAnimation(theme);
      showOceanToggle();
    });
  });

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".settings-btn") &&
      !e.target.closest(".theme-modal")
    ) {
      themeModal.style.display = "none";
    }
  });

  let currentAnimation = null;
  let animationEnabled =
    localStorage.getItem("timerAnimationEnabled") !== "false";
  let plasticOceanEnabled =
    localStorage.getItem("plasticOceanEnabled") === "true";

  const globalAnimationToggle = document.getElementById(
    "globalAnimationToggle",
  );
  const plasticOceanToggle = document.getElementById("plasticOceanToggle");
  const oceanSpecificToggle = document.getElementById("oceanSpecificToggle");

  globalAnimationToggle.checked = animationEnabled;
  plasticOceanToggle.checked = plasticOceanEnabled;

  function showOceanToggle() {
    const currentTheme =
      localStorage.getItem("timerTheme") || "gradient-default";
    oceanSpecificToggle.style.display =
      currentTheme === "gradient-ocean" ? "block" : "none";
  }

  function startAnimation(theme) {
    stopAnimation();
    if (!animationEnabled) return;

    if (theme === "gradient-forest") {
      document.getElementById("leaves").style.display = "block";
      currentAnimation = "leaves";
    } else if (theme === "gradient-ocean") {
      if (plasticOceanEnabled) {
        document.getElementById("oceanContainer").style.display = "block";
        initOcean3D();
        currentAnimation = "ocean3d";
      } else {
        document.getElementById("waveContainer").style.display = "block";
        initWaveAnimation();
        currentAnimation = "wave";
      }
    } else if (theme === "gradient-default") {
      document.getElementById("waveContainer").style.display = "block";
      initWaveAnimation();
      currentAnimation = "wave";
    }
  }

  function stopAnimation() {
    document.getElementById("leaves").style.display = "none";
    const waveContainer = document.getElementById("waveContainer");
    const oceanContainer = document.getElementById("oceanContainer");
    const waveCanvas = waveContainer.querySelector("canvas");
    const oceanCanvas = oceanContainer.querySelector("canvas");

    if (waveCanvas) waveCanvas.remove();
    if (oceanCanvas) oceanCanvas.remove();

    document.getElementById("waveContainer").style.display = "none";
    document.getElementById("oceanContainer").style.display = "none";
    currentAnimation = null;
  }

  function initWaveAnimation() {
    const container = document.getElementById("waveContainer");
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let w, h;
    let lastFrameTime = 0;
    const targetFPS = 24;
    const frameInterval = 1000 / targetFPS;
    let wavePaused = false;
    document.addEventListener("visibilitychange", () => {
      wavePaused = document.hidden;
    });

    function setSize() {
      w = canvas.width = Math.max(600, window.innerWidth);
      h = canvas.height = window.innerHeight;
    }

    function update(currentTime) {
      if (!currentTime) currentTime = performance.now();
      if (wavePaused) {
        requestAnimationFrame(update);
        return;
      }
      if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(update);
        return;
      }
      lastFrameTime = currentTime;

      ctx.clearRect(0, 0, w, h);
      const timeSec = currentTime * 0.001;
      const maxLayers = Math.min(3, Math.floor(h / 200) + 1);
      let offset = h * 0.75;
      const offsetInc = 40;

      for (let layer = 0; layer < maxLayers; layer++) {
        const phase = timeSec * (0.8 + layer * 0.3);
        const amplitude = 12 + layer * 8;
        const yBase = offset - layer * 10;
        const grd = ctx.createLinearGradient(
          0,
          yBase,
          0,
          yBase + offsetInc * 2,
        );

        const theme = localStorage.getItem("timerTheme") || "gradient-default";

        // Theme-based wave colors
        let color0, color1, color2;
        if (theme === "gradient-default") {
          color0 = "rgba(100, 40, 140, 0.10)";
          color1 = "rgba(150, 35, 100, 0.08)";
          color2 = "rgba(170, 35, 85, 0.05)";
        } else if (theme === "gradient-sunset") {
          color0 = "rgba(200, 80, 80, 0.10)";
          color1 = "rgba(220, 150, 50, 0.08)";
          color2 = "rgba(230, 120, 40, 0.05)";
        } else if (theme === "gradient-ocean") {
          color0 = "rgba(0, 60, 160, 0.10)";
          color1 = "rgba(0, 50, 140, 0.08)";
          color2 = "rgba(0, 40, 120, 0.05)";
        } else if (theme === "gradient-forest") {
          color0 = "rgba(30, 80, 60, 0.10)";
          color1 = "rgba(25, 65, 50, 0.08)";
          color2 = "rgba(20, 50, 40, 0.05)";
        } else {
          color0 = "rgba(60, 100, 160, 0.10)";
          color1 = "rgba(50, 80, 140, 0.08)";
          color2 = "rgba(40, 60, 120, 0.05)";
        }

        grd.addColorStop(0, color0);
        grd.addColorStop(0.5, color1);
        grd.addColorStop(1, color2);

        ctx.beginPath();
        for (let x = 0; x <= w; x += 30) {
          const y =
            yBase +
            Math.sin(x * 0.02 + phase) * amplitude +
            Math.cos(phase + layer) * 8;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        offset += offsetInc;
      }

      requestAnimationFrame(update);
    }

    setSize();
    window.addEventListener("resize", setSize);
    requestAnimationFrame(update);
  }

  function initOcean3D() {
    const container = document.getElementById("oceanContainer");
    const existingCanvas = container.querySelector("canvas");
    if (existingCanvas) existingCanvas.remove();

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const oceanBg = document.getElementById("ocean");
    oceanBg.style.display = "block";
    oceanBg.style.zIndex = "0";

    let w, h;
    let lastFrameTime = 0;
    const targetFPS = 24;
    const frameInterval = 1000 / targetFPS;
    let paused = false;
    document.addEventListener("visibilitychange", () => {
      paused = document.hidden;
    });
    let debris = [];
    let rings = [];
    let jellyfish = [];
    let orbs = [];

    function createDebris() {
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        size: 3 + Math.random() * 16,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 0.25 + 0.12,
        alpha: 0.16 + Math.random() * 0.42,
        color:
          Math.random() > 0.55
            ? "rgba(255,255,255,0.85)"
            : "rgba(100,220,255,0.52)",
      };
    }

    function createRing() {
      const base = 22 + Math.random() * 34;
      return {
        x: Math.random() * w,
        y: h * 0.72 + Math.random() * h * 0.18,
        radius: base * (0.9 + Math.random() * 0.6),
        width: 2 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 0.9,
        angle: Math.random() * Math.PI * 2,
        alpha: 0.2 + Math.random() * 0.35,
        color:
          Math.random() > 0.5
            ? "rgba(255,255,255,0.82)"
            : "rgba(145,225,255,0.42)",
      };
    }

    function createJelly() {
      return {
        x: Math.random() * w * 0.8 + w * 0.1,
        y: h * 0.4 + Math.random() * h * 0.3,
        radius: 22 + Math.random() * 26,
        phase: Math.random() * Math.PI * 2,
        vy: 0.45 + Math.random() * 0.5,
        hue: 330 + Math.random() * 20,
      };
    }

    function createOrb() {
      return {
        angle: Math.random() * Math.PI * 2,
        distance: 80 + Math.random() * 180,
        speed: 0.4 + Math.random() * 0.45,
        size: 12 + Math.random() * 18,
        hue: 180 + Math.random() * 40,
        alpha: 0.32 + Math.random() * 0.3,
      };
    }

    function initSceneObjects() {
      debris = [];
      rings = [];
      jellyfish = [];
      orbs = [];
      for (let i = 0; i < 120; i++) debris.push(createDebris());
      for (let i = 0; i < 18; i++) rings.push(createRing());
      for (let i = 0; i < 5; i++) jellyfish.push(createJelly());
      for (let i = 0; i < 9; i++) orbs.push(createOrb());
    }

    function setSize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      initSceneObjects();
    }

    function drawRing(item, timeSec) {
      const scale = 0.95 + params.tsize * 0.25;
      item.x += item.vx * params.speed * 1.8;
      item.y += Math.sin(timeSec + item.angle) * 0.18;
      if (item.x < -item.radius * 3) item.x = w + item.radius * 3;
      if (item.x > w + item.radius * 3) item.x = -item.radius * 3;
      ctx.save();
      ctx.globalAlpha = item.alpha;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width * 0.8 * scale;
      ctx.beginPath();
      ctx.ellipse(
        item.x,
        item.y,
        item.radius * scale,
        item.radius * 0.7 * scale,
        Math.sin(item.angle + timeSec) * 0.55,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    function drawOrb(item, timeSec) {
      const x =
        w * 0.5 + Math.cos(item.angle + timeSec * item.speed) * item.distance;
      const y =
        h * 0.54 +
        Math.sin(item.angle + timeSec * item.speed * 0.75) *
          (item.distance * 0.35);
      const glowSize =
        item.size * (1 + Math.sin(timeSec * 2 + item.angle) * 0.15);
      ctx.save();
      ctx.globalAlpha = item.alpha;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize * 1.6);
      gradient.addColorStop(0, `hsla(${item.hue}, 95%, 85%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${item.hue}, 95%, 65%, 0.35)`);
      gradient.addColorStop(1, "rgba(10, 90, 160, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `hsla(${item.hue}, 95%, 90%, 0.45)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, glowSize * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawJelly(item, timeSec) {
      const scale = 0.9 + params.jsize * 0.55;
      item.y += item.vy * params.speed * 0.6;
      if (item.y > h * 0.85) item.y = h * 0.35;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.92;
      const gradient = ctx.createRadialGradient(
        0,
        0,
        5,
        0,
        0,
        item.radius * 1.3,
      );
      gradient.addColorStop(0, `hsla(${item.hue}, 90%, 85%, 0.98)`);
      gradient.addColorStop(1, `hsla(${item.hue}, 90%, 62%, 0.18)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        item.radius,
        item.radius * 0.72,
        Math.sin(item.phase + timeSec) * 0.1,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(
        -item.radius * 0.18,
        -item.radius * 0.12,
        item.radius * 0.16,
        0,
        Math.PI * 2,
      );
      ctx.arc(
        item.radius * 0.12,
        -item.radius * 0.24,
        item.radius * 0.11,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    function drawForegroundRock() {
      const gradient = ctx.createRadialGradient(
        w * 0.5,
        h * 0.95,
        0,
        w * 0.5,
        h * 0.95,
        h * 0.28,
      );
      gradient.addColorStop(0, "rgba(7, 22, 42, 0.95)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.95, w * 0.5, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function update(currentTime) {
      if (!currentTime) currentTime = performance.now();
      if (paused) {
        requestAnimationFrame(update);
        return;
      }
      if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(update);
        return;
      }
      lastFrameTime = currentTime;
      const timeSec = currentTime * 0.001;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "rgba(8, 20, 44, 0.95)");
      bg.addColorStop(0.5, "rgba(3, 47, 84, 0.72)");
      bg.addColorStop(1, "rgba(1, 19, 40, 0.96)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.globalAlpha = 0.04 + i * 0.02;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const y =
            h * 0.18 +
            i * 22 +
            Math.sin(x * 0.014 + timeSec * (1.2 + i * 0.16)) * 12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      drawForegroundRock();
      rings.forEach((item) => drawRing(item, timeSec));
      orbs.forEach((item) => drawOrb(item, timeSec));
      debris.forEach((item) => {
        item.x += item.vx * params.speed * 1.9;
        item.y += item.vy * params.speed * 0.55;
        if (item.x < -20) item.x = w + 20;
        if (item.x > w + 20) item.x = -20;
        if (item.y < -20) item.y = h + 20;
        if (item.y > h + 20) item.y = -20;
        ctx.save();
        ctx.globalAlpha = item.alpha;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(
          item.x,
          item.y,
          item.size * (0.9 + params.tsize * 0.15),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      });

      jellyfish.forEach((item) => drawJelly(item, timeSec));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 28) {
          const y =
            h * 0.78 +
            i * 20 +
            Math.sin(x * 0.012 + timeSec * (1.8 + i * 0.12)) * 16;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      requestAnimationFrame(update);
    }

    setSize();
    window.addEventListener("resize", setSize);
    requestAnimationFrame(update);
  }

  globalAnimationToggle.addEventListener("change", (e) => {
    animationEnabled = e.target.checked;
    localStorage.setItem("timerAnimationEnabled", animationEnabled);

    if (animationEnabled) {
      const currentTheme =
        localStorage.getItem("timerTheme") || "gradient-default";
      startAnimation(currentTheme);
    } else {
      stopAnimation();
    }
  });

  plasticOceanToggle.addEventListener("change", (e) => {
    plasticOceanEnabled = e.target.checked;
    localStorage.setItem("plasticOceanEnabled", plasticOceanEnabled);
    const currentTheme =
      localStorage.getItem("timerTheme") || "gradient-default";
    if (currentTheme === "gradient-ocean") {
      startAnimation(currentTheme);
    }
  });

  startAnimation(savedTheme);
  showOceanToggle();

  // ============ PLANNER LOGIC ============
  const plannerBtn = document.getElementById("plannerBtn");
  const plannerModal = document.getElementById("plannerModal");
  const plannerAddBtn = document.getElementById("plannerAddBtn");
  const taskPopup = document.getElementById("taskPopup");
  const taskPopupClose = document.getElementById("taskPopupClose");
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  const taskPopupCancelBtn = document.getElementById("taskPopupCancelBtn");
  const categoryChips = document.querySelectorAll(".category-chip");
  let tasks = JSON.parse(localStorage.getItem("plannerTasks")) || [];
  let currentTaskId = null;
  let currentFilter = "all";

  function getTasks() {
    return tasks;
  }

  function saveTasks() {
    localStorage.setItem("plannerTasks", JSON.stringify(tasks));
  }

  function renderTasks() {
    const taskList = document.getElementById("plannerTaskList");
    const summaryDiv = document.getElementById("plannerSummary");
    taskList.innerHTML = "";

    const filteredTasks = getTasks().filter((t) => {
      if (currentFilter === "done") return t.status === "done";
      if (currentFilter === "active")
        return t.status === "active" && !isOverdue(t);
      if (currentFilter === "overdue") return isOverdue(t);
      return true;
    });

    if (filteredTasks.length === 0) {
      taskList.innerHTML =
        '<div class="planner-empty">No tasks yet. Add one to keep the day moving.</div>';
    } else {
      filteredTasks.forEach((task) => {
        const taskItem = document.createElement("div");
        const statusClass = isOverdue(task)
          ? "overdue"
          : task.status === "done"
            ? "done"
            : "active";
        taskItem.className = `planner-task-item ${statusClass}`;
        const statusText = isOverdue(task)
          ? "Overdue"
          : task.status === "done"
            ? "Done"
            : "Active";
        const statusColor = isOverdue(task)
          ? "#ff8a91"
          : task.status === "done"
            ? "#7ee787"
            : "#d0def2";

        const categoryClass = task.category
          ? "category-" + task.category.toLowerCase().replace(/\s+/g, "-")
          : "";
        const priorityClass = task.priority
          ? "priority-" + task.priority.toLowerCase()
          : "priority-normal";

        taskItem.innerHTML = `
          <div class="task-info">
            <h4 class="task-title">${task.title || "Untitled"}</h4>
            <div class="task-meta">
              ${task.category ? `<span class="tag-category ${categoryClass}"><i class="fa-solid fa-tag"></i>${task.category}</span>` : ""}
              ${task.subject ? `<span class="tag-subject"><i class="fa-solid fa-book"></i>${task.subject}</span>` : ""}
              ${task.priority || task.priority === "" ? `<span class="tag-priority ${priorityClass}"><i class="fa-solid fa-flag"></i>${task.priority || "Normal"}</span>` : `<span class="tag-priority priority-normal"><i class="fa-solid fa-flag"></i>Normal</span>`}
              ${task.dueDate ? `<span class="tag-due"><i class="fa-solid fa-calendar"></i>${new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>` : ""}
              ${task.estimate ? `<span class="tag-estimate"><i class="fa-solid fa-clock"></i>${task.estimate}</span>` : ""}
            </div>
            ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ""}
          </div>
          <div class="task-actions">
            <button class="task-done-toggle ${task.status === "done" ? "checked" : ""}" onclick="window.updateTaskStatus('${task.id}')">
              ${task.status === "done" ? "✓" : "○"}
            </button>
            <button class="task-edit-btn" onclick="window.openTaskPopup('${task.id}')">Edit</button>
            <button class="task-delete-btn" onclick="window.deleteTask('${task.id}')">Delete</button>
          </div>
        `;
        taskList.appendChild(taskItem);
      });
    }

    updateSummary();
  }

  function updateSummary() {
    const all = getTasks().length;
    const done = getTasks().filter((t) => t.status === "done").length;
    const overdue = getTasks().filter((t) => isOverdue(t)).length;
    const summary = document.getElementById("plannerSummary");

    summary.innerHTML = `
      <div class="planner-summary-line">
        <span class="planner-summary-item">Tasks: <strong>${all}</strong></span>
        <span class="planner-summary-done">Done: <strong>${done}</strong></span>
        <span class="planner-summary-overdue">Overdue: <strong>${overdue}</strong></span>
      </div>
      <div class="planner-filter-bar">
        <button class="planner-filter-btn ${currentFilter === "active" ? "active" : ""}" onclick="window.setFilter('active')">Active</button>
        <button class="planner-filter-btn ${currentFilter === "done" ? "active" : ""}" onclick="window.setFilter('done')">Done</button>
        <button class="planner-filter-btn ${currentFilter === "overdue" ? "active" : ""}" onclick="window.setFilter('overdue')">Overdue</button>
      </div>
    `;
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < new Date();
  }

  function openTaskPopup(taskId = null) {
    currentTaskId = taskId;
    const titleInput = document.getElementById("taskTitle");
    const notesInput = document.getElementById("taskNotes");
    const dueDateInput = document.getElementById("taskDueDate");
    const categoryInput = document.getElementById("taskCategory");
    const subjectInput = document.getElementById("taskSubject");
    const prioritySelect = document.getElementById("taskPriority");
    const estimateInput = document.getElementById("taskEstimate");

    categoryChips.forEach((chip) => chip.classList.remove("selected"));
    categoryInput.value = "";

    if (taskId) {
      const task = getTasks().find((t) => t.id === taskId);
      if (task) {
        titleInput.value = task.title || "";
        notesInput.value = task.notes || "";
        dueDateInput.value = task.dueDate || "";
        categoryInput.value = task.category || "";
        subjectInput.value = task.subject || "";
        prioritySelect.value = task.priority || "";
        estimateInput.value = task.estimate || "";

        if (task.category) {
          const selectedChip = Array.from(categoryChips).find(
            (c) => c.dataset.category === task.category,
          );
          if (selectedChip) selectedChip.classList.add("selected");
        }
      }
    } else {
      titleInput.value = "";
      notesInput.value = "";
      dueDateInput.value = "";
      categoryInput.value = "";
      subjectInput.value = "";
      prioritySelect.value = "";
      estimateInput.value = "";
    }

    taskPopup.classList.add("open");
  }

  function closeTaskPopup() {
    taskPopup.classList.remove("open");
    currentTaskId = null;
  }

  function saveTask() {
    const titleInput = document.getElementById("taskTitle");
    const notesInput = document.getElementById("taskNotes");
    const dueDateInput = document.getElementById("taskDueDate");
    const categoryInput = document.getElementById("taskCategory");
    const subjectInput = document.getElementById("taskSubject");
    const prioritySelect = document.getElementById("taskPriority");
    const estimateInput = document.getElementById("taskEstimate");

    if (!titleInput.value.trim()) {
      alert("Task title is required");
      return;
    }

    if (currentTaskId) {
      const task = getTasks().find((t) => t.id === currentTaskId);
      if (task) {
        task.title = titleInput.value;
        task.notes = notesInput.value;
        task.dueDate = dueDateInput.value;
        task.category = categoryInput.value;
        task.subject = subjectInput.value;
        task.priority = prioritySelect.value;
        task.estimate = estimateInput.value;
      }
    } else {
      getTasks().push({
        id: Date.now().toString(),
        title: titleInput.value,
        notes: notesInput.value,
        dueDate: dueDateInput.value,
        category: categoryInput.value,
        subject: subjectInput.value,
        priority: prioritySelect.value,
        estimate: estimateInput.value,
        status: "active",
      });
    }

    saveTasks();
    closeTaskPopup();
    renderTasks();
  }

  function updateTaskStatus(taskId) {
    const task = getTasks().find((t) => t.id === taskId);
    if (task) {
      task.status = task.status === "done" ? "active" : "done";
      saveTasks();
      renderTasks();
    }
  }

  function deleteTask(taskId) {
    if (confirm("Delete this task?")) {
      tasks = getTasks().filter((t) => t.id !== taskId);
      saveTasks();
      renderTasks();
    }
  }

  function setFilter(filter) {
    if (currentFilter === filter) {
      currentFilter = "all";
    } else {
      currentFilter = filter;
    }
    renderTasks();
  }

  plannerBtn.addEventListener("click", () => {
    plannerModal.classList.toggle("open");
  });

  plannerModal.addEventListener("click", (e) => {
    if (e.target === plannerModal) {
      plannerModal.classList.remove("open");
    }
  });

  taskPopup.addEventListener("click", (e) => {
    if (e.target === taskPopup) {
      closeTaskPopup();
    }
  });

  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      categoryChips.forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      document.getElementById("taskCategory").value = chip.dataset.category;
    });
  });

  plannerAddBtn.addEventListener("click", () => openTaskPopup());
  taskPopupClose.addEventListener("click", closeTaskPopup);
  taskPopupCancelBtn.addEventListener("click", closeTaskPopup);
  saveTaskBtn.addEventListener("click", saveTask);

  // Tab switching in settings modal
  const tabBtns = document.querySelectorAll(".settings-tab-btn");
  const tabContents = document.querySelectorAll(".settings-tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.style.color = "rgba(255,255,255,0.5)";
        b.style.borderBottomColor = "transparent";
      });
      tabContents.forEach((content) => (content.style.display = "none"));

      btn.classList.add("active");
      btn.style.color = "white";
      btn.style.borderBottomColor = "white";
      const activeContent = Array.from(tabContents).find(
        (c) => c.getAttribute("data-tab") === tabName,
      );
      if (activeContent) {
        activeContent.style.display = "block";
        if (tabName === "statistics") updateStatsDisplay();
      }
    });
  });

  // Reset stats button
  const resetStatsBtn = document.getElementById("resetStatsBtn");
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", () => {
      if (confirm("Reset all statistics?")) {
        resetStats();
        updateStatsDisplay();
      }
    });
  }

  // Subject selector always visible
  const subjectSelector = document.getElementById("subjectSelector");
  const subjectSelect = document.getElementById("subjectSelect");

  if (subjectSelect) {
    subjectSelect.addEventListener("change", (e) => {
      currentSubject = e.target.value || null;
      if (currentSubject)
        localStorage.setItem("currentSubject", currentSubject);
      else localStorage.removeItem("currentSubject");
    });
  }

  // Restore saved subject
  const savedSubject = localStorage.getItem("currentSubject");
  if (savedSubject && subjectSelect) {
    subjectSelect.value = savedSubject;
    currentSubject = savedSubject;
  }

  // Expose functions to window for inline onclick handlers
  window.openTaskPopup = openTaskPopup;
  window.updateTaskStatus = updateTaskStatus;
  window.deleteTask = deleteTask;
  window.setFilter = setFilter;

  // ============ ANALYTICS MODAL ============
  const analyticsModal = document.getElementById("statisticsModal");
  const analyticsBackdrop = document.getElementById("analyticsBackdrop");
  const analyticsCloseBtn = document.getElementById("statisticsCloseBtn");
  const statsResetBtn2 = document.getElementById("statsResetBtn");
  const statsExportBtn = document.getElementById("statsExportBtn");
  const toggleSessionBtn = document.getElementById("toggleSessionHistory");

  let analyticsRange = "today";
  let sessionLogExpanded = false;

  const SUBJECT_COLORS = [
    "#6366f1",
    "#38bdf8",
    "#a78bfa",
    "#34d399",
    "#f59e0b",
    "#f472b6",
    "#fb923c",
    "#4ade80",
    "#60a5fa",
    "#e879f9",
  ];

  function openAnalytics() {
    analyticsModal.classList.add("open");
    renderAnalytics();
  }

  function closeAnalytics() {
    analyticsModal.classList.remove("open");
  }

  function getFilteredStats(range) {
    const stats = getStats();
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now - 7 * 864e5);

    if (range === "all") return stats;

    const sessions = stats.sessions.filter((s) => {
      const d = new Date(s.date);
      if (range === "today") return d.toDateString() === todayStr;
      if (range === "week") return d >= weekAgo;
      return true;
    });

    const totalStudyTime = sessions
      .filter((s) => s.type === "focus")
      .reduce((a, s) => a + s.duration, 0);
    const totalBreakTime = sessions
      .filter((s) => s.type !== "focus")
      .reduce((a, s) => a + s.duration, 0);
    const subjectTime = {};
    sessions
      .filter((s) => s.type === "focus" && s.subject)
      .forEach((s) => {
        subjectTime[s.subject] = (subjectTime[s.subject] || 0) + s.duration;
      });

    return { sessions, totalStudyTime, totalBreakTime, subjectTime };
  }

  function calcStreak() {
    const stats = getStats();
    const days = new Set(
      stats.sessions
        .filter((s) => s.type === "focus")
        .map((s) => new Date(s.date).toDateString()),
    );
    let streak = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function animateValue(el, target) {
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderAnalytics() {
    const data = getFilteredStats(analyticsRange);
    const streak = calcStreak();

    // Date label
    const label = document.getElementById("analyticsDateLabel");
    if (label) {
      const now = new Date();
      if (analyticsRange === "today")
        label.textContent = now.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });
      else if (analyticsRange === "week") label.textContent = "Last 7 days";
      else label.textContent = "All time";
    }

    // KPIs
    const studyEl = document.getElementById("kpiStudyTime");
    const breakEl = document.getElementById("kpiBreakTime");
    const sessEl = document.getElementById("kpiSessions");
    const strkEl = document.getElementById("kpiStreak");
    if (studyEl) animateValue(studyEl, Math.round(data.totalStudyTime));
    if (breakEl) animateValue(breakEl, Math.round(data.totalBreakTime));
    if (sessEl)
      animateValue(
        sessEl,
        data.sessions.filter((s) => s.type === "focus").length,
      );
    if (strkEl) animateValue(strkEl, streak);

    // KPI bars (relative to max of the four)
    const maxVal = Math.max(
      data.totalStudyTime,
      data.totalBreakTime,
      data.sessions.length * 5,
      streak * 10,
      1,
    );
    setTimeout(() => {
      const sb = document.getElementById("kpiStudyBar");
      const bb = document.getElementById("kpiBreakBar");
      const sesb = document.getElementById("kpiSessionsBar");
      const strb = document.getElementById("kpiStreakBar");
      if (sb)
        sb.style.width =
          Math.min(100, (data.totalStudyTime / maxVal) * 100) + "%";
      if (bb)
        bb.style.width =
          Math.min(100, (data.totalBreakTime / maxVal) * 100) + "%";
      if (sesb)
        sesb.style.width =
          Math.min(100, ((data.sessions.length * 5) / maxVal) * 100) + "%";
      if (strb)
        strb.style.width = Math.min(100, ((streak * 10) / maxVal) * 100) + "%";
    }, 50);

    // Activity chart — last 7 days always
    renderActivityChart();

    // Subject list
    renderSubjectList(data);

    // Session log
    renderSessionLog(data);
  }

  function renderActivityChart() {
    const chartArea = document.getElementById("activityChart");
    const xLabels = document.getElementById("chartXLabels");
    if (!chartArea || !xLabels) return;

    const stats = getStats();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const dayData = days.map((d) => {
      const str = d.toDateString();
      const focus = stats.sessions
        .filter(
          (s) => s.type === "focus" && new Date(s.date).toDateString() === str,
        )
        .reduce((a, s) => a + s.duration, 0);
      const brk = stats.sessions
        .filter(
          (s) => s.type !== "focus" && new Date(s.date).toDateString() === str,
        )
        .reduce((a, s) => a + s.duration, 0);
      return {
        focus,
        brk,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      };
    });

    const maxMins = Math.max(...dayData.map((d) => d.focus + d.brk), 1);

    chartArea.innerHTML = dayData
      .map((d) => {
        const fh = Math.round((d.focus / maxMins) * 82);
        const bh = Math.round((d.brk / maxMins) * 82);
        return `<div class="chart-bar-wrap">
        ${d.focus > 0 ? `<div class="chart-bar study-bar" style="height:${fh}px" data-tip="${d.focus}min study"></div>` : ""}
        ${d.brk > 0 ? `<div class="chart-bar break-bar" style="height:${bh}px" data-tip="${d.brk}min break"></div>` : `<div style="height:3px;width:100%;border-radius:2px;background:rgba(255,255,255,0.04)"></div>`}
      </div>`;
      })
      .join("");

    xLabels.innerHTML = dayData
      .map((d) => `<span class="chart-x-label">${d.label}</span>`)
      .join("");
  }

  function renderSubjectList(data) {
    const list = document.getElementById("subjectList");
    if (!list) return;
    const st = data.subjectTime || {};
    const entries = Object.entries(st).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      list.innerHTML = '<p class="analytics-empty">No subject data yet</p>';
      return;
    }
    const maxMins = entries[0][1];
    list.innerHTML = entries
      .map(([subj, mins], i) => {
        const pct = Math.round((mins / maxMins) * 100);
        const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
        const hrs =
          mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        return `<div class="subject-row">
        <div class="subject-row-top">
          <span class="subject-name">${subj}</span>
          <span class="subject-time">${hrs}</span>
        </div>
        <div class="subject-progress">
          <div class="subject-progress-fill" style="width:0%;background:${color}" data-pct="${pct}"></div>
        </div>
      </div>`;
      })
      .join("");

    // Animate bars in
    setTimeout(() => {
      list.querySelectorAll(".subject-progress-fill").forEach((el) => {
        el.style.width = el.dataset.pct + "%";
      });
    }, 80);
  }

  function renderSessionLog(data) {
    const log = document.getElementById("sessionHistory");
    if (!log) return;
    const sessions = [...data.sessions].reverse();
    const show = sessionLogExpanded ? sessions : sessions.slice(0, 5);

    if (!sessions.length) {
      log.innerHTML = '<p class="analytics-empty">No sessions yet</p>';
      return;
    }

    log.className = "session-log" + (sessionLogExpanded ? " expanded" : "");
    log.innerHTML = show
      .map((s) => {
        const isFocus = s.type === "focus";
        const d = new Date(s.date);
        const time = d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateStr =
          d.toDateString() === new Date().toDateString()
            ? `Today ${time}`
            : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
        const title = isFocus ? s.subject || "Focus session" : "Break";
        const dur =
          s.duration >= 60
            ? `${Math.floor(s.duration / 60)}h ${s.duration % 60}m`
            : `${s.duration}m`;
        return `<div class="session-entry">
        <div class="session-dot ${isFocus ? "focus" : "break"}"></div>
        <div class="session-entry-info">
          <span class="session-entry-title">${title}</span>
          <span class="session-entry-sub">${dateStr}</span>
        </div>
        <span class="session-entry-duration">${dur}</span>
      </div>`;
      })
      .join("");

    if (toggleSessionBtn) {
      toggleSessionBtn.textContent = sessionLogExpanded
        ? "Show less"
        : `Show all (${sessions.length})`;
    }
  }

  // Event listeners
  document
    .getElementById("openStatsModalBtn")
    ?.addEventListener("click", openAnalytics);
  analyticsBackdrop?.addEventListener("click", closeAnalytics);
  analyticsCloseBtn?.addEventListener("click", closeAnalytics);

  document.querySelectorAll(".date-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".date-pill")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      analyticsRange = btn.dataset.range;
      renderAnalytics();
    });
  });

  toggleSessionBtn?.addEventListener("click", () => {
    sessionLogExpanded = !sessionLogExpanded;
    const data = getFilteredStats(analyticsRange);
    renderSessionLog(data);
  });

  statsResetBtn2?.addEventListener("click", () => {
    if (confirm("Reset all statistics? This cannot be undone.")) {
      resetStats();
      renderAnalytics();
    }
  });

  statsExportBtn?.addEventListener("click", () => {
    const stats = getStats();
    const rows = [["Type", "Subject", "Duration (min)", "Date"]];
    stats.sessions.forEach((s) => {
      rows.push([
        s.type,
        s.subject || "",
        s.duration,
        new Date(s.date).toLocaleString(),
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "study-sessions.csv";
    a.click();
  });

  renderTasks();
});
