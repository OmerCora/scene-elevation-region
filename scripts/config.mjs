/** Scene Elevation — module-wide constants and helpers. */

export const MODULE_ID = "scene-elevation";

export const FLAGS = {
  /** Per-scene elevation grid: { cols, rows, points: number[] } */
  GRID: "grid"
};

export const SETTINGS = {
  PARALLAX: "parallaxStrength",
  TOKEN_SCALE_ENABLED: "tokenScaleEnabled",
  TOKEN_SCALE_MAX: "tokenScaleMax",
  /** Client: show overlay automatically when elevation tool active. */
  SHOW_OVERLAY: "showOverlay",
  /** Client: zoom threshold for switching dense ↔ sparse overlay. */
  LOD_THRESHOLD: "lodThreshold"
};

/** Parallax strength values keyed by enum option. */
export const PARALLAX_STRENGTHS = Object.freeze({
  subtle: 0.05,
  medium: 0.10,
  strong: 0.20
});

/** Brush bounds. */
export const BRUSH = Object.freeze({
  SIZE_MIN: 0.5,
  SIZE_MAX: 12,
  HEIGHT_MIN: -10,
  HEIGHT_MAX: 10,
  FADE_MIN: 0,
  FADE_MAX: 100
});

/** Brush operation modes. */
export const BRUSH_OPS = Object.freeze({
  RAISE: "raise",   // add height (positive only at center)
  LOWER: "lower",   // subtract height
  SET:   "set",     // set absolute height (no double-apply during stroke)
  SMOOTH: "smooth"  // blend each point toward the local 9-neighbour mean
});

/** Default brush state (per client, in-memory). */
export const DEFAULT_BRUSH = Object.freeze({
  size: 2,        // grid squares (radius)
  height: 1,      // elevation units (always stored positive; LOWER inverts)
  fade: 50,       // %
  op: "raise"     // one of BRUSH_OPS
});

/** Wall flag keys (used by elevated-wall thickness contributions). */
export const WALL_FLAGS = Object.freeze({
  THICKNESS: "thickness", // grid squares wide on each side of the wall
  HEIGHT:    "wallHeight",    // elevation value at the wall line
  FADE:      "wallFade"       // 0..100 falloff to outer edge
});

/** Region behavior subtype id (declared in module.json). */
export const REGION_BEHAVIOR_TYPE = `${MODULE_ID}.elevation`;

/** Default LOD threshold — scale below which we show one dot per cell only. */
export const LOD_THRESHOLD_DEFAULT = 0.6;

/** Half-grid index helper (cols/rows are full grid cells). */
export function hIndex(hx, hy, cols) {
  return hy * (cols * 2 + 1) + hx;
}

export function hDims(cols, rows) {
  return { hCols: cols * 2 + 1, hRows: rows * 2 + 1 };
}

export function logger(...args) {
  console.log(`[${MODULE_ID}]`, ...args);
}
