-- P11 performance seed — LOCAL / STAGING ONLY, never production (PRODUCTION-PLAN P11, PRD §4.5).
-- Adds on top of the normal seed: 42 packages (50 total), 10 000 bookings over 2025–2027 with 0–3 items and
-- 1–3 crew each, and ~25 000 invoices that respect the invoice rules (DP / Full first, then Partial / Paid; never
-- more than the total). Inserted through the real triggers, so totals, paid amounts and statuses are correct.
--   docker exec -i supabase_db_wcc-tools-booking psql -U postgres < supabase/perf-seed.sql
do $$
declare
  first_names text[] := array['Sari','Budi','Rina','Andi','Dewi','Fajar','Nadia','Raka','Putri','Hendra','Maya','Bima','Citra','Yoga','Laras','Teguh','Aulia','Reza','Siti','Kevin'];
  last_names text[] := array['Wulandari','Hartono','Kartika','Pratama','Anggraini','Nugroho','Safitri','Santoso','Anjani','Gunawan','Kusuma','Maharani','Wijaya','Halim','Lestari','Puspita'];
  kinds text[] := array['Wedding','Prewedding','Engagement','Birthday','Graduation','Family Session','Corporate Gathering','Seminar','Product Shoot','Maternity'];
  pkg_ids uuid[];
  pkg_prices bigint[];
  crew_ids uuid[];
  i int; k int; n_inv int; b uuid; pkg int; total bigint; paid bigint; amt bigint;
  inv_seq int := 10000;
  d date;
  client text;
begin
  -- 42 more packages (50 in total).
  insert into public.packages (name, price, summary, description)
  select 'Perf Package ' || g, (500 + (g * 137) % 4500) * 10000, 'perf · ' || g, ''
  from generate_series(1, 42) g;

  select array_agg(id order by name), array_agg(price order by name) into pkg_ids, pkg_prices from public.packages where is_active;
  select array_agg(id order by name) into crew_ids from public.crew;

  for i in 1..10000 loop
    d := date '2025-01-01' + ((i * 7919) % 1095);               -- spread over three years
    client := first_names[1 + (i % 20)] || ' ' || last_names[1 + ((i / 20) % 16)];
    pkg := 1 + (i * 31) % array_length(pkg_ids, 1);
    insert into public.bookings (ref, booking_name, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot,
                                 booking_date, terms, payment_instruction, created_at)
    values ('BK-' || extract(year from d)::int || '-' || lpad((50000 + i)::text, 6, '0'),
            kinds[1 + (i % 10)] || ' · ' || client, client,
            '+628' || lpad(((i * 104729) % 1000000000)::text, 10, '1'),
            pkg_ids[pkg], 'Perf', pkg_prices[pkg], d, 'Perf terms.',
            '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}',
            (d - 30)::timestamptz)
    returning id into b;

    for k in 1..(i % 4) loop                                      -- 0–3 items
      insert into public.booking_items (booking_id, name, price, qty, position)
      values (b, 'Extra ' || k, 250000 * k, 1 + (i + k) % 3, k - 1);
    end loop;
    for k in 1..(1 + i % 3) loop                                  -- 1–3 crew
      insert into public.booking_crew (booking_id, crew_id, position)
      values (b, crew_ids[1 + (i + k) % array_length(crew_ids, 1)], k - 1) on conflict do nothing;
    end loop;

    -- 0–5 invoices (≈ 2.5 on average): DP or Full first, then Partial(s), maybe a final Paid.
    select total into total from public.bookings where id = b;
    n_inv := (i * 7) % 6;
    paid := 0;
    for k in 1..n_inv loop
      exit when paid >= total;
      inv_seq := inv_seq + 1;
      if k = 1 and n_inv = 1 then amt := total;                   -- Full
      elsif k = 1 then amt := total * 3 / 10;                     -- DP 30 %
      elsif k = n_inv then amt := total - paid;                   -- Paid
      else amt := least(total / 10, total - paid - 1);            -- Partial
      end if;
      exit when amt <= 0;
      insert into public.invoices (booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash, issued_at)
      values (b, 'INV-' || extract(year from d)::int || '-' || lpad(inv_seq::text, 6, '0'),
              case when k = 1 and n_inv = 1 then 'full' when k = 1 then 'dp' when k = n_inv then 'paid' else 'partial' end,
              case when k = 1 and n_inv > 1 then 'percentage' end,
              case when k = 1 and n_inv > 1 then 30 end,
              amt, '{"perf":true}', public.snapshot_hash('{"perf":true}'), (d - 20 + k)::timestamptz);
      paid := paid + amt;
    end loop;
  end loop;
end $$;

analyze public.bookings;
analyze public.booking_items;
analyze public.booking_crew;
analyze public.invoices;
