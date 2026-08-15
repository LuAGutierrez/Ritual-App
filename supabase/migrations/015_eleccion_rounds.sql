-- ============================================================
-- Migración 015: Rondas de "Elección" (juego de match para parejas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_eleccion_rounds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id      uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user1_id       uuid REFERENCES auth.users(id),
  user2_id       uuid REFERENCES auth.users(id),
  option_a       text NOT NULL,
  option_b       text NOT NULL,
  premio         text NOT NULL,
  user1_choice   smallint CHECK (user1_choice IN (0, 1)),
  user2_choice   smallint CHECK (user2_choice IN (0, 1)),
  revealed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.couple_eleccion_rounds ENABLE ROW LEVEL SECURITY;

-- Miembros de la pareja pueden ver sus rondas
CREATE POLICY "eleccion_rounds_select_member" ON public.couple_eleccion_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_eleccion_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Miembros pueden crear una ronda nueva
CREATE POLICY "eleccion_rounds_insert_member" ON public.couple_eleccion_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_eleccion_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Miembros pueden actualizar su elección
CREATE POLICY "eleccion_rounds_update_member" ON public.couple_eleccion_rounds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_eleccion_rounds.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Realtime para reveal sincronizado
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_eleccion_rounds;
