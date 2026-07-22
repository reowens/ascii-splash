import { describe, expect, test } from '@jest/globals';
import {
  WorkspaceModel,
  type VisibleNode,
} from '../../../../src/patterns/workspace/WorkspaceModel.js';

function visiblePaths(root: VisibleNode): string[] {
  return [root.node.path, ...root.children.flatMap(visiblePaths)];
}

describe('WorkspaceModel', () => {
  test('adds files, intermediate directories, and updates bytes in place', () => {
    const model = new WorkspaceModel();
    const file = model.addFile('src/lib/a.ts', { bytes: 10 });
    expect(model.nodeCount()).toBe(4);
    expect(model.fileCount()).toBe(1);
    expect(file.depth).toBe(3);
    expect(file.ext).toBe('.ts');
    expect(model.addFile('src/lib/a.ts', { bytes: 20 })).toBe(file);
    expect(file.bytes).toBe(20);
  });

  test('keeps directories first and siblings alphabetically stable', () => {
    const model = new WorkspaceModel();
    model.addFile('z.ts');
    model.addFile('b/x.ts');
    model.addFile('a/x.ts');
    model.addFile('m.ts');
    expect(model.getRoot().children.map(node => node.name)).toEqual(['a', 'b', 'm.ts', 'z.ts']);
  });

  test('rejects treating an existing file as an intermediate directory', () => {
    const model = new WorkspaceModel();
    model.addFile('src');
    expect(() => model.addFile('src/a.ts')).toThrow(/exists as a file/);
  });

  test('increments structure version for structural changes but not byte updates', () => {
    const model = new WorkspaceModel();
    const initial = model.structureVersion();
    model.addFile('a/b.ts');
    const added = model.structureVersion();
    expect(added).toBeGreaterThan(initial);
    model.addFile('a/b.ts', { bytes: 2 });
    expect(model.structureVersion()).toBe(added);
    model.remove('a/b.ts', 0);
    expect(model.structureVersion()).toBeGreaterThan(added);
  });

  test('decays own and subtree heat exactly at half-life boundaries', () => {
    const model = new WorkspaceModel({ heatHalfLifeMs: 1000 });
    const file = model.addFile('src/a.ts');
    model.touch(file.path, 0, 4);
    expect(model.heatOf(file, 1000)).toBeCloseTo(2);
    expect(model.subtreeHeatOf(model.getRoot(), 2000)).toBeCloseTo(1);
    model.touch('missing.ts', 2000, 10);
    expect(model.subtreeHeatOf(model.getRoot(), 2000)).toBeCloseTo(1);
  });

  test('removes subtree file and heat aggregates', () => {
    const model = new WorkspaceModel();
    model.addFile('src/a.ts');
    model.addFile('src/nested/b.ts');
    model.addFile('keep.ts');
    model.touch('src/a.ts', 0, 2);
    model.touch('src/nested/b.ts', 0, 3);
    expect(model.remove('src', 0)).toBe(true);
    expect(model.fileCount()).toBe(1);
    expect(model.subtreeHeatOf(model.getRoot(), 0)).toBe(0);
    expect(model.getNode('src/nested/b.ts')).toBeUndefined();
    expect(model.remove('')).toBe(false);
    expect(model.remove('missing')).toBe(false);
  });

  test('renames a subtree while preserving ids, heat, depth, and aggregates', () => {
    const model = new WorkspaceModel();
    const file = model.addFile('src/old/a.ts');
    model.touch(file.path, 0, 2);
    const id = file.id;
    expect(model.rename('src/old', 'lib/new', 500)).toBe(true);
    const moved = model.getNode('lib/new/a.ts')!;
    expect(moved.id).toBe(id);
    expect(moved.depth).toBe(3);
    expect(model.heatOf(moved, 500)).toBeGreaterThan(0);
    expect(model.fileCount()).toBe(1);
    expect(model.rename('missing', 'x', 0)).toBe(false);
    expect(model.rename('lib/new', 'lib/new/a.ts', 0)).toBe(false);
  });

  test('enforces the visible-tree hard budget', () => {
    const model = new WorkspaceModel();
    for (let i = 0; i < 30; i++) model.addFile(`dir${String(i)}/file.ts`);
    for (const budget of [0, 1, 5, 12]) {
      expect(visiblePaths(model.computeVisibleTree(budget, 0)).length).toBeLessThanOrEqual(
        Math.max(1, budget)
      );
    }
  });

  test('focus ancestry expands a hot path under a constrained budget', () => {
    const model = new WorkspaceModel();
    model.addFile('cold/a.ts');
    model.addFile('hot/deep/leaf.ts');
    model.addFile('other/a.ts');
    model.touch('hot/deep/leaf.ts', 0, 10);
    const paths = visiblePaths(model.computeVisibleTree(6, 0, 'hot/deep/leaf.ts'));
    expect(paths).toEqual(expect.arrayContaining(['hot', 'hot/deep', 'hot/deep/leaf.ts']));
  });

  test('maps application time to a monotonic session epoch', () => {
    const model = new WorkspaceModel();
    expect(model.modelTime(5000)).toBe(0);
    expect(model.modelTime(5500)).toBe(500);
  });

  test('loads fixture files and seeded heat', () => {
    const model = new WorkspaceModel();
    model.loadFixture({ schema: 1, files: [{ path: 'a.ts', bytes: 4, heat: 2 }] });
    expect(model.getNode('a.ts')?.bytes).toBe(4);
    expect(model.heatOf(model.getNode('a.ts')!, 0)).toBe(2);
  });
});
