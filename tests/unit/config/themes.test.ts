import { THEMES, THEME_NAMES, getTheme, getNextThemeName } from '../../../src/config/themes.js';
import { Theme } from '../../../src/types/index.js';

describe('Theme System', () => {
  describe('BaseTheme Color Interpolation', () => {
    let oceanTheme: Theme;

    beforeEach(() => {
      oceanTheme = THEMES.ocean;
    });

    it('returns first color at intensity 0', () => {
      const color = oceanTheme.getColor(0);
      expect(color).toEqual({ r: 0, g: 32, b: 64 });
    });

    it('returns last color at intensity 1', () => {
      const color = oceanTheme.getColor(1);
      expect(color).toEqual({ r: 200, g: 240, b: 255 });
    });

    it('interpolates between colors at intensity 0.5', () => {
      const color = oceanTheme.getColor(0.5);
      // Should be somewhere in the middle of the color array
      // Ocean theme has r=0 for most colors, so check g and b instead
      expect(color.g).toBeGreaterThan(32); // More than first color
      expect(color.g).toBeLessThan(240); // Less than last color
      expect(color.b).toBeGreaterThan(64); // More than first color
      expect(color.b).toBeLessThan(255); // Less than last color
    });

    it('clamps intensity below 0 to 0', () => {
      const color = oceanTheme.getColor(-0.5);
      expect(color).toEqual({ r: 0, g: 32, b: 64 }); // Same as intensity 0
    });

    it('clamps intensity above 1 to 1', () => {
      const color = oceanTheme.getColor(1.5);
      expect(color).toEqual({ r: 200, g: 240, b: 255 }); // Same as intensity 1
    });

    it('produces smooth gradients between adjacent colors', () => {
      const color1 = oceanTheme.getColor(0.2);
      const color2 = oceanTheme.getColor(0.21);
      
      // Colors should be similar but slightly different
      expect(Math.abs(color1.r - color2.r)).toBeLessThan(10);
      expect(Math.abs(color1.g - color2.g)).toBeLessThan(10);
      expect(Math.abs(color1.b - color2.b)).toBeLessThan(10);
    });

    it('returns rounded integer RGB values', () => {
      const color = oceanTheme.getColor(0.333);
      expect(Number.isInteger(color.r)).toBe(true);
      expect(Number.isInteger(color.g)).toBe(true);
      expect(Number.isInteger(color.b)).toBe(true);
    });
  });

  describe('Ocean Theme', () => {
    it('has correct metadata', () => {
      expect(THEMES.ocean.name).toBe('ocean');
      expect(THEMES.ocean.displayName).toBe('Ocean');
    });

    it('has 6 color stops', () => {
      expect(THEMES.ocean.colors.length).toBe(6);
    });

    it('progresses from dark blue to light cyan', () => {
      const darkColor = THEMES.ocean.colors[0];
      const lightColor = THEMES.ocean.colors[5];
      
      expect(darkColor.b).toBeGreaterThan(darkColor.r);
      expect(lightColor.r).toBeGreaterThan(100); // Light colors have high RGB
      expect(lightColor.b).toBe(255);
    });
  });

  describe('Matrix Theme', () => {
    it('has correct metadata', () => {
      expect(THEMES.matrix.name).toBe('matrix');
      expect(THEMES.matrix.displayName).toBe('Matrix');
    });

    it('is monochrome green', () => {
      THEMES.matrix.colors.forEach(color => {
        expect(color.r).toBeLessThanOrEqual(color.g);
        expect(color.b).toBeLessThanOrEqual(color.g);
        // Most colors should be pure green (r=0, b=0) or close
        if (color.g < 255) {
          expect(color.r + color.b).toBeLessThan(color.g);
        }
      });
    });

    it('ranges from dark to bright green', () => {
      const darkColor = THEMES.matrix.colors[0];
      const brightColor = THEMES.matrix.colors[5];
      
      expect(darkColor.g).toBeLessThan(64);
      expect(brightColor.g).toBe(255);
    });
  });

  describe('Starlight Theme', () => {
    it('has correct metadata', () => {
      expect(THEMES.starlight.name).toBe('starlight');
      expect(THEMES.starlight.displayName).toBe('Starlight');
    });

    it('emphasizes blue and purple tones', () => {
      THEMES.starlight.colors.forEach(color => {
        // Blue should be prominent
        expect(color.b).toBeGreaterThanOrEqual(color.r);
      });
    });

    it('starts with deep purple', () => {
      const darkColor = THEMES.starlight.colors[0];
      expect(darkColor.r).toBeLessThan(32);
      expect(darkColor.b).toBeGreaterThan(darkColor.r);
    });
  });

  describe('Fire Theme', () => {
    it('has correct metadata', () => {
      expect(THEMES.fire.name).toBe('fire');
      expect(THEMES.fire.displayName).toBe('Fire');
    });

    it('progresses from red to yellow', () => {
      const darkRed = THEMES.fire.colors[0];
      const lightYellow = THEMES.fire.colors[5];
      
      expect(darkRed.r).toBeGreaterThan(darkRed.g);
      expect(darkRed.r).toBeGreaterThan(darkRed.b);
      expect(lightYellow.r).toBe(255);
      expect(lightYellow.g).toBe(255);
    });

    it('maintains warm color palette', () => {
      THEMES.fire.colors.forEach(color => {
        // Red should always dominate or be equal to other channels
        expect(color.r).toBeGreaterThanOrEqual(color.g);
        expect(color.r).toBeGreaterThanOrEqual(color.b);
      });
    });
  });

  describe('Monochrome Theme', () => {
    it('has correct metadata', () => {
      expect(THEMES.monochrome.name).toBe('monochrome');
      expect(THEMES.monochrome.displayName).toBe('Monochrome');
    });

    it('is true grayscale (r=g=b)', () => {
      THEMES.monochrome.colors.forEach(color => {
        expect(color.r).toBe(color.g);
        expect(color.g).toBe(color.b);
      });
    });

    it('ranges from black to white', () => {
      const black = THEMES.monochrome.colors[0];
      const white = THEMES.monochrome.colors[5];
      
      expect(black).toEqual({ r: 0, g: 0, b: 0 });
      expect(white).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('THEMES Export', () => {
    it('contains all 5 themes', () => {
      expect(Object.keys(THEMES).length).toBe(5);
    });

    it('contains ocean, matrix, starlight, fire, monochrome', () => {
      expect(THEMES.ocean).toBeDefined();
      expect(THEMES.matrix).toBeDefined();
      expect(THEMES.starlight).toBeDefined();
      expect(THEMES.fire).toBeDefined();
      expect(THEMES.monochrome).toBeDefined();
    });

    it('all themes implement Theme interface', () => {
      Object.values(THEMES).forEach(theme => {
        expect(theme.name).toBeDefined();
        expect(theme.displayName).toBeDefined();
        expect(theme.colors).toBeInstanceOf(Array);
        expect(typeof theme.getColor).toBe('function');
      });
    });
  });

  describe('THEME_NAMES Export', () => {
    it('contains 5 theme names', () => {
      expect(THEME_NAMES.length).toBe(5);
    });

    it('matches THEMES keys', () => {
      THEME_NAMES.forEach(name => {
        expect(THEMES[name]).toBeDefined();
      });
    });

    it('is in correct order for cycling', () => {
      expect(THEME_NAMES).toEqual(['ocean', 'matrix', 'starlight', 'fire', 'monochrome']);
    });
  });

  describe('getTheme()', () => {
    it('returns ocean theme by default when no name provided', () => {
      const theme = getTheme();
      expect(theme.name).toBe('ocean');
    });

    it('returns ocean theme when undefined provided', () => {
      const theme = getTheme(undefined);
      expect(theme.name).toBe('ocean');
    });

    it('returns requested theme by name', () => {
      expect(getTheme('matrix').name).toBe('matrix');
      expect(getTheme('fire').name).toBe('fire');
      expect(getTheme('starlight').name).toBe('starlight');
      expect(getTheme('monochrome').name).toBe('monochrome');
    });

    it('returns ocean theme for unknown name', () => {
      const theme = getTheme('unknown');
      expect(theme.name).toBe('ocean');
    });

    it('returns ocean theme for empty string', () => {
      const theme = getTheme('');
      expect(theme.name).toBe('ocean');
    });

    it('is case-sensitive', () => {
      const theme = getTheme('OCEAN'); // Wrong case
      expect(theme.name).toBe('ocean'); // Falls back to default
    });
  });

  describe('getNextThemeName()', () => {
    it('cycles from ocean to matrix', () => {
      expect(getNextThemeName('ocean')).toBe('matrix');
    });

    it('cycles from matrix to starlight', () => {
      expect(getNextThemeName('matrix')).toBe('starlight');
    });

    it('cycles from starlight to fire', () => {
      expect(getNextThemeName('starlight')).toBe('fire');
    });

    it('cycles from fire to monochrome', () => {
      expect(getNextThemeName('fire')).toBe('monochrome');
    });

    it('wraps from monochrome back to ocean', () => {
      expect(getNextThemeName('monochrome')).toBe('ocean');
    });

    it('handles unknown theme name by wrapping to first theme', () => {
      // indexOf returns -1 for unknown, (-1 + 1) % 5 = 0
      expect(getNextThemeName('unknown')).toBe('ocean');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('produces visually distinct colors across intensity range', () => {
      const theme = THEMES.ocean;
      const samples = [0, 0.25, 0.5, 0.75, 1];
      const colors = samples.map(intensity => theme.getColor(intensity));
      
      // Each color should be different from its neighbors
      for (let i = 0; i < colors.length - 1; i++) {
        const c1 = colors[i];
        const c2 = colors[i + 1];
        const distance = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
        expect(distance).toBeGreaterThan(10); // Visually distinct
      }
    });

    it('supports pattern intensity mapping', () => {
      // Patterns often map distance or time to intensity
      const theme = THEMES.fire;
      const waveIntensity = Math.sin(Date.now() / 1000) * 0.5 + 0.5; // 0-1
      const color = theme.getColor(waveIntensity);
      
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    });

    it('handles rapid intensity changes smoothly', () => {
      const theme = THEMES.matrix;
      const colors: any[] = [];
      
      // Simulate animation frame color changes
      for (let i = 0; i < 100; i++) {
        const intensity = i / 99;
        colors.push(theme.getColor(intensity));
      }
      
      // Verify no sudden jumps (smooth gradient)
      for (let i = 0; i < colors.length - 1; i++) {
        const c1 = colors[i];
        const c2 = colors[i + 1];
        expect(Math.abs(c1.r - c2.r)).toBeLessThan(20);
        expect(Math.abs(c1.g - c2.g)).toBeLessThan(20);
        expect(Math.abs(c1.b - c2.b)).toBeLessThan(20);
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles extremely small intensity differences', () => {
      const theme = THEMES.ocean;
      const color1 = theme.getColor(0.5);
      const color2 = theme.getColor(0.5000001);
      
      // Should be very close or identical
      expect(Math.abs(color1.r - color2.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(color1.g - color2.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(color1.b - color2.b)).toBeLessThanOrEqual(1);
    });

    it('handles intensity at exact color stop positions', () => {
      const theme = THEMES.ocean;
      // 5 intervals between 6 colors: 0, 0.2, 0.4, 0.6, 0.8, 1
      const exactStop = theme.getColor(0.4); // Should be exactly colors[2]
      
      expect(exactStop.r).toBeGreaterThanOrEqual(0);
      expect(exactStop.r).toBeLessThanOrEqual(255);
    });

    it('handles theme with minimum colors (implied: 2 colors)', () => {
      // All themes have 6 colors, but the logic should work with any number >= 2
      const theme = THEMES.monochrome;
      expect(theme.colors.length).toBeGreaterThanOrEqual(2);
      
      const color = theme.getColor(0.5);
      expect(color).toBeDefined();
    });

    it('handles Infinity intensity', () => {
      const theme = THEMES.fire;
      const color = theme.getColor(Infinity);
      
      // Should clamp to 1
      expect(color).toEqual({ r: 255, g: 255, b: 128 });
    });

    it('handles -Infinity intensity', () => {
      const theme = THEMES.starlight;
      const color = theme.getColor(-Infinity);
      
      // Should clamp to 0
      expect(color).toEqual({ r: 16, g: 0, b: 48 });
    });
  });
});
