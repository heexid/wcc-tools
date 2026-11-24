"use client";

import { useEffect } from "react";
import { Toast } from "@/components/ds/Feedback";
import { usePresence } from "@/components/ds/usePresence";
import { removePdfToast, usePdfActivity, type PdfToast } from "@/lib/pdf/activity";

/** One toast per PDF download, oldest on top so a new one never moves those already showing. */
export function PdfToasts() {
  return usePdfActivity().toasts.map((t) => <Item key={t.key} toast={t} />);
}

function Item({ toast }: { toast: PdfToast }) {
  const { mounted, presence } = usePresence(toast.open);
  useEffect(() => {
    if (!mounted) removePdfToast(toast.key);
  }, [mounted, toast.key]);
  return mounted ? (
    <Toast tone={toast.tone} presence={presence}>
      {toast.text}
    </Toast>
  ) : null;
}
