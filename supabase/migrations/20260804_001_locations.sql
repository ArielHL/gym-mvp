create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  address text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.locations enable row level security;

create policy if not exists "locations_read_all"
  on public.locations for select
  using (true);

create policy if not exists "locations_admin_insert"
  on public.locations for insert
  with check (public.is_admin());

create policy if not exists "locations_admin_update"
  on public.locations for update
  using (public.is_admin())
  with check (public.is_admin());
