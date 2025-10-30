import { ConfigSchema, CliOptions } from '../types';
/**
 * ConfigLoader manages loading and merging configuration from multiple sources.
 * Priority order: CLI arguments > config file (~/.splashrc) > defaults
 */
export declare class ConfigLoader {
    private store;
    constructor();
    /**
     * Load and merge configuration from all sources.
     * @param cliOptions - Command-line arguments (highest priority)
     * @returns Merged configuration
     */
    load(cliOptions?: CliOptions): ConfigSchema;
    /**
     * Load configuration from file (~/.splashrc)
     */
    private loadFromFile;
    /**
     * Save current configuration to file
     */
    save(config: ConfigSchema): void;
    /**
     * Get the path to the config file
     */
    getConfigPath(): string;
    /**
     * Reset configuration to defaults
     */
    reset(): void;
    /**
     * Deep merge two objects (modifies target)
     */
    private deepMerge;
    /**
     * Get FPS value based on quality preset or explicit fps setting
     */
    static getFpsFromConfig(config: ConfigSchema): number;
    /**
     * Get a favorite from the config file
     */
    getFavorite(slot: number): any;
    /**
     * Save a favorite to the config file
     */
    saveFavorite(slot: number, favorite: any): void;
    /**
     * Get all favorites
     */
    getAllFavorites(): Record<number, any>;
    /**
     * Delete a favorite
     */
    deleteFavorite(slot: number): void;
}
//# sourceMappingURL=ConfigLoader.d.ts.map