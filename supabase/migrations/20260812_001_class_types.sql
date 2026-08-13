create table if not exists public.class_types (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  slug text not null unique,
  descripcion text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_types_slug_format_check check (slug ~ '^[a-z0-9-]+$')
);

create index if not exists class_types_active_sort_idx
  on public.class_types (is_active, sort_order, nombre);

insert into public.class_types (nombre, slug, descripcion, sort_order)
values
  ('Fuerza', 'fuerza', 'Entrenamientos orientados a desarrollar fuerza.', 10),
  ('Movilidad', 'movilidad', 'Clases enfocadas en movilidad articular y control corporal.', 20),
  ('Cardio', 'cardio', 'Sesiones para mejorar resistencia cardiovascular.', 30),
  ('Yoga', 'yoga', 'Prácticas de yoga para equilibrio, flexibilidad y respiración.', 40)
on conflict (slug) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

alter table public.class_types enable row level security;

create policy if not exists "class_types_read_all"
  on public.class_types for select
  using (true);

create policy if not exists "class_types_admin_insert"
  on public.class_types for insert
  with check (public.is_admin());

create policy if not exists "class_types_admin_update"
  on public.class_types for update
  using (public.is_admin())
  with check (public.is_admin());

create policy if not exists "class_types_admin_delete"
  on public.class_types for delete
  using (public.is_admin());
