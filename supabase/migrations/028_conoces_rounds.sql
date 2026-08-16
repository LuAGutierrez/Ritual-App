-- ============================================================
-- Migración 028: "¿Cuánto me conoces?" -- primera pieza de la
-- categoría "Nosotros"
--
-- Mismo patrón de sincronización que Elección (015/018/020) y Esto o
-- Aquello (023): ronda por couple_id, cada uno responde en secreto,
-- reveal cuando ambos contestaron, escritura solo vía función
-- SECURITY DEFINER (UPDATE revocado por GRANT a nivel de tabla).
--
-- Con un giro: no es simétrico. Uno (subject) responde algo sobre sí
-- mismo, el otro (guesser) adivina qué respondió. Por eso son DOS
-- funciones de escritura, cada una validando su propio rol contra
-- subject_user_id -- no basta con "sos user1 o user2 de esta ronda"
-- como en los otros dos juegos. La lógica de reveal+stats, compartida
-- por ambas, vive en un helper interno para no duplicarla (ver bug de
-- categoria drift documentado en la skill no-slop, punto 4).
--
-- Nota igual que 023: submit_conoces_subject_choice, submit_conoces_guess
-- y _resolve_conoces_reveal escriben, así que NINGUNA lleva STABLE.
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLA: conoces_items (contenido)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conoces_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta    text NOT NULL,
  opciones    text[] NOT NULL,
  categoria   text NOT NULL DEFAULT 'nosotros',
  picante     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT conoces_items_opciones_len CHECK (array_length(opciones, 1) BETWEEN 3 AND 4)
);

ALTER TABLE public.conoces_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conoces_items_select_authenticated" ON public.conoces_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- TABLA: couple_conoces_rounds
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_conoces_rounds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id        uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user1_id         uuid REFERENCES auth.users(id),
  user2_id         uuid REFERENCES auth.users(id),
  subject_user_id  uuid NOT NULL REFERENCES auth.users(id),
  pregunta         text NOT NULL,
  opciones         text[] NOT NULL,
  subject_choice   smallint,
  guesser_choice   smallint,
  revealed_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT couple_conoces_rounds_subject_is_member
    CHECK (subject_user_id = user1_id OR subject_user_id = user2_id),
  CONSTRAINT couple_conoces_rounds_subject_choice_valid
    CHECK (subject_choice IS NULL OR (subject_choice >= 0 AND subject_choice < array_length(opciones, 1))),
  CONSTRAINT couple_conoces_rounds_guesser_choice_valid
    CHECK (guesser_choice IS NULL OR (guesser_choice >= 0 AND guesser_choice < array_length(opciones, 1)))
);

ALTER TABLE public.couple_conoces_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conoces_rounds_select_member" ON public.couple_conoces_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_conoces_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "conoces_rounds_insert_member" ON public.couple_conoces_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_conoces_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_conoces_rounds;

-- ─────────────────────────────────────────────
-- TABLA: couple_conoces_stats
--
-- Sin policy de INSERT/UPDATE para authenticated -- a diferencia de
-- `streaks` (que sí las tiene, de una etapa previa a la 020), esta
-- tabla nace ya con el patrón endurecido: la única escritura posible
-- es desde _resolve_conoces_reveal (SECURITY DEFINER).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_conoces_stats (
  couple_id     uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  aciertos      int NOT NULL DEFAULT 0,
  intentos      int NOT NULL DEFAULT 0,
  racha_actual  int NOT NULL DEFAULT 0,
  racha_maxima  int NOT NULL DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.couple_conoces_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conoces_stats_select_member" ON public.couple_conoces_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_conoces_stats.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_conoces_stats;

-- ─────────────────────────────────────────────
-- RPC de carga de página: contexto + ronda activa + stats en un solo
-- round-trip, mismo enfoque que get_esto_aquello_page_data (023).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_conoces_page_data()
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
  v_stats jsonb;
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
      'round', null,
      'stats', null
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
  FROM public.couple_conoces_rounds r
  WHERE r.couple_id = v_couple_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  SELECT to_jsonb(s) INTO v_stats
  FROM public.couple_conoces_stats s
  WHERE s.couple_id = v_couple_id;

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'round', v_round,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conoces_page_data() TO authenticated;

-- ─────────────────────────────────────────────
-- Helper interno compartido por las dos funciones de escritura: si ya
-- están las dos respuestas y todavía no hubo reveal, marca revealed_at
-- y actualiza stats. No es SECURITY DEFINER propia -- corre con los
-- privilegios ya elevados de la función que la invoca (PERFORM desde
-- una función SECURITY DEFINER).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_conoces_reveal(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_round public.couple_conoces_rounds;
  v_correcto boolean;
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
    updated_at = now();
END;
$$;

-- ─────────────────────────────────────────────
-- Escritura: el sujeto responde sobre sí mismo.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_conoces_subject_choice(
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
  v_round public.couple_conoces_rounds;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_round FROM public.couple_conoces_rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ronda no encontrada.');
  END IF;

  IF v_round.subject_user_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta ronda no te toca responder sobre vos.');
  END IF;

  IF p_choice < 0 OR p_choice >= array_length(v_round.opciones, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Opción inválida.');
  END IF;

  IF v_round.subject_choice IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya respondiste en esta ronda.');
  END IF;

  UPDATE public.couple_conoces_rounds SET subject_choice = p_choice WHERE id = p_round_id;

  PERFORM public._resolve_conoces_reveal(p_round_id);

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_conoces_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_conoces_subject_choice(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_conoces_subject_choice(uuid, smallint) TO authenticated;

-- ─────────────────────────────────────────────
-- Escritura: el otro adivina qué respondió el sujeto.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_conoces_guess(
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
  v_round public.couple_conoces_rounds;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_round FROM public.couple_conoces_rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ronda no encontrada.');
  END IF;

  IF v_round.subject_user_id = v_user_id
     OR (v_round.user1_id <> v_user_id AND v_round.user2_id <> v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta ronda no te toca adivinar.');
  END IF;

  IF p_choice < 0 OR p_choice >= array_length(v_round.opciones, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Opción inválida.');
  END IF;

  IF v_round.guesser_choice IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya arriesgaste tu respuesta en esta ronda.');
  END IF;

  UPDATE public.couple_conoces_rounds SET guesser_choice = p_choice WHERE id = p_round_id;

  PERFORM public._resolve_conoces_reveal(p_round_id);

  RETURN jsonb_build_object(
    'ok', true,
    'round', (SELECT to_jsonb(r) FROM public.couple_conoces_rounds r WHERE r.id = p_round_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_conoces_guess(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_conoces_guess(uuid, smallint) TO authenticated;

REVOKE UPDATE ON public.couple_conoces_rounds FROM authenticated;
REVOKE INSERT, UPDATE ON public.couple_conoces_stats FROM authenticated;

-- ============================================================
-- SEED: 18 preguntas para "¿Cuánto me conoces?"
-- ============================================================

INSERT INTO public.conoces_items (pregunta, opciones) VALUES
('¿Cuál es tu comida reconfortante cuando tenés un mal día?',
  ARRAY['Milanesa con papas fritas', 'Pizza', 'Pastas', 'Algo dulce, sin dudarlo']),
('Si te regalan un día libre sin nada planeado, ¿qué elegís hacer?',
  ARRAY['Quedarme en la cama todo el día', 'Salir a caminar sin rumbo', 'Ver una serie entera', 'Juntarme con amigos']),
('¿Cuál es el miedo que más te cuesta admitir?',
  ARRAY['Que me dejen de lado', 'No cumplir lo que me propongo', 'Estar solo/a', 'Perder a alguien que quiero']),
('¿A qué destino soñás viajar alguna vez?',
  ARRAY['Japón', 'Italia', 'Islandia', 'Perú']),
('¿Cómo preferís que te consuelen cuando estás mal?',
  ARRAY['Con un abrazo y en silencio', 'Que me distraigan con algo', 'Un rato a solas primero', 'Que me escuchen hablar']),
('¿Cuál es tu mayor lujo cuando tenés plata de sobra?',
  ARRAY['Viajar', 'Comer afuera', 'Ropa', 'Ahorrar igual, por las dudas']),
('¿Qué es lo que más rápido te saca de quicio?',
  ARRAY['Que no me escuchen', 'La impuntualidad', 'El desorden', 'Que me interrumpan']),
('¿Cómo te gusta arrancar el día?',
  ARRAY['En silencio, sin hablar con nadie', 'Con música', 'Revisando el celular', 'Charlando con alguien']),
('Si ganás la lotería, ¿qué hacés primero?',
  ARRAY['Viajar', 'Comprar una casa', 'Guardarlo todo', 'Ayudar a mi familia']),
('¿Cuál es tu forma favorita de que te demuestren cariño?',
  ARRAY['Con gestos', 'Con palabras', 'Con tiempo juntos', 'Con regalos']),
('¿Qué te cuesta más soltar?',
  ARRAY['Una discusión', 'Un error propio', 'Un plan que no salió', 'El control de la situación']),
('¿Con qué clima te sentís mejor?',
  ARRAY['Día de sol fuerte', 'Lluvia y frío', 'Otoño templado', 'Noche de verano']),
('¿Cuál es tu fin de semana ideal?',
  ARRAY['Escaparte a algún lado', 'No moverte de casa', 'Plan con amigos', 'Estar solo/a con tu pareja']),
('¿Qué es lo que más extrañás de cuando eras chico/a?',
  ARRAY['Jugar sin pensar en nada', 'La despreocupación', 'Ciertas personas', 'Los veranos largos']),
('¿Cómo manejás el estrés?',
  ARRAY['Haciendo ejercicio', 'Hablándolo con alguien', 'Aislándote un rato', 'Comiendo algo rico']),
('En 5 años, ¿qué te haría sentir más orgulloso/a?',
  ARRAY['Estabilidad económica', 'Haber viajado mucho', 'Una familia formada', 'Haber logrado algo propio']),
('¿Cuál es tu estilo para discutir?',
  ARRAY['Decirlo todo apenas pasa', 'Pensarlo antes de hablar', 'Necesitar espacio primero', 'Escribirlo en vez de hablarlo']),
('¿Qué te genera más ternura en una relación?',
  ARRAY['Los silencios cómodos', 'Las risas tontas', 'El cuidado en los detalles', 'La complicidad de equipo']);
