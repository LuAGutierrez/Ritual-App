-- ============================================================
-- Migración 066: no violar el CHECK(amount <> 0) al flagear riesgo
--
-- Bug real, encontrado por tests/sql/device-fingerprint.test.ts (el
-- primer test que de verdad ejercita el camino "riesgo detectado" de
-- grant_pairing_bonus -- nadie lo había probado hasta ahora). Cuando
-- v_risk es true, v_amount da 0, y el INSERT a credit_transactions con
-- amount=0 viola el CHECK (amount <> 0) de la migración 055. La
-- excepción se propaga hacia arriba a través del PERFORM en
-- join_couple_by_invite, y como join_couple_by_invite solo atrapa
-- unique_violation, la excepción rompe la vinculación ENTERA -- no
-- solo el bono. Contradice directamente la garantía de diseño ("nunca
-- se rompe el flujo real por un falso positivo, solo se retiene el
-- incentivo económico") documentada en la propia migración 056.
--
-- Fix, dos partes:
-- 1. Solo se inserta la fila del ledger cuando de verdad hubo
--    movimiento de créditos (v_amount > 0) -- un asiento de "se
--    otorgaron 0 créditos" no aporta nada y viola el CHECK a propósito.
-- 2. El guard de "ya se otorgó el bono para esta pareja" dependía de
--    que existiera esa fila en credit_transactions -- con (1), en el
--    caso flagged nunca existe, así que una llamada repetida podría
--    re-evaluar el riesgo y, en el peor caso, otorgar el bono completo
--    la segunda vez. Se cambia el guard para chequear couple_credits
--    en cambio, que SIEMPRE se crea (con 150 o con 0) en el primer
--    llamado exitoso -- no depende del resultado del chequeo de riesgo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_pairing_bonus(p_couple_id uuid, p_user_a uuid, p_user_b uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_risk boolean;
  v_amount int;
BEGIN
  IF EXISTS (SELECT 1 FROM couple_credits WHERE couple_id = p_couple_id) THEN
    RETURN jsonb_build_object('ok', true, 'granted', 0, 'already_granted', true);
  END IF;

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

  UPDATE user_credits SET balance = 0, updated_at = now() WHERE user_id IN (p_user_a, p_user_b);

  INSERT INTO couple_credits (couple_id, balance) VALUES (p_couple_id, v_amount);

  IF v_amount > 0 THEN
    INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
    VALUES (p_couple_id, p_user_a, 'pairing_bonus', v_amount, v_amount, jsonb_build_object('risk_flagged', v_risk));
  END IF;

  RETURN jsonb_build_object('ok', true, 'granted', v_amount, 'flagged', v_risk);
END;
$$;
