import { MODULE_ID, SCENE_SETTING_KEYS, PARALLAX_STRENGTHS, PARALLAX_LIFT_LIMITS, PARALLAX_DISTANCE_FACTORS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, OVERHEAD_MODES, OVERLAY_SCALE_STRENGTHS, DEPTH_SCALES, DEPTH_SCALE_REFERENCE, REGION_BEHAVIOR_TYPE, SHADOW_STRENGTH_LIMITS, SHADOW_LENGTHS, PARALLAX_HEIGHT_CONTRASTS, elevationPresetValues, sceneGeometry, getSceneElevationSetting, getSceneElevationSettings, parallaxHeightContrastValue, shadowLengthValue, shadowLengthKey, elevationScaleValue, edgeStretchPercentValue } from "./config.mjs";

/**
 * Per-draw settings cache. `getSceneElevationSettings()` rebuilds via two deep clones
 * + mergeObjects on every call; with ~7 helper calls per draw plus per-region perspective
 * lookups this dominated the pan loop. The renderer fills this once at the top of
 * `_drawRegions` and clears it in `finally`. All hot-path readers route through `_setting`.
 */
let _settingsCache = null;
function _setting(key) {
  if (_settingsCache) return _settingsCache[key];
  return getSceneElevationSetting(key);
}

const MIN_ELEVATION_DELTA = 0.05;
const CLIFF_WARP_ELEVATION_MATCH_TOLERANCE = 0.1;
const OVERLAY_ELEVATION_REFERENCE = 6;
const OVERLAY_LIFT_BASE = 0.225;
const OVERLAY_LIFT_PARALLAX = 0.6;
const OVERLAY_LIFT_MAX_GRID = 1.75;
const OVERLAY_LIFT_MAX_PIXELS = 140;
const PARALLAX_INTERNAL_STRENGTH = 1.0;
const SMOOTH_PARALLAX_EPSILON = 0.35;
const ANCHORED_CAMERA_MULTIPLIER = 0.75;
const VELOCITY_CAMERA_MULTIPLIER = 0.9;
const VELOCITY_PARALLAX_DECAY = 0.82;
const ANCHORED_VELOCITY_ANCHOR_WEIGHT = 0.6;
const ANCHORED_VELOCITY_DRIFT_WEIGHT = 0.55;
const ORTHOGRAPHIC_PAN_MULTIPLIER = 0.72;
const ORTHOGRAPHIC_PAN_EASE = 0.28;
const ORTHOGRAPHIC_TOP_DOWN_PAN_LIFT_RATIO = 0.92;
const ORTHOGRAPHIC_ANGLE_PROJECTION_RATIO = 0.58;
const ORTHOGRAPHIC_ANGLE_PAN_LIFT_RATIO = 0.45;
const ORTHOGRAPHIC_TOP_DOWN_DIRECTION = Object.freeze({ x: 0, y: 0 });
const ORTHOGRAPHIC_ANGLE_DIRECTION = Object.freeze({ x: 0, y: -1 });
const TOP_DOWN_HEIGHT_REFERENCE_PARALLAX = PARALLAX_STRENGTHS.medium;
const TOP_DOWN_HEIGHT_MAX_STRENGTH_SCALE = 1.65;
// Inner-gain for the tanh response curve. Slope at zero equals this value,
// so motion through the region center stays continuous with no flat spot.
// Values >1 over-drive the curve back toward a flat-at-center shape; keep
// at or below 1.0 so the camera never "pauses" while crossing an axis.
const TOP_DOWN_HEIGHT_RESPONSE_GAIN = 1.0;
const TOP_DOWN_HEIGHT_SOFT_CAP_MULTIPLIER = 1.75;
const TOP_DOWN_HEIGHT_OFFSET_EASE = 0.34;
const TOP_DOWN_HEIGHT_EDGE_PREVIEW_GRID_RATIO = 1.5;
const LAYERED_CAMERA_MULTIPLIER = 1.12;
const AXIS_SCROLL_CAMERA_MULTIPLIER = 1.15;
const MOUSE_PARALLAX_MULTIPLIER = 0.8;
const MOUSE_PARALLAX_INTERNAL_STRENGTH = 0.15;
const MOUSE_PARALLAX_LIFT_REFERENCE_GRID_RATIO = 0.24;
const LOW_ELEVATION_PARALLAX_FACTOR = 1.16;
const HIGH_ELEVATION_PARALLAX_FACTOR = 0.52;
const PARALLAX_DEPTH_CURVE_CENTER = 0.47;
const PARALLAX_DEPTH_CURVE_STEEPNESS = 15;
const CARD_TRANSITION_SHIFT_RATIO = 0.28;
const TRANSITION_TEXTURE_SHIFT_RATIO = 0.55;
const TRANSITION_WIDTH_MIN = 2;
const TRANSITION_WIDTH_GRID_RATIO = 0.028;
const TRANSITION_WIDTH_ELEVATION_RATIO = 0.018;
const TRANSITION_WIDTH_PARALLAX_BONUS = 8;
const TRANSITION_WIDTH_MAX = 8;
const EDGE_GLUE_ALPHA_MAX = 0.45;
const SLOPE_TEXTURE_ALPHA_MAX = 0.72;
const SLOPE_DROP_MIN_PIXELS = 5;
const SLOPE_DROP_MAX_PIXELS = 14;
const CLIFF_WARP_DROP_MAX_PIXELS = 42;
const CLIFF_WARP_SOLID_ALPHA = 0.92;
const CLIFF_WARP_SOURCE_RIM_PIXELS = 4;
const CLIFF_WARP_SIMPLIFY_GRID_RATIO = 0.12;
const CLIFF_WARP_SIMPLIFY_MIN_PIXELS = 4;
const CLIFF_WARP_SIMPLIFY_MAX_PIXELS = 12;
const CLIFF_WARP_EDGE_OVERHANG_RATIO = 0.45;
const CLIFF_WARP_SIDE_ROWS = Object.freeze([
  Object.freeze({ t: 0, normalOffset: 1.15, overhang: 0 }),
  Object.freeze({ t: 0.52, normalOffset: 0.05, overhang: 0.2 }),
  Object.freeze({ t: 1, normalOffset: -1.15, overhang: CLIFF_WARP_EDGE_OVERHANG_RATIO })
]);
// 2.5D plateau-walls row set: adds overshoot rows above the top (tuck under
// the lifted overlay) and below the base (extend slightly past the base
// footprint) so the wall reads as a continuous opaque band with no seam.
const EXTRUDED_WALLS_SOLID_ALPHA = 1;
const EXTRUDED_WALLS_SIDE_ROWS = Object.freeze([
  Object.freeze({ t: -0.08, sourcePixels: 8, overhang: -0.22 }),
  Object.freeze({ t: 0, sourcePixels: 6, overhang: -0.04 }),
  Object.freeze({ t: 0.05, sourcePixels: 4, overhang: 0.08 }),
  Object.freeze({ t: 0.35, sourceGrid: -0.18, overhang: 0.36 }),
  Object.freeze({ t: 0.72, sourceGrid: -0.34, overhang: 0.58 }),
  Object.freeze({ t: 1.12, sourceGrid: -0.5, overhang: 0.82 })
]);
const EDGE_STRETCH_SOLID_ALPHA = 0.9;
const EDGE_STRETCH_SIDE_ROWS = Object.freeze([
  Object.freeze({ t: 0, source: 0, overhang: 0 }),
  Object.freeze({ t: 0.18, source: 0.16, overhang: 0.04 }),
  Object.freeze({ t: 0.58, source: 0.62, overhang: 0.13 }),
  Object.freeze({ t: 1, source: 1, overhang: 0.26 })
]);
const STRONG_TOP_DOWN_SHADOW_MULTIPLIER = 2.35;
const STRONG_TOP_DOWN_BLUR_MULTIPLIER = 1.55;
const SUN_EDGE_SHADOW_ALPHA_MULTIPLIER = 1.25;
const SUN_EDGE_SHADOW_LENGTH_MULTIPLIER = 1.2;
const TRANSITION_MASK_BLUR_RATIO = 0.35;
const INNER_SHADOW_WIDTH_GRID_RATIO = 0.14;
const INNER_SHADOW_WIDTH_ELEVATION_RATIO = 0.05;
const INNER_SHADOW_BLUR_GRID_RATIO = 0.08;
const INNER_SHADOW_BLUR_ELEVATION_RATIO = 0.03;
const INNER_SHADOW_OFFSET_MULTIPLIER = 0.75;
const INNER_SHADOW_ALPHA_BASE = 0.42;
const INNER_SHADOW_ALPHA_ELEVATION = 0.14;
const INNER_CONTACT_ALPHA_BASE = 0.24;
const INNER_CONTACT_ALPHA_ELEVATION = 0.08;
const INNER_SHADOW_ALPHA_MAX = 0.82;
const STATIC_SHADOW_DIRECTION = Object.freeze({ x: 0.42, y: 0.91 });
const SHADOW_OFFSET_MULTIPLIER = 1.7;
const CONTACT_SHADOW_OFFSET_MULTIPLIER = 0.58;
const OVERLAY_SCALE_DEPTH_MAX = 3.4;
const SOFT_SHADOW_BLUR_MIN = 4;
const SOFT_SHADOW_BLUR_GRID_RATIO = 0.18;
const SOFT_SHADOW_BLUR_ELEVATION_RATIO = 0.055;
const CONTACT_SHADOW_BLUR_MIN = 2;
const CONTACT_SHADOW_BLUR_GRID_RATIO = 0.045;
const CONTACT_SHADOW_BLUR_ELEVATION_RATIO = 0.018;
const SOFT_SHADOW_ALPHA_BASE = 0.18;
const SOFT_SHADOW_ALPHA_ELEVATION = 0.065;
const CONTACT_SHADOW_ALPHA_BASE = 0.34;
const CONTACT_SHADOW_ALPHA_ELEVATION = 0.11;
const SHADOW_ALPHA_MAX = 0.85;
const RESPONSIVE_ALL_AROUND_ALPHA_RATIO = 0.42;
const RESPONSIVE_ALL_AROUND_BLUR_RATIO = 0.64;
const SHADOW_BRIDGE_THRESHOLD = 1.08;
const SHADOW_BRIDGE_MAX_ALPHA_RATIO = 0.42;
const SHADOW_BRIDGE_OFFSET_RATIO = 0.52;
const TEXTURE_SHADOW_BRIDGE_ALPHA_RATIO = 0.72;
const TEXTURE_MELD_SAMPLE_PULL = 0.68;
const TEXTURE_MELD_SOFT_ALPHA = 0.46;
const TEXTURE_MELD_CONTACT_ALPHA = 0.36;
const TEXTURE_MELD_BLACK_ALPHA_RATIO = 0.58;
const FULL_TEXTURE_MELD_SOFT_ALPHA = 0.62;
const FULL_TEXTURE_MELD_CONTACT_ALPHA = 0.5;
const OVERHEAD_FADE_ALPHA = 0.5;
const REGION_CONTAINER_Z_INDEX = 10_000;
const OVERHEAD_SORT_EPSILON = 0.001;
const OVERHEAD_SUPPORT_EPSILON = 0.001;
// Compensation factor applied to the Elevation Scale setting at render time.
// The user-facing default moved from 3 to 5 (so 5 ft / grid systems can use
// a single tick) without changing the visual; legacy default 3 / new default
// 5 = 0.6.
const ELEVATION_SCALE_RENDER_COMPENSATION = 3 / 5;

const BLEND_PROFILE_CONFIGS = Object.freeze({
  [BLEND_MODES.OFF]: Object.freeze({
    widthMultiplier: 0,
    widthAdd: 0,
    maxWidth: 0,
    textureShiftRatio: TRANSITION_TEXTURE_SHIFT_RATIO,
    overlayAlpha: 1,
    glueAlpha: 0,
    glueBlurMultiplier: 0,
    slopeAlpha: 0,
    slopeWidthMultiplier: 0,
    slopeTextureShiftRatio: 0,
    slopeDropPixels: 0
  }),
  [BLEND_MODES.SOFT]: Object.freeze({
    widthMultiplier: 1,
    widthAdd: 0,
    maxWidth: TRANSITION_WIDTH_MAX,
    textureShiftRatio: TRANSITION_TEXTURE_SHIFT_RATIO,
    overlayAlpha: 1,
    glueAlpha: 0,
    glueBlurMultiplier: 0,
    slopeAlpha: 0,
    slopeWidthMultiplier: 0,
    slopeTextureShiftRatio: 0,
    slopeDropPixels: 0
  }),
  [BLEND_MODES.WIDE]: Object.freeze({
    widthMultiplier: 1.55,
    widthAdd: 2,
    maxWidth: 14,
    textureShiftRatio: 0.58,
    overlayAlpha: 0.965,
    glueAlpha: 0.045,
    glueBlurMultiplier: 0.8,
    slopeAlpha: 0,
    slopeWidthMultiplier: 0,
    slopeTextureShiftRatio: 0,
    slopeDropPixels: 0
  }),
  [BLEND_MODES.EDGE_STRETCH]: Object.freeze({
    widthMultiplier: 2.05,
    widthAdd: 6,
    maxWidth: 42,
    textureShiftRatio: 0.22,
    overlayAlpha: 0.985,
    glueAlpha: 0.12,
    glueBlurMultiplier: 0.12,
    slopeAlpha: EDGE_STRETCH_SOLID_ALPHA,
    slopeAlphaMax: EDGE_STRETCH_SOLID_ALPHA,
    slopeWidthMultiplier: 1.5,
    slopeTextureShiftRatio: 0,
    slopeDropPixels: 20,
    dropMaxPixels: 34,
    stretchAlpha: 0,
    stretchSteps: 0,
    stretchScaleMin: 1.02,
    stretchScaleMax: 1.18,
    bridgeBaseAlpha: 0,
    edgeStretch: true,
    edgeStretchAlpha: EDGE_STRETCH_SOLID_ALPHA,
    edgeStretchAlphaMax: EDGE_STRETCH_SOLID_ALPHA,
    edgeStretchWidthBase: 0.18,
    edgeStretchWidthElevationRatio: 0.2,
    liftMultiplier: 1.18,
    overlayScaleBonus: 0.004
  }),
  [BLEND_MODES.CLIFF_WARP]: Object.freeze({
    widthMultiplier: 2.35,
    widthAdd: 8,
    maxWidth: 48,
    textureShiftRatio: 0.22,
    overlayAlpha: 0.985,
    glueAlpha: 0.2,
    glueBlurMultiplier: 0.12,
    slopeAlpha: CLIFF_WARP_SOLID_ALPHA,
    slopeAlphaMax: CLIFF_WARP_SOLID_ALPHA,
    slopeWidthMultiplier: 1.65,
    slopeTextureShiftRatio: 0.18,
    slopeDropPixels: 24,
    dropMaxPixels: CLIFF_WARP_DROP_MAX_PIXELS,
    stretchAlpha: 0,
    stretchSteps: 0,
    stretchScaleMin: 1.03,
    stretchScaleMax: 1.28,
    bridgeBaseAlpha: 0,
    cliffWarp: true,
    cliffWarpAlpha: CLIFF_WARP_SOLID_ALPHA,
    cliffWarpAlphaMax: CLIFF_WARP_SOLID_ALPHA,
    cliffWarpSourceWidth: CLIFF_WARP_SOURCE_RIM_PIXELS,
    cliffWarpWidthBase: 0.22,
    cliffWarpWidthElevationRatio: 0.24,
    liftMultiplier: 1.25,
    overlayScaleBonus: 0.006
  }),
  // 2.5D plateau side-walls. Reuses the cliff-warp wall infrastructure (same
  // top/base anchor math, same texture-strip sampling) but the renderer culls
  // edges whose outward normal opposes the parallax direction, so only the
  // walls "facing" the camera shift remain visible. Driven by `extrudedWalls`.
  [BLEND_MODES.EXTRUDED_WALLS]: Object.freeze({
    widthMultiplier: 2.35,
    widthAdd: 8,
    maxWidth: 56,
    textureShiftRatio: 0.22,
    overlayAlpha: 0.99,
    glueAlpha: 0.18,
    glueBlurMultiplier: 0.12,
    slopeAlpha: CLIFF_WARP_SOLID_ALPHA,
    slopeAlphaMax: CLIFF_WARP_SOLID_ALPHA,
    slopeWidthMultiplier: 1.7,
    slopeTextureShiftRatio: 0.18,
    slopeDropPixels: 24,
    dropMaxPixels: CLIFF_WARP_DROP_MAX_PIXELS,
    stretchAlpha: 0,
    stretchSteps: 0,
    stretchScaleMin: 1.03,
    stretchScaleMax: 1.28,
    bridgeBaseAlpha: 0,
    extrudedWalls: true,
    cliffWarpAlpha: EXTRUDED_WALLS_SOLID_ALPHA,
    cliffWarpAlphaMax: EXTRUDED_WALLS_SOLID_ALPHA,
    cliffWarpSourceWidth: CLIFF_WARP_SOURCE_RIM_PIXELS,
    cliffWarpWidthBase: 0.22,
    cliffWarpWidthElevationRatio: 0.24,
    liftMultiplier: 1.3,
    overlayScaleBonus: 0.006
  })
});

export function getActiveElevationRegions(scene = canvas?.scene, pathCache = null) {
  const regions = scene?.regions;
  if (!regions?.size) return [];
  const entries = [];
  for (const region of regions) {
    const behavior = region.behaviors?.find(b => b.type === REGION_BEHAVIOR_TYPE && !b.disabled);
    if (!behavior) continue;
    const sourceSystem = behavior._source?.system ?? {};
    const flatElevation = _finiteNumber(behavior.system?.elevation ?? sourceSystem.elevation ?? sourceSystem.height, 0);
    const slope = (behavior.system?.slope ?? sourceSystem.slope) === true;
    const slopeHeight = slope ? _slopeHeightValue(behavior.system, sourceSystem, flatElevation) : 0;
    const slopeBaseElevation = flatElevation;
    const slopeFarElevation = slopeBaseElevation + slopeHeight;
    const lowestElevation = slope ? Math.min(slopeBaseElevation, slopeFarElevation) : flatElevation;
    const highestElevation = slope ? Math.max(slopeBaseElevation, slopeFarElevation) : flatElevation;
    const elevation = slope ? (slopeBaseElevation + slopeFarElevation) / 2 : flatElevation;
    const shadowStrength = Number(behavior.system?.shadowStrength ?? sourceSystem.shadowStrength ?? SHADOW_STRENGTH_LIMITS.DEFAULT);
    const overhead = (behavior.system?.overhead ?? sourceSystem.overhead) === true;
    const underOverheadMode = _overheadMode(behavior.system?.underOverheadMode ?? sourceSystem.underOverheadMode);
    if (!Number.isFinite(elevation)) continue;
    const presetOverride = _regionPresetOverride(behavior.system?.presetOverride ?? sourceSystem.presetOverride);
    const presetValues = presetOverride ? elevationPresetValues(presetOverride, scene) : null;
    const paths = (pathCache || slope) ? _regionPaths(region) : null;
    if (pathCache) pathCache.set(region, paths);
    const slopeDirection = _normalizeDegrees(behavior.system?.slopeDirection ?? sourceSystem.slopeDirection ?? 0);
    const slopeVector = _slopeDirectionVector(slopeDirection);
    const slopeRange = slope && paths?.length ? _slopeProjectionRange(paths, slopeVector) : null;
    entries.push({
      region,
      behavior,
      flatElevation,
      elevation,
      maxAbsElevation: slope ? Math.max(Math.abs(lowestElevation), Math.abs(highestElevation), Math.abs(elevation)) : Math.abs(elevation),
      slope,
      slopeBaseElevation,
      slopeFarElevation,
      slopeHeight,
      lowestElevation,
      highestElevation,
      slopeDirection,
      slopeVector,
      slopeMinProjection: slopeRange?.min ?? 0,
      slopeMaxProjection: slopeRange?.max ?? 0,
      shadowStrength: Math.clamp(Number.isFinite(shadowStrength) ? shadowStrength : SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX),
      overhead,
      underOverheadMode,
      area: _regionArea(region, paths),
      presetOverride,
      parallaxStrengthOverride: _keyOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.PARALLAX, behavior.system?.parallaxStrengthOverride ?? sourceSystem.parallaxStrengthOverride), PARALLAX_STRENGTHS),
      parallaxModeOverride: _settingOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.PARALLAX_MODE, behavior.system?.parallaxModeOverride ?? sourceSystem.parallaxModeOverride), PARALLAX_MODES),
      perspectivePointOverride: _settingOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.PERSPECTIVE_POINT, behavior.system?.perspectivePointOverride ?? sourceSystem.perspectivePointOverride), PERSPECTIVE_POINTS),
      overlayScaleOverride: _keyOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.OVERLAY_SCALE, behavior.system?.overlayScaleOverride ?? sourceSystem.overlayScaleOverride), OVERLAY_SCALE_STRENGTHS),
      shadowModeOverride: _settingOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.SHADOW_MODE, behavior.system?.shadowModeOverride ?? sourceSystem.shadowModeOverride), SHADOW_MODES),
      shadowLengthOverride: _shadowLengthOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.SHADOW_LENGTH, behavior.system?.shadowLengthOverride ?? sourceSystem.shadowLengthOverride)),
      blendModeOverride: _settingOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.BLEND_MODE, behavior.system?.blendModeOverride ?? sourceSystem.blendModeOverride), BLEND_MODES),
      edgeStretchPercentOverride: _edgeStretchPercentOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT, behavior.system?.edgeStretchPercentOverride ?? sourceSystem.edgeStretchPercentOverride)),
      depthScaleOverride: _settingOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.DEPTH_SCALE, behavior.system?.depthScaleOverride ?? sourceSystem.depthScaleOverride), DEPTH_SCALES),
      elevationScaleOverride: _elevationScaleOverride(behavior.system?.elevationScaleOverride ?? sourceSystem.elevationScaleOverride),
      parallaxHeightContrastOverride: _keyOverride(_presetValue(presetValues, SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST, behavior.system?.parallaxHeightContrastOverride ?? sourceSystem.parallaxHeightContrastOverride), PARALLAX_HEIGHT_CONTRASTS),
      modifyTokenElevation: !overhead && behavior.system?.modifyTokenElevation !== false,
      modifyTokenScaling: !overhead && behavior.system?.modifyTokenScaling !== false
    });
  }
  return entries;
}

function _overheadMode(value) {
  const mode = String(value ?? OVERHEAD_MODES.FADE);
  return Object.values(OVERHEAD_MODES).includes(mode) ? mode : OVERHEAD_MODES.FADE;
}

function _overheadModeAlpha(mode) {
  switch (_overheadMode(mode)) {
    case OVERHEAD_MODES.HIDE:
      return 0;
    case OVERHEAD_MODES.KEEP:
      return 1;
    case OVERHEAD_MODES.FADE:
    default:
      return OVERHEAD_FADE_ALPHA;
  }
}

function _tokenOwnedByCurrentUser(token) {
  return !!(token?.isOwner || token?.document?.isOwner || token?.actor?.isOwner);
}

function _tokenSelected(token) {
  return !!(token?.controlled || token?.selected || token?.isControlled || canvas?.tokens?.controlled?.includes(token));
}

function _tokenUnderOverhead(token, entry) {
  const state = _tokenRegionState(token);
  if (!state?.document || state.document.parent !== canvas?.scene || !entry?.region) return false;
  const tokenElevation = _finiteNumber(state.elevation, 0);
  return _tokenRegionSamplePoints(state).some(point => {
    const regionElevation = _entryElevationAtPoint(entry, point);
    return regionElevation > tokenElevation + 0.001 && _regionContains(entry.region, point, regionElevation);
  });
}

function _tokenRegionState(token) {
  const document = token?.document ?? token;
  if (!document) return null;
  const object = token?.document ? token : document.object;
  const documentElevation = Number(document.elevation);
  const objectElevation = Number(object?.elevation);
  const elevation = Number.isFinite(documentElevation) && Number.isFinite(objectElevation)
    ? Math.max(documentElevation, objectElevation)
    : Number.isFinite(documentElevation) ? documentElevation : objectElevation;
  return {
    document,
    x: _finiteNumber(object?.x ?? object?.position?.x ?? document.x, document.x ?? 0),
    y: _finiteNumber(object?.y ?? object?.position?.y ?? document.y, document.y ?? 0),
    width: _finiteNumber(document.width, 1),
    height: _finiteNumber(document.height, 1),
    elevation: _finiteNumber(elevation, 0)
  };
}

function _tokenRegionSamplePoints(tokenState) {
  const gridSize = _finiteNumber(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? canvas?.dimensions?.size, 100);
  const x = _finiteNumber(tokenState.x, 0);
  const y = _finiteNumber(tokenState.y, 0);
  const width = Math.max(0.25, _finiteNumber(tokenState.width, 1)) * gridSize;
  const height = Math.max(0.25, _finiteNumber(tokenState.height, 1)) * gridSize;
  const elevation = _finiteNumber(tokenState.elevation, 0);
  const insetX = Math.min(width / 2, Math.max(1, gridSize * 0.2));
  const insetY = Math.min(height / 2, Math.max(1, gridSize * 0.2));
  return [
    { x: x + width / 2, y: y + height / 2, elevation },
    { x: x + insetX, y: y + insetY, elevation },
    { x: x + width - insetX, y: y + insetY, elevation },
    { x: x + insetX, y: y + height - insetY, elevation },
    { x: x + width - insetX, y: y + height - insetY, elevation }
  ];
}

export function getRegionElevationStateAtPoint(point, scene = canvas?.scene, entries = null, options = {}) {
  const candidates = entries ?? getActiveElevationRegions(scene);
  let elevation = 0;
  let entry = null;
  let found = false;
  let area = Infinity;
  for (const candidate of candidates) {
    const candidateElevation = _entryElevationAtPoint(candidate, point);
    const overheadSupport = _overheadSupportsPoint(candidate, point, candidateElevation, options);
    if (options.allowOverheadSupport && candidate.overhead && !overheadSupport) continue;
    if (options.requireTokenElevation && !candidate.modifyTokenElevation && !overheadSupport) continue;
    if (options.requireTokenScaling && !candidate.modifyTokenScaling && !overheadSupport) continue;
    if (!_regionContains(candidate.region, point, candidateElevation)) continue;
    if (options.preferHighest) {
      if (!found || candidateElevation > elevation) {
        elevation = candidateElevation;
        entry = candidate;
      }
      found = true;
      continue;
    }
    const candidateArea = candidate.area || Infinity;
    if (!found || candidateArea < area || (candidateArea === area && candidateElevation > elevation)) {
      elevation = candidateElevation;
      entry = candidate;
      area = candidateArea;
    }
    found = true;
  }
  return { found, elevation: found ? elevation : 0, entry };
}

function _overheadSupportsPoint(entry, point, elevation, options = {}) {
  if (!options.allowOverheadSupport || !entry?.overhead) return false;
  const tokenElevation = Number(point?.elevation);
  return Number.isFinite(tokenElevation) && tokenElevation >= Number(elevation ?? 0) - OVERHEAD_SUPPORT_EPSILON;
}

export function getRegionElevationAtPoint(point, scene = canvas?.scene, entries = null, options = {}) {
  return getRegionElevationStateAtPoint(point, scene, entries, options).elevation;
}

function _settingOverride(value, options) {
  const override = String(value ?? "");
  return Object.values(options).includes(override) ? override : "";
}

function _keyOverride(value, options) {
  const override = String(value ?? "");
  return Object.prototype.hasOwnProperty.call(options, override) ? override : "";
}

function _shadowLengthOverride(value) {
  const override = String(value ?? "");
  if (!override) return "";
  if (Object.prototype.hasOwnProperty.call(SHADOW_LENGTHS, override)) return override;
  return Number.isFinite(Number(override)) ? shadowLengthKey(value) : "";
}

function _elevationScaleOverride(value) {
  if (String(value ?? "").trim() === "") return null;
  return elevationScaleValue(value);
}

function _edgeStretchPercentOverride(value) {
  if (String(value ?? "").trim() === "") return null;
  return edgeStretchPercentValue(value);
}

function _regionPresetOverride(value) {
  const override = String(value ?? "");
  return elevationPresetValues(override) ? override : "";
}

function _presetValue(presetValues, key, fallback) {
  return presetValues?.[key] ?? fallback;
}

function _finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function _slopeHeightValue(system, sourceSystem, flatElevation) {
  const explicit = Number(system?.slopeHeight ?? sourceSystem.slopeHeight);
  if (Number.isFinite(explicit)) return explicit;
  const lowest = _finiteNumber(system?.slopeLowestElevation ?? sourceSystem.slopeLowestElevation, flatElevation);
  const highest = _finiteNumber(system?.slopeHighestElevation ?? sourceSystem.slopeHighestElevation, flatElevation);
  const lowDelta = lowest - flatElevation;
  const highDelta = highest - flatElevation;
  return Math.abs(highDelta) >= Math.abs(lowDelta) ? highDelta : lowDelta;
}

function _normalizeDegrees(value) {
  const number = _finiteNumber(value, 0);
  return ((number % 360) + 360) % 360;
}

function _slopeDirectionVector(degrees) {
  const radians = (_normalizeDegrees(degrees) * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

function _slopeProjectionRange(paths, vector) {
  let min = Infinity;
  let max = -Infinity;
  for (const path of paths) {
    for (const point of path) {
      const projection = point.x * vector.x + point.y * vector.y;
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || Math.abs(max - min) < 1e-6) return null;
  return { min, max };
}

function _entryElevationAtPoint(entry, point) {
  if (!entry?.slope) return entry?.elevation ?? 0;
  const range = entry.slopeMaxProjection - entry.slopeMinProjection;
  if (!Number.isFinite(range) || Math.abs(range) < 1e-6) return entry.elevation ?? 0;
  const projection = point.x * entry.slopeVector.x + point.y * entry.slopeVector.y;
  const t = Math.clamp((projection - entry.slopeMinProjection) / range, 0, 1);
  const base = entry.slopeBaseElevation ?? entry.lowestElevation;
  const far = entry.slopeFarElevation ?? entry.highestElevation;
  return base + (far - base) * t;
}

export function regionContainsPoint(region, point, elevation = undefined) {
  return _regionContains(region, point, elevation);
}

function _regionContains(region, point, elevation = undefined) {
  try {
    if (region.testPoint?.({ x: point.x, y: point.y })) return true;
  } catch (err) {}
  const elevations = new Set([point.elevation, elevation, 0].filter(value => Number.isFinite(Number(value))).map(Number));
  for (const testElevation of elevations) {
    try {
      if (region.testPoint?.({ x: point.x, y: point.y, elevation: testElevation })) return true;
    } catch (err) {}
  }
  return _regionPaths(region).some(path => _pointInPolygon(point, path));
}

function _pointInPolygon(point, path) {
  let inside = false;
  for (let index = 0, previous = path.length - 1; index < path.length; previous = index++) {
    const currentPoint = path[index];
    const previousPoint = path[previous];
    const intersects = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || 1e-9) + currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function _normalizeRegionPath(path) {
  if (!Array.isArray(path) || !path.length) return [];
  const points = [];
  const first = path[0];
  if (typeof first === "number") {
    for (let index = 0; index < path.length - 1; index += 2) {
      points.push({ x: Number(path[index]), y: Number(path[index + 1]) });
    }
  } else {
    for (const point of path) {
      if (Array.isArray(point)) points.push({ x: Number(point[0]), y: Number(point[1]) });
      else points.push({ x: Number(point.X ?? point.x), y: Number(point.Y ?? point.y) });
    }
  }
  return points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function _looksLikePoint(value) {
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  return value && (Number.isFinite(value.x) || Number.isFinite(value.X));
}

function _regionPaths(region) {
  const raw = region.polygonTree?.toClipperPoints?.()
    ?? region.polygons?.map(polygon => Array.from(polygon.points ?? []))
    ?? [];
  const rawPaths = typeof raw[0] === "number" || _looksLikePoint(raw[0]) ? [raw] : raw;
  return rawPaths.map(_normalizeRegionPath).filter(path => path.length >= 3);
}

function _pathArea(path) {
  let area = 0;
  for (let index = 0; index < path.length; index++) {
    const point = path[index];
    const next = path[(index + 1) % path.length];
    area += point.x * next.y - next.x * point.y;
  }
  return Math.abs(area) / 2;
}

function _pathSignedArea(path) {
  let area = 0;
  for (let index = 0; index < path.length; index++) {
    const point = path[index];
    const next = path[(index + 1) % path.length];
    area += point.x * next.y - next.x * point.y;
  }
  return area / 2;
}

function _pathCentroid(path) {
  if (!path?.length) return null;
  let x = 0;
  let y = 0;
  for (const point of path) {
    x += point.x;
    y += point.y;
  }
  return { x: x / path.length, y: y / path.length };
}

function _regionArea(region, paths = null) {
  paths ??= _regionPaths(region);
  if (!paths.length) return Infinity;
  return paths.reduce((sum, path) => sum + _pathArea(path), 0) || Infinity;
}

function _pathsBounds(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  };
}

const _pathsBoundsCache = new WeakMap();
const _pathsSignatureCache = new WeakMap();

function _cachedPathsBounds(paths) {
  let bounds = _pathsBoundsCache.get(paths);
  if (bounds !== undefined) return bounds;
  bounds = _pathsBounds(paths);
  _pathsBoundsCache.set(paths, bounds);
  return bounds;
}

function _pathsContain(paths, point) {
  return paths.some(path => _pointInPolygon(point, path));
}

function _pathsSignature(paths) {
  let signature = _pathsSignatureCache.get(paths);
  if (signature) return signature;
  signature = paths
    .map(path => path.map(point => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`).join(";"))
    .join("|");
  _pathsSignatureCache.set(paths, signature);
  return signature;
}

function _textureNumber(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function _cameraFocus(parent) {
  const view = canvas.scene?._viewPosition;
  if (Number.isFinite(view?.x) && Number.isFinite(view?.y)) return new PIXI.Point(view.x, view.y);
  const pivot = canvas.stage?.pivot;
  if (Number.isFinite(pivot?.x) && Number.isFinite(pivot?.y)) return new PIXI.Point(pivot.x, pivot.y);
  const screen = canvas.app.renderer.screen;
  return parent.toLocal(new PIXI.Point(
    (screen.x ?? 0) + screen.width / 2,
    (screen.y ?? 0) + screen.height / 2
  ));
}

function _graphicsClass() {
  return PIXI.LegacyGraphics ?? PIXI.Graphics;
}

function _drawPaths(graphics, paths) {
  for (const path of paths) {
    graphics.drawPolygon(path.flatMap(point => [point.x, point.y]));
  }
}

function _drawShiftedPaths(graphics, paths, shiftX, shiftY) {
  for (const path of paths) {
    graphics.drawPolygon(path.flatMap(point => [point.x + shiftX, point.y + shiftY]));
  }
}

function _validTexture(texture) {
  return !!texture && texture !== PIXI.Texture.EMPTY && texture.valid !== false && texture.baseTexture?.valid !== false;
}

function _makeBlurFilter(strength) {
  const filter = new PIXI.BlurFilter(strength, 4);
  filter.padding = Math.ceil(strength * 3);
  return filter;
}

export class RegionElevationRenderer {
  static _instance = null;

  static get instance() {
    if (!this._instance) this._instance = new RegionElevationRenderer();
    return this._instance;
  }

  constructor() {
    this.container = null;
    this.overheadContainer = null;
    this._overheadContainers = new Map();
    this.mask = null;
    this._scene = null;
    this._entries = [];
    this._cameraFocus = null;
    this._previousCameraFocus = null;
    this._panRaf = null;
    this._parallaxState = new Map();
    this._visualParams = new Map();
    this._generatedTextureCache = new Map();
    this._cliffWarpPathCache = new WeakMap();
    this._needsParallaxFrame = false;
    this._pointerEventTarget = null;
    this._pointerMoveHandler = null;
    this._pointerFocus = null;
  }

  attach(scene) {
    this.detach();
    if (!scene || !canvas?.primary) return;

    const geo = sceneGeometry(scene);
    const container = new PIXI.Container();
    const MaskGraphics = _graphicsClass();
    const mask = new MaskGraphics();
    mask.beginFill(0xffffff, 1);
    mask.drawRect(geo.x, geo.y, geo.width, geo.height);
    mask.endFill();
    mask.renderable = false;

    canvas.primary.sortableChildren = true;
    container.eventMode = "none";
    container.zIndex = REGION_CONTAINER_Z_INDEX;
    container.mask = mask;
    canvas.primary.addChild(mask);
    canvas.primary.addChild(container);

    this._pointerMoveHandler = event => this._onPointerMove(event);
    this._pointerEventTarget = canvas.app?.view ?? canvas.app?.renderer?.view ?? canvas.app?.canvas ?? null;
    this._pointerEventTarget?.addEventListener?.("pointermove", this._pointerMoveHandler, { passive: true });

    this._scene = scene;
    this.container = container;
    this.overheadContainer = null;
    this.mask = mask;
    this._cameraFocus = null;
    this.update();
  }

  detach() {
    if (this._panRaf) cancelAnimationFrame(this._panRaf);
    this._panRaf = null;
    try { this._pointerEventTarget?.removeEventListener?.("pointermove", this._pointerMoveHandler); } catch (err) {}
    try { this.resetTileParallax(); } catch (err) {}
    try { this.container?.parent?.removeChild(this.container); } catch (err) {}
    try { this.overheadContainer?.parent?.removeChild(this.overheadContainer); } catch (err) {}
    try { this.mask?.parent?.removeChild(this.mask); } catch (err) {}
    this.container?.destroy({ children: true });
    this.overheadContainer?.destroy({ children: true });
    this._clearOverheadContainers({ destroy: true });
    this.mask?.destroy();
    this._clearGeneratedTextureCache();
    this.container = null;
    this.overheadContainer = null;
    this.mask = null;
    this._scene = null;
    this._entries = [];
    this._cameraFocus = null;
    this._previousCameraFocus = null;
    this._parallaxState.clear();
    this._visualParams.clear();
    this._cliffWarpPathCache = new WeakMap();
    this._overheadContainers.clear();
    this._needsParallaxFrame = false;
    this._pointerEventTarget = null;
    this._pointerMoveHandler = null;
    this._pointerFocus = null;
  }

  update() {
    if (!this.container || !this._scene) return;
    this._parallaxState.clear();
    this._clearRegionChildren();
    this._clearGeneratedTextureCache();
    this._cliffWarpPathCache = new WeakMap();
    this._entries = this._visualEntries(this._scene);
    this._pruneParallaxState();
    this.container.visible = this._entries.length > 0;
    this._updateCameraFocus(true);
    this._drawRegions({ clear: false });
  }

  hasOverheadRegions() {
    return this._entries.some(visual => visual.entry.overhead);
  }

  refreshOverheadVisibility() {
    if (!this.container || !this._scene || !this.hasOverheadRegions()) return;
    this._drawRegions({ emitVisualRefresh: false });
  }

  refreshVisuals({ emitVisualRefresh = false } = {}) {
    if (!this.container || !this._scene || !this._entries.length) return;
    this._drawRegions({ emitVisualRefresh });
  }

  onPan() {
    if (!this.container?.visible) return;
    if (!this._hasActiveParallax() && !_perspectiveFollowsCamera()) return;
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      if (this._updateCameraFocus(false)) this._drawRegions();
    });
  }

  resetPanOrigin() {
    this._parallaxState.clear();
    this._updateCameraFocus(true);
    this._drawRegions();
  }

  tokenParallaxOffset(tokenDocument, position = {}) {
    if (!this.container || !this._scene || tokenDocument?.parent !== this._scene) return { x: 0, y: 0 };
    const gridSize = canvas.grid.size ?? 100;
    const x = Number(position.x ?? tokenDocument.x ?? 0);
    const y = Number(position.y ?? tokenDocument.y ?? 0);
    const width = Number(position.width ?? tokenDocument.width ?? 1);
    const height = Number(position.height ?? tokenDocument.height ?? 1);
    const point = {
      x: x + (width * gridSize) / 2,
      y: y + (height * gridSize) / 2,
      elevation: Number(tokenDocument.elevation ?? 0)
    };
    const state = getRegionElevationStateAtPoint(point, this._scene, this._entries.map(visual => visual.entry), { requireTokenScaling: true, allowOverheadSupport: true });
    if (!state.found) return { x: 0, y: 0 };
    const visual = this._entries.find(candidate => candidate.entry === state.entry);
    if (!visual) return { x: 0, y: 0 };
    const params = this._visualParams.get(this._parallaxStateKey(visual));
    if (!params) return { x: 0, y: 0 };
    if (params.slope) return this._slopeOverlayOffsetAtPoint(point, params);
    return params.overlayOffset ? { x: params.overlayOffset.x, y: params.overlayOffset.y } : { x: 0, y: 0 };
  }

  /**
   * Compute the parallax offset for a Tile based on its elevation and footprint.
   * Tiles inherit the overlay offset of the elevation region under their center
   * (matching their own elevation), so a tile placed on a higher-elevation
   * region drifts with that region's parallax.
   */
  tileParallaxOffset(tileDocument) {
    if (!this.container || !this._scene || tileDocument?.parent !== this._scene) return { x: 0, y: 0 };
    const elevation = Number(tileDocument.elevation ?? 0);
    if (!Number.isFinite(elevation) || Math.abs(elevation) < MIN_ELEVATION_DELTA) return { x: 0, y: 0 };
    const x = Number(tileDocument.x ?? 0);
    const y = Number(tileDocument.y ?? 0);
    const width = Number(tileDocument.width ?? 0);
    const height = Number(tileDocument.height ?? 0);
    const point = { x: x + width / 2, y: y + height / 2, elevation };
    const state = getRegionElevationStateAtPoint(point, this._scene, this._entries.map(visual => visual.entry), { allowOverheadSupport: true });
    if (!state.found) return { x: 0, y: 0 };
    const visual = this._entries.find(candidate => candidate.entry === state.entry);
    if (!visual) return { x: 0, y: 0 };
    const params = this._visualParams.get(this._parallaxStateKey(visual));
    if (!params) return { x: 0, y: 0 };
    if (params.slope) return this._slopeOverlayOffsetAtPoint(point, params);
    return params.overlayOffset ? { x: params.overlayOffset.x, y: params.overlayOffset.y } : { x: 0, y: 0 };
  }

  /** Apply the parallax offset to all tile meshes in the scene. */
  applyTileParallax() {
    const placeables = canvas?.tiles?.placeables;
    if (!placeables?.length) return;
    for (const tile of placeables) this.applyTileParallaxForTile(tile);
  }

  /** Apply (or update) the parallax offset for a single Tile. */
  applyTileParallaxForTile(tile) {
    const mesh = tile?.mesh;
    if (!mesh || !tile.document) return;
    const offset = this.tileParallaxOffset(tile.document);
    const prev = mesh._sceneElevationParallaxOffset ?? { x: 0, y: 0 };
    const dx = offset.x - prev.x;
    const dy = offset.y - prev.y;
    if (dx || dy) {
      mesh.position.x += dx;
      mesh.position.y += dy;
    }
    mesh._sceneElevationParallaxOffset = offset;
  }

  /** Remove any tile parallax offset we previously applied. */
  resetTileParallax() {
    const placeables = canvas?.tiles?.placeables;
    if (!placeables?.length) return;
    for (const tile of placeables) {
      const mesh = tile?.mesh;
      const prev = mesh?._sceneElevationParallaxOffset;
      if (!mesh || !prev) continue;
      mesh.position.x -= prev.x;
      mesh.position.y -= prev.y;
      mesh._sceneElevationParallaxOffset = null;
    }
  }

  _updateCameraFocus(force) {
    if (!this.container) return false;
    const parent = this.container.parent ?? canvas.stage;
    const focus = _cameraFocus(parent);
    const next = { x: focus.x, y: focus.y };
    const changed = force
      || !this._cameraFocus
      || Math.abs(next.x - this._cameraFocus.x) > 0.5
      || Math.abs(next.y - this._cameraFocus.y) > 0.5;
    if (changed) {
      this._previousCameraFocus = force ? next : (this._cameraFocus ?? next);
      this._cameraFocus = next;
    } else {
      this._previousCameraFocus = this._cameraFocus ?? next;
    }
    return changed;
  }

  _onPointerMove(event) {
    if (!this.container?.visible || !this._usesPointerParallax()) return;
    const focus = this._pointerFocusFromEvent(event);
    if (!focus) return;
    const changed = !this._pointerFocus
      || Math.abs(focus.x - this._pointerFocus.x) > 0.5
      || Math.abs(focus.y - this._pointerFocus.y) > 0.5;
    this._pointerFocus = focus;
    if (changed) this._requestParallaxFrame();
  }

  _pointerFocusFromEvent(event) {
    if (!this.container || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;
    const renderer = canvas.app?.renderer;
    const parent = this.container.parent ?? canvas.stage;
    const global = new PIXI.Point();
    try {
      renderer?.events?.mapPositionToPoint?.(global, event.clientX, event.clientY);
    } catch (err) {}
    if (!Number.isFinite(global.x) || !Number.isFinite(global.y) || (global.x === 0 && global.y === 0)) {
      const rect = renderer?.view?.getBoundingClientRect?.() ?? canvas.app?.view?.getBoundingClientRect?.();
      if (!rect) return null;
      global.set(event.clientX - rect.left, event.clientY - rect.top);
    }
    const point = parent.toLocal(global);
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
  }

  _pruneParallaxState() {
    const activeKeys = new Set(this._entries.map(visual => this._parallaxStateKey(visual)));
    for (const key of this._parallaxState.keys()) {
      if (!activeKeys.has(key)) this._parallaxState.delete(key);
    }
  }

  _hasActiveParallax() {
    return _parallaxEnabled() || this._entries.some(visual => _parallaxStrengthForKey(visual.entry.parallaxStrengthOverride) > 0);
  }

  _usesPointerParallax() {
    return _parallaxMode() === PARALLAX_MODES.MOUSE
      || this._entries.some(visual => visual.entry.parallaxModeOverride === PARALLAX_MODES.MOUSE);
  }

  _visualEntries(scene) {
    const pathCache = new Map();
    let visuals = getActiveElevationRegions(scene, pathCache)
      .map(entry => {
        const paths = pathCache.get(entry.region) ?? _regionPaths(entry.region);
        const bounds = paths.length ? _cachedPathsBounds(paths) : null;
        return { entry, paths, bounds };
      })
      .filter(visual => visual.paths.length && visual.bounds && (visual.entry.maxAbsElevation ?? Math.abs(visual.entry.elevation)) >= MIN_ELEVATION_DELTA);
    visuals = visuals
      .map(visual => this._withNearestLowerLayer(visual, visuals))
      .sort((left, right) => {
        const elevation = left.visualElevation - right.visualElevation;
        if (Math.abs(elevation) > 0.001) return elevation;
        return (right.entry.area || 0) - (left.entry.area || 0);
      });
    return visuals;
  }

  _withNearestLowerLayer(visual, visuals) {
    let lowerElevation = 0;
    let lowerArea = Infinity;
    let lowerVisual = null;
    const point = visual.bounds.center;
    const visualElevation = _entryElevationAtPoint(visual.entry, point);
    for (const candidate of visuals) {
      if (candidate.entry.region === visual.entry.region) continue;
      const candidateElevation = _entryElevationAtPoint(candidate.entry, point);
      if (candidateElevation >= visualElevation) continue;
      if (!_pathsContain(candidate.paths, point)) continue;
      const area = candidate.entry.area || Infinity;
      if (candidateElevation > lowerElevation || (candidateElevation === lowerElevation && area < lowerArea)) {
        lowerElevation = candidateElevation;
        lowerArea = area;
        lowerVisual = candidate;
      }
    }
    return {
      ...visual,
      supportVisual: lowerVisual,
      visualElevation,
      lowerElevation,
      elevationDelta: visualElevation - lowerElevation
    };
  }

  _drawRegions({ clear = true, emitVisualRefresh = clear } = {}) {
    if (clear) this._clearRegionChildren();
    this._visualParams.clear();
    this._needsParallaxFrame = false;
    if (!this.container || !this._entries.length) return;

    const previousCache = _settingsCache;
    _settingsCache = getSceneElevationSettings(this._scene);
    try {
      const geo = sceneGeometry(this._scene);
      const texture = this._backgroundTexture();
      const parallax = _parallaxStrength();
      const parallaxHeightContrast = _parallaxHeightContrast();
      const parallaxMode = _parallaxMode();
      const blendMode = _blendMode();
      const overlayScaleStrength = _overlayScaleStrength();
      const shadowMode = _shadowMode();
      const depthScale = _depthScale();
      const elevationScale = _elevationScale();
      const shadowLength = _shadowLength();
      const perspectivePointMode = _perspectivePointMode();
      const visualParams = [];
      for (const visual of this._entries) {
        const visualParallax = visual.entry.parallaxStrengthOverride ? _parallaxStrengthForKey(visual.entry.parallaxStrengthOverride) : parallax;
        const visualParallaxMode = visual.entry.parallaxModeOverride || parallaxMode;
        const visualPerspectivePointMode = visual.entry.perspectivePointOverride || perspectivePointMode;
        const visualBlendMode = visual.entry.blendModeOverride || blendMode;
        const visualOverlayScaleStrength = visual.entry.overlayScaleOverride ? _overlayScaleStrengthForKey(visual.entry.overlayScaleOverride) : overlayScaleStrength;
        const visualShadowMode = visual.entry.shadowModeOverride || shadowMode;
        const visualShadowLength = visual.entry.shadowLengthOverride ? shadowLengthValue(visual.entry.shadowLengthOverride) : shadowLength;
        const visualDepthScale = visual.entry.depthScaleOverride || depthScale;
        const visualElevationScale = visual.entry.elevationScaleOverride ?? elevationScale;
        const visualParallaxHeightContrast = visual.entry.parallaxHeightContrastOverride ? parallaxHeightContrastValue(visual.entry.parallaxHeightContrastOverride) : parallaxHeightContrast;
        const visualEdgeStretchPercent = visual.entry.edgeStretchPercentOverride ?? edgeStretchPercentValue(_setting(SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT));
        const perspectivePoint = _perspectivePoint(geo, visual.bounds, visualPerspectivePointMode);
        const params = this._regionVisualParameters(visual, geo, visualParallax, visualParallaxMode, visualBlendMode, visualOverlayScaleStrength, visualShadowMode, perspectivePoint, visualDepthScale, visualElevationScale, visualShadowLength, visualParallaxHeightContrast, visualEdgeStretchPercent);
        const overheadVisibility = this._overheadVisibilityState(visual);
        params.overheadVisibilityAlpha = overheadVisibility.alpha;
        params.overheadAboveTokens = overheadVisibility.aboveTokens;
        this._visualParams.set(this._parallaxStateKey(visual), params);
        visualParams.push({ visual, params });
      }
      for (const { visual, params } of visualParams) {
        if ((params.overheadVisibilityAlpha ?? 1) <= 0.001) continue;
        if (!params.isHole) {
          const shadow = this._createShadow(visual.paths, texture, geo, params);
          if (shadow) {
            if (!shadow._sceneElevationPreTransformed) this._applyRegionTransform(shadow, params, { includeOverlayOffset: false, includeSupportOffset: true });
            this._addRegionDisplayObject(shadow, params);
          }
        }
        const overlay = this._createOverlay(visual.paths, texture, geo, params);
        if (params.isHole && overlay) this._addRegionDisplayObject(overlay, params);
        const slope = this._createSlopeLayer(visual.paths, texture, geo, params);
        // Transition edges/walls are part of the lifted region silhouette:
        // they must occlude lower-elevation tokens/tiles for the height read.
        if (slope) {
          slope._sceneElevationOcclude = true;
          this._addRegionDisplayObject(slope, params);
        }
        if (!params.isHole) {
          const edgeGlue = this._createEdgeGlue(visual.paths, params);
          if (edgeGlue) {
            edgeGlue._sceneElevationOcclude = true;
            this._addRegionDisplayObject(edgeGlue, params);
          }
        }
        // The displaced overlay top is the actual "roof" for plateau rendering;
        // route it through the elevation-sortable parent so any token or tile
        // beneath the region elevation is occluded by the parallax-shifted top.
        if (!params.isHole && overlay) {
          overlay._sceneElevationOcclude = true;
          this._addRegionDisplayObject(overlay, params);
        }
        if (params.isHole) {
          const innerShadow = this._createInnerShadow(visual.paths, params);
          if (innerShadow) this._addRegionDisplayObject(innerShadow, params);
        }
      }
      if (this._needsParallaxFrame) this._requestParallaxFrame();
      this.applyTileParallax();
      // Token-overhead redraws only need to rebuild the region layer, not feed back into token visuals.
      if (emitVisualRefresh) Hooks.callAll(`${MODULE_ID}.visualRefresh`);
    } finally {
      _settingsCache = previousCache;
    }
  }

  _requestParallaxFrame() {
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      this._updateCameraFocus(false);
      this._drawRegions();
    });
  }

  _addRegionDisplayObject(displayObject, params) {
    if (!displayObject) return;
    const alpha = Math.clamp(Number(params.overheadVisibilityAlpha ?? 1), 0, 1);
    if (alpha <= 0.001) return;
    displayObject.alpha *= alpha;
    // Two paths into the elevation-sortable parent:
    //  1. The user explicitly enabled "overhead" on the region (legacy path).
    //  2. The display object is tagged for plateau occlusion AND the region
    //     has positive elevation. This lets the displaced overlay top and
    //     extruded walls naturally occlude tokens/tiles at lower elevations
    //     via PrimaryCanvasGroup's elevation sort, without forcing the user
    //     to toggle overhead (which has additional fade-on-hover behaviors).
    const occludeLowerElevations = displayObject._sceneElevationOcclude === true
      && Number(params?.visualElevation ?? params?.entry?.elevation ?? 0) > 0;
    const useOverheadLayer = params.entry?.overhead === true || occludeLowerElevations;
    if (useOverheadLayer) {
      const sortElevation = this._overheadSortElevation(params);
      displayObject.zIndex = sortElevation;
      displayObject.elevation = sortElevation;
      displayObject.sort = sortElevation;
    }
    const target = useOverheadLayer ? (this._ensureOverheadContainerParent(params) ?? this.container) : this.container;
    target.addChild(displayObject);
    if (useOverheadLayer) {
      target.sortableChildren = true;
      target.sortDirty = true;
      if (canvas?.primary) canvas.primary.sortDirty = true;
    }
  }

  _ensureOverheadContainerParent(params) {
    const parent = this._overheadRenderParent();
    if (!parent) return null;
    const sortElevation = this._overheadSortElevation(params);
    const key = String(Math.round(sortElevation * 1000) / 1000);
    let container = this._overheadContainers.get(key);
    if (!container) {
      container = new PIXI.Container();
      container.eventMode = "none";
      container.mask = this.mask;
      this._overheadContainers.set(key, container);
    }
    if (container.parent !== parent) {
      try { container.parent?.removeChild(container); } catch (err) {}
      parent.addChild(container);
    }
    container.zIndex = sortElevation;
    container.elevation = sortElevation;
    container.sort = sortElevation;
    container.sortableChildren = true;
    parent.sortableChildren = true;
    parent.sortDirty = true;
    return container;
  }

  _overheadSortElevation(params) {
    const elevation = Number(params?.visualElevation ?? params?.entry?.elevation ?? 0);
    return (Number.isFinite(elevation) ? elevation : 0) - OVERHEAD_SORT_EPSILON;
  }

  _overheadRenderParent() {
    const tokenParent = canvas?.tokens?.placeables?.find(token => token?.mesh?.parent)?.mesh?.parent;
    return tokenParent ?? canvas?.primary ?? null;
  }

  _supportOverlayOffsetForVisual(visual, point) {
    const supportVisual = visual?.supportVisual;
    if (!supportVisual) return { x: 0, y: 0 };
    const supportParams = this._visualParams.get(this._parallaxStateKey(supportVisual));
    if (!supportParams?.overlayOffset) return { x: 0, y: 0 };
    const elevation = Number.isFinite(visual.lowerElevation) ? visual.lowerElevation : (supportParams.visualElevation ?? 0);
    return this._supportOverlayOffsetAtPoint(point, { elevation, visual: supportVisual, params: supportParams }, supportParams);
  }

  _overheadVisibilityState(visual) {
    if (!visual?.entry?.overhead) return { alpha: 1, aboveTokens: false };
    const tokens = this._tokensUnderOverhead(visual.entry);
    if (!tokens.length) return { alpha: 1, aboveTokens: false };
    const modeAlpha = _overheadModeAlpha(visual.entry.underOverheadMode);
    let alpha = 1;
    if (game.user?.isGM) {
      alpha = tokens.some(token => _tokenSelected(token)) ? modeAlpha : OVERHEAD_FADE_ALPHA;
    } else if (tokens.some(token => _tokenOwnedByCurrentUser(token))) {
      alpha = modeAlpha;
    }
    return { alpha, aboveTokens: alpha > 0.001 };
  }

  _tokensUnderOverhead(entry) {
    if (!entry?.region || !canvas?.tokens?.placeables?.length) return [];
    return canvas.tokens.placeables.filter(token => _tokenUnderOverhead(token, entry));
  }

  _clearRegionChildren() {
    this._clearContainerChildren(this.container);
    this._clearOverheadContainers();
  }

  _clearContainerChildren(container) {
    if (!container) return;
    while (container.children.length) {
      const child = container.removeChildAt(0);
      child.destroy({ children: true });
    }
  }

  _clearOverheadContainers({ destroy = false } = {}) {
    for (const container of this._overheadContainers.values()) {
      this._clearContainerChildren(container);
      if (destroy) {
        try { container.parent?.removeChild(container); } catch (err) {}
        container.destroy({ children: true });
      }
    }
    if (destroy) this._overheadContainers.clear();
  }

  _backgroundTexture() {
    const texture = canvas.primary?.background?.texture;
    return _validTexture(texture) ? texture : null;
  }

  _regionVisualParameters(visual, geo, parallax, parallaxMode, blendMode, overlayScaleStrength, shadowMode, perspectivePoint, depthScale = DEPTH_SCALES.COMPRESSED, elevationScale = 1, shadowLength = 1, parallaxHeightContrast = 1, edgeStretchPercent = edgeStretchPercentValue(_setting(SCENE_SETTING_KEYS.EDGE_STRETCH_PERCENT))) {
    const gridSize = geo.gridSize;
    const { entry, bounds } = visual;
    const reference = DEPTH_SCALE_REFERENCE[depthScale] ?? DEPTH_SCALE_REFERENCE[DEPTH_SCALES.COMPRESSED];
    // Compensation: the user-facing Elevation Scale slider goes 1-10 (default 5)
    // so 1 grid = 5 ft systems can keep a single-step setting. The visual
    // pipeline is calibrated against the legacy default of 3, so we multiply
    // by 3/5 here; user value 5 reproduces the legacy visual at user value 3,
    // and every step is roughly 1.6x (rather than 1.667x) finer.
    const visualElevationScale = elevationScaleValue(elevationScale) * ELEVATION_SCALE_RENDER_COMPENSATION;
    const visualElevation = visual.visualElevation ?? entry.elevation;
    const supportElevation = Number.isFinite(visual.lowerElevation) ? visual.lowerElevation : 0;
    const localElevationDelta = Number.isFinite(visual.elevationDelta) ? visual.elevationDelta : visualElevation;
    const rawAbsElevation = entry.slope
      ? Math.max(
        Math.abs((entry.lowestElevation ?? visualElevation) - supportElevation),
        Math.abs((entry.highestElevation ?? visualElevation) - supportElevation),
        Math.abs(localElevationDelta)
      )
      : Math.abs(localElevationDelta);
    const absoluteAbsElevation = entry.slope ? (entry.maxAbsElevation ?? Math.abs(visualElevation)) : Math.abs(visualElevation);
    const absElevation = rawAbsElevation * visualElevationScale;
    const magnitude = Math.min(absElevation, reference);
    const normalized = Math.clamp(_depthNormalize(magnitude, reference, depthScale), 0.1, 1);
    const absDelta = Math.abs(localElevationDelta) * visualElevationScale;
    const deltaMagnitude = Math.min(absDelta, reference);
    const transitionNormalized = Math.clamp(_depthNormalize(deltaMagnitude, reference, depthScale), 0.1, 1);
    const isHole = entry.slope ? entry.highestElevation < 0 : visualElevation < 0;
    const orthographicMode = _isOrthographicParallaxMode(parallaxMode);
    const baseParallaxDirection = parallax > 0
      ? (this._orthographicDirectionForMode(parallaxMode, geo) ?? this._perspectiveDirection(bounds, perspectivePoint))
      : STATIC_SHADOW_DIRECTION;
    const sunShadow = _sunShadowState(shadowMode, geo, bounds);
    const shadowDirection = sunShadow?.direction ?? this._shadowDirection(bounds, parallax, shadowMode, perspectivePoint, parallaxMode, geo);
    const blendProfile = this._blendProfile(blendMode);
    const shadowDisabled = shadowMode === SHADOW_MODES.OFF;
    const textureMeldShadow = shadowMode === SHADOW_MODES.TEXTURE_MELD;
    const fullTextureMeldShadow = shadowMode === SHADOW_MODES.FULL_TEXTURE_MELD;
    const textureShadow = textureMeldShadow || fullTextureMeldShadow;
    const strongTopDownShadow = shadowMode === SHADOW_MODES.TOP_DOWN_STRONG;
    const responsiveAllAroundShadow = shadowMode === SHADOW_MODES.RESPONSIVE_ALL_AROUND;
    const shadowAlphaMultiplier = sunShadow?.alphaMultiplier ?? 1;
    const shadowLengthMultiplier = (sunShadow?.lengthMultiplier ?? 1) * _shadowLengthMultiplier(shadowLength);
    const shadowBlurMultiplier = sunShadow?.blurMultiplier ?? 1;
    const sign = isHole ? -1 : 1;
    const overlayScaleDepth = _overlayScaleDepthFactor(absElevation, reference, depthScale);
    const overlayScaleDelta = overlayScaleDepth * (overlayScaleStrength + (blendProfile.overlayScaleBonus ?? 0)) * sign;
    let overlayScale = 1 + overlayScaleDelta;
    const perspectiveDistance = orthographicMode ? 0 : Math.hypot(perspectivePoint.x - bounds.center.x, perspectivePoint.y - bounds.center.y);
    const distanceBoost = _parallaxDistanceBoost(perspectiveDistance, geo);
    const liftFactor = _depthLiftFactor(absElevation, depthScale);
    const liftMultiplier = blendProfile.liftMultiplier ?? 1;
    const liftCeiling = depthScale === DEPTH_SCALES.COMPRESSED
      ? _parallaxLiftMaxPixels(gridSize)
      : Math.max(_parallaxLiftMaxPixels(gridSize), gridSize * (depthScale === DEPTH_SCALES.DRAMATIC ? 6 : 4));
    const liftCeilingLimit = liftCeiling * Math.max(1, liftMultiplier);
    const liftBase = gridSize * (OVERLAY_LIFT_BASE + parallax * OVERLAY_LIFT_PARALLAX) * distanceBoost * liftMultiplier;
    const lift = Math.clamp(
      liftFactor * liftBase,
      0,
      liftCeilingLimit
    );
    const shadowLift = (liftMultiplier > 0 ? lift / liftMultiplier : lift) / 5;
    const parallaxLift = parallaxMode === PARALLAX_MODES.MOUSE && depthScale === DEPTH_SCALES.LINEAR
      ? lift
      : _parallaxMotionLift(lift, normalized, parallaxHeightContrast);
    const heightAdjustedParallax = lift > 0 ? parallax * (parallaxLift / lift) : parallax;
    const baseParallaxVector = parallax > 0 ? { x: baseParallaxDirection.x * parallaxLift * sign, y: baseParallaxDirection.y * parallaxLift * sign } : { x: 0, y: 0 };
    const rawParallaxVector = parallax > 0 ? this._parallaxVectorForMode(visual, baseParallaxVector, parallaxMode, parallaxLift, sign, heightAdjustedParallax, perspectivePoint) : { x: 0, y: 0 };
    const parallaxModeStrength = parallaxMode === PARALLAX_MODES.MOUSE ? MOUSE_PARALLAX_INTERNAL_STRENGTH : 1;
    const parallaxVector = {
      x: rawParallaxVector.x * PARALLAX_INTERNAL_STRENGTH * parallaxModeStrength,
      y: rawParallaxVector.y * PARALLAX_INTERNAL_STRENGTH * parallaxModeStrength
    };
    const modeEffects = this._parallaxVisualEffectsForMode(visual, geo, parallaxMode, parallaxVector, parallaxLift, sign, heightAdjustedParallax, normalized, perspectivePoint);
    overlayScale *= modeEffects.overlayScaleMultiplier ?? 1;
    const overlayScaleX = overlayScale * (modeEffects.overlayScaleXMultiplier ?? 1);
    const overlayScaleY = overlayScale * (modeEffects.overlayScaleYMultiplier ?? 1);
    const blendDirection = parallax > 0 ? (_vectorDirection(parallaxVector) ?? baseParallaxDirection) : STATIC_SHADOW_DIRECTION;
    const localOverlayOffset = this._overlayOffsetForMode(parallaxVector, parallaxMode);
    const supportOverlayOffset = this._supportOverlayOffsetForVisual(visual, bounds.center);
    const overlayOffset = {
      x: supportOverlayOffset.x + localOverlayOffset.x,
      y: supportOverlayOffset.y + localOverlayOffset.y
    };
    const textureShift = modeEffects.textureShift ?? { x: 0, y: 0 };
    const transitionShift = this._transitionShiftForMode(parallaxVector, parallaxMode, blendProfile);
    const longShadowBlend = Math.clamp((shadowLengthMultiplier - SHADOW_BRIDGE_THRESHOLD) / 2.6, 0, 1);
    const softShadowOffset = {
      x: shadowDirection.x * shadowLift * SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign,
      y: shadowDirection.y * shadowLift * SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign
    };
    const contactShadowOffset = {
      x: shadowDirection.x * shadowLift * CONTACT_SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign,
      y: shadowDirection.y * shadowLift * CONTACT_SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign
    };
    const shadowStrength = Math.clamp(entry.shadowStrength ?? SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX);
    const blackShadowRatio = fullTextureMeldShadow ? 0 : textureMeldShadow ? TEXTURE_MELD_BLACK_ALPHA_RATIO : 1;
    const softShadowAlphaBase = shadowDisabled ? 0 : (SOFT_SHADOW_ALPHA_BASE + normalized * SOFT_SHADOW_ALPHA_ELEVATION) * shadowStrength * shadowAlphaMultiplier * blackShadowRatio * (strongTopDownShadow ? STRONG_TOP_DOWN_SHADOW_MULTIPLIER : 1);
    const contactShadowAlphaBase = shadowDisabled ? 0 : (CONTACT_SHADOW_ALPHA_BASE + normalized * CONTACT_SHADOW_ALPHA_ELEVATION) * shadowStrength * shadowAlphaMultiplier * blackShadowRatio * (strongTopDownShadow ? STRONG_TOP_DOWN_SHADOW_MULTIPLIER : 1);
    const textureSoftShadowAlphaBase = textureShadow && !shadowDisabled ? Math.clamp((fullTextureMeldShadow ? FULL_TEXTURE_MELD_SOFT_ALPHA : TEXTURE_MELD_SOFT_ALPHA) * shadowStrength * shadowAlphaMultiplier * (0.72 + normalized * 0.28), 0, fullTextureMeldShadow ? 0.98 : 0.92) : 0;
    const textureContactShadowAlphaBase = textureShadow && !shadowDisabled ? Math.clamp((fullTextureMeldShadow ? FULL_TEXTURE_MELD_CONTACT_ALPHA : TEXTURE_MELD_CONTACT_ALPHA) * shadowStrength * shadowAlphaMultiplier * (0.72 + normalized * 0.28), 0, fullTextureMeldShadow ? 0.92 : 0.82) : 0;
    const blendWidth = this._blendWidth(gridSize, transitionNormalized, parallax, blendProfile);
    const cliffWarpActive = !isHole && absElevation > 0 && !!blendProfile.cliffWarp;
    const extrudedWallsActive = !isHole && absElevation > 0 && !!blendProfile.extrudedWalls;
    const edgeStretchActive = !isHole && absElevation > 0 && !!blendProfile.edgeStretch;
    const edgeGlueAlpha = !cliffWarpActive && !extrudedWallsActive && !edgeStretchActive && !shadowDisabled && blendWidth > 0
      ? Math.clamp(blendProfile.glueAlpha * shadowStrength * (0.65 + transitionNormalized * 0.35), 0, EDGE_GLUE_ALPHA_MAX)
      : 0;
    let slopeWidth = blendWidth > 0 ? Math.clamp(blendWidth * blendProfile.slopeWidthMultiplier, 0, blendProfile.maxWidth * 1.9) : 0;
    let slopeDropMaxPixels = Number(blendProfile.dropMaxPixels ?? SLOPE_DROP_MAX_PIXELS);
    let slopeDropPixels = Math.clamp(blendProfile.slopeDropPixels * (0.75 + transitionNormalized * 0.25), SLOPE_DROP_MIN_PIXELS, slopeDropMaxPixels);
    let slopeStretchPixels = slopeWidth > 0 ? Math.clamp(slopeDropPixels + blendWidth * 0.35, SLOPE_DROP_MIN_PIXELS, slopeDropMaxPixels) : 0;
    const slopeStretchScaleMin = blendProfile.stretchScaleMin ?? 1;
    const slopeStretchScaleMax = blendProfile.stretchScaleMax ?? 1;
    let slopeStretchScale = slopeWidth > 0
      ? Math.clamp(
        1 + (slopeStretchPixels * 2) / Math.max(bounds.width, bounds.height, gridSize),
        slopeStretchScaleMin,
        slopeStretchScaleMax
      )
      : 1;
    let slopeAlphaBase = blendProfile.slopeAlpha;
    let slopeStretchAlphaBase = blendProfile.stretchAlpha ?? 0;
    let slopeStretchStepsBase = Number(blendProfile.stretchSteps ?? 0);
    let bridgeBaseAlphaBase = blendProfile.bridgeBaseAlpha ?? 0;
    let slopeTextureShiftRatio = blendProfile.slopeTextureShiftRatio;
    let cliffWarpAlpha = 0;
    let cliffWarpSourceWidth = 0;
    let edgeStretchAlpha = 0;
    let edgeStretchSourceWidth = 0;
    if (cliffWarpActive) {
      const cliffWarpWidthRatio = (blendProfile.cliffWarpWidthBase ?? 0.18) + transitionNormalized * (blendProfile.cliffWarpWidthElevationRatio ?? 0.18);
      slopeWidth = Math.max(slopeWidth, Math.min(blendProfile.maxWidth, gridSize * cliffWarpWidthRatio));
      slopeAlphaBase = Math.max(slopeAlphaBase, blendProfile.cliffWarpAlpha ?? CLIFF_WARP_SOLID_ALPHA);
      slopeStretchAlphaBase = 0;
      slopeStretchStepsBase = 0;
      bridgeBaseAlphaBase = 0;
      cliffWarpSourceWidth = Math.max(1, Number(blendProfile.cliffWarpSourceWidth ?? CLIFF_WARP_SOURCE_RIM_PIXELS));
      cliffWarpAlpha = Math.clamp(blendProfile.cliffWarpAlpha ?? CLIFF_WARP_SOLID_ALPHA, 0, blendProfile.cliffWarpAlphaMax ?? CLIFF_WARP_SOLID_ALPHA);
    }
    if (extrudedWallsActive) {
      // Same wall geometry knobs as cliff warp so we can re-use the
      // _cliffWarpRenderPaths / _cliffWarpTopPoint helpers; only the
      // backface culling step differs in the dedicated layer renderer.
      const wallWidthRatio = (blendProfile.cliffWarpWidthBase ?? 0.22) + transitionNormalized * (blendProfile.cliffWarpWidthElevationRatio ?? 0.24);
      slopeWidth = Math.max(slopeWidth, Math.min(blendProfile.maxWidth, gridSize * wallWidthRatio));
      slopeAlphaBase = Math.max(slopeAlphaBase, blendProfile.cliffWarpAlpha ?? CLIFF_WARP_SOLID_ALPHA);
      slopeStretchAlphaBase = 0;
      slopeStretchStepsBase = 0;
      bridgeBaseAlphaBase = 0;
      cliffWarpSourceWidth = Math.max(1, Number(blendProfile.cliffWarpSourceWidth ?? CLIFF_WARP_SOURCE_RIM_PIXELS));
      cliffWarpAlpha = Math.clamp(blendProfile.cliffWarpAlpha ?? CLIFF_WARP_SOLID_ALPHA, 0, blendProfile.cliffWarpAlphaMax ?? CLIFF_WARP_SOLID_ALPHA);
    }
    if (edgeStretchActive) {
      const edgeStretchWidthRatio = (blendProfile.edgeStretchWidthBase ?? 0.16) + transitionNormalized * (blendProfile.edgeStretchWidthElevationRatio ?? 0.16);
      slopeWidth = Math.max(slopeWidth, Math.min(blendProfile.maxWidth, gridSize * edgeStretchWidthRatio));
      slopeAlphaBase = Math.max(slopeAlphaBase, blendProfile.edgeStretchAlpha ?? EDGE_STRETCH_SOLID_ALPHA);
      slopeStretchAlphaBase = 0;
      slopeStretchStepsBase = 0;
      bridgeBaseAlphaBase = 0;
      const stretchPercent = edgeStretchPercentValue(edgeStretchPercent) / 100;
      edgeStretchSourceWidth = Math.max(1, Math.min(bounds.width, bounds.height) * stretchPercent);
      edgeStretchAlpha = Math.clamp(blendProfile.edgeStretchAlpha ?? EDGE_STRETCH_SOLID_ALPHA, 0, blendProfile.edgeStretchAlphaMax ?? EDGE_STRETCH_SOLID_ALPHA);
    }
    const slopeTextureShift = slopeWidth > 0
      ? {
        x: transitionShift.x * slopeTextureShiftRatio + blendDirection.x * slopeDropPixels * sign,
        y: transitionShift.y * slopeTextureShiftRatio + blendDirection.y * slopeDropPixels * sign
      }
      : { x: 0, y: 0 };
    const useProjectionPerspective = bridgeBaseAlphaBase > 0 || cliffWarpActive || extrudedWallsActive;
    const innerShadowWidth = Math.clamp(
      gridSize * (INNER_SHADOW_WIDTH_GRID_RATIO + normalized * INNER_SHADOW_WIDTH_ELEVATION_RATIO),
      6,
      gridSize * 0.34
    );
    const innerShadowBlur = Math.clamp(
      gridSize * (INNER_SHADOW_BLUR_GRID_RATIO + normalized * INNER_SHADOW_BLUR_ELEVATION_RATIO),
      3,
      gridSize * 0.22
    );
    const softShadowBlur = Math.clamp(
      gridSize * (SOFT_SHADOW_BLUR_GRID_RATIO + normalized * SOFT_SHADOW_BLUR_ELEVATION_RATIO) * (0.8 + shadowStrength * 0.16) * shadowBlurMultiplier * (strongTopDownShadow ? STRONG_TOP_DOWN_BLUR_MULTIPLIER : 1),
      SOFT_SHADOW_BLUR_MIN,
      gridSize * (strongTopDownShadow ? 0.9 : 0.48)
    );
    const contactShadowBlur = Math.clamp(
      gridSize * (CONTACT_SHADOW_BLUR_GRID_RATIO + normalized * CONTACT_SHADOW_BLUR_ELEVATION_RATIO) * (0.85 + shadowStrength * 0.12) * shadowBlurMultiplier * (strongTopDownShadow ? STRONG_TOP_DOWN_BLUR_MULTIPLIER : 1),
      CONTACT_SHADOW_BLUR_MIN,
      gridSize * (strongTopDownShadow ? 0.36 : 0.16)
    );
    const bridgeShadowOffset = {
      x: contactShadowOffset.x + (softShadowOffset.x - contactShadowOffset.x) * SHADOW_BRIDGE_OFFSET_RATIO,
      y: contactShadowOffset.y + (softShadowOffset.y - contactShadowOffset.y) * SHADOW_BRIDGE_OFFSET_RATIO
    };
    const shadowSeparation = Math.hypot(softShadowOffset.x - contactShadowOffset.x, softShadowOffset.y - contactShadowOffset.y);
    const shadowBridgeBlend = shadowSeparation > 2 ? longShadowBlend : 0;
    const bridgeShadowBlur = Math.clamp(
      Math.max(contactShadowBlur + (softShadowBlur - contactShadowBlur) * 0.62, shadowSeparation * 0.18),
      CONTACT_SHADOW_BLUR_MIN,
      gridSize * (strongTopDownShadow ? 0.7 : 0.42)
    );
    const bridgeShadowAlpha = shadowBridgeBlend > 0
      ? Math.clamp(Math.max(softShadowAlphaBase, contactShadowAlphaBase) * SHADOW_BRIDGE_MAX_ALPHA_RATIO * shadowBridgeBlend, 0, SHADOW_ALPHA_MAX * 0.52)
      : 0;
    const textureBridgeShadowAlpha = shadowBridgeBlend > 0
      ? Math.clamp(Math.max(textureSoftShadowAlphaBase, textureContactShadowAlphaBase) * TEXTURE_SHADOW_BRIDGE_ALPHA_RATIO * shadowBridgeBlend, 0, fullTextureMeldShadow ? 0.9 : 0.78)
      : 0;
    const allAroundShadowAlpha = responsiveAllAroundShadow
      ? Math.clamp(Math.max(softShadowAlphaBase, contactShadowAlphaBase) * RESPONSIVE_ALL_AROUND_ALPHA_RATIO, 0, SHADOW_ALPHA_MAX * 0.5)
      : 0;
    const allAroundShadowBlur = Math.clamp(
      Math.max(contactShadowBlur, softShadowBlur * RESPONSIVE_ALL_AROUND_BLUR_RATIO),
      CONTACT_SHADOW_BLUR_MIN,
      gridSize * 0.4
    );
    return {
      entry,
      gridSize,
      visualElevation,
      isHole,
      slope: entry.slope && Math.abs(entry.slopeHeight) >= MIN_ELEVATION_DELTA,
      slopeBaseElevation: entry.slopeBaseElevation,
      slopeFarElevation: entry.slopeFarElevation,
      slopeHeight: entry.slopeHeight,
      slopeVector: entry.slopeVector,
      slopeMinProjection: entry.slopeMinProjection,
      slopeMaxProjection: entry.slopeMaxProjection,
      slopeMaxAbsElevation: Math.max(absoluteAbsElevation, MIN_ELEVATION_DELTA),
      supportVisual: visual.supportVisual ?? null,
      supportElevation,
      localElevationDelta,
      center: bounds.center,
      transformCenter: modeEffects.transformCenter ?? bounds.center,
      projectionCenter: useProjectionPerspective && !orthographicMode ? perspectivePoint : bounds.center,
      overlayScale,
      overlayScaleX,
      overlayScaleY,
      overlayRotation: modeEffects.overlayRotation ?? 0,
      overlaySkewX: modeEffects.overlaySkewX ?? 0,
      overlaySkewY: modeEffects.overlaySkewY ?? 0,
      overlayOffset,
      localOverlayOffset,
      supportOverlayOffset,
      textureShift,
      transitionShift,
      blendWidth,
      slopeWidth,
      slopeTextureShift,
      slopeAlpha: slopeWidth > 0 ? Math.clamp(slopeAlphaBase * shadowStrength * (0.62 + transitionNormalized * 0.38), 0, blendProfile.slopeAlphaMax ?? SLOPE_TEXTURE_ALPHA_MAX) : 0,
      slopeStretchScale,
      slopeStretchSteps: slopeWidth > 0 ? Math.max(0, slopeStretchStepsBase) : 0,
      slopeStretchAlpha: slopeWidth > 0 ? Math.clamp(slopeStretchAlphaBase * (0.72 + transitionNormalized * 0.28), 0, 1) : 0,
      bridgeBaseAlpha: slopeWidth > 0 ? Math.clamp(bridgeBaseAlphaBase * (0.68 + transitionNormalized * 0.32), 0, 1) : 0,
      cliffWarp: cliffWarpActive,
      extrudedWalls: extrudedWallsActive,
      edgeStretch: edgeStretchActive,
      edgeOnlyShadow: blendMode === BLEND_MODES.WIDE || cliffWarpActive || extrudedWallsActive || edgeStretchActive,
      cliffWarpAlpha,
      cliffWarpSourceWidth,
      edgeStretchAlpha,
      edgeStretchSourceWidth,
      textureMeldShadow: textureShadow,
      textureSoftShadowAlpha: textureSoftShadowAlphaBase,
      textureBridgeShadowAlpha,
      textureContactShadowAlpha: textureContactShadowAlphaBase,
      overlayAlpha: Math.clamp((blendWidth > 0 ? blendProfile.overlayAlpha : 1) * (modeEffects.overlayAlphaMultiplier ?? 1), 0, 1),
      edgeGlueAlpha,
      edgeGlueBlur: Math.clamp(blendWidth * blendProfile.glueBlurMultiplier, 0, blendWidth * 1.7),
      softShadowOffset,
      allAroundShadowAlpha,
      allAroundShadowBlur,
      bridgeShadowOffset,
      contactShadowOffset,
      innerShadowOffset: {
        x: shadowDirection.x * shadowLift * INNER_SHADOW_OFFSET_MULTIPLIER,
        y: shadowDirection.y * shadowLift * INNER_SHADOW_OFFSET_MULTIPLIER
      },
      innerShadowWidth,
      innerContactWidth: Math.max(4, innerShadowWidth * 0.62),
      innerShadowAlpha: shadowDisabled ? 0 : Math.clamp((INNER_SHADOW_ALPHA_BASE + normalized * INNER_SHADOW_ALPHA_ELEVATION) * shadowStrength, 0, INNER_SHADOW_ALPHA_MAX),
      innerContactAlpha: shadowDisabled ? 0 : Math.clamp((INNER_CONTACT_ALPHA_BASE + normalized * INNER_CONTACT_ALPHA_ELEVATION) * shadowStrength, 0, INNER_SHADOW_ALPHA_MAX),
      innerShadowBlur,
      innerContactBlur: Math.max(2, innerShadowBlur * 0.48),
      softShadowAlpha: Math.clamp(softShadowAlphaBase, 0, strongTopDownShadow ? 1 : SHADOW_ALPHA_MAX),
      bridgeShadowAlpha,
      contactShadowAlpha: Math.clamp(contactShadowAlphaBase, 0, strongTopDownShadow ? 1 : SHADOW_ALPHA_MAX),
      softShadowBlur,
      bridgeShadowBlur,
      contactShadowBlur
    };
  }

  _overlayOffsetForMode(parallaxVector, parallaxMode) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ANCHORED_CARD:
      case PARALLAX_MODES.VELOCITY_CARD:
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
      case PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN:
      case PARALLAX_MODES.ORTHOGRAPHIC_ANGLE:
      case PARALLAX_MODES.LAYERED:
      case PARALLAX_MODES.HORIZONTAL_SCROLL:
      case PARALLAX_MODES.VERTICAL_SCROLL:
      case PARALLAX_MODES.MOUSE:
      case PARALLAX_MODES.TOP_DOWN_HEIGHT:
        return parallaxVector;
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _transitionShiftForMode(parallaxVector, parallaxMode, blendProfile) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ANCHORED_CARD:
      case PARALLAX_MODES.VELOCITY_CARD:
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
      case PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN:
      case PARALLAX_MODES.ORTHOGRAPHIC_ANGLE:
      case PARALLAX_MODES.LAYERED:
      case PARALLAX_MODES.HORIZONTAL_SCROLL:
      case PARALLAX_MODES.VERTICAL_SCROLL:
      case PARALLAX_MODES.MOUSE:
      case PARALLAX_MODES.TOP_DOWN_HEIGHT:
        return { x: parallaxVector.x * CARD_TRANSITION_SHIFT_RATIO, y: parallaxVector.y * CARD_TRANSITION_SHIFT_RATIO };
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _parallaxVectorForMode(visual, baseVector, parallaxMode, lift, sign, parallax, perspectivePoint = null) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ANCHORED_CARD:
        return this._combineParallaxVectors(baseVector, this._anchoredParallaxVector(visual, lift, sign, parallax), lift);
      case PARALLAX_MODES.VELOCITY_CARD:
        return this._combineParallaxVectors(baseVector, this._velocityParallaxVector(visual, lift, sign, parallax), lift);
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
        return this._combineParallaxVectors(baseVector, this._anchoredVelocityParallaxVector(visual, lift, sign, parallax), lift);
      case PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN:
        return this._orthographicParallaxVector(visual, baseVector, lift, sign, parallax, PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN);
      case PARALLAX_MODES.ORTHOGRAPHIC_ANGLE:
        return this._orthographicParallaxVector(visual, baseVector, lift, sign, parallax, PARALLAX_MODES.ORTHOGRAPHIC_ANGLE);
      case PARALLAX_MODES.LAYERED:
        return this._combineParallaxVectors(baseVector, this._layeredParallaxVector(visual, lift, sign, parallax), lift);
      case PARALLAX_MODES.HORIZONTAL_SCROLL:
        return this._combineParallaxVectors({ x: baseVector.x, y: 0 }, this._axisScrollParallaxVector(visual, lift, sign, parallax, "x"), lift);
      case PARALLAX_MODES.VERTICAL_SCROLL:
        return this._combineParallaxVectors({ x: 0, y: baseVector.y }, this._axisScrollParallaxVector(visual, lift, sign, parallax, "y"), lift);
      case PARALLAX_MODES.MOUSE:
        return this._mouseParallaxVector(visual, lift, sign, parallax);
      case PARALLAX_MODES.TOP_DOWN_HEIGHT:
        return this._topDownHeightParallaxVector(visual, baseVector, lift, sign, parallax, perspectivePoint);
      default:
        return baseVector;
    }
  }

  _topDownHeightParallaxVector(visual, baseVector, lift, sign, parallax, perspectivePoint = null) {
    // Persistent top-down orthographic parallax. Each axis is solved
    // independently from camera position: horizontal camera movement can only
    // change X displacement, and vertical camera movement can only change Y.
    // There is no radial normalization/clamp here; those rotate diagonal
    // vectors and make one axis "borrow" movement from the other.
    //
    // The pivot is the configured Perspective Point. It is the place that
    // stays visually anchored when the camera is centered on it: zero
    // displacement there, and the plateau slides away as the camera moves
    // off it. Using the same scene-wide pivot for every same-elevation
    // region keeps multiple plateaus moving in lockstep (a 10ft roof on
    // building A and a 10ft roof on building B shift by the exact same
    // vector at the exact same time). Region-relative perspective points
    // (REGION_CENTER, REGION_*_CORNER, NEAREST/FURTHEST_EDGE) will instead
    // give each region its own pivot and therefore its own pace - that is
    // the correct behaviour for those modes.
    const focus = this._cameraFocus;
    if (!focus || lift <= 0) return { x: 0, y: 0 };
    const gridSize = _finiteNumber(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? canvas?.dimensions?.size, 100);
    const strengthScale = Math.clamp(parallax / TOP_DOWN_HEIGHT_REFERENCE_PARALLAX, 0, TOP_DOWN_HEIGHT_MAX_STRENGTH_SCALE);
    const movementLift = lift * strengthScale;
    if (movementLift <= 0) return { x: 0, y: 0 };
    const geo = sceneGeometry(this._scene);
    const sceneCenterX = (geo?.x ?? 0) + (geo?.width ?? gridSize) * 0.5;
    const sceneCenterY = (geo?.y ?? 0) + (geo?.height ?? gridSize) * 0.5;
    const pivotX = _finiteNumber(perspectivePoint?.x, sceneCenterX);
    const pivotY = _finiteNumber(perspectivePoint?.y, sceneCenterY);
    // Reference span: the half-distance from the pivot to the farthest scene
    // corner, plus the preview band. Sharing this across regions keeps every
    // plateau on the same point of the tanh response curve, so they reach
    // the soft cap at the same camera position.
    const edgePreview = gridSize * TOP_DOWN_HEIGHT_EDGE_PREVIEW_GRID_RATIO;
    const farthestDx = Math.max(Math.abs(pivotX - (geo?.x ?? 0)), Math.abs(pivotX - ((geo?.x ?? 0) + (geo?.width ?? gridSize))));
    const farthestDy = Math.max(Math.abs(pivotY - (geo?.y ?? 0)), Math.abs(pivotY - ((geo?.y ?? 0) + (geo?.height ?? gridSize))));
    const referenceX = Math.max(farthestDx + edgePreview, gridSize * 4);
    const referenceY = Math.max(farthestDy + edgePreview, gridSize * 4);
    // Pure tanh response: monotonic, soft-capped at
    // ±TOP_DOWN_HEIGHT_SOFT_CAP_MULTIPLIER, with derivative
    // TOP_DOWN_HEIGHT_RESPONSE_GAIN at the origin. No flat spot at zero, so
    // single-axis motion across the region center stays continuous and
    // diagonal crossings do not sling/zig-zag.
    const softenedRatio = (value, reference) => {
      const ratio = value / reference;
      return TOP_DOWN_HEIGHT_SOFT_CAP_MULTIPLIER
        * Math.tanh((ratio * TOP_DOWN_HEIGHT_RESPONSE_GAIN) / TOP_DOWN_HEIGHT_SOFT_CAP_MULTIPLIER);
    };
    const target = {
      x: softenedRatio(pivotX - focus.x, referenceX) * movementLift * sign,
      y: softenedRatio(pivotY - focus.y, referenceY) * movementLift * sign
    };
    const state = this._parallaxStateFor(visual);
    const current = state.topDownHeightOffset ?? target;
    const offset = {
      x: current.x + (target.x - current.x) * TOP_DOWN_HEIGHT_OFFSET_EASE,
      y: current.y + (target.y - current.y) * TOP_DOWN_HEIGHT_OFFSET_EASE
    };
    state.topDownHeightOffset = offset;
    if (Math.hypot(target.x - offset.x, target.y - offset.y) > SMOOTH_PARALLAX_EPSILON) this._needsParallaxFrame = true;
    return offset;
  }

  _combineParallaxVectors(baseVector, modeVector, lift) {
    return _limitVector({
      x: (baseVector?.x ?? 0) + (modeVector?.x ?? 0),
      y: (baseVector?.y ?? 0) + (modeVector?.y ?? 0)
    }, lift);
  }

  _anchoredParallaxVector(visual, lift, sign, parallax) {
    return this._anchoredParallaxVectorWithMultiplier(visual, lift, sign, parallax, ANCHORED_CAMERA_MULTIPLIER, "anchorFocus");
  }

  _anchoredParallaxVectorWithMultiplier(visual, lift, sign, parallax, multiplier, anchorKey) {
    const focus = this._cameraFocus;
    if (!focus) return { x: 0, y: 0 };
    const state = this._parallaxStateFor(visual);
    state[anchorKey] ??= { x: focus.x, y: focus.y };
    const anchor = state[anchorKey];
    const vector = {
      x: (focus.x - anchor.x) * parallax * multiplier * sign,
      y: (focus.y - anchor.y) * parallax * multiplier * sign
    };
    return _limitVector(vector, lift);
  }

  _layeredParallaxVector(visual, lift, sign, parallax) {
    return this._anchoredParallaxVectorWithMultiplier(visual, lift, sign, parallax, LAYERED_CAMERA_MULTIPLIER, "layeredAnchorFocus");
  }

  _axisScrollParallaxVector(visual, lift, sign, parallax, axis, anchorKey = `${axis}ScrollAnchorFocus`, multiplier = AXIS_SCROLL_CAMERA_MULTIPLIER) {
    const vector = this._anchoredParallaxVectorWithMultiplier(visual, lift, sign, parallax, multiplier, anchorKey);
    if (axis === "x") return { x: vector.x, y: 0 };
    if (axis === "y") return { x: 0, y: vector.y };
    return vector;
  }

  _mouseParallaxVector(visual, lift, sign, parallax) {
    const pointer = this._pointerFocus;
    const focus = this._cameraFocus;
    if (!pointer || !focus) return { x: 0, y: 0 };
    const gridSize = _finiteNumber(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? canvas?.dimensions?.size, 100);
    const liftReference = Math.max(1, gridSize * MOUSE_PARALLAX_LIFT_REFERENCE_GRID_RATIO);
    const elevationFactor = lift / liftReference;
    return _limitVector({
      x: (pointer.x - focus.x) * parallax * MOUSE_PARALLAX_MULTIPLIER * elevationFactor * sign,
      y: (pointer.y - focus.y) * parallax * MOUSE_PARALLAX_MULTIPLIER * elevationFactor * sign
    }, lift);
  }

  _orthographicDirectionForMode(parallaxMode, geo = null) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN:
        return ORTHOGRAPHIC_TOP_DOWN_DIRECTION;
      case PARALLAX_MODES.ORTHOGRAPHIC_ANGLE:
        return _orthographicAngleDirection(geo);
      default:
        return null;
    }
  }

  _orthographicParallaxVector(visual, baseVector, lift, sign, parallax, parallaxMode) {
    const projectionRatio = parallaxMode === PARALLAX_MODES.ORTHOGRAPHIC_ANGLE ? ORTHOGRAPHIC_ANGLE_PROJECTION_RATIO : 0;
    const projectionVector = {
      x: (baseVector?.x ?? 0) * projectionRatio,
      y: (baseVector?.y ?? 0) * projectionRatio
    };
    const panLift = lift * (parallaxMode === PARALLAX_MODES.ORTHOGRAPHIC_ANGLE ? ORTHOGRAPHIC_ANGLE_PAN_LIFT_RATIO : ORTHOGRAPHIC_TOP_DOWN_PAN_LIFT_RATIO);
    const panVector = this._smoothPanParallaxVector(visual, panLift, sign, parallax, parallaxMode);
    return _limitVector({ x: projectionVector.x + panVector.x, y: projectionVector.y + panVector.y }, lift);
  }

  _smoothPanParallaxVector(visual, lift, sign, parallax, parallaxMode) {
    const focus = this._cameraFocus;
    if (!focus || lift <= 0) return { x: 0, y: 0 };
    const state = this._parallaxStateFor(visual);
    const lagKey = `${parallaxMode}PanLagFocus`;
    const vectorKey = `${parallaxMode}PanVector`;
    state[lagKey] ??= { x: focus.x, y: focus.y };
    const lag = state[lagKey];
    lag.x += (focus.x - lag.x) * ORTHOGRAPHIC_PAN_EASE;
    lag.y += (focus.y - lag.y) * ORTHOGRAPHIC_PAN_EASE;
    const vector = _limitVector({
      x: (focus.x - lag.x) * parallax * ORTHOGRAPHIC_PAN_MULTIPLIER * sign,
      y: (focus.y - lag.y) * parallax * ORTHOGRAPHIC_PAN_MULTIPLIER * sign
    }, lift);
    const length = Math.hypot(vector.x, vector.y);
    const cameraDelta = this._cameraDelta();
    const moving = Math.hypot(cameraDelta.x, cameraDelta.y) > 0.5;
    if (length > SMOOTH_PARALLAX_EPSILON) state[vectorKey] = vector;
    else {
      state[vectorKey] = { x: 0, y: 0 };
      if (!moving) {
        lag.x = focus.x;
        lag.y = focus.y;
      }
    }
    if (length > SMOOTH_PARALLAX_EPSILON || moving) this._needsParallaxFrame = true;
    return state[vectorKey];
  }

  _parallaxVisualEffectsForMode(visual, geo, parallaxMode, parallaxVector, lift, sign, parallax, normalized, perspectivePoint) {
    const length = Math.hypot(parallaxVector.x, parallaxVector.y);
    const intensity = Math.clamp(length / Math.max(1, lift), 0, 1);
    switch (parallaxMode) {
      default:
        return {};
    }
  }

  _anchoredVelocityParallaxVector(visual, lift, sign, parallax) {
    // Camera-origin anchor provides the stable perspective base.
    const anchoredLift = lift * ANCHORED_VELOCITY_ANCHOR_WEIGHT;
    const focus = this._cameraFocus;
    if (!focus) return { x: 0, y: 0 };
    const state = this._parallaxStateFor(visual);
    state.anchorFocus ??= { x: focus.x, y: focus.y };
    const anchoredRaw = {
      x: (focus.x - state.anchorFocus.x) * parallax * ANCHORED_CAMERA_MULTIPLIER * sign,
      y: (focus.y - state.anchorFocus.y) * parallax * ANCHORED_CAMERA_MULTIPLIER * sign
    };
    const anchoredContrib = _limitVector(anchoredRaw, anchoredLift);
    // Velocity drift adds inertial motion on top of the anchor.
    const delta = this._cameraDelta();
    const driftLift = lift * ANCHORED_VELOCITY_DRIFT_WEIGHT;
    const velocityCurrent = state.avVelocityVector ?? { x: 0, y: 0 };
    const velocityRaw = _limitVector({
      x: velocityCurrent.x * VELOCITY_PARALLAX_DECAY + delta.x * parallax * VELOCITY_CAMERA_MULTIPLIER * sign,
      y: velocityCurrent.y * VELOCITY_PARALLAX_DECAY + delta.y * parallax * VELOCITY_CAMERA_MULTIPLIER * sign
    }, driftLift);
    state.avVelocityVector = Math.hypot(velocityRaw.x, velocityRaw.y) > SMOOTH_PARALLAX_EPSILON ? velocityRaw : { x: 0, y: 0 };
    if (Math.hypot(state.avVelocityVector.x, state.avVelocityVector.y) > SMOOTH_PARALLAX_EPSILON || Math.hypot(delta.x, delta.y) > 0.5) this._needsParallaxFrame = true;
    // Combine: anchor is the base, velocity drifts additively, total clamped to lift.
    return _limitVector({
      x: anchoredContrib.x + state.avVelocityVector.x,
      y: anchoredContrib.y + state.avVelocityVector.y
    }, lift);
  }

  _velocityParallaxVector(visual, lift, sign, parallax) {
    const delta = this._cameraDelta();
    const state = this._parallaxStateFor(visual);
    const current = state.velocityVector ?? { x: 0, y: 0 };
    const vector = _limitVector({
      x: current.x * VELOCITY_PARALLAX_DECAY + delta.x * parallax * VELOCITY_CAMERA_MULTIPLIER * sign,
      y: current.y * VELOCITY_PARALLAX_DECAY + delta.y * parallax * VELOCITY_CAMERA_MULTIPLIER * sign
    }, lift);
    state.velocityVector = Math.hypot(vector.x, vector.y) > SMOOTH_PARALLAX_EPSILON ? vector : { x: 0, y: 0 };
    if (Math.hypot(state.velocityVector.x, state.velocityVector.y) > SMOOTH_PARALLAX_EPSILON || Math.hypot(delta.x, delta.y) > 0.5) this._needsParallaxFrame = true;
    return state.velocityVector;
  }

  _cameraDelta() {
    const current = this._cameraFocus;
    const previous = this._previousCameraFocus ?? current;
    if (!current || !previous) return { x: 0, y: 0 };
    return { x: current.x - previous.x, y: current.y - previous.y };
  }

  _parallaxStateFor(visual) {
    const key = this._parallaxStateKey(visual);
    let state = this._parallaxState.get(key);
    if (!state) {
      state = {};
      this._parallaxState.set(key, state);
    }
    return state;
  }

  _parallaxStateKey(visual) {
    return visual.entry.region.uuid ?? visual.entry.region.id ?? visual.entry.behavior.uuid ?? visual.entry.behavior.id;
  }

  _blendProfile(blendMode) {
    return BLEND_PROFILE_CONFIGS[blendMode] ?? BLEND_PROFILE_CONFIGS[BLEND_MODES.WIDE];
  }

  _blendWidth(gridSize, normalized, parallax, blendProfile) {
    if (blendProfile.widthMultiplier <= 0) return 0;
    const baseWidth = gridSize * (TRANSITION_WIDTH_GRID_RATIO + normalized * TRANSITION_WIDTH_ELEVATION_RATIO)
      + parallax * TRANSITION_WIDTH_PARALLAX_BONUS;
    return Math.clamp(
      baseWidth * blendProfile.widthMultiplier + blendProfile.widthAdd,
      TRANSITION_WIDTH_MIN,
      blendProfile.maxWidth
    );
  }

  _applyRegionTransform(displayObject, params, { includeOverlayOffset = true, includeSupportOffset = false } = {}) {
    const center = params.transformCenter ?? params.center;
    displayObject.pivot.set(center.x, center.y);
    const offsetX = includeOverlayOffset ? params.overlayOffset.x : (includeSupportOffset ? (params.supportOverlayOffset?.x ?? 0) : 0);
    const offsetY = includeOverlayOffset ? params.overlayOffset.y : (includeSupportOffset ? (params.supportOverlayOffset?.y ?? 0) : 0);
    displayObject.position.set(center.x + offsetX, center.y + offsetY);
    displayObject.scale.set(params.overlayScaleX ?? params.overlayScale, params.overlayScaleY ?? params.overlayScale);
    displayObject.rotation = params.overlayRotation ?? 0;
    displayObject.skew?.set?.(params.overlaySkewX ?? 0, params.overlaySkewY ?? 0);
  }

  _slopeElevationAtPoint(point, params) {
    const range = params.slopeMaxProjection - params.slopeMinProjection;
    if (!Number.isFinite(range) || Math.abs(range) < 1e-6) return params.slopeBaseElevation;
    const projection = point.x * params.slopeVector.x + point.y * params.slopeVector.y;
    const t = Math.clamp((projection - params.slopeMinProjection) / range, 0, 1);
    return params.slopeBaseElevation + (params.slopeFarElevation - params.slopeBaseElevation) * t;
  }

  _slopeElevationFactorAtPoint(point, params) {
    return this._slopeElevationFactorForElevation(this._slopeElevationAtPoint(point, params), params);
  }

  _slopeElevationFactorForElevation(elevation, params) {
    const maxAbs = Math.max(params.slopeMaxAbsElevation ?? 0, MIN_ELEVATION_DELTA);
    return Math.clamp(elevation / maxAbs, -1, 1);
  }

  _slopeSupportMotionAtPoint(point, params) {
    const elevation = this._slopeElevationAtPoint(point, params);
    const support = this._supportingNeighborAtPoint(point, params.entry, elevation);
    if (!support) return null;

    const relative = elevation - support.elevation;
    if (Math.abs(relative) <= CLIFF_WARP_ELEVATION_MATCH_TOLERANCE) {
      return { support, progress: 0, endpointFactor: this._slopeElevationFactorForElevation(elevation, params) };
    }

    const direction = Math.sign(relative);
    const endpoints = [
      { elevation: params.slopeBaseElevation, relative: params.slopeBaseElevation - support.elevation },
      { elevation: params.slopeFarElevation, relative: params.slopeFarElevation - support.elevation }
    ].filter(endpoint => Math.sign(endpoint.relative) === direction);
    const endpoint = endpoints.reduce((largest, value) => {
      return Math.abs(value.relative) > Math.abs(largest.relative) ? value : largest;
    }, { elevation, relative });
    const range = Math.max(
      Math.abs(endpoint.relative) - CLIFF_WARP_ELEVATION_MATCH_TOLERANCE,
      MIN_ELEVATION_DELTA
    );
    const adjusted = Math.abs(relative) - CLIFF_WARP_ELEVATION_MATCH_TOLERANCE;
    return {
      support,
      progress: Math.clamp(adjusted / range, 0, 1),
      endpointFactor: this._slopeElevationFactorForElevation(endpoint.elevation, params)
    };
  }

  _supportingNeighborAtPoint(point, entry, localElevation = null) {
    if (!entry) return null;
    const sampleDistance = 2;
    const samplePoints = [
      point,
      { x: point.x + sampleDistance, y: point.y },
      { x: point.x - sampleDistance, y: point.y },
      { x: point.x, y: point.y + sampleDistance },
      { x: point.x, y: point.y - sampleDistance },
      { x: point.x + sampleDistance, y: point.y + sampleDistance },
      { x: point.x - sampleDistance, y: point.y - sampleDistance },
      { x: point.x + sampleDistance, y: point.y - sampleDistance },
      { x: point.x - sampleDistance, y: point.y + sampleDistance }
    ];
    let best = null;
    for (const visual of this._entries) {
      const candidate = visual.entry;
      if (!candidate || candidate === entry || candidate.region === entry.region) continue;
      if (!samplePoints.some(samplePoint => _regionContains(candidate.region, samplePoint))) continue;
      const candidateElevation = _entryElevationAtPoint(candidate, point);
      if (!Number.isFinite(candidateElevation)) continue;
      const distance = Number.isFinite(localElevation) ? Math.abs(candidateElevation - localElevation) : 0;
      const area = candidate.area || Infinity;
      const sameDistance = best && Math.abs(distance - best.distance) <= 0.001;
      const better = !best
        || distance < best.distance - 0.001
        || (sameDistance && (candidateElevation > best.elevation + 0.001 || (Math.abs(candidateElevation - best.elevation) <= 0.001 && area < best.area)));
      if (!better) continue;
      best = {
        elevation: candidateElevation,
        distance,
        area,
        visual,
        params: this._visualParams.get(this._parallaxStateKey(visual)) ?? null
      };
    }
    return best ? { elevation: best.elevation, visual: best.visual, params: best.params } : null;
  }

  _overlayPointAtFactor(point, params, factor) {
    const center = params.center ?? point;
    const overlayOffset = params.overlayOffset ?? { x: 0, y: 0 };
    const scale = 1 + ((params.overlayScale ?? 1) - 1) * factor;
    return {
      x: center.x + (point.x - center.x) * scale + overlayOffset.x * factor,
      y: center.y + (point.y - center.y) * scale + overlayOffset.y * factor
    };
  }

  _supportOverlayPointAtPoint(point, support, fallbackParams) {
    const supportParams = support.params;
    if (!supportParams) return this._overlayPointAtFactor(point, fallbackParams, this._slopeElevationFactorForElevation(support.elevation, fallbackParams));
    const factor = supportParams.slope ? this._slopeElevationFactorAtPoint(point, supportParams) : 1;
    return this._overlayPointAtFactor(point, supportParams, factor);
  }

  _baseOverlayPointAtPoint(point, params) {
    const supportVisual = params?.supportVisual;
    if (!supportVisual) return point;
    const supportParams = this._visualParams.get(this._parallaxStateKey(supportVisual));
    if (!supportParams) return point;
    const elevation = Number.isFinite(params.supportElevation) ? params.supportElevation : 0;
    return this._supportOverlayPointAtPoint(point, { elevation, visual: supportVisual, params: supportParams }, params);
  }

  _supportOverlayOffsetAtPoint(point, support, fallbackParams) {
    const supportParams = support.params;
    if (!supportParams) {
      const factor = this._slopeElevationFactorForElevation(support.elevation, fallbackParams);
      return { x: fallbackParams.overlayOffset.x * factor, y: fallbackParams.overlayOffset.y * factor };
    }
    const factor = supportParams.slope ? this._slopeElevationFactorAtPoint(point, supportParams) : 1;
    return { x: supportParams.overlayOffset.x * factor, y: supportParams.overlayOffset.y * factor };
  }

  _slopeOverlayOffsetAtPoint(point, params) {
    const motion = this._slopeSupportMotionAtPoint(point, params);
    if (!motion) {
      const factor = this._slopeElevationFactorAtPoint(point, params);
      return { x: params.overlayOffset.x * factor, y: params.overlayOffset.y * factor };
    }
    const baseline = this._supportOverlayOffsetAtPoint(point, motion.support, params);
    const target = {
      x: params.overlayOffset.x * motion.endpointFactor,
      y: params.overlayOffset.y * motion.endpointFactor
    };
    return {
      x: baseline.x + (target.x - baseline.x) * motion.progress,
      y: baseline.y + (target.y - baseline.y) * motion.progress
    };
  }

  _slopedOverlayPoint(point, params) {
    const motion = this._slopeSupportMotionAtPoint(point, params);
    if (!motion) return this._overlayPointAtFactor(point, params, this._slopeElevationFactorAtPoint(point, params));
    const baseline = this._supportOverlayPointAtPoint(point, motion.support, params);
    const target = this._overlayPointAtFactor(point, params, motion.endpointFactor);
    return {
      x: baseline.x + (target.x - baseline.x) * motion.progress,
      y: baseline.y + (target.y - baseline.y) * motion.progress
    };
  }

  _slopedOverlayPaths(paths, params) {
    if (!params.slope) return paths;
    return paths.map(path => path.map(point => this._slopedOverlayPoint(point, params)));
  }

  _shadowDirection(bounds, parallax, shadowMode, perspectivePoint, parallaxMode = null, geo = null) {
    switch (shadowMode) {
      case SHADOW_MODES.OFF:
      case SHADOW_MODES.TOP_DOWN:
      case SHADOW_MODES.TOP_DOWN_STRONG:
        return { x: 0, y: 0 };
      case SHADOW_MODES.REVERSED_RESPONSIVE: {
        const direction = parallax > 0 ? (this._orthographicDirectionForMode(parallaxMode, geo) ?? this._perspectiveDirection(bounds, perspectivePoint)) : STATIC_SHADOW_DIRECTION;
        return { x: -direction.x, y: -direction.y };
      }
      case SHADOW_MODES.RESPONSIVE_ALL_AROUND:
      case SHADOW_MODES.RESPONSIVE:
      default:
        return parallax > 0 ? (this._orthographicDirectionForMode(parallaxMode, geo) ?? this._perspectiveDirection(bounds, perspectivePoint)) : STATIC_SHADOW_DIRECTION;
    }
  }

  _perspectiveDirection(bounds, perspectivePoint) {
    const dx = perspectivePoint.x - bounds.center.x;
    const dy = perspectivePoint.y - bounds.center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return this._cameraDirection(bounds);
    return { x: dx / distance, y: dy / distance };
  }

  _cameraDirection(bounds) {
    const focus = this._cameraFocus;
    if (!focus) return STATIC_SHADOW_DIRECTION;
    const dx = focus.x - bounds.center.x;
    const dy = focus.y - bounds.center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return STATIC_SHADOW_DIRECTION;
    return { x: dx / distance, y: dy / distance };
  }

  _createShadow(paths, texture, geo, params) {
    if (params.softShadowAlpha <= 0 && params.allAroundShadowAlpha <= 0 && params.bridgeShadowAlpha <= 0 && params.contactShadowAlpha <= 0 && params.textureSoftShadowAlpha <= 0 && params.textureBridgeShadowAlpha <= 0 && params.textureContactShadowAlpha <= 0) return null;
    if (params.cliffWarp || params.extrudedWalls || params.edgeStretch) return this._createCliffWarpShadow(paths, params);
    if (params.edgeOnlyShadow) return this._createEdgeTransitionShadow(paths, params);
    const shadow = new PIXI.Container();
    shadow.eventMode = "none";
    if (params.textureMeldShadow && texture) {
      const textureSoft = this._createTextureShadowLayer(paths, texture, geo, params.softShadowOffset, params.textureSoftShadowAlpha, params.softShadowBlur);
      const textureBridge = this._createTextureShadowLayer(paths, texture, geo, params.bridgeShadowOffset, params.textureBridgeShadowAlpha, params.bridgeShadowBlur);
      const textureContact = this._createTextureShadowLayer(paths, texture, geo, params.contactShadowOffset, params.textureContactShadowAlpha, params.contactShadowBlur);
      if (textureSoft) shadow.addChild(textureSoft);
      if (textureBridge) shadow.addChild(textureBridge);
      if (textureContact) shadow.addChild(textureContact);
    }
    const allAround = this._createShadowLayer(paths, { x: 0, y: 0 }, params.allAroundShadowAlpha, params.allAroundShadowBlur);
    const soft = this._createShadowLayer(paths, params.softShadowOffset, params.softShadowAlpha, params.softShadowBlur);
    const bridge = this._createShadowLayer(paths, params.bridgeShadowOffset, params.bridgeShadowAlpha, params.bridgeShadowBlur);
    const contact = this._createShadowLayer(paths, params.contactShadowOffset, params.contactShadowAlpha, params.contactShadowBlur);
    if (allAround) shadow.addChild(allAround);
    if (soft) shadow.addChild(soft);
    if (bridge) shadow.addChild(bridge);
    if (contact) shadow.addChild(contact);
    return shadow.children.length ? shadow : null;
  }

  _createCliffWarpShadow(paths, params) {
    const shadow = new PIXI.Container();
    shadow.eventMode = "none";
    const shadowPaths = this._cliffWarpRenderPaths(paths, params);
    const contactAlpha = Math.max(params.contactShadowAlpha, params.softShadowAlpha * 0.35, params.bridgeShadowAlpha * 0.55);
    const contactBlur = Math.min(Math.max(params.contactShadowBlur, params.softShadowBlur * 0.42), params.gridSize * 0.22);
    const contactWidth = Math.max(2, Math.min(params.slopeWidth * 0.55, params.gridSize * 0.18));
    const allAround = this._createRimShadowLayer(shadowPaths, { x: 0, y: 0 }, params.allAroundShadowAlpha, Math.min(params.allAroundShadowBlur, params.gridSize * 0.18), Math.max(2, params.allAroundShadowBlur * 0.55), true);
    const contact = this._createRimShadowLayer(shadowPaths, params.contactShadowOffset, contactAlpha, contactBlur, contactWidth, true);
    if (allAround) shadow.addChild(allAround);
    if (contact) shadow.addChild(contact);
    return shadow.children.length ? shadow : null;
  }

  _createEdgeTransitionShadow(paths, params) {
    const shadow = new PIXI.Container();
    shadow.eventMode = "none";
    const width = Math.max(2, params.blendWidth || params.slopeWidth || params.contactShadowBlur || 2);
    const shadowPaths = this._slopedOverlayPaths(paths, params);
    const allAround = this._createLiveRimShadowLayer(shadowPaths, { x: 0, y: 0 }, params.allAroundShadowAlpha, params.allAroundShadowBlur, Math.max(width, params.allAroundShadowBlur * 0.8), true);
    const soft = this._createLiveRimShadowLayer(shadowPaths, params.softShadowOffset, params.softShadowAlpha, params.softShadowBlur, Math.max(width, params.softShadowBlur * 0.7), true);
    const bridge = this._createLiveRimShadowLayer(shadowPaths, params.bridgeShadowOffset, params.bridgeShadowAlpha, params.bridgeShadowBlur, Math.max(width, params.bridgeShadowBlur * 0.75), true);
    const contact = this._createLiveRimShadowLayer(shadowPaths, params.contactShadowOffset, params.contactShadowAlpha, params.contactShadowBlur, Math.max(width, params.contactShadowBlur * 1.1), true);
    if (allAround) shadow.addChild(allAround);
    if (soft) shadow.addChild(soft);
    if (bridge) shadow.addChild(bridge);
    if (contact) shadow.addChild(contact);
    if (params.slope) shadow._sceneElevationPreTransformed = true;
    return shadow.children.length ? shadow : null;
  }

  _createEdgeGlue(paths, params) {
    if (params.edgeGlueAlpha <= 0 || params.edgeGlueBlur <= 0) return null;
    const edgeGlueWidth = Math.max(2, params.blendWidth || params.slopeWidth || params.edgeGlueBlur * 0.95);
    const gluePaths = this._slopedOverlayPaths(paths, params);
    const edgeGlue = this._createLiveRimShadowLayer(gluePaths, { x: 0, y: 0 }, params.edgeGlueAlpha, params.edgeGlueBlur, edgeGlueWidth, true);
    if (edgeGlue && !params.slope) this._applyRegionTransform(edgeGlue, params, { includeOverlayOffset: false });
    return edgeGlue;
  }

  _createSlopeLayer(paths, texture, geo, params) {
    if (params.extrudedWalls) return this._createExtrudedWallsLayer(paths, texture, geo, params);
    if (params.cliffWarp) return this._createCliffWarpLayer(paths, texture, geo, params);
    if (params.edgeStretch) return this._createEdgeStretchLayer(paths, texture, geo, params);
    if (!texture || params.slopeAlpha <= 0 || params.slopeWidth <= 0) return null;
    const slope = new PIXI.Container();
    slope.eventMode = "none";
    const band = new PIXI.Container();
    band.eventMode = "none";
    const transitionMask = this._createTransitionMask(paths, params.slopeWidth);
    band.mask = transitionMask;
    band.addChild(transitionMask);
    if (params.isHole) {
      const regionMask = this._createMask(paths);
      slope.mask = regionMask;
      slope.addChild(regionMask);
    }
    if (params.bridgeBaseAlpha > 0) {
      band.addChild(this._createTextureSprite(texture, geo, {
        shift: { x: 0, y: 0 },
        alpha: params.slopeAlpha * params.bridgeBaseAlpha,
        center: params.projectionCenter,
        stretchScale: 1
      }));
    }
    const stretchSteps = Math.max(0, Math.floor(params.slopeStretchSteps ?? 0));
    if (stretchSteps > 0 && params.slopeStretchAlpha > 0) {
      for (let step = stretchSteps; step >= 1; step--) {
        const t = step / stretchSteps;
        const alpha = params.slopeAlpha * params.slopeStretchAlpha * (0.34 + 0.66 * t) / stretchSteps;
        const stretchScale = 1 + (params.slopeStretchScale - 1) * t;
        const shift = {
          x: params.slopeTextureShift.x * t,
          y: params.slopeTextureShift.y * t
        };
        band.addChild(this._createTextureSprite(texture, geo, { shift, alpha, center: params.projectionCenter, stretchScale }));
      }
    }
    band.addChild(this._createTextureSprite(texture, geo, {
      shift: params.slopeTextureShift,
      alpha: params.slopeAlpha,
      center: params.projectionCenter,
      stretchScale: params.slopeStretchScale
    }));
    slope.addChild(band);
    this._applyRegionTransform(slope, params, { includeOverlayOffset: false });
    return slope;
  }

  _createCliffWarpLayer(paths, texture, geo, params) {
    if (!texture || params.cliffWarpAlpha <= 0) return null;
    const overlayOffset = params.overlayOffset || { x: 0, y: 0 };
    const liftLength = Math.hypot(overlayOffset.x, overlayOffset.y);
    if (liftLength < 0.5) return null;

    const Mesh = PIXI.Mesh;
    const MeshGeometry = PIXI.MeshGeometry;
    const MeshMaterial = PIXI.MeshMaterial;
    if (!Mesh || !MeshGeometry || !MeshMaterial) return null;

    const overlayScale = params.overlayScale ?? 1;
    const center = params.center;
    const sourceWidth = Math.max(1, params.cliffWarpSourceWidth || CLIFF_WARP_SOURCE_RIM_PIXELS);
    const landingOverhang = Math.min(sourceWidth * CLIFF_WARP_EDGE_OVERHANG_RATIO, Math.max(1, params.slopeWidth * 0.12));
    const rowCount = CLIFF_WARP_SIDE_ROWS.length;
    const container = new PIXI.Container();
    container.eventMode = "none";

    for (const path of this._cliffWarpRenderPaths(paths, params)) {
      if (!path || path.length < 3) continue;
      // Inward direction is derived from polygon winding (signed area), not
      // from a direction-to-bounds-center, so concave / horseshoe regions
      // sample the texture on the correct side of each edge.
      const windingSign = _pathSignedArea(path) >= 0 ? 1 : -1;
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let edgeIndex = 0; edgeIndex < path.length; edgeIndex++) {
        const startPoint = path[edgeIndex];
        const endPoint = path[(edgeIndex + 1) % path.length];
        const edgeX = endPoint.x - startPoint.x;
        const edgeY = endPoint.y - startPoint.y;
        const edgeLength = Math.hypot(edgeX, edgeY);
        if (edgeLength < 0.001) continue;
        let inwardNormalX = (-edgeY / edgeLength) * windingSign;
        let inwardNormalY = (edgeX / edgeLength) * windingSign;
        // Robustness fallback: probe a tiny step inward from the edge
        // midpoint and flip if it falls outside the polygon (handles
        // unusual / non-simple paths the winding test can mis-classify).
        const probeStep = Math.max(1, edgeLength * 0.01);
        const probeX = (startPoint.x + endPoint.x) / 2 + inwardNormalX * probeStep;
        const probeY = (startPoint.y + endPoint.y) / 2 + inwardNormalY * probeStep;
        if (!_pointInPolygon({ x: probeX, y: probeY }, path)) {
          inwardNormalX = -inwardNormalX;
          inwardNormalY = -inwardNormalY;
        }
        const baseIndex = positions.length / 2;
        const edgeSamples = [startPoint, endPoint];
        for (const point of edgeSamples) {
          const top = this._cliffWarpTopPoint(point, params, overlayScale, overlayOffset, center);
          const base = this._baseOverlayPointAtPoint(point, params);
          for (const row of CLIFF_WARP_SIDE_ROWS) {
            const overhang = landingOverhang * row.overhang;
            const rowX = top.x + (base.x - top.x) * row.t - inwardNormalX * overhang;
            const rowY = top.y + (base.y - top.y) * row.t - inwardNormalY * overhang;
            const sampleX = point.x + inwardNormalX * sourceWidth * row.normalOffset;
            const sampleY = point.y + inwardNormalY * sourceWidth * row.normalOffset;
            positions.push(rowX, rowY);
            uvs.push(Math.clamp((sampleX - geo.x) / geo.width, 0, 1), Math.clamp((sampleY - geo.y) / geo.height, 0, 1));
          }
        }
        for (let row = 0; row < rowCount - 1; row++) {
          const left = baseIndex + row;
          const right = left + rowCount;
          indices.push(left, right, left + 1, left + 1, right, right + 1);
        }
      }

      if (!indices.length) continue;
      const indexArray = positions.length / 2 > 65535 ? Uint32Array : Uint16Array;
      const meshGeo = new MeshGeometry(new Float32Array(positions), new Float32Array(uvs), new indexArray(indices));
      const material = new MeshMaterial(texture, { alpha: params.cliffWarpAlpha });
      const mesh = new Mesh(meshGeo, material);
      mesh.eventMode = "none";
      container.addChild(mesh);
    }

    if (!container.children.length) {
      container.destroy({ children: true });
      return null;
    }
    return container;
  }

  /**
   * 2.5D plateau-style side walls extruded from each region edge.
   *
   * Geometry per edge:
   *   base_A, base_B    -> the actual region footprint (no parallax shift)
   *   top_A,  top_B     -> the lifted overlay edge (base + overlayOffset)
   *
  * Backface culling: only render walls whose outward normal has negative dot
  * with the parallax overlay offset. These are the closest walls in the
  * inverted top-down convention requested for plateau rendering; walls on the
  * opposite side would be facing away from the viewer, so we skip them.
   */
  _createExtrudedWallsLayer(paths, texture, geo, params) {
    if (!texture || params.cliffWarpAlpha <= 0) return null;
    const overlayOffset = params.overlayOffset || { x: 0, y: 0 };
    const liftLength = Math.hypot(overlayOffset.x, overlayOffset.y);
    if (liftLength < 0.5) return null;
    const visualState = this._parallaxStateFor({ entry: params.entry });
    const previousCullOffset = visualState.extrudedWallsCullOffset ?? overlayOffset;
    // Hold the cull vector through the center deadzone. While the live
    // overlay offset is small (camera near the region center) we keep the
    // previously-resolved facing direction so walls do not flip mid-crossing
    // and produce a zig-zag when the camera passes through center along a
    // diagonal. Once the offset clears the deadzone we ease back toward the
    // live value, more aggressively the larger the offset.
    const deadzoneRadius = params.gridSize * 0.18;
    const liftRamp = Math.min(1, Math.max(0, (liftLength - deadzoneRadius) / Math.max(deadzoneRadius, 1)));
    const cullBlend = 0.12 + 0.4 * liftRamp;
    const cullOffset = liftLength <= deadzoneRadius * 0.5
      ? { x: previousCullOffset.x, y: previousCullOffset.y }
      : {
          x: previousCullOffset.x + (overlayOffset.x - previousCullOffset.x) * cullBlend,
          y: previousCullOffset.y + (overlayOffset.y - previousCullOffset.y) * cullBlend
        };
    visualState.extrudedWallsCullOffset = cullOffset;
    if (Math.hypot(overlayOffset.x - cullOffset.x, overlayOffset.y - cullOffset.y) > SMOOTH_PARALLAX_EPSILON) this._needsParallaxFrame = true;
    const cullLength = Math.hypot(cullOffset.x, cullOffset.y);

    const Mesh = PIXI.Mesh;
    const MeshGeometry = PIXI.MeshGeometry;
    const MeshMaterial = PIXI.MeshMaterial;
    if (!Mesh || !MeshGeometry || !MeshMaterial) return null;

    const overlayScale = params.overlayScale ?? 1;
    const center = params.center;
    const sourceWidth = Math.max(1, params.cliffWarpSourceWidth || CLIFF_WARP_SOURCE_RIM_PIXELS);
    const landingOverhang = Math.min(params.gridSize * 0.16, Math.max(params.gridSize * 0.035, params.slopeWidth * 0.35));
    const outsideSourceWidth = Math.max(params.gridSize, sourceWidth);
    const rowCount = EXTRUDED_WALLS_SIDE_ROWS.length;
    // Cull threshold: dot(outwardNormal, overlayOffset) must exceed this for
    // the wall to be visible. Use a small positive epsilon (relative to the
    // lift length) so wobbling near grazing edges does not flicker walls in
    // and out at sub-pixel offsets.
    const cullEpsilon = Math.max(cullLength * 0.05, 0.25);
    const container = new PIXI.Container();
    container.eventMode = "none";

    for (const path of this._cliffWarpRenderPaths(paths, params)) {
      if (!path || path.length < 3) continue;
      // Same winding-based inward normal as cliff warp; outward normal is
      // simply its negation. Probe-step fallback handles non-simple paths.
      const windingSign = _pathSignedArea(path) >= 0 ? 1 : -1;
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let edgeIndex = 0; edgeIndex < path.length; edgeIndex++) {
        const startPoint = path[edgeIndex];
        const endPoint = path[(edgeIndex + 1) % path.length];
        const edgeX = endPoint.x - startPoint.x;
        const edgeY = endPoint.y - startPoint.y;
        const edgeLength = Math.hypot(edgeX, edgeY);
        if (edgeLength < 0.001) continue;
        let inwardNormalX = (-edgeY / edgeLength) * windingSign;
        let inwardNormalY = (edgeX / edgeLength) * windingSign;
        const probeStep = Math.max(1, edgeLength * 0.01);
        const probeX = (startPoint.x + endPoint.x) / 2 + inwardNormalX * probeStep;
        const probeY = (startPoint.y + endPoint.y) / 2 + inwardNormalY * probeStep;
        if (!_pointInPolygon({ x: probeX, y: probeY }, path)) {
          inwardNormalX = -inwardNormalX;
          inwardNormalY = -inwardNormalY;
        }
        const outwardNormalX = -inwardNormalX;
        const outwardNormalY = -inwardNormalY;
        // Backface cull (inverted vs. far-wall convention): only the walls
        // whose outward normal *opposes* the parallax overlay offset remain
        // visible. Those are the edges closest to the camera shift; the
        // opposite walls would be facing away from the viewer in a real
        // 2.5D scene.
        const facing = -(outwardNormalX * cullOffset.x + outwardNormalY * cullOffset.y);
        if (facing <= cullEpsilon) continue;

        const baseIndex = positions.length / 2;
        const edgeSamples = [startPoint, endPoint];
        for (const point of edgeSamples) {
          const top = this._cliffWarpTopPoint(point, params, overlayScale, overlayOffset, center);
          const base = this._baseOverlayPointAtPoint(point, params);
          for (const row of EXTRUDED_WALLS_SIDE_ROWS) {
            const overhang = landingOverhang * row.overhang;
            // Walls extend slightly outward (away from polygon interior) so
            // the seam against the top sprite reads as a clean cliff edge.
            const rowX = top.x + (base.x - top.x) * row.t + outwardNormalX * overhang;
            const rowY = top.y + (base.y - top.y) * row.t + outwardNormalY * overhang;
            // Only the top lip samples a few pixels inside the plateau. The
            // rest samples progressively outward, reaching half a grid outside
            // by the base so ~95% of the wall is made from outside-edge pixels.
            const sampleOffset = Number.isFinite(row.sourcePixels)
              ? row.sourcePixels
              : outsideSourceWidth * (row.sourceGrid ?? 0);
            const sampleX = point.x + inwardNormalX * sampleOffset;
            const sampleY = point.y + inwardNormalY * sampleOffset;
            positions.push(rowX, rowY);
            uvs.push(Math.clamp((sampleX - geo.x) / geo.width, 0, 1), Math.clamp((sampleY - geo.y) / geo.height, 0, 1));
          }
        }
        for (let row = 0; row < rowCount - 1; row++) {
          const left = baseIndex + row;
          const right = left + rowCount;
          indices.push(left, right, left + 1, left + 1, right, right + 1);
        }
      }

      if (!indices.length) continue;
      const indexArray = positions.length / 2 > 65535 ? Uint32Array : Uint16Array;
      const meshGeo = new MeshGeometry(new Float32Array(positions), new Float32Array(uvs), new indexArray(indices));
      const material = new MeshMaterial(texture, { alpha: params.cliffWarpAlpha });
      const mesh = new Mesh(meshGeo, material);
      mesh.eventMode = "none";
      container.addChild(mesh);
    }

    if (!container.children.length) {
      container.destroy({ children: true });
      return null;
    }
    return container;
  }

  _createEdgeStretchLayer(paths, texture, geo, params) {
    if (!texture || params.edgeStretchAlpha <= 0) return null;
    const overlayOffset = params.overlayOffset || { x: 0, y: 0 };
    const liftLength = Math.hypot(overlayOffset.x, overlayOffset.y);
    if (liftLength < 0.5) return null;

    const Mesh = PIXI.Mesh;
    const MeshGeometry = PIXI.MeshGeometry;
    const MeshMaterial = PIXI.MeshMaterial;
    if (!Mesh || !MeshGeometry || !MeshMaterial) return null;

    const overlayScale = params.overlayScale ?? 1;
    const center = params.center;
    const sourceWidth = Math.max(1, Number(params.edgeStretchSourceWidth ?? 1));
    const landingOverhang = Math.min(Math.max(1, params.slopeWidth * 0.18), sourceWidth * 0.45);
    const rowCount = EDGE_STRETCH_SIDE_ROWS.length;
    const container = new PIXI.Container();
    container.eventMode = "none";

    for (const path of this._cliffWarpRenderPaths(paths, params)) {
      if (!path || path.length < 3) continue;
      // Inward direction is derived from polygon winding (signed area), not
      // from a direction-to-bounds-center, so concave / horseshoe regions
      // sample the texture on the correct side of each edge.
      const windingSign = _pathSignedArea(path) >= 0 ? 1 : -1;
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let edgeIndex = 0; edgeIndex < path.length; edgeIndex++) {
        const startPoint = path[edgeIndex];
        const endPoint = path[(edgeIndex + 1) % path.length];
        const edgeX = endPoint.x - startPoint.x;
        const edgeY = endPoint.y - startPoint.y;
        const edgeLength = Math.hypot(edgeX, edgeY);
        if (edgeLength < 0.001) continue;
        let inwardNormalX = (-edgeY / edgeLength) * windingSign;
        let inwardNormalY = (edgeX / edgeLength) * windingSign;
        // Robustness fallback: probe a tiny step inward from the edge
        // midpoint and flip if it falls outside the polygon (handles
        // unusual / non-simple paths the winding test can mis-classify).
        const probeStep = Math.max(1, edgeLength * 0.01);
        const probeX = (startPoint.x + endPoint.x) / 2 + inwardNormalX * probeStep;
        const probeY = (startPoint.y + endPoint.y) / 2 + inwardNormalY * probeStep;
        if (!_pointInPolygon({ x: probeX, y: probeY }, path)) {
          inwardNormalX = -inwardNormalX;
          inwardNormalY = -inwardNormalY;
        }
        const baseIndex = positions.length / 2;
        const edgeSamples = [startPoint, endPoint];
        for (const point of edgeSamples) {
          const top = this._cliffWarpTopPoint(point, params, overlayScale, overlayOffset, center);
          const base = this._baseOverlayPointAtPoint(point, params);
          for (const row of EDGE_STRETCH_SIDE_ROWS) {
            const overhang = landingOverhang * row.overhang;
            const rowX = top.x + (base.x - top.x) * row.t - inwardNormalX * overhang;
            const rowY = top.y + (base.y - top.y) * row.t - inwardNormalY * overhang;
            const sampleX = point.x + inwardNormalX * sourceWidth * row.source;
            const sampleY = point.y + inwardNormalY * sourceWidth * row.source;
            positions.push(rowX, rowY);
            uvs.push(Math.clamp((sampleX - geo.x) / geo.width, 0, 1), Math.clamp((sampleY - geo.y) / geo.height, 0, 1));
          }
        }
        for (let row = 0; row < rowCount - 1; row++) {
          const left = baseIndex + row;
          const right = left + rowCount;
          indices.push(left, right, left + 1, left + 1, right, right + 1);
        }
      }

      if (!indices.length) continue;
      const indexArray = positions.length / 2 > 65535 ? Uint32Array : Uint16Array;
      const meshGeo = new MeshGeometry(new Float32Array(positions), new Float32Array(uvs), new indexArray(indices));
      const material = new MeshMaterial(texture, { alpha: params.edgeStretchAlpha });
      const mesh = new Mesh(meshGeo, material);
      mesh.eventMode = "none";
      container.addChild(mesh);
    }

    if (!container.children.length) {
      container.destroy({ children: true });
      return null;
    }
    return container;
  }

  _cliffWarpTopPoint(point, params, overlayScale, overlayOffset, center) {
    if (params.slope) return this._overlayPointAtFactor(point, params, this._slopeElevationFactorAtPoint(point, params));
    const base = this._baseOverlayPointAtPoint(point, params);
    const localOverlayOffset = params.localOverlayOffset ?? overlayOffset;
    return {
      x: base.x + (point.x - center.x) * (overlayScale - 1) + localOverlayOffset.x,
      y: base.y + (point.y - center.y) * (overlayScale - 1) + localOverlayOffset.y
    };
  }

  _cliffWarpRenderPaths(paths, params) {
    const tolerance = Math.clamp(
      Number(params.gridSize ?? canvas?.grid?.size ?? 100) * CLIFF_WARP_SIMPLIFY_GRID_RATIO,
      CLIFF_WARP_SIMPLIFY_MIN_PIXELS,
      CLIFF_WARP_SIMPLIFY_MAX_PIXELS
    );
    const cacheKey = Math.round(tolerance * 100) / 100;
    const cached = this._cliffWarpPathCache?.get(paths);
    if (cached?.key === cacheKey) return cached.paths;
    const renderPaths = paths.map(path => _simplifyClosedPath(path, tolerance)).filter(path => path.length >= 3);
    this._cliffWarpPathCache?.set(paths, { key: cacheKey, paths: renderPaths });
    return renderPaths;
  }

  _createTextureSprite(texture, geo, { shift = { x: 0, y: 0 }, alpha = 1, center = null, stretchScale = 1 } = {}) {
    const sprite = new PIXI.Sprite(texture);
    sprite.eventMode = "none";
    sprite.width = geo.width;
    sprite.height = geo.height;
    sprite.alpha = alpha;
    if (center && Math.abs(stretchScale - 1) > 0.0001) {
      const baseScaleX = sprite.scale.x || 1;
      const baseScaleY = sprite.scale.y || 1;
      sprite.pivot.set((center.x - geo.x) / baseScaleX, (center.y - geo.y) / baseScaleY);
      sprite.position.set(center.x + shift.x, center.y + shift.y);
      sprite.scale.set(baseScaleX * stretchScale, baseScaleY * stretchScale);
    } else {
      sprite.position.set(geo.x + shift.x, geo.y + shift.y);
    }
    return sprite;
  }

  _createInnerShadow(paths, params) {
    if (!params.isHole || params.innerShadowAlpha <= 0) return null;
    const innerShadow = new PIXI.Container();
    innerShadow.eventMode = "none";
    const soft = this._createRimShadowLayer(paths, params.innerShadowOffset, params.innerShadowAlpha, params.innerShadowBlur, params.innerShadowWidth, true);
    const contact = this._createRimShadowLayer(paths, { x: 0, y: 0 }, params.innerContactAlpha, params.innerContactBlur, params.innerContactWidth, true);
    if (soft) innerShadow.addChild(soft);
    if (contact) innerShadow.addChild(contact);
    if (!innerShadow.children.length) return null;
    this._applyRegionTransform(innerShadow, params, { includeOverlayOffset: false });
    return innerShadow;
  }

  _createRimShadowLayer(paths, offset, alpha, blur, width, insideOnly = false) {
    if (alpha <= 0 || width <= 0) return null;
    const layer = this._createGeneratedShadowLayer(paths, offset, alpha, blur, { strokeWidth: Math.max(1, width) });
    if (!layer) return null;
    if (!insideOnly) return layer;

    const container = new PIXI.Container();
    container.eventMode = "none";
    const mask = this._createMask(paths);
    layer.mask = mask;
    container.addChild(mask);
    container.addChild(layer);
    return container;
  }

  _createLiveRimShadowLayer(paths, offset, alpha, blur, width, insideOnly = false) {
    if (alpha <= 0 || width <= 0) return null;
    const layer = new PIXI.Graphics();
    layer.eventMode = "none";
    layer.lineStyle(Math.max(1, width), 0x000000, 1, 0.5, false, PIXI.LINE_JOIN?.ROUND ?? undefined, PIXI.LINE_CAP?.ROUND ?? undefined);
    _drawPaths(layer, paths);
    layer.position.set(offset.x, offset.y);
    layer.alpha = alpha;
    layer.blendMode = PIXI.BLEND_MODES.NORMAL;
    if (blur > 0) layer.filters = [_makeBlurFilter(blur)];
    if (!insideOnly) return layer;

    const container = new PIXI.Container();
    container.eventMode = "none";
    const mask = this._createMask(paths);
    layer.mask = mask;
    container.addChild(mask);
    container.addChild(layer);
    return container;
  }

  _createShadowLayer(paths, offset, alpha, blur) {
    if (alpha <= 0) return null;
    return this._createGeneratedShadowLayer(paths, offset, alpha, blur);
  }

  _createTextureShadowLayer(paths, texture, geo, offset, alpha, blur) {
    if (!texture || alpha <= 0) return null;
    const mask = this._createGeneratedShadowLayer(paths, offset, 1, blur);
    if (!mask) return null;
    mask.renderable = false;

    const layer = new PIXI.Container();
    layer.eventMode = "none";
    const sprite = new PIXI.Sprite(texture);
    sprite.eventMode = "none";
    sprite.position.set(
      geo.x - offset.x * TEXTURE_MELD_SAMPLE_PULL,
      geo.y - offset.y * TEXTURE_MELD_SAMPLE_PULL
    );
    sprite.width = geo.width;
    sprite.height = geo.height;
    sprite.alpha = alpha;
    sprite.mask = mask;
    layer.addChild(mask);
    layer.addChild(sprite);
    return layer;
  }

  _createGeneratedShadowLayer(paths, offset, alpha, blur, { strokeWidth = 0 } = {}) {
    const bounds = _cachedPathsBounds(paths);
    if (!bounds) return null;
    const padding = Math.ceil(Math.max(blur * 4, strokeWidth) + 4);
    const textureWidth = Math.ceil(bounds.width + padding * 2);
    const textureHeight = Math.ceil(bounds.height + padding * 2);
    const cacheKey = `${textureWidth}x${textureHeight}|${_textureNumber(blur)}|${_textureNumber(strokeWidth)}|${_pathsSignature(paths)}`;
    let texture = this._generatedTextureCache.get(cacheKey);
    if (texture && !_validTexture(texture)) this._generatedTextureCache.delete(cacheKey);
    if (!_validTexture(texture)) {
      const ShadowGraphics = _graphicsClass();
      const shadowShape = new ShadowGraphics();
      shadowShape.eventMode = "none";
      if (strokeWidth > 0) {
        shadowShape.lineStyle(strokeWidth, 0x000000, 1, 0.5, false, PIXI.LINE_JOIN?.ROUND ?? undefined, PIXI.LINE_CAP?.ROUND ?? undefined);
        _drawShiftedPaths(shadowShape, paths, -bounds.minX + padding, -bounds.minY + padding);
      } else {
        shadowShape.beginFill(0x000000, 1);
        _drawShiftedPaths(shadowShape, paths, -bounds.minX + padding, -bounds.minY + padding);
        shadowShape.endFill();
      }
      shadowShape.filters = [_makeBlurFilter(blur)];
      shadowShape.filterArea = new PIXI.Rectangle(0, 0, textureWidth, textureHeight);

      texture = this._generateTexture(shadowShape, textureWidth, textureHeight);
      shadowShape.destroy({ children: true });
      if (_validTexture(texture)) this._generatedTextureCache.set(cacheKey, texture);
    }
    if (!_validTexture(texture)) {
      texture?.destroy?.(true);
      return null;
    }
    if (texture.baseTexture) texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;

    const layer = new PIXI.Sprite(texture);
    layer.eventMode = "none";
    layer.position.set(bounds.minX - padding + offset.x, bounds.minY - padding + offset.y);
    layer.alpha = alpha;
    layer.blendMode = PIXI.BLEND_MODES.NORMAL;
    return layer;
  }

  _createOverlay(paths, texture, geo, params) {
    const overlay = params.slope && texture
      ? this._createSlopedOverlay(paths, texture, geo, params)
      : this._createFlatOverlay(paths, texture, geo, params);
    if (!overlay || !params.isHole) return overlay;
    return this._clipDisplayObjectToRegion(overlay, paths);
  }

  _createFlatOverlay(paths, texture, geo, params) {
    const overlay = new PIXI.Container();
    overlay.eventMode = "none";
    this._applyRegionTransform(overlay, params);

    if (texture) {
      const mask = params.blendWidth > 0
        ? this._createFeatherMask(paths, params.blendWidth)
        : this._createMask(paths);
      const textureLayer = this._createOverlayTextureLayer(texture, geo, params);
      textureLayer.mask = mask;
      overlay.addChild(mask);
      overlay.addChild(textureLayer);
    } else {
      const fallback = new PIXI.Graphics();
      fallback.eventMode = "none";
      fallback.beginFill(0xffffff, 0.08);
      _drawPaths(fallback, paths);
      fallback.endFill();
      overlay.addChild(fallback);
    }

    return overlay;
  }

  _createOverlayTextureLayer(texture, geo, params) {
    const layer = new PIXI.Container();
    layer.eventMode = "none";
    const sprite = new PIXI.Sprite(texture);
    sprite.eventMode = "none";
    sprite.position.set(geo.x + params.textureShift.x, geo.y + params.textureShift.y);
    sprite.width = geo.width;
    sprite.height = geo.height;
    sprite.alpha = params.overlayAlpha;
    layer.addChild(sprite);
    return layer;
  }

  _createSlopedOverlay(paths, texture, geo, params) {
    const Mesh = PIXI.Mesh;
    const MeshGeometry = PIXI.MeshGeometry;
    const MeshMaterial = PIXI.MeshMaterial;
    if (!Mesh || !MeshGeometry || !MeshMaterial) return null;

    const overlay = new PIXI.Container();
    overlay.eventMode = "none";
    for (const path of paths) {
      if (!path || path.length < 3) continue;
      const center = _pathCentroid(path) ?? params.center;
      const vertices = [center, ...path];
      const positions = new Float32Array(vertices.length * 2);
      const uvs = new Float32Array(vertices.length * 2);
      const indexArray = vertices.length > 65535 ? Uint32Array : Uint16Array;
      const indices = new indexArray(path.length * 3);

      for (let index = 0; index < vertices.length; index++) {
        const source = vertices[index];
        const displaced = this._slopedOverlayPoint(source, params);
        const offset = index * 2;
        positions[offset] = displaced.x;
        positions[offset + 1] = displaced.y;
        uvs[offset] = Math.clamp((source.x - geo.x) / geo.width, 0, 1);
        uvs[offset + 1] = Math.clamp((source.y - geo.y) / geo.height, 0, 1);
      }
      for (let index = 0; index < path.length; index++) {
        const offset = index * 3;
        indices[offset] = 0;
        indices[offset + 1] = index + 1;
        indices[offset + 2] = index === path.length - 1 ? 1 : index + 2;
      }

      const meshGeo = new MeshGeometry(positions, uvs, indices);
      const material = new MeshMaterial(texture, { alpha: params.overlayAlpha });
      const mesh = new Mesh(meshGeo, material);
      mesh.eventMode = "none";
      overlay.addChild(mesh);
    }

    if (!overlay.children.length) {
      overlay.destroy({ children: true });
      return null;
    }
    return overlay;
  }

  _clipDisplayObjectToRegion(displayObject, paths) {
    const container = new PIXI.Container();
    container.eventMode = "none";
    const mask = this._createMask(paths);
    displayObject.mask = mask;
    container.addChild(mask);
    container.addChild(displayObject);
    return container;
  }

  _createFeatherMask(paths, feather) {
    const bounds = _cachedPathsBounds(paths);
    if (!bounds) return this._createMask(paths);
    const padding = Math.ceil(feather * 4 + 2);
    const width = Math.ceil(bounds.width + padding * 2);
    const height = Math.ceil(bounds.height + padding * 2);
    const cacheKey = `feather-mask|${width}x${height}|${_textureNumber(feather)}|${_pathsSignature(paths)}`;
    let texture = this._generatedTextureCache.get(cacheKey);
    if (texture && !_validTexture(texture)) this._generatedTextureCache.delete(cacheKey);
    if (!_validTexture(texture)) {
      const MaskGraphics = _graphicsClass();
      const maskShape = new MaskGraphics();
      maskShape.eventMode = "none";
      maskShape.beginFill(0xffffff, 1);
      for (const path of paths) {
        maskShape.drawPolygon(path.flatMap(point => [
          point.x - bounds.minX + padding,
          point.y - bounds.minY + padding
        ]));
      }
      maskShape.endFill();
      maskShape.filters = [_makeBlurFilter(feather)];
      maskShape.filterArea = new PIXI.Rectangle(0, 0, width, height);

      texture = this._generateTexture(maskShape, width, height);
      maskShape.destroy({ children: true });
      if (_validTexture(texture)) this._generatedTextureCache.set(cacheKey, texture);
    }
    if (!_validTexture(texture)) {
      texture?.destroy?.(true);
      return this._createMask(paths);
    }

    const mask = new PIXI.Sprite(texture);
    mask.eventMode = "none";
    mask.position.set(bounds.minX - padding, bounds.minY - padding);
    mask.renderable = false;
    return mask;
  }

  _createTransitionMask(paths, width, { blurRatio = TRANSITION_MASK_BLUR_RATIO, strokeScale = 1.35 } = {}) {
    const bounds = _cachedPathsBounds(paths);
    if (!bounds) return this._createMask(paths);
    const strokeWidth = Math.max(1, width * strokeScale);
    const blur = Math.max(0.35, width * blurRatio);
    const padding = Math.ceil(strokeWidth + blur * 4 + 2);
    const textureWidth = Math.ceil(bounds.width + padding * 2);
    const textureHeight = Math.ceil(bounds.height + padding * 2);
    const cacheKey = `transition-mask|${textureWidth}x${textureHeight}|${_textureNumber(strokeWidth)}|${_textureNumber(blur)}|${_pathsSignature(paths)}`;
    let texture = this._generatedTextureCache.get(cacheKey);
    if (texture && !_validTexture(texture)) this._generatedTextureCache.delete(cacheKey);
    if (!_validTexture(texture)) {
      const MaskGraphics = _graphicsClass();
      const maskShape = new MaskGraphics();
      maskShape.eventMode = "none";
      maskShape.lineStyle(strokeWidth, 0xffffff, 1);
      _drawShiftedPaths(maskShape, paths, -bounds.minX + padding, -bounds.minY + padding);
      maskShape.filters = [_makeBlurFilter(blur)];
      maskShape.filterArea = new PIXI.Rectangle(0, 0, textureWidth, textureHeight);

      texture = this._generateTexture(maskShape, textureWidth, textureHeight);
      maskShape.destroy({ children: true });
      if (_validTexture(texture)) this._generatedTextureCache.set(cacheKey, texture);
    }
    if (!_validTexture(texture)) {
      texture?.destroy?.(true);
      return this._createFeatherMask(paths, width);
    }

    const mask = new PIXI.Sprite(texture);
    mask.eventMode = "none";
    mask.position.set(bounds.minX - padding, bounds.minY - padding);
    mask.renderable = false;
    return mask;
  }

  _generateTexture(displayObject, width, height) {
    const renderer = canvas.app?.renderer;
    if (!renderer) return null;
    const region = new PIXI.Rectangle(0, 0, width, height);
    try {
      return renderer.generateTexture(displayObject, { region, resolution: 1 });
    } catch (err) {}
    try {
      return renderer.generateTexture(displayObject, PIXI.SCALE_MODES.LINEAR, 1, region);
    } catch (err) {}
    return null;
  }

  _clearGeneratedTextureCache() {
    if (!this._generatedTextureCache) return;
    for (const texture of this._generatedTextureCache.values()) texture?.destroy?.(true);
    this._generatedTextureCache.clear();
  }

  _createMask(paths) {
    const MaskGraphics = _graphicsClass();
    const mask = new MaskGraphics();
    mask.eventMode = "none";
    mask.beginFill(0xffffff, 1);
    _drawPaths(mask, paths);
    mask.endFill();
    mask.renderable = false;
    return mask;
  }
}

function _simplifyClosedPath(path, tolerance) {
  if (!Array.isArray(path) || path.length <= 6 || tolerance <= 0) return path ?? [];
  const toleranceSq = tolerance * tolerance;
  const simplified = [];
  for (const point of path) {
    const previous = simplified[simplified.length - 1];
    if (!previous || _pointDistanceSq(previous, point) >= toleranceSq) simplified.push(point);
  }
  if (simplified.length > 3 && _pointDistanceSq(simplified[0], simplified[simplified.length - 1]) < toleranceSq) simplified.pop();
  return simplified.length >= 3 ? simplified : path;
}

function _pointDistanceSq(a, b) {
  const dx = Number(a?.x ?? 0) - Number(b?.x ?? 0);
  const dy = Number(a?.y ?? 0) - Number(b?.y ?? 0);
  return dx * dx + dy * dy;
}

function _parallaxStrength() {
  return _parallaxStrengthForKey(_parallaxStrengthKey());
}

function _parallaxHeightContrast() {
  return parallaxHeightContrastValue(_setting(SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST));
}

function _parallaxMotionLift(lift, normalized, contrast) {
  if (lift <= 0) return lift;
  const strength = Math.clamp(Number.isFinite(contrast) ? contrast : 1, 0, PARALLAX_HEIGHT_CONTRASTS.extreme);
  if (strength <= 0) return lift;
  const nearWeight = 1 / (1 + Math.exp(-(normalized - PARALLAX_DEPTH_CURVE_CENTER) * PARALLAX_DEPTH_CURVE_STEEPNESS));
  const targetMultiplier = LOW_ELEVATION_PARALLAX_FACTOR + (HIGH_ELEVATION_PARALLAX_FACTOR - LOW_ELEVATION_PARALLAX_FACTOR) * nearWeight;
  const depthMultiplier = 1 + (targetMultiplier - 1) * strength;
  return lift * Math.clamp(depthMultiplier, 0.18, 1.35);
}

function _parallaxStrengthForKey(strengthKey) {
  return PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.off;
}

function _parallaxStrengthKey() {
  const strengthKey = _setting(SCENE_SETTING_KEYS.PARALLAX) ?? "off";
  return Object.prototype.hasOwnProperty.call(PARALLAX_STRENGTHS, strengthKey) ? strengthKey : "off";
}

function _parallaxLiftMaxPixels(gridSize) {
  const strengthKey = _parallaxStrengthKey();
  const profileLimit = PARALLAX_LIFT_LIMITS[strengthKey];
  if (Number.isFinite(profileLimit)) return profileLimit;
  return Math.min(OVERLAY_LIFT_MAX_PIXELS, gridSize * OVERLAY_LIFT_MAX_GRID);
}

function _parallaxDistanceBoost(distance, geo) {
  const strengthKey = _parallaxStrengthKey();
  const factor = PARALLAX_DISTANCE_FACTORS[strengthKey] ?? 0;
  if (!factor) return 1;
  const reference = Math.max(geo.gridSize * 6, Math.hypot(geo.width, geo.height) * 0.35);
  return 1 + Math.clamp(distance / reference, 0, 1.65) * factor;
}

function _limitVector(vector, maximum) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= maximum || length <= 0) return vector;
  const ratio = maximum / length;
  return { x: vector.x * ratio, y: vector.y * ratio };
}

function _vectorDirection(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length < 0.001) return null;
  return { x: vector.x / length, y: vector.y / length };
}

function _parallaxMode() {
  const mode = _setting(SCENE_SETTING_KEYS.PARALLAX_MODE) ?? PARALLAX_MODES.ANCHORED_CARD;
  return Object.values(PARALLAX_MODES).includes(mode) ? mode : PARALLAX_MODES.ANCHORED_CARD;
}

function _isOrthographicParallaxMode(mode) {
  return mode === PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN || mode === PARALLAX_MODES.ORTHOGRAPHIC_ANGLE;
}

function _orthographicAngleDirection(geo) {
  if (!geo) return ORTHOGRAPHIC_ANGLE_DIRECTION;
  const edgePoint = _clampPointToSceneEdge(_setting(SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT), geo);
  const center = { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
  const dx = edgePoint.x - center.x;
  const dy = edgePoint.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 1) return ORTHOGRAPHIC_ANGLE_DIRECTION;
  return { x: dx / distance, y: dy / distance };
}

function _blendMode() {
  const mode = _setting(SCENE_SETTING_KEYS.BLEND_MODE) ?? BLEND_MODES.WIDE;
  return Object.values(BLEND_MODES).includes(mode) ? mode : BLEND_MODES.WIDE;
}

function _perspectivePointMode() {
  const point = _setting(SCENE_SETTING_KEYS.PERSPECTIVE_POINT) ?? PERSPECTIVE_POINTS.CENTER;
  return Object.values(PERSPECTIVE_POINTS).includes(point) ? point : PERSPECTIVE_POINTS.CENTER;
}

function _perspectivePoint(geo, bounds = null, point = _perspectivePointMode()) {
  switch (point) {
    case PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE:
      return _perspectivePointPastSceneEdge(_setting(SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT), geo);
    case PERSPECTIVE_POINTS.CAMERA_CENTER:
      return _cameraCenter(geo);
    case PERSPECTIVE_POINTS.SCENE_CAMERA_OFFSET: {
      // Build a single anchor that is far away from every region in the same
      // direction relative to the camera. Because we project the offset out
      // by many scene-widths, _perspectiveDirection() returns essentially the
      // same unit vector for every region centre, eliminating per-region
      // sign-flips when the camera passes a region centre.
      const sceneCenter = { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
      const cam = _cameraCenter(geo);
      const dx = sceneCenter.x - cam.x;
      const dy = sceneCenter.y - cam.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) return sceneCenter;
      const projection = Math.max(geo.width, geo.height) * 12;
      return {
        x: sceneCenter.x + (dx / len) * projection,
        y: sceneCenter.y + (dy / len) * projection
      };
    }
    case PERSPECTIVE_POINTS.FURTHEST_EDGE:
      return _furthestSceneEdgePoint(geo);
    case PERSPECTIVE_POINTS.NEAREST_EDGE:
      return _nearestSceneEdgePoint(geo);
    case PERSPECTIVE_POINTS.NEAREST_EDGE_PER_REGION:
      return _nearestSceneEdgePointToBounds(geo, bounds);
    case PERSPECTIVE_POINTS.REGION_CENTER:
      return bounds?.center ?? { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
    case PERSPECTIVE_POINTS.REGION_TOP_LEFT:
      return bounds ? { x: bounds.minX, y: bounds.minY } : { x: geo.x, y: geo.y };
    case PERSPECTIVE_POINTS.REGION_TOP_RIGHT:
      return bounds ? { x: bounds.maxX, y: bounds.minY } : { x: geo.x + geo.width, y: geo.y };
    case PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT:
      return bounds ? { x: bounds.minX, y: bounds.maxY } : { x: geo.x, y: geo.y + geo.height };
    case PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT:
      return bounds ? { x: bounds.maxX, y: bounds.maxY } : { x: geo.x + geo.width, y: geo.y + geo.height };
    case PERSPECTIVE_POINTS.TOP_LEFT:
      return { x: geo.x, y: geo.y };
    case PERSPECTIVE_POINTS.TOP_RIGHT:
      return { x: geo.x + geo.width, y: geo.y };
    case PERSPECTIVE_POINTS.BOTTOM_LEFT:
      return { x: geo.x, y: geo.y + geo.height };
    case PERSPECTIVE_POINTS.BOTTOM_RIGHT:
      return { x: geo.x + geo.width, y: geo.y + geo.height };
    case PERSPECTIVE_POINTS.FAR_TOP:
      return { x: geo.x + geo.width / 2, y: geo.y - geo.height };
    case PERSPECTIVE_POINTS.FAR_LEFT:
      return { x: geo.x - geo.width, y: geo.y + geo.height / 2 };
    case PERSPECTIVE_POINTS.FAR_RIGHT:
      return { x: geo.x + geo.width * 2, y: geo.y + geo.height / 2 };
    case PERSPECTIVE_POINTS.FAR_BOTTOM:
      return { x: geo.x + geo.width / 2, y: geo.y + geo.height * 2 };
    case PERSPECTIVE_POINTS.CENTER:
    default:
      return { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
  }
}

function _overlayScaleStrength() {
  const scaleKey = _setting(SCENE_SETTING_KEYS.OVERLAY_SCALE) ?? "off";
  return _overlayScaleStrengthForKey(scaleKey);
}

function _overlayScaleStrengthForKey(scaleKey) {
  return OVERLAY_SCALE_STRENGTHS[scaleKey] ?? OVERLAY_SCALE_STRENGTHS.off;
}

function _shadowMode() {
  const mode = _setting(SCENE_SETTING_KEYS.SHADOW_MODE) ?? SHADOW_MODES.TOP_DOWN;
  return Object.values(SHADOW_MODES).includes(mode) ? mode : SHADOW_MODES.TOP_DOWN;
}

function _shadowLength() {
  return shadowLengthValue(_setting(SCENE_SETTING_KEYS.SHADOW_LENGTH));
}

function _shadowLengthMultiplier(value) {
  if (value <= 1) return value;
  return 1 + (value - 1) * 1.35;
}

function _depthScale() {
  const scale = _setting(SCENE_SETTING_KEYS.DEPTH_SCALE) ?? DEPTH_SCALES.COMPRESSED;
  return Object.values(DEPTH_SCALES).includes(scale) ? scale : DEPTH_SCALES.COMPRESSED;
}

function _elevationScale() {
  return elevationScaleValue(_setting(SCENE_SETTING_KEYS.ELEVATION_SCALE));
}

function _sunShadowState(shadowMode, geo, bounds) {
  if (shadowMode === SHADOW_MODES.SUN_AT_EDGE) {
    const sunPoint = _clampPointToSceneEdge(_setting(SCENE_SETTING_KEYS.SUN_EDGE_POINT), geo);
    return {
      direction: _directionAwayFromPoint(bounds.center, sunPoint),
      alphaMultiplier: SUN_EDGE_SHADOW_ALPHA_MULTIPLIER,
      lengthMultiplier: SUN_EDGE_SHADOW_LENGTH_MULTIPLIER,
      blurMultiplier: 1.08
    };
  }
  return null;
}

function _directionAwayFromPoint(center, sourcePoint) {
  const dx = center.x - sourcePoint.x;
  const dy = center.y - sourcePoint.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 1) return STATIC_SHADOW_DIRECTION;
  return { x: dx / distance, y: dy / distance };
}

/** Compute the per-region "lift factor" used as the multiplier for visual height
 * derived from elevation. The compressed mode preserves legacy sqrt() behavior;
 * linear and dramatic modes produce proportionally taller visuals. */
function _depthLiftFactor(absElevation, depthScale) {
  const value = Math.max(0.1, absElevation);
  switch (depthScale) {
    case DEPTH_SCALES.LINEAR:
      // Calibrated so elevation ≈ 4 matches the legacy sqrt(4) lift; everything
      // above scales linearly (elevation 20 = 5× elevation 4).
      return value * 0.5;
    case DEPTH_SCALES.DRAMATIC:
      return Math.pow(value, 1.3) * 0.45;
    case DEPTH_SCALES.COMPRESSED:
    default:
      return Math.sqrt(value);
  }
}

function _overlayScaleDepthFactor(absElevation, reference, depthScale) {
  if (absElevation <= 0 || reference <= 0) return 0;
  const referenceLift = _depthLiftFactor(reference, depthScale);
  if (referenceLift <= 0) return 0;
  return Math.clamp(_depthLiftFactor(absElevation, depthScale) / referenceLift, 0, OVERLAY_SCALE_DEPTH_MAX);
}

/** Normalize an elevation magnitude into [0, 1] using the same shape as
 *  _depthLiftFactor so transition strength tracks the chosen depth scale. */
function _depthNormalize(magnitude, reference, depthScale) {
  if (reference <= 0) return 0;
  switch (depthScale) {
    case DEPTH_SCALES.LINEAR:
      return magnitude / reference;
    case DEPTH_SCALES.DRAMATIC:
      return Math.pow(magnitude / reference, 0.78);
    case DEPTH_SCALES.COMPRESSED:
    default:
      return Math.sqrt(magnitude / reference);
  }
}

function _parallaxEnabled() {
  return _parallaxStrength() > 0;
}

function _perspectiveFollowsCamera() {
  return [
    PERSPECTIVE_POINTS.CAMERA_CENTER,
    PERSPECTIVE_POINTS.FURTHEST_EDGE,
    PERSPECTIVE_POINTS.NEAREST_EDGE,
    PERSPECTIVE_POINTS.SCENE_CAMERA_OFFSET
  ].includes(_setting(SCENE_SETTING_KEYS.PERSPECTIVE_POINT));
}

function _perspectivePointPastSceneEdge(point, geo) {
  const edgePoint = _clampPointToSceneEdge(point ?? { x: geo.x + geo.width / 2, y: geo.y }, geo);
  const center = { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
  return {
    x: edgePoint.x + (edgePoint.x - center.x),
    y: edgePoint.y + (edgePoint.y - center.y)
  };
}

function _clampPointToSceneEdge(point, geo) {
  const x = Math.clamp(Number(point?.x ?? geo.x + geo.width / 2), geo.x, geo.x + geo.width);
  const y = Math.clamp(Number(point?.y ?? geo.y), geo.y, geo.y + geo.height);
  const distances = [
    { edge: "top", distance: Math.abs(y - geo.y) },
    { edge: "right", distance: Math.abs(x - (geo.x + geo.width)) },
    { edge: "bottom", distance: Math.abs(y - (geo.y + geo.height)) },
    { edge: "left", distance: Math.abs(x - geo.x) }
  ].sort((left, right) => left.distance - right.distance);
  switch (distances[0].edge) {
    case "right": return { x: geo.x + geo.width, y };
    case "bottom": return { x, y: geo.y + geo.height };
    case "left": return { x: geo.x, y };
    case "top":
    default: return { x, y: geo.y };
  }
}

function _furthestSceneEdgePoint(geo) {
  const center = _cameraCenter(geo);
  const edges = _sceneEdgePointsFromCenter(geo, center).sort((left, right) => right.distance - left.distance);
  return edges[0].point;
}

function _nearestSceneEdgePoint(geo) {
  const center = _cameraCenter(geo);
  const edges = _sceneEdgePointsFromCenter(geo, center).sort((left, right) => left.distance - right.distance);
  return edges[0].point;
}

// Per-region variant of NEAREST_EDGE: each region picks the scene-boundary
// point closest to its own centre (instead of the camera). Falls back to the
// camera-relative nearest edge when no bounds are provided.
function _nearestSceneEdgePointToBounds(geo, bounds) {
  if (!bounds) return _nearestSceneEdgePoint(geo);
  const cx = bounds.center?.x ?? ((bounds.minX + bounds.maxX) / 2);
  const cy = bounds.center?.y ?? ((bounds.minY + bounds.maxY) / 2);
  const edges = _sceneEdgePointsFromCenter(geo, { x: cx, y: cy }).sort((left, right) => left.distance - right.distance);
  return edges[0].point;
}

function _sceneEdgePointsFromCenter(geo, center) {
  return [
    { distance: Math.abs(center.y - geo.y), point: { x: Math.clamp(center.x, geo.x, geo.x + geo.width), y: geo.y } },
    { distance: Math.abs(center.x - (geo.x + geo.width)), point: { x: geo.x + geo.width, y: Math.clamp(center.y, geo.y, geo.y + geo.height) } },
    { distance: Math.abs(center.y - (geo.y + geo.height)), point: { x: Math.clamp(center.x, geo.x, geo.x + geo.width), y: geo.y + geo.height } },
    { distance: Math.abs(center.x - geo.x), point: { x: geo.x, y: Math.clamp(center.y, geo.y, geo.y + geo.height) } }
  ];
}

function _cameraCenter(geo) {
  try {
    const parent = canvas.primary ?? canvas.stage;
    const focus = parent ? _cameraFocus(parent) : null;
    if (Number.isFinite(focus?.x) && Number.isFinite(focus?.y)) return { x: focus.x, y: focus.y };
  } catch (err) {}
  return { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
}
