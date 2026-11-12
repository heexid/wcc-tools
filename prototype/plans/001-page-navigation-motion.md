# 001 — Keep the shell still on navigation; fade in only the incoming workspace content

- **Status**: DONE
- **Commit**: 4e36668
- **Severity**: MEDIUM
- **Category**: Missed opportunities + Purpose & frequency (preventing a jarring change)
- **Estimated scope**: 3 files (`src/styles/motion.css`, `src/components/shell/AppShell.tsx`, `src/app/bookings/[id]/page.tsx`), ~40 lines

## Problem

Every route (`/bookings`, `/bookings/new`, `/bookings/[id]/edit`, `/bookings/[id]`, `/packages`, `/account`) renders its own
`<AppShell>`, so a client navigation remounts the whole shell. Two things make the move feel like a page reload:

1. **The chrome flashes.** The session gate starts at `false` and only becomes `true` in an effect, so the first committed frame
   of every navigation is a blank screen without the header or workspace card:

   ```tsx
   // src/components/shell/AppShell.tsx:118-128 — current
   function useSessionGate() {
     const router = useRouter();
     const path = usePathname();
     const [ok, setOk] = useState(false);
     useEffect(() => {
       if (hasSession())
         setOk(true); // eslint-disable-line react-hooks/set-state-in-effect -- session lives in localStorage
       else router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
     }, [router, path]);
     return ok;
   }
   // AppShell:  if (!ok) return <div className="min-h-screen bg-surface-header" aria-busy="true" />;
   ```

   `src/app/bookings/[id]/page.tsx:32` does the same thing outside the shell while it checks whether the booking is canceled:

   ```tsx
   if (!b) return <div className="min-h-screen bg-surface-header" aria-busy="true" />;
   ```

2. **The content teleports.** Each page loads its data in an effect, shows an empty `<div className="flex-1" aria-busy="true" />`,
   and then the full screen appears in one frame (`src/app/bookings/page.tsx:130`, `src/app/bookings/[id]/edit/page.tsx:57`,
   `src/components/account/AccountSettings.tsx:43`). The Editor header actions (save status · Cancel · Save) swap in the same way.

Route changes happen **tens of times a day**. The header is the spatial anchor, so it must stay completely still. Only the
workspace content should get a short, quiet fade. No slides, no direction, no stagger.

## Target

- The header and the workspace card render on the **first** frame of a client navigation. They are never animated.
- The direct children of the workspace container fade in on mount: `opacity 0 → 1`, **200ms** (`var(--dur-popover)`),
  `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`. Opacity only, so reduced motion keeps it as is (an opacity fade helps
  comprehension and has no movement).
- The Editor-header action slot's children fade the same way.
- It is CSS-only through `@starting-style`: nothing waits on JS, input works immediately, and the visual gates (which inject
  `transition:none`) see the same end state.

```css
/* target — appended to src/styles/motion.css */
.motion-page > :not(.fixed) {
  transition-property: opacity;
  transition-duration: var(--dur-popover);
  transition-timing-function: var(--ease-out);
}
@starting-style {
  .motion-page > :not(.fixed) {
    opacity: 0;
  }
}
```

(`:not(.fixed)` leaves out `ToastRegion`, a `fixed` direct child that already has its own `.motion-toast` travel.)

## Repo conventions to follow

- Every curve, duration and distance lives in `src/styles/motion.css` as a token. Components only add `motion-*` classes.
  Exemplar: `.motion-notice` / `.motion-enter` (`@starting-style` entrance, entry only, no exit).
- Entry-only motion must not delay children that have their own transitions. Opacity on a parent is safe here.
- `next/navigation` hooks are already used in AppShell. React 19.3 (`useSyncExternalStore` from `react`).

## Steps

1. **`src/styles/motion.css`**: append the CSS block from *Target* after the `.motion-collapse` section (before the final
   reduced-motion block), with this comment:
   `/* Page (route change) — the shell stays still; only the incoming workspace content fades in. Tens/day, so opacity only, 200ms. */`
2. **`src/components/shell/AppShell.tsx`**: replace `useSessionGate` with a synchronous read on client mounts:

   ```tsx
   const subscribeSession = (cb: () => void) => {
     window.addEventListener("storage", cb);
     return () => window.removeEventListener("storage", cb);
   };
   function useSessionGate() {
     const router = useRouter();
     const path = usePathname();
     // Client navigations read the session on the first render, so the shell never blanks. Hydration uses the server
     // snapshot (false) for one pass, then re-renders.
     const ok = useSyncExternalStore(subscribeSession, hasSession, () => false);
     useEffect(() => {
       if (!hasSession()) router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
     }, [router, path]);
     return ok;
   }
   ```

   Add `useSyncExternalStore` to the `react` import. `useState` is still used elsewhere in the file, so keep it.
3. **`src/components/shell/AppShell.tsx`**: in `AppShell`, add `motion-page` to **both** workspace containers:
   - `"flex flex-1 flex-col bg-surface-subtle"` → `"motion-page flex flex-1 flex-col bg-surface-subtle"`
   - `"flex flex-1 flex-col rounded-t-card border border-border-default bg-surface-default"` → prefix `motion-page `.
4. **`src/components/shell/AppShell.tsx`**: in `Header`, the editor slot `<div ref={onSlot} className="flex items-center gap-inset" />`
   → `className="motion-page flex items-center gap-inset"`.
5. **`src/app/bookings/[id]/page.tsx`**: stop blanking outside the shell while loading. Replace

   ```tsx
   if (!b) return <div className="min-h-screen bg-surface-header" aria-busy="true" />;
   return (
     <AppShell module="booking" page={b.ref} editor>
       <BookingReadOnly key={b.id} b={b} onBack={back} />
     </AppShell>
   );
   ```

   with

   ```tsx
   return (
     <AppShell module="booking" page={b?.ref} editor>
       {b ? <BookingReadOnly key={b.id} b={b} onBack={back} /> : <div className="flex-1" aria-busy="true" />}
     </AppShell>
   );
   ```

## Boundaries

- Do NOT animate the header, breadcrumb, launcher or workspace card frame.
- Do NOT add translate/scale/slide, React `<ViewTransition>`, or route-direction logic. They were rejected for frequency.
- Do NOT touch `/login` (it has its own `.motion-enter` / `.motion-stagger`) or `/dev/*`.
- Do NOT add dependencies.
- If the code at the cited lines has drifted, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npm run lint` clean. `npm run test` passes. `npm run visual` passes (gates disable transitions).
- **Feel check** (`npm run dev`, logged in):
  - Bookings → New booking → Cancel → App launcher → Packages → Account menu → Account settings. The header never blinks or
    blanks. Only the content under it fades in.
  - DevTools → Animations at 10%: one opacity fade of about 200ms on the workspace children. No movement. The toast (if a flash
    toast shows after canceling) still drops in from the top and does not fade twice.
  - Changing the calendar/table view, filters or opening the side sheet does **not** replay the fade (same route, same elements).
  - Rendering → `prefers-reduced-motion: reduce`: the fade is unchanged (opacity only).
  - Logged out: visiting `/bookings` still redirects to `/login?next=…`.
- **Done when**: no frame without the header during client navigation, and route content fades in at 200ms ease-out.
