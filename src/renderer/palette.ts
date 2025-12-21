export const MAX_COLOURS = 16;

export type Colour = {
    r: number;
    g: number;
    b: number;
}

function colourToHex(colour:Colour) {
    return `#${colour.r.toString(16).padStart(2, '0')}${colour.g.toString(16).padStart(2, '0')}${colour.b.toString(16).padStart(2, '0')}`
}

export class Palette {
    private _colours:Array<Colour> = new Array<Colour>();
    private _hexColours:Array<string> = new Array<string>();

    constructor() {
        for(let i=0;i < MAX_COLOURS;i++) {
            this._colours.push({ r: 0xFF, g: 0xFF, b: 0xFF} as Colour);
            this._hexColours.push('#FFFFFF');
        }
        this.set(0, 0, 0, 0)
    }

    set(idx:number, r:number, g:number, b: number) {
        if (idx < 0 || idx >= MAX_COLOURS)
            throw `Out of bounds ${idx}`;
        const col:Colour = { r: r, g:g, b:b } as Colour
        this._colours[idx] = col;
        this._hexColours[idx] = colourToHex(col);
    }

    getHexColourChecked(idx:number):string {
        return this._hexColours[idx]!;
    }

    getHexColour(idx:number):string {
        if (idx < 0 || idx >= MAX_COLOURS)
            throw `Out of bounds ${idx}`;
        return this._hexColours[idx]!;
    }

    getColour(idx:number):Colour {
        if (idx < 0 || idx >= MAX_COLOURS)
            throw `Out of bounds ${idx}`;
        return this._colours[idx]!;
    }

}