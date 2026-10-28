// Stopwatch logic.
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var intervalId = null;
    var running = false;
    var startMark = 0;
    var elapsed = 0;

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

    function currentMs() {
      return elapsed + (running ? Date.now() - startMark : 0);
    }

    function updateDisplay() {
      render(currentMs());
    }

    function startStopwatch() {
      running = true;
      startMark = Date.now();
      swDisplay.classList.remove("sw-paused");
      swStartBtn.textContent = "Pause";
      swStartBtn.classList.add("pause-state");
      swResetBtn.disabled = false;
      intervalId = setInterval(updateDisplay, 50);
    }

    function pauseStopwatch() {
      if (running) elapsed = currentMs();
      running = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      swDisplay.classList.add("sw-paused");
      swStartBtn.textContent = "Start";
      swStartBtn.classList.remove("pause-state");
    }

    /* The mini player reads this so its clock keeps moving while the main
       tab is in the background and this document's interval is throttled. */
    window.getStopwatchMs = currentMs;

    function resetStopwatch() {
      /* Capture elapsed before zeroing: a reset used to silently discard the
         whole run (e.g. 2h logged as 0 minutes). currentMs() folds in the
         live segment, so pause-accumulated and just-run time are both counted
         — pause time was already excluded by pauseStopwatch banking `elapsed`.
         timer.js owns analytics; logStudySession forwards there with the
         current focus subject and respects the statistics toggle. */
      var ms = currentMs();
      pauseStopwatch();
      elapsed = 0;
      render(0);
      swResetBtn.disabled = true;
      if (ms > 0 && typeof window.logStudySession === "function") {
        window.logStudySession("focus", ms);
      }
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

      if (typeof window.restoreActiveTheme === "function")
        window.restoreActiveTheme();
    }

    function switchToPomodoro() {
      if (running) pauseStopwatch();

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

      if (typeof window.restoreActiveTheme === "function")
        window.restoreActiveTheme();
    }

    function syncModeTiles() {
      var sel = document.getElementById("timerModeSelect");
      if (!sel) return;
      document.querySelectorAll(".fs-mode-tile").forEach(function (tile) {
        var on = tile.dataset.mode === sel.value;
        tile.classList.toggle("active", on);
        tile.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function initModeTiles(sel) {
      var tiles = document.querySelectorAll(".fs-mode-tile");
      if (!tiles.length) return;
      tiles.forEach(function (tile) {
        tile.addEventListener("click", function () {
          if (sel.value === tile.dataset.mode) return;
          sel.value = tile.dataset.mode;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          syncModeTiles();
        });
      });
      syncModeTiles();
    }

    function initModeSelect() {
      var sel = document.getElementById("timerModeSelect");
      if (!sel) return false; 

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

        syncModeTiles();
      });

      initModeTiles(sel);

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
      if (running && !document.hidden) updateDisplay();
    });
  });
})();
