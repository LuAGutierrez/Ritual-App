-- ============================================================
-- Migración 048: opción "Ambos" en ¿Quién de los dos?
--
-- Pedido del usuario: para preguntas comparativas ("¿Quién es más
-- celoso/a?") a veces la respuesta honesta es "los dos por igual", no
-- forzar a elegir entre las dos personas. Se agrega un tercer valor
-- (2 = Ambos) a user1_choice/user2_choice -- la lógica de "coincidieron"
-- (user1_choice = user2_choice) sigue funcionando igual sin cambios,
-- incluyendo el caso "los dos eligieron Ambos".
-- ============================================================

ALTER TABLE public.couple_quien_de_los_dos_rounds
  DROP CONSTRAINT couple_quien_de_los_dos_rounds_user1_choice_check,
  ADD CONSTRAINT couple_quien_de_los_dos_rounds_user1_choice_check
    CHECK (user1_choice IN (0, 1, 2));

ALTER TABLE public.couple_quien_de_los_dos_rounds
  DROP CONSTRAINT couple_quien_de_los_dos_rounds_user2_choice_check,
  ADD CONSTRAINT couple_quien_de_los_dos_rounds_user2_choice_check
    CHECK (user2_choice IN (0, 1, 2));

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

  IF p_choice NOT IN (0, 1, 2) THEN
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
