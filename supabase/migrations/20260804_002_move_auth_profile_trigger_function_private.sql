create schema if not exists private;
revoke all on schema private from public;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

alter function public.handle_new_auth_user_profile() set schema private;

revoke all on function private.handle_new_auth_user_profile() from public;
revoke all on function private.handle_new_auth_user_profile() from anon;
revoke all on function private.handle_new_auth_user_profile() from authenticated;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user_profile();
