# Promo video: Find a booking, update it, take a payment

**Length:** 87 seconds · **Format:** 9:16 vertical (1080×1920, Instagram Reels / TikTok) · **Focus:** finding an existing booking, updating it and recording the next payment, happy path only

---

## Context

**Brand:** CIR stands for **Clarity for every invoice**. CIR is client bookings, invoice tracking, crew schedules and a package library in one workspace, so organizing and scheduling teams always know where things stand.

**What the video explains:**
1. Finding a booking in the calendar (month, week, day) or the table, using search and filters.
2. Opening it: the drawer slides in from the right, with totals, details and every invoice so far, and then "Edit booking".
3. Adding items, kept short: the totals recalculate.
4. Creating the next invoice: a partial payment, or Paid (Lunas) for the whole remainder, with the payment and remaining balance explained.
5. Submitting and downloading the PDF.
6. Back on the dashboard, the rail keeps watch: upcoming events, balances due today, and bookings that need attention.

**Same system as the other videos:** the same reference motion, Figma styling, orchid focus rings, animated mascot, close and end card. No lane banners, step headers, flow diagrams or developer context. The admin name is moments.id and the address bar reads "cir".

**Readable pace:** the slowest cut so far, 1.45× the design pace. Each step has a caption that names it in bold and explains it in one sentence, and stays on screen for about 3 to 5 seconds.

**Story data (the "B" flow in Figma):** Wedding · Sari & Dimas (BK-2026-0142).
- **Starting point:** two invoices so far, INV-2026-0187 (Rp 3.000.000) and INV-2026-0201 (Rp 2.000.000). That's Rp 5.000.000 paid and Rp 7.500.000 remaining.
- **The edit:** Drone footage and a same-day edit video are added (with Platinum Package and a new date of 21 Nov). The total moves from Rp 12.500.000 to Rp 18.750.000, leaving Rp 13.750.000.
- **Invoice #3 options:** Partial, Rp 5.000.000, leaving Rp 8.750.000. Or Paid (Lunas), Rp 13.750.000, leaving Rp 0.
- **Saved:** INV-2026-0219 is added as Partially paid.

**Source screens (Figma, Bookings page):** 01 Calendar (month) · F2 Week · F3 Day · B1 Find booking · B2 Booking detail — 2 invoices · B3 Edit booking — Invoices (2) · B4 Create invoice — #3 Partial · B6 Create invoice — #3 Paid (Lunas) · B5 Same screen — 3 invoices · D1 Dashboard rail.

**Note on the invoice PDF:** the file has no PDF for INV-2026-0219, only the older INV-2026-0201. I built it from a temporary copy of frame 11 "Invoice PDF", which I exported and then deleted. It shows the Platinum package, the two new items, a total of Rp 18.750.000, previously paid Rp 5.000.000, this payment Rp 5.000.000, and Rp 8.750.000 remaining. The Figma file is unchanged.

---

## Scenes

**Scene 1 · 0–4.3s · Open**
A tile collage: calendar, partial-payment modal, mascot, invoice list. Headline: **"Find it. Get paid."** Caption: "→ CIR · Update a booking".

**Scene 2 · 4.3–22s · Find the booking**
- **Month view.** Scan the month. Each chip is a booking, coloured by payment status. *(Rings the 12 Nov chip.)*
- **Week view.** Zoom into the week to see each booking with its package, status and crew. *(Week is pressed, then the Thu 12 card is ringed.)*
- **Day view.** Or one day at a time. There's Wedding · Sari & Dimas on 12 Nov. *(Day is pressed, then the row is ringed.)*
- **Table, search and filters.** Type a client name, then narrow it down by date, status, crew or package. *(Rings the "wedding" search and the filter chips, then the row is clicked.)*

**Scene 3 · 22–32.9s · Open the booking**
- **The booking drawer.** Click a booking and it slides in from the right: totals, client, package and crew.
- **Every payment so far.** Two invoices on record: Rp 5.000.000 paid, Rp 7.500.000 still to come.
- **Edit booking.** Open the full booking to change anything. *(The button is pressed.)*

**Scene 4 · 32.9–39.4s · Update it**
- **Add items.** Extras slot straight into the list: Drone footage and a same-day edit video.
- **Totals update.** Rp 12.500.000 becomes Rp 18.750.000, leaving Rp 13.750.000. Past invoices keep their figures.

**Scene 5 · 39.4–69.1s · Take a payment**
- **Create invoice.** Invoice #3 starts from what's already been paid.
- **Partial payment.** Enter what the client is paying now: Rp 5.000.000.
- **The balance updates.** New total paid Rp 10.000.000, with Rp 8.750.000 remaining.
- **Or pay in full.** Paid (Lunas) takes the whole remainder: Rp 13.750.000.
- **Nothing left.** New remaining balance Rp 0, and the booking turns Paid.
- **Submit.** Confirm, and the invoice is generated and linked to the booking. *(The partial payment is confirmed.)*
- **Saved and linked.** INV-2026-0219 joins the other two. Download the PDF to send to the client.
- **The invoice PDF.** Previously paid Rp 5.000.000, this payment Rp 5.000.000, Rp 8.750.000 remaining.

**Scene 6 · 69.1–82.2s · CIR keeps watch**
- **Upcoming events.** The rail lists every booking in the next 7 days, with what's still due.
- **Due today.** Balances due today are flagged, so you can follow up before the event.
- **Needs attention.** Bookings still on DP this week are grouped. One tap reviews them all.

**Scene 7 · 82.2–85.2s · Close** (same as the other videos)
**"CIR Bookings"** · "Bookings, invoices, crew and packages in one workspace." The mascot gets excited when "New booking" is pressed.

**Scene 8 · 85.2–87.2s · End card** (same as the other videos)
Solid `#202938`, with the happy mascot. **"CIR"** · "Clarity for every invoice".

---

## Music

The same chiptune vibe, with its own tune: 118 BPM, Am – F – C – G, with a new opening motif and melodies (`npm run music:update` → `video/assets/music-update.wav`). It's built to this cut: intro motif, beat drop at 4.1s, 8-bar A/B sections, drums out for the close at 81.4s, and a jingle on the end card at 85.2s.

## Files

- Composition: `video/update.html`. Timings are written at design pace (body 4.3–58.0s), and `D()` / `WARP` stretch them 1.45×.
- Render: `npm run render:update` in `video/` → `video/output/cir-update-booking-promo-9x16.mp4`
