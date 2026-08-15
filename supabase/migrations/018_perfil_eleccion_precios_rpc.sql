-- ============================================================
-- Migración 018: RPC para /perfil, /juegos/eleccion y /precios
-- Mismo enfoque que 016/017: juntar contexto + datos de la pantalla en
-- una sola consulta a Postgres. SECURITY INVOKER en las tres, las
-- políticas RLS de cada tabla se siguen aplicando igual que siempre.
-- ============================================================

-- ─────────────────────────────────────────────
-- /perfil -- el caso mas pesado: el codigo TS encadenaba hasta 9-10
-- round trips secuenciales (ni siquiera en paralelo entre si).
-- ─────────────────────────────────────────────
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

  -- Misma logica (y misma limitacion existente) que isCouplePremiumAction:
  -- RLS de `subscriptions` solo deja ver la fila propia.
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_user_id AND s.status IN ('active', 'trialing')
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

GRANT EXECUTE ON FUNCTION public.get_perfil_page_data() TO authenticated;

-- ─────────────────────────────────────────────
-- /juegos/eleccion -- contexto + ronda activa en una sola llamada.
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
      'round', null
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

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'round', v_round
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eleccion_page_data() TO authenticated;

-- ─────────────────────────────────────────────
-- /precios -- solo necesita saber si la pareja es premium.
-- ─────────────────────────────────────────────
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
    WHERE s.user_id = v_user_id AND s.status IN ('active', 'trialing')
  ) INTO v_is_premium;

  RETURN v_is_premium;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_is_couple_premium() TO authenticated;
