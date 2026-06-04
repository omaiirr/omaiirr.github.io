document.addEventListener("DOMContentLoaded", function () {
  // ─── SECURITY: HTML Sanitization Utilities ───────────────────────
  // Prevents XSS attacks by escaping HTML special characters and creating safe DOM nodes
  function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function createSafeElement(tagName, attrs = {}, textContent = "") {
    const el = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith("on")) return; // Prevent event handler injection
      el.setAttribute(key, String(value));
    });
    if (textContent) el.textContent = textContent;
    return el;
  }

  function sanitizeInput(str, maxLength = 500) {
    if (!str) return "";
    return String(str)
      .trim()
      .substring(0, maxLength)
      .replace(
        /[<>\"']/g,
        (m) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
      );
  }

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
  let autoStartBreak = localStorage.getItem("autoStartBreak") !== "false";

  function applyAutoBreakToggle() {
    const toggle = document.getElementById("autoStartBreakToggle");
    if (toggle) {
      toggle.checked = autoStartBreak;
      toggle.addEventListener("change", (e) => {
        autoStartBreak = e.target.checked;
        localStorage.setItem("autoStartBreak", autoStartBreak);
      });
    }
  }

  function safeJSONParse(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("safeJSONParse: invalid JSON detected", value, error);
      return fallback;
    }
  }

  // Stats functions
  function getStats() {
    return (
      safeJSONParse(localStorage.getItem("timerStats"), {
        totalStudyTime: 0,
        totalBreakTime: 0,
        sessions: [],
      }) || {
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
    if (!statisticsEnabled) return;
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
      subjectBreakdown.innerHTML = "";
      if (entries.length === 0) {
        const emptyDiv = createSafeElement(
          "div",
          {
            style:
              "color:rgba(255,255,255,0.4);font-size:0.85rem;text-align:center;padding:8px 0;",
          },
          "No subject data yet",
        );
        subjectBreakdown.appendChild(emptyDiv);
      } else {
        entries.forEach(([subj, mins]) => {
          const itemDiv = createSafeElement("div", {
            style:
              "display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);",
          });

          const subjSpan = createSafeElement(
            "span",
            { style: "color:rgba(255,255,255,0.75);font-size:0.9rem;" },
            sanitizeInput(subj),
          );
          itemDiv.appendChild(subjSpan);

          const minsSpan = createSafeElement(
            "span",
            { style: "color:white;font-weight:600;" },
            `${mins} min`,
          );
          itemDiv.appendChild(minsSpan);

          subjectBreakdown.appendChild(itemDiv);
        });
      }
    }
  }

  const display = document.getElementById("display");
  const minutesInput = document.getElementById("minutes");
  const focusModeBtn = document.getElementById("focusMode");
  const shortBreakBtn = document.getElementById("shortBreakMode");
  const longBreakBtn = document.getElementById("longBreakMode");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const customFocusInput = document.getElementById("customFocus");
  const customShortInput = document.getElementById("customShort");
  const customLongInput = document.getElementById("customLong");
  const speedSlider = document.getElementById("speed");
  const tsizeSlider = document.getElementById("tsize");
  const jsizeSlider = document.getElementById("jsize");

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
      const parsed = safeJSONParse(saved, null);
      if (parsed) {
        customFocusInput.value = parsed.focus;
        customShortInput.value = parsed.short;
        customLongInput.value = parsed.long;
        updateModes();
      }
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

    if (timerTick) clearInterval(timerTick);
    timerTick = null;
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
    if (!timerSoundEnabled) return;
    // 3 quick beeps — "almost done"
    playBeep(880, 0.15, 0.25);
    setTimeout(() => playBeep(880, 0.15, 0.25), 200);
    setTimeout(() => playBeep(880, 0.15, 0.25), 400);
  }
  function playBreakStartSound() {
    if (!breakSoundEnabled) return;
    // Rising tone — "break time"
    playBeep(440, 0.3, 0.3);
    setTimeout(() => playBeep(523, 0.3, 0.3), 320);
    setTimeout(() => playBeep(659, 0.5, 0.3), 640);
  }
  function playFocusStartSound() {
    if (!breakSoundEnabled) return;
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
          if (autoStartBreak) {
            setActiveMode("short");
            playBreakStartSound();
            setTimeout(() => toggleTimer(), 800);
          } else {
            remaining = modes.focus;
            warningPlayed = false;
            render();
          }
        } else {
          setActiveMode("focus");
          playFocusStartSound();
          setTimeout(() => toggleTimer(), 800);
        }
      }, 500);
    }
  }

  function toggleTimer() {
    if (running) {
      // Pause
      if (timerTick) clearInterval(timerTick);
      timerTick = null;
      running = false;
      remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      render();
      startBtn.textContent = "Start";
      startBtn.classList.remove("pause-state");
    } else {
      // Start
      running = true;
      warningPlayed = false;
      endTime = Date.now() + remaining * 1000;
      updateTimerDisplay();
      timerTick = setInterval(updateTimerDisplay, 250);
      startBtn.textContent = "Pause";
      startBtn.classList.add("pause-state");
    }
  }
  window.toggleTimer = toggleTimer;

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
    startBtn.textContent = "Start";
    startBtn.classList.remove("pause-state");
  }

  // Picture in Picture functionality
  let pipWindow = null;
  let pipStayOnTopInterval = null;
  const pipToggle = document.getElementById("pipBtn");

  function clearPipStayOnTopInterval() {
    if (pipStayOnTopInterval) {
      clearInterval(pipStayOnTopInterval);
      pipStayOnTopInterval = null;
    }
  }

  function refreshPipStayOnTop() {
    clearPipStayOnTopInterval();
    if (!pipWindow || pipWindow.closed) return;
    pipStayOnTopInterval = setInterval(() => {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.focus();
      } else {
        clearPipStayOnTopInterval();
      }
    }, 1200);
  }

  function getPiPThemeBackground(theme) {
    const raw = localStorage.getItem("advSettings_" + theme);
    if (theme === "gradient-default") {
      const saved = safeJSONParse(raw, {});
      if (saved.start && saved.end) {
        return `linear-gradient(135deg, ${saved.start} 0%, ${saved.end} 50%, ${saved.end} 100%)`;
      }
      return "linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%)";
    }
    if (theme === "gradient-day-night") {
      return "linear-gradient(135deg, #ff6b6b 0%, #fedc57 100%)";
    }
    if (theme === "gradient-deep-ocean" || theme === "gradient-ocean") {
      return "linear-gradient(135deg, #0066ff 0%, #00d4ff 100%)";
    }
    if (theme === "gradient-forest") {
      return "linear-gradient(135deg, #134e5e 0%, #71b280 100%)";
    }
    if (theme === "color-light") {
      return "#ffffff";
    }
    if (theme === "color-dark") {
      return "#000000";
    }
    return "linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%)";
  }

  function getPiPTextColor(theme) {
    return theme === "color-light" ? "#111" : "white";
  }

  function buildPiPDocument(pipDoc) {
    pipDoc.open();
    pipDoc.write(
      "<!DOCTYPE html><html><head><title>Timer</title></head><body></body></html>",
    );
    pipDoc.close();

    const pipBackground = getPiPThemeBackground(savedTheme);
    const pipColor = getPiPTextColor(savedTheme);
    const style = pipDoc.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Piazzolla:wght@300;400;500;700;800&display=swap');
      body {
        margin: 0;
        padding: 18px;
        background: ${pipBackground};
        color: ${pipColor};
        font-family: 'Piazzolla', serif;
        font-weight: 400;
        line-height: 1.4;
        font-variant-numeric: oldstyle-nums proportional-nums;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        box-sizing: border-box;
        overflow: hidden;
      }
      .timer-label {
        font-size: clamp(0.85rem, 2vw, 1rem);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        opacity: 0.92;
        margin-bottom: 12px;
      }
      .timer-display {
        font-size: clamp(2.2rem, 10vw, 3.2rem);
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        margin-bottom: 16px;
        text-align: center;
        line-height: 1.2;
      }
      .pip-actions {
        display: flex;
        gap: 12px;
        width: 100%;
        justify-content: center;
      }
      .pip-control-btn,
      .close-btn {
        border: none;
        cursor: pointer;
        border-radius: 999px;
        padding: 10px 18px;
        background: rgba(255,255,255,0.18);
        color: ${pipColor};
        font-family: 'Piazzolla', serif;
        font-weight: 600;
        font-size: clamp(0.9rem, 2vw, 1rem);
        line-height: 1.4;
      }
      .close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
    `;
    pipDoc.head.appendChild(style);

    const closeBtn = pipDoc.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      if (pipWindow) pipWindow.close();
    });
    pipDoc.body.appendChild(closeBtn);

    const label = pipDoc.createElement("div");
    label.className = "timer-label";
    label.id = "pip-label";
    label.textContent =
      currentMode === "focus"
        ? "Focus"
        : currentMode === "short"
          ? "Short Break"
          : "Long Break";
    pipDoc.body.appendChild(label);

    const displayDiv = pipDoc.createElement("div");
    displayDiv.className = "timer-display";
    displayDiv.id = "pip-display";
    displayDiv.textContent = display.textContent;
    pipDoc.body.appendChild(displayDiv);

    const actions = pipDoc.createElement("div");
    actions.className = "pip-actions";
    const controlBtn = pipDoc.createElement("button");
    controlBtn.className = "pip-control-btn";
    controlBtn.id = "pip-control-btn";
    controlBtn.textContent = (startBtn && startBtn.textContent) || "Start";
    actions.appendChild(controlBtn);
    pipDoc.body.appendChild(actions);

    const script = pipDoc.createElement("script");
    script.textContent = `
      const controlBtn = document.getElementById('pip-control-btn');
      if (controlBtn && window.opener && typeof window.opener.toggleTimer === 'function') {
        controlBtn.addEventListener('click', () => {
          window.opener.toggleTimer();
        });
      }
      const updateDisplay = () => {
        const openerDoc = window.opener && window.opener.document;
        if (!openerDoc) return;
        const display = openerDoc.getElementById('display');
        const mode = openerDoc.querySelector('.mode-btn.active');
        const startBtn = openerDoc.getElementById('startBtn');
        const pipDisplay = document.getElementById('pip-display');
        const pipLabel = document.getElementById('pip-label');
        const controlBtn = document.getElementById('pip-control-btn');
        if (display && pipDisplay) pipDisplay.textContent = display.textContent;
        if (mode && pipLabel) pipLabel.textContent = mode.textContent;
        if (startBtn && controlBtn) controlBtn.textContent = startBtn.textContent;
      };
      updateDisplay();
      setInterval(updateDisplay, 250);
      window.addEventListener('beforeunload', () => {
        if (window.opener) window.opener.pipWindow = null;
      });
    `;
    pipDoc.body.appendChild(script);
  }

  async function togglePiP() {
    if (pipWindow) {
      pipWindow.close();
      pipWindow = null;
      if (pipToggle) pipToggle.classList.remove("active");
      clearPipStayOnTopInterval();
      return;
    }

    try {
      const requestWindow =
        window.documentPictureInPicture &&
        window.documentPictureInPicture.requestWindow;
      if (requestWindow) {
        pipWindow = await requestWindow.call(window.documentPictureInPicture, {
          width: 360,
          height: 260,
        });
      } else {
        pipWindow = window.open(
          "about:blank",
          "timer-pip",
          "width=360,height=260,left=" +
            (screenX + 100) +
            ",top=" +
            (screenY + 100),
        );
      }

      if (pipWindow && pipWindow.document) {
        buildPiPDocument(pipWindow.document);
        pipWindow.focus();
        refreshPipStayOnTop();
        pipWindow.addEventListener("beforeunload", () => {
          pipWindow = null;
          clearPipStayOnTopInterval();
          if (pipToggle) pipToggle.classList.remove("active");
        });
      }

      if (pipToggle) pipToggle.classList.toggle("active", !!pipWindow);
    } catch (e) {
      console.warn("PiP failed:", e);
      if (pipToggle) pipToggle.classList.remove("active");
    }
  }

  focusModeBtn.addEventListener("click", () => setActiveMode("focus"));
  shortBreakBtn.addEventListener("click", () => setActiveMode("short"));
  longBreakBtn.addEventListener("click", () => setActiveMode("long"));
  startBtn.addEventListener("click", toggleTimer);
  resetBtn.addEventListener("click", resetTimer);

  const pipBtn = document.getElementById("pipBtn");
  if (pipBtn) {
    pipBtn.addEventListener("click", togglePiP);
  }

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
    if (speedSlider) params.speed = Number(speedSlider.value) / 16 + 1;
    if (tsizeSlider) params.tsize = Number(tsizeSlider.value) / 20 + 1;
    if (jsizeSlider) params.jsize = Number(jsizeSlider.value) / 20 + 1;
  }

  if (speedSlider) speedSlider.addEventListener("input", changeSliders);
  if (tsizeSlider) tsizeSlider.addEventListener("input", changeSliders);
  if (jsizeSlider) jsizeSlider.addEventListener("input", changeSliders);

  changeSliders();
  loadSavedModes();
  render();

  // ── theme config ──────────────────────────────────────────
  const THEME_CFG = {
    "gradient-default": { adv: true, section: "defaultThemeSettings" },
    "gradient-day-night": { adv: true, section: "dayNightSettings" },
    "gradient-ocean": { adv: true, section: "deepOceanSettings" },
    "gradient-deep-ocean": { adv: true, section: "deepOceanSettings" },
    "gradient-forest": { adv: true, section: "forestThemeSettings" },
    "color-dark": { adv: false, section: "staticThemeSettings" },
    "color-light": { adv: false, section: "staticThemeSettings" },
  };

  const THEME_ALIAS = {
    "gradient-sunset": "gradient-day-night",
  };

  function normalizeTheme(theme) {
    if (!theme) return "gradient-default";
    return THEME_ALIAS[theme] || theme;
  }

  // ── DOM refs ──────────────────────────────────────────────
  const settingsBtn = document.getElementById("settingsBtn");
  const themeModal = document.getElementById("themeModal");
  const timerContainer = document.getElementById("timerContainer");
  const themeOptions = document.querySelectorAll(".theme-option");
  const advModal = document.getElementById("advancedSettingsModal");
  const advBackdrop = document.getElementById("advancedSettingsBackdrop");
  const advCloseBtn = document.getElementById("advancedSettingsCloseBtn");
  const advOpenBtn = document.getElementById("openAdvancedSettingsBtn");
  const advSaveBtn = document.getElementById("advancedSettingsSaveBtn");
  const patchNotesPreview = document.getElementById("patchNotesPreview");
  const openPatchNotesBtn = document.getElementById("openPatchNotesBtn");
  const patchNotesPopup = document.getElementById("patchNotesPopup");
  const patchNotesCloseBtn = document.getElementById("patchNotesCloseBtn");
  const patchNotesList = document.getElementById("patchNotesList");
  const updateNoticePopup = document.getElementById("updateNoticePopup");
  const viewPatchNotesFromUpdateBtn = document.getElementById(
    "viewPatchNotesFromUpdateBtn",
  );
  const dismissUpdateNoticeBtn = document.getElementById(
    "dismissUpdateNoticeBtn",
  );
  const dayNightContainer = document.getElementById("dayNightContainer");
  const leavesContainer = document.getElementById("leaves");
  const waveContainer = document.getElementById("waveContainer");
  const oceanContainer = document.getElementById("oceanContainer");

  // ── current state ─────────────────────────────────────────
  let savedTheme =
    normalizeTheme(localStorage.getItem("timerTheme")) || "gradient-default";
  if (!THEME_CFG[savedTheme]) {
    savedTheme = "gradient-default";
  }
  if (localStorage.getItem("timerTheme") !== savedTheme) {
    localStorage.setItem("timerTheme", savedTheme);
  }
  let animationEnabled =
    localStorage.getItem("timerAnimationEnabled") !== "false";
  let currentAnimation = null;
  let dayNightInterval = null;
  let pipAlwaysOnTop = localStorage.getItem("pipAlwaysOnTop") === "true";

  // ── sound control ────────────────────────────────────────
  let timerSoundEnabled = localStorage.getItem("timerSoundEnabled") !== "false";
  let breakSoundEnabled = localStorage.getItem("breakSoundEnabled") !== "false";
  let statisticsEnabled = localStorage.getItem("statisticsEnabled") !== "false";

  const PATCH_NOTES = [
    {
      date: "2026-06-03",
      title: "Added PiP mode, improved UI and animations, and more",
      details:
        "Added a new Picture-in-Picture mode to better improve your workflow while working in other tabs, along with various UI improvements animations, new wave animation logic and bug fixes.",
    },
    {
      date: "2026-05-20",
      title: "Customize wave animation colors",
      details:
        "Added the ability to choose your own custom colors for the wave animation in the Default theme, and other small changes and bug fixes.",
    },
    {
      date: "2026-05-19",
      title: "Expanded settings menu and other changes",
      details:
        "New expanded settings menu, theme overhaul, and new animations across the entire page.",
    },
    {
      date: "2026-05-11",
      title: "Bug fixes and UI improvements",
      details:
        "Improved and made UI more consistent. Fixed various bugs related to the timer and settings menu.",
    },
    {
      date: "2026-05-10",
      title: "Advanced analytics menu",
      details:
        "Added a new analytics menu with more detailed breakdowns of your study sessions, including subject tracking and session history.",
    },
  ];

  // Update notice constants (declare before bootstrap to avoid TDZ)
  const UPDATE_NOTIFICATION_VERSION = "2026-06-03";
  const UPDATE_NOTIFICATION_KEY = "timerUpdateNoticeVersion";
  const VISITED_KEY = "timerHasVisited";

  // ── apply saved theme class ───────────────────────────────
  (function bootstrap() {
    timerContainer.classList.add("theme-" + savedTheme);
    if (document.body) document.body.classList.add("theme-" + savedTheme);
    document
      .querySelectorAll(`[data-theme="${savedTheme}"]`)
      .forEach((el) => el.classList.add("active"));
    renderPatchNotesPreview();
    renderPatchNotesList();
    initUpdateNotice();
  })();

  function refreshBodyOverflow() {
    document.body.style.overflow =
      (advModal && advModal.classList.contains("open")) ||
      (patchNotesPopup && patchNotesPopup.classList.contains("open")) ||
      (updateNoticePopup && updateNoticePopup.classList.contains("open"))
        ? "hidden"
        : "";
  }

  function isReturningUser() {
    if (localStorage.getItem(VISITED_KEY) === "true") return true;
    return [
      "timerTheme",
      "timerAnimationEnabled",
      "timerSoundEnabled",
      "statisticsEnabled",
    ].some((key) => localStorage.getItem(key) !== null);
  }

  function openUpdateNoticePopup() {
    if (!updateNoticePopup) return;
    updateNoticePopup.classList.add("open");
    refreshBodyOverflow();
  }

  function closeUpdateNoticePopup() {
    if (!updateNoticePopup) return;
    updateNoticePopup.classList.remove("open");
    refreshBodyOverflow();
  }

  function initUpdateNotice() {
    const currentVersion = UPDATE_NOTIFICATION_VERSION;
    const seenVersion = localStorage.getItem(UPDATE_NOTIFICATION_KEY);
    const returning = isReturningUser();

    if (!returning) {
      localStorage.setItem(VISITED_KEY, "true");
      localStorage.setItem(UPDATE_NOTIFICATION_KEY, currentVersion);
      return;
    }

    if (seenVersion !== currentVersion) {
      openUpdateNoticePopup();
      localStorage.setItem(VISITED_KEY, "true");
      localStorage.setItem(UPDATE_NOTIFICATION_KEY, currentVersion);
    }
  }

  function renderPatchNotesPreview() {
    if (!patchNotesPreview) return;
    const first = PATCH_NOTES[0];
    patchNotesPreview.innerHTML = "";
    if (!first) {
      return;
    }
    const moreCount = Math.max(0, PATCH_NOTES.length - 1);

    const btn = createSafeElement("button", {
      type: "button",
      class: "patch-note-preview",
      "data-index": "0",
    });

    const headerDiv = createSafeElement("div");
    const titleStrong = createSafeElement(
      "strong",
      {},
      sanitizeInput(first.title),
    );
    const dateSmall = createSafeElement("small", {}, sanitizeInput(first.date));
    headerDiv.appendChild(titleStrong);
    headerDiv.appendChild(dateSmall);
    btn.appendChild(headerDiv);

    const detailsP = createSafeElement("p", {}, sanitizeInput(first.details));
    btn.appendChild(detailsP);

    if (moreCount > 0) {
      const moreDiv = createSafeElement(
        "div",
        { class: "patch-more" },
        `and ${moreCount} more — View all`,
      );
      btn.appendChild(moreDiv);
    }

    patchNotesPreview.appendChild(btn);
  }

  function renderPatchNotesList() {
    if (!patchNotesList) return;
    patchNotesList.innerHTML = "";
    PATCH_NOTES.forEach((note) => {
      const entryDiv = createSafeElement("div", { class: "patch-notes-entry" });

      const headerDiv = createSafeElement("div", {
        class: "patch-notes-entry-header",
      });
      const titleH4 = createSafeElement("h4", {}, sanitizeInput(note.title));
      const dateSpan = createSafeElement("span", {}, sanitizeInput(note.date));
      headerDiv.appendChild(titleH4);
      headerDiv.appendChild(dateSpan);

      const detailsP = createSafeElement("p", {}, sanitizeInput(note.details));

      entryDiv.appendChild(headerDiv);
      entryDiv.appendChild(detailsP);
      patchNotesList.appendChild(entryDiv);
    });
  }

  function openPatchNotesPopup() {
    if (!patchNotesPopup) return;
    patchNotesPopup.classList.add("open");
    refreshBodyOverflow();
  }

  function closePatchNotesPopup() {
    if (!patchNotesPopup) return;
    patchNotesPopup.classList.remove("open");
    refreshBodyOverflow();
  }

  // ═══════════════════════════════════════════════════════════
  //  SETTINGS BUTTON  →  spring-open theme modal
  // ═══════════════════════════════════════════════════════════
  if (settingsBtn) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const modal = themeModal || document.getElementById("themeModal");
      if (!modal) return;
      const isOpen = modal.classList.contains("open");
      modal.classList.toggle("open", !isOpen);
      addRipple(settingsBtn, e);
    });
  }

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".settings-btn") &&
      !e.target.closest(".theme-modal") &&
      !e.target.closest(".advanced-settings-panel") &&
      !e.target.closest(".planner-card") &&
      !e.target.closest(".task-popup-card") &&
      !e.target.closest(".analytics-panel")
    ) {
      const modal = themeModal || document.getElementById("themeModal");
      if (modal) modal.classList.remove("open");
    }
  });

  if (patchNotesPreview)
    patchNotesPreview.addEventListener("click", (e) => {
      const target = e.target.closest(".patch-note-preview");
      if (!target) return;
      openPatchNotesPopup();
    });
  if (openPatchNotesBtn)
    openPatchNotesBtn.addEventListener("click", openPatchNotesPopup);
  if (patchNotesCloseBtn)
    patchNotesCloseBtn.addEventListener("click", closePatchNotesPopup);
  if (viewPatchNotesFromUpdateBtn)
    viewPatchNotesFromUpdateBtn.addEventListener("click", () => {
      closeUpdateNoticePopup();
      openPatchNotesPopup();
    });
  if (dismissUpdateNoticeBtn)
    dismissUpdateNoticeBtn.addEventListener("click", closeUpdateNoticePopup);
  if (patchNotesPopup)
    patchNotesPopup.addEventListener("click", (e) => {
      if (e.target === patchNotesPopup) closePatchNotesPopup();
    });

  function showThemeSettingsSection(theme) {
    document
      .querySelectorAll(".theme-settings-section")
      .forEach((s) => (s.style.display = "none"));
    const cfg = THEME_CFG[theme];
    if (cfg) {
      const sec = document.getElementById(cfg.section);
      if (sec) sec.style.display = "block";
    }
  }
  function addRipple(btn, e) {
    const ripple = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
    position:absolute;border-radius:50%;
    width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
  `;
    ripple.classList.add("ripple");
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }

  // ═══════════════════════════════════════════════════════════
  //  THEME SELECTION
  // ═══════════════════════════════════════════════════════════

  // Setup disabled button tooltips (complete rebuild)
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
      document.querySelectorAll("button[disabled][title]").forEach((btn) => {
        btn.style.position = "relative";

        btn.addEventListener("mouseenter", function () {
          // create tooltip appended to body to avoid clipping by modal overflow
          // remove any existing tooltip attached to this button
          if (this._activeTooltip) {
            this._activeTooltip.remove();
            this._activeTooltip = null;
          }

          const tooltip = document.createElement("div");
          tooltip.className = "btn-wip-tooltip";
          tooltip.textContent = this.getAttribute("title") || "";
          tooltip.style.cssText = [
            "position: fixed",
            "background: #111",
            "color: #fff",
            "padding: 8px 12px",
            "border-radius: 6px",
            "font-size: 12px",
            "font-weight: 600",
            "white-space: nowrap",
            "pointer-events: none",
            "z-index: 1000000",
            "box-shadow: 0 6px 20px rgba(0,0,0,0.6)",
            "border: 1px solid rgba(255,255,255,0.06)",
          ].join(";");

          document.body.appendChild(tooltip);

          // force reflow to get accurate size
          void tooltip.offsetHeight;

          const rect = this.getBoundingClientRect();
          const tw = tooltip.offsetWidth;
          const th = tooltip.offsetHeight;

          let left = Math.round(rect.left + rect.width / 2 - tw / 2);
          let top = Math.round(rect.top - th - 10);

          // viewport bounds
          if (left < 8) left = 8;
          if (left + tw > window.innerWidth - 8)
            left = window.innerWidth - tw - 8;
          if (top < 8) top = Math.round(rect.bottom + 10);

          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";

          this._activeTooltip = tooltip;
        });

        btn.addEventListener("mouseleave", function () {
          if (this._activeTooltip) {
            this._activeTooltip.remove();
            this._activeTooltip = null;
          }
        });
      });
    }, 100);
  });

  if (themeOptions.length > 0) {
    themeOptions.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        if (!btn) return;

        // Skip if button is disabled
        if (btn.hasAttribute("disabled")) return;

        const theme = normalizeTheme(btn.dataset.theme);
        if (!theme) return;

        // swap class
        if (timerContainer) {
          const oldClasses = Array.from(timerContainer.classList).filter((c) =>
            c.startsWith("theme-"),
          );
          timerContainer.classList.remove(...oldClasses);
          timerContainer.classList.add("theme-" + theme);
        }
        if (document.body) {
          const oldBodyClasses = Array.from(document.body.classList).filter(
            (c) => c.startsWith("theme-"),
          );
          document.body.classList.remove(...oldBodyClasses);
          document.body.classList.add("theme-" + theme);
        }

        themeOptions.forEach((o) => o.classList.remove("active"));
        btn.classList.add("active");

        savedTheme = theme;
        localStorage.setItem("timerTheme", theme);

        applyTheme(theme);
      });
    });
  }

  function updatePipAlwaysOnTopButton() {
    const pipBtn = document.getElementById("pipBtn");
    const pipAlwaysOnTopToggle = document.getElementById(
      "pipAlwaysOnTopToggle",
    );
    if (pipBtn) pipBtn.classList.toggle("always-on-top", pipAlwaysOnTop);
    if (pipAlwaysOnTopToggle) {
      pipAlwaysOnTopToggle.checked = pipAlwaysOnTop;
    }
    localStorage.setItem("pipAlwaysOnTop", pipAlwaysOnTop ? "true" : "false");
    refreshPipStayOnTop();
  }

  function initPipAlwaysOnTop() {
    updatePipAlwaysOnTopButton();
    const pipAlwaysOnTopToggle = document.getElementById(
      "pipAlwaysOnTopToggle",
    );
    if (pipAlwaysOnTopToggle) {
      pipAlwaysOnTopToggle.addEventListener("change", () => {
        pipAlwaysOnTop = pipAlwaysOnTopToggle.checked;
        updatePipAlwaysOnTopButton();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPipAlwaysOnTop);
  } else {
    initPipAlwaysOnTop();
  }

  // ═══════════════════════════════════════════════════════════
  //  EXTENDED SETTINGS MODAL
  // ═══════════════════════════════════════════════════════════
  if (advOpenBtn)
    advOpenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openAdvModal();
    });
  if (advCloseBtn)
    advCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAdvModal();
    });

  if (advBackdrop) advBackdrop.addEventListener("click", closeAdvModal);
  if (advSaveBtn) advSaveBtn.addEventListener("click", saveAdvSettings);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && advModal && advModal.classList.contains("open"))
      closeAdvModal();
  });

  function openAdvModal() {
    if (!advModal) return;
    // sync clock inputs into full-settings panel
    const fsFocus = document.getElementById("fsFocus");
    const fsShort = document.getElementById("fsShort");
    const fsLong = document.getElementById("fsLong");
    const qsFocus = document.getElementById("customFocus");
    const qsShort = document.getElementById("customShort");
    const qsLong = document.getElementById("customLong");
    if (fsFocus && qsFocus) fsFocus.value = qsFocus.value;
    if (fsShort && qsShort) fsShort.value = qsShort.value;
    if (fsLong && qsLong) fsLong.value = qsLong.value;

    // sync autoStartBreak toggle
    const asbToggle = document.getElementById("autoStartBreakToggle");
    if (asbToggle) asbToggle.checked = autoStartBreak;

    // sync theme buttons inside full settings
    document.querySelectorAll(".theme-option").forEach((o) => {
      o.classList.toggle("active", o.dataset.theme === savedTheme);
    });

    // show correct theme section
    showThemeSettingsSection(savedTheme);
    loadAdvValues();

    // wire up theme switching inside advanced modal (remove old listeners first)
    advModal.querySelectorAll(".theme-option").forEach((opt) => {
      const clone = opt.cloneNode(true);
      opt.parentNode.replaceChild(clone, opt);

      clone.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        if (!btn) return;

        const newTheme = normalizeTheme(btn.dataset.theme);
        if (!newTheme) return;

        savedTheme = newTheme;
        advModal
          .querySelectorAll(".theme-option")
          .forEach((o) => o.classList.remove("active"));
        btn.classList.add("active");
        showThemeSettingsSection(newTheme);
        loadAdvValues();
      });
    });

    // TAB SWITCHING
    if (!advModal.dataset.tabsInit) {
      document.querySelectorAll(".fs-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tabName = btn.dataset.tab;
          document
            .querySelectorAll(".fs-tab-btn")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".fs-tab-content")
            .forEach((c) => c.classList.remove("active"));
          btn.classList.add("active");
          const tabContent = document.getElementById(`tab-${tabName}`);
          if (tabContent) tabContent.classList.add("active");
        });
      });
      advModal.dataset.tabsInit = "true";
    }

    // SOUND TOGGLES
    const timerSoundToggle = document.getElementById("timerSoundToggle");
    const breakSoundToggle = document.getElementById("breakSoundToggle");
    const statisticsToggle = document.getElementById("statisticsToggle");

    if (timerSoundToggle) timerSoundToggle.checked = timerSoundEnabled;
    if (breakSoundToggle) breakSoundToggle.checked = breakSoundEnabled;
    if (statisticsToggle) statisticsToggle.checked = statisticsEnabled;

    advModal.classList.add("open");
    document.body.style.overflow = "hidden";
    if (themeModal) themeModal.classList.remove("open");
  }

  function getAdvRaw(theme) {
    return (
      localStorage.getItem("advSettings_" + theme) ||
      localStorage.getItem("advSettings_gradient-ocean") ||
      localStorage.getItem("advSettings_gradient-deep-ocean")
    );
  }

  function closeAdvModal() {
    if (!advModal) return;
    advModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function loadAdvValues() {
    const raw = localStorage.getItem("advSettings_" + savedTheme);
    if (!raw) return;
    const s = safeJSONParse(raw, {});

    if (savedTheme === "gradient-default") {
      if (s.start)
        document.getElementById("gradientStartColor").value = s.start;
      if (s.end) document.getElementById("gradientEndColor").value = s.end;
      if (s.waveAccent)
        document.getElementById("waveAccentColor").value = s.waveAccent;
      // custom toggle
      const wcToggle = document.getElementById("waveCustomToggle");
      if (wcToggle)
        wcToggle.checked =
          s.waveCustomEnabled === undefined ? true : !!s.waveCustomEnabled;
      const lowQ = document.getElementById("waveLowQualityToggle");
      if (lowQ) lowQ.checked = !!s.waveLowQuality;
      if (s.anim !== undefined)
        document.getElementById("defaultAnimationToggle").checked = s.anim;
      updateWaveAccentControls();
      updateGradientPreview();
    } else if (savedTheme === "gradient-forest") {
      if (s.anim !== undefined)
        document.getElementById("forestAnimationToggle").checked = s.anim;
    } else if (savedTheme === "gradient-day-night") {
      const mode = s.mode || "realtime";
      document.querySelectorAll(".mode-toggle-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.mode === mode);
      });
      setDayNightModeUI(mode);
      if (s.sliderVal !== undefined) {
        document.getElementById("dayNightSlider").value = s.sliderVal;
        updateDNDisplay(s.sliderVal);
      }
    } else if (
      savedTheme === "gradient-deep-ocean" ||
      savedTheme === "gradient-ocean"
    ) {
      const ids = ["oceanSpeed", "oceanTireSize", "oceanJellyfishSize"];
      const keys = ["speed", "tsize", "jsize"];
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && s[keys[i]] !== undefined) {
          el.value = s[keys[i]];
          document.getElementById(id + "Value").textContent = s[keys[i]];
        }
      });
      if (s.anim !== undefined) {
        const t = document.getElementById("deepOceanAnimationToggle");
        if (t) t.checked = !!s.anim;
      }
    }
  }

  function saveAdvSettings() {
    // save clock from full-settings inputs
    const fsFocus = document.getElementById("fsFocus");
    const fsShort = document.getElementById("fsShort");
    const fsLong = document.getElementById("fsLong");
    if (fsFocus && fsShort && fsLong) {
      customFocusInput.value = fsFocus.value;
      customShortInput.value = fsShort.value;
      customLongInput.value = fsLong.value;
      updateModes();
    }

    // save autoStartBreak
    const asbToggle = document.getElementById("autoStartBreakToggle");
    if (asbToggle) {
      autoStartBreak = asbToggle.checked;
      localStorage.setItem("autoStartBreak", autoStartBreak);
    }

    // theme-specific settings (unchanged logic)
    const s = {};
    if (savedTheme === "gradient-default") {
      s.start = document.getElementById("gradientStartColor").value;
      s.end = document.getElementById("gradientEndColor").value;
      const waveCustomEnabled =
        document.getElementById("waveCustomToggle") &&
        document.getElementById("waveCustomToggle").checked;
      s.waveCustomEnabled =
        waveCustomEnabled === undefined ? true : !!waveCustomEnabled;
      if (s.waveCustomEnabled)
        s.waveAccent =
          (document.getElementById("waveAccentColor") &&
            document.getElementById("waveAccentColor").value) ||
          null;
      else s.waveAccent = null;
      s.waveLowQuality = !!(
        document.getElementById("waveLowQualityToggle") &&
        document.getElementById("waveLowQualityToggle").checked
      );
      s.anim = document.getElementById("defaultAnimationToggle").checked;
      applyCustomGradient(s.start, s.end);
      animationEnabled = s.anim;
      localStorage.setItem("timerAnimationEnabled", s.anim);
      if (!s.anim) stopAnimation();
      else startAnimation("gradient-default");
    } else if (savedTheme === "gradient-forest") {
      s.anim = document.getElementById("forestAnimationToggle").checked;
      const leaves = document.getElementById("leaves");
      if (leaves) leaves.style.display = s.anim ? "block" : "none";
    } else if (savedTheme === "gradient-day-night") {
      const activeBtn = document.querySelector(".mode-toggle-btn.active");
      s.mode = activeBtn ? activeBtn.dataset.mode : "realtime";
      s.sliderVal = document.getElementById("dayNightSlider").value;
      applyDNMode(s.mode);
    } else if (
      savedTheme === "gradient-deep-ocean" ||
      savedTheme === "gradient-ocean"
    ) {
      s.speed = document.getElementById("oceanSpeed").value;
      s.tsize = document.getElementById("oceanTireSize").value;
      s.jsize = document.getElementById("oceanJellyfishSize").value;
      const animToggle = document.getElementById("deepOceanAnimationToggle");
      if (animToggle) s.anim = animToggle.checked;
    }

    if (Object.keys(s).length) {
      localStorage.setItem("advSettings_" + savedTheme, JSON.stringify(s));
    }

    if (
      [
        "gradient-default",
        "gradient-forest",
        "gradient-day-night",
        "gradient-deep-ocean",
      ].includes(savedTheme)
    ) {
      applyTheme(savedTheme);
    }

    // SAVE SOUND TOGGLES
    const timerSoundToggle = document.getElementById("timerSoundToggle");
    const breakSoundToggle = document.getElementById("breakSoundToggle");
    const statisticsToggle = document.getElementById("statisticsToggle");

    if (timerSoundToggle) {
      timerSoundEnabled = timerSoundToggle.checked;
      localStorage.setItem("timerSoundEnabled", timerSoundEnabled);
    }
    if (breakSoundToggle) {
      breakSoundEnabled = breakSoundToggle.checked;
      localStorage.setItem("breakSoundEnabled", breakSoundEnabled);
    }
    if (statisticsToggle) {
      statisticsEnabled = statisticsToggle.checked;
      localStorage.setItem("statisticsEnabled", statisticsEnabled);
    }

    closeAdvModal();
  }

  // ── live ocean slider value labels ───────────────────────
  ["oceanSpeed", "oceanTireSize", "oceanJellyfishSize"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        document.getElementById(id + "Value").textContent = el.value;
      });
    }
  });

  // ── Day/Night mode buttons ────────────────────────────────
  document.querySelectorAll(".mode-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".mode-toggle-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.mode;
      const sc = document.getElementById("sliderControlsContainer");
      if (sc) sc.style.display = mode === "slider" ? "block" : "none";
    });
  });

  // ── gradient color pickers live preview ──────────────────
  ["gradientStartColor", "gradientEndColor"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateGradientPreview);
  });

  // live wave accent preview / apply
  const waveAccentEl = document.getElementById("waveAccentColor");
  if (waveAccentEl) {
    const applyWaveAccent = debounce(() => {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      // only save accent if custom enabled
      s.waveAccent = s.waveCustomEnabled === false ? null : waveAccentEl.value;
      localStorage.setItem("advSettings_gradient-default", JSON.stringify(s));
      if (currentAnimation === "wave") {
        stopAnimation();
        startAnimation("gradient-default");
      } else {
        updateWaveContainerGradient("gradient-default");
      }
    }, 260);
    waveAccentEl.addEventListener("input", applyWaveAccent);
  }

  function updateWaveAccentControls() {
    const enabled =
      document.getElementById("waveCustomToggle") &&
      document.getElementById("waveCustomToggle").checked;
    const controls = document.getElementById("waveAccentControls");
    if (controls) controls.style.display = enabled ? "flex" : "none";
  }

  const waveCustomToggle = document.getElementById("waveCustomToggle");
  if (waveCustomToggle)
    waveCustomToggle.addEventListener("change", () => {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      s.waveCustomEnabled = !!waveCustomToggle.checked;
      if (!s.waveCustomEnabled) s.waveAccent = null;
      localStorage.setItem("advSettings_gradient-default", JSON.stringify(s));
      updateWaveAccentControls();
      if (currentAnimation === "wave") {
        stopAnimation();
        startAnimation("gradient-default");
      }
    });

  const waveAccentResetBtn = document.getElementById("waveAccentResetBtn");
  if (waveAccentResetBtn)
    waveAccentResetBtn.addEventListener("click", () => {
      const defaultColor = "#8b5cf6";
      const el = document.getElementById("waveAccentColor");
      if (el) el.value = defaultColor;
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      s.waveAccent = defaultColor;
      s.waveCustomEnabled = true;
      localStorage.setItem("advSettings_gradient-default", JSON.stringify(s));
      if (currentAnimation === "wave") {
        stopAnimation();
        startAnimation("gradient-default");
      } else {
        updateWaveContainerGradient("gradient-default");
      }
    });

  const waveLowQualityToggle = document.getElementById("waveLowQualityToggle");
  if (waveLowQualityToggle)
    waveLowQualityToggle.addEventListener("change", () => {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      s.waveLowQuality = !!waveLowQualityToggle.checked;
      localStorage.setItem("advSettings_gradient-default", JSON.stringify(s));
      if (currentAnimation === "wave") {
        stopAnimation();
        startAnimation("gradient-default");
      }
    });

  // ── gradient presets ─────────────────────────────────────
  document.querySelectorAll(".gradient-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const map = {
        "default-purple": ["#6366f1", "#ec4899"],
        "ocean-classic": ["#0066ff", "#00d4ff"],
        "sunset-classic": ["#ff6b6b", "#feca57"],
        midnight: ["#1a1a2e", "#16213e"],
      };
      const colors = map[btn.dataset.preset];
      if (!colors) return;
      document.getElementById("gradientStartColor").value = colors[0];
      document.getElementById("gradientEndColor").value = colors[1];
      updateGradientPreview();
    });
  });

  function updateGradientPreview() {
    const s =
      (document.getElementById("gradientStartColor") &&
        document.getElementById("gradientStartColor").value) ||
      null;
    const e =
      (document.getElementById("gradientEndColor") &&
        document.getElementById("gradientEndColor").value) ||
      null;
    const p = document.getElementById("customGradientPreview");
    if (p && s && e) p.style.background = `linear-gradient(135deg,${s},${e})`;
  }

  function parseHexColor(color) {
    if (!color) return [255, 255, 255];
    const value = color.trim();
    const rgbMatch = value.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
    );
    if (rgbMatch) {
      return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    }
    let hex = value.replace("#", "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (hex.length !== 6) return [255, 255, 255];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  function rgba(color, alpha) {
    const [r, g, b] = parseHexColor(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // small debounce helper to avoid heavy live-updates
  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function mixHexColors(a, bColor, t) {
    const [r1, g1, b1] = parseHexColor(a);
    const [r2, g2, b2] = parseHexColor(bColor);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const blue = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
  }

  function getWaveColorsForTheme(theme) {
    if (theme === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const saved = safeJSONParse(raw, {});
      const start = saved.start || "#6366f1";
      const end = saved.end || "#ec4899";
      const accent = saved.waveAccent || null;
      const useCustom =
        saved.waveCustomEnabled === undefined
          ? true
          : !!saved.waveCustomEnabled;
      // helper: deepen a color by mixing with black
      const deepen = (hex, t) => mixHexColors(hex, "#000000", t);
      const lighten = (hex, t) => mixHexColors(hex, "#ffffff", t);
      const midBase = mixHexColors(start, end, 0.5);
      // detect brightness to ensure waves show on very dark gradients
      const [mr, mg, mb] = parseHexColor(midBase);
      const lum = 0.2126 * mr + 0.7152 * mg + 0.0722 * mb;
      if (useCustom && accent) {
        // prefer a deeper accent mix to add depth
        const accentDeep = deepen(accent, 0.24);
        const mid = mixHexColors(midBase, accentDeep, 0.36);
        // if base is very dark, lighten a bit for contrast
        const finalMid = lum < 60 ? lighten(mid, 0.14) : mid;
        return [rgba(start, 0.4), rgba(finalMid, 0.3), rgba(end, 0.22)];
      }
      // default: slightly darken the middle to create contrast versus background gradient
      let mid = deepen(midBase, 0.22);
      if (lum < 60) {
        // for dark themes (midnight) make waves lighter and more opaque
        mid = lighten(midBase, 0.18);
        return [rgba(start, 0.46), rgba(mid, 0.36), rgba(end, 0.28)];
      }
      return [rgba(start, 0.34), rgba(mid, 0.26), rgba(end, 0.18)];
    }

    if (theme === "gradient-deep-ocean" || theme === "gradient-ocean") {
      return [
        "rgba(30, 110, 190, 0.16)",
        "rgba(10, 70, 140, 0.1)",
        "rgba(5, 40, 100, 0.06)",
      ];
    }

    if (theme === "gradient-forest") {
      return [
        "rgba(70, 160, 120, 0.14)",
        "rgba(30, 90, 70, 0.1)",
        "rgba(15, 55, 40, 0.06)",
      ];
    }

    if (theme === "gradient-day-night" || theme === "gradient-sunset") {
      return [
        "rgba(220, 110, 70, 0.16)",
        "rgba(190, 95, 40, 0.11)",
        "rgba(160, 70, 35, 0.07)",
      ];
    }

    if (theme === "color-dark") {
      return [
        "rgba(255, 255, 255, 0.12)",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.05)",
      ];
    }

    if (theme === "color-light") {
      return [
        "rgba(50, 50, 50, 0.12)",
        "rgba(80, 80, 80, 0.08)",
        "rgba(100, 100, 100, 0.05)",
      ];
    }

    return [rgba("#7846dc", 0.3), rgba("#b43296", 0.22), rgba("#d2326e", 0.16)];
  }

  function updateWaveContainerGradient(theme) {
    const wc = document.getElementById("waveContainer");
    if (!wc) return;

    if (theme === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const saved = safeJSONParse(raw, {});
      const start = saved.start || "#6366f1";
      const end = saved.end || "#ec4899";
      wc.style.background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    } else {
      wc.style.background = "transparent";
    }
  }

  function applyCustomGradient(start, end) {
    if (animationEnabled) {
      timerContainer.style.background = "transparent";
      updateWaveContainerGradient("gradient-default");
    } else {
      timerContainer.style.background = `linear-gradient(135deg,${start} 0%,${end} 100%)`;
      const wc = document.getElementById("waveContainer");
      if (wc) wc.style.background = "transparent";
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ANIMATION SYSTEM
  // ═══════════════════════════════════════════════════════════
  function applyTheme(theme) {
    stopAnimation();
    stopDNRealtime();
    if (dayNightContainer) dayNightContainer.style.display = "none";
    if (leavesContainer) leavesContainer.style.display = "none";
    if (waveContainer) waveContainer.style.display = "none";
    if (oceanContainer) oceanContainer.style.display = "none";

    if (theme === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      animationEnabled = s.anim !== false;

      if (animationEnabled) {
        timerContainer.style.background = "transparent";
        if (s.start && s.end) {
          updateWaveContainerGradient("gradient-default");
        } else {
          updateWaveContainerGradient("gradient-default");
        }
      } else if (s.start && s.end) {
        timerContainer.style.background = `linear-gradient(135deg,${s.start} 0%,${s.end} 100%)`;
        const wc = document.getElementById("waveContainer");
        if (wc) wc.style.background = "transparent";
      } else {
        timerContainer.style.background = "";
        const wc = document.getElementById("waveContainer");
        if (wc) wc.style.background = "transparent";
      }
    } else if (
      theme === "gradient-deep-ocean" ||
      theme === "gradient-ocean" ||
      theme === "gradient-day-night"
    ) {
      timerContainer.style.background = "transparent";
    } else {
      timerContainer.style.background = "";
    }

    startAnimation(theme);
  }

  function startAnimation(theme) {
    stopAnimation();
    if (theme === "gradient-forest") {
      const raw = localStorage.getItem("advSettings_gradient-forest");
      const saved = safeJSONParse(raw, {});
      const anim = saved.anim !== false;
      if (anim) {
        document.getElementById("leaves").style.display = "block";
        currentAnimation = "leaves";
      }
    } else if (theme === "gradient-deep-ocean" || theme === "gradient-ocean") {
      const oc = document.getElementById("oceanContainer");
      oc.style.display = "block";
      // Make sure the ocean background div is visible
      const oceanBg = document.getElementById("ocean");
      if (oceanBg) oceanBg.style.display = "block";
      // Respect saved deep-ocean animation toggle (check either adv key)
      const raw = getAdvRaw(theme);
      const saved = safeJSONParse(raw, {});
      const anim = saved.anim !== false;
      if (anim) {
        initOcean3D(theme);
        currentAnimation = "ocean3d";
      } else {
        currentAnimation = null;
      }
    } else if (theme === "gradient-day-night") {
      document.getElementById("dayNightContainer").style.display = "block";
      initDayNight();
    } else if (theme === "gradient-default") {
      if (animationEnabled) {
        const wc = document.getElementById("waveContainer");
        if (wc) {
          wc.style.display = "block";
          initWaveAnimation();
          currentAnimation = "wave";
        }
      }
    }
  }

  function stopAnimation() {
    if (leavesContainer) leavesContainer.style.display = "none";
    const wc = waveContainer || document.getElementById("waveContainer");
    const oc = oceanContainer || document.getElementById("oceanContainer");
    const dc =
      dayNightContainer || document.getElementById("dayNightContainer");
    const wCanvas = wc && wc.querySelector("canvas");
    const oCanvas = oc && oc.querySelector("canvas");
    if (wCanvas) wCanvas.remove();
    if (oCanvas) oCanvas.remove();
    if (wc) wc.style.display = "none";
    if (oc) oc.style.display = "none";
    if (dc) dc.style.display = "none";
    currentAnimation = null;
  }

  // ─── wave animation (restored from working version) ─────────────
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
    // allow reduced quality (lower FPS & smaller canvas) to save CPU
    const raw = localStorage.getItem("advSettings_gradient-default");
    const advSaved = safeJSONParse(raw, {});
    const lowQuality = !!advSaved.waveLowQuality;
    const targetFPS = lowQuality ? 16 : 24;
    const frameInterval = 1000 / targetFPS;
    let wavePaused = false;
    document.addEventListener("visibilitychange", () => {
      wavePaused = document.hidden;
    });

    function setSize() {
      const scale = lowQuality ? 0.75 : 1;
      w = canvas.width = Math.max(1000, Math.round(window.innerWidth * scale));
      h = canvas.height = Math.max(520, Math.round(window.innerHeight * scale));
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

      // Draw dramatic, highly complex overlapping waves with strong harmonics
      const waveConfigs = [
        {
          freq: 0.0018,
          amp: h * 0.068,
          speed: 0.18,
          baseY: h * 0.65,
          opacity: 0.7,
          phase: 0,
        },
        {
          freq: 0.0026,
          amp: h * 0.065,
          speed: 0.25,
          baseY: h * 0.7,
          opacity: 0.65,
          phase: Math.PI / 12,
        },
        {
          freq: 0.0032,
          amp: h * 0.07,
          speed: 0.32,
          baseY: h * 0.75,
          opacity: 0.62,
          phase: Math.PI / 8,
        },
        {
          freq: 0.0038,
          amp: h * 0.067,
          speed: 0.38,
          baseY: h * 0.8,
          opacity: 0.58,
          phase: Math.PI / 6,
        },
        {
          freq: 0.0022,
          amp: h * 0.062,
          speed: 0.2,
          baseY: h * 0.85,
          opacity: 0.54,
          phase: Math.PI / 4,
        },
      ];

      const theme = localStorage.getItem("timerTheme") || "gradient-default";
      const [color0, color1, color2] = getWaveColorsForTheme(theme);

      for (const config of waveConfigs) {
        const phase = timeSec * config.speed + config.phase;
        const grd = ctx.createLinearGradient(0, config.baseY, 0, h);

        grd.addColorStop(0, color0);
        grd.addColorStop(0.6, color1);
        grd.addColorStop(1, color2);

        ctx.save();
        ctx.globalAlpha = config.opacity;
        ctx.beginPath();
        ctx.moveTo(0, h);

        const xStep = lowQuality ? 8 : 2;

        for (let x = 0; x <= w + xStep * 2; x += xStep) {
          // Multi-harmonic wave: blend many frequencies for dramatic complexity
          const primary = Math.sin(x * config.freq + phase);
          const harmonic1 =
            0.45 * Math.sin(x * config.freq * 2.1 + phase * 1.2);
          const harmonic2 =
            0.28 * Math.sin(x * config.freq * 3.5 + phase * 0.9);
          const harmonic3 =
            0.15 * Math.sin(x * config.freq * 4.8 + phase * 1.4);
          const wave =
            (primary + harmonic1 + harmonic2 + harmonic3) * config.amp;
          const y = config.baseY + wave;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(w + xStep, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(update);
    }

    setSize();
    window.addEventListener("resize", setSize);
    requestAnimationFrame(update);
  }

  // ─── Ocean 3D (restored from original with full visuals) ───
  function initOcean3D(theme) {
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

  // ═══════════════════════════════════════════════════════════
  //  DAY / NIGHT CYCLE
  // ═══════════════════════════════════════════════════════════
  function initDayNight() {
    const raw = localStorage.getItem("advSettings_gradient-day-night");
    const saved = safeJSONParse(raw, {});
    const mode = saved.mode || "realtime";
    applyDNMode(mode);
  }

  function applyDNMode(mode) {
    stopDNRealtime();
    const sc = document.getElementById("sliderControlsContainer");
    if (sc) sc.style.display = mode === "slider" ? "block" : "none";

    if (mode === "realtime") {
      startDNRealtime();
    } else if (mode === "slider") {
      const raw = localStorage.getItem("advSettings_gradient-day-night");
      const saved = safeJSONParse(raw, {});
      const val = saved.sliderVal !== undefined ? saved.sliderVal : 12;
      updateDNDisplay(val);
      updateDNCycle(parseInt(val));
    }
  }

  function startDNRealtime() {
    function tick() {
      const h = new Date().getHours();
      updateDNCycle(h);
      const sl = document.getElementById("dayNightSlider");
      if (sl) sl.value = h;
    }
    tick();
    dayNightInterval = setInterval(tick, 5000);
  }

  function stopDNRealtime() {
    if (dayNightInterval) {
      clearInterval(dayNightInterval);
      dayNightInterval = null;
    }
  }

  // slider live update
  const _dayNightSlider = document.getElementById("dayNightSlider");
  if (_dayNightSlider)
    _dayNightSlider.addEventListener("input", (e) => {
      const h = parseInt(e.target.value, 10);
      updateDNDisplay(h);
      updateDNCycle(h);
    });

  function updateDNDisplay(h) {
    const el = document.getElementById("dayNightTimeDisplay");
    if (el) el.textContent = String(h).padStart(2, "0") + ":00";
  }

  function getDayNightSkyProps(hour) {
    let top, mid, bottom, worldBg, borderColor, starOpacity;

    if (hour >= 5 && hour < 9) {
      const p = (hour - 5) / 4;
      top = mixHexColors("#87c5ff", "#9eceff", p);
      mid = mixHexColors("#f7d9a2", "#fde4bd", p);
      bottom = mixHexColors("#fff5e1", "#fff9f1", p);
      worldBg = `radial-gradient(circle at 50% 42%, rgba(255,235,180,0.18), transparent 42%), radial-gradient(circle at 62% 68%, rgba(9,41,86,0.22), rgba(6,18,42,0.92))`;
      borderColor = "#b8843e";
      starOpacity = 0.05 * (1 - p);
    } else if (hour >= 9 && hour < 17) {
      const p = (hour - 9) / 8;
      top = mixHexColors("#86d4ff", "#63b8ff", p);
      mid = mixHexColors("#d4f1ff", "#98dfff", p);
      bottom = mixHexColors("#e8f7ff", "#cbefff", p);
      worldBg = `radial-gradient(circle at 45% 40%, rgba(255,255,255,0.16), transparent 42%), radial-gradient(circle at 58% 68%, rgba(9,45,89,0.18), rgba(6,18,40,0.88))`;
      borderColor = "#9a6b2c";
      starOpacity = 0;
    } else if (hour >= 17 && hour < 20) {
      const p = (hour - 17) / 3;
      top = mixHexColors("#2b3b72", "#a74f66", p);
      mid = mixHexColors("#f28e6c", "#f5b88d", p);
      bottom = mixHexColors("#f8d5c0", "#f0d3b1", p);
      worldBg = `radial-gradient(circle at 50% 38%, rgba(255,200,130,0.16), transparent 40%), radial-gradient(circle at 56% 64%, rgba(12,28,60,0.24), rgba(6,14,36,0.9))`;
      borderColor = "#c3795b";
      starOpacity = 0.15 * p;
    } else {
      const p = hour >= 20 ? (hour - 20) / 4 : (hour + 4) / 4;
      top = mixHexColors("#041330", "#081e4e", p);
      mid = mixHexColors("#071d46", "#05112a", p);
      bottom = mixHexColors("#020512", "#04081b", p);
      worldBg = `radial-gradient(circle at 50% 42%, rgba(68,110,180,0.12), transparent 45%), radial-gradient(circle at 54% 64%, rgba(9,20,45,0.3), rgba(2,8,20,0.96))`;
      borderColor = "#4f7bc7";
      starOpacity = 0.24;
    }

    return { top, mid, bottom, worldBg, borderColor, starOpacity };
  }

  function updateDNCycle(hour) {
    const sun = document.getElementById("sun");
    const moon = document.getElementById("moon");
    const world = document.getElementById("world");
    const sky = document.getElementById("dayNightContainer");
    if (!sun || !moon || !world || !sky) return;

    const { top, mid, bottom, worldBg, borderColor, starOpacity } =
      getDayNightSkyProps(hour);
    const worldWidth = world.offsetWidth || 380;
    const travel = Math.max(180, worldWidth * 0.45);

    let sunLeft = 100;
    let moonLeft = 100;
    let sunTop = 450;
    let moonTop = 450;

    if (hour >= 5 && hour < 19) {
      const p = (hour - 5) / 14;
      sunLeft = 80 + travel * p;
      sunTop = 300 - p * 260;
      moonTop = 450;
      moonLeft = 80;
      sun.style.opacity = "1";
      moon.style.opacity = "0.08";
    } else {
      const p = hour >= 19 ? (hour - 19) / 5 : (hour + 5) / 5;
      moonLeft = 80 + travel * p;
      moonTop = 280 - p * 200;
      sunTop = 450;
      sunLeft = 80;
      sun.style.opacity = "0";
      sun.style.visibility = "hidden";
      moon.style.opacity = "1";
      moon.style.visibility = "visible";
    }

    if (hour >= 5 && hour < 19) {
      sun.style.opacity = "1";
      sun.style.visibility = "visible";
      moon.style.opacity = "0";
      moon.style.visibility = "hidden";
    }

    sun.style.left = sunLeft + "px";
    moon.style.left = moonLeft + "px";
    sun.style.top = sunTop + "px";
    moon.style.top = moonTop + "px";

    sky.style.background =
      `radial-gradient(circle at 50% 8%, rgba(255,255,255,0.18), transparent 18%),` +
      `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bottom} 100%)`;
    sky.style.setProperty("--stars-opacity", starOpacity.toFixed(3));
    if (world) {
      world.style.background = worldBg;
      world.style.borderColor = borderColor;
    }
  }

  // ── custom timer inputs (carry over from original) ────────
  const customFocus = document.getElementById("customFocus");
  const customShort = document.getElementById("customShort");
  const customLong = document.getElementById("customLong");

  // ═══════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════
  function initEnhancedSystem() {
    // restore custom gradient if on default theme
    if (savedTheme === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      if (s.start && s.end) applyCustomGradient(s.start, s.end);
      if (s.anim === false) animationEnabled = false;
      else if (s.anim === true) animationEnabled = true;
    }
    applyAutoBreakToggle();
    applyTheme(savedTheme);
  }

  // ============ PLANNER LOGIC ============
  const plannerBtn = document.getElementById("plannerBtn");
  const plannerModal = document.getElementById("plannerModal");
  const plannerAddBtn = document.getElementById("plannerAddBtn");
  const taskPopup = document.getElementById("taskPopup");
  const taskPopupClose = document.getElementById("taskPopupClose");
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  const taskPopupCancelBtn = document.getElementById("taskPopupCancelBtn");
  const categoryChips = document.querySelectorAll(".category-chip");
  let tasks = safeJSONParse(localStorage.getItem("plannerTasks"), []) || [];
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
      taskList.innerHTML = "";
      taskList.appendChild(
        createSafeElement(
          "div",
          { class: "planner-empty" },
          "No tasks yet. Add one to keep the day moving.",
        ),
      );
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
          ? "category-" +
            sanitizeInput(task.category).toLowerCase().replace(/\s+/g, "-")
          : "";
        const priorityClass = task.priority
          ? "priority-" + sanitizeInput(task.priority).toLowerCase()
          : "priority-normal";

        taskItem.innerHTML = ""; // Clear first
        const taskInfoDiv = createSafeElement("div", { class: "task-info" });
        const taskTitle = createSafeElement(
          "h4",
          { class: "task-title" },
          sanitizeInput(task.title || "Untitled"),
        );
        taskInfoDiv.appendChild(taskTitle);

        const taskMetaDiv = createSafeElement("div", { class: "task-meta" });
        if (task.category) {
          const catSpan = createSafeElement(
            "span",
            { class: `tag-category ${categoryClass}` },
            sanitizeInput(task.category),
          );
          taskMetaDiv.appendChild(catSpan);
        }
        if (task.subject) {
          const subjSpan = createSafeElement(
            "span",
            { class: "tag-subject" },
            sanitizeInput(task.subject),
          );
          taskMetaDiv.appendChild(subjSpan);
        }
        const priClass =
          task.priority || task.priority === ""
            ? priorityClass
            : "priority-normal";
        const priSpan = createSafeElement(
          "span",
          { class: `tag-priority ${priClass}` },
          sanitizeInput(task.priority || "Normal"),
        );
        taskMetaDiv.appendChild(priSpan);

        if (task.dueDate) {
          const dueSpan = createSafeElement(
            "span",
            { class: "tag-due" },
            new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          );
          taskMetaDiv.appendChild(dueSpan);
        }

        if (task.estimate) {
          const estSpan = createSafeElement(
            "span",
            { class: "tag-estimate" },
            sanitizeInput(task.estimate),
          );
          taskMetaDiv.appendChild(estSpan);
        }
        taskInfoDiv.appendChild(taskMetaDiv);

        if (task.notes) {
          const notesDiv = createSafeElement(
            "div",
            { class: "task-notes" },
            sanitizeInput(task.notes),
          );
          taskInfoDiv.appendChild(notesDiv);
        }

        taskItem.appendChild(taskInfoDiv);

        const taskActionsDiv = createSafeElement("div", {
          class: "task-actions",
        });

        const doneBtn = createSafeElement("button", {
          class: `task-done-toggle ${task.status === "done" ? "checked" : ""}`,
        });
        doneBtn.textContent = task.status === "done" ? "✓" : "○";
        doneBtn.addEventListener("click", () =>
          window.updateTaskStatus(task.id),
        );
        taskActionsDiv.appendChild(doneBtn);

        const editBtn = createSafeElement("button", {
          class: "task-edit-btn",
        });
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => window.openTaskPopup(task.id));
        taskActionsDiv.appendChild(editBtn);

        const deleteBtn = createSafeElement("button", {
          class: "task-delete-btn",
        });
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => window.deleteTask(task.id));
        taskActionsDiv.appendChild(deleteBtn);

        taskItem.appendChild(taskActionsDiv);
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
    if (!summary) return;

    summary.innerHTML = "";

    const statsLine = createSafeElement("div", {
      class: "planner-summary-line",
    });
    statsLine.appendChild(
      createSafeElement("span", { class: "planner-summary-item" }, `Tasks: `),
    );
    statsLine.appendChild(createSafeElement("strong", {}, String(all)));
    statsLine.appendChild(
      createSafeElement("span", { class: "planner-summary-done" }, `Done: `),
    );
    statsLine.appendChild(createSafeElement("strong", {}, String(done)));
    statsLine.appendChild(
      createSafeElement(
        "span",
        { class: "planner-summary-overdue" },
        `Overdue: `,
      ),
    );
    statsLine.appendChild(createSafeElement("strong", {}, String(overdue)));

    const filterBar = createSafeElement("div", {
      class: "planner-filter-bar",
    });

    ["active", "done", "overdue"].forEach((filter) => {
      const button = createSafeElement(
        "button",
        {
          type: "button",
          class: `planner-filter-btn ${currentFilter === filter ? "active" : ""}`,
        },
        filter.charAt(0).toUpperCase() + filter.slice(1),
      );
      button.addEventListener("click", () => window.setFilter(filter));
      filterBar.appendChild(button);
    });

    summary.appendChild(statsLine);
    summary.appendChild(filterBar);
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < new Date();
  }

  function openTaskPopup(taskId = null) {
    if (!taskPopup) {
      console.error("Task popup element not found");
      return;
    }

    currentTaskId = taskId;
    const titleInput = document.getElementById("taskTitle");
    const notesInput = document.getElementById("taskNotes");
    const dueDateInput = document.getElementById("taskDueDate");
    const categoryInput = document.getElementById("taskCategory");
    const subjectInput = document.getElementById("taskSubject");
    const prioritySelect = document.getElementById("taskPriority");
    const estimateInput = document.getElementById("taskEstimate");

    // Clear all category chips selection
    if (categoryChips && categoryChips.length) {
      categoryChips.forEach((chip) => chip.classList.remove("selected"));
    }

    // Only set categoryInput if it exists
    if (categoryInput) {
      categoryInput.value = "";
    }

    if (taskId) {
      const task = getTasks().find((t) => t.id === taskId);
      if (task) {
        if (titleInput) titleInput.value = task.title || "";
        if (notesInput) notesInput.value = task.notes || "";
        if (dueDateInput) dueDateInput.value = task.dueDate || "";
        if (categoryInput) categoryInput.value = task.category || "";
        if (subjectInput) subjectInput.value = task.subject || "";
        if (prioritySelect) prioritySelect.value = task.priority || "";
        if (estimateInput) estimateInput.value = task.estimate || "";

        if (task.category && categoryChips && categoryChips.length) {
          const selectedChip = Array.from(categoryChips).find(
            (c) => c.dataset.category === task.category,
          );
          if (selectedChip) selectedChip.classList.add("selected");
        }
      }
    } else {
      if (titleInput) titleInput.value = "";
      if (notesInput) notesInput.value = "";
      if (dueDateInput) dueDateInput.value = "";
      if (categoryInput) categoryInput.value = "";
      if (subjectInput) subjectInput.value = "";
      if (prioritySelect) prioritySelect.value = "";
      if (estimateInput) estimateInput.value = "";
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

  if (plannerBtn) {
    plannerBtn.addEventListener("click", () => {
      if (plannerModal) plannerModal.classList.toggle("open");
    });
  }

  if (plannerModal) {
    plannerModal.addEventListener("click", (e) => {
      if (e.target === plannerModal) {
        plannerModal.classList.remove("open");
      }
    });
  }

  if (taskPopup) {
    taskPopup.addEventListener("click", (e) => {
      if (e.target === taskPopup) {
        closeTaskPopup();
      }
    });
  }

  if (categoryChips && categoryChips.length) {
    categoryChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        categoryChips.forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        const catEl = document.getElementById("taskCategory");
        if (catEl) catEl.value = chip.dataset.category;
      });
    });
  }

  if (plannerAddBtn)
    plannerAddBtn.addEventListener("click", () => openTaskPopup());
  if (taskPopupClose) taskPopupClose.addEventListener("click", closeTaskPopup);
  if (taskPopupCancelBtn)
    taskPopupCancelBtn.addEventListener("click", closeTaskPopup);
  if (saveTaskBtn) saveTaskBtn.addEventListener("click", saveTask);

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
    if (themeModal) themeModal.classList.remove("open");
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

    chartArea.innerHTML = "";
    dayData.forEach((d) => {
      const fh = Math.round((d.focus / maxMins) * 82);
      const bh = Math.round((d.brk / maxMins) * 82);
      const wrap = createSafeElement("div", { class: "chart-bar-wrap" });

      if (d.focus > 0) {
        wrap.appendChild(
          createSafeElement("div", {
            class: "chart-bar study-bar",
            style: `height:${fh}px`,
            "data-tip": `${d.focus}min study`,
          }),
        );
      }

      if (d.brk > 0) {
        wrap.appendChild(
          createSafeElement("div", {
            class: "chart-bar break-bar",
            style: `height:${bh}px`,
            "data-tip": `${d.brk}min break`,
          }),
        );
      }

      if (d.focus === 0 && d.brk === 0) {
        wrap.appendChild(
          createSafeElement("div", {
            style:
              "height:3px;width:100%;border-radius:2px;background:rgba(255,255,255,0.04)",
          }),
        );
      }

      chartArea.appendChild(wrap);
    });

    xLabels.innerHTML = "";
    dayData.forEach((d) => {
      xLabels.appendChild(
        createSafeElement("span", { class: "chart-x-label" }, d.label),
      );
    });
  }

  function renderSubjectList(data) {
    const list = document.getElementById("subjectList");
    if (!list) return;
    const st = data.subjectTime || {};
    const entries = Object.entries(st).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      list.innerHTML = "";
      list.appendChild(
        createSafeElement(
          "p",
          { class: "analytics-empty" },
          "No subject data yet",
        ),
      );
      return;
    }
    const maxMins = entries[0][1];
    list.innerHTML = "";
    entries.forEach(([subj, mins], i) => {
      const pct = Math.round((mins / maxMins) * 100);
      const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
      const hrs =
        mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

      const row = createSafeElement("div", { class: "subject-row" });
      const topRow = createSafeElement("div", { class: "subject-row-top" });
      topRow.appendChild(
        createSafeElement(
          "span",
          { class: "subject-name" },
          sanitizeInput(subj),
        ),
      );
      topRow.appendChild(
        createSafeElement("span", { class: "subject-time" }, hrs),
      );
      row.appendChild(topRow);

      const progress = createSafeElement("div", { class: "subject-progress" });
      const fill = createSafeElement("div", {
        class: "subject-progress-fill",
        style: `width:0%;background:${color}`,
        "data-pct": `${pct}`,
      });
      progress.appendChild(fill);
      row.appendChild(progress);
      list.appendChild(row);
    });

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
      log.innerHTML = "";
      log.appendChild(
        createSafeElement("p", { class: "analytics-empty" }, "No sessions yet"),
      );
      return;
    }

    log.className = "session-log" + (sessionLogExpanded ? " expanded" : "");
    log.innerHTML = "";

    show.forEach((s) => {
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

      const entry = createSafeElement("div", { class: "session-entry" });
      entry.appendChild(
        createSafeElement("div", {
          class: `session-dot ${isFocus ? "focus" : "break"}`,
        }),
      );

      const info = createSafeElement("div", {
        class: "session-entry-info",
      });
      info.appendChild(
        createSafeElement(
          "span",
          { class: "session-entry-title" },
          sanitizeInput(title),
        ),
      );
      info.appendChild(
        createSafeElement(
          "span",
          {
            class: "session-entry-sub",
          },
          dateStr,
        ),
      );
      entry.appendChild(info);
      entry.appendChild(
        createSafeElement("span", { class: "session-entry-duration" }, dur),
      );
      log.appendChild(entry);
    });

    if (toggleSessionBtn) {
      toggleSessionBtn.textContent = sessionLogExpanded
        ? "Show less"
        : `Show all (${sessions.length})`;
    }
  }

  // Event listeners
  const _openStatsBtn = document.getElementById("openStatsModalBtn");
  if (_openStatsBtn) _openStatsBtn.addEventListener("click", openAnalytics);
  if (analyticsBackdrop)
    analyticsBackdrop.addEventListener("click", closeAnalytics);
  if (analyticsCloseBtn)
    analyticsCloseBtn.addEventListener("click", closeAnalytics);

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

  if (toggleSessionBtn)
    toggleSessionBtn.addEventListener("click", () => {
      sessionLogExpanded = !sessionLogExpanded;
      const data = getFilteredStats(analyticsRange);
      renderSessionLog(data);
    });

  if (statsResetBtn2)
    statsResetBtn2.addEventListener("click", () => {
      if (confirm("Reset all statistics? This cannot be undone.")) {
        resetStats();
        renderAnalytics();
      }
    });

  if (statsExportBtn)
    statsExportBtn.addEventListener("click", () => {
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
  initEnhancedSystem();

  // ── Developer: Toggle update notice popup with Alt+Shift+, (requires ?dev=true) ─────
  const isDev =
    new URLSearchParams(window.location.search).get("dev") === "true";
  if (isDev) {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.shiftKey && e.key === "<") {
        e.preventDefault();
        if (updateNoticePopup && updateNoticePopup.classList.contains("open")) {
          closeUpdateNoticePopup();
        } else {
          openUpdateNoticePopup();
        }
      }
    });
  }
});
