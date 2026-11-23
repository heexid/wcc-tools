// Shared read definitions for cached screens, so a prefetch and the screen that shows the result use the same
// cache key and the same read.
import { prefetch } from "./cache";
// Through the alias, so DATA_SOURCE=supabase swaps it like every other import (next.config.ts).
import { getBooking } from "@/lib/data/repo";

/** Booking detail (BookingDetail). Wrapped with its id: `null` is a real answer here ("doesn't exist") while the
 *  cached-query hook uses null for "loading", and the id tells this booking's answer from the previous one's. */
export const bookingDetailKey = (id: string) => `booking:${id}`;
export const loadBookingDetail = (id: string) => getBooking(id).then((b) => ({ id, b }));

/** Start loading a booking's detail when the pointer reaches it (or it takes focus), before the click. */
export const prefetchBooking = (id: string) => prefetch(bookingDetailKey(id), () => loadBookingDetail(id));
