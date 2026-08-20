-- Add per class-type image url (shown on the classes screen)
alter table public.class_types add column if not exists image_url text;

-- Backfill from the legacy hardcoded CLASS_IMAGES map
update public.class_types
set image_url = case slug
  when 'fuerza' then 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&q=70'
  when 'cardio' then 'https://images.unsplash.com/photo-1517963879433-6ad2171073fb?w=400&q=70'
  when 'yoga' then 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=70'
  when 'movilidad' then 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&q=70'
  else 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=70'
end
where image_url is null;

-- Seed the home hero carousel slides from the legacy HERO_SLIDES constant
insert into public.admin_settings (key, value)
values (
  'home_carousel_slides',
  '[{"id":"1","title":"Calisthenics\nFundamentals","sub":"Build real strength with bodyweight","tag":"BEGINNER","tagColor":"#22D3EE","imageUri":"https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80"},{"id":"2","title":"Advanced\nMuscle Up","sub":"Master the bar and ring movements","tag":"ADVANCED","tagColor":"#A855F7","imageUri":"https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80"},{"id":"3","title":"Handstand\nMastery","sub":"Balance, control and body awareness","tag":"INTERMEDIATE","tagColor":"#F59E0B","imageUri":"https://images.unsplash.com/photo-1576094168768-4078c686a1c5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGFuZHN0YW5kfGVufDB8fDB8fHww"}]'::jsonb
)
on conflict (key) do nothing;