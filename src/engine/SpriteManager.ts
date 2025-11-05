import { Sprite, Cell, Size } from '../types/index.js';
import { vec2Add, vec2Multiply, inBounds } from '../utils/math.js';

/**
 * SpriteManager - Manages animated sprites for scene-based patterns
 * 
 * Provides:
 * - Sprite management (add/remove/clear)
 * - Animation (frame cycling based on time)
 * - Physics (position/velocity updates)
 * - Batch rendering (render all sprites to buffer)
 * 
 * Used by v0.3.0 scene-based patterns for animated characters
 * (seagulls, fish, trees, etc.)
 */
export class SpriteManager {
  private sprites: Sprite[] = [];

  /**
   * Add a sprite to be managed
   * @param sprite - Sprite to add
   */
  addSprite(sprite: Sprite): void {
    this.sprites.push(sprite);
  }

  /**
   * Remove a sprite
   * @param sprite - Sprite to remove
   * @returns true if sprite was removed, false if not found
   */
  removeSprite(sprite: Sprite): boolean {
    const index = this.sprites.indexOf(sprite);
    if (index >= 0) {
      this.sprites.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove all inactive sprites
   * @returns Number of sprites removed
   */
  removeInactive(): number {
    const initialCount = this.sprites.length;
    this.sprites = this.sprites.filter(s => s.active);
    return initialCount - this.sprites.length;
  }

  /**
   * Clear all sprites
   */
  clear(): void {
    this.sprites = [];
  }

  /**
   * Get all sprites
   * @returns Array of all sprites
   */
  getSprites(): Sprite[] {
    return this.sprites;
  }

  /**
   * Get number of sprites
   * @returns Number of sprites being managed
   */
  getSpriteCount(): number {
    return this.sprites.length;
  }

  /**
   * Get number of active sprites
   * @returns Number of active sprites
   */
  getActiveSpriteCount(): number {
    return this.sprites.filter(s => s.active).length;
  }

  /**
   * Update all active sprites (animation + physics)
   * @param deltaTime - Time since last update in seconds
   * @param _size - Current terminal size (for bounds checking, unused for now)
   */
  update(deltaTime: number, _size: Size): void {
    const deltaMs = deltaTime * 1000; // Convert to milliseconds

    for (const sprite of this.sprites) {
      if (!sprite.active) continue;

      // Update animation frame
      sprite.frameTime += deltaMs;
      if (sprite.frameTime >= sprite.frameDuration) {
        sprite.frameTime -= sprite.frameDuration;
        sprite.currentFrame = (sprite.currentFrame + 1) % sprite.frames.length;
      }

      // Update physics (position based on velocity)
      const velocityDelta = vec2Multiply(sprite.velocity, deltaTime);
      sprite.position = vec2Add(sprite.position, velocityDelta);
    }
  }

  /**
   * Render all active sprites to the buffer
   * @param buffer - 2D array of cells to render into
   * @param size - Current terminal size
   */
  render(buffer: Cell[][], size: Size): void {
    for (const sprite of this.sprites) {
      if (!sprite.active) continue;

      // Get current frame
      const frame = sprite.frames[sprite.currentFrame];
      if (!frame || frame.length === 0) continue;

      // Calculate scaled dimensions
      const frameWidth = Math.max(...frame.map(line => line.length));
      const frameHeight = frame.length;

      // Calculate top-left position for centered rendering
      const x = Math.floor(sprite.position.x) - Math.floor((frameWidth * sprite.scale) / 2);
      const y = Math.floor(sprite.position.y) - Math.floor((frameHeight * sprite.scale) / 2);

      // Render each line of the frame
      for (let lineIdx = 0; lineIdx < frame.length; lineIdx++) {
        const line = frame[lineIdx];
        const renderY = y + Math.floor(lineIdx * sprite.scale);

        // Skip if out of vertical bounds
        if (!inBounds(0, renderY, size.width, size.height)) continue;

        // Render each character in the line
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === ' ') continue; // Skip spaces (transparent)

          const renderX = x + Math.floor(charIdx * sprite.scale);

          // Check bounds before rendering
          if (inBounds(renderX, renderY, size.width, size.height)) {
            buffer[renderY][renderX] = {
              char: char,
              color: sprite.color
            };
          }
        }
      }
    }
  }

  /**
   * Get metrics for debugging
   * @returns Object with sprite statistics
   */
  getMetrics(): Record<string, number> {
    return {
      totalSprites: this.sprites.length,
      activeSprites: this.getActiveSpriteCount(),
      inactiveSprites: this.sprites.length - this.getActiveSpriteCount(),
    };
  }

  /**
   * Create a simple sprite helper
   * @param x - X position
   * @param y - Y position
   * @param frames - Array of animation frames (each frame is array of strings)
   * @param color - Sprite color
   * @param frameDuration - Duration per frame in milliseconds (default: 100ms)
   * @returns New Sprite object
   */
  static createSprite(
    x: number,
    y: number,
    frames: string[][],
    color: { r: number; g: number; b: number },
    frameDuration: number = 100
  ): Sprite {
    return {
      position: { x, y },
      velocity: { x: 0, y: 0 },
      frames,
      currentFrame: 0,
      frameTime: 0,
      frameDuration,
      color,
      scale: 1,
      active: true,
    };
  }
}
