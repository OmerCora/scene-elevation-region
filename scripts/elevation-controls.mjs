import {
  MODULE_ID,
  SETTINGS,
  SCENE_SETTING_KEYS,
  PARALLAX_MODES,
  PERSPECTIVE_POINTS,
  SHADOW_MODES,
  REGION_BEHAVIOR_TYPE,
  SHADOW_STRENGTH_LIMITS,
  sceneGeometry,
  getSceneElevationSetting,
  getSceneElevationSettings,
  setSceneElevationSettings,
  setTransientSceneElevationSetting,
  clearTransientSceneElevationSettings
} from "./config.mjs";
import { RegionElevationRenderer, getActiveElevationRegions, getRegionElevationStateAtPoint } from "./region-elevation-renderer.mjs";
import { openSceneElevationSettingsDialog } from "./scene-settings.mjs";

const MIN_POLYGON_POINTS = 3;
const MIN_SHAPE_SIZE = 8;
const POINT_CLOSE_DISTANCE = 10;
const DOUBLE_CLICK_MS = 420;
const DOUBLE_CLICK_DISTANCE = 8;
const REGION_DRAG_MIN_DISTANCE = 3;
const PREVIEW_COLOR = 0x66ccff;
const OUTLINE_COLOR = 0xffd166;
const SELECTED_OUTLINE_COLOR = 0x66ccff;
const EDGE_HANDLE_COLOR = 0xff4d6d;
const SUN_HANDLE_COLOR = 0xffd166;
const EDGE_HANDLE_RADIUS = 9;
const EDGE_POINT_PREVIEW_MIN_DISTANCE = 2;
const TOOL_SELECT = "select";
const TOOL_POLYGON = "elevationPolygon";
const TOOL_RECTANGLE = "elevationRectangle";
const TOOL_CIRCLE = "elevationCircle";
const DRAW_TOOLS = new Set([TOOL_POLYGON, TOOL_RECTANGLE, TOOL_CIRCLE]);
const ELEVATION_TOOLS = new Set([TOOL_SELECT, TOOL_POLYGON, TOOL_RECTANGLE, TOOL_CIRCLE]);
const UTILITY_TOOLS = new Set(["sceneSettings", "showElevationRegions"]);
const DRAW_ELEVATION_CONTROL_ID = `${MODULE_ID}-draw-elevation-control`;
let _drawElevationValue = 1;
let _drawElevationControlFrame = null;
let _drawElevationAnchorElement = null;
let _drawElevationResizeListenerBound = false;

export class ElevationAuthoringLayer extends foundry.canvas.layers.InteractionLayer {
  static LAYER_NAME = "sceneElevation";

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: this.LAYER_NAME,
      baseClass: foundry.canvas.layers.InteractionLayer,
      zIndex: 800
    });
  }

  constructor() {
    super();
    this.preview = null;
    this.outlines = null;
    this.perspectiveHandle = null;
    this.sunHandle = null;
    this._activeTool = null;
    this._points = [];
    this._hover = null;
    this._shapeStart = null;
    this._shapeHover = null;
    this._listeners = null;
    this._creating = false;
    this._lastClick = null;
    this._draggingPerspectivePoint = false;
    this._draggingSunPoint = false;
    this._edgePointPreview = null;
    this._sunEdgePointPreview = null;
    this._createdRegionOperations = [];
    this._undoingRegionIds = new Set();
    this._nativeRegionVisibility = null;
    this._nativeRegionLayerState = null;
    this._hoverLabel = null;
    this._overheadIconLayer = null;
    this._hoveredRegionId = null;
    this._editedRegionId = null;
    this._selectedRegionId = null;
    this._regionDrag = null;
    this._visibilityRefreshFrame = null;
    this._overheadIconRefreshFrame = null;
    this._edgePointPreviewRefreshFrame = null;
  }

  async _draw(options) {
    await super._draw?.(options);
    const parent = canvas.primary ?? this;
    parent.sortableChildren = true;

    this.outlines = parent.addChild(new PIXI.Graphics());
    this.outlines.eventMode = "none";
    this.outlines.zIndex = 20_001;
    this.outlines.visible = false;

    this.preview = parent.addChild(new PIXI.Graphics());
    this.preview.eventMode = "none";
    this.preview.zIndex = 20_002;
    this.preview.visible = false;

    this.perspectiveHandle = parent.addChild(new PIXI.Graphics());
    this.perspectiveHandle.eventMode = "none";
    this.perspectiveHandle.zIndex = 20_003;
    this.perspectiveHandle.visible = false;

    this.sunHandle = parent.addChild(new PIXI.Graphics());
    this.sunHandle.eventMode = "none";
    this.sunHandle.zIndex = 20_004;
    this.sunHandle.visible = false;

    this.refreshElevationRegionVisibility();
  }

  async _tearDown(options) {
    this._unbindStageListeners();
    this._removeElevationHoverLabel();
    this._removeOverheadRegionIcons();
    this._cancelQueuedOverheadIconRefresh();
    this._cancelQueuedVisibilityRefresh();
    this._cancelQueuedEdgePointPreviewRefresh();
    this._restoreNativeRegionVisibility();
    this.preview?.parent?.removeChild(this.preview);
    this.outlines?.parent?.removeChild(this.outlines);
    this.perspectiveHandle?.parent?.removeChild(this.perspectiveHandle);
    this.sunHandle?.parent?.removeChild(this.sunHandle);
    this.preview?.destroy();
    this.outlines?.destroy();
    this.perspectiveHandle?.destroy();
    this.sunHandle?.destroy();
    this.preview = null;
    this.outlines = null;
    this.perspectiveHandle = null;
    this.sunHandle = null;
    this._points = [];
    this._hover = null;
    this._shapeStart = null;
    this._shapeHover = null;
    this._lastClick = null;
    this._edgePointPreview = null;
    this._sunEdgePointPreview = null;
    this._draggingPerspectivePoint = false;
    this._draggingSunPoint = false;
    this._regionDrag = null;
    this._hoveredRegionId = null;
    this._editedRegionId = null;
    this._selectedRegionId = null;
    clearTransientSceneElevationSettings(canvas?.scene);
    return super._tearDown?.(options);
  }

  activateTool(toolName) {
    if (toolName === "showElevationRegions") {
      this.refreshElevationRegionVisibility();
      return;
    }
    if (this._activeTool === toolName) {
      _queueDrawElevationControlRender(this._activeTool);
      this.refreshElevationRegionVisibility();
      this._drawPerspectiveHandle();
      return;
    }
    this._resetToolState();
    this._activeTool = toolName;
    if (toolName) this._bindStageListeners();
    else this._unbindStageListeners();
    if (this.preview) this.preview.visible = DRAW_TOOLS.has(toolName);
    _queueDrawElevationControlRender(this._activeTool);
    this._drawPreview();
    this.refreshElevationRegionVisibility();
    this._drawPerspectiveHandle();
  }

  deactivate() {
    this._activeTool = null;
    this._resetToolState();
    this._unbindStageListeners();
    this.refreshElevationRegionVisibility(false);
    this._restoreNativeRegionVisibility();
    this._drawPerspectiveHandle();
    _removeDrawElevationControl();
    this._clearRegionUndo();
    return super.deactivate?.();
  }

  refreshElevationRegionVisibility(forceVisible = null) {
    const visible = forceVisible ?? (this._activeTool !== null && (game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS) || this._hoveredRegionId || this._editedRegionId || this._selectedRegionId || this._regionDrag));
    if (this.outlines) this.outlines.visible = visible;
    if (!visible) this._hideElevationHoverLabel();
    if (this.outlines) this._drawElevationRegionOutlines();
    this._refreshOverheadRegionIcons(visible);
    this._syncNativeRegionVisibility(visible);
  }

  queueElevationRegionVisibilityRefresh() {
    this._cancelQueuedVisibilityRefresh();
    this._visibilityRefreshFrame = requestAnimationFrame(() => {
      this.refreshElevationRegionVisibility();
      this._visibilityRefreshFrame = requestAnimationFrame(() => {
        this._visibilityRefreshFrame = null;
        this.refreshElevationRegionVisibility();
        this._drawPerspectiveHandle();
      });
    });
  }

  queueOverheadRegionIconRefresh() {
    this._cancelQueuedOverheadIconRefresh();
    this._overheadIconRefreshFrame = requestAnimationFrame(() => {
      this._overheadIconRefreshFrame = null;
      this._refreshOverheadRegionIcons(this.outlines?.visible ?? false);
    });
  }

  _cancelQueuedVisibilityRefresh() {
    if (!this._visibilityRefreshFrame) return;
    cancelAnimationFrame(this._visibilityRefreshFrame);
    this._visibilityRefreshFrame = null;
  }

  _cancelQueuedOverheadIconRefresh() {
    if (!this._overheadIconRefreshFrame) return;
    cancelAnimationFrame(this._overheadIconRefreshFrame);
    this._overheadIconRefreshFrame = null;
  }

  _queueEdgePointPreviewRefresh() {
    if (this._edgePointPreviewRefreshFrame) return;
    this._edgePointPreviewRefreshFrame = requestAnimationFrame(() => {
      this._edgePointPreviewRefreshFrame = null;
      RegionElevationRenderer.instance.refreshVisuals({ emitVisualRefresh: false });
    });
  }

  _cancelQueuedEdgePointPreviewRefresh() {
    if (!this._edgePointPreviewRefreshFrame) return;
    cancelAnimationFrame(this._edgePointPreviewRefreshFrame);
    this._edgePointPreviewRefreshFrame = null;
  }

  _resetToolState() {
    this._cancelQueuedEdgePointPreviewRefresh();
    this._points = [];
    this._hover = null;
    this._shapeStart = null;
    this._shapeHover = null;
    this._lastClick = null;
    this._draggingPerspectivePoint = false;
    this._draggingSunPoint = false;
    this._regionDrag = null;
    this._edgePointPreview = null;
    this._sunEdgePointPreview = null;
    this._setHoveredElevationRegion(null);
    this._setSelectedElevationRegion(null);
    clearTransientSceneElevationSettings(canvas?.scene);
    _queueDrawElevationControlRender(null);
    this.preview?.clear();
    if (this.preview) this.preview.visible = false;
    this._drawPreview();
  }

  _bindStageListeners() {
    if (this._listeners) return;
    const canvasElement = this._canvasElement();
    if (!canvasElement) return;
    const onMove = event => this._onPointerMove(event);
    const onDown = event => this._onPointerDown(event);
    const onUp = event => this._onPointerUp(event);
    const onContextMenu = event => this._onContextMenu(event);
    const onKeyDown = event => this._onKeyDown(event);
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown);
    this._listeners = { canvasElement, onMove, onDown, onUp, onContextMenu, onKeyDown };
  }

  _unbindStageListeners() {
    if (this._listeners) {
      window.removeEventListener("pointermove", this._listeners.onMove, { capture: true });
      window.removeEventListener("pointerdown", this._listeners.onDown, true);
      window.removeEventListener("pointerup", this._listeners.onUp, true);
      window.removeEventListener("contextmenu", this._listeners.onContextMenu, true);
      window.removeEventListener("keydown", this._listeners.onKeyDown);
    }
    this._listeners = null;
  }

  _onPointerMove(event) {
    if (!this._activeTool) return;
    if (this._isRightMouseEvent(event) && !this._draggingPerspectivePoint && !this._draggingSunPoint && !this._regionDrag && !this._drawingInProgress()) return;
    const isCanvasEvent = this._isCanvasEvent(event);
    if (!this._draggingPerspectivePoint && !this._draggingSunPoint && !this._regionDrag && !this._shapeStart && !isCanvasEvent) {
      this._hideElevationHoverLabel();
      return;
    }
    if (!this._draggingPerspectivePoint && !this._draggingSunPoint && !this._regionDrag && !this._drawingInProgress() && isCanvasEvent) this._updateElevationHoverLabel(event);
    else this._hideElevationHoverLabel();
    if (this._regionDrag) {
      this._consumeEvent(event, { preventDefault: false });
      const point = this._eventPosition(event);
      const drag = this._regionDrag;
      drag.current = point;
      const delta = _regionDragDelta(drag);
      if (Math.hypot(delta.x, delta.y) >= REGION_DRAG_MIN_DISTANCE) drag.moved = true;
      this.refreshElevationRegionVisibility(true);
      return;
    }
    if (this._draggingSunPoint) {
      this._consumeEvent(event, { preventDefault: false });
      const rawPoint = this._eventPosition(event, { snap: false });
      const point = this._clampPointToSceneEdge(rawPoint);
      if (!this._sunEdgePointPreview || Math.hypot(point.x - this._sunEdgePointPreview.x, point.y - this._sunEdgePointPreview.y) >= EDGE_POINT_PREVIEW_MIN_DISTANCE) {
        this._sunEdgePointPreview = point;
        setTransientSceneElevationSetting(canvas.scene, SCENE_SETTING_KEYS.SUN_EDGE_POINT, this._sunEdgePointPreview);
        this._queueEdgePointPreviewRefresh();
      }
      this._drawPerspectiveHandle();
      return;
    }
    if (this._draggingPerspectivePoint) {
      this._consumeEvent(event, { preventDefault: false });
      const rawPoint = this._eventPosition(event, { snap: false });
      const point = this._clampPointToSceneEdge(rawPoint);
      if (!this._edgePointPreview || Math.hypot(point.x - this._edgePointPreview.x, point.y - this._edgePointPreview.y) >= EDGE_POINT_PREVIEW_MIN_DISTANCE) {
        this._edgePointPreview = point;
        setTransientSceneElevationSetting(canvas.scene, SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT, this._edgePointPreview);
        this._queueEdgePointPreviewRefresh();
      }
      this._drawPerspectiveHandle();
      return;
    }
    if (!DRAW_TOOLS.has(this._activeTool)) return;
    this._consumeEvent(event, { preventDefault: false });
    const point = this._eventPosition(event);
    if (this._activeTool === TOOL_POLYGON) this._hover = point;
    else this._shapeHover = point;
    this._drawPreview();
  }

  _onPointerDown(event) {
    if (!this._activeTool || this._creating) return;
    if (!this._isCanvasEvent(event)) return;
    const button = event.button ?? event.data?.button ?? event.nativeEvent?.button ?? 0;
    if (button === 2) {
      if (!this._draggingPerspectivePoint && !this._draggingSunPoint && !this._regionDrag && !this._drawingInProgress()) return;
      this._consumeEvent(event);
      this._cancelDrawing();
      return;
    }
    if (button !== 0) return;

    const rawPoint = this._eventPosition(event, { snap: false });
    if (this._isSunHandleVisible() && this._isOnSunHandle(rawPoint)) {
      this._consumeEvent(event);
      this._draggingSunPoint = true;
      this._sunEdgePointPreview = this._clampPointToSceneEdge(rawPoint);
      setTransientSceneElevationSetting(canvas.scene, SCENE_SETTING_KEYS.SUN_EDGE_POINT, this._sunEdgePointPreview);
      this._drawPerspectiveHandle();
      this._queueEdgePointPreviewRefresh();
      return;
    }
    if (this._isPerspectiveHandleVisible() && this._isOnPerspectiveHandle(rawPoint)) {
      this._consumeEvent(event);
      this._draggingPerspectivePoint = true;
      this._edgePointPreview = this._clampPointToSceneEdge(rawPoint);
      setTransientSceneElevationSetting(canvas.scene, SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT, this._edgePointPreview);
      this._drawPerspectiveHandle();
      this._queueEdgePointPreviewRefresh();
      return;
    }

    if (!DRAW_TOOLS.has(this._activeTool)) {
      if (this._activeTool === TOOL_SELECT) {
        const original = event.nativeEvent ?? event.data?.originalEvent ?? event;
        const point = this._eventPosition(event, { snap: false });
        const state = _hoverElevationStateAtPoint(point);
        const isDoubleClick = Number(original.detail ?? 0) >= 2 || this._isDoubleClick(point, original);
        this._rememberClick(point, original);
        if (isDoubleClick && state?.entry?.region) {
          this._consumeEvent(event);
          this._openRegionDetails(state.entry.region);
          return;
        }
        if (state?.entry?.region) {
          this._consumeEvent(event);
          this._setSelectedElevationRegion(state.entry.region);
          const start = this._eventPosition(event);
          this._regionDrag = {
            region: state.entry.region,
            start,
            current: start,
            moved: false,
            shapes: _cloneRegionShapes(state.entry.region)
          };
          this.refreshElevationRegionVisibility(true);
          return;
        }
        this._setSelectedElevationRegion(null);
      }
      return;
    }

    this._consumeEvent(event);
    const original = event.nativeEvent ?? event.data?.originalEvent ?? event;
    const point = this._eventPosition(event);
    if (this._activeTool === TOOL_RECTANGLE || this._activeTool === TOOL_CIRCLE) {
      this._shapeStart = point;
      this._shapeHover = point;
      this._drawPreview();
      return;
    }

    const isDoubleClick = Number(original.detail ?? 0) >= 2 || this._isDoubleClick(point, original);
    this._rememberClick(point, original);
    if (isDoubleClick) {
      if (!(this._points.length >= MIN_POLYGON_POINTS && this._isNearFirstPoint(point))) this._appendPolygonPoint(point);
      void this._confirmPolygon();
      return;
    }

    if (this._points.length >= MIN_POLYGON_POINTS && this._isNearFirstPoint(point)) {
      void this._confirmPolygon();
      return;
    }
    this._appendPolygonPoint(point);
  }

  async _onPointerUp(event) {
    if (!this._activeTool) return;
    if (this._draggingSunPoint) {
      this._consumeEvent(event);
      this._cancelQueuedEdgePointPreviewRefresh();
      const rawPoint = this._eventPosition(event, { snap: false });
      const point = this._clampPointToSceneEdge(rawPoint);
      this._sunEdgePointPreview = null;
      this._draggingSunPoint = false;
      clearTransientSceneElevationSettings(canvas.scene);
      const settings = getSceneElevationSettings(canvas.scene);
      await setSceneElevationSettings(canvas.scene, { ...settings, [SCENE_SETTING_KEYS.SUN_EDGE_POINT]: point });
      this._drawPerspectiveHandle();
      RegionElevationRenderer.instance.update();
      return;
    }
    if (this._draggingPerspectivePoint) {
      this._consumeEvent(event);
      this._cancelQueuedEdgePointPreviewRefresh();
      const rawPoint = this._eventPosition(event, { snap: false });
      const point = this._clampPointToSceneEdge(rawPoint);
      this._edgePointPreview = null;
      this._draggingPerspectivePoint = false;
      clearTransientSceneElevationSettings(canvas.scene);
      const settings = getSceneElevationSettings(canvas.scene);
      await setSceneElevationSettings(canvas.scene, { ...settings, [SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT]: point });
      this._drawPerspectiveHandle();
      RegionElevationRenderer.instance.update();
      return;
    }
    if (this._regionDrag) {
      await this._finishRegionDrag(event);
      return;
    }
    if ((this._activeTool !== TOOL_RECTANGLE && this._activeTool !== TOOL_CIRCLE) || !this._shapeStart) return;
    this._consumeEvent(event);
    const end = this._eventPosition(event);
    const shape = this._shapeFromDrag(this._activeTool, this._shapeStart, end);
    this._shapeStart = null;
    this._shapeHover = null;
    this._drawPreview();
    if (!shape) {
      ui.notifications.warn(game.i18n.localize("SCENE_ELEVATION.Notify.ShapeTooSmall"));
      return;
    }
    await this._createElevationRegionFromShapes([shape]);
  }

  _onContextMenu(event) {
    if (!this._isCanvasEvent(event)) return;
    if (!this._draggingPerspectivePoint && !this._draggingSunPoint && !this._regionDrag && !this._drawingInProgress()) return;
    this._consumeEvent(event);
    this._cancelDrawing();
  }

  async _finishRegionDrag(event) {
    const drag = this._regionDrag;
    this._consumeEvent(event);
    const point = this._eventPosition(event);
    drag.current = point;
    const delta = _regionDragDelta(drag);
    const moved = drag.moved || Math.hypot(delta.x, delta.y) >= REGION_DRAG_MIN_DISTANCE;
    this._regionDrag = null;
    if (!moved || !drag.region || !drag.shapes?.length) {
      this.refreshElevationRegionVisibility();
      return;
    }
    const shapes = _translateRegionShapes(drag.shapes, delta.x, delta.y);
    await drag.region.update({ shapes });
    this._setSelectedElevationRegion(drag.region);
    this.refreshElevationRegionVisibility(true);
  }

  _appendPolygonPoint(point) {
    const previous = this._points[this._points.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 1) return;
    this._points.push(point);
    this._hover = point;
    this._drawPreview();
  }

  _isDoubleClick(point, event) {
    const previousClick = this._lastClick;
    if (!previousClick) return false;
    const timestamp = Number(event?.timeStamp ?? performance.now());
    const elapsed = timestamp - previousClick.timestamp;
    if (elapsed < 0 || elapsed > DOUBLE_CLICK_MS) return false;
    return Math.hypot(point.x - previousClick.x, point.y - previousClick.y) <= DOUBLE_CLICK_DISTANCE;
  }

  _rememberClick(point, event) {
    this._lastClick = {
      x: point.x,
      y: point.y,
      timestamp: Number(event?.timeStamp ?? performance.now())
    };
  }

  _onKeyDown(event) {
    if (!this._activeTool || this._isEditableEventTarget(event)) return;
    if (event.key === "Escape" && this._regionDrag) {
      event.preventDefault();
      this._regionDrag = null;
      this.refreshElevationRegionVisibility();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      if (this._undoDrawingStep()) {
        event.preventDefault();
        return;
      }
      if (this._createdRegionOperations.length) {
        event.preventDefault();
        void this._undoLastRegionCreation();
        return;
      }
    }
    if (!DRAW_TOOLS.has(this._activeTool)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this._cancelDrawing();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (this._activeTool === TOOL_POLYGON) void this._confirmPolygon();
    } else if ((event.key === "Backspace" || event.key === "Delete") && this._points.length) {
      event.preventDefault();
      this._points.pop();
      this._drawPreview();
    }
  }

  _updateElevationHoverLabel(event) {
    const point = this._eventPosition(event, { snap: false });
    const state = _hoverElevationStateAtPoint(point);
    if (!state) {
      this._hideElevationHoverLabel();
      return;
    }
    const { entry, elevation } = state;
    this._setHoveredElevationRegion(entry.region);
    const label = this._ensureElevationHoverLabel();
    const icon = document.createElement("i");
    icon.className = `fa-solid ${elevation > 0 ? "fa-arrow-up" : elevation < 0 ? "fa-arrow-down" : "fa-minus"}`;
    const value = document.createElement("span");
    value.textContent = entry.slope
      ? `${_formatElevationLabel(elevation)} (${_formatElevationLabel(entry.flatElevation)}${entry.slopeHeight >= 0 ? "+" : ""}${_formatElevationLabel(entry.slopeHeight)})`
      : _formatElevationLabel(elevation);
    label.replaceChildren(icon, value);
    label.style.left = `${event.clientX + 14}px`;
    label.style.top = `${event.clientY + 14}px`;
    label.hidden = false;
  }

  _ensureElevationHoverLabel() {
    if (this._hoverLabel?.isConnected) return this._hoverLabel;
    const label = document.createElement("div");
    label.className = `${MODULE_ID}-hover-label`;
    label.hidden = true;
    Object.assign(label.style, {
      position: "fixed",
      zIndex: 10_000,
      pointerEvents: "none"
    });
    document.body.appendChild(label);
    this._hoverLabel = label;
    return label;
  }

  _hideElevationHoverLabel() {
    if (this._hoverLabel) this._hoverLabel.hidden = true;
    this._setHoveredElevationRegion(null);
  }

  _removeElevationHoverLabel() {
    this._hoverLabel?.remove();
    this._hoverLabel = null;
  }

  _refreshOverheadRegionIcons(visible) {
    if (!visible || !canvas.scene) {
      this._removeOverheadRegionIcons();
      return;
    }
    const entries = getActiveElevationRegions(canvas.scene).filter(entry => entry.overhead);
    if (!entries.length) {
      this._removeOverheadRegionIcons();
      return;
    }
    const layer = this._ensureOverheadIconLayer();
    const icons = [];
    for (const entry of entries) {
      const bounds = _pathsBounds(_regionPaths(entry.region));
      if (!bounds) continue;
      const position = _canvasPointToViewport(bounds.center);
      if (!position) continue;
      const icon = document.createElement("div");
      icon.className = `${MODULE_ID}-overhead-icon`;
      icon.style.left = `${position.x}px`;
      icon.style.top = `${position.y}px`;
      icon.title = game.i18n.localize("SCENE_ELEVATION.RegionBehavior.FIELDS.overhead.label");
      const image = document.createElement("i");
      image.className = "fa-solid fa-people-roof";
      icon.appendChild(image);
      icons.push(icon);
    }
    if (!icons.length) {
      this._removeOverheadRegionIcons();
      return;
    }
    layer.replaceChildren(...icons);
  }

  _ensureOverheadIconLayer() {
    if (this._overheadIconLayer?.isConnected) return this._overheadIconLayer;
    const layer = document.createElement("div");
    layer.className = `${MODULE_ID}-overhead-icons`;
    document.body.appendChild(layer);
    this._overheadIconLayer = layer;
    return layer;
  }

  _removeOverheadRegionIcons() {
    this._overheadIconLayer?.remove();
    this._overheadIconLayer = null;
  }

  _setHoveredElevationRegion(region) {
    const nextId = region?.id ?? null;
    if (this._hoveredRegionId === nextId) return;
    this._hoveredRegionId = nextId;
    this.refreshElevationRegionVisibility();
  }

  _setSelectedElevationRegion(region) {
    const nextId = region?.id ?? null;
    if (this._selectedRegionId === nextId) return;
    this._selectedRegionId = nextId;
    this.refreshElevationRegionVisibility();
  }

  _openRegionDetails(region) {
    this._editedRegionId = region?.id ?? null;
    this.refreshElevationRegionVisibility();
    const sheet = region?.sheet;
    const clearEditedRegion = () => {
      if (this._editedRegionId !== region?.id) return;
      this._editedRegionId = null;
      this.refreshElevationRegionVisibility();
    };
    if (sheet?.addEventListener) sheet.addEventListener("close", clearEditedRegion, { once: true });
    const rendered = _renderDocumentSheet(region, sheet);
    if (rendered?.addEventListener && rendered !== sheet) rendered.addEventListener("close", clearEditedRegion, { once: true });
  }

  _eventPosition(event, { snap = true } = {}) {
    if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
      const point = this._domEventPosition(event);
      return snap ? this._snapPoint(point, event) : point;
    }
    const parent = this.preview?.parent ?? canvas.primary ?? canvas.stage;
    const point = typeof event.getLocalPosition === "function"
      ? event.getLocalPosition(parent)
      : event.data.getLocalPosition(parent);
    const original = event.nativeEvent ?? event.data?.originalEvent ?? event;
    return snap ? this._snapPoint({ x: point.x, y: point.y }, original) : { x: point.x, y: point.y };
  }

  _domEventPosition(event) {
    const canvasElement = this._canvasElement();
    const rect = canvasElement.getBoundingClientRect();
    const elementWidth = Number(canvasElement.width ?? rect.width) || rect.width || 1;
    const elementHeight = Number(canvasElement.height ?? rect.height) || rect.height || 1;
    const scaleX = elementWidth / (rect.width || 1);
    const scaleY = elementHeight / (rect.height || 1);
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;
    const transform = canvas.stage.worldTransform;
    return {
      x: (pixelX - transform.tx) / transform.a,
      y: (pixelY - transform.ty) / transform.d
    };
  }

  _canvasElement() {
    return canvas.app?.view ?? canvas.app?.canvas ?? document.getElementById("board");
  }

  _isCanvasEvent(event) {
    const canvasElement = this._listeners?.canvasElement ?? this._canvasElement();
    const path = event.composedPath?.() ?? [];
    return path.includes(canvasElement) || event.target === canvasElement;
  }

  _isEditableEventTarget(event) {
    const target = event.target;
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || !!target?.isContentEditable;
  }

  _isRightMouseEvent(event) {
    const button = event.button ?? event.data?.button ?? event.nativeEvent?.button;
    const buttons = event.buttons ?? event.nativeEvent?.buttons ?? 0;
    return button === 2 || (buttons & 2) !== 0;
  }

  _drawingInProgress() {
    return this._points.length > 0 || !!this._shapeStart;
  }

  _consumeEvent(event, { preventDefault = true } = {}) {
    if (preventDefault) event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  }

  _snapPoint(point, event) {
    if (event?.shiftKey || event?.ctrlKey) return point;
    const mode = CONST.GRID_SNAPPING_MODES?.VERTEX ?? CONST.GRID_SNAPPING_MODES?.CENTER;
    try {
      return canvas.grid?.getSnappedPoint?.(point, { mode }) ?? point;
    } catch (err) {
      return point;
    }
  }

  _isNearFirstPoint(point) {
    const first = this._points[0];
    if (!first) return false;
    return Math.hypot(point.x - first.x, point.y - first.y) <= POINT_CLOSE_DISTANCE;
  }

  _cancelDrawing() {
    this._points = [];
    this._hover = null;
    this._shapeStart = null;
    this._shapeHover = null;
    this._lastClick = null;
    this._draggingPerspectivePoint = false;
    this._draggingSunPoint = false;
    this._edgePointPreview = null;
    this._sunEdgePointPreview = null;
    clearTransientSceneElevationSettings(canvas?.scene);
    this._drawPreview();
    this._drawPerspectiveHandle();
  }

  _undoDrawingStep() {
    if (this._activeTool === TOOL_POLYGON && this._points.length) {
      this._points.pop();
      this._hover = this._points[this._points.length - 1] ?? null;
      this._drawPreview();
      return true;
    }
    if ((this._activeTool === TOOL_RECTANGLE || this._activeTool === TOOL_CIRCLE) && this._shapeStart) {
      this._shapeStart = null;
      this._shapeHover = null;
      this._drawPreview();
      return true;
    }
    return false;
  }

  _shapeFromDrag(toolName, start, end) {
    if (toolName === TOOL_RECTANGLE) {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      if (width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE) return null;
      return { type: "rectangle", hole: false, x, y, width, height };
    }
    if (toolName === TOOL_CIRCLE) {
      const radius = Math.hypot(end.x - start.x, end.y - start.y);
      if (radius < MIN_SHAPE_SIZE) return null;
      return { type: "circle", hole: false, x: start.x, y: start.y, radius };
    }
    return null;
  }

  async _confirmPolygon() {
    if (this._points.length < MIN_POLYGON_POINTS) {
      ui.notifications.warn(game.i18n.localize("SCENE_ELEVATION.Notify.PolygonNeedsPoints"));
      return;
    }
    const points = this._cleanPolygonPoints(this._points);
    if (points.length < MIN_POLYGON_POINTS) {
      ui.notifications.warn(game.i18n.localize("SCENE_ELEVATION.Notify.PolygonNeedsPoints"));
      return;
    }

    this._creating = true;
    try {
      const region = await this._createElevationRegion(points);
      if (region) {
        this._points = [];
        this._hover = null;
        this._lastClick = null;
        this._drawPreview();
        this.refreshElevationRegionVisibility();
      }
    } finally {
      this._creating = false;
    }
  }

  _cleanPolygonPoints(points) {
    const cleaned = [];
    for (const point of points) {
      const previous = cleaned[cleaned.length - 1];
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 1) continue;
      cleaned.push(point);
    }
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (first && last && cleaned.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1) cleaned.pop();
    return cleaned;
  }

  async _createElevationRegion(points) {
    return this._createElevationRegionFromShapes([{ type: "polygon", hole: false, points: points.flatMap(point => [point.x, point.y]) }]);
  }

  async _createElevationRegionFromShapes(shapes) {
    if (!canvas.scene) return null;
    const number = canvas.scene.regions?.size ? canvas.scene.regions.size + 1 : 1;
    const regionData = {
      name: game.i18n.format("SCENE_ELEVATION.Control.RegionName", { number }),
      color: _randomRegionColor(),
      shapes,
      highlightMode: _regionHighlightMode(),
      displayMeasurements: false,
      visibility: _regionVisibility(),
      ownership: { [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      behaviors: [{
        name: game.i18n.localize("SCENE_ELEVATION.RegionBehavior.Label"),
        type: REGION_BEHAVIOR_TYPE,
        system: {
          elevation: _currentDrawElevationValue(),
          slope: false,
          slopeHeight: 0,
          slopeDirection: 0,
          shadowStrength: SHADOW_STRENGTH_LIMITS.DEFAULT,
          parallaxStrengthOverride: "",
          parallaxModeOverride: "",
          perspectivePointOverride: "",
          overlayScaleOverride: "",
          shadowModeOverride: "",
          shadowLengthOverride: "",
          blendModeOverride: "",
          edgeStretchPercentOverride: "",
          depthScaleOverride: "",
          elevationScaleOverride: "",
          modifyTokenElevation: true,
          modifyTokenScaling: true
        }
      }],
      flags: { [MODULE_ID]: { createdByElevationTool: true } }
    };
    let region = null;
    try {
      [region] = await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
    } catch (error) {
      console.warn(`${MODULE_ID} | Preferred elevation Region defaults failed; retrying with Foundry-safe defaults.`, error);
      regionData.highlightMode = "coverage";
      regionData.visibility = CONST.REGION_VISIBILITY?.OBSERVER ?? "observer";
      [region] = await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
    }
    if (region) {
      this._recordRegionCreation(region);
      ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.Notify.RegionCreated"));
      this.refreshElevationRegionVisibility();
    }
    return region ?? null;
  }

  _recordRegionCreation(region) {
    this._createdRegionOperations.push({ type: "createRegion", sceneId: canvas.scene?.id, regionId: region.id });
  }

  _clearRegionUndo() {
    this._createdRegionOperations = [];
  }

  async _undoLastRegionCreation() {
    while (this._createdRegionOperations.length) {
      const operation = this._createdRegionOperations.pop();
      if (operation?.sceneId !== canvas.scene?.id || !operation.regionId) continue;
      const region = canvas.scene.regions?.get(operation.regionId);
      if (!region) continue;
      this._undoingRegionIds.add(operation.regionId);
      try {
        await region.delete();
      } finally {
        this._undoingRegionIds.delete(operation.regionId);
      }
      return;
    }
  }

  _noteRegionChanged(action, region) {
    if (action === "delete" && this._undoingRegionIds.has(region?.id)) return;
    // Undo history is intentionally NOT cleared on update/delete so it persists
    // for the entire Elevation menu session. It is cleared on layer deactivate.
  }

  _syncNativeRegionVisibility(showElevationRegions) {
    const regionLayer = canvas?.regions;
    if (!regionLayer) return;
    if (this._activeTool === null) {
      this._restoreNativeRegionVisibility();
      return;
    }
    this._captureNativeRegionVisibility(regionLayer);
    // The Elevation menu renders its own optional outlines. The native RegionLayer
    // should be completely invisible while this menu is active, including on the
    // very first switch from the native Regions menu before our graphics draw.
    regionLayer.visible = false;
    regionLayer.renderable = false;
    const objects = regionLayer.objects;
    if (objects) {
      objects.visible = false;
      objects.renderable = false;
    }
    for (const placeable of _regionLayerPlaceables(regionLayer)) {
      placeable.visible = false;
      placeable.renderable = false;
    }
  }

  _captureNativeRegionVisibility(regionLayer) {
    this._nativeRegionVisibility ??= new Map();
    if (!this._nativeRegionLayerState) {
      this._nativeRegionLayerState = {
        visible: regionLayer.visible,
        renderable: regionLayer.renderable,
        objectsVisible: regionLayer.objects?.visible,
        objectsRenderable: regionLayer.objects?.renderable
      };
    }
    for (const placeable of _regionLayerPlaceables(regionLayer)) {
      if (this._nativeRegionVisibility.has(placeable)) continue;
      this._nativeRegionVisibility.set(placeable, {
        visible: placeable.visible,
        renderable: placeable.renderable
      });
    }
  }

  _restoreNativeRegionVisibility() {
    const regionLayer = canvas?.regions;
    if (regionLayer && this._nativeRegionLayerState) {
      regionLayer.visible = this._nativeRegionLayerState.visible;
      regionLayer.renderable = this._nativeRegionLayerState.renderable;
      if (regionLayer.objects) {
        if (this._nativeRegionLayerState.objectsVisible !== undefined) regionLayer.objects.visible = this._nativeRegionLayerState.objectsVisible;
        if (this._nativeRegionLayerState.objectsRenderable !== undefined) regionLayer.objects.renderable = this._nativeRegionLayerState.objectsRenderable;
      }
    }
    this._nativeRegionLayerState = null;
    if (!this._nativeRegionVisibility) return;
    for (const [placeable, state] of this._nativeRegionVisibility) {
      if (placeable.destroyed) continue;
      placeable.visible = state.visible;
      placeable.renderable = state.renderable;
    }
    this._nativeRegionVisibility = null;
  }

  _drawPreview() {
    const graphics = this.preview;
    if (!graphics) return;
    graphics.clear();
    if (!DRAW_TOOLS.has(this._activeTool)) return;
    const scale = canvas.stage?.scale?.x || 1;
    if ((this._activeTool === TOOL_RECTANGLE || this._activeTool === TOOL_CIRCLE) && this._shapeStart && this._shapeHover) {
      const shape = this._shapeFromDrag(this._activeTool, this._shapeStart, this._shapeHover);
      graphics.lineStyle(2 / scale, PREVIEW_COLOR, 0.9);
      if (shape?.type === "rectangle") graphics.drawRect(shape.x, shape.y, shape.width, shape.height);
      else if (shape?.type === "circle") graphics.drawCircle(shape.x, shape.y, shape.radius);
      graphics.beginFill(PREVIEW_COLOR, 0.95);
      graphics.drawCircle(this._shapeStart.x, this._shapeStart.y, 4 / scale);
      graphics.endFill();
      return;
    }
    if (this._activeTool !== TOOL_POLYGON) return;
    const points = this._hover && this._points.length ? [...this._points, this._hover] : this._points;
    if (!points.length) return;

    graphics.lineStyle(2 / scale, PREVIEW_COLOR, 0.9);
    if (points.length > 1) {
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      if (this._points.length >= MIN_POLYGON_POINTS) graphics.lineTo(points[0].x, points[0].y);
    }
    for (const point of this._points) {
      graphics.beginFill(PREVIEW_COLOR, 0.95);
      graphics.drawCircle(point.x, point.y, 4 / scale);
      graphics.endFill();
    }
    if (this._points.length >= MIN_POLYGON_POINTS) {
      const first = this._points[0];
      graphics.lineStyle(1 / scale, PREVIEW_COLOR, 0.45);
      graphics.drawCircle(first.x, first.y, POINT_CLOSE_DISTANCE / scale);
    }
  }

  _drawPerspectiveHandle() {
    this._drawSunHandle();
    const graphics = this.perspectiveHandle;
    if (!graphics) return;
    graphics.clear();
    const visible = this._isPerspectiveHandleVisible();
    graphics.visible = visible;
    if (!visible) return;
    const point = this._edgePointPreview ?? this._sceneEdgePoint();
    const scale = canvas.stage?.scale?.x || 1;
    const radius = EDGE_HANDLE_RADIUS / scale;
    graphics.lineStyle(2 / scale, 0x111111, 0.85);
    graphics.beginFill(EDGE_HANDLE_COLOR, 0.95);
    graphics.drawCircle(point.x, point.y, radius);
    graphics.endFill();
    graphics.lineStyle(1 / scale, 0xffffff, 0.9);
    graphics.moveTo(point.x - radius * 0.55, point.y);
    graphics.lineTo(point.x + radius * 0.55, point.y);
    graphics.moveTo(point.x, point.y - radius * 0.55);
    graphics.lineTo(point.x, point.y + radius * 0.55);
  }

  _drawSunHandle() {
    const graphics = this.sunHandle;
    if (!graphics) return;
    graphics.clear();
    const visible = this._isSunHandleVisible();
    graphics.visible = visible;
    if (!visible) return;
    const point = this._sunEdgePointPreview ?? this._sunEdgePoint();
    const scale = canvas.stage?.scale?.x || 1;
    const radius = (EDGE_HANDLE_RADIUS + 2) / scale;
    graphics.lineStyle(2 / scale, 0x4a2d00, 0.9);
    graphics.beginFill(SUN_HANDLE_COLOR, 0.98);
    graphics.drawCircle(point.x, point.y, radius);
    graphics.endFill();
    graphics.lineStyle(1.5 / scale, 0xfff3b0, 0.95);
    for (let index = 0; index < 8; index++) {
      const angle = (Math.PI * 2 * index) / 8;
      const inner = radius * 1.35;
      const outer = radius * 1.85;
      graphics.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
      graphics.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
    }
  }

  _isPerspectiveHandleVisible() {
    return this._activeTool === TOOL_SELECT && canvas?.scene && (
      getSceneElevationSetting(SCENE_SETTING_KEYS.PERSPECTIVE_POINT) === PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE
      || getSceneElevationSetting(SCENE_SETTING_KEYS.PARALLAX_MODE) === PARALLAX_MODES.ORTHOGRAPHIC_ANGLE
    );
  }

  _isSunHandleVisible() {
    return this._activeTool === TOOL_SELECT && canvas?.scene && getSceneElevationSetting(SCENE_SETTING_KEYS.SHADOW_MODE) === SHADOW_MODES.SUN_AT_EDGE;
  }

  _isOnPerspectiveHandle(point) {
    const handle = this._edgePointPreview ?? this._sceneEdgePoint();
    return Math.hypot(point.x - handle.x, point.y - handle.y) <= (EDGE_HANDLE_RADIUS + 6) / (canvas.stage?.scale?.x || 1);
  }

  _isOnSunHandle(point) {
    const handle = this._sunEdgePointPreview ?? this._sunEdgePoint();
    return Math.hypot(point.x - handle.x, point.y - handle.y) <= (EDGE_HANDLE_RADIUS + 8) / (canvas.stage?.scale?.x || 1);
  }

  _sceneEdgePoint() {
    return this._clampPointToSceneEdge(getSceneElevationSetting(SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT));
  }

  _sunEdgePoint() {
    return this._clampPointToSceneEdge(getSceneElevationSetting(SCENE_SETTING_KEYS.SUN_EDGE_POINT));
  }

  _clampPointToSceneEdge(point) {
    const geo = sceneGeometry(canvas.scene);
    const x = Math.clamp(Number(point?.x ?? geo.x + geo.width / 2), geo.x, geo.x + geo.width);
    const y = Math.clamp(Number(point?.y ?? geo.y), geo.y, geo.y + geo.height);
    const distances = [
      { edge: "top", distance: Math.abs(y - geo.y) },
      { edge: "right", distance: Math.abs(x - (geo.x + geo.width)) },
      { edge: "bottom", distance: Math.abs(y - (geo.y + geo.height)) },
      { edge: "left", distance: Math.abs(x - geo.x) }
    ].sort((left, right) => left.distance - right.distance);
    switch (distances[0].edge) {
      case "right": return { x: geo.x + geo.width, y };
      case "bottom": return { x, y: geo.y + geo.height };
      case "left": return { x: geo.x, y };
      case "top":
      default: return { x, y: geo.y };
    }
  }

  _drawElevationRegionOutlines() {
    const graphics = this.outlines;
    if (!graphics) return;
    graphics.clear();
    if (!graphics.visible || !canvas.scene) return;
    const entries = getActiveElevationRegions(canvas.scene);
    const scale = canvas.stage?.scale?.x || 1;
    for (const entry of entries) {
      const dragDelta = this._regionDrag?.region?.id === entry.region.id ? _regionDragDelta(this._regionDrag) : null;
      const paths = dragDelta ? _translatePaths(_regionPaths(entry.region), dragDelta.x, dragDelta.y) : _regionPaths(entry.region);
      const outlineElevation = entry.slope ? entry.highestElevation : entry.elevation;
      const alpha = outlineElevation < 0 ? 0.7 : 0.9;
      const selected = this._selectedRegionId === entry.region.id || !!dragDelta;
      graphics.lineStyle((selected ? 3.5 : 2) / scale, selected ? SELECTED_OUTLINE_COLOR : outlineElevation < 0 ? 0x8ec5ff : OUTLINE_COLOR, selected ? 0.98 : alpha);
      for (const path of paths) graphics.drawPolygon(path.flatMap(point => [point.x, point.y]));
      if (entry.slope && (selected || this._hoveredRegionId === entry.region.id || this._editedRegionId === entry.region.id || _isRegionSelected(entry.region))) this._drawSlopeArrow(graphics, entry, paths, scale);
    }
  }

  _drawSlopeArrow(graphics, entry, paths, scale) {
    const bounds = _pathsBounds(paths);
    if (!bounds) return;
    const vector = entry.slopeVector ?? _slopeDirectionVector(entry.slopeDirection);
    const minLength = 28 / scale;
    const maxLength = 92 / scale;
    const length = Math.clamp(Math.min(bounds.width, bounds.height) * 0.38, minLength, maxLength);
    const center = bounds.center;
    const start = { x: center.x - vector.x * length * 0.48, y: center.y - vector.y * length * 0.48 };
    const end = { x: center.x + vector.x * length * 0.48, y: center.y + vector.y * length * 0.48 };
    const angle = Math.atan2(vector.y, vector.x);
    const head = Math.clamp(length * 0.28, 10 / scale, 22 / scale);
    const left = { x: end.x - Math.cos(angle - Math.PI / 6) * head, y: end.y - Math.sin(angle - Math.PI / 6) * head };
    const right = { x: end.x - Math.cos(angle + Math.PI / 6) * head, y: end.y - Math.sin(angle + Math.PI / 6) * head };
    graphics.lineStyle(5 / scale, 0x111111, 0.78);
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.moveTo(left.x, left.y);
    graphics.lineTo(end.x, end.y);
    graphics.lineTo(right.x, right.y);
    graphics.lineStyle(2.5 / scale, PREVIEW_COLOR, 0.98);
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.moveTo(left.x, left.y);
    graphics.lineTo(end.x, end.y);
    graphics.lineTo(right.x, right.y);
  }
}

export function registerElevationControls() {
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user.isGM) return;
    controls.elevation = {
      name: "elevation",
      title: "SCENE_ELEVATION.Control.Group",
      icon: "fa-solid fa-arrows-up-to-line",
      layer: ElevationAuthoringLayer.LAYER_NAME,
      visible: game.user.isGM,
      activeTool: TOOL_SELECT,
      tools: {
        [TOOL_SELECT]: {
          name: TOOL_SELECT,
          title: "SCENE_ELEVATION.Control.Select",
          icon: "fa-solid fa-arrow-pointer",
          visible: game.user.isGM,
          onChange: (_event, active) => {
            const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
            if (active) layer?.activateTool(TOOL_SELECT);
            else layer?.activateTool(null);
          }
        },
        [TOOL_POLYGON]: {
          name: TOOL_POLYGON,
          title: "SCENE_ELEVATION.Control.DrawPolygon",
          icon: "fa-solid fa-draw-polygon",
          visible: game.user.isGM,
          onChange: (_event, active) => {
            const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
            if (active) layer?.activateTool(TOOL_POLYGON);
            else layer?.activateTool(null);
          }
        },
        [TOOL_RECTANGLE]: {
          name: TOOL_RECTANGLE,
          title: "SCENE_ELEVATION.Control.DrawRectangle",
          icon: "fa-regular fa-square",
          visible: game.user.isGM,
          onChange: (_event, active) => {
            const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
            if (active) layer?.activateTool(TOOL_RECTANGLE);
            else layer?.activateTool(null);
          }
        },
        [TOOL_CIRCLE]: {
          name: TOOL_CIRCLE,
          title: "SCENE_ELEVATION.Control.DrawCircle",
          icon: "fa-regular fa-circle",
          visible: game.user.isGM,
          onChange: (_event, active) => {
            const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
            if (active) layer?.activateTool(TOOL_CIRCLE);
            else layer?.activateTool(null);
          }
        },
        sceneSettings: {
          name: "sceneSettings",
          title: "SCENE_ELEVATION.Control.SceneSettings",
          icon: "fa-solid fa-sliders",
          button: true,
          visible: game.user.isGM,
          onChange: async () => {
            await openSceneElevationSettingsDialog(canvas.scene);
            canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility();
            canvas?.[ElevationAuthoringLayer.LAYER_NAME]?._drawPerspectiveHandle?.();
          }
        },
        showElevationRegions: {
          name: "showElevationRegions",
          title: "SCENE_ELEVATION.Control.ShowElevationRegions",
          icon: "fa-solid fa-eye",
          toggle: true,
          active: game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS),
          visible: game.user.isGM,
          onChange: async (_event, active) => {
            const current = game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS);
            const next = typeof active === "boolean" ? active : !current;
            await game.settings.set(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS, next);
            canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility();
          }
        }
      }
    };
  });

  Hooks.on("renderSceneControls", controls => {
    const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
    if (!layer) return;
    const activeControl = controls.control?.name === "elevation";
    if (activeControl) {
      const requestedTool = controls.tool?.name ?? TOOL_SELECT;
      const toolName = ELEVATION_TOOLS.has(requestedTool) ? requestedTool : TOOL_SELECT;
      if (UTILITY_TOOLS.has(requestedTool)) {
        layer.activateTool(TOOL_SELECT);
        layer.refreshElevationRegionVisibility();
      }
      else layer.activateTool(toolName);
      layer.queueElevationRegionVisibilityRefresh();
      _queueDrawElevationControlRender(layer._activeTool);
    }
    else {
      layer.deactivate();
      _removeDrawElevationControl();
    }
  });

  for (const hook of ["createRegion", "updateRegion", "deleteRegion", "createRegionBehavior", "updateRegionBehavior", "deleteRegionBehavior"]) {
    Hooks.on(hook, (doc) => {
      const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
      if (hook === "updateRegion") layer?._noteRegionChanged("update", doc);
      else if (hook === "deleteRegion") layer?._noteRegionChanged("delete", doc);
      layer?.refreshElevationRegionVisibility();
      layer?._drawPerspectiveHandle?.();
    });
  }

  // Re-assert visibility whenever Foundry refreshes/draws a Region placeable.
  // Without this, switching from the native Regions control to our Elevation
  // control can leave region area highlights visible until the user toggles
  // away and back, because Foundry re-renders region placeables after our
  // initial hide pass.
  for (const hook of ["refreshRegion", "drawRegion"]) {
    Hooks.on(hook, () => {
      const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
      if (!layer || layer._activeTool === null) return;
      layer.refreshElevationRegionVisibility();
    });
  }

  Hooks.on("updateScene", scene => {
    if (scene !== canvas?.scene) return;
    const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
    layer?.refreshElevationRegionVisibility();
    layer?._drawPerspectiveHandle?.();
  });

  Hooks.on("canvasPan", () => {
    canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.queueOverheadRegionIconRefresh();
  });
}

function _currentDrawElevationValue() {
  return Number.isFinite(_drawElevationValue) ? _drawElevationValue : 1;
}

function _queueDrawElevationControlRender(toolName) {
  if (_drawElevationControlFrame) cancelAnimationFrame(_drawElevationControlFrame);
  _drawElevationControlFrame = requestAnimationFrame(() => {
    _drawElevationControlFrame = null;
    _renderDrawElevationControl(toolName);
  });
}

function _renderDrawElevationControl(toolName) {
  if (!game.user?.isGM || !DRAW_TOOLS.has(toolName)) {
    _removeDrawElevationControl();
    return;
  }
  const anchor = _sceneSettingsControlHost();
  if (!anchor) {
    _removeDrawElevationControl();
    return;
  }
  const control = document.getElementById(DRAW_ELEVATION_CONTROL_ID) ?? _createDrawElevationControl();
  _syncDrawElevationControl(control);
  if (!control.isConnected) document.body.appendChild(control);
  _drawElevationAnchorElement = anchor;
  _bindDrawElevationViewportListener();
  _positionDrawElevationControl(control, anchor);
}

function _removeDrawElevationControl() {
  if (_drawElevationControlFrame) {
    cancelAnimationFrame(_drawElevationControlFrame);
    _drawElevationControlFrame = null;
  }
  _drawElevationAnchorElement = null;
  _unbindDrawElevationViewportListener();
  document.getElementById(DRAW_ELEVATION_CONTROL_ID)?.remove();
}

function _createDrawElevationControl() {
  const control = document.createElement("div");
  control.id = DRAW_ELEVATION_CONTROL_ID;
  control.className = `${MODULE_ID}-draw-elevation-control`;
  control.setAttribute("role", "group");
  control.title = game.i18n.localize("SCENE_ELEVATION.Control.DrawElevation");
  const decrease = _createDrawElevationButton("decrease", "fa-solid fa-arrow-down", "SCENE_ELEVATION.Control.DrawElevationDecrease");
  const input = document.createElement("input");
  input.type = "number";
  input.step = "1";
  input.inputMode = "decimal";
  input.className = `${MODULE_ID}-draw-elevation-input`;
  input.title = game.i18n.localize("SCENE_ELEVATION.Control.DrawElevation");
  input.setAttribute("aria-label", input.title);
  const increase = _createDrawElevationButton("increase", "fa-solid fa-arrow-up", "SCENE_ELEVATION.Control.DrawElevationIncrease");
  control.replaceChildren(decrease, input, increase);
  control.addEventListener("pointerdown", event => event.stopPropagation(), { capture: true });
  control.addEventListener("click", _onDrawElevationControlClick);
  control.addEventListener("input", _onDrawElevationControlInput);
  control.addEventListener("change", _onDrawElevationControlInput);
  return control;
}

function _positionDrawElevationControl(control, anchor) {
  const rect = anchor.getBoundingClientRect?.();
  if (!rect) return;
  const gap = 6;
  const width = control.offsetWidth || 128;
  const height = control.offsetHeight || 34;
  const maxLeft = Math.max(gap, window.innerWidth - width - gap);
  const maxTop = Math.max(gap, window.innerHeight - height - gap);
  const rightSide = rect.right + gap;
  const leftSide = rect.left - width - gap;
  const left = rightSide <= maxLeft ? rightSide : Math.max(gap, Math.min(leftSide, maxLeft));
  const centeredTop = rect.top + rect.height / 2 - height / 2;
  const top = Math.max(gap, Math.min(centeredTop, maxTop));
  control.style.left = `${left}px`;
  control.style.top = `${top}px`;
}

function _bindDrawElevationViewportListener() {
  if (_drawElevationResizeListenerBound) return;
  window.addEventListener("resize", _onDrawElevationViewportChange, { passive: true });
  _drawElevationResizeListenerBound = true;
}

function _unbindDrawElevationViewportListener() {
  if (!_drawElevationResizeListenerBound) return;
  window.removeEventListener("resize", _onDrawElevationViewportChange);
  _drawElevationResizeListenerBound = false;
}

function _onDrawElevationViewportChange() {
  const control = document.getElementById(DRAW_ELEVATION_CONTROL_ID);
  const anchor = _drawElevationAnchorElement?.isConnected ? _drawElevationAnchorElement : _sceneSettingsControlHost();
  if (!control || !anchor) {
    _removeDrawElevationControl();
    return;
  }
  _drawElevationAnchorElement = anchor;
  _positionDrawElevationControl(control, anchor);
}

function _createDrawElevationButton(action, iconClass, titleKey) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.title = game.i18n.localize(titleKey);
  button.setAttribute("aria-label", button.title);
  const icon = document.createElement("i");
  icon.className = iconClass;
  button.appendChild(icon);
  return button;
}

function _syncDrawElevationControl(control) {
  const input = control.querySelector("input");
  if (!input) return;
  const value = _formatElevationLabel(_currentDrawElevationValue());
  if (document.activeElement !== input) input.value = value;
}

function _onDrawElevationControlClick(event) {
  event.stopPropagation();
  const button = event.target?.closest?.("button[data-action]");
  if (!button) return;
  event.preventDefault();
  const step = button.dataset.action === "decrease" ? -1 : 1;
  _setDrawElevationValue(_currentDrawElevationValue() + step);
  const control = button.closest(`.${MODULE_ID}-draw-elevation-control`);
  if (control) _syncDrawElevationControl(control);
}

function _onDrawElevationControlInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  event.stopPropagation();
  _setDrawElevationValue(input.value);
}

function _setDrawElevationValue(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  _drawElevationValue = next;
}

function _sceneSettingsControlHost() {
  const selectors = [
    `[data-tool="sceneSettings"]`,
    `[data-action="sceneSettings"]`,
    `[data-tool-name="sceneSettings"]`,
    `[name="sceneSettings"]`
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return _sceneControlHostElement(element);
  }
  const title = game.i18n.localize("SCENE_ELEVATION.Control.SceneSettings");
  for (const element of document.querySelectorAll("button, a, [role='button']")) {
    if (element.title === title || element.getAttribute("aria-label") === title) return _sceneControlHostElement(element);
  }
  return null;
}

function _sceneControlHostElement(element) {
  return element.closest("li") ?? element.closest(".control-tool") ?? element;
}

function _normalizeRegionPath(path) {
  if (!Array.isArray(path) || !path.length) return [];
  if (typeof path[0] === "number") {
    const points = [];
    for (let index = 0; index < path.length - 1; index += 2) points.push({ x: Number(path[index]), y: Number(path[index + 1]) });
    return points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return path.map(point => ({ x: Number(point.X ?? point.x), y: Number(point.Y ?? point.y) }))
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
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
  return rawPaths.map(_normalizeRegionPath).filter(path => path.length >= MIN_POLYGON_POINTS);
}

function _hoverElevationStateAtPoint(point) {
  const state = getRegionElevationStateAtPoint(point, canvas.scene);
  return state.found ? state : null;
}

function _regionDragDelta(drag) {
  return {
    x: (drag?.current?.x ?? drag?.start?.x ?? 0) - (drag?.start?.x ?? 0),
    y: (drag?.current?.y ?? drag?.start?.y ?? 0) - (drag?.start?.y ?? 0)
  };
}

function _cloneRegionShapes(region) {
  const shapes = region?.shapes ?? region?._source?.shapes ?? [];
  return Array.from(shapes).map(shape => shape?.toObject ? shape.toObject() : foundry.utils.deepClone(shape));
}

function _translateRegionShapes(shapes, dx, dy) {
  return shapes.map(shape => {
    const next = foundry.utils.deepClone(shape);
    if (Array.isArray(next.points)) next.points = next.points.map((value, index) => Number(value) + (index % 2 === 0 ? dx : dy));
    if (Number.isFinite(Number(next.x))) next.x = Number(next.x) + dx;
    if (Number.isFinite(Number(next.y))) next.y = Number(next.y) + dy;
    return next;
  });
}

function _translatePaths(paths, dx, dy) {
  return paths.map(path => path.map(point => ({ x: point.x + dx, y: point.y + dy })));
}

function _renderDocumentSheet(document, sheet = document?.sheet) {
  if (sheet?.render) {
    try {
      sheet.render({ force: true });
      return sheet;
    } catch (err) {
      try {
        sheet.render(true);
        return sheet;
      } catch (legacyError) {}
    }
  }
  const RegionConfig = foundry.applications?.sheets?.RegionConfig;
  if (!RegionConfig) return null;
  const app = new RegionConfig({ document });
  app.render({ force: true });
  return app;
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

function _canvasPointToViewport(point) {
  const renderer = canvas?.app?.renderer;
  const view = renderer?.view ?? canvas?.app?.view ?? canvas?.app?.canvas;
  const rect = view?.getBoundingClientRect?.();
  const parent = canvas?.primary ?? canvas?.stage;
  if (!renderer || !rect || !parent) return null;
  const PointClass = globalThis.PIXI?.Point;
  const pixiPoint = typeof PointClass === "function" ? new PointClass(point.x, point.y) : point;
  const global = parent.toGlobal(pixiPoint);
  const screen = renderer.screen ?? { x: 0, y: 0, width: view.width, height: view.height };
  const scaleX = rect.width / Math.max(1, screen.width ?? view.width ?? rect.width);
  const scaleY = rect.height / Math.max(1, screen.height ?? view.height ?? rect.height);
  return {
    x: rect.left + (global.x - (screen.x ?? 0)) * scaleX,
    y: rect.top + (global.y - (screen.y ?? 0)) * scaleY
  };
}

function _slopeDirectionVector(degrees) {
  const radians = ((((Number(degrees) || 0) % 360) + 360) % 360) * Math.PI / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

function _isRegionSelected(region) {
  const regionLayer = canvas?.regions;
  const placeables = _regionLayerPlaceables(regionLayer);
  const placeable = region?.object ?? placeables.find(candidate => candidate.document === region);
  if (placeable?.controlled || placeable?.selected || placeable?.isControlled) return true;
  return Array.from(regionLayer?.controlled ?? []).some(candidate => candidate?.document === region);
}

function _formatElevationLabel(elevation) {
  const value = Number(elevation ?? 0);
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function _regionLayerPlaceables(regionLayer) {
  const placeables = regionLayer.placeables ?? regionLayer.objects?.children ?? regionLayer.children ?? [];
  return Array.from(placeables).filter(placeable => placeable?.document);
}

function _isElevationRegionDocument(document) {
  return !!document?.behaviors?.some?.(behavior => behavior.type === REGION_BEHAVIOR_TYPE && !behavior.disabled);
}

function _randomRegionColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}

function _regionHighlightMode() {
  return _regionChoiceByLabel("highlightMode", /true\s*shapes?/i, [
    CONST.REGION_HIGHLIGHT_MODES?.TRUE_SHAPES,
    CONST.REGION_HIGHLIGHT_MODES?.SHAPES,
    CONST.REGION_HIGHLIGHT_MODES?.SHAPE,
    "trueShapes",
    "shapes",
    "shape",
    "coverage"
  ]);
}

function _regionVisibility() {
  return _regionChoiceByLabel("visibility", /region\s*layer/i, [
    CONST.REGION_VISIBILITY?.LAYER,
    CONST.REGION_VISIBILITY?.REGION_LAYER,
    CONST.REGION_VISIBILITY?.CONTROL,
    "layer",
    "regionLayer",
    CONST.REGION_VISIBILITY?.OBSERVER,
    "observer"
  ]);
}

function _regionChoiceByLabel(fieldName, labelPattern, fallbacks) {
  const choices = _regionFieldChoices(fieldName);
  for (const [value, label] of choices) {
    if (labelPattern.test(_regionChoiceLabel(label))) return value;
  }
  const validValues = new Set(choices.map(([value]) => value));
  for (const value of fallbacks) {
    if (value == null) continue;
    if (!validValues.size || validValues.has(value)) return value;
  }
  return choices[0]?.[0] ?? fallbacks.find(value => value != null);
}

function _regionFieldChoices(fieldName) {
  const documentClass = CONFIG.Region?.documentClass ?? foundry.documents?.RegionDocument ?? foundry.documents?.BaseRegion;
  const field = documentClass?.defineSchema?.()?.[fieldName];
  const choices = field?.choices ?? field?.options?.choices ?? {};
  if (choices instanceof Map) return Array.from(choices.entries());
  if (Array.isArray(choices)) return choices.map(value => Array.isArray(value) ? value : [value, value]);
  return Object.entries(choices).map(([value, label]) => [_coerceChoiceValue(value), label]);
}

function _regionChoiceLabel(label) {
  if (typeof label === "string") return `${label} ${_localizedString(label)}`;
  if (label && typeof label === "object") {
    const nested = label.label ?? label.name ?? label.value ?? label.key;
    if (typeof nested === "string") return `${nested} ${_localizedString(nested)}`;
  }
  return String(label ?? "");
}

function _localizedString(key) {
  return game.i18n.localize(key);
}

function _coerceChoiceValue(value) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return value;
  return Number(value);
}
