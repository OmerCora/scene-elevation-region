import { BRUSH, DEFAULT_BRUSH, BRUSH_OPS } from "../config.mjs";
import { ElevationData } from "../elevation-data.mjs";

/**
 * Brush tool — paints elevation onto the half-grid points of the active scene.
 * Singleton; the layer pipes pointer events here.
 *
 * Operations:
 *   raise  — additive: + height * weight per stamp
 *   lower  — additive: - height * weight per stamp
 *   set    — absolute: set point to height * weight (each point at most once per stroke)
 *   smooth — blend each point toward the mean of itself + 8 half-grid neighbours by weight
 */
export class BrushTool {
  static _instance = null;
  static get instance() {
    if (!this._instance) this._instance = new BrushTool();
    return this._instance;
  }

  constructor() {
    this.size = DEFAULT_BRUSH.size;
    this.height = DEFAULT_BRUSH.height;
    this.fade = DEFAULT_BRUSH.fade;
    this.op = DEFAULT_BRUSH.op;
    this._strokePoints = null;
  }

  setProperty(key, value) {
    switch (key) {
      case "size":   this.size = Math.clamp(Number(value), BRUSH.SIZE_MIN, BRUSH.SIZE_MAX); break;
      case "height": this.height = Math.clamp(Number(value), 0, BRUSH.HEIGHT_MAX); break;
      case "fade":   this.fade = Math.clamp(Number(value), BRUSH.FADE_MIN, BRUSH.FADE_MAX); break;
      case "op":
        if (Object.values(BRUSH_OPS).includes(value)) this.op = value;
        break;
    }
  }

  beginStroke() {
    this._strokePoints = new Set();
  }

  /** Apply one brush stamp at world position. Returns true if anything changed. */
  stamp(scene, wx, wy) {
    const data = ElevationData.get(scene);
    if (!data) return false;
    const gs = scene.grid.size;
    const halfGs = gs / 2;
    const radiusPx = this.size * gs;
    const r2 = radiusPx * radiusPx;
    const minHx = Math.max(0, Math.floor((wx - radiusPx) / halfGs));
    const maxHx = Math.min(data.hCols - 1, Math.ceil((wx + radiusPx) / halfGs));
    const minHy = Math.max(0, Math.floor((wy - radiusPx) / halfGs));
    const maxHy = Math.min(data.hRows - 1, Math.ceil((wy + radiusPx) / halfGs));

    let changed = false;
    const fade01 = this.fade / 100;

    for (let hy = minHy; hy <= maxHy; hy++) {
      for (let hx = minHx; hx <= maxHx; hx++) {
        const px = hx * halfGs, py = hy * halfGs;
        const dx = px - wx, dy = py - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const t = Math.sqrt(d2) / radiusPx;
        const linear = 1 - t;
        const eased = linear * linear * (3 - 2 * linear);
        const weight = (1 - fade01) + fade01 * eased;
        const key = (hy * data.hCols) + hx;
        const cur = data.getPaintedH(hx, hy);

        let next = cur;
        switch (this.op) {
          case BRUSH_OPS.RAISE:
            next = cur + this.height * weight;
            break;
          case BRUSH_OPS.LOWER:
            next = cur - this.height * weight;
            break;
          case BRUSH_OPS.SET:
            if (this._strokePoints?.has(key)) continue;
            this._strokePoints?.add(key);
            next = this.height * weight;
            break;
          case BRUSH_OPS.SMOOTH: {
            let sum = 0, n = 0;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
              const nx = hx + ox, ny = hy + oy;
              if (nx < 0 || ny < 0 || nx >= data.hCols || ny >= data.hRows) continue;
              sum += data.getPaintedH(nx, ny);
              n++;
            }
            const mean = n > 0 ? (sum / n) : cur;
            next = cur + (mean - cur) * weight;
            break;
          }
        }
        next = Math.clamp(next, BRUSH.HEIGHT_MIN, BRUSH.HEIGHT_MAX);
        if (next !== cur) {
          data.setPaintedH(hx, hy, next);
          changed = true;
        }
      }
    }
    return changed;
  }

  async endStroke(scene) {
    this._strokePoints = null;
    await ElevationData.get(scene)?.save();
  }
}
