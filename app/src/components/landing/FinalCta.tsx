"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ds/Button";
import { Mascot, type MascotApi, type MascotState } from "@/components/login/Mascot";
import { GET_STARTED_HREF } from "./parts";

// Figma LP-D › 08 · Final CTA › CTA card (231:81948): radius 12, border/default, Shadow/Floating, pad 64/24 (LP-M 40/20),
// gap 12, centred. Asset/mascot-large 120 → the live three.js mascot (same scene as the login page): it watches the
// cursor while idle and cheers when a call to action is hovered or focused.

export function FinalCta() {
  const [mood, setMood] = useState<MascotState>("idle");
  const card = useRef<HTMLDivElement>(null);
  const mascot = useRef<MascotApi | null>(null);

  // Delight, once per visit: the mascot bounces when the card first comes into view (the scene's own spring; it
  // skips the bounce under reduced motion). three.js loads after first paint, so wait for it if it isn't ready.
  useEffect(() => {
    const el = card.current;
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
    <div
      ref={card}
      data-reveal
      className="flex flex-col items-center gap-12 rounded-card border border-border-default bg-surface-default px-24 py-64 text-center shadow-floating max-tablet:px-20 max-tablet:py-[calc(var(--spacing-32)+var(--spacing-8))]"
    >
      <Mascot size={120} state={mood} apiRef={mascot} />
      <h2 className="mt-4 text-marketing-heading text-balance">
        <span className="block text-text-primary">Stop adding it up by hand</span>
        <span className="mt-12 block text-text-secondary">Move every booking and payment into one place</span>
      </h2>
      <div className="flex items-center gap-12 pt-16 max-tablet:w-full max-tablet:flex-col max-tablet:items-stretch">
        <ButtonLink href={GET_STARTED_HREF} size="lg" {...cheer}>
          Start your first booking
        </ButtonLink>
        <ButtonLink href={GET_STARTED_HREF} variant="secondary" size="lg" {...cheer}>
          Book a demo
        </ButtonLink>
      </div>
    </div>
  );
}
