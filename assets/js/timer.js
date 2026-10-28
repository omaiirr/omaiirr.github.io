// Timer UI, settings, and session flow logic.
document.addEventListener("DOMContentLoaded", function () {
  function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function createSafeElement(tagName, attrs = {}, textContent = "") {
    const el = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith("on")) return; 
      el.setAttribute(key, String(value));
    });
    if (textContent) el.textContent = textContent;
    return el;
  }

  function sanitizeInput(str, maxLength = 500) {
    if (!str) return "";
    return String(str)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .substring(0, maxLength);
  }

  const UNSPECIFIED_LABEL = "Unspecified";

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
  function formatStudyMinutes(total) {
    if (typeof StatsMetrics !== "undefined")
      return StatsMetrics.formatMinutes(total);
    const mins = Math.max(0, Math.round(total || 0));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  function subjectTotals(sessions) {
    const totals = {};
    (sessions || [])
      .filter((s) => s.type === "focus")
      .forEach((s) => {
        const key = String(s.subject || "").trim() || UNSPECIFIED_LABEL;
        totals[key] = (totals[key] || 0) + s.duration;
      });
    return totals;
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

      stats.subjectTime = subjectTotals(stats.sessions);
    } else {
      stats.totalBreakTime += duration;
    }
    saveStats(stats);
  }

  /* Stopwatch lives in its own module; give it the same logging path so a
     reset there lands in the same session log. Takes milliseconds — the
     stopwatch's natural unit — and converts to the minutes the stats store. */
  window.logStudySession = function (type, ms) {
    if (!(ms > 0) || !statisticsEnabled) return;
    logSession(type, ms / 60000);
  };
  function resetStats() {
    localStorage.removeItem("timerStats");
  }
  const RANGE_LABELS = {
    today: "Today",
    week: "This week",
    month: "This month",
    all: "All time",
  };

  const EMPTY_SUBJECTS = {
    today: "No subject data today",
    week: "No subject data this week",
    month: "No subject data this month",
    all: "No subject data yet",
  };

  const EMPTY_SESSIONS = {
    today: "No sessions today",
    week: "No sessions this week",
    month: "No sessions this month",
    all: "No sessions yet",
  };

  function updateStatsDisplay() {
    const range = getQuickStatsRange();
    const stats = getFilteredStats(range, getStats());
    const elem1 = document.getElementById("totalStudyTime");
    const elem2 = document.getElementById("totalBreakTime");
    const elem3 = document.getElementById("totalSessions");
    if (elem1)
      elem1.textContent = formatStudyMinutes(stats.totalStudyTime || 0);
    if (elem2)
      elem2.textContent = formatStudyMinutes(stats.totalBreakTime || 0);
    if (elem3)

      elem3.textContent = String(
        stats.sessions.filter((s) => s.type === "focus").length,
      );

    const scope = document.getElementById("qsStatsScope");
    if (scope) scope.textContent = RANGE_LABELS[range] || RANGE_LABELS.all;

    const subjectBreakdown = document.getElementById("subjectBreakdown");
    if (subjectBreakdown) {
      const entries = Object.entries(subjectTotals(stats.sessions)).sort(
        (a, b) => b[1] - a[1],
      );
      subjectBreakdown.innerHTML = "";
      if (!entries.length) {

        subjectBreakdown.appendChild(
          createSafeElement(
            "p",
            { class: "qs-empty" },
            EMPTY_SUBJECTS[range] || EMPTY_SUBJECTS.all,
          ),
        );
        applyAnalyticsCount(0);
        return;
      }

      const capped = entries.slice(0, 3);
      const peak = capped.length ? capped[0][1] : 0;
      capped.forEach(([subj, mins]) => {
        const itemDiv = createSafeElement("div", { class: "qs-subject" });
        itemDiv.appendChild(
          createSafeElement(
            "span",
            { class: "qs-subject-name" },
            sanitizeInput(subj),
          ),
        );
        const bar = createSafeElement("span", { class: "qs-subject-bar" });
        const share = peak ? Math.max(4, Math.round((mins / peak) * 100)) : 0;
        bar.appendChild(createSafeElement("i", { style: `width:${share}%` }));
        itemDiv.appendChild(bar);
        itemDiv.appendChild(
          createSafeElement(
            "span",
            { class: "qs-subject-amt" },
            formatStudyMinutes(mins),
          ),
        );
        subjectBreakdown.appendChild(itemDiv);
      });

      applyAnalyticsCount(entries.length);
    }
  }

  function applyAnalyticsCount(totalSubjects) {
    const hidden = Math.max(0, (totalSubjects || 0) - 3);
    const count = document.getElementById("qsAnalyticsCount");
    const cta = document.getElementById("qsOpenAnalyticsBtn");
    if (count) {
      count.textContent = hidden ? `+${hidden} more` : "";
      count.hidden = !hidden;
    }
    if (cta)
      cta.setAttribute(
        "aria-label",
        hidden
          ? `Open Study Analytics, ${hidden} more subject${hidden === 1 ? "" : "s"}`
          : "Open Study Analytics",
      );
  }

  function getQuickStatsRange() {
    const stored = localStorage.getItem("quickStatsRange");
    return RANGE_LABELS[stored] ? stored : "all";
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

  /* A duration field is a number of minutes between 1 and 999. Anything else
     (empty, "abc", -5, 0) used to reach the timer as 0 or NaN and render a
     00:00 or "-5 : 00" clock that could be started. */
  const MIN_MINUTES = 1;
  const MAX_MINUTES = 999;

  function clampMinutes(raw, fallback) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < MIN_MINUTES) return fallback;
    return Math.min(n, MAX_MINUTES);
  }

  function updateModes() {
    modes.focus = clampMinutes(customFocusInput.value, 25) * 60;
    modes.short = clampMinutes(customShortInput.value, 5) * 60;
    modes.long = clampMinutes(customLongInput.value, 15) * 60;
    customFocusInput.value = modes.focus / 60;
    customShortInput.value = modes.short / 60;
    customLongInput.value = modes.long / 60;
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
    
    if (typeof window.restoreActiveTheme === "function")
      window.restoreActiveTheme();
  }

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
    
    playBeep(880, 0.15, 0.25);
    setTimeout(() => playBeep(880, 0.15, 0.25), 200);
    setTimeout(() => playBeep(880, 0.15, 0.25), 400);
  }
  function playBreakStartSound() {
    if (!breakSoundEnabled) return;
    
    playBeep(440, 0.3, 0.3);
    setTimeout(() => playBeep(523, 0.3, 0.3), 320);
    setTimeout(() => playBeep(659, 0.5, 0.3), 640);
  }
  function playFocusStartSound() {
    if (!breakSoundEnabled) return;
    
    playBeep(659, 0.3, 0.3);
    setTimeout(() => playBeep(523, 0.3, 0.3), 320);
    setTimeout(() => playBeep(440, 0.5, 0.3), 640);
  }

  /* A finished block used to change the mode silently — heard only if sound
     was on. The toast is the app's existing non-blocking notice surface, and
     it is announced to screen readers, so the switch is obvious either way. */
  function announceSessionEnd(nextMode) {
    let message;
    if (nextMode === "focus") {
      message = "Break over — back to focus.";
    } else if (nextMode === "short" || nextMode === "long") {
      const minutes = Math.round((modes[nextMode] || 0) / 60);
      message = `Focus session complete — ${minutes}-minute break starting.`;
    } else {
      message = "Focus session complete — take a break when you are ready.";
    }
    if (typeof ThemeEngine !== "undefined" && ThemeEngine._showNotice) {
      ThemeEngine._showNotice(message, "success", 6000);
      return;
    }
    if (typeof window.showToast === "function") window.showToast(message);
  }

  let endTime = null;
  let timerTick = null;
  let warningPlayed = false;
  /* Banked active time for the current session, excluding every pause, plus
     the timestamp the current run segment started (null while paused/reset).
     A countdown alone cannot answer "how much of this session was real
     focus time?" once a pause has happened, so the pause boundary is recorded
     as it happens and summed on reset. */
  let sessionElapsedMs = 0;
  let segmentStart = null;

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
      /* Two tick sources can see the end at once (this document and the mini
         player). Handling a finished session exactly once keeps the log and
         the break start from doubling up. */
      if (endTime === null) return;
      endTime = null;

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
      sessionElapsedMs = 0;
      segmentStart = null;
      remaining = 0;
      render();

      setTimeout(() => {
        if (currentMode === "focus") {
          if (autoStartBreak) {
            setActiveMode("short");
            playBreakStartSound();
            announceSessionEnd("short");
            setTimeout(() => toggleTimer(), 800);
          } else {
            remaining = modes.focus;
            warningPlayed = false;
            render();
            announceSessionEnd(null);
          }
        } else {
          setActiveMode("focus");
          playFocusStartSound();
          announceSessionEnd("focus");
          setTimeout(() => toggleTimer(), 800);
        }
      }, 500);
    }
  }

  function toggleTimer() {
    if (running) {
      
      if (timerTick) clearInterval(timerTick);
      timerTick = null;
      running = false;
      /* Bank this run segment before freezing the clock, so pause time is
         excluded and the session keeps its accumulated active time. */
      if (segmentStart) {
        sessionElapsedMs += Date.now() - segmentStart;
        segmentStart = null;
      }
      remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      render();
      startBtn.textContent = "Start";
      startBtn.classList.remove("pause-state");
    } else {
      if (!(remaining > 0)) return;
      running = true;
      warningPlayed = false;
      segmentStart = Date.now();
      endTime = Date.now() + remaining * 1000;
      updateTimerDisplay();
      timerTick = setInterval(updateTimerDisplay, 250);
      startBtn.textContent = "Pause";
      startBtn.classList.add("pause-state");
    }
  }
  window.toggleTimer = toggleTimer;

  document.addEventListener("visibilitychange", () => {
    if (running && !document.hidden) updateTimerDisplay();
  });

  function resetTimer() {
    /* Log the partial session first: elapsed active time since the session
       began, excluding time spent paused. Without this a reset silently
       discarded every unfinished minute. Zero-first after the read so a
       double-click cannot log the same span twice. */
    const elapsedMs =
      sessionElapsedMs +
      (running && segmentStart ? Date.now() - segmentStart : 0);
    sessionElapsedMs = 0;
    segmentStart = null;
    if (elapsedMs > 0) logSession(currentMode, elapsedMs / 60000);

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

  /* ── Picture-in-Picture ───────────────────────────────────────────────
     One window, driven from this document.

     The previous version injected a <script> into the PiP document that
     reached back through window.opener on a 250ms interval, and a second
     interval called pipWindow.focus() every 1.2s to fake "always on top".
     That stole keyboard focus from whatever the user was typing in, and
     because Document PiP windows do not reliably fire `beforeunload`,
     closing the mini player with its own X left the toggle lit and the loop
     running.

     Now the PiP DOM is built once, wired from this window, and updated by a
     single interval that also watches `.closed` — which every API reports.
     Closing is idempotent, so the in-window X, the toolbar button, the OS
     close or a crashed window all land in the same clean state.
  */
  let pipWindow = null;
  let pipSyncTimer = null;
  let pipRefs = null;
  let pipOpening = false;
  let pipThemeKey = "";

  const PIP_ICON_PLAY = "M8 5v14l11-7z";
  const PIP_ICON_PAUSE = "M7 5h4v14H7zM13 5h4v14h-4z";
  const PIP_ICON_RESET =
    "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5";
  const PIP_ICON_CLOSE = "M6 6 18 18M18 6 6 18";

  const pipToggles = Array.from(
    document.querySelectorAll("#pipBtn, #swPipBtn"),
  );

  function supportsDocumentPiP() {
    return !!(
      typeof window !== "undefined" &&
      window.documentPictureInPicture &&
      typeof window.documentPictureInPicture.requestWindow === "function"
    );
  }

  function setPipToggleActive(on) {
    pipToggles.forEach((b) => {
      b.classList.toggle("active", !!on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function pipIsStopwatch() {
    return !!(
      document.body && document.body.classList.contains("sw-mode-active")
    );
  }

  function pipClockText(raw) {
    const digits = String(raw || "").replace(/[^0-9:]/g, "");
    const parts = digits.split(":");
    const mm = (parts[0] || "").slice(-2);
    const ss = (parts[1] || "").slice(0, 2);
    if (!mm) return "00:00";
    return mm.padStart(2, "0") + ":" + (ss || "00").padStart(2, "0");
  }

  function pipTimeToSeconds(text) {
    const parts = String(text).split(":");
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }

  function pipModeTotalSeconds() {
    const key =
      currentMode === "short"
        ? "short"
        : currentMode === "long"
          ? "long"
          : "focus";
    return modes[key] || 0;
  }

  // Read the live page once so the mini player stays in sync.
  function readPipState() {
    const stopwatch = pipIsStopwatch();
    let clock = "";
    let label = "Study";
    let playing = false;
    let progress = null;
    let resetDisabled = false;

    if (stopwatch) {
      /* Prefer the live elapsed value: the stopwatch DOM only advances when
         its own 50ms interval runs, which browsers throttle on a hidden tab. */
      const swMs =
        typeof window.getStopwatchMs === "function"
          ? window.getStopwatchMs()
          : null;
      if (typeof swMs === "number" && isFinite(swMs)) {
        const totalSec = Math.max(0, Math.floor(swMs / 1000));
        clock =
          String(Math.floor(totalSec / 60)).padStart(2, "0") +
          ":" +
          String(totalSec % 60).padStart(2, "0");
      } else {
        clock = pipClockText(
          (document.getElementById("swDisplay") || {}).textContent,
        );
      }
      label = "Stopwatch";
      playing = /pause/i.test(
        (document.getElementById("swStartBtn") || {}).textContent || "",
      );
      resetDisabled = !!(document.getElementById("swResetBtn") || {}).disabled;
    } else {
      clock = pipClockText(display ? display.textContent : "");
      const active = document.querySelector(".mode-btn.active");
      if (active) label = String(active.textContent || "").trim() || label;
      playing = /pause/i.test((startBtn && startBtn.textContent) || "");
      // Use endTime while running so throttled tabs do not freeze the PiP clock.
      if (running && endTime) {
        const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        clock =
          String(Math.floor(left / 60)).padStart(2, "0") +
          ":" +
          String(left % 60).padStart(2, "0");
      }
      const total = pipModeTotalSeconds();
      if (total > 0) {
        const left = pipTimeToSeconds(clock);
        progress = Math.max(0, Math.min(1, (total - left) / total));
      }
    }

    const rootStyle = getComputedStyle(document.documentElement);
    return {
      clock: clock || "00:00",
      label,
      playing,
      progress,
      resetDisabled,
      accent: (rootStyle.getPropertyValue("--th-accent") || "").trim(),
    };
  }

  function applyPiPState() {
    if (!pipWindow) return;
    if (pipWindow.closed) {
      handlePiPClosed();
      return;
    }
    if (!pipRefs) return;

    // If the hidden tab missed the end, finish the session here before the break starts.
    if (!pipIsStopwatch() && running && endTime && Date.now() >= endTime) {
      updateTimerDisplay();
    }
    const s = readPipState();
    const refs = pipRefs;

    if (refs.display && refs.display.textContent !== s.clock)
      refs.display.textContent = s.clock;
    if (refs.chipText && refs.chipText.textContent !== s.label)
      refs.chipText.textContent = s.label;

    if (s.progress === null) {
      if (refs.track) refs.track.classList.add("is-hidden");
    } else {
      if (refs.track) refs.track.classList.remove("is-hidden");
      if (refs.fill)
        refs.fill.style.width = (s.progress * 100).toFixed(1) + "%";
    }

    const iconPath = s.playing ? PIP_ICON_PAUSE : PIP_ICON_PLAY;
    if (refs.controlIcon && refs.controlIcon.getAttribute("d") !== iconPath)
      refs.controlIcon.setAttribute("d", iconPath);
    const controlLabel = s.playing ? "Pause" : "Start";
    if (refs.controlLabel && refs.controlLabel.textContent !== controlLabel)
      refs.controlLabel.textContent = controlLabel;

    if (refs.resetBtn) refs.resetBtn.disabled = s.resetDisabled;
    if (refs.card && s.accent)
      refs.card.style.setProperty("--pip-accent", s.accent);

    // Keep the PiP backdrop border in sync when the app theme changes.
    const themeKey =
      savedTheme + "|" + (localStorage.getItem("activeCustomThemeId") || "");
    if (themeKey !== pipThemeKey) {
      pipThemeKey = themeKey;
      const pipDoc = pipWindow.document;
      if (pipDoc && pipDoc.body)
        pipDoc.body.style.background = getPiPThemeBackground(savedTheme);
    }
  }


  function getPiPThemeBackground(theme) {
    const custom =
      typeof ThemeEngine !== "undefined"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    if (custom && custom.bg) {
      if (custom.bg.type === "solid" && custom.bg.color) {
        return custom.bg.color;
      }
      if (custom.bg.type === "gradient" && custom.bg.gradStops?.length >= 2) {
        const angle = custom.bg.gradAngle ?? 135;
        const stops = custom.bg.gradStops
          .map((stop) => `${stop.color} ${stop.pos}%`)
          .join(", ");
        return `linear-gradient(${angle}deg, ${stops})`;
      }
      return custom.colors?.surface || custom.colors?.accent || "#2d2d2d";
    }

    const raw = localStorage.getItem("advSettings_" + theme);
    if (theme === "gradient-default") {
      const saved = safeJSONParse(raw, {});
      if (saved.start && saved.end) {
        return `linear-gradient(135deg, ${saved.start} 0%, ${saved.end} 50%, ${saved.end} 100%)`;
      }
      return "linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%)";
    }
    if (theme === "gradient-deep-ocean" || theme === "gradient-ocean") {
      return "linear-gradient(135deg, #0066ff 0%, #00d4ff 100%)";
    }
    if (theme === "gradient-forest") {
      return "linear-gradient(135deg, #134e5e 0%, #71b280 100%)";
    }
    if (theme === "gradient-glow") {
      return "linear-gradient(135deg, #ff9a56 0%, #ff6b6b 50%, #f43f5e 100%)";
    }
    if (theme === "gradient-bloom") {
      return "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 50%, #ec4899 100%)";
    }
    if (theme === "color-dark") {
      return "#000000";
    }
    return "linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%)";
  }

  function getGradientContrastColors(start, end) {
    const [sr, sg, sb] = parseHexColor(start);
    const [er, eg, eb] = parseHexColor(end);
    const luminance = (0.2126 * sr + 0.7152 * sg + 0.0722 * sb) / 255;
    const endLuminance = (0.2126 * er + 0.7152 * eg + 0.0722 * eb) / 255;
    const averageLuminance = (luminance + endLuminance) / 2;

    if (averageLuminance > 0.65) {
      return { name: "#111111", subtitle: "#4b5563" };
    }
    return { name: "#ffffff", subtitle: "rgba(255,255,255,0.92)" };
  }

  function updateLogoTheme(themeName) {
    const logoName = document.querySelector(".logo-name");
    const logoSubtitle = document.querySelector(".logo-subtitle");
    if (!logoName || !logoSubtitle) return;

    const custom =
      typeof ThemeEngine !== "undefined"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    if (custom && custom.colors) {
      const surface =
        custom.colors.surface || custom.colors.accent || "#000000";
      const [r, g, b] = parseHexColor(surface);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const nameColor =
        luminance > 0.65
          ? "#111111"
          : custom.colors.surfaceText || custom.colors.text || "#ffffff";
      const subtitleColor =
        custom.colors.focusMode ||
        custom.colors.accent ||
        (luminance > 0.65 ? "#4b5563" : "rgba(255,255,255,0.86)");
      logoName.style.color = nameColor;
      logoSubtitle.style.color = subtitleColor;
      return;
    }

    const themeColors = {
      "gradient-default": {
        name: "#ffffff",
        subtitle: "rgba(255,255,255,0.92)",
      },
      "gradient-ocean": { name: "#ffffff", subtitle: "#00d4ff" },
      "gradient-deep-ocean": { name: "#ffffff", subtitle: "#00d4ff" },
      "gradient-forest": { name: "#ffffff", subtitle: "#71b280" },
      "gradient-glow": { name: "#ffffff", subtitle: "#ffd27f" },
      "gradient-bloom": { name: "#ffffff", subtitle: "#f0abfc" },
      "color-dark": { name: "#ffffff", subtitle: "#888888" },
      "default-purple": { name: "#ffffff", subtitle: "#fb7185" },
      "ocean-classic": { name: "#ffffff", subtitle: "#7dd3fc" },
      "sunset-classic": { name: "#ffffff", subtitle: "#fcd34d" },
      midnight: { name: "#ffffff", subtitle: "#7b82ff" },
      "preset-midnight": { name: "#ffffff", subtitle: "#7b8fff" },
      "preset-sunset": { name: "#ffffff", subtitle: "rgba(255,255,255,0.65)" },
    };

    let colors = themeColors[themeName] || themeColors["gradient-default"];
    if (themeName === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const settings = safeJSONParse(raw, {});
      const start = (settings.start || "").trim().toLowerCase();
      const end = (settings.end || "").trim().toLowerCase();
      const presetMap = {
        "#6366f1|#ec4899": "default-purple",
        "#0066ff|#00d4ff": "ocean-classic",
        "#ff6b6b|#feca57": "sunset-classic",
        "#1a1a2e|#16213e": "midnight",
      };
      const presetKey = presetMap[`${start}|${end}`];
      if (presetKey && themeColors[presetKey]) {
        colors = themeColors[presetKey];
      } else if (settings.start && settings.end) {
        colors = getGradientContrastColors(settings.start, settings.end);
      }
    }

    logoName.style.color = colors.name;
    logoSubtitle.style.color = colors.subtitle;
  }


  function pipIcon(doc, d, size, stroked) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (stroked) {
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
    } else {
      svg.setAttribute("fill", "currentColor");
    }
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  }

  function buildPiPDocument(doc) {
    doc.open();
    doc.write(
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Pomora</title></head><body></body></html>",
    );
    doc.close();

    const root = doc.documentElement;
    if (root) root.style.colorScheme = "dark";

    const style = doc.createElement("style");
    style.textContent = `
      html, body { height: 100%; }
      body {
        margin: 0;
        padding: 10px;
        background: ${getPiPThemeBackground(savedTheme)};
        color: #ffffff;
        font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        font-weight: 400;
        line-height: 1.4;
        min-height: 100vh;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
      }
      .pip-card {
        --pip-accent: #6366f1;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        padding: 12px 14px 13px;
        border-radius: 14px;
        background: rgba(10, 18, 34, 0.97);
        border: 1px solid rgba(255, 255, 255, 0.09);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .pip-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pip-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 9px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--pip-accent) 16%, transparent);
        border: 1px solid color-mix(in srgb, var(--pip-accent) 38%, transparent);
        color: color-mix(in srgb, var(--pip-accent) 52%, #ffffff);
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .pip-chip i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--pip-accent);
        display: inline-block;
      }
      .pip-close {
        margin-left: auto;
        flex: none;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.62);
        transition: background 0.18s ease, color 0.18s ease;
      }
      .pip-close:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }
      .pip-time {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .pip-track {
        height: 4px;
        margin-bottom: 11px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
      }
      .pip-track.is-hidden {
        visibility: hidden;
      }
      .pip-fill {
        height: 100%;
        width: 0;
        border-radius: 999px;
        background: var(--pip-accent);
        transition: width 0.3s linear;
      }
      .pip-foot {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pip-control-btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 9px 14px;
        cursor: pointer;
        border: 1px solid transparent;
        border-radius: 9px;
        background: var(--pip-accent);
        color: #ffffff;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .pip-control-btn:hover {
        filter: brightness(1.1);
      }
      .pip-reset-btn {
        flex: none;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.72);
        transition: background 0.18s ease, color 0.18s ease;
      }
      .pip-reset-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }
      .pip-reset-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
      :focus-visible {
        outline: 2px solid var(--pip-accent);
        outline-offset: 2px;
      }
    `;
    doc.head.appendChild(style);

    const card = doc.createElement("div");
    card.className = "pip-card";

    const head = doc.createElement("div");
    head.className = "pip-head";
    const chip = doc.createElement("span");
    chip.className = "pip-chip";
    chip.appendChild(doc.createElement("i"));
    const chipText = doc.createElement("span");
    chipText.id = "pip-chip-text";
    chipText.textContent = "Study";
    chip.appendChild(chipText);
    head.appendChild(chip);

    const closeBtn = doc.createElement("button");
    closeBtn.className = "pip-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close mini player");
    closeBtn.appendChild(pipIcon(doc, PIP_ICON_CLOSE, 13, true));
    head.appendChild(closeBtn);
    card.appendChild(head);

    const displayDiv = doc.createElement("div");
    displayDiv.className = "pip-time";
    displayDiv.id = "pip-display";
    displayDiv.setAttribute("role", "timer");
    displayDiv.setAttribute("aria-live", "polite");
    displayDiv.setAttribute("aria-atomic", "true");
    displayDiv.textContent = "00:00";
    card.appendChild(displayDiv);

    const track = doc.createElement("div");
    track.className = "pip-track";
    track.id = "pip-track";
    const fill = doc.createElement("span");
    fill.className = "pip-fill";
    fill.id = "pip-fill";
    track.appendChild(fill);
    card.appendChild(track);

    const actions = doc.createElement("div");
    actions.className = "pip-foot";
    const controlBtn = doc.createElement("button");
    controlBtn.className = "pip-control-btn";
    controlBtn.id = "pip-control-btn";
    controlBtn.type = "button";
    controlBtn.appendChild(pipIcon(doc, PIP_ICON_PLAY, 13, false));
    const controlLabel = doc.createElement("span");
    controlLabel.textContent = "Start";
    controlBtn.appendChild(controlLabel);
    actions.appendChild(controlBtn);

    const resetBtn = doc.createElement("button");
    resetBtn.className = "pip-reset-btn";
    resetBtn.id = "pip-reset-btn";
    resetBtn.type = "button";
    resetBtn.setAttribute("aria-label", "Reset timer");
    resetBtn.appendChild(pipIcon(doc, PIP_ICON_RESET, 14, true));
    actions.appendChild(resetBtn);
    card.appendChild(actions);

    doc.body.appendChild(card);

    return {
      card,
      chipText,
      closeBtn,
      display: displayDiv,
      track,
      fill,
      controlBtn,
      controlIcon: controlBtn.querySelector("svg path"),
      controlLabel,
      resetBtn,
    };
  }

  function wirePiPControls(refs) {
    refs.controlBtn.addEventListener("click", () => {
      if (pipIsStopwatch()) {
        const swStart = document.getElementById("swStartBtn");
        if (swStart) swStart.click();
      } else if (typeof toggleTimer === "function") {
        toggleTimer();
      }
      applyPiPState();
    });

    refs.resetBtn.addEventListener("click", () => {
      const btn = pipIsStopwatch()
        ? document.getElementById("swResetBtn")
        : resetBtn;
      if (btn && !btn.disabled) btn.click();
      applyPiPState();
    });

    refs.closeBtn.addEventListener("click", closePiP);

    const ownerDoc = refs.card.ownerDocument;
    if (ownerDoc) {
      ownerDoc.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePiP();
      });
    }
  }

  function clearPiPSync() {
    if (pipSyncTimer && pipWindow) {
      try {
        pipWindow.clearInterval(pipSyncTimer);
      } catch (e) {
        /* The window is already gone; its timers went with it. */
      }
    }
    pipSyncTimer = null;
  }

  /* Safe to call any number of times and from any close path. */
  function handlePiPClosed() {
    clearPiPSync();
    pipRefs = null;
    pipWindow = null;
    pipThemeKey = "";
    setPipToggleActive(false);
  }

  function closePiP() {
    const win = pipWindow;
    handlePiPClosed();
    if (win && !win.closed) {
      try {
        win.close();
      } catch (e) {
        /* Already gone: the guard above covers the real state. */
      }
    }
  }

  function startPiPSync() {
    clearPiPSync();
    /* The tick lives in the mini player's window. That document stays visible
       while the main tab is behind another window, so unlike this document's
       timers it is not throttled to once a minute. */
    pipSyncTimer = pipWindow.setInterval(applyPiPState, 250);
    applyPiPState();
  }

  async function openPiP() {
    if (pipOpening) return;
    pipOpening = true;
    let win = null;
    try {
      /* Document PiP is the only API that gives a real always-on-top window.
         If the browser exposes it but refuses this particular request (no
         transient activation, policy, a second window), fall through to the
         popup path instead of failing the whole feature. */
      if (supportsDocumentPiP()) {
        try {
          win = await window.documentPictureInPicture.requestWindow({
            width: 360,
            height: 280,
          });
        } catch (err) {
          console.warn("Document PiP unavailable, using popup:", err);
          win = null;
        }
      }

      if (!win) {
        const left = Math.max(0, Math.round((screenX || 0) + 120));
        const top = Math.max(0, Math.round((screenY || 0) + 120));
        win = window.open(
          "",
          "pomora-pip",
          "popup=yes,width=380,height=320,left=" + left + ",top=" + top,
        );
        if (!win) throw new Error("popup-blocked");
      }

      if (!win.document) throw new Error("no-document");

      pipWindow = win;
      pipRefs = buildPiPDocument(win.document);
      wirePiPControls(pipRefs);

      win.addEventListener("pagehide", () => {
        if (pipWindow === win) handlePiPClosed();
      });
      win.addEventListener("beforeunload", () => {
        if (pipWindow === win) handlePiPClosed();
      });

      startPiPSync();
      setPipToggleActive(true);
      try {
        win.focus();
      } catch (e) {
        /* Focus is best-effort; the window is already open. */
      }
    } catch (e) {
      console.warn("PiP failed:", e);
      /* Close a window that was opened but could not be built, so a failure
         never leaves an empty mini player behind. */
      closePiP();
      const blocked = String((e && e.message) || "") === "popup-blocked";
      showAlert(
        blocked
          ? "Your browser blocked the mini player window. Allow pop-ups for this site, then try again."
          : "Could not open the mini player. Use Chrome or Edge for the always-on-top version, or allow pop-ups for this site.",
      );
    } finally {
      pipOpening = false;
    }
  }

  async function togglePiP() {
    if (pipWindow) {
      closePiP();
      return;
    }
    await openPiP();
  }

  window.addEventListener("beforeunload", () => {
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.close();
      } catch (e) {
        /* ignore */
      }
    }
    clearPiPSync();
  });

  focusModeBtn.addEventListener("click", () => setActiveMode("focus"));
  shortBreakBtn.addEventListener("click", () => setActiveMode("short"));
  longBreakBtn.addEventListener("click", () => setActiveMode("long"));
  startBtn.addEventListener("click", toggleTimer);
  resetBtn.addEventListener("click", resetTimer);

  pipToggles.forEach((b) => b.addEventListener("click", togglePiP));

  minutesInput.addEventListener("change", () => {
    const minutes = clampMinutes(
      minutesInput.value,
      Math.max(MIN_MINUTES, Math.round(modes.focus / 60)),
    );
    minutesInput.value = minutes;
    if (currentMode === "focus") {
      remaining = minutes * 60;
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

  const THEME_CFG = {
    "gradient-default": { adv: true, section: "defaultThemeSettings" },
    "gradient-ocean": { adv: true, section: "deepOceanSettings" },
    "gradient-deep-ocean": { adv: true, section: "deepOceanSettings" },
    "gradient-forest": { adv: true, section: "forestThemeSettings" },
    "gradient-glow": { adv: false, section: "staticThemeSettings" },
    "gradient-bloom": { adv: false, section: "staticThemeSettings" },
    "color-dark": { adv: false, section: "staticThemeSettings" },
  };

  const THEME_ALIAS = {
    "gradient-sunset": "gradient-default",
    "gradient-day-night": "gradient-default",
    "color-light": "gradient-default",
  };

  function normalizeTheme(theme) {
    if (!theme) return "gradient-default";
    return THEME_ALIAS[theme] || theme;
  }

  function activeCustomThemeId() {
    if (typeof ThemeEngine === "undefined") return null;
    const id =
      typeof ThemeEngine.getActiveId === "function"
        ? ThemeEngine.getActiveId()
        : null;
    if (id) return id;
    try {
      const stored = localStorage.getItem("customThemeActiveId");
      return stored && ThemeEngine.get(stored) ? stored : null;
    } catch (e) {
      return null;
    }
  }

  function activeNativeSceneId() {
    if (typeof ThemeEngine === "undefined") return null;
    const st =
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    return st && st.sceneId ? st.sceneId : null;
  }

  function paintThemeTiles(theme) {
    const custom = activeCustomThemeId();
    const owned = !!custom || !!activeNativeSceneId();
    document.querySelectorAll(".theme-option").forEach((o) => {
      o.classList.toggle("active", !owned && o.dataset.theme === theme);
    });
  }

  const settingsBtn = document.getElementById("settingsBtn");
  const themeModal = document.getElementById("themeModal");
  const timerContainer = document.getElementById("timerContainer");
  const themeOptions = document.querySelectorAll(".theme-option");
  const advModal = document.getElementById("advancedSettingsModal");
  const advBackdrop = document.getElementById("advancedSettingsBackdrop");
  const advCloseBtn = document.getElementById("advancedSettingsCloseBtn");
  const advOpenBtn = document.getElementById("openAdvancedSettingsBtn");
  const advSaveBtn = document.getElementById("advancedSettingsSaveBtn");
  
  const tlAutoDetectToggle = document.getElementById("tlAutoDetectToggle");
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
  const leavesContainer = document.getElementById("leaves");
  const waveContainer = document.getElementById("waveContainer");
  const oceanContainer = document.getElementById("oceanContainer");

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
  let pipAlwaysOnTop = localStorage.getItem("pipAlwaysOnTop") === "true";

  let timerSoundEnabled = localStorage.getItem("timerSoundEnabled") !== "false";
  let breakSoundEnabled = localStorage.getItem("breakSoundEnabled") !== "false";
  let statisticsEnabled = localStorage.getItem("statisticsEnabled") !== "false";

  const PATCH_NOTES = [
    {
      version: "2.0.1",
      date: "2026-10-28",
      newest: true,
      title: "Bug fix update: canvas sizing & session logging",
      changes: [
        {
          kind: "fixed",
          text: "Animated themes no longer render into only the top-left quarter of the screen on high-DPI (Retina / display-scaled) monitors.",
        },
        {
          kind: "fixed",
          text: "Resetting the stopwatch or a countdown timer now records the time spent since the session started, so unfinished sessions stop being lost from your statistics.",
        },
        {
          kind: "fixed",
          text: "Elapsed time is now accumulated across pause/resume cycles, so pausing repeatedly no longer drops focused minutes.",
        },
      ],
    },
    {
      version: "2.0.0",
      date: "2026-10-16",
      title: "Custom themes, UI redesign & expanded PiP",
      changes: [
        {
          kind: "new",
          text: "Theme Builder: Build custom themes with personalized colors, image, or video backgrounds.",
        },
        {
          kind: "new",
          text: "Animated Theme Library: 30+ animated scenes with curated color presets (can be toggled in Extras).",
        },
        {
          kind: "improved",
          text: "Site-wide Redesign: Modernized interface across Quick Settings, Advanced Settings, Task Planner, and more.",
        },
        {
          kind: "improved",
          text: "Study Analytics: Deeper breakdowns of your study habits with a dedicated session history log.",
        },
        {
          kind: "improved",
          text: "Interactive PiP: Redesigned floating window with direct controls (play, pause, reset), better window persistence and progress tracking.",
        },
        {
          kind: "fixed",
          text: "Picture-in-Picture now supports Stopwatch mode alongside countdown timers.",
        },
        {
          kind: "fixed",
          text: 'Clicking "Apply & Close" in Advanced Settings no longer resets the active theme selection.',
        },
      ],
    },
    {
      version: "1.5.1",
      date: "2026-09-16",
      title: "Background stopwatch fix",
      changes: [
        {
          kind: "fixed",
          text: "Stopwatch accurately tracks elapsed time when running in background browser tabs.",
        },
      ],
    },
    {
      version: "1.5.0",
      date: "2026-07-15",
      title: "Data backup & transfer",
      changes: [
        {
          kind: "new",
          text: "CSV Import & Export: Back up your study statistics or transfer data across browsers and devices.",
        },
      ],
    },
    {
      version: "1.4.1",
      date: "2026-06-27",
      title: "Statistics logging fix",
      changes: [
        {
          kind: "fixed",
          text: "Resolved an issue where completed study sessions failed to record in statistics.",
        },
      ],
    },
    {
      version: "1.4.0",
      date: "2026-06-10",
      title: "Stopwatch mode",
      changes: [
        {
          kind: "new",
          text: "Stopwatch Mode: Track open-ended study sessions without a countdown timer.",
        },
      ],
    },
    {
      version: "1.3.1",
      date: "2026-06-03",
      title: "New logo & branding",
      changes: [
        {
          kind: "new",
          text: "Official Branding: Introduced the app logo, visual identity, and browser favicon.",
        },
      ],
    },
    {
      version: "1.3.0",
      date: "2026-06-02",
      title: "Picture-in-Picture mode & animation polish",
      changes: [
        {
          kind: "new",
          text: "Picture-in-Picture Mode: Keep your timer visible in a floating window while working across other tabs.",
        },
        {
          kind: "improved",
          text: "Refined wave animation logic and smoother page transitions.",
        },
      ],
    },
    {
      version: "1.2.1",
      date: "2026-05-22",
      title: "Maintenance update",
      changes: [
        {
          kind: "fixed",
          text: "Resolved various bugs across the timer, themes, and settings menu.",
        },
      ],
    },
    {
      version: "1.2.0",
      date: "2026-05-20",
      title: "Custom wave animation colors",
      changes: [
        {
          kind: "new",
          text: "Wave Color Customization: Choose custom colors for the wave animation in the default theme.",
        },
      ],
    },
    {
      version: "1.1.0",
      date: "2026-05-19",
      title: "Expanded settings & theme overhaul",
      changes: [
        {
          kind: "new",
          text: "Full Settings Modal: Open “Expand Settings” for deeper timer and preference configuration.",
        },
        {
          kind: "improved",
          text: "Overhauled theme styling and smoothed UI animations across the page.",
        },
      ],
    },
    {
      version: "1.0.1",
      date: "2026-05-11",
      title: "UI consistency & bug fixes",
      changes: [
        {
          kind: "improved",
          text: "Polished layout alignment and visual consistency across the interface.",
        },
        {
          kind: "fixed",
          text: "Fixed minor interaction bugs in the timer and settings menu.",
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-05-10",
      title: "Advanced study analytics",
      changes: [
        {
          kind: "new",
          text: "Advanced Analytics Dashboard: In-depth breakdowns of study sessions, subject tracking, and history.",
        },
      ],
    },
    {
      version: "0.9.0",
      date: "2026-05-05",
      title: "Release notes",
      changes: [
        {
          kind: "new",
          text: "Added in-app release notes to track updates and improvements.",
        },
      ],
    },
  ];

  const RELEASE_KIND_LABELS = {
    new: "New",
    improved: "Improved",
    fixed: "Fixed",
  };
  const RELEASE_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function formatReleaseDate(iso) {
    const parts = String(iso || "").split("-");
    if (parts.length !== 3) return sanitizeInput(iso);
    const month = RELEASE_MONTHS[Number(parts[1]) - 1];
    if (!month) return sanitizeInput(iso);
    return Number(parts[2]) + " " + month + " " + parts[0];
  }

  function releaseKinds(release) {
    const order = ["new", "improved", "fixed"];
    const present = (release.changes || []).map((change) => change.kind);
    return order.filter((kind) => present.indexOf(kind) !== -1);
  }

  function kindChip(kind) {
    const chip = createSafeElement("span", {
      class: "patch-notes-kind is-" + String(kind),
    });
    chip.appendChild(
      createSafeElement("span", { class: "patch-notes-kind__dot" }),
    );
    chip.appendChild(
      createSafeElement("span", {}, RELEASE_KIND_LABELS[kind] || String(kind)),
    );
    return chip;
  }

  const UPDATE_NOTIFICATION_VERSION = "2026-10-28";
  const UPDATE_NOTIFICATION_KEY = "timerUpdateNoticeVersion";
  const VISITED_KEY = "timerHasVisited";

  (function bootstrap() {
    timerContainer.classList.add("theme-" + savedTheme);
    if (document.body) document.body.classList.add("theme-" + savedTheme);
    paintThemeTiles(savedTheme);
    renderPatchNotesPreview();
    renderPatchNotesList();
    initUpdateNotice();
    updateLogoTheme(savedTheme);
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
    fillUpdateNotice();
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
    patchNotesPreview.innerHTML = "";
    const latest = PATCH_NOTES[0];
    if (!latest) return;

    const moreCount = Math.max(0, PATCH_NOTES.length - 1);
    if (openPatchNotesBtn) {
      openPatchNotesBtn.textContent =
        moreCount > 0
          ? `View all updates (${PATCH_NOTES.length})`
          : "View release notes";
    }

    const btn = createSafeElement("button", {
      type: "button",
      class: "patch-note-preview",
      "data-index": "0",
    });

    const meta = createSafeElement("div", {
      class: "patch-note-preview-meta",
    });
    meta.appendChild(
      createSafeElement(
        "span",
        { class: "patch-notes-version" },
        sanitizeInput(latest.version),
      ),
    );
    meta.appendChild(
      createSafeElement("small", {}, formatReleaseDate(latest.date)),
    );
    btn.appendChild(meta);

    btn.appendChild(
      createSafeElement(
        "strong",
        { class: "patch-note-preview-title" },
        sanitizeInput(latest.title),
      ),
    );

    const kinds = releaseKinds(latest);
    if (kinds.length) {
      const chips = createSafeElement("div", {
        class: "patch-note-preview-chips",
      });
      kinds.forEach((kind) => chips.appendChild(kindChip(kind)));
      btn.appendChild(chips);
    }

    patchNotesPreview.appendChild(btn);
  }

  function renderPatchNotesList() {
    if (!patchNotesList) return;
    patchNotesList.innerHTML = "";
    if (!PATCH_NOTES.length) return;

    const timeline = createSafeElement("div", { class: "patch-notes-timeline" });
    PATCH_NOTES.forEach((note, index) => {
      const release = createSafeElement("article", {
        class:
          "patch-notes-release" +
          (note.newest || index === 0 ? " is-newest" : ""),
      });
      release.appendChild(
        createSafeElement("span", { class: "patch-notes-node" }),
      );

      const meta = createSafeElement("div", {
        class: "patch-notes-release-meta",
      });
      meta.appendChild(
        createSafeElement(
          "span",
          { class: "patch-notes-version" },
          sanitizeInput(note.version),
        ),
      );
      meta.appendChild(
        createSafeElement(
          "time",
          { class: "patch-notes-date", datetime: note.date },
          formatReleaseDate(note.date),
        ),
      );
      if (note.newest || index === 0) {
        meta.appendChild(
          createSafeElement("span", { class: "patch-notes-newest" }, "Newest"),
        );
      }
      release.appendChild(meta);

      release.appendChild(
        createSafeElement(
          "h4",
          { class: "patch-notes-release-title" },
          sanitizeInput(note.title),
        ),
      );

      const list = createSafeElement("ul", { class: "patch-notes-changes" });
      (note.changes || []).forEach((change) => {
        const item = createSafeElement("li", { class: "patch-notes-change" });
        item.appendChild(kindChip(change.kind));
        // The leading space is for assistive tech: the chip and the text are
        // adjacent inline boxes, so without it the label runs into the prose
        // ("NewTheme Builder"). Collapsed visually at the start of the cell.
        item.appendChild(
          createSafeElement("span", {}, " " + sanitizeInput(change.text)),
        );
        list.appendChild(item);
      });
      release.appendChild(list);
      timeline.appendChild(release);
    });

    patchNotesList.appendChild(timeline);

    const subtitle = document.getElementById("patchNotesSubtitle");
    if (subtitle && PATCH_NOTES[0]) {
      subtitle.textContent =
        PATCH_NOTES.length +
        " releases · latest " +
        PATCH_NOTES[0].version +
        " · " +
        formatReleaseDate(PATCH_NOTES[0].date);
    }
  }

  function fillUpdateNotice() {
    const release = PATCH_NOTES[0];
    if (!release) return;

    const versionEl = document.getElementById("updateNoticeVersion");
    if (versionEl) versionEl.textContent = sanitizeInput(release.version);

    const dateEl = document.getElementById("updateNoticeDate");
    if (dateEl) dateEl.textContent = formatReleaseDate(release.date);

    const titleEl = document.getElementById("updateNoticeTitle");
    if (titleEl) titleEl.textContent = sanitizeInput(release.title);

    const summaryEl = document.getElementById("updateNoticeSummary");
    if (summaryEl) {
      summaryEl.textContent =
        "There has been an update since your last visit. Here is what changed.";
    }

    const chips = document.getElementById("updateNoticeChips");
    if (chips) {
      chips.innerHTML = "";
      releaseKinds(release).forEach((kind) => chips.appendChild(kindChip(kind)));
    }
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

  if (settingsBtn) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const modal = themeModal || document.getElementById("themeModal");
      if (!modal) return;
      const isOpen = modal.classList.contains("open");
      modal.classList.toggle("open", !isOpen);

      if (!isOpen && typeof window.__syncQsEditThemeBtn === "function")
        window.__syncQsEditThemeBtn();
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
      !e.target.closest(".analytics-panel") &&
      !e.target.closest(".confirm-backdrop") &&
      !e.target.closest(".te-confirm-backdrop")
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

  const dismissUpdateNoticeLaterBtn = document.getElementById(
    "dismissUpdateNoticeLaterBtn",
  );
  if (dismissUpdateNoticeLaterBtn)
    dismissUpdateNoticeLaterBtn.addEventListener("click", closeUpdateNoticePopup);
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

  setTimeout(() => {
    document.querySelectorAll("button[disabled][title]").forEach((btn) => {
      btn.style.position = "relative";

      btn.addEventListener("mouseenter", function () {
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

        void tooltip.offsetHeight;

        const rect = this.getBoundingClientRect();
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;

        let left = Math.round(rect.left + rect.width / 2 - tw / 2);
        let top = Math.round(rect.top - th - 10);

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

  if (themeOptions.length > 0) {
    themeOptions.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        if (!btn) return;

        if (btn.hasAttribute("disabled")) return;

        const theme = normalizeTheme(btn.dataset.theme);
        if (!theme) return;

        if (typeof ThemeEngine !== "undefined") {
          ThemeEngine.deactivate({ restorePreset: false });
          ThemeEngine._rebuildCustomList();
        }

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
        syncQsThemeEditState(); 

        savedTheme = theme;
        localStorage.setItem("timerTheme", theme);

        if (
          typeof window !== "undefined" &&
          typeof window.reapplyBuiltInTheme === "function"
        ) {
          window.reapplyBuiltInTheme(theme, { userPick: true });
        } else {
          applyTheme(theme);
        }
      });
    });
  }

  function updatePipAlwaysOnTopButton() {
    const pipAlwaysOnTopToggle = document.getElementById(
      "pipAlwaysOnTopToggle",
    );

    pipToggles.forEach((b) =>
      b.classList.toggle("always-on-top", pipAlwaysOnTop),
    );
    if (pipAlwaysOnTopToggle) {
      pipAlwaysOnTopToggle.checked = pipAlwaysOnTop;
    }
    localStorage.setItem("pipAlwaysOnTop", pipAlwaysOnTop ? "true" : "false");
    /* The old focus() loop lived here. It never made a popup on top; it just
       stole the keyboard every 1.2s. Document PiP is always-on-top already,
       so the setting only pins the buttons now. */
    applyPiPState();
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

  if (tlAutoDetectToggle) {

    const _persist = (on) => {
      try {
        localStorage.setItem("tlAutoDetectColors", on ? "1" : "0");
      } catch (e) {
        }
    };
    const _tlIsOn = () => {
      try {
        return localStorage.getItem("tlAutoDetectColors") !== "0";
      } catch (e) {
        return true;
      }
    };
    const _applyPalette = (on) => {
      if (typeof ThemeEngine === "undefined") return;
      if (!on) {

        ThemeEngine.applyNativePresetPalette();
        return;
      }

      const st =
        typeof ThemeEngine.getNativeSceneState === "function"
          ? ThemeEngine.getNativeSceneState()
          : null;
      const active =
        typeof ThemeEngine.getActiveCustomThemeConfig === "function"
          ? ThemeEngine.getActiveCustomThemeConfig()
          : null;
      const bg = active && active.bg;
      if (st && st.sceneId) {
        ThemeEngine._queueNativeScenePalette(
          st.sceneId,
          st.sceneOptions || {},
          st.sceneBgColor || "",
        );
      } else if (bg && bg.type === "scene" && bg.sceneId) {
        ThemeEngine._queueNativeScenePalette(
          bg.sceneId,
          bg.sceneOptions || {},
          bg.sceneBgColor || "",
        );
      } else if (typeof ThemeEngine.applyBackgroundPalette === "function") {
        ThemeEngine.applyBackgroundPalette(bg || null);
      }
    };
    
    window.__syncTlAutoDetectToggle = () => {
      tlAutoDetectToggle.checked = _tlIsOn();
    };
    tlAutoDetectToggle.checked = _tlIsOn();

    tlAutoDetectToggle.addEventListener("change", () => {
      const on = tlAutoDetectToggle.checked;
      _persist(on);
      _applyPalette(on);
    });
  }

  const libraryBtns = document.querySelectorAll(".open-theme-library-btn");
  if (typeof ThemeScenes === "undefined") {
    console.warn(
      "Theme library entries hidden: ThemeScenes registry did not load.",
    );
    libraryBtns.forEach((btn) => (btn.style.display = "none"));
  } else {

    /* Scene files load on demand, so at this point only the ones on screen
       are registered — ask the manifest for the library size instead. */
    const sceneCount =
      typeof ThemeScenes.visibleCount === "function"
        ? ThemeScenes.visibleCount()
        : typeof ThemeScenes.listLive === "function"
          ? ThemeScenes.listLive().length
          : ThemeScenes.list().length;
    ["openThemeLibraryLabelSmall", "openThemeLibraryLabelFull"].forEach((id) => {
      const label = document.getElementById(id);
      if (label) label.textContent = `Open theme library (${sceneCount})`;
    });
    libraryBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof ThemeEngine === "undefined") return;

        if (btn.id === "openThemeLibraryBtnSmall" && themeModal)
          themeModal.classList.remove("open");
        if (typeof ThemeEngine.openThemeLibrary === "function")
          ThemeEngine.openThemeLibrary();
        else if (typeof ThemeEngine.refreshThemeLibraryPanel === "function")
          ThemeEngine.refreshThemeLibraryPanel();
      });
    });
  }

  function closeTopmostModal() {
    const id = topmostOverlayId();
    if (!id) return false;
    const el = document.getElementById(id);
    const close = OVERLAY_CLOSERS[id];
    if (close) close(el);
    else el.classList.remove("open");
    return true;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTopmostModal();
    }
  });

  /* Closed overlays are hidden with opacity alone, so without this their
     controls stayed in the tab order and in the accessibility tree. Keep a
     modal's contents reachable only while it is open. */
  const OVERLAY_IDS = [
    "updateNoticePopup",
    "patchNotesPopup",
    "plannerModal",
    "taskPopup",
    "advancedSettingsModal",
    "statisticsModal",
    "sessionLogModal",
    "themeModal",
    "themeEditorModal",
    "tlModal",
    "teSceneLibModal",
  ];

  const overlayReturnFocus = new Map();

  /* Which overlay opened last. Escape must close what the user is looking at,
     and a fixed list cannot know that a dialog was opened from another one. */
  const overlayOpenOrder = [];
  const overlayOpenState = new Map();

  function noteOverlayOpen(id, isOpen) {
    if (overlayOpenState.get(id) === isOpen) return;
    overlayOpenState.set(id, isOpen);
    const at = overlayOpenOrder.indexOf(id);
    if (at !== -1) overlayOpenOrder.splice(at, 1);
    if (isOpen) overlayOpenOrder.push(id);
  }

  function topmostOverlayId() {
    for (let i = overlayOpenOrder.length - 1; i >= 0; i--) {
      const el = document.getElementById(overlayOpenOrder[i]);
      if (el && el.classList.contains("open")) return overlayOpenOrder[i];
    }
    /* Nothing tracked (an overlay that was already open before this ran):
       fall back to the declared order, which is what the list used to do. */
    return (
      OVERLAY_IDS.find((id) => {
        const el = document.getElementById(id);
        return el && el.classList.contains("open");
      }) || null
    );
  }

  const OVERLAY_CLOSERS = {
    updateNoticePopup: () => closeUpdateNoticePopup(),
    patchNotesPopup: () => closePatchNotesPopup(),
    taskPopup: () => closeTaskPopup(),
    plannerModal: (el) => el.classList.remove("open"),
    teSceneLibModal: (el) => el.classList.remove("open"),
    tlModal: (el) => {
      if (
        typeof ThemeLibrary !== "undefined" &&
        typeof ThemeLibrary.close === "function"
      )
        ThemeLibrary.close();
      else el.classList.remove("open");
    },
    themeEditorModal: () => {
      if (typeof ThemeEngine !== "undefined") ThemeEngine.closeEditor();
    },
    advancedSettingsModal: () => closeAdvModal(),
    sessionLogModal: (el) => {
      el.classList.remove("open");
      el.setAttribute("aria-hidden", "true");
    },
    statisticsModal: (el) => el.classList.remove("open"),
    themeModal: (el) => el.classList.remove("open"),
  };

  function firstOverlayControl(el) {
    return el.querySelector(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  }

  function syncOverlayA11y() {
    OVERLAY_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const isOpen = el.classList.contains("open");
      noteOverlayOpen(id, isOpen);
      if (isOpen) {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
        if (!overlayReturnFocus.has(id)) {
          const previous = document.activeElement;
          overlayReturnFocus.set(
            id,
            previous && previous !== document.body ? previous : null,
          );
          /* A dialog that opens without focus is a dead end for the keyboard:
             tabbing continues on the page behind it. Widgets that focus their
             own field (the task form) are already inside, so they are left
             alone. */
          if (!el.contains(document.activeElement)) {
            requestAnimationFrame(() => {
              if (!el.classList.contains("open")) return;
              if (el.contains(document.activeElement)) return;
              const first = firstOverlayControl(el);
              if (first) first.focus({ preventScroll: true });
            });
          }
        }
        return;
      }
      if (el.contains(document.activeElement)) document.activeElement.blur();
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      if (overlayReturnFocus.has(id)) {
        const previous = overlayReturnFocus.get(id);
        overlayReturnFocus.delete(id);
        if (previous && document.contains(previous) && !previous.closest("[inert]"))
          previous.focus({ preventScroll: true });
      }
    });
  }

  syncOverlayA11y();
  const overlayObserver = new MutationObserver((records) => {
    if (records.some((r) => r.target.id && OVERLAY_IDS.includes(r.target.id)))
      syncOverlayA11y();
  });
  OVERLAY_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      overlayObserver.observe(el, {
        attributes: true,
        attributeFilter: ["class"],
      });
  });

  function openAdvModal() {
    if (!advModal) return;
    
    const fsFocus = document.getElementById("fsFocus");
    const fsShort = document.getElementById("fsShort");
    const fsLong = document.getElementById("fsLong");
    const qsFocus = document.getElementById("customFocus");
    const qsShort = document.getElementById("customShort");
    const qsLong = document.getElementById("customLong");
    if (fsFocus && qsFocus) fsFocus.value = qsFocus.value;
    if (fsShort && qsShort) fsShort.value = qsShort.value;
    if (fsLong && qsLong) fsLong.value = qsLong.value;

    syncClockCardVisibility();

    const asbToggle = document.getElementById("autoStartBreakToggle");
    if (asbToggle) asbToggle.checked = autoStartBreak;

    paintThemeTiles(savedTheme);

    showThemeSettingsSection(savedTheme);
    loadAdvValues();

    if (typeof ThemeEngine !== "undefined") ThemeEngine._rebuildCustomList();

    advModal.querySelectorAll(".theme-option").forEach((opt) => {
      const clone = opt.cloneNode(true);
      opt.parentNode.replaceChild(clone, opt);

      clone.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        if (!btn) return;

        const newTheme = normalizeTheme(btn.dataset.theme);
        if (!newTheme) return;

        if (typeof ThemeEngine !== "undefined") {
          ThemeEngine.deactivate({ restorePreset: false });
          ThemeEngine._rebuildCustomList();
        }

        savedTheme = newTheme;
        localStorage.setItem("timerTheme", newTheme);
        advModal
          .querySelectorAll(".theme-option")
          .forEach((o) => o.classList.remove("active"));
        btn.classList.add("active");
        showThemeSettingsSection(newTheme);
        loadAdvValues();
        if (
          typeof window !== "undefined" &&
          typeof window.reapplyBuiltInTheme === "function"
        ) {
          window.reapplyBuiltInTheme(newTheme, { userPick: true });
        }
      });
    });

    if (!advModal.dataset.tabsInit) {
      document.querySelectorAll(".fs-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => setAdvTab(btn.dataset.tab));
      });
      advModal.dataset.tabsInit = "true";
    }

    const timerSoundToggle = document.getElementById("timerSoundToggle");
    const breakSoundToggle = document.getElementById("breakSoundToggle");
    const statisticsToggle = document.getElementById("statisticsToggle");
    const keepSceneColorsToggle = document.getElementById(
      "keepSceneColorsToggle",
    );

    if (timerSoundToggle) timerSoundToggle.checked = timerSoundEnabled;
    if (breakSoundToggle) breakSoundToggle.checked = breakSoundEnabled;
    if (statisticsToggle) statisticsToggle.checked = statisticsEnabled;
    syncQuickStatsRange();
    if (keepSceneColorsToggle)
      keepSceneColorsToggle.checked =
        localStorage.getItem("pomoraKeepSceneColors") === "1";
    if (typeof window.__syncTlAutoDetectToggle === "function")
      window.__syncTlAutoDetectToggle();

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
    syncColorPickerCards();
  }

  function saveAdvSettings() {
    
    const fsFocus = document.getElementById("fsFocus");
    const fsShort = document.getElementById("fsShort");
    const fsLong = document.getElementById("fsLong");
    if (fsFocus && fsShort && fsLong) {
      customFocusInput.value = fsFocus.value;
      customShortInput.value = fsShort.value;
      customLongInput.value = fsLong.value;
      updateModes();
    }

    const asbToggle = document.getElementById("autoStartBreakToggle");
    if (asbToggle) {
      autoStartBreak = asbToggle.checked;
      localStorage.setItem("autoStartBreak", autoStartBreak);
    }

    const activeScene =
      typeof ThemeEngine !== "undefined" &&
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    const activeCustom =
      typeof ThemeEngine !== "undefined" &&
      typeof ThemeEngine.getActiveCustomThemeConfig === "function"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    const builtinOwns = !(activeScene && activeScene.sceneId) && !activeCustom;

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
      if (builtinOwns) {
        applyCustomGradient(s.start, s.end);
        animationEnabled = s.anim;
        localStorage.setItem("timerAnimationEnabled", s.anim);
        if (!s.anim) stopAnimation();
        else startAnimation("gradient-default");
      }
    } else if (savedTheme === "gradient-forest") {
      s.anim = document.getElementById("forestAnimationToggle").checked;
      const leaves = document.getElementById("leaves");
      if (leaves && builtinOwns)
        leaves.style.display = s.anim ? "block" : "none";
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

    if (!builtinOwns && activeScene && activeScene.sceneId) {
      
    } else if (activeCustom) {
      
      try {
        ThemeEngine.apply(activeCustom);
      } catch (e) {
        
        if (
          [
            "gradient-default",
            "gradient-forest",
            "gradient-deep-ocean",
          ].includes(savedTheme)
        ) {
          applyTheme(savedTheme);
        }
      }
    } else {
      if (
        [
          "gradient-default",
          "gradient-forest",
          "gradient-deep-ocean",
        ].includes(savedTheme)
      ) {
        applyTheme(savedTheme);
      }
    }

    const timerSoundToggle = document.getElementById("timerSoundToggle");
    const breakSoundToggle = document.getElementById("breakSoundToggle");
    const statisticsToggle = document.getElementById("statisticsToggle");
    const keepSceneColorsToggle = document.getElementById(
      "keepSceneColorsToggle",
    );

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
    if (keepSceneColorsToggle)
      localStorage.setItem(
        "pomoraKeepSceneColors",
        keepSceneColorsToggle.checked ? "1" : "0",
      );

    closeAdvModal();
  }

  ["oceanSpeed", "oceanTireSize", "oceanJellyfishSize"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        document.getElementById(id + "Value").textContent = el.value;
      });
    }
  });

  function syncColorPickerCards() {
    document.querySelectorAll(".te-color-picker").forEach(function (card) {
      const inputId = card.getAttribute("data-for");
      if (!inputId) return;
      const input = document.getElementById(inputId);
      if (!input) return;
      const swatch = card.querySelector(".te-color-picker-swatch");
      const hex = card.querySelector(".te-color-picker-hex");
      if (swatch) swatch.style.background = input.value;
      if (hex) hex.textContent = input.value;
    });
  }

  ["gradientStartColor", "gradientEndColor"].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener("input", function () {
        updateGradientPreview();
        syncColorPickerCards();
      });
  });

  const waveAccentEl = document.getElementById("waveAccentColor");
  if (waveAccentEl) {
    const applyWaveAccent = debounce(() => {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      
      s.waveAccent = s.waveCustomEnabled === false ? null : waveAccentEl.value;
      localStorage.setItem("advSettings_gradient-default", JSON.stringify(s));
      if (currentAnimation === "wave") {
        stopAnimation();
        startAnimation("gradient-default");
      } else {
        updateWaveContainerGradient("gradient-default");
      }
    }, 260);
    waveAccentEl.addEventListener("input", function () {
      syncColorPickerCards();
      applyWaveAccent();
    });
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
      syncColorPickerCards();
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
      syncColorPickerCards();
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
      
      const deepen = (hex, t) => mixHexColors(hex, "#000000", t);
      const lighten = (hex, t) => mixHexColors(hex, "#ffffff", t);
      const midBase = mixHexColors(start, end, 0.5);
      
      const [mr, mg, mb] = parseHexColor(midBase);
      const lum = 0.2126 * mr + 0.7152 * mg + 0.0722 * mb;
      if (useCustom && accent) {
        
        const accentDeep = deepen(accent, 0.24);
        const mid = mixHexColors(midBase, accentDeep, 0.36);
        
        const finalMid = lum < 60 ? lighten(mid, 0.14) : mid;
        return [rgba(start, 0.4), rgba(finalMid, 0.3), rgba(end, 0.22)];
      }
      
      let mid = deepen(midBase, 0.22);
      if (lum < 60) {
        
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

    if (theme === "color-dark") {
      return [
        "rgba(255, 255, 255, 0.12)",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.05)",
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

  function applyTheme(theme) {
    if (typeof ThemeEngine !== "undefined") {
      const activeCustom = ThemeEngine.getActiveCustomThemeConfig();
      if (activeCustom) {
        ThemeEngine.deactivate({ restorePreset: false });
      }
    }

    stopAnimation();
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
      theme === "gradient-ocean"
    ) {
      timerContainer.style.background = "transparent";
    } else {
      timerContainer.style.background = "";
    }

    startAnimation(theme);
    updateLogoTheme(theme);
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
      
      const oceanBg = document.getElementById("ocean");
      if (oceanBg) oceanBg.style.display = "block";
      
      const raw = getAdvRaw(theme);
      const saved = safeJSONParse(raw, {});
      const anim = saved.anim !== false;
      if (anim) {
        initOcean3D(theme);
        currentAnimation = "ocean3d";
      } else {
        currentAnimation = null;
      }
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
    const wCanvas = wc && wc.querySelector("canvas");
    const oCanvas = oc && oc.querySelector("canvas");
    if (wCanvas) wCanvas.remove();
    if (oCanvas) oCanvas.remove();
    if (wc) wc.style.display = "none";
    if (oc) oc.style.display = "none";
    currentAnimation = null;
  }

  window.stopThemeAnimations = function () {
    stopAnimation();
  };

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

  const customFocus = document.getElementById("customFocus");
  const customShort = document.getElementById("customShort");
  const customLong = document.getElementById("customLong");

  window.reapplyBuiltInTheme = function (themeName, opts) {
    const normalized = normalizeTheme(
      themeName || savedTheme || "gradient-default",
    );
    savedTheme = normalized;
    localStorage.setItem("timerTheme", normalized);

    if (typeof ThemeEngine !== "undefined") {

      if (
        opts &&
        opts.userPick &&
        typeof ThemeEngine.getNativeSceneState === "function" &&
        ThemeEngine.getNativeSceneState()
      ) {
        ThemeEngine.deactivateNativeScene();
      }
      ThemeEngine.deactivate({ restorePreset: false });
    }

    if (timerContainer) {
      const oldClasses = Array.from(timerContainer.classList).filter((c) =>
        c.startsWith("theme-"),
      );
      timerContainer.classList.remove(...oldClasses);
      timerContainer.classList.add("theme-" + normalized);
    }
    if (document.body) {
      const oldBodyClasses = Array.from(document.body.classList).filter((c) =>
        c.startsWith("theme-"),
      );
      document.body.classList.remove(...oldBodyClasses);
      document.body.classList.add("theme-" + normalized);
    }

    themeOptions.forEach((o) => o.classList.remove("active"));
    document
      .querySelectorAll(`[data-theme="${normalized}"]`)
      .forEach((o) => o.classList.add("active"));
    syncQsThemeEditState(); 

    updateLogoTheme(normalized);
    applyTheme(normalized);
  };

  window.restoreActiveTheme = function () {
    if (typeof ThemeEngine === "undefined" || !document.body) return;
    const body = document.body;

    const st =
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    if (st && st.sceneId) {
      if (!body.classList.contains("scene-library-active")) {
        ThemeEngine.applyNativeScene(
          st.sceneId,
          st.sceneOptions || {},
          st.sceneBgColor || "",
        );
      }
      return;
    }

    const custom =
      typeof ThemeEngine.getActiveCustomThemeConfig === "function"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    if (custom) {
      if (!body.classList.contains(ThemeEngine.BODY_CLASS)) {
        ThemeEngine.apply(custom);
      }
      return;
    }

    const theme = normalizeTheme(localStorage.getItem("timerTheme")) || "gradient-default";
    const cls = "theme-" + theme;
    if (!body.classList.contains(cls)) {
      [document.body, timerContainer].forEach((el) => {
        if (!el) return;
        Array.from(el.classList)
          .filter((c) => c.startsWith("theme-"))
          .forEach((c) => el.classList.remove(c));
        el.classList.add(cls);
      });
      applyTheme(theme);
    }
  };

  function restoreNativeScene() {
    if (typeof ThemeEngine === "undefined") return;
    const st =
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    if (!st || !st.sceneId) return;
    ThemeEngine.applyNativeScene(
      st.sceneId,
      st.sceneOptions || {},
      st.sceneBgColor || "",
    );
  }

  function initEnhancedSystem() {
    
    if (savedTheme === "gradient-default") {
      const raw = localStorage.getItem("advSettings_gradient-default");
      const s = safeJSONParse(raw, {});
      if (s.start && s.end) applyCustomGradient(s.start, s.end);
      if (s.anim === false) animationEnabled = false;
      else if (s.anim === true) animationEnabled = true;
    }
    applyAutoBreakToggle();

    const activeCustom =
      typeof ThemeEngine !== "undefined"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    if (activeCustom) {
      ThemeEngine.apply(activeCustom);
    } else {
      window.reapplyBuiltInTheme(savedTheme);
    }
  }

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

        taskItem.innerHTML = ""; 
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

    if (categoryChips && categoryChips.length) {
      categoryChips.forEach((chip) => chip.classList.remove("selected"));
    }

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
    /* Wait a frame: the overlay is still inert at this point, so focusing now
       would be ignored. */
    requestAnimationFrame(() => {
      if (titleInput && taskPopup.classList.contains("open")) titleInput.focus();
    });
  }

  function closeTaskPopup() {
    taskPopup.classList.remove("open");
    currentTaskId = null;
    if (plannerAddBtn) plannerAddBtn.focus({ preventScroll: true });
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
      showAlert("Task title is required");
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
    showConfirm("Delete this task?", "Delete", {
      detail: "This cannot be undone.",
    }).then(function (result) {
      if (!result) return;

      tasks = getTasks().filter((t) => t.id !== taskId);
      saveTasks();
      renderTasks();
    });
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

  const tabBtns = document.querySelectorAll(".settings-tab-btn");
  const tabContents = document.querySelectorAll(".settings-tab-content");
  const qsTitle = document.getElementById("qsTitle");

  const QS_TITLES = { themes: "Theme & Clock", statistics: "Study Analytics" };

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((content) => (content.style.display = "none"));

      btn.classList.add("active");
      if (qsTitle && QS_TITLES[tabName]) qsTitle.textContent = QS_TITLES[tabName];
      const activeContent = Array.from(tabContents).find(
        (c) => c.getAttribute("data-tab") === tabName,
      );
      if (activeContent) {
        activeContent.style.display = "block";
        if (tabName === "statistics") updateStatsDisplay();
      }
    });
  });

  document
    .querySelectorAll(
      "#themeModal .qs-step-btn, #advancedSettingsModal .fs-step",
    )
    .forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.input);
      if (!input) return;
      const step = Number(btn.dataset.step) || 0;
      const min = input.min === "" ? -Infinity : Number(input.min);
      const max = input.max === "" ? Infinity : Number(input.max);
      const current = Number(input.value) || 0;
      const next = Math.min(max, Math.max(min, current + step));
      if (next === current) return;
      input.value = String(next);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  function syncClockCardVisibility() {
    const card = document.getElementById("clockSettingsCard");
    if (!card) return;
    const modeSelect = document.getElementById("timerModeSelect");
    card.classList.toggle(
      "is-hidden",
      !!modeSelect && modeSelect.value === "stopwatch",
    );
  }
  const clockModeSelect = document.getElementById("timerModeSelect");
  if (clockModeSelect)
    clockModeSelect.addEventListener("change", syncClockCardVisibility);
  syncClockCardVisibility();

  const qsCloseBtn = document.getElementById("qsCloseBtn");
  if (qsCloseBtn) {
    qsCloseBtn.addEventListener("click", () => {
      if (themeModal) themeModal.classList.remove("open");
    });
  }

  const qsOpenAnalyticsBtn = document.getElementById("qsOpenAnalyticsBtn");
  if (qsOpenAnalyticsBtn) {
    qsOpenAnalyticsBtn.addEventListener("click", () => openAnalytics());
  }

  const qsEditThemeBtn = document.getElementById("qsEditThemeBtn");
  function _activeCustomTheme() {
    return typeof ThemeEngine !== "undefined" &&
      typeof ThemeEngine.getActiveCustomThemeConfig === "function"
      ? ThemeEngine.getActiveCustomThemeConfig()
      : null;
  }
  function syncQsEditThemeBtn() {

    syncQsThemeEditState();
    if (!qsEditThemeBtn) return;
    const active = _activeCustomTheme();
    qsEditThemeBtn.hidden = !active;
    qsEditThemeBtn.title = active
      ? `Edit “${active.name || "active theme"}”`
      : "Edit active theme";
  }
  window.__syncQsEditThemeBtn = syncQsEditThemeBtn;
  if (qsEditThemeBtn) {
    qsEditThemeBtn.addEventListener("click", () => {
      const active = _activeCustomTheme();
      if (!active || typeof ThemeEngine.openEditor !== "function") return;

      if (themeModal) themeModal.classList.remove("open");
      ThemeEngine.openEditor(active);
    });
  }
  syncQsEditThemeBtn();

  function syncQsThemeEditState() {

    document.querySelectorAll("#themeModal .qs-tile-edit").forEach((btn) => {
      const tile = document.querySelector(
        `#themeModal .theme-option[data-theme="${btn.dataset.editTheme}"]`,
      );
      btn.hidden = !(tile && tile.classList.contains("active"));
    });
  }

  function setAdvTab(tabName) {
    document
      .querySelectorAll(".fs-tab-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
    document
      .querySelectorAll(".fs-tab-content")
      .forEach((c) => c.classList.toggle("active", c.id === "tab-" + tabName));
  }

  function openActiveThemeParameters(themeId) {

    const custom = _activeCustomTheme();
    if (custom && typeof ThemeEngine.openEditor === "function") {

      if (themeModal) themeModal.classList.remove("open");
      ThemeEngine.openEditor(custom);
      return;
    }
    const sceneState =
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    if (
      sceneState &&
      sceneState.sceneId &&
      typeof ThemeEngine.openThemeLibrary === "function"
    ) {
      if (themeModal) themeModal.classList.remove("open");
      ThemeEngine.openThemeLibrary();
      return;
    }
    const theme = normalizeTheme(themeId || savedTheme);
    openAdvModal(); 
    setAdvTab("theme");
    const cfg = THEME_CFG[theme];
    const card = cfg ? document.getElementById(cfg.section) : null;
    if (card && typeof card.scrollIntoView === "function")
      card.scrollIntoView({ block: "start" });
  }

  document.querySelectorAll("#themeModal .qs-tile-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {

      e.stopPropagation();
      openActiveThemeParameters(btn.dataset.editTheme);
    });
  });

  function syncQuickStatsRange() {
    const group = document.getElementById("qsStatsRange");
    if (!group) return;
    const range = getQuickStatsRange();
    group.querySelectorAll(".fs-choice-btn").forEach((btn) => {
      const on = btn.dataset.range === range;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  const qsStatsRange = document.getElementById("qsStatsRange");
  if (qsStatsRange) {
    qsStatsRange.querySelectorAll(".fs-choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const range = btn.dataset.range;
        if (!RANGE_LABELS[range]) return;
        localStorage.setItem("quickStatsRange", range);
        syncQuickStatsRange();
        updateStatsDisplay();
      });
    });
  }

  const SHIPPED_DEFAULTS = {
    mode: "pomodoro",
    focus: 25,
    short: 5,
    long: 15,
    range: "all",
    toggles: {
      autoStartBreakToggle: true,
      timerSoundToggle: true,
      breakSoundToggle: true,
      pipAlwaysOnTopToggle: false,
      statisticsToggle: true,
      keepSceneColorsToggle: false,
      tlAutoDetectToggle: true,
    },
  };

  function resetAdvControls() {

    const modeSelect = document.getElementById("timerModeSelect");
    if (modeSelect) {
      modeSelect.value = SHIPPED_DEFAULTS.mode;
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const clock = {
      fsFocus: SHIPPED_DEFAULTS.focus,
      fsShort: SHIPPED_DEFAULTS.short,
      fsLong: SHIPPED_DEFAULTS.long,
    };
    Object.keys(clock).forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = String(clock[id]);
    });
    syncClockCardVisibility();
    Object.keys(SHIPPED_DEFAULTS.toggles).forEach((id) => {
      const box = document.getElementById(id);
      if (box) box.checked = SHIPPED_DEFAULTS.toggles[id];
    });
    localStorage.setItem("quickStatsRange", SHIPPED_DEFAULTS.range);
    syncQuickStatsRange();
    updateStatsDisplay();
  }

  const SETTINGS_KEYS = [
    "timerMode",
    "lastTimerMode",
    "timerModes",
    "currentSubject",
    "autoStartBreak",
    "timerSoundEnabled",
    "breakSoundEnabled",
    "pipAlwaysOnTop",
    "timerAnimationEnabled",
    "timerTheme",
    "themePresets",
    "customThemes",
    "activeCustomThemeId",
    "tlAutoDetectColors",
    "pomoraKeepSceneColors",
    "quickStatsRange",
    "statisticsEnabled",
    "statsPatternView",
    "sceneLibraryState",
  ];

  function resetAllSettings() {
    SETTINGS_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
    
    Object.keys(localStorage)
      .filter((key) => key.indexOf("advSettings_") === 0)
      .forEach((key) => localStorage.removeItem(key));

    window.location.reload();
  }

  const advResetBtn = document.getElementById("advancedSettingsResetBtn");
  if (advResetBtn) {
    advResetBtn.addEventListener("click", resetAdvControls);
  }

  const resetAllSettingsBtn = document.getElementById("resetAllSettingsBtn");
  if (resetAllSettingsBtn) {
    resetAllSettingsBtn.addEventListener("click", () => {
      showConfirm("Reset all settings?", "Reset all settings", {
        detail:
          "Themes, scenes, clock and toggles go back to their defaults. Your study history and planner tasks are kept.",
      }).then((ok) => {
        if (ok) resetAllSettings();
      });
    });
  }

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

  const savedSubject = localStorage.getItem("currentSubject");
  if (savedSubject && subjectSelect) {
    subjectSelect.value = savedSubject;
    currentSubject = savedSubject;
  }

  window.openTaskPopup = openTaskPopup;
  window.updateTaskStatus = updateTaskStatus;
  window.deleteTask = deleteTask;
  window.setFilter = setFilter;

  const MINI_CLOSE_GLYPH =
    '<svg class="uo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';

  const MINI_TILE_GLYPH = {
    trash:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>',
    alert:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>',
    pencil:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" /></svg>',
    import:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg>',
    share:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>',
  };

  function closeMiniPopup(backdrop) {
    if (!backdrop || backdrop.classList.contains("closing")) return;
    backdrop.classList.add("closing");
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      backdrop.remove();
      return;
    }
    setTimeout(function () {
      backdrop.remove();
    }, 180);
  }

  function showMiniPopup(opts) {
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return new Promise(function (resolve) {
      const backdrop = document.createElement("div");
      backdrop.className = "confirm-backdrop";

      const card = document.createElement("div");

      card.className = opts.lede ? "confirm-card confirm-card-alert" : "confirm-card";
      card.setAttribute("role", "alertdialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-label", opts.message);

      const header = document.createElement("div");
      header.className = "confirm-header";

      const lead = document.createElement("div");
      lead.className = "confirm-lead";
      const tile = document.createElement("span");
      tile.className = "confirm-tile";
      tile.innerHTML = MINI_TILE_GLYPH[opts.tile] || MINI_TILE_GLYPH.alert;
      const msg = document.createElement("p");
      msg.className = "confirm-message";
      msg.textContent = opts.message;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "confirm-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = MINI_CLOSE_GLYPH;
      lead.appendChild(tile);
      lead.appendChild(msg);
      header.appendChild(lead);
      header.appendChild(closeBtn);
      card.appendChild(header);

      if (opts.detail) {
        const detail = document.createElement("p");
        detail.className = "confirm-detail";
        detail.textContent = opts.detail;
        card.appendChild(detail);
      }

      const actions = document.createElement("div");
      actions.className = "confirm-actions";
      let firstBtn = null;
      (opts.buttons || [{ label: "OK", cls: "confirm-btn-primary", value: true }]).forEach(
        function (spec) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = spec.cls;
          btn.textContent = spec.label;
          btn.addEventListener("click", function () {
            done(spec.value);
          });
          if (!firstBtn) firstBtn = btn;
          actions.appendChild(btn);
        },
      );
      card.appendChild(actions);
      backdrop.appendChild(card);

      function done(value) {
        document.removeEventListener("keydown", onKey, true);

        closeMiniPopup(backdrop);
        if (opener && opener.focus) opener.focus();
        resolve(value);
      }

      function dismiss() {
        done(opts.dismissValue === undefined ? null : opts.dismissValue);
      }

      function onKey(e) {
        if (e.key !== "Escape") return;

        e.stopImmediatePropagation();
        e.stopPropagation();
        dismiss();
      }

      closeBtn.addEventListener("click", dismiss);
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) dismiss();
      });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(backdrop);

      card.setAttribute("tabindex", "-1");
      setTimeout(function () {
        card.focus({ preventScroll: true });
      }, 0);
    });
  }

  function showConfirm(message, confirmLabel, opts) {
    opts = opts || {};
    return showMiniPopup({
      message: message,
      detail: opts.detail,

      tile: opts.tile || "trash",
      buttons: [
        { label: "Cancel", cls: "confirm-btn-cancel", value: false },
        {
          label: confirmLabel || "Reset",
          cls: opts.danger === false ? "confirm-btn-primary" : "confirm-btn-danger",
          value: true,
        },
      ],
    });
  }

  function showAlert(message) {
    return showMiniPopup({
      message: message,
      lede: true,
      tile: "alert",
      dismissValue: true,
      buttons: [{ label: "OK", cls: "confirm-btn-primary", value: true }],
    });
  }

  const analyticsModal = document.getElementById("statisticsModal");
  const analyticsBackdrop = document.getElementById("analyticsBackdrop");
  const analyticsCloseBtn = document.getElementById("statisticsCloseBtn");
  const statsResetBtn2 = document.getElementById("statsResetBtn");
  const statsImportBtn = document.getElementById("statsImportBtn");
  const statsImportInput = document.getElementById("statsImportInput");
  const statsExportBtn = document.getElementById("statsExportBtn");
  const toggleSessionBtn = document.getElementById("toggleSessionHistory");
  const activityCardLabel = document.getElementById("activityCardLabel");
  const momentumCard = document.getElementById("statMomentumCard");
  const patternCard = document.getElementById("statPatternCard");
  const patternBody = document.getElementById("patternBody");
  const patternHeatBtn = document.getElementById("patternHeatBtn");
  const patternRhythmBtn = document.getElementById("patternRhythmBtn");
  const patternEyebrowWord = document.getElementById("patternEyebrowWord");
  const patternScope = document.getElementById("patternScope");
  const sessionLogModal = document.getElementById("sessionLogModal");
  const sessionLogBackdrop = document.getElementById("sessionLogBackdrop");
  const sessionLogClose = document.getElementById("sessionLogClose");
  const sessionLogSummary = document.getElementById("sessionLogSummary");
  const sessionLogList = document.getElementById("sessionLogList");

  let analyticsRange = "today";
  let statsPatternView = "heat";

  try {
    const storedView = localStorage.getItem("statsPatternView");
    if (storedView === "rhythm" || storedView === "heat")
      statsPatternView = storedView;
  } catch (e) {
    }

  /* One hue per subject, fixed by subject rather than by rank, so a subject
     keeps its colour between the progress bars, the session dots and the
     range filters. The nine named subjects are an explicit, non-overlapping
     palette (user, 2026-10-23): red maths, deep blue CS, orange chemistry,
     teal biology, cyan physics, green economics, gold business, purple
     psychology, fuschia statistics. Anything else gets a stable high-
     saturation hue from its name, which can never collide with the named set
     by accident because the named set is checked first. */
  const SUBJECT_TOKENS = {
    mathematics: "#ef4444",
    maths: "#ef4444",
    math: "#ef4444",
    "computer science": "#2563eb",
    computer_science: "#2563eb",
    computerscience: "#2563eb",
    compsci: "#2563eb",
    computing: "#2563eb",
    cs: "#2563eb",
    chemistry: "#f97316",
    chem: "#f97316",
    biology: "#14b8a6",
    bio: "#14b8a6",
    physics: "#06b6d4",
    phys: "#06b6d4",
    economics: "#22c55e",
    econ: "#22c55e",
    business: "#eab308",
    "business studies": "#eab308",
    psychology: "#a855f7",
    psych: "#a855f7",
    psyc: "#a855f7",
    statistics: "#ec4899",
    stats: "#ec4899",
  };
  const BREAK_COLOR = "#64748b";

  function subjectColor(name) {
    const key = String(name || "")
      .trim()
      .toLowerCase();
    if (!key) return "#64748b";
    if (SUBJECT_TOKENS[key]) return SUBJECT_TOKENS[key];

    let hash = 0;
    for (let i = 0; i < key.length; i++)
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    /* Golden-angle spread over the wheel: adjacent names land far apart, and a
       78% / 58% HSL pair keeps the fallback as vivid as the named palette.
       If that hue lands near one of the nine named ones (English used to come
       out a hair from Computer Science's blue), step again — "distinct at a
       glance" has to hold for unnamed subjects too. */
    const namedHues = [0, 25, 47, 142, 173, 190, 220, 275, 330];
    const hueDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    let hue = (hash * 137.508) % 360;
    for (let guard = 0; guard < 12; guard++) {
      if (!namedHues.some((h) => hueDistance(hue, h) < 24)) break;
      hue = (hue + 137.508) % 360;
    }
    return `hsl(${Math.round(hue)} 78% 58%)`;
  }

  const RANGE_SCOPE = {
    today: "· today",
    week: "· this week",
    month: "· this month",
    all: "· all time",
  };

  function startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  function activeRangeOptions(range, stats) {
    const now = new Date();
    const opts = { now, buckets: 8 };
    if (range === "today") {
      opts.from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
      opts.from = startOfWeek(now);
    } else if (range === "month") {
      opts.from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      const all = (stats ? stats.sessions : [])
        .map((s) => new Date(s.date))
        .filter((d) => !isNaN(d));
      const first = all.length ? new Date(Math.min(...all)) : now;
      opts.from = new Date(first.getTime() - 1);
    }
    const spanDays = Math.max(1, Math.ceil((opts.now - opts.from) / 864e5));
    opts.spanDays = spanDays;
    opts.bucketDays = Math.max(1, Math.ceil(spanDays / opts.buckets));
    opts.minDays = spanDays < 2 ? 1 : 2;
    opts.minSessions = spanDays < 2 ? 2 : 5;
    if (range === "all") opts.scoringDays = Math.min(30, spanDays);
    return opts;
  }

  function getFilteredStats(range, stats) {
    const all = stats || getStats();
    const opts = activeRangeOptions(range, all);
    const sessions = all.sessions.filter((s) => {
      const d = new Date(s.date);
      if (range === "all") return true;
      return d >= opts.from && d <= opts.now;
    });
    const totalStudyTime = sessions
      .filter((s) => s.type === "focus")
      .reduce((a, s) => a + s.duration, 0);
    const totalBreakTime = sessions
      .filter((s) => s.type !== "focus")
      .reduce((a, s) => a + s.duration, 0);
    const subjectTime = subjectTotals(sessions);
    return { sessions, totalStudyTime, totalBreakTime, subjectTime, opts };
  }

  const fmtMinutes = (mins) => formatStudyMinutes(mins);

  function renderMomentum(stats, opts, range) {
    if (!momentumCard) return;
    momentumCard.hidden = false;
    const m = StatsMetrics.momentum(stats.sessions, opts);
    const days = m.days;
    const noun =
      range === "today"
        ? "today"
        : range === "week"
          ? "this week"
          : range === "month"
            ? "this month"
            : "in your history";

    const scoreEl = document.getElementById("momScore");
    const deltaEl = document.getElementById("momDelta");
    const weekEl = document.getElementById("momWeek");
    const daysEl = document.getElementById("momDays");
    const avgEl = document.getElementById("momAvg");
    const windowEl = document.getElementById("momWindowLabel");
    const scopeEl = document.getElementById("momScope");
    const insightEl = document.getElementById("momInsight");

    if (scoreEl) scoreEl.textContent = m.sessionCount ? String(m.score) : "–";
    if (weekEl) weekEl.textContent = fmtMinutes(m.weekMinutes);
    if (daysEl) daysEl.textContent = `${m.activeDays}/${days}`;
    if (avgEl) avgEl.textContent = fmtMinutes(m.avgSession);
    if (windowEl) windowEl.textContent = RANGE_LABELS[range] || "This week";

    if (scopeEl) {
      scopeEl.textContent =
        range === "all"
          ? "All-Time Overall Score"
          : `${days}-day score vs previous ${days === 1 ? "day" : `${days} days`}`;
    }

    if (deltaEl) {
      const showDelta = range !== "all" && m.hasPrevious;
      deltaEl.hidden = !showDelta;
      if (showDelta) {
        const dir = m.delta > 0 ? "up" : m.delta < 0 ? "down" : "flat";
        deltaEl.className = `mom-delta ${dir}`;
        deltaEl.textContent = `${
          dir === "up" ? "▲" : dir === "down" ? "▼" : "●"
        } ${Math.abs(m.delta)}`;
      } else {
        deltaEl.textContent = "";
      }
    }

    if (insightEl) {
      if (!m.sessionCount) insightEl.textContent = `No study sessions ${noun}.`;
      else if (range === "all" || !m.hasPrevious)
        insightEl.textContent = `${fmtMinutes(m.weekMinutes)} studied ${noun}, with no earlier period to compare against.`;
      else if (m.delta > 0)
        insightEl.textContent = `Up ${m.delta} points on the previous ${days === 1 ? "day" : `${days} days`}, ${fmtMinutes(m.weekMinutes)} studied.`;
      else if (m.delta < 0)
        insightEl.textContent = `Down ${Math.abs(m.delta)} points on the previous ${days === 1 ? "day" : `${days} days`}. Keep the rhythm going.`;
      else
        insightEl.textContent = `Holding steady at ${m.score}, with ${fmtMinutes(m.weekMinutes)} studied ${noun}.`;
    }

    const spark = document.getElementById("momSpark");
    if (spark) {
      const trend = m.trend || [];
      const max = Math.max(...trend, 1);
      spark.innerHTML = "";
      trend.forEach((mins, i) => {
        const bar = createSafeElement("div", {
          class:
            "bar" + (!mins ? " empty" : i === trend.length - 1 ? " now" : ""),
          style: `height:${mins ? Math.max(14, Math.round((mins / max) * 100)) : 6}%`,
          "data-tip": `${fmtMinutes(mins)}`,
        });
        spark.appendChild(bar);
      });
    }

    const axisFrom = document.getElementById("momSparkAxisFrom");
    if (axisFrom)
      axisFrom.textContent = `${m.bucketDays * (m.trend || []).length} days ago`;

    const note = document.getElementById("momSparkNote");
    if (note) {
      if (m.bestWeek && m.bestWeek.minutes > 0)
        note.textContent =
          `Best: ${fmtMinutes(m.bestWeek.minutes)}` +
          (m.bestWeek.weeksAgo === 0
            ? " (current)"
            : ` (${m.bestWeek.weeksAgo * m.bucketDays} days ago)`);
      else note.textContent = "No study time in this window yet.";
    }
  }

  function renderPattern(stats, opts) {
    if (!patternBody) return;
    if (patternCard) patternCard.hidden = false;
    const view = statsPatternView === "rhythm" ? "rhythm" : "heat";
    if (patternEyebrowWord)
      patternEyebrowWord.textContent =
        view === "rhythm" ? "Study Rhythm" : "Study Pattern";
    if (patternScope)
      patternScope.textContent = RANGE_SCOPE[analyticsRange] || "· today";
    if (patternHeatBtn) {
      patternHeatBtn.classList.toggle("active", view === "heat");
      patternHeatBtn.setAttribute("aria-pressed", String(view === "heat"));
    }
    if (patternRhythmBtn) {
      patternRhythmBtn.classList.toggle("active", view === "rhythm");
      patternRhythmBtn.setAttribute("aria-pressed", String(view === "rhythm"));
    }

    patternBody.innerHTML = "";

    if (view === "rhythm") {
      const rh = StatsMetrics.rhythm(stats.sessions, {
        ...opts,
        minSessions: opts.minSessions === 5 ? 3 : opts.minSessions,
      });
      if (!rh.hasEnough) {
        patternBody.appendChild(
          createSafeElement(
            "p",
            { class: "stat-empty" },
            `Not enough data yet: ${Math.max(1, rh.minSessions - rh.sessionCount)} more study session${Math.max(1, rh.minSessions - rh.sessionCount) === 1 ? "" : "s"} in this window.`,
          ),
        );
        return;
      }
      const hist = createSafeElement("div", { class: "rh-hist" });
      rh.buckets.forEach((b) => {
        const col = createSafeElement("div", { class: "rh-col" });
        col.appendChild(
          createSafeElement("span", { class: "rh-count" }, String(b.count)),
        );
        col.appendChild(
          createSafeElement("div", {
            class: "rh-bar",
            style: `height:${Math.max(4, Math.round((b.count / rh.max) * 100))}%`,
          }),
        );
        hist.appendChild(col);
      });
      patternBody.appendChild(hist);
      const labels = createSafeElement("div", { class: "rh-labels" });
      rh.buckets.forEach((b) =>
        labels.appendChild(createSafeElement("span", {}, b.label)),
      );
      patternBody.appendChild(labels);

      const callout = createSafeElement(
        "p",
        { class: "stat-callout" },
        `Median session ${fmtMinutes(rh.median)} across ${rh.sessionCount} study session${rh.sessionCount === 1 ? "" : "s"}.`,
      );
      patternBody.appendChild(callout);

      const subs = createSafeElement("div", { class: "rh-subs" });
      [
        [`${rh.coverage}%`, "Break coverage"],
        [fmtMinutes(rh.avgBreak), "Average break"],
        [String(rh.sessionCount), "Sessions logged"],
      ].forEach(([v, k]) => {
        const sub = createSafeElement("div", { class: "rh-sub" });
        sub.appendChild(createSafeElement("span", { class: "v" }, v));
        sub.appendChild(createSafeElement("span", { class: "k" }, k));
        subs.appendChild(sub);
      });
      patternBody.appendChild(subs);
      return;
    }

    const hm = StatsMetrics.heatmap(stats.sessions, opts);
    if (!hm.hasEnough) {
      const needSessions = Math.max(0, hm.minSessions - hm.sessionCount);
      const needDays = Math.max(0, hm.minDays - hm.activeDays);

      const days = `${needDays} more day${needDays === 1 ? "" : "s"}`;
      const sessions = `${needSessions} more study session${needSessions === 1 ? "" : "s"}`;
      let msg = "Not enough data yet.";
      if (needSessions && needDays)
        msg = `Not enough data yet: ${sessions} across ${days}.`;
      else if (needSessions) msg = `Not enough data yet: ${sessions}.`;
      else if (needDays) msg = `Not enough data yet: sessions on ${days}.`;
      patternBody.appendChild(
        createSafeElement("p", { class: "stat-empty" }, msg),
      );
      return;
    }

    const maxMins = Math.max(...hm.mins.flat(), 1);
    const wrap = createSafeElement("div", { class: "hm-wrap" });
    const dayCol = createSafeElement("div", { class: "hm-days" });
    StatsMetrics.WEEKDAYS.forEach((d) =>
      dayCol.appendChild(createSafeElement("span", {}, d)),
    );
    wrap.appendChild(dayCol);

    const grid = createSafeElement("div", { class: "hm-grid" });
    hm.mins.forEach((row, wd) => {
      const rowEl = createSafeElement("div", { class: "hm-row" });
      row.forEach((mins, hour) => {
        const cell = createSafeElement("div", {
          class:
            "hm-cell" +
            (hm.peak && hm.peak.wd === wd && hm.peak.hour === hour
              ? " peak"
              : ""),

          style: mins
            ? `background:color-mix(in srgb, var(--an-accent, #6366f1) ${Math.max(
                12,
                Math.round((mins / maxMins) * 100),
              )}%, rgba(255,255,255,0.045))`
            : "",
          "data-tip": `${StatsMetrics.WEEKDAYS[wd]} ${String(hour).padStart(2, "0")}:00, ${fmtMinutes(mins)}`,
        });
        rowEl.appendChild(cell);
      });
      grid.appendChild(rowEl);
    });
    wrap.appendChild(grid);
    patternBody.appendChild(wrap);

    const hours = createSafeElement("div", { class: "hm-hours" });
    for (let h = 0; h < 24; h++)
      hours.appendChild(
        createSafeElement("span", {}, h % 6 === 0 ? String(h) : ""),
      );
    patternBody.appendChild(hours);

    if (hm.peak)
      patternBody.appendChild(
        createSafeElement(
          "p",
          { class: "stat-callout" },
          `Peak ${hm.peakLabel}: ${fmtMinutes(hm.peak.perDay)} avg across ${hm.peak.occurrences} day${hm.peak.occurrences === 1 ? "" : "s"}.`,
        ),
      );

    const legend = createSafeElement("div", { class: "hm-legend" });
    legend.appendChild(createSafeElement("span", {}, "Less"));
    [12, 38, 64, 100].forEach((pct) =>
      legend.appendChild(
        createSafeElement("i", {

          style: `background:color-mix(in srgb, var(--an-accent, #6366f1) ${pct}%, rgba(255,255,255,0.045))`,
        }),
      ),
    );
    legend.appendChild(createSafeElement("span", {}, "More"));
    patternBody.appendChild(legend);
  }

  function renderAnalytics() {
    const stats = getStats();
    const data = getFilteredStats(analyticsRange, stats);
    const opts = data.opts;
    const streak = StatsMetrics.streakOf(stats.sessions);

    const label = document.getElementById("analyticsDateLabel");
    if (label) {
      if (analyticsRange === "today")
        label.textContent = new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });
      else label.textContent = RANGE_LABELS[analyticsRange] || "";
    }

    const studyEl = document.getElementById("kpiStudyTime");
    const breakEl = document.getElementById("kpiBreakTime");
    const sessEl = document.getElementById("kpiSessions");
    const strkEl = document.getElementById("kpiStreak");
    if (studyEl)
      animateValue(studyEl, Math.round(data.totalStudyTime), fmtMinutes);
    if (breakEl)
      animateValue(breakEl, Math.round(data.totalBreakTime), fmtMinutes);
    if (sessEl)
      animateValue(
        sessEl,
        data.sessions.filter((s) => s.type === "focus").length,
      );
    if (strkEl) animateValue(strkEl, streak);

    const analyticsHint = document.getElementById("analyticsHint");
    if (analyticsHint)
      analyticsHint.hidden = data.sessions.some((s) => s.type === "focus");

    const maxVal = Math.max(
      data.totalStudyTime,
      data.totalBreakTime,
      data.sessions.length * 5,
      streak * 10,
      1,
    );

    const pct = (val) => Math.min(100, (val / maxVal) * 100) + "%";
    setTimeout(() => {
      const bars = {
        kpiStudyBar: data.totalStudyTime,
        kpiBreakBar: data.totalBreakTime,
        kpiSessionsBar: data.sessions.length * 5,
        kpiStreakBar: streak * 10,
      };
      Object.entries(bars).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.style.width = pct(val);
      });
    }, 50);

    renderMomentum(stats, opts, analyticsRange);
    renderPattern(stats, opts);
    renderActivityChart(data, opts);
    renderSubjectList(data);
    renderSessionLog(data);
  }

  const DEMO_BACKUP_KEY = "timerStats_demoBackup";
  const DEMO_ACTIVE_KEY = "timerStats_demoActive";
  const DEMO_SUBJECTS = [
    "Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
    "Economics",
    "Computer Science",
    "English Language",
    "Statistics",
  ];
  function buildDemoStats() {
    const sessions = [];
    const subjectTime = {};
    let totalStudyTime = 0;
    let totalBreakTime = 0;
    const now = Date.now();
    for (let back = 41; back >= 0; back--) {
      const day = new Date(now - back * 86400000);

      if (back % 13 === 6) continue;
      const count = 1 + ((back * 7) % 3);
      for (let i = 0; i < count; i++) {
        const duration = [25, 40, 45, 50, 60, 75, 90][(back + i * 3) % 7];
        const at = new Date(day);
        at.setHours(9 + ((back + i * 5) % 11), (i * 17) % 60, 0, 0);
        const subject = DEMO_SUBJECTS[(back + i) % DEMO_SUBJECTS.length];
        sessions.push({
          type: "focus",
          duration,
          subject,
          date: at.toISOString(),
        });
        totalStudyTime += duration;
        subjectTime[subject] = (subjectTime[subject] || 0) + duration;
        const breakLen = duration >= 60 ? 10 : 5;
        sessions.push({
          type: "break",
          duration: breakLen,
          subject: "",
          date: new Date(at.getTime() + duration * 60000).toISOString(),
        });
        totalBreakTime += breakLen;
      }
    }
    return { totalStudyTime, totalBreakTime, sessions, subjectTime };
  }
  function seedDemoStats(force) {
    const existing = getStats();
    if ((existing.sessions || []).length && !force) {
      console.warn(
        "[PomoraDemo] This profile already has sessions. Call PomoraDemo.seed(true) to overwrite. Nothing was changed.",
      );
      return false;
    }
    if (localStorage.getItem(DEMO_ACTIVE_KEY) !== "1")
      localStorage.setItem(
        DEMO_BACKUP_KEY,
        localStorage.getItem("timerStats") || "",
      );
    saveStats(buildDemoStats());
    localStorage.setItem(DEMO_ACTIVE_KEY, "1");
    renderAnalytics();
    updateStatsDisplay();
    console.info(
      "[PomoraDemo] Demo profile active for review. PomoraDemo.clear() puts your own stats back.",
    );
    return true;
  }
  function clearDemoStats() {
    const backup = localStorage.getItem(DEMO_BACKUP_KEY);
    if (backup) localStorage.setItem("timerStats", backup);
    else localStorage.removeItem("timerStats");
    localStorage.removeItem(DEMO_BACKUP_KEY);
    localStorage.removeItem(DEMO_ACTIVE_KEY);
    renderAnalytics();
    updateStatsDisplay();
    console.info("[PomoraDemo] Demo profile cleared.");
    return true;
  }
  window.PomoraDemo = {
    seed: (force) => seedDemoStats(!!force),
    clear: () => clearDemoStats(),
    info: () => ({
      active: localStorage.getItem(DEMO_ACTIVE_KEY) === "1",
      sessions: (getStats().sessions || []).length,
      usage: "seed() · seed(true) to overwrite real stats · clear()",
    }),
  };
  if (new URLSearchParams(location.search).get("statsDemo") === "1") {
    setTimeout(() => seedDemoStats(false), 0);
  }

  function renderActivityChart(data, opts) {
    const chartArea = document.getElementById("activityChart");
    const xLabels = document.getElementById("chartXLabels");
    if (!chartArea || !xLabels) return;
    if (activityCardLabel)
      activityCardLabel.textContent =
        {
          today: "Daily Activity",
          week: "Weekly Activity",
          month: "Monthly Activity",
          all: "All-Time Activity",
        }[analyticsRange] || "Activity";

    const buckets = [];
    if (analyticsRange === "today") {
      for (let h = 0; h < 24; h += 4) {
        buckets.push({
          from: h,
          to: h + 4,
          label: `${String(h).padStart(2, "0")}h–${String(h + 4).padStart(2, "0")}h`,
          month: "",
        });
      }
    } else if (analyticsRange === "all") {

      const first = new Date(opts.from);
      let cur = new Date(first.getFullYear(), first.getMonth(), 1);
      const end = opts.now;
      while (cur <= end) {
        const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        buckets.push({
          from: new Date(cur),
          to: next,

          label: cur.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          month: "",
        });
        cur = next;
      }
    } else {
      const from = new Date(
        opts.from.getFullYear(),
        opts.from.getMonth(),
        opts.from.getDate(),
      );
      const days = Math.max(1, Math.round((opts.now - from) / 864e5) + 1);
      const step = Math.max(1, Math.ceil(days / 62));
      for (let i = 0; i < days; i += step) {
        const d = new Date(from.getTime() + i * 864e5);
        buckets.push({
          from: d,
          to: new Date(d.getTime() + step * 864e5),
          label: String(d.getDate()),
          month: d.toLocaleDateString("en-GB", { month: "short" }),
        });
      }
    }

    const rows = buckets.map((b) => {
      const inBucket = (s) => {
        const d = new Date(s.date);
        if (analyticsRange === "today") {
          return (
            d.toDateString() === opts.now.toDateString() &&
            d.getHours() >= b.from &&
            d.getHours() < b.to
          );
        }
        return d >= b.from && d < b.to;
      };
      return {
        ...b,
        study: data.sessions
          .filter((s) => s.type === "focus" && inBucket(s))
          .reduce((a, s) => a + s.duration, 0),
        brk: data.sessions
          .filter((s) => s.type !== "focus" && inBucket(s))
          .reduce((a, s) => a + s.duration, 0),
      };
    });

    const maxBar = Math.max(...rows.map((r) => Math.max(r.study, r.brk)), 1);

    const tipPrefix = (r) =>
      analyticsRange === "all" && r.month === "" && r.label ? `${r.label} · ` : "";
    chartArea.innerHTML = "";
    rows.forEach((r) => {
      const wrap = createSafeElement("div", { class: "chart-bar-wrap" });
      if (r.study > 0)
        wrap.appendChild(
          createSafeElement("div", {
            class: "chart-bar study-bar",
            style: `height:${Math.max(4, Math.round((r.study / maxBar) * 100))}%;min-height:4px`,
            "data-tip": `${tipPrefix(r)}${fmtMinutes(r.study)} study`,
          }),
        );
      if (r.brk > 0)
        wrap.appendChild(
          createSafeElement("div", {
            class: "chart-bar break-bar",
            style: `height:${Math.max(4, Math.round((r.brk / maxBar) * 100))}%;min-height:4px`,
            "data-tip": `${tipPrefix(r)}${fmtMinutes(r.brk)} break`,
          }),
        );
      if (!r.study && !r.brk)
        wrap.appendChild(
          createSafeElement("div", {
            class: "chart-bar empty-bar",
            style:
              "height:4px;min-height:4px;background:rgba(255,255,255,0.04);border-radius:2px",
          }),
        );
      chartArea.appendChild(wrap);
    });

    xLabels.innerHTML = "";
    /* Thin the tick labels to about eight, and keep an (empty) tick cell for
       every bucket so the axis stays aligned with the bars. 24–31 ticks each
       carrying "3" + "OCT" gave the axis a 616px min-content width inside a
       245px card, which is what pushed the whole analytics panel sideways at
       narrow widths. */
    const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
    rows.forEach((r, i) => {
      const tick = createSafeElement("span", { class: "chart-x-label" });
      if (i % labelEvery === 0) {
        tick.appendChild(
          createSafeElement("span", { class: "chart-x-label-top" }, r.label),
        );
        tick.appendChild(
          createSafeElement("span", { class: "chart-x-label-bottom" }, r.month),
        );
      }
      xLabels.appendChild(tick);
    });
  }

  function renderSubjectList(data) {
    const list = document.getElementById("subjectList");
    if (!list) return;
    const entries = Object.entries(data.subjectTime || {}).sort(
      (a, b) => b[1] - a[1],
    );
    list.innerHTML = "";
    if (!entries.length) {

      list.appendChild(
        createSafeElement(
          "p",
          { class: "analytics-empty" },
          EMPTY_SUBJECTS[analyticsRange] || EMPTY_SUBJECTS.all,
        ),
      );
      return;
    }
    const maxMins = entries[0][1];
    entries.forEach(([subj, mins]) => {
      const pct = Math.round((mins / maxMins) * 100);
      const row = createSafeElement("div", { class: "subject-row" });
      const top = createSafeElement("div", { class: "subject-row-top" });
      top.appendChild(
        createSafeElement(
          "span",
          { class: "subject-name" },
          sanitizeInput(subj),
        ),
      );
      top.appendChild(
        createSafeElement("span", { class: "subject-time" }, fmtMinutes(mins)),
      );
      row.appendChild(top);
      const progress = createSafeElement("div", { class: "subject-progress" });
      progress.appendChild(
        createSafeElement("div", {
          class: "subject-progress-fill",
          style: `width:0%;background:${subjectColor(subj)}`,
          "data-pct": `${pct}`,
        }),
      );
      row.appendChild(progress);
      list.appendChild(row);
    });
    setTimeout(() => {
      list.querySelectorAll(".subject-progress-fill").forEach((el) => {
        el.style.width = el.dataset.pct + "%";
      });
    }, 80);
  }

  function buildSessionEntry(s) {
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
    const title = isFocus
      ? (s.subject || "").trim() || UNSPECIFIED_LABEL
      : "Break";

    const entry = createSafeElement("div", { class: "session-entry" });
    entry.appendChild(
      createSafeElement("div", {
        class: `session-dot ${isFocus ? "focus" : "break"}`,
        style: `background:${isFocus ? subjectColor(s.subject) : BREAK_COLOR}`,
      }),
    );
    const info = createSafeElement("div", { class: "session-entry-info" });
    info.appendChild(
      createSafeElement(
        "span",
        { class: "session-entry-title" },
        sanitizeInput(title || UNSPECIFIED_LABEL),
      ),
    );
    info.appendChild(
      createSafeElement("span", { class: "session-entry-sub" }, dateStr),
    );
    entry.appendChild(info);
    entry.appendChild(
      createSafeElement(
        "span",
        { class: "session-entry-duration" },
        fmtMinutes(s.duration),
      ),
    );
    return entry;
  }

  function renderSessionLog(data) {
    const log = document.getElementById("sessionHistory");
    if (!log) return;
    const sessions = [...data.sessions].reverse();
    if (toggleSessionBtn)
      toggleSessionBtn.textContent = `Show all (${sessions.length})`;
    log.className = "session-log";
    log.innerHTML = "";
    if (!sessions.length) {

      log.appendChild(
        createSafeElement(
          "p",
          { class: "analytics-empty" },
          EMPTY_SESSIONS[analyticsRange] || EMPTY_SESSIONS.all,
        ),
      );
      return;
    }
    sessions.slice(0, 5).forEach((s) => log.appendChild(buildSessionEntry(s)));
  }

  function setSessionLogOpen(open) {
    if (!sessionLogModal) return;
    sessionLogModal.classList.toggle("open", open);
    sessionLogModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function openSessionLog() {
    if (!sessionLogModal) return;
    const data = getFilteredStats(analyticsRange);
    const sessions = [...data.sessions].reverse();
    if (sessionLogSummary) {
      sessionLogSummary.innerHTML = "";

      const badges = [
        `${sessions.length} Session${sessions.length === 1 ? "" : "s"}`,
        `${fmtMinutes(data.totalStudyTime)} Study`,
        RANGE_LABELS[analyticsRange] || "Today",
      ];
      badges.forEach((text) => {
        sessionLogSummary.appendChild(
          createSafeElement("span", { class: "sessionlog-badge" }, text),
        );
      });
    }
    if (sessionLogList) {
      sessionLogList.innerHTML = "";
      if (!sessions.length)
        sessionLogList.appendChild(
          createSafeElement(
            "p",
            { class: "analytics-empty" },
            "No sessions yet",
          ),
        );
      else
        sessions.forEach((s) =>
          sessionLogList.appendChild(buildSessionEntry(s)),
        );
    }
    setSessionLogOpen(true);
  }

  function closeSessionLog() {
    setSessionLogOpen(false);
  }

  function openAnalytics() {
    if (themeModal) themeModal.classList.remove("open");
    if (analyticsModal) analyticsModal.classList.add("open");
    renderAnalytics();
  }

  function closeAnalytics() {
    closeSessionLog();
    if (analyticsModal) analyticsModal.classList.remove("open");
  }

  function animateValue(el, target, format) {
    const start = parseFloat(el.dataset.rawValue) || 0;
    const duration = 600;
    const startTime = performance.now();
    el.dataset.rawValue = String(target);
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const value = Math.round(start + (target - start) * ease);
      el.textContent = format ? format(value) : String(value);
      if (p < 1) requestAnimationFrame(step);
    }
    if (!duration) {
      el.textContent = format ? format(target) : String(target);
      return;
    }
    requestAnimationFrame(step);
  }

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

  if (patternHeatBtn)
    patternHeatBtn.addEventListener("click", () => {
      statsPatternView = "heat";
      try {
        localStorage.setItem("statsPatternView", "heat");
      } catch (e) {}
      renderAnalytics();
    });
  if (patternRhythmBtn)
    patternRhythmBtn.addEventListener("click", () => {
      statsPatternView = "rhythm";
      try {
        localStorage.setItem("statsPatternView", "rhythm");
      } catch (e) {}
      renderAnalytics();
    });

  if (toggleSessionBtn)
    toggleSessionBtn.addEventListener("click", openSessionLog);
  if (sessionLogClose)
    sessionLogClose.addEventListener("click", closeSessionLog);
  if (sessionLogBackdrop)
    sessionLogBackdrop.addEventListener("click", closeSessionLog);

  if (statsResetBtn2)
    statsResetBtn2.addEventListener("click", function () {
      showConfirm("Reset all statistics?", undefined, {
        detail: "This cannot be undone.",
      }).then(function (result) {
          if (result) {
            resetStats();
            renderAnalytics();
          }
        },
      );
    });

  if (statsExportBtn)
    statsExportBtn.addEventListener("click", () => {
      const stats = getStats();
      const rows = [["Type", "Subject", "Duration (min)", "Date"]];
      stats.sessions.forEach((s) => {
        rows.push([s.type, s.subject || "", s.duration, s.date]);
      });
      const csv = rows
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv," + encodeURIComponent(csv);
      a.download = "study-sessions.csv";
      a.click();
    });

  function parseCSVLine(line) {
    const values = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === "," && !quoted) {
        values.push(value.trim());
        value = "";
      } else value += char;
    }
    values.push(value.trim());
    return values;
  }

  function parseImportedDate(values, dateIndex) {
    const rawDate = values.slice(dateIndex).join(",").trim();
    let date = new Date(rawDate);
    if (!Number.isNaN(date.getTime())) return date;
    
    const localeMatch = rawDate.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(.*))?$/,
    );
    if (!localeMatch) return null;
    const first = Number(localeMatch[1]);
    const second = Number(localeMatch[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const time = localeMatch[4] || "";
    date = new Date(
      `${month}/${day}/${localeMatch[3]}${time ? ` ${time}` : ""}`,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function importStatsCSV(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "")
        .split(/\r?\n/)
        .filter((line) => line.trim());
      if (lines.length < 2) {
        showAlert("The CSV file does not contain any sessions.");
        return;
      }
      const header = parseCSVLine(lines[0]).map((value) =>
        value.replace(/^\uFEFF/, "").toLowerCase(),
      );
      const typeIndex = header.indexOf("type");
      const subjectIndex = header.indexOf("subject");
      const durationIndex = header.indexOf("duration (min)");
      const dateIndex = header.indexOf("date");
      if (typeIndex < 0 || durationIndex < 0 || dateIndex < 0) {
        showAlert("This CSV file is missing required session columns.");
        return;
      }
      const imported = lines.slice(1).reduce((sessions, line) => {
        const values = parseCSVLine(line);
        const duration = Number(values[durationIndex]);
        const date = parseImportedDate(values, dateIndex);
        if (
          !values[typeIndex] ||
          !Number.isFinite(duration) ||
          duration < 0 ||
          !date ||
          Number.isNaN(date.getTime())
        )
          return sessions;
        sessions.push({
          type: values[typeIndex],
          duration,
          subject: subjectIndex >= 0 ? values[subjectIndex] || null : null,
          date: date.toISOString(),
        });
        return sessions;
      }, []);
      if (!imported.length) {
        showAlert("No valid sessions were found in the CSV file.");
        return;
      }
      const stats = getStats();
      stats.sessions = stats.sessions.concat(imported);
      stats.totalStudyTime = stats.sessions
        .filter((s) => s.type === "focus")
        .reduce((total, s) => total + s.duration, 0);
      stats.totalBreakTime = stats.sessions
        .filter((s) => s.type !== "focus")
        .reduce((total, s) => total + s.duration, 0);
      stats.subjectTime = subjectTotals(stats.sessions);
      saveStats(stats);
      renderAnalytics();
      updateStatsDisplay();

      const importedNotice = `${imported.length} session${imported.length === 1 ? "" : "s"} imported.`;
      if (typeof ThemeEngine !== "undefined" && ThemeEngine._showNotice) {
        ThemeEngine._showNotice(importedNotice, "success");
      } else {
        showAlert(importedNotice);
      }
    };
    reader.readAsText(file);
  }

  if (statsImportBtn && statsImportInput) {
    statsImportBtn.addEventListener("click", () => statsImportInput.click());
    statsImportInput.addEventListener("change", () => {
      const [file] = statsImportInput.files || [];
      if (file) importStatsCSV(file);
      statsImportInput.value = "";
    });
  }

  renderTasks();
  /* A scene theme needs its own chunk before the first paint, so wait for it;
     built-in gradient themes need nothing and apply synchronously. */
  const bootNeedsScene = (function () {
    try {
      if (typeof ThemeEngine === "undefined") return false;
      const st =
        typeof ThemeEngine.getNativeSceneState === "function"
          ? ThemeEngine.getNativeSceneState()
          : null;
      if (st && st.sceneId) return true;
      const custom =
        typeof ThemeEngine.getActiveCustomThemeConfig === "function"
          ? ThemeEngine.getActiveCustomThemeConfig()
          : null;
      return !!(custom && custom.bg && custom.bg.type === "scene");
    } catch (e) {
      return false;
    }
  })();
  const applyBootTheme = () => {
    initEnhancedSystem();
    restoreNativeScene();
  };
  const scenesReady =
    typeof ThemeEngine !== "undefined" && ThemeEngine.scenesReady
      ? ThemeEngine.scenesReady
      : Promise.resolve();
  if (bootNeedsScene) scenesReady.then(applyBootTheme, applyBootTheme);
  else applyBootTheme();

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

