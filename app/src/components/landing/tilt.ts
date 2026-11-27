// Hover tilt for landing product visuals (styles: landing.css › "Hover tilt").
// Desktop only: ≥ 1280, a fine pointer that can hover, and no reduced-motion preference.
// The element tilts in 3D toward the pointer and settles flat when the pointer leaves. Large surfaces tilt less
// (6° for a 240px poster down to 2° for the 1280px product window) so their edges never swing far.
// Mark the tilting element with [data-tilt]; add [data-tilt-trigger] to an ancestor to track the pointer over it
// instead (the video cards track the whole card but tilt only the poster).

export const TILT_QUERY = "(min-width: 80rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const MIN_DEG = 2;
const MAX_DEG = 6;

export function attachTilt(target: HTMLElement): () => void {
  const trigger = target.closest<HTMLElement>("[data-tilt-trigger]") ?? target;
  const mq = window.matchMedia(TILT_QUERY);
  let frame = 0;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !mq.matches) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = target.getBoundingClientRect();
      const max = Math.min(MAX_DEG, Math.max(MIN_DEG, 1800 / r.width));
      const x = Math.min(0.5, Math.max(-0.5, (clientX - r.left) / r.width - 0.5));
      const y = Math.min(0.5, Math.max(-0.5, (clientY - r.top) / r.height - 0.5));
      target.dataset.tiltState = "track";
      target.style.transform = `perspective(${Math.round(Math.max(800, r.width * 1.5))}px) rotateX(${(-y * 2 * max).toFixed(2)}deg) rotateY(${(x * 2 * max).toFixed(2)}deg)`;
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame);
    if (!target.style.transform) return;
    target.dataset.tiltState = "settle";
    target.style.transform = "";
  };

  trigger.addEventListener("pointermove", onMove);
  trigger.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    trigger.removeEventListener("pointermove", onMove);
    trigger.removeEventListener("pointerleave", onLeave);
  };
}
