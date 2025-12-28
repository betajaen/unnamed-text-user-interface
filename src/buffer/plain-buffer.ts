import { Bitmap32Utils } from "./bitmap-utils.ts";
import { Bitmap32 } from "./bitmap32.ts";
import { type IBuffer } from "./buffer.ts";
import type {RendererMetrics} from "../metrics.ts";
import { Array32 } from "./array32.ts";

export class PlainBuffer implements IBuffer {

    private _glyphs: Bitmap32;
    private _generation:number = 0;
    private _generationBits:number = 0;
    private _dirtyGeneration:number = 0xFF;

    constructor(cols: number, maxCols: number, rows: number) {
        this._glyphs = new Bitmap32(cols, rows, maxCols);
        this._glyphs.buffer.fill(0);
    }

    configure(metrics:RendererMetrics) {
        if (this._glyphs.rows != metrics.rows ||
            this._glyphs.cols != metrics.cols)
        {
            this._glyphs.cols = Math.min(this._glyphs.stride, metrics.cols);
        }
    }

    get generation() {
        return this._generation;
    }
    set generation(generation: number) {
        this._generation = generation;
        this._generationBits = generation << 24;
        this._dirtyGeneration = 0xFF;
    }
    get generationBits() {
        return this._generationBits;
    }
    get glyphs() {
        return this._glyphs;
    }
    get dirty(): boolean {
        return this._generation === this._dirtyGeneration;
    }
    get cols(): number {
        return this._glyphs.cols;
    }
    get rows(): number {
        return this._glyphs.rows;
    }
    get stride(): number {
        return this._glyphs.stride;
    }

    bumpGeneration() {
        this._dirtyGeneration = this._generation;
        this._generation++;
        if (this._generation >= 255) {
            this._generation = 1;
        }
        this._generationBits = this._generation << 24;
    }

    clear(char_attr: number): void {
        Bitmap32Utils.Clear(this._glyphs, (char_attr & 0x00FFFFFF) | this._generationBits);
        this._dirtyGeneration = this._generation;
    }
    set(x: number, y: number, char_attr: number): void {
        Bitmap32Utils.Set(this._glyphs, x, y, (char_attr & 0x00FFFFFF) | this._generationBits);
        this._dirtyGeneration = this._generation;
    }
    hline(x: number, y: number, w: number, char_attr: number, pattern?:number): void {
        Bitmap32Utils.HLine(this._glyphs, x, y, w, (char_attr & 0x00FFFFFF) | this._generationBits, pattern || 0xFFFF_FFFF);
        this._dirtyGeneration = this._generation;
    }
    vline(x: number, y: number, h: number, char_attr: number, pattern?:number): void {
        Bitmap32Utils.VLine(this._glyphs, x, y, h, (char_attr & 0x00FFFFFF) | this._generationBits, pattern || 0xFFFF_FFFF);
        this._dirtyGeneration = this._generation;
    }
    fill(x: number, y: number, w: number, h: number, char_attr: number): void {
        Bitmap32Utils.Fill(this._glyphs, x, y, w, h, (char_attr & 0x00FFFFFF) | this._generationBits);
        this._dirtyGeneration = this._generation;
    }
    print(x:number, y:number, text:string|Array32, char_attr:number):void {
        Bitmap32Utils.Print(this._glyphs, x, y, text, (char_attr & 0x00FF0000) | this._generationBits);
        this._dirtyGeneration = this._generation;
    }
    border(x: number, y: number, w: number, h: number, char_attrs: number[]): void {
        if (char_attrs && char_attrs.length === 9) {
            const char_attrs_gen:Array<number> = new Array<number>(9);
            for(let i=0;i < 9;i++) {
                char_attrs_gen[i] = (char_attrs[i]! & 0x00FFFFFF) | this._generationBits
            }
            Bitmap32Utils.Border(this._glyphs, x, y, w, h, char_attrs_gen);
            this._dirtyGeneration = this._generation;
        }
    }
    blit(x: number, y: number, src: Bitmap32, sx?: number, sy?: number, sw?: number, sh?: number): void {
        // TODO: Complicated.
        this._dirtyGeneration = this._generation;
    }
}