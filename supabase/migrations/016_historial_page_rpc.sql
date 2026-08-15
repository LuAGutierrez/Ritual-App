-- ============================================================
-- Migración 016: RPC get_historial_page_data
-- Junta perfil + pareja + historial en una sola consulta a Postgres
-- en vez de 7-8 round trips secuenciales desde el servidor de Next.js.
--
-- SECURITY INVOKER (default): corre con los privilegios del usuario que
-- llama, así que las políticas RLS de cada tabla (profiles, couples,
-- couple_members, couple_ritual_sessions, rituals, subscriptions) se
-- siguen aplicando exactamente igual que si se llamaran por separado
-- desde el cliente. No se duplica ninguna regla de seguridad a mano.
--
-- FREE_HISTORIAL_LIMIT (30) está hardcodeado abajo -- debe coincidir
-- con lib/plans.ts. Si se cambia uno, cambiar el otro.
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

  -- Premium: misma lógica que isCouplePremiumAction hoy -- RLS de
  -- `subscriptions` solo deja ver la fila propia (auth.uid() = user_id),
  -- así que esto replica el comportamiento actual tal cual, con su misma
  -- limitación existente (no ve la suscripción de la pareja).
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_user_id AND s.status IN ('active', 'trialing')
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

GRANT EXECUTE ON FUNCTION public.get_historial_page_data(text, int, int) TO authenticated;
