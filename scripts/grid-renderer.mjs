import { MODULE_ID, SETTINGS, ELEVATED_GRID_MODES, elevatedGridModeValue } from "./config.mjs";

const REGION_CONTAINER_Z_INDEX = 10_000;
export const ELEVATED_GRID_Z_INDEX = REGION_CONTAINER_Z_INDEX + 2;
export const ELEVATED_GRID_SORT = 1_000_000;
export const ELEVATED_GRID_COLOR = 0x000000;
export const ELEVATED_GUIDE_COLOR = 0x00a2ff;

const ELEVATED_GRID_MIN_ALPHA = 0.28;
const ELEVATED_GRID_MAX_ALPHA = 0.7;

export function elevatedGridMode() {
  try { return elevatedGridModeValue(game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID)); }
  catch (err) { return ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID; }
}

export function showElevatedGridEnabled(mode = elevatedGridMode()) {
  return mode !== ELEVATED_GRID_MODES.OFF;
}

export function canvasDisplayLineWidth(pixels = 1) {
  const scale = Number(canvas.stage?.scale?.x ?? 1) || 1;
  return Math.max(0.35, pixels / Math.abs(scale));
}

export function sceneGridSize() {
  const size = Number(canvas.grid?.size ?? canvas.scene?.grid?.size ?? 100);
  return Number.isFinite(size) && size > 0 ? size : 100;
}

export function sceneGridAlpha({ clamp = true } = {}) {
  const raw = Number(canvas.scene?.grid?.alpha ?? canvas.scene?.gridAlpha ?? canvas.grid?.alpha ?? 0.45);
  const alpha = Number.isFinite(raw) ? raw : 0.45;
  return clamp ? Math.clamp(alpha, ELEVATED_GRID_MIN_ALPHA, ELEVATED_GRID_MAX_ALPHA) : Math.clamp(alpha, 0, 1);
}

export function sceneGridColor() {
  return parseColor(canvas.scene?.grid?.color ?? canvas.scene?.gridColor ?? ELEVATED_GRID_COLOR, ELEVATED_GRID_COLOR);
}

export function sceneGridThickness() {
  const raw = Number(canvas.scene?.grid?.thickness ?? canvas.scene?.gridWidth ?? 1);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function sceneGridOffset(gridSize = sceneGridSize()) {
  const grid = canvas.scene?.grid ?? {};
  const x = Number(grid.offsetX ?? grid.offset?.x ?? canvas.scene?.gridOffsetX ?? 0);
  const y = Number(grid.offsetY ?? grid.offset?.y ?? canvas.scene?.gridOffsetY ?? 0);
  return {
    x: Number.isFinite(x) ? x % gridSize : 0,
    y: Number.isFinite(y) ? y % gridSize : 0
  };
}

export function sceneGridLineMode() {
  const sceneGrid = canvas.scene?.grid ?? {};
  const canvasGrid = canvas.grid ?? {};
  const candidates = [
    sceneGrid.style,
    sceneGrid.lineStyle,
    sceneGrid.gridStyle,
    canvas.scene?.gridStyle,
    canvas.scene?.gridLineStyle,
    canvasGrid.style,
    canvasGrid.lineStyle,
    canvasGrid.gridStyle,
    canvasGrid.options?.style,
    canvasGrid.options?.lineStyle,
    canvasGrid.options?.gridStyle
  ];
  for (const candidate of candidates) {
    const mode = gridLineModeFromValue(candidate);
    if (mode) return mode;
  }
  return "solid";
}

function gridLineModeFromValue(value) {
  if (value === undefined || value === null || value === "") return null;
  const constants = CONST.GRID_STYLES ?? {};
  for (const [name, constantValue] of Object.entries(constants)) {
    if (value === constantValue) return gridLineModeFromText(name);
  }
  if (typeof value === "object") return gridLineModeFromValue(value.type ?? value.name ?? value.id ?? value.value);
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return "solid";
    if (numeric === 1) return "dashed";
    if (numeric === 2 || numeric === 3) return "dotted";
  }
  return gridLineModeFromText(value);
}

function gridLineModeFromText(value) {
  const text = String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (!text) return null;
  if (text.includes("none") || text.includes("hidden")) return "none";
  if (text.includes("dash")) return "dashed";
  if (text.includes("dot") || text.includes("point")) return "dotted";
  if (text.includes("solid") || text.includes("line")) return "solid";
  return null;
}

export function sceneGridIsSquareLike() {
  const type = sceneGridType();
  const square = CONST.GRID_TYPES?.SQUARE ?? 1;
  if (type === square || type === undefined || type === null || type === "") return true;
  return String(type).toLowerCase().includes("square");
}

function sceneGridType() {
  return canvas.scene?.grid?.type ?? canvas.scene?.gridType ?? CONST.GRID_TYPES?.SQUARE ?? 1;
}

function parseColor(value, fallback) {
  if (Number.isFinite(Number(value))) return Number(value);
  const text = String(value ?? "").trim();
  const match = text.match(/^#?([0-9a-f]{6})$/i);
  return match ? Number.parseInt(match[1], 16) : fallback;
}

export function sceneGridStyle({ elevated = false } = {}) {
  return {
    gridSize: sceneGridSize(),
    offset: sceneGridOffset(),
    color: elevated ? ELEVATED_GRID_COLOR : sceneGridColor(),
    alpha: elevated ? sceneGridAlpha() : sceneGridAlpha({ clamp: false }),
    lineWidth: canvasDisplayLineWidth(sceneGridThickness()),
    lineMode: sceneGridLineMode()
  };
}

export function applyGridLineStyle(graphics, style) {
  const cap = style?.lineMode === "dotted"
    ? PIXI.LINE_CAP?.ROUND ?? undefined
    : PIXI.LINE_CAP?.BUTT ?? undefined;
  graphics.lineStyle(style.lineWidth, style.color, style.alpha, 0.5, false, PIXI.LINE_JOIN?.MITER ?? undefined, cap);
}
