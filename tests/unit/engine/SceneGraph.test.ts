import { describe, it, expect, beforeEach } from '@jest/globals';
import { SceneGraph } from '../../../src/engine/SceneGraph.js';
import { SceneLayer, Cell, Size } from '../../../src/types/index.js';

// Mock scene layer for testing
class MockLayer implements SceneLayer {
  name: string;
  zIndex: number;
  visible: boolean;
  updateCalled = false;
  renderCalled = false;
  lastDeltaTime = 0;
  lastSize: Size = { width: 0, height: 0 };

  constructor(name: string, zIndex: number, visible: boolean = true) {
    this.name = name;
    this.zIndex = zIndex;
    this.visible = visible;
  }

  update(deltaTime: number, size: Size): void {
    this.updateCalled = true;
    this.lastDeltaTime = deltaTime;
    this.lastSize = size;
  }

  render(buffer: Cell[][], size: Size): void {
    this.renderCalled = true;
    this.lastSize = size;
    // Write a marker to the buffer for testing
    if (buffer.length > 0 && buffer[0].length > 0) {
      buffer[0][0] = { char: this.name[0], color: { r: 255, g: 255, b: 255 } };
    }
  }

  reset(): void {
    this.updateCalled = false;
    this.renderCalled = false;
    this.lastDeltaTime = 0;
  }
}

describe('SceneGraph', () => {
  let sceneGraph: SceneGraph;
  let mockSize: Size;
  let mockBuffer: Cell[][];

  beforeEach(() => {
    sceneGraph = new SceneGraph();
    mockSize = { width: 80, height: 24 };
    mockBuffer = Array(24).fill(null).map(() =>
      Array(80).fill(null).map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
    );
  });

  describe('constructor', () => {
    it('should create an empty scene graph', () => {
      expect(sceneGraph.getLayerCount()).toBe(0);
      expect(sceneGraph.getLayerNames()).toEqual([]);
    });
  });

  describe('addLayer', () => {
    it('should add a layer to the scene', () => {
      const layer = new MockLayer('sky', 0);
      sceneGraph.addLayer(layer);

      expect(sceneGraph.getLayerCount()).toBe(1);
      expect(sceneGraph.getLayerNames()).toEqual(['sky']);
      expect(sceneGraph.getLayer('sky')).toBe(layer);
    });

    it('should add multiple layers', () => {
      const sky = new MockLayer('sky', 0);
      const ocean = new MockLayer('ocean', 10);
      const beach = new MockLayer('beach', 20);

      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);
      sceneGraph.addLayer(beach);

      expect(sceneGraph.getLayerCount()).toBe(3);
      expect(sceneGraph.getLayerNames()).toContain('sky');
      expect(sceneGraph.getLayerNames()).toContain('ocean');
      expect(sceneGraph.getLayerNames()).toContain('beach');
    });

    it('should throw error when adding layer with duplicate name', () => {
      const layer1 = new MockLayer('sky', 0);
      const layer2 = new MockLayer('sky', 10);

      sceneGraph.addLayer(layer1);
      expect(() => sceneGraph.addLayer(layer2)).toThrow('Layer with name "sky" already exists');
    });
  });

  describe('removeLayer', () => {
    it('should remove a layer by name', () => {
      const layer = new MockLayer('sky', 0);
      sceneGraph.addLayer(layer);

      const result = sceneGraph.removeLayer('sky');
      expect(result).toBe(true);
      expect(sceneGraph.getLayerCount()).toBe(0);
      expect(sceneGraph.getLayer('sky')).toBeUndefined();
    });

    it('should return false when removing non-existent layer', () => {
      const result = sceneGraph.removeLayer('nonexistent');
      expect(result).toBe(false);
    });

    it('should only remove the specified layer', () => {
      const sky = new MockLayer('sky', 0);
      const ocean = new MockLayer('ocean', 10);

      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);

      sceneGraph.removeLayer('sky');
      expect(sceneGraph.getLayerCount()).toBe(1);
      expect(sceneGraph.getLayer('ocean')).toBe(ocean);
    });
  });

  describe('getLayer', () => {
    it('should return layer by name', () => {
      const layer = new MockLayer('sky', 0);
      sceneGraph.addLayer(layer);

      const retrieved = sceneGraph.getLayer('sky');
      expect(retrieved).toBe(layer);
    });

    it('should return undefined for non-existent layer', () => {
      const retrieved = sceneGraph.getLayer('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('setLayerVisibility', () => {
    it('should set layer visibility', () => {
      const layer = new MockLayer('sky', 0, true);
      sceneGraph.addLayer(layer);

      const result = sceneGraph.setLayerVisibility('sky', false);
      expect(result).toBe(true);
      expect(layer.visible).toBe(false);
    });

    it('should return false for non-existent layer', () => {
      const result = sceneGraph.setLayerVisibility('nonexistent', false);
      expect(result).toBe(false);
    });

    it('should toggle visibility correctly', () => {
      const layer = new MockLayer('sky', 0, true);
      sceneGraph.addLayer(layer);

      sceneGraph.setLayerVisibility('sky', false);
      expect(layer.visible).toBe(false);

      sceneGraph.setLayerVisibility('sky', true);
      expect(layer.visible).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all layers', () => {
      sceneGraph.addLayer(new MockLayer('sky', 0));
      sceneGraph.addLayer(new MockLayer('ocean', 10));
      sceneGraph.addLayer(new MockLayer('beach', 20));

      sceneGraph.clear();
      expect(sceneGraph.getLayerCount()).toBe(0);
      expect(sceneGraph.getLayerNames()).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update all visible layers', () => {
      const sky = new MockLayer('sky', 0, true);
      const ocean = new MockLayer('ocean', 10, true);
      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);

      const deltaTime = 0.016; // ~60 FPS
      sceneGraph.update(deltaTime, mockSize);

      expect(sky.updateCalled).toBe(true);
      expect(sky.lastDeltaTime).toBe(deltaTime);
      expect(sky.lastSize).toEqual(mockSize);

      expect(ocean.updateCalled).toBe(true);
      expect(ocean.lastDeltaTime).toBe(deltaTime);
      expect(ocean.lastSize).toEqual(mockSize);
    });

    it('should skip invisible layers', () => {
      const visible = new MockLayer('visible', 0, true);
      const invisible = new MockLayer('invisible', 10, false);
      sceneGraph.addLayer(visible);
      sceneGraph.addLayer(invisible);

      sceneGraph.update(0.016, mockSize);

      expect(visible.updateCalled).toBe(true);
      expect(invisible.updateCalled).toBe(false);
    });

    it('should handle empty scene graph', () => {
      expect(() => sceneGraph.update(0.016, mockSize)).not.toThrow();
    });
  });

  describe('render', () => {
    it('should render all visible layers', () => {
      const sky = new MockLayer('sky', 0, true);
      const ocean = new MockLayer('ocean', 10, true);
      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);

      sceneGraph.render(mockBuffer, mockSize);

      expect(sky.renderCalled).toBe(true);
      expect(ocean.renderCalled).toBe(true);
    });

    it('should skip invisible layers', () => {
      const visible = new MockLayer('visible', 0, true);
      const invisible = new MockLayer('invisible', 10, false);
      sceneGraph.addLayer(visible);
      sceneGraph.addLayer(invisible);

      sceneGraph.render(mockBuffer, mockSize);

      expect(visible.renderCalled).toBe(true);
      expect(invisible.renderCalled).toBe(false);
    });

    it('should render layers in z-order (lowest first)', () => {
      const renderOrder: string[] = [];

      class OrderTrackingLayer extends MockLayer {
        constructor(name: string, zIndex: number) {
          super(name, zIndex);
        }

        render(buffer: Cell[][], size: Size): void {
          renderOrder.push(this.name);
          super.render(buffer, size);
        }
      }

      // Add layers in random order
      sceneGraph.addLayer(new OrderTrackingLayer('beach', 20));
      sceneGraph.addLayer(new OrderTrackingLayer('sky', 0));
      sceneGraph.addLayer(new OrderTrackingLayer('ocean', 10));

      sceneGraph.render(mockBuffer, mockSize);

      // Should render in z-order: sky (0) → ocean (10) → beach (20)
      expect(renderOrder).toEqual(['sky', 'ocean', 'beach']);
    });

    it('should handle layers with same z-index', () => {
      const layer1 = new MockLayer('layer1', 10);
      const layer2 = new MockLayer('layer2', 10);
      sceneGraph.addLayer(layer1);
      sceneGraph.addLayer(layer2);

      expect(() => sceneGraph.render(mockBuffer, mockSize)).not.toThrow();
      expect(layer1.renderCalled).toBe(true);
      expect(layer2.renderCalled).toBe(true);
    });

    it('should handle empty scene graph', () => {
      expect(() => sceneGraph.render(mockBuffer, mockSize)).not.toThrow();
    });
  });

  describe('getLayersSorted', () => {
    it('should return layers sorted by z-index', () => {
      const beach = new MockLayer('beach', 20);
      const sky = new MockLayer('sky', 0);
      const ocean = new MockLayer('ocean', 10);

      sceneGraph.addLayer(beach);
      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);

      const sorted = sceneGraph.getLayersSorted();
      expect(sorted.map(l => l.name)).toEqual(['sky', 'ocean', 'beach']);
      expect(sorted.map(l => l.zIndex)).toEqual([0, 10, 20]);
    });

    it('should return empty array for empty scene graph', () => {
      const sorted = sceneGraph.getLayersSorted();
      expect(sorted).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      sceneGraph.addLayer(new MockLayer('sky', 0, true));
      sceneGraph.addLayer(new MockLayer('ocean', 10, true));
      sceneGraph.addLayer(new MockLayer('hidden', 20, false));

      const metrics = sceneGraph.getMetrics();
      expect(metrics.totalLayers).toBe(3);
      expect(metrics.visibleLayers).toBe(2);
    });

    it('should return zero metrics for empty scene graph', () => {
      const metrics = sceneGraph.getMetrics();
      expect(metrics.totalLayers).toBe(0);
      expect(metrics.visibleLayers).toBe(0);
    });
  });

  describe('integration', () => {
    it('should handle complete lifecycle', () => {
      // Add layers
      const sky = new MockLayer('sky', 0);
      const ocean = new MockLayer('ocean', 10);
      const beach = new MockLayer('beach', 20);

      sceneGraph.addLayer(sky);
      sceneGraph.addLayer(ocean);
      sceneGraph.addLayer(beach);

      // Update
      sceneGraph.update(0.016, mockSize);
      expect(sky.updateCalled).toBe(true);
      expect(ocean.updateCalled).toBe(true);
      expect(beach.updateCalled).toBe(true);

      // Render
      sceneGraph.render(mockBuffer, mockSize);
      expect(sky.renderCalled).toBe(true);
      expect(ocean.renderCalled).toBe(true);
      expect(beach.renderCalled).toBe(true);

      // Hide layer
      sceneGraph.setLayerVisibility('ocean', false);
      ocean.reset();

      // Update/render again
      sceneGraph.update(0.016, mockSize);
      sceneGraph.render(mockBuffer, mockSize);

      expect(sky.updateCalled).toBe(true);
      expect(ocean.updateCalled).toBe(false); // Hidden
      expect(beach.updateCalled).toBe(true);

      // Remove layer
      sceneGraph.removeLayer('beach');
      expect(sceneGraph.getLayerCount()).toBe(2);

      // Clear
      sceneGraph.clear();
      expect(sceneGraph.getLayerCount()).toBe(0);
    });
  });
});
