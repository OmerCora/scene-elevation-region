import { debugWarn } from "./debug.mjs";
import { RegionElevationRenderer } from "./region-elevation-renderer.mjs";
import {
  TOKEN_PARALLAX_HIT_AREA_EPSILON,
  canvasGridSize,
  finitePositionValue,
  tokenPositionFromCenter
} from "./token-spatial-utils.mjs";

const TOKEN_HUD_POSITION_PATCHED = "_sceneElevationRegionHudPositionPatched";
const TOKEN_RULER_GUIDE_PATCHED = "_sceneElevationRegionRulerGuidePatched";

export function createTokenHudRulerPatches({ isEnabled, elevatedGrid, tokenElevationSync } = {}) {
  function patchTokenHudPositioning() {
    const globalTokenHud = Object.getOwnPropertyDescriptor(globalThis, "TokenHUD")?.value;
    const hudClasses = [CONFIG.Token?.hudClass, foundry.applications?.hud?.TokenHUD, globalTokenHud].filter(Boolean);
    for (const hudClass of new Set(hudClasses)) patchTokenHudClass(hudClass);
  }

  function patchTokenRulerParallaxGuide() {
    const globalTokenRuler = Object.getOwnPropertyDescriptor(globalThis, "TokenRuler")?.value;
    const rulerClasses = [CONFIG.Token?.rulerClass, foundry.canvas?.placeables?.tokens?.TokenRuler, globalTokenRuler].filter(Boolean);
    for (const rulerClass of new Set(rulerClasses)) patchTokenRulerClass(rulerClass);
  }

  function patchTokenRulerClass(rulerClass) {
    const prototype = rulerClass?.prototype;
    if (!prototype || prototype[TOKEN_RULER_GUIDE_PATCHED]) return;
    const originalWaypointLabelContext = prototype._getWaypointLabelContext;
    const originalSegmentStyle = prototype._getSegmentStyle;
    const originalGridHighlightStyle = prototype._getGridHighlightStyle;
    if (typeof originalWaypointLabelContext !== "function" && typeof originalSegmentStyle !== "function" && typeof originalGridHighlightStyle !== "function") return;
    if (typeof originalWaypointLabelContext === "function") {
      prototype._getWaypointLabelContext = function(waypoint, state, ...args) {
        return originalWaypointLabelContext.call(this, sceneElevationAdjustedRulerWaypoint(this, waypoint), state, ...args);
      };
    }
    if (typeof originalSegmentStyle === "function") {
      prototype._getSegmentStyle = function(waypoint, ...args) {
        const adjustedWaypoint = sceneElevationAdjustedRulerWaypoint(this, waypoint);
        const result = originalSegmentStyle.call(this, adjustedWaypoint, ...args);
        queueRulerElevatedGridGuide(this, adjustedWaypoint);
        return result;
      };
    }
    if (typeof originalGridHighlightStyle === "function") {
      prototype._getGridHighlightStyle = function(waypoint, offset, ...args) {
        const adjustedWaypoint = sceneElevationAdjustedRulerWaypoint(this, waypoint, offset);
        const result = originalGridHighlightStyle.call(this, adjustedWaypoint, offset, ...args);
        queueRulerElevatedGridGuide(this, adjustedWaypoint, offset);
        return result;
      };
    }
    Object.defineProperty(prototype, TOKEN_RULER_GUIDE_PATCHED, { value: true });
  }

  function sceneElevationAdjustedRulerWaypoint(ruler, waypoint, offset = null) {
    if (isEnabled?.() !== true) return waypoint;
    const token = rulerToken(ruler);
    if (!elevatedGrid?.validElevatedGridToken?.(token) || !waypoint || typeof waypoint !== "object") return waypoint;
    return adjustRulerWaypointChain(token, waypoint, new WeakMap(), offset);
  }

  function adjustRulerWaypointChain(token, waypoint, seen, fallbackOffset = null) {
    if (!waypoint || typeof waypoint !== "object") return waypoint;
    if (seen.has(waypoint)) return seen.get(waypoint);
    const clone = { ...waypoint };
    seen.set(waypoint, clone);
    if (waypoint.previous) clone.previous = adjustRulerWaypointChain(token, waypoint.previous, seen);
    const center = rulerPointCenter(waypoint) ?? rulerOffsetCenter(fallbackOffset);
    const targetElevation = center ? targetTokenElevationForRulerPoint(token.document, tokenPositionFromCenter(token, center)) : null;
    if (targetElevation !== null) assignRulerWaypointElevation(clone, targetElevation);
    return clone;
  }

  function targetTokenElevationForRulerPoint(tokenDocument, position) {
    if (!tokenDocument || !position) return null;
    const rawState = tokenElevationSync?.highestState?.(tokenDocument, position);
    if (!rawState || rawState.skip) return null;
    const movementStart = tokenElevationSync?.movementStartState?.(tokenDocument);
    const state = tokenElevationSync?.stabilizeMovementElevationState?.(rawState, movementStart, tokenDocument, position) ?? rawState;
    return state.found ? state.elevation : 0;
  }

  function assignRulerWaypointElevation(waypoint, elevation) {
    const value = finitePositionValue(elevation, 0);
    waypoint.elevation = value;
    waypoint.targetElevation = value;
    if (waypoint.center) waypoint.center = pointWithElevation(waypoint.center, value);
    if (waypoint.point) waypoint.point = pointWithElevation(waypoint.point, value);
    if (waypoint.destination) waypoint.destination = pointWithElevation(waypoint.destination, value);
    if (waypoint.ray) {
      waypoint.ray = { ...waypoint.ray };
      if (waypoint.ray.B) waypoint.ray.B = pointWithElevation(waypoint.ray.B, value);
    }
    if (waypoint.measurement) waypoint.measurement = { ...waypoint.measurement, elevation: value, targetElevation: value };
  }

  function pointWithElevation(point, elevation) {
    if (!point || typeof point !== "object") return point;
    return { ...point, elevation };
  }

  function queueRulerElevatedGridGuide(ruler, waypoint, offset = null) {
    const token = rulerToken(ruler);
    const center = rulerPointCenter(waypoint) ?? rulerOffsetCenter(offset);
    if (!elevatedGrid?.validElevatedGridToken?.(token) || !center) return;
    elevatedGrid.setRulerContext(token, tokenPositionFromCenter(token, center));
  }

  function rulerToken(ruler) {
    return ruler?.token ?? ruler?.object ?? ruler?._token ?? ruler?.document?.object ?? null;
  }

  function rulerPointCenter(waypoint) {
    const candidates = [waypoint?.center, waypoint?.point, waypoint?.destination, waypoint?.ray?.B, waypoint];
    for (const candidate of candidates) {
      const x = Number(candidate?.x ?? candidate?.X);
      const y = Number(candidate?.y ?? candidate?.Y);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
    return null;
  }

  function rulerOffsetCenter(offset) {
    const row = Number(offset?.i ?? offset?.row);
    const column = Number(offset?.j ?? offset?.column);
    if (!Number.isFinite(row) || !Number.isFinite(column)) return null;
    const gridSize = canvasGridSize();
    return { x: column * gridSize + gridSize / 2, y: row * gridSize + gridSize / 2 };
  }

  function patchTokenHudClass(hudClass) {
    const prototype = hudClass?.prototype;
    if (!prototype || prototype[TOKEN_HUD_POSITION_PATCHED] || typeof prototype.setPosition !== "function") return;
    const originalSetPosition = prototype.setPosition;
    prototype.setPosition = function(position = {}) {
      const result = originalSetPosition.call(this, position);
      applyTokenHudParallaxOffset(this);
      return result;
    };
    Object.defineProperty(prototype, TOKEN_HUD_POSITION_PATCHED, { value: true });
  }

  function refreshTokenHudOffset(token, offset = null) {
    for (const hud of tokenHudCandidates()) {
      if (hud?.object === token) applyTokenHudParallaxOffset(hud, offset);
    }
  }

  function applyTokenHudParallaxOffset(hud, offset = null) {
    const token = hud?.object;
    const element = tokenHudElement(hud);
    if (!token?.document || !element) return;
    const parallaxOffset = offset ?? RegionElevationRenderer.instance.tokenParallaxOffset(token.document);
    const viewportOffset = tokenOffsetToViewport(token, parallaxOffset);
    const hudOffset = viewportOffsetToOffsetParent(element, viewportOffset);
    applyTokenHudElementOffset(element, hudOffset);
  }

  function tokenHudCandidates() {
    return [canvas?.tokens?.hud, canvas?.hud?.token, ui?.hud?.token]
      .filter((hud, index, huds) => hud && huds.indexOf(hud) === index);
  }

  function tokenHudElement(hud) {
    if (hud?.element instanceof HTMLElement) return hud.element;
    if (hud?.element?.[0] instanceof HTMLElement) return hud.element[0];
    if (hud?._element instanceof HTMLElement) return hud._element;
    if (hud?._element?.[0] instanceof HTMLElement) return hud._element[0];
    return document.getElementById("token-hud");
  }

  function applyTokenHudElementOffset(element, offset) {
    updateTokenHudBasePosition(element);
    if (Math.hypot(offset.x, offset.y) <= TOKEN_PARALLAX_HIT_AREA_EPSILON) {
      clearTokenHudElementOffset(element);
      return;
    }
    element._seLastHudOffset = offset;
    element.style.left = `${element._seBaseHudLeft + offset.x}px`;
    element.style.top = `${element._seBaseHudTop + offset.y}px`;
    element.style.translate = "";
  }

  function updateTokenHudBasePosition(element) {
    const currentLeft = stylePixels(element.style.left, element.offsetLeft);
    const currentTop = stylePixels(element.style.top, element.offsetTop);
    if (element._seBaseHudLeft === undefined || element._seBaseHudTop === undefined) {
      element._seBaseHudLeft = currentLeft;
      element._seBaseHudTop = currentTop;
      return;
    }
    const lastOffset = element._seLastHudOffset;
    if (!lastOffset) {
      element._seBaseHudLeft = currentLeft;
      element._seBaseHudTop = currentTop;
      return;
    }
    const expectedLeft = element._seBaseHudLeft + lastOffset.x;
    const expectedTop = element._seBaseHudTop + lastOffset.y;
    if (Math.abs(currentLeft - expectedLeft) > 0.5 || Math.abs(currentTop - expectedTop) > 0.5) {
      element._seBaseHudLeft = currentLeft;
      element._seBaseHudTop = currentTop;
    }
  }

  function clearTokenHudElementOffset(element) {
    if (element._seBaseHudLeft !== undefined && element._seBaseHudTop !== undefined) {
      element.style.left = `${element._seBaseHudLeft}px`;
      element.style.top = `${element._seBaseHudTop}px`;
    }
    element.style.translate = "";
    delete element._seBaseHudLeft;
    delete element._seBaseHudTop;
    delete element._seLastHudOffset;
  }

  function stylePixels(value, fallback = 0) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : Number(fallback) || 0;
  }

  function tokenOffsetToViewport(token, offset) {
    const reference = tokenParallaxReferenceParent(token);
    if (typeof reference?.toGlobal === "function") {
      try {
        const origin = reference.toGlobal(new PIXI.Point(0, 0));
        const shifted = reference.toGlobal(new PIXI.Point(offset.x, offset.y));
        const viewportOffset = rendererOffsetToCss({ x: shifted.x - origin.x, y: shifted.y - origin.y });
        if (Number.isFinite(viewportOffset.x) && Number.isFinite(viewportOffset.y)) return viewportOffset;
      } catch (err) { debugWarn("tokenHud.viewportOffset", err, token?.document?.uuid ?? token?.id); }
    }
    const scale = canvas.stage?.scale ?? { x: 1, y: 1 };
    return rendererOffsetToCss({
      x: offset.x * (Number(scale.x) || 1),
      y: offset.y * (Number(scale.y) || 1)
    });
  }

  function tokenParallaxReferenceParent(token) {
    const meshParent = token?.mesh?.parent;
    if (meshParent && typeof meshParent.toGlobal === "function") return meshParent;
    if (typeof token?.toGlobal === "function") return token;
    return canvas.stage;
  }

  function rendererOffsetToCss(offset) {
    const renderer = canvas.app?.renderer;
    const view = renderer?.view ?? canvas.app?.view ?? canvas.app?.canvas;
    const rect = view?.getBoundingClientRect?.();
    const screen = renderer?.screen;
    const scaleX = rect?.width && screen?.width ? rect.width / screen.width : 1;
    const scaleY = rect?.height && screen?.height ? rect.height / screen.height : 1;
    return {
      x: offset.x * scaleX,
      y: offset.y * scaleY
    };
  }

  function viewportOffsetToOffsetParent(element, offset) {
    const parent = element.offsetParent ?? element.parentElement;
    const rect = parent?.getBoundingClientRect?.();
    const scaleX = rect?.width && parent?.offsetWidth ? rect.width / parent.offsetWidth : 1;
    const scaleY = rect?.height && parent?.offsetHeight ? rect.height / parent.offsetHeight : 1;
    return {
      x: offset.x / (Number(scaleX) || 1),
      y: offset.y / (Number(scaleY) || 1)
    };
  }

  return {
    patchTokenHudPositioning,
    patchTokenRulerParallaxGuide,
    refreshTokenHudOffset
  };
}
