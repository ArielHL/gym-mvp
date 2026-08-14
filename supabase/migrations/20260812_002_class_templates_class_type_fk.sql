alter table public.class_templates
  add column if not exists class_type_id uuid references public.class_types(id);

insert into public.class_types (nombre, slug, descripcion, is_active, sort_order)
select
  initcap(replace(src.normalized_slug, '-', ' ')) as nombre,
  src.normalized_slug as slug,
  'Creado automaticamente desde class_templates.exercise_type',
  true,
  9000
from (
  select distinct
    regexp_replace(
      regexp_replace(lower(trim(ct.exercise_type)), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    ) as normalized_slug
  from public.class_templates ct
  where ct.class_type_id is null
    and ct.exercise_type is not null
    and trim(ct.exercise_type) <> ''
) as src
where src.normalized_slug <> ''
  and not exists (
    select 1
    from public.class_types ctype
    where ctype.slug = src.normalized_slug
  );

insert into public.class_types (nombre, slug, descripcion, is_active, sort_order)
select
  'Sin tipo',
  'sin-tipo',
  'Tipo de respaldo para plantillas sin valor de tipo previo',
  true,
  9999
where not exists (
  select 1
  from public.class_types
  where slug = 'sin-tipo'
);

update public.class_templates ct
set class_type_id = ctype.id,
    updated_at = now()
from public.class_types ctype
where ct.class_type_id is null
  and regexp_replace(
    regexp_replace(lower(trim(ct.exercise_type)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  ) = ctype.slug;

update public.class_templates ct
set class_type_id = ctype.id,
    updated_at = now()
from public.class_types ctype
where ct.class_type_id is null
  and ctype.slug = 'sin-tipo'
  and (ct.exercise_type is null or trim(ct.exercise_type) = '');

do $$
begin
  if exists (select 1 from public.class_templates where class_type_id is null) then
    raise exception 'Cannot migrate class_templates.exercise_type to class_type_id: one or more templates do not map to an existing class_types.slug';
  end if;
end
$$;

alter table public.class_templates
  alter column class_type_id set not null;

create index if not exists class_templates_class_type_id_idx
  on public.class_templates (class_type_id);
