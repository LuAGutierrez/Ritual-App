-- ============================================================
-- Migración 039: Momento "primer_desacuerdo" -- espejo exacto de
-- "primera_coincidencia" pero al revés (primera vez que NO
-- coinciden), en los 4 juegos con reveal de coincidencia/acierto.
--
-- Mismo criterio de detección ya usado para primera_coincidencia
-- (comparar contra v_previo): "hasta ahora siempre habían coincidido"
-- (v_previo.coincidencias = v_previo.intentos) y esta vez no.
-- ============================================================

ALTER TABLE public.couple_momentos DROP CONSTRAINT couple_momentos_tipo_check;
ALTER TABLE public.couple_momentos ADD CONSTRAINT couple_momentos_tipo_check
  CHECK (tipo IN ('primera_partida', 'primera_coincidencia', 'racha_5', 'sorpresa', 'reto_doble', 'primer_desacuerdo'));

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

  IF NOT p_coincidio AND v_previo IS NOT NULL AND v_previo.coincidencias = v_previo.intentos THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'primer_desacuerdo');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'racha_5');
  END IF;

  IF random() < 0.08 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'eleccion', 'sorpresa');
  END IF;
END;
$$;

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

  IF NOT p_coincidio AND v_previo IS NOT NULL AND v_previo.coincidencias = v_previo.intentos THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'primer_desacuerdo');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'racha_5');
  END IF;

  IF random() < 0.08 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'esto_aquello', 'sorpresa');
  END IF;
END;
$$;

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

  IF NOT v_correcto AND v_previo IS NOT NULL AND v_previo.aciertos = v_previo.intentos THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'primer_desacuerdo');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'racha_5');
  END IF;

  IF random() < 0.08 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (v_round.couple_id, 'conoces', 'sorpresa');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._resolve_quien_de_los_dos_stats(p_couple_id uuid, p_coincidio boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_previo public.couple_quien_de_los_dos_stats;
  v_nuevo public.couple_quien_de_los_dos_stats;
BEGIN
  SELECT * INTO v_previo FROM public.couple_quien_de_los_dos_stats WHERE couple_id = p_couple_id;

  INSERT INTO public.couple_quien_de_los_dos_stats (couple_id, coincidencias, intentos, racha_actual, racha_maxima)
  VALUES (
    p_couple_id,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    CASE WHEN p_coincidio THEN 1 ELSE 0 END
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    coincidencias = public.couple_quien_de_los_dos_stats.coincidencias + CASE WHEN p_coincidio THEN 1 ELSE 0 END,
    intentos = public.couple_quien_de_los_dos_stats.intentos + 1,
    racha_actual = CASE WHEN p_coincidio THEN public.couple_quien_de_los_dos_stats.racha_actual + 1 ELSE 0 END,
    racha_maxima = GREATEST(
      public.couple_quien_de_los_dos_stats.racha_maxima,
      CASE WHEN p_coincidio THEN public.couple_quien_de_los_dos_stats.racha_actual + 1 ELSE 0 END
    ),
    updated_at = now()
  RETURNING * INTO v_nuevo;

  IF v_previo IS NULL THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'primera_partida');
  END IF;

  IF p_coincidio AND (v_previo IS NULL OR v_previo.coincidencias = 0) THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'primera_coincidencia');
  END IF;

  IF NOT p_coincidio AND v_previo IS NOT NULL AND v_previo.coincidencias = v_previo.intentos THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'primer_desacuerdo');
  END IF;

  IF v_nuevo.racha_actual = 5 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'racha_5');
  END IF;

  IF random() < 0.08 THEN
    INSERT INTO public.couple_momentos (couple_id, juego, tipo) VALUES (p_couple_id, 'quien_de_los_dos', 'sorpresa');
  END IF;
END;
$$;
