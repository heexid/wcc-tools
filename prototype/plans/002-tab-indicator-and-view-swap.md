# 002 — Slide the tab indicator; fade in the swapped Calendar / Table / range body

- **Status**: DONE
- **Commit**: 4e36668 (+ plan 001 applied, uncommitted)
- **Severity**: LOW
- **Category**: Missed opportunities (state indication; preventing a jarring change)
- **Estimated scope**: 6 files: `styles/motion.css`, `ds/Tabs.tsx`, `bookings/BookingFilters.tsx`, `app/packages/page.tsx`, `bookings/BookingCalendar.tsx`, `bookings/BookingTable.tsx`

## Problem

1. **The tab underline teleports.** `src/components/ds/Tabs.tsx:30` draws the active underline as each tab's own border:
   `active ? "border-b-2 border-accent-primary …" : "…"`. Switching tabs makes the line vanish under one tab and appear under
   the next. This affects Calendar/Table (`BookingFilters.tsx:359`), Month/Week/Day (`ds/Calendar.tsx:176` → `<Tabs>`) and
   Package Active/Archived (`app/packages/page.tsx:244`). `--dur-indicator` ("tab / segmented-control indicator") already exists
   and is used by the segmented control.
2. **The view body swaps in one frame.** `app/bookings/page.tsx:197` replaces `<BookingCalendar>` with `<BookingTable>`, and
   `BookingCalendar.tsx:93` replaces the Month / Week / Day bodies. These are completely different layouts that appear with no bridge.

Frequency is tens a day, so both changes must be near-imperceptible. ‹ › previous/next, keyboard date stepping, filters and
pagination must **not** animate.

## Target

- **Indicator**: one 2px `bg-accent-primary` bar per tab list, absolutely positioned at the list's bottom. It is placed with
  `translateX(<active tab offsetLeft>px)` and given the active tab's width. It slides on `transform` over `var(--dur-indicator)`
  (250ms) with `var(--ease-in-out)` = `cubic-bezier(0.77, 0, 0.175, 1)`. There is no transition on first paint. When the change
  comes from the keyboard (← → Home End), the bar moves instantly. Reduced motion: no slide. The active tab keeps its
  `border-b-2` so the label still sits 1px higher (as in Figma), but inside an indicator list that border is transparent.
- **Swap**: new token `--dur-swap: 150ms`. The `.motion-swap` element fades `opacity 0 → 1` through `@starting-style` with
  `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`. Entry only, no movement, so it is unchanged under reduced motion. It is
  applied to elements that are **new** only when the view or range changes (the calendar section, the table section, and a
  wrapper keyed by range).

## Steps

1. `motion.css`: add `--dur-swap: 150ms;` after `--dur-indicator`. Add the `.motion-tab-indicator` block
   (transition only when `[data-ready]` and not `[data-instant]`; `transition-duration: 0ms` under reduced motion) and the
   `.motion-swap` block.
2. `ds/Tabs.tsx`: add `TabList` (a `role="tablist"` div, `relative group/tabs`, `data-indicator`). It renders its children and
   then a `<span class="motion-tab-indicator">` placed **last**, so `children[n]` indexing in `Tabs` still points at the tabs. A
   `useLayoutEffect` with no deps reads `[role=tab][aria-selected=true]` and sets the span's width and transform. It sets
   `data-ready` on the next animation frame after the first placement. A capture-phase keydown sets `data-instant` and a
   pointerdown clears it. `Tab`: `group-data-[indicator]/tabs:border-transparent` on active. `Tabs` renders `TabList`.
3. `BookingFilters.tsx:359` and `packages/page.tsx:244`: replace the `<div role="tablist" …>` with
   `<TabList label=… className=…>`, keeping the same classes.
4. `BookingCalendar.tsx`: add `motion-swap` to the `<section aria-label="Calendar">`, and wrap the range body in
   `<div key={range} className="motion-swap">`.
5. `BookingTable.tsx:100`: add `motion-swap` to the `<section aria-label="Bookings table">`.

## Boundaries

- Do not animate ‹ › / Today / arrow-key date moves, filters, sort or pagination.
- Do not touch `SegmentedControl` (it already slides).
- No dependencies, no Motion library.

## Verification

- **Feel check**: click Calendar → Table → Calendar. The underline slides 250ms and the body fades in at 150ms with no
  movement. Month → Week → Day: the same. Press ‹ › repeatedly and nothing fades. Focus a tab and press → : the underline
  jumps instantly. Load the page: the underline is already in place, with no slide from the left.
  `prefers-reduced-motion`: no slide; the fade remains.
- **Done when**: the above holds, and with transitions disabled (visual gates) the underline sits exactly where the
  old border did.
