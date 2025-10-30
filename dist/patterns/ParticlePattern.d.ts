import { Pattern, Cell, Size, Point, Theme } from '../types';
interface ParticleConfig {
    particleCount: number;
    speed: number;
    gravity: number;
    mouseForce: number;
    spawnRate: number;
}
export declare class ParticlePattern implements Pattern {
    name: string;
    private config;
    private theme;
    private particles;
    private attractMode;
    private particleChars;
    constructor(theme: Theme, config?: Partial<ParticleConfig>);
    reset(): void;
    private spawnParticle;
    render(buffer: Cell[][], _time: number, size: Size, mousePos?: Point): void;
    onMouseMove(_pos: Point): void;
    onMouseClick(pos: Point): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=ParticlePattern.d.ts.map