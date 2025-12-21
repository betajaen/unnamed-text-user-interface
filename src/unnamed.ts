import { type Colour, Palette} from "./renderer/palette.ts";
import { Renderer} from "./renderer/renderer.ts";
import { Atlas } from "./atlas/atlas.ts";
import { RendererBuffer } from "./renderer/renderer-buffer.ts";

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
    cols?: number,
    rows?: number,
    palette?: Array<string|Colour>;
}

export class Unnamed {
    private _renderer:Renderer;
    private _atlas:Atlas;
    private _palette = new Palette();
    private _tickTimer: ReturnType<typeof setInterval> | null = null;
    private _resizeNeeded: boolean = false;
    private _tempBuffer:RendererBuffer;

    constructor(config:UnnamedConfig) {

        this.tick = this.tick.bind(this);

        this.palette.set(0,  0x1f, 0x0e, 0x1c);  // 0  - Near black (dark purple)
        this.palette.set(1,  0x17, 0x43, 0x4b);  // 1  - Dark teal
        this.palette.set(2,  0x3e, 0x21, 0x37);  // 2  - Dark plum
        this.palette.set(3,  0x70, 0x37, 0x7f);  // 3  - Purple
        this.palette.set(4,  0x58, 0x45, 0x63);  // 4  - Muted purple
        this.palette.set(5,  0x9d, 0x30, 0x3b);  // 5  - Crimson
        this.palette.set(6,  0x64, 0x7d, 0x34);  // 6  - Olive green
        this.palette.set(7,  0x34, 0x85, 0x9d);  // 7  - Medium teal
        this.palette.set(8,  0x9a, 0x63, 0x48);  // 8  - Brown/rust
        this.palette.set(9,  0x8c, 0x8f, 0xae);  // 9  - Lavender
        this.palette.set(10, 0xd2, 0x64, 0x71);  // 10 - Rose/pink
        this.palette.set(11, 0x7e, 0xc4, 0xc1);  // 11 - Light teal
        this.palette.set(12, 0xe4, 0x94, 0x3a);  // 12 - Orange
        this.palette.set(13, 0xc0, 0xc7, 0x41);  // 13 - Lime
        this.palette.set(14, 0xd7, 0x9b, 0x7d);  // 14 - Tan/peach
        this.palette.set(15, 0xf5, 0xed, 0xba);  // 15 - Cream

        this._atlas = new Atlas(this._palette);
        this._renderer = new Renderer(config.canvas, this._atlas, config.cols || 80, config.rows || 40);
        this._tempBuffer = new RendererBuffer(this._renderer.cols, this._renderer.rows);
        this._renderer.buffer = this._tempBuffer;
        this._tempBuffer.print(0,0, "Hello World!!", 0x003F0000);

        window.addEventListener("resize", () => {
            this._resizeNeeded = true;
        });

        this._tickTimer = setInterval(this.tick, 30);
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

    tick() {
        if (this._resizeNeeded) {
            this._resizeNeeded = false;
            this._renderer.dirty = true;
            this._renderer.resize();
        }

        this._renderer.render();
    }
}