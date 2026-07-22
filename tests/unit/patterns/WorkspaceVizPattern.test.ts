import { describe, expect, it, jest } from '@jest/globals';
import { WorkspaceModel } from '../../../src/patterns/workspace/WorkspaceModel.js';
import { WorkspaceVizPattern } from '../../../src/patterns/workspace/WorkspaceVizPattern.js';
import { Mulberry32 } from '../../../src/utils/random.js';
import { createMockBuffer, createMockTheme } from '../../utils/mocks.js';

describe('WorkspaceVizPattern application clock', () => {
  it('keeps model time monotonic across disposable view rebuilds', () => {
    const model = new WorkspaceModel({ heatHalfLifeMs: 1000 });
    model.addFile('src/index.ts');
    const modelTime = jest.spyOn(model, 'modelTime');
    const size = { width: 30, height: 12 };
    const theme = createMockTheme();

    const firstView = new WorkspaceVizPattern(model, theme, new Mulberry32(1));
    firstView.render(createMockBuffer(size.width, size.height), 40, size, undefined, {
      sceneTime: 40,
      appTime: 500,
      deltaTime: 40,
    });
    model.touch('src/index.ts', 0, 1);

    const rebuiltView = new WorkspaceVizPattern(model, theme, new Mulberry32(1));
    rebuiltView.render(createMockBuffer(size.width, size.height), 20, size, undefined, {
      sceneTime: 20,
      appTime: 1500,
      deltaTime: 20,
    });

    expect(modelTime).toHaveBeenNthCalledWith(1, 500);
    expect(modelTime).toHaveBeenNthCalledWith(2, 1500);
    expect(model.modelTime(1500)).toBe(1000);
    expect(model.heatOf(model.getNode('src/index.ts')!, 1000)).toBeCloseTo(0.5);
  });
});
