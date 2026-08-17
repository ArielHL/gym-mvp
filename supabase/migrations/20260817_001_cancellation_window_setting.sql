insert into public.admin_settings (key, value)
values ('cancellation_window_hours', '2'::jsonb)
on conflict (key) do nothing;