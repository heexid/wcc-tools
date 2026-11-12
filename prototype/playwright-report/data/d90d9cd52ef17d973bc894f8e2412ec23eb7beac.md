# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F05.spec.ts >> 06 · save failed
- Location: tests/visual/F05.spec.ts:62:1

# Error details

```
Error: pkg-06 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.050349243306169966
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - navigation "Breadcrumb" [ref=f1e4]:
        - button "Menu" [ref=f1e6] [cursor=pointer]
        - link "Packages" [ref=f1e19] [cursor=pointer]:
          - /url: /packages
      - generic [ref=f1e22]:
        - generic [ref=f1e23]: English
        - button "bs.moment, Admin — account menu" [ref=f1e30] [cursor=pointer]:
          - generic [ref=f1e32]: BS
          - generic [ref=f1e33]:
            - generic [ref=f1e34]: bs.moment
            - generic [ref=f1e35]: Admin
    - main [ref=f1e40]:
      - generic [ref=f1e41]:
        - generic [ref=f1e42]:
          - heading "Package library" [level=1] [ref=f1e43]
          - paragraph [ref=f1e45]: Packages used when creating bookings. Price changes never alter existing bookings.
        - button "New package" [ref=f1e46] [cursor=pointer]
      - generic [ref=f1e49]:
        - tablist "Package status" [ref=f1e50]:
          - tab "Active (6)" [selected] [ref=f1e51] [cursor=pointer]
          - tab "Archived (2)" [ref=f1e53] [cursor=pointer]
        - searchbox "Search package" [ref=f1e58]
      - region "Active packages" [ref=f1e59]:
        - row "Package Price Bookings Last updated Status Actions" [ref=f1e60]:
          - columnheader "Package" [ref=f1e61]
          - columnheader "Price" [ref=f1e62]
          - columnheader "Bookings" [ref=f1e63]
          - columnheader "Last updated" [ref=f1e64]
          - columnheader "Status" [ref=f1e65]
          - columnheader "Actions"
        - row [ref=f1e67]:
          - cell "Basic Package 2-hour session · 1 crew · 25 edited photos" [ref=f1e68]:
            - generic [ref=f1e69]: Basic Package
            - generic [ref=f1e70]: 2-hour session · 1 crew · 25 edited photos
          - cell "Rp 2.000.000" [ref=f1e71]
          - cell "18 bookings" [ref=f1e73]
          - cell "02 Oct 2026" [ref=f1e74]
          - cell "Active" [ref=f1e75]
          - cell [ref=f1e79]:
            - button "Edit Basic Package" [ref=f1e80] [cursor=pointer]:
              - generic [ref=f1e81]: Edit
            - button "Archive Basic Package" [ref=f1e82] [cursor=pointer]
        - row [ref=f1e86]:
          - cell "Silver Package 4-hour coverage · 1 crew · 60 edited photos" [ref=f1e87]:
            - generic [ref=f1e88]: Silver Package
            - generic [ref=f1e89]: 4-hour coverage · 1 crew · 60 edited photos
          - cell "Rp 3.000.000" [ref=f1e90]
          - cell "11 bookings" [ref=f1e92]
          - cell "02 Oct 2026" [ref=f1e93]
          - cell "Active" [ref=f1e94]
          - cell [ref=f1e98]:
            - button "Edit Silver Package" [ref=f1e99] [cursor=pointer]:
              - generic [ref=f1e100]: Edit
            - button "Archive Silver Package" [ref=f1e101] [cursor=pointer]
        - row [ref=f1e105]:
          - cell "Gold Package 8-hour coverage · 2 crew · 1 premium album" [ref=f1e106]:
            - generic [ref=f1e107]: Gold Package
            - generic [ref=f1e108]: 8-hour coverage · 2 crew · 1 premium album
          - cell "Rp 10.000.000" [ref=f1e109]
          - cell "23 bookings" [ref=f1e111]
          - cell "15 Oct 2026" [ref=f1e112]
          - cell "Active" [ref=f1e113]
          - cell [ref=f1e117]:
            - button "Edit Gold Package" [ref=f1e118] [cursor=pointer]:
              - generic [ref=f1e119]: Edit
            - button "Archive Gold Package" [ref=f1e120] [cursor=pointer]
        - row [ref=f1e124]:
          - cell "Platinum Package Full-day coverage · 3 crew · album + video highlight" [ref=f1e125]:
            - generic [ref=f1e126]: Platinum Package
            - generic [ref=f1e127]: Full-day coverage · 3 crew · album + video highlight
          - cell "Rp 14.000.000" [ref=f1e128]
          - cell "9 bookings" [ref=f1e130]
          - cell "15 Oct 2026" [ref=f1e131]
          - cell "Active" [ref=f1e132]
          - cell [ref=f1e136]:
            - button "Edit Platinum Package" [ref=f1e137] [cursor=pointer]:
              - generic [ref=f1e138]: Edit
            - button "Archive Platinum Package" [ref=f1e139] [cursor=pointer]
        - row [ref=f1e143]:
          - cell "Corporate Package Half-day event · 2 crew · same-day delivery" [ref=f1e144]:
            - generic [ref=f1e145]: Corporate Package
            - generic [ref=f1e146]: Half-day event · 2 crew · same-day delivery
          - cell "Rp 9.000.000" [ref=f1e147]
          - cell "6 bookings" [ref=f1e149]
          - cell "28 Sep 2026" [ref=f1e150]
          - cell "Active" [ref=f1e151]
          - cell [ref=f1e155]:
            - button "Edit Corporate Package" [ref=f1e156] [cursor=pointer]:
              - generic [ref=f1e157]: Edit
            - button "Archive Corporate Package" [ref=f1e158] [cursor=pointer]
        - row [ref=f1e162]:
          - cell "Event Package Seminar / launch · 2 crew · 100 edited photos" [ref=f1e163]:
            - generic [ref=f1e164]: Event Package
            - generic [ref=f1e165]: Seminar / launch · 2 crew · 100 edited photos
          - cell "Rp 6.000.000" [ref=f1e166]
          - cell "4 bookings" [ref=f1e168]
          - cell "01 Nov 2026" [ref=f1e169]
          - cell "Active" [ref=f1e170]
          - cell [ref=f1e174]:
            - button "Edit Event Package" [ref=f1e175] [cursor=pointer]:
              - generic [ref=f1e176]: Edit
            - button "Archive Event Package" [ref=f1e177] [cursor=pointer]
        - generic [ref=f1e181]:
          - paragraph [ref=f1e182]: Showing 6 active packages
          - navigation "Pagination" [ref=f1e183]:
            - button "Previous" [disabled] [ref=f1e184]
            - button "Page 1" [ref=f1e187] [cursor=pointer]:
              - generic [ref=f1e188]: "1"
            - button "Next" [disabled] [ref=f1e189]
  - alert [ref=f1e191]
  - dialog "Edit package" [ref=f1e194]:
    - generic [ref=f1e195]:
      - banner [ref=f1e196]:
        - button "Close" [ref=f1e197] [cursor=pointer]
        - heading "Edit package" [level=2] [ref=f1e201]
      - generic [ref=f1e202]:
        - alert [ref=f1e203]:
          - generic [ref=f1e206]:
            - paragraph [ref=f1e207]: Couldn’t save the package
            - generic [ref=f1e208]: Check your connection and try again. Your changes are still here.
        - generic [ref=f1e209]:
          - generic [ref=f1e210]:
            - generic [ref=f1e211]: Package name
            - generic [aria-hidden] [ref=f1e212]: "*"
          - textbox "Package name" [ref=f1e214]:
            - /placeholder: e.g. Gold Package
            - text: Gold Package
        - generic [ref=f1e215]:
          - generic [ref=f1e216]:
            - generic [ref=f1e217]: Price
            - generic [aria-hidden] [ref=f1e218]: "*"
          - textbox "Price" [ref=f1e220]:
            - /placeholder: Rp 0
            - text: Rp 10.000.000
          - paragraph [ref=f1e221]: Whole Rupiah, ≥ 0. Existing bookings keep their snapshot price.
        - generic [ref=f1e222]:
          - generic [ref=f1e223]: Description
          - textbox "Description" [ref=f1e226]:
            - /placeholder: What the package includes, e.g. coverage hours, crew, deliverables
            - text: 8-hour coverage with 2 crew (lead photographer + assistant). Includes 1 premium album 20×30 (20 pages), 150 edited photos delivered within 14 days, and an online gallery for 6 months.
          - generic [ref=f1e227]:
            - paragraph [ref=f1e228]: Shown in the package picker and on the booking
            - paragraph [ref=f1e229]: 183/1000
        - status [ref=f1e230]:
          - generic [ref=f1e233]:
            - paragraph [ref=f1e234]: Used in 23 bookings
            - generic [ref=f1e235]: Changing the price only applies to new bookings or when a booking re-selects this package.
      - contentinfo [ref=f1e236]:
        - button "Archive" [ref=f1e237] [cursor=pointer]
        - button "Cancel" [ref=f1e239] [cursor=pointer]
        - button "Try again" [ref=f1e241] [cursor=pointer]
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
      |                                            ^ Error: pkg-06 diff ratio
  156 | }
  157 | 
```