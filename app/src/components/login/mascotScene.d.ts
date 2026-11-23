// Types for mascotScene.js (kept as plain JS so the standalone preview in /mascot can load the same file).

export type MascotState = "idle" | "typing" | "password" | "peek" | "happy" | "success" | "error" | "loading" | "sleepy";

export const STATES: MascotState[];

export interface MascotOptions {
  state?: MascotState;
  /** ms without input before idle turns sleepy (0 disables). Default 20000. */
  sleepAfter?: number;
  /** Clicking the mascot makes it giggle. Default true. */
  poke?: boolean;
  /** Body diameter as a fraction of the canvas height. Default 0.72. */
  fit?: number;
}

export interface MascotApi {
  setState(state: MascotState): void;
  getState(): MascotState;
  /** Look at a page point (clientX / clientY), e.g. the caret while typing. */
  lookAtClient(clientX: number, clientY: number): void;
  keystroke(): void;
  react(kind: "blink" | "bounce" | "shake" | "giggle"): void;
  destroy(): void;
}

export function createMascot(container: HTMLElement, options?: MascotOptions): MascotApi;
