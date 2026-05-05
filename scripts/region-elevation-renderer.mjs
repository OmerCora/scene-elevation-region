import { MODULE_ID, SETTINGS, PARALLAX_STRENGTHS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, OVERLAY_SCALE_STRENGTHS, REGION_BEHAVIOR_TYPE, SHADOW_STRENGTH_LIMITS, sceneGeometry } from "./config.mjs";

const MIN_ELEVATION_DELTA = 0.05;
const OVERLAY_ELEVATION_REFERENCE = 6;
const OVERLAY_LIFT_BASE = 0.045;
const OVERLAY_LIFT_PARALLAX = 0.12;
const OVERLAY_LIFT_MAX_GRID = 0.35;
const OVERLAY_LIFT_MAX_PIXELS = 28;
const TEXTURE_SHIFT_MULTIPLIER = 0.58;
const HYBRID_CARD_LIFT_RATIO = 0.28;
const HYBRID_TEXTURE_SHIFT_RATIO = 0.5;
const EDGE_BLEND_TEXTURE_SHIFT_RATIO = 0.55;
const EDGE_BLEND_WIDTH_MIN = 2;
const EDGE_BLEND_WIDTH_GRID_RATIO = 0.028;
const EDGE_BLEND_WIDTH_ELEVATION_RATIO = 0.018;
const EDGE_BLEND_WIDTH_PARALLAX_BONUS = 8;
const EDGE_BLEND_WIDTH_MAX = 8;
const EDGE_GLUE_ALPHA_MAX = 0.45;
const SLOPE_TEXTURE_ALPHA_MAX = 0.72;
const SLOPE_DROP_MIN_PIXELS = 5;
const SLOPE_DROP_MAX_PIXELS = 14;
const SLOPE_STRETCH_STEPS = 6;
const SLOPE_STRETCH_SCALE_MIN = 1.006;
const SLOPE_STRETCH_SCALE_MAX = 1.075;
const Z_BRIDGE_STEPS = 11;
const Z_BRIDGE_DROP_MAX_PIXELS = 18;
const Z_BRIDGE_SCALE_MIN = 1.008;
const Z_BRIDGE_SCALE_MAX = 1.12;
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

const BLEND_PROFILE_CONFIGS = Object.freeze({
  [BLEND_MODES.OFF]: Object.freeze({
    widthMultiplier: 0,
    widthAdd: 0,
    maxWidth: 0,
    textureShiftRatio: EDGE_BLEND_TEXTURE_SHIFT_RATIO,
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
    maxWidth: EDGE_BLEND_WIDTH_MAX,
    textureShiftRatio: EDGE_BLEND_TEXTURE_SHIFT_RATIO,
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
  [BLEND_MODES.DEPTH_LIP]: Object.freeze({
    widthMultiplier: 1.2,
    widthAdd: 1,
    maxWidth: 11,
    textureShiftRatio: 0.68,
    overlayAlpha: 0.985,
    glueAlpha: 0.16,
    glueBlurMultiplier: 0.68,
    slopeAlpha: 0,
    slopeWidthMultiplier: 0,
    slopeTextureShiftRatio: 0,
    slopeDropPixels: 0
  }),
  [BLEND_MODES.SLOPE]: Object.freeze({
    widthMultiplier: 2.15,
    widthAdd: 6,
    maxWidth: 30,
    textureShiftRatio: 0.5,
    overlayAlpha: 0.985,
    glueAlpha: 0.12,
    glueBlurMultiplier: 0.36,
    slopeAlpha: 0.72,
    slopeWidthMultiplier: 2.2,
    slopeTextureShiftRatio: 0.42,
    slopeDropPixels: 12,
    dropMaxPixels: SLOPE_DROP_MAX_PIXELS,
    stretchAlpha: 0.86,
    stretchSteps: SLOPE_STRETCH_STEPS,
    bridgeBaseAlpha: 0
  }),
  [BLEND_MODES.Z_BRIDGE]: Object.freeze({
    widthMultiplier: 2.65,
    widthAdd: 9,
    maxWidth: 46,
    textureShiftRatio: 0.38,
    overlayAlpha: 0.998,
    glueAlpha: 0.22,
    glueBlurMultiplier: 0.18,
    slopeAlpha: 0.86,
    slopeWidthMultiplier: 2.75,
    slopeTextureShiftRatio: 0.24,
    slopeDropPixels: 16,
    dropMaxPixels: Z_BRIDGE_DROP_MAX_PIXELS,
    stretchAlpha: 1,
    stretchSteps: Z_BRIDGE_STEPS,
    bridgeBaseAlpha: 0.62
  })
});

export function getActiveElevationRegions(scene = canvas?.scene) {
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
    entries.push({
      region,
      behavior,
      elevation,
      shadowStrength: Math.clamp(Number.isFinite(shadowStrength) ? shadowStrength : SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX),
      area: _regionArea(region),
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

function _regionContains(region, point) {
  try {
    return !!region.testPoint?.({ x: point.x, y: point.y, elevation: point.elevation ?? 0 });
  } catch (err) {
    return false;
  }
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

function _regionArea(region) {
  const paths = _regionPaths(region);
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
    this._panRaf = null;
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
    this.container = null;
    this.mask = null;
    this._scene = null;
    this._entries = [];
    this._cameraFocus = null;
  }

  update() {
    if (!this.container || !this._scene) return;
    this._entries = this._visualEntries(this._scene);
    this.container.visible = this._entries.length > 0;
    this._updateCameraFocus(true);
    this._drawRegions();
  }

  onPan() {
    if (!this.container?.visible) return;
    if (!_parallaxEnabled()) return;
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      if (this._updateCameraFocus(false)) this._drawRegions();
    });
  }

  resetPanOrigin() {
    this._updateCameraFocus(true);
    this._drawRegions();
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
    if (changed) this._cameraFocus = next;
    return changed;
  }

  _visualEntries(scene) {
    const visuals = getActiveElevationRegions(scene)
      .map(entry => ({ entry, paths: _regionPaths(entry.region) }))
      .filter(visual => visual.paths.length && Math.abs(visual.entry.elevation) >= MIN_ELEVATION_DELTA)
      .map(visual => ({ ...visual, bounds: _pathsBounds(visual.paths) }))
      .filter(visual => visual.bounds)
      .map(visual => this._withNearestLowerLayer(visual))
      .sort((left, right) => {
        const elevation = left.entry.elevation - right.entry.elevation;
        if (Math.abs(elevation) > 0.001) return elevation;
        return (right.entry.area || 0) - (left.entry.area || 0);
      });
    return visuals;
  }

  _withNearestLowerLayer(visual) {
    let lowerElevation = 0;
    let lowerArea = Infinity;
    const point = visual.bounds.center;
    for (const candidate of getActiveElevationRegions(this._scene)) {
      if (candidate.region === visual.entry.region) continue;
      if (candidate.elevation >= visual.entry.elevation) continue;
      if (!_regionContains(candidate.region, point)) continue;
      const area = candidate.area || Infinity;
      if (candidate.elevation > lowerElevation || (candidate.elevation === lowerElevation && area < lowerArea)) {
        lowerElevation = candidate.elevation;
        lowerArea = area;
      }
    }
    return {
      ...visual,
      lowerElevation,
      elevationDelta: visual.entry.elevation - lowerElevation
    };
  }

  _drawRegions() {
    this._clearRegionChildren();
    if (!this.container || !this._entries.length) return;

    const geo = sceneGeometry(this._scene);
    const texture = this._backgroundTexture();
    const parallax = _parallaxStrength();
    const parallaxMode = _parallaxMode();
    const blendMode = _blendMode();
    const overlayScaleStrength = _overlayScaleStrength();
    const shadowMode = _shadowMode();
    for (const visual of this._entries) {
      const perspectivePoint = _perspectivePoint(geo, visual.bounds);
      const params = this._regionVisualParameters(visual, geo, parallax, parallaxMode, blendMode, overlayScaleStrength, shadowMode, perspectivePoint);
      if (!params.isHole) {
        const shadow = this._createShadow(visual.paths, params);
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

  _regionVisualParameters(visual, geo, parallax, parallaxMode, blendMode, overlayScaleStrength, shadowMode, perspectivePoint) {
    const gridSize = geo.gridSize;
    const { entry, bounds } = visual;
    const magnitude = Math.min(Math.abs(entry.elevation), OVERLAY_ELEVATION_REFERENCE);
    const normalized = Math.clamp(Math.sqrt(magnitude / OVERLAY_ELEVATION_REFERENCE), 0.1, 1);
    const deltaMagnitude = Math.min(Math.abs(visual.elevationDelta ?? entry.elevation), OVERLAY_ELEVATION_REFERENCE);
    const transitionNormalized = Math.clamp(Math.sqrt(deltaMagnitude / OVERLAY_ELEVATION_REFERENCE), 0.1, 1);
    const isHole = entry.elevation < 0;
    const parallaxDirection = parallax > 0 ? this._perspectiveDirection(bounds, perspectivePoint) : STATIC_SHADOW_DIRECTION;
    const blendDirection = parallax > 0 ? parallaxDirection : STATIC_SHADOW_DIRECTION;
    const shadowDirection = this._shadowDirection(bounds, parallax, shadowMode, perspectivePoint);
    const sign = isHole ? -1 : 1;
    const overlayScaleDelta = !isHole ? normalized * overlayScaleStrength : 0;
    const overlayScale = 1 + overlayScaleDelta;
    const lift = Math.clamp(
      Math.sqrt(Math.max(0.1, Math.abs(entry.elevation))) * gridSize * (OVERLAY_LIFT_BASE + parallax * OVERLAY_LIFT_PARALLAX),
      0,
      Math.min(OVERLAY_LIFT_MAX_PIXELS, gridSize * OVERLAY_LIFT_MAX_GRID)
    );
    const parallaxVector = parallax > 0 ? { x: parallaxDirection.x * lift * sign, y: parallaxDirection.y * lift * sign } : { x: 0, y: 0 };
    const overlayOffset = this._overlayOffsetForMode(parallaxVector, parallaxMode);
    const blendProfile = this._blendProfile(blendMode);
    const textureShift = this._textureShiftForMode(parallaxVector, parallaxMode, blendProfile);
    const transitionShift = this._transitionShiftForMode(parallaxVector, parallaxMode, blendProfile);
    const softShadowOffset = {
      x: shadowDirection.x * lift * SHADOW_OFFSET_MULTIPLIER * sign,
      y: shadowDirection.y * lift * SHADOW_OFFSET_MULTIPLIER * sign
    };
    const contactShadowOffset = {
      x: shadowDirection.x * lift * CONTACT_SHADOW_OFFSET_MULTIPLIER * sign,
      y: shadowDirection.y * lift * CONTACT_SHADOW_OFFSET_MULTIPLIER * sign
    };
    const shadowStrength = Math.clamp(entry.shadowStrength ?? SHADOW_STRENGTH_LIMITS.DEFAULT, SHADOW_STRENGTH_LIMITS.MIN, SHADOW_STRENGTH_LIMITS.MAX);
    const blendWidth = this._blendWidth(gridSize, transitionNormalized, parallax, blendProfile);
    const edgeGlueAlpha = blendWidth > 0
      ? Math.clamp(blendProfile.glueAlpha * shadowStrength * (0.65 + transitionNormalized * 0.35), 0, EDGE_GLUE_ALPHA_MAX)
      : 0;
    const slopeWidth = blendWidth > 0 ? Math.clamp(blendWidth * blendProfile.slopeWidthMultiplier, 0, blendProfile.maxWidth * 1.9) : 0;
    const slopeDropMaxPixels = Number(blendProfile.dropMaxPixels ?? SLOPE_DROP_MAX_PIXELS);
    const slopeDropPixels = Math.clamp(blendProfile.slopeDropPixels * (0.75 + transitionNormalized * 0.25), SLOPE_DROP_MIN_PIXELS, slopeDropMaxPixels);
    const slopeStretchPixels = slopeWidth > 0 ? Math.clamp(slopeDropPixels + blendWidth * 0.35, SLOPE_DROP_MIN_PIXELS, slopeDropMaxPixels) : 0;
    const slopeStretchScale = slopeWidth > 0
      ? Math.clamp(
        1 + (slopeStretchPixels * 2) / Math.max(bounds.width, bounds.height, gridSize),
        blendProfile.bridgeBaseAlpha ? Z_BRIDGE_SCALE_MIN : SLOPE_STRETCH_SCALE_MIN,
        blendProfile.bridgeBaseAlpha ? Z_BRIDGE_SCALE_MAX : SLOPE_STRETCH_SCALE_MAX
      )
      : 1;
    const slopeTextureShift = slopeWidth > 0
      ? {
        x: transitionShift.x * blendProfile.slopeTextureShiftRatio + blendDirection.x * slopeDropPixels * sign,
        y: transitionShift.y * blendProfile.slopeTextureShiftRatio + blendDirection.y * slopeDropPixels * sign
      }
      : { x: 0, y: 0 };
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
    return {
      isHole,
      center: bounds.center,
      projectionCenter: blendProfile.bridgeBaseAlpha ? perspectivePoint : bounds.center,
      overlayScale,
      overlayOffset,
      textureShift,
      transitionShift,
      blendWidth,
      slopeWidth,
      slopeTextureShift,
      slopeAlpha: slopeWidth > 0 ? Math.clamp(blendProfile.slopeAlpha * shadowStrength * (0.62 + transitionNormalized * 0.38), 0, SLOPE_TEXTURE_ALPHA_MAX) : 0,
      slopeStretchScale,
      slopeStretchSteps: slopeWidth > 0 ? Math.max(0, Number(blendProfile.stretchSteps ?? 0)) : 0,
      slopeStretchAlpha: slopeWidth > 0 ? Math.clamp((blendProfile.stretchAlpha ?? 0) * (0.72 + transitionNormalized * 0.28), 0, 1) : 0,
      bridgeBaseAlpha: slopeWidth > 0 ? Math.clamp((blendProfile.bridgeBaseAlpha ?? 0) * (0.68 + transitionNormalized * 0.32), 0, 1) : 0,
      overlayAlpha: blendWidth > 0 ? blendProfile.overlayAlpha : 1,
      edgeGlueAlpha,
      edgeGlueBlur: Math.clamp(blendWidth * blendProfile.glueBlurMultiplier, 0, blendWidth * 1.7),
      softShadowOffset,
      contactShadowOffset,
      innerShadowOffset: {
        x: shadowDirection.x * lift * INNER_SHADOW_OFFSET_MULTIPLIER,
        y: shadowDirection.y * lift * INNER_SHADOW_OFFSET_MULTIPLIER
      },
      innerShadowWidth,
      innerContactWidth: Math.max(4, innerShadowWidth * 0.62),
      innerShadowAlpha: Math.clamp((INNER_SHADOW_ALPHA_BASE + normalized * INNER_SHADOW_ALPHA_ELEVATION) * shadowStrength, 0, INNER_SHADOW_ALPHA_MAX),
      innerContactAlpha: Math.clamp((INNER_CONTACT_ALPHA_BASE + normalized * INNER_CONTACT_ALPHA_ELEVATION) * shadowStrength, 0, INNER_SHADOW_ALPHA_MAX),
      innerShadowBlur,
      innerContactBlur: Math.max(2, innerShadowBlur * 0.48),
      softShadowAlpha: Math.clamp((SOFT_SHADOW_ALPHA_BASE + normalized * SOFT_SHADOW_ALPHA_ELEVATION) * shadowStrength, 0, SHADOW_ALPHA_MAX),
      contactShadowAlpha: Math.clamp((CONTACT_SHADOW_ALPHA_BASE + normalized * CONTACT_SHADOW_ALPHA_ELEVATION) * shadowStrength, 0, SHADOW_ALPHA_MAX),
      softShadowBlur: Math.clamp(
        gridSize * (SOFT_SHADOW_BLUR_GRID_RATIO + normalized * SOFT_SHADOW_BLUR_ELEVATION_RATIO) * (0.8 + shadowStrength * 0.16),
        SOFT_SHADOW_BLUR_MIN,
        gridSize * 0.48
      ),
      contactShadowBlur: Math.clamp(
        gridSize * (CONTACT_SHADOW_BLUR_GRID_RATIO + normalized * CONTACT_SHADOW_BLUR_ELEVATION_RATIO) * (0.85 + shadowStrength * 0.12),
        CONTACT_SHADOW_BLUR_MIN,
        gridSize * 0.16
      )
    };
  }

  _overlayOffsetForMode(parallaxVector, parallaxMode) {
    switch (parallaxMode) {
      case PARALLAX_MODES.CARD:
        return parallaxVector;
      case PARALLAX_MODES.HYBRID:
        return { x: parallaxVector.x * HYBRID_CARD_LIFT_RATIO, y: parallaxVector.y * HYBRID_CARD_LIFT_RATIO };
      case PARALLAX_MODES.SLOPE_ONLY:
      case PARALLAX_MODES.ANCHORED:
      case PARALLAX_MODES.EDGE_BLEND:
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _textureShiftForMode(parallaxVector, parallaxMode, blendProfile) {
    switch (parallaxMode) {
      case PARALLAX_MODES.ANCHORED:
        return { x: parallaxVector.x * TEXTURE_SHIFT_MULTIPLIER, y: parallaxVector.y * TEXTURE_SHIFT_MULTIPLIER };
      case PARALLAX_MODES.EDGE_BLEND:
        return { x: parallaxVector.x * blendProfile.textureShiftRatio, y: parallaxVector.y * blendProfile.textureShiftRatio };
      case PARALLAX_MODES.HYBRID:
        return { x: parallaxVector.x * HYBRID_TEXTURE_SHIFT_RATIO, y: parallaxVector.y * HYBRID_TEXTURE_SHIFT_RATIO };
      case PARALLAX_MODES.CARD:
      case PARALLAX_MODES.SLOPE_ONLY:
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _transitionShiftForMode(parallaxVector, parallaxMode, blendProfile) {
    switch (parallaxMode) {
      case PARALLAX_MODES.SLOPE_ONLY:
      case PARALLAX_MODES.EDGE_BLEND:
        return { x: parallaxVector.x * blendProfile.textureShiftRatio, y: parallaxVector.y * blendProfile.textureShiftRatio };
      case PARALLAX_MODES.ANCHORED:
        return { x: parallaxVector.x * TEXTURE_SHIFT_MULTIPLIER, y: parallaxVector.y * TEXTURE_SHIFT_MULTIPLIER };
      case PARALLAX_MODES.HYBRID:
        return { x: parallaxVector.x * HYBRID_TEXTURE_SHIFT_RATIO, y: parallaxVector.y * HYBRID_TEXTURE_SHIFT_RATIO };
      case PARALLAX_MODES.CARD:
        return { x: parallaxVector.x * HYBRID_CARD_LIFT_RATIO, y: parallaxVector.y * HYBRID_CARD_LIFT_RATIO };
      case PARALLAX_MODES.SHADOW:
      default:
        return { x: 0, y: 0 };
    }
  }

  _blendProfile(blendMode) {
    return BLEND_PROFILE_CONFIGS[blendMode] ?? BLEND_PROFILE_CONFIGS[BLEND_MODES.SLOPE];
  }

  _blendWidth(gridSize, normalized, parallax, blendProfile) {
    if (blendProfile.widthMultiplier <= 0) return 0;
    const baseWidth = gridSize * (EDGE_BLEND_WIDTH_GRID_RATIO + normalized * EDGE_BLEND_WIDTH_ELEVATION_RATIO)
      + parallax * EDGE_BLEND_WIDTH_PARALLAX_BONUS;
    return Math.clamp(
      baseWidth * blendProfile.widthMultiplier + blendProfile.widthAdd,
      EDGE_BLEND_WIDTH_MIN,
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
      case SHADOW_MODES.TOP_DOWN:
        return { x: 0, y: 0 };
      case SHADOW_MODES.FIXED_VISIBLE:
        return STATIC_SHADOW_DIRECTION;
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

  _createShadow(paths, params) {
    if (params.softShadowAlpha <= 0 && params.contactShadowAlpha <= 0) return null;
    const shadow = new PIXI.Container();
    shadow.eventMode = "none";
    const soft = this._createShadowLayer(paths, params.softShadowOffset, params.softShadowAlpha, params.softShadowBlur);
    const contact = this._createShadowLayer(paths, params.contactShadowOffset, params.contactShadowAlpha, params.contactShadowBlur);
    if (soft) shadow.addChild(soft);
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
    const layer = new PIXI.Graphics();
    layer.eventMode = "none";
    layer.lineStyle(Math.max(1, width), 0x000000, alpha);
    _drawPaths(layer, paths);
    layer.position.set(offset.x, offset.y);
    layer.filters = [_makeBlurFilter(blur)];
    layer.blendMode = PIXI.BLEND_MODES.NORMAL;
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
    const layer = new PIXI.Graphics();
    layer.eventMode = "none";
    layer.beginFill(0x000000, alpha);
    _drawPaths(layer, paths);
    layer.endFill();
    layer.position.set(offset.x, offset.y);
    layer.filters = [_makeBlurFilter(blur)];
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
    const bounds = _pathsBounds(paths);
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
    const bounds = _pathsBounds(paths);
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
  const strengthKey = game.settings.get(MODULE_ID, SETTINGS.PARALLAX) ?? "off";
  return PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.off;
}

function _parallaxMode() {
  const mode = game.settings.get(MODULE_ID, SETTINGS.PARALLAX_MODE) ?? PARALLAX_MODES.CARD;
  return Object.values(PARALLAX_MODES).includes(mode) ? mode : PARALLAX_MODES.CARD;
}

function _blendMode() {
  const mode = game.settings.get(MODULE_ID, SETTINGS.BLEND_MODE) ?? BLEND_MODES.SLOPE;
  return Object.values(BLEND_MODES).includes(mode) ? mode : BLEND_MODES.SLOPE;
}

function _perspectivePoint(geo, bounds = null) {
  const point = game.settings.get(MODULE_ID, SETTINGS.PERSPECTIVE_POINT) ?? PERSPECTIVE_POINTS.CENTER;
  switch (point) {
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
    case PERSPECTIVE_POINTS.CENTER:
    default:
      return { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
  }
}

function _overlayScaleStrength() {
  const scaleKey = game.settings.get(MODULE_ID, SETTINGS.OVERLAY_SCALE) ?? "off";
  return OVERLAY_SCALE_STRENGTHS[scaleKey] ?? OVERLAY_SCALE_STRENGTHS.off;
}

function _shadowMode() {
  const mode = game.settings.get(MODULE_ID, SETTINGS.SHADOW_MODE) ?? SHADOW_MODES.TOP_DOWN;
  return Object.values(SHADOW_MODES).includes(mode) ? mode : SHADOW_MODES.TOP_DOWN;
}

function _parallaxEnabled() {
  return _parallaxStrength() > 0;
}
