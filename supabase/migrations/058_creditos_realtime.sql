-- ============================================================
-- Migración 058: Realtime para el pozo de créditos
--
-- Mismo patrón que couple_ritual_sessions (migración 006) y las demás
-- tablas de ronda -- permite que el balance se actualice solo en la
-- pantalla del otro miembro sin refresh cuando alguien gasta o compra
-- créditos. Solo couple_credits: user_credits es de un solo usuario,
-- no hay a quién sincronizarle en tiempo real.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_credits;
