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
  DEPTH_SCALES,
  ELEVATION_PRESETS,
  ELEVATION_PRESET_SETTING_KEYS,
  elevationPresetKey,
  elevationPresetValues,
  elevationDefaultSettings,
  getSceneElevationSettings,
  parallaxHeightContrastKey,
  shadowLengthKey,
  setSceneElevationSettings
} from "./config.mjs";

const SELECT_GROUPS = Object.freeze({
  [SCENE_SETTING_KEYS.PRESET]: [
    [ELEVATION_PRESETS.CUSTOM, "SCENE_ELEVATION.Settings.PresetCustom"],
    [ELEVATION_PRESETS.DEFAULT, "SCENE_ELEVATION.Settings.PresetDefault"],
    [ELEVATION_PRESETS.BASIC_LIFT_DRIFT_SHADOW, "SCENE_ELEVATION.Settings.PresetBasicLiftDriftShadow"]
  ],
  [SCENE_SETTING_KEYS.PARALLAX]: [
    ["off", "SCENE_ELEVATION.Settings.ParallaxOff"],
    ["minimal", "SCENE_ELEVATION.Settings.ParallaxMinimal"],
    ["verySubtle", "SCENE_ELEVATION.Settings.ParallaxVerySubtle"],
    ["subtle", "SCENE_ELEVATION.Settings.ParallaxSubtle"],
    ["medium", "SCENE_ELEVATION.Settings.ParallaxMedium"],
    ["strong", "SCENE_ELEVATION.Settings.ParallaxStrong"],
    ["extreme", "SCENE_ELEVATION.Settings.ParallaxExtreme"]
  ],
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: [
    [PARALLAX_MODES.CARD, "SCENE_ELEVATION.Settings.ParallaxModeCard"],
    [PARALLAX_MODES.ANCHORED_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard"],
    [PARALLAX_MODES.VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard"],
    [PARALLAX_MODES.ANCHORED_VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard"],
    [PARALLAX_MODES.SHADOW, "SCENE_ELEVATION.Settings.ParallaxModeShadow"]
  ],
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: [
    ["normal", "SCENE_ELEVATION.Settings.ParallaxHeightContrastNormal"],
    ["noticeable", "SCENE_ELEVATION.Settings.ParallaxHeightContrastNoticeable"],
    ["strong", "SCENE_ELEVATION.Settings.ParallaxHeightContrastStrong"],
    ["dramatic", "SCENE_ELEVATION.Settings.ParallaxHeightContrastDramatic"],
    ["extreme", "SCENE_ELEVATION.Settings.ParallaxHeightContrastExtreme"]
  ],
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: [
    [PERSPECTIVE_POINTS.CENTER, "SCENE_ELEVATION.Settings.PerspectivePointCenter"],
    [PERSPECTIVE_POINTS.TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointTopLeft"],
    [PERSPECTIVE_POINTS.TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointTopRight"],
    [PERSPECTIVE_POINTS.BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft"],
    [PERSPECTIVE_POINTS.BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointBottomRight"],
    [PERSPECTIVE_POINTS.FAR_TOP, "SCENE_ELEVATION.Settings.PerspectivePointFarTop"],
    [PERSPECTIVE_POINTS.FAR_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointFarLeft"],
    [PERSPECTIVE_POINTS.FAR_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointFarRight"],
    [PERSPECTIVE_POINTS.FAR_BOTTOM, "SCENE_ELEVATION.Settings.PerspectivePointFarBottom"],
    [PERSPECTIVE_POINTS.REGION_CENTER, "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter"],
    [PERSPECTIVE_POINTS.REGION_TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft"],
    [PERSPECTIVE_POINTS.REGION_TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight"],
    [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge"],
    [PERSPECTIVE_POINTS.CAMERA_CENTER, "SCENE_ELEVATION.Settings.PerspectivePointCameraCenter"],
    [PERSPECTIVE_POINTS.FURTHEST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge"],
    [PERSPECTIVE_POINTS.NEAREST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"]
  ],
  [SCENE_SETTING_KEYS.BLEND_MODE]: [
    [BLEND_MODES.OFF, "SCENE_ELEVATION.Settings.BlendModeOff"],
    [BLEND_MODES.SOFT, "SCENE_ELEVATION.Settings.BlendModeSoft"],
    [BLEND_MODES.WIDE, "SCENE_ELEVATION.Settings.BlendModeWide"],
    [BLEND_MODES.CLIFF_WARP, "SCENE_ELEVATION.Settings.BlendModeCliffWarp"]
  ],
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: [
    ["shrinkMedium", "SCENE_ELEVATION.Settings.OverlayScaleShrinkMedium"],
    ["shrinkSubtle", "SCENE_ELEVATION.Settings.OverlayScaleShrinkSubtle"],
    ["off", "SCENE_ELEVATION.Settings.OverlayScaleOff"],
    ["subtle", "SCENE_ELEVATION.Settings.OverlayScaleSubtle"],
    ["medium", "SCENE_ELEVATION.Settings.OverlayScaleMedium"],
    ["strong", "SCENE_ELEVATION.Settings.OverlayScaleStrong"]
  ],
  [SCENE_SETTING_KEYS.SHADOW_MODE]: [
    [SHADOW_MODES.OFF, "SCENE_ELEVATION.Settings.ShadowModeOff"],
    [SHADOW_MODES.RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeResponsive"],
    [SHADOW_MODES.RESPONSIVE_ALL_AROUND, "SCENE_ELEVATION.Settings.ShadowModeResponsiveAllAround"],
    [SHADOW_MODES.REVERSED_RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive"],
    [SHADOW_MODES.TEXTURE_MELD, "SCENE_ELEVATION.Settings.ShadowModeTextureMeld"],
    [SHADOW_MODES.FULL_TEXTURE_MELD, "SCENE_ELEVATION.Settings.ShadowModeFullTextureMeld"],
    [SHADOW_MODES.TOP_DOWN, "SCENE_ELEVATION.Settings.ShadowModeTopDown"],
    [SHADOW_MODES.TOP_DOWN_STRONG, "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong"],
    [SHADOW_MODES.SUN_AT_EDGE, "SCENE_ELEVATION.Settings.ShadowModeSunAtEdge"]
  ],
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: [
    ["off", "SCENE_ELEVATION.Settings.ShadowLengthOff"],
    ["short", "SCENE_ELEVATION.Settings.ShadowLengthShort"],
    ["normal", "SCENE_ELEVATION.Settings.ShadowLengthNormal"],
    ["long", "SCENE_ELEVATION.Settings.ShadowLengthLong"],
    ["extreme", "SCENE_ELEVATION.Settings.ShadowLengthExtreme"]
  ],
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: [
    [TOKEN_ELEVATION_MODES.ALWAYS, "SCENE_ELEVATION.Settings.TokenElevationModeAlways"],
    [TOKEN_ELEVATION_MODES.NEVER, "SCENE_ELEVATION.Settings.TokenElevationModeNever"],
    [TOKEN_ELEVATION_MODES.PER_REGION, "SCENE_ELEVATION.Settings.TokenElevationModePerRegion"]
  ],
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: [
    [DEPTH_SCALES.COMPRESSED, "SCENE_ELEVATION.Settings.DepthScaleCompressed"],
    [DEPTH_SCALES.LINEAR, "SCENE_ELEVATION.Settings.DepthScaleLinear"],
    [DEPTH_SCALES.DRAMATIC, "SCENE_ELEVATION.Settings.DepthScaleDramatic"]
  ]
});

export async function openSceneElevationSettingsDialog(scene = canvas?.scene) {
  if (!scene) return;
  const dialog = new SceneElevationSettingsDialog(scene);
  await dialog.render({ force: true });
  return dialog;
}

class SceneElevationSettingsDialog extends foundry.applications.api.DialogV2 {
  constructor(scene) {
    super({
      classes: [MODULE_ID, `${MODULE_ID}-scene-settings-dialog`],
      window: { title: game.i18n.localize("SCENE_ELEVATION.SceneSettings.Title"), resizable: true },
      position: { width: 460, height: 620 },
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
      void this._applyFormSettings();
    });
    form.addEventListener("input", event => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number") this._queueApplyFormSettings();
    });
    form.querySelector('[data-action="setDefault"]')?.addEventListener("click", event => {
      event.preventDefault();
      void this._setToDefault();
    });
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
    <button type="button" data-action="setDefault"><i class="fa-solid fa-rotate-left"></i> ${game.i18n.localize("SCENE_ELEVATION.SceneSettings.SetToDefault")}</button>
    ${_selectField(SCENE_SETTING_KEYS.PRESET, "SCENE_ELEVATION.Settings.Preset", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX, "SCENE_ELEVATION.Settings.Parallax", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST, "SCENE_ELEVATION.Settings.ParallaxHeightContrast", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX_MODE, "SCENE_ELEVATION.Settings.ParallaxMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PERSPECTIVE_POINT, "SCENE_ELEVATION.Settings.PerspectivePoint", settings)}
    ${_selectField(SCENE_SETTING_KEYS.BLEND_MODE, "SCENE_ELEVATION.Settings.TransitionMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.OVERLAY_SCALE, "SCENE_ELEVATION.Settings.OverlayScale", settings)}
    ${_selectField(SCENE_SETTING_KEYS.SHADOW_MODE, "SCENE_ELEVATION.Settings.ShadowMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.SHADOW_LENGTH, "SCENE_ELEVATION.Settings.ShadowLength", settings)}
    ${_selectField(SCENE_SETTING_KEYS.DEPTH_SCALE, "SCENE_ELEVATION.Settings.DepthScale", settings)}
    ${_selectField(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, "SCENE_ELEVATION.Settings.TokenElevationMode", settings)}
    <div class="form-group">
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenElevationAnimationMs")}</label>
      <input type="number" name="${SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS}" min="0" max="600" step="10" value="${Number(settings[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS] ?? 120)}">
      <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.TokenElevationAnimationMsHint")}</p>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScale")}</label>
      <input type="checkbox" name="${SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED}" ${settings[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED] ? "checked" : ""}>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScaleMax")}</label>
      <input type="number" name="${SCENE_SETTING_KEYS.TOKEN_SCALE_MAX}" min="1" max="3" step="0.05" value="${Number(settings[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5)}">
      <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Settings.TokenScaleMaxHint")}</p>
    </div>
  </form>`;
}

function _selectField(name, labelKey, settings) {
  const current = name === SCENE_SETTING_KEYS.PRESET
    ? elevationPresetKey(settings[name])
    : name === SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST
    ? parallaxHeightContrastKey(settings[name])
    : name === SCENE_SETTING_KEYS.SHADOW_LENGTH
      ? shadowLengthKey(settings[name])
      : settings[name];
  const options = SELECT_GROUPS[name].map(([value, optionLabel]) => `<option value="${value}" ${value === current ? "selected" : ""}>${game.i18n.localize(optionLabel)}</option>`).join("");
  return `<div class="form-group">
    <label>${game.i18n.localize(labelKey)}</label>
    <select name="${name}">${options}</select>
  </div>`;
}

function _numberField(name, labelKey, hintKey, settings, { min, max, step }) {
  const value = Number(settings[name] ?? 0);
  return `<div class="form-group">
    <label>${game.i18n.localize(labelKey)}</label>
    <input type="number" name="${name}" min="${min}" max="${max}" step="${step}" value="${Number.isFinite(value) ? value : 0}">
    <p class="hint">${game.i18n.localize(hintKey)}</p>
  </div>`;
}

function _populateSettingsForm(form, settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = !!value;
    else field.value = value;
  }
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
    [SCENE_SETTING_KEYS.OVERLAY_SCALE]: presetValues[SCENE_SETTING_KEYS.OVERLAY_SCALE] ?? _choice(data, SCENE_SETTING_KEYS.OVERLAY_SCALE, Object.keys(OVERLAY_SCALE_STRENGTHS), current, "subtle"),
    [SCENE_SETTING_KEYS.SHADOW_MODE]: presetValues[SCENE_SETTING_KEYS.SHADOW_MODE] ?? _choice(data, SCENE_SETTING_KEYS.SHADOW_MODE, Object.values(SHADOW_MODES), current, SHADOW_MODES.TOP_DOWN),
    [SCENE_SETTING_KEYS.SHADOW_LENGTH]: presetValues[SCENE_SETTING_KEYS.SHADOW_LENGTH] ?? _shadowLengthChoice(data, current),
    [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: current[SCENE_SETTING_KEYS.SUN_EDGE_POINT],
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: _choice(data, SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, Object.values(TOKEN_ELEVATION_MODES), current),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: Math.clamp(Number(data.get(SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS) ?? current[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS] ?? 120), 0, 600),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: data.has(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: Math.clamp(Number(data.get(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? current[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5), 1, 3),
    [SCENE_SETTING_KEYS.DEPTH_SCALE]: presetValues[SCENE_SETTING_KEYS.DEPTH_SCALE] ?? _choice(data, SCENE_SETTING_KEYS.DEPTH_SCALE, Object.values(DEPTH_SCALES), current, DEPTH_SCALES.COMPRESSED)
  };
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
    if (field) field.value = value;
  }
}

function _setSettingsFormPreset(form, presetKey) {
  const field = form.elements.namedItem(SCENE_SETTING_KEYS.PRESET);
  if (field) field.value = presetKey;
}
