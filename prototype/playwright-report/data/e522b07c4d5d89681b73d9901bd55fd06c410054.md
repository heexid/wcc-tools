# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F12.spec.ts >> 24 · detail — Graduation · Aulia (from rail)
- Location: tests/visual/F12.spec.ts:35:1

# Error details

```
Error: bookings-24 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.006149724616858238
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
            - tab "Calendar" [selected] [ref=f1e107] [cursor=pointer]
            - tab "Table" [ref=f1e109] [cursor=pointer]
          - generic [ref=f1e111]:
            - searchbox "Search bookings" [ref=f1e115]
            - 'button "Status: All status" [ref=f1e119] [cursor=pointer]':
              - generic [ref=f1e120]: All status
            - 'button "Crew: All crew" [ref=f1e126] [cursor=pointer]':
              - generic [ref=f1e127]: All crew
            - 'button "Package: All packages" [ref=f1e133] [cursor=pointer]':
              - generic [ref=f1e134]: All packages
        - region "Calendar" [ref=f1e137]:
          - generic [ref=f1e138]:
            - generic [ref=f1e139]:
              - button "Previous month" [ref=f1e140] [cursor=pointer]
              - button "Next month" [ref=f1e143] [cursor=pointer]
            - heading "November 2026" [level=2] [ref=f1e146]
            - button "Today" [ref=f1e148] [cursor=pointer]
            - group "Legend" [ref=f1e150]:
              - generic [ref=f1e151]: Draft
              - generic [ref=f1e155]: Partially paid
              - generic [ref=f1e159]: Paid
            - tablist "Calendar range" [ref=f1e163]:
              - tab "Day" [ref=f1e164] [cursor=pointer]
              - tab "Week" [ref=f1e166] [cursor=pointer]
              - tab "Month" [selected] [ref=f1e168] [cursor=pointer]
          - grid "Month" [ref=f1e171]:
            - row [ref=f1e172]:
              - columnheader "Mon" [ref=f1e173]
              - columnheader "Tue" [ref=f1e175]
              - columnheader "Wed" [ref=f1e177]
              - columnheader "Thu" [ref=f1e179]
              - columnheader "Fri" [ref=f1e181]
              - columnheader "Sat" [ref=f1e183]
              - columnheader "Sun" [ref=f1e185]
            - row [ref=f1e187]:
              - gridcell "Monday, 26 Oct 2026 · 1 booking" [ref=f1e188] [cursor=pointer]:
                - generic [ref=f1e189]:
                  - generic [ref=f1e190]: "26"
                  - generic [ref=f1e193]: "1"
                - button "Aqiqah · Baby Zahra, Paid" [ref=f1e194]:
                  - generic [ref=f1e196]: Aqiqah · Baby Zahra
              - gridcell "Tuesday, 27 Oct 2026" [ref=f1e197] [cursor=pointer]:
                - generic [ref=f1e198]: "27"
                - button "New booking on Tuesday, 27 Oct 2026" [ref=f1e201]:
                  - generic [ref=f1e203]: New booking
              - gridcell "Wednesday, 28 Oct 2026 · 1 booking" [ref=f1e204] [cursor=pointer]:
                - generic [ref=f1e205]:
                  - generic [ref=f1e206]: "28"
                  - generic [ref=f1e209]: "1"
                - button "Prewedding · Tari & Galih, Partially paid" [ref=f1e210]:
                  - generic [ref=f1e212]: Prewedding · Tari & Galih
              - gridcell "Thursday, 29 Oct 2026 · 1 booking" [ref=f1e213] [cursor=pointer]:
                - generic [ref=f1e214]:
                  - generic [ref=f1e215]: "29"
                  - generic [ref=f1e218]: "1"
                - button "Corporate Gathering · PT Sinar, Paid" [ref=f1e219]:
                  - generic [ref=f1e221]: Corporate Gathering · PT Sinar
              - gridcell "Friday, 30 Oct 2026 · 1 booking" [ref=f1e222] [cursor=pointer]:
                - generic [ref=f1e223]:
                  - generic [ref=f1e224]: "30"
                  - generic [ref=f1e227]: "1"
                - button "Birthday · Raffa 10th, Paid" [ref=f1e228]:
                  - generic [ref=f1e230]: Birthday · Raffa 10th
              - gridcell "Saturday, 31 Oct 2026 · 1 booking" [ref=f1e231] [cursor=pointer]:
                - generic [ref=f1e232]:
                  - generic [ref=f1e233]: "31"
                  - generic [ref=f1e236]: "1"
                - button "Engagement · Wulan & Doni, Paid" [ref=f1e237]:
                  - generic [ref=f1e239]: Engagement · Wulan & Doni
              - gridcell "Sunday, 1 Nov 2026" [ref=f1e240] [cursor=pointer]:
                - generic [ref=f1e241]: "1"
                - button "New booking on Sunday, 1 Nov 2026" [ref=f1e244]:
                  - generic [ref=f1e246]: New booking
            - row [ref=f1e247]:
              - gridcell "Monday, 2 Nov 2026" [ref=f1e248] [cursor=pointer]:
                - generic [ref=f1e249]: "2"
                - button "New booking on Monday, 2 Nov 2026" [ref=f1e252]:
                  - generic [ref=f1e254]: New booking
              - gridcell "Tuesday, 3 Nov 2026 · 1 booking" [ref=f1e255] [cursor=pointer]:
                - generic [ref=f1e256]:
                  - generic [ref=f1e257]: "3"
                  - generic [ref=f1e260]: "1"
                - button "Corporate Gathering · PT Arta, Paid" [ref=f1e261]:
                  - generic [ref=f1e263]: Corporate Gathering · PT Arta
              - gridcell "Wednesday, 4 Nov 2026" [ref=f1e264] [cursor=pointer]:
                - generic [ref=f1e265]: "4"
                - button "New booking on Wednesday, 4 Nov 2026" [ref=f1e268]:
                  - generic [ref=f1e270]: New booking
              - gridcell "Thursday, 5 Nov 2026" [ref=f1e271] [cursor=pointer]:
                - generic [ref=f1e272]: "5"
                - button "New booking on Thursday, 5 Nov 2026" [ref=f1e275]:
                  - generic [ref=f1e277]: New booking
              - gridcell "Friday, 6 Nov 2026 · 1 booking" [ref=f1e278] [cursor=pointer]:
                - generic [ref=f1e279]:
                  - generic [ref=f1e280]: "6"
                  - generic [ref=f1e283]: "1"
                - button "Engagement · Rina & Yoga, Paid" [ref=f1e284]:
                  - generic [ref=f1e286]: Engagement · Rina & Yoga
              - gridcell "Saturday, 7 Nov 2026 · 2 bookings" [ref=f1e287] [cursor=pointer]:
                - generic [ref=f1e288]:
                  - generic [ref=f1e289]: "7"
                  - generic [ref=f1e292]: "2"
                - button "Birthday · Kenzo, Partially paid" [ref=f1e293]:
                  - generic [ref=f1e295]: Birthday · Kenzo
                - button "Product Shoot · Kopi Nusa, Paid" [ref=f1e296]:
                  - generic [ref=f1e298]: Product Shoot · Kopi Nusa
              - gridcell "Sunday, 8 Nov 2026" [ref=f1e299] [cursor=pointer]:
                - generic [ref=f1e300]: "8"
                - button "New booking on Sunday, 8 Nov 2026" [ref=f1e303]:
                  - generic [ref=f1e305]: New booking
            - row [ref=f1e306]:
              - gridcell "Monday, 9 Nov 2026" [ref=f1e307] [cursor=pointer]:
                - generic [ref=f1e308]: "9"
                - button "New booking on Monday, 9 Nov 2026" [ref=f1e311]:
                  - generic [ref=f1e313]: New booking
              - gridcell "Tuesday, 10 Nov 2026 · 2 bookings" [selected] [ref=f1e314] [cursor=pointer]:
                - generic [ref=f1e315]:
                  - generic [ref=f1e316]: "10"
                  - generic [ref=f1e319]: "2"
                - button "Graduation · Aulia, Partially paid" [ref=f1e320]:
                  - generic [ref=f1e322]: Graduation · Aulia
                - button "Family Session · Hartono, Draft" [ref=f1e323]:
                  - generic [ref=f1e325]: Family Session · Hartono
              - gridcell "Wednesday, 11 Nov 2026" [ref=f1e326] [cursor=pointer]:
                - generic [ref=f1e327]: "11"
                - button "New booking on Wednesday, 11 Nov 2026" [ref=f1e330]:
                  - generic [ref=f1e332]: New booking
              - gridcell "Thursday, 12 Nov 2026 · 1 booking" [ref=f1e333] [cursor=pointer]:
                - generic [ref=f1e334]:
                  - generic [ref=f1e335]: "12"
                  - generic [ref=f1e338]: "1"
                - button "Wedding · Sari & Dimas, Partially paid" [ref=f1e339]:
                  - generic [ref=f1e341]: Wedding · Sari & Dimas
              - gridcell "Friday, 13 Nov 2026" [ref=f1e342] [cursor=pointer]:
                - generic [ref=f1e343]: "13"
                - button "New booking on Friday, 13 Nov 2026" [ref=f1e346]:
                  - generic [ref=f1e348]: New booking
              - gridcell "Saturday, 14 Nov 2026 · 4 bookings" [ref=f1e349] [cursor=pointer]:
                - generic [ref=f1e350]:
                  - generic [ref=f1e351]: "14"
                  - generic [ref=f1e354]: "4"
                - button "Prewedding · Nadia & Fajar, Partially paid" [ref=f1e355]:
                  - generic [ref=f1e357]: Prewedding · Nadia & Fajar
                - button "Company Profile · BPR Jaya, Draft" [ref=f1e358]:
                  - generic [ref=f1e360]: Company Profile · BPR Jaya
                - button "Maternity · Dewi, Paid" [ref=f1e361]:
                  - generic [ref=f1e363]: Maternity · Dewi
                - button "+1 more" [ref=f1e364]
              - gridcell "Sunday, 15 Nov 2026" [ref=f1e366] [cursor=pointer]:
                - generic [ref=f1e367]: "15"
                - button "New booking on Sunday, 15 Nov 2026" [ref=f1e370]:
                  - generic [ref=f1e372]: New booking
            - row [ref=f1e373]:
              - gridcell "Monday, 16 Nov 2026" [ref=f1e374] [cursor=pointer]:
                - generic [ref=f1e375]: "16"
                - button "New booking on Monday, 16 Nov 2026" [ref=f1e378]:
                  - generic [ref=f1e380]: New booking
              - gridcell "Tuesday, 17 Nov 2026" [ref=f1e381] [cursor=pointer]:
                - generic [ref=f1e382]: "17"
                - button "New booking on Tuesday, 17 Nov 2026" [ref=f1e385]:
                  - generic [ref=f1e387]: New booking
              - gridcell "Wednesday, 18 Nov 2026 · 1 booking" [ref=f1e388] [cursor=pointer]:
                - generic [ref=f1e389]:
                  - generic [ref=f1e390]: "18"
                  - generic [ref=f1e393]: "1"
                - button "Seminar · Univ. Nusantara, Partially paid" [ref=f1e394]:
                  - generic [ref=f1e396]: Seminar · Univ. Nusantara
              - gridcell "Thursday, 19 Nov 2026" [ref=f1e397] [cursor=pointer]:
                - generic [ref=f1e398]: "19"
                - button "New booking on Thursday, 19 Nov 2026" [ref=f1e401]:
                  - generic [ref=f1e403]: New booking
              - gridcell "Friday, 20 Nov 2026" [ref=f1e404] [cursor=pointer]:
                - generic [ref=f1e405]: "20"
                - button "New booking on Friday, 20 Nov 2026" [ref=f1e408]:
                  - generic [ref=f1e410]: New booking
              - gridcell "Saturday, 21 Nov 2026 · 2 bookings" [ref=f1e411] [cursor=pointer]:
                - generic [ref=f1e412]:
                  - generic [ref=f1e413]: "21"
                  - generic [ref=f1e416]: "2"
                - button "Wedding · Laras & Bima, Partially paid" [ref=f1e417]:
                  - generic [ref=f1e419]: Wedding · Laras & Bima
                - button "Aqiqah · Baby Arka, Draft" [ref=f1e420]:
                  - generic [ref=f1e422]: Aqiqah · Baby Arka
              - gridcell "Sunday, 22 Nov 2026 · 1 booking" [ref=f1e423] [cursor=pointer]:
                - generic [ref=f1e424]:
                  - generic [ref=f1e425]: "22"
                  - generic [ref=f1e428]: "1"
                - button "Engagement · Putri & Andre, Draft" [ref=f1e429]:
                  - generic [ref=f1e431]: Engagement · Putri & Andre
            - row [ref=f1e432]:
              - gridcell "Monday, 23 Nov 2026" [ref=f1e433] [cursor=pointer]:
                - generic [ref=f1e434]: "23"
                - button "New booking on Monday, 23 Nov 2026" [ref=f1e437]:
                  - generic [ref=f1e439]: New booking
              - gridcell "Tuesday, 24 Nov 2026" [ref=f1e440] [cursor=pointer]:
                - generic [ref=f1e441]: "24"
                - button "New booking on Tuesday, 24 Nov 2026" [ref=f1e444]:
                  - generic [ref=f1e446]: New booking
              - gridcell "Wednesday, 25 Nov 2026" [ref=f1e447] [cursor=pointer]:
                - generic [ref=f1e448]: "25"
                - button "New booking on Wednesday, 25 Nov 2026" [ref=f1e451]:
                  - generic [ref=f1e453]: New booking
              - gridcell "Thursday, 26 Nov 2026" [ref=f1e454] [cursor=pointer]:
                - generic [ref=f1e455]: "26"
                - button "New booking on Thursday, 26 Nov 2026" [ref=f1e458]:
                  - generic [ref=f1e460]: New booking
              - gridcell "Friday, 27 Nov 2026 · 1 booking" [ref=f1e461] [cursor=pointer]:
                - generic [ref=f1e462]:
                  - generic [ref=f1e463]: "27"
                  - generic [ref=f1e466]: "1"
                - button "Wedding · Citra & Reza, Partially paid" [ref=f1e467]:
                  - generic [ref=f1e469]: Wedding · Citra & Reza
              - gridcell "Saturday, 28 Nov 2026 · 2 bookings" [ref=f1e470] [cursor=pointer]:
                - generic [ref=f1e471]:
                  - generic [ref=f1e472]: "28"
                  - generic [ref=f1e475]: "2"
                - button "Birthday · Alya 17th, Draft" [ref=f1e476]:
                  - generic [ref=f1e478]: Birthday · Alya 17th
                - button "Launch Event · Tokoku, Partially paid" [ref=f1e479]:
                  - generic [ref=f1e481]: Launch Event · Tokoku
              - gridcell "Sunday, 29 Nov 2026" [ref=f1e482] [cursor=pointer]:
                - generic [ref=f1e483]: "29"
                - button "New booking on Sunday, 29 Nov 2026" [ref=f1e486]:
                  - generic [ref=f1e488]: New booking
            - row [ref=f1e489]:
              - gridcell "Monday, 30 Nov 2026" [ref=f1e490] [cursor=pointer]:
                - generic [ref=f1e491]: "30"
                - button "New booking on Monday, 30 Nov 2026" [ref=f1e494]:
                  - generic [ref=f1e496]: New booking
              - gridcell "Tuesday, 1 Dec 2026" [ref=f1e497] [cursor=pointer]:
                - generic [ref=f1e498]: "1"
                - button "New booking on Tuesday, 1 Dec 2026" [ref=f1e501]:
                  - generic [ref=f1e503]: New booking
              - gridcell "Wednesday, 2 Dec 2026" [ref=f1e504] [cursor=pointer]:
                - generic [ref=f1e505]: "2"
                - button "New booking on Wednesday, 2 Dec 2026" [ref=f1e508]:
                  - generic [ref=f1e510]: New booking
              - gridcell "Thursday, 3 Dec 2026" [ref=f1e511] [cursor=pointer]:
                - generic [ref=f1e512]: "3"
                - button "New booking on Thursday, 3 Dec 2026" [ref=f1e515]:
                  - generic [ref=f1e517]: New booking
              - gridcell "Friday, 4 Dec 2026" [ref=f1e518] [cursor=pointer]:
                - generic [ref=f1e519]: "4"
                - button "New booking on Friday, 4 Dec 2026" [ref=f1e522]:
                  - generic [ref=f1e524]: New booking
              - gridcell "Saturday, 5 Dec 2026 · 1 booking" [ref=f1e525] [cursor=pointer]:
                - generic [ref=f1e526]:
                  - generic [ref=f1e527]: "5"
                  - generic [ref=f1e530]: "1"
                - button "Wedding · Maya & Teguh, Partially paid" [ref=f1e531]:
                  - generic [ref=f1e533]: Wedding · Maya & Teguh
              - gridcell "Sunday, 6 Dec 2026" [ref=f1e534] [cursor=pointer]:
                - generic [ref=f1e535]: "6"
                - button "New booking on Sunday, 6 Dec 2026" [ref=f1e538]:
                  - generic [ref=f1e540]: New booking
      - complementary "Upcoming and insights" [ref=f1e541]:
        - generic [ref=f1e542]:
          - heading "Upcoming" [level=2] [ref=f1e545]
          - generic [ref=f1e547]: Next 7 days
        - list [ref=f1e548]:
          - listitem [ref=f1e549]:
            - button "TODAY 10 Graduation · Aulia Silver Package · 2 items Partially paid Rp 1.750.000 due" [ref=f1e550] [cursor=pointer]:
              - generic [ref=f1e551]:
                - generic [ref=f1e552]: TODAY
                - generic [ref=f1e553]: "10"
              - generic [ref=f1e554]:
                - generic [ref=f1e555]: Graduation · Aulia
                - generic [ref=f1e556]: Silver Package · 2 items
                - generic [ref=f1e558]:
                  - generic [ref=f1e559]: Partially paid
                  - generic [ref=f1e563]: Rp 1.750.000 due
          - listitem [ref=f1e564]:
            - button "TODAY 10 Family Session · Hartono Basic Package Draft Rp 2.000.000 due" [ref=f1e565] [cursor=pointer]:
              - generic [ref=f1e566]:
                - generic [ref=f1e567]: TODAY
                - generic [ref=f1e568]: "10"
              - generic [ref=f1e569]:
                - generic [ref=f1e570]: Family Session · Hartono
                - generic [ref=f1e571]: Basic Package
                - generic [ref=f1e573]:
                  - generic [ref=f1e574]: Draft
                  - generic [ref=f1e578]: Rp 2.000.000 due
          - listitem [ref=f1e579]:
            - button "THU 12 Wedding · Sari & Dimas Gold Package · 3 items Partially paid Rp 7.500.000 due" [ref=f1e580] [cursor=pointer]:
              - generic [ref=f1e581]:
                - generic [ref=f1e582]: THU
                - generic [ref=f1e583]: "12"
              - generic [ref=f1e584]:
                - generic [ref=f1e585]: Wedding · Sari & Dimas
                - generic [ref=f1e586]: Gold Package · 3 items
                - generic [ref=f1e588]:
                  - generic [ref=f1e589]: Partially paid
                  - generic [ref=f1e593]: Rp 7.500.000 due
          - listitem [ref=f1e594]:
            - button "SAT 14 Prewedding · Nadia & Fajar Silver Package · 2 items Partially paid Rp 3.150.000 due" [ref=f1e595] [cursor=pointer]:
              - generic [ref=f1e596]:
                - generic [ref=f1e597]: SAT
                - generic [ref=f1e598]: "14"
              - generic [ref=f1e599]:
                - generic [ref=f1e600]: Prewedding · Nadia & Fajar
                - generic [ref=f1e601]: Silver Package · 2 items
                - generic [ref=f1e603]:
                  - generic [ref=f1e604]: Partially paid
                  - generic [ref=f1e608]: Rp 3.150.000 due
        - button "See all in table" [ref=f1e609] [cursor=pointer]
        - heading "Needs attention" [level=2] [ref=f1e611]
        - article [ref=f1e612]:
          - generic [ref=f1e613]:
            - heading "Balance due today" [level=3] [ref=f1e616]
            - generic [ref=f1e617]: 2h ago
          - paragraph [ref=f1e618]: Graduation · Aulia is today and still has Rp 1.750.000 outstanding.
          - button "View booking" [ref=f1e620] [cursor=pointer]
        - article [ref=f1e622]:
          - generic [ref=f1e623]:
            - heading "Balance before event" [level=3] [ref=f1e626]
            - generic [ref=f1e627]: today
          - paragraph [ref=f1e628]: 3 bookings this week are still on DP — Rp 12.400.000 outstanding.
          - button "View bookings" [ref=f1e630] [cursor=pointer]
  - alert [ref=f1e632]: Bookings
  - dialog "Booking detail" [ref=f1e635]:
    - banner [ref=f1e636]:
      - generic [ref=f1e637]:
        - generic [ref=f1e638]: BK-2026-0139
        - generic [ref=f1e639]: Partially paid
        - button "Open full page" [ref=f1e643] [cursor=pointer]
        - button "Close" [ref=f1e648] [cursor=pointer]
      - heading "Graduation · Aulia" [level=2] [ref=f1e652]
      - generic [ref=f1e654]:
        - button "Edit booking" [ref=f1e655] [cursor=pointer]
        - button "Download latest PDF" [ref=f1e660] [cursor=pointer]
    - generic [ref=f1e665]:
      - region "Financial summary" [ref=f1e666]:
        - generic [ref=f1e667]:
          - generic [ref=f1e668]:
            - term [ref=f1e669]:
              - generic [ref=f1e670]: Total booking
            - definition [ref=f1e671]:
              - generic [ref=f1e672]: Rp 3.500.000
          - generic [ref=f1e673]:
            - term [ref=f1e674]:
              - generic [ref=f1e675]: Total paid
            - definition [ref=f1e676]:
              - generic [ref=f1e677]: Rp 1.750.000
          - generic [ref=f1e678]:
            - term [ref=f1e679]:
              - generic [ref=f1e680]: Remaining
            - definition [ref=f1e681]:
              - generic [ref=f1e682]: Rp 1.750.000
        - progressbar "Paid" [ref=f1e683]
        - generic [ref=f1e685]: 50% paid · balance due today (10 Nov 2026)
      - region "Booking information" [ref=f1e686]:
        - heading "Booking information" [level=3] [ref=f1e687]
        - generic [ref=f1e689]:
          - generic [ref=f1e690]: Client
          - generic [ref=f1e695]: Aulia Rahma
        - generic [ref=f1e696]:
          - generic [ref=f1e697]: Phone
          - link "+62 812-7788-1020 (WhatsApp, opens in a new tab)" [ref=f1e701] [cursor=pointer]:
            - /url: https://wa.me/6281277881020
            - generic [ref=f1e702]: +62 812-7788-1020
        - generic [ref=f1e703]:
          - generic [ref=f1e704]: Booking date
          - generic [ref=f1e708]: Tue, 10 Nov 2026 · today
        - generic [ref=f1e709]:
          - generic [ref=f1e710]: Package
          - generic [ref=f1e716]: Silver Package · Rp 3.000.000
        - generic [ref=f1e717]:
          - generic [ref=f1e718]: Payment
          - generic [ref=f1e723]: Bank BCA · 1234567890 · a.n. bs.moment Studio
        - generic [ref=f1e724]:
          - generic [ref=f1e725]: Crew
          - button "Raka Pratama — show schedule" [ref=f1e733] [cursor=pointer]:
            - generic [ref=f1e735]: RP
            - generic [ref=f1e736]: Raka Pratama
        - generic [ref=f1e737]:
          - generic [ref=f1e738]: Created
          - generic [ref=f1e743]: 28 Oct 2026 by Admin
      - region "Additional items (2)" [ref=f1e744]:
        - heading "Additional items (2)" [level=3] [ref=f1e745]
        - generic [ref=f1e747]:
          - generic [ref=f1e748]: Extra hour
          - generic [ref=f1e749]: 1 × Rp 250.000
          - generic [ref=f1e750]: Rp 250.000
        - generic [ref=f1e751]:
          - generic [ref=f1e752]: Printed photos 4R
          - generic [ref=f1e753]: 25 × Rp 10.000
          - generic [ref=f1e754]: Rp 250.000
      - separator [ref=f1e755]
      - region "Invoices (1)" [ref=f1e756]:
        - generic [ref=f1e757]:
          - heading "Invoices (1)" [level=3] [ref=f1e758]
          - generic [ref=f1e760]: Linked to this booking
        - article "Invoice INV-2026-0179" [ref=f1e761]:
          - generic [ref=f1e762]:
            - generic [ref=f1e767]:
              - generic [ref=f1e768]: INV-2026-0179
              - generic [ref=f1e769]: Issued 02 Nov 2026, 13:20
            - generic [ref=f1e770]: Rp 1.750.000
          - generic [ref=f1e771]:
            - paragraph [ref=f1e772]: "Paid after this invoice: Rp 1.750.000 of Rp 3.500.000"
            - button "Download PDF (INV-2026-0179)" [ref=f1e773] [cursor=pointer]:
              - generic [ref=f1e777]: Download PDF
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
      |                                            ^ Error: bookings-24 diff ratio
  156 | }
  157 | 
```