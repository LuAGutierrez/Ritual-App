-- Ritual — Soporte Mercado Pago en suscripciones
-- Ejecutá en Supabase: SQL Editor → pegar → Run

alter table public.subscriptions
  add column if not exists mp_subscription_id text;

create index if not exists idx_subscriptions_mp_sub on public.subscriptions(mp_subscription_id);

comment on column public.subscriptions.mp_subscription_id is 'ID de la suscripción/preapproval en Mercado Pago';
