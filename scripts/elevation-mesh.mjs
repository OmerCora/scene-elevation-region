import { MODULE_ID, SETTINGS, PARALLAX_STRENGTHS, sceneGeometry } from "./config.mjs";
import { ElevationData } from "./elevation-data.mjs";

/**
 * Background warp mesh.
 *
 * Builds a PIXI.Mesh whose vertices map 1:1 to the half-grid elevation points
 * of the active scene. The mesh stays fixed to the scene rectangle; the shader
 * projects elevated vertices as a shallow heightfield while sampling the
 * scene texture once. When active, the original background is hidden and this
 * mesh becomes the background, which prevents additive white burn.
 */
export class ElevationMesh {
  static _instance = null;
  static get instance() {
    if (!this._instance) this._instance = new ElevationMesh();
    return this._instance;
  }

  constructor() {
    this.mesh = null;
    this.geometry = null;
    this.shader = null;
    this.elevationBuffer = null;
    this.reliefBuffer = null;
    this.mask = null;
    this._meshSize = null;
    this._baseCameraFocus = null;
    this._tickerFn = null;
    this._scene = null;
  }

  /** Build/attach for the current scene. Idempotent. */
  async attach(scene) {
    if (!scene || !canvas?.ready) return;
    if (this._scene === scene && this.mesh) {
      this.update();
      return;
    }
    await this.detach();
    this._scene = scene;

    const bg = canvas.primary?.background;
    const texture = bg?.texture;
    if (!texture || !texture.valid) return; // no background yet

    const data = ElevationData.get(scene);
    const geo = sceneGeometry(scene);
    const geometry = this._buildGeometry(data, geo);
    const shader = await this._buildShader(texture);
    const mesh = new PIXI.Mesh(geometry, shader);
    canvas.primary.sortableChildren = true;
    // Mesh-local (0,0) corresponds to the scene rect top-left.
    mesh.position.set(geo.x, geo.y);
    mesh.zIndex = (bg.zIndex ?? 0) + 0.001;
    mesh.eventMode = "none";
    mesh.visible = false; // shown only when there is real elevation
    // NORMAL blend: the mesh is a replacement background while active, not an
    // additive overlay.
    mesh.blendMode = PIXI.BLEND_MODES.NORMAL;
    this._bg = bg;
    this._bgVisible = bg.visible;

    const GraphicsClass = PIXI.LegacyGraphics ?? PIXI.Graphics;
    const mask = new GraphicsClass();
    mask.beginFill(0xffffff, 1);
    mask.drawRect(geo.x, geo.y, geo.width, geo.height);
    mask.endFill();
    mask.renderable = false;
    mesh.mask = mask;

    canvas.primary.addChild(mask);
    canvas.primary.addChild(mesh);
    this.mesh = mesh;
    this.mask = mask;
    this._meshSize = { width: geo.width, height: geo.height, gridSize: geo.gridSize };
    this.geometry = geometry;
    this.shader = shader;
    this._tickerFn = () => {
      if (this.mesh?.visible) this._updateCameraUniforms();
    };
    canvas.app?.ticker?.add(this._tickerFn);

    this.update();
  }

  async detach() {
    if (!this.mesh) return;
    if (this._tickerFn) canvas.app?.ticker?.remove(this._tickerFn);
    this._tickerFn = null;
    try { this.mesh.parent?.removeChild(this.mesh); } catch (_) {}
    this.mesh.destroy({ children: true });
    try { this.mask?.parent?.removeChild(this.mask); } catch (_) {}
    this.mask?.destroy();
    if (this._bg && this._bgVisible !== undefined) this._bg.visible = this._bgVisible;
    this._bg = null;
    this._bgVisible = undefined;
    this.geometry = null;
    this.shader = null;
    this.mesh = null;
    this.mask = null;
    this._meshSize = null;
    this._baseCameraFocus = null;
    this.reliefBuffer = null;
    this.gradientBuffer = null;
    this.elevationBuffer = null;
    this._scene = null;
  }

  /** True if any composite point has non-zero elevation. */
  hasElevation() {
    if (!this._scene) return false;
    const data = ElevationData.get(this._scene);
    if (!data) return false;
    if (data._compositeDirty) data.rebuildComposite();
    const arr = data.composite;
    for (let i = 0; i < arr.length; i++) if (arr[i] !== 0) return true;
    return false;
  }

  /** Push current composite elevation values into the per-vertex attribute buffer. */
  syncElevations() {
    if (!this.mesh || !this._scene) return;
    const data = ElevationData.get(this._scene);
    if (!data) return;
    if (data._compositeDirty) data.rebuildComposite();
    const src = data.composite;
    const arr = this.elevationBuffer;
    const relief = this.reliefBuffer;
    const grad = this.gradientBuffer;
    if (!arr || !relief || !grad || !src) return;
    const n = Math.min(arr.length, src.length);
    for (let i = 0; i < n; i++) arr[i] = src[i] ?? 0;
    const hCols = data.hCols;
    const hRows = data.hRows;
    for (let hy = 0; hy < hRows; hy++) {
      for (let hx = 0; hx < hCols; hx++) {
        const idx = hy * hCols + hx;
        const left = src[hy * hCols + Math.max(0, hx - 2)] ?? 0;
        const right = src[hy * hCols + Math.min(hCols - 1, hx + 2)] ?? 0;
        const up = src[Math.max(0, hy - 2) * hCols + hx] ?? 0;
        const down = src[Math.min(hRows - 1, hy + 2) * hCols + hx] ?? 0;
        const gx = (right - left) * 0.5;
        const gy = (down - up) * 0.5;
        grad[idx * 2] = gx;
        grad[idx * 2 + 1] = gy;
        const slope = Math.hypot(gx, gy);
        relief[idx] = Math.clamp(slope / 5, 0, 1);
      }
    }
    this.geometry.getBuffer("aElevation").update();
    this.geometry.getBuffer("aRelief").update();
    this.geometry.getBuffer("aGradient").update();
  }

  /** Refresh shader uniforms (camera focus, parallax) and elevations. */
  update() {
    if (!this.mesh) return;
    this.syncElevations();
    const active = this.hasElevation();
    this.mesh.visible = active;
    if (this._bg) this._bg.visible = active ? false : (this._bgVisible ?? true);
    if (!active) {
      this._baseCameraFocus = null;
      return;
    }

    const strengthKey = game.settings.get(MODULE_ID, SETTINGS.PARALLAX) ?? "medium";
    const parallax = PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.medium;
    this.shader.uniforms.uParallax = parallax;
    this.shader.uniforms.uMeshSize[0] = this._meshSize?.width ?? this.mesh.width;
    this.shader.uniforms.uMeshSize[1] = this._meshSize?.height ?? this.mesh.height;
    this.shader.uniforms.uEdgeFeather = this._meshSize?.gridSize ?? canvas.grid.size;

    this._updateCameraUniforms();
  }

  /** Update only camera-dependent shader uniforms (cheap; safe every frame). */
  _updateCameraUniforms() {
    if (!this.mesh || !this.shader) return;

    // Camera focus in mesh-local coordinates. Use PIXI transforms instead of
    // hand-reading stage.position so this follows Foundry pan/zoom internals.
    const screen = canvas.app.renderer.screen;
    const parent = this.mesh.parent ?? canvas.stage;
    const worldCenter = parent.toLocal(new PIXI.Point(
      (screen.x ?? 0) + screen.width / 2,
      (screen.y ?? 0) + screen.height / 2
    ));
    const local = {
      x: worldCenter.x - this.mesh.position.x,
      y: worldCenter.y - this.mesh.position.y
    };
    if (!this._baseCameraFocus) this._baseCameraFocus = { x: local.x, y: local.y };
    this.shader.uniforms.uCameraFocus[0] = local.x;
    this.shader.uniforms.uCameraFocus[1] = local.y;
  }

  /* ---------------------------------------- */
  /*  Internals                                */
  /* ---------------------------------------- */

  _buildGeometry(data, geo) {
    const hCols = data.hCols, hRows = data.hRows;
    const halfGs = geo.gridSize / 2;
    const meshW = geo.width;
    const meshH = geo.height;

    const vCount = hCols * hRows;
    const positions = new Float32Array(vCount * 2);
    const uvs = new Float32Array(vCount * 2);
    const elevations = new Float32Array(vCount);
    const relief = new Float32Array(vCount);
    const gradient = new Float32Array(vCount * 2);

    // Mesh-local (0,0) is the top-left of the scene rect; the mesh itself is
    // positioned at sceneGeometry().x/y.
    for (let hy = 0; hy < hRows; hy++) {
      for (let hx = 0; hx < hCols; hx++) {
        const i = (hy * hCols + hx) * 2;
        const px = hx * halfGs;
        const py = hy * halfGs;
        positions[i] = px;
        positions[i + 1] = py;
        uvs[i] = px / meshW;
        uvs[i + 1] = py / meshH;
      }
    }

    // Indices: 2 triangles per quad
    const qCols = hCols - 1, qRows = hRows - 1;
    const indices = new Uint32Array(qCols * qRows * 6);
    let k = 0;
    for (let qy = 0; qy < qRows; qy++) {
      for (let qx = 0; qx < qCols; qx++) {
        const tl = qy * hCols + qx;
        const tr = tl + 1;
        const bl = tl + hCols;
        const br = bl + 1;
        indices[k++] = tl; indices[k++] = tr; indices[k++] = bl;
        indices[k++] = tr; indices[k++] = br; indices[k++] = bl;
      }
    }

    const geometry = new PIXI.Geometry()
      .addAttribute("aVertexPosition", positions, 2)
      .addAttribute("aTextureCoord", uvs, 2)
      .addAttribute("aElevation", elevations, 1)
      .addAttribute("aRelief", relief, 1)
      .addAttribute("aGradient", gradient, 2)
      .addIndex(indices);

    // Mark elevation as dynamic (frequently updated).
    geometry.getBuffer("aElevation").static = false;
    geometry.getBuffer("aRelief").static = false;
    geometry.getBuffer("aGradient").static = false;
    this.elevationBuffer = elevations;
    this.reliefBuffer = relief;
    this.gradientBuffer = gradient;
    return geometry;
  }

  async _buildShader(texture) {
    const [vert, frag] = await Promise.all([
      fetch(`modules/${MODULE_ID}/shaders/elevation.vert`).then(r => r.text()),
      fetch(`modules/${MODULE_ID}/shaders/elevation.frag`).then(r => r.text())
    ]);
    const program = PIXI.Program.from(vert, frag);
    return new PIXI.Shader(program, {
      uSampler: texture,
      uAlpha: 1.0,
      uCameraFocus: new Float32Array([0, 0]),
      uMeshSize: new Float32Array([1, 1]),
      uEdgeFeather: 100,
      uParallax: 0.10
    });
  }
}
