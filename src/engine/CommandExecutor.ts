/**
 * CommandExecutor - Executes parsed commands
 *
 * Translates commands into authoritative runtime-controller actions.
 */

import { ParsedCommand } from './CommandParser.js';
import { FavoriteSlot, PatternSlot, Theme } from '../types/index.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import {
  RuntimeActionResult,
  RuntimeSceneSelection,
  RuntimeSnapshot,
} from './RuntimeController.js';

export interface ExecutionResult {
  success: boolean;
  message: string;
}

/** Narrow runtime boundary used by commands and lightweight test fakes. */
export interface SceneRuntime {
  getSnapshot(): RuntimeSnapshot;
  getCurrentSlot(): PatternSlot;
  getSlots(): readonly PatternSlot[];
  getThemes(): readonly Theme[];
  findPattern(query: number | string): number;
  findTheme(query: number | string): number;
  switchPattern(index: number, presetId?: number): RuntimeActionResult;
  applyPreset(presetId: number): RuntimeActionResult;
  changeTheme(index: number): RuntimeActionResult;
  applyScene(selection: RuntimeSceneSelection): RuntimeActionResult;
  resetCurrentPattern(): RuntimeActionResult;
}

export class CommandExecutor {
  private readonly runtime: SceneRuntime;
  private readonly configLoader?: ConfigLoader;

  // Shuffle state
  private shuffleActive = false;
  private shuffleInterval = 10; // seconds
  private shuffleTimer: NodeJS.Timeout | null = null;
  private shuffleAll = false; // If true, shuffle patterns too

  constructor(runtime: SceneRuntime, configLoader?: ConfigLoader) {
    this.runtime = runtime;
    this.configLoader = configLoader;
  }

  /**
   * Execute a parsed command
   */
  execute(command: ParsedCommand): ExecutionResult {
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
  private executePreset(command: ParsedCommand): ExecutionResult {
    const { presetNumber } = command.args;

    if (presetNumber === undefined) {
      return { success: false, message: 'Invalid preset number' };
    }

    const currentSlot = this.runtime.getCurrentSlot();
    const result = this.runtime.applyPreset(presetNumber);
    if (result.success) {
      return {
        success: true,
        message: `Applied preset ${String(presetNumber)} to ${currentSlot.pattern.name}`,
      };
    }
    if (result.error === 'presets-unsupported') {
      return {
        success: false,
        message: `Pattern ${currentSlot.pattern.name} doesn't support presets yet`,
      };
    }
    return {
      success: false,
      message: `Preset ${String(presetNumber)} not found for ${currentSlot.pattern.name}`,
    };
  }

  /**
   * Execute favorite load command (e.g., 0f1)
   */
  private executeFavorite(command: ParsedCommand): ExecutionResult {
    const { favoriteSlot } = command.args;

    if (favoriteSlot === undefined) {
      return { success: false, message: 'Invalid favorite slot' };
    }

    if (!this.configLoader) {
      return { success: false, message: 'Config loader not available' };
    }

    // Load favorite from config
    const favorite: FavoriteSlot | undefined = this.configLoader.getFavorite(favoriteSlot);

    if (!favorite) {
      return {
        success: false,
        message: `Favorite slot ${String(favoriteSlot)} is empty`,
      };
    }

    const patternIndex = this.runtime.findPattern(favorite.pattern);

    if (patternIndex === -1) {
      return {
        success: false,
        message: `Pattern "${favorite.pattern}" not found`,
      };
    }

    const themeIndex = this.runtime.findTheme(favorite.theme);

    if (themeIndex === -1) {
      return {
        success: false,
        message: `Theme "${favorite.theme}" not found`,
      };
    }

    const result = this.runtime.applyScene({
      patternIndex,
      themeIndex,
      ...(favorite.preset === undefined ? {} : { presetId: favorite.preset }),
    });
    if (!result.success) {
      return { success: false, message: `Favorite ${String(favoriteSlot)} contains invalid state` };
    }

    const targetSlot = this.runtime.getCurrentSlot();
    let message = `Loaded favorite ${String(favoriteSlot)}: ${targetSlot.displayName}`;
    if (favorite.preset !== undefined) message += ` + preset ${String(favorite.preset)}`;

    // Add theme info
    message += ` + ${this.runtime.getThemes()[themeIndex].displayName}`;

    // Add note if present
    if (favorite.note) {
      message += ` (${favorite.note})`;
    }

    return { success: true, message };
  }

  /**
   * Execute favorite save command (e.g., 0F1)
   */
  private executeSaveFavorite(command: ParsedCommand): ExecutionResult {
    const { favoriteSlot } = command.args;

    if (favoriteSlot === undefined) {
      return { success: false, message: 'Invalid favorite slot' };
    }

    if (!this.configLoader) {
      return { success: false, message: 'Config loader not available' };
    }

    const snapshot = this.runtime.getSnapshot();
    const currentSlot = this.runtime.getCurrentSlot();

    // Create favorite object
    const favorite: FavoriteSlot = {
      pattern: snapshot.patternKey,
      theme: snapshot.themeName,
      ...(snapshot.presetApplied ? { preset: snapshot.presetId } : {}),
      savedAt: new Date().toISOString(),
    };

    // Save to config
    this.configLoader.saveFavorite(favoriteSlot, favorite);

    return {
      success: true,
      message: `Saved to favorite ${String(favoriteSlot)}: ${currentSlot.displayName}${snapshot.presetApplied ? ` + preset ${String(snapshot.presetId)}` : ''} + ${snapshot.themeDisplayName}`,
    };
  }

  /**
   * Execute pattern switch command (e.g., 0p3, 0pwaves, 0p3.5)
   */
  private executePattern(command: ParsedCommand): ExecutionResult {
    const { patternId, patternPreset } = command.args;

    if (patternId === undefined) {
      return { success: false, message: 'Invalid pattern ID' };
    }

    // Find pattern by number or name
    let targetIndex = -1;

    if (typeof patternId === 'number') {
      // 1-based index (0p1 = first pattern)
      targetIndex = this.runtime.findPattern(patternId);
    } else {
      // Find by name (case-insensitive partial match)
      targetIndex = this.runtime.findPattern(patternId);
    }

    if (targetIndex < 0) {
      return {
        success: false,
        message: `Pattern "${String(patternId)}" not found`,
      };
    }

    const result = this.runtime.switchPattern(targetIndex, patternPreset);
    const targetSlot = this.runtime.getSlots()[targetIndex];
    if (!result.success) {
      const detail =
        result.error === 'presets-unsupported'
          ? 'presets not supported'
          : `preset ${String(patternPreset)} not found`;
      return { success: false, message: `${this.legacyPatternName(targetSlot)}: ${detail}` };
    }
    let message = `Switched to pattern ${String(targetIndex + 1)}: ${this.legacyPatternName(targetSlot)}`;
    if (patternPreset !== undefined) message += ` + preset ${String(patternPreset)}`;

    return { success: true, message };
  }

  /**
   * Execute theme switch command (e.g., 0t2, 0tfire)
   */
  private executeTheme(command: ParsedCommand): ExecutionResult {
    const { themeId } = command.args;

    if (themeId === undefined) {
      return { success: false, message: 'Invalid theme ID' };
    }

    // Find theme by number or name
    let targetIndex = -1;

    if (typeof themeId === 'number') {
      // 1-based index (0t1 = first theme)
      targetIndex = this.runtime.findTheme(themeId);
    } else {
      // Find by name (case-insensitive)
      targetIndex = this.runtime.findTheme(themeId);
    }

    if (targetIndex < 0) {
      return {
        success: false,
        message: `Theme "${String(themeId)}" not found`,
      };
    }

    this.runtime.changeTheme(targetIndex);

    return {
      success: true,
      message: `Switched to theme: ${this.runtime.getThemes()[targetIndex].displayName}`,
    };
  }

  /**
   * Execute special commands (*, ?, r, s, x, !, etc.)
   */
  private executeSpecial(command: ParsedCommand): ExecutionResult {
    const { specialCmd, specialArg } = command.args;

    if (!specialCmd) {
      return { success: false, message: 'Invalid special command' };
    }

    switch (specialCmd) {
      case 'randomPreset':
        return this.randomPreset();

      case 'randomAll':
        return this.randomAll();

      case 'listPresets':
        return this.listPresets();

      case 'catalogPresets':
        return this.catalogPresets();

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
        return this.saveConfig();

      case 'reset':
        return this.resetPattern();

      case 'shuffle':
        return this.toggleShuffle(specialArg);

      case 'shuffleAll':
        return this.toggleShuffleAll();

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
  private executeCombination(command: ParsedCommand): ExecutionResult {
    const { commands } = command.args;

    if (!commands || commands.length === 0) {
      return { success: false, message: 'Empty combination' };
    }

    const messages: string[] = [];
    let allSucceeded = true;

    for (const subCmd of commands) {
      const result = this.execute(subCmd);
      if (result.success) {
        messages.push(result.message);
      } else {
        messages.push(`❌ ${result.message}`);
        allSucceeded = false;
      }
    }

    return {
      success: allSucceeded,
      message: messages.join(' | '),
    };
  }

  // Helper methods for special commands

  /**
   * List presets for current pattern
   */
  private listPresets(): ExecutionResult {
    const currentSlot = this.runtime.getCurrentSlot();
    if (currentSlot.presets.length === 0) {
      return {
        success: false,
        message: `${this.legacyPatternName(currentSlot)} doesn't support presets`,
      };
    }

    // Format: "Presets for Wave: 1:Calm Seas, 2:Ocean Storm, ..."
    const presetList = currentSlot.presets.map(p => `${String(p.id)}:${p.name}`).join(', ');

    return {
      success: true,
      message: `Presets for ${currentSlot.displayName}: ${presetList}`,
    };
  }

  private listPatterns(): ExecutionResult {
    const patternNames = this.runtime
      .getSlots()
      .map((slot, i) => `${String(i + 1)}:${slot.displayName}`)
      .join(', ');

    return {
      success: true,
      message: `Patterns: ${patternNames}`,
    };
  }

  private listThemes(): ExecutionResult {
    const themeNames = this.runtime
      .getThemes()
      .map((t, i) => `${String(i + 1)}:${t.displayName}`)
      .join(', ');

    return {
      success: true,
      message: `Themes: ${themeNames}`,
    };
  }

  private randomTheme(): ExecutionResult {
    const themes = this.runtime.getThemes();
    const randomIndex = Math.floor(Math.random() * themes.length);
    this.runtime.changeTheme(randomIndex);

    return {
      success: true,
      message: `Random theme: ${themes[randomIndex].displayName}`,
    };
  }

  private randomize(): ExecutionResult {
    // Random pattern + random theme
    const slots = this.runtime.getSlots();
    const themes = this.runtime.getThemes();
    const randomPatternIndex = Math.floor(Math.random() * slots.length);
    const randomThemeIndex = Math.floor(Math.random() * themes.length);
    this.runtime.applyScene({ patternIndex: randomPatternIndex, themeIndex: randomThemeIndex });

    return {
      success: true,
      message: `Randomized: ${this.legacyPatternName(slots[randomPatternIndex])} + ${themes[randomThemeIndex].displayName}`,
    };
  }

  private resetPattern(): ExecutionResult {
    const currentSlot = this.runtime.getCurrentSlot();
    this.runtime.resetCurrentPattern();

    return {
      success: true,
      message: `Reset: ${this.legacyPatternName(currentSlot)}`,
    };
  }

  private search(term: string): ExecutionResult {
    if (!term) {
      return { success: false, message: 'Search term required' };
    }

    const searchTerm = term.toLowerCase();
    const matches: string[] = [];

    // Search patterns
    this.runtime.getSlots().forEach((slot, i) => {
      if (
        [slot.key, slot.displayName, ...slot.legacyNames].some(name =>
          name.toLowerCase().includes(searchTerm)
        )
      ) {
        matches.push(`P${String(i + 1)}:${slot.displayName}`);
      }
    });

    // Search themes
    this.runtime.getThemes().forEach((t, i) => {
      if (
        t.name.toLowerCase().includes(searchTerm) ||
        t.displayName.toLowerCase().includes(searchTerm)
      ) {
        matches.push(`T${String(i + 1)}:${t.displayName}`);
      }
    });

    if (matches.length === 0) {
      return { success: false, message: `No matches for "${term}"` };
    }

    return {
      success: true,
      message: `Found: ${matches.join(', ')}`,
    };
  }

  private listFavorites(): ExecutionResult {
    if (!this.configLoader) {
      return { success: false, message: 'Config loader not available' };
    }

    const favorites = this.configLoader.getAllFavorites();
    const slots = Object.keys(favorites).sort((a, b) => Number(a) - Number(b));

    if (slots.length === 0) {
      return { success: true, message: 'No favorites saved yet. Use 0F# to save.' };
    }

    const lines: string[] = [];
    slots.forEach(slot => {
      const fav: FavoriteSlot = favorites[Number(slot)];
      const patternIndex = this.runtime.findPattern(fav.pattern);
      const patternName =
        patternIndex >= 0
          ? this.runtime.getSlots()[patternIndex].displayName
          : fav.pattern.replace('Pattern', '');
      const presetInfo = fav.preset !== undefined ? `.${String(fav.preset)}` : '';
      const noteInfo = fav.note ? ` "${fav.note}"` : '';
      lines.push(`${slot}:${patternName}${presetInfo}+${fav.theme}${noteInfo}`);
    });

    return {
      success: true,
      message: `Favorites: ${lines.join(' | ')}`,
    };
  }

  /**
   * Apply random preset to current pattern (0*)
   */
  private randomPreset(): ExecutionResult {
    const currentSlot = this.runtime.getCurrentSlot();
    if (currentSlot.presets.length === 0) {
      return {
        success: false,
        message: `${this.legacyPatternName(currentSlot)} doesn't support presets`,
      };
    }

    // Pick random preset
    const randomPreset =
      currentSlot.presets[Math.floor(Math.random() * currentSlot.presets.length)];
    const result = this.runtime.applyPreset(randomPreset.id);

    if (result.success) {
      return {
        success: true,
        message: `Random preset: ${randomPreset.name} (${String(randomPreset.id)})`,
      };
    } else {
      return {
        success: false,
        message: `Failed to apply preset ${String(randomPreset.id)}`,
      };
    }
  }

  /**
   * Random pattern AND preset (0**)
   */
  private randomAll(): ExecutionResult {
    // Pick random pattern
    const slots = this.runtime.getSlots();
    const themes = this.runtime.getThemes();
    const randomPatternIndex = Math.floor(Math.random() * slots.length);
    const randomSlot = slots[randomPatternIndex];
    const randomPreset =
      randomSlot.presets.length > 0
        ? randomSlot.presets[Math.floor(Math.random() * randomSlot.presets.length)]
        : undefined;

    // Also randomize theme
    const randomThemeIndex = Math.floor(Math.random() * themes.length);
    this.runtime.applyScene({
      patternIndex: randomPatternIndex,
      themeIndex: randomThemeIndex,
      ...(randomPreset === undefined ? {} : { presetId: randomPreset.id }),
    });

    let message = `Random: ${this.legacyPatternName(randomSlot)}`;
    if (randomPreset) message += ` + ${randomPreset.name}`;
    message += ` + ${themes[randomThemeIndex].displayName}`;

    return {
      success: true,
      message,
    };
  }

  /**
   * Show catalog of all presets across all patterns (0??)
   */
  private catalogPresets(): ExecutionResult {
    const catalog: string[] = [];

    this.runtime.getSlots().forEach((slot, index) => {
      if (slot.presets.length > 0) {
        const presetList = slot.presets.map(p => `${String(p.id)}:${p.name}`).join(',');
        catalog.push(`${String(index + 1)}.${slot.displayName}[${presetList}]`);
      }
    });

    if (catalog.length === 0) {
      return {
        success: true,
        message: 'No presets available in any pattern',
      };
    }

    return {
      success: true,
      message: `Catalog: ${catalog.join(' | ')}`,
    };
  }

  /**
   * Save current state to config file (0s)
   */
  private saveConfig(): ExecutionResult {
    if (!this.configLoader) {
      return { success: false, message: 'Config loader not available' };
    }

    const snapshot = this.runtime.getSnapshot();
    const currentSlot = this.runtime.getCurrentSlot();

    // Load existing config and update with current state
    const config = this.configLoader.load();
    config.defaultPattern = snapshot.patternKey;
    config.theme = snapshot.themeName;
    config.fps = snapshot.fps;

    // Save to file
    this.configLoader.save(config);

    return {
      success: true,
      message: `Saved: ${this.legacyPatternName(currentSlot)} + ${snapshot.themeDisplayName} @ ${String(snapshot.fps)}fps`,
    };
  }

  private legacyPatternName(slot: PatternSlot): string {
    return slot.legacyNames[0] ?? slot.pattern.constructor.name;
  }

  /**
   * Toggle shuffle mode (0! or 0![interval])
   * Shuffles presets at regular intervals
   */
  private toggleShuffle(intervalArg?: string): ExecutionResult {
    // If shuffle is active, turn it off
    if (this.shuffleActive) {
      this.stopShuffle();
      return {
        success: true,
        message: 'Shuffle mode disabled',
      };
    }

    // Parse interval if provided
    if (intervalArg) {
      const interval = parseInt(intervalArg, 10);
      if (isNaN(interval) || interval < 1 || interval > 300) {
        return {
          success: false,
          message: 'Shuffle interval must be 1-300 seconds',
        };
      }
      this.shuffleInterval = interval;
    }

    // Start shuffle mode (presets only)
    this.shuffleActive = true;
    this.shuffleAll = false;
    this.startShuffleTimer();

    return {
      success: true,
      message: `Shuffle mode enabled (${String(this.shuffleInterval)}s intervals, presets only)`,
    };
  }

  /**
   * Toggle shuffle all mode (0!!)
   * Shuffles patterns AND presets at regular intervals
   */
  private toggleShuffleAll(): ExecutionResult {
    // If shuffle is active, turn it off
    if (this.shuffleActive) {
      this.stopShuffle();
      return {
        success: true,
        message: 'Shuffle all mode disabled',
      };
    }

    // Start shuffle all mode
    this.shuffleActive = true;
    this.shuffleAll = true;
    this.startShuffleTimer();

    return {
      success: true,
      message: `Shuffle all mode enabled (${String(this.shuffleInterval)}s intervals, patterns + presets + themes)`,
    };
  }

  /**
   * Start the shuffle timer
   */
  private startShuffleTimer(): void {
    // Clear existing timer if any
    if (this.shuffleTimer) {
      clearInterval(this.shuffleTimer);
    }

    // Start new timer
    this.shuffleTimer = setInterval(() => {
      if (this.shuffleAll) {
        // Shuffle everything (pattern + preset + theme)
        this.randomAll();
      } else {
        // Shuffle preset only
        this.randomPreset();
      }
    }, this.shuffleInterval * 1000);
  }

  /**
   * Stop the shuffle timer
   */
  private stopShuffle(): void {
    if (this.shuffleTimer) {
      clearInterval(this.shuffleTimer);
      this.shuffleTimer = null;
    }
    this.shuffleActive = false;
  }

  /**
   * Check if shuffle mode is active (for debug overlay)
   */
  isShuffleActive(): boolean {
    return this.shuffleActive;
  }

  /**
   * Get shuffle info string (for debug overlay)
   */
  getShuffleInfo(): string {
    if (!this.shuffleActive) {
      return '';
    }
    const mode = this.shuffleAll ? 'ALL' : 'PRESET';
    return `Shuffle: ${mode} (${String(this.shuffleInterval)}s)`;
  }

  /**
   * Cleanup method (call on app shutdown)
   */
  cleanup(): void {
    this.stopShuffle();
  }
}
