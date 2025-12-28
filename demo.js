// src/renderer/palette.ts
var MAX_COLOURS = 16;
function colourToHex(colour) {
  return `#${colour.r.toString(16).padStart(2, "0")}${colour.g.toString(16).padStart(2, "0")}${colour.b.toString(16).padStart(2, "0")}`;
}

class Palette {
  _colours = new Array;
  _hexColours = new Array;
  constructor() {
    for (let i = 0;i < MAX_COLOURS; i++) {
      this._colours.push({ r: 255, g: 255, b: 255 });
      this._hexColours.push("#FFFFFF");
    }
    this.set(0, 0, 0, 0);
  }
  set(idx, r, g, b) {
    if (idx < 0 || idx >= MAX_COLOURS)
      throw `Out of bounds ${idx}`;
    const col = { r, g, b };
    this._colours[idx] = col;
    this._hexColours[idx] = colourToHex(col);
  }
  setFrom(palette) {
    const lim = Math.min(16, palette.length);
    for (let i = 0;i < lim; i++) {
      const col = palette[i];
      if (col === undefined) {
        this.set(i, 0, 0, 0);
      } else {
        this.set(i, col.r, col.g, col.b);
      }
    }
  }
  getHexColourChecked(idx) {
    return this._hexColours[idx];
  }
  getHexColour(idx) {
    if (idx < 0 || idx >= MAX_COLOURS)
      throw `Out of bounds ${idx}`;
    return this._hexColours[idx];
  }
  getColour(idx) {
    if (idx < 0 || idx >= MAX_COLOURS)
      throw `Out of bounds ${idx}`;
    return this._colours[idx];
  }
}

// src/renderer/renderer-utils.ts
class RendererUtils {
  static RenderCopy(dst, renderer, buffer, atlas) {
    if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
      return;
    }
    let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = buffer.stride, rows = buffer.rows;
    let srcSheetNum = -1;
    let srcSheet;
    const buf = buffer.glyphs.buffer;
    const cellW = renderer.cellW;
    const cellH = renderer.cellH;
    const scaledW = cellW * renderer.dpr;
    const scaledH = cellH * renderer.dpr;
    while (rows--) {
      tidx = idx;
      cols = buffer.cols;
      while (cols--) {
        const char_attr = buf[idx++];
        if (char_attr !== 0) {
          const entry = atlas.get(char_attr);
          if (entry.sheet != srcSheetNum) {
            srcSheet = atlas.getSheet(entry.sheet).canvas;
            srcSheetNum = entry.sheet;
          }
          dst.drawImage(srcSheet, entry.x, entry.y, scaledW, scaledH, x, y, cellW, cellH);
        }
        x += cellW;
      }
      x = 0;
      y += cellH;
      idx = tidx + stride;
    }
  }
  static RenderCopyTested(dst, renderer, buffer, atlas) {
    if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
      return;
    }
    let x = 0, y = 0, idx = 0, tidx = 0, cols = 0, stride = buffer.stride, rows = buffer.rows;
    let srcSheetNum = -1;
    let srcSheet;
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
        const char_attr = buf[idx++];
        if ((char_attr & 4278190080) !== genBits) {
          x += cellW;
          continue;
        }
        if (char_attr != 0) {
          const entry = atlas.get(char_attr);
          if (entry.sheet != srcSheetNum) {
            srcSheet = atlas.getSheet(entry.sheet).canvas;
            srcSheetNum = entry.sheet;
          }
          dst.drawImage(srcSheet, entry.x, entry.y, scaledW, scaledH, x, y, cellW, cellH);
        }
        x += cellW;
      }
      x = 0;
      y += cellH;
      idx = tidx + stride;
    }
  }
}

// src/renderer/renderer.ts
class Renderer {
  _canvas;
  _ctx;
  _atlas;
  _cols = 0;
  _rows = 0;
  _dpr = 1;
  _cellW = 0;
  _cellH = 0;
  _viewW = 0;
  _viewH = 0;
  _forceRender = false;
  _rendererBuffer = null;
  _clearColour = "#000000";
  constructor(canvas, atlas, metrics) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
    this._atlas = atlas;
  }
  configure(metrics) {
    this._rows = metrics.rows;
    this._cols = metrics.cols;
    this._cellW = metrics.cellWidth;
    this._cellH = metrics.cellHeight;
    this._viewW = metrics.rendererWidth;
    this._viewH = metrics.rendererHeight;
    this._dpr = metrics.dpr;
    this._canvas.width = this._viewW * this._dpr;
    this._canvas.height = this._viewH * this._dpr;
    this._canvas.style.width = this._viewW + "px";
    this._canvas.style.height = this._viewH + "px";
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._forceRender = true;
  }
  renderGlyphAtXY(char_attr, x, y) {
    const entry = this._atlas.get(char_attr);
    const sheet = this._atlas.getSheet(entry.sheet);
    const scaledW = this._cellW * this._dpr;
    const scaledH = this._cellH * this._dpr;
    this._ctx.drawImage(sheet.canvas, entry.x, entry.y, scaledW, scaledH, x, y, this._cellW, this._cellH);
  }
  forceRender() {
    this._forceRender = true;
  }
  get width() {
    return this._canvas.width;
  }
  get height() {
    return this._canvas.height;
  }
  get cols() {
    return this._cols;
  }
  get rows() {
    return this._rows;
  }
  get cellW() {
    return this._cellW;
  }
  get cellH() {
    return this._cellH;
  }
  get dpr() {
    return this._dpr;
  }
  get buffer() {
    return this._rendererBuffer;
  }
  set clearColour(clearColour) {
    this._clearColour = clearColour;
    document.body.style.backgroundColor = clearColour;
  }
  set buffer(buffer) {
    this._rendererBuffer = buffer;
    this._forceRender = true;
  }
  renderFromBuffer(buffer, force = false) {
    if (this._rows == 0 || this._cols == 0) {
      this._ctx.fillStyle = "darkred";
      this._ctx.fillRect(0, 0, 1024, 1024);
      return;
    }
    if (force == false && buffer.dirty == false) {
      return;
    }
    if (force) {
      RendererUtils.RenderCopy(this._ctx, this, buffer, this._atlas);
    } else {
      if (buffer.dirty) {
        RendererUtils.RenderCopyTested(this._ctx, this, buffer, this._atlas);
      }
    }
  }
  willRender() {
    if (this._cellW === 0 || this._cellH === 0) {
      return false;
    }
    if (this._forceRender || this._rendererBuffer != null && this._rendererBuffer.dirty) {
      return true;
    }
    return false;
  }
  render() {
    if (this._cellW === 0 || this._cellH === 0) {
      return;
    }
    if (this._forceRender || this._rendererBuffer != null && this._rendererBuffer.dirty) {
      this._ctx.fillStyle = this._clearColour;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
      if (this._rendererBuffer != null) {
        this.renderFromBuffer(this._rendererBuffer, this._forceRender);
      } else {
        const str = "<Empty Buffer>";
        let x = 0, y = 0;
        for (let i = 0;i < str.length; i++) {
          const char = str.charCodeAt(i);
          let attr = (15 | i << 4) << 16;
          this.renderGlyphAtXY(char | attr, x, y);
          x += this._cellW;
        }
      }
      this._forceRender = false;
    }
  }
}

// src/atlas/atlas-sheet.ts
var SHEET_SIZE = 512;

class AtlasSheet {
  _canvas;
  _ctx;
  _nextX = 0;
  _nextY = 0;
  _rowHeight = 0;
  _id = 0;
  constructor(id) {
    this._canvas = document.createElement("canvas");
    this._canvas.width = SHEET_SIZE;
    this._canvas.height = SHEET_SIZE;
    this._ctx = this._canvas.getContext("2d", { alpha: false });
    this._id = id;
  }
  get canvas() {
    return this._canvas;
  }
  get ctx() {
    return this._ctx;
  }
  allocate(w, h) {
    let nx = this._nextX;
    let ny = this._nextY;
    let rh = this._rowHeight;
    if (this._nextX + w > SHEET_SIZE) {
      nx = 0;
      ny += rh;
      rh = 0;
    }
    if (ny + h > SHEET_SIZE) {
      return null;
    }
    this._nextX = nx + w;
    this._nextY = ny;
    this._rowHeight = Math.max(rh, h);
    return { x: nx, y: ny, sheet: this._id };
  }
  clear() {
    this._nextY = 0;
    this._nextY = 0;
    this._rowHeight = 0;
  }
}

// src/buffer/array32.ts
class Array32 {
  _buffer;
  _begin;
  _end;
  _writePos;
  _direction;
  constructor(direction, capacity) {
    this._buffer = new Uint32Array(Math.min(capacity || 128, 128));
    this._direction = direction || 1;
    if (this._direction == 1) {
      this._begin = 0;
      this._end = 0;
      this._writePos = this._end;
    } else {
      this._begin = this.capacity;
      this._end = this.capacity;
      this._writePos = this._begin - 1;
    }
  }
  get capacity() {
    return this._buffer.length;
  }
  get size() {
    return this._end - this._begin;
  }
  get data() {
    return this._buffer;
  }
  get begin() {
    return this._begin;
  }
  get end() {
    return this._end;
  }
  get(offset) {
    const pos = this._begin + offset;
    if (pos < 0 || pos >= this._buffer.length)
      throw `Out of bounds`;
    return this._buffer[pos];
  }
  needsSpace(count) {
    if (count > 0) {
      while (this.size + count > this.capacity) {
        this.grow();
      }
    }
  }
  reserve(count) {
    this.needsSpace(count);
    if (this._direction == 1) {
      const wp = this._writePos;
      this._end += count;
      this._writePos += count;
      return wp;
    } else {
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
  reset(direction) {
    if (direction !== undefined) {
      this._direction = direction;
    }
    if (this._direction == 1) {
      this._begin = 0;
      this._end = 0;
      this._writePos = this._end;
    } else {
      this._begin = this.capacity;
      this._end = this.capacity;
      this._writePos = this._begin - 1;
    }
  }
  push(value) {
    if (this._direction == 1) {
      if (this._end == this.capacity) {
        this.grow();
      }
      this._buffer[this._writePos] = value;
      this._writePos++;
      this._end = this._writePos;
    } else {
      if (this._begin === 0) {
        this.grow();
      }
      this._buffer[this._writePos] = value;
      this._begin = this._writePos;
      this._writePos--;
    }
  }
  subarray() {
    return this._buffer.subarray(this._begin, this._end);
  }
  copyArray(array) {
    const size = array.size;
    const beg = this.reserve(size);
    this._buffer.set(array.subarray(), beg);
  }
  pushArray(array) {
    const otherData = array.data;
    for (let i = array.begin;i < array.end; i++) {
      this.push(otherData[i]);
    }
  }
}
// node_modules/unicode-shaper/dist/shape/internal.js
var SHADDA = 64;
var CSHADDA = 128;
var COMBINE = SHADDA + CSHADDA;
var U_SHAPE_TEXT_DIRECTION_LOGICAL = 0;
var U_SHAPE_DIRECTION_OUTPUT_BIDI = 1 << 20;
var U_SHAPE_TEXT_DIRECTION_MASK = 4;
var U_SHAPE_LETTERS_SHAPE = 8;
var U_SHAPE_LETTERS_MASK = 24;
var DEFAULT_OPTIONS = U_SHAPE_LETTERS_SHAPE & U_SHAPE_LETTERS_MASK | U_SHAPE_TEXT_DIRECTION_LOGICAL & U_SHAPE_TEXT_DIRECTION_MASK | U_SHAPE_DIRECTION_OUTPUT_BIDI;
var DEFAULT_OPTIONS_WITHOUT_BIDI_SHAPING = U_SHAPE_LETTERS_SHAPE & U_SHAPE_LETTERS_MASK | U_SHAPE_TEXT_DIRECTION_LOGICAL & U_SHAPE_TEXT_DIRECTION_MASK;
var ARA_LINK = [
  1 + 32 + 256 * 17,
  1 + 32 + 256 * 19,
  1 + 256 * 21,
  1 + 32 + 256 * 23,
  1 + 2 + 256 * 25,
  1 + 32 + 256 * 29,
  1 + 2 + 256 * 31,
  1 + 256 * 35,
  1 + 2 + 256 * 37,
  1 + 2 + 256 * 41,
  1 + 2 + 256 * 45,
  1 + 2 + 256 * 49,
  1 + 2 + 256 * 53,
  1 + 256 * 57,
  1 + 256 * 59,
  1 + 256 * 61,
  1 + 256 * 63,
  1 + 2 + 256 * 65,
  1 + 2 + 256 * 69,
  1 + 2 + 256 * 73,
  1 + 2 + 256 * 77,
  1 + 2 + 256 * 81,
  1 + 2 + 256 * 85,
  1 + 2 + 256 * 89,
  1 + 2 + 256 * 93,
  0,
  0,
  0,
  0,
  0,
  1 + 2,
  1 + 2 + 256 * 97,
  1 + 2 + 256 * 101,
  1 + 2 + 256 * 105,
  1 + 2 + 16 + 256 * 109,
  1 + 2 + 256 * 113,
  1 + 2 + 256 * 117,
  1 + 2 + 256 * 121,
  1 + 256 * 125,
  1 + 256 * 127,
  1 + 2 + 256 * 129,
  4 + 256,
  4 + 128 + 256,
  4 + 128 + 256,
  4 + 128 + 256,
  4 + 128 + 256,
  4 + 128 + 256,
  4 + 64 + 256 * 3,
  4 + 256,
  4 + 256 * 7,
  4 + 256 * 8,
  4 + 256 * 8,
  4 + 256,
  0,
  0,
  0,
  0,
  0,
  1 + 256 * 133,
  1 + 256 * 135,
  1 + 256 * 137,
  1 + 256 * 139,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  4 + 256 * 6,
  1 + 8,
  1 + 32,
  1 + 32,
  0,
  1 + 32,
  1,
  1,
  1 + 2,
  1 + 2 + 8 + 256 * 22,
  1 + 2 + 8 + 256 * 14,
  1 + 2 + 8 + 256 * 2,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 6,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 42,
  1 + 2,
  1 + 8 + 256 * 56,
  1,
  1,
  1,
  1 + 8 + 256 * 52,
  1 + 8 + 256 * 50,
  1 + 8 + 256 * 54,
  1,
  1,
  1 + 8 + 256 * 60,
  1,
  1,
  1,
  1,
  1,
  1,
  1 + 8 + 256 * 58,
  1,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 62,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 66,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 8 + 256 * 78,
  1 + 2 + 8 + 256 * 80,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 90,
  1 + 2,
  1 + 8 + 256 * 84,
  1 + 2 + 8 + 256 * 86,
  1,
  1,
  1,
  1 + 8 + 256 * 144,
  1 + 8 + 256 * 137,
  1 + 8 + 256 * 135,
  1 + 8 + 256 * 139,
  1 + 8 + 256 * 146,
  1,
  1 + 8 + 256 * 142,
  1 + 2 + 8 + 256 * 172,
  1,
  1 + 2,
  1 + 2,
  1 + 2 + 8 + 256 * 148,
  1 + 2,
  1 + 8 + 256 * 94,
  1 + 8 + 256 * 96
];
var PRES_ALINK = [
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  1,
  2,
  1 + 2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  2,
  1 + 2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  2,
  1 + 2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  4,
  4,
  4,
  4,
  4
];
var PRES_BLINK = [
  1 + 2,
  1 + 2,
  1 + 2,
  0,
  1 + 2,
  0,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  1 + 2,
  0,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  0,
  1,
  0,
  1,
  2,
  1 + 2,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  1,
  0,
  0,
  0
];

// node_modules/unicode-shaper/dist/shape/buginese.js
var MType;
(function(MType2) {
  MType2[MType2["C"] = 0] = "C";
  MType2[MType2["GB"] = 1] = "GB";
  MType2[MType2["J"] = 2] = "J";
  MType2[MType2["O"] = 3] = "O";
  MType2[MType2["R"] = 4] = "R";
  MType2[MType2["S"] = 5] = "S";
  MType2[MType2["VAbv"] = 6] = "VAbv";
  MType2[MType2["VBlw"] = 7] = "VBlw";
  MType2[MType2["VPre"] = 8] = "VPre";
  MType2[MType2["VPst"] = 9] = "VPst";
  MType2[MType2["VS"] = 10] = "VS";
  MType2[MType2["WJ"] = 11] = "WJ";
  MType2[MType2["NJ"] = 12] = "NJ";
  MType2[MType2["WS"] = 13] = "WS";
})(MType || (MType = {}));

// node_modules/unicode-shaper/dist/shape/javanese.js
var MType2;
(function(MType3) {
  MType3[MType3["C"] = 0] = "C";
  MType3[MType3["GB"] = 1] = "GB";
  MType3[MType3["H"] = 2] = "H";
  MType3[MType3["IV"] = 3] = "IV";
  MType3[MType3["J"] = 4] = "J";
  MType3[MType3["M"] = 5] = "M";
  MType3[MType3["MR"] = 6] = "MR";
  MType3[MType3["MY"] = 7] = "MY";
  MType3[MType3["N"] = 8] = "N";
  MType3[MType3["O"] = 9] = "O";
  MType3[MType3["P"] = 10] = "P";
  MType3[MType3["R"] = 11] = "R";
  MType3[MType3["S"] = 12] = "S";
  MType3[MType3["VAbv"] = 13] = "VAbv";
  MType3[MType3["VBlw"] = 14] = "VBlw";
  MType3[MType3["VPre"] = 15] = "VPre";
  MType3[MType3["VPst"] = 16] = "VPst";
  MType3[MType3["VS"] = 17] = "VS";
  MType3[MType3["WJ"] = 18] = "WJ";
  MType3[MType3["NJ"] = 19] = "NJ";
  MType3[MType3["WS"] = 20] = "WS";
})(MType2 || (MType2 = {}));

// node_modules/unicode-shaper/dist/shape/khmer.js
var MType3;
(function(MType4) {
  MType4[MType4["Cs1"] = 0] = "Cs1";
  MType4[MType4["Cs2"] = 1] = "Cs2";
  MType4[MType4["V"] = 2] = "V";
  MType4[MType4["Vs1"] = 3] = "Vs1";
  MType4[MType4["VAbv"] = 4] = "VAbv";
  MType4[MType4["VBlw"] = 5] = "VBlw";
  MType4[MType4["VPre"] = 6] = "VPre";
  MType4[MType4["VPst"] = 7] = "VPst";
  MType4[MType4["Coeng"] = 8] = "Coeng";
  MType4[MType4["RS"] = 9] = "RS";
  MType4[MType4["Robat"] = 10] = "Robat";
  MType4[MType4["SAbv"] = 11] = "SAbv";
  MType4[MType4["SPst"] = 12] = "SPst";
  MType4[MType4["SAbvN"] = 13] = "SAbvN";
  MType4[MType4["P"] = 14] = "P";
  MType4[MType4["C"] = 15] = "C";
  MType4[MType4["N"] = 16] = "N";
  MType4[MType4["R"] = 17] = "R";
  MType4[MType4["J"] = 18] = "J";
  MType4[MType4["VS"] = 19] = "VS";
  MType4[MType4["WJ"] = 20] = "WJ";
  MType4[MType4["NJ"] = 21] = "NJ";
  MType4[MType4["WS"] = 22] = "WS";
  MType4[MType4["O"] = 23] = "O";
})(MType3 || (MType3 = {}));

// node_modules/unicode-shaper/dist/shape/myanmar.js
var MType4;
(function(MType5) {
  MType5[MType5["A"] = 0] = "A";
  MType5[MType5["C"] = 1] = "C";
  MType5[MType5["K"] = 2] = "K";
  MType5[MType5["MR"] = 3] = "MR";
  MType5[MType5["O"] = 4] = "O";
  MType5[MType5["VBlw"] = 5] = "VBlw";
  MType5[MType5["VPre"] = 6] = "VPre";
  MType5[MType5["WS"] = 7] = "WS";
})(MType4 || (MType4 = {}));

// node_modules/unicode-shaper/dist/shape/tibetan.js
var MType5;
(function(MType6) {
  MType6[MType6["Lh"] = 0] = "Lh";
  MType6[MType6["Va"] = 1] = "Va";
  MType6[MType6["Vb"] = 2] = "Vb";
  MType6[MType6["Vc"] = 3] = "Vc";
  MType6[MType6["U"] = 4] = "U";
  MType6[MType6["WS"] = 5] = "WS";
})(MType5 || (MType5 = {}));
// node_modules/unicode-shaper/dist/uShaper.wasm.js
var uShaper_wasm_default = "AGFzbQEAAAABMghgAX8AYAF/AX9gAn9/AGACf38Bf2ADf39/AGADf39/AX9gBH9/f38AYAZ/f39/f38AAhcBA2Vudg9zZXRVbmljb2RlQXJyYXkAAgM1NAQEBAUBBwEDAQECAQQEBgYBAgECBgEEAgQGBgICBAQCBgQCAQYGBAYFBQUCAgQCAgIAAAEFAwEAEQYZA38BQYCAwAALfwBB6ZXAAAt/AEHwlcAACwdeCAZtZW1vcnkCAAtwcm9jZXNzVGV4dAABEWFsbG9jVW5pY29kZUFycmF5ACQEZnJlZQAjBWlzUlRMADQFaXNDSksAFgpfX2RhdGFfZW5kAwELX19oZWFwX2Jhc2UDAgrshQE0wUYCE38BfiMAQYADayIDJAAgA0HgAGogACABEBkCQAJAIAJBGHEiCEUNACADKAJkIQ0gAygCaCEEIANBADYClAEgA0KAgICAIDcCjAFBAiELAkAgAkGAgAFxRQRAIA0hBwwBBQsgBEEBdCIGBEAgA0GMAWogBhAYIAZBAWshASADKAKQASILIAMoApQBIgVBAXRqIQADfyAAQQA7AQAgAQR/IAFBAWshASAAQQJqIQAMAQUgBSAGagsLIQ4FCyADIA42ApQBQX9BASACQQRxIglBAnYiBxshD0EAIQUgBkEAIAcbIQAgBEEAIAcbIQEgBCAHayEQIAJBmIABcUGYgAFGIRFBACEHQQEhDANAAn8gASAQRgRAIAUgAEEAIAkbIgBJIAUgDktyDQUgBSAAayEEIAsgAEEBdGohBwwDBQsgASAETw0EIBFFIAwgByANIAFBAXRqLwEAIgYQESIHckHAAXFBwAFGcUVyRQRAIAsgDiAAECsgCkH//wNxIgcgBiAGIAdLG0HuE2s7AQAgACAOTw0FQQAhDCALIABBAXRqLwEAEBEhByAPDAEFCyALIA4gABArIAY7AQAgBUEBaiEFIAkEQCAAQQFrIQBBASEMIAYhCkF/DAEFCyAAQQFqIQAgBiEKQQEhDEEBCyABaiEBDAALAAsCQAJAAkAgCEEYRwRAIAQhASAIQQhHDQIgAkGDgARxRSACQYCAOHFBgIAgRnINAQwCBQsgBCEBIAJBg4AEcQ0CCyAEQQFrIQUgAkEEcQRAQQAhACAHIQYDQCAAIARGDQICQAJAAkAgBi8BACIJQaIMayIKQQVLQQEgCnRBK3FFciAAIAVPckUEQCAGQQJqLwEAQcQMRg0BBQsgAUUgCUHw/wNxQfD8A0dyDQIMAQsgAQ0AQQAhAQwBCyABQQFrIQELIAZBAmohBiAAQQFqIQAMAAsABQtBACEAIAchBgNAIAAgBEYNAQJAAkACQAJAIAYvAQAiCUHEDEcgACAFT3INACAGQQJqLwEAQaIMayIKQQVLDQBBASAKdEErcQ0BCyAJQfD/A3FB8PwDRw0CIAENAQwCCyABDQBBACEBDAELIAFBAWshAQsgBkECaiEGIABBAWohAAwACwALIAJBm4AEcUEQRw0AIAQhACAHIQYDQCAARQ0BIAEgAUEARyAGLwEAQYsCakH//wNxQQhJcWohASAAQQFrIQAgBkECaiEGDAALAAsgA0GYAWoiACABIAQgASAESxsQICAAIAcgBBAiQQAhACADQQA2AnAgA0EANgJ0IAJBBHEiB0UEQCADKAKcASIEIAMoAqABIgYgA0HwAGogA0H0AGoQDyAEIAYgAygCcCADKAJ0ECEFCwJAAkAgCEEIRwRAIAhBGEYNASADKAKgASEFIAMoApwBIQYMAgULIAJBgIA4cSIEQYCAMEcEQEECIQAgBA0BBQsgAygCnAEiBiADKAKgASIFQQEQAyAEQYCAMEcNASAFIQQgBiEJA0AgBEUNAgJAAkACfwJAAkACQCAJLwEAIgBB8P8DcUHw/ANGBEAgAEHz/ANrIgoOAwMCAwEFCyAAQfL5A0kNAkH9/AMhCCAAQf38A0YgAEH1+QNJcg0EDAILIAAiCEH9/ANGDQMLQf38AyEIAkACQCAAQZADakH//wNxQYCAQGstAAAiDEEBaw4CAAQBC0HADCEIDAMLAkAgCg4DAQABAAtBASAMa0H/AXEMAQsgAEGiB2pB//8DcUEGSQtFIABB/PwDRnINAUEgIQgLIAkgCDsBAAsgBEEBayEEIAlBAmohCQwACwALIAMoApwBIgYgAygCoAEiBSAAEAMLIAdFBEAgBiAFIANB8ABqIANB9ABqEA8gBiAFIAMoAnAgAygCdBAhBQsgA0GoAWogARAgIAVBAXQhAEEAIQEgAygCmAEhBANAIAAgAUcEQCABIAZqLwEAIgVB/f8DTQRAIANBqAFqIAUQFAULIAFBAmohAQwBBQsLIAQgBhAvIANBiAFqIgAgA0GwAWooAgA2AgAgAyADKQKoATcDgAEgAygCjAEgCxAvIAMoAmAgDRAvIANB6ABqIAAoAgAiCjYCACADIAMpA4ABNwNgIAMoAmQhDCADQYABaiAKECBBACEHIANBADYCsAEgA0KAgICAwAA3AqgBIApBAWshBiAMQQJqIQhBBCELQQAhBQJAA0ACQCAFIApJBEAgCCAFQQF0IgBqIQEgACAMaiIJLwEAEAxB/wFxIQQgBSEAA0AgACAGRgRAIAohAAwDBQsgAEEBaiEAIAEvAQAhDSABQQJqIQEgBCANEAxB/wFxIg1GIA1BAkZyDQALDAEFCyADKAKoASEQIAMoAqwBIQtBACEEIANBADYClAEgA0KAgICAwAA3AowBIAtBCGohCEEAIQACQANAIAggBEEMbCIJaiEGA0AgBiEBIAcgACIFRgRAIAQgB0kEQCADQagBaiIAIAsgBEEMbGogByAEaxANIANBADYCtAEgA0GMAWogABASBQsgAygCkAEiBSADKAKUASINQQR0aiERIAMoAowBIRQgBSEAA0AgACARRwRAIAAoAggiB0EBayEPQQghCSAHIgFBDGwiBkEMayISIQgDQAJAIAFFBEAgA0GoAWogBxAgIAAoAgQhAQNAIAZFDQIgA0GoAWogASgCACABKAIEECIgBkEMayEGIAFBDGohAQwACwAFCyAJIAAoAgQiBGoiDi0AAEEIRgRAIANBoAFqIhUgDigCADYCACADIA5BCGsiEykCADcDmAEgEyAOQQRqIAgQAiAAIA82AgggACgCACAPRgRAIAAQMiAAKAIEIQQFCyAPBEAgBEEMaiAEIBIQAgULIAQgAykDmAE3AgAgACAHNgIIIARBCGogFSgCADYCAAULIAFBAWshASAIQQxrIQggCUEMaiEJDAELCyADQYABaiADQagBahAsIAMoAqgBIAMoAqwBEC8gACgCDCIBBEAgA0GAAWogAS8BABAUBQsgAEEQaiEADAEFCwsgA0HYAGogAygChAEiACADKAKIASAKECggDCAKIAMoAlggAygCXBAmIAUhAQNAIA0EQCABKAIAIAFBBGooAgAQMCANQQFrIQ0gAUEQaiEBDAEFCwsgFCAFQRAQLiAQIAsQMCADKAKAASAAEC8gAygCZCEMIANBgAFqIAMoAmgiChAgQQAhByADQQA2ArABIANCgICAgMAANwKoASAMQQJqIQYgCkEBayEIQQQhC0EAIQUCQANAAkAgBSAKSQRAIAYgBUEBdCIAaiEBIAAgDGoiCS8BABAHQf8BcSEEIAUhAANAIAAgCEYEQCAKIQAMAwULIABBAWohACABLwEAIQ0gAUECaiEBIAQgDRAHQf8BcSINRiANQQRGcg0ACwwBBQsgAygCqAEhESADKAKsASELQQAhBCADQQA2ApQBIANCgICAgMAANwKMASALQQhqIQhBACEGAkADQCAIIARBDGwiCWohAANAIAAhASAHIAYiBUYEQCAEIAdJBEAgA0GoAWoiACALIARBDGxqIAcgBGsQDSADQQA2ArQBIANBjAFqIAAQEgULIAMoApABIgUgAygClAEiDUEEdGohFCADKAKMASESIANBoAFqIRAgBSEAA0AgACAURwRAIAAoAggiB0EBayEPQQghCSAHIgFBDGwiBkEMayIVIQgDQAJAIAFFBEAgA0GoAWogBxAgIAAoAgQhAQNAIAZFDQIgA0GoAWogASgCACABKAIEECIgBkEMayEGIAFBDGohAQwACwAFCyAJIAAoAgQiBGoiDi0AAEEPRgRAIBAgDigCADYCACADIA5BCGsiEykCADcDmAEgEyAOQQRqIAgQAiAAIA82AgggACgCACAPRgRAIAAQMiAAKAIEIQQFCyAPBEAgBEEMaiAEIBUQAgULIAQgAykDmAE3AgAgACAHNgIIIARBCGogECgCADYCAAULIAFBAWshASAIQQxrIQggCUEMaiEJDAELCyADQYABaiADQagBahAsIAMoAqgBIAMoAqwBEC8gACgCDCIBBEAgA0GAAWogAS8BABAUBQsgAEEQaiEADAEFCwsgA0HQAGogAygChAEiACADKAKIASAKECggDCAKIAMoAlAgAygCVBAmIAUhAQNAIA0EQCABKAIAIAFBBGooAgAQMCANQQFrIQ0gAUEQaiEBDAEFCwsgEiAFQRAQLiARIAsQMCADKAKAASAAEC8gAygCZCEHIANBjAFqIAMoAmgiChAgIANBADYCsAEgA0KAgICAwAA3AqgBQQAhAQJAA0AgASAKSQRAIAFBAWohACAHIAFBAXRqIQQCQCAKIAFBAmoiBk0NACAAIApPDQMgByAAQQF0ai8BAEG6IEcNACADQagBaiAEIAQvAQAgByAGQQF0ai8BAEG5IEYiBBAIQf8B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LiAQIAsQMSADKAKMASAAEC8gAygCZCEMIANBgAFqIAMoAmgiChAgQQAhByADQQA2ArABIANCgICAgMAANwKoASAMQQJqIQYgCkEBayEIQQQhC0EAIQUCQANAAkAgBSAKSQRAIAYgBUEBdCIAaiEBIAAgDGoiCS8BABAFQf8BcSEEIAUhAANAIAAgCEYEQCAKIQAMAwULIABBAWohACABLwEAIQ0gAUECaiEBIAQgDRAFQf8BcSINRiANQRJGcg0ACwwBBQsgAygCqAEhESADKAKsASELQQAhBCADQQA2ApQBIANCgICAgMAANwKMASALQQhqIQhBACEAAkADQCAIIARBDGwiCWohBgNAIAYhASAHIAAiBUYEQCAEIAdJBEAgA0GoAWoiACALIARBDGxqIAcgBGsQDSADQQA2ArQBIANBjAFqIAAQEgULIAMoApABIgUgAygClAEiDUEEdGohFCADKAKMASESIANBoAFqIRAgBSEAA0AgACAURwRAIAAoAggiB0EBayEPQQghCSAHIgFBDGwiBkEMayIVIQgDQAJAIAFFBEAgA0GoAWogBxAgIAAoAgQhAQNAIAZFDQIgA0GoAWogASgCACABKAIEECIgBkEMayEGIAFBDGohAQwACwAFCyAJIAAoAgQiBGoiDi0AAEEGRgRAIBAgDigCADYCACADIA5BCGsiEykCADcDmAEgEyAOQQRqIAgQAiAAIA82AgggACgCACAPRgRAIAAQMiAAKAIEIQQFCyAPBEAgBEEMaiAEIBUQAgULIAQgAykDmAE3AgAgACAHNgIIIARBCGogECgCADYCAAULIAFBAWshASAIQQxrIQggCUEMaiEJDAELCyADQYABaiADQagBahAsIAMoAqgBIAMoAqwBEC8gACgCDCIBBEAgA0GAAWogAS8BABAUBQsgAEEQaiEADAEFCwsgA0EoaiADKAKEASIAIAMoAogBIAoQKCAMIAogAygCKCADKAIsECYgBSEBA0AgDQRAIAEoAgAgAUEEaigCABAwIA1BAWshDSABQRBqIQEMAQULCyASIAVBEBAuIBEgCxAwIAMoAoABIAAQLwwfBQsgAUEMaiEGIAVBAWohACABLQAAQRVrQf8BcUEBSw0ACyAEIAVLDQEgA0GYAWogCSALaiAFIARrEA0gAUEIayIBKAIEBEAgA0GwAWogA0GgAWooAgA2AgAgAyADKQKYATcDqAEgAyABKAIANgK0ASADQYwBaiADQagBahASIAAhBAwBBQsLDB0LDBwLIAAgBU8EQCAAIApLDQIgAygCqAEgB0YEQCADQagBahAyIAMoAqwBIQsFCyALIAdBDGxqIgEgBDoACCABIAAgBWs2AgQgASAJNgIAIAEgAy8AmAE7AAkgAUELaiADQZoBai0AADoAACADIAdBAWoiBzYCsAEgACEFDAEFCwsMGgsMGQULIAFBCGohBiAFQQFqIQAgAS0AAEEFRw0ACyAEIAVNBEAgA0GoAWoiBiAJIAtqIAUgBGsQDiADIAFBBGsoAgA2ArQBIANBmAFqIAYQEiAAIQQMAQULCwwWC0ECIQkLIAMoAqgBIAFGBEAgA0GoAWoQMyADKAKsASEIBQsgBiAIaiIEIAk6AAAgBEEEayAANgIAIAZBCGohBiAAQQJqIQAgAUEBaiEBDAALAAULIAFBCGohBiAEQQFqIQAgAS0AAEEHRw0ACyAEIAhPBEAgA0GoAWoiBiALIA1qIAQgCGsQDiADIAFBBGsoAgA2ArQBIANBmAFqIAYQEiAAIQgMAQULCwwQCwwPBQsgAUEMaiEAIAVBAWohBiABLQAAQRNrQf8BcUEBSw0ACyAEIAVLDQEgA0GYAWogCSALaiAFIARrEA0gAUEIayIAKAIEBEAgA0GwAWogA0GgAWooAgA2AgAgAyADKQKYATcDqAEgAyAAKAIANgK0ASADQYwBaiADQagBahASIAYhBAwBBQsLDAwLDAsLIAAgBU8EQCAAIApLDQIgAygCqAEgB0YEQCADQagBahAyIAMoAqwBIQsFCyALIAdBDGxqIgEgBDoACCABIAAgBWs2AgQgASAJNgIAIAEgAy8AmAE7AAkgAUELaiADQZoBai0AADoAACADIAdBAWoiBzYCsAEgACEFDAEFCwsMCQsMCAULIAFBDGohBiAFQQFqIQAgAS0AAEEOcUEMRw0ACyAEIAVLDQEgA0GYAWogCSALaiAFIARrEA0gAUEIayIBKAIEBEAgA0GwAWogA0GgAWooAgA2AgAgAyADKQKYATcDqAEgAyABKAIANgK0ASADQYwBaiADQagBahASIAAhBAwBBQsLDAULDAQLIAAgBU8EQCAAIApLDQIgAygCqAEgB0YEQCADQagBahAyIAMoAqwBIQsFCyALIAdBDGxqIgEgBDoACCABIAAgBWs2AgQgASAJNgIAIAEgAy8AmAE7AAkgAUELaiADQZoBai0AADoAACADIAdBAWoiBzYCsAEgACEFDAEFCwsMAgsMAQsCQCACQYCAwABxRQRAIANBsAFqIANB6ABqKAIANgIAIAMgAykDYDcDqAEMAQULIAMoAmQhDyADKAJoIRFBACEAIANBADYCfCADQoCAgIAgNwJ0IANBADYCiAEgA0KAgICAwAA3AoABIA8gEUEBdGohBiAPIQEDQCAAIQIDQCAAIQQgASAGRgRAIAIgEUkEQCADQYABaiACIBEQHgULIAMoAoQBIhAgAygCiAFBA3RqIRVBACECA0ACQAJAIBAgFUcEQCAQKAIEIgUgECgCACIETwRAIAUgEU0EQCADQQA2ApQBIANCgICAgMAANwKMAQJAAkACQCAEIAVHBEBBACEGQQAhCiAPIARBAXQiAGoiDS8BABAKQf8BcSIHIQwgB0EBaw4DAQEDAgULDA0LIAVBAXQgAGshASANIQADQAJAIAFFBEBBAyEMDAEFCyAALwEAEApB/wFxIghFDQIgAUECayEBIABBAmohAEEDIQwgCEEDRw0BCwsMAQtBACEMQQEhCgsgAkEBaiELIBBBCGohECAFIARrIRQgDCAHIAdBAWtBAkkbIQQgDyAFQQF0aiEIIA0hAUEAIQUDQCABIAhHBEAgAS8BACEHIAYiAEEBaiEGIAFBAmohASAHEApB/wFxIgcgBEH/AXFGDQEgAyAEOgCwASADIAA2AqwBIAMgBTYCqAEgA0GMAWogA0GoAWoQHCAHIQQgACEFDAEFCwsgBSAURwRAIAMgBDoAsAEgAyAUNgKsASADIAU2AqgBIANBjAFqIANBqAFqEBwFCyADKAKUASIBQQFrIQ5BACEGIAMoApABIQdBACEEA0AgASAEIgBGBEBBACEGAkADQCAGIA4gBiAOShshBSABQQFrIQQCQANAIAYiACAFRwRAIAcgASAAECktAAggByABIABBAWoiBhApIggtAAhHDQEMAgULCyADIAE2ApQBIApFDQkgA0EgaiABQQF2IgAgByAAECVBACEFIAMoAiQhBiADKAIgIQQgA0EYaiAAIAcgAUEMbGogAEF0bGogABAlIAMoAhggAEEMbGpBDGshCCADKAIcIQcDQCAAIAVGDQkCQCAFIAZHBEAgByAAIAVBf3NqSwRAQQAhAQNAIAFBDEYNAyABIARqIgkoAgAhCiAJIAEgCGoiCSgCADYCACAJIAo2AgAgAUEEaiEBDAALAAULDBIFCwwRCyAIQQxrIQggBEEMaiEEIAVBAWohBQwACwALIAAgAUkEQCAHIABBDGxqIAgoAgQ2AgQgASAGTQ0CIAcgBkEMbGoiBiAGQQxqIAEgAGtBDGxBGGsQAiAOQQFrIQ4gBCEBIAAhBgwBBQsLDA0LDAwFC0EEIQhBBCEJIAAEQCAGIAdqQQRrLQAAIQkFCyABIABBAWoiBEsEQCAGIAdqQRRqLQAAIQgFCwJAAkAgBiAHaiISQQhqIgUtAAAiE0ECRwRAIABFIBNBAUdyDQECQCAJQf8BcQ4FAAICAgMCCyAKDQEgEkEMayIAKQIAIRYgACASKQIANwIAIBIgFjcCACAAQQhqIgAoAgAhCCAAIAUoAgA2AgAgBSAINgIADAEFCyAARQRAIAhB/wFxQQRGDQIgBSAIOgAADAEFCyAAIA5GDQAgCUH/AXEiAEEERg0BIAhB/wFxIghBBEYNASAAIAhHBEAgBSAMOgAADAEFCyAFIAk6AAALIAZBDGohBgwBCwsDQAwACwAFCwwJBQsMCAULIANBqAFqIAMoAngiACADKAJ8EBkgAygCgAEgAygChAFBCBAuIAMoAnQgABAvIAMoAmAgAygCZBAvDAYLIAMoApQBIQEgAygCkAEhBwsgByABQQxsaiEKIAMoAowBIQ4gByEMA0ACQCAKIAxHBEAgDC0ACCIEQQRHDQEFCyAOIAdBDBAuIAMoAogBQQFrIAJHBEAgA0H0AGpBChAUBQsgCyECDAILAkAgDCkCACIWQiCIpyIAIBanIgFPBEAgACAUTQRAIANBmAFqIA0gAUEBdGogACABaxAZIAMoAqABIQggAygCnAEiBSEBIAQNAiADQRBqIAhBAXYiASAFIAEQJSADKAIQIQAgA0EIaiABIAUgCEEBdGoiEiAIQX5xIgRrIAEQJSABQQFrIQEgAygCCCAEakECayEGIAMoAgwhBCADKAIUIQkCQAJAA0AgAUF/Rg0BIAlFDQIgASAESQRAIAAvAQAhEyAAIAYvAQA7AQAgBiATOwEAIAlBAWshCSAAQQJqIQAgBkECayEGIAFBAWshAQwBBQsLDAsLIAUhBANAAkAgBCASRwRAIANBqAFqQfiGwABBwAEQBBogA0KAgICAgAY3AugCIARBAmohAEEAIQEgBC8BACEJA0AgAUEEaiIGQcQBRg0CIANBqAFqIAFqIRMgBiEBIAkgEygCACIGQf//A3FHDQALIAQgBkEQdjsBAAwBBQsgAygCnAEhAQwFCyAAIQQMAAsACwwJBQsMCAULDAcLIAxBDGohDCADQfQAaiAFIAgQIiADKAKYASABEC8MAAsACwAFCyABLwEAIQUgBEEBaiEAIAFBAmohAQJAIAVBCmsOBAABAQABCwsgAiAERg0AIANBgAFqIAIgBBAeDAALAAsgAygCrAEiACADKAKwARAAIAMoAqgBIAAQLyADQYADaiQADwsDQAwACwALwQkBB38CQAJAIAIiBSAAIgMgAWtLBEAgASAFaiEAIAMgBWohAyAFQRBJDQFBACADQQNxIgZrIQgCQCADIANBfHEiBE0NACAGQQFrIQkCQCAGRQRAIAAhAgwBBQsgBiEHIAAhAgNAIANBAWsiAyACQQFrIgItAAA6AAAgB0EBayIHDQALCyAJQQNJDQAgAkEEayECA0AgA0EBayACQQNqLQAAOgAAIANBAmsgAkECai0AADoAACADQQNrIAJBAWotAAA6AAAgA0EEayIDIAItAAA6AAAgAkEEayECIAMgBEsNAAsLIAQgBSAGayIFQXxxIgJrIQNBACACayEGAkAgACAIaiIAQQNxBEAgAyAETw0BIABBA3QiAkEYcSEHIABBfHEiCEEEayEBQQAgAmtBGHEhCSAIKAIAIQIDQCAEQQRrIgQgAiAJdCABKAIAIgIgB3ZyNgIAIAFBBGshASADIARJDQALDAEFCyADIARPDQAgASAFakEEayEBA0AgBEEEayIEIAEoAgA2AgAgAUEEayEBIAMgBEkNAAsLIAVBA3EhBSAAIAZqIQAMAQULIAVBEE8EQAJAIAMgA0EAIANrQQNxIgZqIgJPDQAgASEEIAYEQCAGIQADQCADIAQtAAA6AAAgBEEBaiEEIANBAWohAyAAQQFrIgANAAsFCyAGQQFrQQdJDQADQCADIAQtAAA6AAAgA0EBaiAEQQFqLQAAOgAAIANBAmogBEECai0AADoAACADQQNqIARBA2otAAA6AAAgA0EEaiAEQQRqLQAAOgAAIANBBWog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AgAgBCAANgIADwULIAEgAiADajYCBA8LIAEoAgQgAmohAiABKAIAIgFBf0YNASABIAEoAgQiA2ogAEcNASABIAIgA2o2AgQgBCABNgIADwsgACACNgIEIABBfzYCACAEIAA2AgAPCyAEIAA2AgAgACABNgIAIAAgAjYCBAvxAQECfwJAAkAgAEGANGtB//8DcUEXSQ0AAkACQAJAAkACQAJAAkACQAJAAkAgAEH//wNxIgFBlzRrDgkDBAUGAwEBAgIAC0EBIQICQAJAIAFBjMAAaw4KCQEMDAwMCwsLCwALIAFBoAFGIAFB+8sAa0EESXIgAUHXAUZyDQogAUH//wNGDQkgAUGiwABGDQogAUHgwABGDQcgAUHMywBGDQogAUHP0wJGDQIgAUHPBkcNCwtBAg8LQQQPC0EFDwtBBg8LQQcPC0EIDwtBCQ8LQQsPC0EMDwtBDSECCyACDwtBCkEDIABB8P8DcUGA/ANGGwvOAQEKfyMAQRBrIgMkACADIAJBBEEMEBAgAygCACIHIAJB/////wNxIgQgBCAHSxshBkEAIQQgAygCBCEIIANBD2ohCgNAIAYEQCABIARqIglBBGooAgAhCyAJKAIAIQwgBCAIaiIFQQhqIAlBCGotAAA6AAAgBUEEaiALNgIAIAUgDDYCACAFQQlqIAMvAA07AAAgBUELaiAKLQAAOgAAIAZBAWshBiAEQQxqIQQMAQULCyAAIAI2AgggACAINgIEIAAgBzYCACADQRBqJAALnAEBCH8jAEEQayIEJAAgBEEIaiACQQRBCBAQIAQoAggiBiACQf////8BcSIDIAMgBksbIQVBACEDIAQoAgwhBwNAIAUEQCABIANqIggoAgAhCSADIAdqIgpBBGogCEEEai0AADoAACAKIAk2AgAgBUEBayEFIANBCGohAwwBBQsLIAAgAjYCCCAAIAc2AgQgACAGNgIAIARBEGokAAuVAQEDfyAAIQQDQAJAAkAgASAFRwRAIAQvAQBBIEYNASABQQFrIQQgAUEBdCAAakECayEADAIFCwNADAALAAsgBEECaiEEIAVBAWohBQwBCwsCQANAIAEgBE0NASAALwEAQSBGBEAgAEECayEAIARBAWshBCAGQQFqIQYMAQULCyADIAY2AgAgAiAFNgIADwsDQAwACwALjQECAn8BfiMAQRBrIgQkAAJAAkAgAiADakEBa0EAIAJrca0gAa1+IgZCIIinDQAgBqciBUGAgICAeCACa0sNAAJAIAVFBEBBACEBIAIhAwwBBQsgBEEIaiACIAUQJyAEKAIIIgNFDQILIAAgAzYCBCAAIAE2AgAgBEEQaiQADwsDQAwACwALIAIgBRAtAAuaAQEBfyAAQaIMa0H//wNxIgFBsgFPBEAgAEH//wNxQY3AAEYEQEEDDwULIABB7cAAa0H//wNxQQNJBEBBBA8FCyAAQbAJaiIBQf//A3FBkwJPBEAgAEGQA2pB//8DcSIAQY0BTwRAQQAPBQsgAEGHhcAAai0AAA8FCyABQf//A3FB9ILAAGotAAAPBQsgAUEBdEGQgMAAai8BAAuEAQEDfyAAKAIIIgMgACgCAEYEQCMAQRBrIgIkACACQQhqIAAgACgCAEEBQQRBEBAGIAIoAggiBEGBgICAeEcEQCAEIAIoAgwQLQAFCyACQRBqJAAFCyAAIANBAWo2AgggACgCBCADQQR0aiIAIAEpAgA3AgAgAEEIaiABQQhqKQIANwIAC3EBBX8jAEHAAWsiASQAQQghAiABQQxqQbiIwABBtAEQBBoDQCACQQRqIgRBwAFHBEAgAUEEaiACaiEDIAQhAiAAQf//A3EiBSADKAIAIgNB//8DcUkgA0EQdiAFSXINAQULCyABQcABaiQAIARBwAFHC28BA38gACgCCCIDIAAoAgBGBEAjAEEQayICJAAgAkEIaiAAIAAoAgBBAUECQQIQBiACKAIIIgRBgYCAgHhHBEAgBCACKAIMEC0ABQsgAkEQaiQABQsgACADQQFqNgIIIAAoAgQgA0EBdGogATsBAAtoAQJ/IAEgACgCCCIETQRAIAAoAgAgBEYEQCAAEDMFCyAAKAIEIAFBA3RqIQUgASAESQRAIAVBCGogBSAEIAFrQQN0EAIFCyAFIAM6AAQgBSACNgIAIAAgBEEBajYCCA8FCwNADAALAAtqAQR/IwBBQGoiASQAIAFBoJXAAEE4EAQiA0KAgICA4AE3AjhBACEBA0AgAUEEaiIEQTxHBEAgASADaiECIAQhASACKAIAIgJB//8DcSAASyACQRB2IABJcg0BBQsLIANBQGskACAEQTxHC14BBH8gAiABKAIIIgRJBEAgASgCBCACQQN0aiIDKAIAIQUgAy0ABCEGIAMgA0EIaiAEIAJBf3NqQQN0EAIgASAEQQFrNgIIIAAgBjoABCAAIAU2AgAPBQsDQAwACwALVAECfyMAQRBrIgIkAAJAIAAoAgAgACgCCCIDayABTw0AIAJBCGogACADIAFBAkECEAYgAigCCCIAQYGAgIB4Rg0AIAAgAigCDBAtAAsgAkEQaiQAC00BAn8jAEEQayIDJAAgA0EIaiACQQJBAhAQIAMoAgghBCADKAIMIAEgAkEBdBAEIQEgACACNgIIIAAgATYCBCAAIAQ2AgAgA0EQaiQAC0sBAX4CQCABIAJLBEAgASADSw0BA0AMAAsABQsDQAwACwALIAAgAkEDdGoiASkCACEEIAEgACADQQN0aiIAKQIANwIAIAAgBDcCAAtJAAJAIAEgAksEQCABIANLDQEDQAwACwAFCwNADAALAAsgACACQQF0aiIBLwEAIQIgASAAIANBAXRqIgAvAQA7AQAgACACOwEAC0gBAX8gACgCCCICIAAoAgBGBEAgABAyBQsgACACQQFqNgIIIAAoAgQgAkEMbGoiACABKQIANwIAIABBCGogAUEIaigCADYCAAtEAQF/IwBBEGsiAiQAIAJBCGogACAAKAIAQQFBBCABEAYgAigCCCIAQYGAgIB4RwRAIAAgAigCDBAtAAULIAJBEGokAAs8AQF/IAAoAggiAyAAKAIARgRAIAAQMwULIAAgA0EBajYCCCAAKAIEIANBA3RqIgAgAjYCBCAAIAE2AgALPAEBfyAAKAIIIgMgACgCAEYEQCAAEDMFCyAAIANBAWo2AgggACgCBCADQQN0aiIAIAI6AAQgACABNgIACzgCAX8BfiMAQRBrIgIkACACQQhqIAFBAkECEBAgAikDCCEDIABBADYCCCAAIAM3AgAgAkEQaiQACzIAIANBf3MgAWohAwNAIAIgA0kEQCAAIAEgAiADEBsgA0EBayEDIAJBAWohAgwBBQsLCy4BAX8gACACEBggACgCBCAAKAIIIgNBAXRqIAEgAkEBdBAEGiAAIAIgA2o2AggLMAEBfyMAQRBrIgIkACABQYCAgIAETwRAA0AMAAsABQsgACABQQF0EAsgAkEQaiQACyYBAX8jAEEQayIBJAAgAUEEaiAAECAgASgCCCEAIAFBEGokACAACyAAIAEgA00EQCAAIAE2AgQgACACNgIADwULA0AMAAsACx0AIAEgA0cEQANADAALAAULIAAgAiABQQF0EAQaCyUAIAIEQEHolcAALQAAGiACEAkhAQULIAAgAjYCBCAAIAE2AgALHwAgAiADSQRAA0AMAAsABQsgACADNgIEIAAgATYCAAsZACABIAJNBEADQAwACwAFCyAAIAJBDGxqCxkAIAEgAk0EQANADAALAAULIAAgAkEDdGoLGQAgASACTQRAA0AMAAsABQsgACACQQF0agsXACAAIAEoAgQgASgCCBAiIAFBADYCCAsVACAARQRAA0AMAAsABQsDQAwACwALEQAgAARAIAEgACACbBALBQsLCgAgACABQQIQLgsKACAAIAFBDBAuCwoAIAAgAUEIEC4LCAAgAEEMEB0LCAAgAEEIEB0LBgAgABATCwuKFAsAQYGAwAALQQEAAAAAAAEAAQABAAEAASERIRMBFSEXAxkhHQMfASMDJQMpAy0DMQM1ATkBOwE9AT8DQQNFA0kDTQNRA1UDWQNdAEHMgMAACy4DAANhA2UDaRNtA3EDdQN5AX0BfwOBBAGEAYQBhAGEAYQBRAMEAQQHBAgECAQBAEGEgcAACwgBhQGHAYkBiwBBrIHAAAvSAQQGCQAhACEAAAAhAAEAAQADAAsWCw4LAgMAAwALBgMAAwADAAMAAwADAAMACyoDAAk4AQABAAEACTQJMgk2AQABAAk8AQABAAEAAQABAAEACToBAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAs+AwADAAMAAwADAAtCAwADAAMAAwADAAMAAwADAAMAAwAJTgtQAwADAAtaAwAJVAtWAQABAAEACZAJiQmHCYsJkgEACY4LrAEAAwADAAuUAwAJXglgAAEAAAAAAAECAwBBn4PAAAsDAQIDAEGvg8AACwsBAAAAAQIDAAECAwBBoYTAAAsDAQIDAEGChcAAC50BBAQEBAQDAwMAAwADAwMDAwMDAwMDAAABAAEAAQABAAECAwABAAECAwABAAECAwABAgMAAQIDAAECAwABAgMAAQABAAEAAQABAgMAAQIDAAECAwABAgMAAQIDAAECAwABAgMAAQIDAAECAwABAgMAAQIDAAECAwABAgMAAQIDAAECAwABAAEAAQIDAAEAAQABAAEAAAAAAgQGCAoMDgBBqIbAAAsXAQADAAEAAQAAAgIAAAECAAEBAgABAQMAQciGwAALnA8BAAMAAQADAAABAgAAAQIAAQECAAEBAwC+C78LwAvBC8ILwwvEC8ULxgvHC8gLAAAoACkAKQAoADwAPgA+ADwAWwBdAF0AWwB7AH0AfQB7AKsAuwC7AKsAFSL1KR8i/isgIqMpISKbKSIioCkkIu4qQyLNIkUiTCJMIkUimCK4KaYi3iqoIuQqqSLjKqsi5Sq4ItwnzSJDIvIi+iLzIvsi9CL8IvYi/SL3Iv4i+iLyIvsi8yL8IvQi/SL2Iv4i9yLcJ7gimykhIqApIiKjKSAiuCmYIvUpFSLeKqYi4yqpIuQqqCLlKqsi7iokIv4rHyK+Bb4FwAXABcMFwwXGBcYF0AXqBfAF9AUIBggGCwYLBg0GDQYbBhsGHgZKBm0GbwZxBtUG5QbmBu4G7wb6Bg0HEAcQBxIHLwdNB6UHsQexB8AH6gf0B/UH+gf6BwAIFQgaCBoIJAgkCCgIKAgwCD4IQAhYCF4IXggPIA8gHfsd+x/7KPsq+zb7OPs8+z77PvtA+0H7Q/tE+0b7wfvT+z39UP2P/ZL9x/3w/fz9cP50/nb+/P4JAA0AHAAiACYAKgA7AEAAWwBgAHsAfgCFAIUAoQChAKYAqQCrAKwArgCvALQAtAC2ALgAuwC/ANcA1wD3APcAuQK6AsICzwLSAt8C5QLtAu8C/wJ0A3UDfgN+A4QDhQOHA4cD9gP2A4oFigUGBgcGDgYPBt4G3gbpBukG9gf5B/ML+Av6C/oLeAx+DDoPPQ+QE5kTABQAFIAWgBabFpwW8Bf5FwAYChgOGA4YQBlAGUQZRRneGf8ZvR+9H78fwR/NH88f3R/fH+0f7x/9H/4fACAKIBAgLiA1IEMgRSBfIHwgfiCMII4gACEBIQMhBiEIIQkhFCEUIRYhGCEeISMhJSElISchJyEpISkhOiE7IUAhRCFKIU0hUCFfIYkhiSGQIREiFCI1I3sjlCOWI/MjACQmJEAkSiRgJIck6iSrJq0m/yYBJ8onzCfMJ84n/ycAKUwrUCtZK+Us6iz5LP8sAC4xLoAumS6bLvMuAC/VL/Av+y8AMAQwCDAgMDAwMDA2MDcwPTA/MJswnDCgMKAw+zD7MMAx4zEdMh4yUDJfMnwyfjKxMr8yzDLPMnczejPeM98z/zP/M8BN/02QpMakDaYPpnOmc6Z+pn+mAKchp4iniKcoqCuodKh3qD79P/39/f39EP4Z/jD+T/5R/lH+VP5U/lb+Xv5g/mH+ZP5m/mj+aP5r/mv+Af8C/wb/Cv8b/yD/O/9A/1v/Zf/i/+T/6P/u/wAACAAOABsAIwAlACsAOgB/AIQAhgCgAKIApQCtAK0AsACzALkAuQAAA28DgwSJBJEFvQW/Bb8FwQXCBcQFxQXHBccFAAYDBgkGCgYMBgwGEAYaBksGbAZwBnAG1gbdBt8G5AbnBugG6gbtBvAG+QYPBw8HEQcRBzAHSgemB7AH6wfzBxYIGQgbCCMIJQgnCCkILQhZCFsIAAkCCToJOgk8CTwJQQlICU0JTQlRCVcJYgljCYEJgQm8CbwJwQnECc0JzQniCeMJ8gnzCfsJ+wkBCgIKPAo8CkEKQgpHCkgKSwpNClEKUQpwCnEKdQp1CoEKggq8CrwKwQrFCscKyArNCs0K4grjCvEK8QoBCwELPAs8Cz8LPwtBC0QLTQtNC1YLVgtiC2MLgguCC8ALwAvNC80L+Qv5Cz4MQAxGDEgMSgxNDFUMVgxiDGMMvAy8DMwMzQziDOMMQQ1EDU0NTQ1iDWMNyg3KDdIN1A3WDdYNMQ4xDjQOOg4/Dj8ORw5ODrEOsQ60DrkOuw68DsgOzQ4YDxkPNQ81DzcPNw85DzkPcQ9+D4APhA+GD4cPjQ+XD5kPvA/GD8YPLRAwEDIQNxA5EDoQPRA+EFgQWRBeEGAQcRB0EIIQghCFEIYQjRCNEJ0QnRBdE18TEhcUFzIXNBdSF1MXchdzF7cXvRfGF8YXyRfTF9sX2xfdF90XCxgNGKkYqRggGSIZJxkoGTIZMhk5GTsZFxoYGlYaVhpYGl4aYBpgGmIaYhplGmwacxp8Gn8afxoAGwMbNBs0GzYbOhs8GzwbQhtCG2sbcxuAG4EbohulG6gbqRvmG+Yb6BvpG+0b7RvvG/EbLBwzHDYcNxzQHNIc1BzgHOIc6BztHO0cwB3mHfwd/x0LIA0gLyA0IEQgRCBgIGQgaiBwIHQgeyCAIIsgoCC5INAg8CAuIS4hEiITIogkmyTvLPEsfy1/LeAt/y0qMC8wmTCaMG+mcqZ8pn2m8KbxpgKoAqgGqAaoC6gLqCWoJqg4qDmoxKjEqOCo8agmqS2pR6lRqYCpgqmzqbOptqm5qbypvKm8qbypKaouqjGqMqo1qjaqQ6pDqkyqTKqwqrCqsqq0qrequKq+qr+qwarBquWr5avoq+ir7avtqx77Hvsp+yn7AP4P/iD+Jv5Q/lD+Uv5S/lX+Vf5f/l/+Yv5j/mn+av7//v/+A/8F/wv/Gv/g/+H/5f/m/wBO/58ANL9NAPn/+gAv3y+ALv8uwDHvMfAv/y8AMD8wMP5P/gD/7/9Q/m/+EP4f/gAy/zIAM/8zXAZdBlwGXgZcBl8GAEHklcAACwT/////";

// node_modules/unicode-shaper/dist/textShaperWasm.js
class WasmTextShaper {
  instance;
  wasmMemory;
  tmpString = "";
  constructor() {
    const mod = new WebAssembly.Module(base64ToArrayBuffer(uShaper_wasm_default));
    this.instance = new WebAssembly.Instance(mod, {
      env: {
        setUnicodeArray: (ptr, len) => {
          this.tmpString = "";
          if (len === 0 || ptr < 0)
            return;
          const buf = this.#get(ptr, len);
          for (let i = 0;i < len; i++)
            this.tmpString += String.fromCharCode(buf[i]);
        }
      }
    });
  }
  shapeString(str, options = DEFAULT_OPTIONS) {
    const processText = this.instance.exports.processText;
    const free = this.instance.exports.free;
    if (str.length === 0)
      return str;
    const len = str.length;
    const ptr = this.#putString(str);
    processText(ptr, len, options);
    free(ptr, len);
    return this.tmpString;
  }
  isRTL(unicode) {
    const isRTL = this.instance.exports.isRTL;
    return isRTL(unicode) === 1;
  }
  isCJK(unicode) {
    const isCJK = this.instance.exports.isCJK;
    return isCJK(unicode) === 1;
  }
  #putString(str) {
    const len = str.length;
    const buf = new Uint16Array(len);
    const ptr = this.#allocUnicodeArray(len);
    for (let i = 0;i < len; i++)
      buf[i] = str.charCodeAt(i);
    const view = this.#getMemory();
    view.subarray(ptr, ptr + len * 2).set(new Uint8Array(buf.buffer));
    return ptr;
  }
  #get(ptr, len) {
    const view = this.#getMemory();
    const view16 = new Uint16Array(view.buffer, ptr, len);
    const copy = new Uint16Array(len);
    for (let i = 0;i < len; i++)
      copy[i] = view16[i];
    return copy;
  }
  #allocUnicodeArray(size) {
    const allocUnicodeArray = this.instance.exports.allocUnicodeArray;
    return allocUnicodeArray(size);
  }
  #getMemory() {
    const memory = this.instance.exports.memory;
    if (this.wasmMemory === undefined || this.wasmMemory.buffer !== memory.buffer) {
      this.wasmMemory = new Uint8Array(memory.buffer);
    }
    return this.wasmMemory;
  }
}
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0;i < len; i++)
    bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}
// src/text-tools.ts
class TextTools {
  static _glyphs = new Map;
  static _glyphsReverse = new Map;
  static _nextIndex = 1;
  static _graphemeSeg = new Intl.Segmenter("en", { granularity: "grapheme" });
  static _wordSeg = new Intl.Segmenter("en", { granularity: "word" });
  static _textArray = new Array32(1, 128);
  static _runArray = new Array32(1, 128);
  static _wordArray = new Array32(1, 128);
  static _pendingWordArray = new Array32(1, 128);
  static _shaper = new WasmTextShaper;
  static getOrAdd(glyph) {
    let index = TextTools._glyphs.get(glyph);
    if (index === undefined) {
      index = TextTools._nextIndex++;
      TextTools._glyphs.set(glyph, index);
      TextTools._glyphsReverse.set(index, glyph);
    }
    return index;
  }
  static getGlyph(index) {
    const str = TextTools._glyphsReverse.get(index);
    if (str === undefined) {
      throw `Unknown glyph ${index}`;
    }
    return str;
  }
  static getTextFlags(str) {
    let flags = 0;
    for (let i = 0;i < str.length; i++) {
      const cc = str.charCodeAt(i);
      if (cc < 255) {
        if (cc < 32 || cc != 9 && cc != 10) {
          flags |= 1 /* BOX_CHARS */;
        } else {
          flags |= 2 /* LATIN_1 */;
        }
      } else {
        flags |= 4 /* NON_LATIN_1 */;
        if (this._shaper.isRTL(cc)) {
          flags |= 8 /* RTL */;
        }
      }
    }
    return flags;
  }
  static isLatin(str) {
    for (let i = 0;i < str.length; i++) {
      if (str.charCodeAt(i) >= 255) {
        return false;
      }
    }
    return true;
  }
  static isStrRtl(str) {
    for (let i = 0;i < str.length; i++) {
      const cc = str.charCodeAt(i);
      if (cc >= 1536 && cc <= 1791 || cc >= 1872 && cc <= 1919 || cc >= 2208 && cc <= 2303 || cc >= 64336 && cc <= 65023 || cc >= 65136 && cc <= 65279 || cc >= 1424 && cc <= 1535 || cc >= 64285 && cc <= 64335) {
        return true;
      }
    }
    return false;
  }
  static isGlyphSpace(glyph) {
    if (glyph == 32 || glyph == 9)
      return true;
    if (glyph >= 8192 && glyph <= 8202)
      return true;
    if (glyph == 8287 || glyph == 12288)
      return true;
    return false;
  }
  static EncodeArray32(str, into, flags, char_attr) {
    let encoding = into || TextTools._textArray;
    flags = flags || this.getTextFlags(str);
    char_attr = char_attr || 0;
    encoding.reset(1);
    if ((flags & 8 /* RTL */) == 0) {
      for (const segment of TextTools._graphemeSeg.segment(str)) {
        const glyph = segment.segment;
        let cc = glyph.charCodeAt(0) || 0;
        if (cc == 0) {
          continue;
        }
        if (cc < 32768) {
          if (this.isGlyphSpace(cc)) {
            cc = 32;
          }
          encoding.push(cc | char_attr);
        } else {
          const num = 32768 + TextTools.getOrAdd(glyph);
          encoding.push(num | char_attr);
        }
      }
    } else {
      const shape2 = TextTools._shaper.shapeString(str);
      for (const grapheme of TextTools._graphemeSeg.segment(shape2)) {
        const glyph = grapheme.segment;
        let cc = glyph.charCodeAt(0) || 0;
        if (cc == 0) {
          continue;
        }
        if (cc < 32768) {
          if (this.isGlyphSpace(cc)) {
            cc = 32;
          }
          encoding.push(cc | char_attr);
        } else {
          const num = 32768 + TextTools.getOrAdd(glyph);
          encoding.push(num | char_attr);
        }
      }
    }
    return encoding;
  }
  static encode(str) {
    let outStr = "";
    for (const segment of TextTools._graphemeSeg.segment(str)) {
      const glyph = segment.segment;
      if (glyph.length == 1) {
        if (glyph.charCodeAt(0) < 32768) {
          outStr += glyph;
          continue;
        }
      }
      const num = 32768 + TextTools.getOrAdd(glyph);
      outStr += String.fromCharCode(num);
    }
    return outStr;
  }
}

// src/atlas/atlas.ts
var FONT_FAMILY = '"Cascadia Code", Menlo, monospace';
var ASCENT_GLYPHS = ["|", "É", "q", "Å"];
var DESCENT_GLYPHS = ["|", "É", "q", "Å"];

class Atlas {
  _palette;
  _sheets = new Array;
  _entries = new Map;
  _cellW = 0;
  _cellH = 0;
  _fontSize = 0;
  _dpr = 0;
  _tempCanvas;
  _tempContext;
  _scaledFontSize = 0;
  _fontAscent = 0;
  _fontDescent = 0;
  _realCellW = 0;
  _realCellH = 0;
  _fontHeight = 0;
  _aspect_ratio = 0;
  _glyph_grid = 0;
  _glyph_middle_x = 0;
  _glyph_middle_y = 0;
  _glyph_top = 0;
  constructor(palette) {
    this._palette = palette;
    this._tempCanvas = document.createElement("canvas");
    this._tempContext = this._tempCanvas.getContext("2d", { alpha: false });
    this._tempCanvas.width = 128;
    this._tempCanvas.height = 128;
  }
  clear() {
    this._entries.clear();
    for (const sheet of this._sheets) {
      sheet.clear();
    }
  }
  configure(metrics) {
    if (this._cellW === metrics.cellWidth && this._cellH === metrics.cellHeight && this._dpr === metrics.dpr) {
      return;
    }
    this.clear();
    this._cellW = metrics.cellWidth;
    this._cellH = metrics.cellHeight;
    this._fontSize = metrics.cellHeight;
    this._dpr = metrics.dpr;
    const scaledFontSize = this._fontSize * this._dpr;
    const scaledCellH = this._cellH * this._dpr;
    const scaledCellW = this._cellW * this._dpr;
    this._tempContext.textbaseLine = "alphabetic";
    let adjustedFontSize = scaledFontSize;
    let maxAscent = 0, maxDescent = 0;
    for (let i = 0;i < 5; i++) {
      this._tempContext.font = `${adjustedFontSize}px ${FONT_FAMILY}`;
      maxAscent = 0, maxDescent = 0;
      for (const glyph of ASCENT_GLYPHS) {
        const metric = this._tempContext.measureText(glyph);
        maxAscent = Math.max(maxAscent, metric.actualBoundingBoxAscent);
      }
      for (const glyph of DESCENT_GLYPHS) {
        const metric = this._tempContext.measureText(glyph);
        maxDescent = Math.max(maxDescent, metric.actualBoundingBoxDescent);
      }
      const fontHeight = maxAscent + maxDescent;
      if (fontHeight <= scaledCellH) {
        break;
      }
      adjustedFontSize *= scaledCellH / fontHeight;
    }
    this._scaledFontSize = adjustedFontSize;
    this._fontAscent = maxAscent;
    this._fontDescent = maxDescent;
    this._fontHeight = maxAscent + maxDescent;
    this._realCellW = scaledCellW;
    this._realCellH = scaledCellH;
    this._tempContext.font = `${this._scaledFontSize}px ${FONT_FAMILY}`;
    this._glyph_grid = this._realCellW / 3;
    this._glyph_top = (this._realCellH - this._glyph_grid * 3) / 2;
    this._glyph_middle_x = this._glyph_grid * 1.5;
    this._glyph_middle_y = this._glyph_top + this._glyph_grid * (3 / 2);
    this._aspect_ratio = this._realCellH / this._realCellW;
    console.log("** Atlas configure", this._cellW, this._cellH, this._dpr);
  }
  get(char_attr) {
    let entry = this._entries.get(char_attr);
    if (entry === undefined) {
      entry = this.render(char_attr);
    }
    return entry;
  }
  getSheet(id) {
    return this._sheets[id];
  }
  renderTo(dstCtx, char_attr, x, y) {
    const entry = this.get(char_attr);
    const sheet = this._sheets[entry.sheet];
    dstCtx.drawImage(sheet.canvas, entry.x, entry.y, this._realCellW, this._realCellH, x, y, this._realCellW, this._realCellH);
  }
  render(char_attr) {
    let char = char_attr & 65535;
    let attr = (char_attr & 4294901760) >> 16;
    if (char === 9608) {
      char = 1;
    }
    const fg = attr & 15;
    const bg = attr >> 4 & 15;
    const ctx = this._tempContext;
    if (char > 32) {
      ctx.save();
      let charStr;
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, this._realCellW, this._realCellH);
      if (char >= 32768) {
        charStr = TextTools.getGlyph(char - 32768);
      } else {
        charStr = String.fromCharCode(char);
      }
      const metrics = ctx.measureText(charStr);
      const width = metrics.width;
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      if (width > this._realCellW || height > this._realCellH) {
        const scaleFactorX = this._realCellW / width;
        const scaleFactorY = this._realCellH / height;
        const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
        ctx.translate(this._realCellW / 2, this._realCellH / 2);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(-this._realCellW / 2, -this._realCellH / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const charX = this._realCellW / 2;
        const charY = this._realCellH / 2;
        ctx.fillStyle = this._palette.getHexColourChecked(fg);
        ctx.fillText(charStr, charX, charY);
      } else {
        ctx.textBaseline = "alphabetic";
        const charX = Math.round((this._realCellW - metrics.width) / 2);
        const charY = Math.round((this._realCellH - this._fontHeight) / 2 + this._fontAscent);
        ctx.fillStyle = this._palette.getHexColourChecked(fg);
        ctx.fillText(charStr, charX, charY);
      }
      ctx.restore();
    } else {
      ctx.save();
      this.renderSpecial(ctx, char, fg, bg);
      ctx.restore();
    }
    for (const sheet2 of this._sheets) {
      const entry2 = sheet2.allocate(this._realCellW, this._realCellH);
      if (entry2 !== null) {
        sheet2.ctx.drawImage(this._tempCanvas, 0, 0, this._realCellW, this._realCellH, entry2.x, entry2.y, this._realCellW, this._realCellH);
        this._entries.set(char_attr, entry2);
        return entry2;
      }
    }
    const sheet = new AtlasSheet(this._sheets.length);
    this._sheets.push(sheet);
    const entry = sheet.allocate(this._realCellW, this._realCellH);
    if (entry === null) {
      throw `Character is too large for atlas`;
    }
    sheet.ctx.drawImage(this._tempCanvas, 0, 0, this._realCellW, this._realCellH, entry.x, entry.y, this._realCellW, this._realCellH);
    this._entries.set(char_attr, entry);
    return entry;
  }
  renderSpecial(ctx, char, fg, bg) {
    const w = this._realCellW;
    const h = this._realCellH;
    const xm = this._glyph_middle_x;
    const ym = this._glyph_middle_y;
    const gs = Math.round(this._glyph_grid * 0.5);
    const gsh = gs * 0.5;
    const aspect = this._aspect_ratio;
    if (char == 0) {
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(0, 0, w, h);
    } else if (char == 32) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
    } else if (char >= 1 && char <= 3) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      if (char == 1) {
        ctx.moveTo(gsh, 0);
        ctx.lineTo(gsh, h);
      } else if (char == 2) {
        ctx.moveTo(xm, 0);
        ctx.lineTo(xm, h);
      } else {
        ctx.moveTo(w - gsh, 0);
        ctx.lineTo(w - gsh, h);
      }
      ctx.stroke();
    } else if (char >= 4 && char <= 6) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      if (char == 4) {
        ctx.moveTo(0, gsh);
        ctx.lineTo(w, gsh);
      } else if (char == 5) {
        ctx.moveTo(0, ym);
        ctx.lineTo(w, ym);
      } else {
        ctx.moveTo(0, h - gsh);
        ctx.lineTo(w, h - gsh);
      }
      ctx.stroke();
    } else if (char >= 7 && char <= 10) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = 0;
      const hh = h / 2;
      const ww = w / 4;
      let lx, ly, mx, my, rx, ry;
      if (char == 7) {
        lx = ww;
        ly = hh;
        mx = w - ww;
        my = hh - ww;
        rx = mx;
        ry = hh + ww;
      } else if (char == 8) {
        lx = w / 2;
        ly = hh - ww;
        mx = w - ww;
        my = hh + ww;
        rx = ww;
        ry = hh + ww;
      } else if (char == 9) {
        lx = ww;
        ly = hh - ww;
        mx = w - ww;
        my = hh;
        rx = ww;
        ry = hh + ww;
      } else if (char == 10) {
        lx = w / 2;
        ly = hh + ww;
        mx = w - ww;
        my = hh - ww;
        rx = ww;
        ry = hh - ww;
      }
      ctx.beginPath();
      ctx.lineTo(lx, ly);
      ctx.lineTo(mx, my);
      ctx.lineTo(rx, ry);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char == 11) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(gsh, h);
      ctx.lineTo(0 + gsh, 0 + gsh);
      ctx.lineTo(w - gsh, gsh);
      ctx.stroke();
    } else if (char == 12) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(gsh, gsh);
      ctx.lineTo(w - gsh, gsh);
      ctx.lineTo(w - gsh, h - gsh);
      ctx.stroke();
    } else if (char == 13) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(w - gsh, gsh);
      ctx.lineTo(w - gsh, h - gsh);
      ctx.lineTo(gsh, h - gsh);
      ctx.stroke();
    } else if (char == 14) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(w - gsh, h - gsh);
      ctx.lineTo(gsh, h - gsh);
      ctx.lineTo(gsh, gsh);
      ctx.stroke();
    } else if (char == 15) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(xm, h);
      ctx.lineTo(xm, ym);
      ctx.lineTo(w, ym);
      ctx.stroke();
    } else if (char == 16) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(0, ym);
      ctx.lineTo(xm, ym);
      ctx.lineTo(xm, h);
      ctx.stroke();
    } else if (char == 17) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(xm, 0);
      ctx.lineTo(xm, ym);
      ctx.lineTo(w, ym);
      ctx.stroke();
    } else if (char == 18) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(xm, 0);
      ctx.lineTo(xm, ym);
      ctx.lineTo(0, ym);
      ctx.stroke();
    } else if (char == 19) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(w - gs, h - gs, gs, gs);
    } else if (char == 20) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(0, h - gs, gs, gs);
    } else if (char == 21) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(w - gs, 0, gs, gs);
    } else if (char == 22) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(0, 0, gs, gs);
    } else if (char == 23) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(0, gsh);
      ctx.lineTo(w, gsh);
      ctx.moveTo(0, gsh * 4);
      ctx.lineTo(w, gsh * 4);
      ctx.stroke();
    } else if (char == 24) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.fillRect(0, 0, gs, gs);
      ctx.fillRect(gs * 1.5, 0, gs, gs * 2.5);
      ctx.fillRect(0, gs * 1.5, gs * 2, gs);
    } else if (char == 25) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(gsh, 0);
      ctx.lineTo(gsh, h);
      ctx.moveTo(gsh * 4, 0);
      ctx.lineTo(gsh * 4, h);
      ctx.stroke();
    } else if (char == 26) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      let k = 0;
      const s = 6;
      let sx = 0;
      let sy = 0;
      const sw = w / s;
      const sh = h / s;
      for (let j = 0;j < s; j++) {
        for (let i = 0;i < s; i++) {
          k = 1 - k;
          if (k == 1) {
            ctx.fillRect(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2);
          }
          sx += sw;
        }
        sx = 0;
        sy += sh;
        k = 1 - k;
      }
    } else if (char == 27) {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs * 2;
      ctx.beginPath();
      let ww = w;
      let x = -ww * 0.5;
      let y = -h * 0.5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + ww, y + h);
      ctx.stroke();
      x += ww;
      ctx.moveTo(x, y);
      ctx.lineTo(x + ww, y + h);
      ctx.stroke();
      x = -ww * 0.5;
      y += h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + ww, y + h);
      ctx.stroke();
      x += ww;
      ctx.moveTo(x, y);
      ctx.lineTo(x + ww, y + h);
      ctx.stroke();
    } else {
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs;
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
    }
  }
}

// src/buffer/bitmap-utils.ts
class Bitmap32Utils {
  static Clear(dst, value) {
    dst.buffer.fill(value & 4294967295);
  }
  static Set(dst, x, y, value) {
    if (x >= 0 && x < dst.cols && y >= 0 && y < dst.rows) {
      dst.buffer[x + y * dst.stride] = value;
    }
  }
  static Print(dst, x, y, text, attr) {
    if (!dst)
      return;
    if (typeof text === "string") {
      const textFlags = TextTools.getTextFlags(text);
      if (textFlags <= 2 /* LATIN_1 */) {
        Bitmap32Utils._PrintLatin1(dst, x, y, text, attr || 983040);
      } else {
        Bitmap32Utils._PrintArray(dst, x, y, TextTools.EncodeArray32(text, undefined, undefined, attr), undefined);
      }
    } else {
      Bitmap32Utils._PrintArray(dst, x, y, text, attr);
    }
  }
  static _PrintLatin1(dst, x, y, text, attr) {
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
    let offset = left + y * stride;
    for (let i = textStart;i < textStart + width; i++) {
      buf[offset++] = text.charCodeAt(i) & 65535 | attr;
    }
  }
  static _PrintArray(dst, x, y, array, attr) {
    if (!dst)
      return;
    const stride = dst.stride;
    const cols = dst.cols;
    const rows = dst.rows;
    const buf = dst.buffer;
    if (y < 0 || y >= rows)
      return;
    const len = array.size;
    const left = x < 0 ? 0 : x;
    const right = x + len > cols ? cols : x + len;
    if (left >= right)
      return;
    const textStart = left - x;
    const width = right - left;
    let offset = left + y * stride;
    if (attr === undefined) {
      for (let i = textStart;i < textStart + width; i++) {
        buf[offset++] = array.get(i);
      }
    } else {
      for (let i = textStart;i < textStart + width; i++) {
        buf[offset++] = array.get(i) | attr;
      }
    }
  }
  static HLine(dst, x, y, w, value, pattern) {
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
    pattern = (pattern & 4294967295) >>> 0;
    if (pattern == 4294967295) {
      buf.fill(value, left + y * stride, right + y * stride);
    } else {
      let bg = 15728640 & value;
      let fg = 983040 & value;
      let off_value = bg >> 4 | fg << 4 | value & 4278255615;
      let off = left + y * stride;
      let p = pattern;
      for (let i = left;i < right; i++) {
        if (p & 1) {
          buf[off] = value;
        } else {
          buf[off] = off_value;
        }
        p = (p >>> 1 | p << 31) >>> 0;
        off++;
      }
    }
  }
  static VLine(dst, x, y, h, value, pattern) {
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
    pattern = (pattern & 4294967295) >>> 0;
    if (pattern === 4294967295) {
      let offset = x + top * stride;
      for (let row = top;row < bottom; row++) {
        buf[offset] = value;
        offset += stride;
      }
    } else {
      let bg = 15728640 & value;
      let fg = 983040 & value;
      let off_value = bg >> 4 | fg << 4 | value & 4278255615;
      let p = pattern;
      let offset = x + top * stride;
      for (let row = top;row < bottom; row++) {
        if (p & 1) {
          buf[offset] = value;
        } else {
          buf[offset] = off_value;
        }
        p = (p >>> 1 | p << 31) >>> 0;
        offset += stride;
      }
    }
  }
  static Fill(dst, x, y, w, h, value) {
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
    let offset = left + top * stride;
    for (let row = top;row < bottom; row++) {
      buf.fill(value, offset, offset + width);
      offset += stride;
    }
  }
  static Border(dst, x, y, w, h, glyphs) {
    if (!dst)
      return;
    if (glyphs.length != 9)
      return;
    if (w < 3 || h < 3)
      return;
    Bitmap32Utils.Set(dst, x, y, glyphs[0]);
    Bitmap32Utils.Set(dst, x + w - 1, y, glyphs[2]);
    Bitmap32Utils.Set(dst, x, y + h - 1, glyphs[6]);
    Bitmap32Utils.Set(dst, x + w - 1, y + h - 1, glyphs[8]);
    Bitmap32Utils.HLine(dst, x + 1, y, w - 2, glyphs[1]);
    Bitmap32Utils.HLine(dst, x + 1, y + h - 1, w - 2, glyphs[7]);
    Bitmap32Utils.VLine(dst, x, y + 1, h - 2, glyphs[3]);
    Bitmap32Utils.VLine(dst, x + w - 1, y + 1, h - 2, glyphs[5]);
    Bitmap32Utils.Fill(dst, x + 1, y + 1, w - 2, h - 2, glyphs[4]);
  }
  static Blit(dst, src, dstX, dstY, srcX, srcY, w, h) {
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
    if (dstX < 0) {
      srcX -= dstX;
      w += dstX;
      dstX = 0;
    }
    if (srcX < 0) {
      dstX -= srcX;
      w += srcX;
      srcX = 0;
    }
    if (dstY < 0) {
      srcY -= dstY;
      h += dstY;
      dstY = 0;
    }
    if (srcY < 0) {
      dstY -= srcY;
      h += srcY;
      srcY = 0;
    }
    if (dstX + w > dstCols)
      w = dstCols - dstX;
    if (srcX + w > srcCols)
      w = srcCols - srcX;
    if (dstY + h > dstRows)
      h = dstRows - dstY;
    if (srcY + h > srcRows)
      h = srcRows - srcY;
    if (w <= 0 || h <= 0)
      return;
    if (dstX < 0 || dstY < 0 || srcX < 0 || srcY < 0)
      return;
    if (dstX + w > dstCols || dstY + h > dstRows)
      return;
    if (srcX + w > srcCols || srcY + h > srcRows)
      return;
    let srcOffset = srcX + srcY * srcStride;
    let dstOffset = dstX + dstY * dstStride;
    for (let row = 0;row < h; row++) {
      dstBuf.set(srcBuf.subarray(srcOffset, srcOffset + w), dstOffset);
      srcOffset += srcStride;
      dstOffset += dstStride;
    }
  }
  static CopyAlways(dst, left) {
    if (!dst || !left)
      return;
    if (dst.maxSize != left.maxSize)
      return;
    const len = dst.maxSize;
    const dstBuf = dst.buffer;
    const leftBuf = left.buffer;
    dstBuf.set(leftBuf, 0);
  }
  static CopyNewer(dst, left, right) {
    if (!dst || !left || !right)
      return;
    if (left.maxSize != right.maxSize || dst.maxSize != left.maxSize)
      return;
    const len = dst.maxSize;
    const dstBuf = dst.buffer;
    const leftBuf = left.buffer;
    const rightBuf = right.buffer;
    for (let i = 0;i < len; i++) {
      dstBuf[i] = leftBuf[i] | rightBuf[i];
    }
  }
  static CopyMask(dst, left, right, mask) {
    if (!dst || !left || !right || !mask)
      return;
    if (left.maxSize != right.maxSize || dst.maxSize != mask.maxSize || left.maxSize != mask.maxSize)
      return;
    const len = dst.maxSize;
    const dstBuf = dst.buffer;
    const leftBuf = left.buffer;
    const rightBuf = right.buffer;
    const maskBuf = mask.buffer;
    for (let i = 0;i < len; i++) {
      dstBuf[i] = leftBuf[i] & ~maskBuf[i] | rightBuf[i] & maskBuf[i];
    }
  }
}

// src/buffer/bitmap32.ts
class Bitmap32 {
  _cols;
  _stride;
  _rows;
  maxSize;
  buffer;
  constructor(cols, rows, stride) {
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
  set cols(cols) {
    this._cols = cols;
  }
  get stride() {
    return this._stride;
  }
  set stride(stride) {
    const size = this._rows * stride;
    if (size > this.maxSize) {
      throw `Buffer to large! New: ${size}, Existing: ${this.maxSize} ${stride}`;
    }
    this._stride = stride;
  }
}

// src/buffer/plain-buffer.ts
class PlainBuffer {
  _glyphs;
  _generation = 0;
  _generationBits = 0;
  _dirtyGeneration = 255;
  constructor(cols, maxCols, rows) {
    this._glyphs = new Bitmap32(cols, rows, maxCols);
    this._glyphs.buffer.fill(0);
  }
  configure(metrics) {
    if (this._glyphs.rows != metrics.rows || this._glyphs.cols != metrics.cols) {
      this._glyphs.cols = Math.min(this._glyphs.stride, metrics.cols);
    }
  }
  get generation() {
    return this._generation;
  }
  set generation(generation) {
    this._generation = generation;
    this._generationBits = generation << 24;
    this._dirtyGeneration = 255;
  }
  get generationBits() {
    return this._generationBits;
  }
  get glyphs() {
    return this._glyphs;
  }
  get dirty() {
    return this._generation === this._dirtyGeneration;
  }
  get cols() {
    return this._glyphs.cols;
  }
  get rows() {
    return this._glyphs.rows;
  }
  get stride() {
    return this._glyphs.stride;
  }
  bumpGeneration() {
    this._dirtyGeneration = this._generation;
    this._generation++;
    if (this._generation >= 255) {
      this._generation = 1;
    }
    this._generationBits = this._generation << 24;
  }
  clear(char_attr) {
    Bitmap32Utils.Clear(this._glyphs, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  set(x, y, char_attr) {
    Bitmap32Utils.Set(this._glyphs, x, y, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  hline(x, y, w, char_attr, pattern) {
    Bitmap32Utils.HLine(this._glyphs, x, y, w, char_attr & 16777215 | this._generationBits, pattern || 4294967295);
    this._dirtyGeneration = this._generation;
  }
  vline(x, y, h, char_attr, pattern) {
    Bitmap32Utils.VLine(this._glyphs, x, y, h, char_attr & 16777215 | this._generationBits, pattern || 4294967295);
    this._dirtyGeneration = this._generation;
  }
  fill(x, y, w, h, char_attr) {
    Bitmap32Utils.Fill(this._glyphs, x, y, w, h, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  print(x, y, text, char_attr) {
    Bitmap32Utils.Print(this._glyphs, x, y, text, char_attr & 16711680 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  border(x, y, w, h, char_attrs) {
    if (char_attrs && char_attrs.length === 9) {
      const char_attrs_gen = new Array(9);
      for (let i = 0;i < 9; i++) {
        char_attrs_gen[i] = char_attrs[i] & 16777215 | this._generationBits;
      }
      Bitmap32Utils.Border(this._glyphs, x, y, w, h, char_attrs_gen);
      this._dirtyGeneration = this._generation;
    }
  }
  blit(x, y, src, sx, sy, sw, sh) {
    this._dirtyGeneration = this._generation;
  }
}

// src/metrics.ts
var CHAR_ASPECT = 0.5;
function calculateRendererMetrics(containerWidth, containerHeight, dpr, minCols, maxCols, rows) {
  let cellHeight = Math.floor(containerHeight / rows);
  let cellWidth = Math.floor(cellHeight * CHAR_ASPECT);
  let cols = Math.floor(containerWidth / cellWidth);
  if (cols < minCols) {
    cols = minCols;
    cellWidth = Math.floor(containerWidth / cols);
    cellHeight = Math.floor(cellWidth / CHAR_ASPECT);
  } else if (cols > maxCols) {
    cols = maxCols;
  }
  return {
    cols,
    rows,
    cellWidth,
    cellHeight,
    rendererWidth: cellWidth * cols,
    rendererHeight: cellHeight * rows,
    dpr
  };
}

// node_modules/mitt/dist/mitt.mjs
function mitt_default(n) {
  return { all: n = n || new Map, on: function(t, e) {
    var i = n.get(t);
    i ? i.push(e) : n.set(t, [e]);
  }, off: function(t, e) {
    var i = n.get(t);
    i && (e ? i.splice(i.indexOf(e) >>> 0, 1) : n.set(t, []));
  }, emit: function(t, e) {
    var i = n.get(t);
    i && i.slice().map(function(n2) {
      n2(e);
    }), (i = n.get("*")) && i.slice().map(function(n2) {
      n2(t, e);
    });
  } };
}

// src/unnamed.ts
class Unnamed {
  _renderer;
  _atlas;
  _palette = new Palette;
  _tickTimer = null;
  _resizeNeeded = false;
  _buffer;
  _minCols;
  _maxCols;
  _rows;
  _metrics;
  _emitter = mitt_default();
  constructor(config) {
    this.tick = this.tick.bind(this);
    this.onresize = this.onresize.bind(this);
    if (config.palette === undefined) {
      this.palette.set(0, 31, 14, 28);
      this.palette.set(1, 23, 67, 75);
      this.palette.set(2, 62, 33, 55);
      this.palette.set(3, 112, 55, 127);
      this.palette.set(4, 88, 69, 99);
      this.palette.set(5, 157, 48, 59);
      this.palette.set(6, 100, 125, 52);
      this.palette.set(7, 52, 133, 157);
      this.palette.set(8, 154, 99, 72);
      this.palette.set(9, 140, 143, 174);
      this.palette.set(10, 210, 100, 113);
      this.palette.set(11, 126, 196, 193);
      this.palette.set(12, 228, 148, 58);
      this.palette.set(13, 192, 199, 65);
      this.palette.set(14, 215, 155, 125);
      this.palette.set(15, 245, 237, 186);
    } else {
      this.palette.setFrom(config.palette);
    }
    this._rows = Math.max(20, config.rows || 40);
    this._maxCols = Math.max(40, config.maxCols || 80);
    this._minCols = Math.max(20, config.minCols || 20);
    this._metrics = calculateRendererMetrics(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, this._minCols, this._maxCols, this._rows);
    console.log(this._metrics.cols, this._metrics.rows, this._metrics.rendererWidth, this._metrics.rendererHeight);
    console.log("maxCols", this._maxCols);
    this._buffer = new PlainBuffer(this._metrics.cols, this._maxCols, this._metrics.rows);
    this._atlas = new Atlas(this._palette);
    this._atlas.configure(this._metrics);
    this._renderer = new Renderer(config.canvas, this._atlas, this._metrics);
    this._renderer.clearColour = this.palette.getHexColour(0);
    this._renderer.buffer = this._buffer;
    this._tickTimer = setInterval(this.tick, 30);
    window.addEventListener("resize", this.onresize);
    this._resizeNeeded = true;
  }
  get on() {
    return this._emitter.on;
  }
  get off() {
    return this._emitter.off;
  }
  get palette() {
    return this._palette;
  }
  get atlas() {
    return this._atlas;
  }
  get renderer() {
    return this._renderer;
  }
  get cols() {
    return this._metrics.cols;
  }
  get rows() {
    return this._metrics.rows;
  }
  get buffer() {
    return this._buffer;
  }
  onresize() {
    let newMetrics = calculateRendererMetrics(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, this._minCols, this._maxCols, this._rows);
    if (this._metrics === undefined || newMetrics.cols != this._metrics.cols || newMetrics.rows != this._metrics.rows || newMetrics.cellWidth != this._metrics.cellWidth || newMetrics.cellHeight != this._metrics.cellHeight || newMetrics.rendererWidth != this._metrics.rendererWidth || newMetrics.rendererHeight != this._metrics.rendererHeight) {
      this._metrics = newMetrics;
      this._resizeNeeded = true;
      console.log(this._metrics.cols, this._metrics.rows, this._metrics.rendererWidth, this._metrics.rendererHeight);
    }
  }
  tick() {
    if (this._resizeNeeded) {
      this._resizeNeeded = false;
      this._buffer.configure(this._metrics);
      this._atlas.configure(this._metrics);
      this._renderer.configure(this._metrics);
      this._emitter.emit("resize", { cols: this.cols, rows: this.rows });
      this._renderer.forceRender();
    }
    if (this._renderer.willRender()) {
      this._emitter.emit("render", this._buffer.generation);
      this._renderer.render();
      this._buffer.bumpGeneration();
    }
  }
  testPattern() {
    this._buffer.clear(0);
    let i = 1;
    this._buffer.print(0, 0, ">", 4128768);
    this._buffer.print(0, 1, ">", 4128768);
    for (;i < this.cols - 1; i++) {
      let num = i.toString();
      if (num.length > 1) {
        this._buffer.print(i, 0, num[0], 4128768);
        this._buffer.print(i, 1, num[1], 4128768);
      } else {
        this._buffer.print(i, 0, "0", 4128768);
        this._buffer.print(i, 1, num[0], 4128768);
      }
    }
    this._buffer.print(i, 0, "<", 4128768);
    this._buffer.print(i, 1, "<", 4128768);
    this._buffer.print(2, 3, "[]MWgy#£!|", 4128768);
    i = 0;
    let k = 2, j = 5;
    for (;i < 32; i++) {
      this._buffer.print(k, j, String.fromCharCode(i), 4128768);
      k += 2;
      if (k == 10) {
        k = 2;
        j += 2;
      }
    }
    const textStrings = [
      "Hello World",
      "Café naïve £100",
      "Привет мир",
      "Γειά σου",
      "你好世界",
      "LTR text into : " + "هلا   مصر العراق سوريا  هلونك" + " Then back into LTR. " + "    ه  ",
      "Hello \uD83C\uDF89 World",
      "Wave \uD83D\uDC4B\uD83C\uDFFD here",
      "\uD83D\uDC4B\uD83D\uDC4B\uD83C\uDFFB\uD83D\uDC4B\uD83C\uDFFC\uD83D\uDC4B\uD83C\uDFFD\uD83D\uDC4B\uD83C\uDFFE\uD83D\uDC4B\uD83C\uDFFF",
      "Family: \uD83D\uDC68‍\uD83D\uDC69‍\uD83D\uDC67‍\uD83D\uDC66",
      "UK: \uD83C\uDDEC\uD83C\uDDE7 US: \uD83C\uDDFA\uD83C\uDDF8",
      "é",
      "Héllo 世界 \uD83C\uDDEC\uD83C\uDDE7 Привет \uD83D\uDC68‍\uD83D\uDC69‍\uD83D\uDC67"
    ];
    for (i = 0;i < 16; i++) {
      this._buffer.print(15 + i * 3, 2, "   ", i << 20);
      this._buffer.print(15 + i * 3, 3, i.toString().padStart(3, " "), i << 16);
    }
    for (i = 0;i < textStrings.length; i++) {
      this._buffer.print(2, 4 + i, textStrings[i], (i + 2 << 4 | 15) << 16);
    }
    this._buffer.border(9, 18, 30, 10, [
      19 | 983040,
      6 | 983040,
      20 | 196608,
      3 | 983040,
      0 | 2752512,
      1 | 196608,
      21 | 983040,
      4 | 196608,
      22 | 196608
    ]);
    this._buffer.border(9, 28, 30, 10, [
      19 | 983040,
      6 | 983040,
      20 | 983040,
      3 | 983040,
      26 | 917504,
      25 | 983040,
      21 | 983040,
      23 | 983040,
      24 | 983040
    ]);
    this._buffer.border(40, 18, 30, 10, [
      19 | 524288,
      6 | 524288,
      20 | 524288,
      3 | 524288,
      27 | 327680,
      25 | 524288,
      21 | 524288,
      23 | 524288,
      24 | 524288
    ]);
    this._buffer.border(40, 28, 30, 10, [
      15 | 327680,
      5 | 327680,
      16 | 327680,
      2 | 327680,
      105 | 655360,
      2 | 327680,
      17 | 327680,
      5 | 327680,
      18 | 327680
    ]);
  }
}

// demo.ts
var un = new Unnamed({
  canvas: document.getElementById("xcanvas"),
  maxCols: 120,
  rows: 40
});
var buf = un.buffer;
un.on("resize", (evt) => {
  buf.print(3, 3, `${evt.cols} × ${evt.rows}`, 524288);
});
un.on("render", (gen) => {
  buf.fill(10, 0, 7, 1, 983072);
  buf.print(10, 0, `Gen: ${gen} `, 983040);
});
buf.print(0, 0, "Hello", 983040);
buf.hline(0, 1, 5, 917527);
buf.print(0, 1, "012345678901234567890123456789012345678901234567890", 983040);
buf.hline(0, 5, 45, 9437210, 2863289685);
buf.vline(3, 6, 17, 9437210, 2863289685);
