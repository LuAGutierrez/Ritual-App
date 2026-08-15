-- ============================================================
-- Migración 019: Fix del bug "premium a nivel de pareja"
--
-- La política de RLS de `subscriptions` (migración 001) solo dejaba ver
-- la fila propia (auth.uid() = user_id). La decisión de producto
-- documentada es "si uno paga, los dos acceden", pero como
-- isCouplePremiumAction (y las funciones RPC agregadas en 016/018)
-- consultan subscriptions filtrando por los user_id de ambos miembros
-- de la pareja, RLS descartaba en silencio la fila del que no está
-- mirando la pantalla -- el que no pagó nunca veía premium activo.
--
-- Fix en dos partes:
-- 1. Nueva policy de SELECT: un usuario puede ver la suscripción de
--    cualquier miembro de su misma pareja (no solo la propia). Esto
--    arregla automáticamente isCouplePremiumAction/isPremiumAction
--    (siguen siendo queries normales del cliente, se benefician solo
--    con este cambio de RLS, sin tocar código TS).
-- 2. Las funciones RPC SECURITY INVOKER que hoy filtran explícitamente
--    `s.user_id = v_user_id` (o sea, ignoraban a la pareja incluso con
--    RLS mas permisivo) pasan a chequear cualquier miembro de la pareja.
-- ============================================================

CREATE POLICY "subscriptions_select_partner" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members cm1
      JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = subscriptions.user_id
    )
  );

CREATE OR REPLACE FUNCTION public.get_perfil_page_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_profile jsonb;
  v_streak jsonb;
  v_rituales_completados int := 0;
  v_categoria_favorita text;
  v_partner_name text;
  v_is_premium boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN null;
  END IF;

  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = v_user_id;
  IF v_profile IS NULL THEN
    RETURN null;
  END IF;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object(
      'profile', v_profile, 'streak', null, 'ritualesCompletados', 0,
      'categoriaFavorita', null, 'partnerName', null, 'isPremium', false
    );
  END IF;

  -- Premium a nivel de pareja: activo si CUALQUIER miembro de la pareja
  -- tiene una suscripcion activa (antes solo chequeaba v_user_id).
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.couple_members cm ON cm.user_id = s.user_id
    WHERE cm.couple_id = v_couple_id AND s.status IN ('active', 'trialing')
  ) INTO v_is_premium;

  SELECT to_jsonb(s) INTO v_streak FROM public.streaks s WHERE s.couple_id = v_couple_id;

  SELECT count(*) INTO v_rituales_completados
  FROM public.couple_ritual_sessions crs
  WHERE crs.couple_id = v_couple_id AND crs.revealed_at IS NOT NULL;

  SELECT r.category INTO v_categoria_favorita
  FROM public.couple_ritual_sessions crs
  JOIN public.rituals r ON r.id = crs.ritual_id
  WHERE crs.couple_id = v_couple_id AND crs.revealed_at IS NOT NULL
  GROUP BY r.category
  ORDER BY count(*) DESC, r.category ASC
  LIMIT 1;

  SELECT p.display_name INTO v_partner_name
  FROM public.profiles p
  WHERE p.id = (
    SELECT cm2.user_id FROM public.couple_members cm2
    WHERE cm2.couple_id = v_couple_id AND cm2.user_id <> v_user_id
    LIMIT 1
  );

  RETURN jsonb_build_object(
    'profile', v_profile,
    'streak', v_streak,
    'ritualesCompletados', v_rituales_completados,
    'categoriaFavorita', v_categoria_favorita,
    'partnerName', v_partner_name,
    'isPremium', v_is_premium
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_is_couple_premium()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_is_premium boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.couple_members cm ON cm.user_id = s.user_id
    WHERE cm.couple_id = v_couple_id AND s.status IN ('active', 'trialing')
  ) INTO v_is_premium;

  RETURN v_is_premium;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_historial_page_data(
  p_categoria text DEFAULT 'todos',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 15
)
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
  v_is_premium boolean := false;
  v_total_all int := 0;
  v_total_filtered int := 0;
  v_use_category boolean := p_categoria IS NOT NULL AND p_categoria <> 'todos';
  v_capped_limit int;
  v_sessions jsonb;
  v_has_more_rows boolean;
  v_has_more boolean;
  v_free_limit CONSTANT int := 30;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('context', null);
  END IF;

  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = v_user_id;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object(
      'context', jsonb_build_object(
        'userId', v_user_id,
        'profile', v_profile,
        'couple', null,
        'partnerProfile', null
      )
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

  -- Premium a nivel de pareja: activo si CUALQUIER miembro de la pareja
  -- tiene una suscripcion activa (antes solo chequeaba v_user_id).
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.couple_members cm ON cm.user_id = s.user_id
    WHERE cm.couple_id = v_couple_id AND s.status IN ('active', 'trialing')
  ) INTO v_is_premium;

  SELECT count(*) INTO v_total_all
  FROM public.couple_ritual_sessions crs
  WHERE crs.couple_id = v_couple_id AND crs.revealed_at IS NOT NULL;

  IF v_use_category THEN
    SELECT count(*) INTO v_total_filtered
    FROM public.couple_ritual_sessions crs
    JOIN public.rituals r ON r.id = crs.ritual_id
    WHERE crs.couple_id = v_couple_id
      AND crs.revealed_at IS NOT NULL
      AND r.category = p_categoria;
  ELSE
    v_total_filtered := v_total_all;
  END IF;

  IF NOT v_is_premium AND p_offset >= v_free_limit THEN
    RETURN jsonb_build_object(
      'context', jsonb_build_object(
        'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
      ),
      'sessions', '[]'::jsonb,
      'hasMore', false,
      'isPremium', v_is_premium,
      'totalCompleted', v_total_filtered,
      'totalCompletedAll', v_total_all
    );
  END IF;

  v_capped_limit := CASE WHEN v_is_premium THEN p_limit ELSE least(p_limit, v_free_limit - p_offset) END;

  WITH filtered AS (
    SELECT
      crs.id, crs.couple_id, crs.ritual_id, crs.session_date,
      crs.user1_id, crs.user2_id, crs.user1_response, crs.user2_response,
      crs.user1_completed_at, crs.user2_completed_at, crs.revealed_at,
      r.id AS r_id, r.category AS r_category, r.prompt AS r_prompt,
      r.challenge AS r_challenge, r.difficulty AS r_difficulty,
      r.premium AS r_premium, r.created_at AS r_created_at
    FROM public.couple_ritual_sessions crs
    JOIN public.rituals r ON r.id = crs.ritual_id
    WHERE crs.couple_id = v_couple_id
      AND crs.revealed_at IS NOT NULL
      AND (NOT v_use_category OR r.category = p_categoria)
    ORDER BY crs.session_date DESC
    OFFSET p_offset
    LIMIT v_capped_limit + 1
  ),
  numbered AS (
    SELECT *, row_number() OVER (ORDER BY session_date DESC) AS seq FROM filtered
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'couple_id', couple_id, 'ritual_id', ritual_id,
      'session_date', session_date, 'user1_id', user1_id, 'user2_id', user2_id,
      'user1_response', user1_response, 'user2_response', user2_response,
      'user1_completed_at', user1_completed_at, 'user2_completed_at', user2_completed_at,
      'revealed_at', revealed_at,
      'ritual', jsonb_build_object(
        'id', r_id, 'category', r_category, 'prompt', r_prompt, 'challenge', r_challenge,
        'difficulty', r_difficulty, 'premium', r_premium, 'created_at', r_created_at
      )
    ) ORDER BY seq) FILTER (WHERE seq <= v_capped_limit), '[]'::jsonb),
    bool_or(seq > v_capped_limit)
  INTO v_sessions, v_has_more_rows
  FROM numbered;

  v_has_more_rows := coalesce(v_has_more_rows, false);

  IF v_is_premium THEN
    v_has_more := v_has_more_rows;
  ELSE
    v_has_more := v_has_more_rows AND (p_offset + jsonb_array_length(v_sessions) < v_free_limit);
  END IF;

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'sessions', v_sessions,
    'hasMore', v_has_more,
    'isPremium', v_is_premium,
    'totalCompleted', v_total_filtered,
    'totalCompletedAll', v_total_all
  );
END;
$$;
