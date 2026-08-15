-- Add user profile fields: address (Domicilio) and doc_number (Documento)
alter table public.profiles
  add column if not exists address text,
  add column if not exists doc_number text;