# CIR mascot (three.js)

The pink bubble from Figma › CIR · Design System › Assets › `Asset/mascot-large`, rebuilt as a live three.js scene. No mouth, by design: the face is the two pill eyes. The body glows; its colour flows and glossy crescents orbit the rim.

## Preview

The module lives in the app, `app/src/components/login/mascotScene.js` (types in `mascotScene.d.ts`), and this
page loads that same file, so serve from the **repo root**:

```sh
python3 -m http.server 8765        # from the repo root; ES modules need http://, not file://
open http://localhost:8765/mascot/
```

- **Playground**: every state, the one-shot reactions and four sizes.
- **Login**: the real interaction wiring (focus email, type, focus password, show/hide password, submit `wrong`).

## States

| State | Eyes | When (login) |
|---|---|---|
| `idle` | open, follow the cursor, random blinks | nothing focused |
| `typing` | open, look down at the caret, blink more often | email focused / typing |
| `password` | closed `∪ ∪`, one eye sneaks a peek every few seconds | password focused, hidden |
| `peek` | one closed, one half-open looking at the field | password shown (eye toggle) |
| `happy` | `∩ ∩` + brighter glow, follows the cursor | — |
| `success` | happy + double bounce | login ok |
| `error` | worried tilt + pink flush + dimmer glow, shakes on entry | validation / wrong credentials |
| `loading` | eyes circle upward | waiting for the server |
| `sleepy` | heavy lids, slow breathing | automatic after 20s idle; any input wakes it |

## API (`mascotScene.js`)

```js
import { createMascot } from "../app/src/components/login/mascotScene.js";
const m = createMascot(containerEl, { sleepAfter: 20000, poke: true, fit: 0.72 });
m.setState("typing");            // any state above
m.lookAtClient(x, y);            // page point to look at (used for the caret while typing)
m.keystroke();                   // small nod per key
m.react("blink" | "bounce" | "shake" | "giggle");
m.destroy();                     // on unmount
```

Respects `prefers-reduced-motion` (no float, bounce or shake; eyes still react). Rendering pauses off-screen.

## On the login page

`app/src/components/login/Mascot.tsx` wraps the module for React. It loads three.js after first paint, shows the
PNG until the canvas is ready (or if WebGL isn't available), keeps a 64 layout box and lets the canvas overflow by
16 on each side for the glow. `app/src/app/login/page.tsx` drives the state:

| Login | Mascot |
|---|---|
| nothing focused | `idle` (cursor) |
| Email focused / typing | `typing`, eyes on the caret |
| Password focused | `password`, or `peek` after Show password (`InputField` `onRevealChange`) |
| Logging in… | `loading` |
| Required / format error, wrong credentials, can't connect | `error` for 1.6 s, then back to the focus state |
| Login ok | `success` until the next page loads |

Playwright runs with reduced motion, so the mascot holds still in tests: no float, bounce, shake or idle blinks.
