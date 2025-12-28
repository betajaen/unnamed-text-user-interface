import {Unnamed} from "./src/unnamed.ts";

const un = new Unnamed({
  canvas: document.getElementById("xcanvas") as HTMLCanvasElement,
  maxCols: 120,
  rows: 40
});

const buf = un.buffer;

un.on('resize', (evt) => {
  buf.print(3, 3, `${evt.cols} x ${evt.rows}`, 0x00080000);
});

un.on('render', (gen) => {

  buf.fill(10, 0, 7, 1, 0x000F_0020);
  buf.print(10, 0, `Gen: ${gen} `, 0x000F_0000);
});


buf.print(0, 0, "Hello", 0x000F0000);
buf.print(0, 1, "-----", 0x000E0000);