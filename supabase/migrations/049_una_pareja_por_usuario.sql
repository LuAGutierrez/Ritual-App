-- ============================================================
-- Migración 049: un usuario no puede tener más de una pareja
--
-- Reproducido en vivo: ni check_invite_code ni join_couple_by_invite
-- revisaban si quien se está uniendo YA pertenece a otra pareja --
-- solo validaban que la pareja destino no esté llena. couple_members
-- tampoco lo impedía a nivel de esquema: la PK es (user_id, couple_id),
-- no user_id solo, así que nada bloqueaba una segunda fila con un
-- couple_id distinto.
--
-- Consecuencia real observada: el usuario que queda en dos parejas
-- solo ve una de las dos en su propia app (get_ritual_page_data hace
-- LIMIT 1 sin ORDER BY), pero el otro integrante de la segunda pareja
-- sí lo ve como su pareja -- con un ritual del día esperando una
-- respuesta que nunca va a llegar, sin ningún aviso de que algo salió
-- mal. Bug silencioso, no un error visible.
--
-- Fix: agregar el mismo chequeo a las dos funciones -- si el usuario
-- ya es miembro de OTRA pareja (couple_id distinto al del código que
-- está probando), se corta con un error claro. Unirse de nuevo a la
-- MISMA pareja (already_member) sigue funcionando igual que antes.
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
  v_existing_couple_id uuid;
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

  SELECT couple_id INTO v_existing_couple_id
  FROM couple_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_couple_id IS NOT NULL AND v_existing_couple_id <> v_couple_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya tenés una pareja vinculada. No podés unirte a otra.');
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
  v_recent_attempts int;
  v_existing_couple_id uuid;
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
    RETURN jsonb_build_object('ok', false, 'error', 'Código de invitación inválido');
  END IF;

  IF EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id = v_couple_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  SELECT couple_id INTO v_existing_couple_id
  FROM couple_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_couple_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya tenés una pareja vinculada. No podés unirte a otra.');
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
