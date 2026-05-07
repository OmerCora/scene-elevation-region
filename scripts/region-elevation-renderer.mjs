import { MODULE_ID, SCENE_SETTING_KEYS, PARALLAX_STRENGTHS, PARALLAX_LIFT_LIMITS, PARALLAX_DISTANCE_FACTORS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, OVERLAY_SCALE_STRENGTHS, DEPTH_SCALES, DEPTH_SCALE_REFERENCE, REGION_BEHAVIOR_TYPE, SHADOW_STRENGTH_LIMITS, sceneGeometry, getSceneElevationSetting } from "./config.mjs";

const MIN_ELEVATION_DELTA = 0.05;
const OVERLAY_ELEVATION_REFERENCE = 6;
const OVERLAY_LIFT_BASE = 0.045;
const OVERLAY_LIFT_PARALLAX = 0.12;
const OVERLAY_LIFT_MAX_GRID = 0.35;
const OVERLAY_LIFT_MAX_PIXELS = 28;
const SMOOTH_PARALLAX_EPSILON = 0.35;
const ANCHORED_CAMERA_MULTIPLIER = 0.75;
const VELOCITY_CAMERA_MULTIPLIER = 0.9;
const VELOCITY_PARALLAX_DECAY = 0.82;
const ANCHORED_VELOCITY_ANCHOR_WEIGHT = 0.6;
const ANCHORED_VELOCITY_DRIFT_WEIGHT = 0.55;
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
const CLIFF_WARP_ALPHA_MAX = 0.9;
const CLIFF_WARP_LAYER_STEPS_MIN = 3;
const CLIFF_WARP_LAYER_STEPS_MAX = 7;
const CLIFF_WARP_DROP_MAX_PIXELS = 68;
const CLIFF_WARP_STRETCH_STEPS = 5;
const CLIFF_WARP_DEPTH_MAX_GRID = 1.05;
const CLIFF_WARP_TEXTURE_ALPHA_MAX = 0.92;
const STRONG_TOP_DOWN_SHADOW_MULTIPLIER = 2.35;
const STRONG_TOP_DOWN_BLUR_MULTIPLIER = 1.55;
const CLIFF_WARP_TEXTURE_SHADOW_STRETCH_STEPS_MAX = 2;
const CLIFF_WARP_TEXTURE_SHADOW_STEP_MULTIPLIER = 0.5;
const CLIFF_WARP_TEXTURE_SHADOW_ALPHA_MULTIPLIER = 0.82;
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
  [BLEND_MODES.CLIFF_WARP]: Object.freeze({
    widthMultiplier: 3.4,
    widthAdd: 12,
    maxWidth: 72,
    textureShiftRatio: 0.22,
    overlayAlpha: 0.998,
    glueAlpha: 0.26,
    glueBlurMultiplier: 0.12,
    slopeAlpha: 0.9,
    slopeAlphaMax: CLIFF_WARP_TEXTURE_ALPHA_MAX,
    slopeWidthMultiplier: 2.8,
    slopeTextureShiftRatio: 0.18,
    slopeDropPixels: 38,
    dropMaxPixels: CLIFF_WARP_DROP_MAX_PIXELS,
    stretchAlpha: 0.86,
    stretchSteps: CLIFF_WARP_STRETCH_STEPS,
    stretchScaleMin: 1.03,
    stretchScaleMax: 1.28,
    bridgeBaseAlpha: 0.58,
    cliffWarp: true,
    cliffWarpAlpha: 0.86,
    cliffWarpAlphaMax: CLIFF_WARP_ALPHA_MAX,
    cliffWarpSteps: 4,
    cliffWarpStepsMax: CLIFF_WARP_LAYER_STEPS_MAX,
    cliffWarpDepthRatio: 1.18,
    cliffWarpDepthMaxGrid: CLIFF_WARP_DEPTH_MAX_GRID,
    cliffWarpDepthMinRatio: 0.45,
    cliffWarpScaleFactor: 0.48,
    cliffWarpWidthBase: 0.38,
    cliffWarpWidthElevationRatio: 0.42,
    liftMultiplier: 1.9,
    overlayScaleBonus: 0.015
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
    const elevation = Number(behavior.system?.elevation ?? sourceSystem.elevation ?? sourceSystem.height ?? 0);
    const shadowStrength = Number(behavior.system?.shadowStrength ?? sourceSystem.shadowStrength ?? SHADOW_STRENGTH_LIMITS.DEFAULT);
    if (!Number.isFinite(elevation)) continue;
    const paths = pathCache ? _regionPaths(region) : null;
    if (pathCache) pathCache.set(region, paths);
    entries.push({
      region,
      behavior,
      elevation,
      shadowStrength: Math.clamp(Number.isFinite(shadowStrength) ? shadowStrength : SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX),
      area: _regionArea(region, paths),
      parallaxStrengthOverride: _keyOverride(behavior.system?.parallaxStrengthOverride ?? sourceSystem.parallaxStrengthOverride, PARALLAX_STRENGTHS),
      parallaxModeOverride: _settingOverride(behavior.system?.parallaxModeOverride ?? sourceSystem.parallaxModeOverride, PARALLAX_MODES),
      perspectivePointOverride: _settingOverride(behavior.system?.perspectivePointOverride ?? sourceSystem.perspectivePointOverride, PERSPECTIVE_POINTS),
      overlayScaleOverride: _keyOverride(behavior.system?.overlayScaleOverride ?? sourceSystem.overlayScaleOverride, OVERLAY_SCALE_STRENGTHS),
      shadowModeOverride: _settingOverride(behavior.system?.shadowModeOverride ?? sourceSystem.shadowModeOverride, SHADOW_MODES),
      shadowLengthOverride: _numberOverride(behavior.system?.shadowLengthOverride ?? sourceSystem.shadowLengthOverride, 0, 8),
      blendModeOverride: _settingOverride(behavior.system?.blendModeOverride ?? sourceSystem.blendModeOverride, BLEND_MODES),
      depthScaleOverride: _settingOverride(behavior.system?.depthScaleOverride ?? sourceSystem.depthScaleOverride, DEPTH_SCALES),
      modifyTokenElevation: behavior.system?.modifyTokenElevation !== false,
      modifyTokenScaling: behavior.system?.modifyTokenScaling !== false
    });
  }
  return entries;
}

export function getRegionElevationStateAtPoint(point, scene = canvas?.scene, entries = null, options = {}) {
  const candidates = entries ?? getActiveElevationRegions(scene);
  let elevation = 0;
  let entry = null;
  let found = false;
  let area = Infinity;
  for (const candidate of candidates) {
    if (options.requireTokenElevation && !candidate.modifyTokenElevation) continue;
    if (options.requireTokenScaling && !candidate.modifyTokenScaling) continue;
    if (!_regionContains(candidate.region, point)) continue;
    if (options.preferHighest) {
      if (!found || candidate.elevation > elevation) {
        elevation = candidate.elevation;
        entry = candidate;
      }
      found = true;
      continue;
    }
    const candidateArea = candidate.area || Infinity;
    if (!found || candidateArea < area || (candidateArea === area && candidate.elevation > elevation)) {
      elevation = candidate.elevation;
      entry = candidate;
      area = candidateArea;
    }
    found = true;
  }
  return { found, elevation: found ? elevation : 0, entry };
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

function _numberOverride(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.clamp(number, min, max) : null;
}

function _regionContains(region, point) {
  try {
    if (region.testPoint?.({ x: point.x, y: point.y })) return true;
  } catch (err) {}
  try {
    if (region.testPoint?.({ x: point.x, y: point.y, elevation: point.elevation ?? 0 })) return true;
  } catch (err) {}
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
    this.mask = null;
    this._scene = null;
    this._entries = [];
    this._cameraFocus = null;
    this._previousCameraFocus = null;
    this._panRaf = null;
    this._parallaxState = new Map();
    this._visualParams = new Map();
    this._generatedTextureCache = new Map();
    this._needsParallaxFrame = false;
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
    container.zIndex = 10_000;
    container.mask = mask;
    canvas.primary.addChild(mask);
    canvas.primary.addChild(container);

    this._scene = scene;
    this.container = container;
    this.mask = mask;
    this._cameraFocus = null;
    this.update();
  }

  detach() {
    if (this._panRaf) cancelAnimationFrame(this._panRaf);
    this._panRaf = null;
    try { this.container?.parent?.removeChild(this.container); } catch (err) {}
    try { this.mask?.parent?.removeChild(this.mask); } catch (err) {}
    this._destroyGeneratedTextures(this.container);
    this.container?.destroy({ children: true });
    this.mask?.destroy();
    this._clearGeneratedTextureCache();
    this.container = null;
    this.mask = null;
    this._scene = null;
    this._entries = [];
    this._cameraFocus = null;
    this._previousCameraFocus = null;
    this._parallaxState.clear();
    this._visualParams.clear();
    this._needsParallaxFrame = false;
  }

  update() {
    if (!this.container || !this._scene) return;
    this._parallaxState.clear();
    this._clearRegionChildren();
    this._clearGeneratedTextureCache();
    this._entries = this._visualEntries(this._scene);
    this._pruneParallaxState();
    this.container.visible = this._entries.length > 0;
    this._updateCameraFocus(true);
    this._drawRegions({ clear: false });
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
      y: y + (height * gridSize) / 2
    };
    const state = getRegionElevationStateAtPoint(point, this._scene, this._entries.map(visual => visual.entry), { requireTokenScaling: true });
    if (!state.found) return { x: 0, y: 0 };
    const visual = this._entries.find(candidate => candidate.entry === state.entry);
    if (!visual) return { x: 0, y: 0 };
    const offset = this._visualParams.get(this._parallaxStateKey(visual))?.overlayOffset;
    return offset ? { x: offset.x, y: offset.y } : { x: 0, y: 0 };
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

  _pruneParallaxState() {
    const activeKeys = new Set(this._entries.map(visual => this._parallaxStateKey(visual)));
    for (const key of this._parallaxState.keys()) {
      if (!activeKeys.has(key)) this._parallaxState.delete(key);
    }
  }

  _hasActiveParallax() {
    return _parallaxEnabled() || this._entries.some(visual => _parallaxStrengthForKey(visual.entry.parallaxStrengthOverride) > 0);
  }

  _visualEntries(scene) {
    const pathCache = new Map();
    let visuals = getActiveElevationRegions(scene, pathCache)
      .map(entry => {
        const paths = pathCache.get(entry.region) ?? _regionPaths(entry.region);
        const bounds = paths.length ? _cachedPathsBounds(paths) : null;
        return { entry, paths, bounds };
      })
      .filter(visual => visual.paths.length && visual.bounds && Math.abs(visual.entry.elevation) >= MIN_ELEVATION_DELTA);
    visuals = visuals
      .map(visual => this._withNearestLowerLayer(visual, visuals))
      .sort((left, right) => {
        const elevation = left.entry.elevation - right.entry.elevation;
        if (Math.abs(elevation) > 0.001) return elevation;
        return (right.entry.area || 0) - (left.entry.area || 0);
      });
    return visuals;
  }

  _withNearestLowerLayer(visual, visuals) {
    let lowerElevation = 0;
    let lowerArea = Infinity;
    const point = visual.bounds.center;
    for (const candidate of visuals) {
      if (candidate.entry.region === visual.entry.region) continue;
      if (candidate.entry.elevation >= visual.entry.elevation) continue;
      if (!_pathsContain(candidate.paths, point)) continue;
      const area = candidate.entry.area || Infinity;
      if (candidate.entry.elevation > lowerElevation || (candidate.entry.elevation === lowerElevation && area < lowerArea)) {
        lowerElevation = candidate.entry.elevation;
        lowerArea = area;
      }
    }
    return {
      ...visual,
      lowerElevation,
      elevationDelta: visual.entry.elevation - lowerElevation
    };
  }

  _drawRegions({ clear = true } = {}) {
    if (clear) this._clearRegionChildren();
    this._visualParams.clear();
    this._needsParallaxFrame = false;
    if (!this.container || !this._entries.length) return;

    const geo = sceneGeometry(this._scene);
    const texture = this._backgroundTexture();
    const parallax = _parallaxStrength();
    const parallaxMode = _parallaxMode();
    const blendMode = _blendMode();
    const overlayScaleStrength = _overlayScaleStrength();
    const shadowMode = _shadowMode();
    const depthScale = _depthScale();
    const shadowLength = _shadowLength();
    for (const visual of this._entries) {
      const visualParallax = visual.entry.parallaxStrengthOverride ? _parallaxStrengthForKey(visual.entry.parallaxStrengthOverride) : parallax;
      const visualParallaxMode = visual.entry.parallaxModeOverride || parallaxMode;
      const visualPerspectivePointMode = visual.entry.perspectivePointOverride || _perspectivePointMode();
      const visualBlendMode = visual.entry.blendModeOverride || blendMode;
      const visualOverlayScaleStrength = visual.entry.overlayScaleOverride ? _overlayScaleStrengthForKey(visual.entry.overlayScaleOverride) : overlayScaleStrength;
      const visualShadowMode = visual.entry.shadowModeOverride || shadowMode;
      const visualShadowLength = visual.entry.shadowLengthOverride ?? shadowLength;
      const visualDepthScale = visual.entry.depthScaleOverride || depthScale;
      const perspectivePoint = _perspectivePoint(geo, visual.bounds, visualPerspectivePointMode);
      const params = this._regionVisualParameters(visual, geo, visualParallax, visualParallaxMode, visualBlendMode, visualOverlayScaleStrength, visualShadowMode, perspectivePoint, visualDepthScale, visualShadowLength);
      this._visualParams.set(this._parallaxStateKey(visual), params);
      if (!params.isHole) {
        const shadow = this._createShadow(visual.paths, texture, geo, params);
        if (shadow) {
          this._applyRegionTransform(shadow, params, { includeOverlayOffset: false });
          this.container.addChild(shadow);
        }
      }
      const overlay = this._createOverlay(visual.paths, texture, geo, params);
      if (params.isHole && overlay) this.container.addChild(overlay);
      const slope = this._createSlopeLayer(visual.paths, texture, geo, params);
      if (slope) this.container.addChild(slope);
      if (!params.isHole) {
        const edgeGlue = this._createEdgeGlue(visual.paths, params);
        if (edgeGlue) this.container.addChild(edgeGlue);
      }
      if (!params.isHole && overlay) this.container.addChild(overlay);
      if (params.isHole) {
        const innerShadow = this._createInnerShadow(visual.paths, params);
        if (innerShadow) this.container.addChild(innerShadow);
      }
    }
    if (this._needsParallaxFrame) this._requestParallaxFrame();
    Hooks.callAll(`${MODULE_ID}.visualRefresh`);
  }

  _requestParallaxFrame() {
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      this._updateCameraFocus(false);
      this._drawRegions();
    });
  }

  _clearRegionChildren() {
    if (!this.container) return;
    while (this.container.children.length) {
      const child = this.container.removeChildAt(0);
      this._destroyGeneratedTextures(child);
      child.destroy({ children: true });
    }
  }

  _destroyGeneratedTextures(object) {
    if (!object) return;
    for (const child of object.children ?? []) this._destroyGeneratedTextures(child);
    if (object._seGeneratedTexture) {
      object._seGeneratedTexture.destroy(true);
      object._seGeneratedTexture = null;
    }
  }

  _backgroundTexture() {
    const texture = canvas.primary?.background?.texture;
    return _validTexture(texture) ? texture : null;
  }

  _regionVisualParameters(visual, geo, parallax, parallaxMode, blendMode, overlayScaleStrength, shadowMode, perspectivePoint, depthScale = DEPTH_SCALES.COMPRESSED, shadowLength = 1) {
    const gridSize = geo.gridSize;
    const { entry, bounds } = visual;
    const reference = DEPTH_SCALE_REFERENCE[depthScale] ?? DEPTH_SCALE_REFERENCE[DEPTH_SCALES.COMPRESSED];
    const absElevation = Math.abs(entry.elevation);
    const magnitude = Math.min(absElevation, reference);
    const normalized = Math.clamp(_depthNormalize(magnitude, reference, depthScale), 0.1, 1);
    const absDelta = Math.abs(visual.elevationDelta ?? entry.elevation);
    const deltaMagnitude = Math.min(absDelta, reference);
    const transitionNormalized = Math.clamp(_depthNormalize(deltaMagnitude, reference, depthScale), 0.1, 1);
    const isHole = entry.elevation < 0;
    const baseParallaxDirection = parallax > 0 ? this._perspectiveDirection(bounds, perspectivePoint) : STATIC_SHADOW_DIRECTION;
    const sunShadow = _sunShadowState(shadowMode, geo, bounds);
    const shadowDirection = sunShadow?.direction ?? this._shadowDirection(bounds, parallax, shadowMode, perspectivePoint);
    const blendProfile = this._blendProfile(blendMode);
    const shadowDisabled = shadowMode === SHADOW_MODES.OFF;
    const textureMeldShadow = shadowMode === SHADOW_MODES.TEXTURE_MELD;
    const fullTextureMeldShadow = shadowMode === SHADOW_MODES.FULL_TEXTURE_MELD;
    const textureShadow = textureMeldShadow || fullTextureMeldShadow;
    const strongTopDownShadow = shadowMode === SHADOW_MODES.TOP_DOWN_STRONG;
    const responsiveAllAroundShadow = shadowMode === SHADOW_MODES.RESPONSIVE_ALL_AROUND;
    const cliffWarpTextureShadowOptimization = textureShadow && blendMode === BLEND_MODES.CLIFF_WARP;
    const shadowAlphaMultiplier = sunShadow?.alphaMultiplier ?? 1;
    const shadowLengthMultiplier = (sunShadow?.lengthMultiplier ?? 1) * _shadowLengthMultiplier(shadowLength);
    const shadowBlurMultiplier = sunShadow?.blurMultiplier ?? 1;
    const sign = isHole ? -1 : 1;
    const overlayScaleDepth = _overlayScaleDepthFactor(absElevation, reference, depthScale);
    const overlayScaleDelta = overlayScaleDepth * (overlayScaleStrength + (blendProfile.overlayScaleBonus ?? 0)) * sign;
    const overlayScale = 1 + overlayScaleDelta;
    const perspectiveDistance = Math.hypot(perspectivePoint.x - bounds.center.x, perspectivePoint.y - bounds.center.y);
    const distanceBoost = _parallaxDistanceBoost(perspectiveDistance, geo);
    const liftFactor = _depthLiftFactor(absElevation, depthScale);
    const liftMultiplier = blendProfile.liftMultiplier ?? 1;
    const liftCeiling = depthScale === DEPTH_SCALES.COMPRESSED
      ? _parallaxLiftMaxPixels(gridSize)
      : Math.max(_parallaxLiftMaxPixels(gridSize), gridSize * (depthScale === DEPTH_SCALES.DRAMATIC ? 6 : 4));
    const lift = Math.clamp(
      liftFactor * gridSize * (OVERLAY_LIFT_BASE + parallax * OVERLAY_LIFT_PARALLAX) * distanceBoost * liftMultiplier,
      0,
      liftCeiling * Math.max(1, liftMultiplier)
    );
    const baseParallaxVector = parallax > 0 ? { x: baseParallaxDirection.x * lift * sign, y: baseParallaxDirection.y * lift * sign } : { x: 0, y: 0 };
    const parallaxVector = parallax > 0 ? this._parallaxVectorForMode(visual, baseParallaxVector, parallaxMode, lift, sign, parallax) : { x: 0, y: 0 };
    const blendDirection = parallax > 0 ? (_vectorDirection(parallaxVector) ?? baseParallaxDirection) : STATIC_SHADOW_DIRECTION;
    const overlayOffset = this._overlayOffsetForMode(parallaxVector, parallaxMode);
    const textureShift = { x: 0, y: 0 };
    const transitionShift = this._transitionShiftForMode(parallaxVector, parallaxMode, blendProfile);
    const longShadowBlend = Math.clamp((shadowLengthMultiplier - SHADOW_BRIDGE_THRESHOLD) / 2.6, 0, 1);
    const softShadowOffset = {
      x: shadowDirection.x * lift * SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign,
      y: shadowDirection.y * lift * SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign
    };
    const contactShadowOffset = {
      x: shadowDirection.x * lift * CONTACT_SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign,
      y: shadowDirection.y * lift * CONTACT_SHADOW_OFFSET_MULTIPLIER * shadowLengthMultiplier * sign
    };
    const shadowStrength = Math.clamp(entry.shadowStrength ?? SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX);
    const blackShadowRatio = fullTextureMeldShadow ? 0 : textureMeldShadow ? TEXTURE_MELD_BLACK_ALPHA_RATIO : 1;
    const softShadowAlphaBase = shadowDisabled ? 0 : (SOFT_SHADOW_ALPHA_BASE + normalized * SOFT_SHADOW_ALPHA_ELEVATION) * shadowStrength * shadowAlphaMultiplier * blackShadowRatio * (strongTopDownShadow ? STRONG_TOP_DOWN_SHADOW_MULTIPLIER : 1);
    const contactShadowAlphaBase = shadowDisabled ? 0 : (CONTACT_SHADOW_ALPHA_BASE + normalized * CONTACT_SHADOW_ALPHA_ELEVATION) * shadowStrength * shadowAlphaMultiplier * blackShadowRatio * (strongTopDownShadow ? STRONG_TOP_DOWN_SHADOW_MULTIPLIER : 1);
    const textureSoftShadowAlphaBase = textureShadow && !shadowDisabled ? Math.clamp((fullTextureMeldShadow ? FULL_TEXTURE_MELD_SOFT_ALPHA : TEXTURE_MELD_SOFT_ALPHA) * shadowStrength * shadowAlphaMultiplier * (0.72 + normalized * 0.28), 0, fullTextureMeldShadow ? 0.98 : 0.92) : 0;
    const textureContactShadowAlphaBase = textureShadow && !shadowDisabled ? Math.clamp((fullTextureMeldShadow ? FULL_TEXTURE_MELD_CONTACT_ALPHA : TEXTURE_MELD_CONTACT_ALPHA) * shadowStrength * shadowAlphaMultiplier * (0.72 + normalized * 0.28), 0, fullTextureMeldShadow ? 0.92 : 0.82) : 0;
    const blendWidth = this._blendWidth(gridSize, transitionNormalized, parallax, blendProfile);
    const edgeGlueAlpha = !shadowDisabled && blendWidth > 0
      ? Math.clamp(blendProfile.glueAlpha * shadowStrength * (0.65 + transitionNormalized * 0.35), 0, EDGE_GLUE_ALPHA_MAX)
      : 0;
    const cliffWarpActive = !isHole && absElevation > 0 && !!blendProfile.cliffWarp;
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
    let cliffWarpSteps = 0;
    let cliffWarpShift = { x: 0, y: 0 };
    let cliffWarpScaleDelta = 0;
    if (cliffWarpActive) {
      const cliffWarpWidthRatio = (blendProfile.cliffWarpWidthBase ?? 0.18) + transitionNormalized * (blendProfile.cliffWarpWidthElevationRatio ?? 0.18);
      slopeWidth = Math.max(slopeWidth, Math.min(blendProfile.maxWidth, gridSize * cliffWarpWidthRatio));
      slopeAlphaBase = Math.max(slopeAlphaBase, blendProfile.cliffWarpAlpha ?? 0.68);
      if (cliffWarpTextureShadowOptimization) slopeStretchStepsBase = Math.min(slopeStretchStepsBase, CLIFF_WARP_TEXTURE_SHADOW_STRETCH_STEPS_MAX);
      const cliffWarpDepth = Math.clamp(
        lift * (blendProfile.cliffWarpDepthRatio ?? 0.65),
        slopeWidth * (blendProfile.cliffWarpDepthMinRatio ?? 0.35),
        gridSize * (blendProfile.cliffWarpDepthMaxGrid ?? CLIFF_WARP_DEPTH_MAX_GRID)
      );
      cliffWarpShift = {
        x: textureShift.x + overlayOffset.x + blendDirection.x * cliffWarpDepth * sign,
        y: textureShift.y + overlayOffset.y + blendDirection.y * cliffWarpDepth * sign
      };
      cliffWarpScaleDelta = (overlayScale - 1) + (cliffWarpDepth / Math.max(bounds.width, bounds.height, gridSize)) * (blendProfile.cliffWarpScaleFactor ?? 0.18);
      cliffWarpSteps = Math.clamp(
        Math.round((blendProfile.cliffWarpSteps ?? 4) + transitionNormalized * 1.5),
        CLIFF_WARP_LAYER_STEPS_MIN,
        blendProfile.cliffWarpStepsMax ?? CLIFF_WARP_LAYER_STEPS_MAX
      );
      if (cliffWarpTextureShadowOptimization) cliffWarpSteps = Math.max(2, Math.round(cliffWarpSteps * CLIFF_WARP_TEXTURE_SHADOW_STEP_MULTIPLIER));
      cliffWarpAlpha = Math.clamp((blendProfile.cliffWarpAlpha ?? 0.72) * shadowStrength * (0.72 + transitionNormalized * 0.28), 0, blendProfile.cliffWarpAlphaMax ?? CLIFF_WARP_ALPHA_MAX);
      if (cliffWarpTextureShadowOptimization) cliffWarpAlpha *= CLIFF_WARP_TEXTURE_SHADOW_ALPHA_MULTIPLIER;
    }
    const slopeTextureShift = slopeWidth > 0
      ? {
        x: transitionShift.x * slopeTextureShiftRatio + blendDirection.x * slopeDropPixels * sign,
        y: transitionShift.y * slopeTextureShiftRatio + blendDirection.y * slopeDropPixels * sign
      }
      : { x: 0, y: 0 };
    const useProjectionPerspective = bridgeBaseAlphaBase > 0 || cliffWarpActive;
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
      isHole,
      center: bounds.center,
      projectionCenter: useProjectionPerspective ? perspectivePoint : bounds.center,
      overlayScale,
      overlayOffset,
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
      cliffWarpAlpha,
      cliffWarpSteps,
      cliffWarpShift,
      cliffWarpScaleDelta,
      textureMeldShadow: textureShadow,
      textureSoftShadowAlpha: textureSoftShadowAlphaBase,
      textureBridgeShadowAlpha,
      textureContactShadowAlpha: textureContactShadowAlphaBase,
      overlayAlpha: blendWidth > 0 ? blendProfile.overlayAlpha : 1,
      edgeGlueAlpha,
      edgeGlueBlur: Math.clamp(blendWidth * blendProfile.glueBlurMultiplier, 0, blendWidth * 1.7),
      softShadowOffset,
      allAroundShadowAlpha,
      allAroundShadowBlur,
      bridgeShadowOffset,
      contactShadowOffset,
      innerShadowOffset: {
        x: shadowDirection.x * lift * INNER_SHADOW_OFFSET_MULTIPLIER,
        y: shadowDirection.y * lift * INNER_SHADOW_OFFSET_MULTIPLIER
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
      case PARALLAX_MODES.CARD:
      case PARALLAX_MODES.ANCHORED_CARD:
      case PARALLAX_MODES.VELOCITY_CARD:
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
        return parallaxVector;
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _transitionShiftForMode(parallaxVector, parallaxMode, blendProfile) {
    switch (parallaxMode) {
      case PARALLAX_MODES.CARD:
      case PARALLAX_MODES.ANCHORED_CARD:
      case PARALLAX_MODES.VELOCITY_CARD:
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
        return { x: parallaxVector.x * CARD_TRANSITION_SHIFT_RATIO, y: parallaxVector.y * CARD_TRANSITION_SHIFT_RATIO };
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _parallaxVectorForMode(visual, baseVector, parallaxMode, lift, sign, parallax) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ANCHORED_CARD:
        return this._anchoredParallaxVector(visual, lift, sign, parallax);
      case PARALLAX_MODES.VELOCITY_CARD:
        return this._velocityParallaxVector(visual, lift, sign, parallax);
      case PARALLAX_MODES.ANCHORED_VELOCITY_CARD:
        return this._anchoredVelocityParallaxVector(visual, lift, sign, parallax);
      default:
        return baseVector;
    }
  }

  _anchoredParallaxVector(visual, lift, sign, parallax) {
    const focus = this._cameraFocus;
    if (!focus) return { x: 0, y: 0 };
    const state = this._parallaxStateFor(visual);
    state.anchorFocus ??= { x: focus.x, y: focus.y };
    const vector = {
      x: (focus.x - state.anchorFocus.x) * parallax * ANCHORED_CAMERA_MULTIPLIER * sign,
      y: (focus.y - state.anchorFocus.y) * parallax * ANCHORED_CAMERA_MULTIPLIER * sign
    };
    return _limitVector(vector, lift);
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

  _applyRegionTransform(displayObject, params, { includeOverlayOffset = true } = {}) {
    displayObject.pivot.set(params.center.x, params.center.y);
    displayObject.position.set(
      params.center.x + (includeOverlayOffset ? params.overlayOffset.x : 0),
      params.center.y + (includeOverlayOffset ? params.overlayOffset.y : 0)
    );
    displayObject.scale.set(params.overlayScale);
  }

  _shadowDirection(bounds, parallax, shadowMode, perspectivePoint) {
    switch (shadowMode) {
      case SHADOW_MODES.OFF:
      case SHADOW_MODES.TOP_DOWN:
      case SHADOW_MODES.TOP_DOWN_STRONG:
        return { x: 0, y: 0 };
      case SHADOW_MODES.REVERSED_RESPONSIVE: {
        const direction = parallax > 0 ? this._perspectiveDirection(bounds, perspectivePoint) : STATIC_SHADOW_DIRECTION;
        return { x: -direction.x, y: -direction.y };
      }
      case SHADOW_MODES.RESPONSIVE_ALL_AROUND:
      case SHADOW_MODES.RESPONSIVE:
      default:
        return parallax > 0 ? this._perspectiveDirection(bounds, perspectivePoint) : STATIC_SHADOW_DIRECTION;
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

  _createEdgeGlue(paths, params) {
    if (params.edgeGlueAlpha <= 0 || params.edgeGlueBlur <= 0) return null;
    const edgeGlue = this._createShadowLayer(paths, { x: 0, y: 0 }, params.edgeGlueAlpha, params.edgeGlueBlur);
    if (edgeGlue) this._applyRegionTransform(edgeGlue, params, { includeOverlayOffset: false });
    return edgeGlue;
  }

  _createSlopeLayer(paths, texture, geo, params) {
    if (!texture || params.slopeAlpha <= 0 || params.slopeWidth <= 0) return null;
    if (params.cliffWarp) return this._createCliffWarpLayer(paths, texture, geo, params);
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
    if (!texture || params.slopeWidth <= 0) return null;
    if (params.cliffWarpAlpha <= 0) return null;
    const patch = new PIXI.Container();
    patch.eventMode = "none";
    const band = new PIXI.Container();
    band.eventMode = "none";
    const transitionMask = this._createTransitionMask(paths, params.slopeWidth);
    band.mask = transitionMask;
    band.addChild(transitionMask);

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
        const alpha = params.slopeAlpha * params.slopeStretchAlpha * (0.28 + 0.72 * t) / stretchSteps;
        const stretchScale = 1 + (params.slopeStretchScale - 1) * t;
        const shift = {
          x: params.slopeTextureShift.x * t,
          y: params.slopeTextureShift.y * t
        };
        band.addChild(this._createTextureSprite(texture, geo, {
          shift,
          alpha,
          center: params.projectionCenter,
          stretchScale
        }));
      }
    }

    const steps = Math.max(1, Math.floor(params.cliffWarpSteps ?? CLIFF_WARP_LAYER_STEPS_MIN));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const eased = t * t * (3 - 2 * t);
      const alpha = params.cliffWarpAlpha * (0.55 + 0.45 * t) / steps;
      const shift = {
        x: params.cliffWarpShift.x * eased,
        y: params.cliffWarpShift.y * eased
      };
      const stretchScale = 1 + params.cliffWarpScaleDelta * eased;
      band.addChild(this._createTextureSprite(texture, geo, {
        shift,
        alpha,
        center: params.projectionCenter,
        stretchScale
      }));
    }

    patch.addChild(band);
    return patch;
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
    const overlay = new PIXI.Container();
    overlay.eventMode = "none";
    this._applyRegionTransform(overlay, params);

    if (texture) {
      const sprite = new PIXI.Sprite(texture);
      sprite.eventMode = "none";
      sprite.position.set(geo.x + params.textureShift.x, geo.y + params.textureShift.y);
      sprite.width = geo.width;
      sprite.height = geo.height;
      sprite.alpha = params.overlayAlpha;
      const mask = params.blendWidth > 0
        ? this._createFeatherMask(paths, params.blendWidth)
        : this._createMask(paths);
      sprite.mask = mask;
      overlay.addChild(mask);
      overlay.addChild(sprite);
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

  _createFeatherMask(paths, feather) {
    const bounds = _cachedPathsBounds(paths);
    if (!bounds) return this._createMask(paths);
    const padding = Math.ceil(feather * 4 + 2);
    const width = Math.ceil(bounds.width + padding * 2);
    const height = Math.ceil(bounds.height + padding * 2);
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

    const texture = this._generateTexture(maskShape, width, height);
    maskShape.destroy({ children: true });
    if (!_validTexture(texture)) {
      texture?.destroy?.(true);
      return this._createMask(paths);
    }

    const mask = new PIXI.Sprite(texture);
    mask.eventMode = "none";
    mask.position.set(bounds.minX - padding, bounds.minY - padding);
    mask.renderable = false;
    mask._seGeneratedTexture = texture;
    return mask;
  }

  _createTransitionMask(paths, width) {
    const bounds = _cachedPathsBounds(paths);
    if (!bounds) return this._createMask(paths);
    const strokeWidth = Math.max(1, width * 1.35);
    const blur = Math.max(0.5, width * TRANSITION_MASK_BLUR_RATIO);
    const padding = Math.ceil(strokeWidth + blur * 4 + 2);
    const textureWidth = Math.ceil(bounds.width + padding * 2);
    const textureHeight = Math.ceil(bounds.height + padding * 2);
    const MaskGraphics = _graphicsClass();
    const maskShape = new MaskGraphics();
    maskShape.eventMode = "none";
    maskShape.lineStyle(strokeWidth, 0xffffff, 1);
    _drawShiftedPaths(maskShape, paths, -bounds.minX + padding, -bounds.minY + padding);
    maskShape.filters = [_makeBlurFilter(blur)];
    maskShape.filterArea = new PIXI.Rectangle(0, 0, textureWidth, textureHeight);

    const texture = this._generateTexture(maskShape, textureWidth, textureHeight);
    maskShape.destroy({ children: true });
    if (!_validTexture(texture)) {
      texture?.destroy?.(true);
      return this._createFeatherMask(paths, width);
    }

    const mask = new PIXI.Sprite(texture);
    mask.eventMode = "none";
    mask.position.set(bounds.minX - padding, bounds.minY - padding);
    mask.renderable = false;
    mask._seGeneratedTexture = texture;
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

function _parallaxStrength() {
  return _parallaxStrengthForKey(_parallaxStrengthKey());
}

function _parallaxStrengthForKey(strengthKey) {
  return PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.off;
}

function _parallaxStrengthKey() {
  const strengthKey = getSceneElevationSetting(SCENE_SETTING_KEYS.PARALLAX) ?? "off";
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
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.PARALLAX_MODE) ?? PARALLAX_MODES.CARD;
  return Object.values(PARALLAX_MODES).includes(mode) ? mode : PARALLAX_MODES.CARD;
}

function _blendMode() {
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.BLEND_MODE) ?? BLEND_MODES.WIDE;
  return Object.values(BLEND_MODES).includes(mode) ? mode : BLEND_MODES.WIDE;
}

function _perspectivePointMode() {
  const point = getSceneElevationSetting(SCENE_SETTING_KEYS.PERSPECTIVE_POINT) ?? PERSPECTIVE_POINTS.CENTER;
  return Object.values(PERSPECTIVE_POINTS).includes(point) ? point : PERSPECTIVE_POINTS.CENTER;
}

function _perspectivePoint(geo, bounds = null, point = _perspectivePointMode()) {
  switch (point) {
    case PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE:
      return _clampPointToSceneEdge(getSceneElevationSetting(SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT) ?? { x: geo.x + geo.width / 2, y: geo.y }, geo);
    case PERSPECTIVE_POINTS.CAMERA_CENTER:
      return _cameraCenter(geo);
    case PERSPECTIVE_POINTS.FURTHEST_EDGE:
      return _furthestSceneEdgePoint(geo);
    case PERSPECTIVE_POINTS.NEAREST_EDGE:
      return _nearestSceneEdgePoint(geo);
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
  const scaleKey = getSceneElevationSetting(SCENE_SETTING_KEYS.OVERLAY_SCALE) ?? "off";
  return _overlayScaleStrengthForKey(scaleKey);
}

function _overlayScaleStrengthForKey(scaleKey) {
  return OVERLAY_SCALE_STRENGTHS[scaleKey] ?? OVERLAY_SCALE_STRENGTHS.off;
}

function _shadowMode() {
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.SHADOW_MODE) ?? SHADOW_MODES.TOP_DOWN;
  return Object.values(SHADOW_MODES).includes(mode) ? mode : SHADOW_MODES.TOP_DOWN;
}

function _shadowLength() {
  const value = Number(getSceneElevationSetting(SCENE_SETTING_KEYS.SHADOW_LENGTH) ?? 1);
  return Math.clamp(Number.isFinite(value) ? value : 1, 0, 8);
}

function _shadowLengthMultiplier(value) {
  if (value <= 1) return value;
  return 1 + (value - 1) * 1.35;
}

function _depthScale() {
  const scale = getSceneElevationSetting(SCENE_SETTING_KEYS.DEPTH_SCALE) ?? DEPTH_SCALES.COMPRESSED;
  return Object.values(DEPTH_SCALES).includes(scale) ? scale : DEPTH_SCALES.COMPRESSED;
}

function _sunShadowState(shadowMode, geo, bounds) {
  if (shadowMode === SHADOW_MODES.SUN_AT_EDGE) {
    const sunPoint = _clampPointToSceneEdge(getSceneElevationSetting(SCENE_SETTING_KEYS.SUN_EDGE_POINT), geo);
    return {
      direction: _directionAwayFromPoint(bounds.center, sunPoint),
      alphaMultiplier: SUN_EDGE_SHADOW_ALPHA_MULTIPLIER,
      lengthMultiplier: SUN_EDGE_SHADOW_LENGTH_MULTIPLIER,
      blurMultiplier: 1.08
    };
  }
  if (shadowMode !== SHADOW_MODES.SMALL_TIME_SUN) return null;

  const hour = _currentTimeHour();
  const sunrise = _sceneHourSetting(SCENE_SETTING_KEYS.SUNRISE_HOUR, 6, 0, 23.75);
  const sunset = _sceneHourSetting(SCENE_SETTING_KEYS.SUNSET_HOUR, 18, 0.25, 24);
  const sunPoint = _sunPointForHour(hour, sunrise, sunset, geo);
  if (!sunPoint) return {
    direction: STATIC_SHADOW_DIRECTION,
    alphaMultiplier: 0,
    lengthMultiplier: 1,
    blurMultiplier: 1
  };

  const middleY = geo.y + geo.height / 2;
  const altitude = Math.clamp((middleY - sunPoint.y) / Math.max(1, middleY - geo.y), 0, 1);
  return {
    direction: _directionAwayFromPoint(bounds.center, sunPoint),
    alphaMultiplier: 0.38 + altitude * 0.92,
    lengthMultiplier: 1.75 - altitude * 0.55,
    blurMultiplier: 1.35 - altitude * 0.18
  };
}

function _sceneHourSetting(key, fallback, min, max) {
  const value = Number(getSceneElevationSetting(key) ?? fallback);
  return Math.clamp(Number.isFinite(value) ? value : fallback, min, max);
}

function _sunPointForHour(hour, sunrise, sunset, geo) {
  if (!Number.isFinite(hour) || sunset <= sunrise) return null;
  if (hour < sunrise || hour > sunset) return null;

  const noon = 12;
  const leftX = geo.x;
  const centerX = geo.x + geo.width / 2;
  const rightX = geo.x + geo.width;
  const topY = geo.y;
  const middleY = geo.y + geo.height / 2;
  if (sunrise < noon && sunset > noon) {
    if (hour <= noon) {
      const progress = Math.clamp((hour - sunrise) / Math.max(0.25, noon - sunrise), 0, 1);
      return {
        x: rightX + (centerX - rightX) * progress,
        y: middleY + (topY - middleY) * progress
      };
    }
    const progress = Math.clamp((hour - noon) / Math.max(0.25, sunset - noon), 0, 1);
    return {
      x: centerX + (leftX - centerX) * progress,
      y: topY + (middleY - topY) * progress
    };
  }

  const progress = Math.clamp((hour - sunrise) / Math.max(0.25, sunset - sunrise), 0, 1);
  return {
    x: rightX + (leftX - rightX) * progress,
    y: middleY - Math.sin(progress * Math.PI) * (middleY - topY)
  };
}

function _directionAwayFromPoint(center, sourcePoint) {
  const dx = center.x - sourcePoint.x;
  const dy = center.y - sourcePoint.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 1) return STATIC_SHADOW_DIRECTION;
  return { x: dx / distance, y: dy / distance };
}

function _currentTimeHour() {
  const smallTime = game.modules.get("smalltime") ?? game.modules.get("small-time");
  const api = smallTime?.active ? smallTime.api : null;
  const candidates = [];
  for (const methodName of ["getTime", "getCurrentTime", "getCurrentTimeOfDay", "currentTime"]) {
    const member = api?.[methodName];
    if (typeof member === "function") {
      try { candidates.push(member.call(api)); } catch (err) {}
    }
  }
  for (const propertyName of ["time", "currentTime", "current", "clock", "timeOfDay"]) {
    if (api?.[propertyName] !== undefined) candidates.push(api[propertyName]);
  }
  candidates.push(game.time?.worldTime);
  for (const candidate of candidates) {
    const hour = _extractHour(candidate);
    if (Number.isFinite(hour)) return hour;
  }
  return 12;
}

function _extractHour(value, depth = 0) {
  if (value === null || value === undefined || depth > 3) return null;
  if (typeof value === "number") return _numberToHour(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return _numberToHour(Number(trimmed));
    const timeMatch = trimmed.match(/\b(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      const suffix = timeMatch[3]?.toLowerCase();
      let hour = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] ?? 0);
      if (suffix === "pm" && hour < 12) hour += 12;
      else if (suffix === "am" && hour === 12) hour = 0;
      if (Number.isFinite(hour) && Number.isFinite(minutes)) return ((hour + minutes / 60) % 24 + 24) % 24;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? _numberToHour(numeric) : null;
  }
  if (value instanceof Date) return value.getHours() + value.getMinutes() / 60;
  if (typeof value !== "object") return null;

  const hourValue = value.hour ?? value.hours ?? value.h;
  if (Number.isFinite(Number(hourValue))) {
    const minutes = Number(value.minute ?? value.minutes ?? value.m ?? 0);
    return ((Number(hourValue) + (Number.isFinite(minutes) ? minutes : 0) / 60) % 24 + 24) % 24;
  }
  for (const key of ["time", "current", "clock", "worldTime", "seconds", "totalSeconds", "value"]) {
    const hour = _extractHour(value[key], depth + 1);
    if (Number.isFinite(hour)) return hour;
  }
  return null;
}

function _numberToHour(value) {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) > 24) return ((value / 3600) % 24 + 24) % 24;
  return ((value % 24) + 24) % 24;
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
  return [PERSPECTIVE_POINTS.CAMERA_CENTER, PERSPECTIVE_POINTS.FURTHEST_EDGE, PERSPECTIVE_POINTS.NEAREST_EDGE].includes(getSceneElevationSetting(SCENE_SETTING_KEYS.PERSPECTIVE_POINT));
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
