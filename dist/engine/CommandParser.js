"use strict";
/**
 * CommandParser - Parses command strings into structured commands
 *
 * Supported formats:
 * - 0[digits]         → Preset number (e.g., 01, 012, 0123)
 * - 0f[digits]        → Load favorite
 * - 0F[digits]        → Save favorite
 * - 0p[id]            → Pattern jump (e.g., 0p3, 0pwaves)
 * - 0p[id].[preset]   → Pattern + preset (e.g., 0p3.5)
 * - 0t[id]            → Theme switch (e.g., 0t2, 0tfire)
 * - 0[symbol]         → Special commands (*, ?, r, s, x, !, /, \, etc.)
 * - Combinations with + → Multiple commands (e.g., 0p3+05+t2)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandParser = void 0;
class CommandParser {
    /**
     * Parse a command string into a structured command object
     */
    parse(commandString) {
        // Trim and validate
        const cmd = commandString.trim();
        if (!cmd || cmd === '0') {
            return null; // Empty command
        }
        // Remove leading '0' if present
        const cleanCmd = cmd.startsWith('0') ? cmd.slice(1) : cmd;
        // Check for combination (contains +)
        if (cleanCmd.includes('+')) {
            return this.parseCombination(cleanCmd, cmd);
        }
        // Parse single command
        return this.parseSingle(cleanCmd, cmd);
    }
    /**
     * Parse a combination command (e.g., "p3+05+t2")
     */
    parseCombination(cleanCmd, originalCmd) {
        const parts = cleanCmd.split('+').map(p => p.trim());
        const commands = [];
        for (const part of parts) {
            const parsed = this.parseSingle(part, '0' + part);
            if (parsed) {
                commands.push(parsed);
            }
        }
        if (commands.length === 0) {
            return null;
        }
        return {
            type: 'combination',
            args: { commands },
            raw: originalCmd
        };
    }
    /**
     * Parse a single command (not a combination)
     */
    parseSingle(cleanCmd, originalCmd) {
        // Pattern presets: pure digits (e.g., "1", "12", "123")
        if (/^\d+$/.test(cleanCmd)) {
            return {
                type: 'preset',
                args: { presetNumber: parseInt(cleanCmd, 10) },
                raw: originalCmd
            };
        }
        // Load favorite: f[number] (e.g., "f1", "f12")
        if (/^f\d+$/.test(cleanCmd)) {
            return {
                type: 'favorite',
                args: { favoriteSlot: parseInt(cleanCmd.slice(1), 10) },
                raw: originalCmd
            };
        }
        // Save favorite: F[number] (e.g., "F1", "F12")
        if (/^F\d+$/.test(cleanCmd)) {
            return {
                type: 'saveFavorite',
                args: { favoriteSlot: parseInt(cleanCmd.slice(1), 10) },
                raw: originalCmd
            };
        }
        // Favorite list: fl
        if (cleanCmd === 'fl') {
            return {
                type: 'special',
                args: { specialCmd: 'favoriteList' },
                raw: originalCmd
            };
        }
        // Pattern jump: p[number|name] or p[number].[preset]
        if (cleanCmd.startsWith('p')) {
            return this.parsePatternCommand(cleanCmd.slice(1), originalCmd);
        }
        // Theme: t[number|name] or just t
        if (cleanCmd.startsWith('t')) {
            return this.parseThemeCommand(cleanCmd.slice(1), originalCmd);
        }
        // Special commands
        return this.parseSpecialCommand(cleanCmd, originalCmd);
    }
    /**
     * Parse pattern command (e.g., "3", "waves", "3.5")
     */
    parsePatternCommand(rest, originalCmd) {
        if (!rest) {
            // Just "0p" - show pattern list?
            return {
                type: 'special',
                args: { specialCmd: 'patternList' },
                raw: originalCmd
            };
        }
        // Check for preset notation: p[id].[preset]
        const dotIndex = rest.indexOf('.');
        if (dotIndex > 0) {
            const patternPart = rest.slice(0, dotIndex);
            const presetPart = rest.slice(dotIndex + 1);
            const patternId = /^\d+$/.test(patternPart)
                ? parseInt(patternPart, 10)
                : patternPart;
            const presetNumber = /^\d+$/.test(presetPart)
                ? parseInt(presetPart, 10)
                : undefined;
            return {
                type: 'pattern',
                args: { patternId, patternPreset: presetNumber },
                raw: originalCmd
            };
        }
        // Just pattern, no preset
        const patternId = /^\d+$/.test(rest)
            ? parseInt(rest, 10)
            : rest;
        return {
            type: 'pattern',
            args: { patternId },
            raw: originalCmd
        };
    }
    /**
     * Parse theme command (e.g., "2", "fire", "r" for random)
     */
    parseThemeCommand(rest, originalCmd) {
        if (!rest) {
            // Just "0t" - show theme picker
            return {
                type: 'special',
                args: { specialCmd: 'themePicker' },
                raw: originalCmd
            };
        }
        // Random theme
        if (rest === 'r') {
            return {
                type: 'special',
                args: { specialCmd: 'randomTheme' },
                raw: originalCmd
            };
        }
        // Numeric or named theme
        const themeId = /^\d+$/.test(rest)
            ? parseInt(rest, 10)
            : rest;
        return {
            type: 'theme',
            args: { themeId },
            raw: originalCmd
        };
    }
    /**
     * Parse special commands (*, ?, r, s, x, !, /, \, etc.)
     */
    parseSpecialCommand(cleanCmd, originalCmd) {
        // Map of special command patterns
        const specialCommands = {
            '*': 'randomPreset',
            '**': 'randomAll',
            '?': 'listPresets',
            '??': 'catalogPresets',
            'r': 'randomize',
            's': 'save',
            'x': 'reset',
            '!': 'shuffle',
            '!!': 'shuffleAll',
            '/': 'search',
            '\\': 'undo',
            '.': 'repeat',
            'h': 'history'
        };
        // Check for exact matches
        if (specialCommands[cleanCmd]) {
            return {
                type: 'special',
                args: { specialCmd: specialCommands[cleanCmd] },
                raw: originalCmd
            };
        }
        // Check for commands with arguments
        // Shuffle with interval: !5, !30, !r
        if (cleanCmd.startsWith('!') && cleanCmd.length > 1) {
            const arg = cleanCmd.slice(1);
            return {
                type: 'special',
                args: {
                    specialCmd: 'shuffle',
                    specialArg: arg
                },
                raw: originalCmd
            };
        }
        // Search with term: /waves, /storm
        if (cleanCmd.startsWith('/') && cleanCmd.length > 1) {
            return {
                type: 'special',
                args: {
                    specialCmd: 'search',
                    specialArg: cleanCmd.slice(1)
                },
                raw: originalCmd
            };
        }
        // Unknown command
        return null;
    }
}
exports.CommandParser = CommandParser;
//# sourceMappingURL=CommandParser.js.map