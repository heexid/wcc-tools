import { describe, expect, it } from "vitest";
import { crewOptions } from "@/lib/booking/crew";

const crew = [
  { id: "a", name: "Raka", role: "Videographer", isActive: true, userId: null },
  { id: "b", name: "Gone", role: "", isActive: false },
  { id: "c", name: "Admin", role: "", isActive: true, userId: "u1" },
];
const labels = (selected: string[], me: string | null) => crewOptions(crew, selected, me).map((c) => c.label);

describe("crewOptions", () => {
  it("puts the signed-in person first as (You)", () => expect(labels([], "u1")).toEqual(["Admin (You)", "Raka"]));
  it("no profile yet, or no entry: plain list", () => {
    expect(labels([], null)).toEqual(["Raka", "Admin"]);
    expect(labels([], "other")).toEqual(["Raka", "Admin"]);
  });
  it("keeps an inactive person who is already selected", () => expect(labels(["b"], null)).toEqual(["Raka", "Gone", "Admin"]));
});
