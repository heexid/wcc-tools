# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F11.spec.ts >> 05c · invoice created
- Location: tests/visual/F11.spec.ts:72:3

# Error details

```
Error: bookings-05c diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.008008806760333944
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - navigation "Breadcrumb" [ref=f1e4]:
        - button "Menu" [ref=f1e6] [cursor=pointer]
        - link "Booking" [ref=f1e19] [cursor=pointer]:
          - /url: /bookings
        - generic [ref=f1e22]: BK-2026-0142
      - generic [ref=f1e26]:
        - status [ref=f1e27]:
          - generic [ref=f1e32]: Saved just now
        - generic [ref=f1e34]:
          - button "Cancel" [ref=f1e35] [cursor=pointer]
          - button "Save changes" [ref=f1e37] [cursor=pointer]
    - generic [ref=f1e41]:
      - generic [ref=f1e43]:
        - button "Back to bookings" [ref=f1e44] [cursor=pointer]
        - heading "Wedding · Sari & Dimas" [level=1] [ref=f1e47]
        - generic [ref=f1e49]: Paid
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
                - button "Package" [ref=f1e96] [cursor=pointer]:
                  - generic [ref=f1e97]: Gold Package
              - generic [ref=f1e100]:
                - generic [ref=f1e101]:
                  - generic [ref=f1e102]: Gold Package
                  - generic [ref=f1e104]: 8-hour coverage · 2 crew · 1 premium album
                - generic [ref=f1e105]: Rp 10.000.000
              - group "Payment instruction" [ref=f1e106]:
                - generic [ref=f1e109]:
                  - generic [ref=f1e114]:
                    - generic [ref=f1e115]: Bank BCA
                    - generic [ref=f1e116]: 1234567890 · a.n. bs.moment Studio
                  - button "Edit payment instruction (Bank BCA)" [ref=f1e117] [cursor=pointer]:
                    - generic [ref=f1e121]: Edit
            - separator [ref=f1e122]
            - region "Additional items" [ref=f1e123]:
              - generic [ref=f1e124]:
                - heading "Additional items" [level=2] [ref=f1e125]
                - generic [ref=f1e127]: 3 items
              - table "Additional items" [ref=f1e129]:
                - row "Item Price Qty Subtotal Remove" [ref=f1e130]:
                  - columnheader "Item" [ref=f1e131]
                  - columnheader "Price" [ref=f1e132]
                  - columnheader "Qty" [ref=f1e133]
                  - columnheader "Subtotal" [ref=f1e134]
                  - columnheader "Remove"
                - row [ref=f1e136]:
                  - cell [ref=f1e137]:
                    - textbox "Item 1 name" [ref=f1e139]:
                      - /placeholder: Item name
                      - text: Extra hour
                  - cell "Rp 500.000" [ref=f1e140]:
                    - generic [ref=f1e141]:
                      - generic [ref=f1e142]: Rp
                      - textbox "Item 1 price" [ref=f1e143]:
                        - /placeholder: "0"
                        - text: "500.000"
                  - cell [ref=f1e144]:
                    - textbox "Item 1 quantity" [ref=f1e146]: "2"
                  - cell "Rp 1.000.000" [ref=f1e147]
                  - cell [ref=f1e149]:
                    - button "Remove item 1" [ref=f1e150] [cursor=pointer]
                - row [ref=f1e154]:
                  - cell [ref=f1e155]:
                    - textbox "Item 2 name" [ref=f1e157]:
                      - /placeholder: Item name
                      - text: Printed album 20×30
                  - cell "Rp 750.000" [ref=f1e158]:
                    - generic [ref=f1e159]:
                      - generic [ref=f1e160]: Rp
                      - textbox "Item 2 price" [ref=f1e161]:
                        - /placeholder: "0"
                        - text: "750.000"
                  - cell [ref=f1e162]:
                    - textbox "Item 2 quantity" [ref=f1e164]: "1"
                  - cell "Rp 750.000" [ref=f1e165]
                  - cell [ref=f1e167]:
                    - button "Remove item 2" [ref=f1e168] [cursor=pointer]
                - row [ref=f1e172]:
                  - cell [ref=f1e173]:
                    - textbox "Item 3 name" [ref=f1e175]:
                      - /placeholder: Item name
                      - text: Guest photobooth
                  - cell "Rp 750.000" [ref=f1e176]:
                    - generic [ref=f1e177]:
                      - generic [ref=f1e178]: Rp
                      - textbox "Item 3 price" [ref=f1e179]:
                        - /placeholder: "0"
                        - text: "750.000"
                  - cell [ref=f1e180]:
                    - textbox "Item 3 quantity" [ref=f1e182]: "1"
                  - cell "Rp 750.000" [ref=f1e183]
                  - cell [ref=f1e185]:
                    - button "Remove item 3" [ref=f1e186] [cursor=pointer]
                - button "Add item" [ref=f1e191] [cursor=pointer]
            - separator [ref=f1e194]
            - region "Schedule" [ref=f1e195]:
              - heading "Schedule" [level=2] [ref=f1e197]
              - generic [ref=f1e199]:
                - generic [ref=f1e200]:
                  - generic [ref=f1e201]:
                    - generic [ref=f1e202]: Booking date
                    - generic [aria-hidden] [ref=f1e203]: "*"
                  - button "Booking date" [ref=f1e206] [cursor=pointer]:
                    - generic [ref=f1e209]: 12 Nov 2026
                - generic [ref=f1e210]:
                  - generic [ref=f1e211]: Created
                  - textbox "Created" [disabled] [ref=f1e214]: 10 Nov 2026, 09:00
                  - paragraph [ref=f1e215]: Set automatically
            - separator [ref=f1e216]
            - region "Crew" [ref=f1e217]:
              - generic [ref=f1e218]:
                - heading "Crew" [level=2] [ref=f1e219]
                - generic [ref=f1e221]: Handling this booking
              - generic [ref=f1e223]:
                - generic [ref=f1e224]: Assigned crew
                - generic [ref=f1e227]:
                  - generic:
                    - generic:
                      - generic [aria-hidden]:
                        - generic: RP
                      - generic: Raka Pratama
                      - button "Remove Raka Pratama" [ref=f1e228] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: DA
                      - generic: Dinda Ayu
                      - button "Remove Dinda Ayu" [ref=f1e232] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: NP
                      - generic: Nadia Putri
                      - button "Remove Nadia Putri" [ref=f1e236] [cursor=pointer]
                  - 'button "Assigned crew: Raka Pratama, Dinda Ayu, Nadia Putri. Change crew" [ref=f1e240] [cursor=pointer]'
                - paragraph [ref=f1e243]: 3 crew assigned
            - separator [ref=f1e244]
            - region "Others" [ref=f1e245]:
              - heading "Others" [level=2] [ref=f1e247]
              - generic [ref=f1e249]:
                - generic [ref=f1e250]: Terms & Conditions
                - textbox "Terms & Conditions" [ref=f1e253]: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
                - generic [ref=f1e254]:
                  - paragraph [ref=f1e255]: Printed on every invoice for this booking
                  - paragraph [ref=f1e256]: 174/255
        - complementary "Summary and invoices" [ref=f1e257]:
          - region "Booking summary" [ref=f1e258]:
            - generic [ref=f1e259]:
              - heading "Booking summary" [level=2] [ref=f1e260]
              - generic [ref=f1e262]: Updates live
            - generic [ref=f1e263]:
              - generic [ref=f1e264]: Gold Package
              - generic [ref=f1e265]: Rp 10.000.000
            - generic [ref=f1e266]:
              - generic [ref=f1e267]: Additional items (3)
              - generic [ref=f1e268]: Rp 2.500.000
            - separator [ref=f1e269]
            - generic [ref=f1e270]:
              - generic [ref=f1e271]: Subtotal
              - generic [ref=f1e272]: Rp 12.500.000
            - generic [ref=f1e273]:
              - generic [ref=f1e274]:
                - generic [ref=f1e275]: Total booking
                - generic [ref=f1e276]: Rp 12.500.000
              - generic [ref=f1e277]: Booking date 12 Nov 2026 · shows on calendar after save
          - region "Invoices" [ref=f1e278]:
            - generic [ref=f1e279]:
              - heading "Invoices (1)" [level=2] [ref=f1e280]
              - generic [ref=f1e282]: Paid
            - article "Invoice INV-2026-0187" [ref=f1e286]:
              - generic [ref=f1e287]:
                - generic [ref=f1e292]:
                  - generic [ref=f1e293]: INV-2026-0187
                  - generic [ref=f1e294]: Issued 10 Nov 2026, 09:00
                - generic [ref=f1e295]: Rp 12.500.000
              - generic [ref=f1e296]:
                - paragraph [ref=f1e297]: "Paid after this invoice: Rp 12.500.000 of Rp 12.500.000"
                - button "Download PDF (INV-2026-0187)" [ref=f1e298] [cursor=pointer]:
                  - generic [ref=f1e302]: Download PDF
  - alert [ref=f1e303]
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
      |                                            ^ Error: bookings-05c diff ratio
  156 | }
  157 | 
```