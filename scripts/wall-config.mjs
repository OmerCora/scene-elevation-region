import { MODULE_ID, WALL_FLAGS, BRUSH } from "./config.mjs";

/**
 * Adds an "Elevation" tab to the WallConfig sheet so GMs can give walls a
 * thickness + height that wrap surrounding terrain in the composite.
 */
export function registerWallConfigInjection(invalidate) {
  Hooks.on("renderWallConfig", (app, html, _data) => {
    // Foundry v14 — html may be HTMLElement; normalise to jQuery-ish accessor
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    const form = root.querySelector?.("form") ?? root;
    const wall = app.document;

    const thickness = wall.getFlag(MODULE_ID, WALL_FLAGS.THICKNESS) ?? 0;
    const height = wall.getFlag(MODULE_ID, WALL_FLAGS.HEIGHT) ?? 0;
    const fade = wall.getFlag(MODULE_ID, WALL_FLAGS.FADE) ?? 50;

    const fragment = document.createElement("fieldset");
    fragment.classList.add("scene-elevation-wall");
    fragment.innerHTML = `
      <legend>${game.i18n.localize("SCENE_ELEVATION.Wall.Legend")}</legend>
      <div class="form-group">
        <label>${game.i18n.localize("SCENE_ELEVATION.Wall.Thickness")}</label>
        <input type="number" name="flags.${MODULE_ID}.${WALL_FLAGS.THICKNESS}" value="${thickness}" min="0" max="${BRUSH.SIZE_MAX}" step="0.1">
        <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Wall.ThicknessHint")}</p>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SCENE_ELEVATION.Wall.Height")}</label>
        <input type="number" name="flags.${MODULE_ID}.${WALL_FLAGS.HEIGHT}" value="${height}" min="${BRUSH.HEIGHT_MIN}" max="${BRUSH.HEIGHT_MAX}" step="0.1">
        <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Wall.HeightHint")}</p>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SCENE_ELEVATION.Wall.Fade")}</label>
        <input type="number" name="flags.${MODULE_ID}.${WALL_FLAGS.FADE}" value="${fade}" min="0" max="100" step="1">
        <p class="hint">${game.i18n.localize("SCENE_ELEVATION.Wall.FadeHint")}</p>
      </div>
    `;

    // Insert just above the form footer (or at form end as fallback)
    const footer = form.querySelector?.("footer, .form-footer, .sheet-footer");
    if (footer) footer.parentNode.insertBefore(fragment, footer);
    else form.appendChild(fragment);

    // Re-fit the window
    app.setPosition?.({ height: "auto" });
  });

  // Wall changes invalidate the composite.
  for (const hook of ["createWall", "updateWall", "deleteWall"]) {
    Hooks.on(hook, (doc) => {
      const scene = doc?.parent ?? doc?.scene;
      if (!scene || scene !== canvas?.scene) return;
      invalidate();
    });
  }
}
