-- ============================================================
-- Migración 021: código de invitación más difícil de fuerza-brutear
--
-- El código son 6 caracteres hex (0-9A-F) = ~16.7M combinaciones, y
-- join_couple_by_invite/check_invite_code no tenían ningún límite de
-- intentos. Con una cuenta gratis (self-signup libre) y un script,
-- era técnicamente viable probar códigos hasta colarse en la pareja
-- de un desconocido y ver su historial de respuestas íntimas.
--
-- Fix en dos partes:
-- 1. Nuevas parejas generan un código de 10 caracteres (~1.1 billones
--    de combinaciones) en vez de 6. Las parejas existentes conservan su
--    código de 6 -- no se fuerza a regenerar links ya compartidos.
-- 2. Rate limiting real: máximo 20 intentos por usuario cada 15 minutos
--    en las funciones de invitación, sin importar la entropía del código.
-- ============================================================

ALTER TABLE public.couples
  ALTER COLUMN invite_code SET DEFAULT upper(substring(md5(random()::text || clock_timestamp()::text), 1, 10));

CREATE TABLE IF NOT EXISTS public.invite_attempts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_attempts_user_time
  ON public.invite_attempts (user_id, attempted_at);

-- Sin policies de SELECT/INSERT para el cliente: solo la usan las
-- funciones SECURITY DEFINER de abajo, no se accede directo por REST.
ALTER TABLE public.invite_attempts ENABLE ROW LEVEL SECURITY;

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
