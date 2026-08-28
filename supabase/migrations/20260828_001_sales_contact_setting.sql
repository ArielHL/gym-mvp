insert into public.admin_settings (key, value)
values (
  'sales_contact',
  '{"whatsapp":"","phone":"","email":"","message":""}'::jsonb
)
on conflict (key) do nothing;
