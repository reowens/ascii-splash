import { Pattern, Cell, Size, Point, Theme } from '../types';
interface WaveConfig {
    speed: number;
    amplitude: number;
    frequency: number;
    layers: number;
}
interface WavePreset {
    id: number;
    name: string;
    description: string;
    config: WaveConfig;
}
export declare class WavePattern implements Pattern {
    name: string;
    private config;
    private theme;
    private ripples;
    private waveChars;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<WaveConfig>);
    /**
     * Apply a preset configuration
     */
    applyPreset(presetId: number): boolean;
    /**
     * Get all available presets
     */
    static getPresets(): WavePreset[];
    /**
     * Get a specific preset by ID
     */
    static getPreset(id: number): WavePreset | undefined;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=WavePattern.d.ts.map