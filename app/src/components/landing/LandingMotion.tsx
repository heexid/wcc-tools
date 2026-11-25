"use client";

import { useLayoutEffect } from "react";

// Landing motion driver (styles in src/styles/landing.css › Motion). Renders nothing.
//  · Scroll reveal: html.lp-js hides [data-reveal] until it enters the viewport; elements already on screen at
//    hydration are marked shown first, so nothing visible flashes out. Elements revealed in the same batch get
//    --reveal-i 0…4 in DOM order (a short stagger). Each element is revealed once, then unobserved.
//    "stage" = the final CTA's staged entrance; "group" = one observed box whose [data-reveal-item]s stagger together
//    (the footer: its bottom bar ends inside the observer's 10% bottom margin, so it could never be seen on its own).
//  · Nav: [data-scrolled] on the floating bar once the page has scrolled (shadow fades in).
export function LandingMotion() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const vh = window.innerHeight;
    for (const el of items) if (el.getBoundingClientRect().top < vh) el.setAttribute("data-shown", "");
    for (const group of document.querySelectorAll('[data-reveal="group"]'))
      group.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((el, i) => el.style.setProperty("--reveal-i", String(i)));
    root.classList.add("lp-js");

    const reveal = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        hits.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        // The staged CTA and footer count on their own, so they never queue behind the sections above.
        const isStaged = (el: HTMLElement) => el.dataset.reveal === "stage" || el.dataset.reveal === "group";
        const staged = hits.filter(isStaged);
        const plain = hits.filter((el) => !isStaged(el));
        hits.forEach((el) => {
          const i = (isStaged(el) ? staged : plain).indexOf(el);
          el.style.setProperty(el.dataset.reveal === "group" ? "--reveal-base" : "--reveal-i", String(Math.min(i, 4)));
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
