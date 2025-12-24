import type {AtlasGlyph} from "./atlas-glyph.ts";

const SHEET_SIZE:number = 512;

export class AtlasSheet {
    private _canvas: HTMLCanvasElement;
    private _ctx:CanvasRenderingContext2D;
    private _nextX:number = 0;
    private _nextY:number = 0;
    private _rowHeight:number = 0;
    private _id:number = 0;

    constructor(id:number) {
        this._canvas = document.createElement('canvas');
        this._canvas.width = SHEET_SIZE;
        this._canvas.height = SHEET_SIZE;
        this._ctx = this._canvas.getContext('2d', { alpha: false });
        this._id = id;
    }

    get canvas():HTMLCanvasElement {
        return this._canvas;
    }

    get ctx():CanvasRenderingContext2D {
        return this._ctx;
    }

    allocate(w:number, h:number):AtlasGlyph|null {

        let nx = this._nextX;
        let ny = this._nextY;
        let rh = this._rowHeight;

        if (this._nextX + w > SHEET_SIZE) {
            nx = 0;
            ny += rh;
            rh = 0;
        }

        if (ny + h > SHEET_SIZE) {
            return null;
        }

        this._nextX = nx + w;
        this._nextY = ny;
        this._rowHeight = Math.max(rh, h);

        return { x: nx, y: ny, sheet: this._id } as AtlasGlyph;
    }


    clear():void {
        this._nextY = 0;
        this._nextY = 0;
        this._rowHeight = 0;
    }

}