export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: Color[];
  getColor(intensity: number): Color;
}

export interface Cell {
  char: string;
  color?: Color;
  /**
   * Optional background color. Used by half-block / symbol renderers
   * (v0.4.0+) to encode two stacked pixels per cell. Patterns that don't
   * need a background simply leave this undefined.
   */
  bg?: Color;
}

/** Pause-aware timing values supplied for the current rendered frame. */
export interface FrameTime {
  /** Active time since the current scene was activated or reset. */
  sceneTime: number;
  /** Active time since the application clock started. */
  appTime: number;
  /** Active time elapsed since the previous rendered frame. */
  deltaTime: number;
}

export interface Pattern {
  name: string;

  /**
   * Renders the pattern to the buffer.
   *
   * @param buffer - 2D array of cells to render into
   * @param time - Pause-aware milliseconds since this scene was activated
   * @param size - Current terminal dimensions
   * @param mousePos - Optional mouse position (0-based coordinates)
   * @param frameTime - Optional full timing context for persistent application services
   *
   * **Time Parameter Convention:**
   * - `time` is scene-relative and resets when the pattern is activated
   * - paused and stopped intervals are excluded
   * - For frame-rate independent animation, patterns should:
   *   1. Track `lastTime` as a private field
   *   2. Calculate `deltaTime = time - lastTime` (in milliseconds)
   *   3. Convert to seconds: `deltaSeconds = deltaTime / 1000`
   *   4. Update `lastTime = time` after calculation
   * - For periodic functions (sin/cos), use scene-relative `time` directly
   * - Patterns must reset `lastTime = 0` in their `reset()` method
   */
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point, frameTime?: FrameTime): void;

  // Mouse interaction
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;

  // Core lifecycle
  reset(): void;

  // Preset system
  getMetrics?(): Record<string, number>;
  applyPreset?(presetId: number): boolean;

  // Lifecycle hooks (v0.4.0+)
  /** Called when this pattern becomes the active pattern */
  onActivate?(): void;
  /** Called when switching away from this pattern */
  onDeactivate?(): void;
  /** Called when the theme changes (allows hot-reload without pattern reset) */
  onThemeChange?(theme: Theme): void;
  /** Called when the terminal is resized */
  onResize?(size: Size): void;
  /** Called when FPS setting changes */
  onFpsChange?(fps: number): void;
}

/** Lightweight preset metadata used by runtime catalogs and command UI. */
export interface PatternPresetInfo {
  id: number;
  name: string;
  description?: string;
}

/** Origin of a runtime-selectable pattern slot. */
export type PatternSlotKind = 'procedural' | 'photo' | 'layered' | 'workspace';

/**
 * A self-describing runtime pattern entry. Keeping identity, seed, presets,
 * and the Pattern instance together prevents parallel registry arrays from
 * drifting when optional slots are appended or patterns are rebuilt.
 */
export interface PatternSlot {
  readonly key: string;
  readonly displayName: string;
  readonly kind: PatternSlotKind;
  readonly pattern: Pattern;
  readonly seed: number | null;
  readonly shareable: boolean;
  readonly presets: readonly PatternPresetInfo[];
  readonly legacyNames: readonly string[];
}

export interface AppState {
  running: boolean;
  paused: boolean;
  currentPattern: Pattern;
  fps: number;
  size: Size;
  mousePos?: Point;
}

export type QualityPreset = 'low' | 'medium' | 'high';

export interface CliOptions {
  pattern?: string;
  quality?: QualityPreset;
  fps?: number;
  theme?: string;
  mouse?: boolean;
  /** Path to an image file to render via PhotoPattern (v0.4.0+). */
  photo?: string;
}

// Pattern-specific configuration interfaces
export interface WavePatternConfig {
  frequency?: number;
  amplitude?: number;
  speed?: number;
  layers?: number;
  rippleDuration?: number;
  /**
   * v0.4.0 Phase 3: when true, cells the wave would render with `' '`
   * (i.e. far enough from the wave height to fall through every intensity
   * bin) are left untouched, allowing a lower layer (e.g. PhotoPattern in
   * a {@link LayeredPattern}) to remain visible.
   */
  transparentBg?: boolean;
}

export interface StarfieldPatternConfig {
  starCount?: number;
  speed?: number;
  forceFieldRadius?: number;
  forceFieldStrength?: number;
}

export interface MatrixPatternConfig {
  columnDensity?: number;
  speed?: number;
  fadeTime?: number;
  distortionRadius?: number;
}

export interface RainPatternConfig {
  dropCount?: number;
  speed?: number;
  splashDuration?: number;
}

export interface QuicksilverPatternConfig {
  blobCount?: number;
  speed?: number;
  viscosity?: number;
  mousePull?: number;
}

export interface ParticlePatternConfig {
  particleCount?: number;
  speed?: number;
  gravity?: number;
  mouseForce?: number;
  spawnRate?: number;
}

export interface SpiralPatternConfig {
  armCount?: number;
  particleCount?: number;
  spiralTightness?: number;
  rotationSpeed?: number;
  particleSpeed?: number;
  trailLength?: number;
  direction?: 'outward' | 'inward' | 'bidirectional';
  pulseEffect?: boolean;
}

export interface PlasmaPatternConfig {
  frequency?: number;
  speed?: number;
  complexity?: number;
  /**
   * v0.4.0 Phase 3: when true, cells the plasma would render with `' '`
   * (the highest-intensity bin in its char ramp) are left untouched,
   * letting a lower layer (e.g. PhotoPattern in a {@link LayeredPattern})
   * remain visible through the brightest plasma regions.
   */
  transparentBg?: boolean;
}

export interface TunnelPatternConfig {
  shape?: 'circle' | 'square' | 'hexagon' | 'star';
  ringCount?: number;
  speed?: number;
  particleCount?: number;
  speedLineCount?: number;
  turbulence?: number;
  glowIntensity?: number;
  chromatic?: boolean;
  rotationSpeed?: number;
  radius?: number;
}

export interface LightningPatternConfig {
  branchProbability?: number;
  fadeTime?: number;
  strikeInterval?: number;
  mainPathJaggedness?: number;
  branchSpread?: number;
}

export interface FireworkPatternConfig {
  burstSize?: number;
  launchSpeed?: number;
  gravity?: number;
  fadeRate?: number;
  spawnInterval?: number;
  trailLength?: number;
}

export interface MazePatternConfig {
  algorithm?: 'dfs' | 'prim' | 'recursive-division' | 'kruskal' | 'eller' | 'wilson';
  cellSize?: number;
  generationSpeed?: number;
  wallChar?: string;
  pathChar?: string;
  animateGeneration?: boolean;
}

export interface LifePatternConfig {
  cellSize?: number;
  updateSpeed?: number;
  wrapEdges?: boolean;
  aliveChar?: string;
  deadChar?: string;
  randomDensity?: number;
  initialPattern?: string;
}

export interface DNAPatternConfig {
  rotationSpeed?: number;
  helixRadius?: number;
  helixHeight?: number;
  basePairSpacing?: number;
  twistRate?: number;
}

export interface LavaLampPatternConfig {
  blobCount?: number;
  minRadius?: number;
  maxRadius?: number;
  riseSpeed?: number;
  driftSpeed?: number;
  threshold?: number;
  mouseForce?: number;
  turbulence?: boolean;
  gravity?: boolean;
}

export interface SmokePatternConfig {
  plumeCount?: number;
  particleCount?: number;
  riseSpeed?: number;
  dissipationRate?: number;
  turbulence?: number;
  spread?: number;
  windStrength?: number;
  mouseBlowForce?: number;
}

export interface SnowPatternConfig {
  particleCount?: number;
  fallSpeed?: number;
  windStrength?: number;
  turbulence?: number;
  rotationSpeed?: number;
  particleType?: 'snow' | 'cherry' | 'autumn' | 'confetti' | 'ash';
  mouseWindForce?: number;
  accumulation?: boolean;
}

/**
 * Workspace visualization (`splash watch`) configuration. JSON-persistable
 * per the house convention, so it lives here and wires into
 * `ConfigSchema.patterns`. The watch *path* is runtime-only (CLI arg) and
 * never persisted — same reasoning as `PhotoPatternConfig.source`.
 *
 * Phase A consumes `heatHalfLifeMs`, `nodeBudget`, and `showLabels`; the
 * remaining fields are reserved for the watcher/attribution services in
 * later phases (schema locked up front per the proposal).
 */
export interface WorkspaceVizPatternConfig {
  /** Heat half-life in ms (default 30000). */
  heatHalfLifeMs?: number;
  /** Visible-node budget upper bound (default 150; also capped by cells/12). */
  nodeBudget?: number;
  /** Rendered events/s cap — consumed by the watcher service (Phase B). */
  eventRateCap?: number;
  /** Actor-touch correlation window in ms (Phase D). */
  attributionWindowMs?: number;
  /** Label policy; v1 supports 'none' | 'hot'. */
  showLabels?: 'none' | 'hot';
  /** Extension → color overrides (reserved). */
  extColors?: Record<string, string>;
  /** Extra watcher ignore globs (Phase B). */
  ignore?: string[];
}

// Vector2 for 2D math operations
export interface Vector2 {
  x: number;
  y: number;
}

// Favorite slot interface
export interface FavoriteSlot {
  /** Stable PatternSlot key. Legacy constructor names remain load-compatible. */
  pattern: string;
  /** Explicitly applied preset ID; omitted for the config-derived baseline. */
  preset?: number;
  theme: string; // Theme name (e.g., "ocean")
  config?: Record<string, unknown>; // Custom pattern config (if any)
  note?: string; // Optional user note
  savedAt: string; // ISO timestamp
}

// Main configuration schema
export interface ConfigSchema {
  // Global settings
  defaultPattern?: string;
  quality?: QualityPreset;
  fps?: number;
  theme?: string;
  mouseEnabled?: boolean;

  // Favorites storage (slot number → favorite data)
  favorites?: Record<number, FavoriteSlot>;

  // Pattern-specific configurations
  patterns?: {
    waves?: WavePatternConfig;
    starfield?: StarfieldPatternConfig;
    matrix?: MatrixPatternConfig;
    rain?: RainPatternConfig;
    quicksilver?: QuicksilverPatternConfig;
    particles?: ParticlePatternConfig;
    spiral?: SpiralPatternConfig;
    plasma?: PlasmaPatternConfig;
    tunnel?: TunnelPatternConfig;
    lightning?: LightningPatternConfig;
    fireworks?: FireworkPatternConfig;
    maze?: MazePatternConfig;
    life?: LifePatternConfig;
    dna?: DNAPatternConfig;
    lavaLamp?: LavaLampPatternConfig;
    smoke?: SmokePatternConfig;
    snow?: SnowPatternConfig;
    workspaceViz?: WorkspaceVizPatternConfig;
  };
}
