-- ============================================================
-- Migración 023: Rondas de "Esto o Aquello" en pareja (Realtime)
--
-- Esto o Aquello era 100% local/solo -- no guardaba tu elección, no la
-- comparaba con la de tu pareja, no había reveal. Se presentaba como
-- "para conocerse mejor" pero cada uno lo jugaba aislado. Este cambio
-- le da el mismo mecanismo que ya usa Elección (couple_eleccion_rounds,
-- migraciones 015/018/020): ronda compartida por couple_id, cada uno
-- elige en secreto, reveal cuando ambos contestan.
--
-- Mismo patrón de seguridad que couple_eleccion_rounds desde el arranque
-- (no como esa, que se corrigió recién en la 020): la escritura de la
-- elección pasa por una función SECURITY DEFINER que valida
-- auth.uid() contra user1_id/user2_id de ESTA ronda y solo toca la
-- columna correspondiente -- UPDATE directo por REST queda revocado.
--
-- Ojo con el bug de la migración 021 (check_invite_code marcada STABLE
-- con un INSERT adentro): submit_esto_aquello_choice escribe, así que
-- NO lleva STABLE ni IMMUTABLE (default VOLATILE).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_esto_aquello_rounds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id      uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user1_id       uuid REFERENCES auth.users(id),
  user2_id       uuid REFERENCES auth.users(id),
  option_a       text NOT NULL,
  option_b       text NOT NULL,
  user1_choice   smallint CHECK (user1_choice IN (0, 1)),
  user2_choice   smallint CHECK (user2_choice IN (0, 1)),
  revealed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.couple_esto_aquello_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esto_aquello_rounds_select_member" ON public.couple_esto_aquello_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_esto_aquello_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "esto_aquello_rounds_insert_member" ON public.couple_esto_aquello_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_esto_aquello_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_esto_aquello_rounds;

-- ─────────────────────────────────────────────
-- /juegos/esto-o-aquello -- contexto + ronda activa en una sola llamada,
-- mismo enfoque que get_eleccion_page_data.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_esto_aquello_page_data()
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
  FROM public.couple_esto_aquello_rounds r
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

GRANT EXECUTE ON FUNCTION public.get_esto_aquello_page_data() TO authenticated;

-- ─────────────────────────────────────────────
-- Escritura segura de la elección -- mismo patrón que
-- submit_eleccion_choice (migración 020): valida pertenencia a LA
-- ronda (no solo a la pareja), guard "ya elegiste", y revela cuando
-- ambos contestaron.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_esto_aquello_choice(
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
  v_round public.couple_esto_aquello_rounds;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_choice NOT IN (0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Elección inválida.');
  END IF;

  SELECT * INTO v_round FROM public.couple_esto_aquello_rounds WHERE id = p_round_id;
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
    UPDATE public.couple_esto_aquello_rounds SET user1_choice = p_choice WHERE id = p_round_id;
  ELSE
    IF v_round.user2_choice IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya elegiste en esta ronda.');
    END IF;
    UPDATE public.couple_esto_aquello_rounds SET user2_choice = p_choice WHERE id = p_round_id;
  END IF;

  UPDATE public.couple_esto_aquello_rounds
  SET revealed_at = v_now
  WHERE id = p_round_id
    AND revealed_at IS NULL
    AND user1_choice IS NOT NULL
    AND user2_choice IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_esto_aquello_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_esto_aquello_choice(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_esto_aquello_choice(uuid, smallint) TO authenticated;

REVOKE UPDATE ON public.couple_esto_aquello_rounds FROM authenticated;
