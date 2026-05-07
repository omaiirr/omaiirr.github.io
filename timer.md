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

<button class="planner-btn" id="plannerBtn">📝</button>
<button class="settings-btn" id="settingsBtn">⚙️</button>

<div class="planner-modal" id="plannerModal">
  <div class="planner-card">
    <div class="planner-header">
      <div>
        <p class="planner-label">Planner</p>
        <h2>Task dashboard</h2>
      </div>
      <button class="planner-add-btn" id="plannerAddBtn">Add Task</button>
    </div>

    <div class="planner-summary" id="plannerSummary"></div>

    <div class="planner-list" id="plannerTaskList"></div>

  </div>
</div>

<div class="task-popup" id="taskPopup">
  <div class="task-popup-card">
    <div class="task-popup-header">
      <h3>Add Task</h3>
      <button class="task-popup-close" id="taskPopupClose">×</button>
    </div>
    <div class="task-popup-body">
      <div class="form-section full-width">
        <label for="taskTitle" class="form-label">Task Title</label>
        <input id="taskTitle" type="text" placeholder="e.g. Do Chemistry Paper 4" class="form-input">
      </div>

      <div class="form-section full-width">
        <label class="form-label">Category</label>
        <div class="category-chips">
          <button type="button" class="category-chip category-exam" data-category="Exam"><i class="fa-solid fa-bookmark"></i>Exam</button>
          <button type="button" class="category-chip category-revision" data-category="Revision"><i class="fa-solid fa-book-open"></i>Revision</button>
          <button type="button" class="category-chip category-past-paper" data-category="Past Paper"><i class="fa-solid fa-file-lines"></i>Past Paper</button>
          <button type="button" class="category-chip category-finals" data-category="Finals"><i class="fa-solid fa-bullseye"></i>Finals</button>
          <button type="button" class="category-chip category-other" data-category="Other"><i class="fa-solid fa-ellipsis-h"></i>Other</button>
        </div>
        <input id="taskCategory" type="hidden">
      </div>

      <div class="form-row">
        <div class="form-section">
          <label for="taskSubject" class="form-label">Subject</label>
          <input id="taskSubject" type="text" placeholder="e.g Chemistry" class="form-input">
        </div>
        <div class="form-section">
          <label for="taskPriority" class="form-label">Priority</label>
          <select id="taskPriority" class="form-input">
            <option value="">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-section">
          <label for="taskDueDate" class="form-label">Due Date</label>
          <input id="taskDueDate" type="date" placeholder="mm/dd/yyyy" class="form-input">
        </div>
        <div class="form-section">
          <label for="taskEstimate" class="form-label">Estimated Time</label>
          <input id="taskEstimate" type="text" placeholder="e.g. 1h 30m" class="form-input">
        </div>
      </div>

      <div class="form-section full-width">
        <label for="taskNotes" class="form-label">Notes</label>
        <textarea id="taskNotes" placeholder="Topics to focus on..." class="form-textarea"></textarea>
      </div>
    </div>
    <div class="task-popup-actions">
      <button class="cancel-task-btn" id="taskPopupCancelBtn">Cancel</button>
      <button class="save-task-btn" id="saveTaskBtn">💾 Save</button>
    </div>

  </div>
</div>

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
              <span>Deep Ocean (3D)</span>
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
