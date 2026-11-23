"use client";

import { useLayoutEffect } from "react";

// Landing motion driver (styles in src/styles/landing.css › Motion). Renders nothing.
//  · Scroll reveal: html.lp-js hides [data-reveal] until it enters the viewport; elements already on screen at
//    hydration are marked shown first, so nothing visible flashes out. Elements revealed in the same batch get
//    --reveal-i 0…4 in DOM order (a short stagger). Each element is revealed once, then unobserved.
//  · Nav: [data-scrolled] on the floating bar once the page has scrolled (shadow fades in).
export function LandingMotion() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const vh = window.innerHeight;
    for (const el of items) if (el.getBoundingClientRect().top < vh) el.setAttribute("data-shown", "");
    root.classList.add("lp-js");

    const reveal = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        hits.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        hits.forEach((el, i) => {
          el.style.setProperty("--reveal-i", String(Math.min(i, 4)));
          el.setAttribute("data-shown", "");
          reveal.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of items) if (!el.hasAttribute("data-shown")) reveal.observe(el);

    const nav = document.querySelector<HTMLElement>("[data-lp-nav]");
    const onScroll = () => nav?.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      reveal.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("lp-js");
    };
  }, []);
  return null;
}
