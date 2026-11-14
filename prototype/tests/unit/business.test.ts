import { describe, expect, it } from "vitest";
import { cleanBusiness, maskPhone, validateBusiness } from "@/lib/booking/business";

const ok = { name: "bs.moment", address: "Jl. Rawa Mangun No. 12, Jakarta Timur", phone: "+62 21-555-0100", email: "finance@bs-moment.com", logo: null };

describe("business information (PRD US-14)", () => {
  it("accepts the seeded business", () => expect(validateBusiness(ok)).toEqual({}));
  it("name 2–60 trimmed", () => {
    expect(validateBusiness({ ...ok, name: " a " }).name).toBeTruthy();
    expect(validateBusiness({ ...ok, name: "x".repeat(61) }).name).toBeTruthy();
    expect(validateBusiness({ ...ok, name: "x".repeat(60) }).name).toBeUndefined();
  });
  it("address required, ≤ 150", () => {
    expect(validateBusiness({ ...ok, address: "  " }).address).toBeTruthy();
    expect(validateBusiness({ ...ok, address: "x".repeat(151) }).address).toBeTruthy();
  });
  it("email format", () => {
    for (const e of ["", "a", "a@b", "a b@c.id", "a@b."]) expect(validateBusiness({ ...ok, email: e }).email, e).toBeTruthy();
    expect(validateBusiness({ ...ok, email: "hi@studio.id" }).email).toBeUndefined();
  });
  it("phone: 8–15 digits, only + space - ( )", () => {
    for (const p of ["", "12", "abc12345678", "1234567890123456"]) expect(validateBusiness({ ...ok, phone: p }).phone, p).toBeTruthy();
    expect(validateBusiness({ ...ok, phone: "(021) 555-0100" }).phone).toBeUndefined();
    expect(maskPhone("+62 abc 21-5")).toBe("+62  21-5");
  });
  it("cleanBusiness trims and keeps no empty logo", () => {
    expect(cleanBusiness({ ...ok, name: "  x1  ", logo: "" })).toMatchObject({ name: "x1", logo: null });
  });
});
