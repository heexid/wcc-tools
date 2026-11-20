# Promo video: Bookings dashboard, scene by scene

**Length:** 73 seconds · **Format:** 9:16 vertical (1080×1920, Instagram Reels / TikTok) · **Focus:** the Bookings dashboard, happy path only

---

## Context

**Brand:** CIR stands for **Clarity for every invoice**. CIR is client bookings, invoice tracking, crew schedules and a package library in one workspace, so organizing and scheduling teams always know where things stand.

**What the video explains:** how a team reads the Bookings dashboard:
- the KPI cards
- the calendar in month, week and day views
- the table view
- which crew are assigned to a booking
- the list of bookings each crew member is on
- the rail that tracks balances coming due

**Same system as the Bookings video** (`VIDEO-SCENES-STYLE.md`): the same reference motion, Figma styling, orchid focus rings, animated mascot, close and end card. No lane banners, step headers, flow diagrams or developer context. The admin name is moments.id and the address bar reads "cir".

**Sample data (from the Figma screens):** 24 bookings this month, Rp 48.750.000 outstanding, Rp 61.200.000 collected. Wedding · Sari & Dimas on 12 Nov with crew Raka Pratama, Dinda Ayu and Nadia Putri. Raka has 5 bookings in November. Graduation · Aulia has Rp 1.750.000 due today.

**Source screens (Figma, Bookings page):** 01 Calendar (month) · F2 Calendar week · F3 Calendar day · 02 Table + filters · 02b Crew filter · S1 Booking detail — crew · S2 Crew schedule popover · 29 Calendar day — crew schedule · D1 Dashboard rail · D2 Booking detail — Graduation · Aulia.

---

## Pacing

Slow enough to read. The KPI scene runs 2.2× slower than the first cut and the other feature scenes 1.45× slower; the open, close and end card keep their timing. `dashboard.html` is written in "story" seconds, and the `WARP` table maps them to real seconds.

## Scenes

**Scene 1 · 0–4s · Open**
A tile collage: dashboard calendar, crew schedule, mascot, Needs attention. Headline: **"One dashboard. Every booking."** Caption: "→ CIR · Bookings dashboard".

**Scene 2 · 4.3–16s · KPIs**
The dashboard rises in a browser window. Then the camera frames one KPI card at a time, about 3.5 seconds each. The whole card is in view, so its title, number and trend are readable, and it's ringed. Under the headline, a caption names the KPI and explains its number:
- **Bookings this month: 24.** Every booking scheduled for November. That's 4 more than last month.
- **Outstanding balance: Rp 48.750.000.** Money clients still owe you, spread across 14 bookings.
- **Collected this month: Rp 61.200.000.** Payments received in November, up 12,4% on last month.

*On screen:* **"The numbers that matter."** with the KPI caption below.

**Scene 3 · 16–30s · Calendar: month → week → day**
Month view, with the Month tab ringed. "Week" is pressed: the week of 9–15 Nov shows each booking with its package, status and crew avatars. "Day" is pressed: Thursday 12 Nov, ringing the Wedding · Sari & Dimas row, then its crew, total and status.
*On screen:* **"Month, week, day."** · "Zoom from the whole month down to a single day."

**Scene 4 · 30–37.7s · Table view**
Table view with search and filters applied (the filter chips are ringed). The camera pans across Total, Paid, Remaining and Status.
*On screen:* **"Every booking in a table."** · "Filter by date, status, crew or package."

**Scene 5 · 37.7–46.4s · Crew on each booking**
The crew filter opens, with Raka Pratama and Dinda Ayu checked. A booking opens in the side panel, and its Crew row is ringed: Raka, Dinda, Nadia.
*On screen:* **"See who's on each booking."** · "Filter by crew, or open a booking to see its team."

**Scene 6 · 46.4–56.3s · Each crew member's bookings**
Tapping "Raka Pratama" opens his schedule: 5 bookings in November, with this booking marked. "See in calendar" is pressed and lands on the day view with the same schedule.
*On screen:* **"Every crew member's bookings."** · "Tap a name to see their schedule."

**Scene 7 · 56.3–68s · Rail: due balances**
The right rail: Upcoming (next 7 days), then Needs attention: "Balance due today: Graduation · Aulia, Rp 1.750.000 outstanding". "View booking" is pressed. The booking opens with its remaining Rp 1.750.000 ("balance due today") and its linked invoice.
*On screen:* **"Never miss a due balance."** · "The rail flags what's due today and this week."

**Scene 8 · 68–71s · Close** (same as the Bookings video)
The mascot appears surprised, looks around, gets excited when "New booking" is pressed, then turns happy. Text: **"CIR Bookings"** · "Bookings, invoices, crew and packages in one workspace."

**Scene 9 · 71–73s · End card** (same as the Bookings video)
Solid `#202938`, with the happy mascot. **"CIR"** · "Clarity for every invoice".

---

## Music

The same chiptune vibe as the Bookings video, but its own tune: 118 BPM, C – Am – F – G, with a new opening motif and melodies (`npm run music:dashboard` → `video/assets/music-dashboard.wav`). It's built to the 73-second cut: intro motif, beat drop at 4.1s, 8-bar sections alternating A and B, drums out for the close at 67.1s, and a jingle on the end card at 71.0s.

## Files

- Composition: `video/dashboard.html`
- Render: `npm run render:dashboard` in `video/` → `video/output/cir-dashboard-promo-9x16.mp4`
