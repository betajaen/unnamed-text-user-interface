import { Atlas } from "./../atlas/atlas.ts";
import { AtlasSheet } from "./../atlas/atlas-sheet.ts";
import { PlainBuffer } from "../buffer/plain-buffer.ts";
import {ViewTools} from "./view-tools.ts";
import type {RendererMetrics} from "../metrics.ts";
import type {Bitmap32} from "../buffer/bitmap32.ts";

export class View {
    private _container: HTMLElement;
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _atlas:Atlas;
    private _metrics:RendererMetrics;
    private _forceRender:boolean = false;
    private _buffer:PlainBuffer;
    private _clearColour:string = '#000000'

    constructor(container:HTMLElement, canvas:HTMLCanvasElement|undefined, atlas:Atlas, metrics:RendererMetrics, buffer?:PlainBuffer|undefined, zIndex?:number) {
        this._container = container;

        if (canvas === undefined) {
            this._canvas = document.createElement('canvas');
            this._canvas.style.left = '0';
            this._canvas.style.top = '0';
            this._canvas.style.pointerEvents = 'none';
            this._canvas.style.zIndex = `${zIndex || 0}`;
            this._container.appendChild(this._canvas);
        }
        else {
            this._canvas = canvas;
        }

        this._ctx = this._canvas.getContext("2d")!;

        if (buffer === undefined) {
            this._buffer = new PlainBuffer(metrics.cols, metrics.maxCols, metrics.rows);
        }
        else {
            this._buffer = buffer;
        }

        this._metrics = { ...metrics };
        this._atlas = atlas;
    }

    configure(metrics:RendererMetrics, containerOnly?:boolean):void {

        this._container.style.left = metrics.containerLeft + 'px';
        this._container.style.top = metrics.containerTop + 'px';

        if (containerOnly) {
            return;
        }

        this._container.style.width = metrics.rendererWidth + 'px';
        this._container.style.height = metrics.rendererHeight + 'px';
        this._canvas.style.width = metrics.rendererWidth  + 'px';
        this._canvas.style.height = metrics.rendererHeight + 'px';
        this._canvas.width = metrics.rendererWidth * metrics.dpr;
        this._canvas.height = metrics.rendererHeight * metrics.dpr;
        this._ctx.setTransform(metrics.dpr, 0,0, metrics.dpr, 0,0);

        this._metrics = { ... metrics };

        this._forceRender = true;
    }

    renderGlyphAtXY(char_attr:number, x:number, y:number) {

        const entry = this._atlas.get(char_attr);
        const sheet = this._atlas.getSheet(entry.sheet)!;
        const M = this._metrics;

        const scaledW = M.cellWidth * M.dpr;
        const scaledH = M.cellHeight * M.dpr;

        this._ctx.drawImage(
            sheet.canvas,
            entry.x, entry.y, scaledW , scaledH,
            x, y, M.cellWidth, M.cellHeight
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

    get metrics():RendererMetrics {
        return this._metrics;
    }

    get cols() {
        return this._metrics.cols;
    }

    get rows() {
        return this._metrics.rows;
    }

    get cellW():number {
        return this._metrics.cellWidth;
    }

    get cellH():number {
        return this._metrics.cellHeight;
    }

    get dpr():number {
        return this._metrics.dpr;
    }

    get buffer() {
        return this._buffer;
    }

    set clearColour(clearColour:string) {
        this._clearColour = clearColour;
    }

    set buffer(buffer:PlainBuffer) {
        this._buffer = buffer;
        this._forceRender = true;
    }

    renderFromBuffer(buffer:PlainBuffer, force:boolean = false) {

        if (this.rows == 0 || this.cols == 0) {
            this._ctx.fillStyle = 'darkred';
            this._ctx.fillRect(0, 0, 1024, 1024);
            return;
        }

        if (force == false && buffer.dirty == false) {
            return;
        }

        if (force) {

            this._ctx.fillStyle = this._clearColour;
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

            ViewTools.RenderCopy(this._ctx, this, buffer, this._atlas);
        }
        else {
            if (buffer.dirty) {
                ViewTools.RenderCopyTested(this._ctx, this, buffer, this._atlas);
            }
        }

    }

    willRender():boolean {

        if (this.cellW === 0 || this.cellH === 0) {
            return false;
        }

        if (this._forceRender || (this._buffer != null && this._buffer.dirty)) {
            return true;
        }

        return false;
    }

    render() {

        if (this.cellW === 0 || this.cellH === 0) {
            return false;
        }

        if (this._forceRender || (this._buffer != null && this._buffer.dirty)) {

            if (this._buffer != null) {
                this.renderFromBuffer(this._buffer, this._forceRender);
            }
            else {
                const str = '<Empty Buffer>';
                const M = this._metrics;
                let x = 0, y = 0;

                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    let attr = (15 | (i << 4)) << 16
                    this.renderGlyphAtXY(char | attr, x, y);
                    x += M.cellWidth;
                }
            }

            this._forceRender = false;
        }

    }
}