import { MODULE_ID, SETTINGS, ELEVATED_GRID_MODES, elevatedGridModeValue } from "./config.mjs";
import { finitePositionValue, safeTokenLivePoint } from "./token-spatial-utils.mjs";

export function createElevatedGridController({ isEnabled, renderer } = {}) {
  let elevatedGridRefreshFrame = null;
  let hoveredElevatedGridToken = null;
  let dragElevatedGridToken = null;
  let rulerElevatedGridContext = null;
  let rulerElevatedGridClearFrame = null;

  function rendererInstance() {
    return renderer?.();
  }

  function showElevatedGridEnabled() {
    if (isEnabled?.() !== true) return false;
    try { return elevatedGridModeValue(game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID)) !== ELEVATED_GRID_MODES.OFF; }
    catch (err) { return true; }
  }

  function elevatedGridOverrideSceneGridEnabled() {
    if (isEnabled?.() !== true) return false;
    try { return elevatedGridModeValue(game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID)) === ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID; }
    catch (err) { return false; }
  }

  function validElevatedGridToken(token) {
    return !!token && !token.destroyed && !!token.document && token.document.parent === canvas?.scene;
  }

  function liveTokenGridPosition(token) {
    const tokenDocument = token?.document;
    if (!tokenDocument) return null;
    const live = safeTokenLivePoint(token, tokenDocument);
    return {
      x: finitePositionValue(live.x, tokenDocument.x ?? 0),
      y: finitePositionValue(live.y, tokenDocument.y ?? 0),
      width: finitePositionValue(tokenDocument.width, 1),
      height: finitePositionValue(tokenDocument.height, 1)
    };
  }

  function queueRefresh() {
    if (elevatedGridRefreshFrame) return;
    elevatedGridRefreshFrame = requestAnimationFrame(() => {
      elevatedGridRefreshFrame = null;
      refreshContext();
    });
  }

  function clearPendingRefresh() {
    if (elevatedGridRefreshFrame) cancelAnimationFrame(elevatedGridRefreshFrame);
    elevatedGridRefreshFrame = null;
    if (rulerElevatedGridClearFrame) cancelAnimationFrame(rulerElevatedGridClearFrame);
    rulerElevatedGridClearFrame = null;
    hoveredElevatedGridToken = null;
    dragElevatedGridToken = null;
    rulerElevatedGridContext = null;
    rendererInstance()?.clearElevatedGrid?.();
  }

  function refreshContext() {
    const activeRenderer = rendererInstance();
    if (!canvas?.scene) {
      activeRenderer?.clearElevatedGrid?.();
      return;
    }
    if (!showElevatedGridEnabled()) {
      activeRenderer?.refreshElevatedGrid?.();
      return;
    }
    const context = currentContext();
    if (!context) {
      if (elevatedGridOverrideSceneGridEnabled()) {
        activeRenderer?.clearElevatedGrid?.();
        activeRenderer?.refreshElevatedGrid?.();
        return;
      }
      activeRenderer?.clearElevatedGrid?.();
      return;
    }
    activeRenderer?.showElevatedGridForToken?.(context.token, context);
  }

  function currentContext() {
    if (validElevatedGridToken(dragElevatedGridToken)) {
      const position = liveTokenGridPosition(dragElevatedGridToken);
      if (position) return { token: dragElevatedGridToken, position, guide: true, source: "drag" };
    }
    dragElevatedGridToken = null;

    if (rulerElevatedGridContext && validElevatedGridToken(rulerElevatedGridContext.token)) return rulerElevatedGridContext;
    rulerElevatedGridContext = null;

    if (validElevatedGridToken(hoveredElevatedGridToken)) return { token: hoveredElevatedGridToken, guide: false, source: "hover" };
    hoveredElevatedGridToken = null;

    const controlled = canvas?.tokens?.controlled?.find(token => validElevatedGridToken(token));
    return controlled ? { token: controlled, guide: false, source: "control" } : null;
  }

  function setRulerContext(token, position) {
    if (!showElevatedGridEnabled() || !validElevatedGridToken(token) || !position) return;
    rulerElevatedGridContext = { token, position, guide: true, source: "ruler" };
    queueRefresh();
    scheduleRulerContextClear();
  }

  function scheduleRulerContextClear() {
    if (rulerElevatedGridClearFrame) cancelAnimationFrame(rulerElevatedGridClearFrame);
    rulerElevatedGridClearFrame = requestAnimationFrame(() => {
      rulerElevatedGridClearFrame = requestAnimationFrame(() => {
        rulerElevatedGridClearFrame = null;
        rulerElevatedGridContext = null;
        queueRefresh();
      });
    });
  }

  function setDragToken(token) {
    dragElevatedGridToken = token;
    queueRefresh();
  }

  function clearDragToken(token = null) {
    if (token && dragElevatedGridToken !== token) return false;
    if (!dragElevatedGridToken) return false;
    dragElevatedGridToken = null;
    queueRefresh();
    return true;
  }

  function clearDragTokenForDocument(tokenDocument) {
    if (dragElevatedGridToken?.document !== tokenDocument) return false;
    dragElevatedGridToken = null;
    queueRefresh();
    return true;
  }

  function setHoveredToken(token, hovered) {
    if (hovered) hoveredElevatedGridToken = token;
    else if (hoveredElevatedGridToken === token) hoveredElevatedGridToken = null;
    queueRefresh();
  }

  function clearTokenDocument(tokenDocument) {
    if (hoveredElevatedGridToken?.document === tokenDocument) hoveredElevatedGridToken = null;
    if (dragElevatedGridToken?.document === tokenDocument) dragElevatedGridToken = null;
    if (rulerElevatedGridContext?.token?.document === tokenDocument) rulerElevatedGridContext = null;
    queueRefresh();
  }

  return {
    clearDragToken,
    clearDragTokenForDocument,
    clearPendingRefresh,
    clearTokenDocument,
    queueRefresh,
    refreshContext,
    setDragToken,
    setHoveredToken,
    setRulerContext,
    showElevatedGridEnabled,
    validElevatedGridToken
  };
}
