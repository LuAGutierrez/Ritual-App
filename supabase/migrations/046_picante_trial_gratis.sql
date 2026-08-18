-- ============================================================
-- Migración 046: "una picante gratis" persistido por pareja
--
-- Los 5 juegos con modo picante (Elección, Esto o Aquello, ¿Quién de
-- los dos?, Verdad o Reto, Ruleta Picante) dejaban jugar una ronda
-- picante gratis antes de mostrar el paywall -- pero el "ya la usó"
-- vivía en un useState de React (picanteUsado), nunca en la base.
-- Resultado: el límite se reseteaba solo con refrescar la página, y
-- cada integrante de la pareja tenía su propio contador en su propio
-- dispositivo en vez de compartir una sola prueba gratis por pareja.
--
-- Mismo patrón que couple_contenido_rechazado (migración 032): tabla
-- chica, RLS por membresía, sin SECURITY DEFINER porque no hay nada
-- que hacer trampa (no es una acción puntuable). PRIMARY KEY
-- (couple_id, juego) hace que la fila exista una sola vez -- "existe"
-- significa "ya usaron la gratis de este juego".
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_picante_trial (
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  juego       text NOT NULL CHECK (juego IN ('eleccion', 'esto_aquello', 'quien_de_los_dos', 'verdad_o_reto', 'ruleta_picante')),
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (couple_id, juego)
);

ALTER TABLE public.couple_picante_trial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picante_trial_select_member" ON public.couple_picante_trial
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_picante_trial.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "picante_trial_insert_member" ON public.couple_picante_trial
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_picante_trial.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
