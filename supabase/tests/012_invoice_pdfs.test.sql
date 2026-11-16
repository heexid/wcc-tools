-- P9 · the PDF bucket is private and the server role can set ONLY pdf_path.
begin;
select plan(5);
select is((select public from storage.buckets where id = 'invoices'), false, 'invoices bucket is private');
select ok(has_column_privilege('service_role', 'public.invoices', 'pdf_path', 'update'), 'service_role may update pdf_path');
select ok(not has_column_privilege('service_role', 'public.invoices', 'amount', 'update'), 'service_role may not update amount');
select ok(not has_column_privilege('service_role', 'public.invoices', 'snapshot', 'update'), 'service_role may not update the snapshot');
select ok(not has_table_privilege('authenticated', 'public.invoices', 'update'), 'API users may not update invoices at all');
select * from finish();
rollback;
