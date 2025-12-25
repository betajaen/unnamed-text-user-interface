export class Bitmap32 {
    private _cols: number;
    private _stride: number;
    private _rows: number;
    readonly maxSize: number;
    readonly buffer: Uint32Array;

    constructor(cols:number, rows:number, stride:number) {
        this._cols = Math.max(cols, 1);
        this._rows = Math.max(rows, 1);
        this._stride = stride;
        this.maxSize = this._rows * this._stride;
        this.buffer = new Uint32Array(this.maxSize);

        console.log("New Bitmap32", this._cols, this._rows, this._stride);
    }

    get rows() {
        return this._rows;
    }

    get cols() {
        return this._cols;
    }

    set cols(cols:number) {
        this._cols = cols;
    }

    get stride() {
        return this._stride;
    }

    set stride(stride: number) {

        const size = this._rows * stride;

        if (size > this.maxSize) {
            throw `Buffer to large! New: ${size}, Existing: ${this.maxSize} ${stride}`;
        }

        this._stride = stride;
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