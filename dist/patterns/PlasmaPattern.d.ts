import { Pattern, Cell, Size, Point, Theme } from '../types';
interface PlasmaConfig {
    frequency: number;
    speed: number;
    complexity: number;
}
interface PlasmaPreset {
    id: number;
    name: string;
    description: string;
    config: PlasmaConfig;
}
export declare class PlasmaPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private plasmaChars;
    private mouseInfluence;
    private clickWaves;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<PlasmaConfig>);
    reset(): void;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): PlasmaPreset[];
    static getPreset(id: number): PlasmaPreset | undefined;
}
export {};
//# sourceMappingURL=PlasmaPattern.d.ts.map