-- ============================================================
-- Migración 047: una sola ronda activa por pareja (Elección, Esto o
-- Aquello, ¿Cuánto me conoces?, ¿Quién de los dos?)
--
-- Bug reproducido en vivo: nada impedía que existieran dos rondas sin
-- revelar a la vez para la misma pareja (ej. los dos tocan "Empezar
-- ronda"/"Jugar de nuevo" casi al mismo tiempo). El listener de
-- Realtime de cada juego hace setRound(payload.new) para CUALQUIER
-- fila de esa pareja, sin filtrar por id -- así que la pantalla de
-- alguien podía saltar sola a la ronda nueva, dejando huérfana la
-- ronda vieja (donde quizás la otra persona ya había contestado).
-- Esa "ronda vieja" quedaba esperando una respuesta que nunca iba a
-- llegar, porque nadie la tenía abierta.
--
-- Índice único parcial: solo puede existir una fila con
-- revealed_at IS NULL por couple_id. La segunda inserción falla con
-- 23505 (unique_violation) -- start*RoundAction (app/actions/*.ts) lo
-- atrapa y devuelve la ronda existente en vez de crear una duplicada.
-- El fix del lado del cliente (filtrar el listener de Realtime por
-- round.id) queda como defensa adicional, no como el fix principal.
-- ============================================================

CREATE UNIQUE INDEX couple_eleccion_rounds_one_active
  ON public.couple_eleccion_rounds (couple_id) WHERE revealed_at IS NULL;

CREATE UNIQUE INDEX couple_esto_aquello_rounds_one_active
  ON public.couple_esto_aquello_rounds (couple_id) WHERE revealed_at IS NULL;

CREATE UNIQUE INDEX couple_conoces_rounds_one_active
  ON public.couple_conoces_rounds (couple_id) WHERE revealed_at IS NULL;

CREATE UNIQUE INDEX couple_quien_de_los_dos_rounds_one_active
  ON public.couple_quien_de_los_dos_rounds (couple_id) WHERE revealed_at IS NULL;
