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
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove?(pos: Point): void;
    onMouseClick?(pos: Point): void;
    reset(): void;
    getMetrics?(): Record<string, number>;
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
    spiralCount?: number;
    rotationSpeed?: number;
    armLength?: number;
    density?: number;
    expandSpeed?: number;
}
export interface PlasmaPatternConfig {
    frequency?: number;
    speed?: number;
    complexity?: number;
}
export interface ConfigSchema {
    defaultPattern?: string;
    quality?: QualityPreset;
    fps?: number;
    theme?: string;
    mouseEnabled?: boolean;
    patterns?: {
        waves?: WavePatternConfig;
        starfield?: StarfieldPatternConfig;
        matrix?: MatrixPatternConfig;
        rain?: RainPatternConfig;
        quicksilver?: QuicksilverPatternConfig;
        particles?: ParticlePatternConfig;
        spiral?: SpiralPatternConfig;
        plasma?: PlasmaPatternConfig;
    };
}
//# sourceMappingURL=index.d.ts.map