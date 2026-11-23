"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import type { MascotApi, MascotState } from "./mascotScene";

// Login mascot (Figma: Asset/mascot-large, 64). The live three.js bubble from ./mascotScene.js, loaded after first paint
// so three.js stays out of the initial bundle. Until it's ready (or if WebGL is unavailable) the PNG shows.
// The layout box stays 64; the canvas overflows it on every side so the glow and the bounce aren't clipped.
// Decorative: hidden from assistive tech. Reduced motion: no float, bounce, shake or idle blinks.

export type { MascotApi, MascotState };

export function Mascot({ state, apiRef }: { state: MascotState; apiRef?: Ref<MascotApi | null> }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<MascotApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    import("./mascotScene")
      .then(({ createMascot }) => {
        if (disposed || !host.current) return;
        // bubble ≈ 50 of the 96 canvas, the same size as in the 64 PNG. The state effect below applies `state`.
        api.current = createMascot(host.current, { fit: 0.52 });
        setRef(apiRef, api.current);
        setReady(true);
      })
      .catch(() => {}); // no WebGL → keep the PNG
    return () => {
      disposed = true;
      api.current?.destroy();
      api.current = null;
      setRef(apiRef, null);
    };
  }, [apiRef]);

  useEffect(() => {
    api.current?.setState(state);
  }, [state, ready]);

  return (
    <div aria-hidden data-mascot-state={state} data-mascot-ready={ready || undefined} className="relative size-64 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/mascot-64.png"
        srcSet="/assets/mascot-64.png 1x, /assets/mascot-64@2x.png 2x"
        alt=""
        className={ready ? "invisible absolute inset-0 size-64" : "absolute inset-0 block size-64"}
      />
      <div ref={host} className="absolute -inset-16" />
    </div>
  );
}

function setRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T }).current = value;
}

/** Page point of the caret in a text input, so the mascot can follow the text as it's typed. */
export function caretPoint(input: HTMLInputElement) {
  const cs = getComputedStyle(input);
  const ctx = (caretPoint.ctx ??= document.createElement("canvas").getContext("2d"));
  const r = input.getBoundingClientRect();
  if (!ctx) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const upto = input.value.slice(0, input.selectionStart ?? input.value.length);
  const x = r.left + parseFloat(cs.paddingLeft) + ctx.measureText(upto).width - input.scrollLeft;
  return { x: Math.min(r.right, x), y: r.top + r.height / 2 };
}
caretPoint.ctx = null as CanvasRenderingContext2D | null;
