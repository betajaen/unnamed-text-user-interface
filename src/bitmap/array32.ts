export class Array32 {
    private _buffer:Uint32Array;
    private _begin:number;
    private _end:number;
    private _writePos:number;
    private _direction:1|-1;

    constructor(direction?:1|-1, capacity?:number) {
        this._buffer = new Uint32Array(Math.min(capacity || 128, 128));
        this._direction = direction || 1;
        if (this._direction == 1) {
            this._begin = 0;
            this._end = 0;
            this._writePos = this._end;
        }
        else {
            this._begin = this.capacity;
            this._end = this.capacity;
            this._writePos = this._begin - 1;
        }
    }

    get capacity():number {
        return this._buffer.length;
    }

    get size():number {
        return this._end - this._begin;
    }

    get data():Uint32Array {
        return this._buffer;
    }

    get begin():number {
        return this._begin;
    }

    get end():number {
        return this._end;
    }

    get(offset:number) {
        const pos = this._begin + offset;
        if (pos < 0 || pos >= this._buffer.length)
            throw `Out of bounds`;
        return this._buffer[pos]!;
    }

    needsSpace(count:number) {
        if (count > 0) {
            while (this.size + count > this.capacity) {
                this.grow();
            }
        }
    }

    reserve(count: number) {
        this.needsSpace(count);
        if (this._direction == 1) {
            const wp = this._writePos;
            this._end += count;
            this._writePos += count;
            return wp;
        }
        else {
            this._begin -= count;
            this._writePos -= count;
            return this._writePos;
        }
    }

    grow() {
        const newCapacity = this.capacity * 2;
        const offset = newCapacity - this.capacity;
        const newBuffer = new Uint32Array(newCapacity);
        newBuffer.set(this._buffer.subarray(this._begin, this._end));
        this._buffer = newBuffer;
        if (this._direction == -1) {
            this._begin += offset;
            this._end += offset;
            this._writePos += offset;
        }
    }

    reset(direction?:1|-1) {

        if (direction !== undefined) {
            this._direction = direction;
        }

        if (this._direction == 1) {
            this._begin = 0;
            this._end = 0;
            this._writePos = this._end;
        }
        else {
            this._begin = this.capacity;
            this._end = this.capacity;
            this._writePos = this._begin-1;
        }
    }

    push(value:number) {
        if (this._direction == 1) {
            if (this._end == this.capacity) {
                this.grow();
            }
            this._buffer[this._writePos] = value;
            this._writePos++;
            this._end = this._writePos;
        }
        else {
            if (this._begin === 0) {
                this.grow();
            }
            this._buffer[this._writePos] = value;
            this._begin = this._writePos;
            this._writePos--;
        }
    }

    subarray():Uint32Array {
        return this._buffer.subarray(this._begin, this._end);
    }

    copyArray(array:Array32) {
        const size = array.size;
        const beg = this.reserve(size);
        this._buffer.set(array.subarray(), beg);
    }

    pushArray(array:Array32) {
        const otherData = array.data;
        for(let i=array.begin;i < array.end;i++) {
            this.push(otherData[i]!);
        }
    }

}