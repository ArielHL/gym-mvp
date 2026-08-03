create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_settings'
      and policyname = 'admin_settings_admin_read'
  ) then
    create policy "admin_settings_admin_read"
      on public.admin_settings for select
      using (public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_settings'
      and policyname = 'admin_settings_admin_write'
  ) then
    create policy "admin_settings_admin_write"
      on public.admin_settings for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

insert into public.admin_settings (key, value)
values ('weeks_ahead_to_generate', '3'::jsonb)
on conflict (key) do nothing;
