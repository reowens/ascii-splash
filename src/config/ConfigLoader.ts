import Conf from 'conf';
import { ConfigSchema, CliOptions, FavoriteSlot } from '../types/index.js';
import { defaultConfig, qualityPresets } from './defaults.js';

/**
 * Recursive deep-merge type. Used to keep `deepMerge` typed without `any`.
 * Both target and source must be plain objects keyed by `string`.
 */
type DeepMergeable = Record<string, unknown>;

/**
 * ConfigLoader manages loading and merging configuration from multiple sources.
 * Priority order: CLI arguments > config file (~/.splashrc) > defaults
 */
export class ConfigLoader {
  private store: Conf<ConfigSchema>;

  constructor() {
    // Initialize conf with project name and defaults
    this.store = new Conf<ConfigSchema>({
      projectName: 'ascii-splash',
      defaults: defaultConfig,
      // Use .splashrc as config file name
      configName: '.splashrc',
    });
  }

  /**
   * Load and merge configuration from all sources.
   * @param cliOptions - Command-line arguments (highest priority)
   * @returns Merged configuration
   */
  load(cliOptions: CliOptions = {}): ConfigSchema {
    // Start with defaults
    const config: ConfigSchema = { ...defaultConfig };

    // Merge with config file (if it exists)
    const fileConfig = this.loadFromFile();
    this.deepMerge(config as DeepMergeable, fileConfig as DeepMergeable);

    // Override with CLI options (highest priority)
    if (cliOptions.pattern !== undefined) {
      config.defaultPattern = cliOptions.pattern;
    }
    if (cliOptions.quality !== undefined) {
      config.quality = cliOptions.quality;
    }
    if (cliOptions.fps !== undefined) {
      config.fps = cliOptions.fps;
    }
    if (cliOptions.theme !== undefined) {
      config.theme = cliOptions.theme;
    }
    if (cliOptions.mouse !== undefined) {
      config.mouseEnabled = cliOptions.mouse;
    }

    return config;
  }

  /**
   * Load configuration from file (~/.splashrc)
   */
  private loadFromFile(): Partial<ConfigSchema> {
    try {
      // Get all config values from the store
      const fileConfig: Partial<ConfigSchema> = {};

      // Load global settings
      if (this.store.has('defaultPattern')) {
        fileConfig.defaultPattern = this.store.get('defaultPattern');
      }
      if (this.store.has('quality')) {
        fileConfig.quality = this.store.get('quality');
      }
      if (this.store.has('fps')) {
        fileConfig.fps = this.store.get('fps');
      }
      if (this.store.has('theme')) {
        fileConfig.theme = this.store.get('theme');
      }
      if (this.store.has('mouseEnabled')) {
        fileConfig.mouseEnabled = this.store.get('mouseEnabled');
      }

      // Load pattern configurations
      if (this.store.has('patterns')) {
        fileConfig.patterns = this.store.get('patterns');
      }

      // Load favorites
      if (this.store.has('favorites')) {
        fileConfig.favorites = this.store.get('favorites');
      }

      return fileConfig;
    } catch {
      // If config file doesn't exist or has errors, return empty config
      console.warn('Warning: Could not load config file, using defaults');
      return {};
    }
  }

  /**
   * Save current configuration to file
   */
  save(config: ConfigSchema): void {
    try {
      this.store.set(config);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Get the path to the config file
   */
  getConfigPath(): string {
    return this.store.path;
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.store.clear();
  }

  /**
   * Deep merge `source` into `target` (modifies target).
   * Recurses into plain object values; primitives and arrays overwrite.
   */
  private deepMerge(target: DeepMergeable, source: DeepMergeable): void {
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      if (sourceVal !== null && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
        // Recursively merge nested objects.
        const existing = target[key];
        const nested: DeepMergeable =
          existing !== null && typeof existing === 'object' && !Array.isArray(existing)
            ? (existing as DeepMergeable)
            : {};
        target[key] = nested;
        this.deepMerge(nested, sourceVal as DeepMergeable);
      } else {
        // Primitives, null, and arrays overwrite directly.
        target[key] = sourceVal;
      }
    }
  }

  /**
   * Get FPS value based on quality preset or explicit fps setting
   */
  static getFpsFromConfig(config: ConfigSchema): number {
    // Explicit fps takes priority
    if (config.fps !== undefined) {
      return config.fps;
    }
    // Otherwise use quality preset
    const quality = config.quality || 'medium';
    return qualityPresets[quality];
  }

  /**
   * Get a favorite from the config file
   */
  getFavorite(slot: number): FavoriteSlot | undefined {
    const favorites = this.store.get('favorites') ?? {};
    return favorites[slot];
  }

  /**
   * Save a favorite to the config file
   */
  saveFavorite(slot: number, favorite: FavoriteSlot): void {
    const favorites = this.store.get('favorites') ?? {};
    favorites[slot] = favorite;
    this.store.set('favorites', favorites);
  }

  /**
   * Get all favorites
   */
  getAllFavorites(): Record<number, FavoriteSlot> {
    return this.store.get('favorites') ?? {};
  }

  /**
   * Delete a favorite
   */
  deleteFavorite(slot: number): void {
    const favorites: Record<number, FavoriteSlot> = this.store.get('favorites') ?? {};
    const next: Record<number, FavoriteSlot> = {};
    for (const key of Object.keys(favorites)) {
      const k = Number(key);
      if (k !== slot) next[k] = favorites[k];
    }
    this.store.set('favorites', next);
  }
}
