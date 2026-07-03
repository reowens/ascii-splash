/**
 * WorkspaceVizPattern — the `splash watch` scene: a live radial tree of a
 * working directory (Gource, but in the terminal).
 *
 * This class is a **disposable view** over a persistent WorkspaceModel.
 * buildPatterns() constructs a fresh instance on every theme/quality
 * rebuild, and the engine calls reset() on every pattern switch — so
 * nothing that matters lives here. The model owns the tree, heat, and
 * camera; this class owns only view transients (eased positions, twinkle
 * phases, LOD cache) and clears exactly those in reset().
 *
 * Pure per the house rule: no I/O, no Date.now(), no Math.random() —
 * time arrives via render(), randomness via the injected Random.
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../../types/index.js';
import { Random } from '../../utils/random.js';
import { bresenhamLine } from '../../utils/drawing.js';
import { clamp } from '../../utils/math.js';
import { WorkspaceModel, VisibleNode } from './WorkspaceModel.js';
import { RadialLayout, LayoutResult } from './RadialLayout.js';
import { Camera } from './Camera.js';

export interface WorkspaceVizConfig {
  /** Upper bound on visible nodes (also capped at cells/12 per the doc). */
  nodeBudget: number;
  /** Label policy — v1 supports 'none' and 'hot' only. */
  showLabels: 'none' | 'hot';
  /** Single-hue rendering (minimal-mono preset; battery/SSH-friendly). */
  monochrome: boolean;
  /** Camera easing time constant in ms (smaller = snappier follow). */
  cameraTauMs: number;
  /** >1 zooms past whole-tree fit, biasing toward the active region. */
  zoomBias: number;
  /** Heat fraction (0-1) above which a node earns a label. */
  labelHeatThreshold: number;
}

interface WorkspaceVizPreset {
  id: number;
  name: string;
  description: string;
  config: WorkspaceVizConfig;
}

/** How fast node glyphs glide toward relayout targets (easing tau, ms). */
const NODE_EASE_TAU_MS = 240;
/** LOD recompute cadence — visible-set churn is throttled, easing is not. */
const LOD_RECOMPUTE_MS = 500;
/** Cap on simultaneous labels so a hot burst doesn't wallpaper the scene. */
const MAX_LABELS = 8;

/** FNV-1a over the extension, folded to [0, 1) — stable hue position. */
function extHue(ext: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < ext.length; i++) {
    h ^= ext.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

export class WorkspaceVizPattern implements Pattern {
  name = 'workspace';

  private readonly model: WorkspaceModel;
  private theme: Theme;
  private readonly random: Random;
  private config: WorkspaceVizConfig;
  private readonly layout = new RadialLayout();

  // ── view transients (everything below resets; the model never does) ──
  private lastTime = 0;
  private lastNow = 0;
  private mousePos?: Point;
  private easedPositions = new Map<number, { x: number; y: number }>();
  private twinklePhases = new Map<number, number>();
  private visibleRoot: VisibleNode | null = null;
  private layoutResult: LayoutResult | null = null;
  private lastLodTime = -Infinity;
  private lastLodVersion = -1;
  private lastBudget = -1;
  private focusPath?: string;

  private static readonly PRESETS: WorkspaceVizPreset[] = [
    {
      id: 1,
      name: 'Radial',
      description: 'The Gource homage — whole-tree radial view',
      config: {
        nodeBudget: 150,
        showLabels: 'hot',
        monochrome: false,
        cameraTauMs: 1200,
        zoomBias: 1.0,
        labelHeatThreshold: 0.35,
      },
    },
    {
      id: 2,
      name: 'Focus',
      description: 'Camera locked to activity — for the agent-watching split pane',
      config: {
        nodeBudget: 60,
        showLabels: 'hot',
        monochrome: false,
        cameraTauMs: 350,
        zoomBias: 1.6,
        labelHeatThreshold: 0.25,
      },
    },
    {
      id: 3,
      name: 'Minimal Mono',
      description: 'Monochrome, no labels, low churn — for battery/SSH',
      config: {
        nodeBudget: 80,
        showLabels: 'none',
        monochrome: true,
        cameraTauMs: 1500,
        zoomBias: 1.0,
        labelHeatThreshold: 0.5,
      },
    },
  ];

  constructor(
    model: WorkspaceModel,
    theme: Theme,
    random: Random,
    config?: Partial<WorkspaceVizConfig>
  ) {
    this.model = model;
    this.theme = theme;
    this.random = random;
    this.config = { ...WorkspaceVizPattern.PRESETS[0].config, ...config };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    this.mousePos = mousePos;

    const now = this.model.modelTime(time);
    const deltaTime = this.lastTime === 0 ? 16 : Math.min(time - this.lastTime, 250);
    this.lastTime = time;
    this.lastNow = now;

    // Node budget is size-derived: min(config, cells/12), never below 8
    // so tiny panes still show a constellation instead of a lone dot.
    const budget = Math.max(8, Math.min(this.config.nodeBudget, Math.floor((width * height) / 12)));

    this.refreshLod(now, budget);
    if (!this.visibleRoot || !this.layoutResult) return;

    this.updateCamera(now, deltaTime, size);
    this.easePositions(deltaTime);

    // Background: near-black with a whisper of the theme's darkest tone.
    const bg = this.backgroundColor();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ', color: bg };
      }
    }

    this.renderEdges(buffer, size);
    const labelCandidates = this.renderNodes(buffer, time, now, size);
    if (this.config.showLabels === 'hot') {
      this.renderLabels(buffer, size, labelCandidates);
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  /** Clears view transients ONLY — the model (tree, heat, camera) survives. */
  reset(): void {
    this.lastTime = 0;
    this.lastNow = 0;
    this.mousePos = undefined;
    this.easedPositions = new Map();
    this.twinklePhases = new Map();
    this.visibleRoot = null;
    this.layoutResult = null;
    this.lastLodTime = -Infinity;
    this.lastLodVersion = -1;
    this.lastBudget = -1;
    this.focusPath = undefined;
  }

  applyPreset(presetId: number): boolean {
    const preset = WorkspaceVizPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): WorkspaceVizPreset[] {
    return [...WorkspaceVizPattern.PRESETS];
  }

  static getPreset(id: number): WorkspaceVizPreset | undefined {
    return WorkspaceVizPattern.PRESETS.find(p => p.id === id);
  }

  onThemeChange(theme: Theme): void {
    this.theme = theme;
  }

  onResize(): void {
    // Budget is size-derived; force an LOD pass on the next frame.
    this.lastLodTime = -Infinity;
  }

  getMetrics(): Record<string, number> {
    const camera = this.model.camera;
    let visible = 0;
    let hot = 0;
    if (this.visibleRoot) {
      this.forEachVisible(this.visibleRoot, v => {
        visible++;
        if (this.heatFracOf(v, this.lastNow) > 0.5) hot++;
      });
    }
    return {
      totalNodes: this.model.nodeCount(),
      files: this.model.fileCount(),
      visibleNodes: visible,
      hotNodes: hot,
      zoomMilli: Math.round(camera.zoom * 1000),
    };
  }

  // ── LOD + camera ───────────────────────────────────────────────────────

  private refreshLod(now: number, budget: number): void {
    const structureChanged = this.model.structureVersion() !== this.lastLodVersion;
    const stale = now - this.lastLodTime >= LOD_RECOMPUTE_MS;
    const budgetChanged = budget !== this.lastBudget;
    if (this.visibleRoot && !structureChanged && !stale && !budgetChanged) return;

    this.visibleRoot = this.model.computeVisibleTree(budget, now, this.focusPath);
    this.layoutResult = this.layout.compute(this.visibleRoot);
    this.lastLodTime = now;
    this.lastLodVersion = this.model.structureVersion();
    this.lastBudget = budget;

    // Track the hottest visible node: the focus preset feeds it back into
    // the next LOD pass so the active region resolves down to leaves.
    let hottestPath: string | undefined;
    let hottestHeat = 0.05;
    this.forEachVisible(this.visibleRoot, v => {
      const heat = this.model.subtreeHeatOf(v.node, now);
      if (heat > hottestHeat) {
        hottestHeat = heat;
        hottestPath = v.node.path;
      }
    });
    this.focusPath = this.config.zoomBias > 1 ? hottestPath : undefined;

    // Drop easing state for nodes that left the visible set.
    const alive = this.layoutResult.points;
    for (const id of this.easedPositions.keys()) {
      if (!alive.has(id)) this.easedPositions.delete(id);
    }
  }

  private updateCamera(now: number, deltaTime: number, size: Size): void {
    if (!this.visibleRoot || !this.layoutResult) return;
    const camera = this.model.camera;
    const points = this.layoutResult.points;

    // Heat centroid over visible nodes; a small base weight keeps the
    // camera anchored near the tree's center when everything is cold.
    let wx = 0;
    let wy = 0;
    let wTotal = 0;
    this.forEachVisible(this.visibleRoot, v => {
      const p = points.get(v.node.id);
      if (!p) return;
      const w = 0.05 + this.model.subtreeHeatOf(v.node, now);
      wx += p.x * w;
      wy += p.y * w;
      wTotal += w;
    });
    const cx = wTotal > 0 ? wx / wTotal : 0;
    const cy = wTotal > 0 ? wy / wTotal : 0;

    const fitRadius = Math.max(this.layoutResult.maxRadius, 0.5) / this.config.zoomBias;
    const target = {
      // The centroid pulls the camera off-center; halve the pull so the
      // tree never slides fully out of frame at whole-tree zoom.
      x: cx * (this.config.zoomBias > 1 ? 1 : 0.5),
      y: cy * (this.config.zoomBias > 1 ? 1 : 0.5),
      zoom: Camera.fitZoom(fitRadius, size),
    };

    if (!camera.initialized) camera.snapTo(target);
    else camera.moveToward(target, deltaTime, this.config.cameraTauMs);
  }

  private easePositions(deltaTime: number): void {
    if (!this.layoutResult) return;
    const k = 1 - Math.exp(-deltaTime / NODE_EASE_TAU_MS);
    for (const [id, target] of this.layoutResult.points) {
      const eased = this.easedPositions.get(id);
      if (eased) {
        eased.x += (target.x - eased.x) * k;
        eased.y += (target.y - eased.y) * k;
      }
    }
  }

  /** Eased world position; new nodes enter at their parent (grow-out). */
  private easedPositionOf(
    visible: VisibleNode,
    parentPos?: { x: number; y: number }
  ): {
    x: number;
    y: number;
  } {
    const id = visible.node.id;
    let eased = this.easedPositions.get(id);
    if (!eased) {
      const target = this.layoutResult?.points.get(id) ?? { x: 0, y: 0 };
      eased = parentPos ? { x: parentPos.x, y: parentPos.y } : { x: target.x, y: target.y };
      this.easedPositions.set(id, eased);
    }
    return eased;
  }

  // ── drawing ────────────────────────────────────────────────────────────

  private renderEdges(buffer: Cell[][], size: Size): void {
    if (!this.visibleRoot) return;
    const camera = this.model.camera;
    const edgeColor = this.dim(this.theme.getColor(0.35), 0.45);

    const walk = (visible: VisibleNode): void => {
      const from = this.easedPositionOf(visible);
      const fromScreen = camera.worldToScreen(from.x, from.y, size);
      for (const child of visible.children) {
        const to = this.easedPositionOf(child, from);
        const toScreen = camera.worldToScreen(to.x, to.y, size);
        const line = bresenhamLine(fromScreen.x, fromScreen.y, toScreen.x, toScreen.y);
        // Skip both endpoints — node glyphs own those cells.
        for (let i = 1; i < line.length - 1; i++) {
          const { x, y } = line[i];
          if (x < 0 || x >= size.width || y < 0 || y >= size.height) continue;
          buffer[y][x] = { char: '·', color: edgeColor };
        }
        walk(child);
      }
    };
    walk(this.visibleRoot);
  }

  private renderNodes(
    buffer: Cell[][],
    time: number,
    now: number,
    size: Size
  ): { visible: VisibleNode; sx: number; sy: number; heatFrac: number }[] {
    const camera = this.model.camera;
    const drawn: { visible: VisibleNode; sx: number; sy: number; heatFrac: number }[] = [];
    if (!this.visibleRoot) return drawn;

    const walk = (visible: VisibleNode): void => {
      const pos = this.easedPositionOf(visible);
      const screen = camera.worldToScreen(pos.x, pos.y, size);
      const sx = Math.round(screen.x);
      const sy = Math.round(screen.y);
      const heatFrac = this.heatFracOf(visible, now);

      if (sx >= 0 && sx < size.width && sy >= 0 && sy < size.height) {
        buffer[sy][sx] = {
          char: this.glyphFor(visible, heatFrac),
          color: this.colorFor(visible, heatFrac, time),
        };
        drawn.push({ visible, sx, sy, heatFrac });
      }
      for (const child of visible.children) walk(child);
    };
    walk(this.visibleRoot);
    return drawn;
  }

  private renderLabels(
    buffer: Cell[][],
    size: Size,
    drawn: { visible: VisibleNode; sx: number; sy: number; heatFrac: number }[]
  ): void {
    const candidates = drawn
      .filter(d => d.heatFrac >= this.config.labelHeatThreshold && d.visible.node.parent !== null)
      .sort((a, b) => b.heatFrac - a.heatFrac)
      .slice(0, MAX_LABELS);

    for (const { visible, sx, sy, heatFrac } of candidates) {
      const label = visible.node.name.slice(0, 16);
      const startX = sx + 2;
      if (sy < 0 || sy >= size.height) continue;
      const color = this.dim(this.theme.getColor(0.85), 0.35 + 0.65 * heatFrac);
      for (let i = 0; i < label.length; i++) {
        const x = startX + i;
        if (x < 0 || x >= size.width) break;
        buffer[sy][x] = { char: label[i], color };
      }
    }
  }

  // ── node styling ───────────────────────────────────────────────────────

  /** Heat as a 0-1 fraction: 1 - 2^(-heat) (one touch ≈ 0.5, asymptote 1). */
  private heatFracOf(visible: VisibleNode, now: number): number {
    const node = visible.node;
    const heat =
      node.kind === 'dir' && !visible.expanded
        ? this.model.subtreeHeatOf(node, now)
        : this.model.heatOf(node, now);
    return 1 - Math.pow(2, -heat);
  }

  private glyphFor(visible: VisibleNode, heatFrac: number): string {
    const node = visible.node;
    if (node.parent === null) return '◉';
    if (node.kind === 'dir') {
      if (visible.expanded) return '○';
      // Collapsed dirs read by size: a whole subsystem vs a small folder.
      if (node.subtreeFiles >= 100) return '◆';
      if (node.subtreeFiles >= 10) return '◈';
      return '◇';
    }
    if (heatFrac > 0.8) return '★';
    if (heatFrac > 0.5) return '✦';
    if (heatFrac > 0.15) return '•';
    return '·';
  }

  private colorFor(visible: VisibleNode, heatFrac: number, time: number): Color {
    const node = visible.node;

    // Hot nodes shimmer: a gentle sine on top of the heat intensity.
    let twinkle = 0;
    if (heatFrac > 0.3) {
      let phase = this.twinklePhases.get(node.id);
      if (phase === undefined) {
        phase = this.random.next() * Math.PI * 2;
        this.twinklePhases.set(node.id, phase);
      }
      twinkle = Math.sin(phase + time * 0.004) * 0.1;
    }

    if (this.config.monochrome) {
      const intensity = clamp(0.25 + 0.75 * heatFrac + twinkle, 0, 1);
      return this.theme.getColor(intensity);
    }

    // Theme provides the palette; the extension picks the position in it
    // (per the proposal) and heat lifts it toward the palette's top.
    const base =
      node.kind === 'dir' ? 0.55 : 0.3 + 0.45 * extHue(node.ext === '' ? node.name : node.ext);
    const intensity = clamp(base + (0.98 - base) * heatFrac + twinkle, 0, 1);
    return this.theme.getColor(intensity);
  }

  private backgroundColor(): Color {
    const base = this.theme.getColor(0.04);
    return this.config.monochrome ? { r: 0, g: 0, b: 0 } : this.dim(base, 0.5);
  }

  private dim(color: Color, factor: number): Color {
    return {
      r: Math.round(color.r * factor),
      g: Math.round(color.g * factor),
      b: Math.round(color.b * factor),
    };
  }

  private forEachVisible(root: VisibleNode, fn: (v: VisibleNode) => void): void {
    fn(root);
    for (const child of root.children) this.forEachVisible(child, fn);
  }
}
