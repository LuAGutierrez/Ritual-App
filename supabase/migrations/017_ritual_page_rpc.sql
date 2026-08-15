-- ============================================================
-- Migración 017: RPC get_ritual_page_data
-- Mismo enfoque que get_historial_page_data (migración 016): junta
-- contexto + ritual del día + racha en una sola consulta a Postgres,
-- en vez de encadenar round trips separados desde el servidor de
-- Next.js (getUserContextAction, getRitualOfDayAction, getStreakAction).
--
-- SECURITY INVOKER (default): corre con los privilegios del usuario que
-- llama, las políticas RLS de cada tabla se siguen aplicando igual.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_ritual_page_data()
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
  v_today date;
  v_session jsonb;
  v_streak jsonb;
  v_day_of_year int;
  v_ritual_count int;
  v_ritual_id uuid;
  v_user1 uuid;
  v_user2 uuid;
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
      'session', null,
      'streak', null
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

  -- "hoy" en zona horaria de Argentina, igual que todayInArgentina() en TS
  v_today := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  SELECT jsonb_build_object(
    'id', crs.id, 'couple_id', crs.couple_id, 'ritual_id', crs.ritual_id,
    'session_date', crs.session_date, 'user1_id', crs.user1_id, 'user2_id', crs.user2_id,
    'user1_response', crs.user1_response, 'user2_response', crs.user2_response,
    'user1_completed_at', crs.user1_completed_at, 'user2_completed_at', crs.user2_completed_at,
    'revealed_at', crs.revealed_at,
    'ritual', to_jsonb(r)
  ) INTO v_session
  FROM public.couple_ritual_sessions crs
  JOIN public.rituals r ON r.id = crs.ritual_id
  WHERE crs.couple_id = v_couple_id AND crs.session_date = v_today;

  IF v_session IS NULL THEN
    -- Mismo criterio que getRitualOfDayAction: día del año (1-indexado,
    -- igual que to_char 'DDD') módulo cantidad de rituales no-premium,
    -- ordenados por created_at.
    v_day_of_year := to_char(v_today, 'DDD')::int;

    SELECT count(*) INTO v_ritual_count FROM public.rituals WHERE premium = false;

    IF v_ritual_count > 0 THEN
      SELECT id INTO v_ritual_id
      FROM public.rituals
      WHERE premium = false
      ORDER BY created_at ASC
      OFFSET (v_day_of_year % v_ritual_count)
      LIMIT 1;

      -- user1/user2 por orden de ingreso a la pareja -- determinístico
      -- (el código TS actual no ordenaba explícitamente acá).
      SELECT cm.user_id INTO v_user1
      FROM public.couple_members cm
      WHERE cm.couple_id = v_couple_id
      ORDER BY cm.joined_at ASC
      LIMIT 1;

      SELECT cm.user_id INTO v_user2
      FROM public.couple_members cm
      WHERE cm.couple_id = v_couple_id AND cm.user_id <> v_user1
      LIMIT 1;

      -- ON CONFLICT DO NOTHING + re-select: si la pareja abre la app al
      -- mismo tiempo y las dos sesiones intentan crear el ritual del día,
      -- la que pierde la carrera no rompe (el codigo TS actual sí podía
      -- romper acá, ver commit).
      INSERT INTO public.couple_ritual_sessions (couple_id, ritual_id, session_date, user1_id, user2_id)
      VALUES (v_couple_id, v_ritual_id, v_today, v_user1, v_user2)
      ON CONFLICT (couple_id, session_date) DO NOTHING;

      SELECT jsonb_build_object(
        'id', crs.id, 'couple_id', crs.couple_id, 'ritual_id', crs.ritual_id,
        'session_date', crs.session_date, 'user1_id', crs.user1_id, 'user2_id', crs.user2_id,
        'user1_response', crs.user1_response, 'user2_response', crs.user2_response,
        'user1_completed_at', crs.user1_completed_at, 'user2_completed_at', crs.user2_completed_at,
        'revealed_at', crs.revealed_at,
        'ritual', to_jsonb(r)
      ) INTO v_session
      FROM public.couple_ritual_sessions crs
      JOIN public.rituals r ON r.id = crs.ritual_id
      WHERE crs.couple_id = v_couple_id AND crs.session_date = v_today;
    END IF;
  END IF;

  SELECT to_jsonb(s) INTO v_streak FROM public.streaks s WHERE s.couple_id = v_couple_id;

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'session', v_session,
    'streak', v_streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ritual_page_data() TO authenticated;
