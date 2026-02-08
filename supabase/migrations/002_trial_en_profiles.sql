-- Ritual — Prueba gratuita guardada en BD (por usuario)
-- Ejecutá en Supabase: SQL Editor → New query → pegar → Run

alter table public.profiles
  add column if not exists trial_used boolean not null default false;

comment on column public.profiles.trial_used is 'true si el usuario ya usó su prueba gratuita';
