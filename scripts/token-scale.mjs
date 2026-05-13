import { getSystemTokenScalingElevation } from "./systems/index.mjs";

export function tokenDocumentTextureScale(tokenDocument) {
  const texture = tokenDocument?.texture ?? {};
  const scaleX = Number(texture.scaleX ?? texture.scale ?? 1);
  const scaleY = Number(texture.scaleY ?? texture.scale ?? scaleX);
  const x = Number.isFinite(scaleX) ? Math.abs(scaleX) : 1;
  const y = Number.isFinite(scaleY) ? Math.abs(scaleY) : x;
  return Math.max(0.001, x || 1, y || 1);
}

export function systemTokenScalingElevation(tokenDocument) {
  const elevation = Number(getSystemTokenScalingElevation(tokenDocument));
  return Number.isFinite(elevation) && Math.abs(elevation) > 0.001 ? elevation : null;
}

export function captureTokenBaseScale(token, factor = 1, { gridSize = 100 } = {}) {
  const mesh = token?.mesh;
  const tokenDocument = token?.document;
  if (!mesh?.scale || !tokenDocument) return false;
  const naturalScale = _naturalTokenMeshScale(token, tokenDocument, gridSize);
  if (naturalScale) {
    mesh._seBaseScaleX = naturalScale.x;
    mesh._seBaseScaleY = naturalScale.y;
    return true;
  }
  if (Math.abs(Number(factor ?? 1)) > 1.001) return false;
  mesh._seBaseScaleX = mesh.scale.x;
  mesh._seBaseScaleY = mesh.scale.y;
  return true;
}

function _tokenDocumentTextureScaleAxes(tokenDocument) {
  const texture = tokenDocument?.texture ?? {};
  const scaleX = Number(texture.scaleX ?? texture.scale ?? 1);
  const scaleY = Number(texture.scaleY ?? texture.scale ?? scaleX);
  const normalizedX = Number.isFinite(scaleX) ? Math.max(0.001, Math.abs(scaleX) || 1) : 1;
  const normalizedY = Number.isFinite(scaleY) ? Math.max(0.001, Math.abs(scaleY) || 1) : normalizedX;
  return { x: normalizedX, y: normalizedY };
}

function _naturalTokenMeshScale(token, tokenDocument, gridSize) {
  const mesh = token?.mesh;
  const texture = _meshTextureDimensions(mesh);
  if (!texture) return null;
  const render = _tokenRenderDimensions(token, tokenDocument, gridSize);
  if (!render) return null;
  const textureScale = _tokenDocumentTextureScaleAxes(tokenDocument);
  const signX = Math.sign(Number(mesh?.scale?.x)) || Math.sign(Number(tokenDocument?.texture?.scaleX)) || 1;
  const signY = Math.sign(Number(mesh?.scale?.y)) || Math.sign(Number(tokenDocument?.texture?.scaleY)) || signX;
  return {
    x: (render.width * textureScale.x / texture.width) * signX,
    y: (render.height * textureScale.y / texture.height) * signY
  };
}

function _meshTextureDimensions(mesh) {
  const texture = mesh?.texture;
  const width = Number(texture?.orig?.width ?? texture?.frame?.width ?? texture?.width ?? texture?.baseTexture?.width ?? texture?.source?.width);
  const height = Number(texture?.orig?.height ?? texture?.frame?.height ?? texture?.height ?? texture?.baseTexture?.height ?? texture?.source?.height);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? { width, height } : null;
}

function _tokenRenderDimensions(token, tokenDocument, gridSize) {
  const width = Number(token?.w ?? tokenDocument?.width * gridSize);
  const height = Number(token?.h ?? tokenDocument?.height * gridSize);
  const fallbackWidth = Math.max(0.25, _finiteTokenDimension(tokenDocument?.width, 1)) * gridSize;
  const fallbackHeight = Math.max(0.25, _finiteTokenDimension(tokenDocument?.height, 1)) * gridSize;
  const renderWidth = Number.isFinite(width) && width > 0 ? width : fallbackWidth;
  const renderHeight = Number.isFinite(height) && height > 0 ? height : fallbackHeight;
  return Number.isFinite(renderWidth) && renderWidth > 0 && Number.isFinite(renderHeight) && renderHeight > 0
    ? { width: renderWidth, height: renderHeight }
    : null;
}

function _finiteTokenDimension(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}