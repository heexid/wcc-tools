# Promo video: Bookings, scene by scene

**Length:** about 50 seconds · **Format:** 9:16 vertical (1080×1920, Instagram Reels / TikTok) · **Focus:** the Bookings page, happy path only

---

## Context

**Brand:** CIR stands for **Clarity for every invoice**. CIR is client bookings, invoice tracking, crew schedules and a package library in one workspace, so organizing and scheduling teams always know where things stand. Tagline: "Clarity for every invoice".

**What the video sells:** the Bookings page of CIR. It explains each part a studio team uses every day: the dashboard, the calendar view, the table view, the right rail, and the flow for a new booking (add items, assign crew, create the invoice).

**Happy path only.** Every screen shows things working. No error states, empty states, warnings or edge cases.

**Look and feel:**
- **Motion** follows the reference video (`references/linkedin-video-801kbps.mp4`): a tile collage at the open, big headlines that reveal word by word, screens shown inside a browser window, slow pans and push-ins on the detail that matters, and a plain dark end card.
- **Styling** comes from the Figma file "bs internal tools" (CIR · Design System). Inter, text `#202938` and `#7c8492`, canvas `#f4f5f7`, the orchid gradient `#b23ad4 → #8200a6` for buttons and highlights, the pink glow `#fdb5df`, teal `#41b7c4`, and `#202938` for the end card.

**Not in the video:**
- Flow-diagram pieces: lane banners, arrows, decision diamonds, Yes/No chips, terminal pills.
- Step headers or counters ("Step 1 of 3").
- Developer context: frame names, measurement labels, size badges, Figma selection handles.

**Mascot:** the CIR mascot is always animated, never a still image. Its expressions come from the Figma References sheet ("image 9"): idle, blink, look left/right/up/down, curious, surprised, happy, excited. It breathes gently (a slow squash and stretch), blinks every few seconds, and reacts to what happens on screen. It looks down at the screens, gets excited with a small hop when a button is pressed, and turns happy when the invoice is created. It appears in the CIR header row, the opening tile, the close (surprised → looks around → excited when "New booking" is pressed → happy) and the end card.

**Highlight style:** where a scene needs to point at something, use an orchid focus ring (3px `#b23ad4` with a soft glow), the same ring the app uses on a focused input. A tap is shown as a short press on that ring.

**Sample data (taken from the Figma screens, keep it consistent):**
- Dashboard: 24 bookings this month, Rp 48.750.000 outstanding, Rp 61.200.000 collected.
- New booking: client Sari Wulandari, "Wedding · Sari & Dimas", Gold Package Rp 10.000.000, booking date 12 Nov 2026.
- Additional items: Extra hour ×2 (Rp 1.000.000), Printed album 20×30 (Rp 750.000), Guest photobooth (Rp 750.000). Total Rp 12.500.000.
- Crew: Raka Pratama, Dinda Ayu, Nadia Putri.
- Invoice: DP 40%, Rp 5.000.000, INV-2026-0187, remaining Rp 7.500.000, status Partially paid.

**Source screens (Figma, Bookings page):**

| Scene | Frame |
|---|---|
| Dashboard, calendar (month) | 01 · Bookings — Calendar (month) |
| Calendar (week) | F2 · Calendar — week |
| Table | 02 · Bookings — Table + filters |
| Rail | D1 · Bookings dashboard — rail |
| New booking | 03 · New booking — details & live summary |
| Package | 13 · New booking — package dropdown open |
| Crew | 03b · New booking — assign crew (dropdown open) |
| Invoice | 04 · New booking — Create invoice #1 (DP, modal) |
| Invoice created | 05 · New booking — invoice created (Partially paid) |
| Invoice PDF | 11b · Invoice PDF — DP (INV-2026-0187) |

---

## Scenes

**Scene 1 · 0–4s · Open**
*Visual:* A collage of tiles slides in from the edges: orchid and pink gradient tiles, plus crops of the dashboard, the calendar, the crew picker and the invoice. The headline sits in the middle.
*On screen:* **"Every booking. One place."** Small caption: "→ CIR · Bookings".

**Scene 2 · 4–9s · Dashboard**
*Visual:* The collage clears and a browser window rises with the Bookings dashboard. The camera pushes in on the three summary cards and pans across them.
*On screen:* **"Your month at a glance."** · "Bookings, outstanding balance and cash collected."

**Scene 3 · 9–14s · Calendar view**
*Visual:* The camera glides down to the month calendar. Booking chips sit on their dates, coloured by payment status. It then switches to the week view, where each booking shows its package, status and crew.
*On screen:* **"See every date."** · "Month or week. Colour shows who has paid."

**Scene 4 · 14–18.5s · Table view**
*Visual:* The table view with search and filters applied ("wedding", This month, Partially paid). The orchid ring lands on the filter chips, then the camera pans across Total, Paid, Remaining and Status.
*On screen:* **"Find any booking."** · "Search, then filter by status, crew or package."

**Scene 5 · 18.5–23s · Rail**
*Visual:* The camera moves to the right rail. Upcoming bookings for the next seven days, then Needs attention: the balance due today and the bookings still on DP this week.
*On screen:* **"Know what's due."** · "Upcoming bookings and balances to chase."

**Scene 6 · 23–28s · New booking**
*Visual:* The orchid ring presses "New booking". The form slides up with client details. The camera moves to Package, and the package list opens with Gold Package selected.
*On screen:* **"Book it in one form."** · "Client, package and date in one place."

**Scene 7 · 28–32.5s · Add items**
*Visual:* Additional items fill in one row at a time: Extra hour, Printed album, Guest photobooth. The Booking summary card slides up showing Total booking Rp 12.500.000.
*On screen:* **"Add the extras."** · "The total updates as you go."

**Scene 8 · 32.5–36.5s · Assign crew**
*Visual:* The crew picker is open with Raka, Dinda and Nadia checked. It closes into three crew chips, and the ring settles on them.
*On screen:* **"Assign the crew."** · "Pick who handles the booking."

**Scene 9 · 36.5–42s · Create invoice**
*Visual:* The ring presses "Create invoice". The modal opens with DP 40% and Total bayar Rp 5.000.000, then "Confirm & generate invoice" is pressed. The toast appears: "Booking saved · INV-2026-0187 added · Partially paid".
*On screen:* **"Take the deposit."** · "DP or full price, linked to the booking."

**Scene 10 · 42–45.5s · Invoice PDF**
*Visual:* The invoice PDF fills the window. The camera pans from the header down to "This payment Rp 5.000.000" and the remaining balance.
*On screen:* **"Invoice, ready to send."** · "A branded PDF in one click."

**Scene 11 · 45.5–48.5s · Close**
*Visual:* The window drops away. The CIR mascot appears on a soft pink glow, followed by the name and an orchid "New booking" button.
*On screen:* **"CIR Bookings"** · "Bookings, invoices, crew and packages in one workspace."

**Scene 12 · 48.5–50.5s · End card**
*Visual:* Solid `#202938`. The mascot pops in, happy, then blinks. Below it, a centred white title **"CIR"** with the description "Clarity for every invoice".

---

## Notes for the editor

- Keep the order. It follows a working day: check the month, find a booking, see what's due, then create a new booking from start to invoice.
- Desktop screens only, shown inside a browser window. No phone frames.
- Music: an original chiptune track generated in code (`video/scripts/music.mjs` → `video/assets/music.wav`), so there are no licensing issues. 118 BPM, square-wave lead with a playful opening motif, short pulse arpeggios, bouncing triangle bass, crisp noise snare clicks and light console-style percussion, mixed dry. It is timed to the edit: the intro motif plays under the collage, the beat drops as the dashboard window rises (4.1s), a new section starts at the new-booking flow (20.3s), the drums drop out for the close (44.7s), and a jingle lands on the end card (48.5s). Loudness is normalised to −16 LUFS.
- Source and re-render: `video/index.html` · `npm run render` in `video/` → `video/output/cir-bookings-promo-9x16.mp4`.
