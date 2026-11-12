"use client";

import { useEffect, useRef } from "react";
import "@/styles/grainy.css";

// Animated grainy gradient behind the login card (styles/grainy.css): brand/glow + surface/accent blobs orbiting
// slowly over a pale base, plus a fine grain tile. Decorative only — hidden from assistive tech, never takes pointer events.

const TILE = 128;

export function GrainyBackground() {
  const noise = useRef<HTMLDivElement>(null);

  // Grain tile: 128×128 grey noise kept in 128 ± 70 (full range speckles the saturated colours), tiled so one noise
  // pixel = one physical pixel.
  useEffect(() => {
    const el = noise.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = TILE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(TILE, TILE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 58 + Math.floor(Math.random() * 141); // 58–198
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    el.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
    el.style.backgroundSize = `${TILE / (window.devicePixelRatio || 1)}px`;
  }, []);

  return (
    <div aria-hidden className="grainy-bg">
      <div className="grainy-blob" data-blob="glow-l" />
      <div className="grainy-blob" data-blob="tint-r" />
      <div className="grainy-blob" data-blob="glow-r" />
      <div className="grainy-blob" data-blob="glow-b" />
      <div ref={noise} className="grainy-noise" />
    </div>
  );
}
