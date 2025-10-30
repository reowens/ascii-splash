import { Pattern, Cell, Size, Point, Theme } from '../types';
interface StarConfig {
    starCount: number;
    speed: number;
    mouseRepelRadius: number;
}
interface StarfieldPreset {
    id: number;
    name: string;
    description: string;
    config: StarConfig;
}
export declare class StarfieldPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private stars;
    private starChars;
    private explosions;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<StarConfig>);
    applyPreset(presetId: number): boolean;
    static getPresets(): StarfieldPreset[];
    static getPreset(id: number): StarfieldPreset | undefined;
    private initStars;
    private createStar;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=StarfieldPattern.d.ts.map