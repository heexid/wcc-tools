"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Mascot, type MascotApi, type MascotState } from "@/components/login/Mascot";

// Landing nav logo mascot (Figma Asset/mascot 32), live. Only idle, blink and loading:
//  · loading while the page finishes loading, and again when a link to another page is followed
//  · idle otherwise: floats and blinks in place (no cursor tracking, sleep or click reaction)
// Reduced motion: goes straight to idle, and the scene itself drops the float and the blinks.

const FIRST_LOOP = 1300; // half an eye orbit, so the first loading state reads instead of flickering
const NAV_TIMEOUT = 8000; // a navigation that never lands goes back to idle

export function NavMascot({ intro = false, delay = 0 }: { intro?: boolean; delay?: number }) {
  const pathname = usePathname();
  const [scene, setScene] = useState<MascotApi | null>(null);
  const [booting, setBooting] = useState(intro);
  const [leaving, setLeaving] = useState(false);
  const onScene = useCallback((api: MascotApi | null) => setScene(api), []);

  useEffect(() => {
    if (!booting || !scene) return;
    let timer = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const settle = () => {
      timer = window.setTimeout(() => setBooting(false), reduce ? 0 : FIRST_LOOP);
    };
    if (reduce || document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    return () => {
      window.removeEventListener("load", settle);
      clearTimeout(timer);
    };
  }, [booting, scene]);

  useEffect(() => {
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!a || a.target === "_blank" || a.origin !== location.origin || a.pathname === location.pathname) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setLeaving(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setLeaving(false), NAV_TIMEOUT);
    };
    const reset = () => setLeaving(false); // back from the browser's page cache
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", reset);
      clearTimeout(timer);
      setLeaving(false); // the router can keep this page mounted but hidden
    };
  }, [pathname]);

  const state: MascotState = booting || leaving ? "loading" : "idle";
  return <Mascot size={32} state={state} apiRef={onScene} delay={delay} calm />;
}
