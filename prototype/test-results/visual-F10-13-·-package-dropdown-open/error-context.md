# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F10.spec.ts >> 13 · package dropdown open
- Location: tests/visual/F10.spec.ts:43:1

# Error details

```
Error: bookings-13 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.007957052195751034
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - navigation "Breadcrumb" [ref=f1e4]:
        - button "Menu" [ref=f1e6] [cursor=pointer]
        - link "Booking" [ref=f1e19] [cursor=pointer]:
          - /url: /bookings
        - generic [ref=f1e22]: New booking
      - generic [ref=f1e26]:
        - status [ref=f1e27]:
          - generic [ref=f1e32]: Draft · not saved
        - generic [ref=f1e34]:
          - button "Cancel" [ref=f1e35] [cursor=pointer]
          - button "Save booking" [ref=f1e37] [cursor=pointer]
    - generic [ref=f1e41]:
      - generic [ref=f1e43]:
        - button "Back to bookings" [ref=f1e44] [cursor=pointer]
        - heading "New booking" [level=1] [ref=f1e47]
        - generic [ref=f1e49]: Draft
      - generic [ref=f1e53]:
        - main [ref=f1e54]:
          - generic [ref=f1e55]:
            - region "Client" [ref=f1e56]:
              - generic [ref=f1e57]:
                - heading "Client" [level=2] [ref=f1e58]
                - generic [ref=f1e60]:
                  - generic [ref=f1e61]: "*"
                  - generic [ref=f1e62]: Required fields
              - generic [ref=f1e63]:
                - generic [ref=f1e64]:
                  - generic [ref=f1e65]:
                    - generic [ref=f1e66]: Client name
                    - generic [aria-hidden] [ref=f1e67]: "*"
                  - textbox "Client name" [ref=f1e69]: Sari Wulandari
                - generic [ref=f1e70]:
                  - generic [ref=f1e71]:
                    - generic [ref=f1e72]: Phone number
                    - generic [aria-hidden] [ref=f1e73]: "*"
                  - textbox "Phone number" [ref=f1e75]:
                    - /placeholder: +62 812-3456-7890
                    - text: +62 812-3456-7890
              - generic [ref=f1e76]:
                - generic [ref=f1e77]: Booking name
                - textbox "Booking name" [ref=f1e80]:
                  - /placeholder: Sari Wulandari · Gold Package
                  - text: Wedding · Sari & Dimas
                - paragraph [ref=f1e81]: Optional — defaults to “Client · Package”
            - separator [ref=f1e82]
            - region "Package" [ref=f1e83]:
              - generic [ref=f1e84]:
                - heading "Package" [level=2] [ref=f1e85]
                - link "Manage library" [ref=f1e88] [cursor=pointer]:
                  - /url: /packages
              - generic [ref=f1e90]:
                - generic [ref=f1e91]:
                  - generic [ref=f1e92]: Package
                  - generic [aria-hidden] [ref=f1e93]: "*"
                - generic [ref=f1e94]:
                  - button "Package" [expanded] [ref=f1e96] [cursor=pointer]:
                    - generic [ref=f1e97]: Gold Package
                  - dialog "Package" [ref=f1e100]:
                    - textbox "Search package" [active] [ref=f1e104]
                    - listbox "Packages" [ref=f1e105]:
                      - option [ref=f1e106]:
                        - button "Basic Package 2-hour session · 1 crew · 25 edited photos Rp 2.000.000" [ref=f1e107] [cursor=pointer]:
                          - generic [ref=f1e108]:
                            - generic [ref=f1e109]: Basic Package
                            - generic [ref=f1e110]: 2-hour session · 1 crew · 25 edited photos
                          - generic [ref=f1e111]: Rp 2.000.000
                      - option [ref=f1e114]:
                        - button "Silver Package 4-hour coverage · 1 crew · 60 edited photos Rp 3.000.000" [ref=f1e115] [cursor=pointer]:
                          - generic [ref=f1e116]:
                            - generic [ref=f1e117]: Silver Package
                            - generic [ref=f1e118]: 4-hour coverage · 1 crew · 60 edited photos
                          - generic [ref=f1e119]: Rp 3.000.000
                      - option [selected] [ref=f1e122]:
                        - button "Gold Package 8-hour coverage · 2 crew · 1 premium album Rp 10.000.000" [ref=f1e123] [cursor=pointer]:
                          - generic [ref=f1e124]:
                            - generic [ref=f1e125]: Gold Package
                            - generic [ref=f1e126]: 8-hour coverage · 2 crew · 1 premium album
                          - generic [ref=f1e127]: Rp 10.000.000
                      - option [ref=f1e130]:
                        - button "Platinum Package Full-day coverage · 3 crew · album + video highlight Rp 14.000.000" [ref=f1e131] [cursor=pointer]:
                          - generic [ref=f1e132]:
                            - generic [ref=f1e133]: Platinum Package
                            - generic [ref=f1e134]: Full-day coverage · 3 crew · album + video highlight
                          - generic [ref=f1e135]: Rp 14.000.000
                      - option [ref=f1e138]:
                        - button "Corporate Package Half-day event · 2 crew · same-day delivery Rp 9.000.000" [ref=f1e139] [cursor=pointer]:
                          - generic [ref=f1e140]:
                            - generic [ref=f1e141]: Corporate Package
                            - generic [ref=f1e142]: Half-day event · 2 crew · same-day delivery
                          - generic [ref=f1e143]: Rp 9.000.000
                      - option [ref=f1e146]:
                        - button "Event Package Seminar / launch · 2 crew · 100 edited photos Rp 6.000.000" [ref=f1e147] [cursor=pointer]:
                          - generic [ref=f1e148]:
                            - generic [ref=f1e149]: Event Package
                            - generic [ref=f1e150]: Seminar / launch · 2 crew · 100 edited photos
                          - generic [ref=f1e151]: Rp 6.000.000
                    - link "Manage package library (opens in new tab)" [ref=f1e155] [cursor=pointer]:
                      - /url: /packages
              - generic [ref=f1e161]:
                - generic [ref=f1e162]:
                  - generic [ref=f1e163]: Gold Package
                  - generic [ref=f1e165]: 8-hour coverage · 2 crew · 1 premium album
                - generic [ref=f1e166]: Rp 10.000.000
              - group "Payment instruction" [ref=f1e167]:
                - generic [ref=f1e170]:
                  - generic [ref=f1e175]:
                    - generic [ref=f1e176]: Bank BCA
                    - generic [ref=f1e177]: 1234567890 · a.n. bs.moment Studio
                  - button "Edit payment instruction (Bank BCA)" [ref=f1e178] [cursor=pointer]:
                    - generic [ref=f1e182]: Edit
            - separator [ref=f1e183]
            - region "Additional items" [ref=f1e184]:
              - generic [ref=f1e185]:
                - heading "Additional items" [level=2] [ref=f1e186]
                - generic [ref=f1e188]: 3 items
              - table "Additional items" [ref=f1e190]:
                - row "Item Price Qty Subtotal Remove" [ref=f1e191]:
                  - columnheader "Item" [ref=f1e192]
                  - columnheader "Price" [ref=f1e193]
                  - columnheader "Qty" [ref=f1e194]
                  - columnheader "Subtotal" [ref=f1e195]
                  - columnheader "Remove"
                - row [ref=f1e197]:
                  - cell [ref=f1e198]:
                    - textbox "Item 1 name" [ref=f1e200]:
                      - /placeholder: Item name
                      - text: Extra hour
                  - cell "Rp 500.000" [ref=f1e201]:
                    - generic [ref=f1e202]:
                      - generic [ref=f1e203]: Rp
                      - textbox "Item 1 price" [ref=f1e204]:
                        - /placeholder: "0"
                        - text: "500.000"
                  - cell [ref=f1e205]:
                    - textbox "Item 1 quantity" [ref=f1e207]: "2"
                  - cell "Rp 1.000.000" [ref=f1e208]
                  - cell [ref=f1e210]:
                    - button "Remove item 1" [ref=f1e211] [cursor=pointer]
                - row [ref=f1e215]:
                  - cell [ref=f1e216]:
                    - textbox "Item 2 name" [ref=f1e218]:
                      - /placeholder: Item name
                      - text: Printed album 20×30
                  - cell "Rp 750.000" [ref=f1e219]:
                    - generic [ref=f1e220]:
                      - generic [ref=f1e221]: Rp
                      - textbox "Item 2 price" [ref=f1e222]:
                        - /placeholder: "0"
                        - text: "750.000"
                  - cell [ref=f1e223]:
                    - textbox "Item 2 quantity" [ref=f1e225]: "1"
                  - cell "Rp 750.000" [ref=f1e226]
                  - cell [ref=f1e228]:
                    - button "Remove item 2" [ref=f1e229] [cursor=pointer]
                - row [ref=f1e233]:
                  - cell [ref=f1e234]:
                    - textbox "Item 3 name" [ref=f1e236]:
                      - /placeholder: Item name
                      - text: Guest photobooth
                  - cell "Rp 750.000" [ref=f1e237]:
                    - generic [ref=f1e238]:
                      - generic [ref=f1e239]: Rp
                      - textbox "Item 3 price" [ref=f1e240]:
                        - /placeholder: "0"
                        - text: "750.000"
                  - cell [ref=f1e241]:
                    - textbox "Item 3 quantity" [ref=f1e243]: "1"
                  - cell "Rp 750.000" [ref=f1e244]
                  - cell [ref=f1e246]:
                    - button "Remove item 3" [ref=f1e247] [cursor=pointer]
                - button "Add item" [ref=f1e252] [cursor=pointer]
            - separator [ref=f1e255]
            - region "Schedule" [ref=f1e256]:
              - heading "Schedule" [level=2] [ref=f1e258]
              - generic [ref=f1e260]:
                - generic [ref=f1e261]:
                  - generic [ref=f1e262]:
                    - generic [ref=f1e263]: Booking date
                    - generic [aria-hidden] [ref=f1e264]: "*"
                  - button "Booking date" [ref=f1e267] [cursor=pointer]:
                    - generic [ref=f1e270]: 12 Nov 2026
                - generic [ref=f1e271]:
                  - generic [ref=f1e272]: Created
                  - textbox "Created" [disabled] [ref=f1e275]: 10 Nov 2026, 09:00
                  - paragraph [ref=f1e276]: Set automatically
            - separator [ref=f1e277]
            - region "Crew" [ref=f1e278]:
              - generic [ref=f1e279]:
                - heading "Crew" [level=2] [ref=f1e280]
                - generic [ref=f1e282]: Handling this booking
              - generic [ref=f1e284]:
                - generic [ref=f1e285]: Assigned crew
                - generic [ref=f1e288]:
                  - generic:
                    - generic:
                      - generic [aria-hidden]:
                        - generic: RP
                      - generic: Raka Pratama
                      - button "Remove Raka Pratama" [ref=f1e289] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: DA
                      - generic: Dinda Ayu
                      - button "Remove Dinda Ayu" [ref=f1e293] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: NP
                      - generic: Nadia Putri
                      - button "Remove Nadia Putri" [ref=f1e297] [cursor=pointer]
                  - 'button "Assigned crew: Raka Pratama, Dinda Ayu, Nadia Putri. Change crew" [ref=f1e301] [cursor=pointer]'
                - paragraph [ref=f1e304]: 3 crew assigned
            - separator [ref=f1e305]
            - region "Others" [ref=f1e306]:
              - heading "Others" [level=2] [ref=f1e308]
              - generic [ref=f1e310]:
                - generic [ref=f1e311]: Terms & Conditions
                - textbox "Terms & Conditions" [ref=f1e314]: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
                - generic [ref=f1e315]:
                  - paragraph [ref=f1e316]: Printed on every invoice for this booking
                  - paragraph [ref=f1e317]: 174/255
        - complementary "Summary and invoices" [ref=f1e318]:
          - region "Booking summary" [ref=f1e319]:
            - generic [ref=f1e320]:
              - heading "Booking summary" [level=2] [ref=f1e321]
              - generic [ref=f1e323]: Updates live
            - generic [ref=f1e324]:
              - generic [ref=f1e325]: Gold Package
              - generic [ref=f1e326]: Rp 10.000.000
            - generic [ref=f1e327]:
              - generic [ref=f1e328]: Additional items (3)
              - generic [ref=f1e329]: Rp 2.500.000
            - separator [ref=f1e330]
            - generic [ref=f1e331]:
              - generic [ref=f1e332]: Subtotal
              - generic [ref=f1e333]: Rp 12.500.000
            - generic [ref=f1e334]:
              - generic [ref=f1e335]:
                - generic [ref=f1e336]: Total booking
                - generic [ref=f1e337]: Rp 12.500.000
              - generic [ref=f1e338]: Booking date 12 Nov 2026 · shows on calendar after save
          - region "Invoices" [ref=f1e339]:
            - generic [ref=f1e340]:
              - heading "Invoices (0)" [level=2] [ref=f1e341]
              - generic [ref=f1e343]: Draft
            - generic [ref=f1e347]:
              - paragraph [ref=f1e348]:
                - generic [ref=f1e349]: No invoice yet — booking will be saved as Draft
              - paragraph [ref=f1e350]: Create the first invoice (DP or full price) here when the client pays. Each invoice is linked to this booking.
              - button "Create invoice" [ref=f1e351] [cursor=pointer]
  - alert [ref=f1e354]
```

# Test source

```ts
  55  |     return { ratio: 1, diffPixels: -1, size: `${actual.width}×${actual.height} vs Figma ${expected.width}×${expected.height}`, diff: null };
  56  |   }
  57  |   const diff = new PNG({ width: expected.width, height: expected.height });
  58  |   const diffPixels = pixelmatch(flatten(actual), flatten(expected), diff.data, expected.width, expected.height, { threshold, includeAA: false });
  59  |   return { ratio: diffPixels / (expected.width * expected.height), diffPixels, size: `${expected.width}×${expected.height}`, diff };
  60  | }
  61  | 
  62  | /**
  63  |  * G3c — component gate (PROTOTYPE-PLAN §0.3). Figma and Chrome antialias glyphs and curved edges
  64  |  * differently, so on small, text-dense components a flat pixel budget measures the rasteriser, not
  65  |  * the build. Instead: every pixel on a flat area of the Figma image (fills, interiors, backgrounds)
  66  |  * must match (0 diffs), and at most `edgeRatio` of the edge pixels (antialiased glyph/shape edges,
  67  |  * where neighbours differ by > 24 levels or alpha is partial) may differ. A 1px shift fails this
  68  |  * (self-test in F01.spec.ts) because it moves edges onto flat areas.
  69  |  */
  70  | export const G3C = { threshold: 0.1, edgeRatio: 0.2, edgeDelta: 24 };
  71  | 
  72  | export function diffComponent(actual: PNG, expected: PNG) {
  73  |   if (actual.width !== expected.width || actual.height !== expected.height) return null;
  74  |   const W = expected.width, H = expected.height;
  75  |   const E = flatten(expected), A = flatten(actual);
  76  |   const mask = Buffer.alloc(W * H * 4);
  77  |   pixelmatch(A, E, mask, W, H, { threshold: G3C.threshold, includeAA: true, diffMask: true });
  78  |   const lum = (b: Buffer, i: number) => (b[i] * 299 + b[i + 1] * 587 + b[i + 2] * 114) / 1000;
  79  |   let flatDiffs = 0, edgeDiffs = 0, edgeTotal = 0;
  80  |   for (let y = 0; y < H; y++)
  81  |     for (let x = 0; x < W; x++) {
  82  |       const i = (y * W + x) * 4;
  83  |       const a = expected.data[i + 3];
  84  |       let edge = a > 0 && a < 255;
  85  |       for (let dy = -1; dy <= 1 && !edge; dy++)
  86  |         for (let dx = -1; dx <= 1 && !edge; dx++) {
  87  |           const nx = x + dx, ny = y + dy;
  88  |           if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
  89  |           if (Math.abs(lum(E, i) - lum(E, (ny * W + nx) * 4)) > G3C.edgeDelta) edge = true;
  90  |         }
  91  |       const differs = mask[i + 3] > 0;
  92  |       if (edge) {
  93  |         edgeTotal++;
  94  |         if (differs) edgeDiffs++;
  95  |       } else if (differs) flatDiffs++;
  96  |     }
  97  |   return { flatDiffs, edgeDiffs, edgeTotal, edgeRatio: edgeTotal ? edgeDiffs / edgeTotal : 0 };
  98  | }
  99  | 
  100 | export type Rect = { x: number; y: number; w: number; h: number };
  101 | 
  102 | /** Find a node's rect in a frame spec (public/__figma__/specs/<spec>.json) by a substring of its line. */
  103 | export function specRect(spec: string, match: string | RegExp): Rect {
  104 |   const lines: string[] = JSON.parse(readFileSync(join(FIGMA_DIR, "specs", `${spec}.json`), "utf8"));
  105 |   const line = lines.find((l) => (typeof match === "string" ? l.includes(match) : match.test(l)));
  106 |   const m = line?.match(/ ([\d.]+)x([\d.]+) @([\d.]+),([\d.]+)/);
  107 |   if (!m) throw new Error(`specRect: "${match}" not found in ${spec}`);
  108 |   return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
  109 | }
  110 | 
  111 | /**
  112 |  * Compare a page region (or the full 1440 × frame-height page) with a Figma frame.
  113 |  * `masks` (frame coordinates) cover Figma sample-content quirks — each must carry a written reason in the spec.
  114 |  */
  115 | export async function expectMatchesFigma(
  116 |   page: Page,
  117 |   frame: string,
  118 |   target?: Locator,
  119 |   opts: Partial<typeof G3> & { masks?: Rect[]; clip?: Rect; keepPointer?: boolean; label?: string } = {},
  120 | ) {
  121 |   const { threshold, maxDiffPixelRatio } = { ...G3, ...opts };
  122 |   let expected: PNG = readFigmaPng(frame);
  123 |   await settle(page, { keepPointer: opts.keepPointer });
  124 |   let buf: Buffer;
  125 |   if (opts.clip) {
  126 |     // Region of a Figma frame (e.g. the shell header of a page whose body belongs to a later slice).
  127 |     const c = opts.clip;
  128 |     const full = expected;
  129 |     await page.setViewportSize({ width: full.width, height: Math.max(900, Math.min(full.height, c.y + c.h + 200)) });
  130 |     expected = new PNG({ width: c.w, height: c.h });
  131 |     PNG.bitblt(full, expected, c.x, c.y, c.w, c.h, 0, 0);
  132 |     buf = await page.screenshot({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  133 |     opts = { ...opts, masks: (opts.masks ?? []).map((m) => ({ ...m, x: m.x - c.x, y: m.y - c.y })) };
  134 |   } else if (target) {
  135 |     buf = await target.screenshot();
  136 |   } else {
  137 |     await page.setViewportSize({ width: expected.width, height: expected.height });
  138 |     buf = await page.screenshot({ clip: { x: 0, y: 0, width: expected.width, height: expected.height } });
  139 |   }
  140 |   const actual = PNG.sync.read(buf);
  141 |   for (const m of opts.masks ?? [])
  142 |     for (let y = Math.floor(m.y); y < Math.ceil(m.y + m.h); y++)
  143 |       for (let x = Math.floor(m.x); x < Math.ceil(m.x + m.w); x++) {
  144 |         const i = (y * expected.width + x) * 4;
  145 |         if (i >= 0 && i < expected.data.length) expected.data.copy(actual.data, i, i, i + 4);
  146 |       }
  147 |   const res = diffPngs(actual, expected, threshold);
  148 |   mkdirSync(OUT_DIR, { recursive: true });
  149 |   const tag = opts.label ? `${frame}-${opts.label}` : frame;
  150 |   writeFileSync(join(OUT_DIR, `${tag}-actual.png`), buf);
  151 |   writeFileSync(join(OUT_DIR, `${tag}-figma.png`), PNG.sync.write(expected));
  152 |   if (res.diff) writeFileSync(join(OUT_DIR, `${tag}-diff.png`), PNG.sync.write(res.diff));
  153 |   test.info().annotations.push({ type: "G3", description: `${tag}: ${(res.ratio * 100).toFixed(3)}% (${res.diffPixels} px, ${res.size})` });
  154 |   expect(res.diffPixels, `size ${res.size}`).not.toBe(-1);
> 155 |   expect(res.ratio, `${frame} diff ratio`).toBeLessThanOrEqual(maxDiffPixelRatio);
      |                                            ^ Error: bookings-13 diff ratio
  156 | }
  157 | 
```