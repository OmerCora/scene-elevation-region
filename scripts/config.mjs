/** Scene Elevation — module-wide constants and helpers. */

export const MODULE_ID = "scene-elevation-region";

export const SETTINGS = {
  PRESET: "preset",
  PARALLAX: "parallaxStrength",
  PARALLAX_HEIGHT_CONTRAST: "parallaxHeightContrast",
  PARALLAX_MODE: "parallaxMode",
  PERSPECTIVE_POINT: "perspectivePoint",
  BLEND_MODE: "overlayBlendMode",
  OVERLAY_SCALE: "overlayScale",
  SHADOW_MODE: "shadowMode",
  SHADOW_LENGTH: "shadowLength",
  SHOW_ELEVATION_REGIONS: "showElevationRegions",
  TOKEN_ELEVATION_MODE: "tokenElevationMode",
  TOKEN_ELEVATION_ANIMATION_MS: "tokenElevationAnimationMs",
  TOKEN_SCALE_ENABLED: "tokenScaleEnabled",
  TOKEN_SCALE_MAX: "tokenScaleMax",
  DEPTH_SCALE: "depthScale",
  ELEVATION_SCALE: "elevationScale",
  WORLD_DEFAULTS_VERSION: "worldDefaultsVersion"
};

export const SCENE_SETTINGS_FLAG = "sceneSettings";

export const SCENE_SETTING_KEYS = Object.freeze({
  PRESET: SETTINGS.PRESET,
  PARALLAX: SETTINGS.PARALLAX,
  PARALLAX_HEIGHT_CONTRAST: SETTINGS.PARALLAX_HEIGHT_CONTRAST,
  PARALLAX_MODE: SETTINGS.PARALLAX_MODE,
  PERSPECTIVE_POINT: SETTINGS.PERSPECTIVE_POINT,
  PERSPECTIVE_EDGE_POINT: "perspectiveEdgePoint",
  BLEND_MODE: SETTINGS.BLEND_MODE,
  OVERLAY_SCALE: SETTINGS.OVERLAY_SCALE,
  SHADOW_MODE: SETTINGS.SHADOW_MODE,
  SHADOW_LENGTH: SETTINGS.SHADOW_LENGTH,
  SUN_EDGE_POINT: "sunEdgePoint",
  TOKEN_ELEVATION_MODE: SETTINGS.TOKEN_ELEVATION_MODE,
  TOKEN_ELEVATION_ANIMATION_MS: SETTINGS.TOKEN_ELEVATION_ANIMATION_MS,
  TOKEN_SCALE_ENABLED: SETTINGS.TOKEN_SCALE_ENABLED,
  TOKEN_SCALE_MAX: SETTINGS.TOKEN_SCALE_MAX,
  DEPTH_SCALE: SETTINGS.DEPTH_SCALE,
  ELEVATION_SCALE: SETTINGS.ELEVATION_SCALE
});

/** Parallax strength values keyed by enum option. */
export const PARALLAX_STRENGTHS = Object.freeze({
  off: 0,
  trace: 0.003,
  minimal: 0.006,
  verySubtle: 0.018,
  subtle: 0.04,
  medium: 0.085,
  strong: 0.15,
  extreme: 0.28
});

export const PARALLAX_HEIGHT_CONTRASTS = Object.freeze({
  reduced: 0.35,
  normal: 1,
  noticeable: 1.15,
  strong: 1.35,
  dramatic: 1.6,
  extreme: 1.9
});

/** Shadow length multipliers keyed by enum option (max 4). */
export const SHADOW_LENGTHS = Object.freeze({
  off: 0,
  short: 0.5,
  normal: 1,
  long: 2,
  extreme: 4
});

export const PARALLAX_LIFT_LIMITS = Object.freeze({
  trace: 2.5,
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
  ANCHORED_CARD: "anchoredCard",
  VELOCITY_CARD: "velocityCard",
  ANCHORED_VELOCITY_CARD: "anchoredVelocityCard",
  LAYERED: "layered",
  HORIZONTAL_SCROLL: "horizontalScroll",
  VERTICAL_SCROLL: "verticalScroll",
  MOUSE: "mouse",
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
  SUN_AT_EDGE: "sunAtEdge"
});

export const TOKEN_ELEVATION_MODES = Object.freeze({
  ALWAYS: "always",
  NEVER: "never",
  PER_REGION: "perRegion"
});

export const OVERHEAD_MODES = Object.freeze({
  HIDE: "hide",
  FADE: "fade",
  KEEP: "keep"
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

export const ELEVATION_SCALE_LIMITS = Object.freeze({
  MIN: 1,
  MAX: 10,
  STEP: 1,
  DEFAULT: 5
});

export const ELEVATION_PRESETS = Object.freeze({
  CUSTOM: "custom",
  DEFAULT: "default",
  CAMERA_LIFT_DRIFT_SHADOW: "cameraLiftDriftShadow",
  MULTI_LAYER_DRIFT_SHADOW: "multiLayerDriftShadow",
  MULTI_LAYER_DRIFT_SHADOWLESS: "multiLayerDriftShadowless",
  MOUSE_DRIFT_SHADOW: "mouseDriftShadow",
  RESPONSIVE_SHADOW_ONLY: "responsiveShadowOnly",
  CAMERA_LIFT_TEXTURE_MELD: "cameraLiftTextureMeld"
});

export const ELEVATION_PRESET_SETTING_KEYS = Object.freeze([
  SCENE_SETTING_KEYS.PARALLAX,
  SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST,
  SCENE_SETTING_KEYS.PARALLAX_MODE,
  SCENE_SETTING_KEYS.PERSPECTIVE_POINT,
  SCENE_SETTING_KEYS.BLEND_MODE,
  SCENE_SETTING_KEYS.OVERLAY_SCALE,
  SCENE_SETTING_KEYS.SHADOW_MODE,
  SCENE_SETTING_KEYS.SHADOW_LENGTH,
  SCENE_SETTING_KEYS.DEPTH_SCALE
]);

const CAMERA_LIFT_DRIFT_SHADOW_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "extreme",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "extreme",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.ANCHORED_VELOCITY_CARD,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.FAR_BOTTOM,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.SOFT,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.RESPONSIVE_ALL_AROUND,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "long",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

const MULTI_LAYER_DRIFT_SHADOW_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "strong",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "extreme",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.LAYERED,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.FAR_BOTTOM,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.SOFT,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.RESPONSIVE_ALL_AROUND,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "long",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

const MULTI_LAYER_DRIFT_SHADOWLESS_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "strong",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "strong",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.LAYERED,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.FAR_BOTTOM,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.WIDE,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.RESPONSIVE_ALL_AROUND,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "normal",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

const MOUSE_DRIFT_SHADOW_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "minimal",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "reduced",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.MOUSE,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.CENTER,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.SOFT,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.TOP_DOWN,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "short",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.LINEAR
});

const RESPONSIVE_SHADOW_ONLY_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "strong",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "normal",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.SHADOW,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.CAMERA_CENTER,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.SOFT,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "subtle",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.RESPONSIVE_ALL_AROUND,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "normal",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

const CAMERA_LIFT_TEXTURE_MELD_PRESET = Object.freeze({
  [SCENE_SETTING_KEYS.PARALLAX]: "medium",
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: "noticeable",
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: PARALLAX_MODES.ANCHORED_CARD,
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: PERSPECTIVE_POINTS.FAR_BOTTOM,
  [SCENE_SETTING_KEYS.BLEND_MODE]: BLEND_MODES.WIDE,
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: "medium",
  [SCENE_SETTING_KEYS.SHADOW_MODE]: SHADOW_MODES.FULL_TEXTURE_MELD,
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: "normal",
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: DEPTH_SCALES.COMPRESSED
});

export const ELEVATION_DEFAULT_SETTINGS = Object.freeze({
  ...MOUSE_DRIFT_SHADOW_PRESET,
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: TOKEN_ELEVATION_MODES.PER_REGION,
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: 120,
  [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: true,
  [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: 1.5,
  [SCENE_SETTING_KEYS.ELEVATION_SCALE]: ELEVATION_SCALE_LIMITS.DEFAULT
});

export const SHADOW_STRENGTH_LIMITS = Object.freeze({
  MIN: 0,
  MAX: 5,
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
  const visualDefaults = elevationPresetValues(ELEVATION_PRESETS.DEFAULT, scene);
  return {
    [SCENE_SETTING_KEYS.PRESET]: ELEVATION_PRESETS.DEFAULT,
    ...visualDefaults,
    [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: _defaultPerspectiveEdgePoint(scene),
    [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: _defaultSunEdgePoint(scene),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: _worldSetting(SETTINGS.TOKEN_ELEVATION_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]),
    [SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]: _worldSetting(SETTINGS.TOKEN_ELEVATION_ANIMATION_MS, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS]),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]: _worldSetting(SETTINGS.TOKEN_SCALE_ENABLED, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]),
    [SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]: _worldSetting(SETTINGS.TOKEN_SCALE_MAX, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX]),
    [SCENE_SETTING_KEYS.ELEVATION_SCALE]: elevationScaleValue(_worldSetting(SETTINGS.ELEVATION_SCALE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.ELEVATION_SCALE]))
  };
}

export function elevationDefaultSettings(scene = canvas?.scene) {
  return defaultSceneElevationSettings(scene);
}

export function getSceneElevationSettings(scene = canvas?.scene) {
  const defaults = defaultSceneElevationSettings(scene);
  const stored = scene?.getFlag?.(MODULE_ID, SCENE_SETTINGS_FLAG) ?? foundry.utils.getProperty(scene ?? {}, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`) ?? {};
  const storedSettings = foundry.utils.deepClone(stored);
  if (!_hasOwn(storedSettings, SCENE_SETTING_KEYS.PRESET) && ELEVATION_PRESET_SETTING_KEYS.some(key => _hasOwn(storedSettings, key))) {
    storedSettings[SCENE_SETTING_KEYS.PRESET] = ELEVATION_PRESETS.CUSTOM;
  }
  const transient = scene ? (_transientSceneSettings.get(scene) ?? {}) : {};
  const sceneSettings = foundry.utils.mergeObject(foundry.utils.deepClone(defaults), storedSettings, MERGE_KNOWN_SCENE_SETTING_OPTIONS);
  const merged = foundry.utils.mergeObject(sceneSettings, foundry.utils.deepClone(transient), MERGE_KNOWN_SCENE_SETTING_OPTIONS);
  return applyElevationPreset(merged, scene);
}

export function getSceneElevationSetting(key, scene = canvas?.scene) {
  return getSceneElevationSettings(scene)[key];
}

export function parallaxHeightContrastValue(setting) {
  const min = PARALLAX_HEIGHT_CONTRASTS.reduced;
  const max = PARALLAX_HEIGHT_CONTRASTS.extreme;
  if (typeof setting === "number") return Math.clamp(Number.isFinite(setting) ? setting : 1, min, max);
  const numeric = Number(setting);
  if (String(setting ?? "").trim() && Number.isFinite(numeric)) return Math.clamp(numeric, min, max);
  const value = PARALLAX_HEIGHT_CONTRASTS[String(setting ?? "normal")];
  return value ?? PARALLAX_HEIGHT_CONTRASTS.normal;
}

export function elevationPresetKey(value) {
  const key = String(value ?? ELEVATION_PRESETS.CUSTOM);
  return Object.values(ELEVATION_PRESETS).includes(key) ? key : ELEVATION_PRESETS.CUSTOM;
}

export function elevationPresetValues(value, scene = canvas?.scene) {
  const preset = elevationPresetKey(value);
  if (preset === ELEVATION_PRESETS.DEFAULT) return _worldVisualSettings(scene);
  if (preset === ELEVATION_PRESETS.CAMERA_LIFT_DRIFT_SHADOW) return { ...CAMERA_LIFT_DRIFT_SHADOW_PRESET };
  if (preset === ELEVATION_PRESETS.MULTI_LAYER_DRIFT_SHADOW) return { ...MULTI_LAYER_DRIFT_SHADOW_PRESET };
  if (preset === ELEVATION_PRESETS.MULTI_LAYER_DRIFT_SHADOWLESS) return { ...MULTI_LAYER_DRIFT_SHADOWLESS_PRESET };
  if (preset === ELEVATION_PRESETS.MOUSE_DRIFT_SHADOW) return { ...MOUSE_DRIFT_SHADOW_PRESET };
  if (preset === ELEVATION_PRESETS.RESPONSIVE_SHADOW_ONLY) return { ...RESPONSIVE_SHADOW_ONLY_PRESET };
  if (preset === ELEVATION_PRESETS.CAMERA_LIFT_TEXTURE_MELD) return { ...CAMERA_LIFT_TEXTURE_MELD_PRESET };
  return null;
}

export function applyElevationPreset(settings, scene = canvas?.scene) {
  const preset = elevationPresetKey(settings?.[SCENE_SETTING_KEYS.PRESET]);
  const presetValues = elevationPresetValues(preset, scene);
  if (!presetValues) return { ...settings, [SCENE_SETTING_KEYS.PRESET]: ELEVATION_PRESETS.CUSTOM };
  return { ...settings, [SCENE_SETTING_KEYS.PRESET]: preset, ...presetValues };
}

export function parallaxHeightContrastKey(setting) {
  const key = String(setting ?? "normal");
  if (PARALLAX_HEIGHT_CONTRASTS[key] !== undefined) return key;
  const value = parallaxHeightContrastValue(setting);
  return Object.entries(PARALLAX_HEIGHT_CONTRASTS).reduce((best, [candidate, candidateValue]) => {
    return Math.abs(candidateValue - value) < Math.abs(PARALLAX_HEIGHT_CONTRASTS[best] - value) ? candidate : best;
  }, "normal");
}

export function shadowLengthValue(setting) {
  if (typeof setting === "number") return Math.clamp(Number.isFinite(setting) ? setting : 1, 0, 4);
  const numeric = Number(setting);
  if (String(setting ?? "").trim() && Number.isFinite(numeric) && !SHADOW_LENGTHS[String(setting)]) return Math.clamp(numeric, 0, 4);
  const value = SHADOW_LENGTHS[String(setting ?? "normal")];
  return value ?? SHADOW_LENGTHS.normal;
}

export function shadowLengthKey(setting) {
  const key = String(setting ?? "normal");
  if (SHADOW_LENGTHS[key] !== undefined) return key;
  const value = shadowLengthValue(setting);
  return Object.entries(SHADOW_LENGTHS).reduce((best, [candidate, candidateValue]) => {
    return Math.abs(candidateValue - value) < Math.abs(SHADOW_LENGTHS[best] - value) ? candidate : best;
  }, "normal");
}

export function elevationScaleValue(setting) {
  const value = Number(setting ?? ELEVATION_SCALE_LIMITS.DEFAULT);
  const fallback = ELEVATION_SCALE_LIMITS.DEFAULT;
  return Math.clamp(Number.isFinite(value) ? value : fallback, ELEVATION_SCALE_LIMITS.MIN, ELEVATION_SCALE_LIMITS.MAX);
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

function _worldVisualSettings() {
  return {
    [SCENE_SETTING_KEYS.PARALLAX]: _worldChoiceSetting(SETTINGS.PARALLAX, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX], Object.keys(PARALLAX_STRENGTHS)),
    [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: parallaxHeightContrastKey(_worldSetting(SETTINGS.PARALLAX_HEIGHT_CONTRAST, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST])),
    [SCENE_SETTING_KEYS.PARALLAX_MODE]: _worldChoiceSetting(SETTINGS.PARALLAX_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PARALLAX_MODE], Object.values(PARALLAX_MODES)),
    [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: _worldChoiceSetting(SETTINGS.PERSPECTIVE_POINT, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.PERSPECTIVE_POINT], Object.values(PERSPECTIVE_POINTS)),
    [SCENE_SETTING_KEYS.BLEND_MODE]: _worldChoiceSetting(SETTINGS.BLEND_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.BLEND_MODE], Object.values(BLEND_MODES)),
    [SCENE_SETTING_KEYS.OVERLAY_SCALE]: _worldChoiceSetting(SETTINGS.OVERLAY_SCALE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.OVERLAY_SCALE], Object.keys(OVERLAY_SCALE_STRENGTHS)),
    [SCENE_SETTING_KEYS.SHADOW_MODE]: _worldChoiceSetting(SETTINGS.SHADOW_MODE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SHADOW_MODE], Object.values(SHADOW_MODES)),
    [SCENE_SETTING_KEYS.SHADOW_LENGTH]: shadowLengthKey(_worldSetting(SETTINGS.SHADOW_LENGTH, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.SHADOW_LENGTH])),
    [SCENE_SETTING_KEYS.DEPTH_SCALE]: _worldChoiceSetting(SETTINGS.DEPTH_SCALE, ELEVATION_DEFAULT_SETTINGS[SCENE_SETTING_KEYS.DEPTH_SCALE], Object.values(DEPTH_SCALES))
  };
}

function _worldChoiceSetting(key, fallback, choices) {
  const value = String(_worldSetting(key, fallback) ?? fallback);
  return choices.includes(value) ? value : fallback;
}

function _hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
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
