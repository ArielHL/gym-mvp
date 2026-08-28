insert into public.trainers (name, document, email, created_by)
select distinct on (lower(trim(ct.trainer_name)))
  trim(ct.trainer_name),
  'PENDING',
  coalesce(
    nullif(
      trim(both '-' from lower(regexp_replace(trim(ct.trainer_name), '[^a-zA-Z0-9]+', '-', 'g'))),
      ''
    ),
    'trainer'
  ) || '@pending.local',
  (select p.id from public.profiles p where p.role = 'admin' order by p.created_at asc limit 1)
from public.class_templates ct
where ct.trainer_name is not null
  and trim(ct.trainer_name) <> ''
  and not exists (
    select 1
    from public.trainers t
    where lower(trim(t.name)) = lower(trim(ct.trainer_name))
  )
order by lower(trim(ct.trainer_name)), ct.created_at;

alter table public.class_templates
  add column if not exists trainer_id uuid references public.trainers(id);

update public.class_templates ct
set trainer_id = t.id
from public.trainers t
where ct.trainer_id is null
  and lower(trim(ct.trainer_name)) = lower(trim(t.name));

do $$
begin
  if exists (select 1 from public.class_templates where trainer_id is null) then
    raise exception 'Cannot migrate class_templates.trainer_name to trainer_id: one or more templates do not map to an existing trainers.name';
  end if;
end
$$;

alter table public.class_templates
  alter column trainer_id set not null,
  alter column trainer_name drop not null;

create index if not exists class_templates_trainer_id_idx
  on public.class_templates (trainer_id);

drop view if exists public.classes_feed;
drop view if exists public.bookings_feed;

create or replace view public.classes_feed as
select
  cs.id,
  ct.title,
  ct.description,
  coalesce(tr.name, ct.trainer_name) as trainer_name,
  ctype.nombre as exercise_type,
  ct.duration_minutes,
  extract(dow from (cs.scheduled_at at time zone 'UTC'))::int as day_of_week,
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
join public.class_types ctype on ctype.id = ct.class_type_id
left join public.locations lt on lt.id = ct.location_id
left join public.trainers tr on tr.id = ct.trainer_id
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
  b.attended,
  b.booked_at,
  ct.title,
  ct.description,
  coalesce(tr.name, ct.trainer_name) as trainer_name,
  ctype.nombre as exercise_type,
  ct.duration_minutes,
  extract(dow from (cs.scheduled_at at time zone 'UTC'))::int as day_of_week,
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
join public.class_types ctype on ctype.id = ct.class_type_id
left join public.locations bl on bl.id = b.location_id
left join public.locations lt on lt.id = ct.location_id
left join public.trainers tr on tr.id = ct.trainer_id;

grant select on public.classes_feed to anon, authenticated;
grant select on public.bookings_feed to authenticated;
