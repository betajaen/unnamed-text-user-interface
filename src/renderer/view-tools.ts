import { View } from "./view.ts";
import { PhasedRaster } from '../bitmap/phased-raster.ts'
import { Atlas } from "./../atlas/atlas.ts";
import type {RendererMetrics} from "../metrics.ts";

export class ViewTools {

    static Copy(
        dst:CanvasRenderingContext2D,
        buffer:PhasedRaster,
        atlas:Atlas,
        metrics:RendererMetrics):void {

        if (buffer === undefined || dst === undefined || atlas === undefined || metrics === undefined) {
            return;
        }

        let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = buffer.stride, rows = buffer.rows;
        let srcSheetNum = -1;
        let srcSheet:HTMLCanvasElement;
        const buf = buffer.glyphs.buffer;

        const cellW = metrics.cellWidth;
        const cellH = metrics.cellHeight;
        const scaledW = cellW * metrics.dpr;
        const scaledH = cellH * metrics.dpr;

        while (rows--) {
            tidx = idx;
            cols = buffer.cols;
            while (cols--) {

                const char_attr: number = buf[idx++]! & 0x7FFF_FFFF;
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

    static CopyTested(
        dst:CanvasRenderingContext2D,
        raster:PhasedRaster,
        atlas:Atlas,
        metrics:RendererMetrics):void {

        if (raster === undefined || dst === undefined || atlas === undefined || metrics === undefined) {
            return;
        }

        let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = raster.stride, rows = raster.rows;
        let srcSheetNum = -1;
        let srcSheet:HTMLCanvasElement;
        const buf = raster.glyphs.buffer;
        const phaseBit = raster.phaseBit;

        const cellW = metrics.cellWidth;
        const cellH = metrics.cellHeight;
        const scaledW = cellW * metrics.dpr;
        const scaledH = cellH * metrics.dpr;

        while (rows--) {
            tidx = idx;
            cols = raster.cols;
            while (cols--) {

                const char_attr: number = buf[idx++]!;

                if ((char_attr & 0x7FFF_FFFF) !== phaseBit) {
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
