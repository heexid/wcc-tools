# Promo video: Booking flow, scene by scene

**Length:** 105 seconds · **Format:** 9:16 vertical (1080×1920, Instagram Reels / TikTok) · **Focus:** creating a booking and invoicing it, happy path only

---

## Context

**Brand:** CIR stands for **Clarity for every invoice**. CIR is client bookings, invoice tracking, crew schedules and a package library in one workspace, so organizing and scheduling teams always know where things stand.

**What the video explains:** how a booking is made, from start to invoice:
1. Where to start a booking in every data view: the empty first-use state, the New booking button, a busy month, a busy week, a day with bookings, and an empty day. The CTA sits in a different place in each.
2. The booking form, one section at a time.
3. A down-payment (DP) invoice, by percentage or by fixed amount, then the PDF download.
4. The balance paid later: invoice #2 on the same booking settles it, so the booking ends with two invoices and two PDFs.
5. Why that matters: every invoice is on record on the client's booking (clarity, manageable, centralized).

**Same system as the other two videos:** the same reference motion, Figma styling, orchid focus rings, animated mascot, close and end card. No lane banners, step headers, flow diagrams or developer context. The admin name is moments.id and the address bar reads "cir".

**Readable pace:** every step has its own caption under the headline. The caption names the step in bold, then explains it in one sentence. Each caption stays on screen for about 3 to 5 seconds.

**Sample data (from the Figma screens):** client Sari Wulandari, "Wedding · Sari & Dimas", Gold Package Rp 10.000.000, three extras, total Rp 12.500.000, 12 Nov 2026, crew Raka, Dinda and Nadia. DP Rp 5.000.000 (40%), remaining Rp 7.500.000. Balance Rp 7.500.000 on invoice #2. Invoices INV-2026-0187 (DP) and INV-2026-0201 (balance).

**Source screens (Figma, Bookings page):** 36 Bookings — empty (first use) · 01 Calendar (month) · 17 Calendar — empty-date hover & "+N more" · F2b Week — busy day overflow · 20 Calendar — day view · 30 Calendar day — no bookings · G1 New booking · 13 Package dropdown · 14 Date picker · 03b Assign crew · A3 DP invoice modal (percentage) · A4 DP invoice linked · A5 DP invoice PDF · B6 Create invoice modal — Paid (Lunas) · A4b Full payment linked · A5b Full payment PDF (the last three as bases for invoice #2; see the note below).

**Note on "DP by fixed amount":** the file only shows the fixed-amount option in error states (E1 and 05b). For the video, I made a clean version from a temporary copy of E1. It uses the components from A3: a valid Rp 5.000.000 amount, a normal field, the summary filled in, and the confirm button enabled. The copy was deleted after export, and the Figma file is unchanged. If you want this state in the design file too, it's worth adding as a frame.

**Note on invoice #2:** the file has no frame for a second invoice that settles a 40% DP, so I built three states the same way. Each one comes from a temporary copy that was exported and then deleted:
- **Invoice #2 modal:** B6's "Paid (Lunas)" modal placed over A4 (the booking right after the DP), with the figures set to total Rp 12.500.000, paid Rp 5.000.000 (1 invoice), and this payment Rp 7.500.000.
- **Booking after saving:** A4b with a second invoice card, INV-2026-0201 Rp 7.500.000 above INV-2026-0187 Rp 5.000.000, status Paid.
- **Invoice #2 PDF:** A5b as INV-2026-0201, showing previously paid Rp 5.000.000, this payment Rp 7.500.000, and Rp 0 remaining.

---

## Scenes

**Scene 1 · 0–4.3s · Open**
A tile collage: calendar, fixed-amount invoice, mascot, invoice PDF. Headline: **"Book it. Bill it."** Caption: "→ CIR · Booking flow".

**Scene 2 · 4.3–25.9s · Start from anywhere** (empty states and busy views, so the CTA is seen in each placement)
- **No bookings yet?** The empty state puts New booking front and centre. *(First use: KPIs at Rp 0 and an empty table. The empty state is ringed, then its New booking button is pressed.)*
- **New booking button.** Top right of every Bookings view, always one click away. *(The dashboard with data. The header button is pressed.)*
- **Busy month.** Hover an empty date to book it, or add one from a busy day's list. *(Rings the "+ New booking" tile on 13 Nov, then "New booking on 14 Nov" at the foot of the day popover.)*
- **Busy week.** When a day overflows, New booking on that date sits right under the list. *(The camera slides down the 14 Nov overflow list, with 7 bookings, to its CTA.)*
- **Day view.** Below the day's bookings, New booking on this date adds one more. *(Rings Saturday 14 Nov's four bookings, then the CTA under them.)*
- **Empty day.** Nothing scheduled? Book the date straight from the empty state. *(Sunday 15 Nov, with the CTA in the middle of the empty state.)*

**Scene 3 · 25.9–50.2s · Fill the form**
- **Client.** Name and phone are required. The booking name fills itself as Client · Package.
- **Package.** Pick from your library. Price and inclusions load in, plus how the client should pay. *(The dropdown opens with Gold Package selected, then the payment instruction card is ringed.)*
- **Additional items.** Add extras with a price and quantity. Each line totals itself.
- **Schedule.** Pick the booking date. It shows on the calendar once saved. *(The date picker is open and 12 Nov is pressed.)*
- **Crew.** Assign who's handling the booking. *(Raka, Dinda and Nadia are checked in turn.)*
- **Others.** Terms and conditions, printed on every invoice.
- **Booking summary.** Updates live as you fill the form: Rp 12.500.000 in total.

**Scene 4 · 50.2–73.2s · Take a deposit**
- **Create invoice.** When the client pays, create the invoice right from the booking.
- **DP by percentage.** Choose Percentage, enter 40%, and CIR works out Rp 5.000.000. *(Rings DP, then Percentage, the 40% field, and Total bayar.)*
- **DP by fixed amount.** Or choose Fixed amount and type what the client paid: Rp 5.000.000. *(Rings Fixed amount (Rp), the amount field and Total bayar, then Confirm is pressed.)*
- **Saved as Partially paid.** The invoice is linked to the booking. Download the PDF. *(Rings the toast and the invoice card, then Download PDF is pressed.)*
- **The DP invoice.** This payment Rp 5.000.000, with Rp 7.500.000 left to pay. *(The PDF slides in and the camera pushes in on "This payment".)*

**Scene 5 · 73.2–91.4s · Paid in full** (same booking, invoice #2)
- **Balance paid later?** Create invoice #2 on the same booking. *(Back on the booking after the DP, "Create invoice" is pressed.)*
- **Paid (Lunas).** Invoice #2 picks up what's left: Rp 7.500.000 after the Rp 5.000.000 DP. *(Rings the Paid (Lunas) tab, the auto-calculated amount, and Previously paid (1 invoice).)*
- **Balance settled.** New total paid Rp 12.500.000, with Rp 0 remaining. *(Rings This payment and the remaining balance, then "Confirm full payment" is pressed.)*
- **Two invoices, one booking.** The DP and the balance each get their own invoice number and PDF. *(The toast reads "INV-2026-0201 added · Paid". Rings both invoice cards, then Download PDF is pressed.)*
- **Invoice #2.** Previously paid Rp 5.000.000, this payment Rp 7.500.000, Rp 0 remaining. *(The invoice #2 PDF.)*

**Scene 6 · 91.4–100.2s · Every invoice, on record**
- **Clarity.** Every invoice shows what was paid and what's left, so nobody has to guess. *(The booking summary and invoice list, with the Invoices (2) panel ringed.)*
- **Manageable.** DP first, balance later. Each payment is its own invoice, ready to download again. *(Both Download PDF buttons are ringed.)*
- **Centralized.** All invoices live on the client's booking: one place to check, share and follow up. *(The camera pulls out to the whole booking, ringing the client section and the invoices together.)*

**Scene 7 · 100.2–103.2s · Close** (same as the other videos)
The mascot appears surprised, looks around, gets excited when "New booking" is pressed, then turns happy. Text: **"CIR Bookings"** · "Bookings, invoices, crew and packages in one workspace."

**Scene 8 · 103.2–105.2s · End card** (same as the other videos)
Solid `#202938`, with the happy mascot. **"CIR"** · "Clarity for every invoice".

---

## Music

The same chiptune vibe, with its own tune: 118 BPM, F – G – C – Am, with a new opening motif and melodies (`npm run music:flow` → `video/assets/music-flow.wav`). It follows the same arrangement as the other two: intro motif, beat drop at 4.1s, 8-bar A/B sections, drums out for the close at 99.7s, and a jingle on the end card at 103.2s.

## Files

- Composition: `video/flow.html`. Timings are written at design pace (body 4.3–75.3s), and `D()` / `WARP` stretch them 1.35×.
- Render: `npm run render:flow` in `video/` → `video/output/cir-booking-flow-promo-9x16.mp4`
