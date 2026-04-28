import { MODULE_ID, SETTINGS, PARALLAX_STRENGTHS } from "./config.mjs";
import { ElevationData } from "./elevation-data.mjs";

/**
 * Background warp mesh.
 *
 * Builds a PIXI.Mesh whose vertices map 1:1 to the half-grid elevation points
 * of the active scene. The vertex shader displaces each vertex outward from
 * the current camera focus by `elevation * parallaxStrength`, producing both
 * the magnification of elevated regions and the parallax shift on pan.
 *
 * The original `canvas.primary.background` sprite is hidden while this mesh
 * is active; we sample the same texture so visuals stay consistent.
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
    this._scene = null;
    this._originalVisibility = null;
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
    const dims = scene.dimensions;
    // Mesh covers the full scene rect (including padding); bg sprite already
    // sits at (0,0) in primary group with the same dims.
    const geometry = this._buildGeometry(data, dims);
    const shader = await this._buildShader(texture);
    const mesh = new PIXI.Mesh(geometry, shader);
    mesh.position.set(bg.position.x, bg.position.y);
    mesh.zIndex = bg.zIndex - 0.001; // just under bg sprite for layering safety
    mesh.eventMode = "none";

    // Add to the primary canvas group so it sits with the background.
    canvas.primary.addChild(mesh);
    this.mesh = mesh;
    this.geometry = geometry;
    this.shader = shader;

    // Hide the original sprite — our mesh now stands in for it.
    this._originalVisibility = bg.visible;
    bg.visible = false;

    this.update();
  }

  async detach() {
    if (!this.mesh) return;
    try { this.mesh.parent?.removeChild(this.mesh); } catch (_) {}
    this.mesh.destroy({ children: true });
    this.geometry = null;
    this.shader = null;
    this.mesh = null;
    this.elevationBuffer = null;
    if (this._scene && canvas?.primary?.background && this._originalVisibility !== null) {
      canvas.primary.background.visible = this._originalVisibility;
    }
    this._originalVisibility = null;
    this._scene = null;
  }

  /** Push current elevation values into the per-vertex attribute buffer. */
  syncElevations() {
    if (!this.mesh || !this._scene) return;
    const data = ElevationData.get(this._scene);
    const arr = this.elevationBuffer;
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) arr[i] = data.points[i] ?? 0;
    this.geometry.getBuffer("aElevation").update();
  }

  /** Refresh shader uniforms (camera focus, parallax) and elevations. */
  update() {
    if (!this.mesh) return;
    const strengthKey = game.settings.get(MODULE_ID, SETTINGS.PARALLAX) ?? "medium";
    const parallax = PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.medium;

    // Camera focus in mesh-local coordinates: take the screen-center world
    // position and subtract the mesh origin (= background position).
    const stage = canvas.stage;
    const screen = canvas.app.renderer.screen;
    const worldCenter = {
      x: (screen.width / 2 - stage.position.x) / stage.scale.x,
      y: (screen.height / 2 - stage.position.y) / stage.scale.y
    };
    const local = {
      x: worldCenter.x - this.mesh.position.x,
      y: worldCenter.y - this.mesh.position.y
    };
    this.shader.uniforms.uCameraFocus[0] = local.x;
    this.shader.uniforms.uCameraFocus[1] = local.y;
    this.shader.uniforms.uParallax = parallax;

    this.syncElevations();
  }

  /* ---------------------------------------- */
  /*  Internals                                */
  /* ---------------------------------------- */

  _buildGeometry(data, dims) {
    const hCols = data.hCols, hRows = data.hRows;
    const halfGs = canvas.grid.size / 2;
    // Mesh-local size = full scene size (sceneWidth/Height includes padding offset already)
    const meshW = (data.cols * 2) * halfGs;
    const meshH = (data.rows * 2) * halfGs;

    const vCount = hCols * hRows;
    const positions = new Float32Array(vCount * 2);
    const uvs = new Float32Array(vCount * 2);
    const elevations = new Float32Array(vCount);

    // Background texture covers the *scene rectangle* inside the padded scene area.
    // bg sprite position already accounts for the padding offset, so our local (0,0)
    // is the top-left of the scene rect.
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
      .addIndex(indices);

    // Mark elevation as dynamic (frequently updated).
    geometry.getBuffer("aElevation").static = false;
    this.elevationBuffer = elevations;
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
      uParallax: 0.10
    });
  }
}
