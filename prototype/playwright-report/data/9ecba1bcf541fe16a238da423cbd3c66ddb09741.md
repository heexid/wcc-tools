# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F10.spec.ts >> 14 · booking date picker
- Location: tests/visual/F10.spec.ts:53:1

# Error details

```
Error: bookings-14 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.010835793796239734
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
                  - generic [ref=f1e204]:
                    - button "Booking date" [expanded] [active] [ref=f1e206] [cursor=pointer]:
                      - generic [ref=f1e209]: 12 Nov 2026
                    - dialog "Choose booking date" [ref=f1e210]:
                      - generic [ref=f1e211]:
                        - button "Previous month" [ref=f1e212] [cursor=pointer]
                        - generic [ref=f1e215]: November 2026
                        - button "Next month" [ref=f1e217] [cursor=pointer]
                      - grid "November 2026" [ref=f1e220]:
                        - row [ref=f1e221]:
                          - columnheader "Mo" [ref=f1e222]
                          - columnheader "Tu" [ref=f1e224]
                          - columnheader "We" [ref=f1e226]
                          - columnheader "Th" [ref=f1e228]
                          - columnheader "Fr" [ref=f1e230]
                          - columnheader "Sa" [ref=f1e232]
                          - columnheader "Su" [ref=f1e234]
                        - row [ref=f1e236]:
                          - gridcell "26 Oct 2026" [ref=f1e237] [cursor=pointer]:
                            - generic [ref=f1e238]: "26"
                          - gridcell "27 Oct 2026" [ref=f1e239] [cursor=pointer]:
                            - generic [ref=f1e240]: "27"
                          - gridcell "28 Oct 2026" [ref=f1e241] [cursor=pointer]:
                            - generic [ref=f1e242]: "28"
                          - gridcell "29 Oct 2026" [ref=f1e243] [cursor=pointer]:
                            - generic [ref=f1e244]: "29"
                          - gridcell "30 Oct 2026" [ref=f1e245] [cursor=pointer]:
                            - generic [ref=f1e246]: "30"
                          - gridcell "31 Oct 2026" [ref=f1e247] [cursor=pointer]:
                            - generic [ref=f1e248]: "31"
                          - gridcell "01 Nov 2026" [ref=f1e249] [cursor=pointer]:
                            - generic [ref=f1e250]: "1"
                        - row [ref=f1e251]:
                          - gridcell "02 Nov 2026" [ref=f1e252] [cursor=pointer]:
                            - generic [ref=f1e253]: "2"
                          - gridcell "03 Nov 2026" [ref=f1e254] [cursor=pointer]:
                            - generic [ref=f1e255]: "3"
                          - gridcell "04 Nov 2026" [ref=f1e256] [cursor=pointer]:
                            - generic [ref=f1e257]: "4"
                          - gridcell "05 Nov 2026" [ref=f1e258] [cursor=pointer]:
                            - generic [ref=f1e259]: "5"
                          - gridcell "06 Nov 2026" [ref=f1e260] [cursor=pointer]:
                            - generic [ref=f1e261]: "6"
                          - gridcell "07 Nov 2026" [ref=f1e262] [cursor=pointer]:
                            - generic [ref=f1e263]: "7"
                          - gridcell "08 Nov 2026" [ref=f1e264] [cursor=pointer]:
                            - generic [ref=f1e265]: "8"
                        - row [ref=f1e266]:
                          - gridcell "09 Nov 2026" [ref=f1e267] [cursor=pointer]:
                            - generic [ref=f1e268]: "9"
                          - gridcell "10 Nov 2026" [ref=f1e269] [cursor=pointer]:
                            - generic [ref=f1e270]: "10"
                          - gridcell "11 Nov 2026" [ref=f1e271] [cursor=pointer]:
                            - generic [ref=f1e272]: "11"
                          - gridcell "12 Nov 2026" [selected] [ref=f1e273] [cursor=pointer]:
                            - generic [ref=f1e274]: "12"
                          - gridcell "13 Nov 2026" [ref=f1e275] [cursor=pointer]:
                            - generic [ref=f1e276]: "13"
                          - gridcell "14 Nov 2026" [ref=f1e277] [cursor=pointer]:
                            - generic [ref=f1e278]: "14"
                          - gridcell "15 Nov 2026" [ref=f1e279] [cursor=pointer]:
                            - generic [ref=f1e280]: "15"
                        - row [ref=f1e281]:
                          - gridcell "16 Nov 2026" [ref=f1e282] [cursor=pointer]:
                            - generic [ref=f1e283]: "16"
                          - gridcell "17 Nov 2026" [ref=f1e284] [cursor=pointer]:
                            - generic [ref=f1e285]: "17"
                          - gridcell "18 Nov 2026" [ref=f1e286] [cursor=pointer]:
                            - generic [ref=f1e287]: "18"
                          - gridcell "19 Nov 2026" [ref=f1e288] [cursor=pointer]:
                            - generic [ref=f1e289]: "19"
                          - gridcell "20 Nov 2026" [ref=f1e290] [cursor=pointer]:
                            - generic [ref=f1e291]: "20"
                          - gridcell "21 Nov 2026" [ref=f1e292] [cursor=pointer]:
                            - generic [ref=f1e293]: "21"
                          - gridcell "22 Nov 2026" [ref=f1e294] [cursor=pointer]:
                            - generic [ref=f1e295]: "22"
                        - row [ref=f1e296]:
                          - gridcell "23 Nov 2026" [ref=f1e297] [cursor=pointer]:
                            - generic [ref=f1e298]: "23"
                          - gridcell "24 Nov 2026" [ref=f1e299] [cursor=pointer]:
                            - generic [ref=f1e300]: "24"
                          - gridcell "25 Nov 2026" [ref=f1e301] [cursor=pointer]:
                            - generic [ref=f1e302]: "25"
                          - gridcell "26 Nov 2026" [ref=f1e303] [cursor=pointer]:
                            - generic [ref=f1e304]: "26"
                          - gridcell "27 Nov 2026" [ref=f1e305] [cursor=pointer]:
                            - generic [ref=f1e306]: "27"
                          - gridcell "28 Nov 2026" [ref=f1e307] [cursor=pointer]:
                            - generic [ref=f1e308]: "28"
                          - gridcell "29 Nov 2026" [ref=f1e309] [cursor=pointer]:
                            - generic [ref=f1e310]: "29"
                        - row [ref=f1e311]:
                          - gridcell "30 Nov 2026" [ref=f1e312] [cursor=pointer]:
                            - generic [ref=f1e313]: "30"
                          - gridcell "01 Dec 2026" [ref=f1e314] [cursor=pointer]:
                            - generic [ref=f1e315]: "1"
                          - gridcell "02 Dec 2026" [ref=f1e316] [cursor=pointer]:
                            - generic [ref=f1e317]: "2"
                          - gridcell "03 Dec 2026" [ref=f1e318] [cursor=pointer]:
                            - generic [ref=f1e319]: "3"
                          - gridcell "04 Dec 2026" [ref=f1e320] [cursor=pointer]:
                            - generic [ref=f1e321]: "4"
                          - gridcell "05 Dec 2026" [ref=f1e322] [cursor=pointer]:
                            - generic [ref=f1e323]: "5"
                          - gridcell "06 Dec 2026" [ref=f1e324] [cursor=pointer]:
                            - generic [ref=f1e325]: "6"
                      - generic [ref=f1e326]:
                        - button "Today" [ref=f1e327] [cursor=pointer]
                        - generic [ref=f1e329]: Past dates allowed with a warning
                - generic [ref=f1e330]:
                  - generic [ref=f1e331]: Created
                  - textbox "Created" [disabled] [ref=f1e334]: 10 Nov 2026, 09:00
                  - paragraph [ref=f1e335]: Set automatically
            - separator [ref=f1e336]
            - region "Crew" [ref=f1e337]:
              - generic [ref=f1e338]:
                - heading "Crew" [level=2] [ref=f1e339]
                - generic [ref=f1e341]: Handling this booking
              - generic [ref=f1e343]:
                - generic [ref=f1e344]: Assigned crew
                - generic [ref=f1e347]:
                  - generic:
                    - generic:
                      - generic [aria-hidden]:
                        - generic: RP
                      - generic: Raka Pratama
                      - button "Remove Raka Pratama" [ref=f1e348] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: DA
                      - generic: Dinda Ayu
                      - button "Remove Dinda Ayu" [ref=f1e352] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: NP
                      - generic: Nadia Putri
                      - button "Remove Nadia Putri" [ref=f1e356] [cursor=pointer]
                  - 'button "Assigned crew: Raka Pratama, Dinda Ayu, Nadia Putri. Change crew" [ref=f1e360] [cursor=pointer]'
                - paragraph [ref=f1e363]: 3 crew assigned
            - separator [ref=f1e364]
            - region "Others" [ref=f1e365]:
              - heading "Others" [level=2] [ref=f1e367]
              - generic [ref=f1e369]:
                - generic [ref=f1e370]: Terms & Conditions
                - textbox "Terms & Conditions" [ref=f1e373]: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
                - generic [ref=f1e374]:
                  - paragraph [ref=f1e375]: Printed on every invoice for this booking
                  - paragraph [ref=f1e376]: 174/255
        - complementary "Summary and invoices" [ref=f1e377]:
          - region "Booking summary" [ref=f1e378]:
            - generic [ref=f1e379]:
              - heading "Booking summary" [level=2] [ref=f1e380]
              - generic [ref=f1e382]: Updates live
            - generic [ref=f1e383]:
              - generic [ref=f1e384]: Gold Package
              - generic [ref=f1e385]: Rp 10.000.000
            - generic [ref=f1e386]:
              - generic [ref=f1e387]: Additional items (3)
              - generic [ref=f1e388]: Rp 2.500.000
            - separator [ref=f1e389]
            - generic [ref=f1e390]:
              - generic [ref=f1e391]: Subtotal
              - generic [ref=f1e392]: Rp 12.500.000
            - generic [ref=f1e393]:
              - generic [ref=f1e394]:
                - generic [ref=f1e395]: Total booking
                - generic [ref=f1e396]: Rp 12.500.000
              - generic [ref=f1e397]: Booking date 12 Nov 2026 · shows on calendar after save
          - region "Invoices" [ref=f1e398]:
            - generic [ref=f1e399]:
              - heading "Invoices (0)" [level=2] [ref=f1e400]
              - generic [ref=f1e402]: Draft
            - generic [ref=f1e406]:
              - paragraph [ref=f1e407]:
                - generic [ref=f1e408]: No invoice yet — booking will be saved as Draft
              - paragraph [ref=f1e409]: Create the first invoice (DP or full price) here when the client pays. Each invoice is linked to this booking.
              - button "Create invoice" [ref=f1e410] [cursor=pointer]
  - alert [ref=f1e413]
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
      |                                            ^ Error: bookings-14 diff ratio
  156 | }
  157 | 
```