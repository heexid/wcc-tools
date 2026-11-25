"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import type { MascotApi, MascotState } from "./mascotScene";

// Login mascot (Figma: Asset/mascot-large, 64). The live three.js bubble from ./mascotScene.js, loaded after first paint
// so three.js stays out of the initial bundle. Until it's ready (or if WebGL is unavailable) the PNG shows.
// The layout box stays 64; the canvas overflows it on every side so the glow and the bounce aren't clipped.
// Decorative: hidden from assistive tech. Reduced motion: no float, bounce, shake or idle blinks.

export type { MascotApi, MascotState };

// Sizes: 32 (landing nav, Figma Asset/mascot), 64 (login, Figma Asset/mascot-large at 64) and "hero" (landing final CTA, Asset/mascot-large at 320 · tablet 240 · phone 200).
// The canvas overflows the box by a quarter of its size on every side (glow + bounce room).
const SIZES = {
  32: { box: "size-32", inset: "-inset-8", png: "/assets/mascot-64.png", png2x: "/assets/mascot-64@2x.png" },
  64: { box: "size-64", inset: "-inset-16", png: "/assets/mascot-64.png", png2x: "/assets/mascot-64@2x.png" },
  hero: {
    box: "size-[calc(var(--spacing-64)*5)] max-desktop:size-[calc(var(--spacing-48)*5)] max-tablet:size-[calc(var(--spacing-64)*3+var(--spacing-8))]",
    inset: "-inset-1/4",
    png: "/assets/mascot-hero.png",
    png2x: "/assets/mascot-hero@2x.png",
  },
} as const;

export function Mascot({
  state,
  apiRef,
  size = 64,
  calm = false,
  delay = 0,
}: {
  state: MascotState;
  apiRef?: Ref<MascotApi | null>;
  size?: keyof typeof SIZES;
  /** No cursor tracking, sleepy state or click reaction; pointer events pass through. */
  calm?: boolean;
  /** ms before the scene is created, so an entrance animation isn't interrupted. */
  delay?: number;
}) {
  const s = SIZES[size];
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<MascotApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    const wait = new Promise<void>((resolve) => (delay ? setTimeout(resolve, delay) : resolve()));
    Promise.all([import("./mascotScene"), wait])
      .then(([{ createMascot }]) => {
        if (disposed || !host.current) return;
        // bubble ≈ 50 of the 96 canvas, the same size as in the 64 PNG. The state effect below applies `state`.
        api.current = createMascot(host.current, { fit: 0.52, ...(calm && { track: false, poke: false, sleepAfter: 0 }) });
        setRef(apiRef, api.current);
        setReady(true);
      })
      .catch(() => {}); // no WebGL → keep the PNG
    return () => {
      disposed = true;
      api.current?.destroy();
      api.current = null;
      setRef(apiRef, null);
      setReady(false);
    };
  }, [apiRef, calm, delay]);

  useEffect(() => {
    api.current?.setState(state);
  }, [state, ready]);

  return (
    <div aria-hidden data-mascot-state={state} data-mascot-ready={ready || undefined} className={`relative shrink-0 ${s.box}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.png}
        srcSet={`${s.png} 1x, ${s.png2x} 2x`}
        alt=""
        loading={size === "hero" ? "lazy" : undefined}
        className={ready ? `invisible absolute inset-0 ${s.box}` : `absolute inset-0 block ${s.box}`}
      />
      <div ref={host} className={`absolute ${s.inset} ${calm ? "pointer-events-none" : ""}`} />
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
