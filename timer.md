---
layout: default
title: Page Moved
permalink: /timer/
---

<h1 class="particles-title" style="font-size: 2.5em;">Link Updated</h1>
<h1 class="particles-subtitle" style="font-size: 1.4em; margin: 0; position: relative; z-index: 1000; pointer-events: auto;">The page has moved to <a href="/pomora/" style="color: inherit; text-decoration: underline; cursor: pointer; position: relative; z-index: 1001; pointer-events: auto;" title="Visit the timer's new home: Pomora!">Pomora</a></h1>
<a class="particles-icon" style="margin-top: 12px; display: inline-block;" href="/">{% include svg/arrow-left-circled.svg %}</a>

<div id="redirect-info" style="margin-top: 20px; font-size: 0.8em; color: rgba(255, 255, 255, 0.7);">
  Redirecting in <span id="countdown">10</span>s
</div>

<script type="text/javascript">
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDev = urlParams.has('dev');
  
  const redirectInfo = document.getElementById('redirect-info');
  
  if (isDev) {
    redirectInfo.style.display = 'none';
  } else {
    let seconds = 10;
    const countdownEl = document.getElementById('countdown');
    
    const interval = setInterval(function() {
      seconds--;
      countdownEl.textContent = seconds;
      
      if (seconds <= 0) {
        clearInterval(interval);
        window.location.href = '/pomora/';
      }
    }, 1000);
  }
});
</script>
