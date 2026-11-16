// Minimal typing for the two fontkit calls the server PDF measure uses (fontkit ships no types).
declare module "fontkit" {
  export interface Font {
    unitsPerEm: number;
    layout(text: string): { advanceWidth: number };
  }
  export function openSync(path: string): Font;
}
