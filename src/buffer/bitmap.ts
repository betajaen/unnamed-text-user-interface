export class Bitmap32 {
    readonly cols: number;
    readonly stride: number;
    readonly rows: number;
    readonly length: number;
    readonly buffer: Uint32Array;

    constructor(cols:number, rows:number) {
        this.cols = Math.max(cols, 1);
        this.rows = Math.max(rows, 1);
        this.length = this.cols * this.rows;
        this.stride = this.cols;
        this.buffer = new Uint32Array(this.length);
    }
}

export class BitMap8 {
    readonly cols: number;
    readonly rows: number;
    readonly size: number;
    readonly buffer: Uint8Array;

    constructor(cols:number, rows:number) {
        this.cols = Math.max(cols, 1);
        this.rows = Math.max(rows, 1);
        this.size = this.cols * this.rows;
        this.buffer = new Uint8Array(this.size);
    }
}