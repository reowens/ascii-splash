import { Pattern, Cell, Size, Point, Theme } from '../types';
interface RainConfig {
    density: number;
    speed: number;
    characters: string[];
}
interface RainPreset {
    id: number;
    name: string;
    description: string;
    config: RainConfig;
}
export declare class RainPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private drops;
    private splashes;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<RainConfig>);
    private initDrops;
    private createDrop;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): RainPreset[];
    static getPreset(id: number): RainPreset | undefined;
}
export {};
//# sourceMappingURL=RainPattern.d.ts.map