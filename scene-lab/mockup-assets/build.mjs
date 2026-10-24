// build.mjs — generates the four Stage A direction mockup pages + index.
// Run: node scene-lab/mockup-assets/build.mjs
// The four pages share one surface template; ONLY the --uo-* token block
// differs (plus tiny [data-dir] accents in mockup.css), so comparisons are
// honest. Throwaway tooling per the handoff convention.
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── inline placeholder icons (line style, 1.5 stroke — swap for user assets later)
const I = (paths, extra = "") =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${extra}${paths}</svg>`;
const ICONS = {
  image: I('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15.5l-4.8-4.8a1.5 1.5 0 0 0-2.1 0L4 21"/>'),
  droplet: I('<path d="M12 2.8s6.2 6.5 6.2 10.9a6.2 6.2 0 1 1-12.4 0C5.8 9.3 12 2.8 12 2.8z"/>'),
  layer: I('<path d="M12 2.5l9.5 5.5L12 13.5 2.5 8z"/><path d="M2.5 13.5L12 19l9.5-5.5"/>'),
  save: I('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  export: I('<path d="M12 15V3.5"/><path d="M7.5 8L12 3.5 16.5 8"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>'),
  import: I('<path d="M12 3.5V15"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 16.5V18a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1.5"/>'),
  eye: I('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  bolt: I('<path d="M13 2.5L3.5 14H10l-1 7.5L18.5 10H12l1-7.5z"/>'),
  gear: I('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.7 4.7l2.1 2.1M17.2 17.2l2.1 2.1M2.5 12h3M18.5 12h3M4.7 19.3l2.1-2.1M17.2 6.8l2.1-2.1"/>'),
  grid: I('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  palette: I('<path d="M12 3a9 9 0 1 0 0 18h1.8a2.2 2.2 0 0 0 0-4.4H13a2 2 0 0 1 0-4h4.5A3.5 3.5 0 0 0 21 9.1C21 5.7 17 3 12 3z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16.5" cy="10.5" r="1.2"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
};

// ── direction token sets (the ONLY per-page difference) ─────────
const DIRS = [
  {
    id: "refined",
    file: "mockup-refined.html",
    name: "Refined",
    tagline:
      "Evolution of today's look. Same dark-glass identity, tightened: consistent 9/12/18 radii, unified hairline borders, tidy spacing, the site's indigo accent. The safest, most Pomora direction.",
    tokens: `
      --uo-page-bg: radial-gradient(1100px 700px at 50% -10%, #131a2e 0%, #0b0f1b 60%);
      --uo-surface: rgba(15, 21, 38, 0.92);
      --uo-sunken: rgba(255,255,255,0.05);
      --uo-hover: rgba(255,255,255,0.09);
      --uo-border: rgba(255,255,255,0.09);
      --uo-border-strong: rgba(255,255,255,0.18);
      --uo-text-primary: #ffffff;
      --uo-text-secondary: rgba(255,255,255,0.72);
      --uo-text-tertiary: rgba(255,255,255,0.45);
      --uo-accent: #6366f1;
      --uo-accent-contrast: #ffffff;
      --uo-accent-soft: rgba(99,102,241,0.16);
      --uo-accent-text: #a5b4fc;
      --uo-accent-border: rgba(99,102,241,0.35);
      --uo-radius-sm: 9px; --uo-radius-md: 12px; --uo-radius-lg: 18px;
      --uo-shadow-panel: 0 18px 50px rgba(0,0,0,0.35);
      --uo-blur: 10px;
      --uo-tight: -0.01em;
    `,
  },
  {
    id: "lighter",
    file: "mockup-lighter.html",
    name: "Lighter & Flatter",
    tagline:
      "A genuinely light theme: solid white panels, crisp hairlines, almost no blur or glow. Calm, paper-like, maximal readability. Try the font toggle here — Inter was made for this.",
    tokens: `
      --uo-page-bg: linear-gradient(180deg, #f0f2f6 0%, #e9ecf2 100%);
      --uo-surface: #ffffff;
      --uo-sunken: #f2f4f8;
      --uo-hover: #e9ecf2;
      --uo-border: rgba(15,20,35,0.1);
      --uo-border-strong: rgba(15,20,35,0.22);
      --uo-text-primary: #16181d;
      --uo-text-secondary: #3a3f4d;
      --uo-text-tertiary: #6b7080;
      --uo-accent: #5b5bd6;
      --uo-accent-contrast: #ffffff;
      --uo-accent-soft: rgba(91,91,214,0.1);
      --uo-accent-text: #4a4ac4;
      --uo-accent-border: rgba(91,91,214,0.3);
      --uo-radius-sm: 8px; --uo-radius-md: 11px; --uo-radius-lg: 16px;
      --uo-shadow-panel: 0 1px 2px rgba(15,20,35,0.05), 0 10px 30px rgba(15,20,35,0.08);
      --uo-blur: 0px;
      --uo-tight: -0.01em;
    `,
  },
  {
    id: "bolder",
    file: "mockup-bolder.html",
    name: "Bolder & Expressive",
    tagline:
      "Leans into the animated-scene identity: violet-lit surfaces, glowing accents, bigger radii, more atmosphere. The most personality — and the most visual noise behind a study timer.",
    tokens: `
      --uo-page-bg: radial-gradient(1200px 800px at 18% -5%, #1c1440 0%, #0a0a18 58%);
      --uo-surface: rgba(21, 17, 46, 0.78);
      --uo-sunken: rgba(255,255,255,0.06);
      --uo-hover: rgba(255,255,255,0.11);
      --uo-border: rgba(139,122,255,0.17);
      --uo-border-strong: rgba(139,122,255,0.36);
      --uo-text-primary: #ffffff;
      --uo-text-secondary: rgba(233,230,255,0.75);
      --uo-text-tertiary: rgba(210,205,240,0.5);
      --uo-accent: #8b5cf6;
      --uo-accent-contrast: #ffffff;
      --uo-accent-soft: rgba(139,92,246,0.2);
      --uo-accent-text: #c4b5fd;
      --uo-accent-border: rgba(139,92,246,0.45);
      --uo-radius-sm: 10px; --uo-radius-md: 14px; --uo-radius-lg: 22px;
      --uo-shadow-panel: 0 24px 70px rgba(60, 20, 120, 0.4);
      --uo-blur: 16px;
      --uo-tight: -0.015em;
    `,
  },
  {
    id: "raycast",
    file: "mockup-raycast.html",
    name: "Raycast-soft",
    tagline:
      "The reference feel: soft charcoal panels with quiet depth, generous radii, a warm coral accent, springy micro-interactions. App-like, cozy, premium — your stated reference.",
    tokens: `
      --uo-page-bg: linear-gradient(180deg, #15181e 0%, #0e1014 100%);
      --uo-surface: rgba(25, 28, 34, 0.88);
      --uo-sunken: rgba(255,255,255,0.055);
      --uo-hover: rgba(255,255,255,0.1);
      --uo-border: rgba(255,255,255,0.08);
      --uo-border-strong: rgba(255,255,255,0.16);
      --uo-text-primary: #f2f3f5;
      --uo-text-secondary: rgba(242,243,245,0.68);
      --uo-text-tertiary: rgba(242,243,245,0.42);
      --uo-accent: #f76b6b;
      --uo-accent-contrast: #ffffff;
      --uo-accent-soft: rgba(247,107,107,0.14);
      --uo-accent-text: #ff9d9d;
      --uo-accent-border: rgba(247,107,107,0.35);
      --uo-radius-sm: 8px; --uo-radius-md: 12px; --uo-radius-lg: 20px;
      --uo-shadow-panel: 0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.5);
      --uo-blur: 14px;
      --uo-tight: -0.011em;
    `,
  },
];

// ── shared surface template ─────────────────────────────────────
function page(dir) {
  return `<!DOCTYPE html>
<html lang="en" data-dir="${dir.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${dir.name} — Pomora UI direction mockup</title>
<link rel="stylesheet" href="mockup-assets/mockup.css">
<style>
  @font-face {
    font-family: "InterVar";
    src: url("mockup-assets/fonts/inter-latin-wght-normal.woff2") format("woff2");
    font-weight: 100 900; font-style: normal; font-display: swap;
  }
  :root {
    --uo-font: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --uo-space-2: 8px; --uo-space-3: 12px; --uo-space-4: 16px;
${dir.tokens}
  }
  body[data-font="inter"] { --uo-font: "InterVar", ui-sans-serif, system-ui, sans-serif; }
</style>
</head>
<body data-motion="springy">

<div class="page-head">
  <h1>${dir.name}<span class="badge-dir">${dir.id}</span></h1>
  <p>${dir.tagline}</p>
</div>

<div class="toggles">
  <span class="tg">Motion
    <span class="seg" data-kind="motion">
      <button class="on" data-v="springy">Springy</button>
      <button data-v="subtle">Subtle</button>
    </span>
  </span>
  <span class="tg">Font
    <span class="seg" data-kind="font">
      <button class="on" data-v="jakarta">Plus Jakarta</button>
      <button data-v="inter">Inter</button>
    </span>
  </span>
  <span class="tg" style="opacity:0.65">Hover things — hovers & transitions are live.</span>
</div>

<div class="grid">

  <!-- ═══ small settings ═══ -->
  <div class="cell">
    <h2>Small settings menu</h2>
    <div class="panel">
      <div class="panel-h">
        <span class="t">Settings</span>
        <button class="icon-btn" title="Close">${ICONS.close}</button>
      </div>

      <div class="sec-label">Themes</div>
      <div style="display:flex;align-items:center;gap:7px;font-size:0.76rem;color:var(--uo-accent-text);margin-bottom:10px;">
        ${ICONS.palette} Custom theme active <span style="color:var(--uo-text-tertiary)">(click a built-in theme to deactivate)</span>
      </div>
      <div class="swatches">
        <button class="swatch active"><span class="chip" style="background:linear-gradient(135deg,#6366f1,#ec4899,#f43f5e)"></span><span class="nm">Default</span></button>
        <button class="swatch"><span class="chip" style="background:linear-gradient(135deg,#0066ff,#00d4ff)"></span><span class="nm">Deep Ocean</span></button>
        <button class="swatch"><span class="chip" style="background:linear-gradient(135deg,#134e5e,#71b280)"></span><span class="nm">Forest</span></button>
        <button class="swatch"><span class="chip" style="background:linear-gradient(135deg,#ff9a56,#ff6b6b,#f43f5e)"></span><span class="nm">Sunset</span></button>
        <button class="swatch"><span class="chip" style="background:#000"></span><span class="nm">Dark</span></button>
        <button class="swatch"><span class="chip" style="background:#f5f5f5"></span><span class="nm">Light</span></button>
      </div>
      <button class="lib-btn">${ICONS.grid}<span>Open theme library (40)</span></button>

      <div class="sec-label">Clock — option A · restyled inputs</div>
      <div class="clock-inputs">
        <div class="fld"><label>Focus (min)</label><input type="number" value="25"></div>
        <div class="fld"><label>Short break</label><input type="number" value="5"></div>
        <div class="fld"><label>Long break</label><input type="number" value="15"></div>
      </div>

      <div class="sec-label">Clock — option B · stepper chips</div>
      <div class="steppers">
        <div class="stepper"><button data-d="-">−</button><span class="val" data-n="25">25<span class="unit">focus</span></span><button data-d="+">+</button></div>
        <div class="stepper"><button data-d="-">−</button><span class="val" data-n="5">5<span class="unit">short</span></span><button data-d="+">+</button></div>
        <div class="stepper"><button data-d="-">−</button><span class="val" data-n="15">15<span class="unit">long</span></span><button data-d="+">+</button></div>
      </div>

      <div class="sec-label">Clock — option C · preset pills + custom</div>
      <div class="pills-row">
        <button class="pill">15</button><button class="pill on">25</button><button class="pill">45</button><button class="pill">60</button>
      </div>
      <div class="fld"><label>Custom (min)</label><input type="number" value="25"></div>

      <div class="sec-label">Advanced</div>
      <button class="btn-primary">${ICONS.gear} Expand Settings</button>
    </div>
  </div>

  <div class="cell stack">
    <!-- ═══ release notes ═══ -->
    <div>
      <h2>Release notes popup</h2>
      <div class="panel">
        <div class="panel-h">
          <div>
            <p class="eyebrow">Release Notes</p>
            <span class="t">Recent Updates</span>
          </div>
          <button class="icon-btn" title="Close">${ICONS.close}</button>
        </div>
        <div class="entry">
          <div class="eh"><h4>Custom theme system &amp; new scenes</h4><time>2026-08-16</time></div>
          <p>Theme builder with custom colors, image/video backgrounds, 40 animated scenes, and a cleaner look across the whole site.</p>
        </div>
        <div class="entry">
          <div class="eh"><h4>Stopwatch mode</h4><time>2026-06-10</time></div>
          <p>Added a stopwatch option for the timer.</p>
        </div>
        <div class="entry">
          <div class="eh"><h4>Branding</h4><time>2026-06-03</time></div>
          <p>New logo and refreshed branding, now also the site favicon.</p>
        </div>
        <div class="row-end" style="margin-top:var(--uo-space-3)">
          <button class="btn-secondary">View all updates →</button>
        </div>
      </div>
    </div>

    <!-- ═══ confirm popup ═══ -->
    <div>
      <h2>Confirm popup</h2>
      <div class="panel">
        <div class="panel-h">
          <span class="t">Delete theme</span>
          <button class="icon-btn" title="Close">${ICONS.close}</button>
        </div>
        <p class="confirm-body">This will remove the saved theme from your browser. This cannot be undone.</p>
        <div class="row-end">
          <button class="btn-secondary">Cancel</button>
          <button class="btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <!-- ═══ statistics tab ═══ -->
    <div>
      <h2>Statistics tab</h2>
      <div class="panel">
        <div class="panel-h">
          <span class="t">Statistics</span>
          <button class="icon-btn" title="Close">${ICONS.close}</button>
        </div>
        <div class="stat-grid">
          <div class="stat-card"><div class="k">Focus today</div><div class="v">3h 25m</div></div>
          <div class="stat-card"><div class="k">Sessions</div><div class="v">12</div></div>
          <div class="stat-card"><div class="k">Streak</div><div class="v">5 <small>days</small></div></div>
          <div class="stat-card"><div class="k">Tasks done</div><div class="v">8</div></div>
        </div>
        <div class="bars" title="Last 7 days">
          <i style="height:34%"></i><i style="height:58%"></i><i style="height:42%"></i><i style="height:76%"></i><i style="height:52%"></i><i style="height:90%"></i><i style="height:64%"></i>
        </div>
      </div>
    </div>
  </div>

  <div class="cell stack">
    <!-- ═══ task planner (3 depths) ═══ -->
    <div>
      <h2>Task planner</h2>
      <div class="stack">
        <div>
          <span class="vcap">Depth A · visual only</span>
          <div class="panel">
            <div class="panel-h">
              <span class="t">Planner</span>
              <button class="icon-btn" title="Add task">${ICONS.plus}</button>
            </div>
            <div class="filters">
              <button class="pill on">All</button><button class="pill">Exams</button><button class="pill">Revision</button><button class="pill">This week</button>
            </div>
            <div class="task"><span class="chk done">✓</span><span class="tt"><b>Chemistry Paper 4</b><span>Due Fri · 1h 30m</span></span><span class="tag">Exam</span></div>
            <div class="task"><span class="chk">✓</span><span class="tt"><b>Trig revision set</b><span>Due Mon · 45m</span></span><span class="tag hot">Urgent</span></div>
            <div class="task"><span class="chk">✓</span><span class="tt"><b>History notes</b><span>No due date</span></span></div>
          </div>
        </div>
        <div>
          <span class="vcap">Depth B · + light layout</span>
          <div class="panel">
            <div class="panel-h">
              <span class="t">Planner</span>
              <button class="icon-btn" title="Add task">${ICONS.plus}</button>
            </div>
            <div class="group-h">Today</div>
            <div class="task"><span class="chk">✓</span><span class="tt"><b>Chemistry Paper 4</b><span>Due Fri · 1h 30m</span></span><span class="tag">Exam</span></div>
            <div class="group-h">Upcoming</div>
            <div class="task"><span class="chk">✓</span><span class="tt"><b>Trig revision set</b><span>Due Mon · 45m</span></span><span class="tag hot">Urgent</span></div>
            <div class="empty">Nothing else planned — enjoy the calm.</div>
          </div>
        </div>
        <div>
          <span class="vcap">Depth C · + UX tweaks</span>
          <div class="panel">
            <div class="panel-h">
              <span class="t">Planner</span>
              <button class="icon-btn" title="Add task">${ICONS.plus}</button>
            </div>
            <div class="filters sticky">
              <button class="pill on">All</button><button class="pill">Exams</button><button class="pill">This week</button>
            </div>
            <div class="task"><span class="chk done">✓</span><span class="tt"><b>Chemistry Paper 4</b><span>Due Fri · click ✓ to toggle</span></span><span class="tag">Exam</span></div>
            <div class="task"><span class="chk">✓</span><span class="tt"><b>Trig revision set</b><span>Due Mon · sticky filters while scrolling</span></span><span class="tag hot">Urgent</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ add task ═══ -->
    <div>
      <h2>Add task popup</h2>
      <div class="panel">
        <div class="panel-h">
          <span class="t">Add Task</span>
          <button class="icon-btn" title="Close">${ICONS.close}</button>
        </div>
        <div class="fld" style="margin-bottom:var(--uo-space-3)"><label>Task title</label><input class="txt" type="text" placeholder="e.g. Do Chemistry Paper 4"></div>
        <div class="chips">
          <button class="chipx">Exam</button><button class="chipx on">Revision</button><button class="chipx">Past Paper</button><button class="chipx">Finals</button><button class="chipx">Other</button>
        </div>
        <div class="form-2">
          <div class="fld"><label>Subject</label><input class="txt" type="text" placeholder="e.g. Chemistry"></div>
          <div class="fld"><label>Priority</label>
            <select><option>Normal</option><option>High</option><option>Urgent</option></select>
          </div>
        </div>
        <div class="form-2">
          <div class="fld"><label>Due date</label><input type="date"></div>
          <div class="fld"><label>Estimated time</label><input class="txt" type="text" placeholder="e.g. 1h 30m"></div>
        </div>
        <div class="fld" style="margin-bottom:var(--uo-space-4)"><label>Notes</label><textarea class="txt" rows="2" placeholder="Topics to focus on…"></textarea></div>
        <div class="row-end">
          <button class="btn-secondary">Cancel</button>
          <button class="btn-primary">${ICONS.save} Save</button>
        </div>
      </div>
    </div>

    <!-- ═══ editor chrome ═══ -->
    <div>
      <h2>Theme editor chrome</h2>
      <div class="panel">
        <div class="panel-h">
          <div>
            <p class="eyebrow">Theme Builder</p>
            <span class="t">Customize Your Theme</span>
          </div>
          <button class="icon-btn" title="Close">${ICONS.close}</button>
        </div>
        <div class="te-strip">
          <button class="te-tab on">${ICONS.image} Background</button>
          <button class="te-tab">${ICONS.droplet} Colors</button>
          <button class="te-tab">${ICONS.layer} Overlay</button>
        </div>
        <div style="border:1px dashed var(--uo-border-strong);border-radius:var(--uo-radius-md);padding:26px;text-align:center;color:var(--uo-text-tertiary);font-size:0.8rem;margin-bottom:var(--uo-space-3)">Live preview</div>
        <div class="te-foot">
          <button class="btn-secondary">${ICONS.eye} Preview</button>
          <button class="btn-secondary">${ICONS.export} Export</button>
          <button class="btn-secondary">${ICONS.import} Import</button>
          <button class="btn-primary">${ICONS.save} Save</button>
        </div>
      </div>
    </div>
  </div>
</div>

<p class="footnote">
  <strong>How to judge:</strong> pick a direction, then one clock option (A/B/C), one themes treatment
  (the library button appears in its “polish” styling — restyle-only keeps the current dashed ghost),
  one planner depth, one motion profile, and one font. Hovers, steppers, pills, checks and tabs are
  live. Lighter is the only true-light direction; the font toggle works on every page.
  Mockups are throwaway (scene-lab) — nothing here ships.
</p>

<script src="mockup-assets/mockup.js"></script>
</body>
</html>`;
}

function index() {
  const cards = DIRS.map(
    (d) => `
    <a class="card" href="${d.file}">
      <b>${d.name}</b><span>${d.tagline}</span>
    </a>`,
  ).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pomora — UI direction mockups</title>
<style>
  body { margin:0; padding:40px 20px; background:#0e1014; color:#f2f3f5;
    font-family: ui-sans-serif, system-ui, sans-serif; }
  .wrap { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 6px; }
  p.sub { color: rgba(242,243,245,0.55); margin: 0 0 28px; line-height: 1.6; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
  .card { display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: inherit; text-decoration: none; transition: background .15s ease, transform .15s ease; }
  .card:hover { background: rgba(255,255,255,0.09); transform: translateY(-2px); }
  .card b { font-size: 1.02rem; }
  .card span { font-size: 0.84rem; line-height: 1.55; color: rgba(242,243,245,0.6); }
</style>
</head>
<body>
<div class="wrap">
  <h1>UI direction mockups</h1>
  <p class="sub">Four candidate directions for the Pomora overhaul, each showing every surface
  (small settings with all three clock options, release notes, confirm popup, statistics,
  planner at all three depths, add-task, editor chrome). Motion (springy/subtle) and font
  (Plus Jakarta / Inter) are live toggles on every page. Pick a direction + one option per
  variant group. Throwaway files — nothing here ships.</p>
  <div class="cards">${cards}
  </div>
</div>
</body>
</html>`;
}

mkdirSync(root, { recursive: true });
for (const d of DIRS) {
  writeFileSync(join(root, d.file), page(d));
  console.log("wrote", d.file);
}
writeFileSync(join(root, "mockups.html"), index());
console.log("wrote mockups.html");
