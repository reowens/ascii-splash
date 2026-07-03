/**
 * Camera — damped pan/zoom transform from layout world-space to screen
 * cells.
 *
 * Lives on the WorkspaceModel (session state): its position survives
 * theme rebuilds and pattern switches, so cycling away and back resumes
 * the same view instead of re-centering. The pattern feeds it targets
 * (heat centroid, fit zoom) each frame; the camera eases toward them.
 *
 * World space is isotropic (a radial ring is a circle). Terminal cells
 * are ~twice as tall as wide, so the horizontal axis maps at
 * `zoom × CELL_ASPECT` columns per world unit to keep circles circular.
 */

export interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
}

/** Approximate cell height / width ratio in common terminal fonts. */
export const CELL_ASPECT = 2;

export class Camera {
  /** World-space point at the center of the screen. */
  x = 0;
  y = 0;
  /** Rows per world unit (columns per world unit = zoom × CELL_ASPECT). */
  zoom = 1;
  /** False until the first snapTo — lets views skip the initial swoop. */
  initialized = false;

  /**
   * Ease toward a target with exponential smoothing. `tauMs` is the time
   * constant: ~63% of the remaining distance closes per tau. Frame-rate
   * independent — two 8 ms steps land where one 16 ms step does.
   */
  moveToward(target: CameraTarget, dtMs: number, tauMs: number): void {
    if (dtMs <= 0 || tauMs <= 0) return;
    const k = 1 - Math.exp(-dtMs / tauMs);
    this.x += (target.x - this.x) * k;
    this.y += (target.y - this.y) * k;
    this.zoom += (target.zoom - this.zoom) * k;
  }

  /** Jump instantly (initial placement; avoids a swoop-in on frame one). */
  snapTo(target: CameraTarget): void {
    this.x = target.x;
    this.y = target.y;
    this.zoom = target.zoom;
    this.initialized = true;
  }

  /** World point → fractional screen cell (may be out of bounds). */
  worldToScreen(
    wx: number,
    wy: number,
    size: { width: number; height: number }
  ): { x: number; y: number } {
    return {
      x: size.width / 2 + (wx - this.x) * this.zoom * CELL_ASPECT,
      y: size.height / 2 + (wy - this.y) * this.zoom,
    };
  }

  /** Screen cell → world point (mouse focus; inverse of worldToScreen). */
  screenToWorld(
    sx: number,
    sy: number,
    size: { width: number; height: number }
  ): { x: number; y: number } {
    return {
      x: this.x + (sx - size.width / 2) / (this.zoom * CELL_ASPECT),
      y: this.y + (sy - size.height / 2) / this.zoom,
    };
  }

  /**
   * Zoom that fits a world-space circle of `radius` around the camera
   * target inside the screen, leaving `marginCells` on every edge.
   */
  static fitZoom(radius: number, size: { width: number; height: number }, marginCells = 2): number {
    const safeRadius = Math.max(radius, 0.001);
    const halfH = Math.max(1, size.height / 2 - marginCells);
    const halfW = Math.max(1, size.width / 2 - marginCells);
    return Math.min(halfH / safeRadius, halfW / (safeRadius * CELL_ASPECT));
  }
}
