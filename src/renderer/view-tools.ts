import { View } from "./view.ts";
import { PlainBuffer } from '../buffer/plain-buffer.ts'
import { Atlas } from "./../atlas/atlas.ts";

export class ViewTools {

    static RenderCopy(
        dst:CanvasRenderingContext2D,
        renderer:View,
        buffer:PlainBuffer,
        atlas:Atlas):void {

        if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
            return;
        }

        let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = buffer.stride, rows = buffer.rows;
        let srcSheetNum = -1;
        let srcSheet:HTMLCanvasElement;
        const buf = buffer.glyphs.buffer;

        const cellW = renderer.cellW;
        const cellH = renderer.cellH;
        const scaledW = cellW * renderer.dpr;
        const scaledH = cellH * renderer.dpr;

        while (rows--) {
            tidx = idx;
            cols = buffer.cols;
            while (cols--) {
                const char_attr: number = buf[idx++]!;
                if (char_attr !== 0) {
                    const entry = atlas.get(char_attr);
                    if (entry.sheet != srcSheetNum) {
                        srcSheet = atlas.getSheet(entry.sheet)!.canvas;
                        srcSheetNum = entry.sheet;
                    }
                    dst.drawImage(srcSheet,
                        entry.x, entry.y, scaledW, scaledH,
                        x, y, cellW, cellH);
                }
                x += cellW;
            }
            x = 0;
            y += cellH
            idx = tidx + stride;
        }

    }

    static RenderCopyTested(
        dst:CanvasRenderingContext2D,
        renderer:View,
        buffer:PlainBuffer,
        atlas:Atlas):void {

        if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
            return;
        }

        let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = buffer.stride, rows = buffer.rows;
        let srcSheetNum = -1;
        let srcSheet:HTMLCanvasElement;
        const buf = buffer.glyphs.buffer;
        const genBits = buffer.generationBits;

        const cellW = renderer.cellW;
        const cellH = renderer.cellH;
        const scaledW = cellW * renderer.dpr;
        const scaledH = cellH * renderer.dpr;

        while (rows--) {
            tidx = idx;
            cols = buffer.cols;
            while (cols--) {

                const char_attr: number = buf[idx++]!;

                if ((char_attr & 0xFF000000) !== genBits) {
                    x += cellW;
                    continue;
                }

                if (char_attr != 0) {
                    const entry = atlas.get(char_attr);
                    if (entry.sheet != srcSheetNum) {
                        srcSheet = atlas.getSheet(entry.sheet)!.canvas;
                        srcSheetNum = entry.sheet;
                    }
                    dst.drawImage(srcSheet,
                        entry.x, entry.y, scaledW, scaledH,
                        x, y, cellW, cellH);
                }
                x += cellW;
            }
            x = 0;
            y += cellH
            idx = tidx + stride;
        }

    }

}
