import { describe, expect, test } from '@jest/globals';
import { RadialLayout } from '../../../../src/patterns/workspace/RadialLayout.js';
import { WorkspaceModel } from '../../../../src/patterns/workspace/WorkspaceModel.js';

describe('RadialLayout', () => {
  test('places a bare root at the origin', () => {
    const model = new WorkspaceModel();
    const result = new RadialLayout().compute(model.computeVisibleTree(10, 0));
    expect(result.points.get(model.getRoot().id)).toEqual({ x: 0, y: 0, angle: 0, radius: 0 });
    expect(result.maxRadius).toBe(0);
  });

  test('places each visible depth on a stable ring', () => {
    const model = new WorkspaceModel();
    model.addFile('src/deep/a.ts');
    const tree = model.computeVisibleTree(10, 0);
    const result = new RadialLayout({ ringSpacing: 2 }).compute(tree);
    expect(result.points.get(model.getNode('src')!.id)?.radius).toBe(2);
    expect(result.points.get(model.getNode('src/deep')!.id)?.radius).toBe(4);
    expect(result.points.get(model.getNode('src/deep/a.ts')!.id)?.radius).toBe(6);
    expect(result.maxRadius).toBe(6);
  });

  test('produces finite positions for empty directories and files', () => {
    const model = new WorkspaceModel();
    model.addDir('empty');
    model.addFile('a.ts');
    const result = new RadialLayout().compute(model.computeVisibleTree(10, 0));
    for (const point of result.points.values()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  test('is deterministic for stable sibling order', () => {
    const model = new WorkspaceModel();
    model.addFile('b.ts');
    model.addFile('a.ts');
    const layout = new RadialLayout();
    expect(layout.compute(model.computeVisibleTree(10, 0))).toEqual(
      layout.compute(model.computeVisibleTree(10, 0))
    );
  });
});
