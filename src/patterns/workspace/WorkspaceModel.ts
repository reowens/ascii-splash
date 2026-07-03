/**
 * WorkspaceModel — persistent session state for `splash watch`.
 *
 * Owns the file tree, per-node heat, and the camera. Created once by the
 * watch bootstrap in main.ts and shared across every WorkspaceVizPattern
 * instance: `buildPatterns()` reconstructs pattern instances on theme or
 * quality change, and `AnimationEngine.setPattern()` resets patterns on
 * every switch — the model outlives all of that (same lifecycle as the
 * photoPattern re-attach precedent).
 *
 * Two invariants keep the model pure and replay-safe:
 * - No wall-clock reads. All methods take an explicit time; the model maps
 *   engine time to a session-relative clock via {@link modelTime}, seeded
 *   by the first timestamp it sees.
 * - Heat decay is lazy. Each node stores (value, timestamp); reads decay
 *   on demand. Subtree aggregates use the same decayed-counter shape,
 *   which is exact because every heat shares one half-life — a touch is
 *   O(depth), a read is O(1), and nothing ticks per frame.
 */

import { Camera } from './Camera.js';
import { WorkspaceFixture } from './fixture.js';

export type WorkspaceNodeKind = 'dir' | 'file';

export interface WorkspaceNode {
  /** Stable numeric id for the session (survives renames). */
  id: number;
  /** Repo-relative POSIX path; `''` for the root. */
  path: string;
  /** Basename; `'/'` for the root. */
  name: string;
  kind: WorkspaceNodeKind;
  parent: WorkspaceNode | null;
  /** Sorted dirs-first then files, each alphabetical — stable across inserts. */
  children: WorkspaceNode[];
  /** Extension including the dot (`'.ts'`), `''` for dirs / no extension. */
  ext: string;
  bytes: number;
  depth: number;
  /** Heat at {@link heatTime} (decays lazily from there). */
  heatValue: number;
  heatTime: number;
  /** Files in this subtree (a file counts itself: 1). */
  subtreeFiles: number;
  /** Decayed-counter aggregate of all heat in this subtree. */
  subtreeHeatValue: number;
  subtreeHeatTime: number;
}

/** One entry of the LOD-resolved visible tree. */
export interface VisibleNode {
  node: WorkspaceNode;
  children: VisibleNode[];
  /** Dirs only: whether children are visible (false ⇒ rendered collapsed). */
  expanded: boolean;
  /** Depth within the visible tree (root = 0) — drives layout radius. */
  visibleDepth: number;
}

export interface WorkspaceModelConfig {
  /** Heat half-life in ms (doc default: 30 s). */
  heatHalfLifeMs?: number;
}

const DEFAULT_HEAT_HALF_LIFE_MS = 30000;

/** Sort key: dirs before files, then name ascending (locale-independent). */
function childOrder(a: WorkspaceNode, b: WorkspaceNode): number {
  if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

export class WorkspaceModel {
  readonly camera = new Camera();

  private readonly heatHalfLifeMs: number;
  private readonly nodes = new Map<string, WorkspaceNode>();
  private readonly root: WorkspaceNode;
  private nextId = 0;
  /** Bumped on any add/remove/rename — lets views cheaply detect relayout needs. */
  private version = 0;
  /** Engine time of the first modelTime() call; anchors the session clock. */
  private epoch: number | null = null;

  constructor(config?: WorkspaceModelConfig) {
    this.heatHalfLifeMs = config?.heatHalfLifeMs ?? DEFAULT_HEAT_HALF_LIFE_MS;
    this.root = this.makeNode('', '/', 'dir', null);
    this.nodes.set('', this.root);
  }

  /**
   * Map engine render time (absolute ms) to session-relative model time.
   * The first timestamp seen becomes 0 — deterministic given the time
   * stream, so replay and fake-clock tests behave identically.
   */
  modelTime(engineTime: number): number {
    if (this.epoch === null) this.epoch = engineTime;
    return engineTime - this.epoch;
  }

  getRoot(): WorkspaceNode {
    return this.root;
  }

  getNode(path: string): WorkspaceNode | undefined {
    return this.nodes.get(path);
  }

  /** Total nodes including the root and intermediate dirs. */
  nodeCount(): number {
    return this.nodes.size;
  }

  fileCount(): number {
    return this.root.subtreeFiles;
  }

  structureVersion(): number {
    return this.version;
  }

  /**
   * Load a parsed fixture snapshot. Files land with heatTime 0 (model
   * time), so seeded heat reads full-strength on the first frame and
   * decays from there.
   */
  loadFixture(fixture: WorkspaceFixture): void {
    for (const file of fixture.files) {
      this.addFile(file.path, { bytes: file.bytes });
      if (file.heat && file.heat > 0) {
        this.touch(file.path, 0, file.heat);
      }
    }
  }

  /**
   * Insert a file (creating intermediate dirs), or update bytes if it
   * already exists. Returns the node. Heat is not bumped here — callers
   * pair this with {@link touch} when the add should glow.
   */
  addFile(path: string, opts?: { bytes?: number }): WorkspaceNode {
    const existing = this.nodes.get(path);
    if (existing) {
      if (opts?.bytes !== undefined) existing.bytes = opts.bytes;
      return existing;
    }
    const slash = path.lastIndexOf('/');
    const parent = this.ensureDir(slash < 0 ? '' : path.slice(0, slash));
    const name = slash < 0 ? path : path.slice(slash + 1);
    const node = this.makeNode(path, name, 'file', parent);
    node.bytes = opts?.bytes ?? 0;
    this.insertChild(parent, node);
    this.nodes.set(path, node);
    this.bumpSubtreeFiles(parent, 1);
    this.version++;
    return node;
  }

  /** Insert a directory (and any missing ancestors). Returns the node. */
  addDir(path: string): WorkspaceNode {
    const node = this.ensureDir(path);
    return node;
  }

  /**
   * Bump a node's heat. Propagates the decayed-counter subtree aggregate
   * up the ancestor chain (O(depth)). Unknown paths are ignored — the
   * attribution feed may race ahead of the tree.
   */
  touch(path: string, time: number, amount = 1): void {
    const node = this.nodes.get(path);
    if (!node) return;
    node.heatValue = this.decayed(node.heatValue, node.heatTime, time) + amount;
    node.heatTime = time;
    for (let n: WorkspaceNode | null = node; n; n = n.parent) {
      n.subtreeHeatValue = this.decayed(n.subtreeHeatValue, n.subtreeHeatTime, time) + amount;
      n.subtreeHeatTime = time;
    }
  }

  /**
   * Remove a file or directory subtree. Aggregates on the ancestor chain
   * shed the removed subtree's (decayed) heat and file count.
   */
  remove(path: string, time: number): boolean {
    const node = this.nodes.get(path);
    if (!node || node === this.root) return false;
    const parent = node.parent;
    if (!parent) return false; // unreachable: only the root is parentless
    const removedHeat = this.subtreeHeatOf(node, time);
    const removedFiles = node.subtreeFiles;
    parent.children.splice(parent.children.indexOf(node), 1);
    this.forEachInSubtree(node, n => this.nodes.delete(n.path));
    this.bumpSubtreeFiles(parent, -removedFiles);
    for (let n: WorkspaceNode | null = parent; n; n = n.parent) {
      n.subtreeHeatValue = Math.max(
        0,
        this.decayed(n.subtreeHeatValue, n.subtreeHeatTime, time) - removedHeat
      );
      n.subtreeHeatTime = time;
    }
    this.version++;
    return true;
  }

  /**
   * Move a node (and its subtree) to a new path, preserving identity and
   * heat — the doc's "node glides to its new home". Fails (returns false)
   * if the source is missing or the destination already exists.
   */
  rename(fromPath: string, toPath: string, time: number): boolean {
    const node = this.nodes.get(fromPath);
    if (!node || node === this.root || this.nodes.has(toPath)) return false;
    const oldParent = node.parent;
    if (!oldParent) return false; // unreachable: only the root is parentless

    const movedHeat = this.subtreeHeatOf(node, time);
    const movedFiles = node.subtreeFiles;

    // Detach: shed aggregates from the old ancestor chain.
    oldParent.children.splice(oldParent.children.indexOf(node), 1);
    this.bumpSubtreeFiles(oldParent, -movedFiles);
    for (let n: WorkspaceNode | null = oldParent; n; n = n.parent) {
      n.subtreeHeatValue = Math.max(
        0,
        this.decayed(n.subtreeHeatValue, n.subtreeHeatTime, time) - movedHeat
      );
      n.subtreeHeatTime = time;
    }

    // Re-key the subtree under its new path.
    this.forEachInSubtree(node, n => this.nodes.delete(n.path));
    const slash = toPath.lastIndexOf('/');
    const newParent = this.ensureDir(slash < 0 ? '' : toPath.slice(0, slash));
    node.name = slash < 0 ? toPath : toPath.slice(slash + 1);
    if (node.kind === 'file') node.ext = extOf(node.name);
    node.parent = newParent;
    this.rekeySubtree(node, toPath, newParent.depth + 1);

    // Attach: add aggregates to the new ancestor chain.
    this.insertChild(newParent, node);
    this.bumpSubtreeFiles(newParent, movedFiles);
    if (movedHeat > 0) {
      for (let n: WorkspaceNode | null = newParent; n; n = n.parent) {
        n.subtreeHeatValue = this.decayed(n.subtreeHeatValue, n.subtreeHeatTime, time) + movedHeat;
        n.subtreeHeatTime = time;
      }
    }
    this.version++;
    return true;
  }

  /** Current heat of a node at `time` (lazy exponential decay). */
  heatOf(node: WorkspaceNode, time: number): number {
    return this.decayed(node.heatValue, node.heatTime, time);
  }

  /** Current total heat of a subtree at `time`. */
  subtreeHeatOf(node: WorkspaceNode, time: number): number {
    return this.decayed(node.subtreeHeatValue, node.subtreeHeatTime, time);
  }

  /**
   * Resolve the LOD-visible tree under a hard node budget.
   *
   * A dir renders expanded only if the greedy pass affords it: candidates
   * (dirs whose parent is already expanded) are taken hottest-first —
   * with a large bonus for dirs on the focus path's ancestor chain — and
   * expansion spends budget equal to the child count. Dirs that don't fit
   * render collapsed as a single node sized by subtree file count. The
   * visible node count never exceeds `max(1, budget)` (the root is always
   * visible).
   */
  computeVisibleTree(budget: number, time: number, focusPath?: string): VisibleNode {
    const expanded = new Set<WorkspaceNode>();
    let visibleCount = 1; // the root itself

    // Focus ancestry: dirs on the chain from root to the focus node get a
    // dominant bonus so the focused region always resolves to leaves.
    const focusChain = new Set<WorkspaceNode>();
    const focus = focusPath !== undefined ? this.nodes.get(focusPath) : undefined;
    for (let n = focus ?? null; n; n = n.parent) {
      if (n.kind === 'dir') focusChain.add(n);
    }

    const candidates: WorkspaceNode[] = this.root.children.length > 0 ? [this.root] : [];
    const score = (dir: WorkspaceNode): number =>
      this.subtreeHeatOf(dir, time) +
      (focusChain.has(dir) ? 1e6 : 0) +
      (dir === this.root ? 1e9 : 0);

    while (candidates.length > 0) {
      // Budgets are small (≲200): a linear max scan beats heap bookkeeping.
      let bestIdx = 0;
      for (let i = 1; i < candidates.length; i++) {
        const d = score(candidates[i]) - score(candidates[bestIdx]);
        if (d > 0 || (d === 0 && candidates[i].path < candidates[bestIdx].path)) {
          bestIdx = i;
        }
      }
      const dir = candidates[bestIdx];
      candidates.splice(bestIdx, 1);
      const cost = dir.children.length;
      if (cost === 0 || visibleCount + cost > budget) continue;
      expanded.add(dir);
      visibleCount += cost;
      for (const child of dir.children) {
        if (child.kind === 'dir') candidates.push(child);
      }
    }

    const build = (node: WorkspaceNode, visibleDepth: number): VisibleNode => {
      const isExpanded = expanded.has(node);
      return {
        node,
        expanded: isExpanded,
        visibleDepth,
        children: isExpanded ? node.children.map(c => build(c, visibleDepth + 1)) : [],
      };
    };
    return build(this.root, 0);
  }

  // ── internals ──────────────────────────────────────────────────────────

  private makeNode(
    path: string,
    name: string,
    kind: WorkspaceNodeKind,
    parent: WorkspaceNode | null
  ): WorkspaceNode {
    return {
      id: this.nextId++,
      path,
      name,
      kind,
      parent,
      children: [],
      ext: kind === 'file' ? extOf(name) : '',
      bytes: 0,
      depth: parent ? parent.depth + 1 : 0,
      heatValue: 0,
      heatTime: 0,
      subtreeFiles: kind === 'file' ? 1 : 0,
      subtreeHeatValue: 0,
      subtreeHeatTime: 0,
    };
  }

  private ensureDir(path: string): WorkspaceNode {
    if (path === '') return this.root;
    const existing = this.nodes.get(path);
    if (existing) {
      if (existing.kind !== 'dir') {
        throw new Error(`WorkspaceModel: "${path}" exists as a file, expected a dir`);
      }
      return existing;
    }
    const slash = path.lastIndexOf('/');
    const parent = this.ensureDir(slash < 0 ? '' : path.slice(0, slash));
    const name = slash < 0 ? path : path.slice(slash + 1);
    const node = this.makeNode(path, name, 'dir', parent);
    this.insertChild(parent, node);
    this.nodes.set(path, node);
    this.version++;
    return node;
  }

  private insertChild(parent: WorkspaceNode, child: WorkspaceNode): void {
    // Binary insertion keeps children permanently sorted — sibling order
    // never changes when new nodes appear (the layout-stability contract).
    let lo = 0;
    let hi = parent.children.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (childOrder(parent.children[mid], child) < 0) lo = mid + 1;
      else hi = mid;
    }
    parent.children.splice(lo, 0, child);
  }

  private bumpSubtreeFiles(from: WorkspaceNode, delta: number): void {
    for (let n: WorkspaceNode | null = from; n; n = n.parent) {
      n.subtreeFiles += delta;
    }
  }

  private forEachInSubtree(node: WorkspaceNode, fn: (n: WorkspaceNode) => void): void {
    fn(node);
    for (const child of node.children) this.forEachInSubtree(child, fn);
  }

  private rekeySubtree(node: WorkspaceNode, newPath: string, depth: number): void {
    node.path = newPath;
    node.depth = depth;
    this.nodes.set(newPath, node);
    for (const child of node.children) {
      this.rekeySubtree(child, `${newPath}/${child.name}`, depth + 1);
    }
  }

  private decayed(value: number, from: number, to: number): number {
    if (value === 0 || to <= from) return value;
    return value * Math.pow(2, -(to - from) / this.heatHalfLifeMs);
  }
}
