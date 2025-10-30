import { Pattern, Cell, Size, Point } from '../types';
interface QuicksilverConfig {
    speed: number;
    flowIntensity: number;
    noiseScale: number;
}
export declare class QuicksilverPattern implements Pattern {
    name: string;
    private config;
    private droplets;
    private ripples;
    private noiseOffset;
    private liquidChars;
    constructor(config?: Partial<QuicksilverConfig>);
    private noise;
    private fade;
    private lerp;
    private hash;
    private grad;
    render(buffer: Cell[][], time: number, size: Size): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
}
export {};
//# sourceMappingURL=QuicksilverPattern.d.ts.map