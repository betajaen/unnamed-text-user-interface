
const CHAR_ASPECT = 0.6;

export type RendererMetrics = {
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    rendererWidth: number;
    rendererHeight: number;
    dpr:number;
};

export function calculateRendererMetrics(
    containerWidth: number,
    containerHeight: number,
    dpr: number,
    minCols: number,
    maxCols: number,
    rows: number
):RendererMetrics {
    let cellHeight = Math.floor(containerHeight / rows);
    let cellWidth = Math.floor(cellHeight * CHAR_ASPECT);
    let cols = Math.floor(containerWidth / cellWidth)

    if (cols < minCols) {
        cols = minCols;
        cellWidth = Math.floor(containerWidth / cols);
        cellHeight = Math.floor(cellWidth / CHAR_ASPECT);
    }
    else if (cols > maxCols) {
        cols = maxCols;
    }

    return {
        cols: cols,
        rows: rows,
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        rendererWidth: cellWidth * cols,
        rendererHeight: cellHeight * rows,
        dpr: dpr
    };
}
