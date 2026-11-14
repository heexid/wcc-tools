// Business information (Figma Launchpad & Profile → lane E, PRD US-14): the studio's identity printed in the invoice
// PDF's Brand row and "From" block. Edited in the "Business information" modal on Account settings.
//   Logo — optional PNG / JPEG / WebP, ≤ 1 MB, re-encoded to ≤ 256 px (PNG / JPEG data URL).
//   Name 2–60 · Address (text area) 1–150 · Email (valid format) · Phone (8–15 digits; + space - ( ) allowed).
import { LIMITS } from "@/lib/booking/calc";
import type { Business } from "@/lib/data/types";

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MAX_PX = 256;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

export const BUSINESS_MSG = {
  name: "Enter 2–60 characters.",
  address: "Enter the business address.",
  email: "Enter a valid email address.",
  phone: "Enter a valid phone number.",
  logoType: "Use a PNG, JPG or WebP image.",
  logoSize: "Logo must be 1 MB or smaller.",
  logoRead: "Couldn’t read this image. Try another file.",
};
export const BUSINESS_HELPER = {
  logo: "PNG, JPG or WebP · up to 1 MB · square works best.",
  name: "2–60 characters. Printed at the top of every invoice.",
  email: "Printed in the invoice header and the From block.",
  phone: "e.g. +62 21-555-0100",
};

export type BusinessErrors = Partial<Record<keyof Business, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateBusiness(b: Business): BusinessErrors {
  const e: BusinessErrors = {};
  const name = b.name.trim();
  if (name.length < LIMITS.businessNameMin || name.length > LIMITS.businessNameMax) e.name = BUSINESS_MSG.name;
  const address = b.address.trim();
  if (!address || address.length > LIMITS.businessAddressMax) e.address = address ? `Max ${LIMITS.businessAddressMax} characters` : BUSINESS_MSG.address;
  if (!EMAIL.test(b.email.trim())) e.email = BUSINESS_MSG.email;
  const digits = b.phone.replace(/\D/g, "").length;
  if (!/^\+?[0-9\s\-()]+$/.test(b.phone.trim()) || digits < 8 || digits > 15) e.phone = BUSINESS_MSG.phone;
  return e;
}

export const cleanBusiness = (b: Business): Business => ({
  name: b.name.trim(),
  address: b.address.trim().replace(/[ \t]*\n[ \t]*/g, "\n"),
  email: b.email.trim(),
  phone: b.phone.trim(),
  logo: b.logo || null,
});

/** Typing mask for the phone field: digits and + space - ( ) only. */
export const maskPhone = (v: string) => v.replace(/[^0-9+\s\-()]/g, "").slice(0, 24);

/** Checks the picked file, then re-encodes it to ≤ 256 px so the saved data URL stays small. Resolves to a data URL
 *  or an error message. */
export async function readLogo(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return { ok: false, error: BUSINESS_MSG.logoType };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, error: BUSINESS_MSG.logoSize };
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, LOGO_MAX_PX / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return { ok: true, dataUrl: c.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9) };
  } catch {
    return { ok: false, error: BUSINESS_MSG.logoRead };
  }
}
