import { MODULE_ID, SETTINGS, SCENE_SETTINGS_FLAG, SCENE_SETTING_KEYS, ELEVATION_DEFAULT_SETTINGS, ELEVATION_PRESETS, ELEVATION_PRESET_SETTING_KEYS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, TOKEN_ELEVATION_MODES, DEPTH_SCALES, ELEVATION_SCALE_LIMITS, EDGE_STRETCH_LIMITS, REGION_BEHAVIOR_TYPE, ELEVATED_GRID_MODES, edgeStretchPercentValue, elevatedGridModeValue, elevationPresetValues, getSceneElevationClientEnabled, getSceneElevationSetting, parallaxHeightContrastKey, setSceneElevationClientEnabled, shadowLengthKey } from "./config.mjs";
import { ElevationAuthoringLayer, registerElevationControls } from "./elevation-controls.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import {
  RegionElevationRenderer,
  getRegionElevationAtPoint,
  getRegionElevationStateAtPoint,
  getActiveElevationRegions,
  isTemporaryParallaxDisabled,
  regionContainsPoint,
  setTemporaryParallaxDisabled
} from "./region-elevation-renderer.mjs";

const TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS = 250;
const TOKEN_ELEVATION_SETTLE_TIMEOUT_MS = 900;
const TOKEN_MOVEMENT_DELTA_OPTION = "sceneElevationRegionHasMovementDelta";
const TOKEN_MOVEMENT_POSITION_EPSILON = 0.5;
const TOKEN_MOVEMENT_SIZE_EPSILON = 0.001;
const TOKEN_PARALLAX_UI_KEYS = Object.freeze([
  "border", "nameplate", "tooltip", "elevationLabel", "elevationText", "elevationTooltip",
  "bars", "bar1", "bar2", "resourceBars", "attributeBars", "healthBar", "healthBars",
  "effects", "effectIcons", "statusEffects", "overlay", "overlayEffect", "controlIcon", "controlIcons", "hud", "tokenHud",
  "targetArrows", "targetPips", "targetIcon", "targetReticle", "targetReticule", "targetCrosshair", "targetControl", "targetIndicator", "targetMarker"
]);
const TOKEN_PARALLAX_TARGET_NAME_PATTERN = /target|crosshair|reticle|reticule|bar|resource|health|stamina|effect|status|control|hud|overlay/i;
const TOKEN_PARALLAX_TARGET_SCAN_LIMIT = 80;
const TOKEN_PARALLAX_HIT_AREA_EPSILON = 0.5;
const ZERO_PARALLAX_OFFSET = Object.freeze({ x: 0, y: 0 });
const TOKEN_HUD_POSITION_PATCHED = "_sceneElevationRegionHudPositionPatched";
const TOKEN_RULER_GUIDE_PATCHED = "_sceneElevationRegionRulerGuidePatched";
const MOUSE_DRIFT_WORLD_DEFAULTS_VERSION = "mouse-drift-defaults-v2";
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
const _syncingTokenElevation = new Set();
const _pendingTokenElevationUpdates = new Map();
const _tokensWithPendingMovement = new Set();
const _tokenMovementStartStates = new Map();
const _tokenOverheadRefreshStates = new WeakMap();
const _tokenUpdateMovementDeltas = new Map();
let _tokenVisualRefreshFrame = null;
let _regionOverheadRefreshFrame = null;
let _elevatedGridRefreshFrame = null;
let _hoveredElevatedGridToken = null;
let _dragElevatedGridToken = null;
let _rulerElevatedGridContext = null;
let _rulerElevatedGridClearFrame = null;

// Diagnostic logging for token-elevation issues. Enable via:
//   game.modules.get("scene-elevation-region").api.setDebug(true)
// or set window.SCENE_ELEVATION_DEBUG = true in the F12 console.
let _DEBUG = false;
function _dsLog(tag, ...args) {
  if (!_DEBUG && !globalThis.SCENE_ELEVATION_DEBUG) return;
  const tokenArg = args.find(a => a?.name && a?.id);
  const label = tokenArg ? `${tokenArg.name}#${tokenArg.id}` : "";
  // eslint-disable-next-line no-console
  console.log(`[scene-elevation-region:${tag}]`, label, ...args);
}

function _sceneElevationClientEnabled() {
  return getSceneElevationClientEnabled();
}

function _refreshSceneElevationClientState(enabled = _sceneElevationClientEnabled()) {
  setSceneElevationClientEnabled(enabled);
  _clearPendingTokenVisualRefresh();
  _clearPendingRegionOverheadRefresh();
  try { globalThis.ui?.controls?.render?.({ force: true }); }
  catch (err) { globalThis.ui?.controls?.render?.(true); }
  if (!enabled) {
    _clearPendingTokenElevationUpdates();
    _clearPendingElevatedGridRefresh();
    RegionElevationRenderer.instance.detach();
    _resetAllTokenVisuals();
    canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.activateTool(null);
    canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility(false);
    return;
  }
  if (canvas?.scene) {
    RegionElevationRenderer.instance.attach(canvas.scene);
    void _refreshAllTokenElevations();
    _refreshAllTokenScales();
    requestAnimationFrame(_refreshAllTokenScales);
  }
  canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility();
}

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

function _registerKeybindings() {
  game.keybindings.register(MODULE_ID, "toggleParallaxOverlay", {
    name: "SCENE_ELEVATION.Keybindings.ToggleParallaxOverlay",
    hint: "SCENE_ELEVATION.Keybindings.ToggleParallaxOverlayHint",
    editable: [{ key: "KeyO" }],
    restricted: false,
    onDown: () => _toggleTemporaryParallaxOverlay()
  });
}

function _toggleTemporaryParallaxOverlay() {
  const disabled = !isTemporaryParallaxDisabled();
  setTemporaryParallaxDisabled(disabled);
  RegionElevationRenderer.instance.update();
  _refreshAllTokenScales();
  _refreshAllTokenParallax();
  _queueElevatedGridRefresh();
  const message = disabled
    ? "SCENE_ELEVATION.Notify.ParallaxTemporarilyOff"
    : "SCENE_ELEVATION.Notify.ParallaxRestored";
  ui.notifications.info(game.i18n.localize(message));
  return true;
}

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  _registerKeybindings();

  game.settings.register(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION, {
    scope: "world", config: false, type: String, default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.CLIENT_ENABLED, {
    name: "SCENE_ELEVATION.Settings.ClientEnabled",
    hint: "SCENE_ELEVATION.Settings.ClientEnabledHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: enabled => _refreshSceneElevationClientState(enabled)
  });
  try { setSceneElevationClientEnabled(game.settings.get(MODULE_ID, SETTINGS.CLIENT_ENABLED)); }
  catch (err) { setSceneElevationClientEnabled(true); }

  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID, {
    name: "SCENE_ELEVATION.Settings.ShowElevatedGrid",
    hint: "SCENE_ELEVATION.Settings.ShowElevatedGridHint",
    scope: "client",
    config: true,
    type: String,
    default: ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID,
    choices: {
      [ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID]: "SCENE_ELEVATION.Settings.ShowElevatedGridOverrideSceneGrid",
      [ELEVATED_GRID_MODES.INTERACTION]: "SCENE_ELEVATION.Settings.ShowElevatedGridInteraction",
      [ELEVATED_GRID_MODES.OFF]: "SCENE_ELEVATION.Settings.ShowElevatedGridOff"
    },
    onChange: () => _queueElevatedGridRefresh()
  });

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
      trace: "SCENE_ELEVATION.Settings.ParallaxTrace",
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
      reduced: "SCENE_ELEVATION.Settings.ParallaxHeightContrastReduced",
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
      [PARALLAX_MODES.ANCHORED_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard",
      [PARALLAX_MODES.VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard",
      [PARALLAX_MODES.ANCHORED_VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard",
      [PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN]: "SCENE_ELEVATION.Settings.ParallaxModeOrthographicTopDown",
      [PARALLAX_MODES.ORTHOGRAPHIC_ANGLE]: "SCENE_ELEVATION.Settings.ParallaxModeOrthographicAngle",
      [PARALLAX_MODES.LAYERED]: "SCENE_ELEVATION.Settings.ParallaxModeLayered",
      [PARALLAX_MODES.HORIZONTAL_SCROLL]: "SCENE_ELEVATION.Settings.ParallaxModeHorizontalScroll",
      [PARALLAX_MODES.VERTICAL_SCROLL]: "SCENE_ELEVATION.Settings.ParallaxModeVerticalScroll",
      [PARALLAX_MODES.MOUSE]: "SCENE_ELEVATION.Settings.ParallaxModeMouse",
      [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow",
      [PARALLAX_MODES.TOP_DOWN_HEIGHT]: "SCENE_ELEVATION.Settings.ParallaxModeTopDownHeight"
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
      [PERSPECTIVE_POINTS.NEAREST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge",
      [PERSPECTIVE_POINTS.SCENE_CAMERA_OFFSET]: "SCENE_ELEVATION.Settings.PerspectivePointSceneCameraOffset"
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
      [BLEND_MODES.EDGE_STRETCH]: "SCENE_ELEVATION.Settings.BlendModeEdgeStretch",
      [BLEND_MODES.CLIFF_WARP]: "SCENE_ELEVATION.Settings.BlendModeCliffWarp",
      [BLEND_MODES.EXTRUDED_WALLS]: "SCENE_ELEVATION.Settings.BlendModeExtrudedWalls"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.EDGE_STRETCH_PERCENT, {
    name: "SCENE_ELEVATION.Settings.EdgeStretchPercent",
    hint: "SCENE_ELEVATION.Settings.EdgeStretchPercentHint",
    scope: "world",
    config: true,
    type: Number,
    default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.EDGE_STRETCH_PERCENT],
    range: { min: EDGE_STRETCH_LIMITS.MIN, max: EDGE_STRETCH_LIMITS.MAX, step: EDGE_STRETCH_LIMITS.STEP },
    onChange: () => RegionElevationRenderer.instance.update()
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
  game.settings.register(MODULE_ID, SETTINGS.ELEVATION_SCALE, {
    name: "SCENE_ELEVATION.Settings.ElevationScale",
    hint: "SCENE_ELEVATION.Settings.ElevationScaleHint",
    scope: "world",
    config: true,
    type: Number,
    default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.ELEVATION_SCALE],
    range: { min: ELEVATION_SCALE_LIMITS.MIN, max: ELEVATION_SCALE_LIMITS.MAX, step: ELEVATION_SCALE_LIMITS.STEP },
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
  CONFIG.RegionBehavior.typeIcons[REGION_BEHAVIOR_TYPE] = "fa-solid fa-arrows-up-to-line";

  const invalidate = () => {
    if (!canvas?.scene || !_sceneElevationClientEnabled()) return;
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
    getActiveElevationRegions,
    isEnabled: _sceneElevationClientEnabled,
    setDebug: (on = true) => { _DEBUG = !!on; console.log(`[${MODULE_ID}] debug logging ${_DEBUG ? "enabled" : "disabled"}`); }
  };
  else console.error(`[${MODULE_ID}] Module not registered — manifest id likely doesn't match install folder.`);
});

Hooks.once("setup", () => {
  _patchTokenHudPositioning();
  _patchTokenRulerParallaxGuide();
});
Hooks.once("ready", async () => {
  _patchTokenHudPositioning();
  _patchTokenRulerParallaxGuide();
  await _migrateParallaxHeightContrastSetting();
  await _migrateShadowLengthSetting();
  await _migrateMouseDriftWorldDefaults();
});

/* -------------------------------------------- */
/*  Canvas lifecycle                             */
/* -------------------------------------------- */

Hooks.on("canvasReady", async () => {
  if (!_sceneElevationClientEnabled()) {
    RegionElevationRenderer.instance.detach();
    _resetAllTokenVisuals();
    return;
  }
  RegionElevationRenderer.instance.attach(canvas.scene);
  void _refreshAllTokenElevations();
  _refreshAllTokenScales();
  // Defer a second pass to catch any post-ready Foundry canvas refresh that resets mesh scales
  requestAnimationFrame(_refreshAllTokenScales);
  _queueElevatedGridRefresh();
});

Hooks.on("canvasTearDown", () => {
  _clearPendingTokenElevationUpdates();
  _clearPendingTokenVisualRefresh();
  _clearPendingRegionOverheadRefresh();
  _clearPendingElevatedGridRefresh();
  RegionElevationRenderer.instance.detach();
});

Hooks.on("canvasPan", () => {
  if (!_sceneElevationClientEnabled()) return;
  RegionElevationRenderer.instance.onPan();
  _queueElevatedGridRefresh();
});

Hooks.on("refreshTile", (tile) => {
  const mesh = tile?.mesh;
  if (!mesh) return;
  // Foundry just reset the mesh transform back to its base position. Clear
  // our recorded offset so the next apply pass treats it as a fresh state,
  // then re-apply the current parallax offset on top.
  mesh._sceneElevationParallaxOffset = null;
  RegionElevationRenderer.instance.applyTileParallaxForTile(tile);
});

Hooks.on(`${MODULE_ID}.visualRefresh`, () => _queueTokenVisualRefresh());
Hooks.on(`${MODULE_ID}.parallaxRefresh`, () => _queueTokenParallaxRefresh());

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  const geometryChanged = foundry.utils.hasProperty(change, "dimensions") || foundry.utils.hasProperty(change, "grid");
  const sceneSettingsChanged = foundry.utils.hasProperty(change, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`);
  if (!geometryChanged && !sceneSettingsChanged) return;
  if (!_sceneElevationClientEnabled()) return;
  RegionElevationRenderer.instance.update();
  if (geometryChanged || sceneSettingsChanged) void _refreshAllTokenElevations();
  _refreshAllTokenScales();
  _queueElevatedGridRefresh();
});

Hooks.on("renderRegionConfig", _insertRegionBehaviorDivider);
Hooks.on("renderRegionBehaviorConfig", _insertRegionBehaviorDivider);

function _insertRegionBehaviorDivider(app, html) {
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

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _tokenScaleFactor(token) {
  if (!game.modules.get(MODULE_ID)?.active) return 1;
  if (!_sceneElevationClientEnabled()) return 1;
  if (!getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const entries = getActiveElevationRegions(canvas.scene);
  const state = _tokenElevationState(token.document, { requireTokenScaling: true, allowOverheadSupport: true }, {}, entries);
  if (!state.found) return 1;
  const maxSetting = Number(getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? 1.5);
  const max = Math.max(1, Number.isFinite(maxSetting) ? maxSetting : 1.5);
  const range = _tokenScalingElevationRange(entries);
  if (state.entry?.overhead) {
    range.lowest = Math.min(range.lowest, Number(state.elevation ?? 0));
    range.highest = Math.max(range.highest, Number(state.elevation ?? 0));
  }
  const normalized = _normalizedTokenScaleElevation(state.elevation, range);
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
  const activeEntries = entries ?? getActiveElevationRegions(canvas.scene);
  if (!activeEntries.length || !_tokenBoundsIntersectEntries(tokenDocument, position, activeEntries)) return { found: false, elevation: 0, entry: null };
  const points = _tokenElevationSamplePoints(tokenDocument, position);
  let best = getRegionElevationStateAtPoint(points[0], canvas.scene, activeEntries, options);
  if (best.found && !options.preferHighest) return best;
  for (const point of points.slice(1)) {
    const state = getRegionElevationStateAtPoint(point, canvas.scene, activeEntries, options);
    if (!state.found) continue;
    if (!best.found || _tokenElevationStatePreferred(state, best, options)) best = state;
  }
  return best;
}

function _tokenElevationStatePreferred(state, best, options = {}) {
  if (options.preferHighest) return state.elevation > best.elevation;
  const stateArea = state.entry?.area ?? Infinity;
  const bestArea = best.entry?.area ?? Infinity;
  return stateArea < bestArea || (stateArea === bestArea && state.elevation > best.elevation);
}

function _tokenElevationSamplePoints(tokenDocument, position = {}) {
  const gridSize = _canvasGridSize();
  const x = _finitePositionValue(position.x, tokenDocument.x ?? 0);
  const y = _finitePositionValue(position.y, tokenDocument.y ?? 0);
  const width = Math.max(0.25, _finitePositionValue(position.width, tokenDocument.width ?? 1)) * gridSize;
  const height = Math.max(0.25, _finitePositionValue(position.height, tokenDocument.height ?? 1)) * gridSize;
  const insetX = Math.min(width / 2, Math.max(1, gridSize * 0.2));
  const insetY = Math.min(height / 2, Math.max(1, gridSize * 0.2));
  const elevation = _finitePositionValue(tokenDocument.elevation, 0);
  return [
    { x: x + width / 2, y: y + height / 2, elevation },
    { x: x + insetX, y: y + insetY, elevation },
    { x: x + width - insetX, y: y + insetY, elevation },
    { x: x + insetX, y: y + height - insetY, elevation },
    { x: x + width - insetX, y: y + height - insetY, elevation }
  ];
}

function _canvasGridSize() {
  const size = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? canvas?.dimensions?.size ?? 100);
  return Number.isFinite(size) && size > 0 ? size : 100;
}

function _finitePositionValue(value, fallback) {
  if (value === null || value === undefined || value === "") return Number(fallback) || 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number(fallback) || 0;
}

// Safe live-position read for a Token. The PIXI DisplayObject `x`/`y` getters
// dereference `this.position`, which is null on destroyed objects. Foundry can
// fire refreshToken-style work just after a token is destroyed (animation
// teardown, scene swap, libwrapper races), so we must guard every live read.
function _safeTokenLivePoint(token, doc) {
  if (!token || token.destroyed) {
    return { x: Number(doc?.x ?? 0), y: Number(doc?.y ?? 0) };
  }
  let lx;
  let ly;
  try {
    if (token.position) {
      lx = token.position.x;
      ly = token.position.y;
    }
  } catch (_err) { /* destroyed mid-read */ }
  if (!Number.isFinite(lx)) lx = Number(doc?.x ?? 0);
  if (!Number.isFinite(ly)) ly = Number(doc?.y ?? 0);
  return { x: lx, y: ly };
}

// Quantize a live coordinate so per-frame parallax recomputes coalesce. The
// region point-in-polygon test only changes outcome when the token crosses
// region edges (typically tens of pixels apart). Quantizing to a quarter of
// the grid is invisible to the eye but cuts the heavy scan from per-pixel to
// per-grid-quarter during drag/animation.
function _quantizeLivePosition(value, gridSize) {
  if (!Number.isFinite(value)) return 0;
  const step = Math.max(8, Math.floor((gridSize || 100) / 4));
  return Math.round(value / step) * step;
}

function _tokenDocumentBounds(tokenDocument, position = {}) {
  const gridSize = _canvasGridSize();
  const x = _finitePositionValue(position.x, tokenDocument?.x ?? 0);
  const y = _finitePositionValue(position.y, tokenDocument?.y ?? 0);
  const width = Math.max(0.25, _finitePositionValue(position.width, tokenDocument?.width ?? 1)) * gridSize;
  const height = Math.max(0.25, _finitePositionValue(position.height, tokenDocument?.height ?? 1)) * gridSize;
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function _tokenBoundsIntersectEntries(tokenDocument, position = {}, entries = []) {
  if (!tokenDocument || !entries.length) return false;
  const bounds = _tokenDocumentBounds(tokenDocument, position);
  return entries.some(entry => {
    const entryBounds = entry?.bounds;
    if (!entryBounds) return true;
    return bounds.maxX >= entryBounds.minX - 1
      && bounds.minX <= entryBounds.maxX + 1
      && bounds.maxY >= entryBounds.minY - 1
      && bounds.minY <= entryBounds.maxY + 1;
  });
}

// A token object is the "canonical" representation of its document when it
// is the placeable returned by canvas.tokens.get(id). Foundry's drag preview
// clones live in canvas.tokens.preview, so canvas.tokens.get(id) still
// resolves to the original token. We use this to skip elevation scaling on
// drag preview clones whose mesh inherits the original's already-elevated
// scale (capturing that as a new "base" caused multiplicative blow-ups when
// crossing region edges).
function _isCanonicalSceneToken(token) {
  const id = token?.document?.id;
  if (!id || !canvas?.tokens?.get) return true;
  const placeable = canvas.tokens.get(id);
  return !placeable || placeable === token;
}

function _offsetIsEffectivelyZero(offset) {
  return Math.hypot(Number(offset?.x ?? 0), Number(offset?.y ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON;
}

function _offsetsNearlyEqual(left, right) {
  return Math.abs(Number(left?.x ?? 0) - Number(right?.x ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON
    && Math.abs(Number(left?.y ?? 0) - Number(right?.y ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON;
}

function _showElevatedGridEnabled() {
  if (!_sceneElevationClientEnabled()) return false;
  try { return elevatedGridModeValue(game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID)) !== ELEVATED_GRID_MODES.OFF; }
  catch (err) { return true; }
}

function _elevatedGridOverrideSceneGridEnabled() {
  if (!_sceneElevationClientEnabled()) return false;
  try { return elevatedGridModeValue(game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID)) === ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID; }
  catch (err) { return false; }
}

function _validElevatedGridToken(token) {
  return !!token && !token.destroyed && !!token.document && token.document.parent === canvas?.scene;
}

function _liveTokenGridPosition(token) {
  const document = token?.document;
  if (!document) return null;
  const live = _safeTokenLivePoint(token, document);
  return {
    x: _finitePositionValue(live.x, document.x ?? 0),
    y: _finitePositionValue(live.y, document.y ?? 0),
    width: _finitePositionValue(document.width, 1),
    height: _finitePositionValue(document.height, 1)
  };
}

function _queueElevatedGridRefresh() {
  if (_elevatedGridRefreshFrame) return;
  _elevatedGridRefreshFrame = requestAnimationFrame(() => {
    _elevatedGridRefreshFrame = null;
    _refreshElevatedGridContext();
  });
}

function _clearPendingElevatedGridRefresh() {
  if (_elevatedGridRefreshFrame) cancelAnimationFrame(_elevatedGridRefreshFrame);
  _elevatedGridRefreshFrame = null;
  if (_rulerElevatedGridClearFrame) cancelAnimationFrame(_rulerElevatedGridClearFrame);
  _rulerElevatedGridClearFrame = null;
  _hoveredElevatedGridToken = null;
  _dragElevatedGridToken = null;
  _rulerElevatedGridContext = null;
  RegionElevationRenderer.instance.clearElevatedGrid();
}

function _refreshElevatedGridContext() {
  if (!canvas?.scene) {
    RegionElevationRenderer.instance.clearElevatedGrid();
    return;
  }
  if (!_showElevatedGridEnabled()) {
    RegionElevationRenderer.instance.refreshElevatedGrid();
    return;
  }
  const context = _currentElevatedGridContext();
  if (!context) {
    if (_elevatedGridOverrideSceneGridEnabled()) {
      RegionElevationRenderer.instance.clearElevatedGrid();
      RegionElevationRenderer.instance.refreshElevatedGrid();
      return;
    }
    RegionElevationRenderer.instance.clearElevatedGrid();
    return;
  }
  RegionElevationRenderer.instance.showElevatedGridForToken(context.token, context);
}

function _currentElevatedGridContext() {
  if (_validElevatedGridToken(_dragElevatedGridToken)) {
    const position = _liveTokenGridPosition(_dragElevatedGridToken);
    if (position) return { token: _dragElevatedGridToken, position, guide: true, source: "drag" };
  }
  _dragElevatedGridToken = null;

  if (_rulerElevatedGridContext && _validElevatedGridToken(_rulerElevatedGridContext.token)) return _rulerElevatedGridContext;
  _rulerElevatedGridContext = null;

  if (_validElevatedGridToken(_hoveredElevatedGridToken)) return { token: _hoveredElevatedGridToken, guide: false, source: "hover" };
  _hoveredElevatedGridToken = null;

  const controlled = canvas?.tokens?.controlled?.find(token => _validElevatedGridToken(token));
  return controlled ? { token: controlled, guide: false, source: "control" } : null;
}

function _setRulerElevatedGridContext(token, position) {
  if (!_showElevatedGridEnabled() || !_validElevatedGridToken(token) || !position) return;
  _rulerElevatedGridContext = { token, position, guide: true, source: "ruler" };
  _queueElevatedGridRefresh();
  _scheduleRulerElevatedGridClear();
}

function _scheduleRulerElevatedGridClear() {
  if (_rulerElevatedGridClearFrame) cancelAnimationFrame(_rulerElevatedGridClearFrame);
  _rulerElevatedGridClearFrame = requestAnimationFrame(() => {
    _rulerElevatedGridClearFrame = requestAnimationFrame(() => {
      _rulerElevatedGridClearFrame = null;
      _rulerElevatedGridContext = null;
      _queueElevatedGridRefresh();
    });
  });
}

function _tokenNeedsParallaxCleanup(token) {
  const mesh = token?.mesh;
  return !!mesh && (!_offsetIsEffectivelyZero(mesh._seCachedParallaxOffset) || !!mesh._sceneElevationNegativeClip);
}

function _highestTokenElevationState(tokenDocument, position = {}) {
  if (!_sceneElevationClientEnabled()) return { skip: true, found: false, elevation: 0, entry: null };
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE) ?? TOKEN_ELEVATION_MODES.PER_REGION;
  switch (mode) {
    case TOKEN_ELEVATION_MODES.NEVER:
      return { skip: true, found: false, elevation: 0, entry: null };
    case TOKEN_ELEVATION_MODES.ALWAYS:
      return _tokenElevationState(tokenDocument, { preferHighest: true, allowOverheadSupport: true }, position);
    case TOKEN_ELEVATION_MODES.PER_REGION:
    default:
      return _tokenElevationState(tokenDocument, { requireTokenElevation: true, preferHighest: true, allowOverheadSupport: true }, position);
  }
}

function _applyTokenScale(token, { forceScale = false } = {}) {
  if (!token?.mesh) return;
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(token);
    return;
  }
  // Drag preview clones share a document id with a real scene token but get
  // their mesh scale copied from that token's already-elevated mesh. If we
  // treat that as a fresh natural base and multiply by the elevation factor
  // again the ghost balloons; restoring on bounds exit and re-entering then
  // grows it further. Leave preview clone mesh scale alone — Foundry's ghost
  // already reflects the original token's display size — but DO still apply
  // the parallax offset so the ghost shows where the token will actually
  // land in the elevated region instead of where the cursor is.
  if (!_isCanonicalSceneToken(token)) {
    try { _applyTokenParallaxOffset(token); } catch (_) { /* ignore */ }
    return;
  }
  const activeEntries = getActiveElevationRegions(canvas?.scene);
  const m = token.mesh;
  const doc = token.document;
  // Fast bail: scenes with no active elevation regions can't change scale,
  // visibility floor, parallax offsets, or negative-parallax clips.
  if (!activeEntries.length) {
    if (m._seBaseScaleX !== undefined && m._seLastFactor && m._seLastFactor !== 1) {
      const sgnX = Math.sign(m._seBaseScaleX) || 1;
      const sgnY = Math.sign(m._seBaseScaleY) || 1;
      m.scale.set(Math.abs(m._seBaseScaleX) * sgnX, Math.abs(m._seBaseScaleY) * sgnY);
      m._seLastFactor = 1;
    }
    _clearNegativeRegionTokenVisibilityFloor(token);
    if (_tokenNeedsParallaxCleanup(token)) _applyTokenParallaxOffset(token);
    RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
    return;
  }
  if (!forceScale && doc && !_tokenBoundsIntersectEntries(doc, {}, activeEntries)) {
    if (m._seBaseScaleX !== undefined && m._seLastFactor && m._seLastFactor !== 1) {
      const sgnX = Math.sign(m._seBaseScaleX) || 1;
      const sgnY = Math.sign(m._seBaseScaleY) || 1;
      m.scale.set(Math.abs(m._seBaseScaleX) * sgnX, Math.abs(m._seBaseScaleY) * sgnY);
      m._seLastFactor = 1;
    }
    _clearNegativeRegionTokenVisibilityFloor(token);
    if (_tokenNeedsParallaxCleanup(token)) _applyTokenParallaxOffset(token);
    RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
    return;
  }
  // Per-token cache: when the *inputs* to the heavy elevation/scaling/clip
  // computation are unchanged we skip the recompute and only re-apply the
  // already-known parallax offset to the mesh position. Foundry resets
  // mesh.position to the live preview position every refreshToken, so we MUST
  // always re-apply the offset (cheap), even on cache hit. Cache key covers
  // doc state + visualParams version (which bumps when parallax/perspective
  // change) + per-mesh visual flags.
  const renderer = RegionElevationRenderer.instance;
  const cacheKey = forceScale
    ? null
    : `${doc?.x ?? 0}|${doc?.y ?? 0}|${doc?.elevation ?? 0}|${doc?.width ?? 1}|${doc?.height ?? 1}|${renderer?._visualParamsVersion ?? 0}|${getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED) ? 1 : 0}|${(doc?.uuid ?? doc?.id) && _tokensWithPendingMovement.has(doc.uuid ?? doc.id) ? 1 : 0}`;
  if (cacheKey && m._seScaleCacheKey === cacheKey) {
    // Cheap path: re-apply cached parallax offset only. Mesh position is
    // overwritten by Foundry's drag/move animation between refreshes.
    _reapplyCachedTokenParallaxOffset(token);
    return;
  }
  const uuid = token.document?.uuid ?? token.document?.id;
  try {
    const m = token.mesh;
    const skipScale = !forceScale && uuid && _tokensWithPendingMovement.has(uuid);
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
    RegionElevationRenderer.instance.applyNegativeParallaxClipForToken(token);
    if (cacheKey) m._seScaleCacheKey = cacheKey;
  } catch (err) {
    // Silent — drawToken can fire before our module/canvas is fully initialised.
  }
}

function _applyNegativeRegionTokenVisibilityFloor(token) {
  // TEMPORARY: disable to test bisect — set window.SCENE_ELEVATION_DISABLE_NEG = true to disable.
  if (globalThis.SCENE_ELEVATION_DISABLE_NEG) {
    _clearNegativeRegionTokenVisibilityFloor(token);
    return;
  }
  const mesh = token?.mesh;
  if (!mesh || !token?.document || !canvas?.scene) return;
  const state = _tokenElevationState(token.document);
  const tokenElevation = Number(token.document.elevation ?? 0);
  const regionElevation = Number(state.elevation ?? 0);
  const uuid = token.document?.uuid ?? token.document?.id;
  const movingFromNegativeIntoVisibleElevation = !!uuid
    && _tokensWithPendingMovement.has(uuid)
    && Number.isFinite(tokenElevation)
    && tokenElevation < -0.001
    && (!state.found || regionElevation >= -0.001);
  const standingOnNegativeRegion = state.found
    && regionElevation < 0
    && Number.isFinite(tokenElevation)
    && tokenElevation >= regionElevation - 0.1;
  if (!standingOnNegativeRegion && !movingFromNegativeIntoVisibleElevation) {
    _clearNegativeRegionTokenVisibilityFloor(token);
    return;
  }
  const documentElevation = Number(token.document.elevation ?? mesh._seVisibilityFloorElevation ?? 0);
  const visibleElevation = Math.max(0, Number.isFinite(documentElevation) ? documentElevation : 0);
  if (mesh._seVisibilityFloorElevation === undefined) {
    mesh._seVisibilityFloorHadElevation = "elevation" in mesh;
    mesh._seVisibilityFloorElevation = mesh.elevation;
    mesh._seVisibilityFloorZIndex = mesh.zIndex;
    mesh._seVisibilityFloorTokenHadElevation = "elevation" in token;
    mesh._seVisibilityFloorTokenElevation = token.elevation;
    mesh._seVisibilityFloorTokenZIndex = token.zIndex;
  }
  _setWritableObjectProperty(token, "elevation", visibleElevation);
  mesh.elevation = visibleElevation;
  const zIndex = Number(mesh.zIndex ?? 0);
  _setWritableObjectProperty(token, "zIndex", Math.max(0, Number(token.zIndex ?? 0) || 0));
  mesh.zIndex = Math.max(0, Number.isFinite(zIndex) ? zIndex : 0);
  _setWritableObjectProperty(token, "sortDirty", true);
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
  if (mesh._seVisibilityFloorTokenHadElevation) {
    const documentElevation = Number(token?.document?.elevation ?? mesh._seVisibilityFloorTokenElevation ?? 0);
    _setWritableObjectProperty(token, "elevation", Number.isFinite(documentElevation) ? documentElevation : 0);
  }
  else if (token && mesh._seVisibilityFloorTokenElevation !== undefined) delete token.elevation;
  if (mesh._seVisibilityFloorZIndex !== undefined) mesh.zIndex = mesh._seVisibilityFloorZIndex;
  if (mesh._seVisibilityFloorTokenZIndex !== undefined && token) _setWritableObjectProperty(token, "zIndex", mesh._seVisibilityFloorTokenZIndex);
  delete mesh._seVisibilityFloorZIndex;
  delete mesh._seVisibilityFloorTokenZIndex;
  delete mesh._seVisibilityFloorTokenHadElevation;
  delete mesh._seVisibilityFloorTokenElevation;
  delete mesh._seVisibilityFloorHadElevation;
  delete mesh._seVisibilityFloorElevation;
  _setWritableObjectProperty(token, "sortDirty", true);
  mesh.parent?.sortableChildren && (mesh.parent.sortDirty = true);
  if (canvas?.primary) canvas.primary.sortDirty = true;
}

function _setWritableObjectProperty(object, key, value) {
  if (!object || !(key in object)) return false;
  try {
    object[key] = value;
    return true;
  } catch (err) {
    return false;
  }
}

function _applyTokenParallaxOffset(token) {
  if (!token || token.destroyed || !token.document) return;
  const doc = token.document;
  const mesh = token.mesh;
  if (mesh?.destroyed) return;
  // Use the live (preview) position when the token is being dragged or
  // animated. Foundry updates `token.position.x/y` every frame during drag
  // preview but only updates `doc.x/y` on commit. We read it safely (the
  // PIXI getter dereferences `position`, which is null on destroyed objects)
  // and quantize so we don't re-run the heavy region scan every pixel.
  const live = _safeTokenLivePoint(token, doc);
  const gridSize = _canvasGridSize();
  const liveX = _quantizeLivePosition(live.x, gridSize);
  const liveY = _quantizeLivePosition(live.y, gridSize);
  const elev = Number(doc.elevation ?? 0);
  const renderer = RegionElevationRenderer.instance;
  const version = renderer?._visualParamsVersion ?? 0;
  // Per-mesh dedupe: refreshToken fires for many reasons unrelated to position
  // (vision, targeting, animation ticks, neighbor updates). When neither the
  // live position nor the parallax-params version has changed since the last
  // call, the offset is identical and the targets are already positioned
  // correctly — skip the polygon test, the target walk, the hit-area refit
  // and the HUD reposition entirely. We still re-apply the cached offset to
  // each frame's fresh mesh.position below so the image tracks the cursor.
  if (mesh
    && mesh._seParallaxAppliedX === liveX
    && mesh._seParallaxAppliedY === liveY
    && mesh._seParallaxAppliedElev === elev
    && mesh._seParallaxAppliedVersion === version
    && mesh._seParallaxAppliedW === doc.width
    && mesh._seParallaxAppliedH === doc.height
  ) {
    const cached = mesh._seCachedParallaxOffset;
    if (cached && !_offsetIsEffectivelyZero(cached)) {
      const targets = token._seParallaxTargets ?? _tokenParallaxTargets(token);
      for (const target of targets) _applyDisplayObjectParallaxOffset(target, cached);
    }
    return;
  }
  const activeEntries = getActiveElevationRegions(canvas?.scene);
  const canOverlapRegion = activeEntries.length && _tokenBoundsIntersectEntries(doc, { x: liveX, y: liveY, width: doc.width, height: doc.height }, activeEntries);
  const offset = canOverlapRegion
    ? renderer.tokenParallaxOffset(doc, { x: liveX, y: liveY, width: doc.width, height: doc.height })
    : ZERO_PARALLAX_OFFSET;
  const previousOffset = mesh?._seCachedParallaxOffset;
  const offsetChanged = !_offsetsNearlyEqual(previousOffset, offset);
  if (mesh) {
    mesh._seCachedParallaxOffset = offset;
    mesh._seParallaxAppliedX = liveX;
    mesh._seParallaxAppliedY = liveY;
    mesh._seParallaxAppliedElev = elev;
    mesh._seParallaxAppliedVersion = version;
    mesh._seParallaxAppliedW = doc.width;
    mesh._seParallaxAppliedH = doc.height;
  }
  if (offsetChanged || !_offsetIsEffectivelyZero(offset)) {
    const targets = token._seParallaxTargets ?? _tokenParallaxTargets(token);
    for (const target of targets) _applyDisplayObjectParallaxOffset(target, offset);
    _applyTokenParallaxHitArea(token, offset);
    _refreshTokenHudOffset(token, offset);
  }
}

function _tokenLiveParallaxOffset(token) {
  if (!token || token.destroyed || !token.document) return ZERO_PARALLAX_OFFSET;
  const doc = token.document;
  const live = _safeTokenLivePoint(token, doc);
  const gridSize = _canvasGridSize();
  const liveX = _quantizeLivePosition(live.x, gridSize);
  const liveY = _quantizeLivePosition(live.y, gridSize);
  const activeEntries = getActiveElevationRegions(canvas?.scene);
  const position = { x: liveX, y: liveY, width: doc.width, height: doc.height };
  return activeEntries.length && _tokenBoundsIntersectEntries(doc, position, activeEntries)
    ? RegionElevationRenderer.instance.tokenParallaxOffset(doc, position)
    : ZERO_PARALLAX_OFFSET;
}

// Cheap path used when the token's heavy state (scale / visibility floor /
// negative-parallax clip) is unchanged since the last full refresh. Parallax
// itself must always be recomputed against the live token position so the
// image tracks the cursor during drag preview without latency.
function _reapplyCachedTokenParallaxOffset(token) {
  _applyTokenParallaxOffset(token);
}

function _tokenParallaxTargets(token) {
  const signature = _tokenParallaxTargetSignature(token);
  const cached = token?._seParallaxTargets;
  if (cached && token._seParallaxTargetsSignature === signature && cached.every(target => target?.position && !target.destroyed)) return cached;
  const targets = [];
  _addTokenParallaxTarget(targets, token?.mesh);
  for (const key of TOKEN_PARALLAX_UI_KEYS) _addTokenParallaxTarget(targets, token?.[key]);
  _addNamedTokenParallaxTargets(targets, token);
  const deduped = _dedupeNestedTokenTargets(targets);
  if (token) {
    token._seParallaxTargets = deduped;
    token._seParallaxTargetsSignature = signature;
  }
  return deduped;
}

function _tokenParallaxTargetSignature(token) {
  if (!token) return "";
  const parts = [token.children?.length ?? 0, token.mesh?.children?.length ?? 0];
  for (const key of TOKEN_PARALLAX_UI_KEYS) {
    const target = token[key];
    if (!target) continue;
    parts.push(key, target.children?.length ?? 0, target.visible === false ? 0 : 1);
  }
  return parts.join("|");
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

function _clearTokenParallaxCaches(token, { restorePositions = true } = {}) {
  const targets = token?._seParallaxTargets ?? _tokenParallaxTargets(token);
  for (const target of targets) _clearDisplayObjectParallaxCache(target, { restorePosition: restorePositions });
  _clearTokenParallaxApplicationCache(token);
  _clearTokenParallaxTargetCache(token);
  _clearTokenParallaxHitArea(token);
  RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
}

function _clearTokenParallaxApplicationCache(token) {
  const mesh = token?.mesh;
  if (!mesh) return;
  delete mesh._seScaleCacheKey;
  delete mesh._seCachedParallaxOffset;
  delete mesh._seParallaxAppliedX;
  delete mesh._seParallaxAppliedY;
  delete mesh._seParallaxAppliedElev;
  delete mesh._seParallaxAppliedVersion;
  delete mesh._seParallaxAppliedW;
  delete mesh._seParallaxAppliedH;
}

function _clearTokenParallaxTargetCache(token) {
  if (!token) return;
  delete token._seParallaxTargets;
  delete token._seParallaxTargetsSignature;
}

function _clearDisplayObjectParallaxCache(displayObject, { restorePosition = true } = {}) {
  if (!displayObject) return;
  if (restorePosition && displayObject?._seBasePositionX !== undefined && displayObject?._seBasePositionY !== undefined) {
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

function _patchTokenRulerParallaxGuide() {
  const globalTokenRuler = Object.getOwnPropertyDescriptor(globalThis, "TokenRuler")?.value;
  const rulerClasses = [CONFIG.Token?.rulerClass, foundry.canvas?.placeables?.tokens?.TokenRuler, globalTokenRuler].filter(Boolean);
  for (const rulerClass of new Set(rulerClasses)) _patchTokenRulerClass(rulerClass);
}

function _patchTokenRulerClass(rulerClass) {
  const prototype = rulerClass?.prototype;
  if (!prototype || prototype[TOKEN_RULER_GUIDE_PATCHED]) return;
  const originalWaypointLabelContext = prototype._getWaypointLabelContext;
  const originalSegmentStyle = prototype._getSegmentStyle;
  const originalGridHighlightStyle = prototype._getGridHighlightStyle;
  if (typeof originalWaypointLabelContext !== "function" && typeof originalSegmentStyle !== "function" && typeof originalGridHighlightStyle !== "function") return;
  if (typeof originalWaypointLabelContext === "function") {
    prototype._getWaypointLabelContext = function(waypoint, state, ...args) {
      return originalWaypointLabelContext.call(this, _sceneElevationAdjustedRulerWaypoint(this, waypoint), state, ...args);
    };
  }
  if (typeof originalSegmentStyle === "function") {
    prototype._getSegmentStyle = function(waypoint, ...args) {
      const adjustedWaypoint = _sceneElevationAdjustedRulerWaypoint(this, waypoint);
      const result = originalSegmentStyle.call(this, adjustedWaypoint, ...args);
      _queueRulerElevatedGridGuide(this, adjustedWaypoint);
      return result;
    };
  }
  if (typeof originalGridHighlightStyle === "function") {
    prototype._getGridHighlightStyle = function(waypoint, offset, ...args) {
      const adjustedWaypoint = _sceneElevationAdjustedRulerWaypoint(this, waypoint, offset);
      const result = originalGridHighlightStyle.call(this, adjustedWaypoint, offset, ...args);
      _queueRulerElevatedGridGuide(this, adjustedWaypoint, offset);
      return result;
    };
  }
  Object.defineProperty(prototype, TOKEN_RULER_GUIDE_PATCHED, { value: true });
}

function _sceneElevationAdjustedRulerWaypoint(ruler, waypoint, offset = null) {
  if (!_sceneElevationClientEnabled()) return waypoint;
  const token = _rulerToken(ruler);
  if (!_validElevatedGridToken(token) || !waypoint || typeof waypoint !== "object") return waypoint;
  return _adjustRulerWaypointChain(token, waypoint, new WeakMap(), offset);
}

function _adjustRulerWaypointChain(token, waypoint, seen, fallbackOffset = null) {
  if (!waypoint || typeof waypoint !== "object") return waypoint;
  if (seen.has(waypoint)) return seen.get(waypoint);
  const clone = { ...waypoint };
  seen.set(waypoint, clone);
  if (waypoint.previous) clone.previous = _adjustRulerWaypointChain(token, waypoint.previous, seen);
  const center = _rulerPointCenter(waypoint) ?? _rulerOffsetCenter(fallbackOffset);
  const targetElevation = center ? _targetTokenElevationForRulerPoint(token.document, _tokenPositionFromCenter(token, center)) : null;
  if (targetElevation !== null) _assignRulerWaypointElevation(clone, targetElevation);
  return clone;
}

function _targetTokenElevationForRulerPoint(tokenDocument, position) {
  if (!tokenDocument || !position) return null;
  const rawState = _highestTokenElevationState(tokenDocument, position);
  if (rawState.skip) return null;
  const state = _stabilizeMovementElevationState(rawState, _tokenMovementStartStates.get(tokenDocument.uuid ?? tokenDocument.id), tokenDocument, position);
  return state.found ? state.elevation : 0;
}

function _assignRulerWaypointElevation(waypoint, elevation) {
  const value = _finitePositionValue(elevation, 0);
  waypoint.elevation = value;
  waypoint.targetElevation = value;
  if (waypoint.center) waypoint.center = _pointWithElevation(waypoint.center, value);
  if (waypoint.point) waypoint.point = _pointWithElevation(waypoint.point, value);
  if (waypoint.destination) waypoint.destination = _pointWithElevation(waypoint.destination, value);
  if (waypoint.ray) {
    waypoint.ray = { ...waypoint.ray };
    if (waypoint.ray.B) waypoint.ray.B = _pointWithElevation(waypoint.ray.B, value);
  }
  if (waypoint.measurement) waypoint.measurement = { ...waypoint.measurement, elevation: value, targetElevation: value };
}

function _pointWithElevation(point, elevation) {
  if (!point || typeof point !== "object") return point;
  return { ...point, elevation };
}

function _queueRulerElevatedGridGuide(ruler, waypoint, offset = null) {
  const token = _rulerToken(ruler);
  const center = _rulerPointCenter(waypoint) ?? _rulerOffsetCenter(offset);
  if (!_validElevatedGridToken(token) || !center) return;
  _setRulerElevatedGridContext(token, _tokenPositionFromCenter(token, center));
}

function _rulerToken(ruler) {
  return ruler?.token ?? ruler?.object ?? ruler?._token ?? ruler?.document?.object ?? null;
}

function _rulerPointCenter(waypoint) {
  const candidates = [waypoint?.center, waypoint?.point, waypoint?.destination, waypoint?.ray?.B, waypoint];
  for (const candidate of candidates) {
    const x = Number(candidate?.x ?? candidate?.X);
    const y = Number(candidate?.y ?? candidate?.Y);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  return null;
}

function _rulerOffsetCenter(offset) {
  const row = Number(offset?.i ?? offset?.row);
  const column = Number(offset?.j ?? offset?.column);
  if (!Number.isFinite(row) || !Number.isFinite(column)) return null;
  const gridSize = _canvasGridSize();
  return { x: column * gridSize + gridSize / 2, y: row * gridSize + gridSize / 2 };
}

function _tokenPositionFromCenter(token, center) {
  const document = token?.document;
  const gridSize = _canvasGridSize();
  const width = _finitePositionValue(document?.width, 1);
  const height = _finitePositionValue(document?.height, 1);
  return {
    x: _finitePositionValue(center.x, 0) - (width * gridSize) / 2,
    y: _finitePositionValue(center.y, 0) - (height * gridSize) / 2,
    width,
    height
  };
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

async function _migrateMouseDriftWorldDefaults() {
  if (!game.user?.isGM) return;
  if (game.settings.get(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION) === MOUSE_DRIFT_WORLD_DEFAULTS_VERSION) return;
  await Promise.all(ELEVATION_PRESET_SETTING_KEYS
    .filter(key => game.settings.get(MODULE_ID, key) !== ELEVATION_DEFAULT_SETTINGS[key])
    .map(key => game.settings.set(MODULE_ID, key, ELEVATION_DEFAULT_SETTINGS[key])));
  await game.settings.set(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION, MOUSE_DRIFT_WORLD_DEFAULTS_VERSION);
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

function _refreshTokenHudOffset(token, offset = null) {
  for (const hud of _tokenHudCandidates()) {
    if (hud?.object === token) _applyTokenHudParallaxOffset(hud, offset);
  }
}

function _applyTokenHudParallaxOffset(hud, offset = null) {
  const token = hud?.object;
  const element = _tokenHudElement(hud);
  if (!token?.document || !element) return;
  const parallaxOffset = offset ?? RegionElevationRenderer.instance.tokenParallaxOffset(token.document);
  const viewportOffset = _tokenOffsetToViewport(token, parallaxOffset);
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
  if (!_sceneElevationClientEnabled()) {
    _resetAllTokenVisuals();
    return;
  }
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

function _refreshAllTokenParallax() {
  if (!canvas?.tokens) return;
  if (!_sceneElevationClientEnabled()) return;
  const activeEntries = getActiveElevationRegions(canvas?.scene);
  if (!activeEntries.length) return;
  for (const t of canvas.tokens.placeables) {
    if (!t?.mesh) continue;
    if (!_tokenBoundsIntersectEntries(t.document, {}, activeEntries) && !_tokenNeedsParallaxCleanup(t)) continue;
    _applyTokenParallaxOffset(t);
    RegionElevationRenderer.instance.applyNegativeParallaxClipForToken(t);
  }
}

let _tokenParallaxRefreshFrame = null;
function _queueTokenParallaxRefresh() {
  if (!_sceneElevationClientEnabled()) return;
  if (_tokenParallaxRefreshFrame) return;
  _tokenParallaxRefreshFrame = requestAnimationFrame(() => {
    _tokenParallaxRefreshFrame = null;
    _refreshAllTokenParallax();
  });
}

function _queueTokenVisualRefresh() {
  if (!_sceneElevationClientEnabled()) {
    _resetAllTokenVisuals();
    return;
  }
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

function _queueRegionOverheadRefresh() {
  if (!_sceneElevationClientEnabled()) return;
  if (_regionOverheadRefreshFrame) return;
  if (!RegionElevationRenderer.instance.hasOverheadRegions()) return;
  _regionOverheadRefreshFrame = requestAnimationFrame(() => {
    _regionOverheadRefreshFrame = null;
    RegionElevationRenderer.instance.refreshOverheadVisibility();
  });
}

function _clearPendingRegionOverheadRefresh() {
  if (_regionOverheadRefreshFrame) cancelAnimationFrame(_regionOverheadRefreshFrame);
  _regionOverheadRefreshFrame = null;
}

function _queueOverheadRefreshForToken(token) {
  if (!_sceneElevationClientEnabled()) return;
  if (!token || !RegionElevationRenderer.instance.hasOverheadRegions()) return;
  const state = _tokenOverheadRefreshState(token);
  if (_tokenOverheadRefreshStates.get(token) === state) return;
  _tokenOverheadRefreshStates.set(token, state);
  _queueRegionOverheadRefresh();
}

function _tokenOverheadRefreshState(token) {
  const document = token.document;
  const live = _safeTokenLivePoint(token, document);
  const x = _finitePositionValue(live.x, 0);
  const y = _finitePositionValue(live.y, 0);
  const width = _finitePositionValue(document?.width, 1);
  const height = _finitePositionValue(document?.height, 1);
  const documentElevation = Number(document?.elevation);
  const tokenElevation = Number(token.elevation);
  const elevation = Number.isFinite(documentElevation) && Number.isFinite(tokenElevation)
    ? Math.max(documentElevation, tokenElevation)
    : Number.isFinite(documentElevation) ? documentElevation : tokenElevation;
  return [document?.uuid ?? document?.id ?? "", _roundOverheadRefreshValue(x), _roundOverheadRefreshValue(y), width, height, elevation].join("|");
}

function _roundOverheadRefreshValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 2) / 2 : 0;
}

function _canUserModifyToken(tokenDocument) {
  const user = game.user;
  if (!user || !tokenDocument) return false;
  try {
    return tokenDocument.canUserModify(user, "update");
  } catch (err) {
    return user.isGM === true;
  }
}

async function _syncTokenElevation(tokenDocument, position = {}, options = {}) {
  if (!_sceneElevationClientEnabled()) return;
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  // Only the user(s) who can actually modify this token should write the
  // elevation update. Other clients (e.g. players watching the GM move a
  // non-owned token) would otherwise hit a server-side permission error.
  if (!_canUserModifyToken(tokenDocument)) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (_syncingTokenElevation.has(uuid)) return;

  const rawState = _highestTokenElevationState(tokenDocument, position);
  if (rawState.skip) return;
  const current = Number(tokenDocument.elevation ?? 0);
  const state = _stabilizeMovementElevationState(rawState, options.movementStart, tokenDocument, position);
  const target = state.found ? state.elevation : 0;
  _dsLog("sync", tokenDocument, {
    pos: { x: tokenDocument.x, y: tokenDocument.y },
    samplePos: position,
    current,
    target,
    rawFound: rawState.found,
    rawElev: rawState.elevation,
    stabilizedFound: state.found,
    stabilizedElev: state.elevation,
    movementStart: options.movementStart?.state ? { found: options.movementStart.state.found, elevation: options.movementStart.state.elevation } : null
  });
  if (Math.abs(current - target) <= 0.001) return;
  _syncingTokenElevation.add(uuid);
  try {
    const duration = _tokenElevationAnimationDuration();
    _dsLog("sync:write", tokenDocument, { from: current, to: target, duration });
    await tokenDocument.update({ elevation: target }, { animate: duration > 0, animation: { duration } });
    _applyTokenScale(tokenDocument.object);
  } finally {
    _syncingTokenElevation.delete(uuid);
  }
}

function _queueTokenElevationAfterMovement(tokenDocument, change = {}, options = {}) {
  if (!_sceneElevationClientEnabled()) return;
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  const pending = _pendingTokenElevationUpdates.get(uuid);
  if (pending) cancelAnimationFrame(pending.frame);
  _tokensWithPendingMovement.add(uuid);
  const finalPosition = _tokenMovementPosition(tokenDocument, change);
  if (!globalThis.SCENE_ELEVATION_DISABLE_NEG) {
    void _promoteNegativeTokenElevationForVisibleMovement(tokenDocument, finalPosition);
  }

  // Only force destination visuals when elevation is not changing.  If the
  // move enters/leaves elevation, the configured elevation sync should control
  // when those visuals update.
  const immediateToken = tokenDocument.object;
  _queueOverheadRefreshForToken(immediateToken);
  if (immediateToken && !_movementChangesTokenElevation(tokenDocument, finalPosition)) {
    _applyTokenScale(immediateToken, { forceScale: true });
  }

  const started = performance.now();
  const sceneId = canvas.scene.id;
  const animationDuration = _tokenMovementAnimationDuration(options);
  const waitForMovement = () => {
    if (!canvas?.scene || canvas.scene.id !== sceneId || tokenDocument.parent !== canvas.scene) {
      _pendingTokenElevationUpdates.delete(uuid);
      _tokensWithPendingMovement.delete(uuid);
      _tokenMovementStartStates.delete(uuid);
      if (_dragElevatedGridToken?.document === tokenDocument) {
        _dragElevatedGridToken = null;
        _queueElevatedGridRefresh();
      }
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
    if (_dragElevatedGridToken?.document === tokenDocument) {
      _dragElevatedGridToken = null;
      _queueElevatedGridRefresh();
    }
    _queueOverheadRefreshForToken(tokenDocument.object);
    const movementStart = _tokenMovementStartStates.get(uuid);
    void _syncTokenElevation(tokenDocument, finalPosition, { movementStart }).finally(() => {
      if (_tokenMovementStartStates.get(uuid) === movementStart) _tokenMovementStartStates.delete(uuid);
    });
  };
  const frame = requestAnimationFrame(waitForMovement);
  _pendingTokenElevationUpdates.set(uuid, { frame });
}

function _stabilizeMovementElevationState(state, movementStart, tokenDocument, position = {}) {
  const startState = movementStart?.state;
  if (!startState?.found || state.found) return state;
  return _tokenStillWithinMovementStartRegion(tokenDocument, position, startState) ? startState : state;
}

function _movementChangesTokenElevation(tokenDocument, position = {}) {
  const rawState = _highestTokenElevationState(tokenDocument, position);
  if (rawState.skip) return false;
  const state = _stabilizeMovementElevationState(rawState, _tokenMovementStartStates.get(tokenDocument.uuid ?? tokenDocument.id), tokenDocument, position);
  const target = state.found ? state.elevation : 0;
  const current = Number(tokenDocument.elevation ?? 0);
  return Number.isFinite(current) && Number.isFinite(target) && Math.abs(current - target) > 0.001;
}

function _tokenStillWithinMovementStartRegion(tokenDocument, position, startState) {
  const region = startState?.entry?.region;
  if (!region) return false;
  return _tokenElevationSamplePoints(tokenDocument, position).some(point => regionContainsPoint(region, point, startState.elevation));
}

async function _promoteNegativeTokenElevationForVisibleMovement(tokenDocument, position = {}) {
  if (!_sceneElevationClientEnabled()) return;
  const uuid = tokenDocument?.uuid ?? tokenDocument?.id;
  if (!uuid || _syncingTokenElevation.has(uuid)) return;
  if (!_canUserModifyToken(tokenDocument)) return;
  const current = Number(tokenDocument.elevation ?? 0);
  if (!Number.isFinite(current) || current >= -0.001) return;
  const state = _highestTokenElevationState(tokenDocument, position);
  if (state.skip) return;
  const target = state.found ? state.elevation : 0;
  if (!Number.isFinite(target) || target < -0.001) return;
  _syncingTokenElevation.add(uuid);
  try {
    await tokenDocument.update({ elevation: target }, { animation: { duration: 0 } });
    _applyTokenScale(tokenDocument.object, { forceScale: true });
  } finally {
    _syncingTokenElevation.delete(uuid);
  }
}

function _stripMovementElevationChange(tokenDocument, change = {}) {
  if (!_sceneElevationClientEnabled()) return null;
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return null;
  if (!_hasTokenMovementDelta(tokenDocument, change) || !foundry.utils.hasProperty(change, "elevation")) return null;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (!uuid || _syncingTokenElevation.has(uuid)) return null;
  const requested = Number(change.elevation ?? 0);
  if (!Number.isFinite(requested) || Math.abs(requested) > 0.001) return null;
  const stripped = {
    requested,
    current: Number(tokenDocument.elevation ?? 0),
    changeKeys: Object.keys(change ?? {})
  };
  delete change.elevation;
  _dsLog("movementElevationStripped", tokenDocument, stripped);
  return stripped;
}

function _correctMovementElevationChange(tokenDocument, change = {}) {
  if (!_sceneElevationClientEnabled()) return null;
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return null;
  if (!foundry.utils.hasProperty(change, "elevation")) return null;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (!uuid || _syncingTokenElevation.has(uuid)) return null;
  const hasMove = _hasTokenMovementChange(change);
  if (hasMove || !_tokensWithPendingMovement.has(uuid)) return null;
  const requested = Number(change.elevation ?? 0);
  const current = Number(tokenDocument.elevation ?? 0);
  if (!Number.isFinite(requested) || !Number.isFinite(current)) return null;
  const startState = _tokenMovementStartStates.get(uuid)?.state ?? _highestTokenElevationState(tokenDocument);
  const position = _tokenMovementPosition(tokenDocument, change);
  const rawState = _highestTokenElevationState(tokenDocument, position);
  if (rawState.skip) return null;
  const state = _stabilizeMovementElevationState(rawState, { state: startState }, tokenDocument, position);
  const expected = state.found ? state.elevation : 0;
  if (!Number.isFinite(expected) || Math.abs(requested - expected) <= 0.001) return null;
  change.elevation = expected;
  const correction = {
    requested,
    expected,
    current,
    hasMove,
    position,
    startFound: startState?.found ?? false,
    startElevation: startState?.elevation ?? 0,
    rawFound: rawState.found,
    rawElevation: rawState.elevation,
    stabilizedFound: state.found,
    stabilizedElevation: state.elevation
  };
  _dsLog("movementElevationCorrected", tokenDocument, correction);
  return correction;
}

function _markTokenMovementStarting(tokenDocument) {
  if (!_sceneElevationClientEnabled()) return;
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (!uuid) return;
  const startState = _highestTokenElevationState(tokenDocument);
  _dsLog("moveStart", tokenDocument, { pos: { x: tokenDocument.x, y: tokenDocument.y }, currentElev: tokenDocument.elevation, startStateFound: startState.found, startStateElev: startState.elevation });
  _tokenMovementStartStates.set(uuid, { state: startState });
  _tokensWithPendingMovement.add(uuid);
  requestAnimationFrame(() => {
    if (_pendingTokenElevationUpdates.has(uuid)) return;
    requestAnimationFrame(() => {
      if (_pendingTokenElevationUpdates.has(uuid)) return;
      _tokensWithPendingMovement.delete(uuid);
      _tokenMovementStartStates.delete(uuid);
      if (_dragElevatedGridToken?.document === tokenDocument) {
        _dragElevatedGridToken = null;
        _queueElevatedGridRefresh();
      }
    });
  });
}

function _hasTokenMovementChange(change = {}) {
  return foundry.utils.hasProperty(change, "x")
    || foundry.utils.hasProperty(change, "y")
    || foundry.utils.hasProperty(change, "width")
    || foundry.utils.hasProperty(change, "height");
}

function _hasTokenMovementDelta(tokenDocument, change = {}) {
  if (!tokenDocument || !_hasTokenMovementChange(change)) return false;
  return _movementPropertyChanged(change, "x", tokenDocument.x, TOKEN_MOVEMENT_POSITION_EPSILON)
    || _movementPropertyChanged(change, "y", tokenDocument.y, TOKEN_MOVEMENT_POSITION_EPSILON)
    || _movementPropertyChanged(change, "width", tokenDocument.width, TOKEN_MOVEMENT_SIZE_EPSILON)
    || _movementPropertyChanged(change, "height", tokenDocument.height, TOKEN_MOVEMENT_SIZE_EPSILON);
}

function _movementPropertyChanged(change, key, current, epsilon) {
  if (!foundry.utils.hasProperty(change, key)) return false;
  const next = _finitePositionValue(change[key], current ?? 0);
  const previous = _finitePositionValue(current, 0);
  return Math.abs(next - previous) > epsilon;
}

function _tokenMovementPosition(tokenDocument, change = {}) {
  return {
    x: foundry.utils.hasProperty(change, "x") ? _finitePositionValue(change.x, tokenDocument.x ?? 0) : _finitePositionValue(tokenDocument.x, 0),
    y: foundry.utils.hasProperty(change, "y") ? _finitePositionValue(change.y, tokenDocument.y ?? 0) : _finitePositionValue(tokenDocument.y, 0),
    width: foundry.utils.hasProperty(change, "width") ? _finitePositionValue(change.width, tokenDocument.width ?? 1) : _finitePositionValue(tokenDocument.width, 1),
    height: foundry.utils.hasProperty(change, "height") ? _finitePositionValue(change.height, tokenDocument.height ?? 1) : _finitePositionValue(tokenDocument.height, 1)
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
  if (token.destroyed) return false;
  const live = _safeTokenLivePoint(token, tokenDocument);
  return Math.abs(live.x - Number(tokenDocument.x ?? 0)) >= 0.5 || Math.abs(live.y - Number(tokenDocument.y ?? 0)) >= 0.5;
}

function _clearPendingTokenElevationUpdates() {
  for (const pending of _pendingTokenElevationUpdates.values()) cancelAnimationFrame(pending.frame);
  _pendingTokenElevationUpdates.clear();
  _tokensWithPendingMovement.clear();
  _tokenMovementStartStates.clear();
  _tokenUpdateMovementDeltas.clear();
  _dragElevatedGridToken = null;
  _queueElevatedGridRefresh();
}

function _cancelPendingTokenElevationUpdate(tokenDocument) {
  const uuid = tokenDocument?.uuid ?? tokenDocument?.id;
  if (!uuid) return;
  const pending = _pendingTokenElevationUpdates.get(uuid);
  if (pending) cancelAnimationFrame(pending.frame);
  _pendingTokenElevationUpdates.delete(uuid);
  _tokensWithPendingMovement.delete(uuid);
  _tokenMovementStartStates.delete(uuid);
  if (_dragElevatedGridToken?.document === tokenDocument) {
    _dragElevatedGridToken = null;
    _queueElevatedGridRefresh();
  }
}

async function _refreshAllTokenElevations() {
  if (!_sceneElevationClientEnabled()) return;
  if (!canvas?.tokens) return;
  await Promise.all(canvas.tokens.placeables.map(token => _syncTokenElevation(token.document)));
}

function _resetAllTokenVisuals() {
  if (!canvas?.tokens) return;
  for (const token of canvas.tokens.placeables) _resetTokenVisuals(token);
}

function _resetTokenVisuals(token) {
  const mesh = token?.mesh;
  if (mesh?._seBaseScaleX !== undefined && mesh?._seBaseScaleY !== undefined) mesh.scale?.set?.(mesh._seBaseScaleX, mesh._seBaseScaleY);
  if (mesh) {
    delete mesh._seBaseScaleX;
    delete mesh._seBaseScaleY;
    delete mesh._seLastFactor;
    delete mesh._seScaleCacheKey;
    delete mesh._seCachedParallaxOffset;
  }
  _clearNegativeRegionTokenVisibilityFloor(token);
  _clearLiveTokenElevationOverride(token);
  _clearTokenParallaxCaches(token);
}

// While a token is animating into a higher-elevation region, document.elevation
// stays at its old value until movement settles. That means the token's mesh
// would normally render UNDER the lifted plateau overlay during the move. We
// promote the mesh's visual elevation immediately based on the token's live
// (animated) position so it renders on top as soon as it crosses into the
// region. The document elevation itself is still updated by the existing
// settle pipeline; this only affects PrimaryCanvasGroup sort order.
function _applyLiveTokenElevationOverride(token) {
  if (!_sceneElevationClientEnabled()) {
    _clearLiveTokenElevationOverride(token);
    return;
  }
  const mesh = token?.mesh;
  const document = token?.document;
  if (!mesh || mesh.destroyed || !document || !canvas?.scene || document.parent !== canvas.scene) return;
  if (token.destroyed) return;
  const live = _safeTokenLivePoint(token, document);
  const gridSize = _canvasGridSize();
  // Quantize so we only re-evaluate the region point-state when the token
  // crosses a grid-quarter boundary (region edges live at tens of pixels).
  const liveX = _quantizeLivePosition(live.x, gridSize);
  const liveY = _quantizeLivePosition(live.y, gridSize);
  const documentElevation = Number(document.elevation ?? 0);
  // Fast bail: no active elevation regions in scene → nothing to override.
  const activeEntries = getActiveElevationRegions(canvas.scene);
  if (!activeEntries.length) {
    if (mesh._seElevationOverride !== undefined) _clearLiveTokenElevationOverride(token);
    mesh._seLiveOverrideX = liveX;
    mesh._seLiveOverrideY = liveY;
    mesh._seLiveOverrideDocElev = documentElevation;
    mesh._seLiveOverrideEntriesRef = activeEntries;
    return;
  }
  // Skip when nothing relevant has changed since last evaluation.
  if (
    mesh._seLiveOverrideEntriesRef === activeEntries
    && mesh._seLiveOverrideX === liveX
    && mesh._seLiveOverrideY === liveY
    && mesh._seLiveOverrideDocElev === documentElevation
    && mesh._seElevationOverrideHoldUntil === undefined
  ) return;
  mesh._seLiveOverrideX = liveX;
  mesh._seLiveOverrideY = liveY;
  mesh._seLiveOverrideDocElev = documentElevation;
  mesh._seLiveOverrideEntriesRef = activeEntries;
  const state = _highestTokenElevationState(document, { x: liveX, y: liveY });
  if (state.skip) {
    _clearLiveTokenElevationOverride(token);
    return;
  }
  const liveRegionElevation = state.found ? Number(state.elevation ?? 0) : 0;
  const target = Math.max(
    Number.isFinite(documentElevation) ? documentElevation : 0,
    Number.isFinite(liveRegionElevation) ? liveRegionElevation : 0
  );
  // Only override when our target is strictly higher than what Foundry would
  // sort the mesh at (document elevation). Lower or equal targets keep
  // Foundry's own value so a flying token (high doc elevation) still renders
  // above same-region geometry naturally.
  if (target <= documentElevation + 0.001) {
    if (mesh._seElevationOverride !== undefined) {
      const now = performance.now();
      const holdUntil = mesh._seElevationOverrideHoldUntil
        ?? now + Math.max(_tokenElevationAnimationDuration(), 0) + 80;
      mesh._seElevationOverrideHoldUntil = holdUntil;
      if (now < holdUntil) {
        _setLiveTokenElevationOverride(token, _tokenCurrentSortElevation(token), { preserveHold: true });
        _scheduleLiveTokenElevationOverrideHold(token);
        return;
      }
    }
    _clearLiveTokenElevationOverride(token);
    return;
  }
  _setLiveTokenElevationOverride(token, target);
}

function _setLiveTokenElevationOverride(token, target, { preserveHold = false } = {}) {
  const mesh = token?.mesh;
  if (!mesh) return;
  if (!preserveHold && mesh._seElevationOverrideHoldUntil !== undefined) delete mesh._seElevationOverrideHoldUntil;
  if (mesh._seElevationOverride !== undefined && Math.abs((mesh._seElevationOverride ?? 0) - target) <= 0.001 && Math.abs(Number(mesh.elevation ?? 0) - target) <= 0.001) return;
  mesh._seElevationOverride = target;
  mesh.elevation = target;
  if (canvas.primary) canvas.primary.sortDirty = true;
}

function _scheduleLiveTokenElevationOverrideHold(token) {
  const mesh = token?.mesh;
  if (!mesh || mesh._seElevationOverrideFrame) return;
  mesh._seElevationOverrideFrame = requestAnimationFrame(() => {
    mesh._seElevationOverrideFrame = null;
    _applyLiveTokenElevationOverride(token);
  });
}

function _clearLiveTokenElevationOverride(token) {
  const mesh = token?.mesh;
  if (!mesh || mesh._seElevationOverride === undefined) return;
  if (mesh._seElevationOverrideFrame) cancelAnimationFrame(mesh._seElevationOverrideFrame);
  mesh.elevation = _tokenCurrentSortElevation(token);
  delete mesh._seElevationOverride;
  delete mesh._seElevationOverrideHoldUntil;
  delete mesh._seElevationOverrideFrame;
  if (canvas.primary) canvas.primary.sortDirty = true;
}

function _tokenCurrentSortElevation(token) {
  const documentElevation = Number(token?.document?.elevation);
  const tokenElevation = Number(token?.elevation);
  if (Number.isFinite(documentElevation) && Number.isFinite(tokenElevation)) return Math.max(documentElevation, tokenElevation);
  if (Number.isFinite(documentElevation)) return documentElevation;
  if (Number.isFinite(tokenElevation)) return tokenElevation;
  return 0;
}

Hooks.on("drawToken", (token) => {
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(token);
    return;
  }
  // Clear stale mesh cache so the upcoming refreshToken re-caches from Foundry's finalized scale
  const m = token?.mesh;
  if (m) {
    delete m._seBaseScaleX;
    delete m._seBaseScaleY;
    delete m._seLastFactor;
    delete m._seScaleCacheKey;
    delete m._seCachedParallaxOffset;
  }
  _clearTokenParallaxCaches(token);
  _applyTokenScale(token);
  _queueOverheadRefreshForToken(token);
});
Hooks.on("refreshToken", (token) => {
  if (!token || token.destroyed) return;
  const isPreviewClone = !_isCanonicalSceneToken(token);
  if (isPreviewClone) {
    _dragElevatedGridToken = token;
    _queueElevatedGridRefresh();
  }
  const uuid = token?.document?.uuid ?? token?.document?.id;
  if (uuid && _tokensWithPendingMovement.has(uuid)) {
    _applyLiveTokenElevationOverride(token);
    // Foundry overwrites mesh.position to the live preview position every
    // refresh during animation/drag. Re-apply parallax against the live
    // position so the token image stays locked to the cursor instead of
    // snapping to the un-offset doc position for one frame.
    _applyTokenParallaxOffset(token);
    return;
  }
  if (!isPreviewClone && _dragElevatedGridToken === token) {
    _dragElevatedGridToken = null;
    _queueElevatedGridRefresh();
  }
  _applyTokenScale(token);
  _applyLiveTokenElevationOverride(token);
  _queueOverheadRefreshForToken(token);
});
Hooks.on("targetToken", (_user, token) => {
  if (!token) return;
  requestAnimationFrame(() => {
    const offset = _tokenLiveParallaxOffset(token);
    _clearTokenParallaxCaches(token, { restorePositions: !_offsetIsEffectivelyZero(offset) });
    _applyTokenScale(token, { forceScale: true });
  });
});
Hooks.on("createToken", (document) => {
  if (!_sceneElevationClientEnabled()) return;
  if (document.parent !== canvas?.scene) return;
  void _syncTokenElevation(document);
  _queueRegionOverheadRefresh();
  _queueElevatedGridRefresh();
});
Hooks.on("deleteToken", (document) => {
  if (document.parent && document.parent !== canvas?.scene) return;
  if (_hoveredElevatedGridToken?.document === document) _hoveredElevatedGridToken = null;
  if (_dragElevatedGridToken?.document === document) _dragElevatedGridToken = null;
  if (_rulerElevatedGridContext?.token?.document === document) _rulerElevatedGridContext = null;
  _queueRegionOverheadRefresh();
  _queueElevatedGridRefresh();
});
Hooks.on("hoverToken", (token, hovered) => {
  if (hovered) _hoveredElevatedGridToken = token;
  else if (_hoveredElevatedGridToken === token) _hoveredElevatedGridToken = null;
  _queueElevatedGridRefresh();
});
Hooks.on("controlToken", () => {
  _queueRegionOverheadRefresh();
  _queueElevatedGridRefresh();
});
Hooks.on("preUpdateToken", (document, change, options, userId) => {
  if (!_sceneElevationClientEnabled()) return;
  const hasMove = _hasTokenMovementDelta(document, change);
  if (options) options[TOKEN_MOVEMENT_DELTA_OPTION] = hasMove;
  const uuid = document.uuid ?? document.id;
  if (uuid) _tokenUpdateMovementDeltas.set(uuid, hasMove);
  const syncing = _syncingTokenElevation.has(document.uuid ?? document.id);
  const strippedMovementElevation = _stripMovementElevationChange(document, change);
  const hasElev = foundry.utils.hasProperty(change, "elevation");
  if (hasElev && !hasMove && !syncing) _cancelPendingTokenElevationUpdate(document);
  const correctedElevation = _correctMovementElevationChange(document, change);
  const json = (() => { try { return JSON.stringify(change); } catch { return "<unstringifiable>"; } })();
  const optJson = (() => { try { return JSON.stringify(Object.keys(options ?? {})); } catch { return ""; } })();
  if (hasElev && !hasMove) {
    _dsLog("hook:preUpdateToken:ELEVATION-ONLY", document, { change: json, options: optJson, userId, syncing, currentElev: document.elevation, correctedElevation });
  } else {
    _dsLog("hook:preUpdateToken", document, { changeKeys: Object.keys(change ?? {}), changeJson: json, hasMove, hasElev, syncing, strippedMovementElevation, correctedElevation });
  }
  if (!hasMove) return;
  _markTokenMovementStarting(document);
});
Hooks.on("updateToken", (document, change, options) => {
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(document.object);
    return;
  }
  const json = (() => { try { return JSON.stringify(change); } catch { return "<unstringifiable>"; } })();
  const uuid = document.uuid ?? document.id;
  const hasTrackedMovementDelta = uuid && _tokenUpdateMovementDeltas.has(uuid);
  const hasMove = hasTrackedMovementDelta ? _tokenUpdateMovementDeltas.get(uuid) : (options?.[TOKEN_MOVEMENT_DELTA_OPTION] ?? _hasTokenMovementChange(change));
  if (hasTrackedMovementDelta) _tokenUpdateMovementDeltas.delete(uuid);
  _dsLog("hook:updateToken", document, { changeKeys: Object.keys(change ?? {}), changeJson: json, hasMove, optionsKeys: Object.keys(options ?? {}) });
  if (document.parent !== canvas?.scene) return;
  if (hasMove) {
    if (_dragElevatedGridToken?.document === document) {
      _dragElevatedGridToken = null;
      _queueElevatedGridRefresh();
    }
    _queueRegionOverheadRefresh();
    _queueTokenElevationAfterMovement(document, change, options);
    return;
  }
  if (foundry.utils.hasProperty(change, "elevation")) {
    _dsLog("elevationChanged", document, { newElevation: change.elevation, syncing: _syncingTokenElevation.has(document.uuid ?? document.id) });
    _queueRegionOverheadRefresh();
  }
  _applyTokenScale(document.object);
});
