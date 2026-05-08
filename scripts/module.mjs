import { MODULE_ID, SETTINGS, SCENE_SETTINGS_FLAG, SCENE_SETTING_KEYS, ELEVATION_DEFAULT_SETTINGS, ELEVATION_PRESETS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, TOKEN_ELEVATION_MODES, DEPTH_SCALES, REGION_BEHAVIOR_TYPE, elevationPresetValues, getSceneElevationSetting, parallaxHeightContrastKey, shadowLengthKey } from "./config.mjs";
import { ElevationAuthoringLayer, registerElevationControls } from "./elevation-controls.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import {
  RegionElevationRenderer,
  getRegionElevationAtPoint,
  getRegionElevationStateAtPoint,
  getActiveElevationRegions
} from "./region-elevation-renderer.mjs";

const TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS = 250;
const TOKEN_ELEVATION_SETTLE_TIMEOUT_MS = 900;
const TOKEN_PARALLAX_UI_KEYS = Object.freeze([
  "border", "nameplate", "tooltip", "elevationLabel", "elevationText", "elevationTooltip",
  "bars", "bar1", "bar2", "resourceBars", "attributeBars", "healthBar", "healthBars",
  "effects", "effectIcons", "statusEffects", "overlay", "overlayEffect", "controlIcon", "controlIcons", "hud", "tokenHud",
  "targetArrows", "targetPips", "targetIcon", "targetReticle", "targetReticule", "targetCrosshair", "targetControl", "targetIndicator", "targetMarker"
]);
const TOKEN_PARALLAX_TARGET_NAME_PATTERN = /target|crosshair|reticle|reticule|bar|resource|health|stamina|effect|status|control|hud|overlay/i;
const TOKEN_PARALLAX_TARGET_SCAN_LIMIT = 80;
const TOKEN_PARALLAX_HIT_AREA_EPSILON = 0.5;
const TOKEN_HUD_POSITION_PATCHED = "_sceneElevationRegionHudPositionPatched";
const REGION_PRESET_FIELD_MAP = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "parallaxStrengthOverride",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "parallaxHeightContrastOverride",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: "parallaxModeOverride",
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: "perspectivePointOverride",
  [SCENE_SETTING_KEYS.BLEND_MODE]: "blendModeOverride",
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "overlayScaleOverride",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: "shadowModeOverride",
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "shadowLengthOverride",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: "depthScaleOverride"
});
const REGION_PRESET_CONTROL_FIELDS = new Set(Object.values(REGION_PRESET_FIELD_MAP));
const _syncingTokenElevation = new Set();
const _pendingTokenElevationUpdates = new Map();
const _tokensWithPendingMovement = new Set();
let _tokenVisualRefreshFrame = null;

class ResetElevationDefaultsDialog extends foundry.applications.api.DialogV2 {
  constructor() {
    super({
      window: { title: game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaults") },
      content: `<p>${game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsConfirm")}</p>`,
      buttons: [
        {
          action: "reset",
          label: game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsLabel"),
          icon: "fa-solid fa-rotate-left",
          default: true,
          callback: async () => {
            await _resetWorldElevationDefaults();
            ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsDone"));
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("Cancel"),
          icon: "fa-solid fa-xmark"
        }
      ]
    });
  }
}

async function _resetWorldElevationDefaults() {
  await Promise.all(Object.entries(ELEVATION_DEFAULT_SETTINGS)
    .filter(([key]) => key !== SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT)
    .map(([key, value]) => game.settings.set(MODULE_ID, key, value)));
  RegionElevationRenderer.instance.update();
  void _refreshAllTokenElevations();
  _refreshAllTokenScales();
}

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.registerMenu(MODULE_ID, "resetDefaults", {
    name: "SCENE_ELEVATION.Settings.ResetDefaults",
    label: "SCENE_ELEVATION.Settings.ResetDefaultsLabel",
    hint: "SCENE_ELEVATION.Settings.ResetDefaultsHint",
    icon: "fa-solid fa-rotate-left",
    type: ResetElevationDefaultsDialog,
    restricted: true
  });

  game.settings.register(MODULE_ID, SETTINGS.PARALLAX, {
    name: "SCENE_ELEVATION.Settings.Parallax",
    hint: "SCENE_ELEVATION.Settings.ParallaxHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PARALLAX],
    choices: {
      off: "SCENE_ELEVATION.Settings.ParallaxOff",
      minimal: "SCENE_ELEVATION.Settings.ParallaxMinimal",
      verySubtle: "SCENE_ELEVATION.Settings.ParallaxVerySubtle",
      subtle: "SCENE_ELEVATION.Settings.ParallaxSubtle",
      medium: "SCENE_ELEVATION.Settings.ParallaxMedium",
      strong: "SCENE_ELEVATION.Settings.ParallaxStrong",
      extreme: "SCENE_ELEVATION.Settings.ParallaxExtreme"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX_HEIGHT_CONTRAST, {
    name: "SCENE_ELEVATION.Settings.ParallaxHeightContrast",
    hint: "SCENE_ELEVATION.Settings.ParallaxHeightContrastHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PARALLAX_HEIGHT_CONTRAST],
    choices: {
      normal: "SCENE_ELEVATION.Settings.ParallaxHeightContrastNormal",
      noticeable: "SCENE_ELEVATION.Settings.ParallaxHeightContrastNoticeable",
      strong: "SCENE_ELEVATION.Settings.ParallaxHeightContrastStrong",
      dramatic: "SCENE_ELEVATION.Settings.ParallaxHeightContrastDramatic",
      extreme: "SCENE_ELEVATION.Settings.ParallaxHeightContrastExtreme"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX_MODE, {
    name: "SCENE_ELEVATION.Settings.ParallaxMode",
    hint: "SCENE_ELEVATION.Settings.ParallaxModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PARALLAX_MODE],
    choices: {
      [PARALLAX_MODES.CARD]: "SCENE_ELEVATION.Settings.ParallaxModeCard",
      [PARALLAX_MODES.ANCHORED_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard",
      [PARALLAX_MODES.VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard",
      [PARALLAX_MODES.ANCHORED_VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard",
      [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PERSPECTIVE_POINT, {
    name: "SCENE_ELEVATION.Settings.PerspectivePoint",
    hint: "SCENE_ELEVATION.Settings.PerspectivePointHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PERSPECTIVE_POINT],
    choices: {
      [PERSPECTIVE_POINTS.CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCenter",
      [PERSPECTIVE_POINTS.TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointTopLeft",
      [PERSPECTIVE_POINTS.TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointTopRight",
      [PERSPECTIVE_POINTS.BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft",
      [PERSPECTIVE_POINTS.BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomRight",
      [PERSPECTIVE_POINTS.FAR_TOP]: "SCENE_ELEVATION.Settings.PerspectivePointFarTop",
      [PERSPECTIVE_POINTS.FAR_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointFarLeft",
      [PERSPECTIVE_POINTS.FAR_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointFarRight",
      [PERSPECTIVE_POINTS.FAR_BOTTOM]: "SCENE_ELEVATION.Settings.PerspectivePointFarBottom",
      [PERSPECTIVE_POINTS.REGION_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter",
      [PERSPECTIVE_POINTS.REGION_TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft",
      [PERSPECTIVE_POINTS.REGION_TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight",
      [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft",
      [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight",
      [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge",
      [PERSPECTIVE_POINTS.CAMERA_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCameraCenter",
      [PERSPECTIVE_POINTS.FURTHEST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge",
      [PERSPECTIVE_POINTS.NEAREST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.BLEND_MODE, {
    name: "SCENE_ELEVATION.Settings.TransitionMode",
    hint: "SCENE_ELEVATION.Settings.TransitionModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.BLEND_MODE],
    choices: {
      [BLEND_MODES.OFF]: "SCENE_ELEVATION.Settings.BlendModeOff",
      [BLEND_MODES.SOFT]: "SCENE_ELEVATION.Settings.BlendModeSoft",
      [BLEND_MODES.WIDE]: "SCENE_ELEVATION.Settings.BlendModeWide",
      [BLEND_MODES.CLIFF_WARP]: "SCENE_ELEVATION.Settings.BlendModeCliffWarp"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.OVERLAY_SCALE, {
    name: "SCENE_ELEVATION.Settings.OverlayScale",
    hint: "SCENE_ELEVATION.Settings.OverlayScaleHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.OVERLAY_SCALE],
    choices: {
      shrinkMedium: "SCENE_ELEVATION.Settings.OverlayScaleShrinkMedium",
      shrinkSubtle: "SCENE_ELEVATION.Settings.OverlayScaleShrinkSubtle",
      off: "SCENE_ELEVATION.Settings.OverlayScaleOff",
      subtle: "SCENE_ELEVATION.Settings.OverlayScaleSubtle",
      medium: "SCENE_ELEVATION.Settings.OverlayScaleMedium",
      strong: "SCENE_ELEVATION.Settings.OverlayScaleStrong"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.SHADOW_MODE, {
    name: "SCENE_ELEVATION.Settings.ShadowMode",
    hint: "SCENE_ELEVATION.Settings.ShadowModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.SHADOW_MODE],
    choices: {
      [SHADOW_MODES.OFF]: "SCENE_ELEVATION.Settings.ShadowModeOff",
      [SHADOW_MODES.RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeResponsive",
      [SHADOW_MODES.RESPONSIVE_ALL_AROUND]: "SCENE_ELEVATION.Settings.ShadowModeResponsiveAllAround",
      [SHADOW_MODES.REVERSED_RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive",
      [SHADOW_MODES.TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeTextureMeld",
      [SHADOW_MODES.FULL_TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeFullTextureMeld",
      [SHADOW_MODES.TOP_DOWN]: "SCENE_ELEVATION.Settings.ShadowModeTopDown",
      [SHADOW_MODES.TOP_DOWN_STRONG]: "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong",
      [SHADOW_MODES.SUN_AT_EDGE]: "SCENE_ELEVATION.Settings.ShadowModeSunAtEdge"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.SHADOW_LENGTH, {
    name: "SCENE_ELEVATION.Settings.ShadowLength",
    hint: "SCENE_ELEVATION.Settings.ShadowLengthHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.SHADOW_LENGTH],
    choices: {
      off: "SCENE_ELEVATION.Settings.ShadowLengthOff",
      short: "SCENE_ELEVATION.Settings.ShadowLengthShort",
      normal: "SCENE_ELEVATION.Settings.ShadowLengthNormal",
      long: "SCENE_ELEVATION.Settings.ShadowLengthLong",
      extreme: "SCENE_ELEVATION.Settings.ShadowLengthExtreme"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.DEPTH_SCALE, {
    name: "SCENE_ELEVATION.Settings.DepthScale",
    hint: "SCENE_ELEVATION.Settings.DepthScaleHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.DEPTH_SCALE],
    choices: {
      [DEPTH_SCALES.COMPRESSED]: "SCENE_ELEVATION.Settings.DepthScaleCompressed",
      [DEPTH_SCALES.LINEAR]: "SCENE_ELEVATION.Settings.DepthScaleLinear",
      [DEPTH_SCALES.DRAMATIC]: "SCENE_ELEVATION.Settings.DepthScaleDramatic"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED, {
    name: "SCENE_ELEVATION.Settings.TokenScale",
    hint: "SCENE_ELEVATION.Settings.TokenScaleHint",
    scope: "world", config: true, type: Boolean, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_ENABLED],
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_ELEVATION_MODE, {
    name: "SCENE_ELEVATION.Settings.TokenElevationMode",
    hint: "SCENE_ELEVATION.Settings.TokenElevationModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_ELEVATION_MODE],
    choices: {
      [TOKEN_ELEVATION_MODES.ALWAYS]: "SCENE_ELEVATION.Settings.TokenElevationModeAlways",
      [TOKEN_ELEVATION_MODES.NEVER]: "SCENE_ELEVATION.Settings.TokenElevationModeNever",
      [TOKEN_ELEVATION_MODES.PER_REGION]: "SCENE_ELEVATION.Settings.TokenElevationModePerRegion"
    },
    onChange: () => void _refreshAllTokenElevations()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_ELEVATION_ANIMATION_MS, {
    name: "SCENE_ELEVATION.Settings.TokenElevationAnimationMs",
    hint: "SCENE_ELEVATION.Settings.TokenElevationAnimationMsHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_ELEVATION_ANIMATION_MS]
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX, {
    name: "SCENE_ELEVATION.Settings.TokenScaleMax",
    hint: "SCENE_ELEVATION.Settings.TokenScaleMaxHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_MAX],
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS, {
    scope: "client", config: false, type: Boolean, default: false,
    onChange: () => canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility()
  });

  CONFIG.Canvas.layers[ElevationAuthoringLayer.LAYER_NAME] = {
    layerClass: ElevationAuthoringLayer,
    group: "interface"
  };

  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [REGION_BEHAVIOR_TYPE]: ElevationRegionBehavior
  });
  CONFIG.RegionBehavior.typeIcons[REGION_BEHAVIOR_TYPE] = "fa-solid fa-mountain";

  const invalidate = () => {
    if (!canvas?.scene) return;
    RegionElevationRenderer.instance.update();
    void _refreshAllTokenElevations();
    _refreshAllTokenScales();
  };
  registerRegionHooks(invalidate);
  registerElevationControls();

  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = {
    ElevationAuthoringLayer,
    ElevationRegionBehavior,
    RegionElevationRenderer,
    getRegionElevationAtPoint,
    getRegionElevationStateAtPoint,
    getActiveElevationRegions
  };
  else console.error(`[${MODULE_ID}] Module not registered — manifest id likely doesn't match install folder.`);
});

Hooks.once("setup", _patchTokenHudPositioning);
Hooks.once("ready", async () => {
  _patchTokenHudPositioning();
  await _migrateParallaxHeightContrastSetting();
  await _migrateShadowLengthSetting();
});

/* -------------------------------------------- */
/*  Canvas lifecycle                             */
/* -------------------------------------------- */

Hooks.on("canvasReady", async () => {
  RegionElevationRenderer.instance.attach(canvas.scene);
  _refreshAllTokenScales();
  // Defer a second pass to catch any post-ready Foundry canvas refresh that resets mesh scales
  requestAnimationFrame(_refreshAllTokenScales);
});

Hooks.on("canvasTearDown", () => {
  _clearPendingTokenElevationUpdates();
  _clearPendingTokenVisualRefresh();
  RegionElevationRenderer.instance.detach();
});

Hooks.on("canvasPan", () => {
  RegionElevationRenderer.instance.onPan();
});

Hooks.on(`${MODULE_ID}.visualRefresh`, () => _queueTokenVisualRefresh());

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  const geometryChanged = foundry.utils.hasProperty(change, "dimensions") || foundry.utils.hasProperty(change, "grid");
  const sceneSettingsChanged = foundry.utils.hasProperty(change, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`);
  if (!geometryChanged && !sceneSettingsChanged) return;
  RegionElevationRenderer.instance.update();
  if (geometryChanged || sceneSettingsChanged) void _refreshAllTokenElevations();
  _refreshAllTokenScales();
});

Hooks.on("renderRegionConfig", _insertRegionBehaviorDivider);
Hooks.on("renderRegionBehaviorConfig", _insertRegionBehaviorDivider);

function _insertRegionBehaviorDivider(app, html) {
  const root = _renderedHtmlElement(html) ?? app?.element;
  if (!root?.querySelectorAll) return;
  const fields = root.querySelectorAll('[name="system.slopeDirection"], [name$=".slopeDirection"]');
  for (const field of fields) {
    const formGroup = field.closest?.(".form-group") ?? field.parentElement;
    if (!formGroup || formGroup.nextElementSibling?.classList?.contains(`${MODULE_ID}-region-settings-divider`)) continue;
    const divider = document.createElement("div");
    divider.className = `${MODULE_ID}-region-settings-divider`;
    divider.setAttribute("aria-hidden", "true");
    formGroup.after(divider);
  }
  _wireRegionPresetControls(root);
  app?.setPosition?.({ height: "auto" });
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
      _applyRegionPresetToForm(root, target.value);
      return;
    }
    if (REGION_PRESET_CONTROL_FIELDS.has(fieldName)) {
      const currentPresetField = _regionBehaviorField(root, "presetOverride");
      if (currentPresetField && currentPresetField.value !== ELEVATION_PRESETS.CUSTOM) currentPresetField.value = ELEVATION_PRESETS.CUSTOM;
    }
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
}

function _regionBehaviorField(root, fieldName) {
  return root.querySelector(`[name="system.${fieldName}"], [name$=".${fieldName}"]`);
}

function _regionBehaviorFieldName(name) {
  const parts = String(name ?? "").split(".");
  return parts[parts.length - 1] ?? "";
}

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _tokenScaleFactor(token) {
  if (!game.modules.get(MODULE_ID)?.active) return 1;
  if (!getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const entries = getActiveElevationRegions(canvas.scene);
  const state = _tokenElevationState(token.document, { requireTokenScaling: true }, {}, entries);
  if (!state.found) return 1;
  const maxSetting = Number(getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? 1.5);
  const max = Math.max(1, Number.isFinite(maxSetting) ? maxSetting : 1.5);
  const normalized = _normalizedTokenScaleElevation(state.elevation, _tokenScalingElevationRange(entries));
  const factor = normalized >= 0
    ? 1 + normalized * (max - 1)
    : 1 + normalized * (1 - (1 / max));
  return Math.clamp(factor, 1 / max, max);
}

function _normalizedTokenScaleElevation(elevation, range) {
  const value = Number(elevation ?? 0);
  if (!Number.isFinite(value) || Math.abs(value) <= 0.001) return 0;
  if (value > 0) {
    const highest = Math.max(0, Number(range?.highest ?? 0));
    return highest > 0 ? Math.clamp(value / highest, 0, 1) : 0;
  }
  const lowest = Math.min(0, Number(range?.lowest ?? 0));
  return lowest < 0 ? -Math.clamp(Math.abs(value) / Math.abs(lowest), 0, 1) : 0;
}

function _tokenScalingElevationRange(sceneOrEntries = canvas?.scene) {
  const entries = (Array.isArray(sceneOrEntries) ? sceneOrEntries : getActiveElevationRegions(sceneOrEntries))
    .filter(entry => entry.modifyTokenScaling !== false);
  let lowest = 0;
  let highest = 0;
  for (const entry of entries) {
    lowest = Math.min(lowest, Number(entry.lowestElevation ?? entry.elevation ?? 0));
    highest = Math.max(highest, Number(entry.highestElevation ?? entry.elevation ?? 0));
  }
  return { lowest, highest };
}

function _tokenElevationState(tokenDocument, options = {}, position = {}, entries = null) {
  const gridSize = canvas.grid.size ?? 100;
  const x = Number(position.x ?? tokenDocument.x ?? 0);
  const y = Number(position.y ?? tokenDocument.y ?? 0);
  const width = Number(position.width ?? tokenDocument.width ?? 1);
  const height = Number(position.height ?? tokenDocument.height ?? 1);
  const cx = x + (width * gridSize) / 2;
  const cy = y + (height * gridSize) / 2;
  return getRegionElevationStateAtPoint({ x: cx, y: cy }, canvas.scene, entries, options);
}

function _highestTokenElevationState(tokenDocument, position = {}) {
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE) ?? TOKEN_ELEVATION_MODES.PER_REGION;
  switch (mode) {
    case TOKEN_ELEVATION_MODES.NEVER:
      return { skip: true, found: false, elevation: 0, entry: null };
    case TOKEN_ELEVATION_MODES.ALWAYS:
      return _tokenElevationState(tokenDocument, { preferHighest: true }, position);
    case TOKEN_ELEVATION_MODES.PER_REGION:
    default:
      return _tokenElevationState(tokenDocument, { requireTokenElevation: true, preferHighest: true }, position);
  }
}

function _applyTokenScale(token) {
  if (!token?.mesh) return;
  const uuid = token.document?.uuid ?? token.document?.id;
  try {
    const m = token.mesh;
    const skipScale = uuid && _tokensWithPendingMovement.has(uuid);
    if (!skipScale) {
      // Cache the engine-set base scale once, then drive absolute scale =
      // base * factor. This avoids the previous bug where successive refreshes
      // multiplied the scale unboundedly.
      if (!getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) {
        if (m._seBaseScaleX !== undefined) m.scale.set(m._seBaseScaleX, m._seBaseScaleY);
        m._seLastFactor = 1;
      } else if (m._seBaseScaleX === undefined) {
        m._seBaseScaleX = m.scale.x;
        m._seBaseScaleY = m.scale.y;
      } else if (m._seLastFactor && Math.abs(m.scale.x - m._seBaseScaleX * m._seLastFactor) > 1e-4) {
        // If Foundry just rewrote the scale (e.g. token resize / mirror toggle),
        // re-cache by comparing to the previously applied product.
        m._seBaseScaleX = m.scale.x;
        m._seBaseScaleY = m.scale.y;
      }
      if (getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) {
        const factor = _tokenScaleFactor(token);
        m._seLastFactor = factor;
        const sgnX = Math.sign(m._seBaseScaleX) || 1;
        const sgnY = Math.sign(m._seBaseScaleY) || 1;
        m.scale.set(
          Math.abs(m._seBaseScaleX) * factor * sgnX,
          Math.abs(m._seBaseScaleY) * factor * sgnY
        );
      }
    }
    _applyNegativeRegionTokenVisibilityFloor(token);
    _applyTokenParallaxOffset(token);
  } catch (err) {
    // Silent — drawToken can fire before our module/canvas is fully initialised.
  }
}

function _applyNegativeRegionTokenVisibilityFloor(token) {
  const mesh = token?.mesh;
  if (!mesh || !token?.document || !canvas?.scene) return;
  const state = _tokenElevationState(token.document);
  const tokenElevation = Number(token.document.elevation ?? 0);
  const regionElevation = Number(state.elevation ?? 0);
  const standingOnNegativeRegion = state.found
    && regionElevation < 0
    && Number.isFinite(tokenElevation)
    && tokenElevation >= regionElevation - 0.1;
  if (!standingOnNegativeRegion) {
    _clearNegativeRegionTokenVisibilityFloor(token);
    return;
  }
  const documentElevation = Number(token.document.elevation ?? mesh._seVisibilityFloorElevation ?? 0);
  const visibleElevation = Math.max(0, Number.isFinite(documentElevation) ? documentElevation : 0);
  if (mesh._seVisibilityFloorElevation === undefined) {
    mesh._seVisibilityFloorHadElevation = "elevation" in mesh;
    mesh._seVisibilityFloorElevation = mesh.elevation;
    mesh._seVisibilityFloorZIndex = mesh.zIndex;
  }
  mesh.elevation = visibleElevation;
  const zIndex = Number(mesh.zIndex ?? 0);
  mesh.zIndex = Math.max(0, Number.isFinite(zIndex) ? zIndex : 0);
  mesh.parent?.sortableChildren && (mesh.parent.sortDirty = true);
  if (canvas.primary) canvas.primary.sortDirty = true;
}

function _clearNegativeRegionTokenVisibilityFloor(token) {
  const mesh = token?.mesh;
  if (!mesh || mesh._seVisibilityFloorElevation === undefined) return;
  if (mesh._seVisibilityFloorHadElevation) {
    const documentElevation = Number(token?.document?.elevation ?? mesh._seVisibilityFloorElevation ?? 0);
    mesh.elevation = Number.isFinite(documentElevation) ? documentElevation : 0;
  }
  else delete mesh.elevation;
  if (mesh._seVisibilityFloorZIndex !== undefined) mesh.zIndex = mesh._seVisibilityFloorZIndex;
  delete mesh._seVisibilityFloorZIndex;
  delete mesh._seVisibilityFloorHadElevation;
  delete mesh._seVisibilityFloorElevation;
  mesh.parent?.sortableChildren && (mesh.parent.sortDirty = true);
  if (canvas?.primary) canvas.primary.sortDirty = true;
}

function _applyTokenParallaxOffset(token) {
  if (!token?.document) return;
  const offset = RegionElevationRenderer.instance.tokenParallaxOffset(token.document);
  for (const target of _tokenParallaxTargets(token)) _applyDisplayObjectParallaxOffset(target, offset);
  _applyTokenParallaxHitArea(token, offset);
  _refreshTokenHudOffset(token);
}

function _tokenParallaxTargets(token) {
  const targets = [];
  _addTokenParallaxTarget(targets, token?.mesh);
  for (const key of TOKEN_PARALLAX_UI_KEYS) _addTokenParallaxTarget(targets, token?.[key]);
  _addNamedTokenParallaxTargets(targets, token);
  return _dedupeNestedTokenTargets(targets);
}

function _addTokenParallaxTarget(targets, target) {
  if (!target?.position || typeof target.position.set !== "function") return;
  if (!targets.includes(target)) targets.push(target);
}

function _addNamedTokenParallaxTargets(targets, token) {
  if (!token?.children?.length) return;
  const stack = [...token.children];
  let scanned = 0;
  while (stack.length && scanned < TOKEN_PARALLAX_TARGET_SCAN_LIMIT) {
    const child = stack.pop();
    scanned += 1;
    if (!child || child === token) continue;
    if (_looksLikeTokenParallaxUi(child)) _addTokenParallaxTarget(targets, child);
    if (child.children?.length) stack.push(...child.children);
  }
}

function _looksLikeTokenParallaxUi(displayObject) {
  const candidates = [displayObject.name, displayObject.label, displayObject.constructor?.name].filter(value => typeof value === "string");
  return candidates.some(value => TOKEN_PARALLAX_TARGET_NAME_PATTERN.test(value));
}

function _dedupeNestedTokenTargets(targets) {
  return targets.filter(target => !targets.some(candidate => candidate !== target && _displayObjectContains(candidate, target)));
}

function _displayObjectContains(candidate, target) {
  for (let parent = target?.parent; parent; parent = parent.parent) {
    if (parent === candidate) return true;
  }
  return false;
}

function _applyDisplayObjectParallaxOffset(displayObject, offset) {
  if (displayObject._seBasePositionX === undefined) {
    displayObject._seBasePositionX = displayObject.position.x;
    displayObject._seBasePositionY = displayObject.position.y;
  } else if (displayObject._seLastOffset) {
    const expectedX = displayObject._seBasePositionX + displayObject._seLastOffset.x;
    const expectedY = displayObject._seBasePositionY + displayObject._seLastOffset.y;
    if (Math.abs(displayObject.position.x - expectedX) > 0.5 || Math.abs(displayObject.position.y - expectedY) > 0.5) {
      displayObject._seBasePositionX = displayObject.position.x;
      displayObject._seBasePositionY = displayObject.position.y;
    }
  }
  displayObject._seLastOffset = offset;
  displayObject.position.set(displayObject._seBasePositionX + offset.x, displayObject._seBasePositionY + offset.y);
}

function _clearTokenParallaxCaches(token) {
  for (const target of _tokenParallaxTargets(token)) _clearDisplayObjectParallaxCache(target);
  _clearTokenParallaxHitArea(token);
}

function _clearDisplayObjectParallaxCache(displayObject) {
  if (!displayObject) return;
  if (displayObject?._seBasePositionX !== undefined && displayObject?._seBasePositionY !== undefined) {
    displayObject.position?.set?.(displayObject._seBasePositionX, displayObject._seBasePositionY);
  }
  delete displayObject._seBasePositionX;
  delete displayObject._seBasePositionY;
  delete displayObject._seLastOffset;
}

function _applyTokenParallaxHitArea(token, offset) {
  if (!token) return;
  if (Math.hypot(offset.x, offset.y) <= TOKEN_PARALLAX_HIT_AREA_EPSILON) {
    _clearTokenParallaxHitArea(token);
    return;
  }
  const currentHitArea = token.hitArea ?? null;
  if (token._seBaseHitArea === undefined) token._seBaseHitArea = currentHitArea;
  else if (currentHitArea && currentHitArea !== token._seBaseHitArea && currentHitArea !== token._seShiftedHitArea) token._seBaseHitArea = currentHitArea;

  const baseHitArea = token._seBaseHitArea ?? _tokenFallbackHitArea(token);
  const shiftedHitArea = _shiftHitArea(baseHitArea, offset);
  if (!shiftedHitArea) return;
  token._seShiftedHitArea = shiftedHitArea;
  token.hitArea = shiftedHitArea;
}

function _clearTokenParallaxHitArea(token) {
  if (!token || token._seBaseHitArea === undefined) return;
  token.hitArea = token._seBaseHitArea;
  delete token._seBaseHitArea;
  delete token._seShiftedHitArea;
}

function _tokenFallbackHitArea(token) {
  const gridSize = canvas.grid?.size ?? 100;
  const width = Number(token.w ?? (Number(token.document?.width ?? 1) * gridSize));
  const height = Number(token.h ?? (Number(token.document?.height ?? 1) * gridSize));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return new PIXI.Rectangle(0, 0, width, height);
}

function _shiftHitArea(hitArea, offset) {
  if (!hitArea) return null;
  if (hitArea instanceof PIXI.Rectangle) return new PIXI.Rectangle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height);
  if (hitArea instanceof PIXI.Circle) return new PIXI.Circle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.radius);
  if (hitArea instanceof PIXI.Ellipse) return new PIXI.Ellipse(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height);
  if (PIXI.RoundedRectangle && hitArea instanceof PIXI.RoundedRectangle) return new PIXI.RoundedRectangle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height, hitArea.radius);
  if (hitArea instanceof PIXI.Polygon) return new PIXI.Polygon(hitArea.points.map((point, index) => point + (index % 2 === 0 ? offset.x : offset.y)));
  return null;
}

function _patchTokenHudPositioning() {
  const globalTokenHud = Object.getOwnPropertyDescriptor(globalThis, "TokenHUD")?.value;
  const hudClasses = [CONFIG.Token?.hudClass, foundry.applications?.hud?.TokenHUD, globalTokenHud].filter(Boolean);
  for (const hudClass of new Set(hudClasses)) _patchTokenHudClass(hudClass);
}

async function _migrateParallaxHeightContrastSetting() {
  if (!game.user?.isGM) return;
  const current = game.settings.get(MODULE_ID, SETTINGS.PARALLAX_HEIGHT_CONTRAST);
  const key = parallaxHeightContrastKey(current);
  if (current !== key) await game.settings.set(MODULE_ID, SETTINGS.PARALLAX_HEIGHT_CONTRAST, key);
}

async function _migrateShadowLengthSetting() {
  if (!game.user?.isGM) return;
  const current = game.settings.get(MODULE_ID, SETTINGS.SHADOW_LENGTH);
  const key = shadowLengthKey(current);
  if (current !== key) await game.settings.set(MODULE_ID, SETTINGS.SHADOW_LENGTH, key);
}

function _patchTokenHudClass(hudClass) {
  const prototype = hudClass?.prototype;
  if (!prototype || prototype[TOKEN_HUD_POSITION_PATCHED] || typeof prototype.setPosition !== "function") return;
  const originalSetPosition = prototype.setPosition;
  prototype.setPosition = function(position = {}) {
    const result = originalSetPosition.call(this, position);
    _applyTokenHudParallaxOffset(this);
    return result;
  };
  Object.defineProperty(prototype, TOKEN_HUD_POSITION_PATCHED, { value: true });
}

function _refreshTokenHudOffset(token) {
  for (const hud of _tokenHudCandidates()) {
    if (hud?.object === token) _applyTokenHudParallaxOffset(hud);
  }
}

function _applyTokenHudParallaxOffset(hud) {
  const token = hud?.object;
  const element = _tokenHudElement(hud);
  if (!token?.document || !element) return;
  const offset = RegionElevationRenderer.instance.tokenParallaxOffset(token.document);
  const viewportOffset = _tokenOffsetToViewport(token, offset);
  const hudOffset = _viewportOffsetToOffsetParent(element, viewportOffset);
  _applyTokenHudElementOffset(element, hudOffset);
}

function _tokenHudCandidates() {
  return [canvas?.tokens?.hud, canvas?.hud?.token, ui?.hud?.token]
    .filter((hud, index, huds) => hud && huds.indexOf(hud) === index);
}

function _tokenHudElement(hud) {
  if (hud?.element instanceof HTMLElement) return hud.element;
  if (hud?.element?.[0] instanceof HTMLElement) return hud.element[0];
  if (hud?._element instanceof HTMLElement) return hud._element;
  if (hud?._element?.[0] instanceof HTMLElement) return hud._element[0];
  return document.getElementById("token-hud");
}

function _applyTokenHudElementOffset(element, offset) {
  _updateTokenHudBasePosition(element);
  if (Math.hypot(offset.x, offset.y) <= TOKEN_PARALLAX_HIT_AREA_EPSILON) {
    _clearTokenHudElementOffset(element);
    return;
  }
  element._seLastHudOffset = offset;
  element.style.left = `${element._seBaseHudLeft + offset.x}px`;
  element.style.top = `${element._seBaseHudTop + offset.y}px`;
  element.style.translate = "";
}

function _updateTokenHudBasePosition(element) {
  const currentLeft = _stylePixels(element.style.left, element.offsetLeft);
  const currentTop = _stylePixels(element.style.top, element.offsetTop);
  if (element._seBaseHudLeft === undefined || element._seBaseHudTop === undefined) {
    element._seBaseHudLeft = currentLeft;
    element._seBaseHudTop = currentTop;
    return;
  }
  const lastOffset = element._seLastHudOffset;
  if (!lastOffset) {
    element._seBaseHudLeft = currentLeft;
    element._seBaseHudTop = currentTop;
    return;
  }
  const expectedLeft = element._seBaseHudLeft + lastOffset.x;
  const expectedTop = element._seBaseHudTop + lastOffset.y;
  if (Math.abs(currentLeft - expectedLeft) > 0.5 || Math.abs(currentTop - expectedTop) > 0.5) {
    element._seBaseHudLeft = currentLeft;
    element._seBaseHudTop = currentTop;
  }
}

function _clearTokenHudElementOffset(element) {
  if (element._seBaseHudLeft !== undefined && element._seBaseHudTop !== undefined) {
    element.style.left = `${element._seBaseHudLeft}px`;
    element.style.top = `${element._seBaseHudTop}px`;
  }
  element.style.translate = "";
  delete element._seBaseHudLeft;
  delete element._seBaseHudTop;
  delete element._seLastHudOffset;
}

function _stylePixels(value, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : Number(fallback) || 0;
}

function _tokenOffsetToViewport(token, offset) {
  const reference = _tokenParallaxReferenceParent(token);
  if (typeof reference?.toGlobal === "function") {
    try {
      const origin = reference.toGlobal(new PIXI.Point(0, 0));
      const shifted = reference.toGlobal(new PIXI.Point(offset.x, offset.y));
      const viewportOffset = _rendererOffsetToCss({ x: shifted.x - origin.x, y: shifted.y - origin.y });
      if (Number.isFinite(viewportOffset.x) && Number.isFinite(viewportOffset.y)) return viewportOffset;
    } catch (err) {}
  }
  const scale = canvas.stage?.scale ?? { x: 1, y: 1 };
  return _rendererOffsetToCss({
    x: offset.x * (Number(scale.x) || 1),
    y: offset.y * (Number(scale.y) || 1)
  });
}

function _tokenParallaxReferenceParent(token) {
  const meshParent = token?.mesh?.parent;
  if (meshParent && typeof meshParent.toGlobal === "function") return meshParent;
  if (typeof token?.toGlobal === "function") return token;
  return canvas.stage;
}

function _rendererOffsetToCss(offset) {
  const renderer = canvas.app?.renderer;
  const view = renderer?.view ?? canvas.app?.view ?? canvas.app?.canvas;
  const rect = view?.getBoundingClientRect?.();
  const screen = renderer?.screen;
  const scaleX = rect?.width && screen?.width ? rect.width / screen.width : 1;
  const scaleY = rect?.height && screen?.height ? rect.height / screen.height : 1;
  return {
    x: offset.x * scaleX,
    y: offset.y * scaleY
  };
}

function _viewportOffsetToOffsetParent(element, offset) {
  const parent = element.offsetParent ?? element.parentElement;
  const rect = parent?.getBoundingClientRect?.();
  const scaleX = rect?.width && parent?.offsetWidth ? rect.width / parent.offsetWidth : 1;
  const scaleY = rect?.height && parent?.offsetHeight ? rect.height / parent.offsetHeight : 1;
  return {
    x: offset.x / (Number(scaleX) || 1),
    y: offset.y / (Number(scaleY) || 1)
  };
}

function _refreshAllTokenScales() {
  if (!canvas?.tokens) return;
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

function _queueTokenVisualRefresh() {
  if (_tokenVisualRefreshFrame) return;
  _tokenVisualRefreshFrame = requestAnimationFrame(() => {
    _tokenVisualRefreshFrame = null;
    _refreshAllTokenScales();
  });
}

function _clearPendingTokenVisualRefresh() {
  if (_tokenVisualRefreshFrame) cancelAnimationFrame(_tokenVisualRefreshFrame);
  _tokenVisualRefreshFrame = null;
}

async function _syncTokenElevation(tokenDocument, position = {}) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (_syncingTokenElevation.has(uuid)) return;

  const state = _highestTokenElevationState(tokenDocument, position);
  if (state.skip) return;
  const current = Number(tokenDocument.elevation ?? 0);
  const target = state.found ? state.elevation : 0;
  if (Math.abs(current - target) <= 0.001) return;
  _syncingTokenElevation.add(uuid);
  try {
    await tokenDocument.update({ elevation: target }, { animation: { duration: _tokenElevationAnimationDuration() } });
    _applyTokenScale(tokenDocument.object);
  } finally {
    _syncingTokenElevation.delete(uuid);
  }
}

function _queueTokenElevationAfterMovement(tokenDocument, change = {}, options = {}) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  const pending = _pendingTokenElevationUpdates.get(uuid);
  if (pending) cancelAnimationFrame(pending.frame);
  _tokensWithPendingMovement.add(uuid);
  const finalPosition = _tokenMovementPosition(tokenDocument, change);

  // Immediately apply scale for the destination position so there is no
  // jarring snap after the elevation-sync delay.  Scale is computed from
  // tokenDocument.x/y which Foundry has already set to the new position.
  const _immediateToken = tokenDocument.object;
  if (_immediateToken) {
    _tokensWithPendingMovement.delete(uuid);
    _applyTokenScale(_immediateToken);
    _tokensWithPendingMovement.add(uuid);
  }

  const started = performance.now();
  const sceneId = canvas.scene.id;
  const animationDuration = _tokenMovementAnimationDuration(options);
  const waitForMovement = () => {
    if (!canvas?.scene || canvas.scene.id !== sceneId || tokenDocument.parent !== canvas.scene) {
      _pendingTokenElevationUpdates.delete(uuid);
      _tokensWithPendingMovement.delete(uuid);
      return;
    }
    const elapsed = performance.now() - started;
    const waitingForAnimation = elapsed < animationDuration;
    const waitingForPosition = !_tokenMovementSettled(tokenDocument) && elapsed < TOKEN_ELEVATION_SETTLE_TIMEOUT_MS;
    if (waitingForAnimation || waitingForPosition) {
      const frame = requestAnimationFrame(waitForMovement);
      _pendingTokenElevationUpdates.set(uuid, { frame });
      return;
    }
    _pendingTokenElevationUpdates.delete(uuid);
    _tokensWithPendingMovement.delete(uuid);
    void _syncTokenElevation(tokenDocument, finalPosition);
  };
  const frame = requestAnimationFrame(waitForMovement);
  _pendingTokenElevationUpdates.set(uuid, { frame });
}

function _markTokenMovementStarting(tokenDocument) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (!uuid) return;
  _tokensWithPendingMovement.add(uuid);
  requestAnimationFrame(() => {
    if (_pendingTokenElevationUpdates.has(uuid)) return;
    requestAnimationFrame(() => {
      if (!_pendingTokenElevationUpdates.has(uuid)) _tokensWithPendingMovement.delete(uuid);
    });
  });
}

function _hasTokenMovementChange(change = {}) {
  return foundry.utils.hasProperty(change, "x")
    || foundry.utils.hasProperty(change, "y")
    || foundry.utils.hasProperty(change, "width")
    || foundry.utils.hasProperty(change, "height");
}

function _tokenMovementPosition(tokenDocument, change = {}) {
  return {
    x: foundry.utils.hasProperty(change, "x") ? Number(change.x) : Number(tokenDocument.x ?? 0),
    y: foundry.utils.hasProperty(change, "y") ? Number(change.y) : Number(tokenDocument.y ?? 0),
    width: foundry.utils.hasProperty(change, "width") ? Number(change.width) : Number(tokenDocument.width ?? 1),
    height: foundry.utils.hasProperty(change, "height") ? Number(change.height) : Number(tokenDocument.height ?? 1)
  };
}

function _tokenMovementAnimationDuration(options = {}) {
  const duration = Number(options.animation?.duration ?? options.animate?.duration ?? 0);
  return Number.isFinite(duration) && duration > 0 ? Math.min(duration, TOKEN_ELEVATION_SETTLE_TIMEOUT_MS) : TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS;
}

function _tokenElevationAnimationDuration() {
  return Math.clamp(Number(getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS) ?? 120), 0, 600);
}

function _tokenMovementSettled(tokenDocument) {
  const token = tokenDocument.object;
  if (!token) return true;
  return !_tokenObjectOutOfSyncWithDocument(token);
}

function _tokenObjectOutOfSyncWithDocument(token) {
  const tokenDocument = token?.document;
  if (!tokenDocument) return false;
  const x = Number(token.x ?? token.position?.x ?? tokenDocument.x ?? 0);
  const y = Number(token.y ?? token.position?.y ?? tokenDocument.y ?? 0);
  return Math.abs(x - Number(tokenDocument.x ?? 0)) >= 0.5 || Math.abs(y - Number(tokenDocument.y ?? 0)) >= 0.5;
}

function _clearPendingTokenElevationUpdates() {
  for (const pending of _pendingTokenElevationUpdates.values()) cancelAnimationFrame(pending.frame);
  _pendingTokenElevationUpdates.clear();
  _tokensWithPendingMovement.clear();
}

async function _refreshAllTokenElevations() {
  if (!canvas?.tokens) return;
  await Promise.all(canvas.tokens.placeables.map(token => _syncTokenElevation(token.document)));
}

Hooks.on("drawToken", (token) => {
  // Clear stale mesh cache so the upcoming refreshToken re-caches from Foundry's finalized scale
  const m = token?.mesh;
  if (m) {
    delete m._seBaseScaleX;
    delete m._seBaseScaleY;
    delete m._seLastFactor;
  }
  _clearTokenParallaxCaches(token);
  _applyTokenScale(token);
});
Hooks.on("refreshToken", _applyTokenScale);
Hooks.on("targetToken", (_user, token) => {
  if (!token) return;
  requestAnimationFrame(() => {
    _clearTokenParallaxCaches(token);
    _applyTokenScale(token);
  });
});
Hooks.on("createToken", (document) => {
  if (document.parent !== canvas?.scene) return;
  void _syncTokenElevation(document);
});
Hooks.on("preUpdateToken", (document, change) => {
  if (!_hasTokenMovementChange(change)) return;
  _markTokenMovementStarting(document);
});
Hooks.on("updateToken", (document, change, options) => {
  if (document.parent !== canvas?.scene) return;
  if (_hasTokenMovementChange(change)) {
    _queueTokenElevationAfterMovement(document, change, options);
    return;
  }
  _applyTokenScale(document.object);
});
