-- Ritual — Tablas y RLS para Fase 2
-- Ejecutá este script en Supabase: SQL Editor → New query → pegar → Run

-- =============================================================================
-- 1. Perfil (opcional: datos extra del usuario, ligado a auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: crear perfil al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: cada usuario solo ve/edita su propio perfil
alter table public.profiles enable row level security;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- =============================================================================
-- 2. Suscripciones (Stripe)
-- =============================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'monthly',  -- 'monthly', 'trial'
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Índices para consultas por user_id y por Stripe
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_sub on public.subscriptions(stripe_subscription_id);

-- RLS: cada usuario solo ve su propia suscripción
alter table public.subscriptions enable row level security;

create policy "Usuarios ven su propia suscripción"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Inserción/actualización: solo el propio usuario (o un webhook con service_role; eso se hace desde backend)
create policy "Usuarios insertan su propia suscripción"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan su propia suscripción"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- =============================================================================
-- 3. (Opcional) Progreso / sesiones de juego
-- =============================================================================
create table if not exists public.game_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,           -- 'conexion', 'picante', 'eleccion'
  level_slug text,                  -- 'suave', 'profundo', 'nivel1', etc.
  last_question_index int default 0,
  updated_at timestamptz default now(),
  unique(user_id, game_slug)
);

create index if not exists idx_game_progress_user on public.game_progress(user_id);

alter table public.game_progress enable row level security;

create policy "Usuarios ven su propio progreso"
  on public.game_progress for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan su propio progreso"
  on public.game_progress for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan su propio progreso"
  on public.game_progress for update
  using (auth.uid() = user_id);

create policy "Usuarios borran su propio progreso"
  on public.game_progress for delete
  using (auth.uid() = user_id);
