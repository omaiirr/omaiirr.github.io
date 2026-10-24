// Theme engine handles custom themes and scene state.
const ThemeEngine = (() => {
  const STORAGE_KEY_CUSTOM = "customThemes";
  const STORAGE_KEY_ACTIVE = "activeCustomThemeId";
  const BODY_CLASS = "custom-theme-active";
  const MAX_THEMES = 10;
  const DB_NAME = "pomora-theme-media";
  const DB_VERSION = 1;
  const DB_STORE = "mediaFiles";
  const _mediaUrlCache = new Map();
  const _pendingUploads = new Map();

  const CSS_VAR_MAP = {
    accent: "--th-accent",
    text: "--th-text",
    surface: "--th-surface",
    surfaceText: "--th-surface-text",
    timerDisplay: "--th-timer",
    logo: "--th-logo",
    focusMode: "--th-focus-mode",
  };

  const DEFAULTS = {
    accent: "#6366f1",
    text: "#ffffff",

    surface: "#0f172a",
    surfaceText: "#ffffff",
    timerDisplay: "#ffffff",
    logo: "#ffffff",
    focusMode: "#6366f1",
  };

  const DEFAULT_EQUIVALENTS = {
    surface: ["rgba(10, 18, 34, 0.96)", "#0a1222"],
  };

  function _colorsAreDefault(colors) {
    if (!colors) return true;
    const norm = (v) => String(v == null ? "" : v).replace(/\s+/g, "").toLowerCase();
    for (const key of Object.keys(DEFAULTS)) {
      const value = colors[key];
      if (value == null || value === "") continue;
      const mine = norm(value);
      if (mine === norm(DEFAULTS[key])) continue;
      const alts = DEFAULT_EQUIVALENTS[key];
      if (alts && alts.some((alt) => norm(alt) === mine)) continue;
      return false;
    }
    return true;
  }

  function _liveColors() {
    const out = { ...DEFAULTS };
    let inline = null;
    try {
      inline = document.documentElement.style;
    } catch {
      return out;
    }
    for (const [key, prop] of Object.entries(CSS_VAR_MAP)) {
      const raw = (inline.getPropertyValue(prop) || "").trim();
      if (!raw) continue;
      const ref = /^var\(\s*(--th-[a-z-]+)\s*\)$/i.exec(raw);
      if (ref) {
        const targetKey = Object.keys(CSS_VAR_MAP).find(
          (k) => CSS_VAR_MAP[k] === ref[1],
        );
        const inherited = targetKey ? (inline.getPropertyValue(ref[1]) || "").trim() : "";
        if (inherited) out[key] = inherited;
        continue;
      }
      out[key] = raw;
    }
    return out;
  }

  function _showNotice(message, type = "info", timeout = 3600) {
    let root = document.getElementById("teToastRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "teToastRoot";
      root.className = "te-toast-root";
      root.setAttribute("role", "status");
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    const toast = document.createElement("div");
    toast.className = `te-toast te-toast-${type}`;
    const title = document.createElement("div");
    title.className = "te-toast-title";
    title.textContent =
      type === "error" ? "Notice" : type === "success" ? "Success" : "Theme";
    const body = document.createElement("div");
    body.className = "te-toast-message";
    body.textContent = message;
    toast.appendChild(title);
    toast.appendChild(body);
    toast.style.cursor = "pointer";
    toast.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 220);
    });
    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 220);
    }, timeout);
  }

  const TE_CLOSE_GLYPH =
    '<svg class="uo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';

  const TE_TILE_GLYPH = {
    trash:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>',
    alert:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>',
    pencil:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" /></svg>',
    import:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg>',
    share:
      '<svg class="uo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>',
  };

  function _closeMini(backdrop) {
    if (!backdrop || backdrop.classList.contains("closing")) return;
    backdrop.classList.add("closing");
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      backdrop.remove();
      return;
    }
    setTimeout(function () {
      backdrop.remove();
    }, 180);
  }

  function _miniHeader(card, title, onClose, tile) {
    const header = document.createElement("div");
    header.className = "te-confirm-header";

    const lead = document.createElement("div");
    lead.className = "te-confirm-lead";
    const tileEl = document.createElement("span");
    tileEl.className = "te-confirm-tile";
    tileEl.innerHTML = TE_TILE_GLYPH[tile] || TE_TILE_GLYPH.alert;
    const titleEl = document.createElement("h3");
    titleEl.className = "te-confirm-title";
    titleEl.textContent = title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "te-confirm-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = TE_CLOSE_GLYPH;
    closeBtn.addEventListener("click", onClose);
    lead.appendChild(tileEl);
    lead.appendChild(titleEl);
    header.appendChild(lead);
    header.appendChild(closeBtn);
    card.appendChild(header);
  }

  function _showAlert(message) {
    const backdrop = document.createElement("div");
    backdrop.className = "te-confirm-backdrop";
    const card = document.createElement("div");

    card.className = "te-confirm-card te-confirm-card-alert";
    const actions = document.createElement("div");
    actions.className = "te-confirm-actions";
    let cleanup = () => {
      document.removeEventListener("keydown", closeHandler, true);
      _closeMini(backdrop);
    };
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "te-confirm-btn primary";
    okBtn.textContent = "OK";
    okBtn.addEventListener("click", cleanup);
    actions.appendChild(okBtn);

    _miniHeader(card, message, cleanup, "alert");
    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    function closeHandler(e) {
      if (e.key !== "Escape") return;

      e.stopImmediatePropagation();
      cleanup();
    }
    document.addEventListener("keydown", closeHandler, true);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) cleanup();
    });
  }

  function _promptAction(
    title,
    placeholder,
    defaultValue,
    onConfirm,
    confirmLabel,
  ) {
    const backdrop = document.createElement("div");
    backdrop.className = "te-confirm-backdrop";
    const card = document.createElement("div");
    card.className = "te-confirm-card";
    let cleanup = () => {
      document.removeEventListener("keydown", closeHandler, true);
      _closeMini(backdrop);
    };
    const input = document.createElement("input");
    input.type = "text";
    input.className = "te-confirm-input";
    input.value = defaultValue || "";
    input.placeholder = placeholder || "";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        cleanup();
        onConfirm(input.value.trim());
      }
    });
    const actions = document.createElement("div");
    actions.className = "te-confirm-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "te-confirm-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", cleanup);
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "te-confirm-btn primary";
    confirmBtn.textContent = confirmLabel || "OK";
    confirmBtn.addEventListener("click", () => {
      cleanup();
      onConfirm(input.value.trim());
    });
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    _miniHeader(card, title, cleanup, "pencil");
    card.appendChild(input);
    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    function closeHandler(e) {
      if (e.key !== "Escape") return;

      e.stopImmediatePropagation();
      cleanup();
    }
    document.addEventListener("keydown", closeHandler, true);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) cleanup();
    });
    setTimeout(() => input.focus(), 100);
  }

  function _confirmAction(message, onConfirm) {
    const backdrop = document.createElement("div");
    backdrop.className = "te-confirm-backdrop";
    const card = document.createElement("div");
    card.className = "te-confirm-card";
    const body = document.createElement("p");
    body.className = "te-confirm-body";
    
    body.textContent = /cannot be undone/i.test(message)
      ? message
      : message.replace(/\s*$/, "") + " This cannot be undone.";
    const actions = document.createElement("div");
    actions.className = "te-confirm-actions";
    const dismiss = () => {
      document.removeEventListener("keydown", closeHandler, true);
      _closeMini(backdrop);
    };
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "te-confirm-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", dismiss);
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";

    confirmBtn.className = "te-confirm-btn danger";
    confirmBtn.textContent = "Delete";
    confirmBtn.addEventListener("click", () => {
      dismiss();
      onConfirm();
    });
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    _miniHeader(card, "Delete theme?", dismiss, "trash");
    card.appendChild(body);
    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    function closeHandler(e) {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      dismiss();
    }
    document.addEventListener("keydown", closeHandler, true);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) dismiss();
    });
  }

  function _choiceAction(title, message, buttons, onPick) {
    const backdrop = document.createElement("div");
    backdrop.className = "te-confirm-backdrop";
    const card = document.createElement("div");
    card.className = "te-confirm-card";
    const body = document.createElement("p");
    body.className = "te-confirm-body";
    body.textContent = message;
    const actions = document.createElement("div");
    actions.className = "te-confirm-actions";
    let cleanup = () => {
      document.removeEventListener("keydown", closeHandler, true);
      _closeMini(backdrop);
    };
    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "te-confirm-btn" + (b.primary ? " primary" : "");
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        cleanup();
        onPick(b.value);
      });
      actions.appendChild(btn);
    });
    _miniHeader(card, title, cleanup, "import");
    card.appendChild(body);
    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    function closeHandler(e) {
      if (e.key !== "Escape") return;

      e.stopImmediatePropagation();
      cleanup();
    }
    document.addEventListener("keydown", closeHandler, true);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) cleanup();
    });
  }

  function _showShareLink(url) {
    const backdrop = document.createElement("div");
    backdrop.className = "te-confirm-backdrop";
    const card = document.createElement("div");
    card.className = "te-confirm-card";
    const body = document.createElement("p");
    body.className = "te-confirm-body";
    body.textContent = "Clipboard copy failed. Copy the link below:";
    const linkBox = document.createElement("textarea");
    linkBox.readOnly = true;
    linkBox.className = "te-confirm-textarea";
    linkBox.value = url;
    const actions = document.createElement("div");
    actions.className = "te-confirm-actions";
    let cleanup = () => {
      document.removeEventListener("keydown", closeHandler, true);
      _closeMini(backdrop);
    };
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "te-confirm-btn primary";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      linkBox.select();
      try {
        document.execCommand("copy");
      } catch {}
      _showNotice("Share link copied to clipboard.", "success");
      cleanup();
    });
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "te-confirm-btn";
    doneBtn.textContent = "Close";
    doneBtn.addEventListener("click", cleanup);
    actions.appendChild(copyBtn);
    actions.appendChild(doneBtn);
    _miniHeader(card, "Share link", cleanup, "share");
    card.appendChild(body);
    card.appendChild(linkBox);
    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    function closeHandler(e) {
      if (e.key !== "Escape") return;

      e.stopImmediatePropagation();
      cleanup();
    }
    document.addEventListener("keydown", closeHandler, true);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) cleanup();
    });
    linkBox.focus();
    linkBox.select();
  }

  function _escapeHtml(str) {
    return String(str ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }

  function _getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM)) || [];
    } catch {
      return [];
    }
  }
  function _setAll(themes) {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(themes));
  }
  function _getActiveId() {
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || null;
  }
  function _setActiveId(id) {
    if (id === null || id === undefined)
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    else localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    _updateCustomActiveBadge();
    // Keep the theme-selection grid in step with the active id wherever the
    // active theme changes (create / apply / delete / deactivate), not only on
    // the paths that remember to rebuild it by hand. Safe to call here:
    // _rebuildCustomList never calls back into _setActiveId.
    if (typeof ThemeEngine !== "undefined" && ThemeEngine._rebuildCustomList)
      ThemeEngine._rebuildCustomList();
  }
  function _updateCustomActiveBadge() {
    const badge = document.getElementById("customThemeActiveBadge");
    if (badge) badge.style.display = _getActiveId() ? "flex" : "none";
    // Quick Settings' "edit active theme" control is only meaningful while a
    // custom theme is active; timer.js owns it and exposes this sync hook
    // (2026-10-18). Engine stays unaware of the button itself.
    if (typeof window.__syncQsEditThemeBtn === "function")
      window.__syncQsEditThemeBtn();
  }

  function _closeAllThemeMenus() {
    document.querySelectorAll(".te-theme-row-menu.open").forEach((m) => {
      m.classList.remove("open");
      const btn = m.previousElementSibling;
      if (btn && btn.classList.contains("te-theme-row-more"))
        btn.setAttribute("aria-expanded", "false");
    });
  }
  function _makeBlobKey(themeId, type) {
    return `themeMedia:${themeId}:${type}`;
  }

  function _injectCSSVars(values) {
    const root = document.documentElement;
    /* Every palette (scene auto-detect, image sample, solid/gradient, custom
       theme) lands here, so this is the one place where the contrast floor is
       enforced. See _normalizePalette. */
    const merged = _normalizePalette({ ...DEFAULTS, ...(values || {}) });
    for (const [key, value] of Object.entries(merged)) {
      const prop = CSS_VAR_MAP[key] || `--th-${key}`;
      if (value != null && value !== "") root.style.setProperty(prop, value);
    }
  }

  function _clearCSSVars() {
    const root = document.documentElement;
    [
      "--th-accent",
      "--th-accent-ink",
      "--th-text",
      "--th-surface",
      "--th-surface-text",
      "--th-timer",
      "--th-logo",
      "--th-focus-mode",
      "--th-overlay",
    ].forEach((p) => root.style.removeProperty(p));
  }

  function _openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE))
          request.result.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  async function _storeMediaBlob(key, blob) {
    if (!key || !blob) return false;
    try {
      const db = await _openDb();
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(blob, key);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
        tx.onabort = reject;
      });
      _revokeMediaUrl(key);
      return true;
    } catch {
      return false;
    }
  }

  async function _readMediaBlob(key) {
    if (!key) return null;
    try {
      const db = await _openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const request = tx.objectStore(DB_STORE).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  async function _deleteMediaBlob(key) {
    if (!key) return false;
    try {
      const db = await _openDb();
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(key);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
        tx.onabort = reject;
      });
      _revokeMediaUrl(key);
      return true;
    } catch {
      return false;
    }
  }

  async function _deleteThemeMedia(themeId) {
    if (!themeId) return;
    await Promise.all([
      _deleteMediaBlob(_makeBlobKey(themeId, "image")),
      _deleteMediaBlob(_makeBlobKey(themeId, "video")),
    ]);
  }

  async function _resolveMediaUrl(key) {
    if (!key) return null;
    if (_mediaUrlCache.has(key)) return _mediaUrlCache.get(key);
    const blob = await _readMediaBlob(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    _mediaUrlCache.set(key, url);
    return url;
  }

  function _revokeMediaUrl(key) {
    const url = _mediaUrlCache.get(key);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      _mediaUrlCache.delete(key);
    }
  }

  function _revokeObjectUrl(url) {
    if (typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }

  function _removeBuiltinThemeClasses() {
    [document.body, document.getElementById("timerContainer")].forEach((el) => {
      if (!el) return;
      [...el.classList]
        .filter((c) => c.startsWith("theme-") && c !== BODY_CLASS)
        .forEach((c) => el.classList.remove(c));
    });
  }

  function _restoreBuiltinThemeClasses() {
    const savedTheme = localStorage.getItem("timerTheme") || "gradient-default";
    const themeClass = "theme-" + savedTheme;
    document.body.classList.add(themeClass);
    const tc = document.getElementById("timerContainer");
    if (tc) tc.classList.add(themeClass);
  }

  function _buildBackgroundCSS(bg) {
    if (!bg || !bg.type) return null;
    switch (bg.type) {
      case "solid":
        return bg.color || null;
      case "gradient": {
        if (!bg.gradStops || bg.gradStops.length < 2) return null;
        const angle = bg.gradAngle ?? 135;
        return `linear-gradient(${angle}deg, ${bg.gradStops.map((s) => `${s.color} ${s.pos}%`).join(", ")})`;
      }
      case "image":
        return null;
      case "video":
        return null;
      case "scene":
        return null;
      default:
        return null;
    }
  }

  function _applyMediaElements(bg) {
    const imgEl = document.getElementById("bgImage");
    const videoEl = document.getElementById("bgVideo");
    const canvasEl = document.getElementById("bgCanvas");
    if (typeof ThemeScenes !== "undefined") ThemeScenes.stop();
    if (imgEl) imgEl.style.display = "none";
    if (videoEl) {
      videoEl.style.display = "none";
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    }
    if (canvasEl) canvasEl.style.display = "none";
    if (!bg || !bg.type) return;
    if (bg.type === "image") {
      const src = bg.imageDataUrl || bg.imageUrl;
      if (!imgEl) return;
      const applyImg = (url) => {
        imgEl.style.backgroundImage = `url("${url}")`;
        imgEl.style.backgroundSize = bg.imageSize || "cover";
        imgEl.style.backgroundPosition = "center center";
        imgEl.style.backgroundRepeat = "no-repeat";
        imgEl.style.imageRendering = "auto";
        imgEl.style.display = "block";
      };
      if (src) {
        applyImg(src);
      } else if (bg.imageKey) {
        _resolveMediaUrl(bg.imageKey).then((resolvedUrl) => {
          if (!resolvedUrl || !imgEl) return;
          applyImg(resolvedUrl);
        });
      }
    }
    if (bg.type === "video") {
      const src = bg.videoDataUrl || bg.videoUrl;
      if (!videoEl) return;
      if (src) {
        videoEl.src = src;
        videoEl.style.opacity = bg.videoOpacity ?? 1;
        videoEl.style.display = "block";
        videoEl.play().catch(() => {});
      } else if (bg.videoKey) {
        _resolveMediaUrl(bg.videoKey).then((resolvedUrl) => {
          if (!resolvedUrl || !videoEl) return;
          videoEl.src = resolvedUrl;
          videoEl.style.opacity = bg.videoOpacity ?? 1;
          videoEl.style.display = "block";
          videoEl.play().catch(() => {});
        });
      }
    }
    if (bg.type === "scene" && typeof ThemeScenes !== "undefined") {
      const sceneId = _safeSceneId(_resolveSceneId(bg.sceneId));
      const so = bg.sceneOptions || {};
      const scenes = ThemeScenes.list();
      const hasPerSceneKeys =
        scenes.some((s) => so[s.id] !== undefined) ||
        so.flourish !== undefined ||
        so.constellation !== undefined ||
        so.shootingstars !== undefined ||
        so.rainwindow !== undefined;
      const opts = hasPerSceneKeys
        ? { ...(_legacySceneValue(sceneId, so) || {}) }
        : { ...so };
      if (canvasEl) {
        const sceneBgCol =
          (bg.sceneBgColors && _legacySceneValue(sceneId, bg.sceneBgColors)) ||
          bg.sceneBgColor ||
          null;
        const optsWithBg = { ...opts, bgColor: sceneBgCol };
        ThemeScenes.start(sceneId, optsWithBg, canvasEl);
        // Scene bg color — set on canvas as CSS background (also passed to scene draw())
        if (sceneBgCol) {
          canvasEl.style.backgroundColor = sceneBgCol;
        }
      }
    }
  }

  function _clearMediaElements() {
    const imgEl = document.getElementById("bgImage");
    const videoEl = document.getElementById("bgVideo");
    if (imgEl) {
      imgEl.style.display = "none";
      imgEl.style.backgroundImage = "";
    }
    if (videoEl) {
      videoEl.style.display = "none";
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    }
    if (typeof ThemeScenes !== "undefined") ThemeScenes.stop();
  }

  function _applyOverlay(overlay) {
    const root = document.documentElement;
    const overlayEl = document.getElementById("overlay");
    if (overlay && overlay.color && overlay.color !== "rgba(0,0,0,0)") {
      root.style.setProperty("--th-overlay", overlay.color);
      if (overlayEl) {
        overlayEl.style.display = "block";
        overlayEl.style.background = overlay.color;
      }
    } else {
      root.style.removeProperty("--th-overlay");
      if (overlayEl) overlayEl.style.display = "none";
    }
  }

  let _previewSceneId = null;

  // Legacy migration: saved themes may reference the old "flourish" scene key
  // (renamed to "constellation", now the Fireflies scene). Resolve per-scene
  // objects with fallbacks so those options/colors survive the renames.
  function _legacySceneValue(sceneId, obj) {
    if (!obj) return undefined;
    if (obj[sceneId] !== undefined) return obj[sceneId];
    if (obj.constellation !== undefined) return obj.constellation;
    if (obj.flourish !== undefined) return obj.flourish;
    // cut scenes fold into their successors so saved themes keep working
    if (sceneId === "starfield" && obj.shootingstars !== undefined)
      return obj.shootingstars;
    if (sceneId === "condensation" && obj.rainwindow !== undefined)
      return obj.rainwindow;
    return undefined;
  }

  // Cut scenes resolve to their successors (shootingstars → starfield with the
  // shooting toggle on, rainwindow → condensation).
  function _resolveSceneId(id) {
    if (id === "flourish" || id === "constellation") return "fireflies";
    if (id === "shootingstars") return "starfield";
    if (id === "rainwindow") return "condensation";
    if (id === "pine") return "snow";
    if (id === "biolum") return "ocean";
    return id || "particles";
  }

  // Purge safety net: if the resolved scene id is not in the registry — e.g. it
  // was purged pending a ground-up rebuild (fireflies, ocean, condensation,
  // meteor, …) or is otherwise unknown — degrade to "particles" before any
  // start() call so saved themes never render a blank background. Alias targets
  // stay intact: once a scene is rebuilt under its original id, saved themes
  // resolve to it again automatically.
  function _safeSceneId(id) {
    const resolved = id || "particles";
    if (typeof ThemeScenes === "undefined") return resolved;
    if (ThemeScenes.get(resolved)) return resolved;
    /* Scene files now load on demand: a known id that has not arrived yet is
       pending, not missing, so keep it and let core start it when it lands. */
    if (typeof ThemeScenes.has === "function" && ThemeScenes.has(resolved))
      return resolved;
    return "particles";
  }

  /* Pulls the whole scene library in. Called only from the pickers, so a
     visitor who never opens one never pays for the other 39 scenes. */
  function _ensureSceneLibrary() {
    if (
      typeof ThemeScenes === "undefined" ||
      typeof ThemeScenes.ensureAll !== "function"
    )
      return Promise.resolve(false);
    return ThemeScenes.ensureAll();
  }
  function _sceneLibraryComplete() {
    if (typeof ThemeScenes === "undefined") return true;
    if (typeof ThemeScenes.isComplete === "function") return ThemeScenes.isComplete();
    return true;
  }
  let _scenePickToken = 0;

  function _stopPreviewScene() {
    if (typeof ThemeScenes === "undefined") return;
    const previewCanvas = document.getElementById("tePreviewCanvas");
    if (previewCanvas && ThemeScenes.isActiveCanvas(previewCanvas))
      ThemeScenes.stop();
    _previewSceneId = null;
    if (previewCanvas) previewCanvas.style.display = "none";
  }

  function _applyPreviewScene(config) {
    const previewCanvas = document.getElementById("tePreviewCanvas");
    if (!previewCanvas || typeof ThemeScenes === "undefined") return;
    if (config.bg?.type !== "scene") {
      _stopPreviewScene();
      return;
    }
    const sceneId = _safeSceneId(_resolveSceneId(config.bg.sceneId));
    const so = config.bg.sceneOptions || {};
    const scenes = typeof ThemeScenes !== "undefined" ? ThemeScenes.list() : [];
    const hasPerSceneKeys =
      scenes.some((s) => so[s.id] !== undefined) ||
      so.flourish !== undefined ||
      so.constellation !== undefined ||
      so.shootingstars !== undefined ||
      so.rainwindow !== undefined;
    const options = hasPerSceneKeys
      ? { ...(_legacySceneValue(sceneId, so) || {}) }
      : { ...so };
    options.bgColor =
      (config.bg?.sceneBgColors &&
        _legacySceneValue(sceneId, config.bg.sceneBgColors)) ||
      config.bg?.sceneBgColor ||
      null;
    previewCanvas.style.display = "block";
    // Reset any leftover z-index/background from previous scene runs
    previewCanvas.style.zIndex = "";
    previewCanvas.style.backgroundColor = "";
    if (
      _previewSceneId === sceneId &&
      ThemeScenes.isActiveCanvas(previewCanvas)
    ) {
      ThemeScenes.updateOptions(options);
      return;
    }
    _previewSceneId = sceneId;
    ThemeScenes.start(sceneId, options, previewCanvas);
  }

  function _sp(scope, slot) {
    return scope ? scope.querySelector('[data-sp="' + slot + '"]') : null;
  }

  // The colour-picker arrow, exactly as _includes/svg/uo-line-chevron-down.svg
  // renders it — the scene panel builds its option cards in JS, and they must
  // carry the same glyph as the static background picker next to them.
  const _CHEVRON_SVG =
    '<svg class="uo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  const _PLUS_SVG =
    '<svg class="uo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const _CLOSE_SVG =
    '<svg class="uo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function _sceneOf(ctx) {
    return ctx && ctx.sceneId && typeof ThemeScenes !== "undefined"
      ? ThemeScenes.get(ctx.sceneId)
      : null;
  }

  function _sceneOptId(ctx, key) {
    return ctx.prefix + "SceneOpt_" + key;
  }

  function _sceneOptInput(ctx, key) {
    return ctx.scope
      ? ctx.scope.querySelector('[data-opt="' + key + '"]')
      : null;
  }

  function _gatherSceneOptions(ctx) {
    const scene = _sceneOf(ctx);
    const opts = {};
    if (!scene) return opts;
    for (const field of scene.options || []) {

      if (field.type === "shellcolors") {
        const box = ctx.scope
          ? ctx.scope.querySelector('[data-shell-colors="' + field.key + '"]')
          : null;
        opts[field.key] = box && Array.isArray(box._spPicks) ? box._spPicks.slice() : [];
        continue;
      }
      const el = _sceneOptInput(ctx, field.key);
      if (!el) continue;
      opts[field.key] =
        field.type === "range"
          ? parseFloat(el.value)
          : field.type === "checkbox"
            ? el.checked
            : el.value;
    }
    return opts;
  }

  function _sceneBgValue(ctx) {
    const el = _sp(ctx.scope, "SceneBgColor");
    return el ? el.value : "";
  }

  function _updateSceneBgPreview(ctx, color) {
    const swatch = _sp(ctx.scope, "SceneBgPreviewSwatch");
    const hex = _sp(ctx.scope, "SceneBgHex");
    if (swatch) swatch.style.background = color;
    if (hex) hex.textContent = color;
  }

  function _sceneSwatchRowHTML(colors, current, opts) {
    const cur = (current || "").toLowerCase();
    const saved = (opts && opts.saved) || [];
    const customLabel = (opts && opts.customLabel) || "Custom";
    const customTitle =
      (opts && opts.customTitle) || "Pick a custom color";

    return (
      colors
        .map(
          (c) =>
            `<button type="button" class="te-scene-bg-swatch${c.toLowerCase() === cur ? " active" : ""}" data-color="${c}" style="background:${c};"><span class="te-swatch-tooltip">${c}</span></button>`,
        )
        .join(" ") +
      saved
        .map(
          (c, i) =>
            `<span class="te-swatch-wrap"><button type="button" class="te-scene-bg-swatch${c.toLowerCase() === cur ? " active" : ""}" data-color="${c}" style="background:${c};"><span class="te-swatch-tooltip">${c}</span></button><button type="button" class="te-swatch-del" data-saved-del="${i}" title="Remove saved preset" aria-label="Remove saved preset ${c}">${_CLOSE_SVG}</button></span>`,
        )
        .join("") +
      `<button type="button" class="te-scene-bg-swatch te-scene-bg-swatch--custom" data-color="custom" title="${customTitle}"><span class="te-swatch-plus">${_PLUS_SVG}</span><span class="te-swatch-tooltip">${customLabel}</span></button>`
    );
  }

  const SAVED_PRESET_KEY = "sceneSavedPresets";
  const SAVED_PRESET_MAX = 6;

  function _savedPresetsAll() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_PRESET_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function _savedPresets(sceneId, kind) {
    const bucket = _savedPresetsAll()[sceneId];
    const row = bucket && Array.isArray(bucket[kind]) ? bucket[kind] : [];
    return row.slice(0, SAVED_PRESET_MAX);
  }

  function _writeSavedPresets(sceneId, kind, row) {
    const all = _savedPresetsAll();
    all[sceneId] = all[sceneId] || {};
    all[sceneId][kind] = row.slice(-SAVED_PRESET_MAX);
    try {
      localStorage.setItem(SAVED_PRESET_KEY, JSON.stringify(all));
    } catch {
      }
  }

  function _addSavedPreset(sceneId, kind, entry) {
    const row = _savedPresets(sceneId, kind);
    const key = (v) => JSON.stringify(v).toLowerCase();
    if (row.some((e) => key(e) === key(entry))) return false;
    _writeSavedPresets(sceneId, kind, row.concat([entry]));
    return true;
  }

  function _removeSavedPreset(sceneId, kind, at) {
    const row = _savedPresets(sceneId, kind);
    if (!Number.isInteger(at) || at < 0 || at >= row.length) return;
    row.splice(at, 1);
    _writeSavedPresets(sceneId, kind, row);
  }

  function _presetAddInput(container, value, label) {
    const inp = document.createElement("input");
    inp.type = "color";
    inp.className = "te-color-input-hidden te-preset-add";
    inp.value = _isValidHex(value) ? value : "#020617";
    inp.setAttribute("aria-label", label);
    container.appendChild(inp);
    return inp;
  }

  function _paintSceneColor(ctx, container, key, hex) {
    if (key === "bg") {
      ctx.bgCache[ctx.sceneId] = hex;
      _updateSceneBgPreview(ctx, hex);
    } else {
      const root = ctx.scope || container;
      const card =
        (root &&
          root.querySelector(
            '.te-color-picker[data-for="' + _sceneOptId(ctx, key) + '"]',
          )) ||
        (container &&
          container.querySelector(
            '.te-color-picker[data-for="' + _sceneOptId(ctx, key) + '"]',
          ));
      if (card) {
        const sw = card.querySelector(".te-color-picker-swatch");
        const hx = card.querySelector(".te-color-picker-hex");
        if (sw) sw.style.background = hex;
        if (hx) hx.textContent = hex;
      }
      ctx.optsCache[ctx.sceneId] = {
        ...(ctx.optsCache[ctx.sceneId] || {}),
        [key]: hex,
      };
    }
  }

  function _wirePanelColorCards(ctx) {
    ctx.scope.querySelectorAll(".te-color-picker").forEach((card) => {

      if (card.dataset.wired) return;
      card.dataset.wired = "1";
      const inpId = card.dataset.for;
      if (!inpId) return;
      const inp = ctx.scope.querySelector("#" + inpId) || document.getElementById(inpId);
      if (!inp) return;
      const sw = card.querySelector(".te-color-picker-swatch");
      const hx = card.querySelector(".te-color-picker-hex");
      card.addEventListener("click", () => inp.click());
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inp.click();
        }
      });
      inp.addEventListener("input", () => {
        if (sw) sw.style.background = inp.value;
        if (hx) hx.textContent = inp.value;
      });
    });
  }

  function _shellChipsHTML(scene, picks) {
    const presets = Array.isArray(scene.presetShellColors)
      ? scene.presetShellColors
      : [];
    const multiOn = picks.length === 0;
    let html =
      `<button type="button" class="te-shell-chip te-shell-chip--multi${multiOn ? " active" : ""}" data-shell-multi="1" aria-pressed="${multiOn}" title="Multi-Colored: every colour in the pack, a different one each shell">` +
      `<span class="te-shell-dot te-shell-dot--multi"></span><span class="te-shell-name">Multi-Colored</span></button>`;
    /* Scene presets and saved picks reach these attributes from stored data,
       so they are escaped rather than trusted. A real hex is unaffected. */
    for (const p of presets) {
      const hex = (p.color || "").toLowerCase();
      const on = picks.some((c) => c.toLowerCase() === hex);
      html +=
        `<button type="button" class="te-shell-chip${on ? " active" : ""}" data-shell-color="${_escapeHtml(p.color)}" aria-pressed="${on}" title="${_escapeHtml(p.name)}${on ? ", click to remove" : ""}">` +
        `<span class="te-shell-dot" style="background:${_escapeHtml(p.color)}"></span><span class="te-shell-name">${_escapeHtml(p.name)}</span>${on ? '<span class="te-shell-x">×</span>' : ""}</button>`;
    }

    for (const hex of picks) {
      if (presets.some((p) => (p.color || "").toLowerCase() === hex.toLowerCase()))
        continue;
      html +=
        `<button type="button" class="te-shell-chip active" data-shell-color="${_escapeHtml(hex)}" aria-pressed="true" title="Custom ${_escapeHtml(hex)}, click to remove">` +
        `<span class="te-shell-dot" style="background:${_escapeHtml(hex)}"></span><span class="te-shell-name">${_escapeHtml(hex)}</span><span class="te-shell-x">×</span></button>`;
    }
    html +=
      `<button type="button" class="te-shell-chip te-shell-chip--add" data-shell-add="1" title="Add a custom shell colour">` +
      `<span class="te-shell-plus">${_PLUS_SVG}</span><span class="te-shell-name">Custom</span></button>`;
    return html;
  }

  function _paintShellChips(box, scene) {
    const wrap = box.querySelector(".te-shell-chips");
    if (wrap) wrap.innerHTML = _shellChipsHTML(scene, box._spPicks || []);
  }

  function _panelPush(ctx, live) {
    if (!ctx || !_sceneOf(ctx)) return;
    const opts = _gatherSceneOptions(ctx);
    const bg = _sceneBgValue(ctx);
    ctx.optsCache[ctx.sceneId] = opts;
    if (bg) ctx.bgCache[ctx.sceneId] = bg;
    if (live) ctx.onLive(opts, bg);
    else ctx.onSettle(opts, bg);
  }

  function _buildSceneOptionsUI(ctx, savedOptions) {
    const container = _sp(ctx.scope, "SceneOptions");
    const scene = _sceneOf(ctx);
    if (!container || !scene) {
      if (container) container.innerHTML = "";
      const presetsEl = _sp(ctx.scope, "SceneBgPresets");
      if (presetsEl) presetsEl.innerHTML = "";
      return;
    }
    const sceneId = ctx.sceneId;

    const currentActive = ctx.cardsRoot
      ? ctx.cardsRoot.querySelector(".te-scene-card.active")
      : null;
    const keepColors = ctx.keepColors && _keepSceneColors();
    const bgInput = _sp(ctx.scope, "SceneBgColor");
    if (currentActive && currentActive.dataset.scene !== sceneId) {
      const prevId = currentActive.dataset.scene;
      ctx.optsCache[prevId] = _gatherSceneOptions({ ...ctx, sceneId: prevId });
      if (bgInput) ctx.bgCache[prevId] = bgInput.value;
    }

    const cached = ctx.optsCache[sceneId] || {};

    if (keepColors && currentActive && currentActive.dataset.scene !== sceneId) {
      const prevOpts = ctx.optsCache[currentActive.dataset.scene] || {};
      for (const field of scene.options) {
        if (field.type === "color" && prevOpts[field.key] !== undefined) {
          cached[field.key] = prevOpts[field.key];
        }
      }
    }

    let saved = {};
    if (savedOptions && typeof savedOptions === "object") {
      const scenes = ThemeScenes.list();
      const hasPerSceneKeys =
        scenes.some((s) => savedOptions[s.id] !== undefined) ||
        savedOptions.flourish !== undefined ||
        savedOptions.shootingstars !== undefined ||
        savedOptions.rainwindow !== undefined;
      saved = hasPerSceneKeys
        ? _legacySceneValue(sceneId, savedOptions) || {}
        : savedOptions;
    }

    const opts = { ...scene.defaults, ...saved, ...cached };

    for (const field of scene.options) {
      if (field.type === "color" && !_isValidHex(opts[field.key])) {
        opts[field.key] = _isValidHex(scene.defaults[field.key])
          ? scene.defaults[field.key]
          : "#ffffff";
      }
    }
    ctx.optsCache[sceneId] = opts;

    if (bgInput && !keepColors) {
      const ownBg =
        ctx.bgCache[sceneId] ||
        (scene.presetBgColors && scene.presetBgColors[0]) ||
        "#020617";
      if (bgInput.value !== ownBg) {
        bgInput.value = ownBg;
        _updateSceneBgPreview(ctx, ownBg);
      }
    }
    const hasCombos =
      scene.presetCombos &&
      Array.isArray(scene.presetCombos) &&
      scene.presetCombos.length > 0;
    let fieldsHtml = scene.options
      .map((field) => {
        const id = _sceneOptId(ctx, field.key);
        if (field.type === "color") {
          const colVal = opts[field.key] || "#ffffff";
          const presets =
            !hasCombos &&
            scene.presetColors &&
            Array.isArray(scene.presetColors[field.key])
              ? scene.presetColors[field.key]
              : null;
          return `<label class="te-label" style="margin-top:8px;">${field.label}</label>
          <div class="te-color-picker" data-for="${id}" role="button" tabindex="0">
            <div class="te-color-picker-swatch" style="background:${colVal}"></div>
            <div class="te-color-picker-info">
              <span class="te-color-picker-label">Current</span>
              <span class="te-color-picker-hex">${colVal}</span>
            </div>
            <span class="te-color-picker-arrow">${_CHEVRON_SVG}</span>
          </div>
          <input type="color" id="${id}" data-opt="${field.key}" class="te-color-input-hidden te-scene-opt" value="${colVal}" />
          ${presets ? `<div class="te-scene-bg-label" style="margin-top:6px;">Suggested</div><div class="te-scene-bg-presets" data-presets-for="${id}"></div>` : ""}`;
        }
        if (field.type === "shellcolors") {

          const initial = Array.isArray(opts[field.key])
            ? opts[field.key].filter((c) => _isValidHex(c)).slice(0, 8)
            : _isValidHex(opts.color)
              ? [opts.color]
              : [];
          return `<label class="te-label" style="margin-top:8px;">${field.label}</label>
          <div class="te-shell-colors" data-shell-colors="${field.key}" data-initial="${initial.join(",")}">
            <div class="te-shell-chips"></div>
            <input type="color" class="te-color-input-hidden te-shell-custom" value="${initial[0] || "#22d3ee"}" aria-label="Add a custom shell color" />
          </div>`;
        }
        if (field.type === "checkbox") {
          const checked = opts[field.key] ? "checked" : "";
          return `<label class="te-label" style="margin-top:8px;">${field.label}</label>
          <label class="te-toggle-row"><input type="checkbox" id="${id}" data-opt="${field.key}" class="te-scene-opt" ${checked} /><span class="te-toggle-track"><span class="te-toggle-thumb"></span></span><span class="te-toggle-state" id="${id}State">${opts[field.key] ? "On" : "Off"}</span></label>`;
        }
        if (field.type === "select") {
          const choices = field.choices || [];
          const selVal = opts[field.key] ?? (choices[0] && choices[0][0]) ?? "";
          return `<label class="te-label" style="margin-top:8px;">${field.label}</label>
          <select id="${id}" data-opt="${field.key}" class="te-scene-opt te-scene-select">${choices.map(([v, l]) => `<option value="${v}"${v === selVal ? " selected" : ""}>${l}</option>`).join("")}</select>`;
        }
        const min = field.min ?? 0,
          max = field.max ?? 100,
          step = field.step ?? 1,
          val = opts[field.key] ?? min;
        return `<label class="te-label" style="margin-top:8px;">${field.label}</label><input type="range" id="${id}" data-opt="${field.key}" class="te-range te-scene-opt" min="${min}" max="${max}" step="${step}" value="${val}" /><span id="${id}Val" class="te-range-val">${val}</span>`;
      })
      .join("");

    if (hasCombos) {
      const hasLineField = scene.options.some(
        (o) => o.key === "color" && o.type === "color",
      );
      const hasAccField = scene.options.some(
        (o) => o.key === "accent" && o.type === "color",
      );
      if (hasLineField && hasAccField) {
        const curLine = (opts.color || "").toLowerCase();
        const curAcc = (opts.accent || "").toLowerCase();
        fieldsHtml +=
          `<div class="te-scene-bg-label" style="margin-top:12px;">Suggested Combos</div>
          <div class="te-scene-bg-presets" data-sp="SceneCombos">` +
          scene.presetCombos
            .map(
              ([l, a]) =>
                `<button type="button" class="te-scene-combo-swatch${l.toLowerCase() === curLine && a.toLowerCase() === curAcc ? " active" : ""}" data-line="${l}" data-accent="${a}" title="${l} + ${a}"><span class="te-combo-line" style="background:${l};"></span><span class="te-combo-accent" style="background:${a};"></span></button>`,
            )
            .join("") +
          `</div>`;
      }
    }
    container.innerHTML = fieldsHtml;

    container._spRefreshRings = null;

    container.querySelectorAll("[data-shell-colors]").forEach((box) => {
      const key = box.dataset.shellColors;
      if (!scene.options.some((o) => o.key === key && o.type === "shellcolors"))
        return;
      box._spPicks = (box.dataset.initial || "").split(",").filter(Boolean).slice(0, 8);
      const custom = box.querySelector(".te-shell-custom");
      const commit = (picks) => {
        box._spPicks = picks.filter(Boolean).slice(0, 8);
        _paintShellChips(box, scene);
        
        if (container._spRefreshRings) container._spRefreshRings();
        _panelPush(ctx, false);
      };
      _paintShellChips(box, scene);
      box.addEventListener("click", (e) => {
        const btn = e.target.closest ? e.target.closest(".te-shell-chip") : null;
        if (!btn || !box.contains(btn)) return;
        e.preventDefault();
        if (btn.dataset.shellAdd) {
          if (custom) {
            const cur = box._spPicks;
            custom.value = cur[cur.length - 1] || "#22d3ee";
            custom.click();
          }
          return;
        }
        if (btn.dataset.shellMulti) {
          commit([]);
          return;
        }
        const hex = btn.dataset.shellColor;
        if (!hex) return;
        const cur = box._spPicks.slice();
        const at = cur.findIndex((c) => c.toLowerCase() === hex.toLowerCase());
        if (at >= 0) cur.splice(at, 1);
        else cur.push(hex);
        commit(cur);
      });
      if (custom) {

        custom.addEventListener("change", () => {
          const hex = custom.value;
          if (!_isValidHex(hex)) return;
          const cur = box._spPicks.slice();
          if (!cur.some((c) => c.toLowerCase() === hex.toLowerCase()))
            cur.push(hex);
          commit(cur);
        });
      }
    });
    container.querySelectorAll(".te-scene-opt").forEach((el) => {
      const key = el.dataset.opt;

      el.addEventListener("input", () => {
        if (el.type === "range") {
          const valEl = document.getElementById(el.id + "Val");
          if (valEl) valEl.textContent = el.value;
          _panelPush(ctx, true);
        } else if (el.type === "checkbox") {
          const st = document.getElementById(el.id + "State");
          if (st) st.textContent = el.checked ? "On" : "Off";
          _panelPush(ctx, true);
        }
      });
      if (el.tagName !== "SELECT")
        el.addEventListener("change", () => _panelPush(ctx, false)); 
      if (el.tagName === "SELECT") {
        el.addEventListener("change", () => {
          
          if (sceneId === "leaves" && key === "type") {
            const typeColors = {
              blossom: "#f9a8d4",
              maple: "#f97316",
              oak: "#b45309",
              birch: "#eab308",
            };
            const c = typeColors[el.value];
            const colorInput = _sceneOptInput(ctx, "color");
            if (colorInput && c) {
              colorInput.value = c;
              _paintSceneColor(ctx, container, "color", c);
            }
          }
          _panelPush(ctx, false);
        });
      }
    });
    
    const comboRow = _sp(ctx.scope, "SceneCombos");
    if (comboRow) {
      comboRow.querySelectorAll(".te-scene-combo-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          const line = btn.dataset.line,
            acc = btn.dataset.accent;
          ["color", "accent"].forEach((key, i) => {
            const inp = _sceneOptInput(ctx, key);
            const c = i === 0 ? line : acc;
            if (inp) inp.value = c;
            _paintSceneColor(ctx, container, key, c);
          });
          comboRow
            .querySelectorAll(".te-scene-combo-swatch")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _panelPush(ctx, false);
        });
      });
    }
    
    container.querySelectorAll("[data-presets-for]").forEach((presetsEl) => {
      const inpId = presetsEl.dataset.presetsFor;
      const key = inpId.replace(ctx.prefix + "SceneOpt_", "");
      const inp = _sceneOptInput(ctx, key);
      const list =
        scene.presetColors && Array.isArray(scene.presetColors[key])
          ? scene.presetColors[key]
          : [];
      if (!inp || list.length === 0) return;
      presetsEl.innerHTML = _sceneSwatchRowHTML(list, inp.value);
      presetsEl.querySelectorAll(".te-scene-bg-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.color === "custom") {
            inp.click();
            return;
          }
          const color = btn.dataset.color;
          inp.value = color;
          _paintSceneColor(ctx, container, key, color);
          presetsEl
            .querySelectorAll(".te-scene-bg-swatch")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          _panelPush(ctx, false);
        });
      });
    });

    _wirePanelColorCards(ctx);
    _wireSceneBgInput(ctx);
    _buildSceneBgPresets(ctx);
  }

  function _wireSceneBgInput(ctx) {
    const bgInput = _sp(ctx.scope, "SceneBgColor");
    if (!bgInput) return;
    if (bgInput._spLive) bgInput.removeEventListener("input", bgInput._spLive);
    if (bgInput._spSettle)
      bgInput.removeEventListener("change", bgInput._spSettle);
    bgInput._spLive = () => {
      _updateSceneBgPreview(ctx, bgInput.value);
      const presets = _sp(ctx.scope, "SceneBgPresets");
      if (presets) {
        const lowered = bgInput.value.toLowerCase();
        presets.querySelectorAll(".te-scene-bg-swatch").forEach((b) => {
          b.classList.toggle(
            "active",
            (b.dataset.color || "").toLowerCase() === lowered,
          );
        });
        presets
          .querySelectorAll('.te-combo-half[data-role="bg"]')
          .forEach((b) => {
            b.classList.toggle(
              "active",
              (b.dataset.color || "").toLowerCase() === lowered,
            );
          });
      }
      _panelPush(ctx, true);
    };
    bgInput._spSettle = () => _panelPush(ctx, false);
    bgInput.addEventListener("input", bgInput._spLive);
    bgInput.addEventListener("change", bgInput._spSettle);
  }

  function _buildSceneBgPresets(ctx) {
    const container = _sp(ctx.scope, "SceneBgPresets");
    const colorInput = _sp(ctx.scope, "SceneBgColor");
    const labelEl = _sp(ctx.scope, "SceneBgLabel");
    const scene = _sceneOf(ctx);
    if (!container || !colorInput || !scene) return;

    const combos =
      scene.presetCombos &&
      Array.isArray(scene.presetCombos) &&
      scene.presetCombos.length > 0
        ? scene.presetCombos
        : null;
    if (combos) {
      _buildSceneBgCombos(ctx, scene, combos, container, colorInput);
      return;
    }
    if (labelEl) {
      labelEl.textContent = "Suggested";
      const row = _sp(ctx.scope, "SceneBgLabelRow");
      if (row) row.classList.remove("has-combos");
    }
    const presets = scene.presetBgColors ? scene.presetBgColors : null;
    if (!presets || presets.length === 0) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = _sceneSwatchRowHTML(presets, colorInput.value, {
      saved: _savedPresets(ctx.sceneId, "bgs"),
      customLabel: "Add preset",
      customTitle: "Save this background as a preset",
    });
    const addInput = _presetAddInput(
      container,
      colorInput.value,
      "Save a background colour preset",
    );
    const applyBg = (color) => {
      colorInput.value = color;
      container.querySelectorAll(".te-scene-bg-swatch").forEach((b) => {
        b.classList.toggle(
          "active",
          (b.dataset.color || "").toLowerCase() === color.toLowerCase(),
        );
      });
      ctx.bgCache[ctx.sceneId] = color;
      _updateSceneBgPreview(ctx, color);
      _panelPush(ctx, false);
    };
    container.querySelectorAll(".te-scene-bg-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.color === "custom") {
          addInput.click();
          return;
        }
        applyBg(btn.dataset.color);
      });
    });
    container.querySelectorAll(".te-swatch-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        _removeSavedPreset(ctx.sceneId, "bgs", Number(btn.dataset.savedDel));
        _buildSceneBgPresets(ctx);
      });
    });
    addInput.addEventListener("change", () => {
      const hex = addInput.value;
      if (!_isValidHex(hex)) return;
      _addSavedPreset(ctx.sceneId, "bgs", hex);
      applyBg(hex);

      _buildSceneBgPresets(ctx);
    });
  }

  function _buildSceneBgCombos(ctx, scene, combos, container, bgInput) {
    const orderKeys = Object.keys(combos[0]); 
    const BG_KEY = "bg";

    const shellField = scene.options.find((o) => o.type === "shellcolors");
    const shellKey = shellField ? shellField.key : null;
    const shellBox = shellKey
      ? ctx.scope.querySelector('[data-shell-colors="' + shellKey + '"]')
      : null;

    const colourRole = orderKeys.find((k) => k !== BG_KEY);
    const listRole =
      shellField &&
      colourRole &&
      !scene.options.some((o) => o.key === colourRole && o.type === "color")
        ? colourRole
        : null;
    const isListKey = (key) => !!listRole && key === listRole;
    const labelOf = (key) => {
      if (key === BG_KEY) return "Background";
      const field =
        scene.options.find((o) => o.key === key) ||
        (key === "color" ? shellField : null);
      return field ? field.label : key;
    };
    const inputOf = (key) =>
      key === BG_KEY ? bgInput : isListKey(key) ? null : _sceneOptInput(ctx, key);
    const currentVal = (key) => {
      if (isListKey(key)) {
        const picks =
          shellBox && Array.isArray(shellBox._spPicks) ? shellBox._spPicks : [];

        return picks.length === 1 ? picks[0].toLowerCase() : null;
      }
      const inp = inputOf(key);
      return inp ? inp.value.toLowerCase() : null;
    };
    const refreshRings = () => {
      for (const key of orderKeys) {
        const cur = currentVal(key);
        container
          .querySelectorAll(`.te-combo-half[data-role="${key}"]`)
          .forEach((h) =>
            h.classList.toggle(
              "active",
              !!cur && h.dataset.color.toLowerCase() === cur,
            ),
          );
      }
    };

    container._spRefreshRings = refreshRings;

    const applyColors = (map) => {
      for (const key of Object.keys(map)) {
        const hex = map[key];
        if (isListKey(key)) {
          if (!shellBox) continue;
          shellBox._spPicks = [hex];
          _paintShellChips(shellBox, scene);
          continue;
        }
        const inp = inputOf(key);
        if (!inp) continue;
        inp.value = hex;
        _paintSceneColor(ctx, container, key, hex);
      }
      if (map[BG_KEY]) {
        const custom = container.querySelector(".te-scene-bg-swatch--custom");
        if (custom) custom.classList.remove("active");
      }
      
      refreshRings();
      _panelPush(ctx, false);
    };
    const applyHalf = (key, hex) => applyColors({ [key]: hex });
    const optKey = orderKeys.find((k) => k !== BG_KEY);

    const colourForNew = () => {
      const cur = currentVal(optKey);
      if (cur) return cur;
      if (isListKey(optKey) && shellBox) {
        const picks = Array.isArray(shellBox._spPicks) ? shellBox._spPicks : [];
        if (picks.length) return picks[0].toLowerCase();
        const first = (scene.presetShellColors || [])[0];
        if (first && first.color) return first.color.toLowerCase();
      }
      const inp = optKey ? inputOf(optKey) : null;
      return inp && inp.value ? inp.value.toLowerCase() : "#ffffff";
    };
    const labelEl = _sp(ctx.scope, "SceneBgLabel");
    if (labelEl) {
      labelEl.textContent = optKey
        ? `Suggested ${labelOf(optKey).toLowerCase()} + background pairings`
        : "Suggested pairings";
    }

    const comboName = labelOf(optKey || orderKeys[0]).toLowerCase();

    const tipText =
      "Each tile pairs a colour with a background, click one half to apply just " +
      "that colour, or click the middle to apply both. The halves are independent " +
      "and can be mixed so you are not locked to just that pair.";
    const tipBtn = _sp(ctx.scope, "SceneBgComboTip");
    const tipBody = _sp(ctx.scope, "SceneBgComboTipText");
    const labelRow = _sp(ctx.scope, "SceneBgLabelRow");
    if (tipBtn) tipBtn.setAttribute("aria-label", tipText);
    if (tipBody) tipBody.textContent = tipText;
    if (labelRow) labelRow.classList.add("has-combos");

    const tiles = combos
      .map((pair) => ({ pair, savedAt: -1 }))
      .concat(
        _savedPresets(ctx.sceneId, "pairs").map((pair, i) => ({
          pair,
          savedAt: i,
        })),
      );
    container.innerHTML =
      `<div class="te-scene-combo-row">` +
      tiles
        .map(({ pair, savedAt }) => {
          const tileLabel = orderKeys
            .map((k) => `${labelOf(k)} ${pair[k] || ""}`.trim())
            .join(" + ");
          return (
            `<div class="te-scene-combo-swatch${savedAt >= 0 ? " saved" : ""}" role="group" aria-label="${tileLabel}">` +
            orderKeys
              .map((k) => {
                const hex = pair[k] || "";
                const active = hex && currentVal(k) === hex.toLowerCase();
                return `<button type="button" class="te-combo-half${active ? " active" : ""}" data-role="${k}" data-color="${hex}" style="background:${hex}" aria-label="${labelOf(k)} ${hex}" title="${labelOf(k)} ${hex}"></button>`;
              })
              .join("") +

            `<button type="button" class="te-combo-both" data-both="1" aria-label="Apply both: ${tileLabel}" title="Apply both: ${tileLabel}"><span class="te-combo-both-dot"></span></button>` +
            (savedAt >= 0
              ? `<button type="button" class="te-combo-del" data-saved-del="${savedAt}" aria-label="Remove saved pair" title="Remove saved pair">${_CLOSE_SVG}</button>`
              : "") +
            `</div>`
          );
        })
        .join("") +
      `</div>` +
      `<button type="button" class="te-scene-bg-swatch te-scene-bg-swatch--custom" data-color="custom" title="Save this colour and background as a pair"><span class="te-swatch-plus">${_PLUS_SVG}</span><span class="te-swatch-tooltip">Add pair</span></button>`;
    container.querySelectorAll(".te-combo-half").forEach((btn) => {
      btn.addEventListener("click", () =>
        applyHalf(btn.dataset.role, btn.dataset.color),
      );
    });
    
    container.querySelectorAll(".te-combo-both").forEach((btn) => {
      const tile = btn.closest(".te-scene-combo-swatch");
      btn.addEventListener("click", () => {
        const map = {};
        tile.querySelectorAll(".te-combo-half").forEach((h) => {
          if (h.dataset.color) map[h.dataset.role] = h.dataset.color;
        });
        if (Object.keys(map).length) applyColors(map);
      });
    });
    container.querySelectorAll(".te-combo-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        _removeSavedPreset(ctx.sceneId, "pairs", Number(btn.dataset.savedDel));
        _buildSceneBgPresets(ctx);
      });
    });
    const addInput = _presetAddInput(
      container,
      currentVal(BG_KEY) || "#020617",
      "Save a colour and background preset",
    );
    addInput.addEventListener("change", () => {
      const bg = addInput.value;
      if (!_isValidHex(bg)) return;
      const pair = {};
      for (const key of orderKeys) pair[key] = key === BG_KEY ? bg : colourForNew();

      applyColors(pair);
      _addSavedPreset(ctx.sceneId, "pairs", pair);
      _buildSceneBgPresets(ctx);
    });
    const custom = container.querySelector(".te-scene-bg-swatch--custom");
    if (custom) custom.addEventListener("click", () => addInput.click());
    
    for (const key of orderKeys) {
      if (key === BG_KEY || isListKey(key)) continue;
      const inp = inputOf(key);
      if (!inp) continue;
      const refresh = () =>
        container
          .querySelectorAll(`.te-combo-half[data-role="${key}"]`)
          .forEach((h) =>
            h.classList.toggle(
              "active",
              h.dataset.color.toLowerCase() === inp.value.toLowerCase(),
            ),
          );
      inp.addEventListener("input", refresh);
      inp.addEventListener("change", refresh);
    }
  }

  let _sceneOptsCache = {};
  let _sceneBgCache = {}; 
  let _selectedSceneId = "particles"; 
  let _sceneSavedOptions = {};
  let _sessionPick = null;
  const _featuredSceneIds = [
    "ripples",
    "rain",
    "snow",
    "galaxy",
    "grass",
    "comets",
  ];
  let _libQuery = "";
  let _libMood = "all";

  function _keepSceneColors() {
    try {
      return localStorage.getItem("pomoraKeepSceneColors") === "1";
    } catch {
      return false;
    }
  }

  function _panelPrefix(scope) {
    return (scope && scope.dataset && scope.dataset.scenePrefix) || "te";
  }

  function _builderCtx() {
    const scope = document.getElementById("teBgSceneGroup");
    if (!scope) return null;
    return {
      scope,
      prefix: _panelPrefix(scope),
      host: "builder",
      sceneId: _selectedSceneId,
      optsCache: _sceneOptsCache,
      bgCache: _sceneBgCache,
      cardsRoot: scope, 
      keepColors: true,
      onLive(opts, bg) {
        if (typeof ThemeScenes === "undefined") return;

        const canvas = document.getElementById("tePreviewCanvas");
        if (canvas && ThemeScenes.isActiveCanvas(canvas)) {
          ThemeScenes.updateOptions({ ...opts, bgColor: bg || null });
          return;
        }
        ThemeEngine._preview();
      },
      onSettle() {
        ThemeEngine._preview();
      },
    };
  }

  function _getSelectedSceneId() {
    return _selectedSceneId;
  }

  function _sceneCardHTML(s, thumbClass, selectedId) {
    return `<button type="button" class="te-scene-card${s.id === selectedId ? " active" : ""}" data-scene="${s.id}"><span class="te-scene-thumb ${thumbClass[s.id] || ""}"></span><span class="te-scene-label">${s.label}</span></button>`;
  }

  function _wireSceneCards(rootEl, savedOptions, enableHover) {
    rootEl.querySelectorAll(".te-scene-card").forEach((btn) => {
      btn.addEventListener("click", () =>
        _selectScene(btn.dataset.scene, savedOptions),
      );

      if (enableHover) {
        btn.addEventListener("mouseenter", () => _hoverStart(btn));
        btn.addEventListener("mouseleave", () => _hoverStop());
      }
    });
  }

  function _selectScene(sceneId, savedOptions) {
    _scenePickToken++;
    if (!_featuredSceneIds.includes(sceneId)) _sessionPick = sceneId;
    _selectedSceneId = sceneId;
    document
      .querySelectorAll(".te-scene-card.active")
      .forEach((b) => b.classList.remove("active"));
    const btn = document.querySelector(
      `.te-scene-card[data-scene="${sceneId}"]`,
    );
    if (btn) btn.classList.add("active");
    const ctx = _builderCtx();
    if (ctx) _buildSceneOptionsUI(ctx, savedOptions || _sceneSavedOptions || {});
    ThemeEngine._preview();
    _buildFeaturedShelf(sceneId); 
    const libModal = document.getElementById("teSceneLibModal");
    if (libModal) libModal.classList.remove("open");
  }

  function _liveScenes() {
    if (typeof ThemeScenes === "undefined") return [];
    return typeof ThemeScenes.listLive === "function"
      ? ThemeScenes.listLive()
      : ThemeScenes.list();
  }

  function _buildFeaturedShelf(selectedId) {
    const shelf = document.getElementById("teFeaturedShelf");
    if (!shelf || typeof ThemeScenes === "undefined") return;
    const thumbClass = _thumbClassMap();
    const byId = Object.fromEntries(ThemeScenes.list().map((s) => [s.id, s]));
    let featured = _featuredSceneIds.map((id) => byId[id]).filter(Boolean);

    if (_sessionPick && byId[_sessionPick]) {
      featured = [...featured.slice(0, 5), byId[_sessionPick]];
    }
    shelf.innerHTML = featured
      .map((s) => _sceneCardHTML(s, thumbClass, selectedId))
      .join("");
    _wireSceneCards(shelf, _sceneSavedOptions);
    const btn = document.getElementById("teViewAllBtn");
    
    if (btn) btn.textContent = `View all ${_liveScenes().length} themes →`;
    _renderSceneThumbs(shelf);
  }

  function _openSceneLibrary(selectedId) {
    const modal = document.getElementById("teSceneLibModal");
    if (!modal || typeof ThemeScenes === "undefined") return;
    _libQuery = "";
    _libMood = "all";
    const search = document.getElementById("teSceneLibSearch");
    if (search) search.value = "";

    modal.classList.add("open");
    _renderSceneLibGrid(selectedId);
    if (_sceneLibraryComplete()) return;
    _ensureSceneLibrary().then(() => {
      if (modal.classList.contains("open"))
        _renderSceneLibGrid(_selectedSceneId);
    });
  }

  function _renderSceneLibGrid(selectedId) {
    const modal = document.getElementById("teSceneLibModal");
    if (!modal) return;
    const thumbClass = _thumbClassMap();
    const scenes = _liveScenes();
    const q = _libQuery.trim().toLowerCase();
    let visible = scenes.filter((s) => !q || s.label.toLowerCase().includes(q));
    if (_libMood !== "all") {
      const moodSet = new Set(_sceneMoods[_libMood] || []);
      visible = visible.filter((s) => moodSet.has(s.id));
    }
    const grid = document.getElementById("teSceneLibGrid");
    grid.innerHTML = visible
      .map((s) => _sceneCardHTML(s, thumbClass, selectedId))
      .join("");
    _wireSceneCards(grid, _sceneSavedOptions, true);
    const countEl = document.getElementById("teSceneLibCount");
    if (countEl)
      countEl.textContent = _sceneLibraryComplete()
        ? `${visible.length} of ${scenes.length} scenes`
        : "Loading themes…";
    const moodsEl = document.getElementById("teSceneLibMoods");
    if (moodsEl) {
      const pills = [["all", "All"]].concat(Object.entries(_moodLabels));
      moodsEl.innerHTML = pills
        .map(
          ([id, label]) =>
            `<button type="button" class="te-lib-mood${_libMood === id ? " active" : ""}" data-mood="${id}">${label}</button>`,
        )
        .join("");
      moodsEl.querySelectorAll(".te-lib-mood").forEach((btn) => {
        btn.addEventListener("click", () => {
          _libMood = btn.dataset.mood;
          _renderSceneLibGrid(selectedId);
        });
      });
    }
    _renderSceneThumbs(grid);
  }

  function _isValidHex(v) {
    return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  }  /* ONE category set for both dialogs (Theme Library and the builder's scene
     picker). They used to disagree — the builder offered All/Calm/Warm/
     Dramatic/Outdoors/Dreamy while the library offered All/Simple/Calm/
     Dramatic — so the same scene could be filed under a category that did not
     exist on the other screen. Five named categories, shared verbatim; a
     scene may sit in more than one. */
  const _sceneMoods = {
    calm: [
      "ripples",
      "caustics",
      "condensation",
      "starorbit",
      "snow",
      "koi",
      "lanterns",
      "aurora",
      "mistysunrise",
      "inkwater",
      "cloudsea",
      "rain",
      "jellyfish",
      "fireflies",
      "particles",
      "bubbles",
      "origami",
    ],
    cosmic: [
      "aurora",
      "blackhole",
      "comets",
      "galaxy",
      "starfield",
      "starorbit",
      "eclipse",
      "meteor",
      "lighttunnel",
    ],
    nature: [
      "grass",
      "leaves",
      "dandelion",
      "blossomstorm",
      "butterflies",
      "rain",
      "dunes",
      "ocean",
      "mistysunrise",
      "lighthouse",
      "campfire",
      "fireflies",
      "koi",
      "lanterns",
      "snow",
      "balloon",
    ],
    minimal: [
      "particles",
      "ripples",
      "bubbles",
      "condensation",
      "snow",
      "confetti",
      "embers",
      "grass",
      "origami",
      "starfield",
    ],
    dramatic: [
      "thunderstorm",
      "eclipse",
      "neoncity",
      "ocean",
      "meteor",
      "lighthouse",
      "blackhole",
      "comets",
      "fireworks",
      "galaxy",
      "ornate",
      "lighttunnel",
      "cloudsea",
    ],
  };
  const _moodLabels = {
    calm: "Calm",
    cosmic: "Cosmic",
    nature: "Nature",
    minimal: "Minimal",
    dramatic: "Dramatic",
  };

  function _thumbClassMap() {
    return {
      particles: "te-scene-thumb--particles",
      aurora: "te-scene-thumb--aurora",
      rain: "te-scene-thumb--rain",
      bubbles: "te-scene-thumb--bubbles",
      starfield: "te-scene-thumb--starfield",
      embers: "te-scene-thumb--embers",
      ripples: "te-scene-thumb--ripples",
      comets: "te-scene-thumb--comets",
      galaxy: "te-scene-thumb--galaxy",
      snow: "te-scene-thumb--snow",
      condensation: "te-scene-thumb--condensation",
      grass: "te-scene-thumb--grass",
      starorbit: "te-scene-thumb--starorbit",
      blackhole: "te-scene-thumb--blackhole",
      fireflies: "te-scene-thumb--fireflies",
      leaves: "te-scene-thumb--leaves",
      dandelion: "te-scene-thumb--dandelion",
      campfire: "te-scene-thumb--campfire",
      butterflies: "te-scene-thumb--butterflies",
      thunderstorm: "te-scene-thumb--thunderstorm",
      eclipse: "te-scene-thumb--eclipse",
      ocean: "te-scene-thumb--ocean",
      neoncity: "te-scene-thumb--neoncity",
      inkwater: "te-scene-thumb--inkwater",
      caustics: "te-scene-thumb--caustics",
      jellyfish: "te-scene-thumb--jellyfish",
      confetti: "te-scene-thumb--confetti",
      lighthouse: "te-scene-thumb--lighthouse",
      balloon: "te-scene-thumb--balloon",
      blossomstorm: "te-scene-thumb--blossomstorm",
      meteor: "te-scene-thumb--meteor",
      lanterns: "te-scene-thumb--lanterns",
      koi: "te-scene-thumb--koi",
      ornate: "te-scene-thumb--ornate",
      origami: "te-scene-thumb--origami",
      lighttunnel: "te-scene-thumb--lighttunnel",
      fireworks: "te-scene-thumb--fireworks",
      mistysunrise: "te-scene-thumb--mistysunrise",
      cloudsea: "te-scene-thumb--cloudsea",
      dunes: "te-scene-thumb--dunes",
    };
  }

  const _hover = {
    canvas: null,
    ctx: null,
    label: null,
    scene: null,
    state: null,
    opts: null,
    last: 0,
    raf: 0,
    active: false,
  };
  function _hoverStart(card) {
    const scene =
      typeof ThemeScenes !== "undefined"
        ? ThemeScenes.get(card.dataset.scene)
        : null;
    const el = document.getElementById("teHoverPreview");
    if (!scene || !el) return;
    const canvas = el.querySelector("canvas");
    const label = el.querySelector(".te-hover-preview-label");
    if (!canvas) return;
    _hoverStop();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(280 * dpr);
    canvas.height = Math.round(175 * dpr);
    _hover.canvas = canvas;
    _hover.ctx = canvas.getContext("2d");
    _hover.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _hover.label = label;
    _hover.scene = scene;
    _hover.state = {};
    _hover.opts = { ...scene.defaults };
    if (typeof _hover.opts.density === "number")
      _hover.opts.density = Math.min(_hover.opts.density, 90);
    if (label) label.textContent = scene.label;
    scene.init(_hover.state, 280, 175, _hover.opts);
    _hover.last = performance.now();
    _hover.active = true;
    _positionHover(el, card);
    el.classList.add("open");
    _hover.raf = requestAnimationFrame(_hoverFrame);
  }
  function _hoverFrame(now) {
    if (!_hover.active) return;
    const dt = Math.min(0.05, Math.max(0, (now - _hover.last) / 1000));
    _hover.last = now;
    try {
      _hover.scene.draw(_hover.ctx, 280, 175, _hover.state, _hover.opts, dt);
    } catch (e) {
      }
    _hover.raf = requestAnimationFrame(_hoverFrame);
  }
  function _hoverStop() {
    _hover.active = false;
    if (_hover.raf) cancelAnimationFrame(_hover.raf);
    _hover.raf = 0;
    if (_hover.scene && typeof _hover.scene.destroy === "function")
      _hover.scene.destroy(_hover.state);
    _hover.scene = null;
    _hover.state = null;
    const el = document.getElementById("teHoverPreview");
    if (el) el.classList.remove("open");
  }
  function _positionHover(el, card) {
    const r = card.getBoundingClientRect();
    const panelW = 300,
      panelH = 214;
    let left = r.right + 12;
    if (left + panelW > window.innerWidth - 12) left = r.left - panelW - 12;
    const top = Math.max(
      12,
      Math.min(
        r.top + r.height / 2 - panelH / 2,
        window.innerHeight - panelH - 12,
      ),
    );
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  const _thumbCache = {};
  let _thumbTimer = null;
  function _renderSceneThumbs(rootEl, done) {
    if (!rootEl || typeof ThemeScenes === "undefined") return;
    const cards = Array.from(
      rootEl.querySelectorAll(".te-scene-card[data-scene]"),
    );
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < cards.length && performance.now() - t0 < 9) {
        _renderThumb(cards[i]);
        i++;
      }
      if (i < cards.length) {
        _thumbTimer = setTimeout(step, 0);
      } else if (done) {
        done();
      }
    };
    step();
  }
  function _renderThumb(card) {
    const sceneId = card.dataset.scene;
    const scene = ThemeScenes.get(sceneId);
    if (!scene) return;
    let canvas = card.querySelector("canvas.te-scene-frame");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "te-scene-frame";
      const thumbEl = card.querySelector(".te-scene-thumb");
      if (thumbEl) thumbEl.appendChild(canvas);
      else card.appendChild(canvas);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const TW = 160,
      TH = 100; 
    canvas.width = TW * dpr;
    canvas.height = TH * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cached = _thumbCache[sceneId];
    if (cached) {
      ctx.clearRect(0, 0, TW, TH);
      ctx.drawImage(cached, 0, 0, TW, TH);
      return;
    }
    const state = {};
    try {
    const opts = { ...scene.defaults };

    const boost = {
      snow: { size: 26, density: 90 },
      starorbit: { size: 8, density: 700 },
      butterflies: { scale: 7, density: 24 },
      leaves: { scale: 2.4 },
      dandelion: { scale: 2 },
      jellyfish: { scale: 2.5 },
      confetti: { scale: 7, density: 200 },
      balloon: { scale: 2.5 },
      blossomstorm: { scale: 2.2, density: 120 },
      meteor: { scale: 6 },
      lanterns: { scale: 5 },
      koi: { scale: 9, density: 3 },
      lighthouse: { intensity: 95 },
      ornate: { scale: 1.3 },
      origami: { scale: 1.6 },
      fireworks: { density: 5 },
      mistysunrise: { density: 6 },
      cloudsea: { density: 3, scale: 1.2 },
      dunes: { density: 100 },
      lighttunnel: { density: 5, scale: 1.3 },
      condensation: { size: 2, density: 90 },
      aurora: { intensity: 100, scale: 1.6 },
      ripples: { intensity: 100 },
    };
    const b = boost[sceneId];
    if (b) Object.assign(opts, b);
    else if (typeof opts.density === "number")
      opts.density = Math.min(opts.density, 50);
    scene.init(state, TW, TH, opts);
    
    if (sceneId === "ornate") state.t = 4.2; 
    if (sceneId === "embers" && state.embers) {
      
      for (const e of state.embers) {
        e.y = TH * (0.25 + Math.random() * 0.3);
        e.life = 0.2;
      }
    }
    if (sceneId === "ripples" && state.rings) {
      
      for (const r of state.rings) {
        r.wait = 0;
        r.life = 0.2 + Math.random() * 0.3;
        r.radius = r.life * r.maxRadius;
      }
    }
    if (sceneId === "comets" && state.comets) {

      state.S = 1.15;
      state.comets.push({
        x: TW * 0.58,
        y: TH * 0.52,
        vx: 22 * state.S,
        vy: 9 * state.S,
        speed: 1,
        trail: [],
        maxTrail: 22,
        tailLen: 8 * state.S,
        alpha: 0.7,
      });
    }
    if (sceneId === "meteor" && state.meteors) {

      state.meteors.push({
        x: TW * 0.69 + 420,
        y: TH * 0.22 - 315,
        vx: -200,
        vy: 150,
        life: 5,
      });
    }

    const adv = { embers: 16, ripples: 10 }[sceneId] || 30;
    for (let i = 0; i < adv; i++) scene.draw(ctx, TW, TH, state, opts, 0.05);
    if (state.shootT !== undefined) state.shootT = 0.001; 
    for (let i = 0; i < 12; i++) scene.draw(ctx, TW, TH, state, opts, 0.05);
    
    _thumbCache[sceneId] = document.createElement("canvas");
    _thumbCache[sceneId].width = TW;
    _thumbCache[sceneId].height = TH;
    _thumbCache[sceneId].getContext("2d").drawImage(canvas, 0, 0, TW, TH);
    } catch (e) {

      console.error("te scene thumbnail failed:", sceneId, e);
    } finally {
      try {
        if (typeof scene.destroy === "function") scene.destroy(state);
      } catch (e) {
        console.error("te scene thumbnail cleanup failed:", sceneId, e);
      }
    }
  }

  async function _extractColorsFromImageUrl(src) {
    if (!src) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          resolve(_sampleImageColors(img));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
      setTimeout(() => {
        if (!img.complete) {
          img.src = "";
          resolve(null);
        }
      }, 8000);
    });
  }

  function _sampleImageColors(img) {
    const MAX_SIZE = 200;

    let w = img.naturalWidth || img.videoWidth || img.width,
      h = img.naturalHeight || img.videoHeight || img.height;
    if (!w || !h) return null;
    if (w > MAX_SIZE || h > MAX_SIZE) {
      const scale = MAX_SIZE / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    if (pixels.length < 10) return _fallbackPalette();
    const clusters = _kmeans(pixels, 4);
    if (!clusters || clusters.length === 0) return _fallbackPalette();
    clusters.sort((a, b) => b.count - a.count);
    const withLuma = clusters.map((c) => ({
      ...c,
      luma: 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b,
    }));
    
    const withSat = withLuma.map((c) => ({
      ...c,
      sat: Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b),
    }));
    withSat.sort((a, b) => b.sat - a.sat);
    const accent =
      withSat.find(
        (c) =>
          c.sat > 30 &&
          c.luma > 40 &&
          c.luma < 220 &&
          c.count > pixels.length * 0.03,
      ) || withLuma[0];
    
    const darkest = withLuma.reduce(
      (d, c) => (c.luma < (d?.luma ?? Infinity) ? c : d),
      null,
    );
    const surfaceRGB =
      darkest && darkest.luma < 180
        ? { r: darkest.r, g: darkest.g, b: darkest.b }
        : { r: 10, g: 18, b: 34 };
    
    const surfaceLuma =
      0.2126 * surfaceRGB.r + 0.7152 * surfaceRGB.g + 0.0722 * surfaceRGB.b;
    const textIsLight = surfaceLuma < 140;
    const textColor = textIsLight
      ? { r: 255, g: 255, b: 255 }
      : { r: 17, g: 17, b: 17 };
    const surfaceTextColor = textIsLight
      ? { r: 240, g: 240, b: 250 }
      : { r: 30, g: 30, b: 40 };
    
    const timerColor = textIsLight
      ? { r: 255, g: 255, b: 255 }
      : { r: 17, g: 17, b: 17 };
    
    const logoColor = textIsLight
      ? { r: 255, g: 255, b: 255 }
      : accent
        ? { r: accent.r, g: accent.g, b: accent.b }
        : { r: 17, g: 17, b: 17 };
    const hex = (c) =>
      `#${Math.round(c.r).toString(16).padStart(2, "0")}${Math.round(c.g).toString(16).padStart(2, "0")}${Math.round(c.b).toString(16).padStart(2, "0")}`;
    return {
      accent: hex(accent || withLuma[0]),
      text: hex(textColor),
      surface: hex(surfaceRGB),
      surfaceText: hex(surfaceTextColor),
      timerDisplay: hex(timerColor),
      logo: hex(logoColor),
      focusMode: _readableSubtitleColor(
        surfaceLuma,
        hex(accent || withLuma[0]),
      ),
    };
  }

  function _kmeans(pixels, k) {
    if (pixels.length < k) return null;
    
    const centroids = [
      { ...pixels[Math.floor(Math.random() * pixels.length)], count: 0 },
    ];
    for (let c = 1; c < k; c++) {
      let dists = pixels.map((p) => {
        const minD = Math.min(
          ...centroids.map(
            (ct) => (p.r - ct.r) ** 2 + (p.g - ct.g) ** 2 + (p.b - ct.b) ** 2,
          ),
        );
        return minD;
      });
      const totalDist = dists.reduce((s, d) => s + d, 0);
      if (totalDist === 0) {
        centroids.push({
          ...pixels[Math.floor(Math.random() * pixels.length)],
          count: 0,
        });
        continue;
      }
      let r = Math.random() * totalDist;
      for (let i = 0; i < pixels.length; i++) {
        r -= dists[i];
        if (r <= 0) {
          centroids.push({ ...pixels[i], count: 0 });
          break;
        }
      }
    }
    for (let iter = 0; iter < 15; iter++) {
      const assignments = Array.from({ length: k }, () => []);
      for (const p of pixels) {
        let minDist = Infinity,
          bestIdx = 0;
        for (let j = 0; j < k; j++) {
          const d =
            (p.r - centroids[j].r) ** 2 +
            (p.g - centroids[j].g) ** 2 +
            (p.b - centroids[j].b) ** 2;
          if (d < minDist) {
            minDist = d;
            bestIdx = j;
          }
        }
        assignments[bestIdx].push(p);
      }
      let moved = false;
      for (let j = 0; j < k; j++) {
        const group = assignments[j];
        if (group.length === 0) continue;
        const newR = group.reduce((s, p) => s + p.r, 0) / group.length;
        const newG = group.reduce((s, p) => s + p.g, 0) / group.length;
        const newB = group.reduce((s, p) => s + p.b, 0) / group.length;
        if (
          Math.abs(centroids[j].r - newR) > 0.5 ||
          Math.abs(centroids[j].g - newG) > 0.5 ||
          Math.abs(centroids[j].b - newB) > 0.5
        )
          moved = true;
        centroids[j] = { r: newR, g: newG, b: newB, count: group.length };
      }
      if (!moved) break;
    }
    return centroids;
  }

  function _fallbackPalette() {
    return {
      accent: "#6366f1",
      text: "#ffffff",
      surface: "#0a1222",
      surfaceText: "#ffffff",
      timerDisplay: "#ffffff",
      logo: "#ffffff",
      focusMode: "#6366f1",
    };
  }

  const HEX_RE = /^#[0-9a-f]{6}$/i;

  function _accentForBg(accentHex, bgLuma) {
    const lumaOf = (hex) => {
      const [r, g, b] = _parseHexToRgb(hex);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    if (Math.abs(lumaOf(accentHex) - bgLuma) >= 40) return accentHex;
    const target = bgLuma < 70 ? "#ffffff" : "#000000";
    let out = accentHex;
    for (let t = 0.1; t <= 0.6; t += 0.1) {
      out = _blendHexColors(accentHex, target, t);
      if (Math.abs(lumaOf(out) - bgLuma) >= 40) return out;
    }
    return out;
  }

  function _lightenHex(hex, t) {
    return _blendHexColors(hex, "#ffffff", t);
  }

  function _saturateHex(hex, amount) {
    const [r, g, b] = _parseHexToRgb(hex);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${[r, g, b]
      .map((c) =>
        clamp(luma + (c - luma) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }

  function _harmonizeAccent(hex) {
    if (!HEX_RE.test(hex || "")) return "#6366f1";
    const [r, g, b] = _parseHexToRgb(hex);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat > 34 && luma >= 45 && luma <= 215) return hex;

    const target = luma > 150 ? 150 : 110;
    const t =
      luma > 150
        ? Math.min(0.9, 1 - target / Math.max(luma, 1))
        : Math.min(0.9, (target - luma) / Math.max(255 - luma, 1));
    const scaled = _blendHexColors(hex, luma > 150 ? "#000000" : "#ffffff", t);
    return _saturateHex(scaled, 1.3);
  }

  function _paletteFromAccent(accentHex, bgHex, onScreenBg) {
    let accent = HEX_RE.test(accentHex || "")
      ? _harmonizeAccent(accentHex)
      : "#6366f1";
    if (onScreenBg && HEX_RE.test(onScreenBg)) {
      const [or, og, ob] = _parseHexToRgb(onScreenBg);
      accent = _accentForBg(accent, 0.2126 * or + 0.7152 * og + 0.0722 * ob);
    }
    const [r, g, b] = _parseHexToRgb(accent);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const secondary = _lightenHex(_saturateHex(accent, 1.05), 0.34);

    const surface = HEX_RE.test(bgHex || "")
      ? bgHex
      : _blendHexColors(_darkenHex(accent, 0.55), "#0b111f", 0.45);
    const [sr, sg, sb] = _parseHexToRgb(surface);
    const surfaceLuma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
    const textIsLight = surfaceLuma < 140;
    const onSurface = textIsLight ? "#ffffff" : "#111111";

    const logo = textIsLight && luma > 60 ? accent : onSurface;
    return {
      accent,
      text: onSurface,
      surface,
      surfaceText: textIsLight
        ? _blendHexColors("#f0f0fa", accent, 0.06)
        : "#1e1e28",
      timerDisplay: onSurface,
      logo,
      focusMode: _readableSubtitleColor(surfaceLuma, secondary),
    };
  }

  function _paletteFromScene(sceneId, sceneOptions, sceneBgColor) {
    if (typeof ThemeScenes === "undefined" || !sceneId) return null;
    const scene = ThemeScenes.get(_safeSceneId(_resolveSceneId(sceneId)));
    if (!scene) return null;
    const defaults = scene.defaults || {};
    const opts = { ...defaults, ...(sceneOptions || {}) };
    const nested = sceneOptions && sceneOptions[scene.id];

    const accent =
      (typeof opts.color === "string" && opts.color) ||
      (nested && typeof nested.color === "string" && nested.color) ||
      (typeof defaults.color === "string" && defaults.color) ||
      "";
    if (!accent) return null;
    const bg =
      sceneBgColor || (typeof opts.bgColor === "string" ? opts.bgColor : "");
    return _paletteFromAccent(accent, bg, bg || null);
  }

  function _extractColorsFromScene(sceneId, sceneOptions, sceneBgColor) {
    return _paletteFromScene(sceneId, sceneOptions, sceneBgColor);
  }

  function _extractColorsFromElement(el) {
    if (!el) return null;
    try {
      return _sampleImageColors(el) || null;
    } catch {
      return null;
    }
  }

  function _liveBgElement() {
    const canvas = document.getElementById("bgCanvas");
    if (
      canvas &&
      canvas.style.display !== "none" &&
      typeof ThemeScenes !== "undefined" &&
      ThemeScenes.isActiveCanvas(canvas)
    )
      return canvas;

    if (typeof ThemeScenes !== "undefined") {
      for (const preview of document.querySelectorAll("canvas.te-preview-canvas")) {
        if (preview.style.display !== "none" && ThemeScenes.isActiveCanvas(preview))
          return preview;
      }
    }
    const video = document.getElementById("bgVideo");
    if (video && video.style.display !== "none" && video.videoWidth) return video;
    return null;
  }

  const DETECTABLE_BG_TYPES = ["solid", "gradient", "image", "video", "scene"];
  function _canDetectFromBg(bg) {
    return !!bg && DETECTABLE_BG_TYPES.includes(bg.type);
  }

  async function _srcForMedia(bg, kind) {
    const direct =
      kind === "image"
        ? bg.imageDataUrl || bg.imageUrl
        : bg.videoDataUrl || bg.videoUrl;
    if (direct) return direct;
    const key = kind === "image" ? bg.imageKey : bg.videoKey;
    if (key) {
      try {
        return await _resolveMediaUrl(key);
      } catch {
        return null;
      }
    }
    return null;
  }

  async function _detectColorsForConfig(config) {
    const bg = (config && config.bg) || {};
    if (bg.type === "solid") {
      const color = bg.color || "#6366f1";

      return _paletteFromAccent(color, _darkenHex(color, 0.7), color);
    }
    if (bg.type === "gradient") {
      const stops = (bg.gradStops || []).map((s) => s && s.color).filter(Boolean);
      if (!stops.length) return null;
      const accent =
        stops.length > 1
          ? _blendHexColors(stops[0], stops[stops.length - 1], 0.5)
          : stops[0];
      return _paletteFromAccent(accent, _darkenHex(accent, 0.6), accent);
    }
    if (bg.type === "scene")
      return _paletteFromScene(bg.sceneId, bg.sceneOptions, bg.sceneBgColor);
    if (bg.type === "image") {
      const src = await _srcForMedia(bg, "image");
      return src ? _extractColorsFromImageUrl(src) : null;
    }
    if (bg.type === "video") {

      const fromLive = _liveBgElement();
      const live = fromLive ? _extractColorsFromElement(fromLive) : null;
      if (live) return live;
      const src = await _srcForMedia(bg, "video");
      return src ? _extractColorsFromVideoFrame(src) : null;
    }
    return null;
  }

  function _applyAutoColors(colors) {
    if (!colors) return;
    const els = {
      accent: "teColAccent",
      text: "teColText",
      surface: "teColSurface",
      surfaceText: "teColSurfaceText",
      timerDisplay: "teColTimer",
      logo: "teColLogo",
      focusMode: "teColFocusMode",
    };
    for (const [key, id] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el && colors[key]) el.value = colors[key];
    }
    _syncColorPickers();
    ThemeEngine._preview();
  }

  function _syncColorPickers() {
    document.querySelectorAll(".te-color-picker").forEach((card) => {
      const input = document.getElementById(card.dataset.for);
      if (!input) return;
      const swatch = card.querySelector(".te-color-picker-swatch");
      const hex = card.querySelector(".te-color-picker-hex");
      if (swatch) swatch.style.background = input.value;
      if (hex) hex.textContent = input.value;
    });
  }

  function _resolveBgSrc() {
    const bgType = document.getElementById("teBgType")?.value;
    if (bgType === "image") {
      const input = document.getElementById("teImgUrl");
      return (
        input.dataset.objectUrl || input.dataset.dataUrl || input.value || null
      );
    }
    if (bgType === "video") {
      const input = document.getElementById("teVideoUrl");
      return (
        input.dataset.objectUrl || input.dataset.dataUrl || input.value || null
      );
    }
    return null;
  }

  function _wireTooltips() {
    const panelEl = document.querySelector(".te-panel");
    if (!panelEl) return;
    document.querySelectorAll(".te-tooltip-trigger").forEach((trigger) => {
      let tooltipEl = null;
      const show = () => {
        const parent = trigger.parentElement;
        if (!parent) return;
        tooltipEl = parent.querySelector(".te-tooltip");
        if (!tooltipEl) return;
        const triggerRect = trigger.getBoundingClientRect();
        const panelRect = panelEl.getBoundingClientRect();
        const tipWidth = Math.min(320, window.innerWidth - 24);
        let left = Math.max(
          12,
          triggerRect.left + triggerRect.width / 2 - tipWidth / 2,
        );
        if (left + tipWidth > window.innerWidth - 12)
          left = window.innerWidth - tipWidth - 12;

        const panelOffLeft = panelRect.left;
        const panelOffTop = panelRect.top;
        const leftFixed = left - panelOffLeft;
        
        tooltipEl.style.cssText = `display:block;position:fixed;opacity:0;pointer-events:none;left:${leftFixed}px;top:${triggerRect.bottom + 8 - panelOffTop}px;max-width:${tipWidth}px;width:auto;background:rgba(10,18,34,0.98);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 14px;box-shadow:0 12px 40px rgba(0,0,0,0.4);font-size:0.8rem;color:rgba(255,255,255,0.8);line-height:1.5;`;
        void tooltipEl.offsetHeight;
        const tipHeight = tooltipEl.getBoundingClientRect().height || 120;
        let topFixed;
        
        if (triggerRect.bottom + 8 + tipHeight + 8 > window.innerHeight) {
          topFixed = Math.max(8, triggerRect.top - 8 - tipHeight) - panelOffTop;
        } else {
          topFixed = triggerRect.bottom + 8 - panelOffTop;
        }
        tooltipEl.style.cssText = `display:block;position:fixed;z-index:100000;left:${leftFixed}px;top:${topFixed}px;max-width:${tipWidth}px;width:auto;background:rgba(10,18,34,0.98);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 14px;box-shadow:0 12px 40px rgba(0,0,0,0.4);font-size:0.8rem;color:rgba(255,255,255,0.8);line-height:1.5;pointer-events:none;`;
      };
      const hide = () => {
        if (tooltipEl) {
          tooltipEl.style.display = "none";
          tooltipEl = null;
        }
      };
      trigger.addEventListener("mouseenter", show);
      trigger.addEventListener("mouseleave", hide);
      trigger.addEventListener("focus", show);
      trigger.addEventListener("blur", hide);
    });
    
    const sizeSelect = document.getElementById("teImgSize");
    
    const sizeTooltip =
      sizeSelect?.previousElementSibling?.querySelector(".te-tooltip");
    if (sizeSelect && sizeTooltip) {
      const sizeDescriptions = {
        cover:
          "<strong>Fill Screen</strong>: Zooms to fill every pixel. Edges may be cropped. <u>No black bars.</u>",
        contain:
          "<strong>Fit Frame</strong>: Shows the entire image within the screen. May add <u>black bars</u> if shapes don\u2019t match.",
        auto: "<strong>Original Size</strong>: Displays at its native resolution. May not fill the screen.",
      };
      const updateSizeTip = () => {
        const val = sizeSelect.value;
        sizeTooltip.innerHTML = sizeDescriptions[val] || sizeDescriptions.cover;
      };
      sizeSelect.addEventListener("change", updateSizeTip);
      updateSizeTip();
    }
  }

  function _checkImageResolution(file) {
    return new Promise((resolve) => {
      if (!file || file.type === "image/svg+xml") {
        resolve();
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const vw = window.innerWidth,
          vh = window.innerHeight;
        const sw = window.screen.width,
          sh = window.screen.height;
        if (img.naturalWidth < vw || img.naturalHeight < vh) {
          _showNotice(
            `Image is ${img.naturalWidth}×${img.naturalHeight}px but your viewport is ${vw}×${vh}px. In Cover mode, images smaller than your screen get upscaled and lose quality. Use an image at least ${sw}×${sh}px (your screen resolution) for best sharpness.`,
            "info",
            15000,
          );
        }
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
  }

  function _wireAutoDetect() {
    const btn = document.getElementById("teAutoDetectColors");
    if (!btn) return;

    const label = document.getElementById("teAutoDetectLabel");
    const setLabel = (text) => {
      if (label) label.textContent = text;
    };
    btn.addEventListener("click", async () => {
      const bgType = document.getElementById("teBgType")?.value || "solid";
      btn.disabled = true;
      setLabel("Detecting…");
      let colors = null;
      if (bgType === "image" || bgType === "video") {
        const src = _resolveBgSrc();
        if (!src) {
          _showNotice(
            "Upload or paste a media file first before detecting colors.",
            "info",
          );
          btn.disabled = false;
          setLabel("Auto-detect from Background");
        }
        colors =
          bgType === "image"
            ? await _extractColorsFromImageUrl(src)
            : await _extractColorsFromVideoFrame(src);
      } else if (bgType === "solid") {
        const color = document.getElementById("teBgColor")?.value || "#6366f1";
        const [r, g, b] = _parseHexToRgb(color);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const textIsLight = luma < 140;
        colors = {
          accent: color,
          text: textIsLight ? "#ffffff" : "#111111",
          surface: _darkenHex(color, 0.7),
          surfaceText: textIsLight ? "#ffffff" : "#111111",
          timerDisplay: textIsLight ? "#ffffff" : "#111111",
          logo: textIsLight ? "#ffffff" : "#111111",
          focusMode: _readableSubtitleColor(luma, color),
        };
      } else if (bgType === "gradient") {
        const stop0 =
          document.getElementById("teGradStop0")?.value || "#6366f1";
        const stop1 =
          document.getElementById("teGradStop1")?.value || "#ec4899";
        const [r0, g0, b0] = _parseHexToRgb(stop0);
        const [r1, g1, b1] = _parseHexToRgb(stop1);
        const avgR = (r0 + r1) / 2,
          avgG = (g0 + g1) / 2,
          avgB = (b0 + b1) / 2;
        const luma = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;
        const textIsLight = luma < 140;
        const accent = _blendHexColors(stop0, stop1, 0.5);
        const surface = _darkenHex(accent, 0.6);
        colors = {
          accent,
          text: textIsLight ? "#ffffff" : "#111111",
          surface,
          surfaceText: textIsLight ? "#ffffff" : "#111111",
          timerDisplay: textIsLight ? "#ffffff" : "#111111",
          logo: textIsLight ? "#ffffff" : "#111111",
          focusMode: _readableSubtitleColor(luma, accent),
        };
      }

      else if (bgType === "scene") {

        let scene = null;
        try {
          scene = ThemeEngine._gatherForm();
        } catch {
          scene = null;
        }
        const bg = (scene && scene.bg) || {};
        colors = _extractColorsFromScene(
          bg.sceneId || _getSelectedSceneId(),
          bg.sceneOptions || null,
          bg.sceneBgColor || document.getElementById("teSceneBgColor")?.value || "",
        );
      }

      if (!colors) {
        const live = _liveBgElement();
        if (live) colors = _extractColorsFromElement(live);
      }
      btn.disabled = false;
      setLabel("Auto-detect from Background");
      if (colors) {
        _applyAutoColors(colors);
        _showNotice(
          "Colors detected from background! Review and adjust below.",
          "success",
        );
      } else {
        _showNotice(
          "Could not detect colors. Try a different background type or media.",
          "error",
        );
      }
    });
  }

  function _parseHexToRgb(hex) {
    if (!hex || typeof hex !== "string") return [0, 0, 0];
    const clean = hex.replace("#", "");
    if (clean.length < 6) return [0, 0, 0];
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }

  function _darkenHex(hex, factor) {
    const [r, g, b] = _parseHexToRgb(hex);
    return `#${Math.round(r * factor)
      .toString(16)
      .padStart(2, "0")}${Math.round(g * factor)
      .toString(16)
      .padStart(2, "0")}${Math.round(b * factor)
      .toString(16)
      .padStart(2, "0")}`;
  }

  function _blendHexColors(hex1, hex2, t) {
    const [r1, g1, b1] = _parseHexToRgb(hex1);
    const [r2, g2, b2] = _parseHexToRgb(hex2);
    return `#${Math.round(r1 + (r2 - r1) * t)
      .toString(16)
      .padStart(2, "0")}${Math.round(g1 + (g2 - g1) * t)
      .toString(16)
      .padStart(2, "0")}${Math.round(b1 + (b2 - b1) * t)
      .toString(16)
      .padStart(2, "0")}`;
  }

  function _readableSubtitleColor(bgLuma, suggestedColor) {
    if (suggestedColor) {
      const [sr, sg, sb] = _parseHexToRgb(suggestedColor);
      const suggestedLuma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
      const contrast = Math.abs(bgLuma - suggestedLuma);
      if (contrast > 80) return suggestedColor;
    }
    return bgLuma < 140 ? "#ffffff" : "#111111";
  }

  /* ── contrast floor ───────────────────────────────────────────────────────
     The presets are picked from a scene's own colours, and a scene whose
     accent is a light rose (or whose surface is a warm maroon) used to produce
     pale-white text on a pale pill: readable as a mood board, not as UI. The
     old check was a luma DIFFERENCE, which is not the same thing as contrast.
     These are the real WCAG numbers, and _normalizePalette uses them to nudge
     a token just far enough toward white/black to pass — it never repaints
     the theme, so a rose theme stays rose. */
  function _linearChannel(v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function _relLuminance(hex) {
    if (!HEX_RE.test(hex || "")) return null;
    const [r, g, b] = _parseHexToRgb(hex);
    return (
      0.2126 * _linearChannel(r) +
      0.7152 * _linearChannel(g) +
      0.0722 * _linearChannel(b)
    );
  }

  function _contrastRatio(hexA, hexB) {
    const a = _relLuminance(hexA);
    const b = _relLuminance(hexB);
    if (a == null || b == null) return 1;
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* Blend `fg` toward the pole that contrasts with `bg` until it clears
     `min`. Small steps keep the hue: we are adjusting weight, not colour. */
  function _ensureContrast(fg, bg, min, pole) {
    if (!HEX_RE.test(fg || "") || !HEX_RE.test(bg || "")) return fg;
    if (_contrastRatio(fg, bg) >= min) return fg;
    const target =
      pole ||
      (_contrastRatio("#ffffff", bg) >= _contrastRatio("#111111", bg)
        ? "#ffffff"
        : "#111111");
    let out = fg;
    for (let t = 0.1; t <= 1.001; t += 0.1) {
      out = _blendHexColors(fg, target, t);
      if (_contrastRatio(out, bg) >= min) return out;
    }
    return target;
  }

  const TEXT_FLOOR = 4.5;
  const BODY_FLOOR = 7;

  function _normalizePalette(colors) {
    const out = { ...colors };
    const surface = HEX_RE.test(out.surface || "") ? out.surface : "#0b111f";
    const accent = HEX_RE.test(out.accent || "") ? out.accent : "#6366f1";
    const surfaceLuma =
      0.2126 * _parseHexToRgb(surface)[0] +
      0.7152 * _parseHexToRgb(surface)[1] +
      0.0722 * _parseHexToRgb(surface)[2];
    const fallbackInk = surfaceLuma < 140 ? "#ffffff" : "#111111";

    out.accent = accent;
    // Panel body copy: the highest bar, because every dialog reads from it.
    out.surfaceText = _ensureContrast(
      HEX_RE.test(out.surfaceText || "") ? out.surfaceText : fallbackInk,
      surface,
      BODY_FLOOR,
    );
    // Screen chrome drawn over the live background.
    out.text = _ensureContrast(
      HEX_RE.test(out.text || "") ? out.text : fallbackInk,
      surface,
      TEXT_FLOOR,
    );
    out.timerDisplay = _ensureContrast(
      HEX_RE.test(out.timerDisplay || "") ? out.timerDisplay : fallbackInk,
      surface,
      TEXT_FLOOR,
    );
    out.logo = _ensureContrast(
      HEX_RE.test(out.logo || "") ? out.logo : fallbackInk,
      surface,
      TEXT_FLOOR,
    );
    out.focusMode = _ensureContrast(
      HEX_RE.test(out.focusMode || "") ? out.focusMode : accent,
      surface,
      TEXT_FLOOR,
    );
    /* Labels on a solid accent fill stay white, as they always were. The
       palette is never re-tinted to make that easier to read. */
    return out;
  }

  async function _extractColorsFromVideoFrame(src) {
    if (!src) return null;
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true;
      video.crossOrigin = "Anonymous";
      video.preload = "auto";
      const timeout = setTimeout(() => {
        video.remove();
        resolve(null);
      }, 10000);
      video.onloadeddata = () => {
        clearTimeout(timeout);
        video.currentTime = Math.min(1, video.duration / 2 || 1);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 200;
          canvas.height = video.videoHeight || 200;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          video.remove();
          _extractColorsFromImageUrl(dataUrl).then(resolve);
        } catch {
          video.remove();
          resolve(null);
        }
      };
      video.onerror = () => {
        clearTimeout(timeout);
        video.remove();
        resolve(null);
      };
      video.src = src;
      video.load();
    });
  }

  function _toHexInput(value, fallback) {
    const raw = String(value == null ? "" : value).trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    const m = raw.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m)
      return (
        "#" +
        [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("")
      );
    return fallback;
  }

  function _hexToRgba(hex, opacity) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${opacity})`;
  }

  function _encodeSharePayload(payload) {
    return btoa(
      encodeURIComponent(JSON.stringify(payload)).replace(
        /%([0-9A-F]{2})/g,
        (_, p1) => String.fromCharCode(parseInt(p1, 16)),
      ),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function _decodeSharePayload(encoded) {
    const base64 = String(encoded || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    return JSON.parse(
      decodeURIComponent(
        Array.prototype.map
          .call(
            atob(padded),
            (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
          )
          .join(""),
      ),
    );
  }

  function _cloneForSharing(config) {
    const cloned = JSON.parse(JSON.stringify(config || {}));
    const warnings = [];
    const MAX_IMAGE = 2.5 * 1024 * 1024;
    const MAX_VIDEO = 5 * 1024 * 1024;
    
    if (cloned.bg?.imageKey) cloned.bg.imageKey = null;
    if (cloned.bg?.videoKey) cloned.bg.videoKey = null;
    if (cloned.bg?.imageUrl && /^blob:/i.test(cloned.bg.imageUrl)) {
      cloned.bg.imageUrl = null;
      warnings.push("Image upload was session-only and could not be shared.");
    }
    if (cloned.bg?.videoUrl && /^blob:/i.test(cloned.bg.videoUrl)) {
      cloned.bg.videoUrl = null;
      warnings.push("Video upload was session-only and could not be shared.");
    }
    if (cloned.bg?.imageDataUrl && cloned.bg.imageDataUrl.length > MAX_IMAGE) {
      cloned.bg.imageDataUrl = null;
      warnings.push(
        "Image was too large to embed in the share link (max ~2.5MB).",
      );
    }
    if (cloned.bg?.videoDataUrl && cloned.bg.videoDataUrl.length > MAX_VIDEO) {
      cloned.bg.videoDataUrl = null;
      warnings.push(
        "Video was too large to embed in the share link (max ~5MB).",
      );
    }
    if (warnings.length) cloned._warnings = warnings;
    return cloned;
  }

  /* ---- Shared-theme validation -------------------------------------------
     A share link is untrusted input: it arrives in a URL or a pasted string
     and lands in CSS custom properties, gradient strings and url() values.
     Everything below whitelists what this app itself can produce, so a crafted
     payload can neither inject declarations (position:fixed overlays, external
     url() beacons) nor smuggle javascript: / data:text/html. Unknown keys are
     dropped, never forwarded. Local themes never pass through here. */
  const SHARE_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  const SHARE_FUNC_COLOR_RE = /^(?:rgba?|hsla?)\(\s*[0-9a-zA-Z.,%\s/+-]{1,48}\)$/;
  const SHARE_DANGER_RE =
    /(expression\s*\(|url\s*\(|javascript:|vbscript:|data:text\/html|@import|behavior\s*:|-moz-binding|<\/?script|[\\;{}<>])/i;
  const SHARE_DATA_MEDIA_RE =
    /^data:(?:image\/(?:png|jpe?g|gif|webp|avif)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/=\s]+$/i;
  const SHARE_MEDIA_EXT_RE = /\.(?:png|jpe?g|gif|webp|avif|mp4|webm)$/i;
  const SHARE_BG_TYPES = ["solid", "gradient", "image", "video", "scene"];
  const SHARE_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

  function _shareText(value, max) {
    if (typeof value !== "string") return "";
    const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!clean || SHARE_DANGER_RE.test(clean)) return "";
    return clean.slice(0, max || 60);
  }

  /* Colours go into CSS custom properties and gradient strings, so only the
     three syntaxes the pickers emit are accepted; anything else falls back. */
  function _shareColor(value, fallback) {
    if (typeof value !== "string") return fallback;
    const raw = value.trim();
    if (!raw || raw.length > 64) return fallback;
    if (SHARE_HEX_RE.test(raw) || SHARE_FUNC_COLOR_RE.test(raw)) return raw;
    return fallback;
  }

  /* Images/videos are either media data URIs generated here, or a same-origin
     or https URL ending in a media extension with no query string or hash. */
  function _shareMediaUrl(value) {
    if (typeof value !== "string") return "";
    const raw = value.trim();
    if (!raw || raw.length > 8 * 1024 * 1024) return "";
    if (SHARE_DATA_MEDIA_RE.test(raw)) return raw;
    if (/^data:/i.test(raw)) return "";
    try {
      const url = new URL(raw, window.location.href);
      const sameOrigin = url.origin === window.location.origin;
      const protocolOk =
        url.protocol === "https:" ||
        (sameOrigin && url.protocol === "http:");
      if (!protocolOk || url.search || url.hash) return "";
      if (!SHARE_MEDIA_EXT_RE.test(url.pathname)) return "";
      return url.href;
    } catch (e) {
      return "";
    }
  }

  function _shareNumber(value, fallback, min, max) {
    const n = typeof value === "number" ? value : parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /* Scene options are numbers, booleans or colours. They are clamped because
     a scene reads them as counts and radii — a shared "density: 1e12" would
     otherwise spin a particle loop until the tab dies. */
  const SHARE_OPT_MAX = 1000;

  function _sanitizeShareOptions(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    for (const [key, value] of Object.entries(raw)) {
      if (!SHARE_ID_RE.test(key)) continue;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) continue;
        out[key] = Math.min(SHARE_OPT_MAX, Math.max(-SHARE_OPT_MAX, value));
      } else if (typeof value === "boolean") {
        out[key] = value;
      } else if (typeof value === "string") {
        /* Only colours and the short word tokens select options use
           ("maple", "storm"). Numeric strings are dropped, not coerced: a
           scene reads density as a count and "1e12" would hang the tab. */
        const color = _shareColor(value, "");
        if (color) out[key] = color;
        else if (/^[a-z]{2,16}$/.test(value.trim())) out[key] = value.trim();
      }
    }
    return out;
  }

  function _sanitizeShareConfig(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const theme = {};
    theme.id =
      typeof input.id === "string"
        ? input.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64)
        : "";
    theme.name = _shareText(input.name, 48) || "Imported Theme";
    const created = Date.parse(input.createdAt);
    theme.createdAt = Number.isNaN(created)
      ? new Date().toISOString()
      : new Date(created).toISOString();

    const colors =
      input.colors && typeof input.colors === "object" ? input.colors : {};
    theme.colors = {};
    for (const key of Object.keys(DEFAULTS))
      theme.colors[key] = _shareColor(colors[key], DEFAULTS[key]);

    theme.bg = { type: "solid", color: "#6366f1" };
    const bg = input.bg && typeof input.bg === "object" ? input.bg : null;
    if (bg) {
      theme.bg.type = SHARE_BG_TYPES.includes(bg.type) ? bg.type : "solid";
      theme.bg.color = _shareColor(bg.color, "#6366f1");
      theme.bg.gradAngle = _shareNumber(bg.gradAngle, 135, 0, 360);
      const stops = Array.isArray(bg.gradStops) ? bg.gradStops.slice(0, 8) : [];
      if (stops.length >= 2) {
        theme.bg.gradStops = stops.map((stop, i) => ({
          color: _shareColor(stop && stop.color, i === 0 ? "#6366f1" : "#ec4899"),
          pos: _shareNumber(stop && stop.pos, i === 0 ? 0 : 100, 0, 100),
        }));
      }
      theme.bg.imageUrl = _shareMediaUrl(bg.imageUrl);
      theme.bg.imageDataUrl = _shareMediaUrl(bg.imageDataUrl);
      theme.bg.videoUrl = _shareMediaUrl(bg.videoUrl);
      theme.bg.videoDataUrl = _shareMediaUrl(bg.videoDataUrl);
      theme.bg.imageSize = ["cover", "contain", "auto"].includes(bg.imageSize)
        ? bg.imageSize
        : "cover";
      theme.bg.videoOpacity = _shareNumber(bg.videoOpacity, 1, 0, 1);
      theme.bg.sceneId =
        typeof bg.sceneId === "string" && SHARE_ID_RE.test(bg.sceneId)
          ? bg.sceneId
          : "particles";
      theme.bg.sceneOptions = _sanitizeShareOptions(bg.sceneOptions);
      theme.bg.sceneBgColor = _shareColor(bg.sceneBgColor, "");
      const bgColors = {};
      if (
        bg.sceneBgColors &&
        typeof bg.sceneBgColors === "object" &&
        !Array.isArray(bg.sceneBgColors)
      ) {
        for (const [id, value] of Object.entries(bg.sceneBgColors)) {
          if (!SHARE_ID_RE.test(id)) continue;
          const color = _shareColor(value, "");
          if (color) bgColors[id] = color;
        }
      }
      theme.bg.sceneBgColors = bgColors;
    }

    const overlay =
      input.overlay && typeof input.overlay === "object" ? input.overlay : null;
    theme.overlay = {
      color: (overlay && _shareColor(overlay.color, "")) || "rgba(0,0,0,0)",
    };
    return theme;
  }

  function _importSharedTheme(config, options = {}) {
    if (!config || typeof config !== "object") return null;
    const theme = _sanitizeShareConfig(config);
    if (!theme) return null;
    const importedId =
      options.keepId && theme.id
        ? String(theme.id).replace(/[^A-Za-z0-9_-]/g, "")
        : "";
    theme.id = importedId || `ct_${Date.now()}`;
    if (!theme.name) theme.name = "Imported Theme";
    if (!theme.createdAt) theme.createdAt = new Date().toISOString();
    if (!theme.colors) theme.colors = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      if (!theme.colors[key]) theme.colors[key] = DEFAULTS[key];
    }
    if (theme.bg?.imageDataUrl && theme.bg.imageDataUrl.length > 500 * 1024)
      _showNotice(
        "Imported image data URI is large and may not save reliably.",
        "info",
      );
    if (theme.bg?.videoDataUrl && theme.bg.videoDataUrl.length > 500 * 1024)
      _showNotice(
        "Imported video data URI is large and may not save reliably.",
        "info",
      );
    const saved = ThemeEngine.save(theme);
    if (!saved) {
      _showNotice(
        "Could not save imported theme (max themes reached?).",
        "error",
      );
      return null;
    }
    ThemeEngine.activate(saved.id);
    ThemeEngine._rebuildCustomList();
    _showNotice(`Theme "${saved.name}" imported and activated!`, "success");
    return saved;
  }

  return {
    DEFAULTS,
    STORAGE_KEY_CUSTOM,
    STORAGE_KEY_ACTIVE,
    BODY_CLASS,

    getActiveId() {
      return _getActiveId();
    },

    getLiveColors() {
      return _liveColors();
    },

    _clearCSSVars,
    _paletteToken: 0,

    detectColorsFor(configOrBg) {
      const config = configOrBg && configOrBg.bg ? configOrBg : { bg: configOrBg };
      return _detectColorsForConfig(config);
    },
    
    sampleElementColors(el) {
      return _extractColorsFromElement(el);
    },

    async applyBackgroundPalette(bg, token) {
      let colors = null;
      try {
        colors = await this.detectColorsFor(bg);
      } catch (e) {
        colors = null;
      }
      if (!colors) {
        const live = _liveBgElement();
        if (live) colors = _extractColorsFromElement(live);

        if (colors && colors.accent) {
          const [sr, sg, sb] = _parseHexToRgb(colors.surface || "#0f172a");
          const bgLuma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
          const accent = _accentForBg(colors.accent, bgLuma);
          if (accent !== colors.accent)
            colors = {
              ...colors,
              accent,
              focusMode: _readableSubtitleColor(bgLuma, accent),
            };
        }
      }
      if (!colors) return null;

      if (token != null && token !== ThemeEngine._paletteToken) return null;
      _injectCSSVars({ ...DEFAULTS, ...colors });
      document.body.classList.add(BODY_CLASS);
      return colors;
    },

    applyNativePresetPalette() {
      document.body.classList.remove(BODY_CLASS);
      _clearCSSVars();
      return { ...DEFAULTS };
    },

    _getSceneMoodsUI() {
      return { moods: _sceneMoods, labels: _moodLabels };
    },
    _getThumbClassMap() {
      return _thumbClassMap();
    },

    renderScenePanel(scope, cfg) {
      if (!scope) return null;
      const options = (cfg && cfg.options) || {};
      const sceneId = cfg && cfg.sceneId;
      const ctx = {
        scope,
        prefix: _panelPrefix(scope),
        host: "external",
        sceneId,
        optsCache: {},
        bgCache: {},
        cardsRoot: null,
        keepColors: false,
        onLive: (cfg && cfg.onLive) || function () {},
        onSettle: (cfg && cfg.onSettle) || function () {},
      };

      if (cfg && cfg.bgColor) ctx.bgCache[sceneId] = cfg.bgColor;
      _buildSceneOptionsUI(ctx, options);
      return ctx;
    },
    _getSelectedSceneId: () => _getSelectedSceneId(),
    _buildFeaturedShelf: (selectedId) => _buildFeaturedShelf(selectedId),
    _openSceneLibrary: (selectedId) => _openSceneLibrary(selectedId),
    _selectScene: (sceneId, savedOptions) => {
      _selectScene(sceneId, savedOptions);
    },
    _renderSceneThumbs: (rootEl, done) => _renderSceneThumbs(rootEl, done),
    _hoverStart: (card) => _hoverStart(card),
    _hoverStop: () => _hoverStop(),

    _showNotice: (message, type, timeout) =>
      _showNotice(message, type, timeout),

    list() {
      return _getAll();
    },

    save(config) {
      const themes = _getAll();
      const idx = themes.findIndex((t) => t.id === config.id);
      const entry = { ...config, updatedAt: new Date().toISOString() };
      
      const dupName = (config.name || "").trim().toLowerCase();
      if (
        dupName &&
        themes.some(
          (t) =>
            t.id !== config.id &&
            (t.name || "").trim().toLowerCase() === dupName,
        )
      ) {
        _showAlert(
          `A theme named "${config.name.trim()}" already exists. Choose a different name.`,
        );
        return null;
      }
      if (idx !== -1) themes[idx] = entry;
      else {
        if (themes.length >= MAX_THEMES) {
          _showAlert(
            `Maximum of ${MAX_THEMES} custom themes reached. Delete one first.`,
          );
          return null;
        }
        themes.push(entry);
      }
      _setAll(themes);
      return entry;
    },

    delete(id) {
      const themes = _getAll();
      const idx = themes.findIndex((t) => t.id === id);
      if (idx === -1) return false;
      themes.splice(idx, 1);
      _setAll(themes);
      _deleteThemeMedia(id);
      if (_getActiveId() === id) this.deactivate();
      return true;
    },

    rename(id, name) {
      const themes = _getAll();
      const idx = themes.findIndex((t) => t.id === id);
      if (idx === -1) return false;
      const clean = (name || "").trim().slice(0, 40) || "Untitled";
      if (
        themes.some(
          (t) =>
            t.id !== id &&
            (t.name || "").trim().toLowerCase() === clean.toLowerCase(),
        )
      )
        return false;
      themes[idx] = {
        ...themes[idx],
        name: clean,
        updatedAt: new Date().toISOString(),
      };
      _setAll(themes);
      return true;
    },

    get(id) {
      const themes = _getAll();
      return themes.find((t) => t.id === id) || null;
    },
    load() {
      const id = _getActiveId();
      return id ? this.get(id) : null;
    },

    apply(config) {
      if (!config) return null;
      if (
        typeof ThemeEngine.deactivateNativeScene === "function" &&
        typeof ThemeEngine.getNativeSceneState === "function" &&
        ThemeEngine.getNativeSceneState()
      )
        ThemeEngine.deactivateNativeScene();
      const bgCSS = _buildBackgroundCSS(config.bg);

      const defaultColors = _colorsAreDefault(config.colors);
      if (defaultColors) _clearCSSVars();
      else _injectCSSVars({ ...DEFAULTS, ...(config.colors || {}) });
      _applyOverlay(config.overlay);
      if (
        typeof window !== "undefined" &&
        typeof window.stopThemeAnimations === "function"
      )
        window.stopThemeAnimations();
      _removeBuiltinThemeClasses();
      const timerContainer = document.getElementById("timerContainer");
      document.body.style.background = bgCSS || "transparent";
      if (timerContainer)
        timerContainer.style.background = bgCSS || "transparent";
      _applyMediaElements(config.bg);
      document.body.classList.toggle(BODY_CLASS, !defaultColors);
      _setActiveId(config.id);

      document
        .querySelectorAll(".theme-option.active")
        .forEach((o) => o.classList.remove("active"));
      return config;
    },

    deactivate(options = {}) {
      document.body.classList.remove(BODY_CLASS);
      _clearCSSVars();
      _applyOverlay({ color: "rgba(0,0,0,0)" });
      _clearMediaElements();
      document.body.style.background = "";
      const timerContainer = document.getElementById("timerContainer");
      if (timerContainer) timerContainer.style.background = "";
      _setActiveId(null);
      if (options.restorePreset !== false) {
        _restoreBuiltinThemeClasses();
        if (
          typeof window !== "undefined" &&
          typeof window.reapplyBuiltInTheme === "function"
        )
          window.reapplyBuiltInTheme(
            localStorage.getItem("timerTheme") || "gradient-default",
          );
      } else {
        _removeBuiltinThemeClasses();
        
        document
          .querySelectorAll(".theme-option.active")
          .forEach((o) => o.classList.remove("active"));
      }
    },

    activate(id) {
      this.deactivate({ restorePreset: false });
      const config = this.get(id);
      return config ? this.apply(config) : null;
    },

    init() {
      const id = _getActiveId();
      if (!id) return null;
      const config = this.get(id);
      if (!config) {
        _setActiveId(null);
        return null;
      }
      const bgCSS = _buildBackgroundCSS(config.bg);
      const defaultColors = _colorsAreDefault(config.colors);
      if (defaultColors) _clearCSSVars();
      else _injectCSSVars({ ...DEFAULTS, ...(config.colors || {}) });
      _applyOverlay(config.overlay);
      if (
        typeof window !== "undefined" &&
        typeof window.stopThemeAnimations === "function"
      )
        window.stopThemeAnimations();
      _removeBuiltinThemeClasses();
      const timerContainer = document.getElementById("timerContainer");
      document.body.style.background = bgCSS || "transparent";
      if (timerContainer)
        timerContainer.style.background = bgCSS || "transparent";
      _applyMediaElements(config.bg);
      
      document.body.classList.toggle(BODY_CLASS, !defaultColors);
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            [...mutation.target.classList]
              .filter((c) => c.startsWith("theme-") && c !== BODY_CLASS)
              .forEach((c) => mutation.target.classList.remove(c));
          }
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
      if (timerContainer)
        observer.observe(timerContainer, {
          attributes: true,
          attributeFilter: ["class"],
        });
      setTimeout(() => observer.disconnect(), 3000);
      try {
        const existing = _getAll();
        if (!existing || existing.length === 0) {
          this.save({
            id: "ct_demo",
            name: "Demo Theme",
            createdAt: new Date().toISOString(),
            bg: {
              type: "gradient",
              gradAngle: 135,
              gradStops: [
                { color: "#6366f1", pos: 0 },
                { color: "#ec4899", pos: 100 },
              ],
            },
            colors: { ...DEFAULTS },
            overlay: { color: "rgba(0,0,0,0.2)" },
          });
        }
      } catch (e) {}
      try {
        this._rebuildCustomList();
      } catch (e) {}
      return config;
    },

    _editingId: null,
    _themeName: "",

    _removeBuiltinThemeClasses,
    BODY_CLASS,

    _gatherForm() {
      const bgType = document.getElementById("teBgType").value;
      const id = this._editingId || "ct_" + Date.now();
      const existing = this.get(id);
      const config = {
        id,
        name: this._themeName || "Untitled",
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        bg: { type: bgType },
        colors: {
          accent: document.getElementById("teColAccent").value,
          text: document.getElementById("teColText").value,
          surface: document.getElementById("teColSurface").value,
          surfaceText: document.getElementById("teColSurfaceText").value,
          timerDisplay: document.getElementById("teColTimer").value,
          logo: document.getElementById("teColLogo").value,
          focusMode: document.getElementById("teColFocusMode").value,
        },
        overlay: {
          color: _hexToRgba(
            document.getElementById("teOverColor").value,
            parseInt(document.getElementById("teOverOpacity").value, 10) / 100,
          ),
        },
      };
      if (bgType === "solid")
        config.bg.color = document.getElementById("teBgColor").value;
      else if (bgType === "gradient") {
        config.bg.gradAngle = parseInt(
          document.getElementById("teGradAngle").value,
          10,
        );
        config.bg.gradStops = [
          { color: document.getElementById("teGradStop0").value, pos: 0 },
          { color: document.getElementById("teGradStop1").value, pos: 100 },
        ];
      } else if (bgType === "image") {
        const input = document.getElementById("teImgUrl");
        const mediaKey = input.dataset.mediaKey,
          val = input.value?.trim();
        if (mediaKey) config.bg.imageKey = mediaKey;
        else if (val) config.bg.imageUrl = val;
        if (input.dataset.dataUrl)
          config.bg.imageDataUrl = input.dataset.dataUrl;
        config.bg.imageSize = document.getElementById("teImgSize").value;
        config.bg.imagePos = "center center";
      } else if (bgType === "video") {
        const input = document.getElementById("teVideoUrl");
        const mediaKey = input.dataset.mediaKey,
          val = input.value?.trim();
        if (mediaKey) config.bg.videoKey = mediaKey;
        else if (val) config.bg.videoUrl = val;
        if (input.dataset.dataUrl)
          config.bg.videoDataUrl = input.dataset.dataUrl;
        config.bg.videoOpacity =
          parseInt(document.getElementById("teVideoOpacity").value, 10) / 100;
      } else if (bgType === "scene") {
        const sceneId = _safeSceneId(_selectedSceneId);
        const ctx = _builderCtx();
        const currentOpts = ctx ? _gatherSceneOptions(ctx) : {};
        _sceneOptsCache[sceneId] = currentOpts;
        config.bg.sceneId = sceneId;
        config.bg.sceneOptions = { ..._sceneOptsCache };
        const sceneBgInput = document.getElementById("teSceneBgColor");
        if (sceneBgInput) {
          _sceneBgCache[sceneId] = sceneBgInput.value;
          config.bg.sceneBgColor = sceneBgInput.value; 
          config.bg.sceneBgColors = { ..._sceneBgCache };
        }
      }
      return config;
    },

    _preview() {
      const config = this._gatherForm();
      _injectCSSVars(config.colors);
      _applyOverlay(config.overlay);
      const bgCSS = _buildBackgroundCSS(config.bg);
      const stage = document.getElementById("tePreviewStage");
      let previewVideo = document.getElementById("tePreviewVideo");
      if (previewVideo && config.bg.type !== "video") {
        previewVideo.pause();
        previewVideo.removeAttribute("src");
        previewVideo.load();
        previewVideo.style.display = "none";
      }
      if (stage) {
        stage.style.background = "rgba(0,0,0,0.4)";
        stage.style.backgroundImage = "";
        stage.style.backgroundSize = "";
        stage.style.backgroundPosition = "";
        if (config.bg.type === "scene")
          stage.style.background = config.bg.sceneBgColor || "#020617";
        else if (config.bg.type === "image") {
          const src = config.bg.imageDataUrl || config.bg.imageUrl;
          if (src) {
            stage.style.backgroundImage = `url("${src}")`;
            stage.style.backgroundSize = config.bg.imageSize || "cover";
            stage.style.backgroundPosition =
              config.bg.imagePos || "center center";
          } else if (config.bg.imageKey)
            _resolveMediaUrl(config.bg.imageKey).then((resolvedUrl) => {
              if (resolvedUrl) {
                stage.style.backgroundImage = `url("${resolvedUrl}")`;
                stage.style.backgroundSize = config.bg.imageSize || "cover";
                stage.style.backgroundPosition =
                  config.bg.imagePos || "center center";
              }
            });
        } else if (config.bg.type === "video") {
          if (!previewVideo) {
            previewVideo = document.createElement("video");
            previewVideo.id = "tePreviewVideo";
            previewVideo.muted = true;
            previewVideo.loop = true;
            previewVideo.autoplay = true;
            previewVideo.playsInline = true;
            previewVideo.style.cssText =
              "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:0;";
            stage.prepend(previewVideo);
          }
          const src = config.bg.videoDataUrl || config.bg.videoUrl;
          if (src) {
            previewVideo.src = src;
            previewVideo.style.display = "block";
            previewVideo.play().catch(() => {});
          } else if (config.bg.videoKey)
            _resolveMediaUrl(config.bg.videoKey).then((resolvedUrl) => {
              if (resolvedUrl) {
                previewVideo.src = resolvedUrl;
                previewVideo.style.display = "block";
                previewVideo.play().catch(() => {});
              }
            });
        } else stage.style.background = bgCSS || "rgba(0,0,0,0.4)";
      }
      document.querySelectorAll(".te-preview-mode").forEach((m) => {
        m.style.color = config.colors.text || "#ffffff";
        if (m.classList.contains("active")) {
          m.style.background = config.colors.accent || "#6366f1";
          // Ink against the accent, matching the live .mode-btn.active.
          m.style.color = "var(--th-accent-ink, #ffffff)";
        } else m.style.background = "rgba(0,0,0,0.25)";
      });
      const btnEl = document.querySelector(".te-preview-btn");
      if (btnEl) {
        btnEl.style.background = config.colors.accent;
        btnEl.style.color = "var(--th-accent-ink, #ffffff)";
      }
      const previewCard = document.getElementById("tePreviewCard");
      if (previewCard) {
        previewCard.style.background =
          config.colors.surface || "rgba(10,18,34,0.88)";
        previewCard.style.color =
          config.colors.surfaceText || config.colors.text || "#ffffff";
        previewCard.style.borderColor = config.colors.accent || "#6366f1";
      }
      const previewChip = document.getElementById("tePreviewSurfaceChip");
      if (previewChip) {
        previewChip.style.background = config.colors.accent || "#6366f1";
        previewChip.style.color = "var(--th-accent-ink, #ffffff)";
      }
      const previewBrand = document.getElementById("tePreviewBrand");
      if (previewBrand) previewBrand.style.color = "#ffffff";
      const previewBrandSub = document.getElementById("tePreviewBrandSub");
      if (previewBrandSub)
        previewBrandSub.style.color =
          config.colors.focusMode || config.colors.accent || "#6366f1";
      const previewSurfaceCard = document.getElementById(
        "tePreviewSurfaceCard",
      );
      if (previewSurfaceCard) {
        previewSurfaceCard.style.background =
          config.colors.surface || "rgba(10,18,34,0.96)";
        previewSurfaceCard.style.color =
          config.colors.surfaceText || config.colors.text || "#ffffff";
        previewSurfaceCard.style.borderColor =
          config.colors.accent || "#6366f1";
      }
      const previewSurfaceChip = document.getElementById(
        "tePreviewSurfaceChip2",
      );
      if (previewSurfaceChip) {
        previewSurfaceChip.style.background = config.colors.accent || "#6366f1";
        previewSurfaceChip.style.color = "var(--th-accent-ink, #ffffff)";
      }
      const previewSurfaceModal = document.getElementById(
        "tePreviewSurfaceModal",
      );
      if (previewSurfaceModal) {
        previewSurfaceModal.style.background =
          config.colors.surface || "rgba(10,18,34,0.96)";
        previewSurfaceModal.style.color =
          config.colors.surfaceText || config.colors.text || "#ffffff";
      }
      const previewOverlay = document.getElementById("tePreviewOverlay");
      if (previewOverlay) {
        const c = config.overlay?.color || "rgba(0,0,0,0)";
        previewOverlay.style.display = c !== "rgba(0,0,0,0)" ? "block" : "none";
        previewOverlay.style.background = c;
      }
      _applyPreviewScene(config);
    },

    openEditor(config) {
      const modal = document.getElementById("themeEditorModal");
      if (!modal) return;
      this._editingId = config ? config.id : `ct_${Date.now()}`;
      
      if (!config) {
        document
          .querySelectorAll(".te-tab-btn")
          .forEach((b) => b.classList.toggle("active", b.dataset.tab === "bg"));
        document
          .querySelectorAll(".te-tab-pane")
          .forEach((p) => p.classList.toggle("active", p.dataset.tab === "bg"));
      }
      const bg = (config && config.bg) || { type: "solid", color: "#6366f1" };

      const cols = (config && config.colors) || { ...DEFAULTS };
      const over = (config && config.overlay) || { color: "rgba(0,0,0,0)" };
      document.getElementById("teBgType").value = bg.type;
      document.getElementById("teBgColor").value = bg.color || "#6366f1";
      document.getElementById("teGradAngle").value = bg.gradAngle ?? 135;
      document.getElementById("teGradAngleVal").textContent =
        (bg.gradAngle ?? 135) + "°";
      const stops = bg.gradStops || [
        { color: "#6366f1", pos: 0 },
        { color: "#ec4899", pos: 100 },
      ];
      document.getElementById("teGradStop0").value =
        stops[0]?.color || "#6366f1";
      document.getElementById("teGradStop1").value =
        stops[1]?.color || "#ec4899";
      const imgUrlInput = document.getElementById("teImgUrl");
      imgUrlInput.value = bg.imageUrl || "";
      delete imgUrlInput.dataset.dataUrl;
      delete imgUrlInput.dataset.objectUrl;
      delete imgUrlInput.dataset.mediaKey;
      if (bg.imageDataUrl) imgUrlInput.dataset.dataUrl = bg.imageDataUrl;
      if (bg.imageKey) imgUrlInput.dataset.mediaKey = bg.imageKey;
      document.getElementById("teImgSize").value = bg.imageSize || "cover";
      const imgPreview = document.getElementById("teImgPreview"),
        imgPreviewEl = document.getElementById("teImgPreviewEl");
      if (imgPreview && imgPreviewEl) {
        const imgSrc = bg.imageDataUrl || bg.imageUrl;
        if (imgSrc) {
          imgPreviewEl.src = imgSrc;
          imgPreview.style.display = "block";
        } else if (bg.imageKey) {
          imgPreviewEl.src = "";
          imgPreview.style.display = "none";
          _resolveMediaUrl(bg.imageKey).then((resolvedUrl) => {
            if (resolvedUrl) {
              imgPreviewEl.src = resolvedUrl;
              imgPreview.style.display = "block";
            }
          });
        } else imgPreview.style.display = "none";
      }
      const videoUrlInput = document.getElementById("teVideoUrl");
      videoUrlInput.value = bg.videoUrl || "";
      delete videoUrlInput.dataset.dataUrl;
      delete videoUrlInput.dataset.objectUrl;
      delete videoUrlInput.dataset.mediaKey;
      if (bg.videoDataUrl) videoUrlInput.dataset.dataUrl = bg.videoDataUrl;
      if (bg.videoKey) videoUrlInput.dataset.mediaKey = bg.videoKey;
      document.getElementById("teVideoOpacity").value =
        bg.videoOpacity != null ? Math.round(bg.videoOpacity * 100) : 100;
      document.getElementById("teVideoOpacityVal").textContent =
        (bg.videoOpacity != null ? Math.round(bg.videoOpacity * 100) : 100) +
        "%";
      
      _sceneOptsCache = {};
      _sceneBgCache = { ...(bg.sceneBgColors || {}) };

      if (
        _sceneBgCache.flourish !== undefined &&
        _sceneBgCache.fireflies === undefined
      )
        _sceneBgCache.fireflies = _sceneBgCache.flourish;
      if (
        _sceneBgCache.constellation !== undefined &&
        _sceneBgCache.fireflies === undefined
      )
        _sceneBgCache.fireflies = _sceneBgCache.constellation;
      if (
        _sceneBgCache.shootingstars !== undefined &&
        _sceneBgCache.starfield === undefined
      )
        _sceneBgCache.starfield = _sceneBgCache.shootingstars;
      if (
        _sceneBgCache.rainwindow !== undefined &&
        _sceneBgCache.condensation === undefined
      )
        _sceneBgCache.condensation = _sceneBgCache.rainwindow;
      const sceneId = _safeSceneId(_resolveSceneId(bg.sceneId));
      _selectedSceneId = sceneId;

      _sessionPick =
        bg.type === "scene" && !_featuredSceneIds.includes(sceneId)
          ? sceneId
          : null;
      const sceneBgInput = document.getElementById("teSceneBgColor");
      if (sceneBgInput) {
        const ownBg =
          (bg.sceneBgColors && _legacySceneValue(sceneId, bg.sceneBgColors)) ||
          bg.sceneBgColor ||
          "#020617";
        sceneBgInput.value = ownBg;
        _updateSceneBgPreview(_builderCtx(), ownBg);
      }
      _sceneSavedOptions = bg.sceneOptions || {};
      _buildFeaturedShelf(sceneId);
      const sceneCtx = _builderCtx();
      if (sceneCtx) _buildSceneOptionsUI(sceneCtx, _sceneSavedOptions);
      /* The shelf above was built from whichever scenes had loaded. Fetch the
         rest and repaint, unless the user has already picked something. */
      if (!_sceneLibraryComplete()) {
        const pickToken = _scenePickToken;
        _ensureSceneLibrary().then(() => {
          if (_scenePickToken !== pickToken) return;
          if (!modal.classList.contains("open")) return;
          _buildFeaturedShelf(_selectedSceneId);
          const lateCtx = _builderCtx();
          if (lateCtx) _buildSceneOptionsUI(lateCtx, _sceneSavedOptions);
        });
      }
      document.getElementById("teColAccent").value = cols.accent;
      document.getElementById("teColText").value = cols.text;
      document.getElementById("teColSurface").value = _toHexInput(
        cols.surface,
        "#0f172a",
      );
      document.getElementById("teColSurfaceText").value =
        cols.surfaceText || cols.text || "#ffffff";
      document.getElementById("teColTimer").value = cols.timerDisplay;
      document.getElementById("teColLogo").value =
        cols.logo || cols.text || "#ffffff";
      document.getElementById("teColFocusMode").value =
        cols.focusMode || cols.accent || "#6366f1";
      const overMatch = (over.color || "rgba(0,0,0,0)").match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/,
      );
      if (overMatch) {
        document.getElementById("teOverColor").value =
          `#${parseInt(overMatch[1]).toString(16).padStart(2, "0")}${parseInt(overMatch[2]).toString(16).padStart(2, "0")}${parseInt(overMatch[3]).toString(16).padStart(2, "0")}`;
        const op = overMatch[4] !== "" ? parseFloat(overMatch[4]) : 0;
        document.getElementById("teOverOpacity").value = Math.round(op * 100);
        document.getElementById("teOverOpacityVal").textContent =
          Math.round(op * 100) + "%";
      }
      _syncColorPickers();
      this._themeName = config
        ? config.name || "Untitled"
        : this._themeName || "";
      this._toggleBgGroups(bg.type);
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      this._preview();
    },

    closeEditor() {
      const modal = document.getElementById("themeEditorModal");
      if (modal) modal.classList.remove("open");
      _hoverStop();
      this._editingId = null;
      this._themeName = "";
      _stopPreviewScene();
      const active = this.load();
      if (active) this.apply(active);
      else {
        _clearCSSVars();
        _applyOverlay({ color: "rgba(0,0,0,0)" });
      }
      if (modal) modal.setAttribute("aria-hidden", "true");
    },

    async saveFromEditor() {
      const config = this._gatherForm();

      const result = this.save(config);
      if (!result) return;

      this.activate(config.id);
      this._rebuildCustomList();
      this.closeEditor();
    },

    _rebuildCustomList() {
      const containers = [
        document.getElementById("customThemeList"),
        document.getElementById("customThemeListExpanded"),
      ];
      const themes = this.list();
      const activeId = _getActiveId();
      const html = themes

        .filter((t) => t && t.id)
        .map(
          (t) => `
        <div class="te-theme-row${t.id === activeId ? " active" : ""}">
          <button type="button" class="te-theme-row-apply" data-id="${t.id}" title="Apply theme">
            <span class="te-theme-row-name">${_escapeHtml(t.name)}${t.id.startsWith("scene:") ? '<span class="te-theme-row-scene-badge">Scene</span>' : ""}</span>
            ${t.id === activeId ? '<span class="te-theme-row-active">✓ Active</span>' : ""}
          </button>
          <div class="te-theme-row-menu-wrap">
            <button type="button" class="te-theme-row-more" data-id="${t.id}" aria-label="Theme options" aria-haspopup="menu" aria-expanded="false">⋯</button>
            <div class="te-theme-row-menu">
              <button type="button" class="te-menu-item" data-action="edit" data-id="${t.id}"><svg class="uo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px" aria-hidden="true"><path d="M11 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg> Edit</button>
              <button type="button" class="te-menu-item" data-action="rename" data-id="${t.id}"><svg class="uo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> Rename</button>
              <button type="button" class="te-menu-item te-menu-item-danger" data-action="delete" data-id="${t.id}"><svg class="uo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg> Delete</button>
            </div>
          </div>
        </div>`,
        )
        .join("");
      _updateCustomActiveBadge();
      containers.forEach((c) => {
        if (!c) return;
        c.innerHTML =
          html ||
          '<p style="color:rgba(255,255,255,0.35);font-size:0.82rem;text-align:center;padding:12px 0;">No saved themes yet</p>';
        c.querySelectorAll(".te-theme-row-apply").forEach((btn) =>
          btn.addEventListener("click", () => {
            ThemeEngine.activate(btn.dataset.id);
            ThemeEngine._rebuildCustomList();
          }),
        );
        c.querySelectorAll(".te-theme-row-more").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            const isOpen = menu.classList.contains("open");
            _closeAllThemeMenus();
            if (!isOpen) {
              menu.classList.add("open");
              btn.setAttribute("aria-expanded", "true");
            }
          });
        });
        c.querySelectorAll(".te-theme-row-menu .te-menu-item").forEach(
          (item) => {
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              const action = item.dataset.action;
              const id = item.dataset.id;
              _closeAllThemeMenus();
              if (action === "edit") {
                const t = ThemeEngine.get(id);
                if (t) ThemeEngine.openEditor(t);
              } else if (action === "rename") {
                const t = ThemeEngine.get(id);
                if (!t) return;
                _promptAction(
                  "Rename theme",
                  "Theme name (max 40 chars)",
                  t.name,
                  (name) => {
                    if (!(name || "").trim()) return;
                    if (ThemeEngine.rename(t.id, name))
                      ThemeEngine._rebuildCustomList();
                    else
                      _showAlert(
                        "That name is already used by another theme. Choose a different name.",
                      );
                  },
                  "Rename",
                );
              } else if (action === "delete") {
                _confirmAction(
                  "This will remove the saved theme from your browser.",
                  () => {
                    ThemeEngine.delete(id);
                    ThemeEngine._rebuildCustomList();
                  },
                );
              }
            });
          },
        );
      });
    },

    _toggleBgGroups(type) {

      [
        "teBgSolidGroup",
        "teBgGradientGroup",
        "teBgImageGroup",
        "teBgVideoGroup",
        "teBgSceneGroup",
      ].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el)
          el.style.display =
            i === ["solid", "gradient", "image", "video", "scene"].indexOf(type)
              ? "flex"
              : "none";
      });
      if (type !== "scene") _stopPreviewScene();
    },

    previewFullscreen() {
      const config = this._gatherForm();
      if (!config) return;
      this._prevPreviewConfig = config;
      
      this._prevCustomActive = this.load();
      this._prevBuiltInTheme =
        localStorage.getItem("timerTheme") || "gradient-default";
      this.closeEditor();
      
      const analytics = document.getElementById("statisticsModal");
      if (analytics) analytics.classList.remove("open");
      const planner = document.getElementById("plannerModal");
      if (planner) planner.classList.remove("open");
      const taskPopup = document.getElementById("taskPopup");
      if (taskPopup) taskPopup.classList.remove("open");
      const themeModal = document.getElementById("themeModal");
      if (themeModal) themeModal.classList.remove("open");
      const advModalEl = document.getElementById("advancedSettingsModal");
      if (advModalEl) {
        advModalEl.classList.remove("open");
        document.body.style.overflow = "";
      }
      
      this.deactivate({ restorePreset: false });
      this.apply(config);
      
      const bar = document.getElementById("teExitPreviewBar");
      if (bar) bar.style.display = "flex";
      const btn = document.getElementById("teExitPreviewBtn");
      if (btn) btn.style.display = "inline-flex";
      document.body.classList.add("te-preview-mode-active");
    },

    exitPreview() {
      const bar = document.getElementById("teExitPreviewBar");
      if (bar) bar.style.display = "none";
      const btn = document.getElementById("teExitPreviewBtn");
      if (btn) btn.style.display = "none";
      document.body.classList.remove("te-preview-mode-active");
      this.deactivate({ restorePreset: false });
      
      if (this._prevCustomActive) {
        this.apply(this._prevCustomActive);
      } else {
        _restoreBuiltinThemeClasses();
        if (
          typeof window !== "undefined" &&
          typeof window.reapplyBuiltInTheme === "function"
        ) {
          window.reapplyBuiltInTheme(
            this._prevBuiltInTheme || "gradient-default",
          );
        }
      }
      
      const config = this._prevPreviewConfig;
      this._prevCustomActive = null;
      this._prevBuiltInTheme = null;
      this._prevPreviewConfig = null;
      setTimeout(() => this.openEditor(config), 150);
    },

    _prevPreviewConfig: null,

    async exportCurrentTheme() {
      const config = this._gatherForm();
      
      const mediaKeys = [];
      if (config.bg?.imageKey)
        mediaKeys.push({
          key: config.bg.imageKey,
          target: "imageDataUrl",
          label: "image",
        });
      if (config.bg?.videoKey)
        mediaKeys.push({
          key: config.bg.videoKey,
          target: "videoDataUrl",
          label: "video",
        });
      const mediaWarnings = [];
      await Promise.all(
        mediaKeys.map(async (m) => {
          const blob = await _readMediaBlob(m.key);
          if (!blob) {
            mediaWarnings.push(
              `Uploaded ${m.label} could not be read, so it was not included in the share link.`,
            );
            return;
          }
          const dataUrl = await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => resolve(null);
            fr.readAsDataURL(blob);
          });
          if (dataUrl) config.bg[m.target] = dataUrl;
          else
            mediaWarnings.push(
              `Uploaded ${m.label} could not be read, so it was not included in the share link.`,
            );
        }),
      );
      const payload = _cloneForSharing(config);
      if (mediaWarnings.length)
        payload._warnings = (payload._warnings || []).concat(mediaWarnings);
      if (payload._warnings && Array.isArray(payload._warnings))
        _showNotice(payload._warnings.join(" \n"), "info");
      const encoded = _encodeSharePayload(payload);
      if (encoded.length > 700 * 1024)
        _showNotice(
          "This share link is very long because it embeds media, so it may not work everywhere. Prefer sending it as a message.",
          "info",
          5000,
        );
      return encoded;
    },

    importSharedThemeString(encoded, options = {}) {
      if (!encoded) return null;
      try {
        const payload = _decodeSharePayload(encoded);
        if (!payload || typeof payload !== "object") {
          _showNotice(
            "Could not import theme: the shared string is invalid.",
            "error",
          );
          return null;
        }
        if (payload._warnings && Array.isArray(payload._warnings))
          _showNotice(payload._warnings.join(" \n"), "info");
        return _importSharedTheme(payload, options);
      } catch (e) {
        _showNotice(
          "Could not import theme: the shared string is invalid. Error: " +
            e.message,
          "error",
        );
        return null;
      }
    },

    importThemeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("theme");
      if (!encoded) return null;
      const result = this.importSharedThemeString(encoded, { keepId: true });
      /* Drop the parameter either way: a rejected link must fall back to the
         default theme instead of replaying on every reload. */
      const url = new URL(window.location.href);
      url.searchParams.delete("theme");
      window.history.replaceState({}, document.title, url.toString());
      return result;
    },

    wireEditor() {
      const modal = document.getElementById("themeEditorModal");
      if (!modal) return;
      
      document.querySelectorAll(".te-tab-btn").forEach((btn) =>
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".te-tab-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          document
            .querySelectorAll(".te-tab-pane")
            .forEach((p) => p.classList.remove("active"));
          const pane = document.querySelector(
            `.te-tab-pane[data-tab="${btn.dataset.tab}"]`,
          );
          if (pane) pane.classList.add("active");
          this._preview();
        }),
      );
      document.getElementById("teBgType").addEventListener("change", (e) => {
        this._toggleBgGroups(e.target.value);
        if (e.target.value === "scene") {

          const sid = _safeSceneId(_getSelectedSceneId());
          _sessionPick = !_featuredSceneIds.includes(sid) ? sid : null;
          _buildFeaturedShelf(sid);
          const ctx = _builderCtx();
          if (ctx) _buildSceneOptionsUI(ctx, _sceneSavedOptions);
        }
        this._preview();
      });
      
      const viewAll = document.getElementById("teViewAllBtn");
      if (viewAll)
        viewAll.addEventListener("click", () =>
          _openSceneLibrary(_getSelectedSceneId()),
        );
      const libModal = document.getElementById("teSceneLibModal");
      const libClose = document.getElementById("teSceneLibClose");
      if (libClose)
        libClose.addEventListener("click", () => {
          if (libModal) libModal.classList.remove("open");
        });
      if (libModal)
        libModal.addEventListener("click", (e) => {
          if (
            e.target === libModal ||
            e.target.classList.contains("te-scene-lib-backdrop")
          )
            libModal.classList.remove("open");
        });
      const libSearch = document.getElementById("teSceneLibSearch");
      if (libSearch)
        libSearch.addEventListener("input", () => {
          _libQuery = libSearch.value;
          _renderSceneLibGrid(_getSelectedSceneId());
        });
      document
        .querySelectorAll(
          "#teBgColor,#teGradAngle,#teGradStop0,#teGradStop1,#teColAccent,#teColText,#teColSurface,#teColSurfaceText,#teColTimer,#teColLogo,#teColFocusMode,#teOverColor,#teOverOpacity,#teVideoOpacity,#teImgSize",
        )
        .forEach((el) => {
          const refresh = () => {
            if (el.id === "teGradAngle")
              document.getElementById("teGradAngleVal").textContent =
                el.value + "°";
            if (el.id === "teOverOpacity")
              document.getElementById("teOverOpacityVal").textContent =
                el.value + "%";
            if (el.id === "teVideoOpacity")
              document.getElementById("teVideoOpacityVal").textContent =
                el.value + "%";
            this._preview();
          };
          el.addEventListener("input", refresh);
          el.addEventListener("change", refresh);
        });
      
      document.querySelectorAll(".te-color-picker").forEach((card) => {
        const inputId = card.dataset.for;
        if (!inputId) return;
        const input = document.getElementById(inputId);
        if (!input) return;
        
        card.dataset.wired = "1";
        const swatch = card.querySelector(".te-color-picker-swatch");
        const hex = card.querySelector(".te-color-picker-hex");
        card.addEventListener("click", () => input.click());
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.click();
          }
        });
        input.addEventListener("input", () => {
          if (swatch) swatch.style.background = input.value;
          if (hex) hex.textContent = input.value;
        });
        
        if (swatch) swatch.style.background = input.value;
        if (hex) hex.textContent = input.value;
      });
      const imgUrlInput = document.getElementById("teImgUrl");
      imgUrlInput.addEventListener("input", () => {
        const preview = document.getElementById("teImgPreview"),
          img = document.getElementById("teImgPreviewEl"),
          val = imgUrlInput.value;
        if (imgUrlInput.dataset.objectUrl)
          _revokeObjectUrl(imgUrlInput.dataset.objectUrl);
        delete imgUrlInput.dataset.objectUrl;
        delete imgUrlInput.dataset.dataUrl;
        delete imgUrlInput.dataset.mediaKey;
        if (val) {
          img.src = val;
          preview.style.display = "block";
        } else preview.style.display = "none";
        this._preview();
      });
      document
        .getElementById("teImgUpload")
        .addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const urlInput = document.getElementById("teImgUrl");
          if (urlInput.dataset.objectUrl)
            _revokeObjectUrl(urlInput.dataset.objectUrl);
          delete urlInput.dataset.dataUrl;
          delete urlInput.dataset.mediaKey;
          const mediaKey = _makeBlobKey(
            this._editingId || `ct_${Date.now()}`,
            "image",
          );
          const objectUrl = URL.createObjectURL(file);
          urlInput.dataset.objectUrl = objectUrl;
          urlInput.dataset.mediaKey = mediaKey;
          urlInput.value = objectUrl;
          document.getElementById("teImgPreviewEl").src = objectUrl;
          document.getElementById("teImgPreview").style.display = "block";
          _checkImageResolution(file);
          const stored = await _storeMediaBlob(mediaKey, file);
          if (!stored)
            _showNotice(
              "Image upload failed to save. Use a URL instead or try a smaller file.",
              "error",
            );
          e.target.value = "";
          this._preview();
        });
      const videoUrlInput = document.getElementById("teVideoUrl");
      videoUrlInput.addEventListener("input", () => {
        if (videoUrlInput.dataset.objectUrl)
          _revokeObjectUrl(videoUrlInput.dataset.objectUrl);
        delete videoUrlInput.dataset.objectUrl;
        delete videoUrlInput.dataset.dataUrl;
        delete videoUrlInput.dataset.mediaKey;
        this._preview();
      });
      document
        .getElementById("teVideoUpload")
        .addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const urlInput = document.getElementById("teVideoUrl");
          if (urlInput.dataset.objectUrl)
            _revokeObjectUrl(urlInput.dataset.objectUrl);
          delete urlInput.dataset.dataUrl;
          delete urlInput.dataset.mediaKey;
          const mediaKey = _makeBlobKey(
            this._editingId || `ct_${Date.now()}`,
            "video",
          );
          const objectUrl = URL.createObjectURL(file);
          urlInput.dataset.objectUrl = objectUrl;
          urlInput.dataset.mediaKey = mediaKey;
          urlInput.value = objectUrl;
          const stored = await _storeMediaBlob(mediaKey, file);
          if (!stored)
            _showNotice(
              "Video upload failed to save. Use a URL instead or try a smaller file.",
              "error",
            );
          e.target.value = "";
          this._preview();
        });

      document
        .getElementById("teSaveBtn")
        .addEventListener("click", () => this.saveFromEditor());
      document
        .getElementById("teCancelBtn")
        .addEventListener("click", () => this.closeEditor());
      document
        .getElementById("teCloseBtn")
        .addEventListener("click", () => this.closeEditor());
      const exportBtn = document.getElementById("teExportBtn");
      if (exportBtn)
        exportBtn.addEventListener("click", async () => {
          const encoded = await this.exportCurrentTheme();
          const shareUrl = `${window.location.origin}${window.location.pathname}?theme=${encoded}`;
          try {
            await navigator.clipboard.writeText(shareUrl);
            _showNotice("Share link copied to clipboard.", "success");
          } catch {
            _showShareLink(shareUrl);
          }
        });
      const importBtn = document.getElementById("teImportBtn");
      if (importBtn)
        importBtn.addEventListener("click", () => {
          _promptAction(
            "Import Theme",
            "Paste theme link or encoded string...",
            "",
            (input) => {
              if (!input) return;
              let encoded = input.trim();
              try {
                const parsed = new URL(encoded);
                const fromSearch = parsed.searchParams.get("theme");
                if (fromSearch) encoded = fromSearch;
              } catch {}
              try {
                const payload = _decodeSharePayload(encoded);
                if (!payload || typeof payload !== "object") {
                  _showNotice(
                    "Could not import theme: the shared string is invalid.",
                    "error",
                  );
                  return;
                }
                if (payload._warnings && Array.isArray(payload._warnings))
                  _showNotice(payload._warnings.join(" \n"), "info");
                const safePayload = _sanitizeShareConfig(payload);
                if (!safePayload) {
                  _showNotice(
                    "Could not import theme: the shared string is invalid.",
                    "error",
                  );
                  return;
                }
                _choiceAction(
                  "Import theme",
                  `Found "${safePayload.name}". How do you want to import it?`,
                  [
                    {
                      label: "Load into current theme",
                      value: "current",
                      primary: true,
                    },
                    { label: "Save as new theme", value: "new" },
                  ],
                  (choice) => {
                    if (choice === "new") {
                      _importSharedTheme(safePayload, {});
                    } else {
                      
                      const keepId = this._editingId;
                      const keepName = this._themeName;
                      this.openEditor(safePayload);
                      this._editingId = keepId;
                      this._themeName = keepName;
                      _showNotice(
                        `Loaded settings from "${safePayload.name}" into this theme, review, then press Save.`,
                        "success",
                        3000,
                      );
                    }
                  },
                );
              } catch (e) {
                _showNotice(
                  "Could not import theme: the shared string is invalid. Error: " +
                    e.message,
                  "error",
                );
              }
            },
            "Import",
          );
        });
      const tryNewTheme = () => {
        if (_getAll().length >= MAX_THEMES) {
          _showAlert(
            `Maximum of ${MAX_THEMES} custom themes reached. Delete one first.`,
          );
          return;
        }
        _promptAction(
          "Name your theme",
          "Theme name (max 40 chars)",
          "",
          (name) => {
            name = (name || "").trim().slice(0, 40) || "Untitled";
            if (
              _getAll().some(
                (t) =>
                  (t.name || "").trim().toLowerCase() === name.toLowerCase(),
              )
            ) {
              _showAlert(
                `A theme named "${name}" already exists. Choose a different name.`,
              );
              return;
            }
            this._themeName = name;
            this.openEditor(null);
          },
          "Create",
        );
      };
      const newBtn = document.getElementById("newThemeBtn");
      if (newBtn) newBtn.addEventListener("click", tryNewTheme);
      const newBtnExpanded = document.getElementById("newThemeBtnExpanded");
      if (newBtnExpanded) newBtnExpanded.addEventListener("click", tryNewTheme);
      const previewBtn = document.getElementById("tePreviewBtn");
      if (previewBtn)
        previewBtn.addEventListener("click", () => this.previewFullscreen());
      const moreBtn = document.getElementById("teMoreBtn");
      const footerMenu = document.getElementById("teFooterMenu");
      if (moreBtn && footerMenu) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          footerMenu.classList.toggle("open");
        });
        document.addEventListener("click", (e) => {
          if (
            footerMenu.classList.contains("open") &&
            !e.target.closest(".te-footer-menu-wrap")
          )
            footerMenu.classList.remove("open");
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && footerMenu.classList.contains("open")) {
            e.stopImmediatePropagation();
            footerMenu.classList.remove("open");
          }
        });
        footerMenu
          .querySelectorAll(".te-menu-item")
          .forEach((item) =>
            item.addEventListener("click", () =>
              footerMenu.classList.remove("open"),
            ),
          );
      }
      
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".te-theme-row-menu-wrap")) _closeAllThemeMenus();
      });
      
      document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          document.querySelector(".te-theme-row-menu.open")
        ) {
          e.stopImmediatePropagation();
          _closeAllThemeMenus();
        }
      });
      const exitPreviewBtn = document.getElementById("teExitPreviewBtn");
      if (exitPreviewBtn)
        exitPreviewBtn.addEventListener("click", () => this.exitPreview());
      this._rebuildCustomList();
      _wireAutoDetect();
      _wireTooltips();

      _sceneSavedOptions = {};
      _buildFeaturedShelf("particles");
      modal
        .querySelector(".te-backdrop")
        .addEventListener("click", () => this.closeEditor());
    },
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (typeof ThemeEngine === "undefined") return;
  ThemeEngine.importThemeFromUrl();
  ThemeEngine.init();
  ThemeEngine.wireEditor();
});

ThemeEngine.getActiveCustomThemeConfig = function () {
  const id = localStorage.getItem("activeCustomThemeId");
  if (!id) return null;
  try {
    const list = JSON.parse(localStorage.getItem("customThemes") || "[]");
    return list.find((t) => t.id === id) || null;
  } catch {
    return null;
  }
};

const SCENE_LIB_KEY = "sceneLibraryState";
function _getNativeSceneState() {
  try {
    return JSON.parse(localStorage.getItem(SCENE_LIB_KEY) || "null");
  } catch {
    return null;
  }
}
ThemeEngine.getNativeSceneState = _getNativeSceneState;

function _tlAutoDetectEnabled() {
  try {
    return localStorage.getItem("tlAutoDetectColors") !== "0";
  } catch (e) {
    return true;
  }
}
ThemeEngine._tlAutoDetectEnabled = _tlAutoDetectEnabled;

ThemeEngine._queueNativeScenePalette = _queueNativeScenePalette;

function _queueNativeScenePalette(sceneId, sceneOptions, sceneBgColor) {
  const token = ++ThemeEngine._paletteToken;

  /* Colour detection reads the scene's own defaults, so wait for its file
     when the scene was still loading (lazy scene chunks). */
  const sceneReady =
    typeof ThemeScenes !== "undefined" && typeof ThemeScenes.ensure === "function"
      ? ThemeScenes.ensure(sceneId)
      : Promise.resolve(true);
  const painted = new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") return setTimeout(resolve, 150);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(resolve, 60)),
    );
  });
  Promise.all([sceneReady, painted])
    .then(() =>
      ThemeEngine.applyBackgroundPalette(
        {
          type: "scene",
          sceneId,
          sceneOptions: sceneOptions || {},
          sceneBgColor: sceneBgColor || "",
        },
        token,
      ),
    )
    .then((colors) => {
      if (!colors) return;
      const st = _getNativeSceneState();
      if (!st || st.sceneId !== sceneId) return;
      if (typeof ThemeEngine.refreshThemeLibraryPanel === "function")
        ThemeEngine.refreshThemeLibraryPanel();
    })
    .catch(() => {});
}

function _persistNativeScene(sceneId, sceneOptions, sceneBgColor) {
  try {
    localStorage.setItem(
      SCENE_LIB_KEY,
      JSON.stringify({
        sceneId,
        sceneOptions: sceneOptions || {},
        sceneBgColor: sceneBgColor || "",
      }),
    );
  } catch (e) {}
}
ThemeEngine._persistNativeScene = _persistNativeScene;
ThemeEngine.applyNativeScene = function (sceneId, sceneOptions, sceneBgColor) {
  if (typeof ThemeScenes === "undefined") return null;
  if (!ThemeScenes.get(sceneId)) {
    /* A saved theme can name a scene whose file has not been fetched yet.
       Pull it in, then re-enter once — the second call finds it registered. */
    if (
      typeof ThemeScenes.has === "function" &&
      ThemeScenes.has(sceneId) &&
      typeof ThemeScenes.ensure === "function"
    )
      ThemeScenes.ensure(sceneId).then((ok) => {
        if (ok && ThemeScenes.get(sceneId))
          ThemeEngine.applyNativeScene(sceneId, sceneOptions, sceneBgColor);
      });
    return null;
  }

  if (
    typeof ThemeEngine.getActiveCustomThemeConfig === "function" &&
    ThemeEngine.getActiveCustomThemeConfig()
  )
    ThemeEngine.deactivate({ restorePreset: false });
  ThemeEngine._removeBuiltinThemeClasses();
  document
    .querySelectorAll(".theme-option.active")
    .forEach((o) => o.classList.remove("active"));

  document.body.style.background = "transparent";
  const timerContainerEl = document.getElementById("timerContainer");
  if (timerContainerEl) timerContainerEl.style.background = "transparent";
  if (
    typeof window !== "undefined" &&
    typeof window.stopThemeAnimations === "function"
  )
    window.stopThemeAnimations();
  const canvasEl = document.getElementById("bgCanvas");
  const opts = {
    ...(sceneOptions || {}),
    bgColor: sceneBgColor || null,
  };
  if (canvasEl) {
    canvasEl.style.backgroundColor = sceneBgColor || "";
    ThemeScenes.start(sceneId, opts, canvasEl);
  }
  document.body.classList.remove(ThemeEngine.BODY_CLASS); 
  document.body.classList.add("scene-library-active");

  try {
    localStorage.setItem(
      SCENE_LIB_KEY,
      JSON.stringify({
        sceneId,
        sceneOptions: sceneOptions || {},
        sceneBgColor: sceneBgColor || "",
      }),
    );
  } catch (e) {}
  if (_tlAutoDetectEnabled())
    _queueNativeScenePalette(sceneId, sceneOptions, sceneBgColor);
  else ThemeEngine.applyNativePresetPalette();
  return _getNativeSceneState();
};
ThemeEngine.updateNativeSceneOptions = function (sceneOptions, sceneBgColor) {
  const st = _getNativeSceneState();
  if (!st) return null;
  const canvasEl = document.getElementById("bgCanvas");
  const opts = {
    ...(sceneOptions || {}),
    bgColor: sceneBgColor || null,
  };

  if (canvasEl && ThemeScenes.isActiveCanvas(canvasEl)) {
    canvasEl.style.backgroundColor = sceneBgColor || "";
    ThemeScenes.updateOptions(opts);
    _persistNativeScene(st.sceneId, sceneOptions, sceneBgColor);
    
    if (_tlAutoDetectEnabled())
      _queueNativeScenePalette(st.sceneId, sceneOptions, sceneBgColor);
    else
      ThemeEngine.applyNativePresetPalette();
    return _getNativeSceneState();
  }
  return this.applyNativeScene(st.sceneId, sceneOptions, sceneBgColor);
};
ThemeEngine.deactivateNativeScene = function () {
  localStorage.removeItem(SCENE_LIB_KEY);
  document.body.classList.remove("scene-library-active");

  ThemeEngine._paletteToken++;
  document.body.classList.remove(ThemeEngine.BODY_CLASS);
  if (typeof ThemeEngine._clearCSSVars === "function") ThemeEngine._clearCSSVars();
  const canvasEl = document.getElementById("bgCanvas");
  if (canvasEl) canvasEl.style.backgroundColor = "";
  if (typeof ThemeScenes !== "undefined") ThemeScenes.stop();

  document.body.style.background = "";
  const timerContainerEl = document.getElementById("timerContainer");
  if (timerContainerEl) timerContainerEl.style.background = "";

  if (typeof ThemeEngine.discardThemeLibrarySelection === "function")
    ThemeEngine.discardThemeLibrarySelection();
  if (typeof ThemeEngine.refreshThemeLibraryPanel === "function")
    ThemeEngine.refreshThemeLibraryPanel();
};

/* Boot-time scene fetch. Only the scene that is actually on screen is pulled
   in before the first theme paint, plus "particles" (the fallback the engine
   degrades to). Visitors on a built-in gradient theme resolve immediately and
   never download a scene file; the rest of the library waits for a picker. */
ThemeEngine.scenesReady = (function () {
  if (
    typeof ThemeScenes === "undefined" ||
    typeof ThemeScenes.ensureAll !== "function"
  )
    return Promise.resolve(false);
  const ids = new Set();
  try {
    const st =
      typeof ThemeEngine.getNativeSceneState === "function"
        ? ThemeEngine.getNativeSceneState()
        : null;
    if (st && st.sceneId) ids.add(st.sceneId);
  } catch (e) {}
  try {
    const custom =
      typeof ThemeEngine.getActiveCustomThemeConfig === "function"
        ? ThemeEngine.getActiveCustomThemeConfig()
        : null;
    if (custom && custom.bg && custom.bg.type === "scene" && custom.bg.sceneId)
      ids.add(custom.bg.sceneId);
  } catch (e) {}
  return ThemeScenes.ensureAll(Array.from(ids)).catch(() => false);
})();
