/**
 * CommandExecutor - Executes parsed commands
 *
 * Interfaces with patterns, engine, themes, and config to apply commands
 */
import { ParsedCommand } from './CommandParser';
import { AnimationEngine } from './AnimationEngine';
import { Pattern, Theme } from '../types';
import { ConfigLoader } from '../config/ConfigLoader';
export interface ExecutionResult {
    success: boolean;
    message: string;
}
export declare class CommandExecutor {
    private engine;
    private patterns;
    private themes;
    private currentPatternIndex;
    private currentThemeIndex;
    private configLoader?;
    private onThemeChange?;
    constructor(engine: AnimationEngine, patterns: Pattern[], themes: Theme[], currentPatternIndex: number, currentThemeIndex: number, configLoader?: ConfigLoader);
    /**
     * Update current state (called after external changes)
     */
    updateState(patternIndex: number, themeIndex: number): void;
    /**
     * Set theme change callback
     */
    setThemeChangeCallback(callback: (themeIndex: number) => void): void;
    /**
     * Execute a parsed command
     */
    execute(command: ParsedCommand): ExecutionResult;
    /**
     * Execute preset command (e.g., 01, 012)
     * Applies preset to currently active pattern
     */
    private executePreset;
    /**
     * Execute favorite load command (e.g., 0f1)
     */
    private executeFavorite;
    /**
     * Execute favorite save command (e.g., 0F1)
     */
    private executeSaveFavorite;
    /**
     * Execute pattern switch command (e.g., 0p3, 0pwaves, 0p3.5)
     */
    private executePattern;
    /**
     * Execute theme switch command (e.g., 0t2, 0tfire)
     */
    private executeTheme;
    /**
     * Execute special commands (*, ?, r, s, x, !, etc.)
     */
    private executeSpecial;
    /**
     * Execute combination command (e.g., 0p3+05+t2)
     */
    private executeCombination;
    private listPresets;
    private listPatterns;
    private listThemes;
    private randomTheme;
    private randomize;
    private resetPattern;
    private search;
    private listFavorites;
}
//# sourceMappingURL=CommandExecutor.d.ts.map