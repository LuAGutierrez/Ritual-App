-- Permite validar y usar links de invitación sin exponer la tabla couples.
-- Las funciones corren con SECURITY DEFINER y solo devuelven lo necesario.

CREATE OR REPLACE FUNCTION public.check_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
  v_count int;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT id INTO v_couple_id
  FROM couples
  WHERE invite_code = upper(trim(p_code));

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El link de invitación no es válido o ya expiró.');
  END IF;

  SELECT count(*)::int INTO v_count
  FROM couple_members
  WHERE couple_id = v_couple_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_member', EXISTS (
      SELECT 1 FROM couple_members
      WHERE couple_id = v_couple_id AND user_id = v_user_id
    ),
    'full', v_count >= 2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_couple_by_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
  v_count int;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT id INTO v_couple_id
  FROM couples
  WHERE invite_code = upper(trim(p_code));

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de invitación inválido');
  END IF;

  IF EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id = v_couple_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  SELECT count(*)::int INTO v_count
  FROM couple_members
  WHERE couple_id = v_couple_id;

  IF v_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta pareja ya tiene dos integrantes');
  END IF;

  INSERT INTO couple_members (user_id, couple_id)
  VALUES (v_user_id, v_couple_id);

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
END;
$$;

REVOKE ALL ON FUNCTION public.check_invite_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_couple_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_by_invite(text) TO authenticated;
