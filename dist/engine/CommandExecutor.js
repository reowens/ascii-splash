"use strict";
/**
 * CommandExecutor - Executes parsed commands
 *
 * Interfaces with patterns, engine, themes, and config to apply commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandExecutor = void 0;
class CommandExecutor {
    constructor(engine, patterns, themes, currentPatternIndex, currentThemeIndex, configLoader) {
        this.engine = engine;
        this.patterns = patterns;
        this.themes = themes;
        this.currentPatternIndex = currentPatternIndex;
        this.currentThemeIndex = currentThemeIndex;
        this.configLoader = configLoader;
    }
    /**
     * Update current state (called after external changes)
     */
    updateState(patternIndex, themeIndex) {
        this.currentPatternIndex = patternIndex;
        this.currentThemeIndex = themeIndex;
    }
    /**
     * Set theme change callback
     */
    setThemeChangeCallback(callback) {
        this.onThemeChange = callback;
    }
    /**
     * Execute a parsed command
     */
    execute(command) {
        switch (command.type) {
            case 'preset':
                return this.executePreset(command);
            case 'favorite':
                return this.executeFavorite(command);
            case 'saveFavorite':
                return this.executeSaveFavorite(command);
            case 'pattern':
                return this.executePattern(command);
            case 'theme':
                return this.executeTheme(command);
            case 'special':
                return this.executeSpecial(command);
            case 'combination':
                return this.executeCombination(command);
            default:
                return { success: false, message: 'Unknown command type' };
        }
    }
    /**
     * Execute preset command (e.g., 01, 012)
     * Applies preset to currently active pattern
     */
    executePreset(command) {
        const { presetNumber } = command.args;
        if (presetNumber === undefined) {
            return { success: false, message: 'Invalid preset number' };
        }
        const currentPattern = this.patterns[this.currentPatternIndex];
        // Check if pattern supports presets
        if (!currentPattern.applyPreset) {
            return {
                success: false,
                message: `Pattern ${currentPattern.name} doesn't support presets yet`
            };
        }
        // Apply the preset
        const success = currentPattern.applyPreset(presetNumber);
        if (success) {
            return {
                success: true,
                message: `Applied preset ${presetNumber} to ${currentPattern.name}`
            };
        }
        else {
            return {
                success: false,
                message: `Preset ${presetNumber} not found for ${currentPattern.name}`
            };
        }
    }
    /**
     * Execute favorite load command (e.g., 0f1)
     */
    executeFavorite(command) {
        const { favoriteSlot } = command.args;
        if (favoriteSlot === undefined) {
            return { success: false, message: 'Invalid favorite slot' };
        }
        if (!this.configLoader) {
            return { success: false, message: 'Config loader not available' };
        }
        // Load favorite from config
        const favorite = this.configLoader.getFavorite(favoriteSlot);
        if (!favorite) {
            return {
                success: false,
                message: `Favorite slot ${favoriteSlot} is empty`
            };
        }
        // Find pattern by name
        const patternIndex = this.patterns.findIndex(p => p.constructor.name === favorite.pattern);
        if (patternIndex === -1) {
            return {
                success: false,
                message: `Pattern "${favorite.pattern}" not found`
            };
        }
        // Find theme by name
        const themeIndex = this.themes.findIndex(t => t.name === favorite.theme);
        if (themeIndex === -1) {
            return {
                success: false,
                message: `Theme "${favorite.theme}" not found`
            };
        }
        // Apply theme first (if different)
        if (themeIndex !== this.currentThemeIndex) {
            this.currentThemeIndex = themeIndex;
            if (this.onThemeChange) {
                this.onThemeChange(themeIndex);
            }
        }
        // Switch to pattern
        this.engine.setPattern(this.patterns[patternIndex]);
        this.currentPatternIndex = patternIndex;
        const targetPattern = this.patterns[patternIndex];
        let message = `Loaded favorite ${favoriteSlot}: ${targetPattern.constructor.name}`;
        // Apply preset if specified
        if (favorite.preset !== undefined && targetPattern.applyPreset) {
            const presetSuccess = targetPattern.applyPreset(favorite.preset);
            if (presetSuccess) {
                message += ` + preset ${favorite.preset}`;
            }
        }
        // Add theme info
        message += ` + ${this.themes[themeIndex].displayName}`;
        // Add note if present
        if (favorite.note) {
            message += ` (${favorite.note})`;
        }
        return { success: true, message };
    }
    /**
     * Execute favorite save command (e.g., 0F1)
     */
    executeSaveFavorite(command) {
        const { favoriteSlot } = command.args;
        if (favoriteSlot === undefined) {
            return { success: false, message: 'Invalid favorite slot' };
        }
        if (!this.configLoader) {
            return { success: false, message: 'Config loader not available' };
        }
        // Get current state
        const currentPattern = this.patterns[this.currentPatternIndex];
        const currentTheme = this.themes[this.currentThemeIndex];
        // Create favorite object
        const favorite = {
            pattern: currentPattern.constructor.name,
            theme: currentTheme.name,
            savedAt: new Date().toISOString()
        };
        // Try to get current preset if pattern supports it
        // Note: We don't have getCurrentPreset() method, so we'll just save without preset for now
        // User can still save pattern+preset combos using 0p#.#+0F# combination
        // Save to config
        this.configLoader.saveFavorite(favoriteSlot, favorite);
        return {
            success: true,
            message: `Saved to favorite ${favoriteSlot}: ${currentPattern.constructor.name} + ${currentTheme.displayName}`
        };
    }
    /**
     * Execute pattern switch command (e.g., 0p3, 0pwaves, 0p3.5)
     */
    executePattern(command) {
        const { patternId, patternPreset } = command.args;
        if (patternId === undefined) {
            return { success: false, message: 'Invalid pattern ID' };
        }
        // Find pattern by number or name
        let targetIndex = -1;
        if (typeof patternId === 'number') {
            // 1-based index (0p1 = first pattern)
            targetIndex = patternId - 1;
        }
        else {
            // Find by name (case-insensitive partial match)
            const searchTerm = patternId.toLowerCase();
            targetIndex = this.patterns.findIndex(p => p.constructor.name.toLowerCase().includes(searchTerm));
        }
        if (targetIndex < 0 || targetIndex >= this.patterns.length) {
            return {
                success: false,
                message: `Pattern "${patternId}" not found`
            };
        }
        // Switch to pattern
        this.engine.setPattern(this.patterns[targetIndex]);
        this.currentPatternIndex = targetIndex;
        const targetPattern = this.patterns[targetIndex];
        let message = `Switched to pattern ${targetIndex + 1}: ${targetPattern.constructor.name}`;
        // Apply preset if specified
        if (patternPreset !== undefined) {
            if (targetPattern.applyPreset) {
                const presetSuccess = targetPattern.applyPreset(patternPreset);
                if (presetSuccess) {
                    message += ` + preset ${patternPreset}`;
                }
                else {
                    message += ` (preset ${patternPreset} not found)`;
                }
            }
            else {
                message += ` (presets not supported)`;
            }
        }
        return { success: true, message };
    }
    /**
     * Execute theme switch command (e.g., 0t2, 0tfire)
     */
    executeTheme(command) {
        const { themeId } = command.args;
        if (themeId === undefined) {
            return { success: false, message: 'Invalid theme ID' };
        }
        // Find theme by number or name
        let targetIndex = -1;
        if (typeof themeId === 'number') {
            // 1-based index (0t1 = first theme)
            targetIndex = themeId - 1;
        }
        else {
            // Find by name (case-insensitive)
            const searchTerm = themeId.toLowerCase();
            targetIndex = this.themes.findIndex(t => t.name.toLowerCase() === searchTerm);
        }
        if (targetIndex < 0 || targetIndex >= this.themes.length) {
            return {
                success: false,
                message: `Theme "${themeId}" not found`
            };
        }
        // Trigger theme change
        this.currentThemeIndex = targetIndex;
        if (this.onThemeChange) {
            this.onThemeChange(targetIndex);
        }
        return {
            success: true,
            message: `Switched to theme: ${this.themes[targetIndex].displayName}`
        };
    }
    /**
     * Execute special commands (*, ?, r, s, x, !, etc.)
     */
    executeSpecial(command) {
        const { specialCmd, specialArg } = command.args;
        if (!specialCmd) {
            return { success: false, message: 'Invalid special command' };
        }
        switch (specialCmd) {
            case 'randomPreset':
                return { success: false, message: 'Random preset not implemented yet' };
            case 'randomAll':
                return { success: false, message: 'Random all not implemented yet' };
            case 'listPresets':
                return this.listPresets();
            case 'catalogPresets':
                return { success: false, message: 'Preset catalog not implemented yet' };
            case 'patternList':
                return this.listPatterns();
            case 'themePicker':
                return this.listThemes();
            case 'randomTheme':
                return this.randomTheme();
            case 'favoriteList':
                return this.listFavorites();
            case 'randomize':
                return this.randomize();
            case 'save':
                return { success: false, message: 'Save config not implemented yet' };
            case 'reset':
                return this.resetPattern();
            case 'shuffle':
                return { success: false, message: `Shuffle${specialArg ? ' ' + specialArg : ''} not implemented yet` };
            case 'shuffleAll':
                return { success: false, message: 'Shuffle all not implemented yet' };
            case 'search':
                return this.search(specialArg || '');
            case 'undo':
                return { success: false, message: 'Undo not implemented yet' };
            case 'repeat':
                return { success: false, message: 'Repeat not implemented yet' };
            case 'history':
                return { success: false, message: 'History not implemented yet' };
            default:
                return { success: false, message: `Unknown special command: ${specialCmd}` };
        }
    }
    /**
     * Execute combination command (e.g., 0p3+05+t2)
     */
    executeCombination(command) {
        const { commands } = command.args;
        if (!commands || commands.length === 0) {
            return { success: false, message: 'Empty combination' };
        }
        const messages = [];
        let allSucceeded = true;
        for (const subCmd of commands) {
            const result = this.execute(subCmd);
            if (result.success) {
                messages.push(result.message);
            }
            else {
                messages.push(`❌ ${result.message}`);
                allSucceeded = false;
            }
        }
        return {
            success: allSucceeded,
            message: messages.join(' | ')
        };
    }
    // Helper methods for special commands
    listPresets() {
        // TODO: Implement when preset system is ready
        return {
            success: true,
            message: 'Presets: Not yet implemented'
        };
    }
    listPatterns() {
        const patternNames = this.patterns.map((p, i) => `${i + 1}:${p.constructor.name.replace('Pattern', '')}`).join(', ');
        return {
            success: true,
            message: `Patterns: ${patternNames}`
        };
    }
    listThemes() {
        const themeNames = this.themes.map((t, i) => `${i + 1}:${t.displayName}`).join(', ');
        return {
            success: true,
            message: `Themes: ${themeNames}`
        };
    }
    randomTheme() {
        const randomIndex = Math.floor(Math.random() * this.themes.length);
        this.currentThemeIndex = randomIndex;
        if (this.onThemeChange) {
            this.onThemeChange(randomIndex);
        }
        return {
            success: true,
            message: `Random theme: ${this.themes[randomIndex].displayName}`
        };
    }
    randomize() {
        // Random pattern + random theme
        const randomPatternIndex = Math.floor(Math.random() * this.patterns.length);
        const randomThemeIndex = Math.floor(Math.random() * this.themes.length);
        this.engine.setPattern(this.patterns[randomPatternIndex]);
        this.currentPatternIndex = randomPatternIndex;
        this.currentThemeIndex = randomThemeIndex;
        if (this.onThemeChange) {
            this.onThemeChange(randomThemeIndex);
        }
        return {
            success: true,
            message: `Randomized: ${this.patterns[randomPatternIndex].constructor.name} + ${this.themes[randomThemeIndex].displayName}`
        };
    }
    resetPattern() {
        const currentPattern = this.patterns[this.currentPatternIndex];
        currentPattern.reset();
        return {
            success: true,
            message: `Reset: ${currentPattern.constructor.name}`
        };
    }
    search(term) {
        if (!term) {
            return { success: false, message: 'Search term required' };
        }
        const searchTerm = term.toLowerCase();
        const matches = [];
        // Search patterns
        this.patterns.forEach((p, i) => {
            if (p.constructor.name.toLowerCase().includes(searchTerm)) {
                matches.push(`P${i + 1}:${p.constructor.name.replace('Pattern', '')}`);
            }
        });
        // Search themes
        this.themes.forEach((t, i) => {
            if (t.name.toLowerCase().includes(searchTerm) ||
                t.displayName.toLowerCase().includes(searchTerm)) {
                matches.push(`T${i + 1}:${t.displayName}`);
            }
        });
        if (matches.length === 0) {
            return { success: false, message: `No matches for "${term}"` };
        }
        return {
            success: true,
            message: `Found: ${matches.join(', ')}`
        };
    }
    listFavorites() {
        if (!this.configLoader) {
            return { success: false, message: 'Config loader not available' };
        }
        const favorites = this.configLoader.getAllFavorites();
        const slots = Object.keys(favorites).sort((a, b) => Number(a) - Number(b));
        if (slots.length === 0) {
            return { success: true, message: 'No favorites saved yet. Use 0F# to save.' };
        }
        const lines = [];
        slots.forEach(slot => {
            const fav = favorites[Number(slot)];
            const patternName = fav.pattern.replace('Pattern', '');
            const presetInfo = fav.preset !== undefined ? `.${fav.preset}` : '';
            const noteInfo = fav.note ? ` "${fav.note}"` : '';
            lines.push(`${slot}:${patternName}${presetInfo}+${fav.theme}${noteInfo}`);
        });
        return {
            success: true,
            message: `Favorites: ${lines.join(' | ')}`
        };
    }
}
exports.CommandExecutor = CommandExecutor;
//# sourceMappingURL=CommandExecutor.js.map