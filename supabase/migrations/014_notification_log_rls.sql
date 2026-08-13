-- notification_log quedó sin RLS en la migración 010 (a diferencia de sus tablas
-- hermanas notification_prefs y push_subscriptions). Solo se escribe/lee desde
-- lib/push/send.ts con el service client (bypasea RLS), así que agregar RLS acá
-- no afecta ese flujo; solo cierra el acceso público vía la clave anon.

alter table public.notification_log enable row level security;

create policy "notification_log_select_own" on public.notification_log
  for select using (auth.uid() = user_id);
