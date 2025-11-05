import { SceneLayer, Cell, Size } from '../types/index.js';

/**
 * SceneGraph - Manages layered rendering for scene-based patterns
 * 
 * Provides:
 * - Layer management (add/remove/get)
 * - Z-ordering (automatic sorting by zIndex)
 * - Update cycle (propagates deltaTime to all visible layers)
 * - Render cycle (renders bottom-to-top, respecting z-order)
 * 
 * Used by v0.3.0 scene-based patterns (Ocean Beach, Campfire, etc.)
 * to manage multiple animated layers (sky, clouds, ocean, beach, etc.)
 */
export class SceneGraph {
  private layers: Map<string, SceneLayer> = new Map();

  /**
   * Add a layer to the scene
   * @param layer - SceneLayer to add
   * @throws Error if layer with same name already exists
   */
  addLayer(layer: SceneLayer): void {
    if (this.layers.has(layer.name)) {
      throw new Error(`Layer with name "${layer.name}" already exists`);
    }
    this.layers.set(layer.name, layer);
  }

  /**
   * Remove a layer from the scene
   * @param name - Name of layer to remove
   * @returns true if layer was removed, false if not found
   */
  removeLayer(name: string): boolean {
    return this.layers.delete(name);
  }

  /**
   * Get a layer by name
   * @param name - Name of layer
   * @returns SceneLayer if found, undefined otherwise
   */
  getLayer(name: string): SceneLayer | undefined {
    return this.layers.get(name);
  }

  /**
   * Get all layer names
   * @returns Array of layer names
   */
  getLayerNames(): string[] {
    return Array.from(this.layers.keys());
  }

  /**
   * Get number of layers
   * @returns Number of layers in scene
   */
  getLayerCount(): number {
    return this.layers.size;
  }

  /**
   * Set layer visibility
   * @param name - Name of layer
   * @param visible - New visibility state
   * @returns true if layer was found and updated, false otherwise
   */
  setLayerVisibility(name: string, visible: boolean): boolean {
    const layer = this.layers.get(name);
    if (layer) {
      layer.visible = visible;
      return true;
    }
    return false;
  }

  /**
   * Clear all layers
   */
  clear(): void {
    this.layers.clear();
  }

  /**
   * Update all visible layers
   * @param deltaTime - Time since last update in seconds
   * @param size - Current terminal size
   */
  update(deltaTime: number, size: Size): void {
    for (const layer of this.layers.values()) {
      if (layer.visible) {
        layer.update(deltaTime, size);
      }
    }
  }

  /**
   * Render all visible layers in z-order (bottom to top)
   * @param buffer - 2D array of cells to render into
   * @param size - Current terminal size
   */
  render(buffer: Cell[][], size: Size): void {
    // Sort layers by z-index (lowest first)
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Render bottom to top
    for (const layer of sortedLayers) {
      layer.render(buffer, size);
    }
  }

  /**
   * Get all layers sorted by z-index
   * @returns Array of layers sorted by zIndex
   */
  getLayersSorted(): SceneLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get metrics for debugging
   * @returns Object with layer statistics
   */
  getMetrics(): Record<string, number> {
    return {
      totalLayers: this.layers.size,
      visibleLayers: Array.from(this.layers.values()).filter(l => l.visible).length,
    };
  }
}
