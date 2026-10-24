// Theme save/load helpers.
const ThemeStorageManager = {
  defaultConfig: {
    id: "",
    name: "New Preset",
    createdAt: new Date().toISOString(),
    bg: {
      type: "solid",
      color: "#1a1a2e",
      gradAngle: 0,
      gradStops: [
        { color: "#1a1a2e", pos: 0 },
        { color: "#16213e", pos: 100 },
      ],
      imageDataUrl: "",
      imageUrl: "",
      imageSize: "cover",
      imagePos: "center center",
      videoUrl: "",
      videoDataUrl: "",
      videoOpacity: 1,
      sceneId: "",
      sceneOptions: {},
    },
    colors: {
      accent: "#e94560",
      text: "#ffffff",
      surface: "#16213e",
      surfaceText: "#ffffff",
      timerDisplay: "#ffffff",
    },
    overlay: {
      color: "rgba(0,0,0,0)",
    },
  },

  loadPresets() {
    try {
      const raw = localStorage.getItem("themePresets");
      if (!raw) return [];
      const presets = JSON.parse(raw);
      if (!Array.isArray(presets)) return [];
      return presets;
    } catch {
      return [];
    }
  },

  _savePresets(presets) {
    localStorage.setItem("themePresets", JSON.stringify(presets));
  },

  savePreset(config) {
    if (!config || typeof config !== "object") return false;

    const preset = { ...this.defaultConfig };
    
    Object.assign(preset, config);
    if (config.bg) Object.assign(preset.bg, this.defaultConfig.bg, config.bg);
    if (config.colors)
      Object.assign(preset.colors, this.defaultConfig.colors, config.colors);
    if (config.overlay)
      Object.assign(preset.overlay, this.defaultConfig.overlay, config.overlay);

    if (!preset.id || preset.id === "") {
      preset.id =
        "preset_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    }
    if (!preset.createdAt) {
      preset.createdAt = new Date().toISOString();
    }
    
    if (!preset.name || typeof preset.name !== "string") {
      preset.name = "Unnamed";
    }

    const presets = this.loadPresets();
    
    const index = presets.findIndex((p) => p.name === preset.name);
    if (index !== -1) {
      presets[index] = preset;
    } else {
      presets.push(preset);
    }
    this._savePresets(presets);
    return true;
  },

  loadPreset(name) {
    if (!name) return null;
    const presets = this.loadPresets();
    return presets.find((p) => p.name === name) || null;
  },

  deletePreset(name) {
    if (!name) return false;
    const presets = this.loadPresets();
    const filtered = presets.filter((p) => p.name !== name);
    if (filtered.length === presets.length) return false; 
    this._savePresets(filtered);
    return true;
  },

  listPresetNames() {
    return this.loadPresets().map((p) => p.name);
  },

  clearAll() {
    this._savePresets([]);
  },
};
