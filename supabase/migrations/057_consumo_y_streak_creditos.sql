-- ============================================================
-- Migración 057: consumo de créditos (con control de concurrencia),
-- crédito diario de racha, y alta de créditos comprados
--
-- consume_credits() es el punto único de descuento -- lo llaman las
-- futuras server actions de generación con IA (Ritual Simple/Profundo,
-- Dinámica de compatibilidad). Resuelve solo vs. pareja internamente
-- por auth.uid(), así el caller nunca necesita saber en qué modo está
-- el usuario. SELECT ... FOR UPDATE serializa dos gastos simultáneos
-- de la misma pareja (dos teléfonos generando al mismo tiempo) -- el
-- segundo espera a que el primero termine su transacción antes de leer
-- el balance, así nunca ven ambos "alcanza" con el mismo crédito.
--
-- idempotency_key (uuid generado client-side por request) evita doble
-- cobro si un retry de red reenvía la misma llamada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_credits(p_feature text, p_amount int, p_idempotency_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_balance int;
  v_new_balance int;
  v_row couple_credits%ROWTYPE;
  v_from_streak int;
  v_from_balance int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
    SELECT balance_after INTO v_new_balance FROM credit_transactions WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('ok', true, 'balance', v_new_balance, 'idempotent', true);
  END IF;

  SELECT couple_id INTO v_couple_id FROM couple_members WHERE user_id = v_user_id;

  IF v_couple_id IS NOT NULL THEN
    -- === Camino pareja: pool compartido, con streak_bonus ===
    SELECT * INTO v_row FROM couple_credits WHERE couple_id = v_couple_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_credits_row');
    END IF;

    IF v_row.streak_bonus_expires_at IS NULL OR now() > v_row.streak_bonus_expires_at THEN
      v_row.streak_bonus := 0;
    END IF;

    IF (v_row.streak_bonus + v_row.balance) < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_row.balance + v_row.streak_bonus);
    END IF;

    v_from_streak := LEAST(v_row.streak_bonus, p_amount);
    v_from_balance := p_amount - v_from_streak;
    v_new_balance := v_row.balance - v_from_balance;

    UPDATE couple_credits
    SET balance = v_new_balance,
        streak_bonus = v_row.streak_bonus - v_from_streak,
        updated_at = now()
    WHERE couple_id = v_couple_id;

    INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, feature, idempotency_key)
    VALUES (v_couple_id, v_user_id, 'consumo_ia', -p_amount, v_new_balance, p_feature, p_idempotency_key);
  ELSE
    -- === Camino solo: saldo individual, mismo lock, misma idempotencia ===
    SELECT balance INTO v_balance FROM user_credits WHERE user_id = v_user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_credits_row');
    END IF;

    IF v_balance < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_balance);
    END IF;

    v_new_balance := v_balance - p_amount;
    UPDATE user_credits SET balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

    INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, feature, idempotency_key)
    VALUES (NULL, v_user_id, 'consumo_ia', -p_amount, v_new_balance, p_feature, p_idempotency_key);
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

-- Reversa de un consumo cuando la generación con IA falla DESPUÉS de
-- cobrar (ver nota de concurrencia: siempre se cobra antes de llamar
-- al modelo, nunca al revés -- si el modelo falla, se refunda acá en
-- vez de haber arriesgado el orden inverso).
--
-- Dos chequeos de seguridad que NO estaban en el primer borrador de
-- esta función (los agrego acá directamente, no como parche aparte,
-- para no dejar una versión insegura en el historial de migraciones):
-- 1. Solo quien pertenece a la pareja/cuenta de la transacción original
--    puede refundearla -- si no, cualquier usuario autenticado podía
--    inflar el saldo de una pareja ajena adivinando su idempotency_key.
-- 2. Un mismo cobro no se puede refundear dos veces -- si no, era un
--    loop de crédito infinito (refundear repetidamente el mismo cobro).
CREATE OR REPLACE FUNCTION public.refund_credits(p_idempotency_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_charge credit_transactions%ROWTYPE;
  v_refund_key uuid;
  v_new_balance int;
  v_is_member boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_charge FROM credit_transactions
  WHERE idempotency_key = p_idempotency_key AND type = 'consumo_ia';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'charge_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM credit_transactions
    WHERE type = 'refund' AND metadata->>'refund_of' = p_idempotency_key::text
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_refunded');
  END IF;

  IF v_charge.couple_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM couple_members WHERE couple_id = v_charge.couple_id AND user_id = v_user_id
    ) INTO v_is_member;
  ELSE
    v_is_member := v_charge.user_id = v_user_id;
  END IF;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autorizado');
  END IF;

  v_refund_key := gen_random_uuid();

  IF v_charge.couple_id IS NOT NULL THEN
    UPDATE couple_credits SET balance = balance + abs(v_charge.amount), updated_at = now()
    WHERE couple_id = v_charge.couple_id
    RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE user_credits SET balance = balance + abs(v_charge.amount), updated_at = now()
    WHERE user_id = v_charge.user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, feature, idempotency_key, metadata)
  VALUES (v_charge.couple_id, v_charge.user_id, 'refund', abs(v_charge.amount), v_new_balance, v_charge.feature,
          v_refund_key, jsonb_build_object('refund_of', p_idempotency_key));

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

-- Crédito diario no acumulable (1-2, expira en 24h). Se llama desde
-- updateStreakAction (app/actions/ritual.ts) el día que la pareja
-- completa el ritual -- reusa esa misma condición de "una vez por día"
-- vía last_streak_grant_date, no depende del cron. Chequea membresía
-- explícitamente: sin esto, cualquier autenticado podía regalarle
-- créditos a la pareja de otro pasando su couple_id.
CREATE OR REPLACE FUNCTION public.grant_daily_streak_credits(p_couple_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_amount int := 1 + (random() < 0.2)::int; -- 80% 1 crédito, 20% 2
  v_balance int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM couple_members WHERE couple_id = p_couple_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No pertenecés a esta pareja');
  END IF;

  UPDATE couple_credits
  SET streak_bonus = v_amount,
      streak_bonus_expires_at = now() + interval '24 hours',
      last_streak_grant_date = v_today,
      updated_at = now()
  WHERE couple_id = p_couple_id
    AND (last_streak_grant_date IS NULL OR last_streak_grant_date < v_today)
  RETURNING balance INTO v_balance;

  IF FOUND THEN
    INSERT INTO credit_transactions (couple_id, type, amount, balance_after, metadata)
    VALUES (p_couple_id, 'streak_daily', v_amount, v_balance, jsonb_build_object('expires_in_h', 24));
    RETURN jsonb_build_object('ok', true, 'granted', v_amount);
  END IF;

  RETURN jsonb_build_object('ok', true, 'granted', 0, 'already_granted_today', true);
END;
$$;

-- Alta de créditos comprados. La llama el webhook de Mercado Pago
-- (service role) cuando confirme un pago -- la reescritura de
-- create-mp-subscription / mp-webhook para pago único es una fase
-- aparte del plan, esta función queda lista de antemano.
--
-- No se expone a clientes autenticados: exige status='approved' en la
-- compra (que solo el webhook, corriendo con service role, puede
-- setear -- credit_purchases no tiene policy de UPDATE para el
-- cliente) y además se le revoca EXECUTE a los roles de PostgREST más
-- abajo, como cinturón y tiradores.
CREATE OR REPLACE FUNCTION public.grant_purchase_credits(p_purchase_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_purchase credit_purchases%ROWTYPE;
  v_credits int;
  v_new_balance int;
BEGIN
  SELECT * INTO v_purchase FROM credit_purchases WHERE id = p_purchase_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'purchase_not_found');
  END IF;

  IF v_purchase.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'purchase_not_approved');
  END IF;

  IF v_purchase.credits_granted IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_granted', true);
  END IF;

  SELECT credits INTO v_credits FROM credit_packages WHERE id = v_purchase.package_id;

  UPDATE couple_credits SET balance = balance + v_credits, updated_at = now()
  WHERE couple_id = v_purchase.couple_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO couple_credits (couple_id, balance) VALUES (v_purchase.couple_id, v_credits)
    RETURNING balance INTO v_new_balance;
  END IF;

  UPDATE credit_purchases SET credits_granted = v_credits WHERE id = p_purchase_id;

  INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
  VALUES (v_purchase.couple_id, v_purchase.user_id, 'purchase', v_credits, v_new_balance,
          jsonb_build_object('purchase_id', p_purchase_id, 'package_id', v_purchase.package_id));

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_purchase_credits(uuid) FROM PUBLIC, anon, authenticated;
