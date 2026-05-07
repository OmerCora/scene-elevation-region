/** Scene Elevation — module-wide constants and helpers. */

export const MODULE_ID = "scene-elevation-region";

export const SETTINGS = {
  PARALLAX: "parallaxStrength",
  PARALLAX_HEIGHT_CONTRAST: "parallaxHeightContrast",
  PARALLAX_MODE: "parallaxMode",
  PERSPECTIVE_POINT: "perspectivePoint",
  BLEND_MODE: "overlayBlendMode",
  OVERLAY_SCALE: "overlayScale",
  SHADOW_MODE: "shadowMode",
  SHADOW_LENGTH: "shadowLength",
  SUNRISE_HOUR: "sunriseHour",
  SUNSET_HOUR: "sunsetHour",
  SHOW_ELEVATION_REGIONS: "showElevationRegions",
  TOKEN_ELEVATION_MODE: "tokenElevationMode",
  TOKEN_ELEVATION_ANIMATION_MS: "tokenElevationAnimationMs",
  TOKEN_SCALE_ENABLED: "tokenScaleEnabled",
  TOKEN_SCALE_MAX: "tokenScaleMax",
  DEPTH_SCALE: "depthScale"
};

export const SCENE_SETTINGS_FLAG = "sceneSettings";

export const SCENE_SETTING_KEYS = Object.freeze({
  PARALLAX: SETTINGS.PARALLAX,
  PARALLAX_HEIGHT_CONTRAST: SETTINGS.PARALLAX_HEIGHT_CONTRAST,
  PARALLAX_MODE: SETTINGS.PARALLAX_MODE,
  PERSPECTIVE_POINT: SETTINGS.PERSPECTIVE_POINT,
  PERSPECTIVE_EDGE_POINT: "perspectiveEdgePoint",
  BLEND_MODE: SETTINGS.BLEND_MODE,
  OVERLAY_SCALE: SETTINGS.OVERLAY_SCALE,
  SHADOW_MODE: SETTINGS.SHADOW_MODE,
  SHADOW_LENGTH: SETTINGS.SHADOW_LENGTH,
  SUNRISE_HOUR: SETTINGS.SUNRISE_HOUR,
  SUNSET_HOUR: SETTINGS.SUNSET_HOUR,
  SUN_EDGE_POINT: "sunEdgePoint",
  TOKEN_ELEVATION_MODE: SETTINGS.TOKEN_ELEVATION_MODE,
  TOKEN_ELEVATION_ANIMATION_MS: SETTINGS.TOKEN_ELEVATION_ANIMATION_MS,
  TOKEN_SCALE_ENABLED: SETTINGS.TOKEN_SCALE_ENABLED,
  TOKEN_SCALE_MAX: SETTINGS.TOKEN_SCALE_MAX,
  DEPTH_SCALE: SETTINGS.DEPTH_SCALE
});

/** Parallax strength values keyed by enum option. */
export const PARALLAX_STRENGTHS = Object.freeze({
  off: 0,
  minimal: 0.006,
  verySubtle: 0.018,
  subtle: 0.04,
  medium: 0.085,
  strong: 0.15,
  extreme: 0.28
});

export const PARALLAX_HEIGHT_CONTRASTS = Object.freeze({
  normal: 1,
  noticeable: 1.35,
  strong: 1.8,
  dramatic: 2.5,
  extreme: 4
});

export const PARALLAX_LIFT_LIMITS = Object.freeze({
  minimal: 4,
  extreme: 72
});

export const PARALLAX_DISTANCE_FACTORS = Object.freeze({
  extreme: 1.15
});

export const PERSPECTIVE_POINTS = Object.freeze({
  CENTER: "center",
  TOP_LEFT: "topLeft",
  TOP_RIGHT: "topRight",
  BOTTOM_LEFT: "bottomLeft",
  BOTTOM_RIGHT: "bottomRight",
  FAR_TOP: "farTop",
  FAR_LEFT: "farLeft",
  FAR_RIGHT: "farRight",
  FAR_BOTTOM: "farBottom",
  REGION_CENTER: "regionCenter",
  REGION_TOP_LEFT: "regionTopLeft",
  REGION_TOP_RIGHT: "regionTopRight",
  REGION_BOTTOM_LEFT: "regionBottomLeft",
  REGION_BOTTOM_RIGHT: "regionBottomRight",
  POINT_ON_SCENE_EDGE: "sceneEdgePoint",
  CAMERA_CENTER: "cameraCenter",
  FURTHEST_EDGE: "furthestEdge",
  NEAREST_EDGE: "nearestEdge"
});

export const PARALLAX_MODES = Object.freeze({
  CARD: "card",
  ANCHORED_CARD: "anchoredCard",
  VELOCITY_CARD: "velocityCard",
  ANCHORED_VELOCITY_CARD: "anchoredVelocityCard",
  SHADOW: "shadow"
});

export const SHADOW_MODES = Object.freeze({
  OFF: "off",
  RESPONSIVE: "responsive",
  RESPONSIVE_ALL_AROUND: "responsiveAllAround",
  REVERSED_RESPONSIVE: "reversedResponsive",
  TEXTURE_MELD: "textureMeld",
  FULL_TEXTURE_MELD: "fullTextureMeld",
  TOP_DOWN: "topDown",
  TOP_DOWN_STRONG: "topDownStrong",
  SMALL_TIME_SUN: "smallTimeSun",
  SUN_AT_EDGE: "sunAtEdge"
});

export const TOKEN_ELEVATION_MODES = Object.freeze({
  ALWAYS: "always",
  NEVER: "never",
  PER_REGION: "perRegion"
});

export const BLEND_MODES = Object.freeze({
  OFF: "off",
  SOFT: "soft",
  WIDE: "wide",
  CLIFF_WARP: "cliffWarp"
});

export const OVERLAY_SCALE_STRENGTHS = Object.freeze({
  shrinkMedium: -0.04,
  shrinkSubtle: -0.018,
  off: 0,
  subtle: 0.015,
  medium: 0.035,
  strong: 0.06
});

/**
 * How strongly the perceived "lift" of a region scales with its elevation value.
 * - compressed: legacy sqrt() scaling (elevation 4 ≈ 2× elevation 1, elevation 20 ≈ 4.5×)
 * - linear:     proportional (elevation 4 = 2× elevation 2, elevation 20 = 10×)
 * - dramatic:   super-linear (elevation 20 ≈ 12×) for towering cliffs
 */
export const DEPTH_SCALES = Object.freeze({
  COMPRESSED: "compressed",
  LINEAR: "linear",
  DRAMATIC: "dramatic"
});

/** Reference value (in elevation units) used to normalize depth-derived effects. */
export const DEPTH_SCALE_REFERENCE = Object.freeze({
  [DEPTH_SCALES.COMPRESSED]: 6,
  [DEPTH_SCALES.LINEAR]: 24,
  [DEPTH_SCALES.DRAMATIC]: 32
});

export const ELEVATION_DEFAULT_SETTINGS = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "medium",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "normal",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.ANCHORED_CARD,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.REGION_CENTER,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.WIDE,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.TOP_DOWN,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: 1,
  [SCENE_SETTING_KEYS.SUNRISE_HOUR]: 6,
  [SCENE_SETTING_KEYS.SUNSET_HOUR]: 18,
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: TOKEN_ELEVATION_MODES.PER_REGION,
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: 120,
  [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: true,
  [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: 1.5,
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

export const SHADOW_STRENGTH_LIMITS = Object.freeze({
  MIN: 0,
  MAX: 12,
  STEP: 0.05,
  DEFAULT: 2.15
});

/** Region behavior subtype id (declared in module.json). */
export const REGION_BEHAVIOR_TYPE = `${MODULE_ID}.elevation`;

export function sceneGeometry(scene = canvas?.scene) {
  const dims = (scene === canvas?.scene && canvas?.dimensions) ? canvas.dimensions : scene?.dimensions;
  const rect = dims?.sceneRect;
  const gridSize = dims?.size ?? canvas?.grid?.size ?? scene?.grid?.size ?? 100;
  const width = rect?.width ?? dims?.sceneWidth ?? scene?.width ?? gridSize;
  const height = rect?.height ?? dims?.sceneHeight ?? scene?.height ?? gridSize;
  const cols = Math.max(1, Math.round(width / gridSize));
  const rows = Math.max(1, Math.round(height / gridSize));
  return {
    x: rect?.x ?? dims?.sceneX ?? 0,
    y: rect?.y ?? dims?.sceneY ?? 0,
    width: cols * gridSize,
    height: rows * gridSize,
    gridSize,
    cols,
    rows
  };
}

const _transientSceneSettings = new WeakMap();
const MERGE_SCENE_SETTING_OPTIONS = Object.freeze({
  inplace: false,
  insertKeys: true,
  overwrite: true,
  recursive: true,
  applyOperators: true,
  insertValues: true
});

const MERGE_KNOWN_SCENE_SETTING_OPTIONS = Object.freeze({
  ...MERGE_SCENE_SETTING_OPTIONS,
  insertKeys: false
});

export function defaultSceneElevationSettings(scene = canvas?.scene) {
  return {
    [SCENE_SETTING_KEYS.PARALLAX]: _worldSetting(SETTINGS.PARALLAX, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX]),
    [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: _worldSetting(SETTINGS.PARALLAX_HEIGHT_CONTRAST, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]),
    [SCENE_SETTING_KEYS.PARALLAX_MODE]: _worldSetting(SETTINGS.PARALLAX_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX_MODE]),
    [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: _worldSetting(SETTINGS.PERSPECTIVE_POINT, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PERSPECTIVE_POINT]),
    [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: _defaultPerspectiveEdgePoint(scene),
    [SCENE_SETTING_KEYS.BLEND_MODE]: _worldSetting(SETTINGS.BLEND_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.BLEND_MODE]),
    [SCENE_SETTING_KEYS.OVERLAY_SCALE]: _worldSetting(SETTINGS.OVERLAY_SCALE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.OVERLAY_SCALE]),
    [SCENE_SETTING_KEYS.SHADOW_MODE]: _worldSetting(SETTINGS.SHADOW_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SHADOW_MODE]),
    [SCENE_SETTING_KEYS.SHADOW_LENGTH]: _worldSetting(SETTINGS.SHADOW_LENGTH, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SHADOW_LENGTH]),
    [SCENE_SETTING_KEYS.SUNRISE_HOUR]: _worldSetting(SETTINGS.SUNRISE_HOUR, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SUNRISE_HOUR]),
    [SCENE_SETTING_KEYS.SUNSET_HOUR]: _worldSetting(SETTINGS.SUNSET_HOUR, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SUNSET_HOUR]),
    [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: _defaultSunEdgePoint(scene),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: _worldSetting(SETTINGS.TOKEN_ELEVATION_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: _worldSetting(SETTINGS.TOKEN_ELEVATION_ANIMATION_MS, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: _worldSetting(SETTINGS.TOKEN_SCALE_ENABLED, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: _worldSetting(SETTINGS.TOKEN_SCALE_MAX, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]),
    [SCENE_SETTING_KEYS.DEPTH_SCALE]: _worldSetting(SETTINGS.DEPTH_SCALE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.DEPTH_SCALE])
  };
}

export function elevationDefaultSettings(scene = canvas?.scene) {
  return {
    ...ELEVATION_DEFAULT_SETTINGS,
    [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: _defaultPerspectiveEdgePoint(scene),
    [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: _defaultSunEdgePoint(scene)
  };
}

export function getSceneElevationSettings(scene = canvas?.scene) {
  const defaults = defaultSceneElevationSettings(scene);
  const stored = scene?.getFlag?.(MODULE_ID, SCENE_SETTINGS_FLAG) ?? foundry.utils.getProperty(scene ?? {}, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`) ?? {};
  const transient = scene ? (_transientSceneSettings.get(scene) ?? {}) : {};
  const sceneSettings = foundry.utils.mergeObject(foundry.utils.deepClone(defaults), foundry.utils.deepClone(stored), MERGE_KNOWN_SCENE_SETTING_OPTIONS);
  return foundry.utils.mergeObject(sceneSettings, foundry.utils.deepClone(transient), MERGE_KNOWN_SCENE_SETTING_OPTIONS);
}

export function getSceneElevationSetting(key, scene = canvas?.scene) {
  return getSceneElevationSettings(scene)[key];
}

export function parallaxHeightContrastValue(setting) {
  if (typeof setting === "number") return Math.clamp(Number.isFinite(setting) ? setting : 1, 1, 4);
  const numeric = Number(setting);
  if (String(setting ?? "").trim() && Number.isFinite(numeric)) return Math.clamp(numeric, 1, 4);
  const value = PARALLAX_HEIGHT_CONTRASTS[String(setting ?? "normal")];
  return value ?? PARALLAX_HEIGHT_CONTRASTS.normal;
}

export function parallaxHeightContrastKey(setting) {
  const key = String(setting ?? "normal");
  if (PARALLAX_HEIGHT_CONTRASTS[key] !== undefined) return key;
  const value = parallaxHeightContrastValue(setting);
  return Object.entries(PARALLAX_HEIGHT_CONTRASTS).reduce((best, [candidate, candidateValue]) => {
    return Math.abs(candidateValue - value) < Math.abs(PARALLAX_HEIGHT_CONTRASTS[best] - value) ? candidate : best;
  }, "normal");
}

export async function setSceneElevationSettings(scene, settings) {
  if (!scene) return null;
  const next = foundry.utils.mergeObject(getSceneElevationSettings(scene), foundry.utils.deepClone(settings), MERGE_KNOWN_SCENE_SETTING_OPTIONS);
  await scene.setFlag(MODULE_ID, SCENE_SETTINGS_FLAG, next);
  return next;
}

export function setTransientSceneElevationSetting(scene, key, value) {
  if (!scene) return;
  const current = _transientSceneSettings.get(scene) ?? {};
  _transientSceneSettings.set(scene, foundry.utils.mergeObject(current, { [key]: value }, { inplace: false, insertKeys: true, overwrite: true, recursive: true }));
}

export function clearTransientSceneElevationSettings(scene) {
  if (scene) _transientSceneSettings.delete(scene);
}

function _worldSetting(key, fallback) {
  try {
    return game.settings.get(MODULE_ID, key);
  } catch (err) {
    return fallback;
  }
}

function _defaultPerspectiveEdgePoint(scene) {
  const geo = sceneGeometry(scene);
  return { x: geo.x + geo.width / 2, y: geo.y };
}

function _defaultSunEdgePoint(scene) {
  const geo = sceneGeometry(scene);
  return { x: geo.x + geo.width / 2, y: geo.y };
}

export function logger(...args) {
  console.log(`[${MODULE_ID}]`, ...args);
}
