// Measures strings in the app's Inter 3.19 at a given size (browser text metrics) — F15 Terms wrap check.
import { chromium } from "@playwright/test";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:3100/dev");
const r = await p.evaluate(async () => {
  await document.fonts.ready;
  const c = document.createElement("canvas").getContext("2d");
  const fam = getComputedStyle(document.body).fontFamily;
  c.font = `400 12px ${fam}`;
  return ["DP is non-refundable once the date is locked. Reschedule", "DP is non-refundable once the date is locked.", "Remaining balance is due H-3 before the booking date."].map((t) => [t, c.measureText(t).width.toFixed(2)]);
});
console.log(r); await b.close();
