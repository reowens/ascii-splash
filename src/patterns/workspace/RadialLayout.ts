/**
 * RadialLayout — Gource-style radial tree layout over the LOD-visible
 * tree.
 *
 * The root sits at the world origin; each visible depth is one ring out.
 * A directory's children subdivide their parent's angular span
 * proportionally to log-scaled subtree file count, so a 1,000-file dir
 * reads bigger than a 3-file dir without drowning it. Because the model
 * keeps siblings permanently sorted, a node's span only drifts when
 * siblings appear or the LOD set changes — relayouts glide, never
 * teleport (the view eases positions toward these targets).
 *
 * Pure geometry: continuous world coordinates in, no cell quantization —
 * the camera owns the world→screen mapping (including cell aspect), and
 * a future sub-cell pixel canvas can consume the same output unchanged.
 */

import { VisibleNode } from './WorkspaceModel.js';

export interface LayoutPoint {
  /** World coordinates (root at origin, isotropic). */
  x: number;
  y: number;
  /** Polar form kept for label placement / effects. */
  angle: number;
  radius: number;
}

export interface LayoutResult {
  /** Node id → layout target for every visible node. */
  points: Map<number, LayoutPoint>;
  /** Outermost node radius (0 for a bare root) — drives camera fit. */
  maxRadius: number;
}

export interface RadialLayoutConfig {
  /** World-space distance between rings. */
  ringSpacing?: number;
}

/**
 * Angular weight of a visible child. Log-scaled subtree file count, with
 * +2 flooring the argument so files and empty dirs still get ≥ 1 — every
 * node keeps a nonzero, NaN-free sliver of the circle.
 */
function weightOf(visible: VisibleNode): number {
  return Math.log2(2 + visible.node.subtreeFiles);
}

export class RadialLayout {
  private readonly ringSpacing: number;

  constructor(config?: RadialLayoutConfig) {
    this.ringSpacing = config?.ringSpacing ?? 1;
  }

  /** Compute layout targets for every node in the visible tree. */
  compute(root: VisibleNode): LayoutResult {
    const points = new Map<number, LayoutPoint>();
    let maxRadius = 0;

    points.set(root.node.id, { x: 0, y: 0, angle: 0, radius: 0 });

    const place = (visible: VisibleNode, spanStart: number, spanEnd: number): void => {
      if (visible.children.length === 0) return;
      let total = 0;
      for (const child of visible.children) total += weightOf(child);

      let cursor = spanStart;
      for (const child of visible.children) {
        const span = ((spanEnd - spanStart) * weightOf(child)) / total;
        const angle = cursor + span / 2;
        const radius = child.visibleDepth * this.ringSpacing;
        points.set(child.node.id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          angle,
          radius,
        });
        if (radius > maxRadius) maxRadius = radius;
        place(child, cursor, cursor + span);
        cursor += span;
      }
    };

    // Start slightly off-axis so the first child of a small root doesn't
    // sit exactly on the +x axis every time (reads less grid-like).
    place(root, -Math.PI / 2, Math.PI * 1.5);
    return { points, maxRadius };
  }
}
