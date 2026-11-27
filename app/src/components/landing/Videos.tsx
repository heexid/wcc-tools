"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { usePresence } from "@/components/ds/usePresence";
import { useScrollLock } from "@/components/ds/useScrollLock";
import { Chip, Container } from "./parts";

// 06 · See it in action — Figma LP-D 323:109580 · LP-T 323:109634 · LP-M 323:109683.
// Desktop: five 9:16 posters in one row. Below 1280 the row scrolls sideways, the next card peeking past the edge.
// Clicking a card opens a lightbox on the scrim and plays the video.
// Sources are 720p web encodes of agents/promotions/video/output/*.mp4 (poster = frame at 2.5s).
// Next phase: swap `src` for a YouTube embed id and render an <iframe> in the lightbox instead of <video>.

type Video = { title: string; duration: string; label: string; src: string; poster: string };

const VIDEOS: Video[] = [
  { title: "Check the dashboard", duration: "1:13", label: "1 minute 13 seconds", src: "/assets/landing/videos/dashboard.mp4", poster: "/assets/landing/videos/dashboard.jpg" },
  { title: "Create a booking", duration: "1:45", label: "1 minute 45 seconds", src: "/assets/landing/videos/booking-flow.mp4", poster: "/assets/landing/videos/booking-flow.jpg" },
  { title: "See every booking", duration: "0:51", label: "51 seconds", src: "/assets/landing/videos/bookings.mp4", poster: "/assets/landing/videos/bookings.jpg" },
  { title: "Update a booking", duration: "1:27", label: "1 minute 27 seconds", src: "/assets/landing/videos/update-booking.mp4", poster: "/assets/landing/videos/update-booking.jpg" },
  { title: "Manage packages", duration: "1:43", label: "1 minute 43 seconds", src: "/assets/landing/videos/package-library.mp4", poster: "/assets/landing/videos/package-library.jpg" },
];

export function Videos() {
  const [active, setActive] = useState<Video | null>(null);
  const close = useCallback(() => setActive(null), []);

  return (
    <section id="videos" aria-labelledby="videos-title" className="py-(--lp-section-y)">
      <Container>
        <div className="flex flex-col items-center text-center">
          <div data-reveal>
            <Chip icon="circle-play">In action</Chip>
          </div>
          <h2 id="videos-title" data-reveal className="mt-16 text-marketing-heading text-balance">
            <span className="block text-text-primary">See CIR at work</span>
            <span className="block text-text-secondary">One short video per feature</span>
          </h2>
          <p data-reveal className="mt-16 text-mobile-body text-balance text-text-secondary">
            Watch each part of CIR in under two minutes
          </p>
        </div>

        {/* LP-D: 5 columns, gap 24. LP-T / LP-M: a sideways scroller that bleeds to the screen edge (cards 220 / 240). */}
        <ul className="mt-48 grid grid-cols-5 gap-24 max-desktop:-mx-(--lp-gutter) max-desktop:flex max-desktop:snap-x max-desktop:snap-mandatory max-desktop:scroll-px-(--lp-gutter) max-desktop:gap-16 max-desktop:overflow-x-auto max-desktop:overscroll-x-contain max-desktop:px-(--lp-gutter) max-desktop:pb-8 max-tablet:gap-12 [scrollbar-width:none]">
          {VIDEOS.map((v) => (
            <li key={v.src} data-reveal className="min-w-0 max-desktop:w-[220px] max-desktop:shrink-0 max-desktop:snap-start max-tablet:w-[240px]">
              <VideoCard video={v} onPlay={() => setActive(v)} />
            </li>
          ))}
        </ul>
      </Container>
      <VideoLightbox video={active} onClose={close} />
    </section>
  );
}

/** A poster card. On desktop the poster tilts toward the pointer over the whole card (tilt.ts, wired by LandingMotion). */
function VideoCard({ video: v, onPlay }: { video: Video; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      data-tilt-trigger
      aria-label={`Play video: ${v.title}, ${v.label}`}
      className="group flex w-full cursor-pointer flex-col gap-12 rounded-card text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-4 lp-video-card"
    >
      <span data-tilt className="relative block aspect-9/16 w-full overflow-hidden rounded-card border border-border-default bg-surface-subtle">
        <Image src={v.poster} alt="" fill sizes="240px" className="object-cover" />
        {/* Figma "Play": 48 circle, surface/default, bottom-left 16 so it never covers the poster headline */}
        <span className="lp-video-play absolute bottom-16 left-16 flex size-48 items-center justify-center rounded-full bg-surface-default shadow-floating">
          <Icon name="play" className="size-icon-md" />
        </span>
      </span>
      <span className="flex flex-col gap-2">
        <span className="text-heading-section text-text-primary">{v.title}</span>
        <span className="text-body text-text-secondary">{v.duration}</span>
      </span>
    </button>
  );
}

/** Full-screen player on transparent black (85 %, per the user — darker than the DS surface/scrim). Esc, the scrim or × close it; focus returns to the card. */
function VideoLightbox({ video, onClose }: { video: Video | null; onClose: () => void }) {
  const open = video !== null;
  const { mounted, presence } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  // Keep the last video while the exit transition runs.
  const [shown, setShown] = useState<Video | null>(video);
  if (video && video !== shown) setShown(video);
  useFocusTrap(open, panel, onClose, "[data-lightbox-close]");
  useScrollLock(mounted);
  if (!mounted || !shown || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden data-state={presence["data-state"]} onClick={onClose} className="motion-scrim fixed inset-0 bg-[rgb(0_0_0/0.85)]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        className="pointer-events-none relative flex h-full items-center justify-center p-64 max-tablet:px-16 max-tablet:py-64"
      >
        <div {...presence} className="motion-modal pointer-events-auto relative flex h-full max-h-[calc(var(--spacing-64)*14)] items-center justify-center">
          <video
            key={shown.src}
            src={shown.src}
            poster={shown.poster}
            controls
            autoPlay
            playsInline
            className="aspect-9/16 h-full max-w-full rounded-card bg-surface-inverse object-contain shadow-floating"
          />
        </div>
        <button
          type="button"
          data-lightbox-close
          onClick={onClose}
          aria-label="Close video"
          className="pointer-events-auto absolute top-16 right-16 flex size-[calc(var(--spacing-32)+var(--spacing-12))] cursor-pointer items-center justify-center rounded-full bg-surface-default text-text-primary shadow-floating outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        >
          <Icon name="x" className="size-icon-md" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
