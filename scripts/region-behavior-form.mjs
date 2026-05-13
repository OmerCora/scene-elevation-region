import {
  MODULE_ID,
  SCENE_SETTING_KEYS,
  ELEVATION_PRESETS,
  BLEND_MODES,
  EDGE_STRETCH_LIMITS,
  edgeStretchPercentValue,
  elevationPresetValues,
  getSceneElevationSetting
} from "./config.mjs";

const REGION_PRESET_FIELD_MAP = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "parallaxStrengthOverride",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "parallaxHeightContrastOverride",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: "parallaxModeOverride",
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: "perspectivePointOverride",
  [SCENE_SETTING_KEYS.BLEND_MODE]: "blendModeOverride",
  [SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT]: "edgeStretchPercentOverride",
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "overlayScaleOverride",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: "shadowModeOverride",
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "shadowLengthOverride",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: "depthScaleOverride"
});

const REGION_PRESET_CONTROL_FIELDS = new Set(Object.values(REGION_PRESET_FIELD_MAP));
const REGION_SCENE_SETTING_RESET_FIELDS = new Set([...REGION_PRESET_CONTROL_FIELDS, "elevationScaleOverride"]);

export function enhanceRegionBehaviorConfigForm(app, html) {
  const root = _renderedHtmlElement(html) ?? app?.element;
  if (!root?.querySelectorAll) return;
  _insertRegionDividerAfterField(root, "underOverheadMode", `${MODULE_ID}-region-settings-divider`);
  _insertRegionDividerAfterField(root, "depthScaleOverride", `${MODULE_ID}-region-settings-preset-end-divider`);
  _enhanceRegionEdgeStretchControl(root);
  _syncRegionEdgeStretchVisibility(root);
  _wireRegionPresetControls(root);
  app?.setPosition?.({ height: "auto" });
}

function _insertRegionDividerAfterField(root, fieldName, className) {
  const fields = root.querySelectorAll(`[name="system.${fieldName}"], [name$=".${fieldName}"]`);
  for (const field of fields) {
    const formGroup = field.closest?.(".form-group") ?? field.parentElement;
    if (!formGroup || formGroup.nextElementSibling?.classList?.contains(className)) continue;
    const divider = document.createElement("div");
    divider.className = className;
    divider.setAttribute("aria-hidden", "true");
    formGroup.after(divider);
  }
}

function _renderedHtmlElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function _wireRegionPresetControls(root) {
  const presetField = _regionBehaviorField(root, "presetOverride");
  if (!presetField) return;
  const form = presetField.closest?.("form") ?? root;
  if (!form || form.dataset.sceneElevationPresetWired) return;
  form.dataset.sceneElevationPresetWired = "true";
  form.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const fieldName = _regionBehaviorFieldName(target.name);
    if (fieldName === "presetOverride") {
      if (!target.value) {
        for (const overrideField of REGION_SCENE_SETTING_RESET_FIELDS) {
          const el = _regionBehaviorField(root, overrideField);
          if (el) el.value = "";
        }
      }
      _applyRegionPresetToForm(root, target.value);
      _syncRegionEdgeStretchControl(root);
      _syncRegionEdgeStretchVisibility(root);
      return;
    }
    if (REGION_PRESET_CONTROL_FIELDS.has(fieldName)) {
      const currentPresetField = _regionBehaviorField(root, "presetOverride");
      if (currentPresetField && currentPresetField.value !== ELEVATION_PRESETS.CUSTOM) currentPresetField.value = ELEVATION_PRESETS.CUSTOM;
    }
    _syncRegionEdgeStretchVisibility(root);
  });
}

function _applyRegionPresetToForm(root, presetKey) {
  const values = elevationPresetValues(presetKey, canvas?.scene);
  if (!values) return;
  for (const [settingKey, fieldName] of Object.entries(REGION_PRESET_FIELD_MAP)) {
    const field = _regionBehaviorField(root, fieldName);
    if (!field || values[settingKey] === undefined) continue;
    field.value = values[settingKey];
  }
  const edgeStretchField = _regionBehaviorField(root, "edgeStretchPercentOverride");
  if (edgeStretchField && values[SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT] === undefined) edgeStretchField.value = String(EDGE_STRETCH_LIMITS.DEFAULT);
  _syncRegionEdgeStretchControl(root);
  _syncRegionEdgeStretchVisibility(root);
}

function _enhanceRegionEdgeStretchControl(root) {
  const field = _regionBehaviorField(root, "edgeStretchPercentOverride");
  if (!(field instanceof HTMLInputElement)) return;
  const formGroup = field.closest?.(".form-group") ?? field.parentElement;
  if (!formGroup) return;
  formGroup.dataset.sceneElevationEdgeStretchPercent = "true";
  if (formGroup.dataset.sceneElevationEdgeStretchEnhanced) {
    _syncRegionEdgeStretchControl(root);
    return;
  }
  formGroup.dataset.sceneElevationEdgeStretchEnhanced = "true";
  field.type = "hidden";
  const value = _regionEdgeStretchDisplayValue(root, field);
  const control = document.createElement("div");
  control.style.display = "grid";
  control.style.gridTemplateColumns = "1fr 4ch";
  control.style.gap = "8px";
  control.style.alignItems = "center";
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(EDGE_STRETCH_LIMITS.MIN);
  range.max = String(EDGE_STRETCH_LIMITS.MAX);
  range.step = String(EDGE_STRETCH_LIMITS.STEP);
  range.value = String(value);
  range.dataset.sceneElevationEdgeStretchRange = "true";
  const output = document.createElement("output");
  output.dataset.sceneElevationEdgeStretchOutput = "true";
  output.value = String(value);
  output.textContent = String(value);
  control.append(range, output);
  field.after(control);
  range.addEventListener("input", () => {
    const next = String(edgeStretchPercentValue(range.value));
    range.value = next;
    output.value = next;
    output.textContent = next;
    field.value = next;
  });
  range.addEventListener("change", () => {
    field.value = String(edgeStretchPercentValue(range.value));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function _syncRegionEdgeStretchControl(root) {
  const field = _regionBehaviorField(root, "edgeStretchPercentOverride");
  if (!(field instanceof HTMLInputElement)) return;
  const formGroup = field.closest?.(".form-group") ?? field.parentElement;
  const range = formGroup?.querySelector?.("[data-scene-elevation-edge-stretch-range]");
  const output = formGroup?.querySelector?.("[data-scene-elevation-edge-stretch-output]");
  if (!(range instanceof HTMLInputElement)) return;
  const value = String(_regionEdgeStretchDisplayValue(root, field));
  range.value = value;
  if (output instanceof HTMLOutputElement) {
    output.value = value;
    output.textContent = value;
  }
}

function _syncRegionEdgeStretchVisibility(root) {
  const field = _regionBehaviorField(root, "edgeStretchPercentOverride");
  const formGroup = field?.closest?.(".form-group") ?? field?.parentElement;
  if (!formGroup) return;
  formGroup.hidden = _regionEffectiveBlendMode(root) !== BLEND_MODES.EDGE_STRETCH;
}

function _regionEffectiveBlendMode(root) {
  const presetField = _regionBehaviorField(root, "presetOverride");
  const presetValues = elevationPresetValues(presetField?.value, canvas?.scene);
  if (presetValues?.[SCENE_SETTING_KEYS.BLEND_MODE]) return presetValues[SCENE_SETTING_KEYS.BLEND_MODE];
  const blendField = _regionBehaviorField(root, "blendModeOverride");
  const blendOverride = String(blendField?.value ?? "");
  return blendOverride || String(getSceneElevationSetting(SCENE_SETTING_KEYS.BLEND_MODE) ?? "");
}

function _regionEdgeStretchDisplayValue(root, field) {
  const override = _regionEdgeStretchOverrideValue(field?.value);
  if (override !== null) return override;
  const presetField = _regionBehaviorField(root, "presetOverride");
  const presetValue = elevationPresetValues(presetField?.value, canvas?.scene)?.[SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT];
  if (presetValue !== undefined) return edgeStretchPercentValue(presetValue);
  return edgeStretchPercentValue(getSceneElevationSetting(SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT));
}

function _regionEdgeStretchOverrideValue(value) {
  const text = String(value ?? "").trim();
  return text ? edgeStretchPercentValue(text) : null;
}

function _regionBehaviorField(root, fieldName) {
  return root.querySelector(`[name="system.${fieldName}"], [name$=".${fieldName}"]`);
}

function _regionBehaviorFieldName(name) {
  const parts = String(name ?? "").split(".");
  return parts[parts.length - 1] ?? "";
}