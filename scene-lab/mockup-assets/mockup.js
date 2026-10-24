// mockup.js — Stage A variant toggles + widget interactions (throwaway).
// Motion and font are live page-level toggles; steppers/pills/checks/chips
// are fake-local so the mockups feel real.
document.addEventListener("DOMContentLoaded", () => {
  // ── segmented toggles ──
  document.querySelectorAll(".seg").forEach((seg) => {
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      const kind = seg.dataset.kind;
      if (kind === "motion") {
        document.body.dataset.motion = btn.dataset.v;
      } else if (kind === "font") {
        document.body.dataset.font = btn.dataset.v;
      }
    });
  });

  // ── steppers: − / + adjust the value ──
  document.querySelectorAll(".stepper").forEach((st) => {
    st.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const val = st.querySelector(".val");
      let n = parseInt(val.dataset.n, 10);
      n = Math.max(1, Math.min(180, n + (btn.dataset.d === "+" ? 1 : -1)));
      val.dataset.n = n;
      val.firstChild.textContent = n;
    });
  });

  // ── preset pills: pick within a group ──
  document.querySelectorAll(".pills-row, .filters, .chips").forEach((row) => {
    row.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill, .chipx");
      if (!btn) return;
      row.querySelectorAll(".pill.on, .chipx.on").forEach((b) => {
        if (b !== btn) b.classList.remove("on");
      });
      btn.classList.toggle("on");
    });
  });

  // ── task checks ──
  document.querySelectorAll(".task .chk").forEach((chk) => {
    chk.addEventListener("click", () => {
      chk.classList.toggle("done");
      chk.closest(".task").classList.toggle("done");
    });
  });

  // ── swatches (visual only) ──
  document.querySelectorAll(".swatches").forEach((grid) => {
    grid.addEventListener("click", (e) => {
      const sw = e.target.closest(".swatch");
      if (!sw) return;
      grid.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      sw.classList.add("active");
    });
  });

  // ── editor tabs (visual only) ──
  const strip = document.querySelector(".te-strip");
  if (strip) {
    strip.addEventListener("click", (e) => {
      const tab = e.target.closest(".te-tab");
      if (!tab) return;
      strip.querySelectorAll(".te-tab").forEach((t) => t.classList.remove("on"));
      tab.classList.add("on");
    });
  }
});
