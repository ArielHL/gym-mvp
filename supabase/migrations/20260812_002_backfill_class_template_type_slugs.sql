update public.class_templates
set exercise_type = case lower(trim(exercise_type))
  when 'strength' then 'fuerza'
  when 'mobility' then 'movilidad'
  when 'cardio' then 'cardio'
  when 'yoga' then 'yoga'
  else exercise_type
end,
updated_at = now()
where lower(trim(exercise_type)) in ('strength', 'mobility', 'cardio', 'yoga');
