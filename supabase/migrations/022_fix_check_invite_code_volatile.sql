-- ============================================================
-- Migración 022: fix de check_invite_code
--
-- La 021 declaró check_invite_code como STABLE, pero la función hace
-- un INSERT en invite_attempts para el rate limiting. Postgres no
-- permite escrituras en funciones STABLE ("INSERT is not allowed in
-- a non-volatile function"), asi que cualquier intento de abrir un
-- link de invitación rompía con ese error. Se saca STABLE (default
-- VOLATILE, igual que join_couple_by_invite).
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
  v_count int;
  v_user_id uuid := auth.uid();
  v_recent_attempts int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT count(*) INTO v_recent_attempts
  FROM public.invite_attempts
  WHERE user_id = v_user_id AND attempted_at > now() - interval '15 minutes';

  IF v_recent_attempts >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Demasiados intentos. Esperá unos minutos y probá de nuevo.');
  END IF;

  INSERT INTO public.invite_attempts (user_id) VALUES (v_user_id);

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
