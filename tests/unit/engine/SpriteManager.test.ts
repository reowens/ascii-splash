import { describe, it, expect, beforeEach } from '@jest/globals';
import { SpriteManager } from '../../../src/engine/SpriteManager.js';
import { Cell, Size } from '../../../src/types/index.js';

describe('SpriteManager', () => {
  let spriteManager: SpriteManager;
  let mockSize: Size;
  let mockBuffer: Cell[][];

  beforeEach(() => {
    spriteManager = new SpriteManager();
    mockSize = { width: 80, height: 24 };
    mockBuffer = Array(24).fill(null).map(() =>
      Array(80).fill(null).map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
    );
  });

  describe('constructor', () => {
    it('should create an empty sprite manager', () => {
      expect(spriteManager.getSpriteCount()).toBe(0);
      expect(spriteManager.getActiveSpriteCount()).toBe(0);
    });
  });

  describe('addSprite', () => {
    it('should add a sprite', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      expect(spriteManager.getSpriteCount()).toBe(1);
      expect(spriteManager.getActiveSpriteCount()).toBe(1);
    });

    it('should add multiple sprites', () => {
      const sprite1 = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      const sprite2 = SpriteManager.createSprite(20, 20, [['Y']], { r: 255, g: 255, b: 255 });

      spriteManager.addSprite(sprite1);
      spriteManager.addSprite(sprite2);

      expect(spriteManager.getSpriteCount()).toBe(2);
    });
  });

  describe('removeSprite', () => {
    it('should remove a sprite', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      const result = spriteManager.removeSprite(sprite);
      expect(result).toBe(true);
      expect(spriteManager.getSpriteCount()).toBe(0);
    });

    it('should return false when removing non-existent sprite', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      const result = spriteManager.removeSprite(sprite);
      expect(result).toBe(false);
    });
  });

  describe('removeInactive', () => {
    it('should remove inactive sprites', () => {
      const active = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      const inactive = SpriteManager.createSprite(20, 20, [['Y']], { r: 255, g: 255, b: 255 });
      inactive.active = false;

      spriteManager.addSprite(active);
      spriteManager.addSprite(inactive);

      const removed = spriteManager.removeInactive();
      expect(removed).toBe(1);
      expect(spriteManager.getSpriteCount()).toBe(1);
      expect(spriteManager.getActiveSpriteCount()).toBe(1);
    });

    it('should return 0 when all sprites are active', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      const removed = spriteManager.removeInactive();
      expect(removed).toBe(0);
      expect(spriteManager.getSpriteCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all sprites', () => {
      spriteManager.addSprite(SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 }));
      spriteManager.addSprite(SpriteManager.createSprite(20, 20, [['Y']], { r: 255, g: 255, b: 255 }));

      spriteManager.clear();
      expect(spriteManager.getSpriteCount()).toBe(0);
    });
  });

  describe('update', () => {
    it('should update sprite animation', () => {
      const frames = [['A'], ['B'], ['C']];
      const sprite = SpriteManager.createSprite(10, 10, frames, { r: 255, g: 255, b: 255 }, 100);
      spriteManager.addSprite(sprite);

      expect(sprite.currentFrame).toBe(0);

      // Update for 100ms (should advance one frame)
      spriteManager.update(0.1, mockSize);
      expect(sprite.currentFrame).toBe(1);

      // Update for another 100ms
      spriteManager.update(0.1, mockSize);
      expect(sprite.currentFrame).toBe(2);

      // Update again (should wrap to frame 0)
      spriteManager.update(0.1, mockSize);
      expect(sprite.currentFrame).toBe(0);
    });

    it('should update sprite position based on velocity', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      sprite.velocity = { x: 10, y: 5 }; // 10 units/sec right, 5 units/sec down
      spriteManager.addSprite(sprite);

      // Update for 1 second
      spriteManager.update(1.0, mockSize);

      expect(sprite.position.x).toBe(20); // 10 + (10 * 1.0)
      expect(sprite.position.y).toBe(15); // 10 + (5 * 1.0)
    });

    it('should update sprite position with fractional deltaTime', () => {
      const sprite = SpriteManager.createSprite(0, 0, [['X']], { r: 255, g: 255, b: 255 });
      sprite.velocity = { x: 100, y: 100 };
      spriteManager.addSprite(sprite);

      // Update for 0.016s (~60 FPS)
      spriteManager.update(0.016, mockSize);

      expect(sprite.position.x).toBeCloseTo(1.6, 1);
      expect(sprite.position.y).toBeCloseTo(1.6, 1);
    });

    it('should skip inactive sprites', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      sprite.velocity = { x: 10, y: 0 };
      sprite.active = false;
      spriteManager.addSprite(sprite);

      spriteManager.update(1.0, mockSize);

      // Position should not change
      expect(sprite.position.x).toBe(10);
    });

    it('should handle multiple sprites', () => {
      const sprite1 = SpriteManager.createSprite(0, 0, [['X']], { r: 255, g: 255, b: 255 });
      const sprite2 = SpriteManager.createSprite(10, 10, [['Y']], { r: 255, g: 255, b: 255 });
      sprite1.velocity = { x: 5, y: 0 };
      sprite2.velocity = { x: 0, y: 5 };

      spriteManager.addSprite(sprite1);
      spriteManager.addSprite(sprite2);

      spriteManager.update(1.0, mockSize);

      expect(sprite1.position.x).toBe(5);
      expect(sprite1.position.y).toBe(0);
      expect(sprite2.position.x).toBe(10);
      expect(sprite2.position.y).toBe(15);
    });
  });

  describe('render', () => {
    it('should render sprite to buffer', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 0, b: 0 });
      spriteManager.addSprite(sprite);

      spriteManager.render(mockBuffer, mockSize);

      // Sprite is centered, so 'X' should be at (10, 10)
      expect(mockBuffer[10][10].char).toBe('X');
      expect(mockBuffer[10][10].color).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should render multi-line sprite', () => {
      const frames = [[
        'XXX',
        'XOX',
        'XXX'
      ]];
      const sprite = SpriteManager.createSprite(10, 10, frames, { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      spriteManager.render(mockBuffer, mockSize);

      // Check center character
      expect(mockBuffer[10][10].char).toBe('O');
    });

    it('should skip rendering spaces (transparency)', () => {
      const frames = [[
        'X X',
        ' O ',
        'X X'
      ]];
      const sprite = SpriteManager.createSprite(10, 10, frames, { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      spriteManager.render(mockBuffer, mockSize);

      // Spaces should not overwrite buffer
      expect(mockBuffer[10][10].char).toBe('O');
      expect(mockBuffer[10][9].char).toBe(' '); // Original buffer space
      expect(mockBuffer[10][11].char).toBe(' '); // Original buffer space
    });

    it('should skip inactive sprites', () => {
      const sprite = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      sprite.active = false;
      spriteManager.addSprite(sprite);

      spriteManager.render(mockBuffer, mockSize);

      // Should not render
      expect(mockBuffer[10][10].char).toBe(' ');
    });

    it('should clip sprites outside buffer bounds', () => {
      // Sprite off the top-left
      const sprite1 = SpriteManager.createSprite(-10, -10, [['X']], { r: 255, g: 255, b: 255 });
      // Sprite off the bottom-right
      const sprite2 = SpriteManager.createSprite(100, 100, [['Y']], { r: 255, g: 255, b: 255 });

      spriteManager.addSprite(sprite1);
      spriteManager.addSprite(sprite2);

      // Should not crash
      expect(() => spriteManager.render(mockBuffer, mockSize)).not.toThrow();
    });

    it('should render multiple sprites', () => {
      const sprite1 = SpriteManager.createSprite(5, 5, [['A']], { r: 255, g: 0, b: 0 });
      const sprite2 = SpriteManager.createSprite(15, 15, [['B']], { r: 0, g: 255, b: 0 });

      spriteManager.addSprite(sprite1);
      spriteManager.addSprite(sprite2);

      spriteManager.render(mockBuffer, mockSize);

      expect(mockBuffer[5][5].char).toBe('A');
      expect(mockBuffer[5][5].color).toEqual({ r: 255, g: 0, b: 0 });
      expect(mockBuffer[15][15].char).toBe('B');
      expect(mockBuffer[15][15].color).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should handle sprite with empty frames', () => {
      const sprite = SpriteManager.createSprite(10, 10, [[]], { r: 255, g: 255, b: 255 });
      spriteManager.addSprite(sprite);

      expect(() => spriteManager.render(mockBuffer, mockSize)).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      const active1 = SpriteManager.createSprite(10, 10, [['X']], { r: 255, g: 255, b: 255 });
      const active2 = SpriteManager.createSprite(20, 20, [['Y']], { r: 255, g: 255, b: 255 });
      const inactive = SpriteManager.createSprite(30, 30, [['Z']], { r: 255, g: 255, b: 255 });
      inactive.active = false;

      spriteManager.addSprite(active1);
      spriteManager.addSprite(active2);
      spriteManager.addSprite(inactive);

      const metrics = spriteManager.getMetrics();
      expect(metrics.totalSprites).toBe(3);
      expect(metrics.activeSprites).toBe(2);
      expect(metrics.inactiveSprites).toBe(1);
    });
  });

  describe('createSprite helper', () => {
    it('should create sprite with default values', () => {
      const sprite = SpriteManager.createSprite(
        10,
        20,
        [['X']],
        { r: 100, g: 150, b: 200 }
      );

      expect(sprite.position).toEqual({ x: 10, y: 20 });
      expect(sprite.velocity).toEqual({ x: 0, y: 0 });
      expect(sprite.frames).toEqual([['X']]);
      expect(sprite.color).toEqual({ r: 100, g: 150, b: 200 });
      expect(sprite.currentFrame).toBe(0);
      expect(sprite.frameTime).toBe(0);
      expect(sprite.frameDuration).toBe(100); // Default
      expect(sprite.scale).toBe(1);
      expect(sprite.active).toBe(true);
    });

    it('should create sprite with custom frame duration', () => {
      const sprite = SpriteManager.createSprite(
        0,
        0,
        [['A'], ['B']],
        { r: 255, g: 255, b: 255 },
        200 // Custom duration
      );

      expect(sprite.frameDuration).toBe(200);
    });
  });

  describe('integration', () => {
    it('should handle complete lifecycle', () => {
      // Create animated sprite moving right
      const frames = [['A'], ['B'], ['C']];
      const sprite = SpriteManager.createSprite(10, 10, frames, { r: 255, g: 0, b: 0 }, 100);
      sprite.velocity = { x: 10, y: 0 }; // Move right

      spriteManager.addSprite(sprite);

      // Update and render frame 1
      spriteManager.update(0.1, mockSize);
      spriteManager.render(mockBuffer, mockSize);

      expect(sprite.currentFrame).toBe(1);
      expect(sprite.position.x).toBeCloseTo(11, 0);
      expect(mockBuffer[10][11].char).toBe('B');

      // Update and render frame 2
      spriteManager.update(0.1, mockSize);
      spriteManager.render(mockBuffer, mockSize);

      expect(sprite.currentFrame).toBe(2);
      expect(sprite.position.x).toBeCloseTo(12, 0);

      // Deactivate sprite
      sprite.active = false;
      spriteManager.removeInactive();

      expect(spriteManager.getSpriteCount()).toBe(0);
    });
  });
});
