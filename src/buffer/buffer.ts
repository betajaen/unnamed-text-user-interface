import { Bitmap32 } from "./bitmap.ts";
import { Array32 } from "./array32.ts";

export interface IBuffer {
    get dirty():boolean;
    get cols():number;
    get rows():number;
    get generation():number;
    set generation(generation:number);
    clear(char_attr:number):void;
    set(x:number, y:number, char_attr:number):void;
    hline(x:number, y:number, w: number, char_attr:number, pattern?:number):void;
    vline(x:number, y:number, h: number, char_attr:number):void;
    fill(x:number, y:number, w:number, h:number, char_attr:number):void;
    print(x:number, y:number, text:string|Array32, char_attr:number):void;
    border(x:number, y:number, w:number, h:number, char_attrs:number[]):void;
    blit(x:number, y:number, src:Bitmap32, sx?:number, sy?:number, sw?:number, sh?:number):void;
}