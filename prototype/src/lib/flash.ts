// One-shot message carried across a client navigation (e.g. "Booking canceled · BK-…" shown on the Bookings page
// after canceling from Edit booking, PRD US-12). sessionStorage; silently a no-op where storage is unavailable.
const KEY = "proto:flash";

export function setFlash(text: string) {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {}
}

export function takeFlash(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v !== null) sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
