export const TOKEN_PARALLAX_HIT_AREA_EPSILON = 0.5;

export function canvasGridSize() {
  const size = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? canvas?.dimensions?.size ?? 100);
  return Number.isFinite(size) && size > 0 ? size : 100;
}

export function finitePositionValue(value, fallback) {
  if (value === null || value === undefined || value === "") return Number(fallback) || 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number(fallback) || 0;
}

export function safeTokenLivePoint(token, tokenDocument) {
  if (!token || token.destroyed) return { x: Number(tokenDocument?.x ?? 0), y: Number(tokenDocument?.y ?? 0) };
  let x;
  let y;
  try {
    if (token.position) {
      x = token.position.x;
      y = token.position.y;
    }
  } catch (_err) { /* destroyed mid-read */ }
  if (!Number.isFinite(x)) x = Number(tokenDocument?.x ?? 0);
  if (!Number.isFinite(y)) y = Number(tokenDocument?.y ?? 0);
  return { x, y };
}

export function quantizeLivePosition(value, gridSize = canvasGridSize()) {
  if (!Number.isFinite(value)) return 0;
  const step = Math.max(8, Math.floor((gridSize || 100) / 4));
  return Math.round(value / step) * step;
}

export function tokenDocumentBounds(tokenDocument, position = {}) {
  const gridSize = canvasGridSize();
  const x = finitePositionValue(position.x, tokenDocument?.x ?? 0);
  const y = finitePositionValue(position.y, tokenDocument?.y ?? 0);
  const width = Math.max(0.25, finitePositionValue(position.width, tokenDocument?.width ?? 1)) * gridSize;
  const height = Math.max(0.25, finitePositionValue(position.height, tokenDocument?.height ?? 1)) * gridSize;
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

export function tokenBoundsIntersectEntries(tokenDocument, position = {}, entries = []) {
  if (!tokenDocument || !entries.length) return false;
  const bounds = tokenDocumentBounds(tokenDocument, position);
  return entries.some(entry => {
    const entryBounds = entry?.bounds;
    if (!entryBounds) return true;
    return bounds.maxX >= entryBounds.minX - 1
      && bounds.minX <= entryBounds.maxX + 1
      && bounds.maxY >= entryBounds.minY - 1
      && bounds.minY <= entryBounds.maxY + 1;
  });
}

export function tokenElevationSamplePoints(tokenDocument, position = {}) {
  const gridSize = canvasGridSize();
  const x = finitePositionValue(position.x, tokenDocument.x ?? 0);
  const y = finitePositionValue(position.y, tokenDocument.y ?? 0);
  const width = Math.max(0.25, finitePositionValue(position.width, tokenDocument.width ?? 1)) * gridSize;
  const height = Math.max(0.25, finitePositionValue(position.height, tokenDocument.height ?? 1)) * gridSize;
  const insetX = Math.min(width / 2, Math.max(1, gridSize * 0.2));
  const insetY = Math.min(height / 2, Math.max(1, gridSize * 0.2));
  const elevation = finitePositionValue(tokenDocument.elevation, 0);
  return [
    { x: x + width / 2, y: y + height / 2, elevation },
    { x: x + insetX, y: y + insetY, elevation },
    { x: x + width - insetX, y: y + insetY, elevation },
    { x: x + insetX, y: y + height - insetY, elevation },
    { x: x + width - insetX, y: y + height - insetY, elevation }
  ];
}

export function isCanonicalSceneToken(token) {
  const id = token?.document?.id;
  if (!id || !canvas?.tokens?.get) return true;
  const placeable = canvas.tokens.get(id);
  return !placeable || placeable === token;
}

export function tokenPositionFromCenter(token, center) {
  const tokenDocument = token?.document;
  const gridSize = canvasGridSize();
  const width = finitePositionValue(tokenDocument?.width, 1);
  const height = finitePositionValue(tokenDocument?.height, 1);
  return {
    x: finitePositionValue(center.x, 0) - (width * gridSize) / 2,
    y: finitePositionValue(center.y, 0) - (height * gridSize) / 2,
    width,
    height
  };
}
