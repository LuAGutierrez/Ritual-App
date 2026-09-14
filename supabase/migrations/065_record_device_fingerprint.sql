-- ============================================================
-- Migración 065: RPC para registrar el fingerprint de dispositivo
--
-- device_fingerprints (migración 055) existe desde el sistema de
-- créditos original, pero nada la llenaba todavía -- grant_pairing_bonus
-- (migración 056) consulta esta tabla para el chequeo anti-farmeo, y
-- sin datos nunca encuentra riesgo. Esta función es el único camino de
-- escritura: SECURITY DEFINER porque device_fingerprints no tiene
-- policy de INSERT para el cliente a propósito (mismo patrón que el
-- resto de RPCs de créditos).
--
-- Se llama desde app/actions/device-fingerprint.ts, en /onboarding y
-- /unirse/[code] -- los dos puntos por los que pasa cualquiera antes
-- de vincularse a una pareja.
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_device_fingerprint(p_fingerprint_hash text, p_ip_hash text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_fingerprint_hash IS NULL OR length(trim(p_fingerprint_hash)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO device_fingerprints (user_id, fingerprint_hash, ip_hash)
  VALUES (v_user_id, trim(p_fingerprint_hash), p_ip_hash)
  ON CONFLICT (user_id, fingerprint_hash) DO NOTHING;
END;
$$;
