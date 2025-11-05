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
}

export interface Pattern {
  name: string;
  
  /**
   * Renders the pattern to the buffer.
   * 
   * @param buffer - 2D array of cells to render into
   * @param time - Absolute timestamp in milliseconds (from Date.now())
   * @param size - Current terminal dimensions
   * @param mousePos - Optional mouse position (0-based coordinates)
   * 
   * **Time Parameter Convention:**
   * - `time` is an absolute timestamp (milliseconds since epoch)
   * - For frame-rate independent animation, patterns should:
   *   1. Track `lastTime` as a private field
   *   2. Calculate `deltaTime = time - lastTime` (in milliseconds)
   *   3. Convert to seconds: `deltaSeconds = deltaTime / 1000`
   *   4. Update `lastTime = time` after calculation
   * - For periodic functions (sin/cos), using absolute `time` is acceptable
   * - Patterns must reset `lastTime = 0` in their `reset()` method
   */
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
  
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;
  reset(): void;
  getMetrics?(): Record<string, number>;
  applyPreset?(presetId: number): boolean;
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
}

// Pattern-specific configuration interfaces
export interface WavePatternConfig {
  frequency?: number;
  amplitude?: number;
  speed?: number;
  layers?: number;
  rippleDuration?: number;
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

// Vector2 for 2D math operations
export interface Vector2 {
  x: number;
  y: number;
}

// Scene graph layer interface for layered rendering
export interface SceneLayer {
  name: string;
  zIndex: number;
  visible: boolean;
  update(deltaTime: number, size: Size): void;
  render(buffer: Cell[][], size: Size): void;
}

// Sprite for animated characters/objects
export interface Sprite {
  position: Vector2;
  velocity: Vector2;
  frames: string[][];  // Animation frames (each frame is array of lines)
  currentFrame: number;
  frameTime: number;   // Time accumulated for current frame (ms)
  frameDuration: number; // Duration per frame (ms)
  color: Color;
  scale: number;
  active: boolean;
}

// Particle for particle systems
export interface Particle {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  life: number;        // Remaining lifetime in seconds
  maxLife: number;     // Total lifetime for fade calculation
  color: Color;
  char: string;
  active: boolean;
}

// Range types for particle emitters
export interface Vector2Range {
  min: Vector2;
  max: Vector2;
}

export interface ColorRange {
  start: Color;
  end: Color;
}

// Particle emitter configuration
export interface ParticleEmitter {
  position: Vector2;
  emissionRate: number;      // Particles per second
  particleLife: number;      // Lifetime in seconds
  initialVelocity: Vector2Range;
  acceleration: Vector2;     // Gravity, wind, etc.
  colorRange: ColorRange;
  characters: string[];
  maxParticles?: number;
  burstMode?: boolean;       // Emit all at once vs continuous
  burstCount?: number;       // Number of particles in burst
}

// Favorite slot interface
export interface FavoriteSlot {
  pattern: string;           // Pattern name (e.g., "WavePattern")
  preset?: number;            // Preset ID (if applicable)
  theme: string;              // Theme name (e.g., "ocean")
  config?: any;               // Custom pattern config (if any)
  note?: string;              // Optional user note
  savedAt: string;            // ISO timestamp
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
  favorites?: {
    [slot: number]: FavoriteSlot;
  };

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
  };
}
