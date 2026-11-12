# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F09.spec.ts >> 25 · next 7 days (See all in table)
- Location: tests/visual/F09.spec.ts:67:1

# Error details

```
Error: bookings-25 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.005357329160146061
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
      - generic [ref=f1e22]:
        - generic [ref=f1e23]: English
        - button "bs.moment, Admin — account menu" [ref=f1e30] [cursor=pointer]:
          - generic [ref=f1e32]: BS
          - generic [ref=f1e33]:
            - generic [ref=f1e34]: bs.moment
            - generic [ref=f1e35]: Admin
    - generic [ref=f1e40]:
      - main [ref=f1e41]:
        - generic [ref=f1e42]:
          - heading "Bookings" [level=1] [ref=f1e43]
          - button "New booking" [ref=f1e45] [cursor=pointer]
        - generic [ref=f1e48]:
          - generic [ref=f1e49]:
            - generic [ref=f1e50]:
              - heading "Bookings this month" [level=3] [ref=f1e51]
              - button "About Bookings this month" [ref=f1e54]
            - generic [ref=f1e59]:
              - paragraph [ref=f1e60]:
                - generic [ref=f1e61]: "18"
              - generic [ref=f1e62]:
                - generic [ref=f1e63]: −2
                - generic [ref=f1e68]: vs last month
          - generic [ref=f1e69]:
            - generic [ref=f1e70]:
              - heading "Outstanding balance" [level=3] [ref=f1e71]
              - button "About Outstanding balance" [ref=f1e74]
            - generic [ref=f1e80]:
              - paragraph [ref=f1e81]:
                - generic [ref=f1e82]: Rp 48.750.000
              - generic [ref=f1e83]: 14 bookings
          - generic [ref=f1e85]:
            - generic [ref=f1e86]:
              - heading "Collected this month" [level=3] [ref=f1e87]
              - button "About Collected this month" [ref=f1e90]
            - generic [ref=f1e95]:
              - paragraph [ref=f1e96]:
                - generic [ref=f1e97]: Rp 61.200.000
              - generic [ref=f1e98]:
                - generic [ref=f1e99]: 12,4%
                - generic [ref=f1e104]: vs last month
        - generic [ref=f1e105]:
          - tablist "View" [ref=f1e106]:
            - tab "Calendar" [ref=f1e107] [cursor=pointer]
            - tab "Table" [selected] [ref=f1e109] [cursor=pointer]
          - generic [ref=f1e111]:
            - searchbox "Search bookings" [ref=f1e115]
            - 'button "Booking date: Next 7 days" [ref=f1e119] [cursor=pointer]':
              - generic [ref=f1e120]: Next 7 days
            - 'button "Status: All status" [ref=f1e126] [cursor=pointer]':
              - generic [ref=f1e127]: All status
            - 'button "Crew: All crew" [ref=f1e133] [cursor=pointer]':
              - generic [ref=f1e134]: All crew
            - 'button "Package: All packages" [ref=f1e140] [cursor=pointer]':
              - generic [ref=f1e141]: All packages
        - generic [ref=f1e144]:
          - generic [ref=f1e145]:
            - generic [ref=f1e146]: 1 filter ·
            - list "Active filters" [ref=f1e147]:
              - listitem "Next 7 days" [ref=f1e148]:
                - button "Remove filter Next 7 days" [ref=f1e150] [cursor=pointer]
            - button "Reset all" [ref=f1e154] [cursor=pointer]
          - generic [ref=f1e156]: Showing 7 of 40 bookings
        - region "Bookings table" [ref=f1e157]:
          - table "Bookings" [ref=f1e158]:
            - row "Booking Client Package Booking date Total Paid Remaining Status Open" [ref=f1e159]:
              - columnheader "Booking" [ref=f1e160]
              - columnheader "Client" [ref=f1e163]
              - columnheader "Package" [ref=f1e166]
              - columnheader "Booking date" [ref=f1e169]:
                - button "Booking date" [ref=f1e170] [cursor=pointer]
              - columnheader "Total" [ref=f1e175]:
                - button "Total" [ref=f1e176] [cursor=pointer]
              - columnheader "Paid" [ref=f1e181]
              - columnheader "Remaining" [ref=f1e184]:
                - button "Remaining" [ref=f1e185] [cursor=pointer]
              - columnheader "Status" [ref=f1e190]:
                - button "Status" [ref=f1e191] [cursor=pointer]
              - columnheader "Open"
            - row [ref=f1e197]:
              - cell "Graduation · Aulia BK-2026-0139" [ref=f1e198]:
                - button "Graduation · Aulia" [ref=f1e199] [cursor=pointer]
                - generic [ref=f1e200]: BK-2026-0139
              - cell "Aulia Rahma +62 812-7788-1020" [ref=f1e201]:
                - generic [ref=f1e202]: Aulia Rahma
                - generic [ref=f1e203]: +62 812-7788-1020
              - cell "Silver Package" [ref=f1e204]
              - cell "10 Nov 2026" [ref=f1e206]
              - cell "Rp 3.500.000" [ref=f1e207]
              - cell "Rp 1.750.000" [ref=f1e208]
              - cell "Rp 1.750.000" [ref=f1e209]
              - cell "Partially paid" [ref=f1e210]
              - cell [aria-hidden] [ref=f1e215]
            - row [ref=f1e218]:
              - cell "Family Session · Hartono BK-2026-0144" [ref=f1e219]:
                - button "Family Session · Hartono" [ref=f1e220] [cursor=pointer]
                - generic [ref=f1e221]: BK-2026-0144
              - cell "Budi Hartono +62 816-555-0192" [ref=f1e222]:
                - generic [ref=f1e223]: Budi Hartono
                - generic [ref=f1e224]: +62 816-555-0192
              - cell "Basic Package" [ref=f1e225]
              - cell "10 Nov 2026" [ref=f1e227]
              - cell "Rp 2.000.000" [ref=f1e228]
              - cell "Rp 0" [ref=f1e229]
              - cell "Rp 2.000.000" [ref=f1e230]
              - cell "Draft" [ref=f1e231]
              - cell [aria-hidden] [ref=f1e236]
            - row [ref=f1e239]:
              - cell "Wedding · Sari & Dimas BK-2026-0142" [ref=f1e240]:
                - button "Wedding · Sari & Dimas" [ref=f1e241] [cursor=pointer]
                - generic [ref=f1e242]: BK-2026-0142
              - cell "Sari Wulandari +62 812-3456-7890" [ref=f1e243]:
                - generic [ref=f1e244]: Sari Wulandari
                - generic [ref=f1e245]: +62 812-3456-7890
              - cell "Gold Package" [ref=f1e246]
              - cell "12 Nov 2026" [ref=f1e248]
              - cell "Rp 12.500.000" [ref=f1e249]
              - cell "Rp 5.000.000" [ref=f1e250]
              - cell "Rp 7.500.000" [ref=f1e251]
              - cell "Partially paid" [ref=f1e252]
              - cell [aria-hidden] [ref=f1e257]
            - row [ref=f1e260]:
              - cell "Prewedding · Nadia & Fajar BK-2026-0147" [ref=f1e261]:
                - button "Prewedding · Nadia & Fajar" [ref=f1e262] [cursor=pointer]
                - generic [ref=f1e263]: BK-2026-0147
              - cell "Nadia Safitri +62 811-9087-3321" [ref=f1e264]:
                - generic [ref=f1e265]: Nadia Safitri
                - generic [ref=f1e266]: +62 811-9087-3321
              - cell "Silver Package" [ref=f1e267]
              - cell "14 Nov 2026" [ref=f1e269]
              - cell "Rp 4.500.000" [ref=f1e270]
              - cell "Rp 1.350.000" [ref=f1e271]
              - cell "Rp 3.150.000" [ref=f1e272]
              - cell "Partially paid" [ref=f1e273]
              - cell [aria-hidden] [ref=f1e278]
            - row [ref=f1e281]:
              - cell "Company Profile · BPR Jaya BK-2026-0149" [ref=f1e282]:
                - button "Company Profile · BPR Jaya" [ref=f1e283] [cursor=pointer]
                - generic [ref=f1e284]: BK-2026-0149
              - cell "Andi Pratama +62 21-5550-1234" [ref=f1e285]:
                - generic [ref=f1e286]: Andi Pratama
                - generic [ref=f1e287]: +62 21-5550-1234
              - cell "Corporate Package" [ref=f1e288]
              - cell "14 Nov 2026" [ref=f1e290]
              - cell "Rp 9.000.000" [ref=f1e291]
              - cell "Rp 0" [ref=f1e292]
              - cell "Rp 9.000.000" [ref=f1e293]
              - cell "Draft" [ref=f1e294]
              - cell [aria-hidden] [ref=f1e299]
            - row [ref=f1e302]:
              - cell "Maternity · Dewi BK-2026-0148" [ref=f1e303]:
                - button "Maternity · Dewi" [ref=f1e304] [cursor=pointer]
                - generic [ref=f1e305]: BK-2026-0148
              - cell "Dewi Anggraini +62 819-2234-8890" [ref=f1e306]:
                - generic [ref=f1e307]: Dewi Anggraini
                - generic [ref=f1e308]: +62 819-2234-8890
              - cell "Basic Package" [ref=f1e309]
              - cell "14 Nov 2026" [ref=f1e311]
              - cell "Rp 2.250.000" [ref=f1e312]
              - cell "Rp 2.250.000" [ref=f1e313]
              - cell "Rp 0" [ref=f1e314]
              - cell "Paid" [ref=f1e315]
              - cell [aria-hidden] [ref=f1e320]
            - row [ref=f1e323]:
              - cell "Family Portrait · Wijaya BK-2026-0153" [ref=f1e324]:
                - button "Family Portrait · Wijaya" [ref=f1e325] [cursor=pointer]
                - generic [ref=f1e326]: BK-2026-0153
              - cell "Hendra Wijaya +62 812-9900-4411" [ref=f1e327]:
                - generic [ref=f1e328]: Hendra Wijaya
                - generic [ref=f1e329]: +62 812-9900-4411
              - cell "Basic Package" [ref=f1e330]
              - cell "14 Nov 2026" [ref=f1e332]
              - cell "Rp 2.000.000" [ref=f1e333]
              - cell "Rp 0" [ref=f1e334]
              - cell "Rp 2.000.000" [ref=f1e335]
              - cell "Draft" [ref=f1e336]
              - cell [aria-hidden] [ref=f1e341]
          - generic [ref=f1e344]:
            - paragraph [ref=f1e345]: Showing 1–7 of 7 bookings
            - navigation "Pagination" [ref=f1e346]:
              - button "Previous" [disabled] [ref=f1e347]
              - button "Page 1" [ref=f1e350] [cursor=pointer]:
                - generic [ref=f1e351]: "1"
              - button "Next" [disabled] [ref=f1e352]
      - complementary "Upcoming and insights" [ref=f1e354]:
        - generic [ref=f1e355]:
          - heading "Upcoming" [level=2] [ref=f1e358]
          - generic [ref=f1e360]: Next 7 days
        - list [ref=f1e361]:
          - listitem [ref=f1e362]:
            - button "TODAY 10 Graduation · Aulia Silver Package · 2 items Partially paid Rp 1.750.000 due" [ref=f1e363] [cursor=pointer]:
              - generic [ref=f1e364]:
                - generic [ref=f1e365]: TODAY
                - generic [ref=f1e366]: "10"
              - generic [ref=f1e367]:
                - generic [ref=f1e368]: Graduation · Aulia
                - generic [ref=f1e369]: Silver Package · 2 items
                - generic [ref=f1e371]:
                  - generic [ref=f1e372]: Partially paid
                  - generic [ref=f1e376]: Rp 1.750.000 due
          - listitem [ref=f1e377]:
            - button "TODAY 10 Family Session · Hartono Basic Package Draft Rp 2.000.000 due" [ref=f1e378] [cursor=pointer]:
              - generic [ref=f1e379]:
                - generic [ref=f1e380]: TODAY
                - generic [ref=f1e381]: "10"
              - generic [ref=f1e382]:
                - generic [ref=f1e383]: Family Session · Hartono
                - generic [ref=f1e384]: Basic Package
                - generic [ref=f1e386]:
                  - generic [ref=f1e387]: Draft
                  - generic [ref=f1e391]: Rp 2.000.000 due
          - listitem [ref=f1e392]:
            - button "THU 12 Wedding · Sari & Dimas Gold Package · 3 items Partially paid Rp 7.500.000 due" [ref=f1e393] [cursor=pointer]:
              - generic [ref=f1e394]:
                - generic [ref=f1e395]: THU
                - generic [ref=f1e396]: "12"
              - generic [ref=f1e397]:
                - generic [ref=f1e398]: Wedding · Sari & Dimas
                - generic [ref=f1e399]: Gold Package · 3 items
                - generic [ref=f1e401]:
                  - generic [ref=f1e402]: Partially paid
                  - generic [ref=f1e406]: Rp 7.500.000 due
          - listitem [ref=f1e407]:
            - button "SAT 14 Prewedding · Nadia & Fajar Silver Package · 2 items Partially paid Rp 3.150.000 due" [ref=f1e408] [cursor=pointer]:
              - generic [ref=f1e409]:
                - generic [ref=f1e410]: SAT
                - generic [ref=f1e411]: "14"
              - generic [ref=f1e412]:
                - generic [ref=f1e413]: Prewedding · Nadia & Fajar
                - generic [ref=f1e414]: Silver Package · 2 items
                - generic [ref=f1e416]:
                  - generic [ref=f1e417]: Partially paid
                  - generic [ref=f1e421]: Rp 3.150.000 due
        - button "See all in table" [ref=f1e422] [cursor=pointer]
        - heading "Needs attention" [level=2] [ref=f1e424]
        - article [ref=f1e425]:
          - generic [ref=f1e426]:
            - heading "Balance due today" [level=3] [ref=f1e429]
            - generic [ref=f1e430]: 2h ago
          - paragraph [ref=f1e431]: Graduation · Aulia is today and still has Rp 1.750.000 outstanding.
          - button "View booking" [ref=f1e433] [cursor=pointer]
        - article [ref=f1e435]:
          - generic [ref=f1e436]:
            - heading "Balance before event" [level=3] [ref=f1e439]
            - generic [ref=f1e440]: today
          - paragraph [ref=f1e441]: 3 bookings this week are still on DP — Rp 12.400.000 outstanding.
          - button "View bookings" [ref=f1e443] [cursor=pointer]
  - alert [ref=f1e445]
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
      |                                            ^ Error: bookings-25 diff ratio
  156 | }
  157 | 
```