-- ============================================================
-- Migración 043: RPC get_historial_juegos
--
-- Historial de rondas jugadas (no rituales) para la tab nueva "Juegos"
-- en /historial. Junta las 6 fuentes de rondas en una sola forma común
-- vía UNION ALL:
--
-- - Elección/Esto o Aquello/Quién de los dos: coincidieron o no
--   (user1_choice = user2_choice), solo rondas ya reveladas.
-- - ¿Cuánto me conoces?: acierto o no (subject_choice = guesser_choice).
-- - Verdad o Reto / Ruleta Picante: desde couple_rondas_jugadas
--   (migración 040), que solo guarda item_id -- se hace JOIN a la
--   tabla de contenido correspondiente para traer el texto real.
--
-- Ninguna de las 4 tablas de ronda con reveal guarda item_id ni
-- intensidad/categoria propia (solo texto ya copiado al crear la
-- ronda), así que esas 4 quedan con categoria = NULL acá -- no hay
-- forma de recuperar esa info sin ampliar esas tablas, lo cual queda
-- fuera de esta pasada.
--
-- SECURITY INVOKER (default): corre con los privilegios del usuario
-- que llama, las RLS de cada tabla (todas ya permiten SELECT completo
-- a miembros de la pareja) se siguen aplicando igual que si se
-- llamaran por separado.
--
-- Paginación con el mismo truco que get_historial_page_data (migración
-- 016): se pide p_limit + 1 filas y el caller decide hasMore, sin una
-- query de COUNT aparte.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_historial_juegos(
  p_juego text DEFAULT 'todos',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 15
)
RETURNS TABLE (
  juego text,
  resumen text,
  resultado text,
  categoria text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT combined.juego, combined.resumen, combined.resultado, combined.categoria, combined.created_at
  FROM (
    SELECT
      'eleccion'::text AS juego,
      (r.option_a || ' / ' || r.option_b) AS resumen,
      CASE WHEN r.user1_choice = r.user2_choice THEN 'coincidieron' ELSE 'no_coincidieron' END AS resultado,
      NULL::text AS categoria,
      r.created_at
    FROM public.couple_eleccion_rounds r
    WHERE r.couple_id = v_couple_id AND r.revealed_at IS NOT NULL

    UNION ALL

    SELECT
      'esto_aquello',
      (r.option_a || ' / ' || r.option_b),
      CASE WHEN r.user1_choice = r.user2_choice THEN 'coincidieron' ELSE 'no_coincidieron' END,
      NULL,
      r.created_at
    FROM public.couple_esto_aquello_rounds r
    WHERE r.couple_id = v_couple_id AND r.revealed_at IS NOT NULL

    UNION ALL

    SELECT
      'conoces',
      r.pregunta,
      CASE WHEN r.subject_choice = r.guesser_choice THEN 'acierto' ELSE 'no_acierto' END,
      NULL,
      r.created_at
    FROM public.couple_conoces_rounds r
    WHERE r.couple_id = v_couple_id AND r.revealed_at IS NOT NULL

    UNION ALL

    SELECT
      'quien_de_los_dos',
      r.pregunta,
      CASE WHEN r.user1_choice = r.user2_choice THEN 'coincidieron' ELSE 'no_coincidieron' END,
      NULL,
      r.created_at
    FROM public.couple_quien_de_los_dos_rounds r
    WHERE r.couple_id = v_couple_id AND r.revealed_at IS NOT NULL

    UNION ALL

    SELECT
      'verdad_o_reto',
      i.texto,
      NULL,
      r.categoria,
      r.created_at
    FROM public.couple_rondas_jugadas r
    JOIN public.verdad_o_reto_items i ON i.id = r.item_id
    WHERE r.couple_id = v_couple_id AND r.juego = 'verdad_o_reto'

    UNION ALL

    SELECT
      'ruleta_picante',
      i.texto,
      NULL,
      r.categoria,
      r.created_at
    FROM public.couple_rondas_jugadas r
    JOIN public.ruleta_picante_items i ON i.id = r.item_id
    WHERE r.couple_id = v_couple_id AND r.juego = 'ruleta_picante'
  ) combined
  WHERE p_juego = 'todos' OR combined.juego = p_juego
  ORDER BY combined.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_historial_juegos(text, int, int) TO authenticated;
