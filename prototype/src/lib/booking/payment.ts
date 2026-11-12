// Payment instruction (Figma Bookings · Hi-fi flow lane I): the bank account the client pays to, printed on every
// invoice. Every booking has one — prefilled with the studio default and never empty. Edited per booking in the
// "Payment instruction" modal: payment receipt name (free text, e.g. Bank BCA, Bank Mandiri), account number
// (numbers only), account name — all required.
import type { PaymentInstruction } from "@/lib/data/types";

export const PAYMENT_LIMITS = { receiptNameMax: 60, accountNumberMin: 5, accountNumberMax: 20, accountNameMax: 80 };

/** Copy from Figma I2 (helpers) and I2e (errors). */
export const PAYMENT_MSG = {
  receiptName: "Enter the bank or payment name",
  accountNumber: "Enter the account number (numbers only)",
  accountName: "Enter the account name",
};
export const PAYMENT_HELPER = { receiptName: "e.g. Bank BCA, Bank Mandiri", accountNumber: "Numbers only", accountName: "Name on the account" };

export type PaymentErrors = Partial<Record<keyof PaymentInstruction, string>>;

/** Typing mask for the account number: digits only, capped. */
export const maskAccountNumber = (v: string) => v.replace(/\D/g, "").slice(0, PAYMENT_LIMITS.accountNumberMax);

export function validatePayment(p: PaymentInstruction): PaymentErrors {
  const e: PaymentErrors = {};
  const name = p.receiptName.trim();
  if (!name || name.length > PAYMENT_LIMITS.receiptNameMax) e.receiptName = PAYMENT_MSG.receiptName;
  if (!/^\d+$/.test(p.accountNumber) || p.accountNumber.length < PAYMENT_LIMITS.accountNumberMin || p.accountNumber.length > PAYMENT_LIMITS.accountNumberMax) e.accountNumber = PAYMENT_MSG.accountNumber;
  const acc = p.accountName.trim();
  if (!acc || acc.length > PAYMENT_LIMITS.accountNameMax) e.accountName = PAYMENT_MSG.accountName;
  return e;
}

export const cleanPayment = (p: PaymentInstruction): PaymentInstruction => ({ receiptName: p.receiptName.trim(), accountNumber: p.accountNumber.trim(), accountName: p.accountName.trim() });

/** "1234567890 · a.n. bs.moment Studio" — the card's second line and the detail row's tail. */
export const paymentDetail = (p: PaymentInstruction) => `${p.accountNumber} · a.n. ${p.accountName}`;
