// New / Edit booking form model (PRD US-1, PLAN §5: react-hook-form + zod). Values stay as typed strings
// (input masks keep prices / qty numeric); the schema checks them with the PRD rules and the copy from
// Figma 15. `toBookingInput` converts to the repository's BookingInput (saveBooking re-validates).
import { z } from "zod";
import { LIMITS } from "@/lib/booking/calc";
import type { BookingInput } from "@/lib/data/repo";
import type { PaymentInstruction } from "@/lib/data/types";
import { validatePayment } from "./payment";
import { normalizePhone, type ISODate } from "@/lib/format";

export const MSG = {
  clientRequired: "Client name is required",
  clientLength: `Use ${LIMITS.clientNameMin}–${LIMITS.clientNameMax} characters`,
  phoneRequired: "Phone number is required",
  phoneInvalid: "Enter a valid Indonesian number, e.g. +62 812-3456-7890",
  packageRequired: "Select a package",
  dateRequired: "Pick a booking date",
  itemName: "Enter an item name",
  itemPrice: "Enter a price",
  itemQty: `Qty ${LIMITS.qtyMin}–${LIMITS.qtyMax}`,
  termsMax: `Max ${LIMITS.termsMax} characters`,
};

const digits = (v: string) => v.replace(/\D/g, "");

export const itemSchema = z.object({
  name: z.string().trim().min(1, MSG.itemName),
  price: z.string().refine((v) => digits(v).length > 0, MSG.itemPrice),
  qty: z.string().refine((v) => {
    const n = Number(digits(v));
    return digits(v).length > 0 && n >= LIMITS.qtyMin && n <= LIMITS.qtyMax;
  }, MSG.itemQty),
});

export const bookingSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, MSG.clientRequired)
    .refine((v) => v.length >= LIMITS.clientNameMin && v.length <= LIMITS.clientNameMax, MSG.clientLength),
  clientPhone: z
    .string()
    .trim()
    .min(1, MSG.phoneRequired)
    .refine((v) => !!normalizePhone(v), MSG.phoneInvalid),
  bookingName: z.string(),
  packageId: z.string().min(1, MSG.packageRequired),
  bookingDate: z.string().min(1, MSG.dateRequired),
  items: z.array(itemSchema),
  crewIds: z.array(z.string()),
  terms: z.string().max(LIMITS.termsMax, MSG.termsMax),
  // Edited in its own modal (lane I), which validates each field; here it only has to stay complete.
  paymentInstruction: z
    .object({ receiptName: z.string(), accountNumber: z.string(), accountName: z.string() })
    .refine((p) => !Object.keys(validatePayment(p)).length, "Complete the payment instruction"),
});

export type BookingFormValues = z.input<typeof bookingSchema>;
export type BookingItemValues = BookingFormValues["items"][number];

export const emptyItem = (): BookingItemValues => ({ name: "", price: "", qty: "1" });

export function emptyBooking(terms: string, date: string | null, paymentInstruction: PaymentInstruction): BookingFormValues {
  return { clientName: "", clientPhone: "", bookingName: "", packageId: "", bookingDate: date ?? "", items: [], crewIds: [], terms, paymentInstruction: { ...paymentInstruction } };
}

/** Rp-free integer from a masked price ("1.500.000" → 1500000); "" → null. */
export const parseAmount = (v: string): number | null => (digits(v) ? Number(digits(v)) : null);
/** Thousands mask for the price input ("1500000" → "1.500.000"). */
export const maskAmount = (v: string) => (digits(v) ? Number(digits(v)).toLocaleString("id-ID") : "");
export const maskQty = (v: string) => digits(v).replace(/^0+/, "").slice(0, 3);

export const itemSubtotal = (it: Partial<BookingItemValues>) => (parseAmount(it.price ?? "") ?? 0) * (Number(digits(it.qty ?? "")) || 0);

export function toBookingInput(v: BookingFormValues, id?: string): BookingInput {
  return {
    id,
    clientName: v.clientName,
    clientPhone: v.clientPhone,
    bookingName: v.bookingName,
    packageId: v.packageId || null,
    bookingDate: (v.bookingDate || null) as ISODate | null,
    items: v.items.map((i) => ({ name: i.name, price: parseAmount(i.price), qty: parseAmount(i.qty) })),
    crewIds: v.crewIds,
    terms: v.terms,
    paymentInstruction: { ...v.paymentInstruction },
  };
}

/** Number of fields with an error (each item cell counts) — "2 fields need attention" (Figma 15). */
export function countErrors(errors: object): number {
  let n = 0;
  const walk = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    if ("message" in o && typeof (o as { message?: unknown }).message === "string") {
      n++;
      return;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(errors);
  return n;
}

/** Saved booking → form values (edit mode). */
export function bookingToValues(b: { clientName: string; clientPhone: string; bookingName: string; packageId: string; bookingDate: string; items: { name: string; price: number; qty: number }[]; crewIds: string[]; terms: string; paymentInstruction: PaymentInstruction }, phone: (e164: string) => string): BookingFormValues {
  return {
    clientName: b.clientName,
    clientPhone: phone(b.clientPhone),
    bookingName: b.bookingName,
    packageId: b.packageId,
    bookingDate: b.bookingDate,
    items: b.items.map((i) => ({ name: i.name, price: maskAmount(String(i.price)), qty: String(i.qty) })),
    crewIds: b.crewIds,
    terms: b.terms,
    paymentInstruction: { ...b.paymentInstruction },
  };
}
