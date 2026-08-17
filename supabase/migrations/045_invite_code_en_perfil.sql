-- ============================================================
-- Migración 045: exponer el invite_code en /perfil mientras la pareja
-- no se completó
--
-- El link de invitación solo se mostraba una vez, justo al crear la
-- pareja (en /onboarding o /ritual) -- si el usuario se iba de esa
-- pantalla sin copiarlo, no había forma de volver a verlo desde la
-- app (el invite_code sigue vivo en couples, pero ningún otro lugar
-- lo mostraba). Se agrega a get_perfil_page_data() para que /perfil
-- lo pueda mostrar siempre que la pareja tenga un solo miembro.
-- ============================================================

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
  v_invite_code text;
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
      'categoriaFavorita', null, 'partnerName', null, 'isPremium', false,
      'inviteCode', null
    );
  END IF;

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

  IF v_partner_name IS NULL THEN
    SELECT c.invite_code INTO v_invite_code FROM public.couples c WHERE c.id = v_couple_id;
  END IF;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'streak', v_streak,
    'ritualesCompletados', v_rituales_completados,
    'categoriaFavorita', v_categoria_favorita,
    'partnerName', v_partner_name,
    'isPremium', v_is_premium,
    'inviteCode', v_invite_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfil_page_data() TO authenticated;
