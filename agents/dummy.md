# Bookings insert (Oct 2026 → Feb 2027)

Paste a query into **Supabase → SQL Editor → New query** and press **Run**. Run one section at a time.

---

## 1 · Insert bookings (Oct 2026 → Feb 2027)

Creates **30 bookings** with `booking_date` from **2026-10-03** to **2027-02-25** (every 5 days). Each booking gets:

- **Additional items:** 2–4 add-ons (extra hours, drone coverage, same-day video, and so on). Their prices add to the package price.
- **Crew:** 2 crew members, or 3 for a Platinum package.
- **Several invoices:** every booking has a DP, then one or more partial payments, and for paid bookings a final "paid" invoice. Amounts are worked out from each booking's live total, so they always add up.

Booking details look like real records:
- Booking names, client names and phone numbers come from the app's seed data (`supabase/seed.sql`). Each phone number is distinct and realistic.
- Each package matches its booking type (a wedding gets a Gold package, a birthday gets Basic, and so on). If a package name doesn't exist on your project, that booking uses an active package in rotation.
- Each booking is created before its booking date, 2–10 weeks earlier, and never in the future.
- Refs (`BK-2026-…`) and invoice numbers (`INV-2026-…`) come from the normal counters.
- Payment details come from your saved settings (`workspace_settings.default_payment`).

**Status:** every booking has at least one invoice, so none can be `draft` (the database sets a booking to `draft` only while it has no invoices). Past bookings are `paid`. Upcoming bookings are a mix of `partially_paid` and `paid`.

Expected result: `bookings_added = 30`, `first_date = 2026-10-03`, `last_date = 2027-02-25`, and every booking has ≥ 2 items, ≥ 2 invoices and ≥ 2 crew.

```sql
begin;

-- Guard: fail with a clear message instead of a null-column error.
do $$
begin
  if not exists (select 1 from public.packages where is_active) then
    raise exception 'No active packages. Create one in Package Library first.';
  end if;
  if not exists (select 1 from public.workspace_settings where default_payment is not null) then
    raise exception 'No default payment details. Set them in Account settings → Business information first.';
  end if;
  if (select count(*) from public.crew where is_active) < 2 then
    raise exception 'Need at least 2 active crew. Add crew first.';
  end if;
end $$;

with real_bookings as (
  select
    row_number() over () as g,
    booking_name,
    client_name,
    client_phone,
    package_name
  from (values
    ('Corporate Gathering · PT Arta', 'Hendra Gunawan', '+6289689304975', 'Corporate Package'),
    ('Engagement · Rina & Yoga', 'Rina Kartika', '+628984902409', 'Silver Package'),
    ('Birthday · Kenzo', 'Maya Kusuma', '+6285348830033', 'Basic Package'),
    ('Product Shoot · Kopi Nusa', 'Bima Santoso', '+628532560028', 'Corporate Package'),
    ('Graduation · Aulia', 'Aulia Rahma', '+628313941679', 'Silver Package'),
    ('Family Session · Hartono', 'Budi Hartono', '+6282109350117', 'Basic Package'),
    ('Wedding · Sari & Dimas', 'Sari Wulandari', '+6281860794193', 'Gold Package'),
    ('Prewedding · Nadia & Fajar', 'Nadia Safitri', '+628597763672', 'Silver Package'),
    ('Company Profile · BPR Jaya', 'Andi Pratama', '+6289605172872', 'Corporate Package'),
    ('Maternity · Dewi', 'Dewi Anggraini', '+628238968764', 'Basic Package'),
    ('Family Portrait · Wijaya', 'Hendra Wijaya', '+6285274995569', 'Basic Package'),
    ('Seminar · Univ. Nusantara', 'Rizky Maulana', '+628993659985', 'Event Package'),
    ('Wedding · Laras & Bima', 'Larasati Putri', '+628137444990', 'Platinum Package'),
    ('Aqiqah · Baby Arka', 'Siti Rahmawati', '+628782872168', 'Basic Package'),
    ('Engagement · Putri & Andre', 'Putri Anjani', '+628128756031', 'Silver Package'),
    ('Wedding · Citra & Reza', 'Citra Maharani', '+6281519782668', 'Gold Package'),
    ('Birthday · Alya 17th', 'Ratna Sari', '+6285913701215', 'Basic Package'),
    ('Launch Event · Tokoku', 'Kevin Halim', '+6289868007999', 'Event Package'),
    ('Prewedding · Yuni & Arif', 'Yuni Lestari', '+628216307040', 'Silver Package'),
    ('Wedding · Maya & Teguh', 'Maya Puspita', '+628587540556', 'Gold Package'),
    ('Wedding · Anisa & Rudi', 'Anisa Putri', '+6285123387963', 'Gold Package'),
    ('Prewedding · Lina & Hadi', 'Lina Marlina', '+628523428499', 'Silver Package'),
    ('Graduation · Farhan', 'Farhan Akbar', '+628833737935', 'Basic Package'),
    ('Family Session · Gunawan', 'Agus Gunawan', '+6282328170377', 'Basic Package'),
    ('Company Profile · CV Maju', 'Doni Saputra', '+628179533144', 'Corporate Package'),
    ('Seminar · Bank Sentosa', 'Rina Hapsari', '+6281287798204', 'Event Package'),
    ('Birthday · Naila 5th', 'Fitri Handayani', '+6289639678087', 'Basic Package'),
    ('Engagement · Sinta & Bayu', 'Sinta Maharani', '+6282312092757', 'Silver Package'),
    ('Maternity · Ayu', 'Ayu Lestari', '+6283870899259', 'Basic Package'),
    ('Wedding · Dian & Fikri', 'Dian Pertiwi', '+628588742773', 'Platinum Package')
  ) as v(booking_name, client_name, client_phone, package_name)
),
pkgs as (
  -- Active packages, numbered 0..n-1. Used for rotation when a seed package name is not on this project.
  select id, name, price, row_number() over (order by name) - 1 as idx
  from public.packages
  where is_active
),
cnt as (select count(*) as n from pkgs),
pay as (
  -- Same source the app uses: the most recently updated workspace settings row.
  select default_payment as payment
  from public.workspace_settings
  order by updated_at desc
  limit 1
),
planned as (
  select
    r.*,
    date '2026-10-03' + (((r.g - 1) * 5)::int) as booking_date
  from real_bookings r
),
timed as (
  select
    pl.*,
    -- Created 2–10 weeks before the booking date, varied time of day, never after the current time.
    least(
      pl.booking_date::timestamp at time zone 'Asia/Jakarta'
        - ((14 + (pl.g * 7) % 57) * interval '1 day')
        + ((pl.g * 97) % 1440) * interval '1 minute',
      now() - ((pl.g % 9) + 1) * interval '1 day'
    ) as created_at
  from planned pl
)
insert into public.bookings (
  booking_name, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot,
  booking_date, terms, payment_instruction, created_at, updated_at
)
select
  pl.booking_name,
  pl.client_name,
  pl.client_phone,
  coalesce(pn.id, pr.id),
  coalesce(pn.name, pr.name),
  coalesce(pn.price, pr.price),
  pl.booking_date,
  'Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.',
  pay.payment,
  pl.created_at,
  pl.created_at  -- updated_at starts equal to created_at
from timed pl
cross join cnt
cross join pay
left join pkgs pn on pn.name = pl.package_name
join pkgs pr on pr.idx = (pl.g - 1) % cnt.n
order by pl.g;

-- Additional items: every booking gets 2–4 add-ons. Inserted before invoices so the totals are final.
with new_b as (
  select id, package_name_snapshot, row_number() over (order by booking_date) as g
  from public.bookings
  where ref in (select ref from public.bookings order by ref desc limit 30)
)
insert into public.booking_items (booking_id, name, price, qty, position)
select b.id, i.name, i.price, i.qty, i.pos
from new_b b
cross join lateral (
  values
    ('Extra hour'::text,          500000::bigint, (1 + b.g % 2)::int, 0, true),
    ('Drone coverage',           1500000,         1,                  1, b.g % 3 = 0),
    ('Rush photo delivery',       500000,         1,                  2, b.g % 3 = 1),
    ('Printed photo frame',       350000,         1,                  3, b.g % 3 = 2),
    ('Same-day edit video',      2000000,         1,                  4, b.g % 4 = 0)
) as i(name, price, qty, pos, keep)
where i.keep;

-- Crew: 2 per booking, 3 for a Platinum package. Crew are picked in rotation, so no one is listed twice.
with new_b as (
  select id, package_name_snapshot, row_number() over (order by booking_date) as g
  from public.bookings
  where ref in (select ref from public.bookings order by ref desc limit 30)
),
crew_list as (
  select id, row_number() over (order by name) - 1 as idx
  from public.crew
  where is_active
),
cnt as (select count(*) as n from crew_list)
insert into public.booking_crew (booking_id, crew_id, position)
select b.id, c.id, j.k
from new_b b
cross join cnt
cross join generate_series(0, 2) as j(k)
join crew_list c on c.idx = (b.g + j.k) % cnt.n
where j.k < 2
   or (j.k = 2 and b.package_name_snapshot = 'Platinum Package' and cnt.n >= 3);

-- Invoices, using the app's own invoice function (same snapshot, number, hash and status rules).
-- Past bookings (before today, Jakarta time): DP, one partial, then paid.
-- Upcoming bookings: partially paid (two patterns) or paid in full, each with several invoices.
do $$
declare
  r record;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_total bigint;
  v_paid bigint;
begin
  for r in
    select id, booking_date, row_number() over (order by booking_date) as g
    from public.bookings
    where ref in (select ref from public.bookings order by ref desc limit 30)
    order by booking_date
  loop
    if r.booking_date < v_today then
      -- Past: paid. DP, a partial payment of half the balance, then the rest.
      perform public.create_invoice_tx(r.id, 'dp', 'percentage', case when r.g % 2 = 0 then 30 else 50 end, null);
      select b.total, b.total_paid into v_total, v_paid from public.bookings b where b.id = r.id;
      perform public.create_invoice_tx(r.id, 'partial', null, null, floor((v_total - v_paid)::numeric / 2));
      perform public.create_invoice_tx(r.id, 'paid', null, null, null);

    elsif r.g % 3 = 0 then
      -- Upcoming, partially paid: DP, then two partial payments.
      perform public.create_invoice_tx(r.id, 'dp', 'percentage', 30, null);
      select b.total, b.total_paid into v_total, v_paid from public.bookings b where b.id = r.id;
      perform public.create_invoice_tx(r.id, 'partial', null, null, floor((v_total - v_paid)::numeric / 2));
      select b.total, b.total_paid into v_total, v_paid from public.bookings b where b.id = r.id;
      perform public.create_invoice_tx(r.id, 'partial', null, null, floor((v_total - v_paid)::numeric / 2));

    elsif r.g % 3 = 1 then
      -- Upcoming, partially paid: 50% DP, then one partial payment.
      perform public.create_invoice_tx(r.id, 'dp', 'percentage', 50, null);
      select b.total, b.total_paid into v_total, v_paid from public.bookings b where b.id = r.id;
      perform public.create_invoice_tx(r.id, 'partial', null, null, floor((v_total - v_paid)::numeric / 2));

    else
      -- Upcoming, paid in full: DP, one partial payment, then paid.
      perform public.create_invoice_tx(r.id, 'dp', 'percentage', 30, null);
      select b.total, b.total_paid into v_total, v_paid from public.bookings b where b.id = r.id;
      perform public.create_invoice_tx(r.id, 'partial', null, null, floor((v_total - v_paid)::numeric / 2));
      perform public.create_invoice_tx(r.id, 'paid', null, null, null);
    end if;
  end loop;
end $$;

commit;

select count(*) as bookings_added, min(booking_date) as first_date, max(booking_date) as last_date
from public.bookings
where ref in (select ref from public.bookings order by ref desc limit 30);

select status, count(*) as bookings
from public.bookings
where ref in (select ref from public.bookings order by ref desc limit 30)
group by status order by status;

select min(items) as min_items, min(invoices) as min_invoices, min(crew) as min_crew, max(crew) as max_crew
from (
  select b.id,
    (select count(*) from public.booking_items i where i.booking_id = b.id) as items,
    (select count(*) from public.invoices v where v.booking_id = b.id) as invoices,
    (select count(*) from public.booking_crew c where c.booking_id = b.id) as crew
  from public.bookings b
  where b.ref in (select ref from public.bookings order by ref desc limit 30)
) s;
```

### Check per month

Counts only the 30 newest bookings (the highest refs), so it doesn't touch older bookings. Their `created_at` dates are backdated on purpose, so the time of insert can't be used to find them.

```sql
select to_char(booking_date, 'YYYY-MM') as month, count(*)
from public.bookings
where ref in (select ref from public.bookings order by ref desc limit 30)
group by 1 order by 1;
```

Expected: 2026-10 → 6, 2026-11 → 6, 2026-12 → 6, 2027-01 → 7, 2027-02 → 5.

---

## 2 · ⚠️ DELETE ALL BOOKINGS (destructive, no undo)

**Read before running.** The database is built so bookings are never deleted (the app uses *cancel* instead). This query gets around that:

- It **turns off** the `bookings_no_delete` trigger and the `invoices_append_only` trigger, deletes **every invoice** (financial records, including real ones), deletes **every booking** with its items and crew links, then turns the triggers back on.
- Invoice numbers already issued will not be reused, but the invoices themselves are gone for good.
- Make a backup first (*Database → Backups*, or export the tables) if any of this data is real.

```sql
begin;

alter table public.bookings disable trigger bookings_no_delete;
alter table public.invoices disable trigger invoices_append_only;

-- Invoices first: deleting them does not fire the recompute trigger. Deleting items while invoices
-- still exist would make total_paid > total on the parent and trip bookings_total_covers_paid.
delete from public.invoices;
delete from public.booking_crew;
delete from public.booking_items;
delete from public.bookings;

alter table public.bookings enable trigger bookings_no_delete;
alter table public.invoices enable trigger invoices_append_only;

commit;

select (select count(*) from public.bookings) as bookings_left,
       (select count(*) from public.invoices) as invoices_left;
```

Expected: `bookings_left = 0`, `invoices_left = 0`.

---

## 3 · ⚠️ DELETE ALL CREW (destructive, no undo)

- Removes **every crew member**, and their assignments on **every booking** (`booking_crew`). Bookings themselves stay.
- Crew are referenced by bookings, so the links are removed first.

```sql
begin;

delete from public.booking_crew;
delete from public.crew;

commit;

select count(*) as crew_left from public.crew;
```

Expected: `crew_left = 0`.

---

## Notes

- Sections 2 and 3 are not reversible from the SQL editor. Run them only when you mean to wipe the data.
- If section 1 is run again, it adds 30 more bookings on top of the existing ones.
