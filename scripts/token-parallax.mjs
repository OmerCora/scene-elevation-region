import { getActiveElevationRegions, RegionElevationRenderer } from "./region-elevation-renderer.mjs";
import { restoreSystemTokenMotion } from "./system-token-visuals.mjs";
import {
  TOKEN_PARALLAX_HIT_AREA_EPSILON,
  canvasGridSize,
  quantizeLivePosition,
  safeTokenLivePoint,
  tokenBoundsIntersectEntries
} from "./token-spatial-utils.mjs";

const TOKEN_PARALLAX_UI_KEYS = Object.freeze([
  "border", "nameplate", "tooltip", "elevationLabel", "elevationText", "elevationTooltip",
  "bars", "bar1", "bar2", "resourceBars", "attributeBars", "healthBar", "healthBars",
  "effects", "effectIcons", "statusEffects", "overlay", "overlayEffect", "controlIcon", "controlIcons", "hud", "tokenHud",
  "targetArrows", "targetPips", "targetIcon", "targetReticle", "targetReticule", "targetCrosshair", "targetControl", "targetIndicator", "targetMarker"
]);
const TOKEN_PARALLAX_TARGET_NAME_PATTERN = /target|crosshair|reticle|reticule|bar|resource|health|stamina|effect|status|control|hud|overlay/i;
const TOKEN_PARALLAX_TARGET_SCAN_LIMIT = 80;
const ZERO_PARALLAX_OFFSET = Object.freeze({ x: 0, y: 0 });

export function createTokenParallaxController({ isEnabled, refreshTokenHudOffset } = {}) {
  let tokenParallaxRefreshFrame = null;

  function enabled() {
    return isEnabled?.() === true;
  }

  function offsetIsEffectivelyZero(offset) {
    return Math.hypot(Number(offset?.x ?? 0), Number(offset?.y ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON;
  }

  function offsetsNearlyEqual(left, right) {
    return Math.abs(Number(left?.x ?? 0) - Number(right?.x ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON
      && Math.abs(Number(left?.y ?? 0) - Number(right?.y ?? 0)) <= TOKEN_PARALLAX_HIT_AREA_EPSILON;
  }

  function tokenNeedsParallaxCleanup(token) {
    const mesh = token?.mesh;
    return !!mesh && (!offsetIsEffectivelyZero(mesh._seCachedParallaxOffset) || !!mesh._sceneElevationNegativeClip);
  }

  function applyTokenParallaxOffset(token) {
    if (!token || token.destroyed || !token.document) return;
    const tokenDocument = token.document;
    const mesh = token.mesh;
    if (mesh?.destroyed) return;
    const live = safeTokenLivePoint(token, tokenDocument);
    const gridSize = canvasGridSize();
    const liveX = quantizeLivePosition(live.x, gridSize);
    const liveY = quantizeLivePosition(live.y, gridSize);
    const elevation = Number(tokenDocument.elevation ?? 0);
    const renderer = RegionElevationRenderer.instance;
    const version = renderer?._visualParamsVersion ?? 0;
    if (mesh
      && mesh._seParallaxAppliedX === liveX
      && mesh._seParallaxAppliedY === liveY
      && mesh._seParallaxAppliedElev === elevation
      && mesh._seParallaxAppliedVersion === version
      && mesh._seParallaxAppliedW === tokenDocument.width
      && mesh._seParallaxAppliedH === tokenDocument.height
    ) {
      const cached = mesh._seCachedParallaxOffset;
      if (cached && !offsetIsEffectivelyZero(cached)) {
        const targets = token._seParallaxTargets ?? tokenParallaxTargets(token);
        for (const target of targets) applyDisplayObjectParallaxOffset(target, cached);
      }
      return;
    }
    const activeEntries = getActiveElevationRegions(canvas?.scene);
    const position = { x: liveX, y: liveY, width: tokenDocument.width, height: tokenDocument.height };
    const canOverlapRegion = activeEntries.length && tokenBoundsIntersectEntries(tokenDocument, position, activeEntries);
    const offset = canOverlapRegion
      ? renderer.tokenParallaxOffset(tokenDocument, position)
      : ZERO_PARALLAX_OFFSET;
    const previousOffset = mesh?._seCachedParallaxOffset;
    const offsetChanged = !offsetsNearlyEqual(previousOffset, offset);
    if (mesh) {
      mesh._seCachedParallaxOffset = offset;
      mesh._seParallaxAppliedX = liveX;
      mesh._seParallaxAppliedY = liveY;
      mesh._seParallaxAppliedElev = elevation;
      mesh._seParallaxAppliedVersion = version;
      mesh._seParallaxAppliedW = tokenDocument.width;
      mesh._seParallaxAppliedH = tokenDocument.height;
    }
    if (offsetChanged || !offsetIsEffectivelyZero(offset)) {
      const targets = token._seParallaxTargets ?? tokenParallaxTargets(token);
      for (const target of targets) applyDisplayObjectParallaxOffset(target, offset);
      applyTokenParallaxHitArea(token, offset);
      refreshTokenHudOffset?.(token, offset);
    }
  }

  function tokenLiveParallaxOffset(token) {
    if (!token || token.destroyed || !token.document) return ZERO_PARALLAX_OFFSET;
    const tokenDocument = token.document;
    const live = safeTokenLivePoint(token, tokenDocument);
    const gridSize = canvasGridSize();
    const liveX = quantizeLivePosition(live.x, gridSize);
    const liveY = quantizeLivePosition(live.y, gridSize);
    const activeEntries = getActiveElevationRegions(canvas?.scene);
    const position = { x: liveX, y: liveY, width: tokenDocument.width, height: tokenDocument.height };
    return activeEntries.length && tokenBoundsIntersectEntries(tokenDocument, position, activeEntries)
      ? RegionElevationRenderer.instance.tokenParallaxOffset(tokenDocument, position)
      : ZERO_PARALLAX_OFFSET;
  }

  function reapplyCachedTokenParallaxOffset(token) {
    applyTokenParallaxOffset(token);
  }

  function tokenParallaxTargets(token) {
    const signature = tokenParallaxTargetSignature(token);
    const cached = token?._seParallaxTargets;
    if (cached && token._seParallaxTargetsSignature === signature && cached.every(target => target?.position && !target.destroyed)) return cached;
    const targets = [];
    addTokenParallaxTarget(targets, token?.mesh);
    for (const key of TOKEN_PARALLAX_UI_KEYS) addTokenParallaxTarget(targets, token?.[key]);
    addNamedTokenParallaxTargets(targets, token);
    const deduped = dedupeNestedTokenTargets(targets);
    if (token) {
      token._seParallaxTargets = deduped;
      token._seParallaxTargetsSignature = signature;
    }
    return deduped;
  }

  function tokenParallaxTargetSignature(token) {
    if (!token) return "";
    const parts = [token.children?.length ?? 0, token.mesh?.children?.length ?? 0];
    for (const key of TOKEN_PARALLAX_UI_KEYS) {
      const target = token[key];
      if (!target) continue;
      parts.push(key, target.children?.length ?? 0, target.visible === false ? 0 : 1);
    }
    return parts.join("|");
  }

  function addTokenParallaxTarget(targets, target) {
    if (!target?.position || typeof target.position.set !== "function") return;
    if (!targets.includes(target)) targets.push(target);
  }

  function addNamedTokenParallaxTargets(targets, token) {
    if (!token?.children?.length) return;
    const stack = [...token.children];
    let scanned = 0;
    while (stack.length && scanned < TOKEN_PARALLAX_TARGET_SCAN_LIMIT) {
      const child = stack.pop();
      scanned += 1;
      if (!child || child === token) continue;
      if (looksLikeTokenParallaxUi(child)) addTokenParallaxTarget(targets, child);
      if (child.children?.length) stack.push(...child.children);
    }
  }

  function looksLikeTokenParallaxUi(displayObject) {
    const candidates = [displayObject.name, displayObject.label, displayObject.constructor?.name].filter(value => typeof value === "string");
    return candidates.some(value => TOKEN_PARALLAX_TARGET_NAME_PATTERN.test(value));
  }

  function dedupeNestedTokenTargets(targets) {
    return targets.filter(target => !targets.some(candidate => candidate !== target && displayObjectContains(candidate, target)));
  }

  function displayObjectContains(candidate, target) {
    for (let parent = target?.parent; parent; parent = parent.parent) {
      if (parent === candidate) return true;
    }
    return false;
  }

  function applyDisplayObjectParallaxOffset(displayObject, offset) {
    if (displayObject._seBasePositionX === undefined) {
      displayObject._seBasePositionX = displayObject.position.x;
      displayObject._seBasePositionY = displayObject.position.y;
    } else if (displayObject._seLastOffset) {
      const expectedX = displayObject._seBasePositionX + displayObject._seLastOffset.x;
      const expectedY = displayObject._seBasePositionY + displayObject._seLastOffset.y;
      if (Math.abs(displayObject.position.x - expectedX) > 0.5 || Math.abs(displayObject.position.y - expectedY) > 0.5) {
        displayObject._seBasePositionX = displayObject.position.x;
        displayObject._seBasePositionY = displayObject.position.y;
      }
    }
    displayObject._seLastOffset = offset;
    displayObject.position.set(displayObject._seBasePositionX + offset.x, displayObject._seBasePositionY + offset.y);
  }

  function clearTokenParallaxCaches(token, { restorePositions = true } = {}) {
    restoreSystemTokenMotion(token);
    const targets = token?._seParallaxTargets ?? tokenParallaxTargets(token);
    for (const target of targets) clearDisplayObjectParallaxCache(target, { restorePosition: restorePositions });
    clearTokenParallaxApplicationCache(token);
    clearTokenParallaxTargetCache(token);
    clearTokenParallaxHitArea(token);
    RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
  }

  function clearTokenParallaxApplicationCache(token) {
    const mesh = token?.mesh;
    if (!mesh) return;
    delete mesh._seScaleCacheKey;
    delete mesh._seCachedParallaxOffset;
    delete mesh._seParallaxAppliedX;
    delete mesh._seParallaxAppliedY;
    delete mesh._seParallaxAppliedElev;
    delete mesh._seParallaxAppliedVersion;
    delete mesh._seParallaxAppliedW;
    delete mesh._seParallaxAppliedH;
  }

  function clearTokenParallaxTargetCache(token) {
    if (!token) return;
    delete token._seParallaxTargets;
    delete token._seParallaxTargetsSignature;
  }

  function clearDisplayObjectParallaxCache(displayObject, { restorePosition = true } = {}) {
    if (!displayObject) return;
    if (restorePosition && displayObject?._seBasePositionX !== undefined && displayObject?._seBasePositionY !== undefined) {
      displayObject.position?.set?.(displayObject._seBasePositionX, displayObject._seBasePositionY);
    }
    delete displayObject._seBasePositionX;
    delete displayObject._seBasePositionY;
    delete displayObject._seLastOffset;
  }

  function applyTokenParallaxHitArea(token, offset) {
    if (!token) return;
    if (Math.hypot(offset.x, offset.y) <= TOKEN_PARALLAX_HIT_AREA_EPSILON) {
      clearTokenParallaxHitArea(token);
      return;
    }
    const currentHitArea = token.hitArea ?? null;
    if (token._seBaseHitArea === undefined) token._seBaseHitArea = currentHitArea;
    else if (currentHitArea && currentHitArea !== token._seBaseHitArea && currentHitArea !== token._seShiftedHitArea) token._seBaseHitArea = currentHitArea;

    const baseHitArea = token._seBaseHitArea ?? tokenFallbackHitArea(token);
    const shiftedHitArea = shiftHitArea(baseHitArea, offset);
    if (!shiftedHitArea) return;
    token._seShiftedHitArea = shiftedHitArea;
    token.hitArea = shiftedHitArea;
  }

  function clearTokenParallaxHitArea(token) {
    if (!token || token._seBaseHitArea === undefined) return;
    token.hitArea = token._seBaseHitArea;
    delete token._seBaseHitArea;
    delete token._seShiftedHitArea;
  }

  function tokenFallbackHitArea(token) {
    const gridSize = canvas.grid?.size ?? 100;
    const width = Number(token.w ?? (Number(token.document?.width ?? 1) * gridSize));
    const height = Number(token.h ?? (Number(token.document?.height ?? 1) * gridSize));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return new PIXI.Rectangle(0, 0, width, height);
  }

  function shiftHitArea(hitArea, offset) {
    if (!hitArea) return null;
    if (hitArea instanceof PIXI.Rectangle) return new PIXI.Rectangle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height);
    if (hitArea instanceof PIXI.Circle) return new PIXI.Circle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.radius);
    if (hitArea instanceof PIXI.Ellipse) return new PIXI.Ellipse(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height);
    if (PIXI.RoundedRectangle && hitArea instanceof PIXI.RoundedRectangle) return new PIXI.RoundedRectangle(hitArea.x + offset.x, hitArea.y + offset.y, hitArea.width, hitArea.height, hitArea.radius);
    if (hitArea instanceof PIXI.Polygon) return new PIXI.Polygon(hitArea.points.map((point, index) => point + (index % 2 === 0 ? offset.x : offset.y)));
    return null;
  }

  function refreshAllTokenParallax() {
    if (!canvas?.tokens) return;
    if (!enabled()) return;
    const activeEntries = getActiveElevationRegions(canvas?.scene);
    if (!activeEntries.length) return;
    for (const token of canvas.tokens.placeables) {
      if (!token?.mesh) continue;
      if (!tokenBoundsIntersectEntries(token.document, {}, activeEntries) && !tokenNeedsParallaxCleanup(token)) continue;
      applyTokenParallaxOffset(token);
      RegionElevationRenderer.instance.applyNegativeParallaxClipForToken(token);
    }
  }

  function queueTokenParallaxRefresh() {
    if (!enabled()) return;
    if (tokenParallaxRefreshFrame) return;
    tokenParallaxRefreshFrame = requestAnimationFrame(() => {
      tokenParallaxRefreshFrame = null;
      refreshAllTokenParallax();
    });
  }

  function clearPendingTokenParallaxRefresh() {
    if (tokenParallaxRefreshFrame) cancelAnimationFrame(tokenParallaxRefreshFrame);
    tokenParallaxRefreshFrame = null;
  }

  return {
    applyTokenParallaxOffset,
    clearPendingTokenParallaxRefresh,
    clearTokenParallaxCaches,
    offsetIsEffectivelyZero,
    queueTokenParallaxRefresh,
    reapplyCachedTokenParallaxOffset,
    refreshAllTokenParallax,
    tokenLiveParallaxOffset,
    tokenNeedsParallaxCleanup
  };
}
