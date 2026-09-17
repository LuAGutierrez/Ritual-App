-- ============================================================
-- Migración 073: insight con IA en "¿Cuánto me conoces?"
--
-- Agrega un párrafo generado con IA al reveal de una ronda ya jugada,
-- comentando el acierto/desacuerdo -- ver docs/ROADMAP.md. Cuesta
-- créditos (conoces_insight, ver lib/credits.ts), se genera una sola
-- vez por ronda (round_id UNIQUE) para que cualquiera de los dos lo
-- vea sin pagar dos veces, y persiste para sobrevivir a un refresh.
--
-- Mismo patrón RLS que couple_ia_contenido (migración 054): insert-only
-- vía server action, sin policy de UPDATE/DELETE.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_conoces_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL UNIQUE REFERENCES public.couple_conoces_rounds(id) ON DELETE CASCADE,
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.couple_conoces_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conoces_insights_select_member" ON public.couple_conoces_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_conoces_insights.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "conoces_insights_insert_member" ON public.couple_conoces_insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_conoces_insights.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_conoces_insights;

-- get_conoces_page_data(): mismo cuerpo que 028_conoces_rounds.sql,
-- sumando el insight de la última ronda (si ya se generó) para que
-- sobreviva a un refresh sin depender de Realtime.
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
  v_round_id uuid;
  v_stats jsonb;
  v_insight text;
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
      'stats', null,
      'insight', null
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

  SELECT r.id, to_jsonb(r) INTO v_round_id, v_round
  FROM public.couple_conoces_rounds r
  WHERE r.couple_id = v_couple_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  SELECT to_jsonb(s) INTO v_stats
  FROM public.couple_conoces_stats s
  WHERE s.couple_id = v_couple_id;

  IF v_round_id IS NOT NULL THEN
    SELECT i.texto INTO v_insight
    FROM public.couple_conoces_insights i
    WHERE i.round_id = v_round_id;
  END IF;

  RETURN jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'round', v_round,
    'stats', v_stats,
    'insight', v_insight
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conoces_page_data() TO authenticated;
