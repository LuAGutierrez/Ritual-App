-- ============================================================
-- Migración 020: cerrar el hueco de "un miembro de la pareja puede
-- sobrescribir la respuesta del otro"
--
-- Las policies de UPDATE en couple_ritual_sessions y couple_eleccion_rounds
-- (migraciones 006 y 015) solo chequean que quien llama sea miembro de la
-- pareja, sin restringir QUÉ columnas puede tocar -- la app decide "sos
-- user1 o user2" del lado del cliente (app/actions/ritual.ts,
-- app/actions/eleccion.ts), no en la base. Con una llamada REST directa
-- a Supabase (sin pasar por la UI), cualquiera de los dos podía reescribir
-- la respuesta del otro, su elección en Elección, o revealed_at.
--
-- Postgres RLS no puede restringir "esta columna solo si sos tal user"
-- de forma declarativa con USING/WITH CHECK (no hay acceso limpio a OLD
-- vs NEW por columna). El fix es el patrón que ya usa este mismo repo en
-- join_couple_by_invite (008_invite_lookup.sql): mover la escritura a una
-- función SECURITY DEFINER que decide auth.uid() y el campo exacto del
-- lado del servidor, y sacarle a `authenticated` el permiso de UPDATE
-- directo sobre la tabla -- la única forma de escribir pasa a ser la
-- función.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_ritual_response(
  p_session_id uuid,
  p_response text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.couple_ritual_sessions;
  v_now timestamptz := now();
  v_response text := trim(p_response);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF v_response = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La respuesta no puede estar vacía.');
  END IF;

  IF length(v_response) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La respuesta es demasiado larga.');
  END IF;

  SELECT * INTO v_session FROM public.couple_ritual_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sesión no encontrada.');
  END IF;

  -- El chequeo real: auth.uid() tiene que ser especificamente user1_id o
  -- user2_id de ESTA sesion, no solo "miembro de la pareja en general".
  IF v_session.user1_id <> v_user_id AND v_session.user2_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No pertenecés a esta sesión.');
  END IF;

  IF v_session.user1_id = v_user_id THEN
    UPDATE public.couple_ritual_sessions
    SET user1_response = v_response, user1_completed_at = v_now
    WHERE id = p_session_id;
  ELSE
    UPDATE public.couple_ritual_sessions
    SET user2_response = v_response, user2_completed_at = v_now
    WHERE id = p_session_id;
  END IF;

  UPDATE public.couple_ritual_sessions
  SET revealed_at = v_now
  WHERE id = p_session_id
    AND revealed_at IS NULL
    AND user1_completed_at IS NOT NULL
    AND user2_completed_at IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'session', (
      SELECT jsonb_build_object(
        'id', crs.id, 'couple_id', crs.couple_id, 'ritual_id', crs.ritual_id,
        'session_date', crs.session_date, 'user1_id', crs.user1_id, 'user2_id', crs.user2_id,
        'user1_response', crs.user1_response, 'user2_response', crs.user2_response,
        'user1_completed_at', crs.user1_completed_at, 'user2_completed_at', crs.user2_completed_at,
        'revealed_at', crs.revealed_at,
        'ritual', to_jsonb(r)
      )
      FROM public.couple_ritual_sessions crs
      JOIN public.rituals r ON r.id = crs.ritual_id
      WHERE crs.id = p_session_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_ritual_response(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ritual_response(uuid, text) TO authenticated;

REVOKE UPDATE ON public.couple_ritual_sessions FROM authenticated;

-- ─────────────────────────────────────────────
-- Mismo fix para couple_eleccion_rounds (mismo patron, agregado esta
-- misma sesion en la migracion 015 -- se corrige antes de que quede
-- codigo viejo con el mismo hueco).
-- De paso: agrega un guard "ya elegiste" que el codigo TS anterior no
-- tenia -- sin el, una llamada directa a la API podia cambiar tu propia
-- eleccion despues de ver la de tu pareja por Realtime.
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_eleccion_choice(
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
  v_round public.couple_eleccion_rounds;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_choice NOT IN (0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Elección inválida.');
  END IF;

  SELECT * INTO v_round FROM public.couple_eleccion_rounds WHERE id = p_round_id;
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
    UPDATE public.couple_eleccion_rounds SET user1_choice = p_choice WHERE id = p_round_id;
  ELSE
    IF v_round.user2_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    UPDATE public.couple_eleccion_rounds SET user2_choice = p_choice WHERE id = p_round_id;
  END IF;

  UPDATE public.couple_eleccion_rounds
  SET revealed_at = v_now
  WHERE id = p_round_id
    AND revealed_at IS NULL
    AND user1_choice IS NOT NULL
    AND user2_choice IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_eleccion_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_eleccion_choice(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_eleccion_choice(uuid, smallint) TO authenticated;

REVOKE UPDATE ON public.couple_eleccion_rounds FROM authenticated;
