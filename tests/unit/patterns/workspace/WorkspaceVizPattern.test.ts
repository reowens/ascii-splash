import { describe, expect, jest, test } from '@jest/globals';
import { WorkspaceModel } from '../../../../src/patterns/workspace/WorkspaceModel.js';
import { WorkspaceVizPattern } from '../../../../src/patterns/workspace/WorkspaceVizPattern.js';
import { Mulberry32 } from '../../../../src/utils/random.js';
import { createMockBuffer, createMockTheme } from '../../../utils/mocks.js';
import { buildPatternSlots } from '../../../../src/patterns/PatternCatalog.js';
import { createDefaultConfig } from '../../../../src/config/defaults.js';
import { RuntimeController } from '../../../../src/engine/RuntimeController.js';
import type { Pattern } from '../../../../src/types/index.js';

function populatedModel(): WorkspaceModel {
  const model = new WorkspaceModel({ heatHalfLifeMs: 10000 });
  model.addFile('src/hot/deep/leaf.ts', { bytes: 10 });
  model.addFile('src/cold.ts');
  model.addFile('docs/readme.md');
  model.touch('src/hot/deep/leaf.ts', 0, 10);
  return model;
}

describe('WorkspaceVizPattern Phase A', () => {
  test.each([
    { width: 1, height: 1 },
    { width: 20, height: 5 },
    { width: 80, height: 24 },
  ])('renders within $width x $height bounds', size => {
    const pattern = new WorkspaceVizPattern(populatedModel(), createMockTheme(), new Mulberry32(1));
    const buffer = createMockBuffer(size.width, size.height);
    expect(() => pattern.render(buffer, 0, size)).not.toThrow();
    expect(buffer).toHaveLength(size.height);
    expect(buffer.every(row => row.length === size.width)).toBe(true);
  });

  test('handles resize and forces a new bounded LOD pass', () => {
    const pattern = new WorkspaceVizPattern(populatedModel(), createMockTheme(), new Mulberry32(1));
    pattern.render(createMockBuffer(20, 5), 0, { width: 20, height: 5 });
    pattern.onResize();
    pattern.render(createMockBuffer(80, 24), 600, { width: 80, height: 24 });
    expect(pattern.getMetrics().visibleNodes).toBeLessThanOrEqual(150);
  });

  test('exposes three presets and resets view state when applying one', () => {
    const pattern = new WorkspaceVizPattern(populatedModel(), createMockTheme(), new Mulberry32(1));
    expect(WorkspaceVizPattern.getPresets().map(preset => preset.id)).toEqual([1, 2, 3]);
    expect(pattern.applyPreset(2)).toBe(true);
    expect(pattern.applyPreset(99)).toBe(false);
    expect(pattern.getMetrics().visibleNodes).toBe(0);
  });

  test('reset clears view transients but preserves model and camera state', () => {
    const model = populatedModel();
    const pattern = new WorkspaceVizPattern(model, createMockTheme(), new Mulberry32(1));
    pattern.render(createMockBuffer(40, 12), 0, { width: 40, height: 12 });
    const camera = model.camera;
    const zoom = camera.zoom;
    pattern.reset();
    expect(model.fileCount()).toBe(3);
    expect(model.camera).toBe(camera);
    expect(model.camera.zoom).toBe(zoom);
  });

  test('renders deterministically with equal model state and seed', () => {
    const size = { width: 40, height: 12 };
    const a = new WorkspaceVizPattern(populatedModel(), createMockTheme(), new Mulberry32(42));
    const b = new WorkspaceVizPattern(populatedModel(), createMockTheme(), new Mulberry32(42));
    const bufferA = createMockBuffer(size.width, size.height);
    const bufferB = createMockBuffer(size.width, size.height);
    a.render(bufferA, 100, size);
    b.render(bufferB, 100, size);
    expect(bufferA).toEqual(bufferB);
  });

  test('Focus preset never selects root when non-root activity exists', () => {
    const model = populatedModel();
    const pattern = new WorkspaceVizPattern(model, createMockTheme(), new Mulberry32(1));
    pattern.applyPreset(2);
    const size = { width: 20, height: 5 };
    pattern.render(createMockBuffer(size.width, size.height), 0, size);
    const metrics = pattern.getMetrics();
    expect(metrics.focusedNodeId).not.toBe(model.getRoot().id);
    expect(metrics.focusedNodeId).toBeGreaterThanOrEqual(0);
    expect(metrics.focusDepth).toBeGreaterThan(0);
  });

  test('equal-heat focus selection is stable by path order', () => {
    const make = () => {
      const model = new WorkspaceModel();
      model.addFile('b.ts');
      model.addFile('a.ts');
      model.touch('b.ts', 0, 1);
      model.touch('a.ts', 0, 1);
      return model;
    };
    const size = { width: 40, height: 12 };
    const firstModel = make();
    const secondModel = make();
    const first = new WorkspaceVizPattern(firstModel, createMockTheme(), new Mulberry32(1));
    const second = new WorkspaceVizPattern(secondModel, createMockTheme(), new Mulberry32(1));
    first.applyPreset(2);
    second.applyPreset(2);
    first.render(createMockBuffer(size.width, size.height), 0, size);
    second.render(createMockBuffer(size.width, size.height), 0, size);
    expect(first.getMetrics().focusedNodeId).toBe(firstModel.getNode('a.ts')?.id);
    expect(second.getMetrics().focusedNodeId).toBe(secondModel.getNode('a.ts')?.id);
  });

  test('applies a replacement theme without rebuilding the model', () => {
    const model = populatedModel();
    const pattern = new WorkspaceVizPattern(model, createMockTheme('first'), new Mulberry32(1));
    const replacement = createMockTheme('second');
    replacement.getColor = jest.fn(replacement.getColor);
    pattern.onThemeChange(replacement);
    pattern.render(createMockBuffer(20, 5), 0, { width: 20, height: 5 });
    expect(replacement.getColor).toHaveBeenCalled();
    expect(model.fileCount()).toBe(3);
  });

  test('runtime theme rebuild replaces the view but preserves model and camera', () => {
    const model = populatedModel();
    const themes = [createMockTheme('one'), createMockTheme('two')];
    const build = (theme: (typeof themes)[number]) =>
      buildPatternSlots({
        config: createDefaultConfig(),
        theme,
        workspaceModel: model,
        seedFactory: () => 1,
      });
    const initialSlots = build(themes[0]);
    const workspaceIndex = initialSlots.findIndex(slot => slot.key === 'workspace');
    let active: Pattern = initialSlots[workspaceIndex].pattern;
    const engine = {
      getPattern: () => active,
      setPattern: (pattern: Pattern) => {
        active = pattern;
      },
      getFps: () => 30,
      setFps: () => {},
    };
    const runtime = new RuntimeController({
      engine,
      themes,
      initialSlots,
      initialPatternIndex: workspaceIndex,
      initialThemeIndex: 0,
      initialQuality: 'medium',
      rebuildSlots: theme => build(theme),
    });
    const firstView = runtime.getCurrentPattern();
    firstView.render(createMockBuffer(40, 12), 0, { width: 40, height: 12 });
    const camera = model.camera;

    runtime.changeTheme(1);
    const replacement = runtime.getCurrentPattern();
    replacement.render(createMockBuffer(40, 12), 0, { width: 40, height: 12 });

    expect(replacement).not.toBe(firstView);
    expect(model.camera).toBe(camera);
    expect(model.fileCount()).toBe(3);
  });
});
