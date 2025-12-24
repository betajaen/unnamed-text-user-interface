import { Palette } from "../renderer/palette.ts";
import { AtlasSheet } from "./atlas-sheet.ts";
import { type AtlasGlyph } from "./atlas-glyph.ts";

const FONT_FAMILY = '"Cascadia Code", Menlo, monospace';
const ASCENT_GLYPHS = ['M', '[', '|'];
const DESCENT_GLYPHS = ['g', 'M', '|'];

const SPECIAL_GLYPHS:string[] = [
    "\u258c", // 50% horz
    "\u2584", // 50% vert
    "\u2594", // 12.5% horz-top
    "\u2581" //  12.5% horz-bottom
]

function isBoxDrawing(charCode: number): boolean {
    return charCode >= 0x2500 && charCode <= 0x257F;
}

export class Atlas {
    private _palette:Palette;
    private _sheets:Array<AtlasSheet> = new Array<AtlasSheet>();
    private _entries:Map<number, AtlasGlyph> = new Map<number, AtlasGlyph>();
    private _cellW:number = 0;
    private _cellH:number = 0;
    private _fontSize = 0;
    private _dpr = 0;
    private _tempCanvas:HTMLCanvasElement
    private _tempContext:CanvasRenderingContext2D
    private _scaledFontSize:number = 0;
    private _fontAscent:number = 0;
    private _fontDescent:number = 0;
    private _realCellW:number = 0;
    private _realCellH:number = 0;
    private _fontHeight:number = 0;
    private _aspect_ratio:number = 0;
    private _glyph_grid:number = 0;
    private _glyph_middle_x:number = 0;
    private _glyph_middle_y:number = 0;
    private _glyph_top:number = 0;

    constructor(palette:Palette) {
        this._palette = palette;
        this._tempCanvas = document.createElement('canvas');
        this._tempContext = this._tempCanvas.getContext('2d', {alpha: false});
        this._tempCanvas.width = 128;
        this._tempCanvas.height = 128;
    }

    clear() {
        this._entries.clear();
        for(const sheet of this._sheets) {
            sheet.clear();
        }
    }

    configure(cellW:number, cellH:number, fontSize:number, dpr:number):void {

        if (this._cellW === cellW && this._cellH === cellH && this._fontSize === fontSize && this._dpr === dpr) {
            return;
        }

        this.clear();

        this._cellW = cellW;
        this._cellH = cellH;
        this._fontSize = fontSize;
        this._dpr = dpr;

        const scaledFontSize = fontSize * dpr;
        const scaledCellH = cellH * dpr;
        const scaledCellW = cellW * dpr;
        this._tempContext.textbaseLine = 'alphabetic';
        let adjustedFontSize = scaledFontSize;
        let maxAscent = 0, maxDescent = 0;

        for (let i = 0; i < 5; i++) {
            this._tempContext.font = `${adjustedFontSize}px ${FONT_FAMILY}`;

            maxAscent = 0, maxDescent = 0;
            for (const glyph of ASCENT_GLYPHS) {
                const metric = this._tempContext.measureText(glyph);
                maxAscent = Math.max(maxAscent, metric.actualBoundingBoxAscent);
            }
            for (const glyph of DESCENT_GLYPHS) {
                const metric = this._tempContext.measureText(glyph);
                maxDescent = Math.max(maxDescent, metric.actualBoundingBoxDescent);
            }

            const fontHeight = maxAscent + maxDescent;
            if (fontHeight <= scaledCellH) {
                break;  // Fits, done
            }

            adjustedFontSize *= scaledCellH / fontHeight;
        }

        this._scaledFontSize = adjustedFontSize;
        this._fontAscent = maxAscent;
        this._fontDescent = maxDescent;
        this._fontHeight = maxAscent + maxDescent;
        this._realCellW = scaledCellW;
        this._realCellH = scaledCellH;
        this._tempContext.font = `${this._scaledFontSize}px ${FONT_FAMILY}`;

        this._glyph_grid = this._realCellW / 3;
        this._glyph_top = (this._realCellH - (this._glyph_grid * 3)) / 2;
        this._glyph_middle_x = this._glyph_grid * 1.5;
        this._glyph_middle_y = this._glyph_top+ this._glyph_grid * (3/2);
        this._aspect_ratio = this._realCellH / this._realCellW;

    }

    get(char_attr:number):AtlasGlyph {
        let entry = this._entries.get(char_attr);
        if (entry === undefined) {
            entry = this.render(char_attr)!;
        }
        return entry;
    }

    getSheet(id:number):AtlasSheet {
        return this._sheets[id]!;
    }

    public renderTo(dstCtx:CanvasRenderingContext2D, char_attr:number, x:number,y:number) {
        const entry = this.get(char_attr);
        const sheet = this._sheets[entry.sheet]!;
        dstCtx.drawImage(sheet.canvas,
            entry.x, entry.y, this._realCellW, this._realCellH,
            x, y, this._realCellW, this._realCellH);
    }

    private render(char_attr:number):AtlasGlyph {
        let char = char_attr & 0x0000FFFF;
        let attr = (char_attr & 0xFFFF0000) >> 16;

        if (char === 0x2588) {
            char = 1;
        }

        const fg = (attr & 0xF);
        const bg = (attr >> 4) & 0xF;
        const ctx = this._tempContext;

        if (char > 32) {
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, this._realCellW, this._realCellH);

            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.textBaseLine = 'alphabetic';

            const charStr = String.fromCharCode(char);
            const metrics = ctx.measureText(charStr);
            const charX = Math.round((this._realCellW - metrics.width) / 2);
            const charY = Math.round(((this._realCellH - this._fontHeight) / 2) + this._fontAscent);

            ctx.fillText(charStr, charX, charY);
        }
        else {
            this.renderSpecial(ctx, char, fg, bg);
        }

        for(const sheet of this._sheets) {
            const entry:AtlasGlyph|null = sheet.allocate(this._realCellW, this._realCellH);
            if (entry !== null) {
                sheet.ctx.drawImage(this._tempCanvas, 0, 0, this._realCellW, this._realCellH, entry.x, entry.y, this._realCellW, this._realCellH);
                this._entries.set(char_attr, entry);
                return entry;
            }
        }

        const sheet = new AtlasSheet(this._sheets.length);
        this._sheets.push(sheet);
        const entry:AtlasGlyph|null = sheet.allocate(this._realCellW, this._realCellH);
        if (entry === null) {
            throw `Character is too large for atlas`;
        }
        sheet.ctx.drawImage(this._tempCanvas, 0, 0, this._realCellW, this._realCellH, entry.x, entry.y, this._realCellW, this._realCellH);
        this._entries.set(char_attr, entry);
        return entry;
    }

    renderSpecial(ctx:CanvasRenderingContext2D, char:number,  fg:number, bg:number) {

        const w = this._realCellW;
        const h = this._realCellH;
        const xm = this._glyph_middle_x;
        const ym = this._glyph_middle_y;
        const gs  = Math.round(this._glyph_grid * 0.5);
        const gsh = gs * 0.5;
        const aspect = this._aspect_ratio;

        if (char == 0) {
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(0, 0, w, h);
        }
        else if (char == 32) {
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
        }
        else if (char >= 1 && char <= 3) {
            // Vert Line - Left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            if (char == 1) { // Left Vert
                ctx.moveTo(gsh, 0);
                ctx.lineTo(gsh, h);
            }
            else if (char == 2) { // Mid Vert
                ctx.moveTo(xm, 0);
                ctx.lineTo(xm, h);
            }
            else { // Right Vert
                ctx.moveTo(w-gsh, 0);
                ctx.lineTo(w-gsh, h);
            }
            ctx.stroke();
        }

        else if (char >= 4 && char <= 6) {
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            if (char == 4) { // Top Horz
                ctx.moveTo(0, gsh);
                ctx.lineTo(w, gsh);
            }
            else if (char == 5) { // Mid Horz
                ctx.moveTo(0, ym);
                ctx.lineTo(w, ym);
            }
            else { // Bottom Horz
                ctx.moveTo(0, h-gsh);
                ctx.lineTo(w, h-gsh);
            }
            ctx.stroke();
        }

        else if (char >= 7 && char <= 10) { // 'Arrows'
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = 0;

            const hh = h / 2;
            const ww = w / 4;

            let lx,ly,mx,my,rx,ry;

            if (char == 7) { // left
                lx = ww
                ly = hh ;
                mx = w - ww;
                my = hh - ww;
                rx = mx;
                ry = hh + ww;
            }

            else if (char == 8) { // up
                lx = w / 2;
                ly = hh - ww;
                mx = w - ww;
                my = hh + ww;
                rx = ww;
                ry = hh + ww;
            }

            else if (char == 9) { // right / tab
                lx = ww
                ly = hh - ww;
                mx = w - ww;
                my = hh;
                rx = ww;
                ry = hh + ww;
            }

            else if (char == 10) { // down / nl
                lx = w / 2;
                ly = hh + ww;
                mx = w - ww;
                my = hh - ww;
                rx = ww;
                ry = hh - ww;
            }

            ctx.beginPath();
            ctx.lineTo(lx, ly);
            ctx.lineTo(mx, my);
            ctx.lineTo(rx, ry);
            ctx.lineTo(lx, ly);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        else if (char == 11) {
            // Top-Left outer corner
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(gsh, h);
            ctx.lineTo(0+gsh, 0+gsh);
            ctx.lineTo(w-gsh,gsh);
            ctx.stroke();
        }

        else if (char == 12) {
            // Top-Right outer corner
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(gsh, gsh);
            ctx.lineTo(w-gsh, gsh);
            ctx.lineTo(w-gsh, h-gsh);
            ctx.stroke();
        }

        else if (char == 13) {
            // Bottom-Right outer corner
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(w-gsh, gsh);
            ctx.lineTo(w-gsh, h-gsh);
            ctx.lineTo(gsh, h-gsh);
            ctx.stroke();
        }

        else if (char == 14) {
            // Bottom-Left outer corner
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(w-gsh, h-gsh);
            ctx.lineTo(gsh, h-gsh);
            ctx.lineTo(gsh, gsh);
            ctx.stroke();
        }

        else if (char == 15) {
            // Mid top-left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(xm, h);
            ctx.lineTo(xm, ym);
            ctx.lineTo(w, ym);
            ctx.stroke();
        }

        else if (char == 16) {
            // Mid top-right
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(0, ym);
            ctx.lineTo(xm, ym);
            ctx.lineTo(xm, h);
            ctx.stroke();
        }

        else if (char == 17) {
            // Mid bottom-left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(xm, 0);
            ctx.lineTo(xm, ym);
            ctx.lineTo(w, ym);
            ctx.stroke();
        }

        else if (char == 18) {
            // Mid bottom-left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(xm, 0);
            ctx.lineTo(xm, ym);
            ctx.lineTo(0, ym);
            ctx.stroke();
        }

        else if (char == 19) {
            // Square Bottom Right
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(w-gs,h-gs, gs, gs);
        }

        else if (char == 20) {
            // Square Bottom Left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(0,h-gs, gs, gs);
        }

        else if (char == 21) {
            // Square Top right
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(w-gs,0, gs, gs);
        }

        else if (char == 22) {
            // Square Top Left
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(0,0, gs, gs);
        }

        else if (char == 23) {
            // Shadow bottom
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(0, gsh);
            ctx.lineTo(w, gsh);
            ctx.moveTo(0, gsh*4);
            ctx.lineTo(w, gsh*4);
            ctx.stroke();
        }

        else if (char == 24) {
            // Shadow bottom-right
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.fillRect(0,0, gs, gs);
            ctx.fillRect(gs*1.5,0, gs, gs*2.5);
            ctx.fillRect(0,gs*1.5, gs*2, gs);
        }

        else if (char == 25) {
            // Shadow right
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs;
            ctx.moveTo(gsh, 0);
            ctx.lineTo(gsh, h);
            ctx.moveTo(gsh*4, 0);
            ctx.lineTo(gsh*4, h);
            ctx.stroke();
        }

        else if (char == 26) {

            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this._palette.getHexColourChecked(fg);

            let k = 0;
            const s = 6;
            let sx = 0;
            let sy = 0;
            const sw = w / s;
            const sh = h / s;

            for(let j=0;j < s;j++) {
                for(let i=0;i < s;i++) {
                    k = 1 - k;
                    if (k==1) {
                        ctx.fillRect(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2);
                    }
                    sx += sw;
                }
                sx = 0;
                sy += sh;
                k = 1- k;
            }

        }

        else if (char == 27) {
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs * 2;
            ctx.beginPath();

            let ww = w;

            let x = -ww * 0.5
            let y = -h * 0.5;

            ctx.moveTo(x, y);
            ctx.lineTo(x + ww, y + h);
            ctx.stroke();

            x += ww;

            ctx.moveTo(x, y);
            ctx.lineTo(x + ww, y + h);
            ctx.stroke();

            x = -ww * 0.5;
            y += h;

            ctx.moveTo(x, y);
            ctx.lineTo(x + ww, y + h);
            ctx.stroke();
            x += ww;
            ctx.moveTo(x, y);
            ctx.lineTo(x + ww, y + h);
            ctx.stroke();

        }



        else {
            ctx.fillStyle = this._palette.getHexColourChecked(bg);
            ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.lineWidth = gs/4;
            ctx.moveTo(0, 0);
            ctx.lineTo(w, h);
            ctx.moveTo(w, 0);
            ctx.lineTo(0, h);
            ctx.stroke();
        }




    }
}