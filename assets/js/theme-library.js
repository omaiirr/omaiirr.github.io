// Native scene picker; selection applies on commit.
const ThemeLibrary = (() => {

  // Scene filter list stays in sync with the theme builder.
  const FILTERS = [
    { id: "all", label: "All" },
    { id: "calm", label: "Calm" },
    { id: "cosmic", label: "Cosmic" },
    { id: "nature", label: "Nature" },
    { id: "minimal", label: "Minimal" },
    { id: "dramatic", label: "Dramatic" },
  ];
  const FILTER_MOODS = ["calm", "cosmic", "nature", "minimal", "dramatic"];

  let _query = "";
  let _filter = "all";
  let _built = false;
  let _applying = false;
  // Keep the scene grid loading state until the lazy scene files settle.
  let _librarySettled = false;

  function _libraryReady() {
    if (typeof ThemeScenes === "undefined") return true;
    return typeof ThemeScenes.isComplete === "function"
      ? ThemeScenes.isComplete()
      : true;
  }

  function _ensureLibrary() {
    if (
      typeof ThemeScenes === "undefined" ||
      typeof ThemeScenes.ensureAll !== "function"
    )
      return Promise.resolve(false);
    return ThemeScenes.ensureAll();
  }

  let _hadLiveScene = false;
  let _appliedThisSession = false;

  let _pending = null;

  function _state() {
    return typeof ThemeEngine.getNativeSceneState === "function"
      ? ThemeEngine.getNativeSceneState()
      : null;
  }

  function _selectedState() {
    if (_pending) return _pending;
    const st = _state();
    if (!st || !st.sceneId) return null;
    return {
      sceneId: st.sceneId,
      sceneOptions: st.sceneOptions || {},
      sceneBgColor: st.sceneBgColor || "",
    };
  }

  function _activeSceneId() {
    const st = _selectedState();
    return (st && st.sceneId) || null;
  }

  function _syncApplyBtn() {
    const btn = document.getElementById("tlApplyBtn");
    if (!btn) return;
    const hasSelection = !!(_pending && _pending.sceneId);
    btn.disabled = !hasSelection;
    btn.title = hasSelection
      ? "Apply this theme to the page"
      : "Pick a theme first";
  }

  function _panelScope() {
    return document.getElementById("tlBgSceneGroup");
  }

  function _previewCanvas() {
    return document.getElementById("tlPreviewCanvas");
  }

  function _pageSceneIsLive() {
    const canvas = document.getElementById("bgCanvas");
    return !!(
      canvas &&
      typeof ThemeScenes !== "undefined" &&
      ThemeScenes.isActiveCanvas(canvas)
    );
  }

  function _moodSets() {

    const ui = ThemeEngine._getSceneMoodsUI();
    const sets = {};
    for (const f of FILTER_MOODS) {
      sets[f] = new Set(ui.moods[f] || []);
    }
    return sets;
  }

  function _cardHTML(scene, activeId) {
    const isActive = scene.id === activeId;
    const thumbClass = ThemeEngine._getThumbClassMap();
    return `<button type="button" class="te-scene-card${
      isActive ? " active" : ""
    }" data-scene="${scene.id}" title="Use the ${scene.label} theme"><span class="te-scene-thumb ${
      thumbClass[scene.id] || ""
    }"></span><span class="te-scene-label">${scene.label}</span></button>`;
  }

  function _renderGrid() {
    const grid = document.getElementById("tlGrid");
    if (!grid || typeof ThemeScenes === "undefined") return;
    if (!_librarySettled) {
      grid.innerHTML = "";
      const pending = document.getElementById("tlCount");
      if (pending) pending.textContent = "Loading themes…";
      return;
    }

    const scenes = typeof ThemeScenes.listLive === "function"
      ? ThemeScenes.listLive()
      : ThemeScenes.list();
    const q = _query.trim().toLowerCase();
    let visible = scenes.filter((s) => !q || s.label.toLowerCase().includes(q));
    if (FILTER_MOODS.includes(_filter)) {
      const moodSet = _moodSets()[_filter];
      if (moodSet) visible = visible.filter((s) => moodSet.has(s.id));
    }
    const activeId = _activeSceneId();
    grid.innerHTML = visible.map((s) => _cardHTML(s, activeId)).join("");
    const count = document.getElementById("tlCount");
    if (count)
      count.textContent = `${visible.length} of ${scenes.length} themes`;
    _wireCards(grid);
    ThemeEngine._renderSceneThumbs(grid);
  }

  function _wireCards(grid) {
    const hoverable = window.matchMedia("(hover: hover)").matches;
    grid.querySelectorAll(".te-scene-card").forEach((btn) => {
      btn.addEventListener("click", () => _selectPreset(btn.dataset.scene));
      if (hoverable) {
        btn.addEventListener("mouseenter", () => ThemeEngine._hoverStart(btn));
        btn.addEventListener("mouseleave", () => ThemeEngine._hoverStop());
      }
    });
  }

  function _selectPreset(sceneId) {
    if (typeof ThemeScenes === "undefined" || !ThemeScenes.get(sceneId)) return;

    const base = _selectedState();
    const same = base && base.sceneId === sceneId;

    const scene = ThemeScenes.get(sceneId);
    const defaultBg = (scene.presetBgColors && scene.presetBgColors[0]) || "";
    _pending = {
      sceneId: sceneId,
      sceneOptions: same ? base.sceneOptions || {} : {},
      sceneBgColor: same ? base.sceneBgColor || defaultBg : defaultBg,
    };
    _renderGrid(); 
    _renderPanel();
    _revealPanel();
  }

  function _commit() {
    if (_applying) return; 
    const target = _selectedState();
    if (!target || !target.sceneId) return;
    if (typeof ThemeScenes === "undefined" || !ThemeScenes.get(target.sceneId))
      return;
    _applying = true;
    try {
      ThemeEngine.applyNativeScene(
        target.sceneId,
        target.sceneOptions || {},
        target.sceneBgColor || "",
      );
      _appliedThisSession = true; 
      _pending = null; 
      _renderGrid();
      _renderPanel();
    } finally {
      _applying = false;
    }

    close();
  }

  function discardPending() {
    _pending = null;
    _renderPanel();
  }

  function _revealPanel() {
    const panel = document.getElementById("tlScenePanel");
    if (!panel || typeof panel.scrollIntoView !== "function") return;
    const r = panel.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight)
      panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function _pushNative(opts, bgColor) {
    const base = _selectedState();
    if (!base || !base.sceneId) return;
    _pending = {
      sceneId: base.sceneId,
      sceneOptions: opts || {},
      sceneBgColor: bgColor || "",
    };
    const canvas = _previewCanvas();
    if (canvas && typeof ThemeScenes !== "undefined") {
      canvas.style.backgroundColor = bgColor || "";
      if (ThemeScenes.isActiveCanvas(canvas)) {
        ThemeScenes.updateOptions({ ...(opts || {}), bgColor: bgColor || null });
      } else {

        ThemeScenes.start(
          base.sceneId,
          { ...(opts || {}), bgColor: bgColor || null },
          canvas,
        );
      }
    }
    _syncApplyBtn();
  }

  function _startPreview(st) {
    const canvas = _previewCanvas();
    if (!canvas || typeof ThemeScenes === "undefined" || !st || !st.sceneId)
      return;
    const scene = ThemeScenes.get(st.sceneId);
    if (!scene) return;

    canvas.style.backgroundColor =
      st.sceneBgColor || (scene.presetBgColors && scene.presetBgColors[0]) || "";
    canvas.style.display = "block";
    ThemeScenes.start(
      st.sceneId,
      { ...(st.sceneOptions || {}), bgColor: st.sceneBgColor || null },
      canvas,
    );
  }

  function _renderPanel() {
    const host = _panelScope();
    const title = document.getElementById("tlEditorTitle");
    const emptyNote = document.getElementById("tlPreviewEmpty");
    const reset = document.getElementById("tlEditorReset");
    const applyBtn = document.getElementById("tlApplyBtn");
    const footer = document.getElementById("tlFooter");
    if (!host) return;
    const st = _selectedState();
    const scene =
      st && st.sceneId && typeof ThemeScenes !== "undefined"
        ? ThemeScenes.get(st.sceneId)
        : null;
    if (!scene) {
      host.style.display = "none";
      if (title) title.textContent = "Customize theme";
      if (emptyNote) emptyNote.style.display = "";
      if (reset) reset.hidden = true;

      if (applyBtn) applyBtn.hidden = true;
      if (footer) footer.hidden = true;
      return;
    }
    host.style.display = "";
    if (emptyNote) emptyNote.style.display = "none";
    if (reset) reset.hidden = false;
    if (applyBtn) applyBtn.hidden = false;
    if (footer) footer.hidden = false;

    if (title) title.textContent = `Customize ${scene.label}`;
    _syncApplyBtn();
    _startPreview(st);
    ThemeEngine.renderScenePanel(host, {
      sceneId: st.sceneId,
      options: st.sceneOptions || {},
      bgColor: st.sceneBgColor || "",
      onLive: _pushNative,
      onSettle: _pushNative,
    });
  }

  function _reset() {
    const st = _selectedState();
    if (!st || typeof ThemeScenes === "undefined") return;
    const scene = ThemeScenes.get(st.sceneId);
    if (!scene) return;
    const bg = (scene.presetBgColors && scene.presetBgColors[0]) || "";
    _pending = { sceneId: st.sceneId, sceneOptions: {}, sceneBgColor: bg };
    const canvas = _previewCanvas();
    if (canvas) {
      canvas.style.backgroundColor = bg;
      if (ThemeScenes.isActiveCanvas(canvas))
        ThemeScenes.updateOptions({ bgColor: bg || null });
      else ThemeScenes.start(st.sceneId, { bgColor: bg || null }, canvas);
    }
    _renderPanel();
  }

  function _renderFilters() {
    const wrap = document.getElementById("tlFilters");
    if (!wrap) return;
    wrap.innerHTML = FILTERS.map(
      (f) =>
        `<button type="button" class="tl-filter-pill${
          _filter === f.id ? " active" : ""
        }" data-filter="${f.id}">${f.label}</button>`,
    ).join("");
    wrap.querySelectorAll(".tl-filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        _filter = btn.dataset.filter;
        _renderFilters();
        _renderGrid();
      });
    });
  }

  function open() {
    const modal = document.getElementById("tlModal");
    if (!modal) return false;
    _query = "";
    _filter = "all";

    _hadLiveScene = _pageSceneIsLive();
    _appliedThisSession = false;
    _pending = null;
    _librarySettled = _libraryReady();
    const search = document.getElementById("tlSearch");
    if (search) search.value = "";

    modal.classList.add("open");
    _renderFilters();
    _renderGrid();

    _renderPanel();
    if (!_libraryReady()) {
      _ensureLibrary().then(() => {
        _librarySettled = true;
        if (!isOpen()) return;
        _renderGrid();
        _renderPanel();
      });
    }
    return true;
  }

  function close() {
    const modal = document.getElementById("tlModal");
    if (!modal) return;
    ThemeEngine._hoverStop();
    modal.classList.remove("open");

    const canvas = _previewCanvas();
    if (
      canvas &&
      typeof ThemeScenes !== "undefined" &&
      ThemeScenes.isActiveCanvas(canvas)
    )
      ThemeScenes.stop();
    const restore = _hadLiveScene || _appliedThisSession;
    _hadLiveScene = false;
    _appliedThisSession = false;

    _pending = null;
    if (!restore) return;
    const st = _state();
    if (st && typeof ThemeEngine.updateNativeSceneOptions === "function")
      ThemeEngine.updateNativeSceneOptions(
        st.sceneOptions || {},
        st.sceneBgColor || "",
      );
  }

  function isOpen() {
    const modal = document.getElementById("tlModal");
    return !!(modal && modal.classList.contains("open"));
  }

  function wire() {
    if (_built) return;
    _built = true;
    const search = document.getElementById("tlSearch");
    if (search) {
      search.addEventListener("input", () => {
        _query = search.value;
        _renderGrid();
      });
    }
    const closeBtn = document.getElementById("tlClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
    const backdrop = document.getElementById("tlBackdrop");
    if (backdrop) backdrop.addEventListener("click", close);
    const reset = document.getElementById("tlEditorReset");
    if (reset) reset.addEventListener("click", _reset);
    const applyBtn = document.getElementById("tlApplyBtn");
    if (applyBtn) applyBtn.addEventListener("click", _commit);
  }

  return {
    open,
    close,
    isOpen,
    wire,
    _renderPanel,
    _selectedState,
    discardPending,
  };
})();

ThemeEngine.openThemeLibrary = function () {
  return ThemeLibrary.open();
};

ThemeEngine.refreshThemeLibraryPanel = function () {
  if (ThemeLibrary.isOpen()) ThemeLibrary._renderPanel();
};

ThemeEngine.discardThemeLibrarySelection = function () {
  ThemeLibrary.discardPending();
};

document.addEventListener("DOMContentLoaded", () => {
  if (typeof ThemeLibrary === "undefined") return;
  ThemeLibrary.wire();
});
