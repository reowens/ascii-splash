import type {
  ConfigSchema,
  Pattern,
  PatternPresetInfo,
  PatternSlot,
  Theme,
} from '../types/index.js';
import { Mulberry32, randomSeed, type Random } from '../utils/random.js';
import { PROCEDURAL_PATTERN_IDS } from '../utils/shareCode.js';
import { AquariumPattern } from './AquariumPattern.js';
import { CampfirePattern } from './CampfirePattern.js';
import { DNAPattern } from './DNAPattern.js';
import { FireworksPattern } from './FireworksPattern.js';
import { LayeredPattern } from './LayeredPattern.js';
import { LavaLampPattern } from './LavaLampPattern.js';
import { LifePattern } from './LifePattern.js';
import { LightningPattern } from './LightningPattern.js';
import { MatrixPattern } from './MatrixPattern.js';
import { MazePattern } from './MazePattern.js';
import { MetaballPattern } from './MetaballPattern.js';
import { NightSkyPattern } from './NightSkyPattern.js';
import { OceanBeachPattern } from './OceanBeachPattern.js';
import { ParticlePattern } from './ParticlePattern.js';
import { PhotoPattern } from './PhotoPattern.js';
import { PlasmaPattern } from './PlasmaPattern.js';
import { QuicksilverPattern } from './QuicksilverPattern.js';
import { RainPattern } from './RainPattern.js';
import { SmokePattern } from './SmokePattern.js';
import { SnowPattern } from './SnowPattern.js';
import { SnowfallParkPattern } from './SnowfallParkPattern.js';
import { SpiralPattern } from './SpiralPattern.js';
import { StarfieldPattern } from './StarfieldPattern.js';
import { TunnelPattern } from './TunnelPattern.js';
import { WavePattern } from './WavePattern.js';
import { WorkspaceModel } from './workspace/WorkspaceModel.js';
import { WorkspaceVizPattern, type WorkspaceVizConfig } from './workspace/WorkspaceVizPattern.js';

interface PresetSource {
  id: number;
  name: string;
  description?: string;
}

interface PatternFactoryContext {
  config: ConfigSchema;
  theme: Theme;
  random: Random;
  transparentBackground: boolean;
}

/** Construction metadata for one share-code-compatible procedural pattern. */
export interface ProceduralPatternDefinition {
  readonly key: string;
  readonly displayName: string;
  readonly legacyNames: readonly string[];
  readonly usesRandom: boolean;
  readonly getPresets: () => readonly PatternPresetInfo[];
  readonly create: (context: PatternFactoryContext) => Pattern;
}

/** Optional runtime-only sources appended after the procedural registry. */
export interface PatternCatalogOptions {
  readonly config: ConfigSchema;
  readonly theme: Theme;
  readonly priorSeeds?: ReadonlyMap<string, number>;
  readonly seedOverrides?: ReadonlyMap<string, number>;
  readonly photoPattern?: PhotoPattern | null;
  readonly layeredOverlayKey?: string | null;
  readonly workspaceModel?: WorkspaceModel | null;
  readonly seedFactory?: () => number;
}

function summarizePresets(presets: readonly PresetSource[]): readonly PatternPresetInfo[] {
  return Object.freeze(
    presets.map(preset =>
      Object.freeze({
        id: preset.id,
        name: preset.name,
        ...(preset.description === undefined ? {} : { description: preset.description }),
      })
    )
  );
}

function definition(
  key: string,
  displayName: string,
  legacyName: string,
  usesRandom: boolean,
  getPresets: () => readonly PresetSource[],
  create: (context: PatternFactoryContext) => Pattern
): ProceduralPatternDefinition {
  return Object.freeze({
    key,
    displayName,
    legacyNames: Object.freeze([legacyName]),
    usesRandom,
    getPresets: () => summarizePresets(getPresets()),
    create,
  });
}

/**
 * Ordered procedural registry. Its order is a wire-compatibility contract and
 * is asserted against PROCEDURAL_PATTERN_IDS below.
 */
export const PROCEDURAL_PATTERN_DEFINITIONS: readonly ProceduralPatternDefinition[] = Object.freeze(
  [
    definition(
      'waves',
      'Waves',
      'WavePattern',
      false,
      () => WavePattern.getPresets(),
      context =>
        new WavePattern(context.theme, {
          layers: context.config.patterns?.waves?.layers,
          amplitude: context.config.patterns?.waves?.amplitude,
          speed: context.config.patterns?.waves?.speed,
          frequency: context.config.patterns?.waves?.frequency,
          transparentBg: context.transparentBackground,
        })
    ),
    definition(
      'starfield',
      'Starfield',
      'StarfieldPattern',
      true,
      () => StarfieldPattern.getPresets(),
      context =>
        new StarfieldPattern(context.theme, context.random, {
          starCount: context.config.patterns?.starfield?.starCount,
          speed: context.config.patterns?.starfield?.speed,
        })
    ),
    definition(
      'matrix',
      'Matrix',
      'MatrixPattern',
      true,
      () => MatrixPattern.getPresets(),
      context =>
        new MatrixPattern(context.theme, context.random, {
          density: context.config.patterns?.matrix?.columnDensity,
          speed: context.config.patterns?.matrix?.speed,
        })
    ),
    definition(
      'rain',
      'Rain',
      'RainPattern',
      true,
      () => RainPattern.getPresets(),
      context =>
        new RainPattern(context.theme, context.random, {
          density: context.config.patterns?.rain?.dropCount
            ? context.config.patterns.rain.dropCount / 500
            : undefined,
          speed: context.config.patterns?.rain?.speed,
        })
    ),
    definition(
      'quicksilver',
      'Quicksilver',
      'QuicksilverPattern',
      true,
      () => QuicksilverPattern.getPresets(),
      context =>
        new QuicksilverPattern(context.theme, context.random, {
          speed: context.config.patterns?.quicksilver?.speed,
          flowIntensity: context.config.patterns?.quicksilver?.viscosity,
          noiseScale: 0.05,
        })
    ),
    definition(
      'particles',
      'Particles',
      'ParticlePattern',
      true,
      () => ParticlePattern.getPresets(),
      context =>
        new ParticlePattern(context.theme, context.random, {
          particleCount: context.config.patterns?.particles?.particleCount,
          speed: context.config.patterns?.particles?.speed,
          gravity: context.config.patterns?.particles?.gravity,
          mouseForce: context.config.patterns?.particles?.mouseForce,
          spawnRate: context.config.patterns?.particles?.spawnRate,
        })
    ),
    definition(
      'spiral',
      'Spiral',
      'SpiralPattern',
      true,
      () => SpiralPattern.getPresets(),
      context =>
        new SpiralPattern(context.theme, context.random, {
          armCount: context.config.patterns?.spiral?.armCount,
          particleCount: context.config.patterns?.spiral?.particleCount,
          spiralTightness: context.config.patterns?.spiral?.spiralTightness,
          rotationSpeed: context.config.patterns?.spiral?.rotationSpeed,
          particleSpeed: context.config.patterns?.spiral?.particleSpeed,
          trailLength: context.config.patterns?.spiral?.trailLength,
          direction: context.config.patterns?.spiral?.direction,
          pulseEffect: context.config.patterns?.spiral?.pulseEffect,
        })
    ),
    definition(
      'plasma',
      'Plasma',
      'PlasmaPattern',
      true,
      () => PlasmaPattern.getPresets(),
      context =>
        new PlasmaPattern(context.theme, context.random, {
          frequency: context.config.patterns?.plasma?.frequency,
          speed: context.config.patterns?.plasma?.speed,
          complexity: context.config.patterns?.plasma?.complexity,
          transparentBg: context.transparentBackground,
        })
    ),
    definition(
      'tunnel',
      'Tunnel',
      'TunnelPattern',
      true,
      () => TunnelPattern.getPresets(),
      context =>
        new TunnelPattern(context.theme, context.random, {
          shape: context.config.patterns?.tunnel?.shape,
          ringCount: context.config.patterns?.tunnel?.ringCount,
          speed: context.config.patterns?.tunnel?.speed,
          particleCount: context.config.patterns?.tunnel?.particleCount,
          speedLineCount: context.config.patterns?.tunnel?.speedLineCount,
          turbulence: context.config.patterns?.tunnel?.turbulence,
          glowIntensity: context.config.patterns?.tunnel?.glowIntensity,
          chromatic: context.config.patterns?.tunnel?.chromatic,
          rotationSpeed: context.config.patterns?.tunnel?.rotationSpeed,
          radius: context.config.patterns?.tunnel?.radius,
        })
    ),
    definition(
      'lightning',
      'Lightning',
      'LightningPattern',
      true,
      () => LightningPattern.getPresets(),
      context =>
        new LightningPattern(context.theme, context.random, {
          branchProbability: context.config.patterns?.lightning?.branchProbability,
          fadeTime: context.config.patterns?.lightning?.fadeTime,
          strikeInterval: context.config.patterns?.lightning?.strikeInterval,
          mainPathJaggedness: context.config.patterns?.lightning?.mainPathJaggedness,
          branchSpread: context.config.patterns?.lightning?.branchSpread,
        })
    ),
    definition(
      'fireworks',
      'Fireworks',
      'FireworksPattern',
      true,
      () => FireworksPattern.getPresets(),
      context =>
        new FireworksPattern(context.theme, context.random, {
          burstSize: context.config.patterns?.fireworks?.burstSize,
          launchSpeed: context.config.patterns?.fireworks?.launchSpeed,
          gravity: context.config.patterns?.fireworks?.gravity,
          fadeRate: context.config.patterns?.fireworks?.fadeRate,
          spawnInterval: context.config.patterns?.fireworks?.spawnInterval,
          trailLength: context.config.patterns?.fireworks?.trailLength,
        })
    ),
    definition(
      'maze',
      'Maze',
      'MazePattern',
      true,
      () => MazePattern.getPresets(),
      context =>
        new MazePattern(context.theme, context.random, {
          algorithm: context.config.patterns?.maze?.algorithm,
          cellSize: context.config.patterns?.maze?.cellSize,
          generationSpeed: context.config.patterns?.maze?.generationSpeed,
          wallChar: context.config.patterns?.maze?.wallChar,
          pathChar: context.config.patterns?.maze?.pathChar,
          animateGeneration: context.config.patterns?.maze?.animateGeneration,
        })
    ),
    definition(
      'life',
      'Life',
      'LifePattern',
      true,
      () => LifePattern.getPresets(),
      context =>
        new LifePattern(context.theme, context.random, {
          cellSize: context.config.patterns?.life?.cellSize,
          updateSpeed: context.config.patterns?.life?.updateSpeed,
          wrapEdges: context.config.patterns?.life?.wrapEdges,
          aliveChar: context.config.patterns?.life?.aliveChar,
          deadChar: context.config.patterns?.life?.deadChar,
          randomDensity: context.config.patterns?.life?.randomDensity,
          initialPattern: context.config.patterns?.life?.initialPattern,
        })
    ),
    definition(
      'dna',
      'DNA',
      'DNAPattern',
      true,
      () => DNAPattern.getPresets(),
      context =>
        new DNAPattern(context.theme, context.random, {
          rotationSpeed: context.config.patterns?.dna?.rotationSpeed,
          helixRadius: context.config.patterns?.dna?.helixRadius,
          basePairDensity: context.config.patterns?.dna?.basePairSpacing
            ? 1 / context.config.patterns.dna.basePairSpacing
            : undefined,
          twistRate: context.config.patterns?.dna?.twistRate,
          showLabels: true,
        })
    ),
    definition(
      'lavalamp',
      'Lava Lamp',
      'LavaLampPattern',
      true,
      () => LavaLampPattern.getPresets(),
      context =>
        new LavaLampPattern(context.theme, context.random, {
          blobCount: context.config.patterns?.lavaLamp?.blobCount,
          minRadius: context.config.patterns?.lavaLamp?.minRadius,
          maxRadius: context.config.patterns?.lavaLamp?.maxRadius,
          riseSpeed: context.config.patterns?.lavaLamp?.riseSpeed,
          driftSpeed: context.config.patterns?.lavaLamp?.driftSpeed,
          threshold: context.config.patterns?.lavaLamp?.threshold,
          mouseForce: context.config.patterns?.lavaLamp?.mouseForce,
          turbulence: context.config.patterns?.lavaLamp?.turbulence,
          gravity: context.config.patterns?.lavaLamp?.gravity,
        })
    ),
    definition(
      'smoke',
      'Smoke',
      'SmokePattern',
      true,
      () => SmokePattern.getPresets(),
      context =>
        new SmokePattern(context.theme, context.random, {
          plumeCount: context.config.patterns?.smoke?.plumeCount,
          particleCount: context.config.patterns?.smoke?.particleCount,
          riseSpeed: context.config.patterns?.smoke?.riseSpeed,
          dissipationRate: context.config.patterns?.smoke?.dissipationRate,
          turbulence: context.config.patterns?.smoke?.turbulence,
          spread: context.config.patterns?.smoke?.spread,
          windStrength: context.config.patterns?.smoke?.windStrength,
          mouseBlowForce: context.config.patterns?.smoke?.mouseBlowForce,
        })
    ),
    definition(
      'snow',
      'Snow',
      'SnowPattern',
      true,
      () => SnowPattern.getPresets(),
      context =>
        new SnowPattern(context.theme, context.random, {
          particleCount: context.config.patterns?.snow?.particleCount,
          fallSpeed: context.config.patterns?.snow?.fallSpeed,
          windStrength: context.config.patterns?.snow?.windStrength,
          turbulence: context.config.patterns?.snow?.turbulence,
          rotationSpeed: context.config.patterns?.snow?.rotationSpeed,
          particleType: context.config.patterns?.snow?.particleType,
          accumulation: context.config.patterns?.snow?.accumulation,
          mouseWindForce: context.config.patterns?.snow?.mouseWindForce,
        })
    ),
    definition(
      'oceanbeach',
      'Ocean Beach',
      'OceanBeachPattern',
      true,
      () => OceanBeachPattern.getPresets(),
      context => new OceanBeachPattern(context.theme, context.random, {})
    ),
    definition(
      'campfire',
      'Campfire',
      'CampfirePattern',
      true,
      () => CampfirePattern.getPresets(),
      context => new CampfirePattern(context.theme, context.random, {})
    ),
    definition(
      'nightsky',
      'Night Sky',
      'NightSkyPattern',
      true,
      () => NightSkyPattern.getPresets(),
      context => new NightSkyPattern(context.theme, context.random, {})
    ),
    definition(
      'aquarium',
      'Aquarium',
      'AquariumPattern',
      true,
      () => AquariumPattern.getPresets(),
      context => new AquariumPattern(context.theme, context.random, {})
    ),
    definition(
      'snowfallpark',
      'Snowfall Park',
      'SnowfallParkPattern',
      true,
      () => SnowfallParkPattern.getPresets(),
      context => new SnowfallParkPattern(context.theme, context.random, {})
    ),
    definition(
      'metaball',
      'Metaball',
      'MetaballPattern',
      true,
      () => MetaballPattern.getPresets(),
      context => new MetaballPattern(context.theme, context.random, {})
    ),
  ]
);

/** Throw when runtime construction order diverges from the share-code wire registry. */
export function assertProceduralRegistryAlignment(): void {
  const keys = PROCEDURAL_PATTERN_DEFINITIONS.map(entry => entry.key);
  if (
    keys.length !== PROCEDURAL_PATTERN_IDS.length ||
    keys.some((key, index) => key !== PROCEDURAL_PATTERN_IDS[index])
  ) {
    throw new Error(
      `Procedural pattern catalog does not match share-code registry: ${keys.join(', ')}`
    );
  }
}

assertProceduralRegistryAlignment();

function seedFor(key: string, options: PatternCatalogOptions, seedFactory: () => number): number {
  const explicit = options.seedOverrides?.get(key);
  if (explicit !== undefined) return explicit >>> 0;

  const prior = options.priorSeeds?.get(key);
  if (prior !== undefined) return prior >>> 0;

  return seedFactory() >>> 0;
}

function createProceduralSlot(
  definition: ProceduralPatternDefinition,
  options: PatternCatalogOptions,
  seedFactory: () => number,
  transparentBackground = false,
  slotKey = definition.key,
  slotKind: PatternSlot['kind'] = 'procedural',
  shareable = true,
  displayName = definition.displayName,
  legacyNames: readonly string[] = definition.legacyNames
): PatternSlot {
  const seed = definition.usesRandom ? seedFor(slotKey, options, seedFactory) : 0;
  const pattern = definition.create({
    config: options.config,
    theme: options.theme,
    random: new Mulberry32(seed),
    transparentBackground,
  });

  return Object.freeze({
    key: slotKey,
    displayName,
    kind: slotKind,
    pattern,
    seed,
    shareable,
    presets: definition.getPresets(),
    legacyNames: Object.freeze([...legacyNames]),
  });
}

/** Build all runtime pattern slots with identity, seed, and preset metadata attached. */
export function buildPatternSlots(options: PatternCatalogOptions): readonly PatternSlot[] {
  const seedFactory = options.seedFactory ?? randomSeed;
  const slots = PROCEDURAL_PATTERN_DEFINITIONS.map(entry =>
    createProceduralSlot(entry, options, seedFactory)
  );

  if (options.photoPattern) {
    slots.push(
      Object.freeze({
        key: 'photo',
        displayName: 'Photo',
        kind: 'photo' as const,
        pattern: options.photoPattern,
        seed: null,
        shareable: false,
        presets: summarizePresets(PhotoPattern.getPresets()),
        legacyNames: Object.freeze(['PhotoPattern']),
      })
    );

    if (options.layeredOverlayKey) {
      const overlayDefinition = PROCEDURAL_PATTERN_DEFINITIONS.find(
        entry => entry.key === options.layeredOverlayKey
      );
      if (overlayDefinition) {
        const overlaySlot = createProceduralSlot(
          overlayDefinition,
          options,
          seedFactory,
          overlayDefinition.key === 'waves' || overlayDefinition.key === 'plasma',
          'layered',
          'layered',
          false,
          `Photo + ${overlayDefinition.displayName}`,
          ['LayeredPattern']
        );
        slots.push(
          Object.freeze({
            ...overlaySlot,
            pattern: new LayeredPattern(options.photoPattern, overlaySlot.pattern),
          })
        );
      }
    }
  }

  if (options.workspaceModel) {
    const workspaceSeed = seedFor('workspace', options, seedFactory);
    const workspaceConfig = options.config.patterns?.workspaceViz;
    const viewConfig: Partial<WorkspaceVizConfig> = {};
    if (workspaceConfig?.nodeBudget !== undefined) {
      viewConfig.nodeBudget = workspaceConfig.nodeBudget;
    }
    if (workspaceConfig?.showLabels !== undefined) {
      viewConfig.showLabels = workspaceConfig.showLabels;
    }

    slots.push(
      Object.freeze({
        key: 'workspace',
        displayName: 'Workspace',
        kind: 'workspace' as const,
        pattern: new WorkspaceVizPattern(
          options.workspaceModel,
          options.theme,
          new Mulberry32(workspaceSeed),
          viewConfig
        ),
        seed: workspaceSeed,
        shareable: false,
        presets: summarizePresets(WorkspaceVizPattern.getPresets()),
        legacyNames: Object.freeze(['WorkspaceVizPattern']),
      })
    );
  }

  return Object.freeze(slots);
}
