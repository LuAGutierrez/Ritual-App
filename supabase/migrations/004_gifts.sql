-- Ritual — Regalos: pago único, enlace para activar
-- Ejecutá en Supabase: SQL Editor → pegar → Run

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  recipient_email text not null,
  purchaser_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',  -- 'pending' | 'paid' | 'claimed'
  mp_payment_id text,
  claimed_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);

create index if not exists idx_gifts_token on public.gifts(token);
create index if not exists idx_gifts_status on public.gifts(status);

-- RLS: nadie lee/escribe por anon; solo Edge Functions con service_role
alter table public.gifts enable row level security;

-- Sin políticas: el cliente no accede a gifts. Solo las funciones con service_role.
-- Si quisieras que el comprador vea sus regalos: policy con auth.uid() = purchaser_user_id

comment on table public.gifts is 'Regalos: pago único en MP, el destinatario activa con el token';
