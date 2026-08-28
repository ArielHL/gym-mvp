create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  document text not null,
  tel text,
  email text not null,
  address text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trainers_active_name_idx
  on public.trainers (is_active, name);

alter table public.trainers enable row level security;

create policy "trainers_read_all"
  on public.trainers for select
  using (true);

create policy "trainers_admin_insert"
  on public.trainers for insert
  with check (public.is_admin());

create policy "trainers_admin_update"
  on public.trainers for update
  using (public.is_admin())
  with check (public.is_admin());
