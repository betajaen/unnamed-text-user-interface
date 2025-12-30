import { Bitmap32Utils } from "./bitmap-utils.ts";
import { Bitmap32 } from "./bitmap32.ts";
import { type IRaster } from "./raster.ts";
import type {RendererMetrics} from "../metrics.ts";
import { Array32 } from "./array32.ts";

export class PhasedRaster implements IRaster {

    private _glyphs: Bitmap32;
    private _phase:number = 0;
    private _phaseBit:number = 0;
    private _modified:boolean = false;

    constructor(cols: number, maxCols: number, rows: number) {
        this._glyphs = new Bitmap32(cols, rows, maxCols);
        this._glyphs.buffer.fill(0);
        this._phase = 0;
        this._phaseBit = 0;
        this._modified = true;
    }

    configure(metrics:RendererMetrics) {
        if (this._glyphs.rows != metrics.rows ||
            this._glyphs.cols != metrics.cols)
        {
            this._glyphs.cols = Math.min(this._glyphs.stride, metrics.cols);
        }
    }

    get phase() {
        return this._phase;
    }
    get phaseBit() {
        return this._phaseBit;
    }
    get glyphs() {
        return this._glyphs;
    }
    get modified(): boolean {
        return this._modified;
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

    beginRaster():number {
        return this._phaseBit;
    }

    endRaster() {
        this._modified = false;
        this._phase = (1 - this._phase) >>> 0;
        this._phaseBit = (this._phase << 31) >>> 0;
    }

    clear(char_attr: number): void {
        Bitmap32Utils.Clear(this._glyphs, (char_attr & 0x7FFF_FFFF) | this._phaseBit);
        this._modified = true;
    }
    set(x: number, y: number, char_attr: number): void {
        Bitmap32Utils.Set(this._glyphs, x, y, (char_attr & 0x7FFF_FFFF) | this._phaseBit);
        this._modified = true;
    }
    hline(x: number, y: number, w: number, char_attr: number, pattern?:number): void {
        Bitmap32Utils.HLine(this._glyphs, x, y, w, (char_attr & 0x7FFF_FFFF) | this._phaseBit, pattern || 0xFFFF_FFFF);
        this._modified = true;
    }
    vline(x: number, y: number, h: number, char_attr: number, pattern?:number): void {
        Bitmap32Utils.VLine(this._glyphs, x, y, h, (char_attr & 0x7FFF_FFFF) | this._phaseBit, pattern || 0xFFFF_FFFF);
        this._modified = true;
    }
    fill(x: number, y: number, w: number, h: number, char_attr: number, pattern?:number,): void {
        Bitmap32Utils.Fill(this._glyphs, x, y, w, h, (char_attr & 0x7FFF_FFFF) | this._phaseBit, pattern || 0xFFFF_FFFF);
        this._modified = true;
    }
    print(x:number, y:number, text:string|Array32, char_attr:number):void {
        Bitmap32Utils.Print(this._glyphs, x, y, text, (char_attr & 0x7FFF_0000) | this._phaseBit);
        this._modified = true;
    }
    border(x: number, y: number, w: number, h: number, char_attrs: number[]): void {
        if (char_attrs && char_attrs.length === 9) {
            const char_attrs_gen:Array<number> = new Array<number>(9);
            for(let i=0;i < 9;i++) {
                char_attrs_gen[i] = (char_attrs[i]! & 0x7FFF_FFFF) | this._phaseBit
            }
            Bitmap32Utils.Border(this._glyphs, x, y, w, h, char_attrs_gen);
            this._modified = true;
        }
    }
    blit(x: number, y: number, src: Bitmap32, sx?: number, sy?: number, sw?: number, sh?: number): void {
        // TODO: Complicated.
        this._modified = true;
    }
}