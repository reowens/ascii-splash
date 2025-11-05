/**
 * CommandExecutor - Executes parsed commands
 * 
 * Interfaces with patterns, engine, themes, and config to apply commands
 */

import { ParsedCommand } from './CommandParser.js';
import { AnimationEngine } from './AnimationEngine.js';
import { Pattern, Theme, FavoriteSlot } from '../types/index.js';
import { ConfigLoader } from '../config/ConfigLoader.js';

export interface ExecutionResult {
  success: boolean;
  message: string;
}

export class CommandExecutor {
  private engine: AnimationEngine;
  private patterns: Pattern[];
  private themes: Theme[];
  private currentPatternIndex: number;
  private currentThemeIndex: number;
  private configLoader?: ConfigLoader;
  
  // Callback to recreate patterns with new theme
  private onThemeChange?: (themeIndex: number) => void;
  
  // Shuffle state
  private shuffleActive: boolean = false;
  private shuffleInterval: number = 10; // seconds
  private shuffleTimer: NodeJS.Timeout | null = null;
  private shuffleAll: boolean = false; // If true, shuffle patterns too
  
  constructor(
    engine: AnimationEngine,
    patterns: Pattern[],
    themes: Theme[],
    currentPatternIndex: number,
    currentThemeIndex: number,
    configLoader?: ConfigLoader
  ) {
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
  updateState(patternIndex: number, themeIndex: number): void {
    this.currentPatternIndex = patternIndex;
    this.currentThemeIndex = themeIndex;
  }
  
  /**
   * Set theme change callback
   */
  setThemeChangeCallback(callback: (themeIndex: number) => void): void {
    this.onThemeChange = callback;
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
    } else {
      return {
        success: false,
        message: `Preset ${presetNumber} not found for ${currentPattern.name}`
      };
    }
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
        message: `Favorite slot ${favoriteSlot} is empty`
      };
    }
    
    // Find pattern by name
    const patternIndex = this.patterns.findIndex(p => 
      p.constructor.name === favorite.pattern
    );
    
    if (patternIndex === -1) {
      return {
        success: false,
        message: `Pattern "${favorite.pattern}" not found`
      };
    }
    
    // Find theme by name
    const themeIndex = this.themes.findIndex(t => 
      t.name === favorite.theme
    );
    
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
  private executeSaveFavorite(command: ParsedCommand): ExecutionResult {
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
    const favorite: FavoriteSlot = {
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
  private executePattern(command: ParsedCommand): ExecutionResult {
    const { patternId, patternPreset } = command.args;
    
    if (patternId === undefined) {
      return { success: false, message: 'Invalid pattern ID' };
    }
    
    // Find pattern by number or name
    let targetIndex = -1;
    
    if (typeof patternId === 'number') {
      // 1-based index (0p1 = first pattern)
      targetIndex = patternId - 1;
    } else {
      // Find by name (case-insensitive partial match)
      const searchTerm = patternId.toLowerCase();
      targetIndex = this.patterns.findIndex(p => 
        p.constructor.name.toLowerCase().includes(searchTerm)
      );
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
        } else {
          message += ` (preset ${patternPreset} not found)`;
        }
      } else {
        message += ` (presets not supported)`;
      }
    }
    
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
      targetIndex = themeId - 1;
    } else {
      // Find by name (case-insensitive)
      const searchTerm = themeId.toLowerCase();
      targetIndex = this.themes.findIndex(t => 
        t.name.toLowerCase() === searchTerm
      );
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
      message: messages.join(' | ')
    };
  }
  
  // Helper methods for special commands
  
  /**
   * List presets for current pattern
   */
  private listPresets(): ExecutionResult {
    const currentPattern = this.patterns[this.currentPatternIndex];
    const patternClass = currentPattern.constructor as any;
    
    // Check if pattern has getPresets static method
    if (!patternClass.getPresets) {
      return {
        success: false,
        message: `${currentPattern.constructor.name} doesn't support presets`
      };
    }
    
    const presets = patternClass.getPresets();
    
    if (!presets || presets.length === 0) {
      return {
        success: true,
        message: `No presets available for ${currentPattern.constructor.name}`
      };
    }
    
    // Format: "Presets for Wave: 1:Calm Seas, 2:Ocean Storm, ..."
    const presetList = presets.map((p: any) => `${p.id}:${p.name}`).join(', ');
    const patternName = currentPattern.constructor.name.replace('Pattern', '');
    
    return {
      success: true,
      message: `Presets for ${patternName}: ${presetList}`
    };
  }
  
  private listPatterns(): ExecutionResult {
    const patternNames = this.patterns.map((p, i) => 
      `${i + 1}:${p.constructor.name.replace('Pattern', '')}`
    ).join(', ');
    
    return {
      success: true,
      message: `Patterns: ${patternNames}`
    };
  }
  
  private listThemes(): ExecutionResult {
    const themeNames = this.themes.map((t, i) => 
      `${i + 1}:${t.displayName}`
    ).join(', ');
    
    return {
      success: true,
      message: `Themes: ${themeNames}`
    };
  }
  
  private randomTheme(): ExecutionResult {
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
  
  private randomize(): ExecutionResult {
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
  
  private resetPattern(): ExecutionResult {
    const currentPattern = this.patterns[this.currentPatternIndex];
    currentPattern.reset();
    
    return {
      success: true,
      message: `Reset: ${currentPattern.constructor.name}`
    };
  }
  
  private search(term: string): ExecutionResult {
    if (!term) {
      return { success: false, message: 'Search term required' };
    }
    
    const searchTerm = term.toLowerCase();
    const matches: string[] = [];
    
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
  
  /**
   * Apply random preset to current pattern (0*)
   */
  private randomPreset(): ExecutionResult {
    const currentPattern = this.patterns[this.currentPatternIndex];
    const patternClass = currentPattern.constructor as any;
    
    // Check if pattern has getPresets static method
    if (!patternClass.getPresets || !currentPattern.applyPreset) {
      return {
        success: false,
        message: `${currentPattern.constructor.name} doesn't support presets`
      };
    }
    
    const presets = patternClass.getPresets();
    
    if (!presets || presets.length === 0) {
      return {
        success: false,
        message: `No presets available for ${currentPattern.constructor.name}`
      };
    }
    
    // Pick random preset
    const randomPreset = presets[Math.floor(Math.random() * presets.length)];
    const success = currentPattern.applyPreset(randomPreset.id);
    
    if (success) {
      return {
        success: true,
        message: `Random preset: ${randomPreset.name} (${randomPreset.id})`
      };
    } else {
      return {
        success: false,
        message: `Failed to apply preset ${randomPreset.id}`
      };
    }
  }
  
  /**
   * Random pattern AND preset (0**)
   */
  private randomAll(): ExecutionResult {
    // Pick random pattern
    const randomPatternIndex = Math.floor(Math.random() * this.patterns.length);
    const randomPattern = this.patterns[randomPatternIndex];
    const patternClass = randomPattern.constructor as any;
    
    // Switch to pattern
    this.engine.setPattern(randomPattern);
    this.currentPatternIndex = randomPatternIndex;
    
    let message = `Random: ${randomPattern.constructor.name}`;
    
    // Try to apply random preset if available
    if (patternClass.getPresets && randomPattern.applyPreset) {
      const presets = patternClass.getPresets();
      if (presets && presets.length > 0) {
        const randomPreset = presets[Math.floor(Math.random() * presets.length)];
        randomPattern.applyPreset(randomPreset.id);
        message += ` + ${randomPreset.name}`;
      }
    }
    
    // Also randomize theme
    const randomThemeIndex = Math.floor(Math.random() * this.themes.length);
    this.currentThemeIndex = randomThemeIndex;
    if (this.onThemeChange) {
      this.onThemeChange(randomThemeIndex);
    }
    message += ` + ${this.themes[randomThemeIndex].displayName}`;
    
    return {
      success: true,
      message
    };
  }
  
  /**
   * Show catalog of all presets across all patterns (0??)
   */
  private catalogPresets(): ExecutionResult {
    const catalog: string[] = [];
    
    this.patterns.forEach((pattern, index) => {
      const patternClass = pattern.constructor as any;
      const patternName = pattern.constructor.name.replace('Pattern', '');
      
      if (patternClass.getPresets) {
        const presets = patternClass.getPresets();
        if (presets && presets.length > 0) {
          const presetList = presets.map((p: any) => `${p.id}:${p.name}`).join(',');
          catalog.push(`${index + 1}.${patternName}[${presetList}]`);
        }
      }
    });
    
    if (catalog.length === 0) {
      return {
        success: true,
        message: 'No presets available in any pattern'
      };
    }
    
    return {
      success: true,
      message: `Catalog: ${catalog.join(' | ')}`
    };
  }
  
  /**
   * Save current state to config file (0s)
   */
  private saveConfig(): ExecutionResult {
    if (!this.configLoader) {
      return { success: false, message: 'Config loader not available' };
    }
    
    const currentPattern = this.patterns[this.currentPatternIndex];
    const currentTheme = this.themes[this.currentThemeIndex];
    const currentFps = this.engine.getFps();
    
    // Load existing config and update with current state
    const config = this.configLoader.load();
    config.defaultPattern = currentPattern.constructor.name.replace('Pattern', '').toLowerCase();
    config.theme = currentTheme.name;
    config.fps = currentFps;
    
    // Save to file
    this.configLoader.save(config);
    
    return {
      success: true,
      message: `Saved: ${currentPattern.constructor.name} + ${currentTheme.displayName} @ ${currentFps}fps`
    };
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
        message: 'Shuffle mode disabled'
      };
    }
    
    // Parse interval if provided
    if (intervalArg) {
      const interval = parseInt(intervalArg, 10);
      if (isNaN(interval) || interval < 1 || interval > 300) {
        return {
          success: false,
          message: 'Shuffle interval must be 1-300 seconds'
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
      message: `Shuffle mode enabled (${this.shuffleInterval}s intervals, presets only)`
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
        message: 'Shuffle all mode disabled'
      };
    }
    
    // Start shuffle all mode
    this.shuffleActive = true;
    this.shuffleAll = true;
    this.startShuffleTimer();
    
    return {
      success: true,
      message: `Shuffle all mode enabled (${this.shuffleInterval}s intervals, patterns + presets + themes)`
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
    return `Shuffle: ${mode} (${this.shuffleInterval}s)`;
  }
  
  /**
   * Cleanup method (call on app shutdown)
   */
  cleanup(): void {
    this.stopShuffle();
  }
}
