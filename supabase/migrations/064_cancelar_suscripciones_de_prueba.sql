-- ============================================================
-- Migración 064: limpiar filas de subscriptions sin suscripción real
-- de Mercado Pago detrás (Sprint 5, cutover completo).
--
-- Confirmado antes de este UPDATE (en producción): las 3 filas con
-- status='active' no tenían mp_subscription_id ni current_period_end
-- -- el webhook (mp-webhook, handleSubscriptionEvent) siempre completa
-- esos dos campos cuando procesa un preapproval autorizado real. Sin
-- ellos, no hay ninguna suscripción de Mercado Pago real detrás --
-- eran filas de prueba/desarrollo, no clientes pagando. El usuario
-- confirmó explícitamente que no hay suscriptores reales activos hoy.
--
-- No hizo falta llamar a la API de MP para cancelar nada (no había
-- preapproval_id al cual apuntar) -- solo se corrigió el estado local.
-- Se aplica también acá para que el historial de migraciones no quede
-- desalineado entre local y remoto, aunque en local no haya filas que
-- matcheen esta condición.
-- ============================================================

UPDATE public.subscriptions
SET status = 'canceled', updated_at = now()
WHERE status = 'active' AND mp_subscription_id IS NULL;
