(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var rafId = null;
    var running = false;
    var startTime = null;
    var elapsed = 0;
    var unloggedSeconds = 0;

    var swDisplay = document.getElementById("swDisplay");
    var swStartBtn = document.getElementById("swStartBtn");
    var swResetBtn = document.getElementById("swResetBtn");

    function render(ms) {
      var totalSec = Math.floor(ms / 1000);
      var minutes = Math.floor(totalSec / 60);
      var seconds = totalSec % 60;
      var centis = Math.floor((ms % 1000) / 10);

      var mm = String(minutes).padStart(2, "0");
      var ss = String(seconds).padStart(2, "0");
      var cc = String(centis).padStart(2, "0");

      var msSpan = swDisplay.querySelector(".sw-ms");
      swDisplay.childNodes[0].nodeValue = mm + ":" + ss;
      msSpan.textContent = "." + cc;
    }

    function tick() {
      countElapsed();
      render(elapsed + (startTime === null ? 0 : Date.now() - startTime));
      rafId = requestAnimationFrame(tick);
    }

    function getStats() {
      try {
        return JSON.parse(localStorage.getItem("timerStats")) || {
          totalStudyTime: 0,
          totalBreakTime: 0,
          sessions: [],
        };
      } catch (error) {
        return { totalStudyTime: 0, totalBreakTime: 0, sessions: [] };
      }
    }

    function saveStats(stats) {
      localStorage.setItem("timerStats", JSON.stringify(stats));
    }

    function countElapsed() {
      if (!running || startTime === null) return;
      var seconds = Math.floor((Date.now() - startTime) / 1000);
      if (seconds > 0) {
        unloggedSeconds += seconds;
        elapsed += seconds * 1000;
        startTime += seconds * 1000;
      }
    }

    function flushStats() {
      countElapsed();
      if (unloggedSeconds > 0 && localStorage.getItem("statisticsEnabled") !== "false") {
        var stats = getStats();
        var duration = unloggedSeconds / 60;
        var subjectSelect = document.getElementById("subjectSelect");
        var subject = subjectSelect && subjectSelect.value ? subjectSelect.value : null;
        stats.sessions = stats.sessions || [];
        stats.sessions.push({
          type: "focus",
          duration: duration,
          subject: subject,
          date: new Date().toISOString(),
        });
        stats.totalStudyTime = (stats.totalStudyTime || 0) + duration;
        stats.subjectTime = stats.subjectTime || {};
        if (subject) stats.subjectTime[subject] = (stats.subjectTime[subject] || 0) + duration;
        saveStats(stats);
      }
      unloggedSeconds = 0;
      startTime = null;
    }

    function startStopwatch() {
      running = true;
      startTime = Date.now();
      swDisplay.classList.remove("sw-paused");
      swStartBtn.textContent = "Pause";
      swStartBtn.classList.add("pause-state");
      swResetBtn.disabled = false;
      rafId = requestAnimationFrame(tick);
    }

    function pauseStopwatch() {
      countElapsed();
      if (startTime !== null) {
        elapsed += Date.now() - startTime;
        startTime = null;
      }
      running = false;
      flushStats();
      cancelAnimationFrame(rafId);
      rafId = null;
      swDisplay.classList.add("sw-paused");
      swStartBtn.textContent = "Start";
      swStartBtn.classList.remove("pause-state");
    }

    function resetStopwatch() {
      pauseStopwatch();
      elapsed = 0;
      render(0);
      swResetBtn.disabled = true;
    }

    var pomodoroModeIds = ["focusMode", "shortBreakMode", "longBreakMode"];

    function switchToStopwatch() {
      var pomodoroStart = document.querySelector(
        ".start-btn.pause-state:not(#swStartBtn)",
      );
      if (pomodoroStart && typeof window.toggleTimer === "function") {
        window.toggleTimer();
      }

      document.body.classList.add("sw-mode-active");

      pomodoroModeIds.forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) btn.style.display = "none";
      });
      var swBtn = document.getElementById("stopwatchModeBtn");
      if (swBtn) swBtn.style.display = "";

      var timerSection = document.getElementById("timerSection");
      if (timerSection) timerSection.classList.add("sw-hidden");

      var swSection = document.getElementById("stopwatchSection");
      if (swSection) swSection.classList.add("sw-visible");
    }

    function switchToPomodoro() {
      if (running || unloggedSeconds > 0) pauseStopwatch();

      document.body.classList.remove("sw-mode-active");

      pomodoroModeIds.forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) btn.style.display = "";
      });
      var swBtn = document.getElementById("stopwatchModeBtn");
      if (swBtn) swBtn.style.display = "none";

      var lastMode = localStorage.getItem("lastTimerMode") || "focusMode";
      var modeBtn = document.getElementById(lastMode);
      if (modeBtn) {
        document.querySelectorAll(".mode-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        modeBtn.classList.add("active");
      }

      var timerSection = document.getElementById("timerSection");
      if (timerSection) timerSection.classList.remove("sw-hidden");

      var swSection = document.getElementById("stopwatchSection");
      if (swSection) swSection.classList.remove("sw-visible");
    }

    function initModeSelect() {
      var sel = document.getElementById("timerModeSelect");
      if (!sel) return false; // not in DOM yet

      var saved = localStorage.getItem("timerMode") || "pomodoro";
      sel.value = saved;

      if (saved === "stopwatch") switchToStopwatch();

      sel.addEventListener("change", function () {
        var val = sel.value;
        localStorage.setItem("timerMode", val);
        if (val === "stopwatch") {
          switchToStopwatch();
        } else {
          switchToPomodoro();
        }
      });

      return true;
    }

    if (!initModeSelect()) {
      var observer = new MutationObserver(function (mutations, obs) {
        if (initModeSelect()) {
          obs.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ─── Button listeners ───────────────────────────────────────── */
    if (swStartBtn) {
      swStartBtn.addEventListener("click", function () {
        if (running) {
          pauseStopwatch();
        } else {
          startStopwatch();
        }
      });
    }

    if (swResetBtn) {
      swResetBtn.addEventListener("click", function () {
        resetStopwatch();
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (!running) return;

      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else {
        countElapsed();
        startTime = Date.now();
        render(elapsed);
        rafId = requestAnimationFrame(tick);
      }
    });
  });
})();
