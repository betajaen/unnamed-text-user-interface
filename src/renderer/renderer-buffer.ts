export class RendererBuffer {
    readonly cols: number;
    readonly rows: number;
    readonly buffer: Uint32Array;
    readonly dirtyBuffer: Uint8Array;
    public dirty:boolean;

    constructor(cols:number, rows: number) {
        this.cols = cols;
        this.rows = rows;
        this.buffer = new Uint32Array(cols * rows);
        this.dirtyBuffer = new Uint8Array(cols * rows);
        this.dirty = false;
        this.clear(0);
    }

    clear(char_attr:number = 0x00FF0020) {
        this.buffer.fill(char_attr);
        this.dirtyBuffer.fill(1);
        this.dirty = true;
    }

    clearDirty() {
        this.dirtyBuffer.fill(0);
        this.dirty = false;
    }

    _set(c:number, r:number, char_attr:number) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            this.buffer[c + (this.cols * r)] = char_attr;
            this.dirtyBuffer[c + (this.cols * r)] = 1;
        }
    }

    print(c:number, r:number, text:string, char_attr:number) {
        char_attr = char_attr & 0xFFFF0000;
        for(let i = 0; i < text.length;i++) {
            this._set(c, r, text.charCodeAt(i) | char_attr);
            c++;
        }
        this.dirty = true;
    }
}