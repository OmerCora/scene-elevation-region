/** Scene Elevation — module-wide constants and helpers. */

export const MODULE_ID = "scene-elevation-region";

export const SETTINGS = {
  PARALLAX: "parallaxStrength",
  PARALLAX_MODE: "parallaxMode",
  PERSPECTIVE_POINT: "perspectivePoint",
  BLEND_MODE: "overlayBlendMode",
  OVERLAY_SCALE: "overlayScale",
  SHADOW_MODE: "shadowMode",
  SHOW_ELEVATION_REGIONS: "showElevationRegions",
  TOKEN_SCALE_ENABLED: "tokenScaleEnabled",
  TOKEN_SCALE_MAX: "tokenScaleMax"
};

/** Parallax strength values keyed by enum option. */
export const PARALLAX_STRENGTHS = Object.freeze({
  off: 0,
  verySubtle: 0.018,
  subtle: 0.04,
  medium: 0.085,
  strong: 0.15
});

export const PERSPECTIVE_POINTS = Object.freeze({
  CENTER: "center",
  TOP_LEFT: "topLeft",
  TOP_RIGHT: "topRight",
  BOTTOM_LEFT: "bottomLeft",
  BOTTOM_RIGHT: "bottomRight",
  REGION_CENTER: "regionCenter",
  REGION_TOP_LEFT: "regionTopLeft",
  REGION_TOP_RIGHT: "regionTopRight",
  REGION_BOTTOM_LEFT: "regionBottomLeft",
  REGION_BOTTOM_RIGHT: "regionBottomRight"
});

export const PARALLAX_MODES = Object.freeze({
  SLOPE_ONLY: "slopeOnly",
  HYBRID: "hybrid",
  ANCHORED: "anchored",
  EDGE_BLEND: "edgeBlend",
  CARD: "card",
  SHADOW: "shadow"
});

export const SHADOW_MODES = Object.freeze({
  RESPONSIVE: "responsive",
  FIXED_VISIBLE: "fixedVisible",
  TOP_DOWN: "topDown"
});

export const BLEND_MODES = Object.freeze({
  OFF: "off",
  SOFT: "soft",
  WIDE: "wide",
  DEPTH_LIP: "depthLip",
  SLOPE: "slope",
  Z_BRIDGE: "zBridge"
});

export const OVERLAY_SCALE_STRENGTHS = Object.freeze({
  off: 0,
  subtle: 0.015,
  medium: 0.035,
  strong: 0.06
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

export function logger(...args) {
  console.log(`[${MODULE_ID}]`, ...args);
}
