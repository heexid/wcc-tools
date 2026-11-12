# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F16.spec.ts >> AC3 · change name modal
- Location: tests/visual/F16.spec.ts:39:1

# Error details

```
Error: profile-ac3 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.11665380658436214
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - navigation "Breadcrumb" [ref=f1e4]:
        - button "Menu" [ref=f1e6] [cursor=pointer]
        - generic [ref=f1e19]: Account settings
      - generic [ref=f1e21]:
        - generic [ref=f1e22]: English
        - button "bs.moment, Admin — account menu" [ref=f1e29] [cursor=pointer]:
          - generic [ref=f1e31]: BS
          - generic [ref=f1e32]:
            - generic [ref=f1e33]: bs.moment
            - generic [ref=f1e34]: Admin
    - main [ref=f1e40]:
      - generic [ref=f1e41]:
        - heading "Account settings" [level=1] [ref=f1e42]
        - generic [ref=f1e44]: Your profile and sign-in details for bs internal tools.
      - region "Profile" [ref=f1e45]:
        - generic [ref=f1e46]:
          - heading "Profile" [level=2] [ref=f1e47]
          - generic [ref=f1e49]: How you appear to your team.
        - generic [ref=f1e50]:
          - generic [ref=f1e52]: BS
          - generic [ref=f1e53]:
            - generic [ref=f1e54]: bs.moment
            - generic [ref=f1e55]: Admin · bs.moment workspace
        - generic [ref=f1e56]:
          - generic [ref=f1e57]: Name
          - generic [ref=f1e58]:
            - generic [ref=f1e59]: bs.moment
            - generic [ref=f1e60]: Shown in the header and as “Created by” on bookings.
          - button "Edit name" [ref=f1e61] [cursor=pointer]
        - generic [ref=f1e66]:
          - generic [ref=f1e67]: Email
          - generic [ref=f1e68]:
            - generic [ref=f1e69]: bs-moment@email.com
            - generic [ref=f1e70]: Used to log in. Ask your workspace admin to change it.
          - img "Locked" [ref=f1e71]
        - generic [ref=f1e74]:
          - generic [ref=f1e75]: Role
          - generic [ref=f1e76]:
            - generic [ref=f1e77]: Admin
            - generic [ref=f1e79]: Full access to Booking and Package Library. Set by your workspace admin.
          - img "Locked" [ref=f1e80]
      - region "Security" [ref=f1e83]:
        - generic [ref=f1e84]:
          - heading "Security" [level=2] [ref=f1e85]
          - generic [ref=f1e87]: Keep your account safe.
        - generic [ref=f1e88]:
          - generic [ref=f1e89]: Password
          - generic [ref=f1e90]:
            - generic [ref=f1e91]: ••••••••••
            - generic [ref=f1e92]: Last changed 12 Sep 2026
          - button "Change password" [ref=f1e93] [cursor=pointer]
  - alert [ref=f1e98]
  - dialog "Change name" [ref=f1e101]:
    - generic [ref=f1e102]:
      - banner [ref=f1e103]:
        - button "Close" [ref=f1e104] [cursor=pointer]
        - heading "Change name" [level=2] [ref=f1e109]
      - generic [ref=f1e110]:
        - generic [ref=f1e112]:
          - generic [ref=f1e113]:
            - generic [ref=f1e114]: Name
            - generic [aria-hidden] [ref=f1e115]: "*"
          - textbox "Name" [ref=f1e117]: Bima Santoso
          - paragraph [ref=f1e118]: 2–50 characters. Shown in the header and as “Created by” on bookings.
        - contentinfo [ref=f1e119]:
          - button "Cancel" [ref=f1e120] [cursor=pointer]
          - button "Save name" [ref=f1e122] [cursor=pointer]
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
      |                                            ^ Error: profile-ac3 diff ratio
  156 | }
  157 | 
```