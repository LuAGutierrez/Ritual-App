-- Notificaciones: preferencias, push subscriptions y log anti-spam

create table if not exists public.notification_prefs (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  push_enabled      boolean not null default false,
  partner_responded boolean not null default true,
  daily_reminder    boolean not null default true,
  reminder_time     time not null default '20:00',
  timezone          text not null default 'America/Argentina/Buenos_Aires',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.notification_prefs enable row level security;

create policy "prefs_select_own" on public.notification_prefs
  for select using (auth.uid() = user_id);

create policy "prefs_insert_own" on public.notification_prefs
  for insert with check (auth.uid() = user_id);

create policy "prefs_update_own" on public.notification_prefs
  for update using (auth.uid() = user_id);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "subs_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "subs_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subs_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create table if not exists public.notification_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type    text not null,
  sent_at timestamptz default now()
);

create index if not exists idx_notification_log_user_type_date
  on public.notification_log(user_id, type, sent_at);

-- Prefs por defecto para usuarios existentes y nuevos
insert into public.notification_prefs (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  insert into public.notification_prefs (user_id)
  values (new.id);
  return new;
end;
$$;
