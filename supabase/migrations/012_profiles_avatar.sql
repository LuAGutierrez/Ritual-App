alter table public.profiles
  add column if not exists avatar text;

comment on column public.profiles.avatar is 'Emoji de avatar del usuario';
