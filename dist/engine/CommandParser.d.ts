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
export type CommandType = 'preset' | 'favorite' | 'saveFavorite' | 'pattern' | 'theme' | 'special' | 'combination';
export interface ParsedCommand {
    type: CommandType;
    args: {
        presetNumber?: number;
        favoriteSlot?: number;
        patternId?: string | number;
        patternPreset?: number;
        themeId?: string | number;
        specialCmd?: string;
        specialArg?: string;
        commands?: ParsedCommand[];
    };
    raw: string;
}
export declare class CommandParser {
    /**
     * Parse a command string into a structured command object
     */
    parse(commandString: string): ParsedCommand | null;
    /**
     * Parse a combination command (e.g., "p3+05+t2")
     */
    private parseCombination;
    /**
     * Parse a single command (not a combination)
     */
    private parseSingle;
    /**
     * Parse pattern command (e.g., "3", "waves", "3.5")
     */
    private parsePatternCommand;
    /**
     * Parse theme command (e.g., "2", "fire", "r" for random)
     */
    private parseThemeCommand;
    /**
     * Parse special commands (*, ?, r, s, x, !, /, \, etc.)
     */
    private parseSpecialCommand;
}
//# sourceMappingURL=CommandParser.d.ts.map