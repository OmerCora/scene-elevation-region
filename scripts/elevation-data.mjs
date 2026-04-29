import { MODULE_ID, FLAGS, hDims, hIndex, REGION_BEHAVIOR_TYPE, WALL_FLAGS, sceneGeometry } from "./config.mjs";

/**
 * Per-scene elevation grid stored as a half-grid of points.
 * For a square grid scene with `cols × rows` cells, the half-grid is
 * `(cols*2+1) × (rows*2+1)` points so every cell has 9 anchored points.
 *
 * Two layers:
 *   - painted: persisted to scene flag — what the brush writes
 *   - composite: painted + region contributions + wall thickness contributions
 *     (rebuilt in memory; what the mesh shader / token scaling read)
 */
export class ElevationData {
  static _cache = new WeakMap();

  static get(scene) {
    if (!scene) return null;
    let data = ElevationData._cache.get(scene);
    if (data) {
      const geo = sceneGeometry(scene);
      if (data.cols === geo.cols && data.rows === geo.rows && data.gridSize === geo.gridSize) return data;
    }
    data = new ElevationData(scene);
    ElevationData._cache.set(scene, data);
    return data;
  }

  constructor(scene) {
    this.scene = scene;
    let raw = null;
    try { raw = scene.getFlag(MODULE_ID, FLAGS.GRID); }
    catch (err) { raw = scene.flags?.[MODULE_ID]?.[FLAGS.GRID] ?? null; }
    // Always use current scene-rect dimensions. Older versions saved canvas
    // padded dimensions by mistake, so saved cols/rows are intentionally ignored.
    const geo = sceneGeometry(scene);
    this.cols = geo.cols;
    this.rows = geo.rows;
    this.gridSize = geo.gridSize;
    const { hCols, hRows } = hDims(this.cols, this.rows);
    const expected = hCols * hRows;
    // If the saved point count matches the current dims, restore. Otherwise
    // start fresh — the painted layer is implicit-zero so no data is lost
    // beyond what was already misaligned.
    this.painted = (raw?.points && raw.points.length === expected)
      ? raw.points.slice()
      : new Array(expected).fill(0);
    this.composite = this.painted.slice();
    this._dirty = false;
    this._compositeDirty = true;
  }

  get hCols() { return this.cols * 2 + 1; }
  get hRows() { return this.rows * 2 + 1; }

  /* -------------------------------------- */
  /*  Painted layer (brush writes here)      */
  /* -------------------------------------- */

  getPaintedH(hx, hy) {
    if (hx < 0 || hy < 0 || hx >= this.hCols || hy >= this.hRows) return 0;
    return this.painted[hIndex(hx, hy, this.cols)] ?? 0;
  }

  setPaintedH(hx, hy, value) {
    if (hx < 0 || hy < 0 || hx >= this.hCols || hy >= this.hRows) return;
    this.painted[hIndex(hx, hy, this.cols)] = value;
    this._dirty = true;
    this._compositeDirty = true;
  }

  /* -------------------------------------- */
  /*  Composite (read-only; sample/render)   */
  /* -------------------------------------- */

  /** Get composite elevation at a half-grid point. */
  getH(hx, hy) {
    if (this._compositeDirty) this.rebuildComposite();
    if (hx < 0 || hy < 0 || hx >= this.hCols || hy >= this.hRows) return 0;
    return this.composite[hIndex(hx, hy, this.cols)] ?? 0;
  }

  /** Bilinear sample of composite at world coords (token scaling, eyedropper). */
  sampleAt(worldX, worldY) {
    if (this._compositeDirty) this.rebuildComposite();
    const halfGs = this.gridSize / 2;
    const fx = worldX / halfGs;
    const fy = worldY / halfGs;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const a = this.getH(x0, y0);
    const b = this.getH(x0 + 1, y0);
    const c = this.getH(x0, y0 + 1);
    const d = this.getH(x0 + 1, y0 + 1);
    const ab = a + (b - a) * tx;
    const cd = c + (d - c) * tx;
    return ab + (cd - ab) * ty;
  }

  cellAverage(cx, cy) {
    const hx = cx * 2, hy = cy * 2;
    let sum = 0;
    for (let dy = 0; dy <= 2; dy++) for (let dx = 0; dx <= 2; dx++) {
      sum += this.getH(hx + dx, hy + dy);
    }
    return sum / 9;
  }

  hToWorld(hx, hy) {
    const halfGs = this.gridSize / 2;
    return { x: hx * halfGs, y: hy * halfGs };
  }

  /* -------------------------------------- */
  /*  Composite assembly                     */
  /* -------------------------------------- */

  invalidateComposite() {
    this._compositeDirty = true;
  }

  /** Recompute composite = painted + regions + walls. */
  rebuildComposite() {
    this._compositeDirty = false;
    const len = this.composite.length;
    for (let i = 0; i < len; i++) this.composite[i] = this.painted[i];
    this._applyRegions();
    this._applyWalls();
  }

  /** Apply elevation region behaviors (set / plateau / ramp + edge fade). */
  _applyRegions() {
    const regions = this.scene.regions;
    if (!regions?.size) return;
    const halfGs = this.gridSize / 2;
    for (const region of regions) {
      const beh = region.behaviors?.find(b => b.type === REGION_BEHAVIOR_TYPE && !b.disabled);
      if (!beh) continue;
      const sys = beh.system ?? {};
      const height = Number(sys.height) || 0;
      const mode = sys.mode || "set"; // set | add | plateau | ramp
      const fade = Math.clamp(Number(sys.fade ?? 0), 0, 100) / 100;
      const rampDir = Number(sys.rampDirection) || 0; // radians; for ramp mode
      const rampLen = Math.max(1, Number(sys.rampLength) || 1) * this.gridSize;

      // Region polygons (clipper output): array of polygon arrays of [x,y,...]
      const polygons = region.polygonTree?.toClipperPoints?.()
        ?? region.polygons?.map(p => Array.from(p.points)) // fallback
        ?? [];
      if (!polygons.length) continue;

      // Bounding box across all polygons
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const poly of polygons) {
        const pts = Array.isArray(poly) && poly.length && typeof poly[0] === "object"
          ? poly.flatMap(p => [p.X ?? p.x, p.Y ?? p.y])
          : poly;
        for (let i = 0; i < pts.length; i += 2) {
          const x = pts[i], y = pts[i + 1];
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
      }
      if (!Number.isFinite(minX)) continue;

      const minHx = Math.max(0, Math.floor(minX / halfGs));
      const maxHx = Math.min(this.hCols - 1, Math.ceil(maxX / halfGs));
      const minHy = Math.max(0, Math.floor(minY / halfGs));
      const maxHy = Math.min(this.hRows - 1, Math.ceil(maxY / halfGs));

      for (let hy = minHy; hy <= maxHy; hy++) {
        for (let hx = minHx; hx <= maxHx; hx++) {
          const x = hx * halfGs, y = hy * halfGs;
          if (!region.testPoint?.({ x, y, elevation: 0 })) continue;
          const idx = hIndex(hx, hy, this.cols);

          let contribution = 0;
          switch (mode) {
            case "add":
              contribution = height;
              break;
            case "ramp": {
              // Project (x,y) onto rampDir from region center; map to [0..1] over rampLen
              const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
              const dx = x - cx, dy = y - cy;
              const proj = dx * Math.cos(rampDir) + dy * Math.sin(rampDir);
              const t = Math.clamp((proj + rampLen / 2) / rampLen, 0, 1);
              contribution = height * t;
              this.composite[idx] = this._mixWithFade(this.composite[idx], this.painted[idx] + contribution, fade);
              continue;
            }
            case "plateau":
            case "set":
            default:
              contribution = height;
              if (mode === "set") {
                this.composite[idx] = this._mixWithFade(this.composite[idx], height, fade);
                continue;
              }
              break;
          }
          this.composite[idx] = this.composite[idx] + contribution;
        }
      }
    }
  }

  _mixWithFade(current, target, fade01) {
    if (fade01 <= 0) return target;
    return current + (target - current) * (1 - fade01);
  }

  /** Apply elevated-wall thickness contributions. */
  _applyWalls() {
    const walls = this.scene.walls;
    if (!walls?.size) return;
    const halfGs = this.gridSize / 2;
    const gs = this.gridSize;

    for (const wall of walls) {
      const thickness = Number(wall.getFlag(MODULE_ID, WALL_FLAGS.THICKNESS)) || 0;
      if (thickness <= 0) continue;
      const height = Number(wall.getFlag(MODULE_ID, WALL_FLAGS.HEIGHT)) || 0;
      const fade = Math.clamp(Number(wall.getFlag(MODULE_ID, WALL_FLAGS.FADE) ?? 50), 0, 100) / 100;
      if (height === 0) continue;

      const [x1, y1, x2, y2] = wall.c;
      const radius = thickness * gs;
      const minX = Math.min(x1, x2) - radius, maxX = Math.max(x1, x2) + radius;
      const minY = Math.min(y1, y2) - radius, maxY = Math.max(y1, y2) + radius;
      const minHx = Math.max(0, Math.floor(minX / halfGs));
      const maxHx = Math.min(this.hCols - 1, Math.ceil(maxX / halfGs));
      const minHy = Math.max(0, Math.floor(minY / halfGs));
      const maxHy = Math.min(this.hRows - 1, Math.ceil(maxY / halfGs));

      const dx = x2 - x1, dy = y2 - y1;
      const segLen2 = dx * dx + dy * dy;
      if (segLen2 === 0) continue;

      for (let hy = minHy; hy <= maxHy; hy++) {
        for (let hx = minHx; hx <= maxHx; hx++) {
          const px = hx * halfGs, py = hy * halfGs;
          // Distance from point to segment
          let t = ((px - x1) * dx + (py - y1) * dy) / segLen2;
          t = Math.clamp(t, 0, 1);
          const cxp = x1 + t * dx, cyp = y1 + t * dy;
          const dxp = px - cxp, dyp = py - cyp;
          const dist = Math.hypot(dxp, dyp);
          if (dist > radius) continue;
          const u = dist / radius;        // 0 at line, 1 at outer edge
          const linear = 1 - u;
          const eased = linear * linear * (3 - 2 * linear);
          const weight = (1 - fade) + fade * eased;
          const idx = hIndex(hx, hy, this.cols);
          // Walls additively raise the composite (non-destructive of painted).
          this.composite[idx] += height * weight;
        }
      }
    }
  }

  /* -------------------------------------- */
  /*  Persistence                            */
  /* -------------------------------------- */

  async save() {
    if (!this._dirty) return;
    this._dirty = false;
    await this.scene.setFlag(MODULE_ID, FLAGS.GRID, {
      cols: this.cols,
      rows: this.rows,
      points: this.painted
    });
  }

  async clear() {
    this.painted = new Array(this.hCols * this.hRows).fill(0);
    this._dirty = true;
    this._compositeDirty = true;
    await this.save();
  }
}
