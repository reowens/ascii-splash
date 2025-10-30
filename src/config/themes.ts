import { Theme, Color } from '../types';

/**
 * Base theme class with color interpolation logic
 */
class BaseTheme implements Theme {
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly colors: Color[]
  ) {}

  getColor(intensity: number): Color {
    // Clamp intensity to 0-1 range
    const t = Math.max(0, Math.min(1, intensity));
    
    // Map intensity to color array index
    const index = t * (this.colors.length - 1);
    const i1 = Math.floor(index);
    const i2 = Math.min(i1 + 1, this.colors.length - 1);
    const blend = index - i1;
    
    // Linear interpolation between two colors
    const c1 = this.colors[i1];
    const c2 = this.colors[i2];
    
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * blend),
      g: Math.round(c1.g + (c2.g - c1.g) * blend),
      b: Math.round(c1.b + (c2.b - c1.b) * blend)
    };
  }
}

/**
 * Ocean theme - Blues, cyans, teals, white (default)
 */
const oceanTheme = new BaseTheme(
  'ocean',
  'Ocean',
  [
    { r: 0, g: 32, b: 64 },      // Deep blue
    { r: 0, g: 64, b: 128 },     // Dark blue
    { r: 0, g: 128, b: 192 },    // Medium blue
    { r: 0, g: 192, b: 255 },    // Cyan
    { r: 128, g: 224, b: 255 },  // Light cyan
    { r: 200, g: 240, b: 255 }   // Very light blue
  ]
);

/**
 * Matrix theme - Green monochrome variations
 */
const matrixTheme = new BaseTheme(
  'matrix',
  'Matrix',
  [
    { r: 0, g: 32, b: 0 },       // Very dark green
    { r: 0, g: 64, b: 0 },       // Dark green
    { r: 0, g: 128, b: 0 },      // Medium green
    { r: 0, g: 192, b: 0 },      // Bright green
    { r: 64, g: 255, b: 64 },    // Lime green
    { r: 200, g: 255, b: 200 }   // Very light green
  ]
);

/**
 * Starlight theme - Deep blues, purples, white
 */
const starlightTheme = new BaseTheme(
  'starlight',
  'Starlight',
  [
    { r: 16, g: 0, b: 48 },      // Deep purple
    { r: 48, g: 0, b: 96 },      // Dark purple
    { r: 64, g: 32, b: 128 },    // Purple
    { r: 96, g: 64, b: 192 },    // Violet
    { r: 128, g: 128, b: 255 },  // Light blue-purple
    { r: 200, g: 200, b: 255 }   // Very light purple
  ]
);

/**
 * Fire theme - Reds, oranges, yellows, white
 */
const fireTheme = new BaseTheme(
  'fire',
  'Fire',
  [
    { r: 64, g: 0, b: 0 },       // Dark red
    { r: 128, g: 0, b: 0 },      // Red
    { r: 192, g: 32, b: 0 },     // Red-orange
    { r: 255, g: 96, b: 0 },     // Orange
    { r: 255, g: 192, b: 0 },    // Yellow-orange
    { r: 255, g: 255, b: 128 }   // Light yellow
  ]
);

/**
 * Monochrome theme - Grays, white
 */
const monochromeTheme = new BaseTheme(
  'monochrome',
  'Monochrome',
  [
    { r: 0, g: 0, b: 0 },        // Black
    { r: 64, g: 64, b: 64 },     // Dark gray
    { r: 128, g: 128, b: 128 },  // Medium gray
    { r: 192, g: 192, b: 192 },  // Light gray
    { r: 224, g: 224, b: 224 },  // Very light gray
    { r: 255, g: 255, b: 255 }   // White
  ]
);

/**
 * All available themes
 */
export const THEMES: Record<string, Theme> = {
  ocean: oceanTheme,
  matrix: matrixTheme,
  starlight: starlightTheme,
  fire: fireTheme,
  monochrome: monochromeTheme
};

/**
 * Theme names in order for cycling
 */
export const THEME_NAMES = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'];

/**
 * Get a theme by name, fallback to ocean if not found
 */
export function getTheme(name?: string): Theme {
  if (!name || !THEMES[name]) {
    return THEMES.ocean;
  }
  return THEMES[name];
}

/**
 * Get the next theme name in the cycle
 */
export function getNextThemeName(currentName: string): string {
  const currentIndex = THEME_NAMES.indexOf(currentName);
  const nextIndex = (currentIndex + 1) % THEME_NAMES.length;
  return THEME_NAMES[nextIndex];
}
