# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F04.spec.ts >> profile-ac1 · Account menu open
- Location: tests/visual/F04.spec.ts:44:1

# Error details

```
Error: profile-ac1 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.013443732193732193
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
        - generic [ref=f1e29]:
          - button "bs.moment, Admin — account menu" [expanded] [ref=f1e30] [cursor=pointer]:
            - generic [ref=f1e32]: BS
            - generic [ref=f1e33]:
              - generic [ref=f1e34]: bs.moment
              - generic [ref=f1e35]: Admin
          - menu "Account" [ref=f1e39]:
            - generic [ref=f1e40]:
              - menuitem "Account Setting" [ref=f1e41] [cursor=pointer]
              - menuitem "Log out" [ref=f1e46] [cursor=pointer]
    - generic [ref=f1e52]:
      - main [ref=f1e53]:
        - generic [ref=f1e54]:
          - heading "Bookings" [level=1] [ref=f1e55]
          - button "New booking" [ref=f1e57] [cursor=pointer]
        - generic [ref=f1e60]:
          - generic [ref=f1e61]:
            - generic [ref=f1e62]:
              - heading "Bookings this month" [level=3] [ref=f1e63]
              - button "About Bookings this month" [ref=f1e66]
            - generic [ref=f1e71]:
              - paragraph [ref=f1e72]:
                - generic [ref=f1e73]: "18"
              - generic [ref=f1e74]:
                - generic [ref=f1e75]: −2
                - generic [ref=f1e80]: vs last month
          - generic [ref=f1e81]:
            - generic [ref=f1e82]:
              - heading "Outstanding balance" [level=3] [ref=f1e83]
              - button "About Outstanding balance" [ref=f1e86]
            - generic [ref=f1e92]:
              - paragraph [ref=f1e93]:
                - generic [ref=f1e94]: Rp 48.750.000
              - generic [ref=f1e95]: 14 bookings
          - generic [ref=f1e97]:
            - generic [ref=f1e98]:
              - heading "Collected this month" [level=3] [ref=f1e99]
              - button "About Collected this month" [ref=f1e102]
            - generic [ref=f1e107]:
              - paragraph [ref=f1e108]:
                - generic [ref=f1e109]: Rp 61.200.000
              - generic [ref=f1e110]:
                - generic [ref=f1e111]: 12,4%
                - generic [ref=f1e116]: vs last month
        - generic [ref=f1e117]:
          - tablist "View" [ref=f1e118]:
            - tab "Calendar" [selected] [ref=f1e119] [cursor=pointer]
            - tab "Table" [ref=f1e121] [cursor=pointer]
          - generic [ref=f1e123]:
            - searchbox "Search bookings" [ref=f1e127]
            - 'button "Status: All status" [ref=f1e131] [cursor=pointer]':
              - generic [ref=f1e132]: All status
            - 'button "Crew: All crew" [ref=f1e138] [cursor=pointer]':
              - generic [ref=f1e139]: All crew
            - 'button "Package: All packages" [ref=f1e145] [cursor=pointer]':
              - generic [ref=f1e146]: All packages
        - region "Calendar" [ref=f1e149]:
          - generic [ref=f1e150]:
            - generic [ref=f1e151]:
              - button "Previous month" [ref=f1e152] [cursor=pointer]
              - button "Next month" [ref=f1e155] [cursor=pointer]
            - heading "November 2026" [level=2] [ref=f1e158]
            - button "Today" [ref=f1e160] [cursor=pointer]
            - group "Legend" [ref=f1e162]:
              - generic [ref=f1e163]: Draft
              - generic [ref=f1e167]: Partially paid
              - generic [ref=f1e171]: Paid
            - tablist "Calendar range" [ref=f1e175]:
              - tab "Day" [ref=f1e176] [cursor=pointer]
              - tab "Week" [ref=f1e178] [cursor=pointer]
              - tab "Month" [selected] [ref=f1e180] [cursor=pointer]
          - grid "Month" [ref=f1e183]:
            - row [ref=f1e184]:
              - columnheader "Mon" [ref=f1e185]
              - columnheader "Tue" [ref=f1e187]
              - columnheader "Wed" [ref=f1e189]
              - columnheader "Thu" [ref=f1e191]
              - columnheader "Fri" [ref=f1e193]
              - columnheader "Sat" [ref=f1e195]
              - columnheader "Sun" [ref=f1e197]
            - row [ref=f1e199]:
              - gridcell "Monday, 26 Oct 2026 · 1 booking" [ref=f1e200] [cursor=pointer]:
                - generic [ref=f1e201]:
                  - generic [ref=f1e202]: "26"
                  - generic [ref=f1e205]: "1"
                - button "Aqiqah · Baby Zahra, Paid" [ref=f1e206]:
                  - generic [ref=f1e208]: Aqiqah · Baby Zahra
              - gridcell "Tuesday, 27 Oct 2026" [ref=f1e209] [cursor=pointer]:
                - generic [ref=f1e210]: "27"
                - button "New booking on Tuesday, 27 Oct 2026" [ref=f1e213]:
                  - generic [ref=f1e215]: New booking
              - gridcell "Wednesday, 28 Oct 2026 · 1 booking" [ref=f1e216] [cursor=pointer]:
                - generic [ref=f1e217]:
                  - generic [ref=f1e218]: "28"
                  - generic [ref=f1e221]: "1"
                - button "Prewedding · Tari & Galih, Partially paid" [ref=f1e222]:
                  - generic [ref=f1e224]: Prewedding · Tari & Galih
              - gridcell "Thursday, 29 Oct 2026 · 1 booking" [ref=f1e225] [cursor=pointer]:
                - generic [ref=f1e226]:
                  - generic [ref=f1e227]: "29"
                  - generic [ref=f1e230]: "1"
                - button "Corporate Gathering · PT Sinar, Paid" [ref=f1e231]:
                  - generic [ref=f1e233]: Corporate Gathering · PT Sinar
              - gridcell "Friday, 30 Oct 2026 · 1 booking" [ref=f1e234] [cursor=pointer]:
                - generic [ref=f1e235]:
                  - generic [ref=f1e236]: "30"
                  - generic [ref=f1e239]: "1"
                - button "Birthday · Raffa 10th, Paid" [ref=f1e240]:
                  - generic [ref=f1e242]: Birthday · Raffa 10th
              - gridcell "Saturday, 31 Oct 2026 · 1 booking" [ref=f1e243] [cursor=pointer]:
                - generic [ref=f1e244]:
                  - generic [ref=f1e245]: "31"
                  - generic [ref=f1e248]: "1"
                - button "Engagement · Wulan & Doni, Paid" [ref=f1e249]:
                  - generic [ref=f1e251]: Engagement · Wulan & Doni
              - gridcell "Sunday, 1 Nov 2026" [ref=f1e252] [cursor=pointer]:
                - generic [ref=f1e253]: "1"
                - button "New booking on Sunday, 1 Nov 2026" [ref=f1e256]:
                  - generic [ref=f1e258]: New booking
            - row [ref=f1e259]:
              - gridcell "Monday, 2 Nov 2026" [ref=f1e260] [cursor=pointer]:
                - generic [ref=f1e261]: "2"
                - button "New booking on Monday, 2 Nov 2026" [ref=f1e264]:
                  - generic [ref=f1e266]: New booking
              - gridcell "Tuesday, 3 Nov 2026 · 1 booking" [ref=f1e267] [cursor=pointer]:
                - generic [ref=f1e268]:
                  - generic [ref=f1e269]: "3"
                  - generic [ref=f1e272]: "1"
                - button "Corporate Gathering · PT Arta, Paid" [ref=f1e273]:
                  - generic [ref=f1e275]: Corporate Gathering · PT Arta
              - gridcell "Wednesday, 4 Nov 2026" [ref=f1e276] [cursor=pointer]:
                - generic [ref=f1e277]: "4"
                - button "New booking on Wednesday, 4 Nov 2026" [ref=f1e280]:
                  - generic [ref=f1e282]: New booking
              - gridcell "Thursday, 5 Nov 2026" [ref=f1e283] [cursor=pointer]:
                - generic [ref=f1e284]: "5"
                - button "New booking on Thursday, 5 Nov 2026" [ref=f1e287]:
                  - generic [ref=f1e289]: New booking
              - gridcell "Friday, 6 Nov 2026 · 1 booking" [ref=f1e290] [cursor=pointer]:
                - generic [ref=f1e291]:
                  - generic [ref=f1e292]: "6"
                  - generic [ref=f1e295]: "1"
                - button "Engagement · Rina & Yoga, Paid" [ref=f1e296]:
                  - generic [ref=f1e298]: Engagement · Rina & Yoga
              - gridcell "Saturday, 7 Nov 2026 · 2 bookings" [ref=f1e299] [cursor=pointer]:
                - generic [ref=f1e300]:
                  - generic [ref=f1e301]: "7"
                  - generic [ref=f1e304]: "2"
                - button "Birthday · Kenzo, Partially paid" [ref=f1e305]:
                  - generic [ref=f1e307]: Birthday · Kenzo
                - button "Product Shoot · Kopi Nusa, Paid" [ref=f1e308]:
                  - generic [ref=f1e310]: Product Shoot · Kopi Nusa
              - gridcell "Sunday, 8 Nov 2026" [ref=f1e311] [cursor=pointer]:
                - generic [ref=f1e312]: "8"
                - button "New booking on Sunday, 8 Nov 2026" [ref=f1e315]:
                  - generic [ref=f1e317]: New booking
            - row [ref=f1e318]:
              - gridcell "Monday, 9 Nov 2026" [ref=f1e319] [cursor=pointer]:
                - generic [ref=f1e320]: "9"
                - button "New booking on Monday, 9 Nov 2026" [ref=f1e323]:
                  - generic [ref=f1e325]: New booking
              - gridcell "Tuesday, 10 Nov 2026 · 2 bookings" [selected] [ref=f1e326] [cursor=pointer]:
                - generic [ref=f1e327]:
                  - generic [ref=f1e328]: "10"
                  - generic [ref=f1e331]: "2"
                - button "Graduation · Aulia, Partially paid" [ref=f1e332]:
                  - generic [ref=f1e334]: Graduation · Aulia
                - button "Family Session · Hartono, Draft" [ref=f1e335]:
                  - generic [ref=f1e337]: Family Session · Hartono
              - gridcell "Wednesday, 11 Nov 2026" [ref=f1e338] [cursor=pointer]:
                - generic [ref=f1e339]: "11"
                - button "New booking on Wednesday, 11 Nov 2026" [ref=f1e342]:
                  - generic [ref=f1e344]: New booking
              - gridcell "Thursday, 12 Nov 2026 · 1 booking" [ref=f1e345] [cursor=pointer]:
                - generic [ref=f1e346]:
                  - generic [ref=f1e347]: "12"
                  - generic [ref=f1e350]: "1"
                - button "Wedding · Sari & Dimas, Partially paid" [ref=f1e351]:
                  - generic [ref=f1e353]: Wedding · Sari & Dimas
              - gridcell "Friday, 13 Nov 2026" [ref=f1e354] [cursor=pointer]:
                - generic [ref=f1e355]: "13"
                - button "New booking on Friday, 13 Nov 2026" [ref=f1e358]:
                  - generic [ref=f1e360]: New booking
              - gridcell "Saturday, 14 Nov 2026 · 4 bookings" [ref=f1e361] [cursor=pointer]:
                - generic [ref=f1e362]:
                  - generic [ref=f1e363]: "14"
                  - generic [ref=f1e366]: "4"
                - button "Prewedding · Nadia & Fajar, Partially paid" [ref=f1e367]:
                  - generic [ref=f1e369]: Prewedding · Nadia & Fajar
                - button "Company Profile · BPR Jaya, Draft" [ref=f1e370]:
                  - generic [ref=f1e372]: Company Profile · BPR Jaya
                - button "Maternity · Dewi, Paid" [ref=f1e373]:
                  - generic [ref=f1e375]: Maternity · Dewi
                - button "+1 more" [ref=f1e376]
              - gridcell "Sunday, 15 Nov 2026" [ref=f1e378] [cursor=pointer]:
                - generic [ref=f1e379]: "15"
                - button "New booking on Sunday, 15 Nov 2026" [ref=f1e382]:
                  - generic [ref=f1e384]: New booking
            - row [ref=f1e385]:
              - gridcell "Monday, 16 Nov 2026" [ref=f1e386] [cursor=pointer]:
                - generic [ref=f1e387]: "16"
                - button "New booking on Monday, 16 Nov 2026" [ref=f1e390]:
                  - generic [ref=f1e392]: New booking
              - gridcell "Tuesday, 17 Nov 2026" [ref=f1e393] [cursor=pointer]:
                - generic [ref=f1e394]: "17"
                - button "New booking on Tuesday, 17 Nov 2026" [ref=f1e397]:
                  - generic [ref=f1e399]: New booking
              - gridcell "Wednesday, 18 Nov 2026 · 1 booking" [ref=f1e400] [cursor=pointer]:
                - generic [ref=f1e401]:
                  - generic [ref=f1e402]: "18"
                  - generic [ref=f1e405]: "1"
                - button "Seminar · Univ. Nusantara, Partially paid" [ref=f1e406]:
                  - generic [ref=f1e408]: Seminar · Univ. Nusantara
              - gridcell "Thursday, 19 Nov 2026" [ref=f1e409] [cursor=pointer]:
                - generic [ref=f1e410]: "19"
                - button "New booking on Thursday, 19 Nov 2026" [ref=f1e413]:
                  - generic [ref=f1e415]: New booking
              - gridcell "Friday, 20 Nov 2026" [ref=f1e416] [cursor=pointer]:
                - generic [ref=f1e417]: "20"
                - button "New booking on Friday, 20 Nov 2026" [ref=f1e420]:
                  - generic [ref=f1e422]: New booking
              - gridcell "Saturday, 21 Nov 2026 · 2 bookings" [ref=f1e423] [cursor=pointer]:
                - generic [ref=f1e424]:
                  - generic [ref=f1e425]: "21"
                  - generic [ref=f1e428]: "2"
                - button "Wedding · Laras & Bima, Partially paid" [ref=f1e429]:
                  - generic [ref=f1e431]: Wedding · Laras & Bima
                - button "Aqiqah · Baby Arka, Draft" [ref=f1e432]:
                  - generic [ref=f1e434]: Aqiqah · Baby Arka
              - gridcell "Sunday, 22 Nov 2026 · 1 booking" [ref=f1e435] [cursor=pointer]:
                - generic [ref=f1e436]:
                  - generic [ref=f1e437]: "22"
                  - generic [ref=f1e440]: "1"
                - button "Engagement · Putri & Andre, Draft" [ref=f1e441]:
                  - generic [ref=f1e443]: Engagement · Putri & Andre
            - row [ref=f1e444]:
              - gridcell "Monday, 23 Nov 2026" [ref=f1e445] [cursor=pointer]:
                - generic [ref=f1e446]: "23"
                - button "New booking on Monday, 23 Nov 2026" [ref=f1e449]:
                  - generic [ref=f1e451]: New booking
              - gridcell "Tuesday, 24 Nov 2026" [ref=f1e452] [cursor=pointer]:
                - generic [ref=f1e453]: "24"
                - button "New booking on Tuesday, 24 Nov 2026" [ref=f1e456]:
                  - generic [ref=f1e458]: New booking
              - gridcell "Wednesday, 25 Nov 2026" [ref=f1e459] [cursor=pointer]:
                - generic [ref=f1e460]: "25"
                - button "New booking on Wednesday, 25 Nov 2026" [ref=f1e463]:
                  - generic [ref=f1e465]: New booking
              - gridcell "Thursday, 26 Nov 2026" [ref=f1e466] [cursor=pointer]:
                - generic [ref=f1e467]: "26"
                - button "New booking on Thursday, 26 Nov 2026" [ref=f1e470]:
                  - generic [ref=f1e472]: New booking
              - gridcell "Friday, 27 Nov 2026 · 1 booking" [ref=f1e473] [cursor=pointer]:
                - generic [ref=f1e474]:
                  - generic [ref=f1e475]: "27"
                  - generic [ref=f1e478]: "1"
                - button "Wedding · Citra & Reza, Partially paid" [ref=f1e479]:
                  - generic [ref=f1e481]: Wedding · Citra & Reza
              - gridcell "Saturday, 28 Nov 2026 · 2 bookings" [ref=f1e482] [cursor=pointer]:
                - generic [ref=f1e483]:
                  - generic [ref=f1e484]: "28"
                  - generic [ref=f1e487]: "2"
                - button "Birthday · Alya 17th, Draft" [ref=f1e488]:
                  - generic [ref=f1e490]: Birthday · Alya 17th
                - button "Launch Event · Tokoku, Partially paid" [ref=f1e491]:
                  - generic [ref=f1e493]: Launch Event · Tokoku
              - gridcell "Sunday, 29 Nov 2026" [ref=f1e494] [cursor=pointer]:
                - generic [ref=f1e495]: "29"
                - button "New booking on Sunday, 29 Nov 2026" [ref=f1e498]:
                  - generic [ref=f1e500]: New booking
            - row [ref=f1e501]:
              - gridcell "Monday, 30 Nov 2026" [ref=f1e502] [cursor=pointer]:
                - generic [ref=f1e503]: "30"
                - button "New booking on Monday, 30 Nov 2026" [ref=f1e506]:
                  - generic [ref=f1e508]: New booking
              - gridcell "Tuesday, 1 Dec 2026" [ref=f1e509] [cursor=pointer]:
                - generic [ref=f1e510]: "1"
                - button "New booking on Tuesday, 1 Dec 2026" [ref=f1e513]:
                  - generic [ref=f1e515]: New booking
              - gridcell "Wednesday, 2 Dec 2026" [ref=f1e516] [cursor=pointer]:
                - generic [ref=f1e517]: "2"
                - button "New booking on Wednesday, 2 Dec 2026" [ref=f1e520]:
                  - generic [ref=f1e522]: New booking
              - gridcell "Thursday, 3 Dec 2026" [ref=f1e523] [cursor=pointer]:
                - generic [ref=f1e524]: "3"
                - button "New booking on Thursday, 3 Dec 2026" [ref=f1e527]:
                  - generic [ref=f1e529]: New booking
              - gridcell "Friday, 4 Dec 2026" [ref=f1e530] [cursor=pointer]:
                - generic [ref=f1e531]: "4"
                - button "New booking on Friday, 4 Dec 2026" [ref=f1e534]:
                  - generic [ref=f1e536]: New booking
              - gridcell "Saturday, 5 Dec 2026 · 1 booking" [ref=f1e537] [cursor=pointer]:
                - generic [ref=f1e538]:
                  - generic [ref=f1e539]: "5"
                  - generic [ref=f1e542]: "1"
                - button "Wedding · Maya & Teguh, Partially paid" [ref=f1e543]:
                  - generic [ref=f1e545]: Wedding · Maya & Teguh
              - gridcell "Sunday, 6 Dec 2026" [ref=f1e546] [cursor=pointer]:
                - generic [ref=f1e547]: "6"
                - button "New booking on Sunday, 6 Dec 2026" [ref=f1e550]:
                  - generic [ref=f1e552]: New booking
      - complementary "Upcoming and insights" [ref=f1e553]:
        - generic [ref=f1e554]:
          - heading "Upcoming" [level=2] [ref=f1e557]
          - generic [ref=f1e559]: Next 7 days
        - list [ref=f1e560]:
          - listitem [ref=f1e561]:
            - button "TODAY 10 Graduation · Aulia Silver Package · 2 items Partially paid Rp 1.750.000 due" [ref=f1e562] [cursor=pointer]:
              - generic [ref=f1e563]:
                - generic [ref=f1e564]: TODAY
                - generic [ref=f1e565]: "10"
              - generic [ref=f1e566]:
                - generic [ref=f1e567]: Graduation · Aulia
                - generic [ref=f1e568]: Silver Package · 2 items
                - generic [ref=f1e570]:
                  - generic [ref=f1e571]: Partially paid
                  - generic [ref=f1e575]: Rp 1.750.000 due
          - listitem [ref=f1e576]:
            - button "TODAY 10 Family Session · Hartono Basic Package Draft Rp 2.000.000 due" [ref=f1e577] [cursor=pointer]:
              - generic [ref=f1e578]:
                - generic [ref=f1e579]: TODAY
                - generic [ref=f1e580]: "10"
              - generic [ref=f1e581]:
                - generic [ref=f1e582]: Family Session · Hartono
                - generic [ref=f1e583]: Basic Package
                - generic [ref=f1e585]:
                  - generic [ref=f1e586]: Draft
                  - generic [ref=f1e590]: Rp 2.000.000 due
          - listitem [ref=f1e591]:
            - button "THU 12 Wedding · Sari & Dimas Gold Package · 3 items Partially paid Rp 7.500.000 due" [ref=f1e592] [cursor=pointer]:
              - generic [ref=f1e593]:
                - generic [ref=f1e594]: THU
                - generic [ref=f1e595]: "12"
              - generic [ref=f1e596]:
                - generic [ref=f1e597]: Wedding · Sari & Dimas
                - generic [ref=f1e598]: Gold Package · 3 items
                - generic [ref=f1e600]:
                  - generic [ref=f1e601]: Partially paid
                  - generic [ref=f1e605]: Rp 7.500.000 due
          - listitem [ref=f1e606]:
            - button "SAT 14 Prewedding · Nadia & Fajar Silver Package · 2 items Partially paid Rp 3.150.000 due" [ref=f1e607] [cursor=pointer]:
              - generic [ref=f1e608]:
                - generic [ref=f1e609]: SAT
                - generic [ref=f1e610]: "14"
              - generic [ref=f1e611]:
                - generic [ref=f1e612]: Prewedding · Nadia & Fajar
                - generic [ref=f1e613]: Silver Package · 2 items
                - generic [ref=f1e615]:
                  - generic [ref=f1e616]: Partially paid
                  - generic [ref=f1e620]: Rp 3.150.000 due
        - button "See all in table" [ref=f1e621] [cursor=pointer]
        - heading "Needs attention" [level=2] [ref=f1e623]
        - article [ref=f1e624]:
          - generic [ref=f1e625]:
            - heading "Balance due today" [level=3] [ref=f1e628]
            - generic [ref=f1e629]: 2h ago
          - paragraph [ref=f1e630]: Graduation · Aulia is today and still has Rp 1.750.000 outstanding.
          - button "View booking" [ref=f1e632] [cursor=pointer]
        - article [ref=f1e634]:
          - generic [ref=f1e635]:
            - heading "Balance before event" [level=3] [ref=f1e638]
            - generic [ref=f1e639]: today
          - paragraph [ref=f1e640]: 3 bookings this week are still on DP — Rp 12.400.000 outstanding.
          - button "View bookings" [ref=f1e642] [cursor=pointer]
  - alert [ref=f1e644]
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
      |                                            ^ Error: profile-ac1 diff ratio
  156 | }
  157 | 
```