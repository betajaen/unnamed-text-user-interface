import { Atlas } from "./../atlas/atlas.ts";
import { AtlasSheet } from "./../atlas/atlas-sheet.ts";
import { PlainBuffer } from "../buffer/plain-buffer.ts";
import {RendererUtils} from "./renderer-utils.ts";

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
    private _rendererBuffer:PlainBuffer|null = null;
    private _clearColour:string = '#000000'

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

    get width():number {
        return this._canvas.width;
    }

    get height():number {
        return this._canvas.height;
    }

    get cols() {
        return this._cols;
    }

    get rows() {
        return this._rows;
    }

    get cellW():number {
        return this._cellW;
    }

    get cellH():number {
        return this._cellH;
    }

    get dpr():number {
        return this._dpr;
    }

    get buffer() {
        return this._rendererBuffer;
    }

    set clearColour(clearColour:string) {
        this._clearColour = clearColour;
        document.body.style.backgroundColor = clearColour;
    }

    set buffer(buffer:PlainBuffer|null) {
        this._rendererBuffer = buffer;
        this._forceRender = true;
    }

    renderFromBuffer(buffer:PlainBuffer, force:boolean = false) {

        if (force == false && buffer.dirty == false) {
            return;
        }

        if (force) {
            RendererUtils.RenderCopy(this._ctx, this, buffer, this._atlas);
        }
        else {
            if (buffer.dirty) {
                RendererUtils.RenderCopyTested(this._ctx, this, buffer, this._atlas);
            }
        }

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

            this._ctx.fillStyle = this._clearColour;

            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);


            if (this._rendererBuffer != null) {
                this.renderFromBuffer(this._rendererBuffer, this._forceRender);
            }
            else {
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