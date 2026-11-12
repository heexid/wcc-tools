# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F13.spec.ts >> 12 · unsaved changes guard
- Location: tests/visual/F13.spec.ts:48:1

# Error details

```
Error: bookings-12 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.07747534516765286
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - alert [ref=f1e2]
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - navigation "Breadcrumb" [ref=f1e5]:
        - button "Menu" [ref=f1e7] [cursor=pointer]
        - link "Booking" [ref=f1e20] [cursor=pointer]:
          - /url: /bookings
        - generic [ref=f1e23]: BK-2026-0142
      - generic [ref=f1e27]:
        - status [ref=f1e28]:
          - generic [ref=f1e33]: Unsaved changes
        - generic [ref=f1e35]:
          - button "Cancel" [ref=f1e36] [cursor=pointer]
          - button "Save changes" [ref=f1e38] [cursor=pointer]
    - generic [ref=f1e42]:
      - generic [ref=f1e44]:
        - button "Back to bookings" [ref=f1e45] [cursor=pointer]
        - heading "Wedding · Sari & Dimas" [level=1] [ref=f1e48]
        - generic [ref=f1e50]: Partially paid
      - generic [ref=f1e54]:
        - main [ref=f1e55]:
          - generic [ref=f1e56]:
            - region "Client" [ref=f1e57]:
              - generic [ref=f1e58]:
                - heading "Client" [level=2] [ref=f1e59]
                - generic [ref=f1e61]:
                  - generic [ref=f1e62]: "*"
                  - generic [ref=f1e63]: Required fields
              - generic [ref=f1e64]:
                - generic [ref=f1e65]:
                  - generic [ref=f1e66]:
                    - generic [ref=f1e67]: Client name
                    - generic [aria-hidden] [ref=f1e68]: "*"
                  - textbox "Client name" [ref=f1e70]: Sari Wulandari
                - generic [ref=f1e71]:
                  - generic [ref=f1e72]:
                    - generic [ref=f1e73]: Phone number
                    - generic [aria-hidden] [ref=f1e74]: "*"
                  - textbox "Phone number" [ref=f1e76]:
                    - /placeholder: +62 812-3456-7890
                    - text: +62 812-3456-7890
              - generic [ref=f1e77]:
                - generic [ref=f1e78]: Booking name
                - textbox "Booking name" [ref=f1e81]:
                  - /placeholder: Sari Wulandari · Platinum Package
                  - text: Wedding · Sari & Dimas
                - paragraph [ref=f1e82]: Optional — defaults to “Client · Package”
            - separator [ref=f1e83]
            - region "Package" [ref=f1e84]:
              - generic [ref=f1e85]:
                - heading "Package" [level=2] [ref=f1e86]
                - link "Manage library" [ref=f1e89] [cursor=pointer]:
                  - /url: /packages
              - generic [ref=f1e91]:
                - generic [ref=f1e92]:
                  - generic [ref=f1e93]: Package
                  - generic [aria-hidden] [ref=f1e94]: "*"
                - button "Package" [ref=f1e97] [cursor=pointer]:
                  - generic [ref=f1e98]: Platinum Package
              - generic [ref=f1e101]:
                - generic [ref=f1e102]:
                  - generic [ref=f1e103]: Platinum Package
                  - generic [ref=f1e105]: Full-day coverage · 3 crew · album + video highlight
                - generic [ref=f1e106]: Rp 14.000.000
              - group "Payment instruction" [ref=f1e107]:
                - generic [ref=f1e110]:
                  - generic [ref=f1e115]:
                    - generic [ref=f1e116]: Bank BCA
                    - generic [ref=f1e117]: 1234567890 · a.n. bs.moment Studio
                  - button "Edit payment instruction (Bank BCA)" [ref=f1e118] [cursor=pointer]:
                    - generic [ref=f1e122]: Edit
            - separator [ref=f1e123]
            - region "Additional items" [ref=f1e124]:
              - generic [ref=f1e125]:
                - heading "Additional items" [level=2] [ref=f1e126]
                - generic [ref=f1e128]: 4 items
              - table "Additional items" [ref=f1e130]:
                - row "Item Price Qty Subtotal Remove" [ref=f1e131]:
                  - columnheader "Item" [ref=f1e132]
                  - columnheader "Price" [ref=f1e133]
                  - columnheader "Qty" [ref=f1e134]
                  - columnheader "Subtotal" [ref=f1e135]
                  - columnheader "Remove"
                - row [ref=f1e137]:
                  - cell [ref=f1e138]:
                    - textbox "Item 1 name" [ref=f1e140]:
                      - /placeholder: Item name
                      - text: Extra hour
                  - cell "Rp 500.000" [ref=f1e141]:
                    - generic [ref=f1e142]:
                      - generic [ref=f1e143]: Rp
                      - textbox "Item 1 price" [ref=f1e144]:
                        - /placeholder: "0"
                        - text: "500.000"
                  - cell [ref=f1e145]:
                    - textbox "Item 1 quantity" [ref=f1e147]: "2"
                  - cell "Rp 1.000.000" [ref=f1e148]
                  - cell [ref=f1e150]:
                    - button "Remove item 1" [ref=f1e151] [cursor=pointer]
                - row [ref=f1e155]:
                  - cell [ref=f1e156]:
                    - textbox "Item 2 name" [ref=f1e158]:
                      - /placeholder: Item name
                      - text: Printed album 20×30
                  - cell "Rp 750.000" [ref=f1e159]:
                    - generic [ref=f1e160]:
                      - generic [ref=f1e161]: Rp
                      - textbox "Item 2 price" [ref=f1e162]:
                        - /placeholder: "0"
                        - text: "750.000"
                  - cell [ref=f1e163]:
                    - textbox "Item 2 quantity" [ref=f1e165]: "1"
                  - cell "Rp 750.000" [ref=f1e166]
                  - cell [ref=f1e168]:
                    - button "Remove item 2" [ref=f1e169] [cursor=pointer]
                - row [ref=f1e173]:
                  - cell [ref=f1e174]:
                    - textbox "Item 3 name" [ref=f1e176]:
                      - /placeholder: Item name
                      - text: Drone footage
                  - cell "Rp 1.500.000" [ref=f1e177]:
                    - generic [ref=f1e178]:
                      - generic [ref=f1e179]: Rp
                      - textbox "Item 3 price" [ref=f1e180]:
                        - /placeholder: "0"
                        - text: 1.500.000
                  - cell [ref=f1e181]:
                    - textbox "Item 3 quantity" [ref=f1e183]: "1"
                  - cell "Rp 1.500.000" [ref=f1e184]
                  - cell [ref=f1e186]:
                    - button "Remove item 3" [ref=f1e187] [cursor=pointer]
                - row [ref=f1e191]:
                  - cell [ref=f1e192]:
                    - textbox "Item 4 name" [ref=f1e194]:
                      - /placeholder: Item name
                      - text: Same-day edit video
                  - cell "Rp 1.500.000" [ref=f1e195]:
                    - generic [ref=f1e196]:
                      - generic [ref=f1e197]: Rp
                      - textbox "Item 4 price" [ref=f1e198]:
                        - /placeholder: "0"
                        - text: 1.500.000
                  - cell [ref=f1e199]:
                    - textbox "Item 4 quantity" [ref=f1e201]: "1"
                  - cell "Rp 1.500.000" [ref=f1e202]
                  - cell [ref=f1e204]:
                    - button "Remove item 4" [ref=f1e205] [cursor=pointer]
                - button "Add item" [ref=f1e210] [cursor=pointer]
            - separator [ref=f1e213]
            - region "Schedule" [ref=f1e214]:
              - heading "Schedule" [level=2] [ref=f1e216]
              - generic [ref=f1e218]:
                - generic [ref=f1e219]:
                  - generic [ref=f1e220]:
                    - generic [ref=f1e221]: Booking date
                    - generic [aria-hidden] [ref=f1e222]: "*"
                  - button "Booking date" [ref=f1e225] [cursor=pointer]:
                    - generic [ref=f1e228]: 21 Nov 2026
                  - paragraph [ref=f1e229]: Moved from 12 Nov 2026
                - generic [ref=f1e230]:
                  - generic [ref=f1e231]: Created
                  - textbox "Created" [disabled] [ref=f1e234]: 10 Oct 2026, 09:31
                  - paragraph [ref=f1e235]: Set automatically
            - separator [ref=f1e236]
            - region "Crew" [ref=f1e237]:
              - generic [ref=f1e238]:
                - heading "Crew" [level=2] [ref=f1e239]
                - generic [ref=f1e241]: Handling this booking
              - generic [ref=f1e243]:
                - generic [ref=f1e244]: Assigned crew
                - generic [ref=f1e247]:
                  - generic:
                    - generic:
                      - generic [aria-hidden]:
                        - generic: RP
                      - generic: Raka Pratama
                      - button "Remove Raka Pratama" [ref=f1e248] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: DA
                      - generic: Dinda Ayu
                      - button "Remove Dinda Ayu" [ref=f1e252] [cursor=pointer]
                    - generic:
                      - generic [aria-hidden]:
                        - generic: NP
                      - generic: Nadia Putri
                      - button "Remove Nadia Putri" [ref=f1e256] [cursor=pointer]
                  - 'button "Assigned crew: Raka Pratama, Dinda Ayu, Nadia Putri. Change crew" [ref=f1e260] [cursor=pointer]'
                - paragraph [ref=f1e263]: 3 crew assigned
            - separator [ref=f1e264]
            - region "Others" [ref=f1e265]:
              - heading "Others" [level=2] [ref=f1e267]
              - generic [ref=f1e269]:
                - generic [ref=f1e270]: Terms & Conditions
                - textbox "Terms & Conditions" [ref=f1e273]: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
                - generic [ref=f1e274]:
                  - paragraph [ref=f1e275]: Printed on every invoice for this booking
                  - paragraph [ref=f1e276]: 174/255
            - separator [ref=f1e277]
            - region "Cancel booking" [ref=f1e278]:
              - heading "Cancel booking" [level=2] [ref=f1e280]
              - generic [ref=f1e282]:
                - paragraph [ref=f1e283]: "Canceling makes this booking read-only: no edits and no new invoices. Existing invoices stay on record. A canceled booking can’t be reopened."
                - button "Cancel booking" [ref=f1e284] [cursor=pointer]
        - complementary "Summary and invoices" [ref=f1e290]:
          - status [ref=f1e291]:
            - generic [ref=f1e294]:
              - paragraph [ref=f1e295]: "Total updated: Rp 12.500.000 → Rp 18.750.000"
              - generic [ref=f1e296]: +Rp 6.250.000 since last invoice · package → Platinum, items updated, date moved to 21 Nov 2026. Past invoices keep their original figures.
          - region "Updated totals" [ref=f1e297]:
            - generic [ref=f1e298]:
              - heading "Updated totals" [level=2] [ref=f1e299]
              - generic [ref=f1e301]: Updates live
            - generic [ref=f1e302]:
              - generic [ref=f1e303]: Platinum Package
              - generic [ref=f1e304]: Rp 14.000.000
            - generic [ref=f1e305]:
              - generic [ref=f1e306]: Additional items (4)
              - generic [ref=f1e307]: Rp 4.750.000
            - separator [ref=f1e308]
            - generic [ref=f1e309]:
              - generic [ref=f1e310]: New total
              - generic [ref=f1e311]: Rp 18.750.000
            - generic [ref=f1e312]:
              - generic [ref=f1e313]: Paid (2 invoices)
              - generic [ref=f1e314]: Rp 5.000.000
            - generic [ref=f1e315]:
              - generic [ref=f1e316]:
                - generic [ref=f1e317]: Remaining after save
                - generic [ref=f1e318]: Rp 13.750.000
              - generic [ref=f1e319]: Existing invoices keep their original figures. Create the next invoice below.
          - region "Invoices" [ref=f1e320]:
            - generic [ref=f1e321]:
              - heading "Invoices (2)" [level=2] [ref=f1e322]
              - generic [ref=f1e324]: Partially paid
            - article "Invoice INV-2026-0201" [ref=f1e328]:
              - generic [ref=f1e329]:
                - generic [ref=f1e334]:
                  - generic [ref=f1e335]: INV-2026-0201
                  - generic [ref=f1e336]: Issued 01 Nov 2026, 10:15
                - generic [ref=f1e337]: Rp 2.000.000
              - generic [ref=f1e338]:
                - paragraph [ref=f1e339]: "Paid after this invoice: Rp 5.000.000 of Rp 12.500.000"
                - button "Download PDF (INV-2026-0201)" [ref=f1e340] [cursor=pointer]:
                  - generic [ref=f1e344]: Download PDF
            - article "Invoice INV-2026-0187" [ref=f1e345]:
              - generic [ref=f1e346]:
                - generic [ref=f1e351]:
                  - generic [ref=f1e352]: INV-2026-0187
                  - generic [ref=f1e353]: Issued 10 Oct 2026, 09:48
                - generic [ref=f1e354]: Rp 3.000.000
              - generic [ref=f1e355]:
                - paragraph [ref=f1e356]: "Paid after this invoice: Rp 3.000.000 of Rp 12.500.000"
                - button "Download PDF (INV-2026-0187)" [ref=f1e357] [cursor=pointer]:
                  - generic [ref=f1e361]: Download PDF
            - button "Create invoice" [ref=f1e362] [cursor=pointer]
  - alertdialog "Discard unsaved changes?" [ref=f1e367]:
    - generic [ref=f1e372]:
      - heading "Discard unsaved changes?" [level=2] [ref=f1e373]
      - paragraph [ref=f1e374]: You changed the package, items and booking date. If you leave now, these changes won’t be saved. Existing invoices are not affected.
    - contentinfo [ref=f1e375]:
      - button "Keep editing" [active] [ref=f1e376] [cursor=pointer]
      - button "Discard changes" [ref=f1e378] [cursor=pointer]
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
      |                                            ^ Error: bookings-12 diff ratio
  156 | }
  157 | 
```