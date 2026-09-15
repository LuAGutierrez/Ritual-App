-- Limpieza: tablas sin ninguna referencia en el código actual.
--
-- game_progress: tabla del sistema original (migración 001), nunca usada por el
-- flujo actual de rituales/juegos. 0 filas en producción, sin FKs entrantes.
--
-- couple_picante_trial: gateaba la prueba gratis de picante antes del paywall
-- (migración 046). El paywall completo se retiró en el Sprint 5 (picante ya es
-- gratis siempre), dejando esta tabla sin ningún lector. Sin FKs entrantes.
drop table if exists public.game_progress;
drop table if exists public.couple_picante_trial;
