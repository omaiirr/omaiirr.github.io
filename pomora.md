---
layout: default
title: Pomora
permalink: /pomora/
---

<div class="timer-container" id="timerContainer">
  {% include timer-ui.html %}

  <div id="subjectSelector" style="margin-top:15px;display:block;position:relative;z-index:20;">
    <select id="subjectSelect" class="form-input" style="max-width:300px;margin:0 auto;display:block;">
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

{% include planner-modal.html %}
{% include task-popup.html %}
{% include theme-modal.html %}
{% include advanced-settings-modal.html %}
{% include patch-notes-popup.html %}
{% include statistics-popup.html %}

</div>

<!-- Buttons OUTSIDE timerContainer so they stay position:fixed correctly -->
<div class="timer-fixed-actions">
  <button class="planner-btn icon-btn" id="plannerBtn" aria-label="Open planner">
    <svg class="force-fill" fill="currentColor" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.656.93,6.464,13.122A4.966,4.966,0,0,0,5,16.657V18a1,1,0,0,0,1,1H7.343a4.966,4.966,0,0,0,3.535-1.464L23.07,5.344a3.125,3.125,0,0,0,0-4.414A3.194,3.194,0,0,0,18.656.93Zm3,3L9.464,16.122A3.02,3.02,0,0,1,7.343,17H7v-.343a3.02,3.02,0,0,1,.878-2.121L20.07,2.344a1.148,1.148,0,0,1,1.586,0A1.123,1.123,0,0,1,21.656,3.93Z"/>
      <path d="M23,8.979a1,1,0,0,0-1,1V15H18a3,3,0,0,0-3,3v4H5a3,3,0,0,1-3-3V5A3,3,0,0,1,5,2h9.042a1,1,0,0,0,0-2H5A5.006,5.006,0,0,0,0,5V19a5.006,5.006,0,0,0,5,5H16.343a4.968,4.968,0,0,0,3.536-1.464l2.656-2.658A4.968,4.968,0,0,0,24,16.343V9.979A1,1,0,0,0,23,8.979ZM18.465,21.122a2.975,2.975,0,0,1-1.465.8V18a1,1,0,0,1,1-1h3.925a3.016,3.016,0,0,1-.8,1.464Z"/>
    </svg>
  </button>
  <button class="settings-btn icon-btn" id="settingsBtn" aria-label="Open settings">
    <svg class="force-fill" fill="currentColor" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm7.43 2.48l1.79-1.38a.5.5 0 00.12-.64l-1.9-3.31a.5.5 0 00-.6-.22l-2.36.94a7.1 7.1 0 00-1.6-.93l-.36-2.54A.5.5 0 0013.8 2h-3.6a.5.5 0 00-.49.42l-.36 2.54a7.1 7.1 0 00-1.6.93l-2.36-.94a.5.5 0 00-.6.22l-1.9 3.31a.5.5 0 00.12.64l1.79 1.38a7.05 7.05 0 000 1.88l-1.79 1.38a.5.5 0 00-.12.64l1.9 3.31c.13.23.42.33.7.22l2.36-.94c.5.4 1.04.72 1.6.93l.36 2.54c.05.26.28.42.49.42h3.6c.25 0 .45-.16.49-.42l.36-2.54c.56-.22 1.09-.52 1.6-.93l2.36.94c.29.12.57.01.7-.22l1.9-3.31a.5.5 0 00-.12-.64l-1.79-1.38a7.05 7.05 0 000-1.88z" />
    </svg>
  </button>
</div>

{% include animation-containers.html %}
