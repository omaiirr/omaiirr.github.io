---
layout: default
title: Timer
permalink: /timer/
---

<div class="timer-container" id="timerContainer">
  <div class="timer-modes">
    <button id="focusMode" class="mode-btn active">Focus</button>
    <button id="shortBreakMode" class="mode-btn">Short Break</button>
    <button id="longBreakMode" class="mode-btn">Long Break</button>
  </div>

  <div id="display" class="timer-display">25:00</div>

  <div class="timer-actions">
    <button id="startBtn" class="start-btn">Start</button>
    <button id="pauseBtn" class="secondary-btn">Pause</button>
    <button id="resetBtn" class="secondary-btn">Reset</button>
  </div>

  <div class="timer-settings" style="display: none;">
    <label for="minutes">Minutes</label>
    <input id="minutes" type="number" min="1" value="25">
  </div>

<button class="settings-btn" id="settingsBtn">⚙️</button>

  <div class="theme-modal" id="themeModal" style="display: none;">
    <div class="theme-modal-content">
      <div class="theme-section">
        <h3>Themes</h3>
        <div class="theme-options">
          <button class="theme-option" data-theme="gradient-default" style="background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%);">Default</button>
          <button class="theme-option" data-theme="gradient-sunset" style="background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);">Sunset</button>
          <button class="theme-option" data-theme="gradient-ocean" style="background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%);">Ocean</button>
          <button class="theme-option" data-theme="gradient-forest" style="background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);">Forest</button>
          <button class="theme-option" data-theme="color-dark" style="background: #000000;">Dark</button>
          <button class="theme-option" data-theme="color-light" style="background: #f5f5f5; color: #333;">Light</button>
        </div>
      </div>
      <div class="timer-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <h3>Animations</h3>
        <div class="animation-controls">
          <label class="toggle-label">
            <input type="checkbox" id="globalAnimationToggle" checked>
            <span>Custom Animations</span>
          </label>
          <div id="oceanSpecificToggle" style="display: none; margin-top: 10px;">
            <label class="toggle-label">
              <input type="checkbox" id="plasticOceanToggle">
              <span>Plastic Ocean (3D)</span>
            </label>
          </div>
        </div>
      </div>
      <div class="timer-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <h3>Clock</h3>
        <div class="custom-timer-inputs">
          <div class="input-group">
            <label for="customFocus">Focus (min)</label>
            <input id="customFocus" type="number" min="1" max="120" value="25">
          </div>
          <div class="input-group">
            <label for="customShort">Short Break (min)</label>
            <input id="customShort" type="number" min="1" max="60" value="5">
          </div>
          <div class="input-group">
            <label for="customLong">Long Break (min)</label>
            <input id="customLong" type="number" min="1" max="60" value="15">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Animation Containers -->
<div id="leaves" style="display: none;">
  <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
</div>

<div id="waveContainer" style="display: none;"></div>

<div id="oceanContainer" style="display: none;">
  <div id="ocean" class="ocean"></div>
  <div id="overlay" class="overlay">
    <div id="holder" class="holder">
      <div id="settings">settings:</div>
      <div id="parameter">scene rotation speed</div>
      <input type="range" min="1" max="100" value="1" class="slider" id="speed">
      <div id="parameter">tires size</div>
      <input type="range" min="1" max="100" value="1" class="slider" id="tsize">
      <div id="parameter">jellyfish size</div>
      <input type="range" min="1" max="100" value="1" class="slider" id="jsize">
      <button type="button" id="button">resume</button>
    </div>
  </div>
</div>

<script>
  let modes = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
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

  function updateModes() {
    modes.focus = Number(customFocusInput.value) * 60;
    modes.short = Number(customShortInput.value) * 60;
    modes.long = Number(customLongInput.value) * 60;
    localStorage.setItem("timerModes", JSON.stringify({
      focus: customFocusInput.value,
      short: customShortInput.value,
      long: customLongInput.value
    }));
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
    display.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  loadSavedModes();
  render();

  // Theme switching
  const settingsBtn = document.getElementById("settingsBtn");
  const themeModal = document.getElementById("themeModal");
  const timerContainer = document.getElementById("timerContainer");
  const themeOptions = document.querySelectorAll(".theme-option");

  // Load saved theme
  const savedTheme = localStorage.getItem("timerTheme") || "gradient-default";
  timerContainer.classList.add("theme-" + savedTheme);
  
  // Mark active theme
  document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add("active");

  settingsBtn.addEventListener("click", () => {
    themeModal.style.display = themeModal.style.display === "none" ? "block" : "none";
  });

  themeOptions.forEach(option => {
    option.addEventListener("click", (e) => {
      const theme = e.target.dataset.theme;
      
      // Remove all theme classes
      timerContainer.classList.remove(...Array.from(timerContainer.classList).filter(c => c.startsWith("theme-")));
      
      // Add new theme class
      timerContainer.classList.add("theme-" + theme);
      
      // Update active state
      themeOptions.forEach(opt => opt.classList.remove("active"));
      e.target.classList.add("active");
      
      // Save to localStorage
      localStorage.setItem("timerTheme", theme);
    });
  });

  // Close modal when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".settings-btn") && !e.target.closest(".theme-modal")) {
      themeModal.style.display = "none";
    }
  });
</script>
