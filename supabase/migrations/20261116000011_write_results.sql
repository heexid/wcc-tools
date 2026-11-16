-- 011 · P7 review fixes for the write RPCs.
--  (5) Every write returns the finished prototype-shaped row (booking_row / invoice_json from 004), so the client
--      never needs a second read after a commit — a failed follow-up read used to report "couldn't save" for a
--      save that had succeeded, and the retry then conflicted with the user's own change.
--  (4) Create invoice with no unsaved edits sends the version it showed; someone else's newer save → conflict,
--      so an invoice is never priced on a total the user didn't see.
--  (6) A concurrent invoice that pushes total_paid past the edited total surfaces as the below-paid error
--      (booking_invalid), not as a raw check violation the UI reads as a connection problem.

-- Result for both invoice RPCs: the invoice, the booking after recompute, and the booking's invoices newest first.
create or replace function public.invoice_result(p_invoice_id uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'invoice', public.invoice_json(i),
    'booking', public.booking_row(b),
    'invoices', coalesce((select jsonb_agg(public.invoice_json(x) order by x.issued_at desc)
                            from public.invoices x where x.booking_id = b.id and x.voided_at is null), '[]'))
  from public.invoices i join public.bookings b on b.id = i.booking_id
  where i.id = p_invoice_id;
$$;

-- below_paid detail for a booking whose save tripped bookings_total_covers_paid.
create function public.below_paid_error(p_booking_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.raise_code('booking_invalid',
    jsonb_build_object('total', 'below_paid', 'minimumTotal', (select total_paid from public.bookings where id = p_booking_id))::text);
end;
$$;

drop function public.save_booking(jsonb);
create function public.save_booking(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
  v_constraint text;
begin
  perform public.require_admin();
  if payload ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(payload ->> 'id')) then
    perform public.raise_code('not_found', 'Booking not found.');
  end if;
  v_errors := public.booking_errors(payload);
  if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
  begin
    v_id := public.save_booking_tx(payload);
  exception when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    -- Only the total-vs-paid backstop is "below paid"; any other CHECK is a real error and surfaces as one.
    if v_constraint = 'bookings_total_covers_paid' and payload ->> 'id' is not null then
      perform public.below_paid_error(public.try_uuid(payload ->> 'id'));
    end if;
    raise;
  end;
  return (select public.booking_row(b) from public.bookings b where b.id = v_id);
end;
$$;

create or replace function public.save_booking_and_create_invoice(booking jsonb, invoice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
  v_seen text := nullif(invoice ->> 'expectedUpdatedAt', '');
  v_now_version text;
  v_constraint text;
begin
  perform public.require_admin();
  if booking is not null and jsonb_typeof(booking) <> 'null' then
    if booking ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(booking ->> 'id')) then
      perform public.raise_code('not_found', 'Booking not found.');
    end if;
    v_errors := public.booking_errors(booking);
    if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
    begin
      v_id := public.save_booking_tx(booking);
    exception when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_total_covers_paid' and booking ->> 'id' is not null then
        perform public.below_paid_error(public.try_uuid(booking ->> 'id'));
      end if;
      raise;
    end;
  else
    v_id := public.try_uuid(invoice ->> 'bookingId');
    -- No unsaved edits: still refuse if the booking changed since the screen loaded it (review P7 #4).
    if v_seen is not null then
      select public.iso_utc(updated_at) into v_now_version from public.bookings where id = v_id for update;
      if v_now_version is not null and v_now_version <> v_seen then
        perform public.raise_code('booking_invalid', '{"booking":"conflict"}');
      end if;
    end if;
  end if;
  return public.invoice_result(public.create_invoice_tx(
    v_id,
    invoice ->> 'type',
    invoice #>> '{dp,method}',
    case when jsonb_typeof(invoice #> '{dp,value}') = 'number' then (invoice #>> '{dp,value}')::numeric end,
    case when jsonb_typeof(invoice -> 'amount') = 'number' then (invoice ->> 'amount')::numeric end));
end;
$$;

drop function public.cancel_booking(uuid, text);
create function public.cancel_booking(booking_id uuid, reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = cancel_booking.booking_id for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  if b.status not in ('draft', 'partially_paid') then perform public.raise_code('not_allowed', 'Only Draft or Partially paid bookings can be canceled.'); end if;
  if char_length(coalesce(reason, '')) > 255 then perform public.raise_code('reason_too_long', 'Max 255 characters.'); end if;
  update public.bookings
     set canceled_at = now(), canceled_by = auth.uid(), cancel_reason = nullif(btrim(coalesce(reason, '')), '')
   where id = b.id
  returning * into b;
  return public.booking_row(b);
end;
$$;

revoke execute on function public.below_paid_error(uuid) from public, anon, authenticated;
revoke execute on function public.save_booking(jsonb) from public, anon;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
grant execute on function public.save_booking(jsonb) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
