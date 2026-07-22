import type { ConfigSchema } from '../types/index.js';
import { PROCEDURAL_PATTERN_IDS } from '../utils/shareCode.js';
import { THEME_NAMES } from './themes.js';

type Validator = (value: unknown) => boolean;
type UnknownRecord = Record<string, unknown>;

const number =
  (min: number, max: number, integer = false): Validator =>
  value =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    (!integer || Number.isInteger(value));
const enumeration =
  (values: readonly string[]): Validator =>
  value =>
    typeof value === 'string' && values.includes(value);
const boolean: Validator = value => typeof value === 'boolean';
const cellChar: Validator = value =>
  typeof value === 'string' &&
  value.length > 0 &&
  Array.from(value).length === 1 &&
  (value.codePointAt(0) ?? 0) > 31 &&
  value.codePointAt(0) !== 127;

const RULES: Readonly<Record<string, Validator>> = {
  defaultPattern: enumeration(PROCEDURAL_PATTERN_IDS),
  quality: enumeration(['low', 'medium', 'high']),
  fps: number(10, 60, true),
  theme: enumeration(THEME_NAMES),
  mouseEnabled: boolean,

  'patterns.waves.layers': number(1, 20, true),
  'patterns.waves.rippleDuration': number(1, 600000),
  'patterns.waves.transparentBg': boolean,
  'patterns.starfield.starCount': number(0, 5000, true),
  'patterns.matrix.columnDensity': number(0, 1),
  'patterns.matrix.fadeTime': number(1, 600000),
  'patterns.rain.dropCount': number(0, 5000, true),
  'patterns.rain.splashDuration': number(1, 600000),
  'patterns.quicksilver.blobCount': number(0, 500, true),
  'patterns.quicksilver.viscosity': number(0, 1),
  'patterns.particles.particleCount': number(0, 5000, true),
  'patterns.particles.spawnRate': number(0, 1000),
  'patterns.spiral.armCount': number(1, 32, true),
  'patterns.spiral.particleCount': number(0, 5000, true),
  'patterns.spiral.trailLength': number(0, 100, true),
  'patterns.spiral.direction': enumeration(['outward', 'inward', 'bidirectional']),
  'patterns.spiral.pulseEffect': boolean,
  'patterns.plasma.complexity': number(1, 20, true),
  'patterns.plasma.transparentBg': boolean,
  'patterns.tunnel.shape': enumeration(['circle', 'square', 'hexagon', 'star']),
  'patterns.tunnel.ringCount': number(1, 200, true),
  'patterns.tunnel.particleCount': number(0, 5000, true),
  'patterns.tunnel.speedLineCount': number(0, 1000, true),
  'patterns.tunnel.glowIntensity': number(0, 1),
  'patterns.tunnel.chromatic': boolean,
  'patterns.lightning.branchProbability': number(0, 1),
  'patterns.lightning.fadeTime': number(1, 600000),
  'patterns.lightning.strikeInterval': number(1, 600000),
  'patterns.fireworks.burstSize': number(1, 1000, true),
  'patterns.fireworks.spawnInterval': number(1, 600000),
  'patterns.fireworks.trailLength': number(0, 100, true),
  'patterns.maze.algorithm': enumeration([
    'dfs',
    'prim',
    'recursive-division',
    'kruskal',
    'eller',
    'wilson',
  ]),
  'patterns.maze.cellSize': number(1, 20, true),
  'patterns.maze.generationSpeed': number(1, 600000),
  'patterns.maze.wallChar': cellChar,
  'patterns.maze.pathChar': cellChar,
  'patterns.maze.animateGeneration': boolean,
  'patterns.life.cellSize': number(1, 20, true),
  'patterns.life.updateSpeed': number(1, 600000),
  'patterns.life.wrapEdges': boolean,
  'patterns.life.aliveChar': cellChar,
  'patterns.life.deadChar': cellChar,
  'patterns.life.randomDensity': number(0, 1),
  'patterns.life.initialPattern': enumeration([
    'random',
    'gliders',
    'oscillators',
    'methuselah',
    'still-life',
  ]),
  'patterns.dna.basePairSpacing': number(0.1, 100),
  'patterns.lavaLamp.blobCount': number(1, 100, true),
  'patterns.lavaLamp.minRadius': number(0.1, 1000),
  'patterns.lavaLamp.maxRadius': number(0.1, 1000),
  'patterns.lavaLamp.turbulence': boolean,
  'patterns.lavaLamp.gravity': boolean,
  'patterns.smoke.plumeCount': number(1, 100, true),
  'patterns.smoke.particleCount': number(0, 5000, true),
  'patterns.smoke.dissipationRate': number(0, 1),
  'patterns.snow.particleCount': number(0, 5000, true),
  'patterns.snow.particleType': enumeration(['snow', 'cherry', 'autumn', 'confetti', 'ash']),
  'patterns.snow.accumulation': boolean,
  'patterns.workspaceViz.heatHalfLifeMs': number(1, 86400000),
  'patterns.workspaceViz.nodeBudget': number(8, 1000, true),
  'patterns.workspaceViz.eventRateCap': number(1, 1000, true),
  'patterns.workspaceViz.attributionWindowMs': number(1, 600000),
  'patterns.workspaceViz.showLabels': enumeration(['none', 'hot']),
  'patterns.workspaceViz.ignore': value =>
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 256),
  'patterns.workspaceViz.extColors': value =>
    isRecord(value) &&
    Object.keys(value).length <= 100 &&
    Object.values(value).every(
      color => typeof color === 'string' && /^#?[0-9a-f]{6}$/iu.test(color)
    ),
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultValidator(defaultValue: unknown): Validator {
  if (typeof defaultValue === 'number') return number(-10000, 10000);
  if (typeof defaultValue === 'boolean') return boolean;
  if (typeof defaultValue === 'string') return value => typeof value === 'string';
  return () => false;
}

/** Sanitize persisted configuration before it is merged with defaults. */
export function validateFileConfig(
  input: unknown,
  defaults: ConfigSchema,
  configPath: string,
  warn: (message: string) => void = console.warn
): Partial<ConfigSchema> {
  if (!isRecord(input)) {
    warn(`Warning: ${configPath}: config root must be an object; using defaults`);
    return {};
  }

  const sanitize = (source: UnknownRecord, baseline: UnknownRecord, prefix = ''): UnknownRecord => {
    const output: UnknownRecord = {};
    for (const key of Object.keys(source).sort()) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = source[key];
      const defaultValue = baseline[key];

      if (key === 'comment' || path === '$schema') continue;

      if (path === 'favorites') {
        if (isRecord(value)) output[key] = structuredClone(value);
        else warn(`Warning: ${configPath}: invalid ${path}; using default`);
        continue;
      }

      if (isRecord(defaultValue)) {
        if (isRecord(value)) output[key] = sanitize(value, defaultValue, path);
        else warn(`Warning: ${configPath}: invalid ${path}; using default`);
        continue;
      }

      const validator =
        RULES[path] ?? (defaultValue === undefined ? undefined : defaultValidator(defaultValue));
      if (!validator) {
        warn(`Warning: ${configPath}: unknown field ${path}; ignoring`);
      } else if (!validator(value)) {
        warn(`Warning: ${configPath}: invalid ${path}; using default`);
      } else {
        output[key] = structuredClone(value);
      }
    }
    return output;
  };

  const sanitized = sanitize(input, defaults as UnknownRecord) as Partial<ConfigSchema>;
  const lava = sanitized.patterns?.lavaLamp;
  if (
    lava?.minRadius !== undefined &&
    lava.maxRadius !== undefined &&
    lava.minRadius > lava.maxRadius
  ) {
    warn(`Warning: ${configPath}: invalid patterns.lavaLamp radius range; using defaults`);
    lava.minRadius = defaults.patterns?.lavaLamp?.minRadius;
    lava.maxRadius = defaults.patterns?.lavaLamp?.maxRadius;
  }
  return sanitized;
}
