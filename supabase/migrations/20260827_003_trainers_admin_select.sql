drop policy if exists "trainers_read_all" on public.trainers;

create policy "trainers_admin_select"
  on public.trainers for select
  using (public.is_admin());
