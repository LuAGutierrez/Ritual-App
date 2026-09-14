-- ============================================================
-- Migración 063: compras de créditos en modo solo (pre-vinculación)
--
-- credit_purchases.couple_id era NOT NULL, pero consume_credits
-- (migración 057) ya soporta gastar créditos en modo solo (sin pareja
-- vinculada) desde user_credits -- comprar un paquete antes de vincular
-- pareja tiene que poder acreditarse ahí también, si no un usuario
-- solo que se queda sin créditos no tiene forma de comprar más hasta
-- conseguir pareja, lo cual no tiene sentido de producto.
--
-- grant_purchase_credits() se reescribe con la misma resolución
-- solo/pareja que ya usa consume_credits: si couple_id viene null,
-- acredita a user_credits en vez de couple_credits.
-- ============================================================

ALTER TABLE public.credit_purchases ALTER COLUMN couple_id DROP NOT NULL;

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

  IF v_purchase.couple_id IS NOT NULL THEN
    UPDATE couple_credits SET balance = balance + v_credits, updated_at = now()
    WHERE couple_id = v_purchase.couple_id
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
      INSERT INTO couple_credits (couple_id, balance) VALUES (v_purchase.couple_id, v_credits)
      RETURNING balance INTO v_new_balance;
    END IF;
  ELSE
    UPDATE user_credits SET balance = balance + v_credits, updated_at = now()
    WHERE user_id = v_purchase.user_id
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
      INSERT INTO user_credits (user_id, balance) VALUES (v_purchase.user_id, v_credits)
      RETURNING balance INTO v_new_balance;
    END IF;
  END IF;

  UPDATE credit_purchases SET credits_granted = v_credits WHERE id = p_purchase_id;

  INSERT INTO credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
  VALUES (v_purchase.couple_id, v_purchase.user_id, 'purchase', v_credits, v_new_balance,
          jsonb_build_object('purchase_id', p_purchase_id, 'package_id', v_purchase.package_id));

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;
