import type { Pattern, PatternSlot, QualityPreset, Theme } from '../types/index.js';

/** Minimal animation-engine surface needed for runtime scene coordination. */
export interface RuntimeEngine {
  getPattern(): Pattern;
  setPattern(pattern: Pattern): void;
  resetSceneTime?(): void;
  getFps(): number;
  setFps(fps: number): void;
}

export interface RuntimeSnapshot {
  readonly patternIndex: number;
  readonly patternKey: string;
  readonly patternDisplayName: string;
  readonly patternKind: PatternSlot['kind'];
  readonly presetId: number;
  readonly presetApplied: boolean;
  readonly presetCount: number;
  readonly themeIndex: number;
  readonly themeName: string;
  readonly themeDisplayName: string;
  readonly quality: QualityPreset;
  readonly fps: number;
  readonly seed: number | null;
  readonly shareable: boolean;
  readonly patternCount: number;
}

export type RuntimeErrorCode =
  | 'pattern-not-found'
  | 'preset-not-found'
  | 'theme-not-found'
  | 'presets-unsupported'
  | 'invalid-fps';

export interface RuntimeActionResult {
  readonly success: boolean;
  readonly changed: boolean;
  readonly error?: RuntimeErrorCode;
  readonly snapshot: RuntimeSnapshot;
}

export type RuntimeChangeKind =
  'pattern' | 'preset' | 'theme' | 'quality' | 'fps' | 'reset' | 'scene';

export interface RuntimeChangeEvent {
  readonly kind: RuntimeChangeKind;
  readonly previous: RuntimeSnapshot;
  readonly current: RuntimeSnapshot;
}

export interface RuntimeSceneSelection {
  readonly patternIndex: number;
  readonly themeIndex?: number;
  readonly presetId?: number;
}

export interface RuntimeControllerOptions {
  readonly engine: RuntimeEngine;
  readonly themes: readonly Theme[];
  readonly initialSlots: readonly PatternSlot[];
  readonly initialPatternIndex: number;
  readonly initialThemeIndex: number;
  readonly initialPresetId?: number;
  readonly initialPresetApplied?: boolean;
  readonly initialQuality: QualityPreset;
  readonly rebuildSlots: (
    theme: Theme,
    priorSeeds: ReadonlyMap<string, number>
  ) => readonly PatternSlot[];
  readonly beforePatternSwitch?: (from: PatternSlot, to: PatternSlot) => void;
}

const QUALITY_FPS: Readonly<Record<QualityPreset, number>> = Object.freeze({
  low: 15,
  medium: 30,
  high: 60,
});

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

/**
 * Authoritative owner of runtime scene selection.
 *
 * Terminal input and CommandExecutor both delegate here so pattern, preset,
 * theme, seed, and rebuilt instances change as one observable state.
 */
export class RuntimeController {
  private readonly engine: RuntimeEngine;
  private readonly themes: readonly Theme[];
  private readonly rebuildSlots: RuntimeControllerOptions['rebuildSlots'];
  private readonly beforePatternSwitch?: RuntimeControllerOptions['beforePatternSwitch'];
  private readonly listeners = new Set<(event: RuntimeChangeEvent) => void>();

  private slots: readonly PatternSlot[];
  private patternIndex: number;
  private themeIndex: number;
  private presetId: number;
  private presetApplied: boolean;
  private quality: QualityPreset;

  constructor(options: RuntimeControllerOptions) {
    this.engine = options.engine;
    this.themes = freezeArray(options.themes);
    this.slots = this.validateSlots(options.initialSlots);
    this.validatePatternIndex(options.initialPatternIndex, this.slots);
    this.validateThemeIndex(options.initialThemeIndex);

    this.patternIndex = options.initialPatternIndex;
    this.themeIndex = options.initialThemeIndex;
    this.presetId = options.initialPresetId ?? 1;
    this.presetApplied = options.initialPresetApplied ?? false;
    this.quality = options.initialQuality;
    this.rebuildSlots = options.rebuildSlots;
    this.beforePatternSwitch = options.beforePatternSwitch;

    if (this.engine.getPattern() !== this.getCurrentPattern()) {
      throw new Error('RuntimeController initial slot does not match AnimationEngine pattern');
    }

    if (this.presetApplied) {
      const slot = this.getCurrentSlot();
      if (!this.canApplyPreset(slot, this.presetId) || !slot.pattern.applyPreset?.(this.presetId)) {
        throw new Error(
          `RuntimeController initial preset ${String(this.presetId)} is invalid for ${slot.key}`
        );
      }
    }
  }

  /** Return an immutable value snapshot of the current runtime scene. */
  getSnapshot(): RuntimeSnapshot {
    const slot = this.getCurrentSlot();
    const theme = this.themes[this.themeIndex];
    return Object.freeze({
      patternIndex: this.patternIndex,
      patternKey: slot.key,
      patternDisplayName: slot.displayName,
      patternKind: slot.kind,
      presetId: this.presetId,
      presetApplied: this.presetApplied,
      presetCount: slot.presets.length,
      themeIndex: this.themeIndex,
      themeName: theme.name,
      themeDisplayName: theme.displayName,
      quality: this.quality,
      fps: this.engine.getFps(),
      seed: slot.seed,
      shareable: slot.shareable,
      patternCount: this.slots.length,
    });
  }

  getCurrentPattern(): Pattern {
    return this.getCurrentSlot().pattern;
  }

  getCurrentSlot(): PatternSlot {
    return this.slots[this.patternIndex];
  }

  getSlots(): readonly PatternSlot[] {
    return this.slots;
  }

  getThemes(): readonly Theme[] {
    return this.themes;
  }

  /** Resolve a 1-based number or case-insensitive stable/legacy/display name. */
  findPattern(query: number | string): number {
    if (typeof query === 'number') {
      const index = query - 1;
      return index >= 0 && index < this.slots.length ? index : -1;
    }

    const term = query.trim().toLowerCase();
    if (!term) return -1;
    const exact = this.slots.findIndex(slot => this.patternTerms(slot).some(name => name === term));
    if (exact >= 0) return exact;
    return this.slots.findIndex(slot => this.patternTerms(slot).some(name => name.includes(term)));
  }

  /** Resolve a 1-based number or case-insensitive theme/display name. */
  findTheme(query: number | string): number {
    if (typeof query === 'number') {
      const index = query - 1;
      return index >= 0 && index < this.themes.length ? index : -1;
    }

    const term = query.trim().toLowerCase();
    return this.themes.findIndex(
      theme => theme.name.toLowerCase() === term || theme.displayName.toLowerCase() === term
    );
  }

  switchPattern(index: number, presetId?: number): RuntimeActionResult {
    if (!this.isPatternIndex(index, this.slots)) return this.failure('pattern-not-found');
    const target = this.slots[index];
    if (presetId !== undefined) {
      const presetError = this.presetError(target, presetId);
      if (presetError) return this.failure(presetError);
    }

    if (index === this.patternIndex) {
      return presetId === undefined ? this.noChange() : this.applyPreset(presetId);
    }

    const previous = this.getSnapshot();
    const current = this.getCurrentSlot();
    this.beforePatternSwitch?.(current, target);
    this.engine.setPattern(target.pattern);

    this.patternIndex = index;
    this.presetId = 1;
    this.presetApplied = false;
    if (presetId !== undefined) {
      this.applyPresetInvariant(target, presetId);
      this.presetId = presetId;
      this.presetApplied = true;
    }

    return this.complete('pattern', previous);
  }

  applyPreset(presetId: number): RuntimeActionResult {
    const slot = this.getCurrentSlot();
    const presetError = this.presetError(slot, presetId);
    if (presetError) return this.failure(presetError);

    const previous = this.getSnapshot();
    if (!slot.pattern.applyPreset?.(presetId)) return this.failure('preset-not-found');
    this.engine.resetSceneTime?.();
    this.presetId = presetId;
    this.presetApplied = true;
    return this.complete('preset', previous);
  }

  cyclePreset(direction: 1 | -1): RuntimeActionResult {
    const slot = this.getCurrentSlot();
    if (!slot.pattern.applyPreset || slot.presets.length === 0) {
      return this.failure('presets-unsupported');
    }

    const currentIndex = slot.presets.findIndex(preset => preset.id === this.presetId);
    const baseIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0;
    const nextIndex = (baseIndex + direction + slot.presets.length) % slot.presets.length;
    return this.applyPreset(slot.presets[nextIndex].id);
  }

  changeTheme(index: number): RuntimeActionResult {
    if (!this.isThemeIndex(index)) return this.failure('theme-not-found');
    if (index === this.themeIndex) return this.noChange();

    const previous = this.getSnapshot();
    const currentKey = this.getCurrentSlot().key;
    const replacementSlots = this.buildReplacementSlots(index);
    const replacementIndex = replacementSlots.findIndex(slot => slot.key === currentKey);
    if (replacementIndex < 0) {
      throw new Error(`Rebuilt pattern catalog is missing active slot "${currentKey}"`);
    }
    const replacement = replacementSlots[replacementIndex];
    this.validateTrackedPreset(replacement);

    this.engine.setPattern(replacement.pattern);
    if (this.presetApplied) this.applyPresetInvariant(replacement, this.presetId);

    this.slots = replacementSlots;
    this.patternIndex = replacementIndex;
    this.themeIndex = index;
    return this.complete('theme', previous);
  }

  cycleTheme(): RuntimeActionResult {
    return this.changeTheme((this.themeIndex + 1) % this.themes.length);
  }

  applyScene(selection: RuntimeSceneSelection): RuntimeActionResult {
    if (!this.isPatternIndex(selection.patternIndex, this.slots)) {
      return this.failure('pattern-not-found');
    }
    const nextThemeIndex = selection.themeIndex ?? this.themeIndex;
    if (!this.isThemeIndex(nextThemeIndex)) return this.failure('theme-not-found');

    const targetKey = this.slots[selection.patternIndex].key;
    const themeChanged = nextThemeIndex !== this.themeIndex;
    const candidateSlots = themeChanged ? this.buildReplacementSlots(nextThemeIndex) : this.slots;
    const candidateIndex = candidateSlots.findIndex(slot => slot.key === targetKey);
    if (candidateIndex < 0) {
      throw new Error(`Rebuilt pattern catalog is missing selected slot "${targetKey}"`);
    }
    const target = candidateSlots[candidateIndex];
    if (selection.presetId !== undefined) {
      const presetError = this.presetError(target, selection.presetId);
      if (presetError) return this.failure(presetError);
    }

    const keyChanged = targetKey !== this.getCurrentSlot().key;
    if (!themeChanged && !keyChanged && selection.presetId === undefined) return this.noChange();

    const previous = this.getSnapshot();
    if (keyChanged) this.beforePatternSwitch?.(this.getCurrentSlot(), target);
    if (themeChanged || keyChanged) this.engine.setPattern(target.pattern);

    let nextPresetId = keyChanged ? 1 : this.presetId;
    let nextPresetApplied = keyChanged ? false : this.presetApplied;
    if (selection.presetId !== undefined) {
      this.applyPresetInvariant(target, selection.presetId);
      this.engine.resetSceneTime?.();
      nextPresetId = selection.presetId;
      nextPresetApplied = true;
    } else if (themeChanged && nextPresetApplied) {
      this.applyPresetInvariant(target, nextPresetId);
    }

    this.slots = candidateSlots;
    this.patternIndex = candidateIndex;
    this.themeIndex = nextThemeIndex;
    this.presetId = nextPresetId;
    this.presetApplied = nextPresetApplied;
    return this.complete('scene', previous);
  }

  setQuality(quality: QualityPreset): RuntimeActionResult {
    const targetFps = QUALITY_FPS[quality];
    if (quality === this.quality && this.engine.getFps() === targetFps) return this.noChange();

    const previous = this.getSnapshot();
    this.engine.setFps(targetFps);
    this.quality = quality;
    return this.complete('quality', previous);
  }

  setFps(fps: number): RuntimeActionResult {
    if (!Number.isInteger(fps) || fps < 10 || fps > 60) return this.failure('invalid-fps');
    if (fps === this.engine.getFps()) return this.noChange();

    const previous = this.getSnapshot();
    this.engine.setFps(fps);
    return this.complete('fps', previous);
  }

  resetCurrentPattern(): RuntimeActionResult {
    const previous = this.getSnapshot();
    this.getCurrentPattern().reset();
    this.engine.resetSceneTime?.();
    return this.complete('reset', previous);
  }

  /** Subscribe to successful mutations; returns an idempotent unsubscribe. */
  subscribe(listener: (event: RuntimeChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private buildReplacementSlots(themeIndex: number): readonly PatternSlot[] {
    const priorSeeds = new Map<string, number>();
    for (const slot of this.slots) {
      if (slot.seed !== null) priorSeeds.set(slot.key, slot.seed);
    }
    return this.validateSlots(this.rebuildSlots(this.themes[themeIndex], priorSeeds));
  }

  private validateTrackedPreset(slot: PatternSlot): void {
    if (this.presetApplied && !this.canApplyPreset(slot, this.presetId)) {
      throw new Error(
        `Rebuilt slot "${slot.key}" does not support preset ${String(this.presetId)}`
      );
    }
  }

  private applyPresetInvariant(slot: PatternSlot, presetId: number): void {
    if (!slot.pattern.applyPreset?.(presetId)) {
      throw new Error(
        `Pattern catalog advertised preset ${String(presetId)} for "${slot.key}", but apply failed`
      );
    }
  }

  private canApplyPreset(slot: PatternSlot, presetId: number): boolean {
    return Boolean(slot.pattern.applyPreset && slot.presets.some(preset => preset.id === presetId));
  }

  private presetError(slot: PatternSlot, presetId: number): RuntimeErrorCode | undefined {
    if (!slot.pattern.applyPreset || slot.presets.length === 0) return 'presets-unsupported';
    return slot.presets.some(preset => preset.id === presetId) ? undefined : 'preset-not-found';
  }

  private patternTerms(slot: PatternSlot): string[] {
    return [slot.key, slot.displayName, ...slot.legacyNames].map(name => name.toLowerCase());
  }

  private validateSlots(slots: readonly PatternSlot[]): readonly PatternSlot[] {
    if (slots.length === 0) throw new Error('RuntimeController requires at least one pattern slot');
    const keys = new Set<string>();
    for (const slot of slots) {
      if (keys.has(slot.key)) throw new Error(`Duplicate runtime pattern slot key "${slot.key}"`);
      keys.add(slot.key);
    }
    return freezeArray(slots);
  }

  private validatePatternIndex(index: number, slots: readonly PatternSlot[]): void {
    if (!this.isPatternIndex(index, slots)) {
      throw new RangeError(`Invalid initial pattern index ${String(index)}`);
    }
  }

  private validateThemeIndex(index: number): void {
    if (this.themes.length === 0) throw new Error('RuntimeController requires at least one theme');
    if (!this.isThemeIndex(index))
      throw new RangeError(`Invalid initial theme index ${String(index)}`);
  }

  private isPatternIndex(index: number, slots: readonly PatternSlot[]): boolean {
    return Number.isInteger(index) && index >= 0 && index < slots.length;
  }

  private isThemeIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.themes.length;
  }

  private noChange(): RuntimeActionResult {
    return Object.freeze({ success: true, changed: false, snapshot: this.getSnapshot() });
  }

  private failure(error: RuntimeErrorCode): RuntimeActionResult {
    return Object.freeze({ success: false, changed: false, error, snapshot: this.getSnapshot() });
  }

  private complete(kind: RuntimeChangeKind, previous: RuntimeSnapshot): RuntimeActionResult {
    const current = this.getSnapshot();
    const event: RuntimeChangeEvent = Object.freeze({ kind, previous, current });
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Runtime mutations must not be rolled back by presentation listeners.
      }
    }
    return Object.freeze({ success: true, changed: true, snapshot: current });
  }
}
