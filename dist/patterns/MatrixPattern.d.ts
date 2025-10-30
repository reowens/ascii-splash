import { Pattern, Cell, Size, Point, Theme } from '../types';
interface MatrixConfig {
    density: number;
    speed: number;
    charset: 'katakana' | 'numbers' | 'mixed';
}
interface MatrixPreset {
    id: number;
    name: string;
    description: string;
    config: MatrixConfig;
}
export declare class MatrixPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private columns;
    private charSets;
    private distortions;
    private static readonly PRESETS;
    constructor(theme: Theme, config?: Partial<MatrixConfig>);
    private initColumns;
    private createColumn;
    private getRandomChar;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
    applyPreset(presetId: number): boolean;
    static getPresets(): MatrixPreset[];
    static getPreset(id: number): MatrixPreset | undefined;
}
export {};
//# sourceMappingURL=MatrixPattern.d.ts.map