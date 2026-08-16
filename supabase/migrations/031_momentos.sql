-- ============================================================
-- Migración 031: "Momentos" -- hitos emocionales compartibles
--
-- No es un sistema de logros tipo videojuego -- es un registro de
-- instantes puntuales que ya pasaron de verdad (primera vez que
-- jugaron algo, primera coincidencia, una racha de 5) para que
-- formen parte del historial de la pareja.
--
-- La detección vive DENTRO de los helpers de stats que ya existen
-- (_resolve_eleccion_stats, _resolve_esto_aquello_stats,
-- _resolve_conoces_reveal -- migraciones 028/029), comparando el
-- estado ANTERIOR de la fila de stats contra el nuevo. No se toca
-- ninguna de las 4 funciones submit_*_choice/submit_conoces_* -- ellas
-- siguen llamando a estos mismos helpers exactamente igual que antes,
-- el helper simplemente hace un poco más de trabajo puertas adentro.
--
-- Tipos de momento para esta primera versión (los que se pueden
-- detectar con los datos que ya se guardan, sin inventar tracking
-- nuevo): primera_partida, primera_coincidencia, racha_5. Quedan
-- afuera "gran desacuerdo" y "nueva categoría descubierta" del pedido
-- original -- no hay forma de detectarlos hoy sin agregar tracking
-- que nadie pidió todavía.
--
-- couple_momentos no lleva policy de INSERT/UPDATE para authenticated
-- -- mismo patrón endurecido que las tablas de stats. La única
-- escritura posible es desde los helpers, que corren con los
-- privilegios SECURITY DEFINER heredados de las funciones submit_*
-- que los invocan via PERFORM.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_momentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  juego       text NOT NULL CHECK (juego IN ('eleccion', 'esto_aquello', 'conoces')),
  tipo        text NOT NULL CHECK (tipo IN ('primera_partida', 'primera_coincidencia', 'racha_5')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.couple_momentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "momentos_select_member" ON public.couple_momentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_momentos.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- _resolve_eleccion_stats: se lee la fila previa ANTES del upsert
-- (v_previo) y se captura la fila resultante con RETURNING (v_nuevo),
-- para poder comparar transición. Todo lo que ya hacía la función
-- (el upsert de coincidencias/intentos/racha) queda igual.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_eleccion_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_previo public.couple_eleccion_stats;
  v_nuevo public.couple_eleccion_stats;
BEGIN
  SELECT * INTO v_previo FROM public.couple_eleccion_stats WHERE couple_id = p_couple_id;

  INSERT INTO public.couple_eleccion_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_eleccion_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_eleccion_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_eleccion_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_eleccion_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_eleccion_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now()
  RETURNING * INTO v_nuevo;

  IF v_previo IS NULL THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'primera_partida');
  END IF;

  IF p_coincidio AND (v_previo IS NULL OR v_previo.coincidencias = 0) THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'primera_coincidencia');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'racha_5');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- _resolve_esto_aquello_stats: mismo tratamiento.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_esto_aquello_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_previo public.couple_esto_aquello_stats;
  v_nuevo public.couple_esto_aquello_stats;
BEGIN
  SELECT * INTO v_previo FROM public.couple_esto_aquello_stats WHERE couple_id = p_couple_id;

  INSERT INTO public.couple_esto_aquello_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_esto_aquello_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_esto_aquello_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_esto_aquello_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_esto_aquello_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_esto_aquello_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now()
  RETURNING * INTO v_nuevo;

  IF v_previo IS NULL THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'primera_partida');
  END IF;

  IF p_coincidio AND (v_previo IS NULL OR v_previo.coincidencias = 0) THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'primera_coincidencia');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'racha_5');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- _resolve_conoces_reveal: mismo tratamiento, sobre la función de la
-- migración 028 (acá "coincidir" es que subject_choice = guesser_choice,
-- y las columnas se llaman aciertos/intentos en vez de
-- coincidencias/intentos, pero el resto es idéntico).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_conoces_reveal(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_round public.couple_conoces_rounds;
  v_correcto boolean;
  v_previo public.couple_conoces_stats;
  v_nuevo public.couple_conoces_stats;
BEGIN
  SELECT * INTO v_round FROM public.couple_conoces_rounds WHERE id = p_round_id;

  IF v_round.revealed_at IS NOT NULL
     OR v_round.subject_choice IS NULL
     OR v_round.guesser_choice IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.couple_conoces_rounds
  SET revealed_at = now()
  WHERE id = p_round_id AND revealed_at IS NULL;

  v_correcto := v_round.subject_choice = v_round.guesser_choice;

  SELECT * INTO v_previo FROM public.couple_conoces_stats WHERE couple_id = v_round.couple_id;

  INSERT INTO public.couple_conoces_stats (couple_id, aciertos, intentos, racha_actual, racha_maxima)
  VALUES (
    v_round.couple_id,
    CASE WHEN v_correcto THEN 1 ELSE 0 END,
    1,
    CASE WHEN v_correcto THEN 1 ELSE 0 END,
    CASE WHEN v_correcto THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    aciertos = public.couple_conoces_stats.aciertos + CASE WHEN v_correcto THEN 1 ELSE 0 END,
    intentos = public.couple_conoces_stats.intentos + 1,
    racha_actual = CASE WHEN v_correcto THEN public.couple_conoces_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_conoces_stats.racha_maxima,
      CASE WHEN v_correcto THEN public.couple_conoces_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now()
  RETURNING * INTO v_nuevo;

  IF v_previo IS NULL THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'primera_partida');
  END IF;

  IF v_correcto AND (v_previo IS NULL OR v_previo.aciertos = 0) THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'primera_coincidencia');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'racha_5');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- Lectura: lista de momentos de la pareja, más nuevo primero. El
-- texto/emoji de cada momento se arma en TypeScript (app/perfil/page.tsx),
-- acá solo se devuelven los datos estructurados.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_couple_momentos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN null;
  END IF;

  SELECT cm.couple_id INTO v_couple_id
  FROM public.couple_members cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC)
      FROM public.couple_momentos m
      WHERE m.couple_id = v_couple_id
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_couple_momentos() TO authenticated;
