import {
  MODULE_ID,
  SCENE_SETTING_KEYS,
  PARALLAX_STRENGTHS,
  PARALLAX_MODES,
  PERSPECTIVE_POINTS,
  BLEND_MODES,
  OVERLAY_SCALE_STRENGTHS,
  SHADOW_MODES,
  TOKEN_ELEVATION_MODES,
  DEPTH_SCALES,
  EXTRUSION_STRENGTHS,
  elevationDefaultSettings,
  getSceneElevationSettings,
  setSceneElevationSettings
} from "./config.mjs";

const SELECT_GROUPS = Object.freeze({
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
    [PARALLAX_MODES.SLOPE_ONLY, "SCENE_ELEVATION.Settings.ParallaxModeSlopeOnly"],
    [PARALLAX_MODES.HYBRID, "SCENE_ELEVATION.Settings.ParallaxModeHybrid"],
    [PARALLAX_MODES.ANCHORED, "SCENE_ELEVATION.Settings.ParallaxModeAnchored"],
    [PARALLAX_MODES.EDGE_BLEND, "SCENE_ELEVATION.Settings.ParallaxModeEdgeBlend"],
    [PARALLAX_MODES.CARD, "SCENE_ELEVATION.Settings.ParallaxModeCard"],
    [PARALLAX_MODES.SMOOTH_CARD, "SCENE_ELEVATION.Settings.ParallaxModeSmoothCard"],
    [PARALLAX_MODES.ANCHORED_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard"],
    [PARALLAX_MODES.VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard"],
    [PARALLAX_MODES.ANCHORED_VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard"],
    [PARALLAX_MODES.SHADOW, "SCENE_ELEVATION.Settings.ParallaxModeShadow"]
  ],
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: [
    [PERSPECTIVE_POINTS.CENTER, "SCENE_ELEVATION.Settings.PerspectivePointCenter"],
    [PERSPECTIVE_POINTS.TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointTopLeft"],
    [PERSPECTIVE_POINTS.TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointTopRight"],
    [PERSPECTIVE_POINTS.BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft"],
    [PERSPECTIVE_POINTS.BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointBottomRight"],
    [PERSPECTIVE_POINTS.REGION_CENTER, "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter"],
    [PERSPECTIVE_POINTS.REGION_TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft"],
    [PERSPECTIVE_POINTS.REGION_TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight"],
    [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge"],
    [PERSPECTIVE_POINTS.FURTHEST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge"],
    [PERSPECTIVE_POINTS.NEAREST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"]
  ],
  [SCENE_SETTING_KEYS.BLEND_MODE]: [
    [BLEND_MODES.OFF, "SCENE_ELEVATION.Settings.BlendModeOff"],
    [BLEND_MODES.SOFT, "SCENE_ELEVATION.Settings.BlendModeSoft"],
    [BLEND_MODES.WIDE, "SCENE_ELEVATION.Settings.BlendModeWide"],
    [BLEND_MODES.DEPTH_LIP, "SCENE_ELEVATION.Settings.BlendModeDepthLip"],
    [BLEND_MODES.PROJECTED_PATCH, "SCENE_ELEVATION.Settings.BlendModeProjectedPatch"],
    [BLEND_MODES.SLOPE, "SCENE_ELEVATION.Settings.BlendModeSlope"],
    [BLEND_MODES.Z_BRIDGE, "SCENE_ELEVATION.Settings.BlendModeZBridge"]
  ],
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: [
    ["off", "SCENE_ELEVATION.Settings.OverlayScaleOff"],
    ["subtle", "SCENE_ELEVATION.Settings.OverlayScaleSubtle"],
    ["medium", "SCENE_ELEVATION.Settings.OverlayScaleMedium"],
    ["strong", "SCENE_ELEVATION.Settings.OverlayScaleStrong"]
  ],
  [SCENE_SETTING_KEYS.SHADOW_MODE]: [
    [SHADOW_MODES.RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeResponsive"],
    [SHADOW_MODES.REVERSED_RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive"],
    [SHADOW_MODES.FIXED_VISIBLE, "SCENE_ELEVATION.Settings.ShadowModeFixedVisible"],
    [SHADOW_MODES.TOP_DOWN, "SCENE_ELEVATION.Settings.ShadowModeTopDown"]
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
  ],
  [SCENE_SETTING_KEYS.EXTRUSION]: [
    [EXTRUSION_STRENGTHS.OFF, "SCENE_ELEVATION.Settings.ExtrusionOff"],
    [EXTRUSION_STRENGTHS.SUBTLE, "SCENE_ELEVATION.Settings.ExtrusionSubtle"],
    [EXTRUSION_STRENGTHS.BOLD, "SCENE_ELEVATION.Settings.ExtrusionBold"],
    [EXTRUSION_STRENGTHS.TOWER, "SCENE_ELEVATION.Settings.ExtrusionTower"],
    [EXTRUSION_STRENGTHS.EDGE_STRETCH, "SCENE_ELEVATION.Settings.ExtrusionEdgeStretch"]
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
      window: { title: game.i18n.localize("SCENE_ELEVATION.SceneSettings.Title") },
      content: _settingsForm(getSceneElevationSettings(scene)),
      buttons: [{ action: "close", label: game.i18n.localize("Close"), icon: "fa-solid fa-check", default: true }]
    });
    this.scene = scene;
    this._queueApplyFormSettings = foundry.utils.debounce(() => void this._applyFormSettings(), 120);
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const form = this.element.querySelector("form");
    if (!form) return;
    form.addEventListener("change", () => void this._applyFormSettings());
    form.addEventListener("input", event => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number") this._queueApplyFormSettings();
    });
    form.querySelector('[data-action="setDefault"]')?.addEventListener("click", event => {
      event.preventDefault();
      void this._setToDefault();
    });
  }

  async _applyFormSettings() {
    const scene = this.scene;
    const form = this.element.querySelector("form");
    if (!scene || !form) return;
    const data = new FormData(form);
    await setSceneElevationSettings(scene, _formSettings(data, getSceneElevationSettings(scene)));
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
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX, "SCENE_ELEVATION.Settings.Parallax", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PARALLAX_MODE, "SCENE_ELEVATION.Settings.ParallaxMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.PERSPECTIVE_POINT, "SCENE_ELEVATION.Settings.PerspectivePoint", settings)}
    ${_selectField(SCENE_SETTING_KEYS.BLEND_MODE, "SCENE_ELEVATION.Settings.TransitionMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.OVERLAY_SCALE, "SCENE_ELEVATION.Settings.OverlayScale", settings)}
    ${_selectField(SCENE_SETTING_KEYS.SHADOW_MODE, "SCENE_ELEVATION.Settings.ShadowMode", settings)}
    ${_selectField(SCENE_SETTING_KEYS.DEPTH_SCALE, "SCENE_ELEVATION.Settings.DepthScale", settings)}
    ${_selectField(SCENE_SETTING_KEYS.EXTRUSION, "SCENE_ELEVATION.Settings.Extrusion", settings)}
    ${_selectField(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, "SCENE_ELEVATION.Settings.TokenElevationMode", settings)}
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
  const current = settings[name];
  const options = SELECT_GROUPS[name].map(([value, optionLabel]) => `<option value="${value}" ${value === current ? "selected" : ""}>${game.i18n.localize(optionLabel)}</option>`).join("");
  return `<div class="form-group">
    <label>${game.i18n.localize(labelKey)}</label>
    <select name="${name}">${options}</select>
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

function _formSettings(data, current) {
  return {
    [SCENE_SETTING_KEYS.PARALLAX]: _choice(data, SCENE_SETTING_KEYS.PARALLAX, Object.keys(PARALLAX_STRENGTHS), current),
    [SCENE_SETTING_KEYS.PARALLAX_MODE]: _choice(data, SCENE_SETTING_KEYS.PARALLAX_MODE, Object.values(PARALLAX_MODES), current),
    [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: _choice(data, SCENE_SETTING_KEYS.PERSPECTIVE_POINT, Object.values(PERSPECTIVE_POINTS), current),
    [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: current[SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT],
    [SCENE_SETTING_KEYS.BLEND_MODE]: _choice(data, SCENE_SETTING_KEYS.BLEND_MODE, Object.values(BLEND_MODES), current),
    [SCENE_SETTING_KEYS.OVERLAY_SCALE]: _choice(data, SCENE_SETTING_KEYS.OVERLAY_SCALE, Object.keys(OVERLAY_SCALE_STRENGTHS), current),
    [SCENE_SETTING_KEYS.SHADOW_MODE]: _choice(data, SCENE_SETTING_KEYS.SHADOW_MODE, Object.values(SHADOW_MODES), current),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: _choice(data, SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE, Object.values(TOKEN_ELEVATION_MODES), current),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: data.has(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: Math.clamp(Number(data.get(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? current[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5), 1, 3),
    [SCENE_SETTING_KEYS.DEPTH_SCALE]: _choice(data, SCENE_SETTING_KEYS.DEPTH_SCALE, Object.values(DEPTH_SCALES), current),
    [SCENE_SETTING_KEYS.EXTRUSION]: _choice(data, SCENE_SETTING_KEYS.EXTRUSION, Object.values(EXTRUSION_STRENGTHS), current)
  };
}

function _choice(data, key, choices, current) {
  const value = String(data.get(key) ?? current[key] ?? "");
  return choices.includes(value) ? value : current[key];
}
