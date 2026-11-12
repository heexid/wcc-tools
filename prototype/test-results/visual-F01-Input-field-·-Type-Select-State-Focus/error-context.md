# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual/F01.spec.ts >> Input field · Type=Select, State=Focus
- Location: tests/visual/F01.spec.ts:20:3

# Error details

```
Error: f01-input-field--type-select-state-focus: differing pixels on flat areas

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    613
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - heading "CIR components · F1" [level=1] [ref=e3]
    - generic [ref=e4]:
      - heading "Button" [level=2] [ref=e5]
      - generic [ref=e6]:
        - figure "Variant=Primary, State=Default, Content=Label" [ref=e7]:
          - button "Button" [ref=e10] [cursor=pointer]
        - figure "Variant=Primary, State=Default, Content=Leading icon" [ref=e12]:
          - button "Button" [ref=e15] [cursor=pointer]
        - figure "Variant=Primary, State=Default, Content=Icon only" [ref=e18]:
          - button "Button" [ref=e21] [cursor=pointer]
        - figure "Variant=Primary, State=Hover, Content=Label" [ref=e23]:
          - button "Button" [ref=e26] [cursor=pointer]
        - figure "Variant=Primary, State=Hover, Content=Leading icon" [ref=e28]:
          - button "Button" [ref=e31] [cursor=pointer]
        - figure "Variant=Primary, State=Hover, Content=Icon only" [ref=e34]:
          - button "Button" [ref=e37] [cursor=pointer]
        - figure "Variant=Primary, State=Pressed, Content=Label" [ref=e39]:
          - button "Button" [ref=e42] [cursor=pointer]
        - figure "Variant=Primary, State=Pressed, Content=Leading icon" [ref=e44]:
          - button "Button" [ref=e47] [cursor=pointer]
        - figure "Variant=Primary, State=Pressed, Content=Icon only" [ref=e50]:
          - button "Button" [ref=e53] [cursor=pointer]
        - figure "Variant=Primary, State=Focus, Content=Label" [ref=e55]:
          - button "Button" [ref=e58] [cursor=pointer]
        - figure "Variant=Primary, State=Focus, Content=Leading icon" [ref=e60]:
          - button "Button" [ref=e63] [cursor=pointer]
        - figure "Variant=Primary, State=Focus, Content=Icon only" [ref=e66]:
          - button "Button" [ref=e69] [cursor=pointer]
        - figure "Variant=Primary, State=Disabled, Content=Label" [ref=e71]:
          - button "Button" [disabled] [ref=e74]
        - figure "Variant=Primary, State=Disabled, Content=Leading icon" [ref=e76]:
          - button "Button" [disabled] [ref=e79]
        - figure "Variant=Primary, State=Disabled, Content=Icon only" [ref=e82]:
          - button "Button" [disabled] [ref=e85]
        - figure "Variant=Secondary, State=Default, Content=Label" [ref=e87]:
          - button "Button" [ref=e90] [cursor=pointer]
        - figure "Variant=Secondary, State=Default, Content=Leading icon" [ref=e92]:
          - button "Button" [ref=e95] [cursor=pointer]
        - figure "Variant=Secondary, State=Default, Content=Icon only" [ref=e98]:
          - button "Button" [ref=e101] [cursor=pointer]
        - figure "Variant=Secondary, State=Hover, Content=Label" [ref=e103]:
          - button "Button" [ref=e106] [cursor=pointer]
        - figure "Variant=Secondary, State=Hover, Content=Leading icon" [ref=e108]:
          - button "Button" [ref=e111] [cursor=pointer]
        - figure "Variant=Secondary, State=Hover, Content=Icon only" [ref=e114]:
          - button "Button" [ref=e117] [cursor=pointer]
        - figure "Variant=Secondary, State=Pressed, Content=Label" [ref=e119]:
          - button "Button" [ref=e122] [cursor=pointer]
        - figure "Variant=Secondary, State=Pressed, Content=Leading icon" [ref=e124]:
          - button "Button" [ref=e127] [cursor=pointer]
        - figure "Variant=Secondary, State=Pressed, Content=Icon only" [ref=e130]:
          - button "Button" [ref=e133] [cursor=pointer]
        - figure "Variant=Secondary, State=Focus, Content=Label" [ref=e135]:
          - button "Button" [ref=e138] [cursor=pointer]
        - figure "Variant=Secondary, State=Focus, Content=Leading icon" [ref=e140]:
          - button "Button" [ref=e143] [cursor=pointer]
        - figure "Variant=Secondary, State=Focus, Content=Icon only" [ref=e146]:
          - button "Button" [ref=e149] [cursor=pointer]
        - figure "Variant=Secondary, State=Disabled, Content=Label" [ref=e151]:
          - button "Button" [disabled] [ref=e154]
        - figure "Variant=Secondary, State=Disabled, Content=Leading icon" [ref=e156]:
          - button "Button" [disabled] [ref=e159]
        - figure "Variant=Secondary, State=Disabled, Content=Icon only" [ref=e162]:
          - button "Button" [disabled] [ref=e165]
        - figure "Variant=Ghost, State=Default, Content=Label" [ref=e167]:
          - button "Button" [ref=e170] [cursor=pointer]
        - figure "Variant=Ghost, State=Default, Content=Leading icon" [ref=e172]:
          - button "Button" [ref=e175] [cursor=pointer]
        - figure "Variant=Ghost, State=Default, Content=Icon only" [ref=e178]:
          - button "Button" [ref=e181] [cursor=pointer]
        - figure "Variant=Ghost, State=Hover, Content=Label" [ref=e183]:
          - button "Button" [ref=e186] [cursor=pointer]
        - figure "Variant=Ghost, State=Hover, Content=Leading icon" [ref=e188]:
          - button "Button" [ref=e191] [cursor=pointer]
        - figure "Variant=Ghost, State=Hover, Content=Icon only" [ref=e194]:
          - button "Button" [ref=e197] [cursor=pointer]
        - figure "Variant=Ghost, State=Pressed, Content=Label" [ref=e199]:
          - button "Button" [ref=e202] [cursor=pointer]
        - figure "Variant=Ghost, State=Pressed, Content=Leading icon" [ref=e204]:
          - button "Button" [ref=e207] [cursor=pointer]
        - figure "Variant=Ghost, State=Pressed, Content=Icon only" [ref=e210]:
          - button "Button" [ref=e213] [cursor=pointer]
        - figure "Variant=Ghost, State=Focus, Content=Label" [ref=e215]:
          - button "Button" [ref=e218] [cursor=pointer]
        - figure "Variant=Ghost, State=Focus, Content=Leading icon" [ref=e220]:
          - button "Button" [ref=e223] [cursor=pointer]
        - figure "Variant=Ghost, State=Focus, Content=Icon only" [ref=e226]:
          - button "Button" [ref=e229] [cursor=pointer]
        - figure "Variant=Ghost, State=Disabled, Content=Label" [ref=e231]:
          - button "Button" [disabled] [ref=e234]
        - figure "Variant=Ghost, State=Disabled, Content=Leading icon" [ref=e236]:
          - button "Button" [disabled] [ref=e239]
        - figure "Variant=Ghost, State=Disabled, Content=Icon only" [ref=e242]:
          - button "Button" [disabled] [ref=e245]
        - figure "Variant=Primary, State=Loading, Content=Leading icon" [ref=e247]:
          - button "Button" [disabled] [ref=e250]
    - generic [ref=e254]:
      - heading "Warning button" [level=2] [ref=e255]
      - generic [ref=e256]:
        - figure "State=Default" [ref=e257]:
          - button "Cancel booking" [ref=e260] [cursor=pointer]
        - figure "State=Hover" [ref=e266]:
          - button "Cancel booking" [ref=e269] [cursor=pointer]
        - figure "State=Disabled" [ref=e275]:
          - button "Cancel booking" [disabled] [ref=e278]
    - generic [ref=e284]:
      - heading "Input field" [level=2] [ref=e285]
      - generic [ref=e286]:
        - figure "Type=Text, State=Default" [ref=e287]:
          - generic [ref=e290]:
            - generic [ref=e291]:
              - generic [ref=e292]: Label
              - generic [aria-hidden] [ref=e293]: "*"
            - textbox "Label" [ref=e295]:
              - /placeholder: Value
        - figure "Type=Text, State=Hover" [ref=e296]:
          - generic [ref=e299]:
            - generic [ref=e300]:
              - generic [ref=e301]: Label
              - generic [aria-hidden] [ref=e302]: "*"
            - textbox "Label" [ref=e304]:
              - /placeholder: Value
        - figure "Type=Text, State=Filled" [ref=e305]:
          - generic [ref=e308]:
            - generic [ref=e309]:
              - generic [ref=e310]: Label
              - generic [aria-hidden] [ref=e311]: "*"
            - textbox "Label" [ref=e313]:
              - /placeholder: Value
              - text: Value
        - figure "Type=Text, State=Focus" [ref=e314]:
          - generic [ref=e317]:
            - generic [ref=e318]:
              - generic [ref=e319]: Label
              - generic [aria-hidden] [ref=e320]: "*"
            - textbox "Label" [ref=e322]:
              - /placeholder: Value
              - text: Value
        - figure "Type=Text, State=Error" [ref=e323]:
          - generic [ref=e326]:
            - generic [ref=e327]:
              - generic [ref=e328]: Label
              - generic [aria-hidden] [ref=e329]: "*"
            - textbox "Label" [invalid] [ref=e331]:
              - /placeholder: Value
            - paragraph [ref=e332]: Helper text
        - figure "Type=Text, State=Disabled" [ref=e333]:
          - generic [ref=e336]:
            - generic [ref=e337]:
              - generic [ref=e338]: Label
              - generic [aria-hidden] [ref=e339]: "*"
            - textbox "Label" [disabled] [ref=e341]:
              - /placeholder: Value
        - figure "Type=Select, State=Default" [ref=e342]:
          - generic [ref=e345]:
            - generic [ref=e346]:
              - generic [ref=e347]: Label
              - generic [aria-hidden] [ref=e348]: "*"
            - button "Label" [ref=e350] [cursor=pointer]:
              - generic [ref=e351]: Value
        - figure "Type=Select, State=Hover" [ref=e354]:
          - generic [ref=e357]:
            - generic [ref=e358]:
              - generic [ref=e359]: Label
              - generic [aria-hidden] [ref=e360]: "*"
            - button "Label" [ref=e362] [cursor=pointer]:
              - generic [ref=e363]: Value
        - figure "Type=Select, State=Filled" [ref=e366]:
          - generic [ref=e369]:
            - generic [ref=e370]:
              - generic [ref=e371]: Label
              - generic [aria-hidden] [ref=e372]: "*"
            - button "Label" [ref=e374] [cursor=pointer]:
              - generic [ref=e375]: Value
        - figure "Type=Select, State=Focus" [ref=e378]:
          - generic [ref=e381]:
            - generic [ref=e382]:
              - generic [ref=e383]: Label
              - generic [aria-hidden] [ref=e384]: "*"
            - button "Label" [ref=e386] [cursor=pointer]:
              - generic [ref=e387]: Value
        - figure "Type=Select, State=Error" [ref=e390]:
          - generic [ref=e393]:
            - generic [ref=e394]:
              - generic [ref=e395]: Label
              - generic [aria-hidden] [ref=e396]: "*"
            - button "Label" [ref=e398] [cursor=pointer]:
              - generic [ref=e399]: Value
            - paragraph [ref=e402]: Helper text
        - figure "Type=Select, State=Disabled" [ref=e403]:
          - generic [ref=e406]:
            - generic [ref=e407]:
              - generic [ref=e408]: Label
              - generic [aria-hidden] [ref=e409]: "*"
            - button "Label" [disabled] [ref=e411]:
              - generic [ref=e412]: Value
        - figure "Type=Date, State=Default" [ref=e415]:
          - generic [ref=e418]:
            - generic [ref=e419]:
              - generic [ref=e420]: Label
              - generic [aria-hidden] [ref=e421]: "*"
            - button "Label" [ref=e423] [cursor=pointer]:
              - generic [ref=e426]: Value
        - figure "Type=Date, State=Hover" [ref=e427]:
          - generic [ref=e430]:
            - generic [ref=e431]:
              - generic [ref=e432]: Label
              - generic [aria-hidden] [ref=e433]: "*"
            - button "Label" [ref=e435] [cursor=pointer]:
              - generic [ref=e438]: Value
        - figure "Type=Date, State=Filled" [ref=e439]:
          - generic [ref=e442]:
            - generic [ref=e443]:
              - generic [ref=e444]: Label
              - generic [aria-hidden] [ref=e445]: "*"
            - button "Label" [ref=e447] [cursor=pointer]:
              - generic [ref=e450]: Value
        - figure "Type=Date, State=Focus" [ref=e451]:
          - generic [ref=e454]:
            - generic [ref=e455]:
              - generic [ref=e456]: Label
              - generic [aria-hidden] [ref=e457]: "*"
            - button "Label" [ref=e459] [cursor=pointer]:
              - generic [ref=e462]: Value
        - figure "Type=Date, State=Error" [ref=e463]:
          - generic [ref=e466]:
            - generic [ref=e467]:
              - generic [ref=e468]: Label
              - generic [aria-hidden] [ref=e469]: "*"
            - button "Label" [ref=e471] [cursor=pointer]:
              - generic [ref=e474]: Value
            - paragraph [ref=e475]: Helper text
        - figure "Type=Date, State=Disabled" [ref=e476]:
          - generic [ref=e479]:
            - generic [ref=e480]:
              - generic [ref=e481]: Label
              - generic [aria-hidden] [ref=e482]: "*"
            - button "Label" [disabled] [ref=e484]:
              - generic [ref=e487]: Value
        - figure "Type=Password, State=Default" [ref=e488]:
          - generic [ref=e491]:
            - generic [ref=e492]:
              - generic [ref=e493]: Label
              - generic [aria-hidden] [ref=e494]: "*"
            - generic [ref=e495]:
              - textbox "Label" [ref=e496]:
                - /placeholder: Value
              - button "Show password" [ref=e497] [cursor=pointer]
        - figure "Type=Password, State=Hover" [ref=e501]:
          - generic [ref=e504]:
            - generic [ref=e505]:
              - generic [ref=e506]: Label
              - generic [aria-hidden] [ref=e507]: "*"
            - generic [ref=e508]:
              - textbox "Label" [ref=e509]:
                - /placeholder: Value
              - button "Show password" [ref=e510] [cursor=pointer]
        - figure "Type=Password, State=Filled" [ref=e514]:
          - generic [ref=e517]:
            - generic [ref=e518]:
              - generic [ref=e519]: Label
              - generic [aria-hidden] [ref=e520]: "*"
            - generic [ref=e521]:
              - textbox "Label" [ref=e522]:
                - /placeholder: Value
                - text: Value
              - button "Show password" [ref=e523] [cursor=pointer]
        - figure "Type=Password, State=Focus" [ref=e527]:
          - generic [ref=e530]:
            - generic [ref=e531]:
              - generic [ref=e532]: Label
              - generic [aria-hidden] [ref=e533]: "*"
            - generic [ref=e534]:
              - textbox "Label" [ref=e535]:
                - /placeholder: Value
                - text: Value
              - button "Hide password" [ref=e536] [cursor=pointer]
        - figure "Type=Password, State=Error" [ref=e542]:
          - generic [ref=e545]:
            - generic [ref=e546]:
              - generic [ref=e547]: Label
              - generic [aria-hidden] [ref=e548]: "*"
            - generic [ref=e549]:
              - textbox "Label" [invalid] [ref=e550]:
                - /placeholder: Value
              - button "Show password" [ref=e551] [cursor=pointer]
            - paragraph [ref=e555]: Helper text
        - figure "Type=Password, State=Disabled" [ref=e556]:
          - generic [ref=e559]:
            - generic [ref=e560]:
              - generic [ref=e561]: Label
              - generic [aria-hidden] [ref=e562]: "*"
            - generic [ref=e563]:
              - textbox "Label" [disabled] [ref=e564]:
                - /placeholder: Value
              - button "Show password" [disabled] [ref=e565]
    - generic [ref=e569]:
      - heading "Text area" [level=2] [ref=e570]
      - generic [ref=e571]:
        - figure "State=Default" [ref=e572]:
          - generic [ref=e575]:
            - generic [ref=e576]: Terms & Conditions
            - textbox "Terms & Conditions" [ref=e579]:
              - /placeholder: Write terms shown on the invoice…
            - generic [ref=e580]:
              - paragraph [ref=e581]: Printed on every invoice for this booking
              - paragraph [ref=e582]: 0/255
        - figure "State=Hover" [ref=e583]:
          - generic [ref=e586]:
            - generic [ref=e587]: Terms & Conditions
            - textbox "Terms & Conditions" [ref=e590]:
              - /placeholder: Write terms shown on the invoice…
            - generic [ref=e591]:
              - paragraph [ref=e592]: Printed on every invoice for this booking
              - paragraph [ref=e593]: 0/255
        - figure "State=Filled" [ref=e594]:
          - generic [ref=e597]:
            - generic [ref=e598]: Terms & Conditions
            - textbox "Terms & Conditions" [ref=e601]:
              - /placeholder: Write terms shown on the invoice…
              - text: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
            - generic [ref=e602]:
              - paragraph [ref=e603]: Printed on every invoice for this booking
              - paragraph [ref=e604]: 174/255
        - figure "State=Focus" [ref=e605]:
          - generic [ref=e608]:
            - generic [ref=e609]: Terms & Conditions
            - textbox "Terms & Conditions" [ref=e612]:
              - /placeholder: Write terms shown on the invoice…
              - text: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
            - generic [ref=e613]:
              - paragraph [ref=e614]: Printed on every invoice for this booking
              - paragraph [ref=e615]: 174/255
        - figure "State=Error" [ref=e616]:
          - generic [ref=e619]:
            - generic [ref=e620]: Terms & Conditions
            - textbox "Terms & Conditions" [invalid] [ref=e623]:
              - /placeholder: Write terms shown on the invoice…
              - text: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
            - generic [ref=e624]:
              - paragraph [ref=e625]: Max 255 characters
              - paragraph [ref=e626]: 174/255
        - figure "State=Disabled" [ref=e627]:
          - generic [ref=e630]:
            - generic [ref=e631]: Terms & Conditions
            - textbox "Terms & Conditions" [disabled] [ref=e634]:
              - /placeholder: Write terms shown on the invoice…
              - text: Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.
            - generic [ref=e635]:
              - paragraph [ref=e636]: Printed on every invoice for this booking
              - paragraph [ref=e637]: 174/255
    - generic [ref=e638]:
      - heading "Search field" [level=2] [ref=e639]
      - generic [ref=e640]:
        - figure "State=Default" [ref=e641]:
          - searchbox "Search Invoice Number or Client Name" [ref=e647]
        - figure "State=Hover" [ref=e648]:
          - searchbox "Search Invoice Number or Client Name" [ref=e654]
        - figure "State=Filled" [ref=e655]:
          - generic [ref=e658]:
            - searchbox "Search Invoice Number or Client Name" [ref=e661]: INV-17
            - button "Clear search text" [ref=e662] [cursor=pointer]
        - figure "State=Focus" [ref=e667]:
          - generic [ref=e670]:
            - searchbox "Search Invoice Number or Client Name" [ref=e673]: INV-17
            - button "Clear search text" [ref=e674] [cursor=pointer]
    - generic [ref=e679]:
      - heading "Checkbox" [level=2] [ref=e680]
      - generic [ref=e681]:
        - figure "State=Unchecked" [ref=e682]:
          - checkbox "Select" [ref=e686] [cursor=pointer]
        - figure "State=Checked" [ref=e687]:
          - checkbox "Select" [checked] [ref=e691] [cursor=pointer]
        - figure "State=Indeterminate" [ref=e692]:
          - checkbox "Select" [checked=mixed] [ref=e696] [cursor=pointer]
        - figure "State=Disabled" [ref=e697]:
          - checkbox "Select" [disabled] [ref=e701]
    - generic [ref=e702]:
      - heading "Tab" [level=2] [ref=e703]
      - generic [ref=e704]:
        - figure "State=Active" [ref=e705]:
          - tab "Tab" [selected] [ref=e708] [cursor=pointer]
        - figure "State=Inactive" [ref=e710]:
          - tab "Tab" [ref=e713] [cursor=pointer]
        - figure "State=Hover" [ref=e715]:
          - tab "Tab" [ref=e718] [cursor=pointer]
    - generic [ref=e720]:
      - heading "Segmented control" [level=2] [ref=e721]
      - generic [ref=e722]:
        - figure "Selected=First" [ref=e723]:
          - radiogroup "Option" [ref=e726]:
            - radio "Option A" [checked] [ref=e727] [cursor=pointer]
            - radio "Option B" [ref=e729] [cursor=pointer]
        - figure "Selected=Second" [ref=e731]:
          - radiogroup "Option" [ref=e734]:
            - radio "Option A" [ref=e735] [cursor=pointer]
            - radio "Option B" [checked] [ref=e737] [cursor=pointer]
    - generic [ref=e739]:
      - heading "Pagination item" [level=2] [ref=e740]
      - generic [ref=e741]:
        - figure "Type=Page, State=Default" [ref=e742]:
          - button "1" [ref=e745] [cursor=pointer]
        - figure "Type=Page, State=Active" [ref=e747]:
          - button "1" [ref=e750] [cursor=pointer]
        - figure "Type=Nav, State=Default" [ref=e752]:
          - button "Next" [ref=e755] [cursor=pointer]
        - figure "Type=Nav, State=Disabled" [ref=e757]:
          - button "Previous" [disabled] [ref=e760]
    - generic [ref=e762]:
      - heading "Payment status badge" [level=2] [ref=e763]
      - generic [ref=e764]:
        - figure "Status=Draft" [ref=e765]:
          - generic [ref=e767]: Draft
        - figure "Status=Partially paid" [ref=e771]:
          - generic [ref=e773]: Partially paid
        - figure "Status=Paid" [ref=e777]:
          - generic [ref=e779]: Paid
        - figure "Status=Canceled" [ref=e783]:
          - generic [ref=e785]: Canceled
    - generic [ref=e789]:
      - heading "Invoice type tag" [level=2] [ref=e790]
      - generic [ref=e791]:
        - figure "Type=DP" [ref=e792]:
          - generic [ref=e794]: DP
        - figure "Type=Full" [ref=e797]:
          - generic [ref=e799]: Full
        - figure "Type=Partial" [ref=e802]:
          - generic [ref=e804]: Partial
        - figure "Type=Paid" [ref=e807]:
          - generic [ref=e809]: Paid
    - generic [ref=e812]:
      - heading "Trend badge" [level=2] [ref=e813]
      - generic [ref=e814]:
        - figure "Direction=Up, Tone=Negative" [ref=e815]:
          - generic [ref=e817]: 4.6%
        - figure "Direction=Down, Tone=Positive" [ref=e823]:
          - generic [ref=e825]: 4.6%
        - figure "Direction=Up, Tone=Positive" [ref=e831]:
          - generic [ref=e833]: 4.6%
        - figure "Direction=Down, Tone=Negative" [ref=e839]:
          - generic [ref=e841]: 4.6%
    - generic [ref=e847]:
      - heading "Avatar" [level=2] [ref=e848]
      - generic [ref=e849]:
        - figure "Size=24" [ref=e850]:
          - generic [ref=e852]: BS
        - figure "Size=32" [ref=e855]:
          - generic [ref=e857]: BS
        - figure "Size=38" [ref=e860]:
          - generic [ref=e862]: BS
    - generic [ref=e865]:
      - heading "Alert" [level=2] [ref=e866]
      - generic [ref=e867]:
        - figure "Tone=Danger" [ref=e868]:
          - alert [ref=e871]:
            - generic [ref=e874]:
              - paragraph [ref=e875]: Title
              - generic [ref=e876]: Supporting message that explains what to do next.
        - figure "Tone=Warning" [ref=e877]:
          - status [ref=e880]:
            - generic [ref=e883]:
              - paragraph [ref=e884]: Title
              - generic [ref=e885]: Supporting message that explains what to do next.
        - figure "Tone=Info" [ref=e886]:
          - status [ref=e889]:
            - generic [ref=e892]:
              - paragraph [ref=e893]: Title
              - generic [ref=e894]: Supporting message that explains what to do next.
        - figure "Tone=Success" [ref=e895]:
          - status [ref=e898]:
            - generic [ref=e902]:
              - paragraph [ref=e903]: Title
              - generic [ref=e904]: Supporting message that explains what to do next.
    - generic [ref=e905]:
      - heading "Toast" [level=2] [ref=e906]
      - generic [ref=e907]:
        - figure "Tone=Success" [ref=e908]:
          - status [ref=e911]:
            - generic [ref=e915]: Welcome back, bs.moment
        - figure "Tone=Info" [ref=e916]:
          - status [ref=e919]:
            - generic [ref=e922]: Welcome back, bs.moment
        - figure "Tone=Error" [ref=e923]:
          - alert [ref=e926]:
            - generic [ref=e929]: Welcome back, bs.moment
    - generic [ref=e930]:
      - heading "Metric card" [level=2] [ref=e931]
      - figure "Metric card" [ref=e933]:
        - generic [ref=e936]:
          - generic [ref=e937]:
            - heading "Total Open Invoices" [level=3] [ref=e938]
            - button "About Total Open Invoices" [ref=e941]
          - generic [ref=e946]:
            - paragraph [ref=e947]:
              - generic [ref=e948]: Rp 133.540
            - generic [ref=e949]:
              - generic [ref=e950]: 4.6%
              - generic [ref=e955]: last month
    - generic [ref=e956]:
      - heading "Modal" [level=2] [ref=e957]
      - figure "Modal" [ref=e959]:
        - dialog [ref=e962]:
          - generic [ref=e964]:
            - button "Close" [ref=e965] [cursor=pointer]
            - heading "Account Setting" [level=2] [ref=e970]
          - generic [ref=e971]:
            - heading "Section title" [level=3] [ref=e972]
            - generic [ref=e973]:
              - generic [ref=e974]:
                - generic [ref=e975]: Label
                - generic [aria-hidden] [ref=e976]: "*"
              - textbox "Label" [ref=e978]:
                - /placeholder: Value
          - generic [ref=e979]:
            - button "Cancel" [ref=e980] [cursor=pointer]
            - button "Save" [ref=e982] [cursor=pointer]
    - generic [ref=e984]:
      - heading "Shell/Popover" [level=2] [ref=e985]
      - generic [ref=e986]:
        - figure "Header=True" [ref=e987]:
          - generic [ref=e990]:
            - generic [ref=e992]:
              - button "Close" [ref=e993] [cursor=pointer]
              - heading "Title" [level=2] [ref=e998]
            - generic [ref=e999]: Swap content
        - figure "Header=False" [ref=e1001]:
          - generic [ref=e1003]: Swap content
    - generic [ref=e1007]:
      - heading "Menu item" [level=2] [ref=e1008]
      - generic [ref=e1009]:
        - figure "Tone=Default, State=Default" [ref=e1010]:
          - menuitem "Account Setting" [ref=e1013] [cursor=pointer]
        - figure "Tone=Default, State=Hover" [ref=e1018]:
          - menuitem "Account Setting" [ref=e1021] [cursor=pointer]
        - figure "Tone=Danger, State=Default" [ref=e1026]:
          - menuitem "Account Setting" [ref=e1029] [cursor=pointer]
        - figure "Tone=Danger, State=Hover" [ref=e1034]:
          - menuitem "Account Setting" [ref=e1037] [cursor=pointer]
    - heading "Table/Header" [level=2] [ref=e1043]
    - heading "Table/Row" [level=2] [ref=e1045]
    - generic [ref=e1046]:
      - heading "Table/Toolbar" [level=2] [ref=e1047]
      - figure "Table/Toolbar" [ref=e1049]:
        - generic [ref=e1052]:
          - tablist "Status" [ref=e1054]:
            - tab "All" [selected] [ref=e1055] [cursor=pointer]
            - tab "Open" [ref=e1057] [cursor=pointer]
            - tab "Paid" [ref=e1059] [cursor=pointer]
          - generic [ref=e1061]:
            - button "Delete" [ref=e1062] [cursor=pointer]
            - button "Paid" [ref=e1067] [cursor=pointer]
    - generic [ref=e1071]:
      - heading "Table/Footer" [level=2] [ref=e1072]
      - figure "Table/Footer" [ref=e1074]:
        - generic [ref=e1077]:
          - paragraph [ref=e1078]: Showing 1-10 of 1085 invoices
          - navigation "Pagination" [ref=e1079]:
            - button "Previous" [disabled] [ref=e1080]
            - generic [ref=e1082]:
              - button "Page 1" [ref=e1083] [cursor=pointer]:
                - generic [ref=e1084]: "1"
              - button "Page 2" [ref=e1085] [cursor=pointer]:
                - generic [ref=e1086]: "2"
              - button "Page 3" [ref=e1087] [cursor=pointer]:
                - generic [ref=e1088]: "3"
              - button "Page 4" [ref=e1089] [cursor=pointer]:
                - generic [ref=e1090]: "4"
              - button "Page 5" [ref=e1091] [cursor=pointer]:
                - generic [ref=e1092]: "5"
            - button "Next" [ref=e1093] [cursor=pointer]
  - alert [ref=e1095]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { mkdirSync, writeFileSync } from "node:fs";
  3  | import { join } from "node:path";
  4  | import { PNG } from "pngjs";
  5  | import variants from "../../public/__figma__/specs/F01-variants.json";
  6  | import { diffComponent, diffPngs, G3, G3C, readFigmaPng, settle } from "../helpers/visual";
  7  | 
  8  | // F1 — every CIR component variant vs its Figma component (exported with render bounds, so
  9  | // focus rings and shadows are compared too). Box = G2, pixels = G3.
  10 | const OUT = join(__dirname, "../../test-results/visual/f01");
  11 | 
  12 | test.describe.configure({ mode: "parallel", timeout: 60_000 });
  13 | 
  14 | test.beforeEach(async ({ page }) => {
  15 |   await page.goto("/dev/components");
  16 |   await settle(page);
  17 | });
  18 | 
  19 | for (const v of variants) {
  20 |   test(`${v.set} · ${v.variant}`, async ({ page }) => {
  21 |     const host = page.locator(`[data-figma="${v.file}"]`);
  22 |     test.skip((await host.count()) === 0, "not rendered in the gallery (out of F1 scope)");
  23 |     const el = host.locator(":scope > *").first();
  24 |     await el.scrollIntoViewIfNeeded();
  25 |     const box = (await el.boundingBox())!;
  26 | 
  27 |     // G2 — box. Hug-content nodes may differ by < 1px (Figma rounds text boxes up, F0 finding).
  28 |     // Focus variants: Figma drops the 1px inside stroke (node 71 vs 73) — the ring is compared in G3.
  29 |     const isFocusRing = v.set === "Button" && /Focus/.test(v.variant);
  30 |     const dw = box.width - v.w;
  31 |     const dh = box.height - v.h;
  32 |     test.info().annotations.push({ type: "G2", description: `${box.width.toFixed(2)}×${box.height.toFixed(2)} vs Figma ${v.w}×${v.h}` });
  33 |     if (!isFocusRing) {
  34 |       expect(Math.abs(dw), `width ${box.width} vs ${v.w}`).toBeLessThan(1);
  35 |       expect(Math.abs(dh), `height ${box.height} vs ${v.h}`).toBeLessThan(1);
  36 |     }
  37 | 
  38 |     // G3 — pixels. Align the node's top-left (Figma lays text out from the left edge; its box is only
  39 |     // wider because it rounds text up), then apply Figma's render-bounds offset. Focus variants: Figma's
  40 |     // node excludes the 1px border we keep, so its left edge is 1px inside ours.
  41 |     const expected = readFigmaPng(v.file);
  42 |     const inset = isFocusRing && !v.variant.includes("Ghost") && !v.variant.includes("Icon only") ? 1 : 0;
  43 |     const x = Math.round(box.x + inset + v.render.x);
  44 |     const y = Math.round(box.y + v.render.y);
  45 |     const buf = await page.screenshot({ clip: { x, y, width: expected.width, height: expected.height }, omitBackground: true });
  46 |     const actual = PNG.sync.read(buf);
  47 |     // Masks: regions where the Figma sample content is inconsistent (documented in the variants JSON).
  48 |     for (const m of (v as { mask?: { x: number; y: number; w: number; h: number }[] }).mask ?? [])
  49 |       for (let yy = m.y; yy < m.y + m.h; yy++)
  50 |         for (let xx = m.x; xx < m.x + m.w; xx++) {
  51 |           const i = (yy * expected.width + xx) * 4;
  52 |           expected.data.copy(actual.data, i, i, i + 4);
  53 |         }
  54 |     const res = diffPngs(actual, expected);
  55 |     mkdirSync(OUT, { recursive: true });
  56 |     writeFileSync(join(OUT, `${v.file}-actual.png`), buf);
  57 |     if (res.diff) writeFileSync(join(OUT, `${v.file}-diff.png`), PNG.sync.write(res.diff));
  58 |     expect(res.diffPixels, "capture size must equal the Figma export").not.toBe(-1);
  59 |     // Whole-image ratio is reported; the gate for components is G3c (flat = 0, edges ≤ 20%).
  60 |     const c = diffComponent(actual, expected)!;
  61 |     test.info().annotations.push({
  62 |       type: "G3",
  63 |       description: `${(res.ratio * 100).toFixed(2)}% (${res.diffPixels} px) · G3c flat ${c.flatDiffs} · edges ${c.edgeDiffs}/${c.edgeTotal} (${(c.edgeRatio * 100).toFixed(1)}%)`,
  64 |     });
  65 |     if (res.ratio <= G3.maxDiffPixelRatio) return; // already within the screen gate
  66 |     const accept = (v as { accept?: { flatDiffs: number } }).accept?.flatDiffs ?? 0; // documented per-variant exception
> 67 |     expect(c.flatDiffs, `${v.file}: differing pixels on flat areas`).toBeLessThanOrEqual(accept);
     |                                                                      ^ Error: f01-input-field--type-select-state-focus: differing pixels on flat areas
  68 |     expect(c.edgeRatio, `${v.file}: differing edge pixels`).toBeLessThanOrEqual(G3C.edgeRatio);
  69 |   });
  70 | }
  71 | 
  72 | test("Text area focus ring = Effect/Focus Ring token (G2, computed)", async ({ page }) => {
  73 |   await page.goto("/dev/components");
  74 |   const box = page.locator('[data-figma="f01-text-area--state-focus"] [data-force="focus"]');
  75 |   const shadow = await box.evaluate((e) => getComputedStyle(e).boxShadow);
  76 |   const token = await page.evaluate(() => {
  77 |     const p = document.createElement("div");
  78 |     p.style.boxShadow = "var(--shadow-focus-ring)";
  79 |     document.body.appendChild(p);
  80 |     return getComputedStyle(p).boxShadow;
  81 |   });
  82 |   // Tailwind stacks empty ring/shadow layers first; the painted layer is the last one.
  83 |   expect(shadow.endsWith(token)).toBe(true);
  84 | });
  85 | 
  86 | test("G3c self-test: a 1px shift of a component fails the gate", () => {
  87 |   for (const f of ["f01-button--variant-secondary-state-default-content-label", "f01-payment-status-badge--status-partially-paid", "f01-menu-item--tone-default-state-default"]) {
  88 |     const png = readFigmaPng(f);
  89 |     expect(diffComponent(png, png)!.flatDiffs).toBe(0);
  90 |     const shifted = new PNG({ width: png.width, height: png.height });
  91 |     PNG.bitblt(png, shifted, 1, 0, png.width - 1, png.height, 0, 0);
  92 |     const c = diffComponent(shifted, png)!;
  93 |     expect(c.flatDiffs > 0 || c.edgeRatio > G3C.edgeRatio, `${f} shifted: flat ${c.flatDiffs}, edges ${(c.edgeRatio * 100).toFixed(1)}%`).toBe(true);
  94 |   }
  95 | });
  96 | 
```