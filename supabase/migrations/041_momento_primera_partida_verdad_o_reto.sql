-- ============================================================
-- Migración 041: Momento "primera_partida" para Verdad o Reto
--
-- Mismo caso que "reto_doble" (migración 036): Verdad o Reto no tiene
-- reveal server-side donde enganchar la detección de Momentos, así
-- que se inserta directo desde el cliente con una policy MUY acotada
-- (solo juego='verdad_o_reto' + tipo='primera_partida') y un índice
-- único que lo hace seguro pedir en cada ronda -- después de la
-- primera, el INSERT falla en silencio.
--
-- Tanto 'verdad_o_reto' como 'primera_partida' ya son valores válidos
-- en los CHECK de couple_momentos (agregados en migraciones previas),
-- así que no hace falta tocarlos acá.
-- ============================================================

CREATE UNIQUE INDEX couple_momentos_unique_primera_partida_vor
  ON public.couple_momentos (couple_id)
  WHERE juego = 'verdad_o_reto' AND tipo = 'primera_partida';

CREATE POLICY "momentos_insert_primera_partida_vor" ON public.couple_momentos
  FOR INSERT WITH CHECK (
    juego = 'verdad_o_reto'
    AND tipo = 'primera_partida'
    AND EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_momentos.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
