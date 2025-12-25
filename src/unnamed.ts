import { type Colour, Palette} from "./renderer/palette.ts";
import { Renderer} from "./renderer/renderer.ts";
import { Atlas } from "./atlas/atlas.ts";

import {PlainBuffer} from "./buffer/plain-buffer.ts";
import {type RendererMetrics, calculateRendererMetrics } from "./metrics.ts";

export const DefaultPalette = [
    '#1f0e1c',  // 0  - Near black (dark purple)
    '#17434b',  // 1  - Dark teal
    '#3e2137',  // 2  - Dark plum
    '#70377f',  // 3  - Purple
    '#584563',  // 4  - Muted purple
    '#9d303b',  // 5  - Crimson
    '#647d34',  // 6  - Olive green
    '#34859d',  // 7  - Medium teal
    '#9a6348',  // 8  - Brown/rust
    '#8c8fae',  // 9  - Lavender
    '#d26471',  // 10 - Rose/pink
    '#7ec4c1',  // 11 - Light teal
    '#e4943a',  // 12 - Orange
    '#c0c741',  // 13 - Lime
    '#d79b7d',  // 14 - Tan/peach
    '#f5edba',  // 15 - Cream
];

export type UnnamedConfig = {
    canvas: HTMLCanvasElement,
    minCols?: number,
    maxCols?: number,
    rows?: number,
    palette?: Array<Colour>;
}

export class Unnamed {
    private _renderer:Renderer;
    private _atlas:Atlas;
    private _palette = new Palette();
    private _tickTimer: ReturnType<typeof setInterval> | null = null;
    private _resizeNeeded: boolean = false;
    private _tempBuffer:PlainBuffer;
    private _minCols:number;
    private _maxCols:number;
    private _rows:number;
    private _metrics:RendererMetrics;

    constructor(config:UnnamedConfig) {

        this.tick = this.tick.bind(this);
        this.onresize = this.onresize.bind(this);

        if (config.palette === undefined) {
            this.palette.set(0, 0x1f, 0x0e, 0x1c);  // 0  - Near black (dark purple)
            this.palette.set(1, 0x17, 0x43, 0x4b);  // 1  - Dark teal
            this.palette.set(2, 0x3e, 0x21, 0x37);  // 2  - Dark plum
            this.palette.set(3, 0x70, 0x37, 0x7f);  // 3  - Purple
            this.palette.set(4, 0x58, 0x45, 0x63);  // 4  - Muted purple
            this.palette.set(5, 0x9d, 0x30, 0x3b);  // 5  - Crimson
            this.palette.set(6, 0x64, 0x7d, 0x34);  // 6  - Olive green
            this.palette.set(7, 0x34, 0x85, 0x9d);  // 7  - Medium teal
            this.palette.set(8, 0x9a, 0x63, 0x48);  // 8  - Brown/rust
            this.palette.set(9, 0x8c, 0x8f, 0xae);  // 9  - Lavender
            this.palette.set(10, 0xd2, 0x64, 0x71);  // 10 - Rose/pink
            this.palette.set(11, 0x7e, 0xc4, 0xc1);  // 11 - Light teal
            this.palette.set(12, 0xe4, 0x94, 0x3a);  // 12 - Orange
            this.palette.set(13, 0xc0, 0xc7, 0x41);  // 13 - Lime
            this.palette.set(14, 0xd7, 0x9b, 0x7d);  // 14 - Tan/peach
            this.palette.set(15, 0xf5, 0xed, 0xba);  // 15 - Cream
        }
        else {
            this.palette.setFrom(config.palette);
        }

        this._rows = Math.max(20, config.rows || 40);
        this._maxCols = Math.max(40, config.maxCols || 80);
        this._minCols = Math.max(20, config.minCols || 20);
        this._metrics = calculateRendererMetrics(
            window.innerWidth,
            window.innerHeight,
            window.devicePixelRatio || 1,
            this._minCols,
            this._maxCols,
            this._rows
        );
        console.log(this._metrics.cols, this._metrics.rows, this._metrics.rendererWidth, this._metrics.rendererHeight)
        console.log("maxCols", this._maxCols);

        this._tempBuffer = new PlainBuffer(this._metrics.cols, this._maxCols, this._metrics.rows);
        this._atlas = new Atlas(this._palette);
        this._atlas.configure(this._metrics);

        this._renderer = new Renderer(
            config.canvas, this._atlas, this._metrics
        );
        this._renderer.clearColour = this.palette.getHexColour(0);
        this._renderer.buffer = this._tempBuffer;

        this.testPattern();


        this._tickTimer = setInterval(this.tick, 30);
        window.addEventListener("resize", this.onresize);
        this._resizeNeeded = true;

    }

    get palette():Palette {
        return this._palette;
    }

    get atlas():Atlas {
        return this._atlas;
    }

    get renderer():Renderer {
        return this._renderer;
    }

    get cols():number {
        return this._metrics.cols;
    }

    get rows():number {
        return this._metrics.rows;
    }

    onresize() {
        let newMetrics = calculateRendererMetrics(
            window.innerWidth,
            window.innerHeight,
            window.devicePixelRatio || 1,
            this._minCols,
            this._maxCols,
            this._rows
        );

        if (this._metrics === undefined ||
            newMetrics.cols != this._metrics.cols ||
            newMetrics.rows != this._metrics.rows ||
            newMetrics.cellWidth != this._metrics.cellWidth ||
            newMetrics.cellHeight != this._metrics.cellHeight ||
            newMetrics.rendererWidth != this._metrics.rendererWidth ||
            newMetrics.rendererHeight != this._metrics.rendererHeight)
        {
            this._metrics = newMetrics;
            this._resizeNeeded = true;

            console.log(this._metrics.cols, this._metrics.rows, this._metrics.rendererWidth, this._metrics.rendererHeight)
        }
    }

    tick() {
        if (this._resizeNeeded) {
            this._resizeNeeded = false;
            this._tempBuffer.configure(this._metrics);
            this._atlas.configure(this._metrics);
            this._renderer.configure(this._metrics);
            this.testPattern();
            this._renderer.forceRender();
        }
        this._renderer.render();
    }

    testPattern() {

        this._tempBuffer.clear(0);
        let i=1;
        this._tempBuffer.print(0, 0, ">", 0x003F0000);
        this._tempBuffer.print(0, 1, ">", 0x003F0000);
        for(;i < this.cols-1;i++) {
            let num = i.toString();
            if (num.length > 1) {
                this._tempBuffer.print(i, 0, num[0]!, 0x003F0000);
                this._tempBuffer.print(i, 1, num[1]!, 0x003F0000);
            }
            else{
                this._tempBuffer.print(i, 0, "0", 0x003F0000);
                this._tempBuffer.print(i, 1, num[0]!, 0x003F0000);
            }
        }
        this._tempBuffer.print(i, 0, "<", 0x003F0000);
        this._tempBuffer.print(i, 1, "<", 0x003F0000);
        this._tempBuffer.print(0,3, "Hello World!!", 0x003F0000);
        this._tempBuffer.print(2,4, "\x00", 0x003F0000);
        this._tempBuffer.print(2,5, "Vert:\x00\x01\x00\x02\x00\x03", 0x003F0000);
        this._tempBuffer.print(2,6, "Horz:\x00\x04\x00\x05\x00\x06", 0x003F0000);
        this._tempBuffer.print(2,7, "Bloc:\x00\x07\x00\x08", 0x003F0000);
        this._tempBuffer.print(2,8, "Text:\x00\x09\x00\x0A", 0x003F0000);
        this._tempBuffer.print(2,9, "Cor1:\x00\x0B\x00\x0C\x00\x0D\x00\x0E", 0x003F0000);
        this._tempBuffer.print(2,10, "Cor2:\x00\x0F\x00\x10\x00\x11\x00\x12", 0x003F0000);
        this._tempBuffer.print(2,11, "Cor3:\x00\x13\x00\x14\x00\x15\x00\x16", 0x003F0000);
        this._tempBuffer.print(2,12, "Shad:\x00\x17\x00\x18\x00\x19", 0x003F0000);
        this._tempBuffer.print(2,13, "Patn:\x00\x1A\x00\x1B", 0x003F0000);
        this._tempBuffer.print(2,14, "Rsvd:\x00\x1C\x00\x1D\x00\x1E\x00\x1F", 0x003F0000);

        //this._tempBuffer.print(2,6, "\x05\x00\x06\x00\x07\x00\x08\x00\x09\x00\x0A", 0x003F0000);


        this._tempBuffer.print(15,3, "[]MWgy#£!|", 0x003F0000);
        //this._tempBuffer.print(2,8, "\x08\x09\x0a", 0x003F0000);

        //this._tempBuffer.fill(2, 5, 40, 6, 0x004E0054);

        this._tempBuffer.border(9, 14, 30, 10,
            [
                19 | 0x000F0000,
                6 | 0x000F0000,
                20 | 0x000F0000,

                3 | 0x000F0000,
                0 | 0x002A0000,
                1 | 0x000F0000,

                21 | 0x000F0000,
                4 | 0x000F0000,
                22 | 0x000F0000,
            ])


        this._tempBuffer.border(9, 25, 30, 10,
            [
                19 | 0x000F0000,
                6 | 0x000F0000,
                20 | 0x000F0000,

                3 | 0x000F0000,
                26 | 0x000E0000,
                25 | 0x000F0000,

                21 | 0x000F0000,
                23 | 0x000F0000,
                24 | 0x000F0000,
            ])

    }
}