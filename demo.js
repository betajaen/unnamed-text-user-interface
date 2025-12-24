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

// src/renderer/renderer-utils.ts
class RendererUtils {
  static RenderCopy(dst, renderer, buffer, atlas) {
    if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
      return;
    }
    if (renderer.cols * renderer.rows != buffer.glyphs.length) {
      return;
    }
    let x = 0, y = 0, idx = 0, stride = buffer.cols, rows = buffer.rows;
    let srcSheetNum = -1;
    let srcSheet;
    const buf = buffer.glyphs.buffer;
    const cellW = renderer.cellW;
    const cellH = renderer.cellH;
    const scaledW = cellW * renderer.dpr;
    const scaledH = cellH * renderer.dpr;
    while (rows--) {
      stride = buffer.cols;
      while (stride--) {
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
    }
  }
  static RenderCopyTested(dst, renderer, buffer, atlas) {
    if (renderer === undefined || buffer === undefined || dst === undefined || atlas === undefined) {
      return;
    }
    if (renderer.cols * renderer.rows != buffer.glyphs.length) {
      return;
    }
    let x = 0, y = 0, idx = 0, stride = buffer.cols, rows = buffer.rows;
    let srcSheetNum = -1;
    let srcSheet;
    const buf = buffer.glyphs.buffer;
    const genBits = buffer.generationBits;
    const cellW = renderer.cellW;
    const cellH = renderer.cellH;
    const scaledW = cellW * renderer.dpr;
    const scaledH = cellH * renderer.dpr;
    while (rows--) {
      stride = buffer.cols;
      while (stride--) {
        const char_attr = buf[idx++];
        if ((char_attr & 4278190080) !== genBits) {
          idx++;
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
    }
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
  _clearColour = "#000000";
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

// src/atlas/atlas.ts
var FONT_FAMILY = '"Cascadia Code", Menlo, monospace';
var ASCENT_GLYPHS = ["M", "[", "|"];
var DESCENT_GLYPHS = ["g", "M", "|"];
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
  configure(cellW, cellH, fontSize, dpr) {
    if (this._cellW === cellW && this._cellH === cellH && this._fontSize === fontSize && this._dpr === dpr) {
      return;
    }
    this.clear();
    this._cellW = cellW;
    this._cellH = cellH;
    this._fontSize = fontSize;
    this._dpr = dpr;
    const scaledFontSize = fontSize * dpr;
    const scaledCellH = cellH * dpr;
    const scaledCellW = cellW * dpr;
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
      ctx.fillStyle = this._palette.getHexColourChecked(bg);
      ctx.fillRect(0, 0, this._realCellW, this._realCellH);
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.textBaseLine = "alphabetic";
      const charStr = String.fromCharCode(char);
      const metrics = ctx.measureText(charStr);
      const charX = Math.round((this._realCellW - metrics.width) / 2);
      const charY = Math.round((this._realCellH - this._fontHeight) / 2 + this._fontAscent);
      ctx.fillText(charStr, charX, charY);
    } else {
      this.renderSpecial(ctx, char, fg, bg);
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
      ctx.fillStyle = this._palette.getHexColourChecked(fg);
      ctx.lineWidth = gs / 4;
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
      dst.buffer[x + y * dst.cols] = value;
    }
  }
  static Print(dst, x, y, text, attr) {
    if (!dst)
      return;
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
    let offset = left + y * cols;
    for (let i = textStart;i < textStart + width; i++) {
      buf[offset++] = text.charCodeAt(i) & 65535 | attr;
    }
  }
  static HLine(dst, x, y, w, value) {
    if (!dst)
      return;
    const cols = dst.cols;
    const rows = dst.rows;
    const buf = dst.buffer;
    if (y < 0 || y >= rows)
      return;
    const left = x < 0 ? 0 : x;
    const right = x + w > cols ? cols : x + w;
    if (left >= right)
      return;
    buf.fill(value, left + y * cols, right + y * cols);
  }
  static VLine(dst, x, y, h, value) {
    if (!dst)
      return;
    const cols = dst.cols;
    const rows = dst.rows;
    const buf = dst.buffer;
    if (x < 0 || x >= cols)
      return;
    const top = y < 0 ? 0 : y;
    const bottom = y + h > rows ? rows : y + h;
    if (top >= bottom)
      return;
    let offset = x + top * cols;
    for (let row = top;row < bottom; row++) {
      buf[offset] = value;
      offset += cols;
    }
  }
  static Fill(dst, x, y, w, h, value) {
    if (!dst)
      return;
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
    let offset = left + top * cols;
    for (let row = top;row < bottom; row++) {
      buf.fill(value, offset, offset + width);
      offset += cols;
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
    const srcCols = src.cols;
    const srcRows = src.rows;
    const srcBuf = src.buffer;
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
    let srcOffset = srcX + srcY * srcCols;
    let dstOffset = dstX + dstY * dstCols;
    for (let row = 0;row < h; row++) {
      dstBuf.set(srcBuf.subarray(srcOffset, srcOffset + w), dstOffset);
      srcOffset += srcCols;
      dstOffset += dstCols;
    }
  }
  static CopyAlways(dst, left) {
    if (!dst || !left)
      return;
    if (dst.length != left.length)
      return;
    const len = dst.length;
    const dstBuf = dst.buffer;
    const leftBuf = left.buffer;
    dstBuf.set(leftBuf, 0);
  }
  static CopyNewer(dst, left, right) {
    if (!dst || !left || !right)
      return;
    if (left.length != right.length || dst.length != left.length)
      return;
    const len = dst.length;
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
    if (left.length != right.length || dst.length != mask.length || left.length != mask.length)
      return;
    const len = dst.length;
    const dstBuf = dst.buffer;
    const leftBuf = left.buffer;
    const rightBuf = right.buffer;
    const maskBuf = mask.buffer;
    for (let i = 0;i < len; i++) {
      dstBuf[i] = leftBuf[i] & ~maskBuf[i] | rightBuf[i] & maskBuf[i];
    }
  }
}

// src/buffer/bitmap.ts
class Bitmap32 {
  cols;
  stride;
  rows;
  length;
  buffer;
  constructor(cols, rows) {
    this.cols = Math.max(cols, 1);
    this.rows = Math.max(rows, 1);
    this.length = this.cols * this.rows;
    this.stride = this.cols;
    this.buffer = new Uint32Array(this.length);
  }
}

// src/buffer/plain-buffer.ts
class PlainBuffer {
  _glyphs;
  _generation = 0;
  _generationBits = 0;
  _dirtyGeneration = 255;
  constructor(cols, rows) {
    this._glyphs = new Bitmap32(cols, rows);
    this._glyphs.buffer.fill(0);
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
  clear(char_attr) {
    Bitmap32Utils.Clear(this._glyphs, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  set(x, y, char_attr) {
    Bitmap32Utils.Set(this._glyphs, x, y, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  hline(x, y, w, char_attr) {
    Bitmap32Utils.HLine(this._glyphs, x, y, w, char_attr & 16777215 | this._generationBits);
    this._dirtyGeneration = this._generation;
  }
  vline(x, y, h, char_attr) {
    Bitmap32Utils.VLine(this._glyphs, x, y, h, char_attr & 16777215 | this._generationBits);
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
    this._tempBuffer = new PlainBuffer(this._renderer.cols, this._renderer.rows);
    this._renderer.clearColour = this.palette.getHexColour(0);
    this._renderer.buffer = this._tempBuffer;
    this._tempBuffer.print(0, 0, "Hello World!!", 4128768);
    this._tempBuffer.print(2, 2, "\x00", 4128768);
    this._tempBuffer.print(2, 4, "Vert:\x00\x01\x00\x02\x00\x03", 4128768);
    this._tempBuffer.print(2, 5, "Horz:\x00\x04\x00\x05\x00\x06", 4128768);
    this._tempBuffer.print(2, 6, "Bloc:\x00\x07\x00\b", 4128768);
    this._tempBuffer.print(2, 7, `Text:\x00	\x00
`, 4128768);
    this._tempBuffer.print(2, 8, "Cor1:\x00\v\x00\f\x00\r\x00\x0E", 4128768);
    this._tempBuffer.print(2, 9, "Cor2:\x00\x0F\x00\x10\x00\x11\x00\x12", 4128768);
    this._tempBuffer.print(2, 10, "Cor3:\x00\x13\x00\x14\x00\x15\x00\x16", 4128768);
    this._tempBuffer.print(2, 11, "Shad:\x00\x17\x00\x18\x00\x19", 4128768);
    this._tempBuffer.print(2, 12, "Patn:\x00\x1A\x00\x1B", 4128768);
    this._tempBuffer.print(2, 13, "Rsvd:\x00\x1C\x00\x1D\x00\x1E\x00\x1F", 4128768);
    this._tempBuffer.print(8, 1, "[]MWgy#£!|", 4128768);
    this._tempBuffer.border(9, 14, 30, 10, [
      19 | 983040,
      6 | 983040,
      20 | 983040,
      3 | 983040,
      0 | 2752512,
      1 | 983040,
      21 | 983040,
      4 | 983040,
      22 | 983040
    ]);
    this._tempBuffer.border(9, 25, 30, 10, [
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
