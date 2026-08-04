alter table public.bookings
  add column if not exists location_id uuid references public.locations(id);

drop view if exists public.bookings_feed;

create or replace view public.bookings_feed as
select
  b.id as booking_id,
  b.user_id,
  cs.id as class_id,
  b.location_id,
  l.name as booking_location,
  l.address as booking_location_address,
  b.status,
  b.booked_at,
  ct.title,
  ct.description,
  ct.trainer_name,
  ct.exercise_type,
  ct.duration_minutes,
  ct.day_of_week,
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
  coalesce(l.name, ct.location) as location,
  ct.valid_from,
  ct.valid_until,
  cs.created_at,
  cs.updated_at
from public.bookings b
join public.class_sessions cs on cs.id = b.session_id
join public.class_templates ct on ct.id = cs.template_id
left join public.locations l on l.id = b.location_id;

grant select on public.bookings_feed to authenticated;
