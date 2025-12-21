import { Atlas } from "../atlas/atlas.ts";
import type {RendererBuffer} from "./renderer-buffer.ts";
import type {AtlasSheet} from "../atlas/atlas-sheet.ts";

const CHAR_ASPECT = 0.6;

export class Renderer {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _atlas:Atlas;
    private _cols:number;
    private _rows:number;
    private _dpr:number = 1;
    private _cellW:number = 0;
    private _cellH:number = 0;
    private _viewW:number = 0;
    private _viewH:number = 0;
    private _fontSize:number = 0;
    private _atlasDirty:boolean = false;
    private _forceRender:boolean = false;
    private _rendererBuffer:RendererBuffer|null = null;

    constructor(canvas:HTMLCanvasElement, atlas:Atlas,cols:number, rows:number) {
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d")!;
        this._atlas = atlas;
        this._cols = cols;
        this._rows = rows;
    }

    resize():void {
        this._dpr = window.devicePixelRatio || 1;

        const cellFromHeight = Math.floor(window.innerHeight / this._rows);
        const cellFromWidth = Math.floor(window.innerWidth / this._cols / CHAR_ASPECT);
        this._cellH = Math.min(cellFromHeight, cellFromWidth);


        //this._cellH = Math.floor(window.innerHeight / this._rows);
        this._cellW = Math.floor(this._cellH * CHAR_ASPECT);
        this._viewW = this._cellW * this._cols;
        this._viewH = this._cellH * this._rows;
        this._fontSize = this._cellH;

        console.log(this._dpr, this._cellW, this._cellH, this._viewW, this._viewH);

        this._canvas.width = this._viewW * this._dpr;
        this._canvas.height = this._viewH * this._dpr;
        this._canvas.style.width = this._viewW + 'px';
        this._canvas.style.height = this._viewH + 'px';

        this._ctx.setTransform(this._dpr, 0,0, this._dpr, 0,0);
        this._forceRender = true;
        this._atlasDirty = true;
    }

    renderGlyphAtXY(char_attr:number, x:number, y:number) {

        const entry = this._atlas.get(char_attr);
        const sheet = this._atlas.getSheet(entry.sheet)!;

        const scaledW = this._cellW * this._dpr;
        const scaledH = this._cellH * this._dpr;

        this._ctx.drawImage(
            sheet.canvas,
            entry.x, entry.y, scaledW , scaledH,
            x, y, this._cellW, this._cellH
        );
    }

    get cols() {
        return this._cols;
    }

    get rows() {
        return this._rows;
    }

    get buffer() {
        return this._rendererBuffer;
    }

    set buffer(buffer:RendererBuffer|null) {
        this._rendererBuffer = buffer;
        this._forceRender = true;
    }

    renderFromBuffer(buffer:RendererBuffer, force:boolean = false) {

        if (this._cols != buffer.cols || this._rows != buffer.rows) {
            this._ctx.fillStyle = 'red';
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
            return;
        }

        if (this._cols * this._rows != buffer.buffer.length) {
            return;
        }

        if (force == false && buffer.dirty == false) {
            return;
        }

        let x = 0, y = 0, idx = 0, stride = this._cols, rows = this._rows;
        let sheetNum = -1;
        let sheet:HTMLCanvasElement;
        const buf = buffer.buffer;
        const dirty = buffer.dirtyBuffer;
        const ctx = this._ctx;

        const cellW = this._cellW;
        const cellH = this._cellH;
        const scaledW = cellW * this._dpr;
        const scaledH = cellH * this._dpr;

        console.log('* RENDER BUFFER - BEGIN');

        if (force) {
            while (rows--) {
                stride = this._cols;
                while (stride--) {
                    const char_attr: number = buf[idx++]!;
                    if (char_attr != 0) {
                        const entry = this._atlas.get(char_attr);
                        if (entry.sheet != sheetNum) {
                            sheet = this._atlas.getSheet(entry.sheet)!.canvas;
                            sheetNum = entry.sheet;
                        }
                        ctx.drawImage(sheet,
                            entry.x, entry.y, scaledW, scaledH,
                            x, y, cellW, cellH);
                    }
                    x += cellW;
                }
                x = 0;
                y += cellH
            }
        }
        else {
            while(rows--) {
                stride = this._cols;
                while(stride--) {
                    if (dirty[idx] == 0) {
                        idx++;
                        x += cellW;
                        continue;
                    }

                    const char_attr:number = buf[idx++]!;
                    if (char_attr != 0) {
                        const entry = this._atlas.get(char_attr);
                        if (entry.sheet != sheetNum) {
                            sheet = this._atlas.getSheet(entry.sheet)!.canvas;
                            sheetNum = entry.sheet;
                        }
                        ctx.drawImage(sheet,
                            entry.x, entry.y, scaledW, scaledH,
                            x, y, cellW, cellH);
                    }
                    x += cellW;
                }
                x = 0;
                y += cellH
            }
        }

        buffer.clearDirty();
        console.log('* RENDER BUFFER - END');
    }


    render() {

        if (this._cellW === 0 || this._cellH === 0) {
            return;
        }

        if (this._atlasDirty) {
            this._atlasDirty = false;
            this._atlas.clear();
            this._atlas.configure(this._cellW, this._cellH, this._fontSize, this._dpr);
            this._forceRender = true;
        }

        if (this._forceRender || (this._rendererBuffer != null && this._rendererBuffer.dirty)) {

            if (this._rendererBuffer != null) {
                this.renderFromBuffer(this._rendererBuffer, this._forceRender);
            }
            else {
                this._ctx.fillStyle = 'blue';
                this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

                const str = '<Empty Buffer>';
                let x = 0, y = 0;

                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    let attr = (15 | (i << 4)) << 16
                    this.renderGlyphAtXY(char | attr, x, y);
                    x += this._cellW;
                }
            }

            this._forceRender = false;
        }

    }
}