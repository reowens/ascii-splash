import { Pattern, Cell, Size, Point, Theme } from '../types';
interface ParticleConfig {
    particleCount: number;
    speed: number;
    gravity: number;
    mouseForce: number;
    spawnRate: number;
}
interface ParticlePreset {
    id: number;
    name: string;
    description: string;
    config: ParticleConfig;
}
export declare class ParticlePattern implements Pattern {
    name: string;
    private config;
    private theme;
    private particles;
    private attractMode;
    private particleChars;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<ParticleConfig>);
    reset(): void;
    private spawnParticle;
    render(buffer: Cell[][], _time: number, size: Size, mousePos?: Point): void;
    onMouseMove(_pos: Point): void;
    onMouseClick(pos: Point): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): ParticlePreset[];
    static getPreset(id: number): ParticlePreset | undefined;
}
export {};
//# sourceMappingURL=ParticlePattern.d.ts.map