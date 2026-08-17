-- ============================================================
-- Migración 042: Momento "primera_partida" para Ruleta Picante
--
-- Mismo caso que Verdad o Reto (migración 041): Ruleta Picante no
-- tiene reveal server-side, así que el Momento se inserta directo
-- desde el cliente con una policy MUY acotada (solo
-- juego='ruleta_picante' + tipo='primera_partida') y un índice único
-- que lo hace seguro pedir en cada ronda -- después de la primera, el
-- INSERT falla en silencio.
--
-- A diferencia de Verdad o Reto, 'ruleta_picante' todavía no era un
-- valor válido de juego en couple_momentos -- se agrega acá.
-- ============================================================

ALTER TABLE public.couple_momentos DROP CONSTRAINT couple_momentos_juego_check;
ALTER TABLE public.couple_momentos ADD CONSTRAINT couple_momentos_juego_check
  CHECK (juego IN ('eleccion', 'esto_aquello', 'conoces', 'quien_de_los_dos', 'verdad_o_reto', 'ruleta_picante'));

CREATE UNIQUE INDEX couple_momentos_unique_primera_partida_ruleta
  ON public.couple_momentos (couple_id)
  WHERE juego = 'ruleta_picante' AND tipo = 'primera_partida';

CREATE POLICY "momentos_insert_primera_partida_ruleta" ON public.couple_momentos
  FOR INSERT WITH CHECK (
    juego = 'ruleta_picante'
    AND tipo = 'primera_partida'
    AND EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_momentos.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
