import type {Bitmap32} from "./bitmap.ts";
import { TextTools } from "../text-tools.ts";

export class Bitmap32Utils {

    static Clear(dst:Bitmap32, value:number) {
        dst.buffer.fill(value & 0xFFFFFFFF);
    }

    static Set(dst:Bitmap32, x:number, y:number, value:number) {
        if (x >= 0 && x < dst.cols && y >=0 && y < dst.rows) {
            dst.buffer[x + (y * dst.stride)] = value;
        }
    }

    static Print(dst:Bitmap32, x: number, y:number, text: string, attr:number) {
        if (TextTools.isLatin(text)) {
            Bitmap32Utils.PrintEncoded(dst, x, y, text, attr);
        }
        else {
            Bitmap32Utils.PrintEncoded(dst, x, y, TextTools.encode(text), attr);
        }
    }
    static PrintEncoded(dst:Bitmap32, x: number, y:number, text: string, attr:number) {
        if (!dst)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const rows = dst.rows;
        const buf = dst.buffer;

        if (y < 0 || y >= rows)
            return;

        const len = text.length;
        const left = x < 0 ? 0 : x;
        const right = x + len > cols ? cols : x + len;

        if (left >= right)
            return;

        const textStart = left - x;
        const width = right - left;
        let offset = left + (y * stride);

        for(let i=textStart;i < textStart + width; i++) {
            buf[offset++] = (text.charCodeAt(i) & 0xFFFF) | attr;
        }
    }

    static HLine(dst:Bitmap32, x: number, y:number, w:number, value: number) {
        if (!dst)
            return;

        const stride = dst.stride;
        const cols = dst.cols;
        const rows = dst.rows;
        const buf = dst.buffer;

        if (y < 0 || y >= rows)
            return;

        const left = x < 0 ? 0 : x;
        const right = x + w > cols ? cols : x + w;

        if (left >= right)
            return;

        buf.fill(value, left + (y * stride), right + (y * stride));
    }

    static VLine(dst:Bitmap32, x: number, y:number, h:number, value: number) {
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

        let offset = x + (top * stride);
        for(let row = top; row < bottom; row++) {
            buf[offset] = value;
            offset += stride;
        }
    }

    static Fill(dst:Bitmap32, x: number, y:number, w:number, h:number, value: number) {
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

        const width = right - left;
        let offset = left + (top * stride);
        for(let row = top; row < bottom; row++) {
            buf.fill(value, offset, offset + width);
            offset += stride;
        }
    }

    static Border(dst:Bitmap32, x:number, y:number, w:number, h:number, glyphs:number[]) {
        if (!dst)
            return;

        if (glyphs.length != 9)
            return

        if (w < 3 || h < 3)
            return;

        // Corners
        Bitmap32Utils.Set(dst, x, y, glyphs[0]!);
        Bitmap32Utils.Set(dst, x + w - 1, y, glyphs[2]!);
        Bitmap32Utils.Set(dst, x, y + h - 1, glyphs[6]!);
        Bitmap32Utils.Set(dst, x + w - 1, y + h - 1, glyphs[8]!);

        // Edges
        Bitmap32Utils.HLine(dst, x + 1, y, w - 2, glyphs[1]!);
        Bitmap32Utils.HLine(dst, x + 1, y + h - 1, w - 2, glyphs[7]!);
        Bitmap32Utils.VLine(dst, x, y + 1, h - 2, glyphs[3]!);
        Bitmap32Utils.VLine(dst, x + w - 1, y + 1, h - 2, glyphs[5]!);

        // Fill (optional)
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

    /*

PETSCII Idea for characters 3-31

    const isText = char >> 5;  // non-zero if >= 32
const mask = -isText;      // 0xFFFFFFFF if text, 0 if structural
dstBuf[i] = (cell & ~mask) | (replacement & mask);


     */

}