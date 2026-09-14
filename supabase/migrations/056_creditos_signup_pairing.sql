-- ============================================================
-- Migración 056: otorgar créditos al registrarse y al vincular pareja
--
-- Dos puntos de enganche sobre funciones que ya existen, sin tocar su
-- comportamiento actual más que sumar el otorgamiento de créditos:
--
-- 1. handle_new_user() (migración 004, extendida en 044) -- se le suma
--    el alta de user_credits con 50 créditos de bienvenida.
-- 2. join_couple_by_invite() (migración 049, endurecida en 021) -- se
--    le suma el llamado a grant_pairing_bonus() después de insertar la
--    segunda membresía.
--
-- Fórmula del pool: 150 créditos FIJOS siempre que no haya señal de
-- riesgo (mismo dispositivo ya cobró un bono de pairing antes con otra
-- cuenta) -- decisión de producto: se prioriza que el número sea
-- predecible y comunicable ("150 créditos gratis al vincular pareja")
-- por sobre "ahorrarse" lo que ya gastaron en solitario. Si hay señal
-- de riesgo, se otorga el bono en 0 pero la vinculación en sí SIEMPRE
-- se permite -- nunca se rompe el flujo real por un falso positivo,
-- solo se retiene el incentivo económico.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');

  INSERT INTO public.user_credits (user_id, balance) VALUES (new.id, 50);

  INSERT INTO public.credit_transactions (couple_id, user_id, type, amount, balance_after)
  VALUES (NULL, new.id, 'welcome_signup', 50, 50);

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_pairing_bonus(p_couple_id uuid, p_user_a uuid, p_user_b uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_risk boolean;
  v_amount int;
BEGIN
  -- Ya se otorgó un bono para esta pareja (defensivo -- join_couple_by_invite
  -- solo debería llamar esto una vez, pero evita doble alta si algo reintenta).
  IF EXISTS (SELECT 1 FROM credit_transactions WHERE couple_id = p_couple_id AND type = 'pairing_bonus') THEN
    RETURN jsonb_build_object('ok', true, 'granted', 0, 'already_granted', true);
  END IF;

  -- Señal de riesgo: alguno de los dos comparte fingerprint con un
  -- usuario que ya cobró un bono de pairing en otra pareja.
  SELECT EXISTS (
    SELECT 1
    FROM device_fingerprints df
    JOIN credit_transactions ct ON ct.user_id = df.user_id AND ct.type = 'pairing_bonus'
    WHERE df.fingerprint_hash IN (
      SELECT fingerprint_hash FROM device_fingerprints WHERE user_id IN (p_user_a, p_user_b)
    )
    AND ct.couple_id <> p_couple_id
  ) INTO v_risk;

  v_amount := CASE WHEN v_risk THEN 0 ELSE 150 END;

  -- Saldo individual no usado se pierde/absorbe en el flat -- ver nota
  -- de diseño arriba. Se pone en 0 explícitamente para que quede claro
  -- en user_credits que esa cuenta ya no opera en modo solitario.
  UPDATE user_credits SET balance = 0, updated_at = now() WHERE user_id IN (p_user_a, p_user_b);

  INSERT INTO couple_credits (couple_id, balance)
  VALUES (p_couple_id, v_amount)
  ON CONFLICT (couple_id) DO UPDATE SET balance = couple_credits.balance + v_amount, updated_at = now();

  INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
  VALUES (p_couple_id, p_user_a, 'pairing_bonus', v_amount, v_amount, jsonb_build_object('risk_flagged', v_risk));

  RETURN jsonb_build_object('ok', true, 'granted', v_amount, 'flagged', v_risk);
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
  v_other_user_id uuid;
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

  SELECT user_id INTO v_other_user_id FROM couple_members WHERE couple_id = v_couple_id LIMIT 1;

  INSERT INTO couple_members (user_id, couple_id)
  VALUES (v_user_id, v_couple_id);

  -- NUEVO (migración 056): otorgar el bono de vinculación al pool.
  PERFORM grant_pairing_bonus(v_couple_id, v_user_id, v_other_user_id);

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
END;
$$;
