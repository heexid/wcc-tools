// Reads have no error screen in Figma (the error states are for writes: Package 06, Bookings 23 / 37), so a
// failed read retries quietly — 0.5 s, 1 s, 2 s — before giving up. The mock never fails reads, so nothing
// changes there. Still worth a design decision for a persistent read failure (P12).
export async function withRetry<T>(fn: () => Promise<T>, waits = [500, 1000, 2000]): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= waits.length) throw e;
      await new Promise((r) => setTimeout(r, waits[i]));
    }
  }
}
