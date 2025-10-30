import { Pattern, Cell, Size, Point, Theme } from '../types';
interface QuicksilverConfig {
    speed: number;
    flowIntensity: number;
    noiseScale: number;
}
interface QuicksilverPreset {
    id: number;
    name: string;
    description: string;
    config: QuicksilverConfig;
}
export declare class QuicksilverPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private droplets;
    private ripples;
    private noiseOffset;
    private liquidChars;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<QuicksilverConfig>);
    private noise;
    private fade;
    private lerp;
    private hash;
    private grad;
    render(buffer: Cell[][], time: number, size: Size): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): QuicksilverPreset[];
    static getPreset(id: number): QuicksilverPreset | undefined;
}
export {};
//# sourceMappingURL=QuicksilverPattern.d.ts.map