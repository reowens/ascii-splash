"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const conf_1 = __importDefault(require("conf"));
const defaults_1 = require("./defaults");
/**
 * ConfigLoader manages loading and merging configuration from multiple sources.
 * Priority order: CLI arguments > config file (~/.splashrc) > defaults
 */
class ConfigLoader {
    constructor() {
        // Initialize conf with project name and defaults
        this.store = new conf_1.default({
            projectName: 'ascii-splash',
            defaults: defaults_1.defaultConfig,
            // Use .splashrc as config file name
            configName: '.splashrc',
        });
    }
    /**
     * Load and merge configuration from all sources.
     * @param cliOptions - Command-line arguments (highest priority)
     * @returns Merged configuration
     */
    load(cliOptions = {}) {
        // Start with defaults
        const config = { ...defaults_1.defaultConfig };
        // Merge with config file (if it exists)
        const fileConfig = this.loadFromFile();
        this.deepMerge(config, fileConfig);
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
    loadFromFile() {
        try {
            // Get all config values from the store
            const fileConfig = {};
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
        }
        catch (error) {
            // If config file doesn't exist or has errors, return empty config
            console.warn('Warning: Could not load config file, using defaults');
            return {};
        }
    }
    /**
     * Save current configuration to file
     */
    save(config) {
        try {
            this.store.set(config);
        }
        catch (error) {
            console.error('Error saving config:', error);
        }
    }
    /**
     * Get the path to the config file
     */
    getConfigPath() {
        return this.store.path;
    }
    /**
     * Reset configuration to defaults
     */
    reset() {
        this.store.clear();
    }
    /**
     * Deep merge two objects (modifies target)
     */
    deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // Recursively merge objects
                    if (!target[key]) {
                        target[key] = {};
                    }
                    this.deepMerge(target[key], source[key]);
                }
                else {
                    // Override primitives and arrays
                    target[key] = source[key];
                }
            }
        }
    }
    /**
     * Get FPS value based on quality preset or explicit fps setting
     */
    static getFpsFromConfig(config) {
        // Explicit fps takes priority
        if (config.fps !== undefined) {
            return config.fps;
        }
        // Otherwise use quality preset
        const quality = config.quality || 'medium';
        return defaults_1.qualityPresets[quality];
    }
    /**
     * Get a favorite from the config file
     */
    getFavorite(slot) {
        const favorites = this.store.get('favorites') || {};
        return favorites[slot];
    }
    /**
     * Save a favorite to the config file
     */
    saveFavorite(slot, favorite) {
        const favorites = this.store.get('favorites') || {};
        favorites[slot] = favorite;
        this.store.set('favorites', favorites);
    }
    /**
     * Get all favorites
     */
    getAllFavorites() {
        return this.store.get('favorites') || {};
    }
    /**
     * Delete a favorite
     */
    deleteFavorite(slot) {
        const favorites = this.store.get('favorites') || {};
        delete favorites[slot];
        this.store.set('favorites', favorites);
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=ConfigLoader.js.map