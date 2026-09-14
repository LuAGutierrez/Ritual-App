-- ============================================================
-- Migración 061: historial sin límite de 30 (Sprint 5)
--
-- Parte del retiro del paywall de suscripción (docs/ROADMAP.md, Sprint 5):
-- el catálogo estático -- incluido el historial completo -- pasa a ser
-- gratis para siempre. get_historial_page_data() (última versión en la
-- migración 019) limitaba a 30 rituales para quien no tuviera
-- `subscriptions` activa; acá se saca esa lógica entera, ya no calcula
-- ni devuelve `isPremium`.
-- ============================================================

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
  v_total_all int := 0;
  v_total_filtered int := 0;
  v_use_category boolean := p_categoria IS NOT NULL AND p_categoria <> 'todos';
  v_sessions jsonb;
  v_has_more boolean;
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
    LIMIT p_limit + 1
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
    ) ORDER BY seq) FILTER (WHERE seq <= p_limit), '[]'::jsonb),
    bool_or(seq > p_limit)
  INTO v_sessions, v_has_more
  FROM numbered;

  v_has_more := coalesce(v_has_more, false);

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'sessions', v_sessions,
    'hasMore', v_has_more,
    'totalCompleted', v_total_filtered,
    'totalCompletedAll', v_total_all
  );
END;
$$;
