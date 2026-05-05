import { MODULE_ID, SETTINGS, REGION_BEHAVIOR_TYPE, SHADOW_STRENGTH_LIMITS } from "./config.mjs";
import { getActiveElevationRegions } from "./region-elevation-renderer.mjs";

const MIN_POLYGON_POINTS = 3;
const POINT_CLOSE_DISTANCE = 10;
const DOUBLE_CLICK_MS = 420;
const DOUBLE_CLICK_DISTANCE = 8;
const PREVIEW_COLOR = 0x66ccff;
const OUTLINE_COLOR = 0xffd166;

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
    this._activeTool = null;
    this._points = [];
    this._hover = null;
    this._listeners = null;
    this._creating = false;
    this._lastClick = null;
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

    this.refreshElevationRegionVisibility();
  }

  async _tearDown(options) {
    this._unbindStageListeners();
    this.preview?.parent?.removeChild(this.preview);
    this.outlines?.parent?.removeChild(this.outlines);
    this.preview?.destroy();
    this.outlines?.destroy();
    this.preview = null;
    this.outlines = null;
    this._points = [];
    this._hover = null;
    this._lastClick = null;
    return super._tearDown?.(options);
  }

  activateTool(toolName) {
    if (toolName === "showElevationRegions") {
      this.refreshElevationRegionVisibility();
      return;
    }
    this._activeTool = toolName;
    if (toolName === "polygon") this._startPolygonDrawing();
    else this._stopPolygonDrawing();
    this.refreshElevationRegionVisibility();
  }

  deactivate() {
    this._activeTool = null;
    this._stopPolygonDrawing();
    this.refreshElevationRegionVisibility(false);
    return super.deactivate?.();
  }

  refreshElevationRegionVisibility(forceVisible = null) {
    if (!this.outlines) return;
    const visible = forceVisible ?? (this._activeTool !== null && game.settings.get(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS));
    this.outlines.visible = visible;
    this._drawElevationRegionOutlines();
  }

  _startPolygonDrawing() {
    this._bindStageListeners();
    this._points = [];
    this._hover = null;
    this._lastClick = null;
    if (this.preview) this.preview.visible = true;
    this._drawPreview();
  }

  _stopPolygonDrawing() {
    this._unbindStageListeners();
    this._points = [];
    this._hover = null;
    this._lastClick = null;
    this.preview?.clear();
    if (this.preview) this.preview.visible = false;
  }

  _bindStageListeners() {
    if (this._listeners) return;
    const stage = canvas.stage;
    if (!stage) return;
    const onMove = event => this._onPointerMove(event);
    const onDown = event => this._onPointerDown(event);
    const onKeyDown = event => this._onKeyDown(event);
    stage.on("pointermove", onMove);
    stage.on("pointerdown", onDown);
    window.addEventListener("keydown", onKeyDown);
    this._listeners = { onMove, onDown, onKeyDown };
  }

  _unbindStageListeners() {
    const stage = canvas.stage;
    if (stage && this._listeners) {
      stage.off("pointermove", this._listeners.onMove);
      stage.off("pointerdown", this._listeners.onDown);
    }
    if (this._listeners) window.removeEventListener("keydown", this._listeners.onKeyDown);
    this._listeners = null;
  }

  _onPointerMove(event) {
    if (this._activeTool !== "polygon") return;
    this._hover = this._eventPosition(event);
    this._drawPreview();
  }

  _onPointerDown(event) {
    if (this._activeTool !== "polygon" || this._creating) return;
    const button = event.button ?? event.data?.button ?? event.nativeEvent?.button ?? 0;
    if (button === 2) {
      event.stopPropagation?.();
      event.preventDefault?.();
      this._cancelPolygon();
      return;
    }
    if (button !== 0) return;

    event.stopPropagation?.();
    const original = event.nativeEvent ?? event.data?.originalEvent ?? event;
    const point = this._eventPosition(event);
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
    if (this._activeTool !== "polygon") return;
    if (event.key === "Escape") {
      event.preventDefault();
      this._cancelPolygon();
    } else if (event.key === "Enter") {
      event.preventDefault();
      void this._confirmPolygon();
    } else if ((event.key === "Backspace" || event.key === "Delete") && this._points.length) {
      event.preventDefault();
      this._points.pop();
      this._drawPreview();
    }
  }

  _eventPosition(event) {
    const parent = this.preview?.parent ?? canvas.primary ?? canvas.stage;
    const point = typeof event.getLocalPosition === "function"
      ? event.getLocalPosition(parent)
      : event.data.getLocalPosition(parent);
    const original = event.nativeEvent ?? event.data?.originalEvent ?? event;
    return this._snapPoint({ x: point.x, y: point.y }, original);
  }

  _snapPoint(point, event) {
    if (event?.shiftKey) return point;
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

  _cancelPolygon() {
    this._points = [];
    this._hover = null;
    this._lastClick = null;
    this._drawPreview();
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
        ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.Notify.RegionCreated"));
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
    if (!canvas.scene) return null;
    const number = canvas.scene.regions?.size ? canvas.scene.regions.size + 1 : 1;
    const regionData = {
      name: game.i18n.format("SCENE_ELEVATION.Control.RegionName", { number }),
      color: game.user.color,
      shapes: [{ type: "polygon", hole: false, points: points.flatMap(point => [point.x, point.y]) }],
      highlightMode: "coverage",
      displayMeasurements: true,
      visibility: CONST.REGION_VISIBILITY?.OBSERVER ?? "observer",
      ownership: { [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      behaviors: [{
        name: game.i18n.localize("SCENE_ELEVATION.RegionBehavior.Label"),
        type: REGION_BEHAVIOR_TYPE,
        system: {
          elevation: 1,
          shadowStrength: SHADOW_STRENGTH_LIMITS.DEFAULT,
          modifyTokenElevation: true,
          modifyTokenScaling: true
        }
      }],
      flags: { [MODULE_ID]: { createdByElevationTool: true } }
    };
    const [region] = await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
    return region ?? null;
  }

  _drawPreview() {
    const graphics = this.preview;
    if (!graphics) return;
    graphics.clear();
    if (this._activeTool !== "polygon") return;
    const points = this._hover && this._points.length ? [...this._points, this._hover] : this._points;
    if (!points.length) return;

    graphics.lineStyle(2 / (canvas.stage?.scale?.x || 1), PREVIEW_COLOR, 0.9);
    if (points.length > 1) {
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      if (this._points.length >= MIN_POLYGON_POINTS) graphics.lineTo(points[0].x, points[0].y);
    }
    for (const point of this._points) {
      graphics.beginFill(PREVIEW_COLOR, 0.95);
      graphics.drawCircle(point.x, point.y, 4 / (canvas.stage?.scale?.x || 1));
      graphics.endFill();
    }
    if (this._points.length >= MIN_POLYGON_POINTS) {
      const first = this._points[0];
      graphics.lineStyle(1 / (canvas.stage?.scale?.x || 1), PREVIEW_COLOR, 0.45);
      graphics.drawCircle(first.x, first.y, POINT_CLOSE_DISTANCE / (canvas.stage?.scale?.x || 1));
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
      const paths = _regionPaths(entry.region);
      const alpha = entry.elevation < 0 ? 0.7 : 0.9;
      graphics.lineStyle(2 / scale, entry.elevation < 0 ? 0x8ec5ff : OUTLINE_COLOR, alpha);
      for (const path of paths) graphics.drawPolygon(path.flatMap(point => [point.x, point.y]));
    }
  }
}

export function registerElevationControls() {
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user.isGM) return;
    controls.elevation = {
      name: "elevation",
      title: "SCENE_ELEVATION.Control.Group",
      icon: "fa-solid fa-mountain",
      layer: ElevationAuthoringLayer.LAYER_NAME,
      visible: game.user.isGM,
      activeTool: "polygon",
      tools: {
        polygon: {
          name: "polygon",
          title: "SCENE_ELEVATION.Control.DrawPolygon",
          icon: "fa-solid fa-draw-polygon",
          visible: game.user.isGM,
          onChange: (_event, active) => {
            const layer = canvas?.[ElevationAuthoringLayer.LAYER_NAME];
            if (active) layer?.activateTool("polygon");
            else layer?.activateTool(null);
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
      const toolName = controls.tool?.name ?? "polygon";
      if (toolName === "showElevationRegions") layer.refreshElevationRegionVisibility();
      else layer.activateTool(toolName);
    }
    else layer.deactivate();
  });

  for (const hook of ["createRegion", "updateRegion", "deleteRegion", "createRegionBehavior", "updateRegionBehavior", "deleteRegionBehavior"]) {
    Hooks.on(hook, () => canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility());
  }
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