-- ============================================================
-- Migración 036: Momento "Reto Doble completado" en Verdad o Reto
--
-- Los otros 4 Momentos (primera_partida, primera_coincidencia,
-- racha_5, sorpresa) se detectan server-side dentro de los helpers
-- _resolve_*_stats, disparados por los submit_* SECURITY DEFINER de
-- Elección/Esto o Aquello/Conoces/Quién de los dos. Verdad o Reto no
-- tiene rondas persistidas en la base (es client-side/stateless) --
-- no hay ningún punto de escritura server-side donde enganchar esa
-- misma detección.
--
-- En vez de forzar una tabla de rondas nueva solo para esto, se
-- agrega una policy de INSERT MUY acotada: el cliente solo puede
-- insertar exactamente juego='verdad_o_reto' + tipo='reto_doble' --
-- los otros 4 tipos y los otros 4 juegos siguen exclusivamente
-- controlados server-side (couple_momentos sigue sin policy de INSERT
-- genérica). Mismo criterio ya usado en couple_contenido_rechazado
-- (migración 032): evento no-competitivo, sin nada que un miembro
-- pueda "pisarle" al otro.
--
-- El índice único garantiza que se registre una sola vez por pareja
-- (evita duplicados si Reto Doble se completa varias veces, y evita
-- una condición de carrera entre los dos dispositivos sin necesidad
-- de un SELECT previo -- el INSERT simplemente falla silencioso si ya
-- existe).
-- ============================================================

ALTER TABLE public.couple_momentos DROP CONSTRAINT couple_momentos_juego_check;
ALTER TABLE public.couple_momentos ADD CONSTRAINT couple_momentos_juego_check
  CHECK (juego IN ('eleccion', 'esto_aquello', 'conoces', 'quien_de_los_dos', 'verdad_o_reto'));

ALTER TABLE public.couple_momentos DROP CONSTRAINT couple_momentos_tipo_check;
ALTER TABLE public.couple_momentos ADD CONSTRAINT couple_momentos_tipo_check
  CHECK (tipo IN ('primera_partida', 'primera_coincidencia', 'racha_5', 'sorpresa', 'reto_doble'));

CREATE UNIQUE INDEX couple_momentos_unique_reto_doble
  ON public.couple_momentos (couple_id)
  WHERE juego = 'verdad_o_reto' AND tipo = 'reto_doble';

CREATE POLICY "momentos_insert_reto_doble" ON public.couple_momentos
  FOR INSERT WITH CHECK (
    juego = 'verdad_o_reto'
    AND tipo = 'reto_doble'
    AND EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_momentos.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
