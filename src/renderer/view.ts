import { Atlas } from "./../atlas/atlas.ts";
import { AtlasSheet } from "./../atlas/atlas-sheet.ts";
import { PhasedRaster } from "../bitmap/phased-raster.ts";
import {ViewTools} from "./view-tools.ts";
import type {RendererMetrics} from "../metrics.ts";
import type {Bitmap32} from "../bitmap/bitmap32.ts";

export class View {
    private _container: HTMLElement;
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _atlas:Atlas;
    private _metrics:RendererMetrics;
    private _forceRender:boolean = false;
    private _buffer:PhasedRaster;
    private _clearColour:string = '#000000'

    constructor(container:HTMLElement, canvas:HTMLCanvasElement|undefined, atlas:Atlas, metrics:RendererMetrics, buffer?:PhasedRaster|undefined, zIndex?:number) {
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
            this._buffer = new PhasedRaster(metrics.cols, metrics.maxCols, metrics.rows);
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

    set buffer(buffer:PhasedRaster) {
        this._buffer = buffer;
        this._forceRender = true;
    }

    willRender():boolean {

        if (this.cellW === 0)
            return false;

        if (this.cellH === 0)
            return false;

        if (this._forceRender == false)
            return false;

        if (this._buffer === null)
            return false;

        if (this._buffer.dirty === false)
            return false;

        return true;
    }

    render() {

        if (this.willRender() == false)
            return;

        if (this._forceRender) {
            this._ctx.fillStyle = this._clearColour;
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
            ViewTools.Copy(this._ctx, this._buffer, this._atlas, this._metrics);
        }
        else {
            if (this._buffer.dirty) {
                ViewTools.CopyTested(this._ctx, this._buffer, this._atlas, this._metrics);
            }
        }

        this._forceRender = false;

    }

}