# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F15.spec.ts >> 37 · PDF generation failed
- Location: tests/visual/F15.spec.ts:65:1

# Error details

```
Error: bookings-37 diff ratio

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0.005
Received:    0.0852535320881226
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
          - grid "Month" [ref=f1e172]:
            - row [ref=f1e173]:
              - columnheader "Mon" [ref=f1e174]
              - columnheader "Tue" [ref=f1e176]
              - columnheader "Wed" [ref=f1e178]
              - columnheader "Thu" [ref=f1e180]
              - columnheader "Fri" [ref=f1e182]
              - columnheader "Sat" [ref=f1e184]
              - columnheader "Sun" [ref=f1e186]
            - row [ref=f1e188]:
              - gridcell "Monday, 26 Oct 2026 · 1 booking" [ref=f1e189] [cursor=pointer]:
                - generic [ref=f1e190]:
                  - generic [ref=f1e191]: "26"
                  - generic [ref=f1e194]: "1"
                - button "Aqiqah · Baby Zahra, Paid" [ref=f1e195]:
                  - generic [ref=f1e197]: Aqiqah · Baby Zahra
              - gridcell "Tuesday, 27 Oct 2026" [ref=f1e198] [cursor=pointer]:
                - generic [ref=f1e199]: "27"
                - button "New booking on Tuesday, 27 Oct 2026" [ref=f1e202]:
                  - generic [ref=f1e204]: New booking
              - gridcell "Wednesday, 28 Oct 2026 · 1 booking" [ref=f1e205] [cursor=pointer]:
                - generic [ref=f1e206]:
                  - generic [ref=f1e207]: "28"
                  - generic [ref=f1e210]: "1"
                - button "Prewedding · Tari & Galih, Partially paid" [ref=f1e211]:
                  - generic [ref=f1e213]: Prewedding · Tari & Galih
              - gridcell "Thursday, 29 Oct 2026 · 1 booking" [ref=f1e214] [cursor=pointer]:
                - generic [ref=f1e215]:
                  - generic [ref=f1e216]: "29"
                  - generic [ref=f1e219]: "1"
                - button "Corporate Gathering · PT Sinar, Paid" [ref=f1e220]:
                  - generic [ref=f1e222]: Corporate Gathering · PT Sinar
              - gridcell "Friday, 30 Oct 2026 · 1 booking" [ref=f1e223] [cursor=pointer]:
                - generic [ref=f1e224]:
                  - generic [ref=f1e225]: "30"
                  - generic [ref=f1e228]: "1"
                - button "Birthday · Raffa 10th, Paid" [ref=f1e229]:
                  - generic [ref=f1e231]: Birthday · Raffa 10th
              - gridcell "Saturday, 31 Oct 2026 · 1 booking" [ref=f1e232] [cursor=pointer]:
                - generic [ref=f1e233]:
                  - generic [ref=f1e234]: "31"
                  - generic [ref=f1e237]: "1"
                - button "Engagement · Wulan & Doni, Paid" [ref=f1e238]:
                  - generic [ref=f1e240]: Engagement · Wulan & Doni
              - gridcell "Sunday, 1 Nov 2026" [ref=f1e241] [cursor=pointer]:
                - generic [ref=f1e242]: "1"
                - button "New booking on Sunday, 1 Nov 2026" [ref=f1e245]:
                  - generic [ref=f1e247]: New booking
            - row [ref=f1e248]:
              - gridcell "Monday, 2 Nov 2026" [ref=f1e249] [cursor=pointer]:
                - generic [ref=f1e250]: "2"
                - button "New booking on Monday, 2 Nov 2026" [ref=f1e253]:
                  - generic [ref=f1e255]: New booking
              - gridcell "Tuesday, 3 Nov 2026 · 1 booking" [ref=f1e256] [cursor=pointer]:
                - generic [ref=f1e257]:
                  - generic [ref=f1e258]: "3"
                  - generic [ref=f1e261]: "1"
                - button "Corporate Gathering · PT Arta, Paid" [ref=f1e262]:
                  - generic [ref=f1e264]: Corporate Gathering · PT Arta
              - gridcell "Wednesday, 4 Nov 2026" [ref=f1e265] [cursor=pointer]:
                - generic [ref=f1e266]: "4"
                - button "New booking on Wednesday, 4 Nov 2026" [ref=f1e269]:
                  - generic [ref=f1e271]: New booking
              - gridcell "Thursday, 5 Nov 2026" [ref=f1e272] [cursor=pointer]:
                - generic [ref=f1e273]: "5"
                - button "New booking on Thursday, 5 Nov 2026" [ref=f1e276]:
                  - generic [ref=f1e278]: New booking
              - gridcell "Friday, 6 Nov 2026 · 1 booking" [ref=f1e279] [cursor=pointer]:
                - generic [ref=f1e280]:
                  - generic [ref=f1e281]: "6"
                  - generic [ref=f1e284]: "1"
                - button "Engagement · Rina & Yoga, Paid" [ref=f1e285]:
                  - generic [ref=f1e287]: Engagement · Rina & Yoga
              - gridcell "Saturday, 7 Nov 2026 · 2 bookings" [ref=f1e288] [cursor=pointer]:
                - generic [ref=f1e289]:
                  - generic [ref=f1e290]: "7"
                  - generic [ref=f1e293]: "2"
                - button "Birthday · Kenzo, Partially paid" [ref=f1e294]:
                  - generic [ref=f1e296]: Birthday · Kenzo
                - button "Product Shoot · Kopi Nusa, Paid" [ref=f1e297]:
                  - generic [ref=f1e299]: Product Shoot · Kopi Nusa
              - gridcell "Sunday, 8 Nov 2026" [ref=f1e300] [cursor=pointer]:
                - generic [ref=f1e301]: "8"
                - button "New booking on Sunday, 8 Nov 2026" [ref=f1e304]:
                  - generic [ref=f1e306]: New booking
            - row [ref=f1e307]:
              - gridcell "Monday, 9 Nov 2026" [ref=f1e308] [cursor=pointer]:
                - generic [ref=f1e309]: "9"
                - button "New booking on Monday, 9 Nov 2026" [ref=f1e312]:
                  - generic [ref=f1e314]: New booking
              - gridcell "Tuesday, 10 Nov 2026 · 2 bookings" [selected] [ref=f1e315] [cursor=pointer]:
                - generic [ref=f1e316]:
                  - generic [ref=f1e317]: "10"
                  - generic [ref=f1e320]: "2"
                - button "Graduation · Aulia, Partially paid" [ref=f1e321]:
                  - generic [ref=f1e323]: Graduation · Aulia
                - button "Family Session · Hartono, Draft" [ref=f1e324]:
                  - generic [ref=f1e326]: Family Session · Hartono
              - gridcell "Wednesday, 11 Nov 2026" [ref=f1e327] [cursor=pointer]:
                - generic [ref=f1e328]: "11"
                - button "New booking on Wednesday, 11 Nov 2026" [ref=f1e331]:
                  - generic [ref=f1e333]: New booking
              - gridcell "Thursday, 12 Nov 2026 · 1 booking" [ref=f1e334] [cursor=pointer]:
                - generic [ref=f1e335]:
                  - generic [ref=f1e336]: "12"
                  - generic [ref=f1e339]: "1"
                - button "Wedding · Sari & Dimas, Partially paid" [ref=f1e340]:
                  - generic [ref=f1e342]: Wedding · Sari & Dimas
              - gridcell "Friday, 13 Nov 2026" [ref=f1e343] [cursor=pointer]:
                - generic [ref=f1e344]: "13"
                - button "New booking on Friday, 13 Nov 2026" [ref=f1e347]:
                  - generic [ref=f1e349]: New booking
              - gridcell "Saturday, 14 Nov 2026 · 4 bookings" [ref=f1e350] [cursor=pointer]:
                - generic [ref=f1e351]:
                  - generic [ref=f1e352]: "14"
                  - generic [ref=f1e355]: "4"
                - button "Prewedding · Nadia & Fajar, Partially paid" [ref=f1e356]:
                  - generic [ref=f1e358]: Prewedding · Nadia & Fajar
                - button "Company Profile · BPR Jaya, Draft" [ref=f1e359]:
                  - generic [ref=f1e361]: Company Profile · BPR Jaya
                - button "Maternity · Dewi, Paid" [ref=f1e362]:
                  - generic [ref=f1e364]: Maternity · Dewi
                - button "+1 more" [ref=f1e365]
              - gridcell "Sunday, 15 Nov 2026" [ref=f1e367] [cursor=pointer]:
                - generic [ref=f1e368]: "15"
                - button "New booking on Sunday, 15 Nov 2026" [ref=f1e371]:
                  - generic [ref=f1e373]: New booking
            - row [ref=f1e374]:
              - gridcell "Monday, 16 Nov 2026" [ref=f1e375] [cursor=pointer]:
                - generic [ref=f1e376]: "16"
                - button "New booking on Monday, 16 Nov 2026" [ref=f1e379]:
                  - generic [ref=f1e381]: New booking
              - gridcell "Tuesday, 17 Nov 2026" [ref=f1e382] [cursor=pointer]:
                - generic [ref=f1e383]: "17"
                - button "New booking on Tuesday, 17 Nov 2026" [ref=f1e386]:
                  - generic [ref=f1e388]: New booking
              - gridcell "Wednesday, 18 Nov 2026 · 1 booking" [ref=f1e389] [cursor=pointer]:
                - generic [ref=f1e390]:
                  - generic [ref=f1e391]: "18"
                  - generic [ref=f1e394]: "1"
                - button "Seminar · Univ. Nusantara, Partially paid" [ref=f1e395]:
                  - generic [ref=f1e397]: Seminar · Univ. Nusantara
              - gridcell "Thursday, 19 Nov 2026" [ref=f1e398] [cursor=pointer]:
                - generic [ref=f1e399]: "19"
                - button "New booking on Thursday, 19 Nov 2026" [ref=f1e402]:
                  - generic [ref=f1e404]: New booking
              - gridcell "Friday, 20 Nov 2026" [ref=f1e405] [cursor=pointer]:
                - generic [ref=f1e406]: "20"
                - button "New booking on Friday, 20 Nov 2026" [ref=f1e409]:
                  - generic [ref=f1e411]: New booking
              - gridcell "Saturday, 21 Nov 2026 · 2 bookings" [ref=f1e412] [cursor=pointer]:
                - generic [ref=f1e413]:
                  - generic [ref=f1e414]: "21"
                  - generic [ref=f1e417]: "2"
                - button "Wedding · Laras & Bima, Partially paid" [ref=f1e418]:
                  - generic [ref=f1e420]: Wedding · Laras & Bima
                - button "Aqiqah · Baby Arka, Draft" [ref=f1e421]:
                  - generic [ref=f1e423]: Aqiqah · Baby Arka
              - gridcell "Sunday, 22 Nov 2026 · 1 booking" [ref=f1e424] [cursor=pointer]:
                - generic [ref=f1e425]:
                  - generic [ref=f1e426]: "22"
                  - generic [ref=f1e429]: "1"
                - button "Engagement · Putri & Andre, Draft" [ref=f1e430]:
                  - generic [ref=f1e432]: Engagement · Putri & Andre
            - row [ref=f1e433]:
              - gridcell "Monday, 23 Nov 2026" [ref=f1e434] [cursor=pointer]:
                - generic [ref=f1e435]: "23"
                - button "New booking on Monday, 23 Nov 2026" [ref=f1e438]:
                  - generic [ref=f1e440]: New booking
              - gridcell "Tuesday, 24 Nov 2026" [ref=f1e441] [cursor=pointer]:
                - generic [ref=f1e442]: "24"
                - button "New booking on Tuesday, 24 Nov 2026" [ref=f1e445]:
                  - generic [ref=f1e447]: New booking
              - gridcell "Wednesday, 25 Nov 2026" [ref=f1e448] [cursor=pointer]:
                - generic [ref=f1e449]: "25"
                - button "New booking on Wednesday, 25 Nov 2026" [ref=f1e452]:
                  - generic [ref=f1e454]: New booking
              - gridcell "Thursday, 26 Nov 2026" [ref=f1e455] [cursor=pointer]:
                - generic [ref=f1e456]: "26"
                - button "New booking on Thursday, 26 Nov 2026" [ref=f1e459]:
                  - generic [ref=f1e461]: New booking
              - gridcell "Friday, 27 Nov 2026 · 1 booking" [ref=f1e462] [cursor=pointer]:
                - generic [ref=f1e463]:
                  - generic [ref=f1e464]: "27"
                  - generic [ref=f1e467]: "1"
                - button "Wedding · Citra & Reza, Partially paid" [ref=f1e468]:
                  - generic [ref=f1e470]: Wedding · Citra & Reza
              - gridcell "Saturday, 28 Nov 2026 · 2 bookings" [ref=f1e471] [cursor=pointer]:
                - generic [ref=f1e472]:
                  - generic [ref=f1e473]: "28"
                  - generic [ref=f1e476]: "2"
                - button "Birthday · Alya 17th, Draft" [ref=f1e477]:
                  - generic [ref=f1e479]: Birthday · Alya 17th
                - button "Launch Event · Tokoku, Partially paid" [ref=f1e480]:
                  - generic [ref=f1e482]: Launch Event · Tokoku
              - gridcell "Sunday, 29 Nov 2026" [ref=f1e483] [cursor=pointer]:
                - generic [ref=f1e484]: "29"
                - button "New booking on Sunday, 29 Nov 2026" [ref=f1e487]:
                  - generic [ref=f1e489]: New booking
            - row [ref=f1e490]:
              - gridcell "Monday, 30 Nov 2026" [ref=f1e491] [cursor=pointer]:
                - generic [ref=f1e492]: "30"
                - button "New booking on Monday, 30 Nov 2026" [ref=f1e495]:
                  - generic [ref=f1e497]: New booking
              - gridcell "Tuesday, 1 Dec 2026" [ref=f1e498] [cursor=pointer]:
                - generic [ref=f1e499]: "1"
                - button "New booking on Tuesday, 1 Dec 2026" [ref=f1e502]:
                  - generic [ref=f1e504]: New booking
              - gridcell "Wednesday, 2 Dec 2026" [ref=f1e505] [cursor=pointer]:
                - generic [ref=f1e506]: "2"
                - button "New booking on Wednesday, 2 Dec 2026" [ref=f1e509]:
                  - generic [ref=f1e511]: New booking
              - gridcell "Thursday, 3 Dec 2026" [ref=f1e512] [cursor=pointer]:
                - generic [ref=f1e513]: "3"
                - button "New booking on Thursday, 3 Dec 2026" [ref=f1e516]:
                  - generic [ref=f1e518]: New booking
              - gridcell "Friday, 4 Dec 2026" [ref=f1e519] [cursor=pointer]:
                - generic [ref=f1e520]: "4"
                - button "New booking on Friday, 4 Dec 2026" [ref=f1e523]:
                  - generic [ref=f1e525]: New booking
              - gridcell "Saturday, 5 Dec 2026 · 1 booking" [ref=f1e526] [cursor=pointer]:
                - generic [ref=f1e527]:
                  - generic [ref=f1e528]: "5"
                  - generic [ref=f1e531]: "1"
                - button "Wedding · Maya & Teguh, Partially paid" [ref=f1e532]:
                  - generic [ref=f1e534]: Wedding · Maya & Teguh
              - gridcell "Sunday, 6 Dec 2026" [ref=f1e535] [cursor=pointer]:
                - generic [ref=f1e536]: "6"
                - button "New booking on Sunday, 6 Dec 2026" [ref=f1e539]:
                  - generic [ref=f1e541]: New booking
      - complementary "Upcoming and insights" [ref=f1e542]:
        - generic [ref=f1e543]:
          - heading "Upcoming" [level=2] [ref=f1e546]
          - generic [ref=f1e548]: Next 7 days
        - list [ref=f1e549]:
          - listitem [ref=f1e550]:
            - button "TODAY 10 Graduation · Aulia Silver Package · 2 items Partially paid Rp 1.750.000 due" [ref=f1e551] [cursor=pointer]:
              - generic [ref=f1e552]:
                - generic [ref=f1e553]: TODAY
                - generic [ref=f1e554]: "10"
              - generic [ref=f1e555]:
                - generic [ref=f1e556]: Graduation · Aulia
                - generic [ref=f1e557]: Silver Package · 2 items
                - generic [ref=f1e559]:
                  - generic [ref=f1e560]: Partially paid
                  - generic [ref=f1e564]: Rp 1.750.000 due
          - listitem [ref=f1e565]:
            - button "TODAY 10 Family Session · Hartono Basic Package Draft Rp 2.000.000 due" [ref=f1e566] [cursor=pointer]:
              - generic [ref=f1e567]:
                - generic [ref=f1e568]: TODAY
                - generic [ref=f1e569]: "10"
              - generic [ref=f1e570]:
                - generic [ref=f1e571]: Family Session · Hartono
                - generic [ref=f1e572]: Basic Package
                - generic [ref=f1e574]:
                  - generic [ref=f1e575]: Draft
                  - generic [ref=f1e579]: Rp 2.000.000 due
          - listitem [ref=f1e580]:
            - button "THU 12 Wedding · Sari & Dimas Gold Package · 3 items Partially paid Rp 7.500.000 due" [ref=f1e581] [cursor=pointer]:
              - generic [ref=f1e582]:
                - generic [ref=f1e583]: THU
                - generic [ref=f1e584]: "12"
              - generic [ref=f1e585]:
                - generic [ref=f1e586]: Wedding · Sari & Dimas
                - generic [ref=f1e587]: Gold Package · 3 items
                - generic [ref=f1e589]:
                  - generic [ref=f1e590]: Partially paid
                  - generic [ref=f1e594]: Rp 7.500.000 due
          - listitem [ref=f1e595]:
            - button "SAT 14 Prewedding · Nadia & Fajar Silver Package · 2 items Partially paid Rp 3.150.000 due" [ref=f1e596] [cursor=pointer]:
              - generic [ref=f1e597]:
                - generic [ref=f1e598]: SAT
                - generic [ref=f1e599]: "14"
              - generic [ref=f1e600]:
                - generic [ref=f1e601]: Prewedding · Nadia & Fajar
                - generic [ref=f1e602]: Silver Package · 2 items
                - generic [ref=f1e604]:
                  - generic [ref=f1e605]: Partially paid
                  - generic [ref=f1e609]: Rp 3.150.000 due
        - button "See all in table" [ref=f1e610] [cursor=pointer]
        - heading "Needs attention" [level=2] [ref=f1e612]
        - article [ref=f1e613]:
          - generic [ref=f1e614]:
            - heading "Balance due today" [level=3] [ref=f1e617]
            - generic [ref=f1e618]: 2h ago
          - paragraph [ref=f1e619]: Graduation · Aulia is today and still has Rp 1.750.000 outstanding.
          - button "View booking" [ref=f1e621] [cursor=pointer]
        - article [ref=f1e623]:
          - generic [ref=f1e624]:
            - heading "Balance before event" [level=3] [ref=f1e627]
            - generic [ref=f1e628]: today
          - paragraph [ref=f1e629]: 3 bookings this week are still on DP — Rp 12.400.000 outstanding.
          - button "View bookings" [ref=f1e631] [cursor=pointer]
  - alert [ref=f1e633]
  - dialog "Booking detail" [ref=f1e636]:
    - banner [ref=f1e637]:
      - generic [ref=f1e638]:
        - generic [ref=f1e639]: BK-2026-0142
        - generic [ref=f1e640]: Partially paid
        - button "Open full page" [ref=f1e644] [cursor=pointer]
        - button "Close" [ref=f1e649] [cursor=pointer]
      - heading "Wedding · Sari & Dimas" [level=2] [ref=f1e653]
      - generic [ref=f1e655]:
        - button "Edit booking" [ref=f1e656] [cursor=pointer]
        - button "Download latest PDF" [ref=f1e661] [cursor=pointer]
    - generic [ref=f1e666]:
      - region "Financial summary" [ref=f1e667]:
        - generic [ref=f1e668]:
          - generic [ref=f1e669]:
            - term [ref=f1e670]:
              - generic [ref=f1e671]: Total booking
            - definition [ref=f1e672]:
              - generic [ref=f1e673]: Rp 12.500.000
          - generic [ref=f1e674]:
            - term [ref=f1e675]:
              - generic [ref=f1e676]: Total paid
            - definition [ref=f1e677]:
              - generic [ref=f1e678]: Rp 5.000.000
          - generic [ref=f1e679]:
            - term [ref=f1e680]:
              - generic [ref=f1e681]: Remaining
            - definition [ref=f1e682]:
              - generic [ref=f1e683]: Rp 7.500.000
        - progressbar "Paid" [ref=f1e684]
        - generic [ref=f1e686]: 40% paid · balance due before 12 Nov 2026
      - region "Booking information" [ref=f1e687]:
        - heading "Booking information" [level=3] [ref=f1e688]
        - generic [ref=f1e690]:
          - generic [ref=f1e691]: Client
          - generic [ref=f1e696]: Sari Wulandari
        - generic [ref=f1e697]:
          - generic [ref=f1e698]: Phone
          - link "+62 812-3456-7890 (WhatsApp, opens in a new tab)" [ref=f1e702] [cursor=pointer]:
            - /url: https://wa.me/6281234567890
            - generic [ref=f1e703]: +62 812-3456-7890
        - generic [ref=f1e704]:
          - generic [ref=f1e705]: Booking date
          - generic [ref=f1e709]: Thu, 12 Nov 2026
        - generic [ref=f1e710]:
          - generic [ref=f1e711]: Package
          - generic [ref=f1e717]: Gold Package · Rp 10.000.000
        - generic [ref=f1e718]:
          - generic [ref=f1e719]: Payment
          - generic [ref=f1e724]: Bank BCA · 1234567890 · a.n. bs.moment Studio
        - generic [ref=f1e725]:
          - generic [ref=f1e726]: Crew
          - generic [ref=f1e733]:
            - button "Raka Pratama — show schedule" [ref=f1e734] [cursor=pointer]:
              - generic [ref=f1e736]: RP
              - generic [ref=f1e737]: Raka Pratama
            - button "Dinda Ayu — show schedule" [ref=f1e738] [cursor=pointer]:
              - generic [ref=f1e740]: DA
              - generic [ref=f1e741]: Dinda Ayu
            - button "Nadia Putri — show schedule" [ref=f1e742] [cursor=pointer]:
              - generic [ref=f1e744]: NP
              - generic [ref=f1e745]: Nadia Putri
        - generic [ref=f1e746]:
          - generic [ref=f1e747]: Created
          - generic [ref=f1e752]: 10 Oct 2026 by Admin
      - region "Additional items (3)" [ref=f1e753]:
        - heading "Additional items (3)" [level=3] [ref=f1e754]
        - generic [ref=f1e756]:
          - generic [ref=f1e757]: Extra hour
          - generic [ref=f1e758]: 2 × Rp 500.000
          - generic [ref=f1e759]: Rp 1.000.000
        - generic [ref=f1e760]:
          - generic [ref=f1e761]: Printed album 20×30
          - generic [ref=f1e762]: 1 × Rp 750.000
          - generic [ref=f1e763]: Rp 750.000
        - generic [ref=f1e764]:
          - generic [ref=f1e765]: Guest photobooth
          - generic [ref=f1e766]: 1 × Rp 750.000
          - generic [ref=f1e767]: Rp 750.000
      - separator [ref=f1e768]
      - region "Invoices (2)" [ref=f1e769]:
        - generic [ref=f1e770]:
          - heading "Invoices (2)" [level=3] [ref=f1e771]
          - generic [ref=f1e773]: Linked to this booking
        - article "Invoice INV-2026-0201" [ref=f1e774]:
          - generic [ref=f1e775]:
            - generic [ref=f1e780]:
              - generic [ref=f1e781]: INV-2026-0201
              - generic [ref=f1e782]: Issued 01 Nov 2026, 10:15
            - generic [ref=f1e783]: Rp 2.000.000
          - generic [ref=f1e784]:
            - paragraph [ref=f1e785]: "Paid after this invoice: Rp 5.000.000 of Rp 12.500.000"
            - button "Download PDF (INV-2026-0201)" [ref=f1e786] [cursor=pointer]:
              - generic [ref=f1e790]: Download PDF
        - article "Invoice INV-2026-0187" [ref=f1e791]:
          - generic [ref=f1e792]:
            - generic [ref=f1e797]:
              - generic [ref=f1e798]: INV-2026-0187
              - generic [ref=f1e799]: Issued 10 Oct 2026, 09:48
            - generic [ref=f1e800]: Rp 3.000.000
          - generic [ref=f1e801]:
            - paragraph [ref=f1e802]: "Paid after this invoice: Rp 3.000.000 of Rp 12.500.000"
            - button "Download PDF (INV-2026-0187)" [ref=f1e803] [cursor=pointer]:
              - generic [ref=f1e807]: Download PDF
  - alertdialog "Couldn’t generate the invoice PDF" [ref=f1e810]:
    - generic [ref=f1e817]:
      - heading "Couldn’t generate the invoice PDF" [level=2] [ref=f1e818]
      - paragraph [ref=f1e819]: INV-2026-0201 is saved — only the PDF file couldn’t be created. Try again, or cancel and download it later from the invoice card.
    - contentinfo [ref=f1e820]:
      - button "Cancel" [ref=f1e821] [cursor=pointer]
      - button "Try again" [ref=f1e823] [cursor=pointer]
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
      |                                            ^ Error: bookings-37 diff ratio
  156 | }
  157 | 
```