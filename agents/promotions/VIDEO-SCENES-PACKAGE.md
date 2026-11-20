# Promo video: Package Library (create, edit, archive)

**Length:** 103 seconds · **Format:** 9:16 vertical (1080×1920, Instagram Reels / TikTok) · **Focus:** managing packages, happy path only

---

## Context

**Brand:** CIR stands for **Clarity for every invoice**. CIR is client bookings, invoice tracking, crew schedules and a package library in one workspace, so organizing and scheduling teams always know where things stand.

**What the video explains:**
1. After login you land on the Bookings dashboard. Menu opens the launchpad, which leads to Package Lib.
2. A tour of the library: its one rule ("price changes never alter existing bookings"), then name and description, price, bookings, last updated, status, actions, search, and the Active and Archived tabs.
3. Creating a package (name, price, description) and submitting it.
4. Editing a package, and the side effect: a new price only applies to new bookings, and existing bookings keep their saved price.
5. Archiving a package that's no longer offered: it leaves the booking forms, and existing bookings keep it.
6. Reaching the library from any booking form via "Manage library".

**Same system as the other videos:** the same reference motion, Figma styling, orchid focus rings, animated mascot, close and end card. No lane banners, step headers, flow diagrams or developer context. The admin name is moments.id and the address bar reads "cir".

**Readable pace:** 1.45× the design pace. Each step has a caption that names it in bold and explains it in one sentence.

**Story data:**
- **Library:** 6 active packages (Basic, Silver, Gold, Platinum, Corporate, Event) and 2 archived.
- **New package:** Prewedding Story, Rp 7.500.000, "Half-day outdoor session with 2 crew. Includes 40 edited photos, a 1-minute teaser video and an online gallery."
- **Edited and archived:** Gold Package, which is used in 23 bookings.
- **End state:** Active (6), with Prewedding Story added and Gold removed. Archived (3).

**Source screens (Figma):**
- **Launchpad & Profile:** L1 Bookings — Calendar, L2 App launcher open, L3 Package Library.
- **Package Lib:** P1 Package library, 01 Edit package, 03 Archive confirmation, 04 Archived tab.
- **Bookings:** 39 New booking — package dropdown (archived hidden), 38 Edit booking — archived package kept.

**Derived states:** these aren't in the file as frames. Each was built from a temporary copy that was exported and then deleted, so the Figma file is unchanged.
- **New package with filled fields:** the edit modal retitled "New package", with the Prewedding Story values, the "Used in" note and Archive link hidden, and the button set to "Create package". The file's own New package frame (02) only has empty placeholders.
- **Library after create:** a Prewedding Story row (0 bookings), Active (7), and the "Package created · Prewedding Story" message.
- **Archived tab with Gold:** Gold Package archived on 10 Nov 2026 with 23 bookings, Archived (3), Active (5). The file's archived tab (04) only lists Wedding Classic and Studio Mini.
- **Library at the end:** Active (6) without Gold and with Prewedding Story, Archived (3).

---

## Scenes

**Scene 1 · 0–4.3s · Open**
A tile collage: calendar, new-package form, mascot, launchpad. Headline: **"Your packages. One library."** Caption: "→ CIR · Package Library".

**Scene 2 · 4.3–18.4s · Open the Package Library**
- **Start on Bookings.** After you log in, you land on the Bookings dashboard. Open Menu, top left.
- **The launchpad.** Every CIR app lives here. Choose Package Lib.
- **Package Library.** Every package you sell, with its price, description and how often it's booked.

**Scene 3 · 18.4–41.6s · Know your packages**
- **One rule up front.** Packages are used when creating bookings. Price changes never alter existing bookings.
- **Name and description.** What the client gets, shown in the package picker and on the booking.
- **Price.** The current price. Each new booking takes a snapshot of it.
- **Bookings and last updated.** How many bookings use each package, and when it last changed.
- **Status and actions.** Active packages can be booked. Edit or archive from the row, or search for any package.
- **Active and Archived.** Archived packages move to their own tab: out of the way, never lost.

**Scene 4 · 41.6–56.9s · Create a package**
- **New package.** Top right of the library.
- **Name and price.** Only these two are required. Price is whole Rupiah.
- **Description.** What's included. It shows in the package picker and on every booking. *(Then "Create package" is pressed.)*
- **Created.** Prewedding Story is live: Active and ready to pick on any new booking.

**Scene 5 · 56.9–72.1s · Edit a package**
- **Edit.** Open any package from its row. *(Gold Package.)*
- **Update the details.** Change the name, price or description.
- **Only new bookings change.** Gold Package is used in 23 bookings. They keep their saved price; the new one applies to new bookings. *(Rings the price note and the "Used in 23 bookings" box.)*
- **Save.** The library updates straight away.

**Scene 6 · 72.1–91s · Archive a package**
- **Archive.** When a package isn't available any more, archive it from its row.
- **Archive "Gold Package"?** It leaves the booking forms. The 23 bookings that use it keep their package and price.
- **Archived tab.** Gold Package moves here, and you can restore it any time.
- **Gone from booking forms.** New bookings can't pick it: Gold Package is no longer in the list.
- **Existing bookings keep it.** Bookings that already use Gold Package keep it at the saved price, marked Archived.

**Scene 7 · 91–98.1s · Manage from a booking**
- **Manage library.** In any booking form, Manage library opens the Package Library in a new tab.
- **Done.** Packages stay tidy, and every booking keeps the price it was sold at.

**Scene 8 · 98.1–101.1s · Close** (same as the other videos)
**"CIR Bookings"** · "Bookings, invoices, crew and packages in one workspace." The mascot gets excited when "New booking" is pressed.

**Scene 9 · 101.1–103.1s · End card** (same as the other videos)
Solid `#202938`, with the happy mascot. **"CIR"** · "Clarity for every invoice".

---

## Music

The same chiptune vibe, with its own tune: 118 BPM, C – F – Am – G, with a new opening motif and melodies (`npm run music:package` → `video/assets/music-package.wav`). It's built to this cut: intro motif, beat drop at 4.1s, 8-bar A/B sections, drums out for the close at 97.6s, and a jingle on the end card at 101.1s.

## Files

- Composition: `video/package.html`. Timings are written at design pace (body 4.3–69.0s), and `D()` / `WARP` stretch them 1.45×. Modal shots fill the space below the frame with the scrim colour `#b9bcc0`.
- Render: `npm run render:package` in `video/` → `video/output/cir-package-library-promo-9x16.mp4`
