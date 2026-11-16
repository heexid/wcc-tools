import { describe, expect, it } from "vitest";
import { cn } from "@/components/ds/cn";

describe("cn (tailwind-merge with CIR theme)", () => {
  it("keeps font size and colour that share the text- prefix", () => {
    expect(cn("text-body text-text-primary")).toBe("text-body text-text-primary");
    expect(cn("text-ui-button text-text-on-accent", "text-text-tertiary")).toBe("text-ui-button text-text-tertiary");
  });
  it("lets the caller override width / spacing / radius tokens", () => {
    expect(cn("w-full", "w-[calc(var(--spacing-64)*5)]")).toBe("w-[calc(var(--spacing-64)*5)]");
    expect(cn("px-control", "px-base")).toBe("px-base");
    expect(cn("rounded-pill", "rounded-card")).toBe("rounded-card");
    expect(cn("h-control-height", "h-input-height")).toBe("h-input-height");
  });
  it("keeps shadow and inset-shadow tokens apart", () => {
    expect(cn("shadow-card inset-shadow-button-highlight")).toBe("shadow-card inset-shadow-button-highlight");
  });
});
