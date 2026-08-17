-- ============================================================
-- Migración 034: "¿Quién de los dos?" -- segunda mecánica de la
-- categoría Nosotros, y primera prueba real de que CONTENT queda
-- desacoplado de MODE/INTERACTION (sección 1/8 del pedido de
-- evolución de juegos).
--
-- Conoces (migración 028) ya es "Nosotros": pregunta abierta + 3-4
-- opciones propias de esa pregunta, roles asimétricos (uno responde
-- sobre sí, el otro adivina, con turnos vía lib/turnos.ts). Este juego
-- es la misma categoría con forma de contenido e interacción
-- distintas: pregunta comparativa + 2 opciones SIEMPRE iguales
-- ("Yo"/"Mi pareja"), roles simétricos (ambos eligen a la vez, sin
-- turnos) -- mismo patrón de fondo (secreto → reveal simultáneo →
-- detectar coincidencia) que Elección/Esto o Aquello, migraciones
-- 015/020/023/029/031, copiado acá verbatim en vez de reinventado.
--
-- 100% aditivo: no se toca ninguna tabla, función ni policy de
-- Elección, Esto o Aquello, Conoces, Verdad o Reto o Ruleta Picante.
-- Solo se hace CREATE OR REPLACE de get_juegos_stats_summary() para
-- sumar un campo más, y se agrega 'quien_de_los_dos' al CHECK de
-- juego en couple_momentos (mismo tipo de cambio que la 033 hizo con
-- 'sorpresa' en tipo).
-- ============================================================

-- ─────────────────────────────────────────────
-- CONTENIDO
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quien_de_los_dos_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta    text NOT NULL,
  intensidad  text NOT NULL DEFAULT 'liviana' CHECK (intensidad IN ('liviana', 'media', 'intensa')),
  categoria   text NOT NULL DEFAULT 'comparacion',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.quien_de_los_dos_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quien_de_los_dos_items_select_authenticated" ON public.quien_de_los_dos_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO public.quien_de_los_dos_items (pregunta, intensidad) VALUES
('¿Quién de los dos es más celoso/a?', 'liviana'),
('¿Quién tarda más en arreglarse?', 'liviana'),
('¿Quién es más dormilón/a?', 'liviana'),
('¿Quién cocina mejor?', 'liviana'),
('¿Quién es más desordenado/a?', 'liviana'),
('¿Quién se enoja más rápido?', 'liviana'),
('¿Quién es más gastador/a?', 'liviana'),
('¿Quién maneja mejor?', 'liviana'),
('¿Quién pone más esfuerzo en la relación últimamente?', 'media'),
('¿Quién cede primero en una discusión?', 'media'),
('¿Quién extraña más al otro cuando no están juntos?', 'media'),
('¿Quién tiene más paciencia?', 'media'),
('¿Quién se anima más a hablar de lo que siente?', 'media'),
('¿Quién está más enamorado/a hoy?', 'intensa'),
('¿Quién tiene más miedo a perder al otro?', 'intensa'),
('¿Quién cambió más desde que están juntos?', 'intensa');

-- ─────────────────────────────────────────────
-- RONDAS -- copia exacta del patrón de couple_eleccion_rounds
-- (015/020). Las opciones no se guardan por fila: siempre son
-- ['Yo', 'Mi pareja'], constante del lado del cliente.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_quien_de_los_dos_rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id     uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user1_id      uuid REFERENCES auth.users(id),
  user2_id      uuid REFERENCES auth.users(id),
  pregunta      text NOT NULL,
  user1_choice  smallint CHECK (user1_choice IN (0, 1)),
  user2_choice  smallint CHECK (user2_choice IN (0, 1)),
  revealed_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.couple_quien_de_los_dos_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quien_de_los_dos_rounds_select_member" ON public.couple_quien_de_los_dos_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_quien_de_los_dos_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "quien_de_los_dos_rounds_insert_member" ON public.couple_quien_de_los_dos_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_quien_de_los_dos_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_quien_de_los_dos_rounds;

-- ─────────────────────────────────────────────
-- STATS -- mismo shape que couple_eleccion_stats (reusa el tipo TS
-- MatchStats, sin policy de INSERT/UPDATE para authenticated: única
-- escritura posible es desde _resolve_quien_de_los_dos_stats.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_quien_de_los_dos_stats (
  couple_id     uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  coincidencias int NOT NULL DEFAULT 0,
  intentos      int NOT NULL DEFAULT 0,
  racha_actual  int NOT NULL DEFAULT 0,
  racha_maxima  int NOT NULL DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.couple_quien_de_los_dos_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quien_de_los_dos_stats_select_member" ON public.couple_quien_de_los_dos_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_quien_de_los_dos_stats.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_quien_de_los_dos_stats;

-- ─────────────────────────────────────────────
-- Momentos: sumar 'quien_de_los_dos' a los juegos válidos.
-- ─────────────────────────────────────────────
ALTER TABLE public.couple_momentos DROP CONSTRAINT couple_momentos_juego_check;
ALTER TABLE public.couple_momentos ADD CONSTRAINT couple_momentos_juego_check
  CHECK (juego IN ('eleccion', 'esto_aquello', 'conoces', 'quien_de_los_dos'));

-- ─────────────────────────────────────────────
-- _resolve_quien_de_los_dos_stats -- copia exacta de
-- _resolve_eleccion_stats (migración 031), incluyendo Momento Sorpresa
-- (033).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_quien_de_los_dos_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_previo public.couple_quien_de_los_dos_stats;
  v_nuevo public.couple_quien_de_los_dos_stats;
BEGIN
  SELECT * INTO v_previo FROM public.couple_quien_de_los_dos_stats WHERE couple_id = p_couple_id;

  INSERT INTO public.couple_quien_de_los_dos_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_quien_de_los_dos_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_quien_de_los_dos_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_quien_de_los_dos_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_quien_de_los_dos_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_quien_de_los_dos_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now()
  RETURNING * INTO v_nuevo;

  IF v_previo IS NULL THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'primera_partida');
  END IF;

  IF p_coincidio AND (v_previo IS NULL OR v_previo.coincidencias = 0) THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'primera_coincidencia');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'racha_5');
  END IF;

  IF random() < 0.08 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'sorpresa');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- submit_quien_de_los_dos_choice -- copia exacta de
-- submit_eleccion_choice (migración 020): valida pertenencia a LA
-- ronda, guard "ya elegiste", revela cuando ambos contestaron y
-- resuelve stats/momentos.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_quien_de_los_dos_choice(
  p_round_id uuid,
  p_choice smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_round public.couple_quien_de_los_dos_rounds;
  v_now timestamptz := now();
  v_completa_ronda boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_choice NOT IN (0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Elección inválida.');
  END IF;

  SELECT * INTO v_round FROM public.couple_quien_de_los_dos_rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ronda no encontrada.');
  END IF;

  IF v_round.user1_id <> v_user_id AND v_round.user2_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No pertenecés a esta ronda.');
  END IF;

  IF v_round.user1_id = v_user_id THEN
    IF v_round.user1_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    v_completa_ronda := v_round.user2_choice IS NOT NULL;
    UPDATE public.couple_quien_de_los_dos_rounds SET user1_choice = p_choice WHERE id = p_round_id;
  ELSE
    IF v_round.user2_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    v_completa_ronda := v_round.user1_choice IS NOT NULL;
    UPDATE public.couple_quien_de_los_dos_rounds SET user2_choice = p_choice WHERE id = p_round_id;
  END IF;

  UPDATE public.couple_quien_de_los_dos_rounds
  SET revealed_at = v_now
  WHERE id = p_round_id
    AND revealed_at IS NULL
    AND user1_choice IS NOT NULL
    AND user2_choice IS NOT NULL;

  IF v_completa_ronda THEN
    PERFORM public._resolve_quien_de_los_dos_stats(
      v_round.couple_id,
      p_choice = COALESCE(v_round.user1_choice, v_round.user2_choice)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_quien_de_los_dos_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quien_de_los_dos_choice(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quien_de_los_dos_choice(uuid, smallint) TO authenticated;

REVOKE UPDATE ON public.couple_quien_de_los_dos_rounds FROM authenticated;

-- ─────────────────────────────────────────────
-- get_quien_de_los_dos_page_data -- copia de get_eleccion_page_data
-- (018/029): contexto + ronda activa + stats en un solo round-trip.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_quien_de_los_dos_page_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_profile jsonb;
  v_couple jsonb;
  v_partner_profile jsonb;
  v_round jsonb;
  v_stats jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN null;
  END IF;

  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = v_user_id;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object(
      'context', jsonb_build_object(
        'userId', v_user_id, 'profile', v_profile, 'couple', null, 'partnerProfile', null
      ),
      'round', null,
      'stats', null
    );
  END IF;

  SELECT to_jsonb(c) INTO v_couple FROM public.couples c WHERE c.id = v_couple_id;

  SELECT to_jsonb(p) INTO v_partner_profile
  FROM public.profiles p
  WHERE p.id = (
    SELECT cm2.user_id FROM public.couple_members cm2
    WHERE cm2.couple_id = v_couple_id AND cm2.user_id <> v_user_id
    LIMIT 1
  );

  SELECT to_jsonb(r) INTO v_round
  FROM public.couple_quien_de_los_dos_rounds r
  WHERE r.couple_id = v_couple_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  SELECT to_jsonb(s) INTO v_stats
  FROM public.couple_quien_de_los_dos_stats s
  WHERE s.couple_id = v_couple_id;

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'round', v_round,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quien_de_los_dos_page_data() TO authenticated;

-- ─────────────────────────────────────────────
-- get_juegos_stats_summary: sumar quienDeLosDos al resumen que ya
-- arma para Elección/Esto o Aquello/Conoces (usado por el mensaje
-- adaptativo del hub /juegos).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_juegos_stats_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN null;
  END IF;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN null;
  END IF;

  RETURN jsonb_build_object(
    'eleccion', (SELECT to_jsonb(s) FROM public.couple_eleccion_stats s WHERE s.couple_id = v_couple_id),
    'estoAquello', (SELECT to_jsonb(s) FROM public.couple_esto_aquello_stats s WHERE s.couple_id = v_couple_id),
    'conoces', (SELECT to_jsonb(s) FROM public.couple_conoces_stats s WHERE s.couple_id = v_couple_id),
    'quienDeLosDos', (SELECT to_jsonb(s) FROM public.couple_quien_de_los_dos_stats s WHERE s.couple_id = v_couple_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_juegos_stats_summary() TO authenticated;
