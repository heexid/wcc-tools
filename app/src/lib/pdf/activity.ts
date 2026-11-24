"use client";

import { useSyncExternalStore } from "react";
import type { ToastTone } from "@/components/ds/Feedback";

// PDF downloads in flight and their toasts. Lives outside the screens, so closing the detail sheet or moving to another
// page keeps the toast (and the button's Loading state) of a download that is still running. Shown by <PdfToasts>.

export type PdfToast = { key: number; text: string; tone: ToastTone; open: boolean };
type State = { toasts: readonly PdfToast[]; busy: ReadonlySet<string> };

const EMPTY: State = { toasts: [], busy: new Set() };
/** A fast download still shows its toast long enough to read. */
const MIN_MS = 2500;
const ERROR_MS = 6000;

let state = EMPTY;
let nextKey = 1;
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function push(text: string, tone: ToastTone) {
  const key = nextKey++;
  update({ toasts: [...state.toasts, { key, text, tone, open: true }] });
  return key;
}

const close = (key: number) => update({ toasts: state.toasts.map((t) => (t.key === key ? { ...t, open: false } : t)) });

/** Called once a toast's exit motion has finished. */
export const removePdfToast = (key: number) => update({ toasts: state.toasts.filter((t) => t.key !== key) });

export const isPdfBusy = (id: string) => state.busy.has(id);

/** Marks the invoice busy and shows its info toast. Call the result once, when it's over. */
export function startPdf(id: string, text: string): (outcome: "done" | "failed") => void {
  const startedAt = Date.now();
  const key = push(text, "info");
  update({ busy: new Set(state.busy).add(id) });
  return (outcome) => {
    const busy = new Set(state.busy);
    busy.delete(id);
    update({ busy });
    if (outcome === "failed") close(key);
    else setTimeout(() => close(key), Math.max(0, MIN_MS - (Date.now() - startedAt)));
  };
}

export function showPdfError(text: string) {
  const key = push(text, "danger");
  setTimeout(() => close(key), ERROR_MS);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const usePdfActivity = (): State => useSyncExternalStore(subscribe, () => state, () => EMPTY);
