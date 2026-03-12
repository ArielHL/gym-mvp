-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type booking_status as enum ('confirmed', 'cancelled');
create type session_status as enum ('scheduled', 'cancelled', 'completed');
create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');

-- Core profile table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  trainer_name text not null,
  exercise_type text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  capacity integer not null check (capacity > 0),
  difficulty_level difficulty_level not null default 'beginner',
  location text not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.class_templates(id) on delete cascade,
  scheduled_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, scheduled_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  status booking_status not null default 'confirmed',
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Views used by the mobile app
create or replace view public.classes_feed as
select
  cs.id,
  ct.title,
  ct.description,
  ct.trainer_name,
  ct.exercise_type,
  ct.duration_minutes,
  to_char(cs.scheduled_at at time zone 'UTC', 'YYYY-MM-DD') as date,
  to_char(cs.scheduled_at at time zone 'UTC', 'HH24:MI') as start_time,
  to_char((cs.scheduled_at + make_interval(mins => ct.duration_minutes)) at time zone 'UTC', 'HH24:MI') as end_time,
  cs.capacity,
  greatest(
    cs.capacity - (
      select count(*)::int from public.bookings b where b.session_id = cs.id and b.status = 'confirmed'
    ),
    0
  ) as available_spots,
  ct.difficulty_level,
  ct.location,
  cs.created_at,
  cs.updated_at
from public.class_sessions cs
join public.class_templates ct on ct.id = cs.template_id
where ct.is_active = true and cs.status = 'scheduled';

create or replace view public.bookings_feed as
select
  b.id as booking_id,
  b.user_id,
  cs.id as class_id,
  b.status,
  b.booked_at,
  ct.title,
  ct.description,
  ct.trainer_name,
  ct.exercise_type,
  ct.duration_minutes,
  to_char(cs.scheduled_at at time zone 'UTC', 'YYYY-MM-DD') as date,
  to_char(cs.scheduled_at at time zone 'UTC', 'HH24:MI') as start_time,
  to_char((cs.scheduled_at + make_interval(mins => ct.duration_minutes)) at time zone 'UTC', 'HH24:MI') as end_time,
  cs.capacity,
  greatest(
    cs.capacity - (
      select count(*)::int from public.bookings bx where bx.session_id = cs.id and bx.status = 'confirmed'
    ),
    0
  ) as available_spots,
  ct.difficulty_level,
  ct.location,
  cs.created_at,
  cs.updated_at
from public.bookings b
join public.class_sessions cs on cs.id = b.session_id
join public.class_templates ct on ct.id = cs.template_id;

-- Row level security
alter table public.profiles enable row level security;
alter table public.class_templates enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notification_tokens enable row level security;

-- Profiles policies
create policy if not exists "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy if not exists "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Classes policies
create policy if not exists "classes_read_all"
  on public.class_templates for select
  using (true);

create policy if not exists "classes_admin_write"
  on public.class_templates for all
  using (public.is_admin())
  with check (public.is_admin());

create policy if not exists "sessions_read_all"
  on public.class_sessions for select
  using (true);

create policy if not exists "sessions_admin_write"
  on public.class_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bookings policies
create policy if not exists "bookings_select_own"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy if not exists "bookings_insert_own"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy if not exists "bookings_update_own"
  on public.bookings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy if not exists "notification_tokens_select_own"
  on public.notification_tokens for select
  using (auth.uid() = user_id);

create policy if not exists "notification_tokens_insert_own"
  on public.notification_tokens for insert
  with check (auth.uid() = user_id);

create policy if not exists "notification_tokens_delete_own"
  on public.notification_tokens for delete
  using (auth.uid() = user_id);

grant select on public.classes_feed to anon, authenticated;
grant select on public.bookings_feed to authenticated;
