import { getSystemTokenVisualState } from "./systems/index.mjs";

const SYSTEM_TOKEN_FLIGHT_MOTION_GRID_FRACTION = 0.025;
const SYSTEM_TOKEN_FLIGHT_MOTION_MIN_PIXELS = 1.5;
const SYSTEM_TOKEN_BURROW_ALPHA_FACTOR = 0.72;
const SYSTEM_TOKEN_BURROW_TINT = 0xb18455;

export function applySystemTokenVisualState(token, { gridSize = 100, queueAnimation = null } = {}) {
  const mesh = token?.mesh;
  if (!mesh || mesh.destroyed) return;
  const state = getSystemTokenVisualState(token.document);
  if (state?.burrowing) _applySystemTokenBurrowVisual(token);
  else _clearSystemTokenBurrowVisual(token);
  if (state?.flying) {
    _applySystemTokenFlyingMotion(token, { gridSize });
    queueAnimation?.();
  } else {
    _restoreSystemTokenMotion(token);
  }
}

export function clearSystemTokenVisualState(token) {
  _restoreSystemTokenMotion(token);
  _clearSystemTokenBurrowVisual(token);
}

export function restoreSystemTokenMotion(token) {
  _restoreSystemTokenMotion(token);
}

export function applyAnimatedSystemTokenVisuals(tokens, now = performance.now(), { gridSize = 100 } = {}) {
  let anyFlying = false;
  for (const token of tokens ?? []) {
    const state = getSystemTokenVisualState(token.document);
    if (state?.burrowing) _applySystemTokenBurrowVisual(token);
    else _clearSystemTokenBurrowVisual(token);
    if (state?.flying) {
      anyFlying = true;
      _applySystemTokenFlyingMotion(token, { now, gridSize });
    } else {
      _restoreSystemTokenMotion(token);
    }
  }
  return anyFlying;
}

function _applySystemTokenBurrowVisual(token) {
  const mesh = token?.mesh;
  if (!mesh || mesh.destroyed) return;
  if (mesh._seSystemBurrowBaseAlpha === undefined) mesh._seSystemBurrowBaseAlpha = mesh.alpha;
  if (mesh._seSystemBurrowBaseTint === undefined && "tint" in mesh && mesh.tint !== SYSTEM_TOKEN_BURROW_TINT) {
    mesh._seSystemBurrowBaseTint = mesh.tint;
  }
  const baseAlpha = Number(mesh._seSystemBurrowBaseAlpha ?? 1);
  mesh.alpha = Math.clamp((Number.isFinite(baseAlpha) ? baseAlpha : 1) * SYSTEM_TOKEN_BURROW_ALPHA_FACTOR, 0.15, 1);
  if ("tint" in mesh) mesh.tint = SYSTEM_TOKEN_BURROW_TINT;
}

function _clearSystemTokenBurrowVisual(token) {
  const mesh = token?.mesh;
  if (!mesh) return;
  if (mesh._seSystemBurrowBaseAlpha !== undefined) mesh.alpha = mesh._seSystemBurrowBaseAlpha;
  if (mesh._seSystemBurrowBaseTint !== undefined && "tint" in mesh) mesh.tint = mesh._seSystemBurrowBaseTint;
  else if ("tint" in mesh && mesh.tint === SYSTEM_TOKEN_BURROW_TINT) mesh.tint = 0xFFFFFF;
  delete mesh._seSystemBurrowBaseAlpha;
  delete mesh._seSystemBurrowBaseTint;
}

function _applySystemTokenFlyingMotion(token, { now = performance.now(), gridSize = 100 } = {}) {
  const mesh = token?.mesh;
  if (!mesh || mesh.destroyed || !mesh.pivot || !mesh.scale) return;
  const seed = _systemTokenAnimationSeed(token);
  const phase = (now / 1000) + seed;
  const gridMotion = Math.max(SYSTEM_TOKEN_FLIGHT_MOTION_MIN_PIXELS, gridSize * SYSTEM_TOKEN_FLIGHT_MOTION_GRID_FRACTION);
  const offsetX = Math.sin(phase * Math.PI * 2 / 3.8) * gridMotion;
  const offsetY = Math.cos(phase * Math.PI * 2 / 3.1) * gridMotion * 0.7;
  const sx = mesh.scale.x || 1;
  const sy = mesh.scale.y || 1;
  if (mesh._seSystemMotionBasePivotX === undefined) {
    mesh._seSystemMotionBasePivotX = mesh.pivot.x;
    mesh._seSystemMotionBasePivotY = mesh.pivot.y;
  }
  mesh.pivot.set(
    mesh._seSystemMotionBasePivotX - offsetX / sx,
    mesh._seSystemMotionBasePivotY - offsetY / sy
  );
}

function _resolveSystemTokenElevationScale(mesh) {
  if (!mesh) return null;
  const baseX = Number(mesh._seBaseScaleX);
  const baseY = Number(mesh._seBaseScaleY);
  if (!Number.isFinite(baseX) || !Number.isFinite(baseY)) return null;
  const factor = Number.isFinite(mesh._seLastFactor) && mesh._seLastFactor !== 0 ? mesh._seLastFactor : 1;
  const sgnX = Math.sign(baseX) || 1;
  const sgnY = Math.sign(baseY) || 1;
  return { x: Math.abs(baseX) * factor * sgnX, y: Math.abs(baseY) * factor * sgnY };
}

function _restoreSystemTokenMotion(token) {
  const mesh = token?.mesh;
  if (!mesh) return;
  const elevBase = _resolveSystemTokenElevationScale(mesh);
  if (elevBase) {
    mesh.scale?.set?.(elevBase.x, elevBase.y);
  } else if (Number.isFinite(mesh._seSystemMotionLastScaleMul) && mesh._seSystemMotionLastScaleMul !== 0) {
    const inv = 1 / mesh._seSystemMotionLastScaleMul;
    mesh.scale?.set?.(mesh.scale.x * inv, mesh.scale.y * inv);
  }
  if (mesh._seSystemMotionBasePivotX !== undefined && mesh._seSystemMotionBasePivotY !== undefined) {
    mesh.pivot?.set?.(mesh._seSystemMotionBasePivotX, mesh._seSystemMotionBasePivotY);
  }
  delete mesh._seSystemMotionBaseScaleX;
  delete mesh._seSystemMotionBaseScaleY;
  delete mesh._seSystemMotionBasePivotX;
  delete mesh._seSystemMotionBasePivotY;
  delete mesh._seSystemMotionLastScaleMul;
  delete mesh._seSystemMotionTargets;
}

function _systemTokenAnimationSeed(token) {
  const text = String(token?.document?.id ?? token?.id ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  return Math.abs(hash % 1000) / 1000;
}