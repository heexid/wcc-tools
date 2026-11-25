"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ds/Button";
import { Mascot, type MascotApi, type MascotState } from "@/components/login/Mascot";
import { GET_STARTED_HREF } from "./parts";

// Figma LP-D › 08 · Final CTA + Footer › CTA (231:81948 · LP-T 231:83734 · LP-M 231:83286): no card, straight on the
// liquid background, centred. Mascot 320 · 240 · 200, 16 to the headings (8 apart), 24 to the button.
// Asset/mascot-large → the live three.js mascot (same scene as the login page): it watches the cursor while idle and
// cheers when the call to action is hovered or focused.

export function FinalCta() {
  const [mood, setMood] = useState<MascotState>("idle");
  const block = useRef<HTMLDivElement>(null);
  const mascot = useRef<MascotApi | null>(null);

  // Delight, once per visit: the mascot bounces when the block first comes into view (the scene's own spring; it
  // skips the bounce under reduced motion). three.js loads after first paint, so wait for it if it isn't ready.
  useEffect(() => {
    const el = block.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const bounce = (tries: number) => {
          if (mascot.current) mascot.current.react("bounce");
          else if (tries > 0) timer = window.setTimeout(() => bounce(tries - 1), 200);
        };
        timer = window.setTimeout(() => bounce(15), 150);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);
  const cheer = { onPointerEnter: () => setMood("happy"), onPointerLeave: () => setMood("idle"), onFocus: () => setMood("happy"), onBlur: () => setMood("idle") };

  return (
    <div ref={block} data-reveal className="flex flex-col items-center text-center">
      <Mascot size="hero" state={mood} apiRef={mascot} />
      {/* z-1: the mascot's canvas overflows its box and would cover the text */}
      <h2 className="relative z-1 mt-16 text-marketing-heading text-balance">
        <span className="block text-text-primary">Stop adding it up by hand</span>
        <span className="mx-auto mt-8 block text-text-secondary max-desktop:max-w-[calc(var(--spacing-64)*7+var(--spacing-32))]">
          Move every booking and payment into one place
        </span>
      </h2>
      <div className="relative z-1 mt-24 flex items-center max-tablet:w-full max-tablet:flex-col max-tablet:items-stretch">
        <ButtonLink href={GET_STARTED_HREF} size="lg" {...cheer}>
          Start your first booking
        </ButtonLink>
      </div>
    </div>
  );
}
