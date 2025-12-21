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

// src/renderer/renderer.ts
var CHAR_ASPECT = 0.6;

class Renderer {
  _canvas;
  _ctx;
  _atlas;
  _cols;
  _rows;
  _dpr = 1;
  _cellW = 0;
  _cellH = 0;
  _viewW = 0;
  _viewH = 0;
  _fontSize = 0;
  _atlasDirty = false;
  _forceRender = false;
  _rendererBuffer = null;
  constructor(canvas, atlas, cols, rows) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
    this._atlas = atlas;
    this._cols = cols;
    this._rows = rows;
  }
  resize() {
    this._dpr = window.devicePixelRatio || 1;
    const cellFromHeight = Math.floor(window.innerHeight / this._rows);
    const cellFromWidth = Math.floor(window.innerWidth / this._cols / CHAR_ASPECT);
    this._cellH = Math.min(cellFromHeight, cellFromWidth);
    this._cellW = Math.floor(this._cellH * CHAR_ASPECT);
    this._viewW = this._cellW * this._cols;
    this._viewH = this._cellH * this._rows;
    this._fontSize = this._cellH;
    console.log(this._dpr, this._cellW, this._cellH, this._viewW, this._viewH);
    this._canvas.width = this._viewW * this._dpr;
    this._canvas.height = this._viewH * this._dpr;
    this._canvas.style.width = this._viewW + "px";
    this._canvas.style.height = this._viewH + "px";
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._forceRender = true;
    this._atlasDirty = true;
  }
  renderGlyphAtXY(char_attr, x, y) {
    const entry = this._atlas.get(char_attr);
    const sheet = this._atlas.getSheet(entry.sheet);
    const scaledW = this._cellW * this._dpr;
    const scaledH = this._cellH * this._dpr;
    this._ctx.drawImage(sheet.canvas, entry.x, entry.y, scaledW, scaledH, x, y, this._cellW, this._cellH);
  }
  get cols() {
    return this._cols;
  }
  get rows() {
    return this._rows;
  }
  get buffer() {
    return this._rendererBuffer;
  }
  set buffer(buffer) {
    this._rendererBuffer = buffer;
    this._forceRender = true;
  }
  renderFromBuffer(buffer, force = false) {
    if (this._cols != buffer.cols || this._rows != buffer.rows) {
      this._ctx.fillStyle = "red";
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
      return;
    }
    if (this._cols * this._rows != buffer.buffer.length) {
      return;
    }
    if (force == false && buffer.dirty == false) {
      return;
    }
    let x = 0, y = 0, idx = 0, stride = this._cols, rows = this._rows;
    let sheetNum = -1;
    let sheet;
    const buf = buffer.buffer;
    const dirty = buffer.dirtyBuffer;
    const ctx = this._ctx;
    const cellW = this._cellW;
    const cellH = this._cellH;
    const scaledW = cellW * this._dpr;
    const scaledH = cellH * this._dpr;
    console.log("* RENDER BUFFER - BEGIN");
    if (force) {
      while (rows--) {
        stride = this._cols;
        while (stride--) {
          const char_attr = buf[idx++];
          if (char_attr != 0) {
            const entry = this._atlas.get(char_attr);
            if (entry.sheet != sheetNum) {
              sheet = this._atlas.getSheet(entry.sheet).canvas;
              sheetNum = entry.sheet;
            }
            ctx.drawImage(sheet, entry.x, entry.y, scaledW, scaledH, x, y, cellW, cellH);
          }
          x += cellW;
        }
        x = 0;
        y += cellH;
      }
    } else {
      while (rows--) {
        stride = this._cols;
        while (stride--) {
          if (dirty[idx] == 0) {
            idx++;
            x += cellW;
            continue;
          }
          const char_attr = buf[idx++];
          if (char_attr != 0) {
            const entry = this._atlas.get(char_attr);
            if (entry.sheet != sheetNum) {
              sheet = this._atlas.getSheet(entry.sheet).canvas;
              sheetNum = entry.sheet;
            }
            ctx.drawImage(sheet, entry.x, entry.y, scaledW, scaledH, x, y, cellW, cellH);
          }
          x += cellW;
        }
        x = 0;
        y += cellH;
      }
    }
    buffer.clearDirty();
    console.log("* RENDER BUFFER - END");
  }
  render() {
    if (this._cellW === 0 || this._cellH === 0) {
      return;
    }
    if (this._atlasDirty) {
      this._atlasDirty = false;
      this._atlas.clear();
      this._atlas.configure(this._cellW, this._cellH, this._fontSize, this._dpr);
      this._forceRender = true;
    }
    if (this._forceRender || this._rendererBuffer != null && this._rendererBuffer.dirty) {
      if (this._rendererBuffer != null) {
        this.renderFromBuffer(this._rendererBuffer, this._forceRender);
      } else {
        this._ctx.fillStyle = "blue";
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
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
    console.log("** New Atlas Sheet");
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

// src/atlas/atlas.ts
var FONT_FAMILY = '"Cascadia Code", Menlo, monospace';
var ASCENT_GLYPHS = ["M", "["];
var DESCENT_GLYPHS = ["g", "M"];
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
  configure(cellW, cellH, fontSize, dpr) {
    if (this._cellW === cellW && this._cellH === cellH && this._fontSize === fontSize && this._dpr === dpr) {
      return;
    }
    console.log("Updating Atlas");
    this.clear();
    this._cellW = cellW;
    this._cellH = cellH;
    this._fontSize = fontSize;
    this._dpr = dpr;
    console.log("ATLAS.1", this._cellW, this._cellH, this._fontSize, this._dpr);
    const scaledFontSize = fontSize * dpr;
    const scaledCellH = cellH * dpr;
    const scaledCellW = cellW * dpr;
    this._tempContext.font = `${scaledFontSize}px ${FONT_FAMILY}`;
    this._tempContext.textbaseLine = "alphabetic";
    let maxAscent = 0, maxDescent = 0;
    for (const glyph of ASCENT_GLYPHS) {
      const metric = this._tempContext.measureText(glyph);
      if (metric.actualBoundingBoxAscent > maxAscent) {
        maxAscent = metric.actualBoundingBoxAscent;
      }
    }
    for (const glyph of DESCENT_GLYPHS) {
      const metric = this._tempContext.measureText(glyph);
      if (metric.actualBoundingBoxDescent > maxDescent) {
        maxDescent = metric.actualBoundingBoxDescent;
      }
    }
    this._scaledFontSize = scaledFontSize;
    this._fontAscent = maxAscent;
    this._fontDescent = maxDescent;
    this._fontHeight = maxAscent + maxDescent;
    this._realCellW = scaledCellW;
    this._realCellH = scaledCellH;
    this._tempContext.font = `${scaledFontSize}px ${FONT_FAMILY}`;
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
    if (char < 32 || char === 9608) {
      char = 32;
    }
    const fg = attr & 15;
    const bg = attr >> 4 & 15;
    const ctx = this._tempContext;
    ctx.fillStyle = this._palette.getHexColourChecked(bg);
    ctx.fillRect(0, 0, this._realCellW, this._realCellH);
    if (char > 32) {
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.textBaseLine = "alphabetic";
      const charStr = String.fromCharCode(char);
      const metrics = ctx.measureText(charStr);
      const charX = Math.round((this._realCellW - metrics.width) / 2);
      const charY = Math.round((this._realCellH - this._fontHeight) / 2 + this._fontAscent);
      ctx.fillText(charStr, charX, charY);
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
}

// src/renderer/renderer-buffer.ts
class RendererBuffer {
  cols;
  rows;
  buffer;
  dirtyBuffer;
  dirty;
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.buffer = new Uint32Array(cols * rows);
    this.dirtyBuffer = new Uint8Array(cols * rows);
    this.dirty = false;
    this.clear(0);
  }
  clear(char_attr = 16711712) {
    this.buffer.fill(char_attr);
    this.dirtyBuffer.fill(1);
    this.dirty = true;
  }
  clearDirty() {
    this.dirtyBuffer.fill(0);
    this.dirty = false;
  }
  _set(c, r, char_attr) {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.buffer[c + this.cols * r] = char_attr;
      this.dirtyBuffer[c + this.cols * r] = 1;
    }
  }
  print(c, r, text, char_attr) {
    char_attr = char_attr & 4294901760;
    for (let i = 0;i < text.length; i++) {
      this._set(c, r, text.charCodeAt(i) | char_attr);
      c++;
    }
    this.dirty = true;
  }
}

// src/unnamed.ts
class Unnamed {
  _renderer;
  _atlas;
  _palette = new Palette;
  _tickTimer = null;
  _resizeNeeded = false;
  _tempBuffer;
  constructor(config) {
    this.tick = this.tick.bind(this);
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
    this._atlas = new Atlas(this._palette);
    this._renderer = new Renderer(config.canvas, this._atlas, config.cols || 80, config.rows || 40);
    this._tempBuffer = new RendererBuffer(this._renderer.cols, this._renderer.rows);
    this._renderer.buffer = this._tempBuffer;
    this._tempBuffer.print(0, 0, "Hello World!!", 4128768);
    window.addEventListener("resize", () => {
      this._resizeNeeded = true;
    });
    this._tickTimer = setInterval(this.tick, 30);
    this._resizeNeeded = true;
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
  tick() {
    if (this._resizeNeeded) {
      this._resizeNeeded = false;
      this._renderer.dirty = true;
      this._renderer.resize();
    }
    this._renderer.render();
  }
}

// demo.ts
var un = new Unnamed({
  canvas: document.getElementById("xcanvas"),
  cols: 80,
  rows: 40
});
