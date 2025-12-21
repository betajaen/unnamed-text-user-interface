import { Palette } from "../renderer/palette.ts";
import { AtlasSheet } from "./atlas-sheet.ts";
import { type AtlasGlyph } from "./atlas-glyph.ts";

const FONT_FAMILY = '"Cascadia Code", Menlo, monospace';
const ASCENT_GLYPHS = ['M', '['];
const DESCENT_GLYPHS = ['g', 'M'];

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

        console.log('Updating Atlas');

        this.clear();

        this._cellW = cellW;
        this._cellH = cellH;
        this._fontSize = fontSize;
        this._dpr = dpr;

        console.log('ATLAS.1', this._cellW, this._cellH, this._fontSize, this._dpr);

        const scaledFontSize = fontSize * dpr;
        const scaledCellH = cellH * dpr;
        const scaledCellW = cellW * dpr;
        this._tempContext.font = `${scaledFontSize}px ${FONT_FAMILY}`;
        this._tempContext.textbaseLine = 'alphabetic';
        let maxAscent = 0, maxDescent = 0;
        for(const glyph of ASCENT_GLYPHS) {
            const metric = this._tempContext.measureText(glyph);
            if (metric.actualBoundingBoxAscent > maxAscent) {
                maxAscent = metric.actualBoundingBoxAscent;
            }
        }
        for(const glyph of DESCENT_GLYPHS) {
            const metric = this._tempContext.measureText(glyph);
            if (metric.actualBoundingBoxDescent > maxDescent) {
                maxDescent = metric.actualBoundingBoxDescent;
            }
        }
        this._scaledFontSize = scaledFontSize;
        this._fontAscent = maxAscent;
        this._fontDescent = maxDescent;
        this._fontHeight = maxAscent + maxDescent;
        this._realCellW = scaledCellW;
        this._realCellH = scaledCellH;
        this._tempContext.font = `${scaledFontSize}px ${FONT_FAMILY}`;
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
/*
        console.log('renderTo',
            entry, sheet,
            this._cellW, this._cellH,
            );
*/
        dstCtx.drawImage(sheet.canvas,
            entry.x, entry.y, this._realCellW, this._realCellH,
            x, y, this._realCellW, this._realCellH);
    }

    private render(char_attr:number):AtlasGlyph {
        let char = char_attr & 0x0000FFFF;
        let attr = (char_attr & 0xFFFF0000) >> 16;

        if (char < 32 || char === 0x2588) {
            char = 32;
        }

        const fg = (attr & 0xF);
        const bg = (attr >> 4) & 0xF;
        const ctx = this._tempContext;
        ctx.fillStyle = this._palette.getHexColourChecked(bg);
        ctx.fillRect(0, 0, this._realCellW, this._realCellH);

        if (char > 32) {
            ctx.fillStyle = this._palette.getHexColourChecked(fg);
            ctx.textBaseLine = 'alphabetic';

            const charStr = String.fromCharCode(char);
            const metrics = ctx.measureText(charStr);
            const charX = Math.round((this._realCellW - metrics.width) / 2);
            const charY = Math.round(((this._realCellH - this._fontHeight) / 2) + this._fontAscent);

            ctx.fillText(charStr, charX, charY);
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
}