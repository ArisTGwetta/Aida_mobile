// Local display preferences for readability across different providers and environments.
(function () {
  const STORAGE_KEY = "AIDA_DISPLAY_SETTINGS_V1";
  const DEFAULTS = { fontScale: 100, contrast: 100, borderStrength: 58, providerTint: 20, starfield: true, tint: "none" };

  function clamp(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
  }

  function normalize(value = {}) {
    return {
      fontScale: clamp(value.fontScale, 85, 135, DEFAULTS.fontScale),
      contrast: clamp(value.contrast, 85, 135, DEFAULTS.contrast),
      borderStrength: clamp(value.borderStrength, 20, 100, DEFAULTS.borderStrength),
      providerTint: clamp(value.providerTint, 0, 75, DEFAULTS.providerTint),
      starfield: value.starfield !== false,
      tint: ["none", "cool", "warm", "green"].includes(value.tint) ? value.tint : "none"
    };
  }

  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); }
    catch (_) { return { ...DEFAULTS }; }
  }

  function apply(value) {
    const settings = normalize(value);
    const root = document.documentElement;
    root.style.setProperty("--aida-font-scale", String(settings.fontScale / 100));
    root.style.setProperty("--aida-contrast", `${settings.contrast}%`);
    root.style.setProperty("--aida-border-strength", String(settings.borderStrength / 100));
    root.style.setProperty("--aida-provider-tint", String(settings.providerTint / 100));
    root.style.setProperty("--aida-surface-tint", { none: "transparent", cool: "rgba(0, 126, 154, 0.12)", warm: "rgba(146, 72, 12, 0.10)", green: "rgba(0, 104, 55, 0.10)" }[settings.tint]);
    root.dataset.aidaStarfield = settings.starfield ? "on" : "off";
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
    return settings;
  }

  function range(label, key, min, max, settings) {
    return `<label class="display-setting"><span class="display-setting-label">${label}<output class="display-setting-value" data-value-for="${key}">${settings[key]}%</output></span><input type="range" name="${key}" min="${min}" max="${max}" value="${settings[key]}"></label>`;
  }

  function ensurePanel() {
    if (document.getElementById("display-settings")) return;
    const settings = apply(read());
    const backdrop = document.createElement("div");
    backdrop.id = "display-settings-backdrop";
    backdrop.hidden = true;
    const panel = document.createElement("section");
    panel.id = "display-settings";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Display settings");
    panel.innerHTML = `<div class="display-settings-header"><h2 class="display-settings-title">Display</h2><button class="display-settings-close" type="button">Close</button></div><div class="display-settings-grid">${range("Font size", "fontScale", 85, 135, settings)}${range("Contrast", "contrast", 85, 135, settings)}${range("Border strength", "borderStrength", 20, 100, settings)}${range("Provider tint", "providerTint", 0, 75, settings)}<label class="display-setting"><span class="display-setting-label">Overall tint</span><select name="tint"><option value="none">None</option><option value="cool">Cool cyan</option><option value="warm">Warm amber</option><option value="green">Soft green</option></select></label><label class="display-setting-toggle"><input type="checkbox" name="starfield"> Starfield</label></div><div class="display-settings-actions"><button class="display-settings-reset" type="button">Reset display</button></div>`;
    document.body.append(backdrop, panel);
    panel.querySelector('[name="tint"]').value = settings.tint;
    panel.querySelector('[name="starfield"]').checked = settings.starfield;
    const close = () => { panel.hidden = true; backdrop.hidden = true; };
    const sync = () => {
      const applied = apply({
        fontScale: panel.querySelector('[name="fontScale"]').value,
        contrast: panel.querySelector('[name="contrast"]').value,
        borderStrength: panel.querySelector('[name="borderStrength"]').value,
        providerTint: panel.querySelector('[name="providerTint"]').value,
        tint: panel.querySelector('[name="tint"]').value,
        starfield: panel.querySelector('[name="starfield"]').checked
      });
      Object.entries(applied).forEach(([key, value]) => {
        const output = panel.querySelector(`[data-value-for="${key}"]`);
        if (output) output.value = `${value}%`;
      });
    };
    panel.addEventListener("input", sync);
    panel.addEventListener("change", sync);
    panel.querySelector(".display-settings-close").addEventListener("click", close);
    panel.querySelector(".display-settings-reset").addEventListener("click", () => {
      const reset = apply(DEFAULTS);
      ["fontScale", "contrast", "borderStrength", "providerTint"].forEach((key) => { panel.querySelector(`[name="${key}"]`).value = reset[key]; });
      panel.querySelector('[name="tint"]').value = reset.tint;
      panel.querySelector('[name="starfield"]').checked = reset.starfield;
      sync();
    });
    backdrop.addEventListener("click", close);
  }

  function open() {
    ensurePanel();
    document.getElementById("display-settings").hidden = false;
    document.getElementById("display-settings-backdrop").hidden = false;
  }

  function install() {
    apply(read());
    ensurePanel();
    document.querySelectorAll("#theme-btn").forEach((button) => button.addEventListener("click", open));
  }

  window.AIDA_VISUAL_SETTINGS = { apply, current: read, open };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
