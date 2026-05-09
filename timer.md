---
layout: default
title: Timer
permalink: /timer/
---

<div class="timer-container" id="timerContainer">
  <!-- Timer UI -->
  {% include timer-ui.html %}

  <!-- Subject Selector -->
  <div id="subjectSelector" style="margin-top: 15px; display: block; position: relative; z-index: 20;">
    <select id="subjectSelect" class="form-input" style="max-width: 300px; margin: 0 auto; display: block;">
      <option value="">📚 Select Subject (Optional)</option>
      <option value="Computer Science">Computer Science</option>
      <option value="Mathematics">Mathematics</option>
      <option value="Biology">Biology</option>
      <option value="Chemistry">Chemistry</option>
      <option value="Physics">Physics</option>
      <option value="Economics">Economics</option>
      <option value="Business">Business</option>
      <option value="English Language">English Language</option>
      <option value="Psychology">Psychology</option>
      <option value="Statistics">Statistics</option>
    </select>
  </div>

  <!-- Planner Controls -->

<button class="planner-btn" id="plannerBtn">📝</button>
<button class="settings-btn" id="settingsBtn">⚙️</button>

  <!-- Modals & Popups -->

{% include planner-modal.html %}
{% include task-popup.html %}
{% include theme-modal.html %}

  <!-- Animation Containers -->

{% include animation-containers.html %}

</div>
