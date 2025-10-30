import { Pattern, Cell, Size, Point, Theme } from '../types';
interface SpiralConfig {
    spiralCount: number;
    rotationSpeed: number;
    armLength: number;
    density: number;
    expandSpeed: number;
}
interface SpiralPreset {
    id: number;
    name: string;
    description: string;
    config: SpiralConfig;
}
export declare class SpiralPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private spiralChars;
    private mouseSpirals;
    private breathePhase;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<SpiralConfig>);
    reset(): void;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): SpiralPreset[];
    static getPreset(id: number): SpiralPreset | undefined;
}
export {};
//# sourceMappingURL=SpiralPattern.d.ts.map