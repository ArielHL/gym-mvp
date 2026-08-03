drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.preserve_profile_role_for_non_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role = old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_profile_role_for_non_admin on public.profiles;

create trigger preserve_profile_role_for_non_admin
  before update on public.profiles
  for each row
  execute function public.preserve_profile_role_for_non_admin();
