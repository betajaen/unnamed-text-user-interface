import {Array32} from "./buffer/array32.ts";
import {WasmTextShaper} from "unicode-shaper";

const THRESHOLD = 20;

const SPACES = [
    0x0009, // character tabulation
    0x0020, // space
    0x2000, // en quad
    0x2001, // em quad
    0x2002, // en space
    0x2003, // em space
    0x2004, // three-per-em space
    0x2005, // four-per-em space
    0x2006, // six-per-em space
    0x2008, // punctuation space
    0x2009, // thin space
    0x200A, // hair space
    0x205F, // medium mathematical space
    0x3000, // ideographic space
]

export enum TextFlags {
    BOX_CHARS = 1,
    LATIN_1 = 2,
    NON_LATIN_1 = 4,
    RTL = 8
}

export type TextDirection = 'ltr' | 'rtl' | 'neutral';


export class TextTools {
    static _glyphs: Map<string, number> = new Map<string, number>();
    static _glyphsReverse: Map<number, string> = new Map<number, string>();
    static _nextIndex: number = 1;
    static _graphemeSeg = new Intl.Segmenter('en', {granularity: 'grapheme'});
    static _wordSeg = new Intl.Segmenter('en', {granularity: 'word'});
    static _textArray: Array32 = new Array32(1, 128);
    static _runArray: Array32 = new Array32(1, 128);
    static _wordArray: Array32 = new Array32(1, 128);
    static _pendingWordArray: Array32 = new Array32(1, 128);
    static _shaper = new WasmTextShaper();

    static getOrAdd(glyph: string): number {
        let index: number | undefined = TextTools._glyphs.get(glyph);
        if (index === undefined) {
            index = TextTools._nextIndex++;
            TextTools._glyphs.set(glyph, index);
            TextTools._glyphsReverse.set(index, glyph);
        }
        return index;
    }

    static getGlyph(index: number): string {
        const str: string | undefined = TextTools._glyphsReverse.get(index);
        if (str === undefined) {
            throw `Unknown glyph ${index}`;
        }
        return str;
    }

    static getTextFlags(str: string): number {
        let flags = 0;
        for (let i = 0; i < str.length; i++) {
            const cc = str.charCodeAt(i);
            if (cc < 0xFF) {
                if (cc < 32 || (cc != 9 && cc != 10)) {
                    flags |= TextFlags.BOX_CHARS;
                } else {
                    flags |= TextFlags.LATIN_1;
                }
            } else {
                flags |= TextFlags.NON_LATIN_1;
                if (this._shaper.isRTL(cc)) {
                    flags |= TextFlags.RTL;
                }
            }
        }
        return flags;
    }

    static isLatin(str: string) {
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) >= 0xFF) {
                return false;
            }
        }
        return true;
    }

    static isStrRtl(str: string) {
        for (let i = 0; i < str.length; i++) {
            const cc: number = str.charCodeAt(i);
            if (
                (cc >= 0x0600 && cc <= 0x06FF) ||
                (cc >= 0x0750 && cc <= 0x077F) ||
                (cc >= 0x08A0 && cc <= 0x08FF) ||
                (cc >= 0xFB50 && cc <= 0xFDFF) ||
                (cc >= 0xFE70 && cc <= 0xFEFF) ||
                (cc >= 0x0590 && cc <= 0x05FF) ||
                (cc >= 0xFB1D && cc <= 0xFB4F)
            ) {
                return true;
            }
        }
        return false;
    }

    static isGlyphSpace(glyph: number) {
        if (glyph == 0x20 || glyph == 0x09)
            return true;
        if (glyph >= 0x2000 && glyph <= 0x200A)
            return true;
        if (glyph == 0x205F || glyph == 0x3000)
            return true;
        return false;
    }

    static EncodeArray32(str: string, into?: Array32, flags?: number, char_attr?:number): Array32 {
        let encoding: Array32 = into || TextTools._textArray;
        flags = flags || this.getTextFlags(str);
        char_attr = char_attr || 0;
        encoding.reset(1);

        if ((flags & TextFlags.RTL) == 0) {
            for (const segment of TextTools._graphemeSeg.segment(str)) {
                const glyph = segment.segment;
                let cc = glyph.charCodeAt(0) || 0;
                if (cc == 0) {
                    continue;
                }
                if (cc < 0x8000) {
                    if (this.isGlyphSpace(cc)) {
                        cc = 0x20;
                    }
                    encoding.push(cc | char_attr);
                } else {
                    const num = 0x8000 + TextTools.getOrAdd(glyph);
                    encoding.push(num | char_attr);
                }
            }
        } else {
            // Contains RTL
            const shape = TextTools._shaper.shapeString(str);

            for (const grapheme of TextTools._graphemeSeg.segment(shape)) {
                const glyph = grapheme.segment;
                let cc = glyph.charCodeAt(0) || 0;
                if (cc == 0) {
                    continue;
                }
                if (cc < 0x8000) {
                    if (this.isGlyphSpace(cc)) {
                        cc = 0x20;
                    }
                    encoding.push(cc | char_attr);
                } else {
                    const num = 0x8000 + TextTools.getOrAdd(glyph);
                    encoding.push(num | char_attr);
                }
            }

        }

        return encoding;
    }


    static encode(str: string): string {
        let outStr = '';
        for (const segment of TextTools._graphemeSeg.segment(str)) {
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