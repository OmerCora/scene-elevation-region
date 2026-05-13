import {
  MODULE_ID,
  SCENE_SETTING_KEYS,
  PARALLAX_STRENGTHS,
  PARALLAX_HEIGHT_CONTRASTS,
  PARALLAX_MODES,
  PERSPECTIVE_POINTS,
  BLEND_MODES,
  OVERLAY_SCALE_STRENGTHS,
  SHADOW_MODES,
  SHADOW_LENGTHS,
  TOKEN_ELEVATION_MODES,
  TOKEN_SCALING_MODES,
  DEPTH_SCALES,
  ELEVATION_SCALE_LIMITS,
  EDGE_STRETCH_LIMITS,
  TOKEN_SCALE_PER_ELEVATION_LIMITS,
  ELEVATION_PRESETS,
  ELEVATION_PRESET_SETTING_KEYS,
  elevationScaleValue,
  edgeStretchPercentValue,
  elevationPresetKey,
  elevationPresetValues,
  elevationDefaultSettings,
  getSceneElevationSettings,
  parallaxHeightContrastKey,
  shadowLengthKey,
  tokenScalePerElevationValue,
  tokenScalingModeValue,
  setSceneElevationSettings
} from "./config.mjs";
import { SCENE_SETTING_SELECT_GROUPS } from "./choices.mjs";

export async function openSceneElevationSettingsDialog(scene = canvas?.scene) {
  if (!scene) return;
  const existing = foundry.applications.instances.get(`${MODULE_ID}-settings-dialog`);
  if (existing?.rendered) {
    await existing.close();
    return;
  }
  const dialog = new SceneElevationSettingsDialog(scene);
  await dialog.render({ force: true });
  return dialog;
}

class SceneElevationSettingsDialog extends foundry.applications.api.DialogV2 {
  constructor(scene) {
    super({
      id: `${MODULE_ID}-settings-dialog`,
      classes: [MODULE_ID, `${MODULE_ID}-scene-settings-dialog`],
      window: { title: game.i18n.localize("SCENE_ELEVATION.SceneSettings.Title"), resizable: true },
      position: { width: 600, height: 620 },
      content: `<div class="${MODULE_ID}-scene-settings-scroll">${_settingsForm(getSceneElevationSettings(scene))}</div>`,
      buttons: [{ action: "close", label: game.i18n.localize("Close"), icon: "fa-solid fa-check", default: true }]
    });
    this.scene = scene;
    this._queueApplyFormSettings = foundry.utils.debounce(() => void this._applyFormSettings(), 120);
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const form = this.element.querySelector("form");
    if (!form) return;
    form.addEventListener("change", event => {
      this._syncPresetFields(form, event.target);
      _syncEdgeStretchVisibility(form);
      _syncTokenScalingModeVisibility(form);
      void this._applyFormSettings();
    });
    form.addEventListener("input", event => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (event.target.type === "range") _syncRangeOutput(form, event.target);
      if (["number", "range"].includes(event.target.type)) this._queueApplyFormSettings();
    });
    form.querySelector('[data-action="setDefault"]')?.addEventListener("click", event => {
      event.preventDefault();
      void this._setToDefault();
    });
    _syncEdgeStretchVisibility(form);
    _syncTokenScalingModeVisibility(form);
  }

  _syncPresetFields(form, target) {
    const field = target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target : null;
    if (!field?.name) return;
    if (field.name === SCENE_SETTING_KEYS.PRESET) {
      _applyPresetToSettingsForm(form, field.value, this.scene);
      return;
    }
    if (ELEVATION_PRESET_SETTING_KEYS.includes(field.name)) _setSettingsFormPreset(form, ELEVATION_PRESETS.CUSTOM);
  }

  async _applyFormSettings() {
    const scene = this.scene;
    const form = this.element.querySelector("form");
    if (!scene || !form) return;
    const data = new FormData(form);
    await setSceneElevationSettings(scene, _formSettings(data, getSceneElevationSettings(scene), scene));
  }

  async _setToDefault() {
    const scene = this.scene;
    const form = this.element.querySelector("form");
    if (!scene || !form) return;
    const defaults = elevationDefaultSettings(scene);
    await setSceneElevationSettings(scene, defaults);
    _populateSettingsForm(form, defaults);
    ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.SceneSettings.DefaultsApplied"));
  }
}

function _settingsForm(settings) {
  return `<form class="${MODULE_ID}-scene-settings">
    <button type="button" data-action="setDefault" style="margin-bottom: 4px; width: 100%;"><i class="fa-solid fa-rotate-left"></i> ${game.i18n.localize("SCENE_ELEVATION.SceneSettings.SetToDefault")}</button>
    ${_selectField(SCENE_SETTING_KEYS.PRESET, "SCENE_ELEVATION.Settings.Preset", settings)}
    <div class="${MODULE_ID}-scene-settings-divider" aria-hidden="true"></div>
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX, "SCENE_ELEVATION.Settings.Parallax", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST, "SCENE_ELEVATION.Settings.ParallaxHeightContrast", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX_MODE, "SCENE_ELEVATION.Settings.ParallaxMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PERSPECTIVE_POINT, "SCENE_ELEVATION.Settings.PerspectivePoint", settings)}
    ${_selectField(SCENE_SETTING_KEYS.BLEND_MODE, "SCENE_ELEVATION.Settings.TransitionMode", settings)}
    ${_edgeStretchRangeField(settings)}
    ${_selectField(SCENE_SETTING_KEYS.OVERLAY_SCALE, "SCENE_ELEVATION.Settings.OverlayScale", settings)}
    ${_selectField(SCENE_SETTING_KEYS.SHADOW_MODE, "SCENE_ELEVATION.Settings.ShadowMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.SHADOW_LENGTH, "SCENE_ELEVATION.Settings.ShadowLength", settings)}
    ${_selectField(SCENE_SETTING_KEYS.DEPTH_SCALE, "SCENE_ELEVATION.Settings.DepthScale", settings)}
    <div class="${MODULE_ID}-scene-settings-preset-end-divider" aria-hidden="true"></div>
    ${_rangeField(SCENE_SETTING_KEYS.ELEVATION_SCALE, "SCENE_ELEVATION.Settings.ElevationScale", "SCENE_ELEVATION.Settings.ElevationScaleHint", settings, ELEVATION_SCALE_LIMITS)}
    ${_selectField(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, "SCENE_ELEVATION.Settings.TokenElevationMode", settings)}
    <div class="form-group" style="margin-bottom: 4px;">
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenElevationAnimationMs")}</label>
      <input type="number" name="${SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS}" min="0" max="600" step="10" value="${Number(settings[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS] ?? 120)}">
      <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.TokenElevationAnimationMsHint")}</p>
    </div>
    <div class="form-group" style="margin-bottom: 4px;">
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScale")}</label>
      <input type="checkbox" name="${SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED}" ${settings[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED] ? "checked" : ""}>
    </div>
    ${_selectField(SCENE_SETTING_KEYS.TOKEN_SCALING_MODE, "SCENE_ELEVATION.Settings.TokenScalingMode", settings)}
    ${_tokenScaleMaxField(settings)}
    ${_tokenScalePerElevationField(settings)}
  </form>`;
}

function _tokenScaleMaxField(settings) {
  const hidden = tokenScalingModeValue(settings[SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]) !== TOKEN_SCALING_MODES.MAX_TOKEN_SCALE ? " hidden" : "";
  return `<div class="form-group" data-token-scale-max style="margin-bottom: 4px;"${hidden}>
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScaleMax")}</label>
      <input type="number" name="${SCENE_SETTING_KEYS.TOKEN_SCALE_MAX}" min="1" max="3" step="0.05" value="${Number(settings[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5)}">
      <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScaleMaxHint")}</p>
    </div>`;
}

function _tokenScalePerElevationField(settings) {
  const hidden = tokenScalingModeValue(settings[SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]) !== TOKEN_SCALING_MODES.SCALE_PER_ELEVATION ? " hidden" : "";
  const value = tokenScalePerElevationValue(settings[SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION] ?? TOKEN_SCALE_PER_ELEVATION_LIMITS.DEFAULT);
  return `<div class="form-group" data-token-scale-per-elevation style="margin-bottom: 4px;"${hidden}>
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScalePerElevation")}</label>
      <input type="number" name="${SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION}" min="${TOKEN_SCALE_PER_ELEVATION_LIMITS.MIN}" max="${TOKEN_SCALE_PER_ELEVATION_LIMITS.MAX}" step="${TOKEN_SCALE_PER_ELEVATION_LIMITS.STEP}" value="${value}">
      <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScalePerElevationHint")}</p>
    </div>`;
}

function _selectField(name, labelKey, settings) {
  const current = name === SCENE_SETTING_KEYS.PRESET
    ? elevationPresetKey(settings[name])
    : name === SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST
    ? parallaxHeightContrastKey(settings[name])
    : name === SCENE_SETTING_KEYS.SHADOW_LENGTH
      ? shadowLengthKey(settings[name])
      : settings[name];
  const options = SCENE_SETTING_SELECT_GROUPS[name].map(([value, optionLabel]) => `<option value="${value}" ${value === current ? "selected" : ""}>${game.i18n.localize(optionLabel)}</option>`).join("");
  const classes = `form-group${name === SCENE_SETTING_KEYS.PRESET ? ` ${MODULE_ID}-scene-settings-preset` : ""}`;
  const extraStyle = name === SCENE_SETTING_KEYS.PRESET ? " margin-top: 20px;" : "";
  return `<div class="${classes}" style="margin-bottom: 4px;${extraStyle}">
    <label>${game.i18n.localize(labelKey)}</label>
    <select name="${name}">${options}</select>
  </div>`;
}

function _numberField(name, labelKey, hintKey, settings, { min, max, step }) {
  const value = Number(settings[name] ?? 0);
  return `<div class="form-group" style="margin-bottom: 4px;">
    <label>${game.i18n.localize(labelKey)}</label>
    <input type="number" name="${name}" min="${min}" max="${max}" step="${step}" value="${Number.isFinite(value) ? value : 0}">
    <p class="hint">${game.i18n.localize(hintKey)}</p>
  </div>`;
}

function _rangeField(name, labelKey, hintKey, settings, { MIN: min, MAX: max, STEP: step, DEFAULT: defaultValue }) {
  const value = elevationScaleValue(settings[name] ?? defaultValue);
  return `<div class="form-group" style="margin-bottom: 4px;">
    <label>${game.i18n.localize(labelKey)}</label>
    <div style="display: grid; grid-template-columns: 1fr 3ch; gap: 8px; align-items: center;">
      <input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}">
      <output data-for="${name}">${value}</output>
    </div>
    <p class="hint">${game.i18n.localize(hintKey)}</p>
  </div>`;
}

function _edgeStretchRangeField(settings) {
  const name = SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT;
  const value = edgeStretchPercentValue(settings[name] ?? EDGE_STRETCH_LIMITS.DEFAULT);
  const hidden = settings[SCENE_SETTING_KEYS.BLEND_MODE] !== BLEND_MODES.EDGE_STRETCH ? " hidden" : "";
  return `<div class="form-group" data-edge-stretch-percent style="margin-bottom: 4px;"${hidden}>
    <label>${game.i18n.localize("SCENE_ELEVATION.Settings.EdgeStretchPercent")}</label>
    <div style="display: grid; grid-template-columns: 1fr 4ch; gap: 8px; align-items: center;">
      <input type="range" name="${name}" min="${EDGE_STRETCH_LIMITS.MIN}" max="${EDGE_STRETCH_LIMITS.MAX}" step="${EDGE_STRETCH_LIMITS.STEP}" value="${value}">
      <output data-for="${name}">${value}</output>
    </div>
    <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.EdgeStretchPercentHint")}</p>
  </div>`;
}

function _populateSettingsForm(form, settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = !!value;
    else field.value = value;
    if (field instanceof HTMLInputElement && field.type === "range") _syncRangeOutput(form, field);
  }
  _syncEdgeStretchVisibility(form);
  _syncTokenScalingModeVisibility(form);
}

function _formSettings(data, current, scene) {
  const preset = elevationPresetKey(data.get(SCENE_SETTING_KEYS.PRESET) ?? current[SCENE_SETTING_KEYS.PRESET]);
  const presetValues = elevationPresetValues(preset, scene) ?? {};
  return {
    [SCENE_SETTING_KEYS.PRESET]: preset,
    [SCENE_SETTING_KEYS.PARALLAX]: presetValues[SCENE_SETTING_KEYS.PARALLAX] ?? _choice(data, SCENE_SETTING_KEYS.PARALLAX, Object.keys(PARALLAX_STRENGTHS), current, "strong"),
    [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: presetValues[SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST] ?? _heightContrastChoice(data, current),
    [SCENE_SETTING_KEYS.PARALLAX_MODE]: presetValues[SCENE_SETTING_KEYS.PARALLAX_MODE] ?? _choice(data, SCENE_SETTING_KEYS.PARALLAX_MODE, Object.values(PARALLAX_MODES), current, PARALLAX_MODES.ANCHORED_VELOCITY_CARD),
    [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: presetValues[SCENE_SETTING_KEYS.PERSPECTIVE_POINT] ?? _choice(data, SCENE_SETTING_KEYS.PERSPECTIVE_POINT, Object.values(PERSPECTIVE_POINTS), current, PERSPECTIVE_POINTS.FAR_BOTTOM),
    [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: current[SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT],
    [SCENE_SETTING_KEYS.BLEND_MODE]: presetValues[SCENE_SETTING_KEYS.BLEND_MODE] ?? _choice(data, SCENE_SETTING_KEYS.BLEND_MODE, Object.values(BLEND_MODES), current, BLEND_MODES.SOFT),
    [SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT]: presetValues[SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT] ?? edgeStretchPercentValue(data.get(SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT) ?? current[SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT]),
    [SCENE_SETTING_KEYS.OVERLAY_SCALE]: presetValues[SCENE_SETTING_KEYS.OVERLAY_SCALE] ?? _choice(data, SCENE_SETTING_KEYS.OVERLAY_SCALE, Object.keys(OVERLAY_SCALE_STRENGTHS), current, "subtle"),
    [SCENE_SETTING_KEYS.SHADOW_MODE]: presetValues[SCENE_SETTING_KEYS.SHADOW_MODE] ?? _choice(data, SCENE_SETTING_KEYS.SHADOW_MODE, Object.values(SHADOW_MODES), current, SHADOW_MODES.TOP_DOWN),
    [SCENE_SETTING_KEYS.SHADOW_LENGTH]: presetValues[SCENE_SETTING_KEYS.SHADOW_LENGTH] ?? _shadowLengthChoice(data, current),
    [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: current[SCENE_SETTING_KEYS.SUN_EDGE_POINT],
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: _choice(data, SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, Object.values(TOKEN_ELEVATION_MODES), current),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: Math.clamp(Number(data.get(SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS) ?? current[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS] ?? 120), 0, 600),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: data.has(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED),
    [SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]: _choice(data, SCENE_SETTING_KEYS.TOKEN_SCALING_MODE, Object.values(TOKEN_SCALING_MODES), current, TOKEN_SCALING_MODES.MAX_TOKEN_SCALE),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: Math.clamp(Number(data.get(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? current[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5), 1, 3),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION]: tokenScalePerElevationValue(data.get(SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION) ?? current[SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION] ?? TOKEN_SCALE_PER_ELEVATION_LIMITS.DEFAULT),
    [SCENE_SETTING_KEYS.ELEVATION_SCALE]: elevationScaleValue(data.get(SCENE_SETTING_KEYS.ELEVATION_SCALE) ?? current[SCENE_SETTING_KEYS.ELEVATION_SCALE]),
    [SCENE_SETTING_KEYS.DEPTH_SCALE]: presetValues[SCENE_SETTING_KEYS.DEPTH_SCALE] ?? _choice(data, SCENE_SETTING_KEYS.DEPTH_SCALE, Object.values(DEPTH_SCALES), current, DEPTH_SCALES.COMPRESSED)
  };
}

function _syncRangeOutput(form, field) {
  const output = form.querySelector(`output[data-for="${field.name}"]`);
  if (output) {
    output.value = field.value;
    output.textContent = field.value;
  }
}

function _syncEdgeStretchVisibility(form) {
  const group = form.querySelector("[data-edge-stretch-percent]");
  const blendField = form.elements.namedItem(SCENE_SETTING_KEYS.BLEND_MODE);
  if (!group || !blendField) return;
  group.hidden = blendField.value !== BLEND_MODES.EDGE_STRETCH;
}

function _syncTokenScalingModeVisibility(form) {
  const modeField = form.elements.namedItem(SCENE_SETTING_KEYS.TOKEN_SCALING_MODE);
  const maxGroup = form.querySelector("[data-token-scale-max]");
  const perElevationGroup = form.querySelector("[data-token-scale-per-elevation]");
  if (!modeField) return;
  const mode = tokenScalingModeValue(modeField.value);
  if (maxGroup) maxGroup.hidden = mode !== TOKEN_SCALING_MODES.MAX_TOKEN_SCALE;
  if (perElevationGroup) perElevationGroup.hidden = mode !== TOKEN_SCALING_MODES.SCALE_PER_ELEVATION;
}

function _choice(data, key, choices, current, fallback = choices[0]) {
  const value = String(data.get(key) ?? current[key] ?? fallback);
  if (choices.includes(value)) return value;
  const currentValue = String(current[key] ?? fallback);
  return choices.includes(currentValue) ? currentValue : fallback;
}

function _heightContrastChoice(data, current) {
  const choices = Object.keys(PARALLAX_HEIGHT_CONTRASTS);
  const value = String(data.get(SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST) ?? "");
  return choices.includes(value) ? value : parallaxHeightContrastKey(current[SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]);
}

function _shadowLengthChoice(data, current) {
  const choices = Object.keys(SHADOW_LENGTHS);
  const value = String(data.get(SCENE_SETTING_KEYS.SHADOW_LENGTH) ?? "");
  return choices.includes(value) ? value : shadowLengthKey(current[SCENE_SETTING_KEYS.SHADOW_LENGTH]);
}

function _applyPresetToSettingsForm(form, presetKey, scene) {
  const values = elevationPresetValues(presetKey, scene);
  if (!values) return;
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    field.value = value;
    if (field instanceof HTMLInputElement && field.type === "range") _syncRangeOutput(form, field);
  }
  const edgeStretchField = form.elements.namedItem(SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT);
  if (edgeStretchField && values[SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT] === undefined) {
    edgeStretchField.value = String(EDGE_STRETCH_LIMITS.DEFAULT);
    if (edgeStretchField instanceof HTMLInputElement && edgeStretchField.type === "range") _syncRangeOutput(form, edgeStretchField);
  }
  _syncEdgeStretchVisibility(form);
  _syncTokenScalingModeVisibility(form);
}

function _setSettingsFormPreset(form, presetKey) {
  const field = form.elements.namedItem(SCENE_SETTING_KEYS.PRESET);
  if (field) field.value = presetKey;
}
