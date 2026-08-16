-- ============================================================
-- Migración 029: estadísticas de coincidencias para Elección y Esto o
-- Aquello + resumen agregado para un mensaje adaptativo en /juegos
--
-- Hasta ahora esos dos juegos no guardaban nada más allá de la ronda
-- en curso -- cada partida se perdía apenas se jugaba otra. Se agrega
-- el mismo patrón de stats que ya tiene "¿Cuánto me conoces?"
-- (migración 028: couple_conoces_stats + helper interno que hace el
-- UPSERT), replicado para estos dos juegos.
--
-- submit_eleccion_choice y submit_esto_aquello_choice (migraciones
-- 020/023) se reemplazan agregando SOLO la detección de "esta llamada
-- completa la ronda" + la llamada al helper de stats -- el resto del
-- cuerpo de ambas funciones queda línea por línea igual al original,
-- guards y toda la lógica de reveal incluida.
--
-- get_eleccion_page_data (018) y get_esto_aquello_page_data (023) se
-- reemplazan agregando el campo 'stats' a lo que ya devolvían -- sin
-- tocar ningún campo existente.
--
-- Todas las funciones que escriben (_resolve_*_stats, submit_*_choice)
-- son VOLATILE (default) -- ninguna lleva STABLE ni IMMUTABLE.
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLAS: stats (mismo patrón endurecido que couple_conoces_stats --
-- sin policy de INSERT/UPDATE para authenticated, única escritura
-- posible es desde los helpers SECURITY DEFINER-adyacentes de abajo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_eleccion_stats (
  couple_id     uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  coincidencias int NOT NULL DEFAULT 0,
  intentos      int NOT NULL DEFAULT 0,
  racha_actual  int NOT NULL DEFAULT 0,
  racha_maxima  int NOT NULL DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.couple_eleccion_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eleccion_stats_select_member" ON public.couple_eleccion_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_eleccion_stats.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.couple_esto_aquello_stats (
  couple_id     uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  coincidencias int NOT NULL DEFAULT 0,
  intentos      int NOT NULL DEFAULT 0,
  racha_actual  int NOT NULL DEFAULT 0,
  racha_maxima  int NOT NULL DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.couple_esto_aquello_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esto_aquello_stats_select_member" ON public.couple_esto_aquello_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_esto_aquello_stats.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Helpers de UPSERT -- uno por juego (no una versión genérica con SQL
-- dinámico: son 6 líneas cada uno y el repo ya prefiere este nivel de
-- duplicación explícita entre juegos antes que abstraer, ver
-- couple_eleccion_rounds vs couple_esto_aquello_rounds).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_eleccion_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.couple_eleccion_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_eleccion_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_eleccion_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_eleccion_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_eleccion_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_eleccion_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public._resolve_esto_aquello_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.couple_esto_aquello_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_esto_aquello_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_esto_aquello_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_esto_aquello_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_esto_aquello_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_esto_aquello_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now();
END;
$$;

-- ─────────────────────────────────────────────
-- submit_eleccion_choice: idéntica a la versión de la migración 020,
-- solo se agrega v_completa_ronda (para saber si ESTA llamada es la
-- que completa el par de elecciones) y la llamada al helper de stats
-- al final. Guards, mensajes de error y lógica de reveal sin cambios.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_eleccion_choice(
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
  v_round public.couple_eleccion_rounds;
  v_now timestamptz := now();
  v_completa_ronda boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_choice NOT IN (0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Elección inválida.');
  END IF;

  SELECT * INTO v_round FROM public.couple_eleccion_rounds WHERE id = p_round_id;
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
    UPDATE public.couple_eleccion_rounds SET user1_choice = p_choice WHERE id = p_round_id;
  ELSE
    IF v_round.user2_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    v_completa_ronda := v_round.user1_choice IS NOT NULL;
    UPDATE public.couple_eleccion_rounds SET user2_choice = p_choice WHERE id = p_round_id;
  END IF;

  UPDATE public.couple_eleccion_rounds
  SET revealed_at = v_now
  WHERE id = p_round_id
    AND revealed_at IS NULL
    AND user1_choice IS NOT NULL
    AND user2_choice IS NOT NULL;

  IF v_completa_ronda THEN
    PERFORM public._resolve_eleccion_stats(
      v_round.couple_id,
      p_choice = COALESCE(v_round.user1_choice, v_round.user2_choice)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_eleccion_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

-- ─────────────────────────────────────────────
-- submit_esto_aquello_choice: mismo tratamiento que arriba, sobre la
-- versión de la migración 023.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_esto_aquello_choice(
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
  v_round public.couple_esto_aquello_rounds;
  v_now timestamptz := now();
  v_completa_ronda boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_choice NOT IN (0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Elección inválida.');
  END IF;

  SELECT * INTO v_round FROM public.couple_esto_aquello_rounds WHERE id = p_round_id;
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
    UPDATE public.couple_esto_aquello_rounds SET user1_choice = p_choice WHERE id = p_round_id;
  ELSE
    IF v_round.user2_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    v_completa_ronda := v_round.user1_choice IS NOT NULL;
    UPDATE public.couple_esto_aquello_rounds SET user2_choice = p_choice WHERE id = p_round_id;
  END IF;

  UPDATE public.couple_esto_aquello_rounds
  SET revealed_at = v_now
  WHERE id = p_round_id
    AND revealed_at IS NULL
    AND user1_choice IS NOT NULL
    AND user2_choice IS NOT NULL;

  IF v_completa_ronda THEN
    PERFORM public._resolve_esto_aquello_stats(
      v_round.couple_id,
      p_choice = COALESCE(v_round.user1_choice, v_round.user2_choice)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_esto_aquello_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

-- ─────────────────────────────────────────────
-- get_eleccion_page_data: idéntica a la versión de la migración 018,
-- se agrega 'stats' a los dos RETURN (con y sin pareja). Todo lo demás
-- sin cambios.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_eleccion_page_data()
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
  FROM public.couple_eleccion_rounds r
  WHERE r.couple_id = v_couple_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  SELECT to_jsonb(s) INTO v_stats
  FROM public.couple_eleccion_stats s
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

-- ─────────────────────────────────────────────
-- get_esto_aquello_page_data: mismo tratamiento, sobre la versión de
-- la migración 023.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_esto_aquello_page_data()
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
  FROM public.couple_esto_aquello_rounds r
  WHERE r.couple_id = v_couple_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  SELECT to_jsonb(s) INTO v_stats
  FROM public.couple_esto_aquello_stats s
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

-- ─────────────────────────────────────────────
-- Resumen agregado de los 3 juegos de "coincidir/adivinar" para el
-- mensaje adaptativo en /juegos. La lógica de QUÉ mensaje mostrar vive
-- en TypeScript (app/juegos/page.tsx) -- acá solo se agregan los datos
-- crudos en un round-trip.
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
    'conoces', (SELECT to_jsonb(s) FROM public.couple_conoces_stats s WHERE s.couple_id = v_couple_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_juegos_stats_summary() TO authenticated;
