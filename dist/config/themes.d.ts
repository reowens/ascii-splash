import { Theme } from '../types';
/**
 * All available themes
 */
export declare const THEMES: Record<string, Theme>;
/**
 * Theme names in order for cycling
 */
export declare const THEME_NAMES: string[];
/**
 * Get a theme by name, fallback to ocean if not found
 */
export declare function getTheme(name?: string): Theme;
/**
 * Get the next theme name in the cycle
 */
export declare function getNextThemeName(currentName: string): string;
//# sourceMappingURL=themes.d.ts.map