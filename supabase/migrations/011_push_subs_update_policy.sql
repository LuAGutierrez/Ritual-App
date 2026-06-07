-- Permitir actualizar suscripciones propias (por si se reactiva en el mismo dispositivo)
create policy "subs_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);
