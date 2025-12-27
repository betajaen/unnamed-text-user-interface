import { Atlas } from "./../atlas/atlas.ts";
import { AtlasSheet } from "./../atlas/atlas-sheet.ts";
import { PlainBuffer } from "../buffer/plain-buffer.ts";
import {RendererUtils} from "./renderer-utils.ts";
import type {RendererMetrics} from "../metrics.ts";

export class Renderer {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _atlas:Atlas;
    private _cols:number = 0;
    private _rows:number = 0;
    private _dpr:number = 1;
    private _cellW:number = 0;
    private _cellH:number = 0;
    private _viewW:number = 0;
    private _viewH:number = 0;
    private _forceRender:boolean = false;
    private _rendererBuffer:PlainBuffer|null = null;
    private _clearColour:string = '#000000'

    constructor(canvas:HTMLCanvasElement, atlas:Atlas, metrics:RendererMetrics) {
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d")!;
        this._atlas = atlas;
    }

    configure(metrics:RendererMetrics):void {
        this._rows = metrics.rows;
        this._cols = metrics.cols;
        this._cellW = metrics.cellWidth;
        this._cellH = metrics.cellHeight;
        this._viewW = metrics.rendererWidth;
        this._viewH = metrics.rendererHeight;
        this._dpr = metrics.dpr;

        this._canvas.width = this._viewW * this._dpr;
        this._canvas.height = this._viewH * this._dpr;
        this._canvas.style.width = this._viewW + 'px';
        this._canvas.style.height = this._viewH + 'px';

        this._ctx.setTransform(this._dpr, 0,0, this._dpr, 0,0);
        this._forceRender = true;
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

    forceRender() {
        this._forceRender = true;
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

        if (this._rows == 0 || this._cols == 0) {
            this._ctx.fillStyle = 'darkred';
            this._ctx.fillRect(0, 0, 1024, 1024);
            return;
        }

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