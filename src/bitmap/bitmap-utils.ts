import { type Bitmap32 } from "./bitmap.ts";
import { TextFlags, TextTools } from "../text-tools.ts";
import { Array32 } from "./array32.ts";

function ror(value: number, shift: number): number {
    return ((value >>> shift) | (value << shift)) >>> 0;
}

export type PrintAlignment = 'left' | 'center' | 'right';

export type PrintOptions = {
    alignment?: PrintAlignment;
    tabSize?: number;
    boundsLeft?: number;
    boundsRight?: number;
    boundsType?: 'clip' | 'region';
}

export class Bitmap32Utils {

    static _temp:Uint32Array = new Uint32Array(512);

    static Clear(dst:Bitmap32, value:number) {
        dst.buffer.fill(value & 0xFFFFFFFF);
    }

    static Set(dst:Bitmap32, x:number, y:number, value:number) {
        if (x >= 0 && x < dst.cols && y >=0 && y < dst.rows) {
            dst.buffer[x + (y * dst.stride)] = value;
        }
    }

    static Print(dst:Bitmap32, x: number, y:number, text: string|Array32, attr:number|undefined, phaseBit:number, options?:PrintOptions|undefined) {

        if (!dst)
            return;

        options = {
            alignment: 'left',
            tabSize: undefined,
            boundsLeft: 0,
            boundsRight: dst.cols,
            boundsType: 'clip',
            ... options ?? {}
        };

        options.boundsLeft = Math.max(0, options.boundsLeft || 0) | 0;
        options.boundsRight = Math.min(dst.cols, options.boundsRight || dst.cols) | 0;


        if (typeof text === 'string') {
            Bitmap32Utils._PrintImpl(dst, x, y, TextTools.EncodeArray32(text, undefined, undefined, (attr || 0x000F_0000) & 0x7FFF_0000), 0, options);
        }
        else {
            Bitmap32Utils._PrintImpl(dst, x, y, text, phaseBit, options);
        }
    }

    private static _PrintImpl(dst:Bitmap32, x:number, y:number, text:Array32, phaseBit:number, options:PrintOptions) {
        if (!dst)
            return;

        x = x | 0;
        y = y | 0;

        const rows = dst.rows;

        if (y < 0 || y >= rows)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const buf = dst.buffer;
        const regionLeft = Math.max(0, options.boundsLeft!) | 0;
        const regionRight = Math.min(cols, options.boundsRight!) | 0;
        let clipLeft, clipRight;
        if (options.boundsType === 'clip') {
            clipLeft = Math.max(0, regionLeft);
            clipRight = Math.min(cols, regionRight);
        }
        else {
            clipLeft = 0;
            clipRight = cols;
        }
        const regionWidth = regionRight - regionLeft;

        if (regionWidth <= 0 || (clipRight <= clipLeft)) {
            return;
        }

        const len = text.size;

        if (options.alignment === 'center') {
            x = (regionLeft + x + (regionWidth / 2) - (len / 2)) | 0;
        }
        else if (options.alignment === 'right') {
            x = (regionRight - len - x) | 0;
        }
        else {
            x = (regionLeft + x) | 0;
        }


        const left = x < clipLeft ? clipLeft : x;
        const right = (x + len > clipRight+1) ? (clipRight+1) : x + len;

        if (left >= right)
            return;

        const textStart = left - x;
        const textEnd = textStart + (right - left);
        let lineOffset = (y * stride) + left;

        for(let i=textStart;i < textEnd; i++) {
            buf[lineOffset++] = (text.get(i)! & 0x7FFF_FFFF) | phaseBit;
        }

    }

    static HLine(dst:Bitmap32, x: number, y:number, w:number, value: number, pattern: number) {
        if (!dst)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const rows = dst.rows;
        const buf = dst.buffer;

        if (y < 0 || y >= rows)
            return;

        const left = x < 0 ? 0 : x;
        const right = x + w > (cols+1) ? (cols+1) : x + w;

        if (left >= right)
            return;

        pattern = (pattern & 0xFFFF_FFFF) >>> 0;

        if (pattern == 0xFFFF_FFFF) {
            buf.fill(value, left + (y * stride), right + (y * stride));
        }
        else {
            let bg = (0x00F0_0000 & value);
            let fg = (0x000F_0000 & value);
            let off_value = ( (bg >> 4) | (fg << 4) ) | (value & 0xFF00_FFFF);
            let off = left + (y * stride);
            let p = pattern;

            for(let i=left;i < right;i++) {
                if (p & 1) {
                    buf[off] = value;
                }
                else {
                    buf[off] = off_value;
                }
                p = ( (p >>> 1) | (p << 31) ) >>> 0;
                off++;
            }
        }
    }

    static VLine(dst:Bitmap32, x: number, y:number, h:number, value: number, pattern: number) {
        if (!dst)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const rows = dst.rows;
        const buf = dst.buffer;

        if (x < 0 || x >= cols)
            return;

        const top = y < 0 ? 0 : y;
        const bottom = y + h > rows ? rows : y + h;

        if (top >= bottom)
            return;

        pattern = (pattern & 0xFFFF_FFFF) >>> 0;

        if (pattern === 0xFFFF_FFFF) {
            let offset = x + (top * stride);
            for (let row = top; row < bottom; row++) {
                buf[offset] = value;
                offset += stride;
            }
        }
        else {
            let bg = (0x00F0_0000 & value);
            let fg = (0x000F_0000 & value);
            let off_value = ( (bg >> 4) | (fg << 4) ) | (value & 0xFF00_FFFF);
            let p = pattern;

            let offset = x + (top * stride);
            for (let row = top; row < bottom; row++) {
                if (p & 1) {
                    buf[offset] = value;
                }
                else {
                    buf[offset] = off_value;
                }
                p = ( (p >>> 1) | (p << 31) ) >>> 0;
                offset += stride;
            }
        }
    }

    static Fill(dst:Bitmap32, x: number, y:number, w:number, h:number, value: number, pattern: number) {
        if (!dst)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const rows = dst.rows;
        const buf = dst.buffer;

        const left = x < 0 ? 0 : x;
        const right = x + w > cols ? cols : x + w;
        const top = y < 0 ? 0 : y;
        const bottom = y + h > rows ? rows : y + h;

        if (left >= right || top >= bottom)
            return;

        pattern = (pattern & 0xFFFF_FFFF) >>> 0;

        const width = right - left;
        let offset = left + (top * stride);

        if (pattern === 0xFFFF_FFFF) {
            for (let row = top; row < bottom; row++) {
                buf.fill(value, offset, offset + width);
                offset += stride;
            }
        }
        else {
            let bg = (0x00F0_0000 & value);
            let fg = (0x000F_0000 & value);
            let off_value = ( (bg >> 4) | (fg << 4) ) | (value & 0xFF00_FFFF);

            const tmp = Bitmap32Utils._temp;
            let p_even = pattern & 0xFFFF;
            let p_odd = (pattern >> 16) & 0xFFFF;

            for(let i=0;i < width;i++) {
                if (p_even & 1) {
                    tmp[i] = value;
                }
                else {
                    tmp[i] = off_value;
                }
                p_even = (((p_even >>> 1) | (p_even << 15)) & 0xFFFF) >>> 0;
                if (p_odd & 1) {
                    tmp[i+width] = value;
                }
                else {
                    tmp[i+width] = off_value;
                }
                p_odd = (((p_odd >>> 1) | (p_odd << 15)) & 0xFFFF) >>> 0;
            }

            const tmp_even = tmp.subarray(0, width);
            const tmp_odd = tmp.subarray(width, width+width);

            for (let row = top; row < bottom; row++) {
                if (row & 1) {
                    buf.set(tmp_even, offset);
                }
                else {
                    buf.set(tmp_odd, offset);
                }
                offset += stride;
            }
        }
    }

    static Border(dst:Bitmap32, x:number, y:number, w:number, h:number, glyphs:number[]) {
        if (!dst)
            return;

        if (glyphs.length != 9)
            return

        if (w < 3 || h < 3)
            return;

        Bitmap32Utils.Set(dst, x, y, glyphs[0]!);
        Bitmap32Utils.Set(dst, x + w - 1, y, glyphs[2]!);
        Bitmap32Utils.Set(dst, x, y + h - 1, glyphs[6]!);
        Bitmap32Utils.Set(dst, x + w - 1, y + h - 1, glyphs[8]!);
        Bitmap32Utils.HLine(dst, x + 1, y, w - 2, glyphs[1]!);
        Bitmap32Utils.HLine(dst, x + 1, y + h - 1, w - 2, glyphs[7]!);
        Bitmap32Utils.VLine(dst, x, y + 1, h - 2, glyphs[3]!);
        Bitmap32Utils.VLine(dst, x + w - 1, y + 1, h - 2, glyphs[5]!);

        Bitmap32Utils.Fill(dst, x + 1, y + 1, w - 2, h - 2, glyphs[4]!);
    }

    static Blit(
        dst: Bitmap32,
        src: Bitmap32,
        dstX: number, dstY: number,
        srcX: number, srcY: number,
        w: number, h: number
    )
    {
        if (!dst || !src || dst == src)
            return;

        const srcStride = src.stride;
        const srcCols = src.cols;
        const srcRows = src.rows;
        const srcBuf = src.buffer;
        const dstStride = dst.stride;
        const dstCols = dst.cols;
        const dstRows = dst.rows;
        const dstBuf = dst.buffer;

        if (dstX < 0) { srcX -= dstX; w += dstX; dstX = 0; }
        if (srcX < 0) { dstX -= srcX; w += srcX; srcX = 0; }
        if (dstY < 0) { srcY -= dstY; h += dstY; dstY = 0; }
        if (srcY < 0) { dstY -= srcY; h += srcY; srcY = 0; }
        if (dstX + w > dstCols) w = dstCols - dstX;
        if (srcX + w > srcCols) w = srcCols - srcX;
        if (dstY + h > dstRows) h = dstRows - dstY;
        if (srcY + h > srcRows) h = srcRows - srcY;

        if (w <= 0 || h <= 0) return;

        if (dstX < 0 || dstY < 0 || srcX < 0 || srcY < 0) return;
        if (dstX + w > dstCols || dstY + h > dstRows) return;
        if (srcX + w > srcCols || srcY + h > srcRows) return;

        let srcOffset = srcX + (srcY * srcStride);
        let dstOffset = dstX + (dstY * dstStride);

        for (let row = 0; row < h; row++) {
            dstBuf.set(srcBuf.subarray(srcOffset, srcOffset + w), dstOffset);
            srcOffset += srcStride;
            dstOffset += dstStride;
        }
    }

    static CopyAlways(
        dst:Bitmap32,
        left:Bitmap32
    )
    {
        if (!dst || !left)
            return;

        if (dst.maxSize != left.maxSize)
            return;

        const len = dst.maxSize;
        const dstBuf = dst.buffer;
        const leftBuf = left.buffer;

        dstBuf.set(leftBuf, 0);
    }

    static CopyNewer(
        dst:Bitmap32,
        left:Bitmap32,
        right:Bitmap32,
    )
    {
        if (!dst || !left || !right)
            return;

        if (left.maxSize != right.maxSize || dst.maxSize != left.maxSize)
            return;

        const len = dst.maxSize;
        const dstBuf = dst.buffer;
        const leftBuf = left.buffer;
        const rightBuf = right.buffer;

        for(let i = 0;i < len;i++) {
            dstBuf[i] = (leftBuf[i]! | rightBuf[i]!);
        }

    }

    static CopyMask(
                       dst:Bitmap32,
                       left:Bitmap32,
                       right:Bitmap32,
                       mask:Bitmap32)
    {
        if (!dst || !left || !right || !mask)
            return;

        if (left.maxSize != right.maxSize || dst.maxSize != mask.maxSize || left.maxSize != mask.maxSize)
            return;

        const len = dst.maxSize;
        const dstBuf = dst.buffer;
        const leftBuf = left.buffer;
        const rightBuf = right.buffer;
        const maskBuf = mask.buffer;

        for(let i = 0;i < len;i++) {
            dstBuf[i] = (leftBuf[i]! & ~maskBuf[i]!) | (rightBuf[i]! & maskBuf[i]!);
        }

    }

}