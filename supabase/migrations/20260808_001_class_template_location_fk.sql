alter table public.class_templates
  add column if not exists location_id uuid references public.locations(id);

update public.class_templates ct
set location_id = l.id
from public.locations l
where ct.location_id is null
  and lower(trim(ct.location)) = lower(trim(l.name));

do $$
begin
  if exists (select 1 from public.class_templates where location_id is null) then
    raise exception 'Cannot migrate class_templates.location to location_id: one or more templates do not map to an existing locations.name';
  end if;
end
$$;

alter table public.class_templates
  alter column location_id set not null,
  alter column location drop not null;

drop view if exists public.classes_feed;
drop view if exists public.bookings_feed;

create or replace view public.classes_feed as
select
  cs.id,
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
      select count(*)::int from public.bookings b where b.session_id = cs.id and b.status = 'confirmed'
    ),
    0
  ) as available_spots,
  ct.difficulty_level,
  coalesce(lt.name, ct.location) as location,
  ct.valid_from,
  ct.valid_until,
  cs.created_at,
  cs.updated_at
from public.class_sessions cs
join public.class_templates ct on ct.id = cs.template_id
left join public.locations lt on lt.id = ct.location_id
where ct.is_active = true
  and cs.status = 'scheduled'
  and (now() at time zone 'UTC')::date >= ct.valid_from
  and (ct.valid_until is null or (now() at time zone 'UTC')::date <= ct.valid_until)
  and (cs.scheduled_at at time zone 'UTC')::date >= (now() at time zone 'UTC')::date
  and (cs.scheduled_at at time zone 'UTC')::date >= ct.valid_from
  and (ct.valid_until is null or (cs.scheduled_at at time zone 'UTC')::date <= ct.valid_until);

create or replace view public.bookings_feed as
select
  b.id as booking_id,
  b.user_id,
  cs.id as class_id,
  b.location_id,
  bl.name as booking_location,
  bl.address as booking_location_address,
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
  coalesce(bl.name, lt.name, ct.location) as location,
  ct.valid_from,
  ct.valid_until,
  cs.created_at,
  cs.updated_at
from public.bookings b
join public.class_sessions cs on cs.id = b.session_id
join public.class_templates ct on ct.id = cs.template_id
left join public.locations bl on bl.id = b.location_id
left join public.locations lt on lt.id = ct.location_id;

grant select on public.classes_feed to anon, authenticated;
grant select on public.bookings_feed to authenticated;
