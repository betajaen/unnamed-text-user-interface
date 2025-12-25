const THRESHOLD = 20;

export class TextTools {
    static _glyphs: Map<string, number> = new Map<string, number>();
    static _glyphsReverse: Map<number, string> = new Map<number, string>();
    static _nextIndex:number = 1;
    static _seg = new Intl.Segmenter('en', { granularity: "grapheme" });

    static getOrAdd(glyph:string):number {
        let index:number|undefined = TextTools._glyphs.get(glyph);
        if (index === undefined) {
            index = TextTools._nextIndex++;
            TextTools._glyphs.set(glyph, index);
            TextTools._glyphsReverse.set(index, glyph);
        }
        return index;
    }

    static getGlyph(index:number):string {
        const str:string|undefined = TextTools._glyphsReverse.get(index);
        if (str === undefined) {
            throw `Unknown glyph ${index}`;
        }
        return str;
    }

    static isLatin(str: string) {
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) >= 0xFF) {
                return false;
            }
        }
        return true;
    }

    static encode(str:string):string {
        let outStr = '';
        for(const segment of TextTools._seg.segment(str)) {
            const glyph = segment.segment;
            if (glyph.length == 1) {
                if (glyph.charCodeAt(0) < 0x8000) {
                    outStr += glyph;
                    continue;
                }
            }
            const num = 0x8000 + TextTools.getOrAdd(glyph);
            outStr += String.fromCharCode(num);
        }
        return outStr;
    }
}