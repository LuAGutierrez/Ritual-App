-- Ritual — Modo a distancia para Elección mutua (host pago, invitado free con cuenta)

create table if not exists public.remote_eleccion_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  mode_slug text not null check (mode_slug in ('modo1', 'modo2', 'modo3')),
  owner_choice int,
  guest_choice int,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'revealed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_remote_eleccion_rooms_code on public.remote_eleccion_rooms(room_code);
create index if not exists idx_remote_eleccion_rooms_owner on public.remote_eleccion_rooms(owner_user_id);
create index if not exists idx_remote_eleccion_rooms_guest on public.remote_eleccion_rooms(guest_user_id);
create index if not exists idx_remote_eleccion_rooms_status on public.remote_eleccion_rooms(status);

create or replace function public.tg_remote_eleccion_rooms_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_remote_eleccion_rooms_updated_at on public.remote_eleccion_rooms;
create trigger trg_remote_eleccion_rooms_updated_at
before update on public.remote_eleccion_rooms
for each row execute function public.tg_remote_eleccion_rooms_updated_at();

alter table public.remote_eleccion_rooms enable row level security;

create policy "Participantes ven su sala remota"
  on public.remote_eleccion_rooms for select
  using (auth.uid() = owner_user_id or auth.uid() = guest_user_id);

alter table public.remote_eleccion_rooms replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.remote_eleccion_rooms;
exception
  when duplicate_object then null;
end $$;
