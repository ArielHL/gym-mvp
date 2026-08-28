insert into public.admin_settings (key, value)
values ('gym_branding', '{"name":"Flowly"}'::jsonb)
on conflict (key) do nothing;
