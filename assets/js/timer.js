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

  function startTimer() {
    if (running) return;
    running = true;

    interval = setInterval(() => {
      if (remaining <= 1) {
        clearInterval(interval);
        remaining = 0;
        running = false;
        render();
        return;
      }
      remaining--;
      render();
    }, 1000);
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
    if (currentTheme === "gradient-ocean") {
      oceanSpecificToggle.style.display = "block";
    } else {
      oceanSpecificToggle.style.display = "none";
    }
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
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    function setSize() {
      w = canvas.width = Math.max(600, window.innerWidth);
      h = canvas.height = window.innerHeight;
    }

    function update(currentTime) {
      if (!currentTime) currentTime = performance.now();
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

        if (localStorage.getItem("timerTheme") === "gradient-ocean") {
          grd.addColorStop(0, "rgba(0, 212, 255, 0.8)");
          grd.addColorStop(0.5, "rgba(0, 140, 255, 0.6)");
          grd.addColorStop(1, "rgba(0, 100, 200, 0.4)");
        } else {
          grd.addColorStop(0, "rgba(128, 224, 208, 0.8)");
          grd.addColorStop(0.5, "rgba(64, 216, 212, 0.6)");
          grd.addColorStop(1, "rgba(64, 212, 208, 0.4)");
        }

        ctx.beginPath();
        for (let x = 0; x <= w; x += 15) {
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
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
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

        // Status classes
        let statusClass = "";
        if (isOverdue(task)) {
          statusClass = "overdue";
        } else if (task.status === "done") {
          statusClass = "done";
        }

        taskItem.className = `planner-task-item ${statusClass}`;

        // Category color mapping
        const categoryColorMap = {
          Exam: "category-exam",
          Revision: "category-revision",
          "Past Paper": "category-past-paper",
          Finals: "category-finals",
          Other: "category-other",
        };

        // Priority emoji and color mapping
        const priorityMap = {
          High: { emoji: "⚠️", class: "priority-high" },
          Urgent: { emoji: "🔴", class: "priority-urgent" },
          "": { emoji: "🔵", class: "priority-normal" },
          Normal: { emoji: "🔵", class: "priority-normal" },
        };

        const priorityInfo = priorityMap[task.priority] || priorityMap[""];

        taskItem.innerHTML = `
          <div class="task-info">
            <h4 class="task-title">${task.title || "Untitled"}</h4>
            <div class="task-meta">
              ${task.category ? `<span class="tag-category ${categoryColorMap[task.category] || ""}"><i class="fa-solid fa-bookmark"></i>${task.category}</span>` : ""}
              ${task.subject ? `<span class="tag-subject">${task.subject}</span>` : ""}
              ${task.priority || task.priority === "" ? `<span class="tag-priority ${priorityInfo.class}">${priorityInfo.emoji} ${task.priority || "Normal"}</span>` : ""}
              ${task.estimate ? `<span class="tag-estimate">${task.estimate}</span>` : ""}
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

  // Expose functions to window for inline onclick handlers
  window.openTaskPopup = openTaskPopup;
  window.updateTaskStatus = updateTaskStatus;
  window.deleteTask = deleteTask;
  window.setFilter = setFilter;

  renderTasks();
});
